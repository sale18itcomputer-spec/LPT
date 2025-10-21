



import type { LocalFiltersState, OrderDateRangePreset, SalesDateRangePreset, TaskSortDirection, TaskSortOption } from './types';

// --- SOURCE DATA SHEETS ---
// These sheets contain the raw, primary data for the application.

// The unique identifier for the Google Sheet containing Orders, Auth, Price List, etc.
const SOURCE_DATA_SHEET_ID = '1_MC0BhvzSw5aUBCPg_E79leRNLtuYqXzAq9FqJcSao8';

// The unique identifier for the Google Sheet containing Sales data.
const SALE_DATA_SHEET_ID = '1kChB8LQL1gSN4z0i7B3auFeDIPQjNIRg3sU9Qjrze9k';

// GIDs for source data sheets
const ORDER_SHEET_GID = '1014064883';
const SALE_SHEET_GID = '635779953';
const AUTH_SHEET_GID = '620392387';
const PRICE_LIST_SHEET_GID = '1153899190';
const SERIALIZATION_SHEET_GID = '910322864';
const SHIPMENT_SHEET_GID = '1106423559';
const BACKPACK_COST_SHEET_GID = '1544765639';

// Export URLs for fetching source data
export const ORDER_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SOURCE_DATA_SHEET_ID}/export?format=csv&gid=${ORDER_SHEET_GID}`;
export const SALE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SALE_DATA_SHEET_ID}/export?format=csv&gid=${SALE_SHEET_GID}`;
export const AUTH_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SOURCE_DATA_SHEET_ID}/export?format=csv&gid=${AUTH_SHEET_GID}`;
export const PRICE_LIST_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SOURCE_DATA_SHEET_ID}/export?format=csv&gid=${PRICE_LIST_SHEET_GID}`;
export const SERIALIZATION_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SOURCE_DATA_SHEET_ID}/export?format=csv&gid=${SERIALIZATION_SHEET_GID}`;
export const SHIPMENT_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SOURCE_DATA_SHEET_ID}/export?format=csv&gid=${SHIPMENT_SHEET_GID}`;
export const BACKPACK_COST_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SOURCE_DATA_SHEET_ID}/export?format=csv&gid=${BACKPACK_COST_SHEET_GID}`;

const REBATE_DATA_SHEET_ID = '1MzF6aF3AxM-1sVEGTeZbQ-gCOg0iILGNTDUSTTIn39s';
const REBATE_SHEET_GID = '929148045';
export const REBATE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${REBATE_DATA_SHEET_ID}/export?format=csv&gid=${REBATE_SHEET_GID}`;
const REBATE_DETAIL_SHEET_GID = '977360267';
export const REBATE_DETAIL_SHEET_URL = `https://docs.google.com/spreadsheets/d/${REBATE_DATA_SHEET_ID}/export?format=csv&gid=${REBATE_DETAIL_SHEET_GID}`;
const REBATE_SALES_SHEET_GID = '2067551802';
export const REBATE_SALES_SHEET_URL = `https://docs.google.com/spreadsheets/d/${REBATE_DATA_SHEET_ID}/export?format=csv&gid=${REBATE_SALES_SHEET_GID}`;


// --- DERIVED DATA & APP STATE SHEET ---
// This sheet is used for writing derived data (like inventory summaries) and application state (like tasks).
const DERIVED_DATA_SHEET_ID = '1gQN-8uc8KCHoSBDhVsQf2VPWYU0owWQz-JGv37FpaBE';

// --- GIDs for Derived Data Sheets ---
// IMPORTANT: Replace these placeholder GIDs with the actual GIDs from your Google Sheet.
// You can find the GID in the URL of your sheet (e.g., .../edit#gid=123456789).
const INVENTORY_SHEET_GID = '0'; // From user-provided link
const CUSTOMER_SHEET_GID = '1682448477';
const SALES_OPPORTUNITIES_SHEET_GID = '992865761';
const BACKORDER_ANALYSIS_SHEET_GID = '1704816691';
const PROMOTION_CANDIDATES_SHEET_GID = '668597009';
const MARKETING_PLANS_SHEET_GID = '1689947721';
const TASKS_SHEET_GID = '828910771';


