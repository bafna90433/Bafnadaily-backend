import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Category, Product } from '../models/Product';
import path from 'path';

// Load env from the backend folder
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://reteiler:Keychain@reteiler.pujzma5.mongodb.net/?appName=Reteiler';

const seedDataWithRealImages = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected');

    // Create 6 unique categories
    const categoriesList = [
      { name: 'Electronics', description: 'Latest gadgets and electronic devices' },
      { name: 'Fashion', description: 'Trendy clothes and accessories' },
      { name: 'Home & Kitchen', description: 'Everything for your home' },
      { name: 'Beauty & Personal Care', description: 'Cosmetics and skincare products' },
      { name: 'Sports & Outdoors', description: 'Gear for your active lifestyle' },
      { name: 'Books & Stationery', description: 'Books, notebooks, and pens' },
    ];

    const categoriesToCreate = categoriesList.map((cat, i) => ({
      name: cat.name,
      slug: cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
      description: cat.description,
      isActive: true,
      image: `https://picsum.photos/seed/cat${i + Date.now()}/800/600`
    }));

    const createdCategories = await Category.insertMany(categoriesToCreate);
    console.log(`Created ${createdCategories.length} categories`);

    // Create 20 unique products with real-looking placeholder images
    const productsToCreate = Array.from({ length: 20 }).map((_, i) => {
      const categoryDoc = createdCategories[Math.floor(Math.random() * createdCategories.length)];
      
      const price = 500 + Math.floor(Math.random() * 5000);
      const mrp = price + 200 + Math.floor(Math.random() * 1000);
      
      return {
        name: `Premium ${categoryDoc.name} Item ${i + 1}`,
        slug: `premium-${categoryDoc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-item-${i + 1}-${Date.now()}`,
        description: `This is a high quality product in the ${categoryDoc.name} category. It features premium materials and great durability. Perfect for your daily needs.`,
        category: categoryDoc._id,
        price: price,
        mrp: mrp,
        stock: 10 + Math.floor(Math.random() * 100),
        images: [
          { url: `https://picsum.photos/seed/product${i}A${Date.now()}/800/800` },
          { url: `https://picsum.photos/seed/product${i}B${Date.now()}/800/800` },
          { url: `https://picsum.photos/seed/product${i}C${Date.now()}/800/800` }
        ],
        isActive: true,
        averageRating: 3 + Math.random() * 2,
        isFeatured: Math.random() > 0.8,
        isTrending: Math.random() > 0.8,
      };
    });

    const createdProducts = await Product.insertMany(productsToCreate);
    console.log(`Created ${createdProducts.length} products with descriptive names and real-looking images`);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedDataWithRealImages();
