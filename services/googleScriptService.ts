import type { Order, OrderDataResponse, FilterOptions, Sale, SaleDataResponse, SaleFilterOptions, AuthUser, PriceListItem, SerializedItem, RebateProgram, RebateDetail, RebateSale, Shipment, AccessoryCost, Task, TaskStatus, TaskPriority } from '../types';
import { 
    ORDER_SHEET_URL, SALE_SHEET_URL, AUTH_SHEET_URL, PRICE_LIST_SHEET_URL, SERIALIZATION_SHEET_URL, REBATE_SHEET_URL, REBATE_DETAIL_SHEET_URL, REBATE_SALES_SHEET_URL, SHIPMENT_SHEET_URL, BACKPACK_COST_SHEET_URL,
    SOURCE_DATA_APPS_SCRIPT_URL, DERIVED_DATA_APPS_SCRIPT_URL,
    INVENTORY_SHEET_NAME, CUSTOMER_SHEET_NAME, SALES_OPPORTUNITIES_SHEET_NAME, BACKORDER_ANALYSIS_SHEET_NAME,
    PROMOTION_CANDIDATES_SHEET_NAME, MARKETING_PLANS_SHEET_NAME,
    TASKS_SHEET_URL, TASKS_SHEET_NAME
} from '../constants';

/**
 * Custom error for invalid Google Sheet GID.
 */
export class GidError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GidError';
    }
}


/**
 * A robust UTC date parser that handles multiple common date formats (YYYY-MM-DD, MM/DD/YYYY, DD-Mon-YYYY)
 * and always returns a Date object representing midnight UTC for that date. This avoids timezone-related
 * off-by-one errors by not using the ambiguous `new Date(string)` constructor.
 * @param dateString - The string representation of the date.
 * @returns A Date object set to midnight UTC, or null if parsing fails.
 */
function safeParseDate(dateString: string | undefined): Date | null {
    if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') return null;
    
    const dateOnlyString = dateString.trim().split('T')[0];

    // 1. Try YYYY-MM-DD format (ISO)
    let match = dateOnlyString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
        const [, year, month, day] = match.map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        if (!isNaN(date.getTime()) && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
            return date;
        }
    }

    // 2. Try MM/DD/YYYY format
    match = dateOnlyString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        const [, month, day, year] = match.map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        if (!isNaN(date.getTime()) && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
            return date;
        }
    }
    
    // 3. Try DD-Mon-YYYY format, e.g., 1-Jul-2025
    const monthMap: { [key: string]: number } = {
      JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
      JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
    };
    match = dateOnlyString.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/i); // Case-insensitive month
    if (match) {
        const day = parseInt(match[1], 10);
        const monthStr = match[2].toUpperCase();
        const year = parseInt(match[3], 10);
        const month = monthMap[monthStr];
        if (month !== undefined) {
            const date = new Date(Date.UTC(year, month, day));
            if (!isNaN(date.getTime()) && date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
                return date;
            }
        }
    }

    // No fallback to `new Date()` to avoid ambiguity and timezone issues.
    console.warn(`Could not parse date with any known format: "${dateString}"`);
    return null;
};


/**
 * A robust CSV parser that handles quoted fields containing commas and escaped quotes ("").
 * It now correctly parses the header row with the same logic as data rows.
 * @param csvText The raw CSV string data.
 * @returns An array of objects, where each object represents a row.
 */
const parseCSV = (csvText: string): Record<string, string>[] => {
  const lines = csvText.replace(/\r/g, '').trim().split('\n');
  if (lines.length < 2) return [];
  
  lines[0] = lines[0].replace(/^\uFEFF/, '');

  // Regex to handle quoted fields with commas and escaped quotes
  const regex = /(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g;

  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let match;
    regex.lastIndex = 0; // Reset regex state for each new line
    while ((match = regex.exec(line))) {
      let value = match[1];
      if (value.startsWith('"') && value.endsWith('"')) {
        // Unescape double quotes ("") and remove the surrounding quotes
        value = value.slice(1, -1).replace(/""/g, '"');
      }
      values.push(value.trim());
    }
    return values;
  }

  const headers = parseLine(lines[0]);

  return lines.slice(1).map(line => {
    if (!line.trim()) return null; // Skip empty lines in the CSV

    const values = parseLine(line);

    const rowObject: Record<string, string> = {};
    headers.forEach((header, i) => {
      rowObject[header] = values[i] || '';
    });
    return rowObject;
  }).filter(row => row !== null) as Record<string, string>[];
};


/**
 * Processes the raw, parsed CSV data into the structured format required by the application.
 * This replicates the business logic from the original Google Apps Script backend.
 * @param rawData An array of row objects from the parsed CSV.
 * @returns A structured `OrderDataResponse`.
 */
