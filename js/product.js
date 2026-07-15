// Star-Jean Product Detail Page Logic

const DELIVERY_CHARGES = 350;

const state = {
    product: null,
    cart: [],
    selectedSize: '',
    selectedColor: ''
};

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL'];

// DOM References
const elements = {
    detailGrid: document.getElementById('detailGrid'),
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

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadCartFromStorage();
    fetchProductDetails();
});

function setupEventListeners() {
    elements.openCartBtn.addEventListener('click', openCart);
    elements.closeCartBtn.addEventListener('click', closeCart);
    elements.cartOverlayBg.addEventListener('click', closeCart);

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

// Extract product ID from URL query parameters and fetch details
async function fetchProductDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const prodId = urlParams.get('id');

    if (!prodId) {
        renderErrorState("No product ID specified in path.");
        return;
    }

    try {
        const data = await CONFIG.getDbData();
        const productList = data.products || [];
        const found = productList.find(p => String(p.id) === String(prodId));

        if (!found) {
            renderErrorState("Requested product was not found in catalog database.");
        } else {
            state.product = found;
            renderProductDetails();
        }
    } catch (error) {
        console.error("Error loading product details:", error);
        renderErrorState("Could not communicate with store database.");
    }
}

// Render dynamic details grid
function renderProductDetails() {
    const p = state.product;
    const xsStock = parseInt(p.stock_xs) || 0;
    const sStock = parseInt(p.stock_s) || 0;
    const mStock = parseInt(p.stock_m) || 0;
    const lStock = parseInt(p.stock_l) || 0;
    const xlStock = parseInt(p.stock_xl) || 0;
    const totalStock = xsStock + sStock + mStock + lStock + xlStock;

    const originPrice = parseFloat(p.price) || 0;
    const salePrice = parseFloat(p.sale_price) || 0;
    const hasDiscount = salePrice > 0 && salePrice < originPrice;

    // Price markup
    let priceHTML = hasDiscount
        ? `<span class="detail-price-discounted">RS ${salePrice.toFixed(0)}</span><span class="detail-price-original">RS ${originPrice.toFixed(0)}</span>`
        : `<span class="detail-price-current">RS ${originPrice.toFixed(0)}</span>`;

    // Colors mapping
    let colorsHTML = '';
    if (p.colors && p.colors.trim() !== '') {
        const colorsList = p.colors.split(',').map(c => c.trim()).filter(c => c);
        if (colorsList.length > 0) {
            colorsHTML = `
                <div class="selector-group">
                    <div class="selector-header"><span>Select Color</span><span id="selectedColorName" style="color:var(--text-primary); text-transform:none;">None selected</span></div>
                    <div class="color-selector">
            `;
            colorsList.forEach((color, index) => {
                colorsHTML += `<span class="color-option" style="background-color: ${color};" data-color="${color}" title="${color}"></span>`;
            });
            colorsHTML += `
                    </div>
                </div>
            `;
        }
    }

// Image block selector - support multiple images gallery
    let pImg = '';
    let thumbnailsHTML = '';
    
    // Get all images - from images array or fallback to image_url
    let allImages = [];
    if (p.images && Array.isArray(p.images) && p.images.length > 0) {
        allImages = p.images;
    } else if (p.image_url && p.image_url.trim() !== '') {
        allImages = [p.image_url];
    }
    
    if (allImages.length > 0) {
        // Main image
        const mainImg = allImages[0];
        pImg = `<img id="mainProductImg" src="${mainImg.replace(/"/g, '"')}" alt="${p.name}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80';">`;
        
        // Thumbnails if more than 1 image
        if (allImages.length > 1) {
            thumbnailsHTML = `
                <div class="detail-thumbnails" style="display:flex; gap:8px; margin-top:12px; overflow-x:auto;">
                    ${allImages.map((img, idx) => `
                        <button class="thumb-btn ${idx === 0 ? 'active' : ''}" data-index="${idx}" 
                            style="flex-shrink:0; width:60px; height:75px; border:2px solid ${idx === 0 ? '#111827' : 'var(--border)'}; border-radius:6px; overflow:hidden; cursor:pointer; padding:0; background:none;"
                            title="View image ${idx + 1}">
                            <img src="${img.replace(/"/g, '"')}" alt="${p.name} ${idx + 1}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none';">
                        </button>
                    `).join('')}
                </div>
            `;
        }
    } else {
        pImg = `<div class="img-placeholder-card" style="height:100%"><svg style="width:64px;height:64px;margin-bottom:12px;opacity:0.6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>`;
    }

    elements.detailGrid.innerHTML = `
        <div class="detail-img-box">${pImg}${thumbnailsHTML}</div>
        <div class="detail-info">
            <span class="detail-cat">${p.category}</span>
            <h2 class="detail-name">${p.name}</h2>
            
            <div class="detail-price-row">${priceHTML}</div>
            
            <p class="detail-desc">${p.description || 'No description provided.'}</p>

            ${colorsHTML}

            <div class="selector-group">
                <div class="selector-header">
                    <span>Select Size</span>
                    <span id="detailStockNotice" style="color:var(--danger); font-weight:600;"></span>
                </div>
                <div class="detail-size-pills">
                    <button class="detail-size-pill" ${xsStock === 0 ? 'disabled' : ''} data-size="XS">XS</button>
                    <button class="detail-size-pill" ${sStock === 0 ? 'disabled' : ''} data-size="S">S</button>
                    <button class="detail-size-pill" ${mStock === 0 ? 'disabled' : ''} data-size="M">M</button>
                    <button class="detail-size-pill" ${lStock === 0 ? 'disabled' : ''} data-size="L">L</button>
                    <button class="detail-size-pill" ${xlStock === 0 ? 'disabled' : ''} data-size="XL">XL</button>
                </div>
            </div>

            <div class="stock-level-tags">
                <span class="stock-tag">XS Stock: <strong>${xsStock}</strong></span>
                <span class="stock-tag">S Stock: <strong>${sStock}</strong></span>
                <span class="stock-tag">M Stock: <strong>${mStock}</strong></span>
                <span class="stock-tag">L Stock: <strong>${lStock}</strong></span>
                <span class="stock-tag">XL Stock: <strong>${xlStock}</strong></span>
            </div>

            <div class="action-row">
                <button class="add-cart-btn detail-add-btn" id="detailAddBtn" ${totalStock === 0 ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                    <span>${totalStock === 0 ? 'Sold Out' : 'Add to Shopping Bag'}</span>
                </button>
            </div>
        </div>
    `;

    // Hook Color Options click
    const colorOpts = elements.detailGrid.querySelectorAll('.color-option');
    colorOpts.forEach(opt => {
        opt.addEventListener('click', () => {
            colorOpts.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            state.selectedColor = opt.dataset.color;
            const nameLabel = document.getElementById('selectedColorName');
            if (nameLabel) nameLabel.textContent = opt.dataset.color;
        });
    });

    // Default select first color if variants exist
    if (colorOpts.length > 0) {
        colorOpts[0].click();
    }

    // Hook thumbnail click for image gallery
    const thumbBtns = elements.detailGrid.querySelectorAll('.thumb-btn');
    const mainImg = elements.detailGrid.querySelector('#mainProductImg');
    if (thumbBtns.length > 0 && mainImg) {
        thumbBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                thumbBtns.forEach(b => b.style.borderColor = 'var(--border)');
                btn.style.borderColor = '#111827';
                const idx = parseInt(btn.dataset.index);
                // Get the image from the clicked thumbnail
                const thumbImg = btn.querySelector('img');
                if (thumbImg && thumbImg.src) {
                    mainImg.src = thumbImg.src;
                }
            });
        });
    }

    // Hook Size pills click
    const sizePills = elements.detailGrid.querySelectorAll('.detail-size-pill');
    sizePills.forEach(pill => {
        pill.addEventListener('click', () => {
            sizePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.selectedSize = pill.dataset.size;

            const stockNoticeEl = document.getElementById('detailStockNotice');
            const stockMap = { XS: xsStock, S: sStock, M: mStock, L: lStock, XL: xlStock };
            const targetStock = stockMap[state.selectedSize] || 0;
            if (targetStock <= 3) {
                stockNoticeEl.textContent = `Only ${targetStock} left in ${state.selectedSize}!`;
            } else {
                stockNoticeEl.textContent = '';
            }
        });
    });

    // Hook Add details click
    elements.detailGrid.querySelector('#detailAddBtn').addEventListener('click', () => {
        if (!state.selectedSize) {
            showAlert('error', 'Select Size', 'Please select a size (XS, S, M, L, or XL) before ordering.');
            return;
        }

        const sizeVal = state.selectedSize;
        const colorVal = state.selectedColor ? ` (${state.selectedColor})` : '';

        // Override size format descriptor to include color representation
        const sizeWithColor = sizeVal + colorVal;

        const stockMap = { XS: xsStock, S: sStock, M: mStock, L: lStock, XL: xlStock };
        const cartItem = {
            id: p.id,
            name: p.name,
            price: hasDiscount ? salePrice : originPrice,
            image_url: p.image_url || '',
            size: sizeWithColor, // Save as combined key
            quantity: 1,
            maxStock: stockMap[sizeVal] || 0
        };

        const existingItem = state.cart.find(i => i.id === cartItem.id && i.size === cartItem.size);
        if (existingItem) {
            if (existingItem.quantity >= cartItem.maxStock) {
                showAlert('error', 'Stock Limit', `Maximum available stock for size ${sizeVal} reached.`);
                return;
            }
            existingItem.quantity++;
        } else {
            state.cart.push(cartItem);
        }

        saveCartToStorage();
        renderCart();
        openCart();
        showAlert('success', 'Added to Bag', `${p.name} has been added to your shopping bag.`);
    });
}

function renderErrorState(msg) {
    elements.detailGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 80px 24px;">
            <svg style="width:48px;height:48px;color:var(--danger);margin-bottom:16px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <h3>Product Retrieval Error</h3>
            <p style="color:var(--text-secondary); margin-top:8px;">${msg}</p>
            <a href="index.html" class="btn" style="margin-top:24px; display:inline-flex; width:auto; background-color:#111827; color:#FFF;">Back to Shop</a>
        </div>
    `;
}

// ===== CART LOGIC (PROD DETAIL COPIED FOR ALIGNMENT) =====
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

function saveCartToStorage() { localStorage.setItem('starjean_cart', JSON.stringify(state.cart)); }
function loadCartFromStorage() {
    const saved = localStorage.getItem('starjean_cart');
    if (saved) { state.cart = JSON.parse(saved); renderCart(); }
}

function showAlert(type, title, message) {
    const iconHTML = type === 'success'
        ? `<div class="alert-icon alert-icon-success"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>`
        : `<div class="alert-icon alert-icon-error"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>`;

    elements.alertIcon.innerHTML = iconHTML;
    elements.alertTitle.textContent = title;
    elements.alertMsg.textContent = message;
    elements.alertOverlay.classList.add('active');
}
