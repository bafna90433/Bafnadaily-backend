// Read-only: inspect gstRate snapshots on a single order's items
const mongoose = require('mongoose');
require('dotenv').config();

const ORDER_NUMBER = process.argv[2] || 'RET27215847';

async function run() {
  const conn = await mongoose.createConnection(process.env.MONGO_URI).asPromise();
  const order = await conn.db.collection('orders').findOne({ orderNumber: ORDER_NUMBER });
  if (!order) { console.log('Order not found:', ORDER_NUMBER); process.exit(1); }

  console.log(`Order ${order.orderNumber} — ${order.items.length} items, total ₹${order.total}`);
  const byRate = {};
  order.items.forEach(it => {
    const r = it.gstRate === undefined ? '(not set)' : it.gstRate;
    byRate[r] = (byRate[r] || 0) + 1;
  });
  console.log('item gstRate -> count:', byRate);
  console.log('\nItems with gstRate != 18:');
  order.items.filter(it => it.gstRate !== 18).forEach(it =>
    console.log(`  ${it.sku || '-'}\t${it.gstRate ?? '(not set)'}\t${it.name?.slice(0, 55)}`));

  await conn.close();
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
