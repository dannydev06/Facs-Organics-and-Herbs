const admin = require('firebase-admin');
const path = require('path');

// Try to load service account key
let serviceAccount;
try {
  serviceAccount = require(path.join(__dirname, '..', 'config', 'facs-organics-6e5d2-firebase-adminsdk-fbsvc-0dbec5dd23.json'));
} catch (error) {
  console.error('Service account key not found. Please ensure the Firebase service account JSON file is in the config directory.');
  process.exit(1);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'facs-organics-6e5d2'
  });
}

const db = admin.firestore();

// Initialize sample categories
const initCategories = async () => {
  console.log('🗂️  Initializing categories...');
  
  const categories = [
    {
      name: "Fruits and Nuts",
      description: "Fresh organic fruits and nuts",
      imageUrl: "/images/categories/fruits-nuts.jpg",
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Ayurveda",
      description: "Traditional Ayurvedic herbs and remedies",
      imageUrl: "/images/categories/ayurveda.jpg",
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Western Herbs",
      description: "Western medicinal herbs",
      imageUrl: "/images/categories/western-herbs.jpg",
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Spices",
      description: "Organic spices from around the world",
      imageUrl: "/images/categories/spices.jpg",
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Oils",
      description: "Cold-pressed organic oils",
      imageUrl: "/images/categories/oils.jpg",
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Seeds",
      description: "Organic seeds for planting and consumption",
      imageUrl: "/images/categories/seeds.jpg",
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Supplements",
      description: "Natural health supplements",
      imageUrl: "/images/categories/supplements.jpg",
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Honey",
      description: "Pure organic honey",
      imageUrl: "/images/categories/honey.jpg",
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Salts",
      description: "Natural mineral salts",
      imageUrl: "/images/categories/salts.jpg",
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ];

  const createdCategories = [];
  
  for (const category of categories) {
    try {
      const docRef = await db.collection('categories').add(category);
      createdCategories.push({ id: docRef.id, ...category });
      console.log(`✅ Created category: ${category.name}`);
    } catch (error) {
      console.log(`❌ Failed to create category: ${category.name} - ${error.message}`);
    }
  }
  
  console.log('📂 Categories initialized successfully');
  return createdCategories;
};

// Initialize sample products
const initProducts = async () => {
  console.log('🌿 Initializing products...');
  
  // Get category IDs first
  const categoriesSnapshot = await db.collection('categories').get();
  const categories = {};
  categoriesSnapshot.forEach(doc => {
    categories[doc.data().name] = doc.id;
  });

  const products = [
    {
      name: "Organic Turmeric Powder",
      description: "High-quality organic turmeric powder with curcumin. Known for its anti-inflammatory properties and vibrant golden color. Perfect for cooking, golden milk, and natural remedies.",
      price: 20784,
      category: categories["Spices"],
      imageUrl: "/images/products/turmeric.jpg",
      stock: 50,
      isActive: true,
      featured: true,
      tags: ["spices", "organic", "turmeric", "anti-inflammatory"],
      weight: "250g",
      origin: "India",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Pure Raw Honey",
      description: "100% pure raw honey, unprocessed and unfiltered. Sourced from local beekeepers who practice sustainable beekeeping. Rich in antioxidants and natural enzymes.",
      price: 30384,
      category: categories["Honey"],
      imageUrl: "/images/products/honey.jpg",
      stock: 30,
      isActive: true,
      featured: true,
      tags: ["honey", "raw", "sweetener", "natural"],
      weight: "500g",
      origin: "Local Farms",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Cold-Pressed Almond Oil",
      description: "Organic cold-pressed almond oil for cooking and skincare. Rich in vitamin E and healthy fats. Perfect for moisturizing skin and hair care.",
      price: 36000,
      category: categories["Oils"],
      imageUrl: "/images/products/almond-oil.jpg",
      stock: 25,
      isActive: true,
      featured: false,
      tags: ["oil", "almond", "cold-pressed", "skincare"],
      weight: "250ml",
      origin: "California",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Ashwagandha Root Powder",
      description: "Organic ashwagandha powder for stress relief and vitality. This powerful adaptogen helps the body manage stress and promotes overall wellness.",
      price: 25200,
      category: categories["Ayurveda"],
      imageUrl: "/images/products/ashwagandha.jpg",
      stock: 40,
      isActive: true,
      featured: true,
      tags: ["ayurveda", "adaptogen", "stress-relief", "powder"],
      weight: "200g",
      origin: "India",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Organic Almonds",
      description: "Raw organic almonds, rich in nutrients. These premium almonds are perfect for snacking, baking, or making almond milk. High in protein and healthy fats.",
      price: 23984,
      category: categories["Fruits and Nuts"],
      imageUrl: "/images/products/almonds.jpg",
      stock: 60,
      isActive: true,
      featured: false,
      tags: ["nuts", "almonds", "snack", "protein"],
      weight: "500g",
      origin: "California",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Himalayan Pink Salt",
      description: "Pure Himalayan pink salt crystals, rich in minerals. This ancient salt is perfect for cooking, seasoning, and creating spa-like experiences at home.",
      price: 15984,
      category: categories["Salts"],
      imageUrl: "/images/products/himalayan-salt.jpg",
      stock: 45,
      isActive: true,
      featured: false,
      tags: ["salt", "himalayan", "minerals", "cooking"],
      weight: "1kg",
      origin: "Pakistan",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Organic Chia Seeds",
      description: "Nutrient-dense organic chia seeds, packed with omega-3 fatty acids, fiber, and protein. Perfect for smoothies, puddings, and healthy recipes.",
      price: 19184,
      category: categories["Seeds"],
      imageUrl: "/images/products/chia-seeds.jpg",
      stock: 35,
      isActive: true,
      featured: true,
      tags: ["seeds", "chia", "superfood", "omega-3"],
      weight: "400g",
      origin: "Mexico",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Echinacea Capsules",
      description: "Natural echinacea supplement capsules for immune system support. Made from organic echinacea root and herb, perfect for seasonal wellness.",
      price: 39984,
      category: categories["Supplements"],
      imageUrl: "/images/products/echinacea-capsules.jpg",
      stock: 20,
      isActive: true,
      featured: false,
      tags: ["supplement", "echinacea", "immune", "capsules"],
      weight: "60 capsules",
      origin: "USA",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ];

  const createdProducts = [];
  
  for (const product of products) {
    try {
      const docRef = await db.collection('products').add(product);
      createdProducts.push({ id: docRef.id, ...product });
      console.log(`✅ Created product: ${product.name}`);
    } catch (error) {
      console.log(`❌ Failed to create product: ${product.name} - ${error.message}`);
    }
  }
  
  console.log('🛍️  Products initialized successfully');
  return createdProducts;
};

// Create sample orders for testing
const initSampleOrders = async (products) => {
  console.log('📦 Creating sample orders...');
  
  const sampleOrders = [
    {
      userId: 'demo-user-1',
      customerInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-0123'
      },
      items: products.slice(0, 2).map(product => ({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: Math.floor(Math.random() * 3) + 1,
        imageUrl: product.imageUrl
      })),
      total: 0, // Will be calculated below
      shippingAddress: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'NY',
        zipCode: '12345',
        country: 'USA'
      },
      status: 'processing',
      paymentStatus: 'paid',
      paymentMethod: 'credit_card',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      userId: 'demo-user-2',
      customerInfo: {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1-555-0456'
      },
      items: products.slice(2, 4).map(product => ({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: Math.floor(Math.random() * 2) + 1,
        imageUrl: product.imageUrl
      })),
      total: 0, // Will be calculated below
      shippingAddress: {
        street: '456 Oak Ave',
        city: 'Somewhere',
        state: 'CA',
        zipCode: '54321',
        country: 'USA'
      },
      status: 'shipped',
      paymentStatus: 'paid',
      paymentMethod: 'paypal',
      trackingNumber: 'TRK123456789',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ];

  const createdOrders = [];
  
  for (const orderData of sampleOrders) {
    try {
      // Calculate total
      orderData.total = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      orderData.total += 15984; // Add shipping (₦15,984)
      
      const docRef = await db.collection('orders').add(orderData);
      createdOrders.push({ id: docRef.id, ...orderData });
      console.log(`✅ Created order: ${docRef.id}`);
    } catch (error) {
      console.log(`❌ Failed to create order: ${error.message}`);
    }
  }
  
  return createdOrders;
};

// Set admin privileges for a user
const setAdminUser = async (email) => {
  try {
    console.log(`👑 Setting admin privileges for ${email}...`);
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    // Also update the user document in Firestore
    await db.collection('users').doc(user.uid).set({
      isAdmin: true,
      email: email,
      displayName: email.split('@')[0],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log(`✅ Admin privileges granted to ${email}`);
  } catch (error) {
    console.error(`❌ Error setting admin user: ${error.message}`);
    
    // If user doesn't exist, create them
    if (error.code === 'auth/user-not-found') {
      try {
        console.log(`Creating admin user ${email}...`);
        const userRecord = await admin.auth().createUser({
          email: email,
          password: 'AdminPassword123!', // Change this!
          emailVerified: true
        });
        
        await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
        
        await db.collection('users').doc(userRecord.uid).set({
          isAdmin: true,
          email: email,
          displayName: email.split('@')[0],
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Created and granted admin privileges to ${email}`);
      } catch (createError) {
        console.error(`❌ Error creating admin user: ${createError.message}`);
      }
    }
  }
};

// Get database statistics
const getDatabaseStats = async () => {
  try {
    const [categoriesSnapshot, productsSnapshot, ordersSnapshot, usersSnapshot] = await Promise.all([
      db.collection('categories').get(),
      db.collection('products').get(),
      db.collection('orders').get(),
      db.collection('users').get()
    ]);
    
    return {
      categories: categoriesSnapshot.size,
      products: productsSnapshot.size,
      orders: ordersSnapshot.size,
      users: usersSnapshot.size
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return { categories: 0, products: 0, orders: 0, users: 0 };
  }
};

// Initialize the database
const initializeDatabase = async () => {
  try {
    console.log('🚀 Starting database initialization...\n');
    
    // Check if data already exists
    const stats = await getDatabaseStats();
    console.log('📊 Current database state:');
    console.log(`   Categories: ${stats.categories}`);
    console.log(`   Products: ${stats.products}`);
    console.log(`   Orders: ${stats.orders}`);
    console.log(`   Users: ${stats.users}\n`);
    
    let shouldContinue = true;
    if (stats.categories > 0 || stats.products > 0) {
      console.log('⚠️  Database already contains data. This will add more data to existing collections.');
      // In a real scenario, you might want to prompt the user
      // For now, we'll continue
    }
    
    if (shouldContinue) {
      const categories = await initCategories();
      const products = await initProducts();
      const orders = await initSampleOrders(products.slice(0, 4));
      
      // Set the admin user
      await setAdminUser('tosel20@yahoo.com');
      await setAdminUser('admin@facsorganics.com');
      
      console.log('\n🎉 Database initialization completed successfully!');
      
      const finalStats = await getDatabaseStats();
      console.log('\n📈 Final database statistics:');
      console.log(`   Categories: ${finalStats.categories}`);
      console.log(`   Products: ${finalStats.products}`);
      console.log(`   Orders: ${finalStats.orders}`);
      console.log(`   Users: ${finalStats.users}`);
      
      console.log('\n✨ You can now:');
      console.log('   • Access the admin dashboard');
      console.log('   • Browse products on the frontend');
      console.log('   • Test order functionality');
      console.log('   • Manage inventory and categories');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Error initializing database:', error);
    process.exit(1);
  }
};

// Allow running this script directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = {
  initializeDatabase,
  initCategories,
  initProducts,
  setAdminUser,
  getDatabaseStats
};
