const { db } = require('../config/firebase-admin');

class User {
  constructor(uid, email, name = '', phone = '', addresses = [], preferences = {}) {
    this.uid = uid;
    this.email = email;
    this.name = name;
    this.phone = phone;
    this.addresses = addresses;
    this.preferences = preferences;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Create or update user in Firestore
  static async createOrUpdate(userData) {
    try {
      const userRef = db.collection('users').doc(userData.uid);
      await userRef.set({
        ...userData,
        updatedAt: new Date()
      }, { merge: true });
      
      return userData;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  // Get user by UID
  static async getById(uid) {
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      
      if (!userDoc.exists) {
        return null;
      }
      
      return userDoc.data();
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateProfile(uid, updates) {
    try {
      const userRef = db.collection('users').doc(uid);
      await userRef.update({
        ...updates,
        updatedAt: new Date()
      });
      
      const updatedUser = await userRef.get();
      return updatedUser.data();
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Add address to user
  static async addAddress(uid, address) {
    try {
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const addresses = userData.addresses || [];
      
      // Generate unique ID for address
      const addressId = Date.now().toString();
      addresses.push({ id: addressId, ...address });
      
      await userRef.update({
        addresses,
        updatedAt: new Date()
      });
      
      return { id: addressId, ...address };
    } catch (error) {
      console.error('Error adding address:', error);
      throw error;
    }
  }

  // Update user address
  static async updateAddress(uid, addressId, updates) {
    try {
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const addresses = userData.addresses || [];
      
      const addressIndex = addresses.findIndex(addr => addr.id === addressId);
      if (addressIndex === -1) {
        throw new Error('Address not found');
      }
      
      addresses[addressIndex] = { ...addresses[addressIndex], ...updates };
      
      await userRef.update({
        addresses,
        updatedAt: new Date()
      });
      
      return addresses[addressIndex];
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  }

  // Delete user address
  static async deleteAddress(uid, addressId) {
    try {
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const addresses = (userData.addresses || []).filter(addr => addr.id !== addressId);
      
      await userRef.update({
        addresses,
        updatedAt: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting address:', error);
      throw error;
    }
  }
}

module.exports = User;