const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://reteiler:Keychain@reteiler.pujzma5.mongodb.net/?appName=Reteiler').then(async () => {
  const db = mongoose.connection.db;
  
  // Find all inactive categories
  const inactiveCats = await db.collection('categories').find({ isActive: false }).toArray();
  const inactiveIds = inactiveCats.map(c => c._id);
  
  // Update all categories whose parent is in inactiveIds to also be inactive
  const result = await db.collection('categories').updateMany(
    { parent: { $in: inactiveIds }, isActive: true },
    { $set: { isActive: false } }
  );
  
  console.log('Fixed orphaned categories:', result.modifiedCount);
  process.exit(0);
}).catch(console.error);
