


export type OrderDateRangePreset = 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter' | 'thisYear' | 'all' | 'custom';
export type SalesDateRangePreset = 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter' | 'thisYear' | 'all' | 'custom';


export interface Order {
  salesOrder: string;
  mtm: string;
  modelName: string;
  specification: string;
  qty: number;
  fobUnitPrice: number;
  landingCostUnitPrice: number;
  orderValue: number;
  factoryToSgp: string;
  status: string;
  ShipDate: string | null;
  dateIssuePI: string | null;
  eta: string | null;
  actualArrival: string | null;
  isDelayedProduction: boolean;
  isDelayedTransit: boolean;
  isAtRisk: boolean;
  deliveryNumber: string | null;
}

export interface FilterOptions {
  mtms: string[];
  factoryToSgps: string[];
  statuses: string[];
  years: string[];
  quarters: string[];
}

export interface OrderDataResponse {
  orders: Order[];
  filterOptions: FilterOptions;
  timestamp: string;
}

// --- New Sale Types ---

export interface Sale {
  invoiceDate: string | null;
  quantity: number;
  buyerId: string;
  buyerName: string;
  invoiceNumber: string;
  serialNumber: string;
  modelName: string;
  lenovoProductNumber: string;
  segment: string;
  unitPrice: number;
  totalRevenue: number;
  localCurrency: string;
}

export interface SaleFilterOptions {
  quarters: string[];
  segments: string[];
  buyers: string[];
  years: string[];
}

export interface SaleDataResponse {
  sales: Sale[];
  filterOptions: SaleFilterOptions;
  timestamp: string;
}

// --- Cross-Dashboard Types ---
export type DashboardType = 'orders' | 'sales';
export type ViewType = 'orders' | 'sales' | 'overview' | 'inventory' | 'customers' | 'strategic' | 'backorders' | 'promotions' | 'profile' | 'add-orders' | 'data-transformer' | 'price-list' | 'serialization' | 'rebates' | 'rebate-validation' | 'shipments' | 'profit-reconciliation' | 'accessory-costs' | 'tasks' | 'landed-cost-analysis' | 'order-vs-sale';

export type StockStatusFilter = 'all' | 'oversold' | 'otw' | 'healthy' | 'lowStock' | 'outOfStock' | 'noSales' | 'critical';

export type ReconDateRangePreset = 'last4w' | 'last8w' | 'last90' | 'last180' | 'thisYear' | 'all' | 'custom';

export type TaskSortOption = 'createdAt' | 'dueDate' | 'priority';
export type TaskSortDirection = 'asc' | 'desc';

// --- Centralized Local Filters ---
export interface LocalFiltersState {
    orderSearchTerm: string;
    orderShow: 'all' | 'overdue' | 'delayedProduction' | 'delayedTransit' | 'atRisk' | 'onSchedule';
    orderFactoryStatus: string[];
    orderLocalStatus: string[];
    orderDateRangePreset: OrderDateRangePreset;
    orderYear: string;
    orderQuarter: string;
    orderStartDate: string | null;
    orderEndDate: string | null;

    salesSearchTerm: string;
    salesSegment: string[];
    salesBuyer: string[];
    salesDateRangePreset: SalesDateRangePreset;
    salesYear: string;
    salesQuarter: string;
    salesStartDate: string | null;
    salesEndDate: string | null;
    salesRevenueMin: number | null;
    salesRevenueMax: number | null;
    salesBuyerRegion: string;
    
