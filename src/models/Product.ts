import mongoose, { Schema, Document } from 'mongoose';

// ─── Category ─────────────────────────────────────────────────────────────────
export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  parent?: mongoose.Types.ObjectId;
  isActive: boolean;
  sortOrder: number;
  featured: boolean;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    image: String,
    icon: String,
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Category = mongoose.model<ICategory>('Category', categorySchema);

// ─── Product ──────────────────────────────────────────────────────────────────
export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  images: { url: string; fileId?: string }[];
  category: mongoose.Types.ObjectId;
  subCategory?: mongoose.Types.ObjectId;
  tags: string[];
  price: number;
  mrp: number;
  discount: number;
  stock: number;
  sku?: string;
  variants: { name: string; value: string; additionalPrice: number; stock: number; sku?: string }[];
  reviews: { user: mongoose.Types.ObjectId; rating: number; comment: string; images?: string[]; createdAt?: Date }[];
  averageRating: number;
  numReviews: number;
  isActive: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  giftWrapping: boolean;
  material?: string;
  color: string[];
  weight?: number;
  sold: number;
  barcode?: string;
  minQty: number;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    shortDescription: String,
    images: [{ url: String, fileId: String }],
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
    tags: [String],
    price: { type: Number, required: true },
    mrp: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    sku: { type: String, sparse: true },
    variants: [{ name: String, value: String, additionalPrice: { type: Number, default: 0 }, stock: { type: Number, default: 0 }, sku: String }],
    reviews: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, rating: { type: Number, min: 1, max: 5 }, comment: String, images: [String], createdAt: { type: Date, default: Date.now } }],
    averageRating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    giftWrapping: { type: Boolean, default: false },
    material: String,
    color: [String],
    weight: Number,
    sold: { type: Number, default: 0 },
    barcode: { type: String, unique: true, sparse: true },
    minQty: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true }
);

productSchema.pre('save', function (next) {
  if (this.reviews.length > 0) {
    this.averageRating = this.reviews.reduce((a: number, b: any) => a + b.rating, 0) / this.reviews.length;
    this.numReviews = this.reviews.length;
  }
  if (this.mrp > 0) this.discount = Math.round(((this.mrp - this.price) / this.mrp) * 100);
  next();
});

productSchema.index({ name: 'text', description: 'text', tags: 'text', barcode: 'text' });

export const Product = mongoose.model<IProduct>('Product', productSchema);
