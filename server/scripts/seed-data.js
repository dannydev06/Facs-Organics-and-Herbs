const { db } = require('../config/firebase-admin');

// Sample products data
const sampleProducts = [
  {
    name: "Premium Organic Basil",
    description: "Fresh organic basil leaves, perfect for cooking and garnishing",
    price: 9.99,
    category: "Western Herbs",
    images: ["https://placehold.co/300x200/4CAF50/FFFFFF?text=Premium+Basil"],
    stock: 50,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Organic Turmeric Powder",
    description: "100% pure organic turmeric powder with anti-inflammatory properties",
    price: 12.99,
    category: "Spices",
    images: ["https://placehold.co/300x200/388E3C/FFFFFF?text=Organic+Turmeric"],
    stock: 75,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Green Tea Leaves",
    description: "Premium organic green tea leaves for a refreshing beverage",
    price: 7.99,
    category: "Teas",
    images: ["https://placehold.co/300x200/8BC34A/FFFFFF?text=Green+Tea"],
    stock: 100,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Lavender Essential Oil",
    description: "Pure lavender essential oil for aromatherapy and relaxation",
    price: 14.99,
    category: "Oils",
    images: ["https://placehold.co/300x200/4CAF50/FFFFFF?text=Lavender+Oil"],
    stock: 30,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Organic Almonds",
    description: "Raw organic almonds, rich in nutrients and antioxidants",
    price: 15.99,
    category: "Fruits and Nuts",
    images: ["https://placehold.co/300x200/388E3C/FFFFFF?text=Organic+Almonds"],
    stock: 60,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedProducts() {
  try {
    console.log('Seeding products...');
    
    for (const product of sampleProducts) {
      const docRef = await db.collection('products').add(product);
      console.log(`Added product: ${product.name} (ID: ${docRef.id})`);
    }
    
    console.log('Products seeding completed!');
  } catch (error) {
    console.error('Error seeding products:', error);
  }
}

// Run the seeding function
seedProducts();