const processOrderData = (rawData: Record<string, string>[]): OrderDataResponse => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const orders: Order[] = rawData
      .map(row => {
        const get = (headerName: string) => row[headerName];

        const qty = parseInt(get('Shipping Quantity'), 10) || 0;
        const fobUnitPrice = parseFloat(String(get('Unit Price')).replace(/[^0-9.-]+/g, '')) || 0;
        const landingCostUnitPrice = parseFloat(String(get('Add on Unit Price')).replace(/[^0-9.-]+/g, '')) || 0;

        const shipDate = safeParseDate(get('Schedule ship date'));
        const dateIssuePI = safeParseDate(get('Order Receipt Date'));
        const actualArrivalDate = safeParseDate(get('Actual Arrival'));
        const etaDate = safeParseDate(get('ETA'));
        const factoryStatus = String(get('Status to SGP') || 'Unknown').trim();
        const sgpToKhStatus = String(get('Status to KH') || 'Unknown').trim();
        const deliveryNumber = String(get('Delivery Number') || '').trim();

        // New, more granular health status logic, optimized for terminal/hold statuses
        const hasStatusShipped = factoryStatus === 'Shipped';
        const hasStatusDelivered = factoryStatus === 'Delivered';
        const hasLeftFactory = hasStatusShipped || hasStatusDelivered;
        
        // Exclude cancelled or on-hold orders from being flagged as delayed or at-risk
        const isActionable = factoryStatus !== 'Cancelled' && factoryStatus !== 'Customer Action';

        const isDelayedProduction = isActionable && !hasLeftFactory && !!shipDate && shipDate < today && !actualArrivalDate;
        
        // A transit delay can only happen if it's actively 'Shipped' (not 'Delivered') and past its ETA.
        const isDelayedTransit = isActionable && hasStatusShipped && !!etaDate && etaDate < today && !actualArrivalDate; 
        
        // An order is at risk if its ship date is today or past, it hasn't left the factory, and isn't already flagged as delayed.
        const isAtRisk = isActionable && !hasLeftFactory && !isDelayedProduction && !!shipDate && shipDate <= today && !actualArrivalDate;
        
        return {
          productLine: String(get('Product Line') || 'N/A').trim(),
          salesOrder: String(get('Sales Order Number') || 'N/A').trim(),
          mtm: String(get('Product ID') || 'N/A').trim(),
          modelName: String(get('Model Name') || 'N/A').trim(),
          specification: String(get('Specification') || 'N/A').trim(),
          qty,
          fobUnitPrice,
          landingCostUnitPrice,
          orderValue: qty * fobUnitPrice,
          factoryToSgp: factoryStatus,
          status: sgpToKhStatus,
          ShipDate: shipDate ? shipDate.toISOString().split('T')[0] : null,
          dateIssuePI: dateIssuePI ? dateIssuePI.toISOString().split('T')[0] : null,
          eta: etaDate ? etaDate.toISOString().split('T')[0] : null,
          actualArrival: actualArrivalDate ? actualArrivalDate.toISOString().split('T')[0] : null,
          isDelayedProduction,
          isDelayedTransit,
          isAtRisk,
          segment: 'N/A',
          deliveryNumber: deliveryNumber || null,
        };
      })
      .filter(order => {
        // Filter out empty/invalid sales orders
        if (!order.salesOrder || order.salesOrder === 'N/A' || order.salesOrder === '') {
          return false;
        }
        return true;
      });

    const dataYears = Array.from(new Set(orders
      .map(o => o.dateIssuePI ? new Date(o.dateIssuePI).getUTCFullYear() : null)
      .filter((y): y is number => y !== null)))
      .sort((a, b) => b - a)
      .map(String);
      
    const quartersFromDates = Array.from(new Set(orders
        .map(o => {
            if (!o.dateIssuePI) return null;
            const month = new Date(o.dateIssuePI).getUTCMonth(); // 0-11
            const quarter = Math.floor(month / 3) + 1;
            return `Q${quarter}`;
        })
        .filter((q): q is string => q !== null)
    )).sort();

    const filterOptions: FilterOptions = {
      productLines: [...new Set(orders.map(o => o.productLine))].sort(),
      mtms: [...new Set(orders.map(o => o.mtm))].sort(),
      factoryToSgps: [...new Set(orders.map(o => o.factoryToSgp))].sort(),
      statuses: [...new Set(orders.map(o => o.status))].sort(),
      years: dataYears,
      quarters: quartersFromDates,
    };

    return {
      orders,
      filterOptions,
      timestamp: new Date().toISOString(),
    };
};

/**
 * Processes the raw, parsed CSV sales data into the structured format required by the application.
 * @param rawData An array of row objects from the parsed CSV.
 * @returns A structured `SaleDataResponse`.
 */
