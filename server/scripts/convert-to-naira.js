const admin = require('firebase-admin');

// Try to load service account key
let serviceAccount;
try {
  serviceAccount = require(path.join(__dirname, '..', 'config', 'facs-organics-6e5d2-firebase-adminsdk-fbsvc-0dbec5dd23.json'));
} catch (error) {
  console.error('Service account key not found.');
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

// USD to Naira conversion rate (approximate)
const USD_TO_NAIRA = 1600; // 1 USD = 1600 NGN (adjust based on current rate)

const convertPricesToNaira = async () => {
  console.log('💱 Converting all prices to Nigerian Naira...\n');
  
  try {
    // Get all products
    const productsSnapshot = await db.collection('products').get();
    const batch = db.batch();
    
    let updatedCount = 0;
    
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      const updates = {};
      
      // Convert price
      if (product.price) {
        const nairaPrice = Math.round(product.price * USD_TO_NAIRA);
        updates.price = nairaPrice;
        console.log(`📦 ${product.name}: $${product.price} → ₦${nairaPrice.toLocaleString()}`);
      }
      
      // Convert compare price if exists
      if (product.comparePrice) {
        const nairaComparePrice = Math.round(product.comparePrice * USD_TO_NAIRA);
        updates.comparePrice = nairaComparePrice;
      }
      
      // Convert cost if exists
      if (product.cost) {
        const nairaCost = Math.round(product.cost * USD_TO_NAIRA);
        updates.cost = nairaCost;
      }
      
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        batch.update(doc.ref, updates);
        updatedCount++;
      }
    });
    
    // Update orders with Naira prices
    const ordersSnapshot = await db.collection('orders').get();
    
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      const updates = {};
      
      // Convert order totals
      if (order.subtotal) updates.subtotal = Math.round(order.subtotal * USD_TO_NAIRA);
      if (order.tax) updates.tax = Math.round(order.tax * USD_TO_NAIRA);
      if (order.shipping) updates.shipping = Math.round(order.shipping * USD_TO_NAIRA);
      if (order.total) updates.total = Math.round(order.total * USD_TO_NAIRA);
      if (order.discount) updates.discount = Math.round(order.discount * USD_TO_NAIRA);
      
      // Convert item prices
      if (order.items && order.items.length > 0) {
        updates.items = order.items.map(item => ({
          ...item,
          price: Math.round(item.price * USD_TO_NAIRA)
        }));
      }
      
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        batch.update(doc.ref, updates);
        console.log(`🧾 Order ${order.orderNumber || doc.id}: Total converted to ₦${updates.total?.toLocaleString()}`);
      }
    });
    
    // Commit all updates
    await batch.commit();
    
    console.log(`\n✅ Successfully converted prices for ${updatedCount} products and ${ordersSnapshot.size} orders to Naira!`);
    console.log(`💰 Exchange rate used: $1 = ₦${USD_TO_NAIRA.toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Error converting prices:', error);
    throw error;
  }
};

// Run the conversion
if (require.main === module) {
  convertPricesToNaira()
    .then(() => {
      console.log('\n🎉 Price conversion completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Conversion failed:', error);
      process.exit(1);
    });
}

module.exports = { convertPricesToNaira };