    inventorySearchTerm: string;
    stockStatus: StockStatusFilter;
    customerSearchTerm: string;
    customerTier: CustomerTier[];
    customerStatus: 'all' | 'new' | 'atRisk' | 'active';
    // Add customerMatrixQuadrant to filter customers by their matrix position (e.g., 'champions', 'atRisk') after clicking on the CustomerValueMatrix chart.
    customerMatrixQuadrant: 'champions' | 'highSpenders' | 'loyal' | 'atRisk' | null;
    strategicSearchTerm: string;
    strategicCustomerTier: CustomerTier[];
    backorderSearchTerm: string;
    backorderPriority: 'all' | 'High' | 'Medium' | 'Low';
    promotionsSearchTerm: string;
    promotionsPriority: 'all' | PromotionCandidate['priority'];
    // Add promotionsSegment to filter promotions by customer segment after clicking on the SegmentRevenueChart.
    promotionsSegment: string | null;
    priceListSearchTerm: string;
    priceListStockStatus: 'all' | 'inStock' | 'outOfStock' | 'lowStock';
    rebateSearchTerm: string;
    rebateStatus: 'all' | RebateProgram['status'];
    rebateUpdateStatus: string;
    shipmentSearchTerm: string;
    shipmentStatus: ('Transit CN > SG' | 'Transit SG > KH' | 'Arrived' | 'Delayed' | 'Upcoming')[];
    profitReconSearchTerm: string;
    profitReconStatus: 'all' | ReconciledSale['status'] | 'Issues';

    // Order vs Sale Reconciliation Filters
    orderVsSaleSearchTerm: string;
    orderVsSaleStatus: 'all' | 'Matched' | 'Unsold';
    orderVsSaleSegment: string[];
    
    // Task Filters
    taskSearchTerm: string;
    taskStatus: TaskStatus[];
    taskSortBy: TaskSortOption;
    taskSortDir: TaskSortDirection;
    taskQuickFilter: 'all' | 'dueThisWeek';
}

// --- Inventory Types ---
export interface InventoryItemYearlyBreakdown {
    year: string;
    shippedQty: number;
    soldQty: number;
    netChange: number;
}

export interface InventoryItem {
    mtm: string;
    modelName: string;
    totalShippedQty: number;
    totalSoldQty: number;
    totalArrivedQty: number;
    totalSerializedQty: number;
    totalArrivedSerializedQty: number;
    totalOtwSerializedQty: number;
    onHandQty: number; // physical, serialized, unsold, ARRIVED stock
    unaccountedStockQty: number; // theoretical arrived - onHand
    otwQty: number;
    onHandValue: number;
    otwValue: number;
    averageLandingCost: number;
    averageFobCost: number;
    yearlyBreakdown: InventoryItemYearlyBreakdown[];
    weeklyRunRate?: number;
    weeksOfInventory?: number | null;
    monthlyRunRate?: number;
    monthsOfInventory?: number | null;
    daysSinceLastSale?: number | null;
    lastArrivalDate?: string | null;
    daysSinceLastArrival?: number | null;
    timestamp: string;
    totalProfit?: number;
    profitMargin?: number;
}

// --- Customer Types ---
export type CustomerTier = 'Platinum' | 'Gold' | 'Silver' | 'Bronze';

export interface Customer {
    id: string;
    name: string;
    totalRevenue: number;
    totalUnits: number;
    invoiceCount: number;
    lastPurchaseDate: string | null;
    firstPurchaseDate: string | null;
    tier?: CustomerTier;
    sales: Sale[];
    // Calculated fields
    daysSinceLastPurchase: number;
    isNew: boolean;
    isAtRisk: boolean;
    timestamp: string;
}

// --- Strategic Sales Types ---
export interface SalesOpportunity {
    id: string; // "customerId-mtm"
    customerId: string;
    customerName: string;
    customerTier?: CustomerTier;
    mtm: string;
    modelName: string;
    inStockQty: number;
    otwQty: number;
    averageLandingCost: number;
    surplusStockValue: number;
    customerPastUnits: number;
    customerLastPurchaseDate: string | null;
    opportunityScore?: number;
    timestamp: string;
}

export interface CustomerSalesOpportunity {
    customerId: string;
    customerName: string;
    customerTier?: CustomerTier;
    opportunities: SalesOpportunity[];
    totalOpportunityValue: number;
    customerOpportunityScore: number;
    opportunityCount: number;
}

export interface TopOpportunity {
    customerName: string;
    customerTier: CustomerTier;
    modelName: string;
    mtm: string;
    reasoning: string;
}

