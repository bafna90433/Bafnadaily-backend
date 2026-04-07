import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Visitor } from '../models/Visitor';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const STATES = [
  { state: 'Maharashtra', city: 'Mumbai', count: 45 },
  { state: 'Maharashtra', city: 'Pune', count: 18 },
  { state: 'Delhi', city: 'New Delhi', count: 38 },
  { state: 'Karnataka', city: 'Bangalore', count: 32 },
  { state: 'Tamil Nadu', city: 'Chennai', count: 28 },
  { state: 'Tamil Nadu', city: 'Coimbatore', count: 15 },
  { state: 'Uttar Pradesh', city: 'Lucknow', count: 22 },
  { state: 'Uttar Pradesh', city: 'Noida', count: 16 },
  { state: 'Gujarat', city: 'Ahmedabad', count: 20 },
  { state: 'Gujarat', city: 'Surat', count: 12 },
  { state: 'Rajasthan', city: 'Jaipur', count: 18 },
  { state: 'West Bengal', city: 'Kolkata', count: 25 },
  { state: 'Telangana', city: 'Hyderabad', count: 30 },
  { state: 'Kerala', city: 'Kochi', count: 14 },
  { state: 'Punjab', city: 'Chandigarh', count: 10 },
  { state: 'Haryana', city: 'Gurugram', count: 15 },
  { state: 'Madhya Pradesh', city: 'Indore', count: 11 },
  { state: 'Bihar', city: 'Patna', count: 8 },
  { state: 'Odisha', city: 'Bhubaneswar', count: 7 },
  { state: 'Assam', city: 'Guwahati', count: 5 },
  { state: 'Jharkhand', city: 'Ranchi', count: 6 },
  { state: 'Chhattisgarh', city: 'Raipur', count: 4 },
  { state: 'Himachal Pradesh', city: 'Shimla', count: 3 },
  { state: 'Goa', city: 'Panaji', count: 5 },
  { state: 'Andhra Pradesh', city: 'Visakhapatnam', count: 9 },
];

const PAGES = ['/', '/products', '/product/keychain-gift-1', '/product/handbag-2', '/category/keychains', '/category/handbags', '/cart', '/checkout', '/wishlist', '/search', '/login'];
const DEVICES: ('mobile' | 'tablet' | 'desktop')[] = ['mobile', 'mobile', 'mobile', 'desktop', 'desktop', 'tablet'];
const BROWSERS = ['Chrome', 'Chrome', 'Chrome', 'Safari', 'Firefox', 'Edge', 'Opera'];
const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/17.0',
];

const randomIP = () => `${103 + Math.floor(Math.random() * 50)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log('MongoDB Connected for seeding visitors');

    await Visitor.deleteMany({});
    console.log('Cleared old visitor data');

    const visitors: any[] = [];
    const now = Date.now();

    for (const { state, city, count } of STATES) {
      for (let i = 0; i < count; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const hoursAgo = Math.floor(Math.random() * 24);
        const createdAt = new Date(now - daysAgo * 86400000 - hoursAgo * 3600000);
        const sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        visitors.push({
          ip: randomIP(),
          userAgent: UAS[Math.floor(Math.random() * UAS.length)],
          page: PAGES[Math.floor(Math.random() * PAGES.length)],
          referrer: Math.random() > 0.6 ? 'https://google.com' : '',
          state,
          city,
          country: 'India',
          device: DEVICES[Math.floor(Math.random() * DEVICES.length)],
          browser: BROWSERS[Math.floor(Math.random() * BROWSERS.length)],
          sessionId,
          createdAt,
        });
      }
    }

    await Visitor.insertMany(visitors);
    console.log(`✅ Seeded ${visitors.length} visitor records across ${STATES.length} cities!`);

    // Summary
    const stateCount: Record<string, number> = {};
    visitors.forEach(v => { stateCount[v.state] = (stateCount[v.state] || 0) + 1; });
    console.log('\n📊 State-wise breakdown:');
    Object.entries(stateCount).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
      console.log(`   ${s}: ${c} visits`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

seed();
