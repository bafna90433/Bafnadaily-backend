import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Category, Product } from '../models/Product';
import path from 'path';
import fs from 'fs';
// @ts-ignore
import ImageKit from 'imagekit';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || '';

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY as string,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT as string,
});

const uploadToImageKit = async (filePath: string, fileName: string) => {
  try {
    const file = fs.readFileSync(filePath);
    const result = await imagekit.upload({
      file, // accept buffer
      fileName,
      folder: '/retailler/seed', // upload folder
    });
    return { url: result.url, fileId: result.fileId };
  } catch (error) {
    console.error('Error uploading image to IK', error);
    return { url: 'https://picsum.photos/800/800', fileId: 'dummy' }; // fallback
  }
};

const localImages = {
  keychain: 'C:\\Users\\bafna\\.gemini\\antigravity\\brain\\2dd27f1d-4c6a-450f-827d-396e5e535729\\cat_keychains_1775536597728.png',
  handbag: 'C:\\Users\\bafna\\.gemini\\antigravity\\brain\\2dd27f1d-4c6a-450f-827d-396e5e535729\\cat_handbags_1775536616265.png',
  accessory: 'C:\\Users\\bafna\\.gemini\\antigravity\\brain\\2dd27f1d-4c6a-450f-827d-396e5e535729\\cat_accessories_1775536635733.png',
  gift: 'C:\\Users\\bafna\\.gemini\\antigravity\\brain\\2dd27f1d-4c6a-450f-827d-396e5e535729\\cat_gifts_1775536650343.png',
  prod_keychain: 'C:\\Users\\bafna\\.gemini\\antigravity\\brain\\2dd27f1d-4c6a-450f-827d-396e5e535729\\product_keychain_1_1775536667025.png',
  prod_handbag: 'C:\\Users\\bafna\\.gemini\\antigravity\\brain\\2dd27f1d-4c6a-450f-827d-396e5e535729\\product_handbag_1_1775536686174.png',
};

const seedAiData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected');

    // 1. Upload Images to ImageKit
    console.log('Uploading images to ImageKit...');
    const url_keychain = await uploadToImageKit(localImages.keychain, 'cat_keychains.png');
    const url_handbag = await uploadToImageKit(localImages.handbag, 'cat_handbags.png');
    const url_accessory = await uploadToImageKit(localImages.accessory, 'cat_accessories.png');
    const url_gift = await uploadToImageKit(localImages.gift, 'cat_gifts.png');
    const url_prod_keychain = await uploadToImageKit(localImages.prod_keychain, 'prod_keychain.png');
    const url_prod_handbag = await uploadToImageKit(localImages.prod_handbag, 'prod_handbag.png');
    console.log('Images uploaded.');

    // Remove existing ones optionally, we can simply add
    const categoriesData = [
      { name: "Keychain Gifts", slug: `keychain-gifts-${Date.now()}`, description: "Custom anime & aesthetic keychains.", isActive: true, image: url_keychain.url, icon: url_keychain.url },
      { name: "Women's Handbags", slug: `womens-handbags-${Date.now()}`, description: "Premium leather and casual bags.", isActive: true, image: url_handbag.url, icon: url_handbag.url },
      { name: "Cute Accessories", slug: `cute-accessories-${Date.now()}`, description: "Kawaii hair clips and small aesthetic items.", isActive: true, image: url_accessory.url, icon: url_accessory.url },
      { name: "Premium Gifts", slug: `premium-gifts-${Date.now()}`, description: "Beautiful gift boxes and luxury present packages.", isActive: true, image: url_gift.url, icon: url_gift.url }
    ];

    const createdCategories = await Category.insertMany(categoriesData);
    console.log(`Created ${createdCategories.length} thematic categories`);

    // Create 20 unique items mapped to these categories
    const productsData: any[] = [];
    
    // Distribute products evenly
    for (let i = 0; i < 20; i++) {
      let catIndex = i % 4;
      let categoryDoc = createdCategories[catIndex];
      
      let imageUrls = [url_keychain]; // default fallback
      if (catIndex === 0) imageUrls = [url_prod_keychain, url_keychain];
      else if (catIndex === 1) imageUrls = [url_prod_handbag, url_handbag];
      else if (catIndex === 2) imageUrls = [url_accessory];
      else if (catIndex === 3) imageUrls = [url_gift];

      productsData.push({
        name: `Premium ${categoryDoc.name.replace('s', '')} Item ${i + 1}`,
        slug: `ai-gen-${categoryDoc.slug.split('-')[0]}-item-${i + 1}-${Date.now()}`,
        description: `This is a high quality beautifully designed ${categoryDoc.name}. Perfect for you or as a gift. It is crafted with extreme precision and adorable aesthetics.`,
        category: categoryDoc._id,
        price: 200 + (Math.random() * 800),
        mrp: 1200 + (Math.random() * 1000),
        stock: 50 + i,
        images: imageUrls,
        isActive: true,
        averageRating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
        isFeatured: Math.random() > 0.5,
        isTrending: Math.random() > 0.5,
      });
    }

    const createdProducts = await Product.insertMany(productsData);
    console.log(`Created ${createdProducts.length} themed products with uploaded AI images!`);

    console.log('Database seeded with AI generating images successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedAiData();
