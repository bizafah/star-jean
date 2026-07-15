// Star-Jean Admin Dashboard Controller Logic

// Local State
let products = [];
let orders = [];
let editingProductId = null;
let pendingImages = []; // Array of image URLs/base64 strings

// DOM References
const elements = {
    adminDemoBanner: document.getElementById('adminDemoBanner'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    toastContainer: document.getElementById('toastContainer'),

    // Stats
    statProducts: document.getElementById('statProducts'),
    statOrders: document.getElementById('statOrders'),
    statOutOfStock: document.getElementById('statOutOfStock'),
    statRevenue: document.getElementById('statRevenue'),
    ordersCountNum: document.getElementById('ordersCountNum'),

    // Product Form
    productForm: document.getElementById('productForm'),
    formPanelTitle: document.getElementById('formPanelTitle').querySelector('span'),
    formResetBtn: document.getElementById('formResetBtn'),
    prodId: document.getElementById('prodId'),
    prodImageUrls: document.getElementById('prodImageUrls'),
    prodImageFiles: document.getElementById('prodImageFiles'),
    imagePreviewContainer: document.getElementById('imagePreviewContainer'),
    imagePreviewPlaceholder: document.getElementById('imagePreviewPlaceholder'),
    prodName: document.getElementById('prodName'),
    prodCategory: document.getElementById('prodCategory'),
    prodColors: document.getElementById('prodColors'),
    prodDescription: document.getElementById('prodDescription'),
    prodPrice: document.getElementById('prodPrice'),
    prodSalePrice: document.getElementById('prodSalePrice'),
    prodIsTop: document.getElementById('prodIsTop'),
    stockS: document.getElementById('stockS'),
    stockM: document.getElementById('stockM'),
    stockL: document.getElementById('stockL'),
    submitProductBtn: document.getElementById('submitProductBtn'),

    // Choice Elements
    choiceUrlBtn: document.getElementById('choiceUrlBtn'),
    choiceFileBtn: document.getElementById('choiceFileBtn'),
    urlInputContainer: document.getElementById('urlInputContainer'),
    fileInputContainer: document.getElementById('fileInputContainer'),

    // Security Overlay Elements
    loginOverlay: document.getElementById('loginOverlay'),
    passwordInput: document.getElementById('passwordInput'),
    loginSubmitBtn: document.getElementById('loginSubmitBtn'),
    loginError: document.getElementById('loginError'),

    // Tables
    productsTableBody: document.getElementById('productsTableBody'),
    ordersTableBody: document.getElementById('ordersTableBody')
};

// Initialize Admin
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    setupEventListeners();
    setupImageSourceToggle();
    document.body.style.opacity = '1';

    if (!CONFIG.API_URL) {
        elements.adminDemoBanner.style.display = 'flex';
    }
});

// Authentication System
function checkAuthentication() {
    const isAuthed = sessionStorage.getItem('starjean_auth') === 'true';
    if (isAuthed) {
        elements.loginOverlay.style.display = 'none';
        document.getElementById('dashboardContainer').style.display = 'block';
        fetchAdminData();
    } else {
        elements.loginOverlay.style.display = 'flex';
        document.getElementById('dashboardContainer').style.display = 'none';
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Password authentication trigger handler
    elements.loginSubmitBtn.addEventListener('click', attemptLogin);
    elements.passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') attemptLogin();
    });

    // Tab buttons trigger
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            elements.tabBtns.forEach(b => b.classList.remove('active'));
            elements.tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const paneId = btn.dataset.pane;
            document.getElementById(paneId).classList.add('active');
        });
    });

    // URL preview triggers - multiple URLs
    elements.prodImageUrls.addEventListener('input', updateImagePreviewFromUrls);
    elements.prodImageUrls.addEventListener('change', updateImagePreviewFromUrls);

    // FileReader uploader converter to Base64 - multiple files
    elements.prodImageFiles.addEventListener('change', handleFileSelectorUploader);

    // Form Reset Button
    elements.formResetBtn.addEventListener('click', resetForm);

    // Saving and updating product elements
    elements.productForm.addEventListener('submit', handleProductSave);
}

// Image Choice selector views toggle handler
function setupImageSourceToggle() {
    elements.choiceUrlBtn.addEventListener('click', () => {
        elements.choiceUrlBtn.classList.add('active');
        elements.choiceFileBtn.classList.remove('active');
        elements.urlInputContainer.style.display = 'block';
        elements.fileInputContainer.style.display = 'none';
    });

    elements.choiceFileBtn.addEventListener('click', () => {
        elements.choiceFileBtn.classList.add('active');
        elements.choiceUrlBtn.classList.remove('active');
        elements.fileInputContainer.style.display = 'block';
        elements.urlInputContainer.style.display = 'none';
    });
}

