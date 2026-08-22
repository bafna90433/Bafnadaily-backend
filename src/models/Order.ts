import { createCompatModel } from '../db/compat';
import { Product, Category } from './Product';
import { User } from './User';

export type IOrder = any;

export const Order: any = createCompatModel({
  name: 'Order', delegate: 'order',
  fields: ['id', 'orderNumber', 'userId', 'items', 'gstin', 'shippingAddress', 'paymentMethod', 'paymentStatus', 'paymentId', 'rzOrderId', 'orderStatus', 'statusHistory', 'subtotal', 'shippingCharge', 'discount', 'couponCode', 'total', 'advanceAmount', 'giftWrapping', 'giftMessage', 'notes', 'trackingNumber', 'courierName', 'packingDetails', 'wa', 'estimatedDelivery', 'createdAt', 'updatedAt'],
  aliases: { user: 'userId' },
  jsonFields: ['items', 'shippingAddress', 'statusHistory', 'packingDetails', 'wa'],
  subdocumentArrays: ['items', 'statusHistory', 'packingDetails'],
  defaults: { orderNumber: '', user: null, items: [], gstin: '', shippingAddress: {}, paymentMethod: 'cod', paymentStatus: 'pending', paymentId: null, rzOrderId: '', orderStatus: 'placed', statusHistory: [], subtotal: 0, shippingCharge: 0, discount: 0, couponCode: null, total: 0, advanceAmount: 0, giftWrapping: false, giftMessage: null, notes: null, trackingNumber: '', courierName: '', packingDetails: [], wa: { orderConfirmedSent: false, trackingSent: false, lastError: '', lastSentAt: null }, estimatedDelivery: null },
  beforeSave: doc => { if (!doc.orderNumber) doc.orderNumber = `RET${Date.now().toString().slice(-8)}`; doc.items ||= []; doc.statusHistory ||= []; doc.packingDetails ||= []; doc.shippingAddress ||= {}; doc.wa ||= { orderConfirmedSent: false, trackingSent: false, lastError: '', lastSentAt: null }; },
  populate: {
    user: { model: () => User, local: 'user', as: 'user' },
    'items.product': { model: () => Product, local: 'items', jsonArray: 'items', jsonField: 'product' },
  },
});
export const Cart: any = createCompatModel({
  name: 'Cart', delegate: 'cart', fields: ['id', 'userId', 'items', 'createdAt', 'updatedAt'],
  aliases: { user: 'userId' }, jsonFields: ['items'], subdocumentArrays: ['items'], defaults: { items: [] },
  populate: { 'items.product': { model: () => Product, local: 'items', jsonArray: 'items', jsonField: 'product' } },
});

export const Wishlist: any = createCompatModel({
  name: 'Wishlist', delegate: 'wishlist', fields: ['id', 'userId', 'productIds', 'createdAt', 'updatedAt'],
  aliases: { user: 'userId', products: 'productIds' }, arrayFields: ['productIds'], defaults: { products: [] },
  populate: { products: { model: () => Product, local: 'products', as: 'products', many: true } },
});

export const Banner: any = createCompatModel({
  name: 'Banner', delegate: 'banner', fields: ['id', 'title', 'subtitle', 'image', 'link', 'isActive', 'showOnMobile', 'showOnWebsite', 'sortOrder', 'type', 'categoryId', 'createdAt', 'updatedAt'],
  aliases: { category: 'categoryId' }, defaults: { title: null, subtitle: null, image: null, link: null, isActive: true, showOnMobile: true, showOnWebsite: true, sortOrder: 0, type: 'hero', category: null },
  populate: { category: { model: () => Category, local: 'category', as: 'category' } },
});

export const Coupon: any = createCompatModel({
  name: 'Coupon', delegate: 'coupon', fields: ['id', 'code', 'description', 'discountType', 'discountValue', 'minOrderAmount', 'maxDiscount', 'usageLimit', 'usedCount', 'validFrom', 'validTill', 'isActive', 'createdAt', 'updatedAt'],
  defaults: { description: null, discountType: 'percent', minOrderAmount: 0, maxDiscount: null, usageLimit: 100, usedCount: 0, validFrom: null, validTill: null, isActive: true },
  beforeSave: doc => { if (doc.code) doc.code = String(doc.code).toUpperCase(); },
});
