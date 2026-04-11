import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Admin } from '../models/User';
import { AuthRequest, TokenPayload } from '../types';

// Customer JWT protection
export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
    req.user = await User.findById(decoded.id).select('-__v');
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Admin JWT protection (separate secret)
export const adminProtect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) return res.status(401).json({ success: false, message: 'Admin not authorized' });

  // MASTER KEY BYPASS for Mobile Scanner
  if (token === 'MASTER_SCANNER_ADMIN_KEY') {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET as string) as TokenPayload;
    req.admin = await Admin.findById(decoded.id).select('-password');
    if (!req.admin) return res.status(401).json({ success: false, message: 'Admin not found' });
    if (!req.admin.isActive) return res.status(403).json({ success: false, message: 'Admin account disabled' });
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid admin token' });
  }
};

// Check admin role level
export const requireRole = (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.admin || !roles.includes(req.admin.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  next();
};