export interface AISalesBriefingData {
    overallStrategy: string;
    topOpportunities: TopOpportunity[];
    recommendedTactic: string;
}


// --- Backorder Analysis Types ---
export interface BackorderRecommendation {
    mtm: string;
    modelName: string;
    priority: 'High' | 'Medium' | 'Low';
    priorityScore: number;
    recentSalesUnits: number; // 90-day total
    estimatedBackorderValue: number;
    firstOrderDate: string | null;
    inStockQty: number;
    averageLandingCost: number;
    // New detailed fields for richer analysis
    salesTrend: 'Increasing' | 'Decreasing' | 'Stable';
    affectedCustomers: number;
    salesLast30Days: number;
    timestamp: string;
}

// --- Promotions Planner Types ---
export interface HistoricalHolidaySalesAnalysis {
    totalRevenue: number;
    topSegments: { name: string; revenue: number }[];
    dailySales: { date: string; revenue: number }[];
    surplusItems: { mtm: string; modelName: string; inStockQty: number; historicalSales: number }[];
}

export interface Campaign {
    id: number;
    title: string;
    targetAudience: string;
    coreOffer: string;
    upsellSuggestion: string;
    marketingAngle: string;
    sampleCopy: string;
    fullText: string;
}

export interface CampaignBrief {
    event: string;
    theme: string;
    targetProducts: string;
    launchWindow: string;
    harmonizationNote: string;
}

export interface QuarterlyPlan {
    quarter: string;
    strategicFocus: string;
    campaigns: CampaignBrief[];
}

export interface AnnualStrategy {
    overarchingTheme: string;
    quarterlyPlans: QuarterlyPlan[];
}

export interface PromotionCandidate {
    mtm: string;
    modelName: string;
    inStockQty: number;
    otwQty: number;
    inStockValue: number;
    otwValue: number;
    weeksOfInventory: number | null;
    daysSinceLastSale: number | null;
    priority: 'Urgent' | 'Recommended' | 'Pre-Launch' | 'Optional';
    reasoning: string;
    timestamp: string;
}

export interface PromotionPlan {
    // Sheet columns
    'No.'?: number;
    'Activity plan': string;
    'User Price': number;
    'New SRP': number;
    'Warranty': string;
    'Brand': string;
    'Type': string;
    'Status': string;
    'Purpose': string;
    'Target Audience': string;
    'Remark': string;
    'Deadline': string; // DD-MMM-YY
    'Note - Marketing': string;
    'Support': string;

    // Meta fields for app logic
    unique_id: string;
    timestamp: string;
    mtm: string;
}

// --- KPI Data Types ---
export interface OrderKpiData {
    totalLandingCostValue: number;
    totalFobValue: number;
    openUnits: number;
    delayedOrdersCount: number;
    totalOrders: number;
    totalUnits: number;
    backlogValue: number;
    atRiskOrdersCount: number;
    averageLeadTime: number;
    onTimeArrivalRate: number;
    onTimeEligibleCount: number;
    averageFobPrice: number;
    averageLandingCost: number;
    uniqueOrderCount: number;
    avgOrderValue: number;
}

export interface SalesKpiData {
    totalRevenue: number;
    totalUnits: number;
    invoiceCount: number;
    averageSalePricePerUnit: number;
    averageRevenuePerInvoice: number;
    uniqueBuyersCount: number;
    averageGrossMargin: number;
    totalProfit: number;
}

// --- Auth Types ---
export interface AuthUser {
  email: string;
  name: string;
  role: 'Admin' | 'Marketing' | string;
}

// --- Task Management Types ---
export type TaskStatus = 'Planning' | 'In Progress' | 'Done' | 'Canceled' | 'Paused' | 'Backlog';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
    id: string; // Corresponds to unique_id in sheet
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    createdAt: string; // ISO date string
    updatedAt: string; // ISO date string, from 'timestamp' column in sheet
    completedAt: string | null; // ISO date string
    user_email: string;
    startDate?: string | null;
    dueDate?: string | null;
    dependencies?: string[] | null;
    icon?: string; // e.g., an emoji '🌐'
    progress?: number; // 0-100
}

