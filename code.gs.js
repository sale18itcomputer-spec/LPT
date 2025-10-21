// --- CONFIGURATION ---
// IMPORTANT: These names MUST match the sheet tab names in your Google Sheet exactly.
const sheetConfig = {
  INVENTORY: 'Inventory Summary',
  CUSTOMERS: 'Customer Summary',
  OPPORTUNITIES: 'Sales Opportunities',
  BACKORDERS: 'Backorder Analysis',
  PROMOTIONS: 'Promotion Candidates',
  PLANS: 'Marketing Plans',
  TASKS: 'Tasks',
  // You can add more sheet mappings here as needed.
  // The key (e.g., 'INVENTORY') is what you send from the web app.
  // The value (e.g., 'Inventory Summary') is the exact name of the tab in your Google Sheet.
};

// --- WEB APP ENTRY POINTS ---

/**
 * Main entry point for the web app. Handles POST requests from the front-end application.
 * @param {object} e - The event parameter for a POST request.
 */
function doPost(e) {
  try {
    // Using FormData avoids CORS pre-flight issues
    const payload = JSON.parse(e.parameter.payload);
    const action = payload.action;
    const sheetType = payload.sheetType;
    const data = payload.data;
    
    let result;
    
    switch (action) {
      case 'read':
        result = handleRead(sheetType);
        break;
      case 'overwrite':
        result = handleOverwrite(sheetType, data);
        break;
      case 'append':
        result = handleAppend(sheetType, data);
        break;
      case 'update':
        result = handleUpdate(sheetType, data.identifier, data.updates);
        break;
      case 'delete':
        result = handleDelete(sheetType, data.identifier);
        break;
      default:
        throw new Error('Invalid action specified: ' + action);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', data: result }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString() + ' Stack: ' + error.stack);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Main entry point for GET requests. Useful for testing if the script is deployed correctly.
 */
function doGet(e) {
  return ContentService.createTextOutput("Google Apps Script is running.");
}


// --- ACTION HANDLERS ---

/**
 * Reads all data from a sheet and returns it as an array of objects.
 * Uses getDisplayValues() to ensure all data is returned as strings, mimicking CSV behavior.
 * @param {string} sheetType - The key for the sheet from sheetConfig.
 * @returns {Array<Object>} An array of row objects with string values.
 */
function handleRead(sheetType) {
  const sheet = getSheet(sheetType);
  const data = sheet.getDataRange().getDisplayValues(); // Use getDisplayValues() for string output
  
  if (data.length < 2) {
    return []; // No data rows, just a header or empty
  }
  
  const headers = data[0];
  const rows = data.slice(1).map(function(row) {
    const rowObject = {};
    headers.forEach(function(header, index) {
      rowObject[header] = row[index];
    });
    return rowObject;
  });
  
  return rows;
}

/**
 * Overwrites an entire sheet with new data.
 * @param {string} sheetType - The key for the sheet from sheetConfig.
 * @param {Array<Object>} data - An array of objects to write to the sheet.
 */
function handleOverwrite(sheetType, data) {
  const sheet = getSheet(sheetType);
  
  if (data.length === 0) {
    sheet.clearContents(); // Clear the sheet if data is empty
    return { message: `Sheet '${sheet.getName()}' cleared.` };
  }
  
  const headers = Object.keys(data[0]);
  const values = data.map(row => headers.map(header => row[header]));
  
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  
  return { message: `Overwrote ${values.length} rows in '${sheet.getName()}'.` };
}

/**
 * Appends new rows to a sheet.
 * @param {string} sheetType - The key for the sheet from sheetConfig.
 * @param {Array<Object>} data - An array of objects to append.
 */
function handleAppend(sheetType, data) {
  const sheet = getSheet(sheetType);
  
  if (data.length === 0) {
    return { message: 'No data to append.' };
  }
  
  const headers = getHeaders(sheet);
  // Ensure headers exist if sheet is empty
  if (headers.length === 0 && data.length > 0) {
      const newHeaders = Object.keys(data[0]);
      sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
      headers.push(...newHeaders);
  }

  const values = data.map(row => headers.map(header => row[header] !== undefined ? row[header] : ''));
  
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
  
  return { message: `Appended ${values.length} rows to '${sheet.getName()}'.` };
}

/**
 * Updates a specific row in a sheet based on a composite identifier.
 * @param {string} sheetType - The key for the sheet from sheetConfig.
 * @param {Object} identifier - An object with key-value pairs to find the row, e.g., { 'Sales Order Number': '123', 'Product ID': 'XYZ' }.
 * @param {Object} updates - An object with key-value pairs to update.
 */
function handleUpdate(sheetType, identifier, updates) {
  const sheet = getSheet(sheetType);
  
  const headers = getHeaders(sheet);
  const data = sheet.getDataRange().getValues();
  
  const identifierKeys = Object.keys(identifier);
  if (identifierKeys.length === 0) {
    throw new Error('Identifier object cannot be empty.');
  }
  
  const identifierCols = {};
  for (const key of identifierKeys) {
    const colIndex = headers.indexOf(key);
    if (colIndex === -1) {
      throw new Error(`Identifier column '${key}' not found in sheet '${sheet.getName()}'.`);
    }
    identifierCols[key] = colIndex;
  }
  
  // Loop through rows to find a match (start from 1 to skip header)
  for (let i = 1; i < data.length; i++) {
    const currentRow = data[i];
    let allIdentifiersMatch = true;
    
    // Check if all identifiers match for the current row
    for (const key of identifierKeys) {
      const colIndex = identifierCols[key];
      if (String(currentRow[colIndex]) !== String(identifier[key])) {
        allIdentifiersMatch = false;
        break; // No need to check other keys for this row
      }
    }
    
    // If all matched, perform the update
    if (allIdentifiersMatch) {
      const rowIndex = i + 1; // 1-based index for sheet range
      for (const updateKey in updates) {
        const updateColIndex = headers.indexOf(updateKey);
        if (updateColIndex !== -1) {
          sheet.getRange(rowIndex, updateColIndex + 1).setValue(updates[updateKey]);
        } else {
          Logger.log("Warning: Update key '" + updateKey + "' not found in headers. Skipping update for this key.");
        }
      }
      return { message: `Updated row ${rowIndex} in '${sheet.getName()}'.` };
    }
  }
  
  // If no match found after checking all rows
  const identifierString = JSON.stringify(identifier);
  throw new Error(`Row with identifier ${identifierString} not found in '${sheet.getName()}'.`);
}

/**
 * Deletes a specific row in a sheet based on an identifier.
 * @param {string} sheetType - The key for the sheet from sheetConfig.
 * @param {Object} identifier - An object with a key-value pair to find the row.
 */
function handleDelete(sheetType, identifier) {
  const sheet = getSheet(sheetType);
  
  const headers = getHeaders(sheet);
  const data = sheet.getDataRange().getValues();
  
  const identifierKey = Object.keys(identifier)[0];
  const identifierValue = identifier[identifierKey];
  const identifierColIndex = headers.indexOf(identifierKey);

  if (identifierColIndex === -1) {
    throw new Error(`Identifier column '${identifierKey}' not found in sheet '${sheet.getName()}'.`);
  }
  
  // Iterate backwards to avoid issues when deleting rows
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][identifierColIndex]) === String(identifierValue)) {
      const rowIndex = i + 1; // 1-based index
      sheet.deleteRow(rowIndex);
      return { message: `Deleted row with ${identifierKey}=${identifierValue} from '${sheet.getName()}'.` };
    }
  }
  
  // It's not an error if the row doesn't exist, it might have been deleted already.
  return { message: `Row with ${identifierKey}=${identifierValue} was not found in '${sheet.getName()}'. No action taken.` };
}


// --- HELPER FUNCTIONS ---

/**
 * Gets a sheet object by its configuration key. Throws an error if not found.
 * @param {string} sheetType - The key for the sheet from sheetConfig.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} The sheet object.
 */
function getSheet(sheetType) {
  const sheetName = sheetConfig[sheetType.toUpperCase()];
  if (!sheetName) {
    throw new Error(`Sheet type '${sheetType}' is not defined in the configuration.`);
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet with name '${sheetName}' could not be found.`);
  }
  return sheet;
}

/**
 * Gets the headers from the first row of a sheet.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet object.
 * @returns {Array<string>} An array of header strings.
 */
function getHeaders(sheet) {
  // If sheet is empty, getLastColumn is 0.
  if (sheet.getLastColumn() === 0) {
      if (sheet.getName() === sheetConfig.TASKS) {
          // Define default headers for Tasks if the sheet is new/empty
          return ['unique_id', 'title', 'description', 'status', 'priority', 'createdAt', 'timestamp', 'completedAt', 'user_email', 'Start Date', 'Due Date', 'Dependencies', 'Icon', '# Progress'];
      }
      return [];
  }
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
}