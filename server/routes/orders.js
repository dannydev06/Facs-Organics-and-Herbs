const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateOrder } = require('../middleware/validation');
const { db } = require('../config/firebase-admin');

// Get user's orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const snapshot = await db.collection('orders')
      .where('userId', '==', req.user.uid)
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

// Get order by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const orderId = req.params.id;
    const doc = await db.collection('orders').doc(orderId).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = { id: doc.id, ...doc.data() };
    
    // Ensure user can only access their own orders
    if (order.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

// Create new order
router.post('/', authenticate, validateOrder, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body;
    
    // Calculate total and verify product availability
    let total = 0;
    const orderItems = [];
    
    for (const item of items) {
      const productDoc = await db.collection('products').doc(item.productId).get();
      
      if (!productDoc.exists) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }
      
      const product = productDoc.data();
      
      if (!product.active) {
        return res.status(400).json({ error: `Product ${product.name} is not available` });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }
      
      const itemTotal = product.price * item.quantity;
      total += itemTotal;
      
      orderItems.push({
        productId: item.productId,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.images[0] || null,
        itemTotal
      });
    }
    
    // Add shipping cost if applicable
    const shippingCost = 0; // You can implement shipping calculation logic here
    total += shippingCost;
    
    // Create order
    const orderData = {
      userId: req.user.uid,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      notes: notes || '',
      status: 'pending',
      subtotal: total - shippingCost,
      shipping: shippingCost,
      total,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const orderRef = await db.collection('orders').add(orderData);
    
    // Update product stock (in a real app, you might want to use transactions)
    for (const item of items) {
      const productRef = db.collection('products').doc(item.productId);
      const productDoc = await productRef.get();
      const product = productDoc.data();
      
      await productRef.update({
        stock: product.stock - item.quantity,
        updatedAt: new Date()
      });
    }
    
    res.status(201).json({ id: orderRef.id, ...orderData });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status (admin only)
router.patch('/:id/status', authenticate, async (req, res) => {
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
    
    const order = orderDoc.data();
    
    // Check if user is admin or order owner
    if (order.userId !== req.user.uid && !req.user.admin) {
      return res.status(403).json({ error: 'Access denied' });
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

module.exports = router;