const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-admin');
const { authenticate } = require('../middleware/auth');

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
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  return userRef;
};

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userRef = await getUserDoc(req.user.uid);
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
router.put('/profile', authenticate, async (req, res) => {
  try {
    const userRef = await getUserDoc(req.user.uid);
    const { name, phone } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    updateData.updatedAt = new Date();
    
    await userRef.update(updateData);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user addresses
router.get('/addresses', authenticate, async (req, res) => {
  try {
    const userRef = await getUserDoc(req.user.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    
    res.json(userData.addresses || []);
  } catch (error) {
    console.error('Error getting addresses:', error);
    res.status(500).json({ error: 'Failed to get addresses' });
  }
});

// Add new address
router.post('/addresses', authenticate, async (req, res) => {
  try {
    const userRef = await getUserDoc(req.user.uid);
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
      updatedAt: new Date()
    });
    
    res.json({ message: 'Address added successfully', address: newAddress });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ error: 'Failed to add address' });
  }
});

// Get user orders
router.get('/orders', authenticate, async (req, res) => {
  try {
    const userRef = await getUserDoc(req.user.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    
    res.json(userData.orders || []);
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Get user wishlist
router.get('/wishlist', authenticate, async (req, res) => {
  try {
    const userRef = await getUserDoc(req.user.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    
    res.json(userData.wishlist || []);
  } catch (error) {
    console.error('Error getting wishlist:', error);
    res.status(500).json({ error: 'Failed to get wishlist' });
  }
});

module.exports = router;