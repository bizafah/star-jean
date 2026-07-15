// Star-Jean Storefront Core Logic

const DELIVERY_CHARGES = 350;

// App State
const state = {
    products: [],
    cart: [],
    selectedSizes: {},
    currentFilter: 'all'
};

const DELIVERY_CHARGES = 350;

// DOM References
const elements = {
    pageLoader: document.getElementById('pageLoader'),
    demoBanner: document.getElementById('demoBanner'),
    productsGrid: document.getElementById('productsGrid'),
    topSellingGrid: document.getElementById('topSellingGrid'),
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
    alertOverlay: document.getElementById('alertModalOverlay'),
    alertIcon: document.getElementById('alertModalIcon'),
    alertTitle: document.getElementById('alertModalTitle'),
    alertMsg: document.getElementById('alertModalMsg'),
    alertCloseBtn: document.getElementById('alertModalCloseBtn')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadCartFromStorage();
    fetchProductsAndRender();

    if (!CONFIG.API_URL) {
        elements.demoBanner.style.display = 'flex';
    }

    // Hero slideshow - changes every 1 second
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length > 0) {
        let currentSlide = 0;
        setInterval(() => {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 1600);
    }
});

function setupEventListeners() {
    elements.openCartBtn.addEventListener('click', openCart);
    elements.closeCartBtn.addEventListener('click', closeCart);
    elements.cartOverlayBg.addEventListener('click', closeCart);

    elements.filterTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            elements.filterTabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            state.currentFilter = e.target.dataset.filter;
            renderProducts();
        });
    });

    // Smooth scroll nav
    document.querySelectorAll('nav ul li a, .logo').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                    document.querySelectorAll('nav ul li a').forEach(l => l.classList.remove('active'));
                    if (link.tagName === 'A' && link.closest('nav')) link.classList.add('active');
                }
            }
        });
    });

    // Category cards click
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const cat = card.getAttribute('data-cat');
            elements.filterTabs.forEach(t => {
                if (t.dataset.filter === cat) t.click();
            });
            document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
        });
    });

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

    elements.checkoutForm.addEventListener('submit', handleCheckout);
    elements.alertCloseBtn.addEventListener('click', () => {
        elements.alertOverlay.classList.remove('active');
    });
}

// Fetch products
async function fetchProductsAndRender() {
    try {
        const data = await CONFIG.getDbData();
        state.products = data.products || [];
        renderProducts();
    } catch (error) {
        console.error("Error loading products:", error);
        showAlert('error', 'Error', 'Could not load products.');
    } finally {
        elements.pageLoader.classList.add('hidden');
    }
}

// Timeout fallback to hide loader if fetch hangs
setTimeout(() => {
    const loader = document.getElementById('pageLoader');
    if (loader && !loader.classList.contains('hidden')) {
        loader.classList.add('hidden');
    }
}, 8000);

