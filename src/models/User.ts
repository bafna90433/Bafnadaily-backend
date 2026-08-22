import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createCompatModel } from '../db/compat';

export type IUser = any;
export type IOTP = any;
export type IAdmin = any;

export const User: any = createCompatModel({
  name: 'User', delegate: 'user',
  fields: ['id', 'name', 'phone', 'email', 'googleId', 'avatar', 'addresses', 'isActive', 'isBlocked', 'blockReason', 'lastLogin', 'customerType', 'isSpecialCustomer', 'codEnabled', 'creditLimit', 'gstNumber', 'businessName', 'whatsapp', 'visitingCard', 'totalOrders', 'totalSpent', 'notes', 'createdAt', 'updatedAt'],
  jsonFields: ['addresses'], subdocumentArrays: ['addresses'],
  defaults: { name: '', phone: null, email: null, googleId: null, avatar: '', addresses: [], isActive: true, isBlocked: false, blockReason: null, lastLogin: null, customerType: 'retail', isSpecialCustomer: false, codEnabled: true, creditLimit: 0, gstNumber: null, businessName: null, whatsapp: null, visitingCard: null, totalOrders: 0, totalSpent: 0, notes: null },
  beforeSave: doc => { if (doc.email) doc.email = String(doc.email).trim().toLowerCase(); if (doc.phone === '') doc.phone = null; if (doc.googleId === '') doc.googleId = null; },
  methods: { getSignedToken: doc => jwt.sign({ id: doc._id }, process.env.JWT_SECRET as string, { expiresIn: (process.env.JWT_EXPIRE || '30d') as any }) },
});
export const OTP: any = createCompatModel({
  name: 'OTP', delegate: 'otp', fields: ['id', 'phone', 'otp', 'expiresAt'],
  beforeSave: doc => { if (!doc.expiresAt) doc.expiresAt = new Date(Date.now() + 10 * 60 * 1000); },
});

export const Admin: any = createCompatModel({
  name: 'Admin', delegate: 'admin',
  fields: ['id', 'name', 'email', 'password', 'role', 'isActive', 'lastLogin', 'createdAt', 'updatedAt'],
  defaults: { role: 'admin', isActive: true, lastLogin: null },
  beforeSave: async (doc, original, isNew) => {
    doc.email = String(doc.email || '').trim().toLowerCase();
    if (doc.password && (isNew || !original || doc.password !== original.password)) doc.password = await bcrypt.hash(doc.password, 10);
  },
  methods: {
    matchPassword: (doc, entered: string) => bcrypt.compare(entered, doc.password),
    getSignedToken: doc => jwt.sign({ id: doc._id, role: doc.role }, (process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET) as string, { expiresIn: (process.env.ADMIN_JWT_EXPIRE || '7d') as any }),
  },
});