const processSaleData = (rawData: Record<string, string>[]): SaleDataResponse => {
    const sales: Sale[] = rawData
      .map(row => {
        const get = (headerName: string) => row[headerName];
        
        const quantity = parseInt(get('Quantity'), 10) || 0;
        const totalRevenue = parseFloat(String(get('Total BP Reported Rev')).replace(/[^0-9.-]+/g, '')) || 0;
        const unitPrice = parseFloat(String(get('Unit BP Reported Price')).replace(/[^0-9.-]+/g, '')) || 0;
        const invoiceDate = safeParseDate(get('Invoice Date'));

        return {
          invoiceDate: invoiceDate ? invoiceDate.toISOString().split('T')[0] : null,
          quantity,
          buyerId: String(get('Buyer ID') || 'N/A').trim(),
          buyerName: String(get('Buyer Name') || 'N/A').trim(),
          invoiceNumber: String(get('Invoice Number') || 'N/A').trim().toUpperCase(),
          serialNumber: String(get('Serial Number / Barcode') || 'N/A').trim().toUpperCase(),
          modelName: String(get('Model Name') || 'N/A').trim(),
          lenovoProductNumber: String(get('Lenovo Product Number') || 'N/A').trim().toUpperCase(),
          segment: String(get('Segment') || 'N/A').trim(),
          unitPrice,
          totalRevenue,
          localCurrency: String(get('Local Currency') || 'N/A').trim(),
          productLine: 'N/A',
        };
      })
      .filter(sale => sale.invoiceNumber && sale.invoiceNumber !== 'N/A' && sale.invoiceNumber !== '' && sale.serialNumber && sale.serialNumber !== 'N/A');

    const dataYears = Array.from(new Set(sales
      .map(s => s.invoiceDate ? new Date(s.invoiceDate).getUTCFullYear() : null)
      .filter((y): y is number => y !== null)))
      .sort((a, b) => b - a)
      .map(String);
      
    const quartersFromDates = Array.from(new Set(sales
        .map(s => {
            if (!s.invoiceDate) return null;
            const month = new Date(s.invoiceDate).getUTCMonth(); // 0-11
            const quarter = Math.floor(month / 3) + 1;
            return `Q${quarter}`;
        })
        .filter((q): q is string => q !== null)
    )).sort();

    const filterOptions: SaleFilterOptions = {
      quarters: quartersFromDates,
      segments: [...new Set(sales.map(s => s.segment))].filter(s => s && s !== 'N/A').sort(),
      buyers: [...new Set(sales.map(s => s.buyerName))].filter(b => b && b !== 'N/A').sort(),
      years: dataYears,
    };

    return {
      sales,
      filterOptions,
      timestamp: new Date().toISOString(),
    };
};


/**
 * Processes the raw, parsed CSV auth data.
 * @param rawData An array of row objects from the parsed CSV.
 * @returns An array of AuthUser objects.
 */
const processAuthData = (rawData: Record<string, string>[]): (AuthUser & { password: string })[] => {
    return rawData.map(row => ({
        email: String(row['email'] || '').trim(),
        password: String(row['password'] || '').trim(),
        name: String(row['Name'] || 'User').trim(),
        role: String(row['Role'] || row['role'] || 'Admin').trim() as 'Admin' | 'Marketing' | string,
    })).filter(user => user.email && user.password);
};


/**
 * Processes the raw, parsed CSV price list data into a structured format.
 * @param rawData An array of row objects from the parsed CSV.
 * @returns An array of PriceListItem objects.
 */
const processPriceListData = (rawData: Record<string, string>[]): PriceListItem[] => {
    return rawData
      .map(row => {
        const get = (headerName: string) => row[headerName];
        
        const sdp = parseFloat(String(get('SDP')).replace(/[^0-9.-]+/g, '')) || 0;
        const srp = parseFloat(String(get('SRP')).replace(/[^0-9.-]+/g, '')) || 0;

        return {
          mtm: String(get('MTM') || 'N/A').trim(),
          modelName: String(get('Model Name') || 'N/A').trim(),
          salesOrder: String(get('SO') || 'N/A').trim(),
          color: String(get('Color') || 'N/A').trim(),
          description: String(get('Description') || 'N/A').trim(),
          sdp,
          srp,
        };
      })
      .filter(item => item.mtm && item.mtm !== 'N/A' && item.mtm !== '');
};

/**
 * Processes the raw, parsed CSV serialization data into a structured format.
 * @param rawData An array of row objects from the parsed CSV.
 * @returns An array of SerializedItem objects.
 */
const processSerializationData = (rawData: Record<string, string>[]): SerializedItem[] => {
    return rawData
      .map(row => {
        const get = (headerName: string) => row[headerName];
        return {
          salesOrder: String(get('SO') || 'N/A').trim(),
          mtm: String(get('MTM') || 'N/A').trim(),
          serialNumber: String(get('SN') || 'N/A').trim().toUpperCase(),
          fullSerializedString: String(get('Serialization') || 'N/A').trim().toUpperCase(),
          timestamp: String(get('Timestamp') || new Date().toISOString()).trim(),
        };
      })
      .filter(item => item.fullSerializedString && item.fullSerializedString !== 'N/A' && item.fullSerializedString !== '');
};

/**
 * Processes the raw, parsed CSV rebate programs data into a structured format.
 * @param rawData An array of row objects from the parsed CSV.
 * @returns An array of RebateProgram objects.
 */
const processRebateData = (rawData: Record<string, string>[]): RebateProgram[] => {
    return rawData
      .map(row => {
        const get = (headerName: string) => row[headerName];
        
        const rebateEarnedStr = String(get('Rebate Earned')).replace(/[^0-9.-]+/g, '');
        const rebateEarned = rebateEarnedStr ? parseFloat(rebateEarnedStr) : null;
        
        const durationStr = get('Program Duration');
        const duration = durationStr ? parseInt(durationStr, 10) : null;

        const startDate = safeParseDate(get('Program Start Date'));
        const endDate = safeParseDate(get('Program End Date'));
        
        const perUnitStr = String(get('Per Unit')).replace(/[^0-9.-]+/g, '');
        const perUnit = perUnitStr ? parseFloat(perUnitStr) : null;

        return {
          program: get('Program'),
          lenovoQuarter: get('Lenovo Quarter'),
          startDate: startDate ? startDate.toISOString().split('T')[0] : null,
          endDate: endDate ? endDate.toISOString().split('T')[0] : null,
          rebateEarned,
          status: get('Status') as 'Open' | 'Close',
          update: get('Update'),
          creditNo: get('Credit No.') || null,
          creditNoteFile: get('Credit Note') || null,
          remark: get('Remark') || null,
          duration: !isNaN(duration!) ? duration : null,
          perUnit: !isNaN(perUnit!) ? perUnit : null,
        };
      })
      .filter(item => item.program && item.program !== 'N/A');
};