// Create product card HTML
function createProductCardHTML(product) {
    const sStock = parseInt(product.stock_s) || 0;
    const mStock = parseInt(product.stock_m) || 0;
    const lStock = parseInt(product.stock_l) || 0;
    const totalStock = sStock + mStock + lStock;
    const originPrice = parseFloat(product.price) || 0;
    const salePrice = parseFloat(product.sale_price) || 0;
    const hasDiscount = salePrice > 0 && salePrice < originPrice;
    let selectedSize = state.selectedSizes[product.id] || '';

    // Badge
    let badgeHTML = '';
    if (totalStock === 0) badgeHTML = `<span class="badge badge-empty">Sold Out</span>`;
    else if (hasDiscount) {
        const pct = Math.round(((originPrice - salePrice) / originPrice) * 100);
        badgeHTML = `<span class="badge badge-sale">-${pct}% OFF</span>`;
    } else if (product.is_top === true || String(product.is_top).toLowerCase() === 'true') {
        badgeHTML = `<span class="badge badge-top">Top Selling</span>`;
    } else if (totalStock <= 5) badgeHTML = `<span class="badge badge-low-stock">Low Stock</span>`;

// Image - use first image from images array or fallback to image_url
    let primaryImage = '';
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        primaryImage = product.images[0];
    } else if (product.image_url && product.image_url.trim() !== '') {
        primaryImage = product.image_url;
    }
    
    let imgHTML = '';
    if (primaryImage) {
        imgHTML = `<img src="${primaryImage.replace(/"/g, '"')}" alt="${product.name}" onerror="handleImageError(this, '${product.name.replace(/'/g, "\\'")}')">`;
    } else {
        imgHTML = `<div class="img-placeholder-card"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg><span>${product.name}</span></div>`;
    }

    // Price
    let priceHTML = hasDiscount
        ? `<span class="price-discounted">RS ${salePrice.toFixed(0)}</span><span class="price-original">RS ${originPrice.toFixed(0)}</span>`
        : `<span class="price-current">RS ${originPrice.toFixed(0)}</span>`;

    // Stock indicator
    let stockHTML = '';
    if (totalStock === 0) stockHTML = `<span class="stock-indicator stock-out">Out of Stock</span>`;
    else if (totalStock <= 5) stockHTML = `<span class="stock-indicator stock-low">Only ${totalStock} left!</span>`;
    else stockHTML = `<span class="stock-indicator stock-in">${totalStock} in Stock</span>`;

    // Color dots
    let colorsHTML = '';
    if (product.colors && product.colors.trim() !== '') {
        const colorsList = product.colors.split(',').map(c => c.trim()).filter(c => c);
        if (colorsList.length > 0) {
            colorsHTML = `<div class="color-dots">`;
            colorsList.forEach(color => {
                colorsHTML += `<span class="color-dot" style="background-color: ${color};" title="${color}"></span>`;
            });
            colorsHTML += `</div>`;
        }
    }

    // Size stock notice
    let stockNotice = '';
    if (selectedSize) {
        const count = selectedSize === 'S' ? sStock : selectedSize === 'M' ? mStock : lStock;
        if (count === 0) stockNotice = 'Out of stock in this size!';
        else if (count <= 3) stockNotice = `Only ${count} left in ${selectedSize}!`;
    }

    return `
      <div class="product-img-box">${badgeHTML}${imgHTML}</div>
      <div class="product-info">
        <div class="product-meta"><span class="product-cat">${product.category}</span></div>
        <h3 class="product-name">${product.name}</h3>
        <p class="product-desc">${product.description || 'Premium quality product.'}</p>
        <div class="product-price-row">${priceHTML}</div>
        ${stockHTML}
        ${colorsHTML}
        <div class="size-selector-wrap">
          <div class="selector-title">
            <span>Select Size</span>
            <span style="color: var(--danger); font-size:0.7rem; font-weight:600;" id="stock-notice-${product.id}">${stockNotice}</span>
          </div>
          <div class="size-pills">
            <button class="size-pill ${selectedSize === 'S' ? 'active' : ''}" ${sStock === 0 ? 'disabled' : ''} data-id="${product.id}" data-size="S" title="${sStock} in stock">S</button>
            <button class="size-pill ${selectedSize === 'M' ? 'active' : ''}" ${mStock === 0 ? 'disabled' : ''} data-id="${product.id}" data-size="M" title="${mStock} in stock">M</button>
            <button class="size-pill ${selectedSize === 'L' ? 'active' : ''}" ${lStock === 0 ? 'disabled' : ''} data-id="${product.id}" data-size="L" title="${lStock} in stock">L</button>
          </div>
        </div>
        <button class="add-cart-btn" id="add-btn-${product.id}" ${totalStock === 0 ? 'disabled' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          <span>${totalStock === 0 ? 'Sold Out' : 'Add to Bag'}</span>
        </button>
      </div>
    `;
}

function attachCardEvents(card, product) {
    const sStock = parseInt(product.stock_s) || 0;
    const mStock = parseInt(product.stock_m) || 0;
    const lStock = parseInt(product.stock_l) || 0;

    card.querySelectorAll('.size-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            e.stopPropagation();
            const prodId = e.target.dataset.id;
            const sizeVal = e.target.dataset.size;
            state.selectedSizes[prodId] = sizeVal;
            card.querySelectorAll('.size-pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            const noticeEl = card.querySelector(`#stock-notice-${prodId}`);
            const count = sizeVal === 'S' ? sStock : sizeVal === 'M' ? mStock : lStock;
            if (count <= 3 && count > 0) noticeEl.textContent = `Only ${count} left in ${sizeVal}!`;
            else noticeEl.textContent = '';
        });
    });

    const addBtn = card.querySelector('.add-cart-btn');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const selectedSize = state.selectedSizes[product.id];
            if (!selectedSize) {
                showAlert('error', 'Select Size', 'Please choose a size before adding to bag.');
                return;
            }
            addToCart(product, selectedSize);
        });
    }

    // Click card to go to product detail page
    card.addEventListener('click', () => {
        window.location.href = `product.html?id=${product.id}`;
    });
}

