import express, { Request, Response } from 'express';
import { Visitor } from '../models/Visitor';
import { adminProtect } from '../middleware/auth';
import axios from 'axios';

const router = express.Router();

// ─── Helper: detect device from user agent ─────────────────────────────────
const detectDevice = (ua: string): 'mobile' | 'tablet' | 'desktop' => {
  if (/mobi|android.*mobile|iphone|ipod/i.test(ua)) return 'mobile';
  if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) return 'tablet';
  return 'desktop';
};

// ─── Helper: detect browser ─────────────────────────────────────────────────
const detectBrowser = (ua: string): string => {
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/opera|opr/i.test(ua)) return 'Opera';
  return 'Other';
};

// ─── POST /api/analytics/track — Frontend calls this on every page load ─────
router.post('/track', async (req: Request, res: Response) => {
  try {
    const { page, referrer, sessionId } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
    const ua = req.headers['user-agent'] || '';

    let state = 'Unknown';
    let city = 'Unknown';
    let country = 'India';

    // Geo-locate IP using free API (skip for localhost)
    if (ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('192.168') && !ip.startsWith('10.')) {
      try {
        const geo = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`, { timeout: 2000 });
        if (geo.data.status === 'success') {
          state = geo.data.regionName || 'Unknown';
          city = geo.data.city || 'Unknown';
          country = geo.data.country || 'India';
        }
      } catch {}
    }

    await Visitor.create({
      ip,
      userAgent: ua,
      page: page || '/',
      referrer: referrer || '',
      state,
      city,
      country,
      device: detectDevice(ua),
      browser: detectBrowser(ua),
      sessionId: sessionId || `anon_${Date.now()}`,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/analytics/dashboard — Admin analytics data ────────────────────
router.get('/dashboard', adminProtect, async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query as any;
    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    const [
      totalVisits,
      uniqueVisitors,
      stateWise,
      deviceWise,
      browserWise,
      topPages,
      dailyTrend,
      todayVisits,
      cityWise,
      recentVisitors,
    ] = await Promise.all([
      // Total page views
      Visitor.countDocuments({ createdAt: { $gte: since } }),

      // Unique visitors (by sessionId)
      Visitor.distinct('sessionId', { createdAt: { $gte: since } }).then(r => r.length),

      // State-wise breakdown
      Visitor.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$state', count: { $sum: 1 }, uniqueSessions: { $addToSet: '$sessionId' } } },
        { $project: { _id: 1, count: 1, unique: { $size: '$uniqueSessions' } } },
        { $sort: { count: -1 } },
      ]),

      // Device breakdown
      Visitor.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$device', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Browser breakdown
      Visitor.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$browser', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Top visited pages
      Visitor.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$page', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Daily trend for chart
      Visitor.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            views: { $sum: 1 },
            unique: { $addToSet: '$sessionId' },
          },
        },
        { $project: { _id: 1, views: 1, unique: { $size: '$unique' } } },
        { $sort: { _id: 1 } },
      ]),

      // Today's visits
      Visitor.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),

      // City-wise (top 15)
      Visitor.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),

      // Recent visitors (last 20)
      Visitor.find().sort({ createdAt: -1 }).limit(20).select('ip state city device browser page createdAt'),
    ]);

    res.json({
      success: true,
      totalVisits,
      uniqueVisitors,
      todayVisits,
      stateWise,
      deviceWise,
      browserWise,
      topPages,
      dailyTrend,
      cityWise,
      recentVisitors,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