/**
 * Processes the raw, parsed CSV rebate detail data into a structured format.
 * @param rawData An array of row objects from the parsed CSV.
 * @returns An array of RebateDetail objects.
 */
const processRebateDetailData = (rawData: Record<string, string>[]): RebateDetail[] => {
    return rawData
      .map(row => {
        const get = (headerName: string) => row[headerName];
        
        const programMaxStr = String(get('Program Max')).replace(/[^0-9.-]+/g, '');
        const programMax = programMaxStr ? parseFloat(programMaxStr) : null;

        const programReportedLPHStr = String(get('Program Reported (LPH)')).replace(/[^0-9.-]+/g, '');
        const programReportedLPH = programReportedLPHStr ? parseFloat(programReportedLPHStr) : null;
        
        const perUnitStr = String(get('Per Unit')).replace(/[^0-9.-]+/g, '');
        const perUnit = perUnitStr ? parseFloat(perUnitStr) : null;

        const startDate = safeParseDate(get('Start Date'));
        const endDate = safeParseDate(get('End Date'));

        return {
          programCode: get('Program Code'),
          mtm: get('MTM').trim().toUpperCase(),
          startDate: startDate ? startDate.toISOString().split('T')[0] : null,
          endDate: endDate ? endDate.toISOString().split('T')[0] : null,
          programMax,
          programReportedLPH,
          perUnit,
        };
      })
      .filter(item => item.programCode && item.mtm);
};

/**
 * Processes the raw, parsed CSV rebate sales data into a structured format.
 * @param rawData An array of row objects from the parsed CSV.
 * @returns An array of RebateSale objects.
 */
const processRebateSaleData = (rawData: Record<string, string>[]): RebateSale[] => {
    return rawData
      .map(row => {
        const get = (headerName: string) => row[headerName];
        
        const quantity = parseInt(get('rebateQuantity'), 10) || 0;
        const unitBPReportedPrice = parseFloat(String(get('rebateUnit BP Reported Price')).replace(/[^0-9.-]+/g, '')) || 0;
        const rebateInvoiceDate = safeParseDate(get('rebateInvoiceDate'));

        return {
          mtm: String(get('rebateMTM') || '').trim().toUpperCase(),
          rebateInvoiceDate: rebateInvoiceDate ? rebateInvoiceDate.toISOString().split('T')[0] : null,
          quantity: quantity,
          buyerId: String(get('rebateBuyer ID') || '').trim(),
          invoiceNumber: String(get('rebateInvoice Number') || '').trim().toUpperCase(),
          serialNumber: String(get('rebateSerial Number') || '').trim().toUpperCase(),
          unitBPReportedPrice: unitBPReportedPrice,
        };
      })
      .filter(item => item.mtm && item.invoiceNumber && item.serialNumber);
};

/**
 * Processes raw, parsed CSV shipment data into a structured format.
 * @param rawData An array of row objects from the parsed CSV.
 * @returns An array of Shipment objects.
 */
const processShipmentData = (rawData: Record<string, string>[]): Shipment[] => {
    // Ensure all required headers are present in each row object to prevent errors from missing columns in the sheet.
    const requiredHeaders = [
        'ShippedQTY', 'ShippedShipping/pc', 'Shipment Arrival Date', 'ShippedKGS',
        'ShippedTotal KG on Date', 'ShippedDate of Packing list', 'ShippedDelivery Date',
        'ShippedEstimated Time of Arrival', 'ShippedSales Order Number', 'ShippedMTM',
        'ShippedPacking List Number', 'ShippedModel Code', 'ShippedPortion'
    ];

    const sanitizedData = rawData.map(row => {
        const newRow = { ...row };
        requiredHeaders.forEach(header => {
            if (!Object.prototype.hasOwnProperty.call(newRow, header)) {
                newRow[header] = ''; // Add missing header with an empty string value
            }
        });
        return newRow;
    });

    return sanitizedData
      .map(row => {
        const get = (headerName: string) => row[headerName];
        
        const quantity = parseInt(get('ShippedQTY'), 10) || 0;
        const shippingCost = parseFloat(String(get('ShippedShipping/pc')).replace(/[^0-9.-]+/g, '')) || 0;
        const arrivalDate = safeParseDate(get('Shipment Arrival Date'));
        
        const kgs = parseFloat(get('ShippedKGS')) || 0;
        const totalKgsOnDate = parseFloat(get('ShippedTotal KG on Date')) || 0;
        const packingListDate = safeParseDate(get('ShippedDate of Packing list'));
        const deliveryDate = safeParseDate(get('ShippedDelivery Date'));
        const eta = safeParseDate(get('ShippedEstimated Time of Arrival'));

        return {
          arrivalDate: arrivalDate ? arrivalDate.toISOString().split('T')[0] : null,
          salesOrder: String(get('ShippedSales Order Number') || 'N/A').trim(),
          mtm: String(get('ShippedMTM') || 'N/A').trim(),
          packingList: String(get('ShippedPacking List Number') || 'N/A').trim(),
          quantity,
          shippingCost,
          modelCode: String(get('ShippedModel Code') || 'N/A').trim(),
          kgs,
          portion: String(get('ShippedPortion') || 'N/A').trim(),
          totalKgsOnDate,
          packingListDate: packingListDate ? packingListDate.toISOString().split('T')[0] : null,
          deliveryDate: deliveryDate ? deliveryDate.toISOString().split('T')[0] : null,
          eta: eta ? eta.toISOString().split('T')[0] : null,
        };
      })
      .filter(shipment => shipment.salesOrder && shipment.salesOrder !== 'N/A');
};

