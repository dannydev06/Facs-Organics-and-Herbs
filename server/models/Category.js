const { db } = require('../config/firebase-admin');

class Category {
  constructor(data) {
    this.name = data.name;
    this.slug = data.slug || this.generateSlug(data.name);
    this.description = data.description || '';
    this.parentId = data.parentId || null; // For nested categories
    this.image = data.image || '';
    this.icon = data.icon || '';
    this.sortOrder = data.sortOrder || 0;
    this.active = data.active !== false;
    this.featured = data.featured || false;
    this.seo = {
      title: data.seo?.title || data.name,
      description: data.seo?.description || data.description,
      keywords: data.seo?.keywords || []
    };
    this.productCount = data.productCount || 0;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }

  // Create a new category
  static async create(categoryData) {
    try {
      const category = new Category(categoryData);
      const categoryRef = db.collection('categories').doc();
      
      await categoryRef.set({
        id: categoryRef.id,
        ...category
      });
      
      return { id: categoryRef.id, ...category };
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  // Get all categories with optional filtering
  static async getAll(filters = {}) {
    try {
      let query = db.collection('categories');
      
      // Apply filters
      if (filters.active !== undefined) {
        query = query.where('active', '==', filters.active);
      }
      
      if (filters.featured !== undefined) {
        query = query.where('featured', '==', filters.featured);
      }
      
      if (filters.parentId !== undefined) {
        query = query.where('parentId', '==', filters.parentId);
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'sortOrder';
      const sortOrder = filters.sortOrder || 'asc';
      query = query.orderBy(sortBy, sortOrder);
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return [];
      }
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  }

  // Get category by ID
  static async getById(id) {
    try {
      const categoryDoc = await db.collection('categories').doc(id).get();
      
      if (!categoryDoc.exists) {
        return null;
      }
      
      return { id: categoryDoc.id, ...categoryDoc.data() };
    } catch (error) {
      console.error('Error getting category:', error);
      throw error;
    }
  }

  // Get category by slug
  static async getBySlug(slug) {
    try {
      const snapshot = await db.collection('categories')
        .where('slug', '==', slug)
        .where('active', '==', true)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting category by slug:', error);
      throw error;
    }
  }

  // Update category
  static async update(id, updates) {
    try {
      const categoryRef = db.collection('categories').doc(id);
      
      // If name is being updated, regenerate slug
      if (updates.name) {
        updates.slug = new Category({ name: updates.name }).generateSlug(updates.name);
      }
      
      await categoryRef.update({
        ...updates,
        updatedAt: new Date()
      });
      
      const updatedCategory = await categoryRef.get();
      return { id: updatedCategory.id, ...updatedCategory.data() };
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  // Delete category (soft delete)
  static async delete(id) {
    try {
      const categoryRef = db.collection('categories').doc(id);
      await categoryRef.update({
        active: false,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // Get root categories (no parent)
  static async getRootCategories() {
    try {
      return await this.getAll({ 
        parentId: null, 
        active: true 
      });
    } catch (error) {
      console.error('Error getting root categories:', error);
      throw error;
    }
  }

  // Get subcategories by parent ID
  static async getSubcategories(parentId) {
    try {
      return await this.getAll({ 
        parentId, 
        active: true 
      });
    } catch (error) {
      console.error('Error getting subcategories:', error);
      throw error;
    }
  }

  // Get category tree (hierarchical structure)
  static async getCategoryTree() {
    try {
      const allCategories = await this.getAll({ active: true });
      
      // Build tree structure
      const categoryMap = new Map();
      const rootCategories = [];
      
      // First pass: create map of all categories
      allCategories.forEach(category => {
        categoryMap.set(category.id, { ...category, children: [] });
      });
      
      // Second pass: build tree structure
      allCategories.forEach(category => {
        if (category.parentId) {
          const parent = categoryMap.get(category.parentId);
          if (parent) {
            parent.children.push(categoryMap.get(category.id));
          }
        } else {
          rootCategories.push(categoryMap.get(category.id));
        }
      });
      
      return rootCategories;
    } catch (error) {
      console.error('Error getting category tree:', error);
      throw error;
    }
  }

  // Update product count for category
  static async updateProductCount(categoryId, count) {
    try {
      const categoryRef = db.collection('categories').doc(categoryId);
      await categoryRef.update({
        productCount: count,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error updating product count:', error);
      throw error;
    }
  }

  // Get featured categories
  static async getFeatured() {
    try {
      return await this.getAll({ 
        featured: true, 
        active: true 
      });
    } catch (error) {
      console.error('Error getting featured categories:', error);
      throw error;
    }
  }

  // Search categories
  static async search(searchTerm, filters = {}) {
    try {
      const categories = await this.getAll({ active: true, ...filters });
      
      if (!searchTerm) {
        return categories;
      }
      
      const lowercaseSearch = searchTerm.toLowerCase();
      
      return categories.filter(category => 
        category.name.toLowerCase().includes(lowercaseSearch) ||
        category.description.toLowerCase().includes(lowercaseSearch)
      );
    } catch (error) {
      console.error('Error searching categories:', error);
      throw error;
    }
  }

  // Reorder categories
  static async reorder(categoryOrders) {
    try {
      const batch = db.batch();
      
      categoryOrders.forEach(({ id, sortOrder }) => {
        const categoryRef = db.collection('categories').doc(id);
        batch.update(categoryRef, { 
          sortOrder,
          updatedAt: new Date()
        });
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error reordering categories:', error);
      throw error;
    }
  }

  // Get category path (breadcrumb)
  static async getCategoryPath(categoryId) {
    try {
      const path = [];
      let currentId = categoryId;
      
      while (currentId) {
        const category = await this.getById(currentId);
        if (!category) break;
        
        path.unshift({
          id: category.id,
          name: category.name,
          slug: category.slug
        });
        
        currentId = category.parentId;
      }
      
      return path;
    } catch (error) {
      console.error('Error getting category path:', error);
      throw error;
    }
  }
}

module.exports = Category;