// Render products
function renderProducts() {
    // Top Selling Grid
    if (elements.topSellingGrid) {
        elements.topSellingGrid.innerHTML = '';
        const topProducts = state.products.filter(p => p.is_top === true || String(p.is_top).toLowerCase() === 'true');
        if (topProducts.length === 0) {
            elements.topSellingGrid.innerHTML = `<div class="empty-catalog" style="grid-column:1/-1;padding:40px;"><p style="color:var(--text-secondary)">No featured products yet.</p></div>`;
        } else {
            topProducts.forEach(product => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = createProductCardHTML(product);
                attachCardEvents(card, product);
                elements.topSellingGrid.appendChild(card);
            });
        }
    }

    // Collection Grid
    if (elements.productsGrid) {
        elements.productsGrid.innerHTML = '';
        let filtered = [...state.products];
        if (state.currentFilter !== 'all') {
            filtered = filtered.filter(p => String(p.category).toLowerCase() === state.currentFilter);
        }
        if (filtered.length === 0) {
            elements.productsGrid.innerHTML = `<div class="empty-catalog"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg><h3>No Products Available</h3><p>No products in this collection yet.</p></div>`;
            return;
        }
        filtered.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = createProductCardHTML(product);
            attachCardEvents(card, product);
            elements.productsGrid.appendChild(card);
        });
    }
}

// Image error fallback
function handleImageError(imgNode, fallbackName) {
    const container = imgNode.parentNode;
    if (container) {
        container.innerHTML = `<div class="img-placeholder-card"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/></svg><span>${fallbackName || 'Product'}</span></div>`;
    }
}

// ===== CART LOGIC =====
function addToCart(product, size) {
    const existingItem = state.cart.find(i => i.id === product.id && i.size === size);
    const sizeStockKey = `stock_${size.toLowerCase()}`;
    const maxStock = parseInt(product[sizeStockKey]) || 0;

    if (existingItem) {
        if (existingItem.quantity >= maxStock) {
            showAlert('error', 'Stock Limit', `Maximum available stock for size ${size} reached.`);
            return;
        }
        existingItem.quantity++;
    } else {
        if (maxStock <= 0) {
            showAlert('error', 'Out of Stock', `Size ${size} is out of stock.`);
            return;
        }
        state.cart.push({
            id: product.id,
            name: product.name,
            price: parseFloat(product.sale_price) > 0 && parseFloat(product.sale_price) < parseFloat(product.price) ? parseFloat(product.sale_price) : parseFloat(product.price),
            image_url: product.image_url || '',
            size: size,
            quantity: 1,
            maxStock: maxStock
        });
    }

    saveCartToStorage();
    renderCart();
    openCart();
    showAlert('success', 'Added to Bag', `${product.name} (${size}) has been added to your shopping bag.`);
}

function removeFromCart(index) {
    state.cart.splice(index, 1);
    saveCartToStorage();
    renderCart();
}

function updateCartQuantity(index, newQty) {
    if (newQty <= 0) { removeFromCart(index); return; }
    if (newQty > state.cart[index].maxStock) {
        showAlert('error', 'Stock Limit', 'Cannot exceed available stock.');
        return;
    }
    state.cart[index].quantity = newQty;
    saveCartToStorage();
    renderCart();
}