/**
 * Processes the raw, parsed CSV backpack cost data into a structured format.
 * @param rawData An array of row objects from the parsed CSV.
 * @returns An array of AccessoryCost objects.
 */
const processBackpackCostData = (rawData: Record<string, string>[]): AccessoryCost[] => {
    return rawData
      .map(row => {
        const get = (headerName: string) => row[headerName];
        
        const backpackCost = parseFloat(String(get('bBackpack')).replace(/[^0-9.-]+/g, '')) || 0;

        return {
          so: String(get('bSO') || 'N/A').trim(),
          mtm: String(get('bMTM') || 'N/A').trim(),
          backpackCost,
        };
      })
      .filter(item => item.so && item.so !== 'N/A' && item.mtm && item.mtm !== 'N/A');
};

/**
 * Processes the raw, parsed CSV task data into a structured format.
 * @param rawData An array of row objects from the parsed CSV.
 * @returns An array of Task objects.
 */
const processTaskData = (rawData: Record<string, string>[]): Task[] => {
    const get = (row: Record<string, string>, headerName: string): string => {
        const normalize = (str: string) => str.toLowerCase().replace(/[\s_#]/g, '');
        const normalizedHeaderName = normalize(headerName);
        for (const key in row) {
            const normalizedKey = normalize(key);
            if (normalizedKey === normalizedHeaderName) {
                return row[key];
            }
        }
        return '';
    };

    const parseDateToISO = (dateStr: string): string | null => {
      const parsed = safeParseDate(dateStr);
      return parsed ? parsed.toISOString().split('T')[0] : null;
    }

    const getValidStatus = (statusStr: string): TaskStatus => {
        const validStatuses: TaskStatus[] = ['Planning', 'In Progress', 'Done', 'Canceled', 'Paused', 'Backlog'];
        if (statusStr === 'Todo') {
            return 'Planning';
        }
        if (validStatuses.includes(statusStr as TaskStatus)) {
            return statusStr as TaskStatus;
        }
        return 'Planning';
    };

    const getValidPriority = (priorityStr: string): TaskPriority => {
        const validPriorities: TaskPriority[] = ['Low', 'Medium', 'High'];
        if (validPriorities.includes(priorityStr as TaskPriority)) {
            return priorityStr as TaskPriority;
        }
        return 'Medium';
    };

    return rawData.map(row => {
        const status = getValidStatus(get(row, 'status'));
        const priority = getValidPriority(get(row, 'priority'));

        return {
            id: String(get(row, 'uniqueId') || '').trim(),
            title: String(get(row, 'title') || 'Untitled Task').trim(),
            description: String(get(row, 'description') || '').trim(),
            status: status,
            priority: priority,
            createdAt: parseDateToISO(get(row, 'createdAt')) || new Date().toISOString(),
            updatedAt: parseDateToISO(get(row, 'timestamp')) || new Date().toISOString(),
            completedAt: parseDateToISO(get(row, 'completedAt')),
            user_email: String(get(row, 'userEmail') || '').trim(),
            startDate: parseDateToISO(get(row, 'startDate')),
            dueDate: parseDateToISO(get(row, 'dueDate')),
            dependencies: String(get(row, 'dependencies') || '').trim() ? String(get(row, 'dependencies')).split(',').map(d => d.trim()) : null,
            icon: String(get(row, 'icon') || '📄').trim(),
            progress: parseInt(String(get(row, 'progress') || '0').trim(), 10) || 0,
        };
    }).filter(task => task.id);
};


/**
 * Creates and runs a one-shot web worker to process CSV data off the main thread.
 * @param csvText The raw CSV string.
 * @param type The type of data to process ('orders', 'sales', etc.).
 * @returns A promise that resolves with the processed data.
 */
const createAndRunWorker = <T>(csvText: string, type: 'orders' | 'sales' | 'auth' | 'price-list' | 'serialization' | 'rebates' | 'rebate-details' | 'rebate-sales' | 'shipments' | 'backpack-costs'): Promise<T> => {
    return new Promise((resolve, reject) => {
        const workerLogic = `
            const safeParseDate = ${safeParseDate.toString()};
            const parseCSV = ${parseCSV.toString()};
            const processOrderData = ${processOrderData.toString()};
            const processSaleData = ${processSaleData.toString()};
            const processAuthData = ${processAuthData.toString()};
            const processPriceListData = ${processPriceListData.toString()};
            const processSerializationData = ${processSerializationData.toString()};
            const processRebateData = ${processRebateData.toString()};
            const processRebateDetailData = ${processRebateDetailData.toString()};
            const processRebateSaleData = ${processRebateSaleData.toString()};
            const processShipmentData = ${processShipmentData.toString()};
            const processBackpackCostData = ${processBackpackCostData.toString()};
            const processTaskData = ${processTaskData.toString()};

            self.onmessage = (event) => {
                const { type, csvText } = event.data;
                try {
                    const rawData = parseCSV(csvText);
                    let result;
                    if (type === 'orders') {
                        result = processOrderData(rawData);
                    } else if (type === 'sales') {
                        result = processSaleData(rawData);
                    } else if (type === 'auth') {
                        result = processAuthData(rawData);
                    } else if (type === 'price-list') {
                        result = processPriceListData(rawData);
                    } else if (type === 'serialization') {
                        result = processSerializationData(rawData);
                    } else if (type === 'rebates') {
                        result = processRebateData(rawData);
                    } else if (type === 'rebate-details') {
                        result = processRebateDetailData(rawData);
                    } else if (type === 'rebate-sales') {
                        result = processRebateSaleData(rawData);
                    } else if (type === 'shipments') {
                        result = processShipmentData(rawData);
                    } else if (type === 'backpack-costs') {
                        result = processBackpackCostData(rawData);
                    } else {
                        throw new Error('Unknown data type for worker');
                    }
                    self.postMessage({ success: true, data: result });
                } catch (error) {
                    self.postMessage({ success: false, error: error.message });
                } finally {
                    self.close();
                }
            };
        `;

        const blob = new Blob([workerLogic], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);

        worker.onmessage = (event) => {
            URL.revokeObjectURL(workerUrl);
            const { success, data, error } = event.data;
            if (success) {
                resolve(data as T);
            } else {
                reject(new Error(error));
            }
        };

        worker.onerror = (error) => {
            URL.revokeObjectURL(workerUrl);
            reject(new Error(`Worker error: ${error.message}`));
        };

        worker.postMessage({ type, csvText });
    });
};

/**
 * Fetches sheet data, then passes it to a worker for processing.
 */
const fetchAndProcessData = async <T>(url: string, type: 'orders' | 'sales' | 'auth' | 'price-list' | 'serialization' | 'rebates' | 'rebate-details' | 'rebate-sales' | 'shipments' | 'backpack-costs'): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    if ((type === 'serialization') && response.status === 400) {
        const errorMsg = `Could not fetch ${type} data (HTTP 400). This is likely due to an invalid GID in the sheet URL in constants.ts. Please check the GID and update it.`;
        console.warn(errorMsg);
        throw new GidError(errorMsg);
    }
    throw new Error(`Failed to fetch sheet data for ${type}: ${response.status} ${response.statusText}`);
  }
  const csvText = await response.text();
  return createAndRunWorker<T>(csvText, type);
};