export const TASKS_SHEET_URL = `https://docs.google.com/spreadsheets/d/${DERIVED_DATA_SHEET_ID}/export?format=csv&gid=${TASKS_SHEET_GID}`;

// --- GOOGLE APPS SCRIPT ---

/**
 * The deployment URL for the Google Apps Script that writes to the SOURCE data sheet
 * (e.g., updating orders, price list, serialization).
 */
export const SOURCE_DATA_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzBn-NG8ryHWcOYrqC-9g00oI4AcbLKmFIZWNQmTngnVBkA2KvX5UioI0DerA68pulY1Q/exec';

/**
 * The deployment URL for the Google Apps Script that writes to the DERIVED data sheet
 * (e.g., inventory summaries, tasks, marketing plans).
 *
 * IMPORTANT: Deploy the Code.gs script to your derived data sheet (1gQN...) and paste the Web App URL here.
 */
export const DERIVED_DATA_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEfcmOpVTi9HwKaAc6Gg_vP0OhuYwdfvxo9rnE1piBRVIKqrUG8bXb0cfvvbpIzYxr7Q/exec';


// --- SHEET NAMES (for Apps Script) ---

// Sheet names used as identifiers for writing data back via Apps Script.
// These MUST match the names of the sheet tabs in your derived data Google Sheet.
export const INVENTORY_SHEET_NAME = 'Inventory Summary';
export const CUSTOMER_SHEET_NAME = 'Customer Summary';
export const SALES_OPPORTUNITIES_SHEET_NAME = 'Sales Opportunities';
export const BACKORDER_ANALYSIS_SHEET_NAME = 'Backorder Analysis';
export const PROMOTION_CANDIDATES_SHEET_NAME = 'Promotion Candidates';
export const MARKETING_PLANS_SHEET_NAME = 'Marketing Plans';
export const TASKS_SHEET_NAME = 'Tasks';


// --- APP CONSTANTS ---
// FIX: Changed type from Omit<LocalFiltersState, 'taskQuickFilter'> to LocalFiltersState and added the missing property.
export const INITIAL_LOCAL_FILTERS: LocalFiltersState = {
    orderSearchTerm: '',
    orderShow: 'all',
    orderProductLine: [],
    orderFactoryStatus: [],
    orderLocalStatus: [],
    orderDateRangePreset: 'thisYear' as OrderDateRangePreset,
    orderYear: 'all',
    orderQuarter: 'all',
    orderStartDate: null,
    orderEndDate: null,

    salesSearchTerm: '',
    // FIX: Added salesProductLine to the initial filter state.
    salesProductLine: [],
    salesSegment: [],
    salesBuyer: [],
    salesDateRangePreset: 'thisYear' as SalesDateRangePreset,
    salesYear: 'all',
    salesQuarter: 'all',
    salesStartDate: null,
    salesEndDate: null,
    
    inventorySearchTerm: '',
    inventoryProductLine: 'all',
    stockStatus: 'all',
    customerSearchTerm: '',
    customerTier: [],
    customerStatus: 'all',
    strategicSearchTerm: '',
    strategicCustomerTier: [],
    backorderSearchTerm: '',
    backorderPriority: 'all',
    promotionsSearchTerm: '',
    promotionsPriority: 'all',
    promotionsProductLine: 'all',
    priceListSearchTerm: '',
    priceListProductLine: 'all',
    priceListStockStatus: 'all',
    rebateSearchTerm: '',
    rebateStatus: 'all',
    rebateUpdateStatus: 'all',
    shipmentSearchTerm: '',
    shipmentStatus: [],
    profitReconSearchTerm: '',
    profitReconStatus: 'all',

    // Order vs Sale Reconciliation Filters
    orderVsSaleSearchTerm: '',
    orderVsSaleProductLine: [],
    orderVsSaleStatus: 'all',
    orderVsSaleSegment: [],
    
    // Task Filters
    taskSearchTerm: '',
    taskStatus: [],
    taskSortBy: 'createdAt' as TaskSortOption,
    taskSortDir: 'asc' as TaskSortDirection,
    taskQuickFilter: 'all',
};