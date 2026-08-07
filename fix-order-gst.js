// Sets every item's gstRate = 18 on a single order (prices/total unchanged — GST is inclusive).
// Backs up the order's item gstRates first.
// Usage: node fix-order-gst.js RET27215847
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const ORDER_NUMBER = process.argv[2];
if (!ORDER_NUMBER) { console.error('Usage: node fix-order-gst.js <ORDER_NUMBER>'); process.exit(1); }

async function run() {
  const conn = await mongoose.createConnection(process.env.MONGO_URI).asPromise();
  const orders = conn.db.collection('orders');

  const order = await orders.findOne({ orderNumber: ORDER_NUMBER });
  if (!order) { console.error('Order not found:', ORDER_NUMBER); process.exit(1); }

  const backupFile = path.join(__dirname, `gst-order-backup-${ORDER_NUMBER}-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(
    { orderNumber: order.orderNumber, total: order.total, items: order.items.map(i => ({ sku: i.sku, name: i.name, gstRate: i.gstRate })) },
    null, 2));
  console.log(`Backup: ${backupFile}`);

  const items = order.items.map(it => ({ ...it, gstRate: 18 }));
  const result = await orders.updateOne({ _id: order._id }, { $set: { items } });
  console.log(`Modified: ${result.modifiedCount}`);

  const after = await orders.findOne({ _id: order._id });
  const rates = [...new Set(after.items.map(i => i.gstRate))];
  console.log(`After — item rates: ${rates.join(', ')} | total ₹${after.total} (unchanged)`);

  // How many other orders still carry non-18 item rates?
  const others = await orders.countDocuments({ items: { $elemMatch: { gstRate: { $ne: 18 } } } });
  console.log(`Other orders with non-18% items: ${others}`);

  await conn.close();
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
