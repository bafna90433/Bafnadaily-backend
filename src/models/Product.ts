import { createCompatModel } from '../db/compat';
import { User } from './User';

export type ICategory = any;
export type IProduct = any;

export const Category: any = createCompatModel({
  name: 'Category', delegate: 'category',
  fields: ['id', 'name', 'slug', 'description', 'image', 'imageFileId', 'icon', 'parentId', 'layoutType', 'isActive', 'sortOrder', 'featured', 'banner', 'isDashboardMain', 'createdAt', 'updatedAt'],
  aliases: { parent: 'parentId' },
  defaults: { description: null, image: null, imageFileId: null, icon: null, parent: null, layoutType: 'standard', isActive: true, sortOrder: 0, featured: false, banner: null, isDashboardMain: false },
  beforeSave: doc => { if (doc.slug) doc.slug = String(doc.slug).toLowerCase(); },
  populate: { parent: { model: () => Category, local: 'parent', as: 'parent' } },
});
export const Product: any = createCompatModel({
  name: 'Product', delegate: 'product',
  fields: ['id', 'name', 'slug', 'description', 'shortDescription', 'images', 'categoryId', 'subCategoryId', 'tags', 'price', 'mrp', 'discount', 'stock', 'sku', 'variants', 'reviews', 'averageRating', 'numReviews', 'isActive', 'isFeatured', 'isTrending', 'isNewArrival', 'isBestSeller', 'giftWrapping', 'isDeleted', 'material', 'colors', 'weight', 'sold', 'barcode', 'minQty', 'reorderLevel', 'perPiecePrice', 'perPacketText', 'gstRate', 'createdAt', 'updatedAt'],
  aliases: { category: 'categoryId', subCategory: 'subCategoryId' },
  arrayFields: ['tags'],
  jsonFields: ['images', 'variants', 'reviews', 'colors'],
  subdocumentArrays: ['images', 'variants', 'reviews', 'colors'],
  defaults: { description: '', shortDescription: null, images: [], category: null, subCategory: null, tags: [], price: 0, mrp: 0, discount: 0, stock: 0, sku: null, variants: [], reviews: [], averageRating: 0, numReviews: 0, isActive: true, isFeatured: false, isTrending: false, isNewArrival: false, isBestSeller: false, giftWrapping: false, isDeleted: false, material: null, colors: [], weight: null, sold: 0, barcode: null, minQty: 1, reorderLevel: 0, perPiecePrice: null, perPacketText: null, gstRate: 0 },
  beforeSave: doc => {
    doc.images ||= []; doc.variants ||= []; doc.reviews ||= []; doc.colors ||= []; doc.tags ||= [];
    doc.numReviews = doc.reviews.length;
    doc.averageRating = doc.reviews.length ? doc.reviews.reduce((sum: number, review: any) => sum + Number(review.rating || 0), 0) / doc.reviews.length : 0;
    if (Number(doc.mrp) > 0) doc.discount = Math.round(((Number(doc.mrp) - Number(doc.price)) / Number(doc.mrp)) * 100);
    if (doc.slug) doc.slug = String(doc.slug).toLowerCase();
    if (doc.sku === '') doc.sku = null;
    if (doc.barcode === '') doc.barcode = null;
  },
  populate: {
    category: { model: () => Category, local: 'category', as: 'category' },
    subCategory: { model: () => Category, local: 'subCategory', as: 'subCategory' },
    'reviews.user': { model: () => User, local: 'reviews', jsonArray: 'reviews', jsonField: 'user' },
  },
});
