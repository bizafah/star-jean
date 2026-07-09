// Admin Dashboard Controller Logic

// Local State
let products = [];
let orders = [];
let editingProductId = null;

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
    prodImageUrl: document.getElementById('prodImageUrl'),
    imagePreviewContainer: document.getElementById('imagePreviewContainer'),
    imagePreviewPlaceholder: document.getElementById('imagePreviewPlaceholder'),
    prodName: document.getElementById('prodName'),
    prodCategory: document.getElementById('prodCategory'),
    prodDescription: document.getElementById('prodDescription'),
    prodPrice: document.getElementById('prodPrice'),
    prodSalePrice: document.getElementById('prodSalePrice'),
    prodIsTop: document.getElementById('prodIsTop'),
    stockS: document.getElementById('stockS'),
    stockM: document.getElementById('stockM'),
    stockL: document.getElementById('stockL'),
    submitProductBtn: document.getElementById('submitProductBtn'),

    // Tables
    productsTableBody: document.getElementById('productsTableBody'),
    ordersTableBody: document.getElementById('ordersTableBody')
};

// Initialize Admin
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchAdminData();

    // Display simulated DB banner if URL config is empty
    if (!CONFIG.API_URL) {
        elements.adminDemoBanner.style.display = 'flex';
    }
});

// Setup Listeners
function setupEventListeners() {
    // Tabs Switches
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            elements.tabBtns.forEach(b => b.classList.remove('active'));
            elements.tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const paneId = btn.dataset.pane;
            document.getElementById(paneId).classList.add('active');
        });
    });

    // Pasting Image URL Event for Live Thumbnail Preview
    elements.prodImageUrl.addEventListener('input', updateImagePreview);
    elements.prodImageUrl.addEventListener('change', updateImagePreview);

    // Form Reset Trigger
    elements.formResetBtn.addEventListener('click', resetForm);

    // Form Submission
    elements.productForm.addEventListener('submit', handleProductSave);
}

// Fetch spreadsheet/local data
async function fetchAdminData() {
    try {
        const data = await CONFIG.getDbData();
        products = data.products || [];
        orders = data.orders || [];

        updateDashboardUI();
    } catch (error) {
        console.error("Dashboard failed to retrieve dataset:", error);
        showToast('error', 'Database connection error.');
    }
}

// Sync dashboard metric and tables
function updateDashboardUI() {
    // 1. Stats Calculation
    elements.statProducts.textContent = products.length;
    elements.statOrders.textContent = orders.length;
    elements.ordersCountNum.textContent = orders.length;

    let outOfStockCount = 0;
    products.forEach(p => {
        const sStock = parseInt(p.stock_s) || 0;
        const mStock = parseInt(p.stock_m) || 0;
        const lStock = parseInt(p.stock_l) || 0;
        if (sStock + mStock + lStock === 0) {
            outOfStockCount++;
        }
    });
    elements.statOutOfStock.textContent = outOfStockCount;

    // Revenue sum
    const revenueTotal = orders.reduce((sum, ord) => sum + (parseFloat(ord.total) || 0), 0);
    elements.statRevenue.textContent = `$${revenueTotal.toFixed(2)}`;

    // 2. Render Tables
    renderProductsTable();
    renderOrdersTable();
}

