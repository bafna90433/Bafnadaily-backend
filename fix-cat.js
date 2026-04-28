const mongoose = require('mongoose');
const BAFNADAILY_URI = 'mongodb+srv://reteiler:Keychain@reteiler.pujzma5.mongodb.net/?appName=Reteiler';

async function run() {
  const conn = await mongoose.createConnection(BAFNADAILY_URI).asPromise();
  const db = conn.db;

  const plushiesCat = await db.collection('categories').findOne({ name: 'PLUSHIES' });
  const teddyCat = await db.collection('categories').findOne({ _id: new mongoose.Types.ObjectId('69df70fb81fbd98b7245c706') }); // The real Teddy

  if (plushiesCat && teddyCat) {
    await db.collection('categories').updateOne(
      { _id: plushiesCat._id },
      { $set: { parent: teddyCat._id, isActive: true } }
    );
    console.log('Fixed parent and set isActive to true for PLUSHIES');
  } else {
    console.log('Could not find categories');
  }

  process.exit(0);
}
run();
