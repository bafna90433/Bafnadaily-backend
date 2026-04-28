const mongoose = require('mongoose');

const BAFNATOYS_URI = 'mongodb+srv://bafna90433:GjYEjSXkssT13Lrl@bafnatoys.a6a3rcp.mongodb.net/Bafnatoys?retryWrites=true&w=majority&appName=Bafnatoys';
const BAFNADAILY_URI = 'mongodb+srv://reteiler:Keychain@reteiler.pujzma5.mongodb.net/?appName=Reteiler';

async function run() {
  const connToys = await mongoose.createConnection(BAFNATOYS_URI).asPromise();
  const connDaily = await mongoose.createConnection(BAFNADAILY_URI).asPromise();

  console.log('Connected to both DBs');

  const toysDb = connToys.db;
  const dailyDb = connDaily.db;

  // Find PLUSHIES category in Bafnatoys
  const plushiesCat = await toysDb.collection('categories').findOne({ name: /plushies/i });
  if (!plushiesCat) {
    console.log('PLUSHIES category not found in Bafnatoys');
    process.exit(1);
  }
  console.log('Found PLUSHIES category in Bafnatoys:', plushiesCat._id);

  // Ensure PLUSHIES category exists in Bafnadaily
  let dailyCat = await dailyDb.collection('categories').findOne({ name: plushiesCat.name });
  if (!dailyCat) {
    const res = await dailyDb.collection('categories').insertOne({
      name: plushiesCat.name,
      slug: plushiesCat.slug || 'plushies',
      isActive: false, // OFF by default
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    dailyCat = { _id: res.insertedId };
    console.log('Created PLUSHIES category in Bafnadaily');
  } else {
    console.log('PLUSHIES category already exists in Bafnadaily');
  }

  // Find products under PLUSHIES in Bafnatoys
  const products = await toysDb.collection('products').find({ category: plushiesCat._id }).toArray();
  console.log(`Found ${products.length} products to import`);

  let importedCount = 0;
  for (const p of products) {
    // Check if product already exists by slug or sku
    const exists = await dailyDb.collection('products').findOne({
      $or: [{ slug: p.slug }, { sku: p.sku }]
    });

    if (exists) {
      console.log(`Skipping ${p.name} (already exists)`);
      continue;
    }

    const newProduct = {
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      mrp: p.mrp || p.price,
      price: p.price,
      stock: p.stock || 10,
      description: p.description || p.name,
      images: (p.images || []).map(url => ({ url })),
      category: dailyCat._id,
      isActive: false, // OFF by default
      isDeleted: false,
      isFeatured: false,
      isTrending: false,
      isNewArrival: false,
      isBestSeller: false,
      giftWrapping: false,
      minQty: 1,
      createdAt: p.createdAt || new Date(),
      updatedAt: p.updatedAt || new Date(),
    };

    await dailyDb.collection('products').insertOne(newProduct);
    importedCount++;
  }

  console.log(`Successfully imported ${importedCount} products!`);
  process.exit(0);
}

run().catch(console.error);
