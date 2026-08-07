// Read-only: current GST rate distribution across products
const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  const conn = await mongoose.createConnection(process.env.MONGO_URI).asPromise();
  const db = conn.db;
  const rows = await db.collection('products').aggregate([
    { $group: { _id: '$gstRate', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]).toArray();
  console.log('gstRate -> count');
  rows.forEach(r => console.log(`${r._id === undefined || r._id === null ? '(not set)' : r._id}\t${r.count}`));
  console.log('TOTAL products:', await db.collection('products').countDocuments());
  await conn.close();
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