// Attempt login matching password to star-jean123
function attemptLogin() {
    const entered = elements.passwordInput.value.trim();
    if (entered === 'Star.jeans 819') {
        sessionStorage.setItem('starjean_auth', 'true');
        elements.loginOverlay.style.opacity = '0';
        setTimeout(() => {
            elements.loginOverlay.style.display = 'none';
            document.getElementById('dashboardContainer').style.display = 'block';
            fetchAdminData();
        }, 300);
    } else {
        elements.loginError.style.display = 'block';
        elements.passwordInput.value = '';
        elements.passwordInput.focus();
    }
}

// Read selected JPEG/PNG file as base64 string DataUri
function handleFileSelectorUploader(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2000000) {
        showToast('error', 'Select a smaller photo file (below 2MB) for persistence bounds.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const base64 = event.target.result;
        elements.prodImageUrl.value = base64;
        updateImagePreview();
        showToast('success', 'Image file read successfully!');
    };
    reader.onerror = () => {
        showToast('error', 'Could not read image file.');
    };
    reader.readAsDataURL(file);
}

// Fetch Admin logs
async function fetchAdminData() {
    try {
        const data = await CONFIG.getDbData();
        products = data.products || [];
        orders = data.orders || [];
        updateDashboardUI();
    } catch (error) {
        console.error("Dashboard dataset error:", error);
        showToast('error', 'Database synchronization failed.');
    }
}

// Render overall stats
function updateDashboardUI() {
    elements.statProducts.textContent = products.length;
    elements.statOrders.textContent = orders.length;
    elements.ordersCountNum.textContent = orders.length;

    let outStock = 0;
    products.forEach(p => {
        const total = (parseInt(p.stock_s) || 0) + (parseInt(p.stock_m) || 0) + (parseInt(p.stock_l) || 0);
        if (total === 0) outStock++;
    });
    elements.statOutOfStock.textContent = outStock;

    const rev = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    elements.statRevenue.textContent = `RS ${rev.toFixed(0)}`;

    renderProductsTable();
    renderOrdersTable();
}

