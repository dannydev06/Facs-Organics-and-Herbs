// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBSLFpC0E8BFVVNTBVNFYnK5CgV6cs-buc",
  authDomain: "facs-organics-6e5d2.firebaseapp.com",
  projectId: "facs-organics-6e5d2",
  storageBucket: "facs-organics-6e5d2.firebasestorage.app",
  messagingSenderId: "340303024016",
  appId: "1:340303024016:web:f8d90ff7d50f396e57ed15",
  measurementId: "G-2KC9QGXYQH"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Utility function to get current user data with admin status
const getCurrentUserData = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    // Force token refresh to get latest claims
    await user.getIdToken(true);
    const idTokenResult = await user.getIdTokenResult();
    
    // Get user document from Firestore
    const userDoc = await db.collection('users').doc(user.uid).get();
    
    if (!userDoc.exists) {
      // Create user document if it doesn't exist
      await createUserDocument(user);
      return await getCurrentUserData(); // Recursive call to get the new document
    }
    
    return {
      ...userDoc.data(),
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      isAdmin: idTokenResult.claims.admin || false
    };
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Function to create a new user document
const createUserDocument = async (user, additionalData = {}) => {
  if (!user) return;
  
  const userRef = db.collection('users').doc(user.uid);
  const snapshot = await userRef.get();
  
  if (!snapshot.exists) {
    const { email, displayName } = user;
    const createdAt = firebase.firestore.FieldValue.serverTimestamp();
    
    try {
      await userRef.set({
        email,
        displayName: displayName || email.split('@')[0],
        isAdmin: false,
        createdAt,
        updatedAt: createdAt,
        addresses: [],
        preferences: {},
        ...additionalData
      });
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  }
};

// Function to place an order
const placeOrder = async (items, shippingAddress, billingAddress = null) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be logged in to place an order');
  
  try {
    // Get user data for order
    const userData = await getCurrentUserData();
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08; // 8% tax
    const shipping = subtotal > 50 ? 0 : 9.99; // Free shipping over $50
    const total = subtotal + tax + shipping;
    
    // Generate order number
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // Create order document
    const orderData = {
      orderNumber,
      userId: user.uid,
      customerInfo: {
        name: userData.displayName || userData.email.split('@')[0],
        email: userData.email,
        phone: userData.phone || ''
      },
      items: items.map(item => ({
        productId: item.id || item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl || '',
        sku: item.sku || ''
      })),
      subtotal,
      tax,
      shipping,
      total,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: '',
      notes: '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const orderRef = await db.collection('orders').add(orderData);
    
    // Update product stock using batch
    const batch = db.batch();
    for (const item of items) {
      const productRef = db.collection('products').doc(item.id || item.productId);
      batch.update(productRef, {
        stock: firebase.firestore.FieldValue.increment(-item.quantity),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    await batch.commit();
    
    return { 
      id: orderRef.id, 
      orderNumber,
      ...orderData 
    };
  } catch (error) {
    console.error('Error placing order:', error);
    throw error;
  }
};

// Function to get products with filtering and pagination
const getProducts = async (filters = {}) => {
  try {
    let query = db.collection('products').where('isActive', '==', true);
    
    // Apply filters
    if (filters.category) {
      query = query.where('category', '==', filters.category);
    }
    
    if (filters.featured !== undefined) {
      query = query.where('featured', '==', filters.featured);
    }
    
    if (filters.minPrice && filters.maxPrice) {
      query = query.where('price', '>=', parseFloat(filters.minPrice))
                   .where('price', '<=', parseFloat(filters.maxPrice));
    } else if (filters.minPrice) {
      query = query.where('price', '>=', parseFloat(filters.minPrice));
    } else if (filters.maxPrice) {
      query = query.where('price', '<=', parseFloat(filters.maxPrice));
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query = query.where('tags', 'array-contains-any', filters.tags);
    }
    
    // Apply sorting
    if (filters.sortBy) {
      const sortOrder = filters.sortOrder || 'asc';
      query = query.orderBy(filters.sortBy, sortOrder);
    } else {
      query = query.orderBy('name', 'asc');
    }
    
    // Apply pagination
    if (filters.limit) {
      query = query.limit(parseInt(filters.limit));
    }
    
    if (filters.startAfter) {
      query = query.startAfter(filters.startAfter);
    }
    
    const snapshot = await query.get();
    
    const products = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      // Convert Firestore timestamps to JavaScript dates
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
    
    // Client-side search filtering if search term provided
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        (product.tags && product.tags.some(tag => 
          tag.toLowerCase().includes(searchTerm)
        ))
      );
    }
    
    return products;
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
};

// Function to get a single product by ID
const getProductById = async (productId) => {
  try {
    const doc = await db.collection('products').doc(productId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    };
  } catch (error) {
    console.error('Error getting product:', error);
    throw error;
  }
};

// Function to get categories
const getCategories = async (activeOnly = true) => {
  try {
    let query = db.collection('categories');
    
    if (activeOnly) {
      query = query.where('isActive', '==', true);
    }
    
    query = query.orderBy('name', 'asc');
    
    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
};

// Function to get featured products
const getFeaturedProducts = async (limit = 8) => {
  return await getProducts({ 
    featured: true, 
    limit,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
};

// Function to get products by category
const getProductsByCategory = async (categoryId, options = {}) => {
  return await getProducts({ 
    category: categoryId,
    ...options 
  });
};

// Function to get user orders
const getUserOrders = async (userId = null) => {
  try {
    const user = auth.currentUser;
    if (!user && !userId) throw new Error('User must be logged in');
    
    const uid = userId || user.uid;
    
    const snapshot = await db.collection('orders')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting user orders:', error);
    throw error;
  }
};

// Function to get a single order
const getOrderById = async (orderId) => {
  try {
    const doc = await db.collection('orders').doc(orderId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    };
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
};

// Function to get all orders (admin only)
const getAllOrders = async (filters = {}) => {
  try {
    let query = db.collection('orders');
    
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    
    if (filters.paymentStatus) {
      query = query.where('paymentStatus', '==', filters.paymentStatus);
    }
    
    // Apply date filtering
    if (filters.startDate) {
      query = query.where('createdAt', '>=', new Date(filters.startDate));
    }
    
    if (filters.endDate) {
      query = query.where('createdAt', '<=', new Date(filters.endDate));
    }
    
    query = query.orderBy('createdAt', 'desc');
    
    if (filters.limit) {
      query = query.limit(parseInt(filters.limit));
    }
    
    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting all orders:', error);
    throw error;
  }
};

// Function to update order status (admin only)
const updateOrderStatus = async (orderId, status, adminNotes = '') => {
  try {
    const updates = {
      status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (adminNotes) {
      updates.adminNotes = adminNotes;
    }
    
    // Set timestamps for specific statuses
    if (status === 'shipped') {
      updates.shippedAt = firebase.firestore.FieldValue.serverTimestamp();
    } else if (status === 'delivered') {
      updates.deliveredAt = firebase.firestore.FieldValue.serverTimestamp();
    }
    
    await db.collection('orders').doc(orderId).update(updates);
    
    return await getOrderById(orderId);
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

// Function to add a new product (admin only)
const addProduct = async (productData) => {
  try {
    const docRef = await db.collection('products').add({
      ...productData,
      isActive: productData.isActive !== false,
      featured: productData.featured || false,
      stock: productData.stock || 0,
      tags: productData.tags || [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

// Function to update a product (admin only)
const updateProduct = async (productId, productData) => {
  try {
    await db.collection('products').doc(productId).update({
      ...productData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return await getProductById(productId);
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

// Function to add a category (admin only)
const addCategory = async (categoryData) => {
  try {
    const docRef = await db.collection('categories').add({
      ...categoryData,
      isActive: categoryData.isActive !== false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

// Function to update user profile
const updateUserProfile = async (userId, userData) => {
  try {
    const user = auth.currentUser;
    if (!user && !userId) throw new Error('User must be logged in');
    
    const uid = userId || user.uid;
    
    await db.collection('users').doc(uid).update({
      ...userData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return await getCurrentUserData();
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Function to add user address
const addUserAddress = async (address) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be logged in');
    
    const addressId = Date.now().toString();
    const addressWithId = { id: addressId, ...address };
    
    await db.collection('users').doc(user.uid).update({
      addresses: firebase.firestore.FieldValue.arrayUnion(addressWithId),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return addressWithId;
  } catch (error) {
    console.error('Error adding user address:', error);
    throw error;
  }
};

// Function to get admin statistics
const getAdminStats = async () => {
  try {
    const [productsSnapshot, ordersSnapshot, usersSnapshot, categoriesSnapshot] = await Promise.all([
      db.collection('products').where('isActive', '==', true).get(),
      db.collection('orders').get(),
      db.collection('users').get(),
      db.collection('categories').where('isActive', '==', true).get()
    ]);
    
    // Calculate total revenue
    let totalRevenue = 0;
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      if (order.paymentStatus === 'paid') {
        totalRevenue += order.total || 0;
      }
    });
    
    return {
      totalProducts: productsSnapshot.size,
      totalOrders: ordersSnapshot.size,
      totalCustomers: usersSnapshot.size,
      totalCategories: categoriesSnapshot.size,
      totalRevenue
    };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    throw error;
  }
};

// Export the functions and Firebase services
window.dbModule = {
  auth,
  db,
  storage,
  getCurrentUserData,
  createUserDocument,
  placeOrder,
  getProducts,
  getProductById,
  getCategories,
  getFeaturedProducts,
  getProductsByCategory,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  addProduct,
  updateProduct,
  addCategory,
  updateUserProfile,
  addUserAddress,
  getAdminStats
};

// Also export as a global for backward compatibility
window.firebase_db = window.dbModule;
