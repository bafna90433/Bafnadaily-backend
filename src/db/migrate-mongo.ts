import { MongoClient } from 'mongodb';
import { prisma } from './prisma';
import { Category, Product } from '../models/Product';
import { User, OTP, Admin } from '../models/User';
import { Order, Cart, Wishlist, Banner, Coupon } from '../models/Order';
import { SiteSettings } from '../models/Settings';
import { Visitor } from '../models/Visitor';
import { InventoryLog } from '../models/InventoryLog';
import { StaffFolder } from '../models/StaffFolder';
import { StaffReport } from '../models/StaffReport';
import { StaffFeedback } from '../models/StaffFeedback';
import { DealOfDay } from '../models/DealOfDay';

const MIGRATION_ID = 'mongodb-to-postgresql-v1';
const COLLECTION_CANDIDATES: Record<string, string[]> = {
  categories: ['categories'], products: ['products'], users: ['users'], otps: ['otps'], admins: ['admins'],
  orders: ['orders'], carts: ['carts'], wishlists: ['wishlists'], banners: ['banners'], coupons: ['coupons'],
  settings: ['sitesettings', 'siteSettings'], visitors: ['visitors'], inventoryLogs: ['inventorylogs'],
  staffFolders: ['stafffolders'], staffReports: ['staffreports'], staffFeedback: ['stafffeedbacks'], deals: ['dealofdays'],
};

function normalize(value: any): any {
  if (value === undefined || value === null) return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === 'object') {
    if (typeof value.toHexString === 'function') return value.toHexString();
    if (value._bsontype === 'Decimal128') return Number(value.toString());
    if (typeof value.toNumber === 'function' && ['Long', 'Int32', 'Double'].includes(value._bsontype)) return value.toNumber();
    const out: Record<string, any> = {};
    for (const [key, item] of Object.entries(value)) out[key] = normalize(item);
    return out;
  }
  return value;
}

function asId(value: any): string | null {
  if (value === undefined || value === null || value === '') return null;
  return String(value?._id ?? value?.id ?? value);
}

async function loadCollections(client: MongoClient, selected = Object.keys(COLLECTION_CANDIDATES)): Promise<Record<string, any[]>> {
  const db = client.db();
  const available = await db.listCollections({}, { nameOnly: true }).toArray();
  const names = new Map(available.map(item => [item.name.toLowerCase(), item.name]));
  const result: Record<string, any[]> = {};
  for (const [key, choices] of Object.entries(COLLECTION_CANDIDATES).filter(([key]) => selected.includes(key))) {
    const actual = choices.map(name => names.get(name.toLowerCase())).find(Boolean);
    result[key] = actual ? (await db.collection(actual).find({}).toArray()).map(normalize) : [];
  }
  return result;
}

function sanitizeRelations(data: Record<string, any[]>): void {
  for (const key of Object.keys(COLLECTION_CANDIDATES)) data[key] ||= [];
  const categoryIds = new Set(data.categories.map(row => asId(row._id)));
  const productIds = new Set(data.products.map(row => asId(row._id)));
  const userIds = new Set(data.users.map(row => asId(row._id)));
  const folderIds = new Set(data.staffFolders.map(row => asId(row._id)));
  const reportIds = new Set(data.staffReports.map(row => asId(row._id)));

  data.categories.forEach(row => { if (!categoryIds.has(asId(row.parent))) row.parent = null; });
  data.products.forEach(row => {
    if (!categoryIds.has(asId(row.category))) row.category = null;
    if (!categoryIds.has(asId(row.subCategory))) row.subCategory = null;
    if (row.sku === '') row.sku = null;
    if (row.barcode === '') row.barcode = null;
  });
  data.users.forEach(row => {
    if (row.phone === '') row.phone = null;
    if (row.email === '') row.email = null;
    if (row.googleId === '') row.googleId = null;
  });
  data.orders.forEach(row => { if (!userIds.has(asId(row.user))) row.user = null; });
  data.carts = data.carts.filter(row => userIds.has(asId(row.user)));
  data.wishlists = data.wishlists.filter(row => userIds.has(asId(row.user)));
  data.banners.forEach(row => { if (!categoryIds.has(asId(row.category))) row.category = null; });
  data.visitors.forEach(row => { if (!userIds.has(asId(row.userId))) row.userId = null; });
  data.inventoryLogs.forEach(row => { if (!productIds.has(asId(row.productId))) row.productId = null; });
  data.staffFolders.forEach(row => { if (!folderIds.has(asId(row.parentId))) row.parentId = null; });
  data.staffReports.forEach(row => { if (!folderIds.has(asId(row.folderId))) row.folderId = null; });
  data.staffFeedback.forEach(row => {
    if (!folderIds.has(asId(row.folderId))) row.folderId = null;
    if (!reportIds.has(asId(row.reportId))) row.reportId = null;
  });
  data.deals = data.deals.filter(row => productIds.has(asId(row.product)));
  data.settings.forEach(row => {
    for (const key of ['subdomain', 'customDomain', 'adminSubdomain', 'adminCustomDomain']) if (!row[key]) row[key] = null;
  });
}

