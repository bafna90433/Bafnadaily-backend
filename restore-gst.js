// Reverts gstRate from a backup file created by set-gst-18.js.
// Usage: node restore-gst.js gst-backup-<timestamp>.json
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const file = process.argv[2];
if (!file) { console.error('Usage: node restore-gst.js <backup-file.json>'); process.exit(1); }

async function run() {
  const docs = JSON.parse(fs.readFileSync(path.resolve(__dirname, file), 'utf8'));
  const conn = await mongoose.createConnection(process.env.MONGO_URI).asPromise();
  const products = conn.db.collection('products');

  const ops = docs.map(d => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(d._id) },
      update: d.gstRate === undefined || d.gstRate === null
        ? { $unset: { gstRate: '' } }
        : { $set: { gstRate: d.gstRate } },
    },
  }));

  const result = await products.bulkWrite(ops);
  console.log(`Restored ${docs.length} products — modified: ${result.modifiedCount}`);
  await conn.close();
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
