



import React, { useMemo, useState, Fragment, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import Card from '../ui/Card';
import KpiCard from '../ui/KpiCard';
// FIX: Import ChartCard component
import ChartCard from '../ui/ChartCard';
// FIX: Import `Shipment` type to resolve type error.
import { Order, Sale, DashboardType, LocalFiltersState, ReconciledSale, ViewType, Shipment } from '../../types';
import { ArrowsRightLeftIcon, CubeIcon, TableCellsIcon, BanknotesIcon, ExclamationTriangleIcon, ChevronUpIcon, ChevronDownIcon, ChevronRightIcon, CheckCircleIcon, XCircleIcon, CalendarDaysIcon, TrophyIcon, DocumentMagnifyingGlassIcon } from '../ui/Icons';
import ReconciliationStatusChart from './charts/ReconciliationStatusChart';
import ValueReconciliationChart from './charts/ValueReconciliationChart';
import VarianceBySalesOrderChart from './charts/VarianceBySalesOrderChart';
import UnitVarianceTimeSeriesChart from './charts/UnitVarianceTimeSeriesChart';

const MotionDiv = motion.div as any;

// --- Type Definitions ---
type AugmentedSale = Sale & { salesOrder: string };

interface ReconciliationGroup {
    salesOrder: string;
    orders: Order[];
    sales: AugmentedSale[];
    orderQty: number;
    saleQty: number;
    orderValue: number; // FOB
    saleValue: number; // Revenue
    totalLandedCost: number;
    totalRebateValue: number;
    totalProfit: number;
    orderDate: string | null;
    status: 'Matched' | 'Unsold';
}
type SortKey = keyof Omit<ReconciliationGroup, 'orders' | 'sales'>;
type SortOrder = 'asc' | 'desc';
interface SortConfig {
  key: SortKey;
  direction: SortOrder;
}

// --- Sub-components ---
const TableHeader: React.FC<{ onSort: (key: SortKey) => void; sortConfig: SortConfig | null; sortKey: SortKey; children: React.ReactNode; className?: string; }> = ({ onSort, sortConfig, sortKey, children, className = '' }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
        <th scope="col" className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider select-none cursor-pointer group ${className || 'text-left'}`} onClick={() => onSort(sortKey)} aria-sort={isSorted ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <div className={`flex items-center text-secondary-text ${className?.includes('text-right') ? 'justify-end' : ''}`}>
                {children}
                <span className="w-4 h-4 ml-1.5 flex-shrink-0">{isSorted ? (sortConfig?.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />) : <ChevronUpIcon className="opacity-30 group-hover:opacity-100" />}</span>
            </div>
        </th>
    );
};

const ProfitCell: React.FC<{ value: number }> = ({ value }) => {
    const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-secondary-text';
    const sign = value > 0 ? '+' : '';
    return <span className={`font-semibold ${color}`}>{sign}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}</span>;
};

const StatusBadge: React.FC<{ status: ReconciliationGroup['status'] }> = ({ status }) => {
    const config = {
        Matched: { text: 'Matched', className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300', icon: CheckCircleIcon },
        Unsold: { text: 'Unsold', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300', icon: ExclamationTriangleIcon },
    }[status];
    const Icon = config.icon;
    return <span className={`inline-flex items-center gap-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.className}`}><Icon className="h-4 w-4" />{config.text}</span>
};


const ExpandedDetailView: React.FC<{
    group: ReconciliationGroup;
    mtmToModelNameMap: Map<string, string>;
    shipmentCostMap: Map<string, number>;
    accessoryCostMap: Map<string, number>;
    serialToReconciledSale: Map<string, ReconciledSale>;
}> = ({ group, mtmToModelNameMap, shipmentCostMap, accessoryCostMap, serialToReconciledSale }) => {
    
    const orderedItemsAggregated = useMemo(() => {
// FIX: Explicitly type accumulator in `reduce` call to resolve type inference issues.
        const aggregation = group.orders.reduce((acc: Record<string, { mtm: string; modelName: string; qty: number; value: number; arrivals: Set<string>; totalShippingCost: number; totalAccessoryCost: number; totalLandedCost: number; }>, order: Order) => {
            if (!acc[order.mtm]) {
                acc[order.mtm] = {
                    mtm: order.mtm,
                    modelName: mtmToModelNameMap.get(order.mtm) || order.modelName,
                    qty: 0,
                    value: 0,
                    arrivals: new Set<string>(),
                    totalShippingCost: 0,
                    totalAccessoryCost: 0,
                    totalLandedCost: 0
                };
            }
            const key = `${order.salesOrder}-${order.mtm}`;
            const shippingCost = shipmentCostMap.get(key) || 0;
            const accessoryCost = accessoryCostMap.get(key) || 0;
            const landedCost = order.qty * (order.fobUnitPrice + shippingCost + accessoryCost);
            
            acc[order.mtm].qty += order.qty;
            acc[order.mtm].value += order.orderValue;
            acc[order.mtm].totalShippingCost += shippingCost * order.qty;
            acc[order.mtm].totalAccessoryCost += accessoryCost * order.qty;
            acc[order.mtm].totalLandedCost += landedCost;

            if (order.actualArrival) {
                acc[order.mtm].arrivals.add(order.actualArrival);
            }
            return acc;
        }, {});

        return Object.values(aggregation).sort((a, b) => a.mtm.localeCompare(b.mtm));
    }, [group.orders, mtmToModelNameMap, shipmentCostMap, accessoryCostMap]);


    const soldItemsAggregated = useMemo(() => {
// FIX: Explicitly type accumulator in `reduce` call to resolve type inference issues.
        return Object.values(group.sales.reduce((acc: Record<string, { mtm: string; modelName: string; qty: number; revenue: number; lastSaleDate: string | null; totalRebate: number; totalProfit: number; }>, sale: AugmentedSale) => {
            const key = sale.lenovoProductNumber;
            if (!acc[key]) {
                acc[key] = { mtm: key, modelName: sale.modelName, qty: 0, revenue: 0, lastSaleDate: null as string | null, totalRebate: 0, totalProfit: 0 };
            }
            const reconciled = serialToReconciledSale.get(sale.serialNumber);
            acc[key].qty += sale.quantity;
            acc[key].revenue += sale.totalRevenue;
            if (reconciled) {
                acc[key].totalRebate += reconciled.rebateApplied || 0;
                acc[key].totalProfit += reconciled.unitProfit || 0;
            }
            if (sale.invoiceDate) {
                if (!acc[key].lastSaleDate || sale.invoiceDate > acc[key].lastSaleDate!) {
                    acc[key].lastSaleDate = sale.invoiceDate;
                }
            }
            return acc;
        }, {}))
        .sort((a, b) => a.mtm.localeCompare(b.mtm));
    }, [group.sales, serialToReconciledSale]);

    const currencyWithDecimals = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

    return (
        <div className="bg-gray-50 dark:bg-dark-primary-bg p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Ordered Items Card */}
                <div className="bg-secondary-bg dark:bg-dark-secondary-bg rounded-lg border border-border-color dark:border-dark-border-color flex flex-col">
                    <div className="flex justify-between items-baseline p-3 border-b border-border-color dark:border-dark-border-color">
                        <h4 className="font-semibold text-primary-text dark:text-dark-primary-text">Ordered Item Details ({orderedItemsAggregated.length})</h4>
                        <div className="text-sm text-secondary-text dark:text-dark-secondary-text">
                            <span className="font-bold text-primary-text dark:text-dark-primary-text">{group.orderQty}</span> units / <span className="font-bold text-primary-text dark:text-dark-primary-text">{currencyWithDecimals(group.totalLandedCost)}</span>
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto custom-scrollbar max-h-96">
                        <div className="divide-y divide-border-color dark:divide-dark-border-color">
                            {orderedItemsAggregated.map((order, i) => {
                                const arrivalText = [...order.arrivals].sort().join(', ') || 'N/A';
                                return (
                                    <div key={`${order.mtm}-${i}`} className="p-3">
                                        <div>
                                            <p className="font-bold text-sm text-primary-text dark:text-dark-primary-text">{order.modelName}</p>
                                            <p className="text-xs font-mono text-secondary-text dark:text-dark-secondary-text">{order.mtm}</p>
                                        </div>
                                        <div className="mt-2 space-y-1 text-xs text-secondary-text dark:text-dark-secondary-text">
                                            <p className="flex items-center"><CubeIcon className="h-4 w-4 mr-1.5"/> QTY: <span className="font-semibold text-primary-text dark:text-dark-primary-text ml-1">{order.qty}</span></p>
                                            <p className="flex items-center"><CalendarDaysIcon className="h-4 w-4 mr-1.5"/> Arrival: <span className="font-semibold text-primary-text dark:text-dark-primary-text ml-1">{arrivalText}</span></p>
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-border-color dark:border-dark-border-color space-y-1 text-xs">
                                            <div className="flex justify-between"><span className="text-secondary-text dark:text-dark-secondary-text">FOB Value</span><span className="font-medium text-primary-text dark:text-dark-primary-text">{currencyWithDecimals(order.value)}</span></div>
                                            <div className="flex justify-between"><span className="text-secondary-text dark:text-dark-secondary-text">Shipping Cost</span><span className="font-medium text-primary-text dark:text-dark-primary-text">{currencyWithDecimals(order.totalShippingCost)}</span></div>
                                            <div className="flex justify-between"><span className="text-secondary-text dark:text-dark-secondary-text">Accessory Cost</span><span className="font-medium text-primary-text dark:text-dark-primary-text">{currencyWithDecimals(order.totalAccessoryCost)}</span></div>
                                            <div className="flex justify-between pt-1 border-t border-dashed border-border-color dark:border-dark-border-color"><span className="font-semibold text-primary-text dark:text-dark-primary-text">Total Landed Cost</span><span className="font-bold text-primary-text dark:text-dark-primary-text">{currencyWithDecimals(order.totalLandedCost)}</span></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Sold Items Card */}
                <div className="bg-secondary-bg dark:bg-dark-secondary-bg rounded-lg border border-border-color dark:border-dark-border-color flex flex-col">
                    <div className="flex justify-between items-baseline p-3 border-b border-border-color dark:border-dark-border-color">
                        <h4 className="font-semibold text-primary-text dark:text-dark-primary-text">Sold Item Details ({soldItemsAggregated.length})</h4>
                        <div className="text-sm text-secondary-text dark:text-dark-secondary-text">
                           <span className="font-bold text-primary-text dark:text-dark-primary-text">{group.saleQty}</span> units / <span className="font-bold text-primary-text dark:text-dark-primary-text">{currencyWithDecimals(group.saleValue)}</span>
                        </div>
                    </div>
                     <div className="flex-grow overflow-y-auto custom-scrollbar max-h-96">
                        <div className="divide-y divide-border-color dark:divide-dark-border-color">
                            {soldItemsAggregated.length > 0 ? soldItemsAggregated.map((sale, i) => (
                                <div key={`${sale.mtm}-${i}`} className="p-3">
                                    <div>
                                        <p className="font-bold text-sm text-primary-text dark:text-dark-primary-text">{sale.modelName}</p>
                                        <p className="text-xs font-mono text-secondary-text dark:text-dark-secondary-text">{sale.mtm}</p>
                                    </div>
                                    <div className="mt-2 space-y-1 text-xs text-secondary-text dark:text-dark-secondary-text">
                                        <div className="flex items-start"><CalendarDaysIcon className="h-4 w-4 mr-1.5 flex-shrink-0 mt-0.5"/><div>Last Sale Date: <span className="font-semibold text-primary-text dark:text-dark-primary-text ml-1">{sale.lastSaleDate || 'N/A'}</span></div></div>
                                        <p className="flex items-center"><CubeIcon className="h-4 w-4 mr-1.5"/> QTY: <span className="font-semibold text-primary-text dark:text-dark-primary-text ml-1">{sale.qty}</span></p>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-border-color dark:border-dark-border-color space-y-1 text-xs">
                                        <div className="flex justify-between"><span className="text-secondary-text dark:text-dark-secondary-text">Sale Revenue</span><span className="font-medium text-primary-text dark:text-dark-primary-text">{currencyWithDecimals(sale.revenue)}</span></div>
                                        <div className="flex justify-between"><span className="text-secondary-text dark:text-dark-secondary-text">Rebates Applied</span><span className="font-medium text-green-600 dark:text-green-400">{currencyWithDecimals(sale.totalRebate)}</span></div>
                                        <div className="flex justify-between pt-1 border-t border-dashed border-border-color dark:border-dark-border-color"><span className="font-semibold text-primary-text dark:text-dark-primary-text">Total Profit</span><span className={`font-bold ${sale.totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{currencyWithDecimals(sale.totalProfit)}</span></div>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-3 text-center text-sm text-secondary-text dark:text-dark-secondary-text">No sales recorded for this Sales Order.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ReconciliationTable: React.FC<{
    data: ReconciliationGroup[];
    mtmToModelNameMap: Map<string, string>;
    shipmentCostMap: Map<string, number>;
    accessoryCostMap: Map<string, number>;
    serialToReconciledSale: Map<string, ReconciledSale>;
}> = ({ data, mtmToModelNameMap, shipmentCostMap, accessoryCostMap, serialToReconciledSale }) => {
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'orderDate', direction: 'desc' });
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    
    const requestSort = (key: SortKey) => {
        let direction: SortOrder = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const toggleExpansion = (salesOrder: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(salesOrder)) {
                newSet.delete(salesOrder);
            } else {
                newSet.add(salesOrder);
            }
            return newSet;
        });
    };
    
    const sortedData = useMemo(() => {
        let sorted = [...data];
        if (sortConfig) {
            sorted.sort((a, b) => {
                const aVal = a[sortConfig.key], bVal = b[sortConfig.key];
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;
                const comparison = typeof aVal === 'number' && typeof bVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
        }
        return sorted;
    }, [data, sortConfig]);

    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const paginatedData = useMemo(() => sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [sortedData, currentPage, itemsPerPage]);
    
    if (data.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="flex flex-col items-center">
                    <DocumentMagnifyingGlassIcon className="h-12 w-12 text-gray-400 mb-2" />
                    <h3 className="font-semibold text-primary-text">No Matching Data</h3>
                    <p className="text-sm text-secondary-text">Try adjusting your filters.</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-dark-secondary-bg/50">
                        <tr>
                            <th className="px-4 py-3.5 w-12"></th>
                            <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="salesOrder">Sales Order</TableHeader>
                            <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="status">Status</TableHeader>
                            <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="orderQty" className="text-center">QTY (Order/Sale)</TableHeader>
                            <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalLandedCost" className="text-right">Total Landed Cost</TableHeader>
                            <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="saleValue" className="text-right">Total Sale Revenue</TableHeader>
                            <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalProfit" className="text-right">Total Profit</TableHeader>
                        </tr>
                    </thead>
                    <tbody className="bg-secondary-bg dark:bg-dark-secondary-bg">
                        {paginatedData.map(group => (
                            <Fragment key={group.salesOrder}>
                                <tr onClick={() => toggleExpansion(group.salesOrder)} className="border-b border-border-color dark:border-dark-border-color cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-primary-bg">
                                    <td className="px-4 py-2 text-center"><ChevronRightIcon className={`h-5 w-5 text-secondary-text transition-transform duration-200 ${expandedRows.has(group.salesOrder) ? 'rotate-90' : ''}`} /></td>
                                    <td className="px-4 py-2"><div className="font-medium text-primary-text">{group.salesOrder}</div><div className="text-xs text-secondary-text">{group.orderDate}</div></td>
                                    <td className="px-4 py-2"><StatusBadge status={group.status} /></td>
                                    <td className="px-4 py-2 text-center text-primary-text">{group.orderQty} / <span className="text-green-600">{group.saleQty}</span></td>
                                    <td className="px-4 py-2 text-right font-semibold text-primary-text">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(group.totalLandedCost)}</td>
                                    <td className="px-4 py-2 text-right font-semibold text-primary-text">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(group.saleValue)}</td>
                                    <td className="px-4 py-2 text-right"><ProfitCell value={group.totalProfit} /></td>
                                </tr>
                                <tr className="p-0">
                                    <td colSpan={7} className="p-0 border-0">
                                        <AnimatePresence>
                                            {expandedRows.has(group.salesOrder) && (
                                                <MotionDiv initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} >
                                                    <ExpandedDetailView group={group} mtmToModelNameMap={mtmToModelNameMap} shipmentCostMap={shipmentCostMap} accessoryCostMap={accessoryCostMap} serialToReconciledSale={serialToReconciledSale} />
                                                </MotionDiv>
                                            )}
                                        </AnimatePresence>
                                    </td>
                                </tr>
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
             {totalPages > 1 && (
                <div className="py-3 flex flex-col sm:flex-row items-center justify-center sm:justify-between border-t border-border-color mt-4 gap-4">
                    <div><p className="text-sm text-secondary-text">Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, sortedData.length)}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedData.length)}</span> of <span className="font-medium">{sortedData.length}</span> items</p></div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-secondary-text">Rows:</span>
                        <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-secondary-bg border border-border-color rounded-md py-1 px-2 text-primary-text text-sm focus:ring-highlight focus:border-highlight"><option value="15">15</option><option value="30">30</option><option value="50">50</option></select>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border-color bg-secondary-bg text-sm font-medium text-secondary-text hover:bg-gray-50 disabled:opacity-50">Prev</button><span className="relative inline-flex items-center px-4 py-2 border border-border-color bg-secondary-bg text-sm font-medium text-secondary-text">{currentPage} / {totalPages}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border-color bg-secondary-bg text-sm font-medium text-secondary-text hover:bg-gray-50 disabled:opacity-50">Next</button></nav>
                    </div>
                </div>
            )}
        </div>
    );
};

