import express, { Request, Response } from 'express';
import { SiteSettings } from '../models/Settings';
import { User } from '../models/User';
import { adminProtect, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types';
import getImageKit from "../config/imagekit";
import multer from 'multer';
import axios from 'axios';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── GET settings (public — returns safe subset) ──────────────────────────────
router.get('/public', async (req: Request, res: Response) => {
  try {
    let s = await SiteSettings.findOne();
    if (!s) {
      s = await SiteSettings.create({ homeLayout: 4, websiteLayout: 4, mobileLayout: 1 });
    } else {
      let needsSave = false;
      if (!s.homeLayout || s.homeLayout === 1) {
        s.homeLayout = 4;
        needsSave = true;
      }
      if (s.websiteLayout === undefined) {
        s.websiteLayout = s.homeLayout || 4;
        needsSave = true;
      }
      if (s.mobileLayout === undefined) {
        s.mobileLayout = 1;
        needsSave = true;
      }
      if (needsSave) await s.save();
    }
    res.json({
      success: true,
      settings: {
        siteName: s.siteName,
        siteTagline: s.siteTagline,
        siteLogo: s.siteLogo,
        favicon: s.favicon,
        whatsappNumber: s.whatsappNumber,
        whatsappEnabled: s.whatsappEnabled,
        supportEmail: s.supportEmail,
        supportPhone: s.supportPhone,
        homepageSections: s.homepageSections,
        codEnabled: s.codEnabled,
        codAdvancePercent: s.codAdvancePercent,
        codFlatCharge: s.codFlatCharge,
        upiEnabled: s.upiEnabled,
        upiId: s.upiId,
        promoText: s.promoText,
        freeShippingAbove: s.freeShippingAbove,
        standardShippingCharge: s.standardShippingCharge,
        giftWrapCharge: s.giftWrapCharge,
        b2bEnabled: s.b2bEnabled,
        moqPolicy: s.moqPolicy,
        maintenanceMode: s.maintenanceMode,
        maintenanceMessage: s.maintenanceMessage,
        subdomain: s.subdomain,
        customDomain: s.customDomain,
        adminSubdomain: s.adminSubdomain,
        adminCustomDomain: s.adminCustomDomain,
        razorpayEnabled: s.razorpay?.enabled,
        razorpayKeyId: s.razorpay?.enabled ? s.razorpay.keyId : '',
        shiprocketEnabled: s.shiprocket?.enabled,
        hapticFeedback: s.hapticFeedback !== false,
        homeLayout: s.homeLayout || 4,
        websiteLayout: s.websiteLayout || s.homeLayout || 4,
        mobileLayout: s.mobileLayout || 1,
      },
    });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── GET full settings (admin only) ──────────────────────────────────────────
router.get('/', adminProtect, async (req: Request, res: Response) => {
  try {
    let s = await SiteSettings.findOne();
    if (!s) {
      s = await SiteSettings.create({ homeLayout: 4, websiteLayout: 4, mobileLayout: 1 });
    } else {
      let needsSave = false;
      if (!s.homeLayout || s.homeLayout === 1) {
        s.homeLayout = 4;
        needsSave = true;
      }
      if (s.websiteLayout === undefined) {
        s.websiteLayout = s.homeLayout || 4;
        needsSave = true;
      }
      if (s.mobileLayout === undefined) {
        s.mobileLayout = 1;
        needsSave = true;
      }
      if (needsSave) await s.save();
    }
    res.json({ success: true, settings: s });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── UPDATE settings ──────────────────────────────────────────────────────────
router.put('/', adminProtect, async (req: Request, res: Response) => {
  try {
    let s = await SiteSettings.findOne();
    if (!s) s = await SiteSettings.create({});
    Object.assign(s, req.body);
    await s.save();
    res.json({ success: true, settings: s, message: 'Settings saved!' });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── Upload site logo ─────────────────────────────────────────────────────────
router.post('/logo', adminProtect, upload.single('logo'), async (req: any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
    let s = await SiteSettings.findOne();
    if (!s) s = await SiteSettings.create({});
    // Delete old logo
    if (s.siteLogoFileId) {
      try { await getImageKit().deleteFile(s.siteLogoFileId); } catch {}
    }
    const result = await getImageKit().upload({
      file: req.file.buffer,
      fileName: `logo_${Date.now()}`,
      folder: '/reteiler/brand',
    });
    s.siteLogo = result.url;
    s.siteLogoFileId = result.fileId;
    await s.save();
    res.json({ success: true, url: result.url, message: 'Logo updated!' });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── Toggle homepage section ──────────────────────────────────────────────────
router.put('/section/:key', adminProtect, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { enabled } = req.body;
    let s = await SiteSettings.findOne();
    if (!s) s = await SiteSettings.create({});
    (s.homepageSections as any)[key] = enabled;
    await s.save();
    res.json({ success: true, homepageSections: s.homepageSections });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── Razorpay create order ────────────────────────────────────────────────────
router.post('/razorpay/create-order', async (req: Request, res: Response) => {
  try {
    const s = await SiteSettings.findOne();
    if (!s?.razorpay?.enabled || !s.razorpay.keyId || !s.razorpay.keySecret) {
      return res.status(400).json({ success: false, message: 'Razorpay not configured' });
    }
    const { amount } = req.body; // amount in paise
    const auth = Buffer.from(`${s.razorpay.keyId}:${s.razorpay.keySecret}`).toString('base64');
    const response = await axios.post(
      'https://api.razorpay.com/v1/orders',
      { amount: Math.round(amount * 100), currency: 'INR', receipt: `rcpt_${Date.now()}` },
      { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' } }
    );
    res.json({ success: true, order: response.data, keyId: s.razorpay.keyId });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── Shiprocket auth + create shipment ───────────────────────────────────────
router.post('/shiprocket/auth', adminProtect, async (req: Request, res: Response) => {
  try {
    const s = await SiteSettings.findOne();
    if (!s?.shiprocket?.email) return res.status(400).json({ success: false, message: 'Shiprocket not configured' });
    const resp = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: s.shiprocket.email,
      password: s.shiprocket.password,
    });
    s.shiprocket.token = resp.data.token;
    s.shiprocket.tokenExpiry = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000); // 9 days
    await s.save();
    res.json({ success: true, message: 'Shiprocket authenticated!' });
  } catch (err: any) { res.status(500).json({ success: false, message: 'Shiprocket auth failed: ' + err.message }); }
});

router.post('/shiprocket/create-shipment', adminProtect, async (req: Request, res: Response) => {
  try {
    const s = await SiteSettings.findOne();
    if (!s?.shiprocket?.token) return res.status(400).json({ success: false, message: 'Shiprocket not authenticated. Please authenticate first.' });
    const resp = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
      req.body,
      { headers: { Authorization: `Bearer ${s.shiprocket.token}`, 'Content-Type': 'application/json' } }
    );
    res.json({ success: true, shipment: resp.data });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── Customer Management ──────────────────────────────────────────────────────

// Get all customers (admin)
router.get('/customers', adminProtect, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, type, blocked } = req.query as any;
    const query: any = {};
    if (search) query.$or = [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }, { businessName: new RegExp(search, 'i') }];
    if (type) query.customerType = type;
    if (blocked === 'true') query.isBlocked = true;
    const total = await User.countDocuments(query);
    const customers = await User.find(query).sort({ createdAt: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit));
    res.json({ success: true, customers, total });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// Block / Unblock customer
router.put('/customers/:id/block', adminProtect, async (req: Request, res: Response) => {
  try {
    const { isBlocked, blockReason } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked, blockReason: isBlocked ? blockReason : '' }, { new: true });
    res.json({ success: true, user, message: isBlocked ? 'Customer blocked' : 'Customer unblocked' });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// Update customer type / special / COD / notes
router.put('/customers/:id', adminProtect, async (req: Request, res: Response) => {
  try {
    const allowed = ['customerType', 'isSpecialCustomer', 'codEnabled', 'creditLimit', 'notes', 'gstNumber', 'businessName', 'name', 'email'];
    const update: any = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, user });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// Get single customer details
router.get('/customers/:id', adminProtect, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, customer: user });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

export default router;
