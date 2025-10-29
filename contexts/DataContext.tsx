import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode, useEffect } from 'react';
import type { 
    Order, Sale, InventoryItem, Customer, 
    BackorderRecommendation, CustomerSalesOpportunity, CustomerTier, SalesOpportunity, 
    InventoryItemYearlyBreakdown, OrderKpiData, SalesKpiData, PromotionCandidate, SerializedItem,
    RebateProgram, RebateKpiData, RebateDetail, RebateSale, Shipment, ReconciledSale, ProfitabilityKpiData,
    AccessoryCost, RebateBreakdown, PriceListItem, AugmentedShipmentGroup,
    FilterOptions, SaleFilterOptions
} from '../types';
import { useOrderData } from '../hooks/useOrderData';
import { useSaleData } from '../hooks/useSaleData';
import { useSerializationData } from '../hooks/useSerializationData';
import { useRebateData } from '../hooks/useRebateData';
import { useRebateDetailData } from '../hooks/useRebateDetailData';
import { useRebateSaleData } from '../hooks/useRebateSaleData';
import { useShipmentData } from '../hooks/useShipmentData';
import { useBackpackCostData } from '../hooks/useBackpackCostData';
import { usePriceListData } from '../hooks/usePriceListData';
import { 
    calculateInventoryStatus, getFirstOrderDates, getSalesMetricsByMtm, analyzeBackorderCandidates, analyzePromotionCandidates
} from '../utils/dataProcessing';
import { overwriteSheetData } from '../services/googleScriptService';
import { 
    INVENTORY_SHEET_NAME, CUSTOMER_SHEET_NAME, SALES_OPPORTUNITIES_SHEET_NAME, 
    BACKORDER_ANALYSIS_SHEET_NAME, PROMOTION_CANDIDATES_SHEET_NAME 
} from '../constants';

const useSheetSync = (sheetType: string, data: any[]) => {
    const stringifiedData = JSON.stringify(data); // Use stringified data as dependency to detect deep changes

    useEffect(() => {
        if (data.length === 0) return;

        // Debounce the sync and add a random stagger to avoid simultaneous requests on load
        const randomStagger = Math.random() * 2000; // 0 to 2 seconds
        const handler = setTimeout(() => {
            console.log(`Syncing ${data.length} items to ${sheetType}...`);
            overwriteSheetData({ sheetType, data })
                .catch(err => {
                    // The new postToGoogleScript function will throw a more user-friendly error.
                    // We log it here for debugging. The user might not see this directly, but it helps.
                    console.error(`Failed to sync sheet '${sheetType}'. Error:`, (err as Error).message);
                });
        }, 5000 + randomStagger);

        return () => clearTimeout(handler);
    }, [stringifiedData, sheetType]); // Re-run effect only when data content actually changes
};

