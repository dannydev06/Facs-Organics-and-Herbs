// API base URL - update this to match your backend URL
const API_BASE = 'http://localhost:3001/api';

// Helper function for API calls with Firebase token
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

// Load user data from backend
async function loadUserData() {
  try {
    // Load user profile
    const profile = await apiCall('/user/profile');
    
    // Update user greeting
    const userGreeting = document.getElementById('user-greeting');
    if (userGreeting) {
      userGreeting.textContent = profile.name;
    }
    
    // Update profile form
    const userNameInput = document.getElementById('user-name');
    const userEmailInput = document.getElementById('user-email');
    const userPhoneInput = document.getElementById('user-phone');
    
    if (userNameInput) userNameInput.value = profile.name || '';
    if (userEmailInput) userEmailInput.value = profile.email || '';
    if (userPhoneInput) userPhoneInput.value = profile.phone || '';
    
    // Load orders
    await loadOrders();
    
    // Load addresses
    await loadAddresses();
    
    // Load wishlist
    await loadWishlist();
    
    // Load preferences
    await loadPreferences();
    
  } catch (error) {
    console.error('Error loading user data:', error);
    
    // Fallback to generic greeting if API fails
    const userGreeting = document.getElementById('user-greeting');
    if (userGreeting) {
      userGreeting.textContent = 'Valued Customer';
    }
  }
}

