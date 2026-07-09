# Google Sheets Integration Guide

This guide explains how to connect your boutique web store to a **Google Sheets database** using **Google Apps Script**. This enables a live database where you can manage items, price points, description details, and stock figures directly in Google Sheets.

---

## 🛠️ Step 1: Create a Google Spreadsheet

1. Open your browser and navigate to [Google Sheets](https://sheets.google.com).
2. Create a new, blank spreadsheet.
3. You can give this sheet any name you prefer, such as `Womens Boutique DB`.
4. **Note**: Do not worry about configuring column names or tabs. The Apps Script program will automatically create the layout sheets ("Products" and "Orders") with the correct column headers on its first run!

---

## 💻 Step 2: Set up Google Apps Script

1. Inside your new Google Spreadsheet, go to the top menu and select:
   **Extensions** ➔ **Apps Script**.
2. A new code editor window will open.
3. Delete any default code inside the editor (such as `function myFunction() { ... }`).
4. Open the `code.gs` file in this project, copy **all** of its contents, and paste it into the Apps Script editor.
5. Click the **Save** floppy icon (or press `Ctrl + S`).

---

## 🚀 Step 3: Deploy the Web Application

To make the script accessible as a database API for your storefront, you must deploy it as a public Web App:

1. Click the **Deploy** button in the upper right corner of the Apps Script window and select **New deployment**.
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**.
3. Configure the deployment settings:
   - **Description**: `Boutique Backend v1`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: `Anyone` (This is required so storefront users can submit checkouts and read the catalog).
4. Click **Deploy**.
5. **Authorization Request**:
   - Google will ask you to authorize access to your spreadsheet. Click **Authorize access**.
   - Select your Google Account.
   - You might see an "unverified app" screen. Click **Advanced** at the bottom, then click **Go to Untitled project (unsafe)** or **Go to [Your Spreadsheet Name] (unsafe)**.
   - Click **Allow** to grant spreadsheet permissions.
6. Once authorization completes, copy the **Web app URL** provided in the deployment confirmation modal. It should look like this:
   `https://script.google.com/macros/s/AKfycb.../exec`

---

## 🔌 Step 4: Configure the Web Store

1. Open the file `js/config.js` in your text editor.
2. Locate the `API_URL` field inside the `CONFIG` object:
   ```javascript
   const CONFIG = {
     // Replace this with your deployed Google Apps Script Web App URL!
     API_URL: "", 
     // ...
   ```
3. Paste your copied spreadsheet URL inside the quotation marks:
   ```javascript
   const CONFIG = {
     // Replace this with your deployed Google Apps Script Web App URL!
     API_URL: "https://script.google.com/macros/s/AKfycbz_YOUR_SCRIPT_ID_HERE/exec", 
     // ...
   ```
4. Save the file.

---

## 🛍️ Step 5: Test Your Boutique Application

You are all set! To run the application:

1. Open `index.html` in your web browser.
2. Note that the top **"App running in offline local fallback mode"** banner is now gone, confirming it has successfully connected to your Google Sheet database.
3. Click the **Admin Dashboard** button in the navigation header or go directly to `admin.html`.
4. Try adding a new product:
   - Paste a public URL image (from sites like Unsplash).
   - Enter a Name, Description, Category (T-Shirts, Denim, Hoodies), Price, and Stock values for S, M, L.
   - Toggle **Top Selling** if you want it featured.
   - Click **Add Product**. The item will be saved directly into your Google Sheets spreadsheet!
5. Open your spreadsheet tabs to view the inserted rows.
6. Return to `index.html`. Your new product is fully configured and ready for purchase!
7. Complete a test customer checkout. The stock levels inside your spreadsheet columns will automatically calculate and reduce in real time, and the transaction is recorded under the **Orders** sheet tab.