// --- Order Data Functions ---

/**
 * Retrieves order data from the public Google Sheet.
 */
export const getOrderData = (): Promise<OrderDataResponse> => {
  return fetchAndProcessData<OrderDataResponse>(ORDER_SHEET_URL, 'orders');
};

/**
 * Forces a refresh of the order data by fetching it again with a cache-busting parameter.
 */
export const forceRefreshOrders = (): Promise<OrderDataResponse> => {
  const url = new URL(ORDER_SHEET_URL);
  url.searchParams.set('_cacheBust', Date.now().toString());
  return fetchAndProcessData<OrderDataResponse>(url.toString(), 'orders');
};


// --- Sale Data Functions ---

/**
 * Retrieves sales data from the public Google Sheet.
 */
export const getSaleData = (): Promise<SaleDataResponse> => {
  return fetchAndProcessData<SaleDataResponse>(SALE_SHEET_URL, 'sales');
};

/**
 * Forces a refresh of the sales data by fetching it again with a cache-busting parameter.
 */
export const forceRefreshSales = (): Promise<SaleDataResponse> => {
  const url = new URL(SALE_SHEET_URL);
  url.searchParams.set('_cacheBust', Date.now().toString());
  return fetchAndProcessData<SaleDataResponse>(url.toString(), 'sales');
};


// --- Auth Data Functions ---
/**
 * Retrieves user authentication data from the public Google Sheet.
 * This should only be called once.
 */
export const getAuthData = (): Promise<(AuthUser & { password: string })[]> => {
  return fetchAndProcessData<(AuthUser & { password: string })[]>(AUTH_SHEET_URL, 'auth');
};

// --- Price List Data Functions ---
/**
 * Retrieves price list data from the public Google Sheet.
 */
export const getPriceListData = (): Promise<PriceListItem[]> => {
  return fetchAndProcessData<PriceListItem[]>(PRICE_LIST_SHEET_URL, 'price-list');
};

// --- Serialization Data Functions ---
/**
 * Retrieves serialization data from the public Google Sheet.
 */
export const getSerializationData = (): Promise<SerializedItem[]> => {
  return fetchAndProcessData<SerializedItem[]>(SERIALIZATION_SHEET_URL, 'serialization');
};

/**
 * Forces a refresh of the serialization data.
 */
