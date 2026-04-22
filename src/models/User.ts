import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface IUser extends Document {
  name: string;
  phone: string;
  email?: string;
  googleId?: string;
  avatar?: string;
  addresses: any[];
  isActive: boolean;
  isBlocked: boolean;
  blockReason?: string;
  lastLogin?: Date;
  customerType: 'retail' | 'wholesale' | 'b2b';
  isSpecialCustomer: boolean;
  codEnabled: boolean;
  creditLimit: number;
  gstNumber?: string;
  businessName?: string;
  totalOrders: number;
  totalSpent: number;
  notes?: string;
  getSignedToken(): string;
}

const addressSchema = new Schema({
  shopName: { type: String, default: '' },
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  gstNumber: { type: String, default: '' },
  addressLine1: { type: String, default: '' },
  addressLine2: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new Schema<IUser>(
  {
    name: { type: String, trim: true, default: '' },
    phone: { type: String, sparse: true, unique: true },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    googleId: { type: String, sparse: true, unique: true },
    avatar: { type: String, default: '' },
    addresses: [addressSchema],
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    blockReason: String,
    lastLogin: Date,
    customerType: { type: String, enum: ['retail', 'wholesale', 'b2b'], default: 'retail' },
    isSpecialCustomer: { type: Boolean, default: false },
    codEnabled: { type: Boolean, default: true },
    creditLimit: { type: Number, default: 0 },
    gstNumber: String,
    businessName: String,
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    notes: String,
  },
  { timestamps: true }
);

userSchema.methods.getSignedToken = function () {
  return jwt.sign({ id: this._id }, (process.env.JWT_SECRET as string), {
    expiresIn: (process.env.JWT_EXPIRE as any),
  });
};

export const User = mongoose.model<IUser>('User', userSchema);

// OTP
export interface IOTP extends Document { phone: string; otp: string; expiresAt: Date; }
const otpSchema = new Schema<IOTP>({
  phone: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) },
});
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const OTP = mongoose.model<IOTP>('OTP', otpSchema);

// Admin
export interface IAdmin extends Document {
  name: string; email: string; password: string;
  role: 'superadmin' | 'admin' | 'manager';
  isActive: boolean; lastLogin?: Date;
  matchPassword(entered: string): Promise<boolean>;
  getSignedToken(): string;
}

const adminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['superadmin', 'admin', 'manager'], default: 'admin' },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
  },
  { timestamps: true }
);

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

adminSchema.methods.matchPassword = async function (entered: string) {
  return bcrypt.compare(entered, this.password);
};

adminSchema.methods.getSignedToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, (process.env.ADMIN_JWT_SECRET as string), {
    expiresIn: (process.env.ADMIN_JWT_EXPIRE as any),
  });
};

export const Admin = mongoose.model<IAdmin>('Admin', adminSchema);