// Render inventory items grid table
function renderProductsTable() {
    elements.productsTableBody.innerHTML = '';

    if (products.length === 0) {
        elements.productsTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 40px 0;">
                    No products cataloged inside store database. Select "Upload Product" tab to start adding!
                </td>
            </tr>
        `;
        return;
    }

    products.forEach(p => {
        const s = parseInt(p.stock_s) || 0;
        const m = parseInt(p.stock_m) || 0;
        const l = parseInt(p.stock_l) || 0;
        const oPrice = parseFloat(p.price) || 0;
        const sPrice = parseFloat(p.sale_price) || 0;

        let priceHTML = '';
        if (sPrice > 0 && sPrice < oPrice) {
            priceHTML = `
                <strong style="color:var(--danger)">RS ${sPrice.toFixed(0)}</strong><br>
                <span style="text-decoration:line-through; font-size:0.75rem; color:var(--text-muted)">RS ${oPrice.toFixed(0)}</span>
            `;
        } else {
            priceHTML = `<strong>RS ${oPrice.toFixed(0)}</strong>`;
        }

        // Render stock tags values
        const stockHTML = `
            <div style="display:flex; gap:6px;">
                <span class="size-stock-tag ${s === 0 ? 'empty' : ''}" style="padding: 2px 6px; border-radius:4px; font-size:0.75rem; font-weight:600; border: 1px solid var(--border-color);">S: ${s}</span>
                <span class="size-stock-tag ${m === 0 ? 'empty' : ''}" style="padding: 2px 6px; border-radius:4px; font-size:0.75rem; font-weight:600; border: 1px solid var(--border-color);">M: ${m}</span>
                <span class="size-stock-tag ${l === 0 ? 'empty' : ''}" style="padding: 2px 6px; border-radius:4px; font-size:0.75rem; font-weight:600; border: 1px solid var(--border-color);">L: ${l}</span>
            </div>
        `;

// Render thumbnail img - use first image from images array or fallback to image_url
        let primaryImage = '';
        if (p.images && Array.isArray(p.images) && p.images.length > 0) {
            primaryImage = p.images[0];
        } else if (p.image_url && p.image_url.trim() !== '') {
            primaryImage = p.image_url;
        }
        
        let imgHTML = '';
        if (primaryImage) {
            imgHTML = `<img src="${primaryImage.replace(/"/g, '"')}" style="width:48px; height:56px; object-fit:cover; border-radius:4px;" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80';">`;
        } else {
            imgHTML = `<div style="width:48px;height:56px;background:#E5E7EB;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#9CA3AF"><svg style="width:16px;height:16px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>`;
        }

        // Available colors selector
        let colorsListHTML = '';
        if (p.colors && p.colors.trim() !== '') {
            const list = p.colors.split(',').map(c => c.trim()).filter(c => c);
            list.forEach(c => {
                colorsListHTML += `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${c}; border: 1px solid var(--border-color); margin-right:4px;" title="${c}"></span>`;
            });
        } else {
            colorsListHTML = '<span style="font-size:0.75rem; color:var(--text-muted)">None</span>';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${imgHTML}</td>
            <td>
                <div style="font-weight:600;">${p.name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); cursor:pointer;" onclick="navigator.clipboard.writeText('${p.id}'); showToast('success', 'Copied ID!')">ID: ${p.id}</div>
            </td>
            <td><span class="admin-badge admin-badge-category" style="background:#E0F2FE; color:#0369A1; padding: 2px 8px; border-radius:4px; font-size:0.75rem; text-transform:uppercase; font-weight:600;">${p.category}</span></td>
            <td>${colorsListHTML}</td>
            <td>${priceHTML}</td>
            <td>${stockHTML}</td>
            <td>
                <div class="action-buttons" style="display:flex; gap:8px; justify-content:center;">
                    <button class="action-btn edit" data-id="${p.id}" title="Edit product" style="background:#FEF3C7; color:#D97706; border:none; padding:6px; border-radius:4px; cursor:pointer;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </button>
                    <button class="action-btn delete" data-id="${p.id}" title="Delete product" style="background:#FEE2E2; color:#DC2626; border:none; padding:6px; border-radius:4px; cursor:pointer;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                </div>
            </td>
        `;

        row.querySelector('.edit').addEventListener('click', () => fillFormForEdit(p));
        row.querySelector('.delete').addEventListener('click', () => deleteProduct(p.id));
        elements.productsTableBody.appendChild(row);
    });
}

// Render Orders transaction logs listing
function renderOrdersTable() {
    elements.ordersTableBody.innerHTML = '';
    if (orders.length === 0) {
        elements.ordersTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 40px 0;">
                    No orders registered in the system.
                </td>
            </tr>
        `;
        return;
    }

    const sorted = [...orders].reverse();
    sorted.forEach(ord => {
        let itemsHTML = '';
        if (Array.isArray(ord.items)) {
            itemsHTML = ord.items.map(i => `<span class="order-item-tag" style="background:#F3F4F6; margin-right:4px; margin-bottom:4px; padding:2px 8px; border-radius:4px; font-size:0.75rem; display:inline-block; border: 1px solid var(--border-color);">${i.name} (${i.selected_size || i.size}) x${i.quantity}</span>`).join('');
        } else {
            itemsHTML = `<span class="order-item-tag" style="background:#F3F4F6; padding:2px 8px; border-radius:4px; font-size:0.75rem;">${ord.items}</span>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong style="color:#0369A1">${ord.order_id}</strong></td>
            <td>
                <div style="font-weight:600;">${ord.name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${ord.date}</div>
            </td>
            <td>
                <div style="font-size:0.85rem; font-weight:500;">📞 ${ord.phone}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); max-width:200px; overflow:hidden; text-overflow:ellipsis;" title="${ord.address}">📍 ${ord.address}</div>
            </td>
            <td class="order-items-col">${itemsHTML}</td>
            <td><strong>RS ${(parseFloat(ord.total) || 0).toFixed(0)}</strong></td>
            <td>
                <select class="status-select-btn" data-id="${ord.order_id}" style="padding:4px 8px; border-radius:4px; border: 1px solid var(--border-color); font-size:0.8rem; font-weight:600; cursor:pointer;">
                    <option value="Pending" ${ord.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Completed" ${ord.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    <option value="Shipped" ${ord.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="Cancelled" ${ord.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
        `;

        row.querySelector('.status-select-btn').addEventListener('change', (e) => {
            updateOrderStatus(ord.order_id, e.target.value);
        });

        elements.ordersTableBody.appendChild(row);
    });
}

