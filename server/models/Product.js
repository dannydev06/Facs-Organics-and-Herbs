const { db } = require('../config/firebase-admin');

class Product {
  constructor(data) {
    this.name = data.name;
    this.description = data.description;
    this.shortDescription = data.shortDescription || '';
    this.category = data.category;
    this.subcategory = data.subcategory || '';
    this.price = data.price;
    this.comparePrice = data.comparePrice || null; // For showing discounts
    this.cost = data.cost || 0; // Cost price for profit calculations
    this.sku = data.sku;
    this.barcode = data.barcode || '';
    this.weight = data.weight || 0; // in grams
    this.dimensions = data.dimensions || { length: 0, width: 0, height: 0 };
    this.inventory = {
      quantity: data.inventory?.quantity || 0,
      lowStockThreshold: data.inventory?.lowStockThreshold || 10,
      trackQuantity: data.inventory?.trackQuantity !== false
    };
    this.images = data.images || [];
    this.tags = data.tags || [];
    this.properties = data.properties || {}; // Custom properties like origin, organic certification, etc.
    this.seo = {
      title: data.seo?.title || data.name,
      description: data.seo?.description || data.shortDescription,
      keywords: data.seo?.keywords || []
    };
    this.status = data.status || 'draft'; // draft, active, archived
    this.featured = data.featured || false;
    this.active = data.active !== false;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Create a new product
  static async create(productData) {
    try {
      const product = new Product(productData);
      const productRef = db.collection('products').doc();
      
      await productRef.set({
        id: productRef.id,
        ...product
      });
      
      return { id: productRef.id, ...product };
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  // Get all products with optional filtering
  static async getAll(filters = {}) {
    try {
      let query = db.collection('products');
      
      // Apply filters
      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }
      
      if (filters.active !== undefined) {
        query = query.where('active', '==', filters.active);
      }
      
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      
      if (filters.featured !== undefined) {
        query = query.where('featured', '==', filters.featured);
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      query = query.orderBy(sortBy, sortOrder);
      
      // Apply pagination
      if (filters.limit) {
        query = query.limit(parseInt(filters.limit));
      }
      
      if (filters.startAfter) {
        const startAfterDoc = await db.collection('products').doc(filters.startAfter).get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return [];
      }
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  }

  // Get product by ID
  static async getById(id) {
    try {
      const productDoc = await db.collection('products').doc(id).get();
      
      if (!productDoc.exists) {
        return null;
      }
      
      return { id: productDoc.id, ...productDoc.data() };
    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  }

  // Update product
  static async update(id, updates) {
    try {
      const productRef = db.collection('products').doc(id);
      
      await productRef.update({
        ...updates,
        updatedAt: new Date()
      });
      
      const updatedProduct = await productRef.get();
      return { id: updatedProduct.id, ...updatedProduct.data() };
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  // Delete product (soft delete)
  static async delete(id) {
    try {
      const productRef = db.collection('products').doc(id);
      await productRef.update({
        active: false,
        status: 'archived',
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Update inventory
  static async updateInventory(id, quantity, operation = 'set') {
    try {
      const productRef = db.collection('products').doc(id);
      const productDoc = await productRef.get();
      
      if (!productDoc.exists) {
        throw new Error('Product not found');
      }
      
      const productData = productDoc.data();
      let newQuantity;
      
      switch (operation) {
        case 'add':
          newQuantity = (productData.inventory.quantity || 0) + quantity;
          break;
        case 'subtract':
          newQuantity = Math.max(0, (productData.inventory.quantity || 0) - quantity);
          break;
        default: // 'set'
          newQuantity = quantity;
      }
      
      await productRef.update({
        'inventory.quantity': newQuantity,
        updatedAt: new Date()
      });
      
      return newQuantity;
    } catch (error) {
      console.error('Error updating inventory:', error);
      throw error;
    }
  }

  // Search products
  static async search(searchTerm, filters = {}) {
    try {
      // For simple search, we'll get all active products and filter client-side
      // In production, consider using Algolia or Elasticsearch for better search
      const products = await this.getAll({ active: true, ...filters });
      
      if (!searchTerm) {
        return products;
      }
      
      const lowercaseSearch = searchTerm.toLowerCase();
      
      return products.filter(product => 
        product.name.toLowerCase().includes(lowercaseSearch) ||
        product.description.toLowerCase().includes(lowercaseSearch) ||
        product.category.toLowerCase().includes(lowercaseSearch) ||
        (product.tags && product.tags.some(tag => 
          tag.toLowerCase().includes(lowercaseSearch)
        ))
      );
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  // Get low stock products
  static async getLowStockProducts() {
    try {
      const products = await this.getAll({ active: true });
      
      return products.filter(product => 
        product.inventory.trackQuantity &&
        product.inventory.quantity <= product.inventory.lowStockThreshold
      );
    } catch (error) {
      console.error('Error getting low stock products:', error);
      throw error;
    }
  }

  // Get products by category
  static async getByCategory(category, options = {}) {
    try {
      return await this.getAll({ 
        category, 
        active: true,
        ...options 
      });
    } catch (error) {
      console.error('Error getting products by category:', error);
      throw error;
    }
  }

  // Get featured products
  static async getFeatured(limit = 10) {
    try {
      return await this.getAll({ 
        featured: true, 
        active: true, 
        limit 
      });
    } catch (error) {
      console.error('Error getting featured products:', error);
      throw error;
    }
  }
}

module.exports = Product;
