import express, { Request, Response } from 'express';
import { Admin } from '../models/User';
import { adminProtect, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = express.Router();

// POST /api/admin/auth/login - Email + Password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!admin.isActive) return res.status(403).json({ success: false, message: 'Account disabled' });

    const match = await admin.matchPassword(password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    admin.lastLogin = new Date();
    await admin.save();

    const token = admin.getSignedToken();
    res.json({
      success: true, token,
      admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/auth/me
router.get('/me', adminProtect, (req: AuthRequest, res: Response) => {
  res.json({ success: true, admin: req.admin });
});

// POST /api/admin/auth/change-password
router.post('/change-password', adminProtect, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin._id);
    if (!admin) return res.status(404).json({ success: false, message: 'Not found' });
    const match = await admin.matchPassword(currentPassword);
    if (!match) return res.status(400).json({ success: false, message: 'Current password wrong' });
    admin.password = newPassword;
    await admin.save();
    res.json({ success: true, message: 'Password changed' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin management (superadmin only)
router.get('/list', adminProtect, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, admins });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/create', adminProtect, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const admin = await Admin.create(req.body);
    res.status(201).json({ success: true, admin: { ...admin.toObject(), password: undefined } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', adminProtect, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const admin = await Admin.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    res.json({ success: true, admin });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
