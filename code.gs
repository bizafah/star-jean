/**
 * Google Apps Script Backend for Women's Boutique Store
 * Install this script inside the Apps Script editor attached to your Google Sheet.
 * Set up sheets named "Products" and "Orders" in your spreadsheet.
 */

// Initialize sheets if they do not exist
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var productsSheet = ss.getSheetByName("Products");
  if (!productsSheet) {
    productsSheet = ss.insertSheet("Products");
    productsSheet.appendRow([
      "id", "name", "category", "is_top", "description", 
      "image_url", "price", "sale_price", "stock_s", "stock_m", "stock_l"
    ]);
    // Format headers
    productsSheet.getRange("A1:K1").setFontWeight("bold").setBackground("#F3F3F3");
  }
  
  var ordersSheet = ss.getSheetByName("Orders");
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet("Orders");
    ordersSheet.appendRow([
      "order_id", "date", "name", "phone", "address", "items", "total", "status"
    ]);
    ordersSheet.getRange("A1:H1").setFontWeight("bold").setBackground("#F3F3F3");
  }
}

// Helper to get sheets
function getDatabase() {
  setupDatabase(); // Ensure sheets are initialized
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    products: ss.getSheetByName("Products"),
    orders: ss.getSheetByName("Orders")
  };
}

// Handle GET requests (returns products and orders)
function doGet(e) {
  try {
    var db = getDatabase();
    
    // Read products
    var productRows = db.products.getDataRange().getValues();
    var productHeaders = productRows[0];
    var products = [];
    for (var i = 1; i < productRows.length; i++) {
      var row = productRows[i];
      var prod = {};
      for (var j = 0; j < productHeaders.length; j++) {
        var val = row[j];
        if (productHeaders[j] === "is_top") {
          val = (val === true || String(val).toLowerCase() === "true");
        }
        prod[productHeaders[j]] = val;
      }
      products.push(prod);
    }
    
    // Read orders
    var orderRows = db.orders.getDataRange().getValues();
    var orderHeaders = orderRows[0];
    var orders = [];
    for (var i = 1; i < orderRows.length; i++) {
      var row = orderRows[i];
      var ord = {};
      for (var j = 0; j < orderHeaders.length; j++) {
        var val = row[j];
        if (orderHeaders[j] === "items") {
          try {
            val = JSON.parse(val);
          } catch(ex) {
            val = [];
          }
        }
        ord[orderHeaders[j]] = val;
      }
      orders.push(ord);
    }
    
    var result = {
      success: true,
      products: products,
      orders: orders
    };
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle POST requests for write actions (updates, additions, orders)
function doPost(e) {
  // Use a lock to prevent concurrent modifications issues
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // wait up to 15 seconds
  } catch (ex) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Could not obtain sheet lock. Database busy."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var db = getDatabase();
    
    if (action === "saveProduct") {
      var prod = postData.product;
      var rows = db.products.getDataRange().getValues();
      var foundRowIndex = -1;
      
      // Look for existing product
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(prod.id)) {
          foundRowIndex = i + 1; // 1-indexed row number
          break;
        }
      }
      
      var rowValues = [
        prod.id,
        prod.name,
        prod.category,
        String(prod.is_top),
        prod.description,
        prod.image_url,
        Number(prod.price),
        Number(prod.sale_price || 0),
        Number(prod.stock_s || 0),
        Number(prod.stock_m || 0),
        Number(prod.stock_l || 0)
      ];
      
      if (foundRowIndex !== -1) {
        // Update product
        db.products.getRange(foundRowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        // Append new product
        db.products.appendRow(rowValues);
      }
      
      lock.releaseLock();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Product saved successfully"
      })).setMimeType(ContentService.MimeType.JSON);
      
    } else if (action === "deleteProduct") {
      var idToDelete = postData.id;
      var rows = db.products.getDataRange().getValues();
      var foundRowIndex = -1;
      
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(idToDelete)) {
          foundRowIndex = i + 1;
          break;
        }
      }
      
      if (foundRowIndex !== -1) {
        db.products.deleteRow(foundRowIndex);
        lock.releaseLock();
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Product deleted successfully"
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        lock.releaseLock();
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: "Product ID not found"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
    } else if (action === "placeOrder") {
      var orderObj = postData.order;
      var prodRows = db.products.getDataRange().getValues();
      var prodHeaders = prodRows[0];
      
      // Stock Validation
      for (var k = 0; k < orderObj.items.length; k++) {
        var cartItem = orderObj.items[k];
        var foundRowIndex = -1;
        
        for (var i = 1; i < prodRows.length; i++) {
          if (String(prodRows[i][0]) === String(cartItem.id)) {
            foundRowIndex = i;
            break;
          }
        }
        
        if (foundRowIndex === -1) {
          lock.releaseLock();
          return ContentService.createTextOutput(JSON.stringify({
            success: false,
            message: "Item " + cartItem.name + " not found in store stock."
          })).setMimeType(ContentService.MimeType.JSON);
        }
        
        var sizeColName = "stock_" + cartItem.size.toLowerCase();
        var sizeColIndex = prodHeaders.indexOf(sizeColName);
        if (sizeColIndex === -1) {
          lock.releaseLock();
          return ContentService.createTextOutput(JSON.stringify({
            success: false,
            message: "Invalid size mapping for size " + cartItem.size
          })).setMimeType(ContentService.MimeType.JSON);
        }
        
        var currentStock = Number(prodRows[foundRowIndex][sizeColIndex]);
        if (currentStock < cartItem.quantity) {
          lock.releaseLock();
          return ContentService.createTextOutput(JSON.stringify({
            success: false,
            message: "Insufficient stock for " + cartItem.name + " (Size: " + cartItem.size + "). Available: " + currentStock
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      // Stock Reduction
      for (var k = 0; k < orderObj.items.length; k++) {
        var cartItem = orderObj.items[k];
        var foundRowIndex = -1;
        
        for (var i = 1; i < prodRows.length; i++) {
          if (String(prodRows[i][0]) === String(cartItem.id)) {
            foundRowIndex = i;
            break;
          }
        }
        
        var sizeColName = "stock_" + cartItem.size.toLowerCase();
        var sizeColIndex = prodHeaders.indexOf(sizeColName);
        var currentStock = Number(prodRows[foundRowIndex][sizeColIndex]);
        var newStock = currentStock - cartItem.quantity;
        
        // Write back updated stock
        db.products.getRange(foundRowIndex + 1, sizeColIndex + 1).setValue(newStock);
      }
      
      // Record Order row
      var orderRowValues = [
        orderObj.order_id,
        orderObj.date,
        orderObj.name,
        orderObj.phone,
        orderObj.address,
        JSON.stringify(orderObj.items),
        Number(orderObj.total),
        orderObj.status || "Pending"
      ];
      
      db.orders.appendRow(orderRowValues);
      
      lock.releaseLock();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Order placed and stock updated successfully!"
      })).setMimeType(ContentService.MimeType.JSON);
      
    } else {
      lock.releaseLock();
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Unknown action: " + action
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Error executing action: " + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
