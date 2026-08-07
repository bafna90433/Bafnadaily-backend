// Sets gstRate = 18 on all non-deleted products.
// Backs up previous values to gst-backup-<timestamp>.json first (revert with restore-gst.js).
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const FILTER = { isDeleted: { $ne: true } };

async function run() {
  const conn = await mongoose.createConnection(process.env.MONGO_URI).asPromise();
  const products = conn.db.collection('products');

  const docs = await products.find(FILTER, { projection: { _id: 1, name: 1, gstRate: 1 } }).toArray();
  const backupFile = path.join(__dirname, `gst-backup-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(docs, null, 2));
  console.log(`Backup: ${backupFile} (${docs.length} products)`);

  const result = await products.updateMany(FILTER, { $set: { gstRate: 18 } });
  console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

  const rows = await products.aggregate([
    { $match: FILTER },
    { $group: { _id: '$gstRate', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]).toArray();
  console.log('After — gstRate -> count');
  rows.forEach(r => console.log(`${r._id ?? '(not set)'}\t${r.count}`));

  await conn.close();
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