function renderCart() {
    elements.cartItemsContainer.innerHTML = '';
    elements.cartCountBubble.textContent = state.cart.reduce((sum, item) => sum + item.quantity, 0);

    if (state.cart.length === 0) {
        elements.cartItemsContainer.innerHTML = `<div class="empty-cart-state"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg><p>Your bag is empty</p></div>`;
        elements.toCheckoutBtn.disabled = true;
        elements.cartSubtotal.textContent = 'RS 0';
        elements.checkoutSubtotal.textContent = 'RS 0';
        return;
    }

    let subtotal = 0;
    state.cart.forEach((item, index) => {
        subtotal += item.price * item.quantity;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';

        let imgHTML = item.image_url
            ? `<img src="${item.image_url}" class="cart-item-img" alt="${item.name}" onerror="this.style.display='none'">`
            : `<div class="cart-item-img-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/></svg></div>`;

        itemDiv.innerHTML = `
            ${imgHTML}
            <div class="cart-item-details">
                <span class="cart-item-name">${item.name}</span>
                <span class="cart-item-meta">Size: ${item.size} | RS ${item.price.toFixed(0)} each</span>
                <div class="cart-item-qty-row">
                    <div class="qty-selector">
                        <button class="qty-btn qty-minus" ${item.quantity <= 1 ? 'disabled' : ''}>−</button>
                        <span class="qty-val">${item.quantity}</span>
                        <button class="qty-btn qty-plus" ${item.quantity >= item.maxStock ? 'disabled' : ''}>+</button>
                    </div>
                    <span class="cart-item-price">RS ${(item.price * item.quantity).toFixed(0)}</span>
                    <button class="cart-item-delete" title="Remove item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        `;

        itemDiv.querySelector('.qty-minus').addEventListener('click', () => updateCartQuantity(index, item.quantity - 1));
        itemDiv.querySelector('.qty-plus').addEventListener('click', () => updateCartQuantity(index, item.quantity + 1));
        itemDiv.querySelector('.cart-item-delete').addEventListener('click', () => removeFromCart(index));
        elements.cartItemsContainer.appendChild(itemDiv);
    });

    const total = subtotal + DELIVERY_CHARGES;
    elements.cartSubtotal.textContent = `RS ${subtotal.toFixed(0)}`;
    elements.checkoutSubtotal.textContent = `RS ${total.toFixed(0)}`;
    
    // Update cart footer with delivery charges
    const cartFooter = document.querySelector('.cart-footer');
    if (cartFooter && !document.getElementById('cartDeliveryRow')) {
        const deliveryRow = document.createElement('div');
        deliveryRow.id = 'cartDeliveryRow';
        deliveryRow.className = 'cart-subtotal-row';
        deliveryRow.style.marginBottom = '8px';
        deliveryRow.innerHTML = `
            <span class="subtotal-label">Delivery Charges</span>
            <span class="subtotal-val">RS ${DELIVERY_CHARGES}</span>
        `;
        cartFooter.insertBefore(deliveryRow, cartFooter.querySelector('.checkout-btn'));
    }
    
    elements.toCheckoutBtn.disabled = false;
}

function openCart() { elements.cartDrawer.classList.add('active'); elements.cartOverlayBg.classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeCart() { elements.cartDrawer.classList.remove('active'); elements.cartOverlayBg.classList.remove('active'); document.body.style.overflow = ''; }

// Checkout
async function handleCheckout(e) {
    e.preventDefault();
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    if (!name || !phone || !address) { showAlert('error', 'Missing Info', 'Please fill all fields.'); return; }

    const subtotal = state.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const total = subtotal + DELIVERY_CHARGES;
    const orderPayload = {
        action: 'placeOrder',
        order: {
            order_id: 'ORD-' + Date.now(),
            date: new Date().toLocaleString(),
            name: name,
            phone: phone,
            address: address,
            items: state.cart.map(i => {
                const baseSize = i.size.split(' ')[0];
                return {
                    id: i.id,
                    name: i.name,
                    size: baseSize,
                    quantity: i.quantity,
                    price: i.price,
                    selected_size: i.size
                };
            }),
            total: total,
            subtotal: subtotal,
            delivery_charges: DELIVERY_CHARGES,
            status: 'Pending'
        }
    };

    elements.submitOrderBtn.disabled = true;
    elements.submitOrderBtn.innerHTML = '<span class="spinner"></span> Processing...';

    try {
        const result = await CONFIG.postDbAction(orderPayload);
        if (result.success) {
            showAlert('success', 'Order Placed!', 'Thank you! Your order has been received.');
            state.cart = [];
            saveCartToStorage();
            renderCart();
            elements.checkoutForm.reset();
            elements.cartCheckoutView.style.display = 'none';
            elements.cartCheckoutView.classList.remove('active');
            elements.cartIndexView.style.display = 'flex';
            closeCart();
        } else {
            showAlert('error', 'Order Failed', result.message || 'Could not process order.');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showAlert('error', 'Network Error', 'Order submission failed.');
    } finally {
        elements.submitOrderBtn.disabled = false;
        elements.submitOrderBtn.innerHTML = '<span>Place Order</span>';
    }
}

// Storage
function saveCartToStorage() { localStorage.setItem('starjean_cart', JSON.stringify(state.cart)); }
function loadCartFromStorage() {
    const saved = localStorage.getItem('starjean_cart');
    if (saved) { state.cart = JSON.parse(saved); renderCart(); }
}

// Alert
function showAlert(type, title, message) {
    const iconHTML = type === 'success'
        ? `<div class="alert-icon alert-icon-success"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>`
        : `<div class="alert-icon alert-icon-error"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>`;

    elements.alertIcon.innerHTML = iconHTML;
    elements.alertTitle.textContent = title;
    elements.alertMsg.textContent = message;
    elements.alertOverlay.classList.add('active');
}
