import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from '../models/Product';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || '';

const fixPrices = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected for fixing product prices');
    
    const products = await Product.find({});
    let updatedCount = 0;
    
    for (const p of products) {
      // Check if price or mrp have long decimal parts
      if (p.price % 1 !== 0 || p.mrp % 1 !== 0) {
        p.price = Math.round(p.price);
        p.mrp = Math.round(p.mrp);
        
        // Also recalculate discount if needed (Product schema pre-save hook handles it if any, but we can rely on it)
        await p.save();
        console.log(`Fixed price for ${p.name}: ₹${p.price} | MRP: ₹${p.mrp}`);
        updatedCount++;
      }
    }
    console.log(`Prices fixed successfully for ${updatedCount} products!`);
    process.exit(0);
  } catch (error) {
    console.error('Error fixing prices:', error);
    process.exit(1);
  }
};

fixPrices();
