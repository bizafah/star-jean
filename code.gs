/**
 * Google Apps Script Backend for Star-Jean Apparel Store
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
      "image_url", "images", "price", "sale_price", "stock_xs", "stock_s", "stock_m", "stock_l", "stock_xl", "colors"
    ]);
    // Format headers
    productsSheet.getRange("A1:O1").setFontWeight("bold").setBackground("#F3F3F3");
  } else {
    // Ensure all new size columns are present
    var lastCol = productsSheet.getLastColumn();
    var headers = productsSheet.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0];
    
    var newHeaders = ["stock_xs", "stock_s", "stock_m", "stock_l", "stock_xl"];
    newHeaders.forEach(function(headerName) {
      if (headers.indexOf(headerName) === -1) {
        var newColIndex = headers.length + 1;
        productsSheet.getRange(1, newColIndex).setValue(headerName);
        productsSheet.getRange(1, newColIndex).setFontWeight("bold").setBackground("#F3F3F3");
        headers.push(headerName);
      }
    });
    
    // Ensure colors header is present
    if (headers.indexOf("colors") === -1) {
      var colorsColIndex = headers.length + 1;
      productsSheet.getRange(1, colorsColIndex).setValue("colors");
      productsSheet.getRange(1, colorsColIndex).setFontWeight("bold").setBackground("#F3F3F3");
    }
    // Ensure images header is present
    if (headers.indexOf("images") === -1) {
      var imagesColIndex = headers.length + 1;
      productsSheet.getRange(1, imagesColIndex).setValue("images");
      productsSheet.getRange(1, imagesColIndex).setFontWeight("bold").setBackground("#F3F3F3");
    }
  }
  
  var ordersSheet = ss.getSheetByName("Orders");
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet("Orders");
    ordersSheet.appendRow([
      "order_id", "date", "name", "phone", "address", "items", "total", "subtotal", "delivery_charges", "status"
    ]);
    ordersSheet.getRange("A1:J1").setFontWeight("bold").setBackground("#F3F3F3");
  } else {
    // Ensure subtotal and delivery_charges headers are present
    var lastCol = ordersSheet.getLastColumn();
    var headers = ordersSheet.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0];
    if (headers.indexOf("subtotal") === -1) {
      ordersSheet.getRange(1, 9).setValue("subtotal");
      ordersSheet.getRange(1, 9).setFontWeight("bold").setBackground("#F3F3F3");
    }
    if (headers.indexOf("delivery_charges") === -1) {
      ordersSheet.getRange(1, 10).setValue("delivery_charges");
      ordersSheet.getRange(1, 10).setFontWeight("bold").setBackground("#F3F3F3");
    }
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
      // Ensure images array is parsed
      if (prod.images && typeof prod.images === 'string') {
        try {
          prod.images = JSON.parse(prod.images);
        } catch(ex) {
          prod.images = [];
        }
      } else if (!prod.images) {
        prod.images = [];
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

// Handle POST requests for write actions (updates, additions, orders, status changes)
function doPost(e) {
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
      var headers = rows[0];
      var foundRowIndex = -1;
      
      // Look for existing product
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(prod.id)) {
          foundRowIndex = i + 1; // 1-indexed row number
          break;
        }
      }
      
      // Convert images array to JSON string for storage
      var imagesJson = prod.images ? JSON.stringify(prod.images) : "";
      
      // Build row values - ensure we match the header columns
      var rowValues = [];
      for (var h = 0; h < headers.length; h++) {
        var headerName = headers[h];
        switch (headerName) {
          case "id": rowValues.push(prod.id); break;
          case "name": rowValues.push(prod.name); break;
          case "category": rowValues.push(prod.category); break;
          case "is_top": rowValues.push(String(prod.is_top)); break;
          case "description": rowValues.push(prod.description); break;
          case "image_url": rowValues.push(prod.image_url); break;
          case "images": rowValues.push(imagesJson); break;
          case "price": rowValues.push(Number(prod.price)); break;
          case "sale_price": rowValues.push(Number(prod.sale_price || 0)); break;
          case "stock_xs": rowValues.push(Number(prod.stock_xs || 0)); break;
          case "stock_s": rowValues.push(Number(prod.stock_s || 0)); break;
          case "stock_m": rowValues.push(Number(prod.stock_m || 0)); break;
          case "stock_l": rowValues.push(Number(prod.stock_l || 0)); break;
          case "stock_xl": rowValues.push(Number(prod.stock_xl || 0)); break;
          case "colors": rowValues.push(prod.colors || ""); break;
          default: rowValues.push(""); break;
        }
      }
      
      if (foundRowIndex !== -1) {
        // Update product - write exactly the number of columns in the header
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
        
        db.products.getRange(foundRowIndex + 1, sizeColIndex + 1).setValue(newStock);
      }
      
      var orderRowValues = [
        orderObj.order_id,
        orderObj.date,
        orderObj.name,
        orderObj.phone,
        orderObj.address,
        JSON.stringify(orderObj.items),
        Number(orderObj.total),
        Number(orderObj.subtotal || 0),
        Number(orderObj.delivery_charges || 0),
        orderObj.status || "Pending"
      ];
      
      db.orders.appendRow(orderRowValues);
      
      lock.releaseLock();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Order placed and stock updated successfully!"
      })).setMimeType(ContentService.MimeType.JSON);
      
    } else if (action === "updateOrderStatus") {
      var ordId = postData.order_id;
      var newStatus = postData.status;
      var ordersRows = db.orders.getDataRange().getValues();
      var foundRowIndex = -1;
      
      for (var i = 1; i < ordersRows.length; i++) {
        if (String(ordersRows[i][0]) === String(ordId)) {
          foundRowIndex = i + 1;
          break;
        }
      }
      
      if (foundRowIndex !== -1) {
        // Status is header column 10 (column J, 1-based)
        db.orders.getRange(foundRowIndex, 10).setValue(newStatus);
        
        lock.releaseLock();
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Order status updated successfully"
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        lock.releaseLock();
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: "Order ID not found"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
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
