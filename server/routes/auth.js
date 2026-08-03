const express = require('express');
const router = express.Router();
const { auth } = require('../config/firebase-admin');

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to require admin privileges
const requireAdmin = async (req, res, next) => {
  try {
    // First verify the token
    await verifyToken(req, res, async () => {
      // Then check if user has admin claims
      const user = await auth.getUser(req.user.uid);
      
      if (!user.customClaims?.admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      next();
    });
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(403).json({ error: 'Admin access verification failed' });
  }
};

// Auth routes
router.post('/verify', verifyToken, (req, res) => {
  res.json({
    success: true,
    user: {
      uid: req.user.uid,
      email: req.user.email,
      admin: req.user.admin || false
    }
  });
});

// Export middleware functions
module.exports = router;
module.exports.verifyToken = verifyToken;
module.exports.requireAdmin = requireAdmin;
