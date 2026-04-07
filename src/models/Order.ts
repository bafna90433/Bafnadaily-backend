import mongoose, { Schema, Document } from 'mongoose';

// ─── Order ────────────────────────────────────────────────────────────────────
export interface IOrder extends Document {
  orderNumber: string;
  user: mongoose.Types.ObjectId;
  items: { product: mongoose.Types.ObjectId; name: string; image?: string; price: number; quantity: number; variant?: string }[];
  shippingAddress: { name: string; phone: string; addressLine1: string; addressLine2?: string; city: string; state: string; pincode: string };
  paymentMethod: 'cod' | 'online' | 'upi';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string;
  orderStatus: 'placed' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  statusHistory: { status: string; note?: string; updatedAt: Date }[];
  subtotal: number;
  shippingCharge: number;
  discount: number;
  couponCode?: string;
  total: number;
  giftWrapping: boolean;
  giftMessage?: string;
  notes?: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{ product: { type: Schema.Types.ObjectId, ref: 'Product' }, name: String, image: String, price: Number, quantity: Number, variant: String }],
    shippingAddress: { name: String, phone: String, addressLine1: String, addressLine2: String, city: String, state: String, pincode: String },
    paymentMethod: { type: String, enum: ['cod', 'online', 'upi'], default: 'cod' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    paymentId: String,
    orderStatus: { type: String, enum: ['placed','confirmed','processing','shipped','delivered','cancelled','returned'], default: 'placed' },
    statusHistory: [{ status: String, note: String, updatedAt: { type: Date, default: Date.now } }],
    subtotal: Number,
    shippingCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    couponCode: String,
    total: Number,
    giftWrapping: { type: Boolean, default: false },
    giftMessage: String,
    notes: String,
    trackingNumber: String,
    estimatedDelivery: Date,
  },
  { timestamps: true }
);

orderSchema.pre('save', function (next) {
  if (!this.orderNumber) this.orderNumber = 'RET' + Date.now().toString().slice(-8);
  next();
});

export const Order = mongoose.model<IOrder>('Order', orderSchema);

// ─── Cart ─────────────────────────────────────────────────────────────────────
const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', unique: true },
    items: [{ product: { type: Schema.Types.ObjectId, ref: 'Product' }, quantity: { type: Number, default: 1 }, variant: String, price: Number }],
  },
  { timestamps: true }
);
export const Cart = mongoose.model('Cart', cartSchema);

// ─── Wishlist ─────────────────────────────────────────────────────────────────
const wishlistSchema = new Schema(
  { user: { type: Schema.Types.ObjectId, ref: 'User', unique: true }, products: [{ type: Schema.Types.ObjectId, ref: 'Product' }] },
  { timestamps: true }
);
export const Wishlist = mongoose.model('Wishlist', wishlistSchema);

// ─── Banner ───────────────────────────────────────────────────────────────────
const bannerSchema = new Schema(
  { title: String, subtitle: String, image: String, link: String, isActive: { type: Boolean, default: true }, sortOrder: { type: Number, default: 0 }, type: { type: String, enum: ['hero','promo','category'], default: 'hero' } },
  { timestamps: true }
);
export const Banner = mongoose.model('Banner', bannerSchema);

// ─── Coupon ───────────────────────────────────────────────────────────────────
const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    description: String,
    discountType: { type: String, enum: ['percent', 'flat'], default: 'percent' },
    discountValue: { type: Number, required: true },
    minOrderAmount: { type: Number, default: 0 },
    maxDiscount: Number,
    usageLimit: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },
    validFrom: Date,
    validTill: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const Coupon = mongoose.model('Coupon', couponSchema);
