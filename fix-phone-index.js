/**
 * fix-phone-index.js
 * 
 * Problem: MongoDB ka phone_1 index bina sparse ke bana tha.
 * Isse ek se zyada Google users (phone=null) E11000 duplicate error de rahe the.
 * 
 * Fix: Purana index drop karo aur naya sparse index banao.
 * 
 * Run: node fix-phone-index.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixPhoneIndex() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI not found in .env');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected!');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    // List existing indexes
    const indexes = await collection.indexes();
    console.log('\n📋 Current indexes on users collection:');
    indexes.forEach(idx => console.log(' -', idx.name, JSON.stringify(idx.key), idx.sparse ? '(sparse)' : '(NOT sparse)'));

    // Check if old non-sparse phone_1 index exists
    const oldPhoneIndex = indexes.find(idx => idx.name === 'phone_1' && !idx.sparse);
    
    if (oldPhoneIndex) {
      console.log('\n⚠️  Found old non-sparse phone_1 index. Dropping it...');
      await collection.dropIndex('phone_1');
      console.log('✅ Old phone_1 index dropped!');

      // Create new sparse unique index
      await collection.createIndex({ phone: 1 }, { unique: true, sparse: true, name: 'phone_1' });
      console.log('✅ New sparse unique phone_1 index created!');
    } else {
      const sparsePhoneIndex = indexes.find(idx => idx.name === 'phone_1' && idx.sparse);
      if (sparsePhoneIndex) {
        console.log('\n✅ phone_1 index is already sparse. No fix needed!');
      } else {
        console.log('\n⚠️  phone_1 index not found. Creating sparse index...');
        await collection.createIndex({ phone: 1 }, { unique: true, sparse: true, name: 'phone_1' });
        console.log('✅ Sparse unique phone_1 index created!');
      }
    }

    // Also fix any users with phone: "" (empty string) → set to undefined
    const emptyPhoneUsers = await collection.find({ phone: '' }).toArray();
    if (emptyPhoneUsers.length > 0) {
      console.log(`\n⚠️  Found ${emptyPhoneUsers.length} users with phone="" (Google users). Fixing...`);
      await collection.updateMany(
        { phone: '' },
        { $unset: { phone: 1 } }
      );
      console.log('✅ Cleared empty phone strings from Google users!');
    }

    // Show final indexes
    const finalIndexes = await collection.indexes();
    console.log('\n📋 Final indexes:');
    finalIndexes.forEach(idx => console.log(' -', idx.name, JSON.stringify(idx.key), idx.sparse ? '(sparse ✅)' : '(NOT sparse ❌)'));

    console.log('\n🎉 Done! Google login should now work for multiple users.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixPhoneIndex();
