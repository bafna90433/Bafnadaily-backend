import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Admin } from '../models/User';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;

const resetAdmin = async () => {
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI not found in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'admin@reteiler.in';
    const password = 'Admin@123';

    let admin = await Admin.findOne({ email });

    if (admin) {
      console.log(`ℹ️ Admin user ${email} already exists. Resetting password...`);
      admin.password = password;
      await admin.save();
      console.log('✅ Password reset successfully!');
    } else {
      console.log(`ℹ️ Admin user ${email} not found. Creating...`);
      await Admin.create({
        name: 'Super Admin',
        email,
        password,
        role: 'superadmin',
        isActive: true
      });
      console.log('✅ Admin user created successfully!');
    }

    console.log('-----------------------------------');
    console.log(`Login Email: ${email}`);
    console.log(`Login Password: ${password}`);
    console.log('-----------------------------------');

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

resetAdmin();
