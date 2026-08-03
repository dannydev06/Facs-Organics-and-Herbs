const express = require('express');
const router = express.Router();
const { admin } = require('../config/firebase-admin');

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    
    if (!idToken) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Authorization middleware - Admin only
const requireAdmin = async (req, res, next) => {
  try {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    
    if (!idToken) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Check if user is admin (you'll need to set this claim in Firebase)
    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(403).json({ error: 'Access denied' });
  }
};

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // This would typically use Firebase Admin to verify credentials
    // For now, we'll just return a success message
    res.json({ 
      message: 'Login successful', 
      token: 'mock-jwt-token' 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

module.exports = { router, authenticate, requireAdmin };