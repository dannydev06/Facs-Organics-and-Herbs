const { db } = require('../config/firebase-admin');
const Product = require('./Product');

class Order {
  constructor(data) {
    this.orderNumber = data.orderNumber || this.generateOrderNumber();
    this.userId = data.userId;
    this.customerInfo = {
      name: data.customerInfo.name,
      email: data.customerInfo.email,
      phone: data.customerInfo.phone
    };
    this.items = data.items || [];
    this.shippingAddress = data.shippingAddress;
    this.billingAddress = data.billingAddress || data.shippingAddress;
    this.subtotal = data.subtotal || 0;
    this.tax = data.tax || 0;
    this.shipping = data.shipping || 0;
    this.discount = data.discount || 0;
    this.total = data.total || 0;
    this.status = data.status || 'pending'; // pending, processing, shipped, delivered, cancelled, refunded
    this.paymentStatus = data.paymentStatus || 'pending'; // pending, paid, failed, refunded
    this.paymentMethod = data.paymentMethod || '';
    this.paymentDetails = data.paymentDetails || {};
    this.shippingMethod = data.shippingMethod || '';
    this.trackingNumber = data.trackingNumber || '';
    this.notes = data.notes || '';
    this.adminNotes = data.adminNotes || '';
    this.refunds = data.refunds || [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.shippedAt = data.shippedAt || null;
    this.deliveredAt = data.deliveredAt || null;
  }

  generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}${random}`;
  }

  // Create a new order
  static async create(orderData) {
    try {
      // Validate inventory before creating order
      for (const item of orderData.items) {
        const product = await Product.getById(item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        if (product.inventory.trackQuantity && product.inventory.quantity < item.quantity) {
          throw new Error(`Insufficient inventory for ${product.name}`);
        }
      }

      const order = new Order(orderData);
      const orderRef = db.collection('orders').doc();
      
      // Calculate totals
      order.subtotal = this.calculateSubtotal(order.items);
      order.tax = this.calculateTax(order.subtotal);
      order.total = order.subtotal + order.tax + order.shipping - order.discount;
      
      await orderRef.set({
        id: orderRef.id,
        ...order
      });
      
      // Update product inventory
      for (const item of order.items) {
        await Product.updateInventory(item.productId, item.quantity, 'subtract');
      }
      
      return { id: orderRef.id, ...order };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  // Get all orders with optional filtering
  static async getAll(filters = {}) {
    try {
      let query = db.collection('orders');
      
      // Apply filters
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }
      
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      
      if (filters.paymentStatus) {
        query = query.where('paymentStatus', '==', filters.paymentStatus);
      }

      // Date range filtering
      if (filters.startDate) {
        query = query.where('createdAt', '>=', new Date(filters.startDate));
      }
      
      if (filters.endDate) {
        query = query.where('createdAt', '<=', new Date(filters.endDate));
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      query = query.orderBy(sortBy, sortOrder);
      
      // Apply pagination
      if (filters.limit) {
        query = query.limit(parseInt(filters.limit));
      }
      
      if (filters.offset) {
        query = query.offset(parseInt(filters.offset));
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return [];
      }
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting orders:', error);
      throw error;
    }
  }

  // Get order by ID
  static async getById(id) {
    try {
      const orderDoc = await db.collection('orders').doc(id).get();
      
      if (!orderDoc.exists) {
        return null;
      }
      
      return { id: orderDoc.id, ...orderDoc.data() };
    } catch (error) {
      console.error('Error getting order:', error);
      throw error;
    }
  }

  // Get order by order number
  static async getByOrderNumber(orderNumber) {
    try {
      const snapshot = await db.collection('orders')
        .where('orderNumber', '==', orderNumber)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting order by order number:', error);
      throw error;
    }
  }

  // Update order status
  static async updateStatus(id, status, adminNotes = '') {
    try {
      const orderRef = db.collection('orders').doc(id);
      const updates = {
        status,
        updatedAt: new Date()
      };

      if (adminNotes) {
        updates.adminNotes = adminNotes;
      }

      // Set timestamps for specific statuses
      if (status === 'shipped' && !updates.shippedAt) {
        updates.shippedAt = new Date();
      }
      
      if (status === 'delivered' && !updates.deliveredAt) {
        updates.deliveredAt = new Date();
      }

      await orderRef.update(updates);
      
      const updatedOrder = await orderRef.get();
      return { id: updatedOrder.id, ...updatedOrder.data() };
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  // Update payment status
  static async updatePaymentStatus(id, paymentStatus, paymentDetails = {}) {
    try {
      const orderRef = db.collection('orders').doc(id);
      
      await orderRef.update({
        paymentStatus,
        paymentDetails,
        updatedAt: new Date()
      });
      
      const updatedOrder = await orderRef.get();
      return { id: updatedOrder.id, ...updatedOrder.data() };
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  // Add tracking number
  static async addTrackingNumber(id, trackingNumber, shippingMethod = '') {
    try {
      const orderRef = db.collection('orders').doc(id);
      
      await orderRef.update({
        trackingNumber,
        shippingMethod,
        status: 'shipped',
        shippedAt: new Date(),
        updatedAt: new Date()
      });
      
      const updatedOrder = await orderRef.get();
      return { id: updatedOrder.id, ...updatedOrder.data() };
    } catch (error) {
      console.error('Error adding tracking number:', error);
      throw error;
    }
  }

  // Cancel order
  static async cancel(id, reason = '') {
    try {
      const orderRef = db.collection('orders').doc(id);
      const orderDoc = await orderRef.get();
      
      if (!orderDoc.exists) {
        throw new Error('Order not found');
      }
      
      const orderData = orderDoc.data();
      
      // Only cancel if order hasn't been shipped
      if (['shipped', 'delivered'].includes(orderData.status)) {
        throw new Error('Cannot cancel order that has been shipped');
      }
      
      // Restore inventory
      for (const item of orderData.items) {
        await Product.updateInventory(item.productId, item.quantity, 'add');
      }
      
      await orderRef.update({
        status: 'cancelled',
        adminNotes: reason,
        updatedAt: new Date()
      });
      
      const updatedOrder = await orderRef.get();
      return { id: updatedOrder.id, ...updatedOrder.data() };
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  // Get orders by user
  static async getByUserId(userId, options = {}) {
    try {
      return await this.getAll({ userId, ...options });
    } catch (error) {
      console.error('Error getting orders by user:', error);
      throw error;
    }
  }

  // Get recent orders
  static async getRecent(limit = 10) {
    try {
      return await this.getAll({ 
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    } catch (error) {
      console.error('Error getting recent orders:', error);
      throw error;
    }
  }

  // Get orders by status
  static async getByStatus(status, options = {}) {
    try {
      return await this.getAll({ status, ...options });
    } catch (error) {
      console.error('Error getting orders by status:', error);
      throw error;
    }
  }

  // Calculate statistics
  static async getStatistics(startDate, endDate) {
    try {
      const filters = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      
      const orders = await this.getAll(filters);
      
      const stats = {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
        averageOrderValue: 0,
        statusBreakdown: {},
        paymentStatusBreakdown: {}
      };
      
      if (stats.totalOrders > 0) {
        stats.averageOrderValue = stats.totalRevenue / stats.totalOrders;
      }
      
      // Count by status
      orders.forEach(order => {
        stats.statusBreakdown[order.status] = (stats.statusBreakdown[order.status] || 0) + 1;
        stats.paymentStatusBreakdown[order.paymentStatus] = (stats.paymentStatusBreakdown[order.paymentStatus] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Error calculating order statistics:', error);
      throw error;
    }
  }

  // Helper methods for calculations
  static calculateSubtotal(items) {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  static calculateTax(subtotal, taxRate = 0.08) { // 8% default tax rate
    return subtotal * taxRate;
  }

  // Search orders
  static async search(searchTerm, filters = {}) {
    try {
      const orders = await this.getAll(filters);
      
      if (!searchTerm) {
        return orders;
      }
      
      const lowercaseSearch = searchTerm.toLowerCase();
      
      return orders.filter(order => 
        order.orderNumber.toLowerCase().includes(lowercaseSearch) ||
        order.customerInfo.name.toLowerCase().includes(lowercaseSearch) ||
        order.customerInfo.email.toLowerCase().includes(lowercaseSearch) ||
        (order.trackingNumber && order.trackingNumber.toLowerCase().includes(lowercaseSearch))
      );
    } catch (error) {
      console.error('Error searching orders:', error);
      throw error;
    }
  }
}

module.exports = Order;
