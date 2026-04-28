const mongoose = require('mongoose');

const BAFNADAILY_URI = 'mongodb+srv://reteiler:Keychain@reteiler.pujzma5.mongodb.net/?appName=Reteiler';

async function run() {
  const connDaily = await mongoose.createConnection(BAFNADAILY_URI).asPromise();
  const db = connDaily.db;

  // Find Teddy category
  const teddyCat = await db.collection('categories').findOne({ name: /Teddy/i });
  if (!teddyCat) {
    console.log('Teddy category not found!');
    process.exit(1);
  }

  // Find PLUSHIES category
  const plushiesCat = await db.collection('categories').findOne({ name: /PLUSHIES/i });
  if (!plushiesCat) {
    console.log('PLUSHIES category not found!');
    process.exit(1);
  }

  // Update PLUSHIES to be a subcategory of Teddy
  const result = await db.collection('categories').updateOne(
    { _id: plushiesCat._id },
    { $set: { parent: teddyCat._id } }
  );

  console.log('Updated PLUSHIES parent to Teddy. Modified count:', result.modifiedCount);
  process.exit(0);
}

run().catch(console.error);
