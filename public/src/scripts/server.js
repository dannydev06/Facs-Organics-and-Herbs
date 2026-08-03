    require('dotenv').config();
    const express = require('express');
    const cors = require('cors');
    const bodyParser = require('body-parser');
    const admin = require('firebase-admin');
    const helmet = require('helmet');
    const compression = require('compression');
    const morgan = require('morgan');

    const app = express();
    const PORT = process.env.PORT || 3001;

    // Initialize Firebase Admin with environment variables
    admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    })
    });

    const db = admin.firestore();

    // Enhanced Middleware
    app.use(helmet({
    contentSecurityPolicy: {
        directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "https://www.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"]
        }
    }
    }));
    app.use(compression());
    app.use(morgan('combined'));
    app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
    }));
    app.use(bodyParser.json({ limit: '10mb' }));
    app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting middleware
    const rateLimit = require('express-rate-limit');
    const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
    });
    app.use('/api/', limiter);

    // Authentication middleware
    const authenticate = async (req, res, next) => {
    try {
        const idToken = req.headers.authorization?.split('Bearer ')[1];
        
        if (!idToken) {
        return res.status(401).json({ error: 'No token provided' });
        }
        
        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.userId = decodedToken.uid;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
    };

    // ... rest of your server.js code remains the same ...

    // Enhanced error handling middleware
    app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ error: 'Internal server error' });
    }
    
    res.status(500).json({ 
        error: 'Internal server error',
        message: error.message,
        stack: error.stack 
    });
    });

    // 404 handler
    app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
    });

    // Start server
    app.listen(PORT, () => {
    console.log(`FACS Herbs API server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Health check available at: http://localhost:${PORT}/api/health`);
    });

    // Helper function to get user document
    const getUserDoc = async (userId) => {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
        // Create user document if it doesn't exist
        await userRef.set({
        name: 'New User',
        email: `${userId}@example.com`,
        phone: '',
        addresses: [],
        paymentMethods: [],
        orders: [],
        wishlist: [],
        preferences: {
            emailNotifications: true,
            smsNotifications: true,
            newsletter: false
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    
    return userRef;
    };

    // Routes

    // Get user profile
    app.get('/api/user/profile', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const { name, email, phone } = userData;
        res.json({ name, email, phone });
    } catch (error) {
        console.error('Error getting user profile:', error);
        res.status(500).json({ error: 'Failed to get user profile' });
    }
    });

    // Update user profile
    app.put('/api/user/profile', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        const { name, phone } = req.body;
        
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        
        await userRef.update(updateData);
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
    });

    // Get user addresses
    app.get('/api/user/addresses', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        res.json(userData.addresses || []);
    } catch (error) {
        console.error('Error getting addresses:', error);
        res.status(500).json({ error: 'Failed to get addresses' });
    }
    });

    // Add new address
    app.post('/api/user/addresses', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const newAddress = {
        id: 'addr' + Date.now(), // Unique ID using timestamp
        ...req.body,
        isDefault: req.body.isDefault || false
        };
        
        let addresses = userData.addresses || [];
        
        // If setting as default, remove default from others
        if (newAddress.isDefault) {
        addresses = addresses.map(addr => ({ ...addr, isDefault: false }));
        }
        
        addresses.push(newAddress);
        
        await userRef.update({
        addresses: addresses,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ message: 'Address added successfully', address: newAddress });
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({ error: 'Failed to add address' });
    }
    });

    // Update address
    app.put('/api/user/addresses/:id', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const addressId = req.params.id;
        let addresses = userData.addresses || [];
        const addressIndex = addresses.findIndex(addr => addr.id === addressId);
        
        if (addressIndex === -1) {
        return res.status(404).json({ error: 'Address not found' });
        }
        
        // If setting as default, remove default from others
        if (req.body.isDefault) {
        addresses = addresses.map(addr => ({ ...addr, isDefault: false }));
        }
        
        addresses[addressIndex] = { ...addresses[addressIndex], ...req.body };
        
        await userRef.update({
        addresses: addresses,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ message: 'Address updated successfully' });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ error: 'Failed to update address' });
    }
    });

    // Delete address
    app.delete('/api/user/addresses/:id', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const addressId = req.params.id;
        const addresses = (userData.addresses || []).filter(addr => addr.id !== addressId);
        
        await userRef.update({
        addresses: addresses,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ message: 'Address deleted successfully' });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ error: 'Failed to delete address' });
    }
    });

    // Get orders
    app.get('/api/user/orders', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        res.json(userData.orders || []);
    } catch (error) {
        console.error('Error getting orders:', error);
        res.status(500).json({ error: 'Failed to get orders' });
    }
    });

    // Get order details
    app.get('/api/user/orders/:id', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const orderId = req.params.id;
        const order = (userData.orders || []).find(order => order.id === orderId);
        
        if (!order) {
        return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json(order);
    } catch (error) {
        console.error('Error getting order details:', error);
        res.status(500).json({ error: 'Failed to get order details' });
    }
    });

    // Get wishlist
    app.get('/api/user/wishlist', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        res.json(userData.wishlist || []);
    } catch (error) {
        console.error('Error getting wishlist:', error);
        res.status(500).json({ error: 'Failed to get wishlist' });
    }
    });

    // Add to wishlist
    app.post('/api/user/wishlist', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const { productId, name, price, image } = req.body;
        let wishlist = userData.wishlist || [];
        
        // Check if already in wishlist
        const existingItemIndex = wishlist.findIndex(item => item.id === productId);
        
        if (existingItemIndex > -1) {
        return res.status(400).json({ error: 'Product already in wishlist' });
        }
        
        wishlist.push({ 
        id: productId, 
        name, 
        price, 
        image,
        addedAt: new Date().toISOString()
        });
        
        await userRef.update({
        wishlist: wishlist,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ 
        message: 'Product added to wishlist',
        wishlistCount: wishlist.length
        });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ error: 'Failed to add to wishlist' });
    }
    });

    // Remove from wishlist
    app.delete('/api/user/wishlist/:productId', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const productId = req.params.productId;
        const wishlist = (userData.wishlist || []).filter(item => item.id !== productId);
        
        await userRef.update({
        wishlist: wishlist,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ 
        message: 'Product removed from wishlist',
        wishlistCount: wishlist.length
        });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ error: 'Failed to remove from wishlist' });
    }
    });

    // Sync wishlist from local storage (for when user logs in)
    app.post('/api/user/wishlist/sync', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const { localWishlist } = req.body;
        let currentWishlist = userData.wishlist || [];
        
        // Merge local wishlist with server wishlist
        const mergedWishlist = [...currentWishlist];
        
        localWishlist.forEach(localItem => {
        const exists = mergedWishlist.some(serverItem => serverItem.id === localItem.id);
        if (!exists) {
            mergedWishlist.push({
            ...localItem,
            addedAt: new Date().toISOString()
            });
        }
        });
        
        await userRef.update({
        wishlist: mergedWishlist,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ 
        message: 'Wishlist synced successfully',
        wishlist: mergedWishlist,
        wishlistCount: mergedWishlist.length
        });
    } catch (error) {
        console.error('Error syncing wishlist:', error);
        res.status(500).json({ error: 'Failed to sync wishlist' });
    }
    });

    // Check if products are in wishlist (for heart icons)
    app.post('/api/user/wishlist/check', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const { productIds } = req.body;
        const wishlist = userData.wishlist || [];
        
        const inWishlist = {};
        productIds.forEach(productId => {
        inWishlist[productId] = wishlist.some(item => item.id === productId);
        });
        
        res.json({ inWishlist });
    } catch (error) {
        console.error('Error checking wishlist:', error);
        res.status(500).json({ error: 'Failed to check wishlist' });
    }
    });

    // Get preferences
    app.get('/api/user/preferences', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        res.json(userData.preferences || {
        emailNotifications: true,
        smsNotifications: true,
        newsletter: false
        });
    } catch (error) {
        console.error('Error getting preferences:', error);
        res.status(500).json({ error: 'Failed to get preferences' });
    }
    });

    // Update preferences
    app.put('/api/user/preferences', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        
        await userRef.update({
        preferences: req.body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ message: 'Preferences updated successfully' });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
    });

    // Process checkout
    app.post('/api/checkout', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const { items, shippingAddressId, paymentMethodId } = req.body;
        
        // Calculate total
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Create new order
        const newOrder = {
        id: 'FACS' + Math.floor(100000 + Math.random() * 900000),
        date: new Date().toISOString().split('T')[0],
        status: 'processing',
        total,
        items,
        shippingAddress: shippingAddressId,
        createdAt: new Date().toISOString()
        };
        
        const orders = userData.orders || [];
        orders.unshift(newOrder);
        
        await userRef.update({
        orders: orders,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ 
        message: 'Order placed successfully', 
        orderId: newOrder.id 
        });
    } catch (error) {
        console.error('Error processing checkout:', error);
        res.status(500).json({ error: 'Failed to process checkout' });
    }
    });

    // Get user stats (orders count, wishlist count, etc.)
    app.get('/api/user/stats', authenticate, async (req, res) => {
    try {
        const userRef = await getUserDoc(req.userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const stats = {
        ordersCount: (userData.orders || []).length,
        wishlistCount: (userData.wishlist || []).length,
        addressesCount: (userData.addresses || []).length
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error getting user stats:', error);
        res.status(500).json({ error: 'Failed to get user stats' });
    }
    });

    // Health check endpoint
    app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'FACS Herbs API'
    });
    });

    // Start server
    app.listen(PORT, () => {
    console.log(`FACS Herbs API server running on port ${PORT}`);
    console.log(`Health check available at: http://localhost:${PORT}/api/health`);
    });

    // Error handling middleware
    app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
    });

    // 404 handler
    app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
    });