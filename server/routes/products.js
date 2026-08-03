const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validateProduct } = require('../middleware/validation');
const { db } = require('../config/firebase-admin');

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, limit = 20, offset = 0 } = req.query;
    
    let query = db.collection('products').where('active', '==', true);
    
    if (category) {
      query = query.where('category', '==', category);
    }
    
    // Add ordering
    query = query.orderBy('name');
    
    const snapshot = await query.limit(parseInt(limit)).offset(parseInt(offset)).get();
    
    if (snapshot.empty) {
      return res.json([]);
    }
    
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(products);
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const doc = await db.collection('products').doc(productId).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const product = { id: doc.id, ...doc.data() };
    
    if (!product.active) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// Create new product (admin only)
router.post('/', authenticate, requireAdmin, validateProduct, async (req, res) => {
  try {
    const { name, description, price, category, images, stock, active = true } = req.body;
    
    const productData = {
      name,
      description: description || '',
      price,
      category,
      images: images || [],
      stock: stock || 0,
      active,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('products').add(productData);
    
    res.status(201).json({ id: docRef.id, ...productData });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product (admin only)
router.put('/:id', authenticate, requireAdmin, validateProduct, async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, description, price, category, images, stock, active } = req.body;
    
    const productRef = db.collection('products').doc(productId);
    const doc = await productRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const updates = {
      name,
      description: description || '',
      price,
      category,
      images: images || [],
      updatedAt: new Date()
    };
    
    if (stock !== undefined) updates.stock = stock;
    if (active !== undefined) updates.active = active;
    
    await productRef.update(updates);
    
    const updatedDoc = await productRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (admin only - soft delete)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    
    const productRef = db.collection('products').doc(productId);
    await productRef.update({ active: false, updatedAt: new Date() });
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get product categories
router.get('/categories/list', async (req, res) => {
  try {
    const snapshot = await db.collection('products')
      .where('active', '==', true)
      .select('category')
      .get();
    
    const categories = new Set();
    snapshot.forEach(doc => {
      const category = doc.data().category;
      if (category) {
        categories.add(category);
      }
    });
    
    res.json(Array.from(categories).sort());
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

module.exports = router;