// Render Products list inventory rows
function renderProductsTable() {
    elements.productsTableBody.innerHTML = '';

    if (products.length === 0) {
        elements.productsTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 40px 0;">
          No products found in store catalog. Add one using the form on the left!
        </td>
      </tr>
    `;
        return;
    }

    products.forEach(prod => {
        const sStock = parseInt(prod.stock_s) || 0;
        const mStock = parseInt(prod.stock_m) || 0;
        const lStock = parseInt(prod.stock_l) || 0;

        // Choose selected prices formatting
        let priceCellHTML = '';
        const originPrice = parseFloat(prod.price) || 0;
        const salePrice = parseFloat(prod.sale_price) || 0;

        if (salePrice > 0 && salePrice < originPrice) {
            priceCellHTML = `
        <strong style="color: var(--danger); font-size: 0.95rem;">$${salePrice.toFixed(2)}</strong><br>
        <span style="text-decoration: line-through; color: var(--text-muted); font-size: 0.8rem;">$${originPrice.toFixed(2)}</span>
      `;
        } else {
            priceCellHTML = `<strong>$${originPrice.toFixed(2)}</strong>`;
        }

        // Grid layout for individual stocks
        const sizeStockHTML = `
      <div class="stock-badge-grid">
        <span class="size-stock-tag ${sStock === 0 ? 'empty' : ''}">S: ${sStock}</span>
        <span class="size-stock-tag ${mStock === 0 ? 'empty' : ''}">M: ${mStock}</span>
        <span class="size-stock-tag ${lStock === 0 ? 'empty' : ''}">L: ${lStock}</span>
      </div>
    `;

        // Dynamic Image Column element
        let imageCellHTML = '';
        if (prod.image_url && prod.image_url.trim() !== '') {
            imageCellHTML = `<img src="${prod.image_url.replace(/"/g, '&quot;')}" class="tbl-prod-img" alt="" onerror="handleTableImageError(this)">`;
        } else {
            imageCellHTML = `
        <div class="tbl-placeholder-img">
          <svg style="width: 18px; height: 18px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        </div>
      `;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${imageCellHTML}</td>
      <td>
        <div style="font-weight: 600; font-size: 0.95rem;">${prod.name}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${prod.description || 'No description'}</div>
      </td>
      <td>
        <span class="admin-badge admin-badge-category">${prod.category}</span>
        ${prod.is_top ? '<span class="admin-badge admin-badge-top" style="margin-top: 4px; display:inline-block;">Top</span>' : ''}
      </td>
      <td>${priceCellHTML}</td>
      <td>${sizeStockHTML}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn edit" data-id="${prod.id}" title="Edit product parameters">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="action-btn delete" data-id="${prod.id}" title="Delete product">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;

        // Hook click actions
        row.querySelector('.edit').addEventListener('click', () => fillFormForEdit(prod));
        row.querySelector('.delete').addEventListener('click', () => deleteProduct(prod.id));

        elements.productsTableBody.appendChild(row);
    });
}

// Fallback image handler for tables
function handleTableImageError(imgNode) {
    const cell = imgNode.parentNode;
    if (cell) {
        cell.innerHTML = `
      <div class="tbl-placeholder-img">
        <svg style="width: 18px; height: 18px; color: var(--danger);" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      </div>
    `;
    }
}