// Load user's orders
async function loadOrders() {
  try {
    const orders = await apiCall('/user/orders');
    const ordersList = document.getElementById('orders-list');
    
    if (!ordersList) return;
    
    if (!orders || orders.length === 0) {
      ordersList.innerHTML = '<p>You have no orders yet.</p>';
      return;
    }
    
    let ordersHTML = '';
    
    orders.forEach(order => {
      ordersHTML += `
        <div class="order-card">
          <div class="order-header">
            <div>
              <div class="order-id">Order #${order.id}</div>
              <div class="order-date">Placed on ${order.date}</div>
            </div>
            <span class="order-status status-${order.status}">${order.status}</span>
          </div>
          
          <div class="order-details">
            <div class="order-detail">
              <span class="detail-label">TOTAL</span>
              <span class="detail-value">₦${(order.total * 1000).toLocaleString()}</span>
            </div>
          </div>
          
          <div class="order-items">
            ${order.items.map(item => `
              <div class="order-item">
                <img src="${item.image}" alt="${item.name}" class="item-image">
                <div class="item-details">
                  <div class="item-name">${item.name}</div>
                  <div class="item-price">₦${(item.price * 1000).toLocaleString()}</div>
                </div>
                <div class="item-quantity">Qty: ${item.quantity}</div>
              </div>
            `).join('')}
          </div>
          
          <div class="order-actions">
            <button class="btn" onclick="reorder('${order.id}')">Reorder</button>
            <button class="btn btn-secondary" onclick="viewOrderDetails('${order.id}')">View Details</button>
          </div>
        </div>
      `;
    });
    
    ordersList.innerHTML = ordersHTML;
  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

// Load user's addresses
async function loadAddresses() {
  try {
    const addresses = await apiCall('/user/addresses');
    const addressesList = document.getElementById('addresses-list');
    const checkoutAddresses = document.getElementById('checkout-addresses');
    
    if (!addressesList) return;
    
    if (!addresses || addresses.length === 0) {
      addressesList.innerHTML = '<p>You have no saved addresses.</p>';
      checkoutAddresses.innerHTML = '<p>You have no saved addresses.</p>';
      return;
    }
    
    let addressesHTML = '';
    let checkoutAddressesHTML = '';
    
    addresses.forEach(address => {
      addressesHTML += `
        <div class="address-card ${address.isDefault ? 'selected' : ''}" data-address-id="${address.id}">
          <h4>${address.name} ${address.isDefault ? '(Default)' : ''}</h4>
          <p>${address.street}</p>
          <p>${address.city}, ${address.state} ${address.zip}</p>
          <p>${address.country}</p>
          <p>${address.phone}</p>
          <button class="btn" onclick="setDefaultAddress('${address.id}')">Set as Default</button>
          <button class="btn btn-secondary" onclick="deleteAddress('${address.id}')">Delete</button>
        </div>
      `;
      
      checkoutAddressesHTML += `
        <div class="address-card ${address.isDefault ? 'selected' : ''}" data-address-id="${address.id}">
          <h4>${address.name}</h4>
          <p>${address.street}</p>
          <p>${address.city}, ${address.state} ${address.zip}</p>
          <p>${address.country}</p>
          <p>${address.phone}</p>
        </div>
      `;
    });
    
    addressesList.innerHTML = addressesHTML;
    checkoutAddresses.innerHTML = checkoutAddressesHTML;
  } catch (error) {
    console.error('Error loading addresses:', error);
  }
}

// Load user's wishlist
async function loadWishlist() {
  try {
    const wishlist = await apiCall('/user/wishlist');
    const wishlistItems = document.getElementById('wishlist-items');
    
    if (!wishlistItems) return;
    
    if (!wishlist || wishlist.length === 0) {
      wishlistItems.innerHTML = '<p>Your wishlist is empty.</p>';
      return;
    }
    
    let wishlistHTML = '<div class="wishlist-grid">';
    
    wishlist.forEach(item => {
      wishlistHTML += `
        <div class="wishlist-item">
          <img src="${item.image}" alt="${item.name}" class="wishlist-image">
          <h3 class="wishlist-name">${item.name}</h3>
          <div class="wishlist-price">$${item.price.toFixed(2)}</div>
          <div class="wishlist-actions">
            <button class="btn" onclick="addToCart('${item.id}')">Add to Cart</button>
            <button class="btn btn-secondary" onclick="removeFromWishlist('${item.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    });
    
    wishlistHTML += '</div>';
    wishlistItems.innerHTML = wishlistHTML;
  } catch (error) {
    console.error('Error loading wishlist:', error);
  }
}

// Load user preferences
async function loadPreferences() {
  try {
    const preferences = await apiCall('/user/preferences');
    
    // Update preference checkboxes
    const emailNotifications = document.getElementById('email-notifications');
    const smsNotifications = document.getElementById('sms-notifications');
    const newsletter = document.getElementById('newsletter');
    
    if (emailNotifications) emailNotifications.checked = preferences.emailNotifications;
    if (smsNotifications) smsNotifications.checked = preferences.smsNotifications;
    if (newsletter) newsletter.checked = preferences.newsletter;
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
}

// Save new address
async function saveAddress() {
  try {
    const addressName = document.getElementById('address-name').value;
    const addressStreet = document.getElementById('address-street').value;
    const addressCity = document.getElementById('address-city').value;
    const addressState = document.getElementById('address-state').value;
    const addressZip = document.getElementById('address-zip').value;
    const addressCountry = document.getElementById('address-country').value;
    const addressPhone = document.getElementById('address-phone').value;
    const addressDefault = document.getElementById('address-default').checked;
    
    await apiCall('/user/addresses', {
      method: 'POST',
      body: JSON.stringify({
        name: addressName,
        street: addressStreet,
        city: addressCity,
        state: addressState,
        zip: addressZip,
        country: addressCountry,
        phone: addressPhone,
        isDefault: addressDefault
      })
    });
    
    // Reload addresses
    await loadAddresses();
    
    // Hide form and reset fields
    document.getElementById('address-form').style.display = 'none';
    document.getElementById('address-form').reset();
    
    alert('Address saved successfully!');
  } catch (error) {
    console.error('Error saving address:', error);
    alert('Error saving address: ' + error.message);
  }
}

// Save user settings
async function saveSettings() {
  try {
    const userName = document.getElementById('user-name').value;
    const userPhone = document.getElementById('user-phone').value;
    
    await apiCall('/user/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: userName,
        phone: userPhone
      })
    });
    
    alert('Settings saved successfully!');
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('Error saving settings: ' + error.message);
  }
}

// Save user preferences
async function saveNotificationSettings() {
  try {
    const emailNotifications = document.getElementById('email-notifications').checked;
    const smsNotifications = document.getElementById('sms-notifications').checked;
    const newsletter = document.getElementById('newsletter').checked;
    
    await apiCall('/user/preferences', {
      method: 'PUT',
      body: JSON.stringify({
        emailNotifications,
        smsNotifications,
        newsletter
      })
    });
    
    alert('Preferences saved successfully!');
  } catch (error) {
    console.error('Error saving preferences:', error);
    alert('Error saving preferences: ' + error.message);
  }
}

// Set default address
async function setDefaultAddress(addressId) {
  try {
    await apiCall(`/user/addresses/${addressId}`, {
      method: 'PUT',
      body: JSON.stringify({ isDefault: true })
    });
    
    await loadAddresses();
    alert('Default address updated successfully!');
  } catch (error) {
    console.error('Error setting default address:', error);
    alert('Error setting default address: ' + error.message);
  }
}

// Delete address
async function deleteAddress(addressId) {
  if (!confirm('Are you sure you want to delete this address?')) return;
  
  try {
    await apiCall(`/user/addresses/${addressId}`, {
      method: 'DELETE'
    });
    
    await loadAddresses();
    alert('Address deleted successfully!');
  } catch (error) {
    console.error('Error deleting address:', error);
    alert('Error deleting address: ' + error.message);
  }
}

// Remove from wishlist
async function removeFromWishlist(productId) {
  try {
    await apiCall(`/user/wishlist/${productId}`, {
      method: 'DELETE'
    });
    
    await loadWishlist();
    alert('Product removed from wishlist!');
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    alert('Error removing from wishlist: ' + error.message);
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is authenticated with Firebase
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = 'Accounts.html';
      return;
    }
    
    // Load user data from your backend
    await loadUserData();
    
    // Set up tab functionality
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
      });
    });
    
    // Set up address form toggle
    const addAddressBtn = document.getElementById('add-address-btn');
    const addressForm = document.getElementById('address-form');
    const cancelAddressBtn = document.getElementById('cancel-address-btn');
    
    if (addAddressBtn && addressForm) {
      addAddressBtn.addEventListener('click', () => {
        addressForm.style.display = 'block';
      });
    }
    
    if (cancelAddressBtn && addressForm) {
      cancelAddressBtn.addEventListener('click', () => {
        addressForm.style.display = 'none';
      });
    }
    
    // Set up save address button
    const saveAddressBtn = document.getElementById('save-address-btn');
    if (saveAddressBtn) {
      saveAddressBtn.addEventListener('click', saveAddress);
    }
    
    // Set up save settings button
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    // Set up save notifications button
    const saveNotificationsBtn = document.getElementById('save-notifications-btn');
    if (saveNotificationsBtn) {
      saveNotificationsBtn.addEventListener('click', saveNotificationSettings);
    }
    
    // Set up change password button
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener('click', changePassword);
    }
  });
});

// Change password function (using Firebase)
async function changePassword() {
  const user = auth.currentUser;
  if (!user) return;
  
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
  if (newPassword !== confirmPassword) {
    alert('New passwords do not match.');
    return;
  }
  
  try {
    // Reauthenticate user
    const credential = firebase.auth.EmailAuthProvider.credential(
      user.email, 
      currentPassword
    );
    
    await user.reauthenticateWithCredential(credential);
    
    // Update password
    await user.updatePassword(newPassword);
    
    // Clear password fields
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    
    alert('Password changed successfully!');
  } catch (error) {
    console.error('Error changing password:', error);
    alert('Error changing password. Please check your current password and try again.');
  }
}

// View order details
function viewOrderDetails(orderId) {
  alert(`Viewing details for order ${orderId}`);
  // In a real implementation, you would show a modal or navigate to an order details page
}

// Reorder items
function reorder(orderId) {
  alert(`Adding items from order ${orderId} to cart`);
  // In a real implementation, you would add all items from this order to the cart
}

// Add to cart from wishlist
function addToCart(productId) {
  alert(`Adding product ${productId} to cart`);
  // In a real implementation, you would add this product to the cart
}

// Enhanced error handling for API calls
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
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Enhanced saveAddress function with better error handling
async function saveAddress() {
  try {
    const addressName = document.getElementById('address-name').value;
    const addressStreet = document.getElementById('address-street').value;
    const addressCity = document.getElementById('address-city').value;
    const addressState = document.getElementById('address-state').value;
    const addressZip = document.getElementById('address-zip').value;
    const addressCountry = document.getElementById('address-country').value;
    const addressPhone = document.getElementById('address-phone').value;
    const addressDefault = document.getElementById('address-default').checked;
    
    // Show loading state
    const saveBtn = document.getElementById('save-address-btn');
    const originalText = saveBtn.textContent;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    const result = await apiCall('/user/addresses', {
      method: 'POST',
      body: JSON.stringify({
        name: addressName,
        street: addressStreet,
        city: addressCity,
        state: addressState,
        zip: addressZip,
        country: addressCountry,
        phone: addressPhone,
        isDefault: addressDefault
      })
    });
    
    // Reload addresses
    await loadAddresses();
    
    // Hide form and reset fields
    document.getElementById('address-form').style.display = 'none';
    document.getElementById('address-form').reset();
    
    // Show success message
    showNotification('Address saved successfully!', 'success');
    
  } catch (error) {
    console.error('Error saving address:', error);
    showNotification('Error saving address: ' + error.message, 'error');
  } finally {
    // Restore button state
    const saveBtn = document.getElementById('save-address-btn');
    saveBtn.textContent = 'Save Address';
    saveBtn.disabled = false;
  }
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
  // Remove any existing notifications
  const existingNotification = document.getElementById('custom-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  const notification = document.createElement('div');
  notification.id = 'custom-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease-out;
  `;
  
  if (type === 'success') {
    notification.style.backgroundColor = '#4CAF50';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#f44336';
  } else {
    notification.style.backgroundColor = '#2196F3';
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

// Add CSS for notification animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

// Sync wishlist with main site
function syncWishlistWithMainSite() {
    const mainWishlist = JSON.parse(localStorage.getItem('wishlistItems')) || [];
    
    // If user is logged in, sync with backend
    if (auth.currentUser) {
        // Send wishlist items to backend
        mainWishlist.forEach(async (item) => {
            try {
                await apiCall('/user/wishlist', {
                    method: 'POST',
                    body: JSON.stringify({
                        productId: item.id,
                        name: item.name,
                        price: item.price,
                        image: item.image
                    })
                });
            } catch (error) {
                console.error('Error syncing wishlist:', error);
            }
        });
        
        // Clear local wishlist after sync
        localStorage.removeItem('wishlistItems');
    }
}

// Call this function when user logs in
// Add this to your auth.onAuthStateChanged callback in user-dashboard.js
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // ... your existing code ...
        
        // Sync wishlist if user has items in local storage
        syncWishlistWithMainSite();
        
        // Load user data
        await loadUserData();
    }
});