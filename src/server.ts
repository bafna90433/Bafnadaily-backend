import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import { Admin } from './models/User';
import { SiteSettings } from './models/Settings';
import authRouter from './routes/auth';
import adminAuthRouter from './routes/adminAuth';
import settingsRouter from './routes/settings';
import analyticsRouter from './routes/analytics';
import {
  productsRouter, categoriesRouter, cartRouter, ordersRouter,
  wishlistRouter, uploadRouter, bannersRouter, couponsRouter, adminRouter
} from './routes/index';

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://admin.bafnadaily.com',
    'https://bafnadaily.com',
    'http://admin.bafnadaily.com',
    'http://bafnadaily.com'
  ],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Maintenance middleware (skip admin + settings routes)
app.use(async (req: any, res: any, next: any) => {
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/settings')) return next();
  try {
    const s = await SiteSettings.findOne().select('maintenanceMode maintenanceMessage');
    if (s?.maintenanceMode) {
      return res.status(503).json({ success: false, maintenance: true, message: s.maintenanceMessage || 'Site under maintenance' });
    }
  } catch {}
  next();
});

app.get('/', (_req: any, res: any) => res.json({ success: true, message: '🛍️ Reteiler API v2.0' }));

app.use('/api/auth', authRouter);
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/banners', bannersRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);

app.use((req: any, res: any) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err: any, req: any, res: any, _next: any) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Reteiler Server: http://localhost:${PORT}`);

  // Seed admin
  try {
    if (await Admin.countDocuments() === 0) {
      await Admin.create({ name: 'Super Admin', email: 'admin@reteiler.in', password: 'Admin@123', role: 'superadmin' });
      console.log('✅ Admin seeded: admin@reteiler.in / Admin@123');
    }
  } catch {}

  // Seed settings
  try {
    if (!await SiteSettings.findOne()) {
      await SiteSettings.create({ siteName: 'Reteiler', whatsappNumber: '7550350036' });
      console.log('✅ Settings seeded');
    }
  } catch {}
});
