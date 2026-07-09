// Storefront Core Logic

// App State
const state = {
    products: [],
    cart: [],
    selectedSizes: {}, // maps product.id -> selected size string ('S', 'M', or 'L')
    currentFilter: 'all'
};

// DOM References
const elements = {
    pageLoader: document.getElementById('pageLoader'),
    demoBanner: document.getElementById('demoBanner'),
    productsGrid: document.getElementById('productsGrid'),
    filterTabs: document.querySelectorAll('.filter-tab'),
    cartCountBubble: document.getElementById('cartCountBubble'),
    cartDrawer: document.getElementById('cartDrawer'),
    cartOverlayBg: document.getElementById('cartOverlayBg'),
    openCartBtn: document.getElementById('openCartBtn'),
    closeCartBtn: document.getElementById('closeCartBtn'),
    cartItemsContainer: document.getElementById('cartItemsContainer'),
    cartSubtotal: document.getElementById('cartSubtotal'),
    checkoutSubtotal: document.getElementById('checkoutSubtotal'),
    toCheckoutBtn: document.getElementById('toCheckoutBtn'),
    cartIndexView: document.getElementById('cartIndexView'),
    cartCheckoutView: document.getElementById('cartCheckoutView'),
    backToCartBtn: document.getElementById('backToCartBtn'),
    checkoutForm: document.getElementById('checkoutForm'),
    submitOrderBtn: document.getElementById('submitOrderBtn'),

    // Alert Modal
    alertOverlay: document.getElementById('alertModalOverlay'),
    alertIcon: document.getElementById('alertModalIcon'),
    alertTitle: document.getElementById('alertModalTitle'),
    alertMsg: document.getElementById('alertModalMsg'),
    alertCloseBtn: document.getElementById('alertModalCloseBtn')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadCartFromStorage();
    fetchProductsAndRender();

    // Show demo notice banner if no Google Apps Script Web App URL is configured
    if (!CONFIG.API_URL) {
        elements.demoBanner.style.display = 'flex';
    }
});

