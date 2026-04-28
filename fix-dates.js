const mongoose = require('mongoose');
const BAFNADAILY_URI = 'mongodb+srv://reteiler:Keychain@reteiler.pujzma5.mongodb.net/?appName=Reteiler';

async function run() {
  const conn = await mongoose.createConnection(BAFNADAILY_URI).asPromise();
  const db = conn.db;

  const plushiesCat = await db.collection('categories').findOne({ name: 'PLUSHIES' });

  if (plushiesCat) {
    const result = await db.collection('products').updateMany(
      { category: plushiesCat._id },
      { $set: { createdAt: new Date() } }
    );
    console.log('Updated createdAt for products. Modified count:', result.modifiedCount);
  }

  process.exit(0);
}
run();
