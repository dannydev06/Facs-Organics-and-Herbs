// Cart functionality
const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
const cartItemsList = document.getElementById('cart-items');
const totalPriceElement = document.getElementById('total-price');
const cartIconBadge = document.querySelector('.cart-count');
const cartModal = document.getElementById('cart-modal');
const productAddedPrompt = document.getElementById('product-added-prompt');1

// Mobile menu toggle
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const mainNav = document.querySelector('.main-nav');

// Show product preview
function showPreview(card) {
    const preview = document.getElementById('product-preview');
    const greyMask = document.getElementById('grey-mask');
    if (!preview || !greyMask) {
        console.error('Product preview or grey mask element not found');
        return;
    }

    const previewImage = preview.querySelector('.preview-image');
    const previewTitle = preview.querySelector('.preview-title');
    const previewPrice = preview.querySelector('.preview-price');

    if (!previewImage || !previewTitle || !previewPrice) {
        console.error('One or more preview elements not found');
        return;
    }

    const cardImage = card.querySelector('.product-image');
    const cardTitle = card.querySelector('.product-title');
    const cardPrice = card.querySelector('.product-price');

    if (!cardImage || !cardTitle || !cardPrice) {
        console.error('One or more card elements not found');
        return;
    }

    previewImage.src = cardImage.src;
    previewTitle.textContent = cardTitle.textContent;
    previewPrice.textContent = cardPrice.textContent;

    preview.classList.add('active');
    greyMask.classList.add('active');
}

// Hide product preview
function hidePreview() {
    const preview = document.getElementById('product-preview');
    const greyMask = document.getElementById('grey-mask');
    if (preview && greyMask) {
        preview.classList.remove('active');
        greyMask.classList.remove('active');
    } else {
        console.error('Product preview or grey mask element not found');
    }
}

// Add item to cart
function addToCart() {
    const itemName = document.querySelector('.preview-title').textContent;
    const itemPrice = parseFloat(document.querySelector('.preview-price').textContent.replace('₦', '').replace(',', '')) / 1000;
    const itemQuantity = parseInt(document.getElementById('quantity').value);

    const existingItemIndex = cartItems.findIndex(item => item.name === itemName);
    
    if (existingItemIndex > -1) {
        cartItems[existingItemIndex].quantity += itemQuantity;
    } else {
        const item = {
            name: itemName,
            price: itemPrice,
            quantity: itemQuantity
        };
        cartItems.push(item);
    }
    
    updateCart();
    showProductAddedPrompt();
    hidePreview();
}

// Update cart display
function updateCart() {
    cartItemsList.innerHTML = '';
    let totalPrice = 0;
    let totalItems = 0;

    if (cartItems.length === 0) {
        cartItemsList.innerHTML = '<li>Your cart is empty.</li>';
        cartIconBadge.textContent = '0';
    } else {
        cartItems.forEach(item => {
            const cartItem = document.createElement('li');
            const itemTotal = item.price * item.quantity;
            cartItem.textContent = `${item.name} x ${item.quantity} - ₦${(itemTotal * 1000).toLocaleString()}`;
            cartItemsList.appendChild(cartItem);
            totalPrice += itemTotal;
            totalItems += item.quantity;
        });
        cartIconBadge.textContent = totalItems;
    }

    totalPriceElement.textContent = `Total: ₦${(totalPrice * 1000).toLocaleString()}`;
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
}

// Show cart preview
function showCartPreview() {
    updateCart();
    cartModal.style.display = 'flex';
}

// Hide cart preview
function hideCartPreview() {
    cartModal.style.display = 'none';
}

// Show product added prompt
function showProductAddedPrompt() {
    productAddedPrompt.classList.add('show');
    setTimeout(() => {
        productAddedPrompt.classList.remove('show');
    }, 1500);
}

// Clear cart
function clearCart() {
    cartItems.length = 0;
    updateCart();
    localStorage.removeItem('cartItems');
}