interface OrderVsSalePageProps {
    onNavigateAndFilter: (view: ViewType, filters: Partial<LocalFiltersState>) => void;
    localFilters: LocalFiltersState;
    setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const OrderVsSalePage: React.FC<OrderVsSalePageProps> = ({ onNavigateAndFilter, localFilters, setLocalFilters }) => {
    const { allOrders, allSales, reconciledSales, allShipments, allBackpackCosts } = useData();

    const handleStatusSelect = useCallback((status: 'Matched' | 'Unsold' | null) => {
        const newStatus = status || 'all';
        setLocalFilters(prev => ({
            ...prev,
            orderVsSaleStatus: prev.orderVsSaleStatus === newStatus ? 'all' : newStatus
        }));
    }, [setLocalFilters]);
    
    const handleSOSelect = useCallback((so: string | null) => {
        setLocalFilters(prev => ({
            ...prev,
            orderVsSaleSearchTerm: prev.orderVsSaleSearchTerm === so ? '' : (so || '')
        }));
    }, [setLocalFilters]);

    const augmentedSales = useMemo(() => {
        const serialToSoMap = new Map<string, string>();
        reconciledSales.forEach(rs => {
            if (rs.salesOrder !== 'N/A') {
                serialToSoMap.set(rs.serialNumber, rs.salesOrder);
            }
        });
        return (allSales as Sale[]).map(sale => ({
            ...sale,
            salesOrder: serialToSoMap.get(sale.serialNumber) || 'Unknown'
        }));
    }, [allSales, reconciledSales]);

    const mtmToModelNameMap = useMemo(() => new Map<string, string>((allOrders as Order[]).map((o: Order) => [o.mtm, o.modelName])), [allOrders]);
    const shipmentCostMap = useMemo(() => {
        const map = new Map<string, number>();
        (allShipments as Shipment[]).forEach(s => map.set(`${s.salesOrder}-${s.mtm}`, s.shippingCost));
        return map;
    }, [allShipments]);
    const accessoryCostMap = useMemo(() => {
        const map = new Map<string, number>();
        (allBackpackCosts as any[]).forEach(a => map.set(`${a.so}-${a.mtm}`, a.backpackCost));
        return map;
    }, [allBackpackCosts]);
    const serialToReconciledSale = useMemo(() => new Map((reconciledSales as ReconciledSale[]).map(rs => [rs.serialNumber, rs])), [reconciledSales]);

    const reconciliationGroups: ReconciliationGroup[] = useMemo(() => {
        const groupsBySO = new Map<string, { orders: Order[], sales: AugmentedSale[] }>();
        allOrders.forEach(order => {
            if (!groupsBySO.has(order.salesOrder)) {
                groupsBySO.set(order.salesOrder, { orders: [], sales: [] });
            }
            groupsBySO.get(order.salesOrder)!.orders.push(order);
        });

        augmentedSales.forEach(sale => {
            if (sale.salesOrder !== 'Unknown' && groupsBySO.has(sale.salesOrder)) {
                groupsBySO.get(sale.salesOrder)!.sales.push(sale);
            }
        });

        return Array.from(groupsBySO.entries()).map(([salesOrder, data]) => {
            const orderQty = data.orders.reduce((sum, o) => sum + o.qty, 0);
            const saleQty = data.sales.reduce((sum, s) => sum + s.quantity, 0);

            const { totalProfit, totalRebateValue } = data.sales.reduce((acc, sale) => {
                const reconciled = serialToReconciledSale.get(sale.serialNumber);
                if (reconciled) {
                    acc.totalProfit += reconciled.unitProfit || 0;
                    acc.totalRebateValue += reconciled.rebateApplied || 0;
                }
                return acc;
            }, { totalProfit: 0, totalRebateValue: 0 });
            
            const totalLandedCost = data.orders.reduce((sum, order) => {
                const key = `${order.salesOrder}-${order.mtm}`;
                const shippingCost = shipmentCostMap.get(key) || 0;
                const accessoryCost = accessoryCostMap.get(key) || 0;
                return sum + order.qty * (order.fobUnitPrice + shippingCost + accessoryCost);
            }, 0);

            return {
                salesOrder, orders: data.orders, sales: data.sales, orderQty, saleQty,
                orderValue: data.orders.reduce((sum, o) => sum + o.orderValue, 0),
                saleValue: data.sales.reduce((sum, s) => sum + s.totalRevenue, 0),
                totalLandedCost, totalProfit, totalRebateValue,
                orderDate: data.orders[0]?.dateIssuePI || null,
                status: saleQty >= orderQty ? 'Matched' : 'Unsold',
            };
        });
    }, [allOrders, augmentedSales, serialToReconciledSale, shipmentCostMap, accessoryCostMap]);

    const filteredGroups = useMemo(() => {
        const { orderVsSaleSearchTerm, orderVsSaleStatus, orderVsSaleSegment } = localFilters;
        return reconciliationGroups.filter(group => {
            if (orderVsSaleSearchTerm && !(group.salesOrder.toLowerCase().includes(orderVsSaleSearchTerm.toLowerCase()) || group.orders.some(o => o.mtm.toLowerCase().includes(orderVsSaleSearchTerm.toLowerCase())))) return false;
            if (orderVsSaleStatus !== 'all' && group.status !== orderVsSaleStatus) return false;
            if (orderVsSaleSegment.length > 0 && !group.sales.some(s => s.segment && orderVsSaleSegment.includes(s.segment))) return false;
            return true;
        });
    }, [reconciliationGroups, localFilters]);
    
    const kpis = useMemo(() => {
        return (filteredGroups as ReconciliationGroup[]).reduce((acc: { totalOrders: number, totalOrderQty: number, totalSaleQty: number, totalLandedCost: number, totalSaleValue: number, totalProfit: number }, group: ReconciliationGroup) => {
            acc.totalOrders++;
            acc.totalOrderQty += group.orderQty;
            acc.totalSaleQty += group.saleQty;
            acc.totalLandedCost += group.totalLandedCost;
// FIX: Use `group.saleValue` instead of the non-existent `group.totalSaleValue` to match the `ReconciliationGroup` interface.
            acc.totalSaleValue += group.saleValue;
            acc.totalProfit += group.totalProfit;
            return acc;
        }, { totalOrders: 0, totalOrderQty: 0, totalSaleQty: 0, totalLandedCost: 0, totalSaleValue: 0, totalProfit: 0 });
    }, [filteredGroups]);
    
    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    
    const ordersForCharts = useMemo(() => (allOrders as Order[]).filter(o => filteredGroups.some(g => g.salesOrder === o.salesOrder)), [allOrders, filteredGroups]);
    const salesForCharts = useMemo(() => augmentedSales.filter(s => filteredGroups.some(g => g.salesOrder === s.salesOrder)), [augmentedSales, filteredGroups]);

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="flex items-center gap-x-3 mb-4">
                    <ArrowsRightLeftIcon className="h-8 w-8 text-primary-text" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-primary-text">Order vs. Sale Reconciliation</h1>
                        <p className="text-secondary-text mt-1">Compare ordered units against sold units for each sales order.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
                    <KpiCard label="Total Orders" value={kpis.totalOrders} icon={<TableCellsIcon />} colorClass={{ bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' }} />
                    <KpiCard label="Ordered Units" value={kpis.totalOrderQty} icon={<CubeIcon />} colorClass={{ bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' }} />
                    <KpiCard label="Sold Units" value={kpis.totalSaleQty} icon={<CubeIcon />} colorClass={{ bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' }} />
                    <KpiCard label="Total Sale Revenue" value={kpis.totalSaleValue} icon={<BanknotesIcon />} formatter={currencyFormatter} colorClass={{ bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' }} />
                    <KpiCard label="Total Reconciled Profit" value={kpis.totalProfit} icon={<BanknotesIcon />} formatter={currencyFormatter} colorClass={kpis.totalProfit > 0 ? { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' } : { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' }} />
                </div>
                
                <div className="space-y-6 mt-6">
                    <div className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <ChartCard title="Reconciliation Status" description="Breakdown of matched sales orders by fulfillment status." className="h-[500px]"><ReconciliationStatusChart orders={ordersForCharts} sales={salesForCharts} onSelect={handleStatusSelect} selected={localFilters.orderVsSaleStatus === 'all' ? null : localFilters.orderVsSaleStatus} /></ChartCard>
                           <ChartCard title="Value Reconciliation Over Time" description="Monthly FOB value of matched orders vs. revenue of matched sales." className="h-[500px]"><ValueReconciliationChart orders={ordersForCharts} sales={salesForCharts} /></ChartCard>
                       </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ChartCard title="Top SO Variances" description="Sales orders with the largest unit discrepancies." className="h-[500px]"><VarianceBySalesOrderChart orders={ordersForCharts} sales={salesForCharts} onSelect={handleSOSelect} selected={localFilters.orderVsSaleSearchTerm} /></ChartCard>
                            <ChartCard title="Unit Variance Over Time" description="Monthly ordered vs. sold units for matched items." className="h-[500px]"><UnitVarianceTimeSeriesChart orders={ordersForCharts} sales={salesForCharts} /></ChartCard>
                        </div>
                    </div>
                    <div className="pt-6">
                       <Card className="p-4 sm:p-6">
                          <h2 className="text-xl font-bold text-primary-text dark:text-dark-primary-text mb-4">Detailed Table</h2>
                          <ReconciliationTable data={filteredGroups} mtmToModelNameMap={mtmToModelNameMap} shipmentCostMap={shipmentCostMap} accessoryCostMap={accessoryCostMap} serialToReconciledSale={serialToReconciledSale} />
                       </Card>
                    </div>
                </div>
            </MotionDiv>
        </main>
    );
};

export default OrderVsSalePage;