export const forceRefreshSerialization = (): Promise<SerializedItem[]> => {
  const url = new URL(SERIALIZATION_SHEET_URL);
  url.searchParams.set('_cacheBust', Date.now().toString());
  return fetchAndProcessData<SerializedItem[]>(url.toString(), 'serialization');
};

// --- Rebate Data Functions ---
/**
 * Retrieves rebate programs data from the public Google Sheet.
 */
export const getRebateData = (): Promise<RebateProgram[]> => {
  return fetchAndProcessData<RebateProgram[]>(REBATE_SHEET_URL, 'rebates');
};

/**
 * Forces a refresh of the rebate programs data.
 */
export const forceRefreshRebates = (): Promise<RebateProgram[]> => {
  const url = new URL(REBATE_SHEET_URL);
  url.searchParams.set('_cacheBust', Date.now().toString());
  return fetchAndProcessData<RebateProgram[]>(url.toString(), 'rebates');
};

// --- Rebate Detail Data Functions ---
/**
 * Retrieves rebate detail data from the public Google Sheet.
 */
export const getRebateDetailData = (): Promise<RebateDetail[]> => {
  return fetchAndProcessData<RebateDetail[]>(REBATE_DETAIL_SHEET_URL, 'rebate-details');
};

/**
 * Forces a refresh of the rebate detail data.
 */
export const forceRefreshRebateDetails = (): Promise<RebateDetail[]> => {
  const url = new URL(REBATE_DETAIL_SHEET_URL);
  url.searchParams.set('_cacheBust', Date.now().toString());
  return fetchAndProcessData<RebateDetail[]>(url.toString(), 'rebate-details');
};

// --- Rebate Sales Data Functions ---
/**
 * Retrieves rebate sales data from the public Google Sheet.
 */
export const getRebateSaleData = (): Promise<RebateSale[]> => {
  return fetchAndProcessData<RebateSale[]>(REBATE_SALES_SHEET_URL, 'rebate-sales');
};

/**
 * Forces a refresh of the rebate sales data.
 */
export const forceRefreshRebateSales = (): Promise<RebateSale[]> => {
  const url = new URL(REBATE_SALES_SHEET_URL);
  url.searchParams.set('_cacheBust', Date.now().toString());
  return fetchAndProcessData<RebateSale[]>(url.toString(), 'rebate-sales');
};

// --- Shipment Data Functions ---
/**
 * Retrieves shipment data from the public Google Sheet.
 */
export const getShipmentData = (): Promise<Shipment[]> => {
  return fetchAndProcessData<Shipment[]>(SHIPMENT_SHEET_URL, 'shipments');
};

/**
 * Forces a refresh of the shipment data.
 */
export const forceRefreshShipments = (): Promise<Shipment[]> => {
  const url = new URL(SHIPMENT_SHEET_URL);
  url.searchParams.set('_cacheBust', Date.now().toString());
  return fetchAndProcessData<Shipment[]>(url.toString(), 'shipments');
};

// --- Backpack Cost Data Functions ---
/**
 * Retrieves backpack cost data from the public Google Sheet.
 */
export const getBackpackCostData = (): Promise<AccessoryCost[]> => {
  return fetchAndProcessData<AccessoryCost[]>(BACKPACK_COST_SHEET_URL, 'backpack-costs');
};

/**
 * Forces a refresh of the backpack cost data.
 */
export const forceRefreshBackpackCostData = (): Promise<AccessoryCost[]> => {
  const url = new URL(BACKPACK_COST_SHEET_URL);
  url.searchParams.set('_cacheBust', Date.now().toString());
  return fetchAndProcessData<AccessoryCost[]>(url.toString(), 'backpack-costs');
};

// --- Task Data Functions ---
/**
 * Retrieves task data from the public Google Sheet via Apps Script.
 */
export const getTasksData = async (): Promise<Task[]> => {
  const rawData: any[] = await readSheetData({ sheetType: TASKS_SHEET_NAME });
  return processTaskData(rawData);
};


// --- Data Update Functions ---

// Map sheet names to the keys expected by the Apps Script `sheetConfig` object.
// This handles cases where components pass the full sheet name instead of the key.
const sheetNameToKeyMap: Record<string, string> = {
    [INVENTORY_SHEET_NAME]: 'INVENTORY',
    [CUSTOMER_SHEET_NAME]: 'CUSTOMERS',
    [SALES_OPPORTUNITIES_SHEET_NAME]: 'OPPORTUNITIES',
    [BACKORDER_ANALYSIS_SHEET_NAME]: 'BACKORDERS',
    [PROMOTION_CANDIDATES_SHEET_NAME]: 'PROMOTIONS',
    [MARKETING_PLANS_SHEET_NAME]: 'PLANS',
    [TASKS_SHEET_NAME]: 'TASKS',
};

const SOURCE_DATA_WRITABLE_SHEETS = ['orders', 'price-list', 'serialization'];
const DERIVED_DATA_WRITABLE_SHEETS = Object.values(sheetNameToKeyMap).concat(Object.keys(sheetNameToKeyMap));