// --- PSREF Lookup Types ---
export interface PsrefData {
  modelName: string;
  summary: string;
}

// --- Data Transformer Types ---
export interface TransformedData {
  lenovoProductNumber: string;
  invoiceDate: string;
  quantity: number;
  buyerId: string;
  invoiceNumber: string;
  serialNumberBarcode: string;
  unitBPReportedPrice: number;
  totalBPReportedRev: number;
  localCurrency: string;
  mcnContractNumber: string;
  comment: string;
  buyerName: string;
}

// --- Price List Types ---
export interface PriceListItem {
  mtm: string;
  modelName: string;
  salesOrder: string;
  color: string;
  description: string;
  sdp: number;
  srp: number;
}

// --- Serialization Types ---
export interface SerializedItem {
  salesOrder: string;
  mtm: string;
  serialNumber: string;
  fullSerializedString: string;
  timestamp: string;
}

// --- Rebate Program Types ---
export interface RebateProgram {
  program: string;
  lenovoQuarter: string;
  startDate: string | null;
  endDate: string | null;
  rebateEarned: number | null;
  status: 'Open' | 'Close';
  update: string;
  creditNo: string | null;
  creditNoteFile: string | null;
  remark: string | null;
  duration: number | null;
  perUnit: number | null;
}

export interface RebateKpiData {
    totalEarned: number;
    openPrograms: number;
    pendingPayment: number;
    totalPendingValue: number;
}

export interface RebateDetail {
  programCode: string;
  mtm: string;
  startDate: string | null;
  endDate: string | null;
  programMax: number | null;
  programReportedLPH: number | null;
  perUnit: number | null;
}

export interface RebateSale {
  mtm: string;
  rebateInvoiceDate: string | null;
  quantity: number;
  buyerId: string;
  invoiceNumber: string;
  serialNumber: string;
  unitBPReportedPrice: number;
}

// --- Shipment Types ---
export interface Shipment {
  arrivalDate: string | null;
  salesOrder: string;
  mtm: string;
  packingList: string;
  quantity: number;
  shippingCost: number;
  modelCode: string;
  kgs: number;
  portion: string;
  totalKgsOnDate: number;
  packingListDate: string | null;
  deliveryDate: string | null;
  eta: string | null;
}

export interface AugmentedShipmentGroup {
    packingList: string;
    items: (Shipment & {modelName: string})[];
    packingListDate: string | null;
    eta: string | null;
    arrivalDate: string | null;
    totalQuantity: number;
    totalCost: number;
    totalFobValue: number;
    totalKgsOnDate: number;
    status: 'Arrived' | 'Transit SG > KH' | 'Transit CN > SG' | 'Delayed' | 'Upcoming';
    progress: {
        percentage: number;
        totalDuration: number;
        elapsed: number;
        isComplete: boolean;
        etaPercentage: number | null;
    };
    delayDays: number;
    source?: 'shipment' | 'order';
}

// --- Accessory Cost Types ---
export interface AccessoryCost {
  so: string;
  mtm: string;
  backpackCost: number;
}

// --- Profit Reconciliation Types ---
export interface RebateBreakdown {
    programCode: string;
    perUnitAmount: number;
}

export interface ReconciledSale {
    invoiceDate: string | null;
    invoiceNumber: string;
    buyerName: string;
    serialNumber: string;
    mtm: string;
    modelName: string;
    unitSalePrice: number;
    salesOrder: string;
    fobCost: number | null;
    shippingCost: number | null;
    accessoryCost: number | null;
    landingCost: number | null;
    rebateDetails: RebateBreakdown[] | null;
    rebateApplied: number | null;
    netCost: number | null;
    unitProfit: number | null;
    profitMargin: number | null;
    status: 'Matched' | 'No Rebate' | 'Cost Missing' | 'Partially Costed' | 'No Order Match';
}

export interface ProfitabilityKpiData {
    totalProfit: number;
    averageMargin: number;
    totalRebatesApplied: number;
    salesWithRebates: number;
    salesMissingCost: number;
}