// Render Orders collection logs
function renderOrdersTable() {
    elements.ordersTableBody.innerHTML = '';

    if (orders.length === 0) {
        elements.ordersTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 40px 0;">
          No customer checkout transactions registered yet.
        </td>
      </tr>
    `;
        return;
    }

    // Draw in descending order of dates
    const sortedOrders = [...orders].reverse();

    sortedOrders.forEach(ord => {
        // Generate inline items representation
        let itemsHTML = '';
        if (Array.isArray(ord.items)) {
            itemsHTML = ord.items.map(i => `
        <span class="order-item-tag">${i.name} (${i.size}) x${i.quantity}</span>
      `).join('');
        } else {
            itemsHTML = `<span class="order-item-tag">${ord.items}</span>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
      <td><strong style="color: var(--accent-hover); font-size: 0.85rem;">${ord.order_id}</strong></td>
      <td>
        <div style="font-weight:600; font-size:0.9rem;">${ord.name}</div>
        <div style="font-size:0.75rem; color: var(--text-muted);">${ord.date}</div>
      </td>
      <td>
        <div style="font-size:0.85rem; font-weight:500;">📞 ${ord.phone}</div>
        <div style="font-size:0.75rem; color: var(--text-muted); line-height: 1.3; margin-top:2px;">📍 ${ord.address}</div>
      </td>
      <td class="order-items-col">${itemsHTML}</td>
      <td><strong style="font-size:1rem;">$${(parseFloat(ord.total) || 0).toFixed(2)}</strong></td>
      <td>
        <span class="admin-badge admin-badge-${String(ord.status).toLowerCase()}">${ord.status}</span>
      </td>
    `;

        elements.ordersTableBody.appendChild(row);
    });
}

// Update Image Live Preview box URL
function updateImagePreview() {
    const url = elements.prodImageUrl.value.trim();

    if (url === '') {
        elements.imagePreviewPlaceholder.style.display = 'block';

        // Clear previous img element if existing
        const existingImg = elements.imagePreviewContainer.querySelector('img');
        if (existingImg) existingImg.remove();
        return;
    }

    elements.imagePreviewPlaceholder.style.display = 'none';

    let img = elements.imagePreviewContainer.querySelector('img');
    if (!img) {
        img = document.createElement('img');
        elements.imagePreviewContainer.appendChild(img);
    }

    img.src = url;
    img.onerror = () => {
        // If invalid image resolves, show error notice on label
        elements.imagePreviewPlaceholder.style.display = 'block';
        if (img) img.remove();
        showToast('error', 'Product photo URL cannot be loaded.');
    };
}

// Product save button processor: Handles Add / Edit Actions
async function handleProductSave(e) {
    e.preventDefault();

    const nameVal = elements.prodName.value.trim();
    const catVal = elements.prodCategory.value;
    const descVal = elements.prodDescription.value.trim();
    const priceVal = parseFloat(elements.prodPrice.value) || 0;
    const salePriceVal = parseFloat(elements.prodSalePrice.value) || 0;
    const imageUrlVal = elements.prodImageUrl.value.trim();
    const isTopVal = elements.prodIsTop.checked;

    // Stock sizing units
    const sQty = parseInt(elements.stockS.value) || 0;
    const mQty = parseInt(elements.stockM.value) || 0;
    const lQty = parseInt(elements.stockL.value) || 0;

    // Validation
    if (salePriceVal > 0 && salePriceVal >= priceVal) {
        showToast('error', 'Sale price must be lower than original price!');
        return;
    }

    // Generate ID if create block, otherwise preserve existing
    const targetId = editingProductId ? editingProductId : 'PROD-' + Math.floor(100000 + Math.random() * 900000);

    // Block Submission Form Button & Load spiner
    elements.submitProductBtn.disabled = true;
    elements.submitProductBtn.innerHTML = '<span class="admin-spinner"></span> Saving...';

    const productPayload = {
        id: targetId,
        name: nameVal,
        category: catVal,
        description: descVal,
        image_url: imageUrlVal,
        price: priceVal,
        sale_price: salePriceVal,
        is_top: isTopVal,
        stock_s: sQty,
        stock_m: mQty,
        stock_l: lQty
    };

    try {
        const result = await CONFIG.postDbAction({
            action: 'saveProduct',
            product: productPayload
        });

        if (result.success) {
            showToast('success', editingProductId ? 'Product updated successfully!' : 'Product added successfully!');

            resetForm();
            fetchAdminData(); // Refresh metrics and lists tables
        } else {
            showToast('error', result.message || 'Error occurred while saving product.');
        }
    } catch (error) {
        console.error("Critical error saving product item description:", error);
        showToast('error', 'Network failure saving product details.');
    } finally {
        // Release action panel lock
        elements.submitProductBtn.disabled = false;
        elements.submitProductBtn.innerHTML = editingProductId ? 'Update Product' : 'Add Product';
    }
}

// Edit actions: Fill form fields
function fillFormForEdit(product) {
    editingProductId = product.id;
    elements.formPanelTitle.textContent = `Edit Product: ${product.name}`;
    elements.submitProductBtn.textContent = 'Update Product';

    // Load inputs
    elements.prodId.value = product.id;
    elements.prodImageUrl.value = product.image_url || '';
    elements.prodName.value = product.name;
    elements.prodCategory.value = product.category;
    elements.prodDescription.value = product.description || '';
    elements.prodPrice.value = product.price;
    elements.prodSalePrice.value = product.sale_price || '';
    elements.prodIsTop.checked = product.is_top === true;

    elements.stockS.value = product.stock_s;
    elements.stockM.value = product.stock_m;
    elements.stockL.value = product.stock_l;

    // Fire live picture rendering
    updateImagePreview();

    // Scroll smoothly to form box
    document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
}

// Delete item
async function deleteProduct(id) {
    const prod = products.find(p => p.id === id);
    if (!prod) return;

    const conf = confirm(`Are you sure you want to permanently delete "${prod.name}" from your catalog store?`);
    if (!conf) return;

    try {
        const result = await CONFIG.postDbAction({
            action: 'deleteProduct',
            id: id
        });

        if (result.success) {
            showToast('success', 'Product deleted successfully!');
            if (editingProductId === id) {
                resetForm();
            }
            fetchAdminData();
        } else {
            showToast('error', result.message || 'Error deleting product.');
        }
    } catch (error) {
        console.error("Product removal failure:", error);
        showToast('error', 'Failed to communicate deletion.');
    }
}

// Reset Form Inputs
function resetForm() {
    editingProductId = null;
    elements.formPanelTitle.textContent = 'Add New Product';
    elements.submitProductBtn.textContent = 'Add Product';

    elements.productForm.reset();
    elements.prodId.value = '';

    // Clear image previews
    elements.imagePreviewPlaceholder.style.display = 'block';
    const img = elements.imagePreviewContainer.querySelector('img');
    if (img) img.remove();
}

// Toast alerts engine
function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✨' : '❌';

    toast.innerHTML = `
    <span>${icon} ${message}</span>
    <button class="toast-close">&times;</button>
  `;

    // Attach dismiss
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });

    elements.toastContainer.appendChild(toast);

    // Auto dismiss after 3.5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