function getAppScriptUrl(sheetType: string): string {
    let url: string | undefined;

    if (SOURCE_DATA_WRITABLE_SHEETS.includes(sheetType)) {
        url = SOURCE_DATA_APPS_SCRIPT_URL;
        if (!url || url.trim() === '') {
            throw new Error("Source Data Apps Script URL is not configured in constants.ts. Please add your script's deployment URL.");
        }
    } else if (DERIVED_DATA_WRITABLE_SHEETS.includes(sheetType)) {
        url = DERIVED_DATA_APPS_SCRIPT_URL;
        if (!url || url.trim() === '') {
            throw new Error("Derived Data Apps Script URL is not configured in constants.ts. Please deploy the script for the derived data sheet and add the URL.");
        }
    } else {
        throw new Error(`No Apps Script URL configured for sheetType: ${sheetType}`);
    }
    
    if (url.includes('/dev')) {
        console.warn(`The Apps Script URL for ${sheetType} appears to be a development URL ('/dev'). These URLs do not work for cross-origin requests. Please use the production deployment URL ('/exec').`);
        throw new Error(`The Apps Script URL for ${sheetType} is a development URL. Please use the production deployment ('/exec') URL.`);
    }

    if (!url.startsWith('https://')) {
        throw new Error(`The Apps Script URL for ${sheetType} seems to be invalid. Please ensure it starts with 'https://'.`);
    }

    return url;
}


const postToGoogleScript = async (url: string, payload: any) => {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));
    
    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            body: formData,
        });
    } catch (error) {
        // This block catches network errors (e.g., DNS, CORS, connectivity)
        console.error("Network error during fetch to Google Apps Script:", error);
        if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
            throw new Error('A network error occurred. This could be a CORS issue, an ad blocker, or a problem with your connection or the Apps Script URL/deployment.');
        }
        throw new Error(`An unexpected network error occurred: ${(error as Error).message}`);
    }

    // This block handles the HTTP response itself
    if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Could not read error body.');
        console.error(`Google Apps Script responded with HTTP status ${response.status}. Response: ${errorBody}`);
        throw new Error(`The Google Sheet backend responded with an error (Status: ${response.status}). Please check the Apps Script logs for more details.`);
    }

    const resultText = await response.text();

    if (!resultText && response.ok) {
        console.warn('Received an empty response from Google Apps Script. Assuming success due to potential redirect handling.');
        return { status: 'success', data: { message: 'Request sent; response was empty.' }};
    }
    
    let result;
    try {
        result = JSON.parse(resultText);
    } catch (e) {
        console.error("Non-JSON response from Apps Script:", resultText);
        // This is a critical error. The script URL is likely wrong or there's a major script error.
        throw new Error(`The Google Sheet backend returned an invalid response. This often happens if there's an error within the Apps Script code itself.`);
    }

    if (result.status === 'error') {
        console.error("Error message from Apps Script:", result.message);
        throw new Error(result.message);
    }

    return result;
};


/**
 * Reads data from a Google Sheet via an Apps Script endpoint.
 * @param payload An object containing the sheet type.
 */
export const readSheetData = async (payload: { sheetType: string; }) => {
    const url = getAppScriptUrl(payload.sheetType);
    const sheetKey = sheetNameToKeyMap[payload.sheetType] || payload.sheetType;
    
    // The result from a read action is the data array itself.
    const result = await postToGoogleScript(url, {
        action: 'read',
        sheetType: sheetKey,
    });

    return result.data;
};


/**
 * Posts updated data to a Google Apps Script endpoint to save changes back to the sheet.
 * @param payload An object containing the sheet type, an identifier for the row, and the updates.
 */
export const updateSheetData = async (payload: { sheetType: string; identifier: any; updates: any; }) => {
    const url = getAppScriptUrl(payload.sheetType);
    const sheetKey = sheetNameToKeyMap[payload.sheetType] || payload.sheetType;
    
    return postToGoogleScript(url, {
        action: 'update',
        sheetType: sheetKey,
        data: {
            identifier: payload.identifier,
            updates: payload.updates
        }
    });
};

/**
 * Appends new rows of data to a Google Sheet via an Apps Script endpoint.
 * @param payload An object containing the sheet type and an array of new data objects.
 */
export const appendSheetData = async (payload: { sheetType: string; data: any[] }) => {
    const url = getAppScriptUrl(payload.sheetType);
    const sheetKey = sheetNameToKeyMap[payload.sheetType] || payload.sheetType;
    
    return postToGoogleScript(url, {
        action: 'append',
        sheetType: sheetKey,
        data: payload.data,
    });
};

/**
 * Overwrites an entire sheet with new data. The Apps Script should handle clearing the sheet first.
 * @param payload An object containing the sheet type and an array of new data objects.
 */
export const overwriteSheetData = async (payload: { sheetType: string; data: any[] }) => {
    const url = getAppScriptUrl(payload.sheetType);
    const sheetKey = sheetNameToKeyMap[payload.sheetType] || payload.sheetType;
    
    return postToGoogleScript(url, {
        action: 'overwrite',
        sheetType: sheetKey,
        data: payload.data,
    });
};

/**
 * Deletes a row from a sheet based on a unique identifier.
 * @param payload An object containing the sheet type and an identifier object.
 */
export const deleteSheetData = async (payload: { sheetType: string; identifier: any; }) => {
    const url = getAppScriptUrl(payload.sheetType);
    const sheetKey = sheetNameToKeyMap[payload.sheetType] || payload.sheetType;
    
    return postToGoogleScript(url, {
        action: 'delete',
        sheetType: sheetKey,
        data: {
            identifier: payload.identifier,
        }
    });
};