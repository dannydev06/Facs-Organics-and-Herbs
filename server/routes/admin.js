const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-admin');
const { requireAdmin } = require('./auth');

// Get all orders (admin only)
router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;
    
    let query = db.collection('orders');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();
    
    if (snapshot.empty) {
      return res.json([]);
    }
    
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(orders);
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Update order status (admin only)
router.patch('/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    await orderRef.update({
      status,
      updatedAt: new Date()
    });
    
    const updatedDoc = await orderRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Get all users (admin only)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const snapshot = await db.collection('users')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();
    
    if (snapshot.empty) {
      return res.json([]);
    }
    
    const users = [];
    snapshot.forEach(doc => {
      const userData = doc.data();
      // Don't expose sensitive information
      users.push({
        uid: doc.id,
        email: userData.email,
        name: userData.name,
        createdAt: userData.createdAt,
        ordersCount: userData.orders ? userData.orders.length : 0
      });
    });
    
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get dashboard statistics (admin only)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // Get counts from Firestore
    const ordersSnapshot = await db.collection('orders').get();
    const usersSnapshot = await db.collection('users').get();
    const productsSnapshot = await db.collection('products').where('isActive', '==', true).get();
    const categoriesSnapshot = await db.collection('categories').where('isActive', '==', true).get();
    
    // Calculate total revenue from paid orders
    let totalRevenue = 0;
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      if (order.paymentStatus === 'paid') {
        totalRevenue += order.total || 0;
      }
    });
    
    res.json({
      totalOrders: ordersSnapshot.size,
      totalCustomers: usersSnapshot.size,
      totalProducts: productsSnapshot.size,
      totalCategories: categoriesSnapshot.size,
      totalRevenue: totalRevenue
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;