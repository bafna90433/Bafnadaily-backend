import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { Product, Category } from '../models/Product';
import { Order } from '../models/Order';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/reteiler');
  console.log('Connected to MongoDB');

  const order = await Order.findOne({ orderNumber: 'RET39449449' })
    .populate({
      path: 'items.product',
      model: Product,
      populate: {
        path: 'category',
        model: Category,
        select: 'name slug'
      }
    });

  if (!order) {
    console.log('Order not found');
    await mongoose.disconnect();
    return;
  }

  console.log('Order number:', order.orderNumber);
  order.items.forEach((it: any, i: number) => {
    console.log(`Item ${i+1}:`);
    console.log('  Name:', it.name);
    console.log('  SKU:', it.sku);
    console.log('  Product ID:', it.product?._id || it.product);
    if (it.product && typeof it.product === 'object') {
      console.log('  Populated Product Name:', it.product.name);
      console.log('  Product Category:', it.product.category);
    } else {
      console.log('  Product is NOT populated!');
    }
  });

  await mongoose.disconnect();
}

run().catch(console.error);