// Setup Events
function setupEventListeners() {
    // Drawer Toggles
    elements.openCartBtn.addEventListener('click', openCart);
    elements.closeCartBtn.addEventListener('click', closeCart);
    elements.cartOverlayBg.addEventListener('click', closeCart);

    // Tab Filters
    elements.filterTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            elements.filterTabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            state.currentFilter = e.target.dataset.filter;
            renderProducts();
        });
    });

    // Home Navigation Links
    const navLinks = document.querySelectorAll('nav a, .logo');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const cat = link.getAttribute('data-category');
            if (cat) {
                e.preventDefault();
                // Set active filters tab
                elements.filterTabs.forEach(t => {
                    if (t.dataset.filter === cat) {
                        t.click();
                    }
                });
                document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Choose by Category grids list click
    const catCards = document.querySelectorAll('.category-card');
    catCards.forEach(card => {
        card.addEventListener('click', () => {
            const cat = card.getAttribute('data-cat');
            elements.filterTabs.forEach(t => {
                if (t.dataset.filter === cat) {
                    t.click();
                }
            });
            document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Checkout panels switches
    elements.toCheckoutBtn.addEventListener('click', () => {
        elements.cartIndexView.style.display = 'none';
        elements.cartCheckoutView.style.display = 'flex';
        elements.cartCheckoutView.classList.add('active');
    });

    elements.backToCartBtn.addEventListener('click', () => {
        elements.cartCheckoutView.style.display = 'none';
        elements.cartCheckoutView.classList.remove('active');
        elements.cartIndexView.style.display = 'flex';
    });

    // Place Order submission
    elements.checkoutForm.addEventListener('submit', handleCheckout);

    // Close Custom alert modal
    elements.alertCloseBtn.addEventListener('click', () => {
        elements.alertOverlay.classList.remove('active');
    });
}

// Fetch products from config DB
async function fetchProductsAndRender() {
    try {
        const data = await CONFIG.getDbData();
        state.products = data.products || [];
        renderProducts();
    } catch (error) {
        console.error("Error loading shop products:", error);
        showAlert('error', 'Retrieval Error', 'Could not sync products data. Using offline caches.');
    } finally {
        elements.pageLoader.classList.add('hidden');
    }
}

// Render Products catalog grid based on categories
function renderProducts() {
    elements.productsGrid.innerHTML = '';

    // Filter product items
    let filtered = [...state.products];
    if (state.currentFilter === 'top') {
        filtered = filtered.filter(p => p.is_top === true);
    } else if (state.currentFilter !== 'all') {
        filtered = filtered.filter(p => String(p.category).toLowerCase() === state.currentFilter);
    }

    // Draw empty warning if list is zero
    if (filtered.length === 0) {
        elements.productsGrid.innerHTML = `
      <div class="empty-catalog">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
        <h3>No Products Available</h3>
        <p>There are no products listed in this category right now. Open the admin panel to add products and choose photos.</p>
        <a href="admin.html" class="btn">Add Products Form</a>
      </div>
    `;
        return;
    }

    filtered.forEach(product => {
        // Determine sizes stock parameters
        const sStock = parseInt(product.stock_s) || 0;
        const mStock = parseInt(product.stock_m) || 0;
        const lStock = parseInt(product.stock_l) || 0;
        const totalStock = sStock + mStock + lStock;

        // Check discount rates
        const originPrice = parseFloat(product.price) || 0;
        const salePrice = parseFloat(product.sale_price) || 0;
        const hasDiscount = salePrice > 0 && salePrice < originPrice;

        // Choose selected size representation
        let selectedSize = state.selectedSizes[product.id] || '';

        // Make card container
        const card = document.createElement('div');
        card.className = 'product-card';

        // Render dynamic badges
        let badgeHTML = '';
        if (totalStock === 0) {
            badgeHTML = `<span class="badge badge-empty">Sold Out</span>`;
        } else if (hasDiscount) {
            const discountPct = Math.round(((originPrice - salePrice) / originPrice) * 100);
            badgeHTML = `<span class="badge badge-sale">-${discountPct}% Sale</span>`;
        } else if (product.is_top) {
            badgeHTML = `<span class="badge badge-top">Top Selling</span>`;
        } else if (totalStock <= 5) {
            badgeHTML = `<span class="badge badge-low-stock">Low Stock</span>`;
        }

        // Dynamic Image box (HTML or custom placeholder SVG)
        let imgBlockHTML = '';
        if (product.image_url && product.image_url.trim() !== '') {
            imgBlockHTML = `<img src="${product.image_url.replace(/"/g, '&quot;')}" alt="${product.name}" onerror="handleImageError(this, '${product.name.replace(/'/g, "\\'")}')">`;
        } else {
            imgBlockHTML = `
        <div class="img-placeholder-card">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <span>${product.name}</span>
        </div>
      `;
        }

        // Determine current price representation HTML
        let priceHTML = '';
        if (hasDiscount) {
            priceHTML = `
        <span class="price-discounted">$${salePrice.toFixed(2)}</span>
        <span class="price-original">$${originPrice.toFixed(2)}</span>
      `;
        } else {
            priceHTML = `<span class="price-current">$${originPrice.toFixed(2)}</span>`;
        }

        // Size stocks indicators
        // If selected check specific stock
        let stockNoticeText = '';
        if (selectedSize) {
            const count = selectedSize === 'S' ? sStock : selectedSize === 'M' ? mStock : lStock;
            if (count === 0) {
                stockNoticeText = 'Selected size is out of stock!';
            } else if (count <= 3) {
                stockNoticeText = `Only ${count} left in ${selectedSize}!`;
            }
        }

        card.innerHTML = `
      <div class="product-img-box">
        ${badgeHTML}
        ${imgBlockHTML}
      </div>
      <div class="product-info">
        <div class="product-meta">
          <span class="product-cat">${product.category}</span>
        </div>
        <h3 class="product-name">${product.name}</h3>
        <p class="product-desc">${product.description || 'No description provided.'}</p>
        
        <div class="product-price-row">
          ${priceHTML}
        </div>

        <div class="size-selector-wrap">
          <div class="selector-title">
            <span>Select Size</span>
            <span style="color: var(--danger); font-size:0.7rem; font-weight:600;" id="stock-notice-${product.id}">${stockNoticeText}</span>
          </div>
          <div class="size-pills">
            <button class="size-pill ${selectedSize === 'S' ? 'active' : ''}" ${sStock === 0 ? 'disabled' : ''} data-id="${product.id}" data-size="S" title="${sStock} items in stock">S</button>
            <button class="size-pill ${selectedSize === 'M' ? 'active' : ''}" ${mStock === 0 ? 'disabled' : ''} data-id="${product.id}" data-size="M" title="${mStock} items in stock">M</button>
            <button class="size-pill ${selectedSize === 'L' ? 'active' : ''}" ${lStock === 0 ? 'disabled' : ''} data-id="${product.id}" data-size="L" title="${lStock} items in stock">L</button>
          </div>
        </div>

        <button class="add-cart-btn" id="add-btn-${product.id}" ${totalStock === 0 ? 'disabled' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          <span>${totalStock === 0 ? 'Sold Out' : 'Add to Bag'}</span>
        </button>
      </div>
    `;

        // Hook listeners for size pills selection
        card.querySelectorAll('.size-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                const prodId = e.target.dataset.id;
                const sizeVal = e.target.dataset.size;

                // Toggle active selection
                state.selectedSizes[prodId] = sizeVal;

                // Trigger small re-render check to adjust highlight pills and warnings
                const pills = card.querySelectorAll('.size-pill');
                pills.forEach(p => p.classList.remove('active'));
                e.target.classList.add('active');

                // Dynamic Stock notice warning on card
                const noticeEl = card.querySelector(`#stock-notice-${prodId}`);
                const count = sizeVal === 'S' ? sStock : sizeVal === 'M' ? mStock : lStock;
                if (count <= 3 && count > 0) {
                    noticeEl.textContent = `Only ${count} left in ${sizeVal}!`;
                } else {
                    noticeEl.textContent = '';
                }
            });
        });

        // Add to cart click
        card.querySelector('.add-cart-btn').addEventListener('click', () => {
            const selectedSize = state.selectedSizes[product.id];
            if (!selectedSize) {
                showAlert('error', 'Select Size', 'Please choose a size (S, M, or L) before adding to your bag.');
                return;
            }
            addToCart(product, selectedSize);
        });

        elements.productsGrid.appendChild(card);
    });
}

// Fallback error renderer if URL image fails to load
function handleImageError(imgNode, fallbackName) {
    const container = imgNode.parentNode;
    if (container) {
        container.innerHTML = `
      <div class="img-placeholder-card">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/></svg>
        <span>${fallbackName}</span>
      </div>
    `;
    }
}

// Add item to shopping cart state
function addToCart(product, size) {
    // Validate stock level again
    const sizeStockKey = `stock_${size.toLowerCase()}`;
    const maxAvailable = parseInt(product[sizeStockKey]) || 0;

    // Check if item of same ID and size exists in cart
    const cartIndex = state.cart.findIndex(i => i.id === product.id && i.size === size);
    const currentInCartQty = cartIndex !== -1 ? state.cart[cartIndex].quantity : 0;

    if (currentInCartQty + 1 > maxAvailable) {
        showAlert('error', 'Stock Limit', `Sorry, you cannot add more. Only ${maxAvailable} remaining for size ${size}.`);
        return;
    }

    const price = parseFloat(product.sale_price) > 0 ? parseFloat(product.sale_price) : parseFloat(product.price);

    if (cartIndex !== -1) {
        state.cart[cartIndex].quantity += 1;
    } else {
        state.cart.push({
            id: product.id,
            name: product.name,
            size: size,
            quantity: 1,
            price: price,
            image: product.image_url
        });
    }

    saveCartToStorage();
    updateCartUI();

    // Clean size selection after adding to cart
    delete state.selectedSizes[product.id];

    // Re-render grid to clear styles
    renderProducts();

    // Slide open shopping drawer to give immediate feedback
    openCart();
}

// Cart UI and updates
function updateCartUI() {
    // Update cart count bubble
    const totalItemCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    elements.cartCountBubble.textContent = totalItemCount;

    // Render list inside drawer
    elements.cartItemsContainer.innerHTML = '';

    if (state.cart.length === 0) {
        elements.cartItemsContainer.innerHTML = `
      <div class="empty-cart-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
        <p>Your shopping bag is completely empty</p>
      </div>
    `;
        elements.toCheckoutBtn.disabled = true;
        updateSubtotals(0);
        return;
    }

    elements.toCheckoutBtn.disabled = false;
    let runningSubtotal = 0;

    state.cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        runningSubtotal += itemTotal;

        // Find item catalog detail for stock parameters boundary verification
        const catalogItem = state.products.find(p => p.id === item.id);
        const sizeStockKey = `stock_${item.size.toLowerCase()}`;
        const maxAvailable = catalogItem ? parseInt(catalogItem[sizeStockKey]) : 99;

        const cartEl = document.createElement('div');
        cartEl.className = 'cart-item';

        let imgHTML = '';
        if (item.image && item.image.trim() !== '') {
            imgHTML = `<img src="${item.image}" alt="${item.name}" class="cart-item-img">`;
        } else {
            imgHTML = `
        <div class="cart-item-img-placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        </div>
      `;
        }

        cartEl.innerHTML = `
      ${imgHTML}
      <div class="cart-item-details">
        <span class="cart-item-name">${item.name}</span>
        <span class="cart-item-meta">Size: ${item.size} • $${item.price.toFixed(2)}</span>
        
        <div class="cart-item-qty-row">
          <div class="qty-selector">
            <button class="qty-btn dec-qty" data-id="${item.id}" data-size="${item.size}">-</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn inc-qty" data-id="${item.id}" data-size="${item.size}" ${item.quantity >= maxAvailable ? 'disabled' : ''}>+</button>
          </div>
          <span class="cart-item-price">$${itemTotal.toFixed(2)}</span>
          <button class="cart-item-delete" data-id="${item.id}" data-size="${item.size}" title="Remove from bag">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;

        // Hook list buttons actions
        cartEl.querySelector('.dec-qty').addEventListener('click', () => updateQty(item.id, item.size, -1));
        cartEl.querySelector('.inc-qty').addEventListener('click', () => updateQty(item.id, item.size, 1));
        cartEl.querySelector('.cart-item-delete').addEventListener('click', () => removeCartItem(item.id, item.size));

        elements.cartItemsContainer.appendChild(cartEl);
    });

    updateSubtotals(runningSubtotal);
}

function updateSubtotals(sub) {
    const formattedSub = `$${sub.toFixed(2)}`;
    elements.cartSubtotal.textContent = formattedSub;
    elements.checkoutSubtotal.textContent = formattedSub;
}

// Update Cart Quantity levels
function updateQty(id, size, change) {
    const index = state.cart.findIndex(i => i.id === id && i.size === size);
    if (index === -1) return;

    const catalogItem = state.products.find(p => p.id === id);
    const sizeStockKey = `stock_${size.toLowerCase()}`;
    const maxAvailable = catalogItem ? parseInt(catalogItem[sizeStockKey]) : 99;

    const newQty = state.cart[index].quantity + change;
    if (newQty <= 0) {
        state.cart = state.cart.filter(i => !(i.id === id && i.size === size));
    } else if (newQty > maxAvailable) {
        showAlert('error', 'Inventory Limit', `Sorry, you cannot order more. Limit for size ${size} is ${maxAvailable}.`);
        return;
    } else {
        state.cart[index].quantity = newQty;
    }

    saveCartToStorage();
    updateCartUI();
    renderProducts(); // Update size pills disabling state
}

// Remove item completely
function removeCartItem(id, size) {
    state.cart = state.cart.filter(i => !(i.id === id && i.size === size));
    saveCartToStorage();
    updateCartUI();
    renderProducts();
}

// Storage triggers
function saveCartToStorage() {
    localStorage.setItem('boutique_cart', JSON.stringify(state.cart));
}

function loadCartFromStorage() {
    const saved = localStorage.getItem('boutique_cart');
    if (saved) {
        try {
            state.cart = JSON.parse(saved);
            updateCartUI();
        } catch (ex) {
            state.cart = [];
        }
    }
}

// Cart Drawer Slider Toggles
function openCart() {
    elements.cartDrawer.classList.add('active');
    elements.cartOverlayBg.classList.add('active');
    document.body.style.overflow = 'hidden'; // Stop page scrolling
}

function closeCart() {
    elements.cartDrawer.classList.remove('active');
    elements.cartOverlayBg.classList.remove('active');
    document.body.style.overflow = 'auto'; // Resume page scrolling

    // Reset back to main cart view when drawers close
    setTimeout(() => {
        elements.cartCheckoutView.style.display = 'none';
        elements.cartCheckoutView.classList.remove('active');
        elements.cartIndexView.style.display = 'flex';
        elements.checkoutForm.reset();
    }, 400);
}

// Checkout form submission handler
async function handleCheckout(e) {
    e.preventDefault();

    // Validate cart is full
    if (state.cart.length === 0) {
        showAlert('error', 'Checkout Fail', 'Your cart is empty.');
        return;
    }

    // Load inputs
    const nameVal = document.getElementById('custName').value.trim();
    const phoneVal = document.getElementById('custPhone').value.trim();
    const addressVal = document.getElementById('custAddress').value.trim();

    if (!nameVal || !phoneVal || !addressVal) {
        showAlert('error', 'Missing inputs', 'Please enter your Name, Phone, and Address details.');
        return;
    }

    // Lock action button
    elements.submitOrderBtn.disabled = true;
    elements.submitOrderBtn.innerHTML = '<span class="spinner"></span> Place Order';

    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const orderTotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const orderPayload = {
        order_id: orderId,
        date: new Date().toLocaleString(),
        name: nameVal,
        phone: phoneVal,
        address: addressVal,
        items: state.cart.map(item => ({
            id: item.id,
            name: item.name,
            size: item.size,
            quantity: item.quantity,
            price: item.price
        })),
        total: orderTotal,
        status: 'Pending'
    };

    try {
        const result = await CONFIG.postDbAction({
            action: 'placeOrder',
            order: orderPayload
        });

        if (result.success) {
            // Clear local storefront cart state
            state.cart = [];
            saveCartToStorage();
            updateCartUI();

            closeCart();

            // Show Custom Success Confirmation Modal
            showAlert('success', 'Order Placed!', `Thank you for shopping with us, ${nameVal}. Your order ID is <strong>${orderId}</strong>. Stock has been deducted.`);

            // Reload products list again to reflect updated sheet stock
            fetchProductsAndRender();
        } else {
            showAlert('error', 'Checkout Error', result.message || 'We could not complete your order. Try again.');
        }
    } catch (error) {
        console.error("Order submission critical error:", error);
        showAlert('error', 'Connection Error', 'Failed to communicate with Google Sheet. Try again later.');
    } finally {
        // Release place button lock
        elements.submitOrderBtn.disabled = false;
        elements.submitOrderBtn.innerHTML = 'Place Order';
    }
}

// Alert Notification Dialogue engine
function showAlert(type, title, message) {
    // Set Icon
    elements.alertIcon.className = 'alert-icon';
    if (type === 'success') {
        elements.alertIcon.classList.add('alert-icon-success');
        elements.alertIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    `;
    } else {
        elements.alertIcon.classList.add('alert-icon-error');
        elements.alertIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    `;
    }

    elements.alertTitle.textContent = title;
    elements.alertMsg.innerHTML = message;
    elements.alertOverlay.classList.add('active');
}