// Update Order status values callback
async function updateOrderStatus(ordId, newStatus) {
    showToast('info', 'Updating order status...');
    try {
        const res = await CONFIG.postDbAction({
            action: 'updateOrderStatus',
            order_id: ordId,
            status: newStatus
        });
        if (res.success) {
            showToast('success', 'Order status updated successfully.');
            fetchAdminData();
        } else {
            showToast('error', res.message || 'Could not update order status.');
        }
    } catch (e) {
        console.error(e);
        showToast('error', 'Connection failure updating order status.');
    }
}

// Parse textarea URLs into array
function parseImageUrls(text) {
    return text.split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);
}

// Render multiple image previews
function renderImagePreviews() {
    const container = elements.imagePreviewContainer;
    const placeholder = elements.imagePreviewPlaceholder;
    
    if (pendingImages.length === 0) {
        placeholder.style.display = 'block';
        // Remove any existing preview images
        container.querySelectorAll('.preview-img-wrapper').forEach(el => el.remove());
        return;
    }
    
    placeholder.style.display = 'none';
    
    // Remove existing previews
    container.querySelectorAll('.preview-img-wrapper').forEach(el => el.remove());
    
    // Create preview for each image
    pendingImages.forEach((imgSrc, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-img-wrapper';
        wrapper.style.cssText = 'position:relative; display:inline-block; margin:8px; width:100px; height:120px;';
        wrapper.innerHTML = `
            <img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover; border-radius:8px; border:1px solid var(--border-color);" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div style="display:none; width:100%; height:100%; border-radius:8px; border:1px solid var(--border-color); background:#F3F4F6; align-items:center; justify-content:center; position:absolute; top:0; left:0; color:#9CA3AF; font-size:12px;">Failed to load</div>
            <button type="button" class="remove-img-btn" data-index="${index}" style="position:absolute; top:-8px; right:-8px; width:24px; height:24px; border-radius:50%; background:#EF4444; color:white; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:14px; line-height:1; z-index:10;">×</button>
        `;
        container.appendChild(wrapper);
    });
    
    // Add remove button handlers
    container.querySelectorAll('.remove-img-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            pendingImages.splice(index, 1);
            renderImagePreviews();
        });
    });
}

// Update preview from URLs textarea
function updateImagePreviewFromUrls() {
    const text = elements.prodImageUrls.value.trim();
    pendingImages = parseImageUrls(text);
    renderImagePreviews();
}

// Handle multiple file uploads
function handleFileSelectorUploader(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    let hasError = false;
    files.forEach(file => {
        if (file.size > 2000000) {
            showToast('error', 'Select smaller photo files (below 2MB each) for persistence bounds.');
            hasError = true;
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result;
            pendingImages.push(base64);
            renderImagePreviews();
            showToast('success', 'Image file read successfully!');
        };
        reader.onerror = () => {
            showToast('error', 'Could not read image file.');
        };
        reader.readAsDataURL(file);
    });
    
    // Clear the input so same file can be selected again
    e.target.value = '';
}

// Fill Form for Editing Mode
function fillFormForEdit(product) {
    editingProductId = product.id;
    elements.formPanelTitle.textContent = `Edit Catalog Product: ${product.name}`;
    elements.submitProductBtn.querySelector('span').textContent = 'Update Product';

    // Populate values
    elements.prodId.value = product.id;
    
    // Handle multiple images - use product.images array or fallback to image_url
    let images = [];
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        images = product.images;
    } else if (product.image_url && product.image_url.trim() !== '') {
        images = [product.image_url];
    }
    pendingImages = images;
    elements.prodImageUrls.value = pendingImages.join('\n');
    
    elements.prodName.value = product.name;
    elements.prodCategory.value = product.category;
    elements.prodColors.value = product.colors || '';
    elements.prodDescription.value = product.description || '';
    elements.prodPrice.value = product.price;
    elements.prodSalePrice.value = product.sale_price > 0 ? product.sale_price : '';
    elements.prodIsTop.checked = product.is_top === true || String(product.is_top).toLowerCase() === 'true';

    elements.stockS.value = product.stock_s || 0;
    elements.stockM.value = product.stock_m || 0;
    elements.stockL.value = product.stock_l || 0;

    renderImagePreviews();

    // Trigger URL tab choice visible since editing loads the URLs
    elements.choiceUrlBtn.click();

    // Switch panels to tabBtnUpload view.
    elements.tabBtnUpload.click();
}

