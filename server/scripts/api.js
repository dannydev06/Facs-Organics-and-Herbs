import { auth } from './firebase-config.js';

const API_BASE = 'http://localhost:3001/api';

// Generic API call function
async function apiCall(endpoint, options = {}) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Get Firebase ID token
    const idToken = await user.getIdToken();
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized - redirect to login
        window.location.href = 'Accounts.html';
        return;
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Product API functions
export const productsAPI = {
  getAll: (params = {}) => apiCall(`/products?${new URLSearchParams(params)}`),
  getById: (id) => apiCall(`/products/${id}`),
  getCategories: () => apiCall('/products/categories/list')
};

// User API functions
export const usersAPI = {
  getProfile: () => apiCall('/users/profile'),
  updateProfile: (data) => apiCall('/users/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  getAddresses: () => apiCall('/users/addresses'),
  addAddress: (address) => apiCall('/users/addresses', {
    method: 'POST',
    body: JSON.stringify(address)
  }),
  updateAddress: (id, updates) => apiCall(`/users/addresses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  }),
  deleteAddress: (id) => apiCall(`/users/addresses/${id}`, {
    method: 'DELETE'
  })
};

// Orders API functions
export const ordersAPI = {
  getAll: (params = {}) => apiCall(`/orders?${new URLSearchParams(params)}`),
  getById: (id) => apiCall(`/orders/${id}`),
  create: (orderData) => apiCall('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  }),
  updateStatus: (id, status) => apiCall(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  })
};

// Admin API functions (for admin dashboard)
export const adminAPI = {
  // Product management
  createProduct: (productData) => apiCall('/products', {
    method: 'POST',
    body: JSON.stringify(productData)
  }),
  updateProduct: (id, productData) => apiCall(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData)
  }),
  deleteProduct: (id) => apiCall(`/products/${id}`, {
    method: 'DELETE'
  }),
  
  // Order management
  getAllOrders: (params = {}) => apiCall(`/orders/admin?${new URLSearchParams(params)}`),
  updateOrderStatus: (id, status) => apiCall(`/orders/admin/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  })
};