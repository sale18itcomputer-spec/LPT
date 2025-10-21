// --- CONFIGURATION ---
const ORDER_SHEET_ID = '1_MC0BhvzSw5aUBCPg_E79leRNLtuYqXzAq9FqJcSao8';
const ORDER_SHEET_NAME = 'Shipment Details'; 
const PRICE_LIST_SHEET_NAME = 'Price List'; // Corrected from 'ETA Info'
const SERIALIZATION_SHEET_NAME = 'Serialization'; // For serialization data

// Main function to handle POST requests from your web app
function doPost(e) {
  try {
    const payload = JSON.parse(e.parameter.payload);
    const { action, sheetType, data } = payload;

    if (!action || !sheetType) {
      throw new Error("Missing required parameters (action, sheetType) in payload.");
    }

    let result;
    if (sheetType === 'orders') {
      if (action === 'update') {
        if (!data || !data.identifier || !data.updates) throw new Error("Missing identifier or updates for order update action.");
        result = updateOrderSheet(data.identifier, data.updates);
      } else if (action === 'append') {
        if (!data) throw new Error("Missing data for order append action.");
        result = appendOrders(data);
      } else {
        throw new Error(`Unsupported action for orders: ${action}`);
      }
    } else if (sheetType === 'price-list') {
      if (action === 'update') {
        if (!data || !data.identifier || !data.updates) throw new Error("Missing identifier or updates for price-list update action.");
        result = updatePriceListSheet(data.identifier, data.updates);
      } else {
        throw new Error(`Unsupported action for price-list: ${action}`);
      }
    } else if (sheetType === 'serialization') {
      if (action === 'append') {
        if (!data) throw new Error("Missing data for serialization append action.");
        result = addSerialNumberData(data);
      } else {
        throw new Error(`Unsupported action for serialization: ${action}`);
      }
    } else {
      throw new Error("Editing for the specified sheet type is not yet supported by this script.");
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString() + ' Stack: ' + error.stack);
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// --- FUNCTION TO ADD SERIAL NUMBERS ---
function addSerialNumberData(newSerializationData) {
  if (!Array.isArray(newSerializationData) || newSerializationData.length === 0) {
    throw new Error("No serialization data provided to add.");
  }

  const sheet = SpreadsheetApp.openById(ORDER_SHEET_ID).getSheetByName(SERIALIZATION_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${SERIALIZATION_SHEET_NAME}" not found.`);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const rowsToAdd = newSerializationData.map(item => {
    // Create a new array for the row in the same order as the sheet's headers
    const row = headers.map(header => {
      // Generate timestamp on the server for accuracy
      if (header === 'Timestamp') {
        return new Date();
      }
      return item[header] || "";
    });
    return row;
  });

  // Add all new rows at once for better performance
  sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, headers.length)
       .setValues(rowsToAdd);
  
  SpreadsheetApp.flush();
  return { message: `Successfully added ${rowsToAdd.length} serial numbers.` };
}


// --- FUNCTION TO UPDATE THE PRICE LIST ---
function updatePriceListSheet(identifier, updates) {
  const sheet = SpreadsheetApp.openById(ORDER_SHEET_ID).getSheetByName(PRICE_LIST_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${PRICE_LIST_SHEET_NAME}" not found.`);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const { MTM } = identifier;
  if (!MTM) throw new Error("MTM is required to identify the row in the price list.");

  const mtmColIndex = headers.indexOf('MTM');
  if (mtmColIndex === -1) {
    throw new Error("Could not find 'MTM' column in the price list sheet.");
  }
  
  let rowIndexToUpdate = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][mtmColIndex] == MTM) {
      rowIndexToUpdate = i + 1; // getRange is 1-indexed
      break;
    }
  }

  if (rowIndexToUpdate === -1) {
    // If not found, create a new row
    Logger.log(`MTM '${MTM}' not found. Appending a new row.`);
    const newRow = headers.map(header => {
      if (header === 'MTM') return MTM;
      return updates[header] || '';
    });
    sheet.appendRow(newRow);
    return { message: `Appended new price list item for MTM ${MTM}.` };
  }
  
  for (const headerName in updates) {
    const colIndex = headers.indexOf(headerName);
    if (colIndex !== -1) {
      const value = updates[headerName];
      sheet.getRange(rowIndexToUpdate, colIndex + 1).setValue(value);
    }
  }
  
  SpreadsheetApp.flush();
  return { message: `Successfully updated price list for MTM ${MTM} in row ${rowIndexToUpdate}.` };
}


// --- FUNCTION TO ADD ORDERS ---
function appendOrders(newOrdersData) {
  if (!Array.isArray(newOrdersData) || newOrdersData.length === 0) {
    throw new Error("No order data provided to append.");
  }

  const sheet = SpreadsheetApp.openById(ORDER_SHEET_ID).getSheetByName(ORDER_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${ORDER_SHEET_NAME}" not found.`);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const rowsToAppend = newOrdersData.map(order => {
    // Create a new array for the row in the same order as the sheet's headers
    const row = headers.map(header => order[header] !== undefined ? order[header] : "");
    return row;
  });

  // Append all new rows at once for better performance
  sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length)
       .setValues(rowsToAppend);
  
  SpreadsheetApp.flush();
  return { message: `Successfully appended ${rowsToAppend.length} orders.` };
}


// --- FUNCTION TO UPDATE ORDERS ---
function updateOrderSheet(identifier, updates) {
  const sheet = SpreadsheetApp.openById(ORDER_SHEET_ID).getSheetByName(ORDER_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${ORDER_SHEET_NAME}" not found.`);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const salesOrder = identifier['Sales Order Number'];
  const mtm = identifier['Product ID'];
  
  if (!salesOrder || !mtm) throw new Error("Sales Order and MTM are required to identify the row.");

  const salesOrderColIndex = headers.indexOf('Sales Order Number');
  const mtmColIndex = headers.indexOf('Product ID');

  if (salesOrderColIndex === -1 || mtmColIndex === -1) {
    throw new Error("Could not find 'Sales Order Number' or 'Product ID' columns in the sheet.");
  }
  
  let rowIndexToUpdate = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][salesOrderColIndex] == salesOrder && data[i][mtmColIndex] == mtm) {
      rowIndexToUpdate = i + 1; // getRange is 1-indexed
      break;
    }
  }

  if (rowIndexToUpdate === -1) {
    throw new Error(`Could not find an order with Sales Order '${salesOrder}' and MTM '${mtm}'.`);
  }
  
  for (const headerName in updates) {
    const colIndex = headers.indexOf(headerName);
    if (colIndex !== -1) {
      const value = updates[headerName];
      sheet.getRange(rowIndexToUpdate, colIndex + 1).setValue(value);
    }
  }
  
  SpreadsheetApp.flush();
  return { message: `Successfully updated row ${rowIndexToUpdate}.` };
}
