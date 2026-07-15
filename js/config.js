// global configuration
const CONFIG = {
    // Replace this with your deployed Google Apps Script Web App URL!
    // Example: "https://script.google.com/macros/s/AKfycbz.../exec"
    API_URL: "https://script.google.com/macros/s/AKfycbzmwKnMLgA-aBsU8MeOqgdKoK_I45y0_rb3zyhEEpwrlR5KbTn6aApvPb5m_PVqKEaR/exec",

    // Fetch timeout in ms - reduced for faster loading
    FETCH_TIMEOUT: 1500,

    // Database helper functions (handles Google Sheets or LocalStorage fallback)
    async getDbData() {
        if (this.API_URL) {
            try {
                const response = await this.fetchWithTimeout(this.API_URL, { method: 'GET', cache: 'no-cache' });
                if (!response.ok) throw new Error("Network response was not ok");
                return await response.json();
            } catch (error) {
                console.error("API GET Request failed. Falling back to local storage.", error);
                return this.getLocalData();
            }
        } else {
            // Minimal delay for local mode
            await new Promise(resolve => setTimeout(resolve, 100));
            return this.getLocalData();
        }
    },

    async postDbAction(payload) {
        if (this.API_URL) {
            try {
                const response = await this.fetchWithTimeout(this.API_URL, {
                    method: 'POST',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'text/plain',
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error("Network response was not ok");
                return await response.json();
            } catch (error) {
                console.error("API POST Request failed. Falling back to local storage.", error);
                return this.executeLocalAction(payload);
            }
        } else {
            // Minimal delay for local mode
            await new Promise(resolve => setTimeout(resolve, 100));
            return this.executeLocalAction(payload);
        }
    },

    async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.FETCH_TIMEOUT);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            return response;
        } finally {
            clearTimeout(timeoutId);
        }
    },

    // Internal LocalStorage simulation helper
    getLocalData() {
        let products = localStorage.getItem('boutique_products');
        if (!products) {
            // Start completely empty as requested: "donot add any picture or any detail on the website for now (this all will be done through the admin panel)"
            products = [];
            localStorage.setItem('boutique_products', JSON.stringify(products));
        } else {
            products = JSON.parse(products);
        }

        let orders = localStorage.getItem('boutique_orders');
        if (!orders) {
            orders = [];
            localStorage.setItem('boutique_orders', JSON.stringify(orders));
        } else {
            orders = JSON.parse(orders);
        }

        return { products, orders };
    },

    executeLocalAction(payload) {
        const data = this.getLocalData();
        const { action } = payload;

        if (action === 'saveProduct') {
            const product = payload.product;
            const index = data.products.findIndex(p => p.id === product.id);
            if (index !== -1) {
                data.products[index] = product;
            } else {
                data.products.push(product);
            }
            localStorage.setItem('boutique_products', JSON.stringify(data.products));
            return { success: true, message: "Product saved successfully", data: data.products };

        } else if (action === 'deleteProduct') {
            const { id } = payload;
            data.products = data.products.filter(p => p.id !== id);
            localStorage.setItem('boutique_products', JSON.stringify(data.products));
            return { success: true, message: "Product deleted successfully", data: data.products };

        } else if (action === 'placeOrder') {
            const { order } = payload;

            // Stock check and deduction
            const updatedProducts = [...data.products];
            let stockError = null;

            order.items.forEach(item => {
                const prod = updatedProducts.find(p => p.id === item.id);
                if (!prod) {
                    stockError = `Product ${item.name} not found!`;
                    return;
                }

                const sizeKey = `stock_${item.size.toLowerCase()}`;
                const currentStock = parseInt(prod[sizeKey]) || 0;

                if (currentStock < item.quantity) {
                    stockError = `Insufficient stock for ${prod.name} (Size: ${item.size}). Available: ${currentStock}`;
                    return;
                }

                // Deduct stock
                prod[sizeKey] = currentStock - item.quantity;
            });

            if (stockError) {
                return { success: false, message: stockError };
            }

            // Save updated stock
            localStorage.setItem('boutique_products', JSON.stringify(updatedProducts));

            // Save order
            data.orders.push(order);
            localStorage.setItem('boutique_orders', JSON.stringify(data.orders));

            return { success: true, message: "Order placed successfully", data: { order, products: updatedProducts } };
        }

        return { success: false, message: "Unknown action" };
    }
};