interface DataContextType {
    // Status
    isLoading: boolean;
    isRefreshing: boolean;
    error: string | null; // Critical errors
    serializationError: string | null; // Non-critical serialization error
    lastUpdated: string | null;
    handleGlobalRefresh: () => void;
    // Base Data
    allOrders: Order[];
    allSales: Sale[];
    allSerializedItems: SerializedItem[];
    allShipments: Shipment[];
    allBackpackCosts: AccessoryCost[];
    allPriceListItems: PriceListItem[];
    // KPIs
    orderKpiData?: OrderKpiData;
    salesKpiData?: SalesKpiData;
    totalOrderCount: number;
    allInvoicesCount: number;
    // Derived Data
    inventoryData: InventoryItem[];
    customerData: Customer[];
    backorderRecommendations: BackorderRecommendation[];
    customerOpportunities: CustomerSalesOpportunity[];
    promotionCandidates: PromotionCandidate[];
    newModelMtms: Set<string>;
    salesMetricsByMtm: Map<string, { last30: number; prev30: number; total90: number; affectedCustomers: Set<string>; }>;
    allShipmentGroups: AugmentedShipmentGroup[];
    // Rebates
    allRebates: RebateProgram[];
    rebateKpiData: RebateKpiData;
    allRebateDetails: RebateDetail[];
    allRebateSales: RebateSale[];
    // Filter Options
    orderFilterOptions: FilterOptions;
    salesFilterOptions: SaleFilterOptions;
    // Reconciliation
    reconciledSales: ReconciledSale[];
    profitabilityKpiData: ProfitabilityKpiData;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

/**
 * A robust UTC date parser that handles multiple common date formats (YYYY-MM-DD, MM/DD/YYYY, DD-Mon-YYYY)
 * and always returns a Date object representing midnight UTC for that date. This ensures comparisons are
 * based on pure dates, ignoring time and timezone, fulfilling the inclusive date range requirement.
 * @param dateString - The string representation of the date.
 * @returns A Date object set to midnight UTC, or null if parsing fails.
 */
const parseDateToUtc = (dateString: string | null | undefined): Date | null => {
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

interface CustomerAccumulator {
    id: string;
    name: string;
    totalRevenue: number;
    totalUnits: number;
    lastPurchaseDate: string | null;
    firstPurchaseDate: string | null;
    sales: Sale[];
    invoices: Set<string>;
}


export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    
    const { isLoading: isOrdersLoading, error: ordersError, allOrders: rawAllOrders, filterOptions: rawOrderFilterOptions, lastUpdated: ordersLastUpdated, handleRefresh: refreshOrders } = useOrderData();
    const { isLoading: isSalesLoading, error: salesError, allSales: rawAllSales, filterOptions: rawSalesFilterOptions, lastUpdated: salesLastUpdated, allInvoicesCount: rawAllInvoicesCount, handleRefresh: refreshSales } = useSaleData();
    const { isLoading: isSerializationLoading, error: serializationError, allSerializedItems, handleRefresh: refreshSerialization } = useSerializationData();
    const { isLoading: isRebatesLoading, error: rebatesError, allRebates, handleRefresh: refreshRebates } = useRebateData();
    const { isLoading: isRebateDetailsLoading, error: rebateDetailsError, allRebateDetails, handleRefresh: refreshRebateDetails } = useRebateDetailData();
    const { isLoading: isRebateSalesLoading, error: rebateSalesError, allRebateSales, handleRefresh: refreshRebateSales } = useRebateSaleData();
    const { isLoading: isShipmentsLoading, error: shipmentsError, allShipments, handleRefresh: refreshShipments } = useShipmentData();
    const { isLoading: isBackpackCostsLoading, error: backpackCostsError, allBackpackCosts, handleRefresh: refreshBackpackCosts } = useBackpackCostData();
    const { isLoading: isPriceListLoading, error: priceListError, data: rawPriceListItems, refreshData: refreshPriceList } = usePriceListData();
    const allPriceListItems = useMemo(() => rawPriceListItems.map(({ _uniqueId, ...rest }) => rest), [rawPriceListItems]);


    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleGlobalRefresh = useCallback(async () => {
      setIsRefreshing(true);
      await Promise.all([refreshOrders(), refreshSales(), refreshSerialization(), refreshRebates(), refreshRebateDetails(), refreshRebateSales(), refreshShipments(), refreshBackpackCosts(), refreshPriceList()]);
      setIsRefreshing(false);
    }, [refreshOrders, refreshSales, refreshSerialization, refreshRebates, refreshRebateDetails, refreshRebateSales, refreshShipments, refreshBackpackCosts, refreshPriceList]);

    const allOrders = rawAllOrders;
    const allSales = rawAllSales;
    
    const allInvoicesCount = useMemo(() => new Set(allSales.map(s => s.invoiceNumber)).size, [allSales]);
    
    const rebateKpiData = useMemo((): RebateKpiData => {
        if (!allRebates || allRebates.length === 0) {
            return { totalEarned: 0, openPrograms: 0, pendingPayment: 0, totalPendingValue: 0 };
        }
        
        const kpis = allRebates.reduce((acc, program) => {
            acc.totalEarned += program.rebateEarned ?? 0;
            if (program.status === 'Open') {
                acc.openPrograms++;
            }
            if (program.update.toLowerCase().includes('pending')) {
                acc.pendingPayment++;
                acc.totalPendingValue += program.rebateEarned ?? 0;
            }
            return acc;
        }, { totalEarned: 0, openPrograms: 0, pendingPayment: 0, totalPendingValue: 0 });

        return kpis;
    }, [allRebates]);

    const { reconciledSales, profitabilityKpiData } = useMemo(() => {
        // Create lookup maps for efficient data linking.
        const serialToSerializedItemMap = new Map<string, SerializedItem>();
        allSerializedItems.forEach(item => {
            if (item.serialNumber) serialToSerializedItemMap.set(item.serialNumber.toUpperCase(), item);
            if (item.fullSerializedString) serialToSerializedItemMap.set(item.fullSerializedString.toUpperCase(), item);
        });

        // FIX: Explicitly type the Map to ensure correct type inference for `order` later.
        const soMtmToOrderMap = new Map<string, Order>((allOrders as Order[]).map((order: Order) => [`${order.salesOrder}-${order.mtm}`, order]));
        
        const shipmentCostMap = new Map<string, number>();
        allShipments.forEach(s => shipmentCostMap.set(`${s.salesOrder}-${s.mtm}`, s.shippingCost));

        const accessoryCostMap = new Map<string, number>();
        allBackpackCosts.forEach(a => accessoryCostMap.set(`${a.so}-${a.mtm}`, a.backpackCost));

        const rebateSalesBySerialMap = new Map<string, RebateSale>();
        allRebateSales.forEach(rebateSale => {
            if (rebateSale.serialNumber) rebateSalesBySerialMap.set(rebateSale.serialNumber.toUpperCase(), rebateSale);
        });
        
        const sales: ReconciledSale[] = (allSales as Sale[]).map(sale => {
            const serializedItem = serialToSerializedItemMap.get(sale.serialNumber.toUpperCase());
            const salesOrder = serializedItem?.salesOrder;
            const orderKey = salesOrder ? `${salesOrder}-${sale.lenovoProductNumber}` : '';
            const order = orderKey ? soMtmToOrderMap.get(orderKey) : undefined;
            
            const fobCost = order?.fobUnitPrice ?? null;
            const shippingCost = orderKey ? (shipmentCostMap.get(orderKey) ?? null) : null;
            const accessoryCost = orderKey ? (accessoryCostMap.get(orderKey) ?? null) : null;
            
            let landingCost: number | null = null;
            if (fobCost !== null) {
                landingCost = fobCost + (shippingCost ?? 0) + (accessoryCost ?? 0);
            }
            
            const matchingRebateSale = rebateSalesBySerialMap.get(sale.serialNumber.toUpperCase());
            const dateForRebateCheck = matchingRebateSale?.rebateInvoiceDate || sale.invoiceDate;

            const applicableRebateDetails = allRebateDetails.filter(detail => {
                if (detail.mtm !== sale.lenovoProductNumber || !dateForRebateCheck) {
                    return false;
                }
                
                const checkDate = parseDateToUtc(dateForRebateCheck);
                if (!checkDate) return false;

                const startDate = parseDateToUtc(detail.startDate);
                const endDate = parseDateToUtc(detail.endDate);

                // A program with no start and end date is not considered valid for matching.
                if (!startDate && !endDate) {
                    return false;
                }
                
                const checkTime = checkDate.getTime();
                
                const isAfterStart = !startDate || checkTime >= startDate.getTime();
                const isBeforeEnd = !endDate || checkTime <= endDate.getTime();
                
                return isAfterStart && isBeforeEnd;
            });
            
            const rebateDetailsBreakdown: RebateBreakdown[] = applicableRebateDetails.map(d => ({
                programCode: d.programCode,
                perUnitAmount: d.perUnit || 0
            }));

            const totalRebateApplied = rebateDetailsBreakdown.reduce((sum, detail) => sum + detail.perUnitAmount, 0);
            const netCost = (landingCost !== null) ? landingCost - totalRebateApplied : null;
            const unitProfit = (netCost !== null) ? sale.unitPrice - netCost : null;
            const profitMargin = (unitProfit !== null && sale.unitPrice > 0) ? (unitProfit / sale.unitPrice) * 100 : null;
            
            let status: ReconciledSale['status'];
            if (!order) {
                status = 'No Order Match';
            } else if (fobCost === null) {
                status = 'Cost Missing';
            } else if (shippingCost === null || accessoryCost === null) {
                status = 'Partially Costed';
            } else if (applicableRebateDetails.length > 0) {
                status = 'Matched';
            } else {
                status = 'No Rebate';
            }
            
            return {
                invoiceDate: matchingRebateSale?.rebateInvoiceDate || sale.invoiceDate,
                invoiceNumber: sale.invoiceNumber,
                buyerName: sale.buyerName,
                serialNumber: sale.serialNumber,
                mtm: sale.lenovoProductNumber,
                modelName: sale.modelName,
                unitSalePrice: sale.unitPrice,
                salesOrder: salesOrder || 'N/A',
                fobCost,
                shippingCost,
                accessoryCost,
                landingCost,
                rebateDetails: rebateDetailsBreakdown.length > 0 ? rebateDetailsBreakdown : null,
                rebateApplied: totalRebateApplied > 0 ? totalRebateApplied : null,
                netCost: netCost,
                unitProfit: unitProfit,
                profitMargin: profitMargin,
                status: status,
            };
        });

        const kpis = sales.reduce((acc, sale) => {
            if (sale.unitProfit !== null) {
                acc.totalProfit += sale.unitProfit;
                acc.totalRevenueForMargin += sale.unitSalePrice;
            }
            if (sale.rebateApplied !== null && sale.rebateApplied > 0) {
                acc.totalRebatesApplied += sale.rebateApplied;
                acc.salesWithRebates++;
            }
            if (['No Order Match', 'Cost Missing', 'Partially Costed'].includes(sale.status)) {
                acc.salesMissingCost++;
            }
            return acc;
        }, { totalProfit: 0, averageMargin: 0, totalRebatesApplied: 0, salesWithRebates: 0, totalRevenueForMargin: 0, salesMissingCost: 0 });
        
        kpis.averageMargin = kpis.totalRevenueForMargin > 0 ? (kpis.totalProfit / kpis.totalRevenueForMargin) * 100 : 0;
        
        const finalKpis: ProfitabilityKpiData = {
          totalProfit: kpis.totalProfit,
          averageMargin: kpis.averageMargin,
          totalRebatesApplied: kpis.totalRebatesApplied,
          salesWithRebates: kpis.salesWithRebates,
          salesMissingCost: kpis.salesMissingCost,
        };

        return { reconciledSales: sales, profitabilityKpiData: finalKpis };
    }, [allSales, allOrders, allSerializedItems, allRebateDetails, allRebateSales, allShipments, allBackpackCosts]);

    const orderKpiData = useMemo((): OrderKpiData | undefined => {
        // FIX: Cast `allOrders` to `Order[]` to resolve type inference issues with `reduce`.
        if ((allOrders as Order[]).length === 0) return undefined;
        const kpiAccumulator = (allOrders as Order[]).reduce((acc, order: Order) => {
            acc.totalOrders++; acc.totalUnits += order.qty; acc.totalLandingCostValue += order.landingCostUnitPrice * order.qty; acc.totalFobValue += order.orderValue; if (order.isDelayedProduction || order.isDelayedTransit) acc.delayedOrdersCount++; if (order.isAtRisk) acc.atRiskOrdersCount++; if (!order.actualArrival) { acc.openUnits += order.qty; acc.backlogValue += order.orderValue; }
            if (order.dateIssuePI && order.actualArrival) { const leadTime = (new Date(order.actualArrival).getTime() - new Date(order.dateIssuePI).getTime()) / (1000 * 60 * 60 * 24); if (leadTime >= 0) { acc.totalLeadTime += leadTime; acc.leadTimeOrderCount++; } }
            return acc;
        }, { totalLandingCostValue: 0, totalFobValue: 0, openUnits: 0, delayedOrdersCount: 0, totalOrders: 0, totalUnits: 0, backlogValue: 0, atRiskOrdersCount: 0, totalLeadTime: 0, leadTimeOrderCount: 0 });
        
        // FIX: Cast `allOrders` to `Order[]` to resolve type inference issues with `map`.
        const uniqueOrderCount = new Set((allOrders as Order[]).map(o => o.salesOrder)).size;
        const avgOrderValue = uniqueOrderCount > 0 ? kpiAccumulator.totalFobValue / uniqueOrderCount : 0;
        
        // FIX: Cast `allOrders` to `Order[]` to resolve type inference issues with `filter`.
        const onTimeEligibleOrders = (allOrders as Order[]).filter(o => o.eta && o.actualArrival);
        const onTimeArrivals = onTimeEligibleOrders.filter(o => o.actualArrival! <= o.eta!).length;
        
        return {
            totalLandingCostValue: kpiAccumulator.totalLandingCostValue, totalFobValue: kpiAccumulator.totalFobValue, openUnits: kpiAccumulator.openUnits, delayedOrdersCount: kpiAccumulator.delayedOrdersCount, totalOrders: kpiAccumulator.totalOrders, totalUnits: kpiAccumulator.totalUnits, backlogValue: kpiAccumulator.backlogValue, atRiskOrdersCount: kpiAccumulator.atRiskOrdersCount,
            averageLeadTime: kpiAccumulator.leadTimeOrderCount > 0 ? kpiAccumulator.totalLeadTime / kpiAccumulator.leadTimeOrderCount : 0, onTimeArrivalRate: onTimeEligibleOrders.length > 0 ? (onTimeArrivals / onTimeEligibleOrders.length) * 100 : 0, onTimeEligibleCount: onTimeEligibleOrders.length,
            averageFobPrice: kpiAccumulator.totalUnits > 0 ? kpiAccumulator.totalFobValue / kpiAccumulator.totalUnits : 0, averageLandingCost: kpiAccumulator.totalUnits > 0 ? kpiAccumulator.totalLandingCostValue / kpiAccumulator.totalUnits : 0,
            uniqueOrderCount,
            avgOrderValue,
        };
    }, [allOrders]);
    
    const salesKpiData = useMemo((): SalesKpiData | undefined => {
        // FIX: Cast `allSales` to `Sale[]` to resolve type inference issues.
        if ((allSales as Sale[]).length === 0) return undefined;
        const uniqueInvoices = new Set((allSales as Sale[]).map((s: Sale) => s.invoiceNumber));
        const kpi = (allSales as Sale[]).reduce((acc, sale: Sale) => {
            acc.totalRevenue += sale.totalRevenue;
            acc.totalUnits += sale.quantity;
            return acc;
        }, { totalRevenue: 0, totalUnits: 0, invoiceCount: 0, averageSalePricePerUnit: 0, averageRevenuePerInvoice: 0, uniqueBuyersCount: 0, averageGrossMargin: 0, totalProfit: 0 });

        kpi.invoiceCount = uniqueInvoices.size;
        kpi.averageSalePricePerUnit = kpi.totalUnits > 0 ? kpi.totalRevenue / kpi.totalUnits : 0;
        kpi.averageRevenuePerInvoice = kpi.invoiceCount > 0 ? kpi.totalRevenue / kpi.invoiceCount : 0;
        // FIX: Cast `allSales` to `Sale[]` to resolve type inference issues with `map`.
        kpi.uniqueBuyersCount = new Set((allSales as Sale[]).map((s: Sale) => s.buyerId)).size;
        const totalProfit = reconciledSales.reduce((sum, sale) => sum + (sale.unitProfit || 0), 0);
        kpi.totalProfit = totalProfit;
        kpi.averageGrossMargin = kpi.totalRevenue > 0 ? (totalProfit / kpi.totalRevenue) * 100 : 0;
        return kpi;
    }, [allSales, reconciledSales]);


    const staticYears = useMemo(() => {
        // FIX: Cast `allOrders` and `allSales` to their respective array types.
        return [...new Set([...(allOrders as Order[]).map(o => o.dateIssuePI ? new Date(o.dateIssuePI).getUTCFullYear() : null), ...(allSales as Sale[]).map(s => s.invoiceDate ? new Date(s.invoiceDate).getUTCFullYear() : null)])]
        .filter((y): y is number => y !== null).sort((a, b) => b - a).map(String);
    }, [allOrders, allSales]);

    const orderFilterOptions = useMemo((): FilterOptions => {
        // FIX: Explicitly type `data` to resolve inference issues.
        const getUniqueSorted = <T, K extends keyof T>(data: T[], key: K): string[] =>
            [...new Set((data as any[]).map(item => String(item[key] ?? '')))].filter(val => val && val !== 'N/A').sort();

        const staticOrderQuarters = [...new Set((allOrders as Order[]).map(o => {
            if (!o.dateIssuePI) return null;
            const month = new Date(o.dateIssuePI).getUTCMonth();
            return `Q${Math.floor(month / 3) + 1}`;
        }).filter((q): q is string => q !== null))].sort();

        return {
            // FIX: Cast `allOrders` to `Order[]` when calling `getUniqueSorted`.
            mtms: getUniqueSorted(allOrders as Order[], 'mtm'),
            factoryToSgps: getUniqueSorted(allOrders as Order[], 'factoryToSgp'),
            statuses: getUniqueSorted(allOrders as Order[], 'status'),
            years: staticYears,
            quarters: staticOrderQuarters,
        };
    }, [allOrders, staticYears]);

    const salesFilterOptions = useMemo((): SaleFilterOptions => {
        // FIX: Explicitly type `data` to resolve inference issues.
        const getUniqueSorted = <T, K extends keyof T>(data: T[], key: K): string[] =>
            [...new Set((data as any[]).map(item => String(item[key] ?? '')))].filter(val => val && val !== 'N/A').sort();
            
        const staticSalesQuarters = [...new Set((allSales as Sale[]).map(s => {
            if (!s.invoiceDate) return null;
            const month = new Date(s.invoiceDate).getUTCMonth();
            return `Q${Math.floor(month / 3) + 1}`;
        }).filter((q): q is string => q !== null))].sort();

        return {
            // FIX: Cast `allSales` to `Sale[]` when calling `getUniqueSorted`.
            segments: getUniqueSorted(allSales as Sale[], 'segment'),
            buyers: getUniqueSorted(allSales as Sale[], 'buyerName'),
            quarters: staticSalesQuarters,
            years: staticYears,
        };
    }, [allSales, staticYears]);
    
    const orderInfoMap = useMemo(() => {
        const map = new Map<string, { modelName: string }>();
        (allOrders as Order[]).forEach(order => {
            const key = `${order.salesOrder}-${order.mtm}`;
            if (!map.has(key)) {
                map.set(key, { modelName: order.modelName });
            }
        });
        return map;
    }, [allOrders]);
    
    const allShipmentGroups: AugmentedShipmentGroup[] = useMemo(() => {
        const orderPriceMap = new Map<string, number>();
        (allOrders as Order[]).forEach(order => {
            orderPriceMap.set(`${order.salesOrder}-${order.mtm}`, order.fobUnitPrice);
        });
        // 1. Process shipments from the 'Shipments' sheet (SG > KH)
        const sgToKhGroups = (() => {
            const groups = allShipments.reduce((acc: Record<string, Shipment[]>, shipment) => {
                if (!acc[shipment.packingList]) acc[shipment.packingList] = [];
                acc[shipment.packingList].push(shipment);
                return acc;
            }, {} as Record<string, Shipment[]>);

            return Object.entries(groups).map(([packingList, items]: [string, Shipment[]]): AugmentedShipmentGroup => {
                const firstItem = items[0];
                const { packingListDate, eta, arrivalDate } = firstItem;
                const today = new Date(); today.setUTCHours(0, 0, 0, 0);

                let status: AugmentedShipmentGroup['status'] = 'Upcoming';
                let delayDays = 0;
                if (arrivalDate) { status = 'Arrived';
                } else if (eta && new Date(eta + 'T00:00:00Z') < today) { status = 'Delayed'; delayDays = Math.floor((today.getTime() - new Date(eta + 'T00:00:00Z').getTime()) / (1000 * 3600 * 24));
                } else if (packingListDate && new Date(packingListDate + 'T00:00:00Z') <= today) { status = 'Transit SG > KH'; }

                const start = packingListDate ? new Date(packingListDate).getTime() : null;
                const end = arrivalDate ? new Date(arrivalDate).getTime() : (eta ? new Date(eta).getTime() : null);
                let progress = { percentage: 0, totalDuration: 0, elapsed: 0, isComplete: false, etaPercentage: null as number | null };

                if (start && end) {
                    const totalDuration = (end - start);
                    const elapsed = (today.getTime() - start);
                    progress = {
                        totalDuration: totalDuration > 0 ? totalDuration / (1000 * 3600 * 24) : 0,
                        elapsed: Math.max(0, elapsed / (1000 * 3600 * 24)),
                        percentage: totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 0,
                        isComplete: today.getTime() >= end,
                        etaPercentage: eta ? (((new Date(eta).getTime() - start) / totalDuration) * 100) : null,
                    };
                }
                
                const totalFobValue = items.reduce((sum, i) => {
                    const fobPrice = orderPriceMap.get(`${i.salesOrder}-${i.mtm}`) || 0;
                    return sum + (fobPrice * i.quantity);
                }, 0);

                return {
                    packingList,
                    items: items.map((item: Shipment) => ({...item, modelName: orderInfoMap.get(`${item.salesOrder}-${item.mtm}`)?.modelName || 'Unknown'})),
                    packingListDate, eta, arrivalDate,
                    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
                    totalCost: items.reduce((sum, i) => sum + i.shippingCost * i.quantity, 0),
                    totalFobValue,
                    totalKgsOnDate: firstItem.totalKgsOnDate,
                    status, progress, delayDays, source: 'shipment'
                };
            });
        })();
        
        // 2. Create a set of already shipped items to avoid duplication
        const shippedOrderItems = new Set<string>();
        sgToKhGroups.forEach(group => {
            group.items.forEach(item => {
                shippedOrderItems.add(`${item.salesOrder}-${item.mtm}`);
            });
        });

        // 3. Group upcoming shipments from 'Orders' sheet (CN -> SG)
        const upcomingOrdersByDeliveryNum = (allOrders as Order[])
            .filter(order => order.deliveryNumber && !order.actualArrival && !shippedOrderItems.has(`${order.salesOrder}-${order.mtm}`))
            .reduce((acc, order) => {
                if (!acc[order.deliveryNumber!]) acc[order.deliveryNumber!] = [];
                acc[order.deliveryNumber!].push(order);
                return acc;
            }, {} as Record<string, Order[]>);

        const cnToSgGroups: AugmentedShipmentGroup[] = Object.entries(upcomingOrdersByDeliveryNum).map(([deliveryNumber, ordersInGroup]) => {
            
            // For upcoming orders from the 'Orders' sheet, the packing date is not yet known.
            const packingListDate = null;
            
            const eta = ordersInGroup.reduce((earliest, o) => {
                if (!o.eta) return earliest;
                return !earliest || o.eta < earliest ? o.eta : earliest;
            }, null as string | null);

            const today = new Date(); today.setUTCHours(0, 0, 0, 0);

            // Progress will be 0 without a start date.
            const start = packingListDate ? new Date(packingListDate).getTime() : null;
            const end = eta ? new Date(eta).getTime() : null;
            let progress = { percentage: 0, totalDuration: 0, elapsed: 0, isComplete: false, etaPercentage: null as number | null };

            if (start && end) {
                const totalDuration = end - start;
                const elapsed = today.getTime() - start;
                progress = { ...progress, totalDuration: totalDuration > 0 ? totalDuration / (1000 * 3600 * 24) : 0, elapsed: Math.max(0, elapsed / (1000 * 3600 * 24)), percentage: totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 0 };
            }

            const factoryStatuses = new Set(ordersInGroup.map(o => o.factoryToSgp));
            let status: AugmentedShipmentGroup['status'] = 'Upcoming';
            if (eta && new Date(eta + 'T00:00:00Z') < today) {
                status = 'Delayed';
            } else if (factoryStatuses.has('Shipped') || factoryStatuses.has('Delivered')) {
                status = 'Transit CN > SG';
            }
            
            const delayDays = (eta && new Date(eta + 'T00:00:00Z') < today) ? Math.floor((today.getTime() - new Date(eta + 'T00:00:00Z').getTime()) / (1000 * 3600 * 24)) : 0;
            
            const totalFobValue = ordersInGroup.reduce((sum, o) => sum + o.orderValue, 0);

            return {
                packingList: deliveryNumber,
                items: ordersInGroup.map(order => ({
                    arrivalDate: null, salesOrder: order.salesOrder, mtm: order.mtm, packingList: deliveryNumber,
                    quantity: order.qty, shippingCost: 0, modelCode: 'N/A', kgs: 0, portion: 'N/A', totalKgsOnDate: 0,
                    packingListDate, deliveryDate: null, eta: order.eta, modelName: order.modelName,
                })),
                packingListDate, eta, arrivalDate: null,
                totalQuantity: ordersInGroup.reduce((sum, o) => sum + o.qty, 0),
                totalCost: 0, // No shipping cost info on orders sheet
                totalFobValue,
                totalKgsOnDate: 0,
                status, progress, delayDays, source: 'order'
            };
        });

        return [...sgToKhGroups, ...cnToSgGroups];
    }, [allShipments, allOrders, orderInfoMap]);
    
    const derivedData = useMemo(() => {
        // FIX: Cast `allOrders` to `Order[]` to resolve type inference issues.
        if (isOrdersLoading || isSalesLoading || !(allOrders as Order[]).length) {
            return { inventoryData: [], customerData: [], backorderRecommendations: [], customerOpportunities: [], promotionCandidates: [], newModelMtms: new Set<string>(), salesMetricsByMtm: new Map() };
        }
        const timestamp = new Date().toISOString();
        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

        const salesMetricsByMtm = getSalesMetricsByMtm(allSales as Sale[]);
        const inventoryStatus = calculateInventoryStatus(allOrders as Order[], allSales as Sale[], allSerializedItems);
        const firstOrderDates = getFirstOrderDates(allOrders as Order[]);

        const modelFirstOrderDate = new Map<string, Date>();
        // FIX: Cast `allOrders` to `Order[]` to resolve type inference issues.
        for (const order of (allOrders as Order[])) {
            if (order.dateIssuePI) {
                const orderDate = new Date(order.dateIssuePI);
                if (!modelFirstOrderDate.has(order.mtm) || orderDate < modelFirstOrderDate.get(order.mtm)!) {
                    modelFirstOrderDate.set(order.mtm, orderDate);
                }
            }
        }
        const ninetyDaysAgoModels = new Date(today.getTime());
        ninetyDaysAgoModels.setUTCDate(today.getUTCDate() - 90);
        const newModelMtms = new Set<string>();
        for (const [mtm, firstDate] of modelFirstOrderDate.entries()) {
            if (firstDate >= ninetyDaysAgoModels) {
                newModelMtms.add(mtm);
            }
        }
        
        const backorderRecommendations: BackorderRecommendation[] = analyzeBackorderCandidates(inventoryStatus, allSales as Sale[], firstOrderDates, newModelMtms);

        // FIX: Cast `allOrders` to `Order[]` to resolve type inference issues.
        const otwValueByMtm = (allOrders as Order[]).reduce((acc, order) => {
            if (!order.actualArrival) { // It's "on the way"
                acc.set(order.mtm, (acc.get(order.mtm) || 0) + order.orderValue);
            }
            return acc;
        }, new Map<string, number>());
        
        // FIX: Cast `allSales` to `Sale[]` to resolve type inference issues.
        const salesByMtm = (allSales as Sale[]).reduce((acc, sale) => {
            const mtm = sale.lenovoProductNumber;
            if (!acc[mtm]) acc[mtm] = [];
            acc[mtm].push(sale);
            return acc;
        }, {} as Record<string, Sale[]>);
        
        const profitByMtm = new Map<string, { profit: number; revenue: number }>();
        reconciledSales.forEach(sale => {
            if (sale.unitProfit !== null) {
                const mtm = sale.mtm;
                const current = profitByMtm.get(mtm) || { profit: 0, revenue: 0 };
                current.profit += sale.unitProfit;
                current.revenue += sale.unitSalePrice;
                profitByMtm.set(mtm, current);
            }
        });

        const inventory: InventoryItem[] = Array.from(inventoryStatus.values()).map(item => {
            const recentSales = (allSales as Sale[])
                .filter(s => s.lenovoProductNumber === item.mtm && s.invoiceDate && new Date(s.invoiceDate) >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
            const totalRecentSales = recentSales.reduce((sum, s) => sum + s.quantity, 0);
            const weeklyRunRate = totalRecentSales > 0 ? totalRecentSales / (90 / 7) : 0;
            const weeksOfInventory = item.onHandQty > 0 && weeklyRunRate > 0 ? Math.floor(item.onHandQty / weeklyRunRate) : null;
            
            const otwQty = item.totalShippedQty - item.totalArrivedQty;
            const otwValue = otwValueByMtm.get(item.mtm) || 0;
            const onHandValue = item.onHandQty * item.averageFobCost;

            const salesForMtm = salesByMtm[item.mtm] || [];
            const lastSaleDate = salesForMtm.reduce((latest, s) => {
                if (!s.invoiceDate) return latest;
                const sDate = new Date(s.invoiceDate);
                return !latest || sDate > latest ? sDate : latest;
            }, null as Date | null);
            const daysSinceLastSale = lastSaleDate ? Math.floor((new Date().getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24)) : null;

            const lastArrivalDate = item.lastArrivalDate ? new Date(item.lastArrivalDate) : null;
            const daysSinceLastArrival = lastArrivalDate ? Math.floor((new Date().getTime() - lastArrivalDate.getTime()) / (1000 * 3600 * 24)) : null;

            const yearlyBreakdown: InventoryItemYearlyBreakdown[] = []; // This can be computed if needed in the future
            
            const mtmProfitData = profitByMtm.get(item.mtm);
            const totalProfit = mtmProfitData?.profit;
            const profitMargin = mtmProfitData && mtmProfitData.revenue > 0 ? (mtmProfitData.profit / mtmProfitData.revenue) * 100 : undefined;

            return {
                ...item,
                weeklyRunRate,
                weeksOfInventory,
                otwQty,
                otwValue,
                onHandValue,
                daysSinceLastSale,
                daysSinceLastArrival,
                yearlyBreakdown,
                timestamp,
                totalProfit,
                profitMargin,
            };
        });
        
        const promotionCandidates: PromotionCandidate[] = analyzePromotionCandidates(inventory);

        const customersById = (allSales as Sale[]).reduce<Record<string, CustomerAccumulator>>((acc, sale) => {
            if (!acc[sale.buyerId]) {
                acc[sale.buyerId] = {
                    id: sale.buyerId, name: sale.buyerName, totalRevenue: 0, totalUnits: 0,
                    lastPurchaseDate: null, firstPurchaseDate: null, sales: [], invoices: new Set<string>()
                };
            }
            const customer = acc[sale.buyerId];
            customer.totalRevenue += sale.totalRevenue;
            customer.totalUnits += sale.quantity;
            customer.sales.push(sale);
            customer.invoices.add(sale.invoiceNumber);
            if (sale.invoiceDate) {
                if (!customer.lastPurchaseDate || sale.invoiceDate > customer.lastPurchaseDate) customer.lastPurchaseDate = sale.invoiceDate;
                if (!customer.firstPurchaseDate || sale.invoiceDate < customer.firstPurchaseDate) customer.firstPurchaseDate = sale.invoiceDate;
            }
            return acc;
        }, {} as Record<string, CustomerAccumulator>);

        const ninetyDaysAgo = new Date(today.getTime());
        ninetyDaysAgo.setUTCDate(today.getUTCDate() - 90);

        // FIX: Explicitly create the full Customer object instead of relying on spread, to fix type error.
        const customers: Customer[] = Object.values(customersById).map(({ invoices, ...customer }) => {
            const lastPurchaseTime = customer.lastPurchaseDate ? new Date(customer.lastPurchaseDate).getTime() : 0;
            const firstPurchaseTime = customer.firstPurchaseDate ? new Date(customer.firstPurchaseDate).getTime() : 0;
            const daysSinceLastPurchase = lastPurchaseTime > 0 ? Math.floor((today.getTime() - lastPurchaseTime) / (1000 * 60 * 60 * 24)) : Infinity;
            const isNew = firstPurchaseTime > 0 && new Date(firstPurchaseTime) >= ninetyDaysAgo;
            const isAtRisk = daysSinceLastPurchase > 180;
            return { 
                id: customer.id,
                name: customer.name,
                totalRevenue: customer.totalRevenue,
                totalUnits: customer.totalUnits,
                lastPurchaseDate: customer.lastPurchaseDate,
                firstPurchaseDate: customer.firstPurchaseDate,
                sales: customer.sales,
                invoiceCount: invoices.size, 
                daysSinceLastPurchase, 
                isNew, 
                isAtRisk, 
                timestamp 
            };
        });

        if (customers.length > 0) {
            customers.sort((a, b) => b.totalRevenue - a.totalRevenue);
            const platinumCutoff = Math.ceil(customers.length * 0.05);
            const goldCutoff = Math.ceil(customers.length * 0.20);
            const silverCutoff = Math.ceil(customers.length * 0.50);
            customers.forEach((customer, index) => {
                if (index < platinumCutoff) customer.tier = 'Platinum';
                else if (index < goldCutoff) customer.tier = 'Gold';
                else if (index < silverCutoff) customer.tier = 'Silver';
                else customer.tier = 'Bronze';
            });
        }
        
        const surplusInventory = inventory.filter(item => item.onHandQty > 25);
        const customerOpportunities = customers.map((customer): CustomerSalesOpportunity | null => {
            const opportunities: SalesOpportunity[] = [];
            surplusInventory.forEach(item => {
                const purchasesOfMtm = customer.sales.filter(s => s.lenovoProductNumber === item.mtm);
                if (purchasesOfMtm.length > 0) {
                     const customerPastUnits = purchasesOfMtm.reduce((sum, s) => sum + s.quantity, 0);
                     const lastPurchase = purchasesOfMtm.reduce((latest, s) => (!latest || (s.invoiceDate && s.invoiceDate > latest)) ? s.invoiceDate : latest, null as string | null);
                     opportunities.push({
                         id: `${customer.id}-${item.mtm}`, customerId: customer.id, customerName: customer.name,
                         customerTier: customer.tier, mtm: item.mtm, modelName: item.modelName, inStockQty: item.onHandQty,
                         otwQty: item.otwQty, averageLandingCost: item.averageLandingCost,
                         surplusStockValue: item.onHandQty * item.averageLandingCost, customerPastUnits, customerLastPurchaseDate: lastPurchase,
                         timestamp
                     });
                }
            });
            if (opportunities.length === 0) return null;
            
            opportunities.forEach(op => {
                 const tierScore = { Platinum: 4, Gold: 3, Silver: 2, Bronze: 1 }[op.customerTier || 'Bronze'] || 0;
                 const tierComponent = tierScore * 7.5;
                 const stockComponent = Math.min(15, (op.inStockQty - 25) / 20);
                 const daysSince = op.customerLastPurchaseDate ? (new Date().getTime() - new Date(op.customerLastPurchaseDate).getTime()) / 86400000 : Infinity;
                 const recencyComponent = daysSince !== Infinity ? (1 / Math.sqrt(daysSince + 1)) * 35 : 0;
                 const pastUnitsComponent = Math.min(20, Math.log10(op.customerPastUnits + 1) * 10);
                 op.opportunityScore = Math.round(tierComponent + stockComponent + recencyComponent + pastUnitsComponent);
            });
            
            const totalOpportunityValue = opportunities.reduce((sum, op) => sum + op.surplusStockValue, 0);
            const customerOpportunityScore = opportunities.length > 0 ? Math.round(opportunities.reduce((sum, op) => sum + (op.opportunityScore || 0), 0) / opportunities.length) : 0;

            return { customerId: customer.id, customerName: customer.name, customerTier: customer.tier, opportunities, totalOpportunityValue, customerOpportunityScore, opportunityCount: opportunities.length };
        }).filter((co): co is CustomerSalesOpportunity => co !== null);

        return { inventoryData: inventory, customerData: customers, backorderRecommendations, customerOpportunities, promotionCandidates, newModelMtms, salesMetricsByMtm };

    }, [isOrdersLoading, isSalesLoading, allOrders, allSales, allSerializedItems, reconciledSales]);

    // --- Data Syncing ---
    useSheetSync(INVENTORY_SHEET_NAME, derivedData.inventoryData);
    useSheetSync(CUSTOMER_SHEET_NAME, derivedData.customerData);
    useSheetSync(SALES_OPPORTUNITIES_SHEET_NAME, derivedData.customerOpportunities.flatMap(co => co.opportunities));
    useSheetSync(BACKORDER_ANALYSIS_SHEET_NAME, derivedData.backorderRecommendations);
    useSheetSync(PROMOTION_CANDIDATES_SHEET_NAME, derivedData.promotionCandidates);

    const value: DataContextType = {
        isLoading: isOrdersLoading || isSalesLoading || isSerializationLoading || isRebatesLoading || isRebateDetailsLoading || isRebateSalesLoading || isShipmentsLoading || isBackpackCostsLoading || isPriceListLoading,
        isRefreshing,
        error: ordersError || salesError || rebatesError || serializationError || rebateDetailsError || rebateSalesError || shipmentsError || backpackCostsError || priceListError,
        serializationError,
        lastUpdated: ordersLastUpdated || salesLastUpdated,
        handleGlobalRefresh,
        allOrders,
        allSales,
        allSerializedItems,
        allShipments,
        allShipmentGroups,
        allBackpackCosts,
        allPriceListItems,
        orderKpiData,
        salesKpiData,
        totalOrderCount: rawAllOrders.length,
        allInvoicesCount,
        inventoryData: derivedData.inventoryData,
        customerData: derivedData.customerData,
        backorderRecommendations: derivedData.backorderRecommendations,
        customerOpportunities: derivedData.customerOpportunities,
        promotionCandidates: derivedData.promotionCandidates,
        newModelMtms: derivedData.newModelMtms,
        salesMetricsByMtm: derivedData.salesMetricsByMtm,
        allRebates,
        rebateKpiData,
        allRebateDetails,
        allRebateSales,
        orderFilterOptions,
        salesFilterOptions,
        reconciledSales,
        profitabilityKpiData,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};