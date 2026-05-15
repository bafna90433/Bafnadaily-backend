import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Order } from '../models/Order';
import { Product } from '../models/Product';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || '';

const backfillMrp = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected — backfilling MRP on order items...');

    // Fetch all orders where any item has no mrp
    const orders = await Order.find({ 'items.mrp': { $exists: false } });
    console.log(`Found ${orders.length} orders without MRP`);

    let updatedOrders = 0;
    let updatedItems = 0;

    for (const order of orders) {
      let changed = false;
      for (const item of order.items as any[]) {
        if (!item.mrp) {
          // Lookup product by id to get its MRP
          const product = await Product.findById(item.product).select('mrp price').lean() as any;
          if (product) {
            item.mrp = product.mrp || product.price;
          } else {
            // Product deleted — fallback to price
            item.mrp = item.price;
          }
          changed = true;
          updatedItems++;
        }
      }
      if (changed) {
        await order.save();
        updatedOrders++;
        console.log(`Updated order ${order.orderNumber} (${order.items.length} items)`);
      }
    }

    console.log(`\nDone! Updated ${updatedItems} items across ${updatedOrders} orders.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

backfillMrp();