// Reset Form Inputs
function resetForm() {
    editingProductId = null;
    pendingImages = [];
    elements.formPanelTitle.textContent = 'Add New Product Details';
    elements.submitProductBtn.querySelector('span').textContent = 'Add Product';

    elements.productForm.reset();
    elements.prodId.value = '';
    elements.prodImageFiles.value = '';

    elements.imagePreviewPlaceholder.style.display = 'block';
    elements.imagePreviewContainer.querySelectorAll('.preview-img-wrapper').forEach(el => el.remove());
}

// Handle product additions or update edits save operation
async function handleProductSave(e) {
    e.preventDefault();

    const nameVal = elements.prodName.value.trim();
    const catVal = elements.prodCategory.value;
    const colorsVal = elements.prodColors.value.trim();
    const descVal = elements.prodDescription.value.trim();
    const priceVal = parseFloat(elements.prodPrice.value) || 0;
    const salePriceVal = parseFloat(elements.prodSalePrice.value) || 0;
    const isTopVal = elements.prodIsTop.checked;

    const sQty = parseInt(elements.stockS.value) || 0;
    const mQty = parseInt(elements.stockM.value) || 0;
    const lQty = parseInt(elements.stockL.value) || 0;

    if (salePriceVal > 0 && salePriceVal >= priceVal) {
        showToast('error', 'Sale price must be lower than original price!');
        return;
    }

    // Use hidden input as source of truth for product ID
    const idVal = elements.prodId.value.trim() || 'PROD-' + Date.now();
    const isEditing = !!elements.prodId.value.trim();

    elements.submitProductBtn.disabled = true;
    elements.submitProductBtn.innerHTML = '<span class="spinner" style="border-top-color:#111827"></span> Saving...';

    // Use first pending image as primary image_url, and all pendingImages as images array
    const imageUrlVal = pendingImages[0] || '';
    const imagesVal = pendingImages;

    const payload = {
        action: 'saveProduct',
        product: {
            id: idVal,
            name: nameVal,
            category: catVal,
            colors: colorsVal,
            description: descVal,
            image_url: imageUrlVal,
            images: imagesVal,
            price: priceVal,
            sale_price: salePriceVal,
            is_top: isTopVal,
            stock_s: sQty,
            stock_m: mQty,
            stock_l: lQty
        }
    };

    try {
        const res = await CONFIG.postDbAction(payload);
        if (res.success) {
            showToast('success', isEditing ? 'Product details updated!' : 'Product uploaded successfully!');
            resetForm();
            fetchAdminData();
            // Automatically switch back to product list pane on success
            elements.tabBtnProducts.click();
        } else {
            showToast('error', res.message || 'Error occurred while saving.');
        }
    } catch (err) {
        console.error(err);
        showToast('error', 'Connection error while saving product details.');
    } finally {
        elements.submitProductBtn.disabled = false;
        elements.submitProductBtn.innerHTML = `<span>${isEditing ? 'Update Product' : 'Add Product'}</span>`;
    }
}

// Delete product catalog item helper
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to permanently delete this product?')) return;

    showToast('info', 'Deleting product...');
    try {
        const res = await CONFIG.postDbAction({
            action: 'deleteProduct',
            id: id
        });

        if (res.success) {
            showToast('success', 'Product completely deleted!');
            if (editingProductId === id) resetForm();
            fetchAdminData();
        } else {
            showToast('error', res.message || 'Could not delete product.');
        }
    } catch (e) {
        console.error(e);
        showToast('error', 'Network failure deleting product.');
    }
}

// Toast Notifications popup manager
function showToast(type, msg) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.background = type === 'success' ? '#D1FAE5' : type === 'error' ? '#FEE2E2' : '#E0F2FE';
    toast.style.color = type === 'success' ? '#065F46' : type === 'error' ? '#991B1B' : '#0369A1';
    toast.style.padding = '12px 20px';
    toast.style.border = '1px solid currentColor';
    toast.style.borderRadius = '6px';
    toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
    toast.style.display = 'flex';
    toast.style.justifyContent = 'space-between';
    toast.style.alignItems = 'center';
    toast.style.minWidth = '280px';
    toast.style.animation = 'slideIn 0.3s forwards';

    const emoji = type === 'success' ? '✨' : type === 'error' ? '❌' : 'ℹ️';

    toast.innerHTML = `
        <span>${emoji} ${msg}</span>
        <button class="toast-close" style="background:none; border:none; color:inherit; font-size:1.2rem; cursor:pointer;" onclick="this.parentNode.remove()">&times;</button>
    `;

    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
