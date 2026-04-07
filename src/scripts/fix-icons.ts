import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Category } from '../models/Product';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || '';

const fixIcons = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected for fixing icons');
    
    const cats = await Category.find({});
    for (const c of cats) {
      if (c.icon && c.icon.startsWith('http')) {
        let newIcon = '🎁';
        if (c.name.toLowerCase().includes('handbag')) newIcon = '👜';
        else if (c.name.toLowerCase().includes('accessor')) newIcon = '🎀';
        else if (c.name.toLowerCase().includes('keychain')) newIcon = '🔑';
        else if (c.name.toLowerCase().includes('gift')) newIcon = '🎁';
        
        c.icon = newIcon;
        await c.save();
        console.log(`Fixed icon for ${c.name} -> ${newIcon}`);
      }
    }
    console.log('Icons fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing icons:', error);
    process.exit(1);
  }
};

fixIcons();