async function upsertRows(model: any, rows: any[]): Promise<void> {
  const batchSize = 20;
  for (let index = 0; index < rows.length; index += batchSize) {
    await Promise.all(rows.slice(index, index + batchSize).map(row => model.upsertRaw(row)));
  }
}

async function importRows(label: string, model: any, rows: any[]): Promise<number> {
  const batchSize = 500;
  for (let index = 0; index < rows.length; index += batchSize) {
    await model.createManyRaw(rows.slice(index, index + batchSize));
  }
  console.log(`  ${label}: ${rows.length}`);
  return rows.length;
}

export async function migrateMongoIfRequested(): Promise<void> {
  if (process.env.MIGRATE_MONGO_TO_POSTGRES !== 'true') return;
  const existing = await prisma.migrationState.findUnique({ where: { id: MIGRATION_ID } });
  if (existing && process.env.FORCE_MONGO_MIGRATION !== 'true') {
    console.log('✅ MongoDB data migration already completed');
    return;
  }
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required only for the one-time data migration');

  console.log('🔄 Starting one-time MongoDB → PostgreSQL data migration');
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  try {
    const data = await loadCollections(client);
    sanitizeRelations(data);

    const counts: Record<string, number> = {};
    counts.users = await importRows('users', User, data.users);
    counts.admins = await importRows('admins', Admin, data.admins);
    counts.otps = await importRows('otps', OTP, data.otps);
    counts.categories = await importRows('categories', Category, data.categories);
    counts.products = await importRows('products', Product, data.products);
    counts.orders = await importRows('orders', Order, data.orders);
    counts.carts = await importRows('carts', Cart, data.carts);
    counts.wishlists = await importRows('wishlists', Wishlist, data.wishlists);
    counts.banners = await importRows('banners', Banner, data.banners);
    counts.coupons = await importRows('coupons', Coupon, data.coupons);
    counts.settings = await importRows('settings', SiteSettings, data.settings);
    counts.visitors = await importRows('visitors', Visitor, data.visitors);
    counts.inventoryLogs = await importRows('inventory logs', InventoryLog, data.inventoryLogs);
    counts.staffFolders = await importRows('staff folders', StaffFolder, data.staffFolders);
    counts.staffReports = await importRows('staff reports', StaffReport, data.staffReports);
    counts.staffFeedback = await importRows('staff feedback', StaffFeedback, data.staffFeedback);
    counts.deals = await importRows('deals', DealOfDay, data.deals);

    // Re-read and upsert all customer/order/catalog records just before cutover.
    // This closes the write window while the old Mongo-backed deployment is still live.
    const coreKeys = ['users', 'admins', 'otps', 'categories', 'products', 'orders', 'carts', 'wishlists', 'banners', 'coupons', 'settings', 'deals'];
    const finalData = await loadCollections(client, coreKeys);
    sanitizeRelations(finalData);
    await upsertRows(User, finalData.users);
    await upsertRows(Admin, finalData.admins);
    await upsertRows(OTP, finalData.otps);
    await upsertRows(Category, finalData.categories);
    await upsertRows(Product, finalData.products);
    await upsertRows(Order, finalData.orders);
    await upsertRows(Cart, finalData.carts);
    await upsertRows(Wishlist, finalData.wishlists);
    await upsertRows(Banner, finalData.banners);
    await upsertRows(Coupon, finalData.coupons);
    await upsertRows(SiteSettings, finalData.settings);
    await upsertRows(DealOfDay, finalData.deals);

    await prisma.migrationState.upsert({ where: { id: MIGRATION_ID }, create: { id: MIGRATION_ID, details: counts }, update: { completedAt: new Date(), details: counts } });
    console.log('✅ MongoDB → PostgreSQL data migration completed');
  } finally {
    await client.close();
  }
}
