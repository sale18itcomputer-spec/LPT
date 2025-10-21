import type { TransformedData } from '../types';

export const initialInputHeaders = [
  'IMEI', 'Voucher No', 'Date', 'Month', 'Brand', 'Model', 'Product Name', 'Supplier', 'Supplier Type', 
  'Client', 'Weeks', 'Sold No.', 'Warehouse', 'Sale Rep', 'Qty', 'Unit Price', 'Discount', 'Net Unit Price', 
  'Amount', 'Unit Margin', 'GP%', 'Currency'
];

// Provide a reasonable number of empty rows for initial display
export const initialInputData: string[][] = Array.from({ length: 20 }, () => Array(initialInputHeaders.length).fill(''));


export const transformedHeaders = [
  "*Lenovo Product Number",
  "*Invoice Date",
  "Quantity",
  "*Buyer ID",
  "*Invoice Number",
  "Serial Number / Barcode",
  "Unit BP Reported Price",
  "*Total BP Reported Rev",
  "*Local Currency",
  "MCN/Contract Number",
  "Comment",
  "*Buyer Name",
];

export const PIVOT_GROUP_BY_OPTIONS = [
  { value: 'buyerName', label: 'Buyer Name' },
  { value: 'lenovoProductNumber', label: 'Product Number' },
  { value: 'invoiceDate', label: 'Invoice Date' },
];

export const PIVOT_VALUE_OPTIONS = [
  { value: 'totalBPReportedRev', label: 'Total Revenue', isCurrency: true },
  { value: 'quantity', label: 'Quantity', isCurrency: false },
  { value: 'unitBPReportedPrice', label: 'Unit Price', isCurrency: true },
];

export const PIVOT_AGGREGATION_OPTIONS = [
  { value: 'SUM', label: 'Sum' },
  { value: 'COUNT', label: 'Count' },
  { value: 'AVERAGE', label: 'Average' },
];


/**
 * Formats a date string from 'DD-Mon-YY' (e.g., '25-Aug-25') to 'MM/DD/YYYY' (e.g., '08/25/2025').
 * Also handles various other date formats gracefully.
 * @param dateStr The date string to format.
 * @returns The formatted date string in MM/DD/YYYY format, or the original string if parsing fails.
 */
const formatDate = (dateStr: string): string => {
  if (!dateStr || typeof dateStr !== 'string') return '';

  // Attempt to parse various common formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    // Check if it's a valid date object
     const year = date.getUTCFullYear();
     if (year < 2000 || year > 2050) { // Simple validation for likely spreadsheet date errors
         // Attempt to handle Excel-like date serial numbers if it's a number string
         const excelDateNumber = parseInt(dateStr, 10);
         if (!isNaN(excelDateNumber) && excelDateNumber > 25569) { // 25569 is Jan 1 1970
              const utc_days = excelDateNumber - 25569;
              const utc_value = utc_days * 86400;
              const date_info = new Date(utc_value * 1000);
              const correctYear = date_info.getUTCFullYear();
              const correctMonth = String(date_info.getUTCMonth() + 1).padStart(2, '0');
              const correctDay = String(date_info.getUTCDate()).padStart(2, '0');
              return `${correctMonth}/${correctDay}/${correctYear}`;
         }
     } else {
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${month}/${day}/${year}`;
     }
  }

  // Handle 'DD-Mon-YY' format specifically as a fallback
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [day, monthStr, yearAbbr] = parts;
    const monthMap: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    const month = monthMap[monthStr];
    if (month && day && yearAbbr) {
        const year = `20${yearAbbr}`;
        return `${month}/${String(day).padStart(2, '0')}/${year}`;
    }
  }
  
  return dateStr; // Return original if all parsing fails
};

/**
 * Maps a single row of raw data to the TransformedData structure.
 * @param row An array of strings representing a single row from the input grid.
 * @returns A TransformedData object.
 */
const mapRowToTransformedData = (row: string[]): TransformedData => {
  const model = (row[5] || '').trim();
  const productNumberMatch = model.match(/\(([^)]+)\)/);
  const netUnitPrice = Number(row[17]) || 0;
  const currency = (row[21] || '').trim();
  const clientName = (row[9] || '').trim();
  const voucherNo = (row[1] || '').trim();
  const imei = (row[0] || '').trim();
  const dateStr = (row[2] || '').trim();


  return {
    lenovoProductNumber: productNumberMatch ? productNumberMatch[1].trim() : '',
    invoiceDate: formatDate(dateStr),
    quantity: Math.abs(Number(row[14])) || 1, // Default to 1 if empty or invalid
    buyerId: clientName,
    invoiceNumber: voucherNo,
    serialNumberBarcode: imei,
    unitBPReportedPrice: netUnitPrice,
    totalBPReportedRev: netUnitPrice,
    localCurrency: currency.toLowerCase() === 'dollar' ? 'USD' : currency,
    mcnContractNumber: '',
    comment: '',
    buyerName: clientName,
  };
};

/**
 * Transforms the entire grid of raw data into an array of structured TransformedData objects.
 * @param gridData A 2D array of strings from the input grid.
 * @returns An array of TransformedData objects.
 */
export const transformDataLocally = (gridData: string[][]): TransformedData[] => {
    const isRowEmpty = (row: string[]) => row.every(cell => !cell || cell.trim() === '');
    
    if (!gridData) {
        return [];
    }
    
    return gridData
        .filter(row => !isRowEmpty(row))
        .map(mapRowToTransformedData);
};