// Toggle mobile menu
function toggleMobileMenu() {
    mainNav.classList.toggle('active');
    
    // Change icon based on menu state
    const icon = mobileMenuToggle.querySelector('i');
    if (mainNav.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}

// Close mobile menu when clicking on a link
function closeMobileMenu() {
    mainNav.classList.remove('active');
    const icon = mobileMenuToggle.querySelector('i');
    icon.classList.remove('fa-times');
    icon.classList.add('fa-bars');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Add click events to all product cards
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => showPreview(card));
    });

    // Grey mask click event
    const greyMaskElement = document.getElementById('grey-mask');
    if (greyMaskElement) {
        greyMaskElement.addEventListener('click', hidePreview);
    }

    // Close preview button
    const closePreviewButton = document.querySelector('.close-preview');
    if (closePreviewButton) {
        closePreviewButton.addEventListener('click', hidePreview);
    }

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === cartModal) {
            hideCartPreview();
        }
    });

    // Mobile menu toggle
    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', toggleMobileMenu);
        
        // Close menu when clicking on nav links
        const navLinks = mainNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });
    }

    // Initialize cart on page load
    updateCart();
});
// Add these functions to your existing script.js

// Wishlist functionality
const wishlistItems = JSON.parse(localStorage.getItem('wishlistItems')) || [];
const wishlistIconBadge = document.querySelector('.wishlist-count');
const wishlistPrompt = document.getElementById('wishlist-prompt');

// Toggle wishlist item
function toggleWishlist(event, heartElement) {
    event.stopPropagation(); // Prevent triggering the product card click
    
    const productCard = heartElement.closest('.product-card');
    const productId = productCard.getAttribute('data-id');
    const productName = productCard.getAttribute('data-name');
    const productPrice = parseFloat(productCard.getAttribute('data-price'));
    const productImage = productCard.getAttribute('data-image');
    
    const existingItemIndex = wishlistItems.findIndex(item => item.id === productId);
    
    if (existingItemIndex > -1) {
        // Remove from wishlist
        wishlistItems.splice(existingItemIndex, 1);
        heartElement.classList.remove('active');
        heartElement.querySelector('i').classList.remove('fas');
        heartElement.querySelector('i').classList.add('far');
        showWishlistPrompt('Product removed from wishlist');
    } else {
        // Add to wishlist
        const item = {
            id: productId,
            name: productName,
            price: productPrice,
            image: productImage
        };
        wishlistItems.push(item);
        heartElement.classList.add('active', 'animate');
        heartElement.querySelector('i').classList.remove('far');
        heartElement.querySelector('i').classList.add('fas');
        showWishlistPrompt('Product added to wishlist!');
        
        // Remove animation class after animation completes
        setTimeout(() => {
            heartElement.classList.remove('animate');
        }, 600);
    }
    
    updateWishlist();
    localStorage.setItem('wishlistItems', JSON.stringify(wishlistItems));
}

// Update wishlist display
function updateWishlist() {
    wishlistIconBadge.textContent = wishlistItems.length;
    
    // Update heart states on all products
    document.querySelectorAll('.product-card').forEach(card => {
        const productId = card.getAttribute('data-id');
        const heart = card.querySelector('.wishlist-heart');
        const heartIcon = heart.querySelector('i');
        
        const isInWishlist = wishlistItems.some(item => item.id === productId);
        
        if (isInWishlist) {
            heart.classList.add('active');
            heartIcon.classList.remove('far');
            heartIcon.classList.add('fas');
        } else {
            heart.classList.remove('active');
            heartIcon.classList.remove('fas');
            heartIcon.classList.add('far');
        }
    });
}

// Show wishlist prompt
function showWishlistPrompt(message) {
    wishlistPrompt.textContent = message;
    wishlistPrompt.classList.add('show');
    
    setTimeout(() => {
        wishlistPrompt.classList.remove('show');
    }, 1500);
}

// Initialize wishlist on page load
function initWishlist() {
    updateWishlist();
}

// Add this to your existing DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // ... your existing code ...
    
    // Initialize wishlist
    initWishlist();
    
    // Add click events to all product cards (modify existing code)
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't show preview if clicking on wishlist heart
            if (!e.target.closest('.wishlist-heart')) {
                showPreview(card);
            }
        });
    });
});