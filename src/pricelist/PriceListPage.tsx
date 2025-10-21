import React, { useState, useMemo, useCallback, Fragment, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePriceListData } from '../../hooks/usePriceListData';
import type { PriceListItem, Order, Sale, SerializedItem, InventoryItem, LocalFiltersState } from '../../types';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import { 
    BanknotesIcon, ChevronUpIcon, ChevronDownIcon, DocumentMagnifyingGlassIcon, ExclamationTriangleIcon, 
    ArrowPathIcon, ChevronRightIcon, SparklesIcon, ChartBarIcon, CubeIcon
} from '../ui/Icons';
import EditablePriceCell from './EditablePriceCell';
import SegmentedControl from '../ui/SegmentedControl';
import { useData } from '../../contexts/DataContext';
import StockHealthBadge from './StockHealthBadge';
import AIPricingModal from './AIPricingModal';
import Sparkline from './Sparkline';
import AnimatedCounter from '../ui/AnimatedCounter';
import ProfitabilityChart from './ProfitabilityChart';

// --- Type Definitions ---
type PriceListItemWithId = PriceListItem & { _uniqueId: string };

export interface AugmentedMtmGroup {
    _uniqueId: string; // MTM
    mtm: string;
    modelName: string;
    productLine: string;
    description: string;
    specification: string;
    sdp: number;
    srp: number;
    // New fields from inventory
    onHandQty: number;
    otwQty: number;
    onHandValue: number;
    otwValue: number;
    averageLandingCost: number;
    weeksOfInventory: number | null;
    sdpMargin: number | null;
    srpMargin: number | null;
    sdpProfit: number | null;
    srpProfit: number | null;
    sales90d: number;
    weeklySales: number[];
    salesOrderDetails: {
        salesOrder: string;
        shippedQty: number;
        onHandQty: number;
        otwQty: number;
        color: string;
        arrivalDate: string | null;
        ageing: number | null;
    }[];
}

type SortKey = keyof Omit<AugmentedMtmGroup, '_uniqueId' | 'salesOrderDetails' | 'weeklySales'>;
type SortOrder = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortOrder;
}


// --- Sub-components ---
const TableHeader: React.FC<{
  onSort: (key: SortKey) => void,
  sortConfig: SortConfig | null,
  sortKey: SortKey,
  children: React.ReactNode,
  className?: string,
}> = ({ onSort, sortConfig, sortKey, children, className = '' }) => {
  const isSorted = sortConfig?.key === sortKey;
  const thClassName = `px-4 py-3.5 text-xs font-semibold uppercase tracking-wider select-none cursor-pointer group ${className || 'text-left'}`;
  return (
    <th
      scope="col"
      className={thClassName}
      onClick={() => onSort(sortKey)}
      aria-sort={isSorted ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <div className={`flex items-center text-secondary-text dark:text-dark-secondary-text ${className.includes('text-right') ? 'justify-end' : ''}`}>
        {children}
        <span className="w-4 h-4 ml-1.5 flex-shrink-0">
          {isSorted ? (
            sortConfig?.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />
          ) : <ChevronUpIcon className="opacity-30 group-hover:opacity-100" />}
        </span>
      </div>
    </th>
  );
};

const AgeingCell: React.FC<{ days: number | null }> = ({ days }) => {
    if (days === null || days < 0) {
        return <span className="text-secondary-text">-</span>;
    }

    let colorClass = '';
    if (days > 90) colorClass = 'text-red-800 bg-red-100 dark:bg-red-900/20 dark:text-red-300';
    else if (days > 60) colorClass = 'text-orange-800 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300';
    else if (days > 30) colorClass = 'text-yellow-800 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300';
    else colorClass = 'text-green-800 bg-green-100 dark:bg-green-900/20 dark:text-green-300';

    const dayText = days === 1 ? 'day' : 'days';

    return (
        <span className={`text-xs font-semibold ${colorClass} px-2 py-0.5 rounded-md`}>
            {days} {dayText}
        </span>
    );
};

const ProfitTooltip: React.FC<{ value: number }> = ({ value }) => (
  <div className="absolute bottom-full mb-2 w-max p-2 text-xs text-white bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)} Profit
    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
  </div>
);

const ProfitMarginCell: React.FC<{ margin: number | null; profit: number | null }> = ({ margin, profit }) => {
    if (margin === null || isNaN(margin)) return <span className="text-secondary-text dark:text-dark-secondary-text">-</span>;
    const color = margin < 10 ? 'text-red-600 dark:text-red-400' : margin < 20 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400';
    return (
        <div className="relative group flex justify-end">
             <span className={`font-semibold ${color}`}>{margin.toFixed(1)}%</span>
            {profit !== null && <ProfitTooltip value={profit} />}
        </div>
    );
};

const KpiCard: React.FC<{ title: string; value: number; icon: React.FC<any>; formatter?: (val: number) => string; }> = ({ title, value, icon: Icon, formatter }) => (
    <Card className="p-4">
        <div className="flex items-center">
            <div className="flex-shrink-0 bg-highlight-hover p-3 rounded-lg">
                <Icon className="h-6 w-6 text-highlight" />
            </div>
            <div className="ml-4">
                <dt className="text-sm font-medium text-secondary-text truncate">{title}</dt>
                <dd className="text-2xl font-bold text-primary-text"><AnimatedCounter to={value} formatter={formatter} /></dd>
            </div>
        </div>
    </Card>
);

// --- Main Component ---
interface PriceListPageProps {
    localFilters: LocalFiltersState;
    userRole: string;
}

const PriceListPage: React.FC<PriceListPageProps> = ({ localFilters, userRole }) => {
    const { data, isLoading, error, refreshData, updateItem } = usePriceListData();
    const { allOrders, allSales, allSerializedItems, inventoryData, salesMetricsByMtm } = useData();
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'modelName', direction: 'asc' });
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedItemForAI, setSelectedItemForAI] = useState<AugmentedMtmGroup | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [localFilters, sortConfig]);

    const weeklySalesDataByMtm = useMemo(() => {
        const map = new Map<string, number[]>();
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);

        const relevantSales = allSales.filter(s => s.invoiceDate && new Date(s.invoiceDate) >= ninetyDaysAgo);

        relevantSales.forEach(sale => {
            const saleDate = new Date(sale.invoiceDate!);
            const weekIndex = Math.floor((saleDate.getTime() - ninetyDaysAgo.getTime()) / (7 * 24 * 60 * 60 * 1000));
            
            if (weekIndex >= 0 && weekIndex < 13) {
                if (!map.has(sale.lenovoProductNumber)) {
                    map.set(sale.lenovoProductNumber, Array(13).fill(0));
                }
                map.get(sale.lenovoProductNumber)![weekIndex] += sale.quantity;
            }
        });
        return map;
    }, [allSales]);

    const aggregatedData: AugmentedMtmGroup[] = useMemo(() => {
        const inventoryMap = new Map(inventoryData.map(item => [item.mtm, item]));

        const onHandQtyMap = new Map<string, number>();
        const soldSerialsSet = new Set(allSales.map(s => s.serialNumber));
        const arrivalStatusMap = new Map<string, boolean>();
        allOrders.forEach(order => {
            if (order.actualArrival) arrivalStatusMap.set(`${order.salesOrder}-${order.mtm}`, true);
        });

        allSerializedItems.forEach(item => {
            const key = `${item.salesOrder}-${item.mtm}`;
            if (arrivalStatusMap.has(key) && !soldSerialsSet.has(item.fullSerializedString)) {
                onHandQtyMap.set(key, (onHandQtyMap.get(key) || 0) + 1);
            }
        });

        const otwQtyMap = new Map<string, number>();
        allOrders.forEach(order => {
            if (!order.actualArrival) {
                const key = `${order.salesOrder}-${order.mtm}`;
                otwQtyMap.set(key, (otwQtyMap.get(key) || 0) + order.qty);
            }
        });

        const arrivalDateMap = new Map<string, string>();
        allOrders.forEach(order => {
            if (order.actualArrival) {
                const key = `${order.salesOrder}-${order.mtm}`;
                if (!arrivalDateMap.has(key) || order.actualArrival > arrivalDateMap.get(key)!) {
                    arrivalDateMap.set(key, order.actualArrival);
                }
            }
        });

        const dataByMtm = new Map<string, PriceListItemWithId[]>();
        data.forEach(item => {
            if (!dataByMtm.has(item.mtm)) dataByMtm.set(item.mtm, []);
            dataByMtm.get(item.mtm)!.push(item);
        });

        return Array.from(dataByMtm.entries()).map(([mtm, items]) => {
            const firstItem = items[0];
            const inventoryItem = inventoryMap.get(mtm);
            const metrics = salesMetricsByMtm.get(mtm);

            const salesOrderDetails = items.map(detailItem => {
                const key = `${detailItem.salesOrder}-${detailItem.mtm}`;
                const arrivalDate = arrivalDateMap.get(key) || null;
                const ageing = arrivalDate ? Math.floor((new Date().getTime() - new Date(arrivalDate).getTime()) / (1000 * 3600 * 24)) : null;

                return {
                    salesOrder: detailItem.salesOrder,
                    shippedQty: (allOrders.find(o => o.salesOrder === detailItem.salesOrder && o.mtm === mtm)?.qty || 0),
                    onHandQty: onHandQtyMap.get(key) || 0,
                    otwQty: otwQtyMap.get(key) || 0,
                    color: detailItem.color,
                    arrivalDate,
                    ageing,
                };
            }).sort((a,b) => a.salesOrder.localeCompare(b.salesOrder));
            
            const avgCost = inventoryItem?.averageLandingCost || 0;
            const onHandQty = inventoryItem?.onHandQty || 0;
            const sdp = firstItem.sdp;
            const srp = firstItem.srp;

            return {
                _uniqueId: mtm, mtm, modelName: firstItem.modelName,
                productLine: inventoryItem?.productLine || 'N/A',
                description: firstItem.description,
                specification: inventoryItem?.specification || firstItem.description,
                sdp, srp,
                onHandQty: onHandQty,
                otwQty: inventoryItem?.otwQty || 0,
                onHandValue: inventoryItem?.onHandValue || 0,
                otwValue: inventoryItem?.otwValue || 0,
                averageLandingCost: avgCost,
                weeksOfInventory: inventoryItem?.weeksOfInventory ?? null,
                sdpMargin: sdp > 0 && avgCost > 0 ? ((sdp - avgCost) / sdp) * 100 : null,
                srpMargin: srp > 0 && sdp > 0 ? ((srp - sdp) / srp) * 100 : null,
                sdpProfit: sdp > 0 && avgCost > 0 ? sdp - avgCost : null,
                srpProfit: srp > 0 && sdp > 0 ? srp - sdp : null,
                sales90d: metrics?.total90 || 0,
                weeklySales: weeklySalesDataByMtm.get(mtm) || [],
                salesOrderDetails,
            };
        });
    }, [data, inventoryData, allSales, allOrders, allSerializedItems, salesMetricsByMtm, weeklySalesDataByMtm]);
    
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    };

    const requestSort = (key: SortKey) => {
        let direction: SortOrder = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const toggleExpansion = (mtm: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(mtm)) {
                newSet.delete(mtm);
            } else {
                newSet.add(mtm);
            }
            return newSet;
        });
    };

    const handleUpdatePrice = useCallback(async (mtm: string, field: 'sdp' | 'srp', newValue: number) => {
        await updateItem(mtm, { [field]: newValue });
    }, [updateItem]);

    const handleApplyAISuggestion = (mtm: string, sdp: number, srp: number) => {
        handleUpdatePrice(mtm, 'sdp', sdp);
        handleUpdatePrice(mtm, 'srp', srp);
    };
    
    const sortedAndFilteredData = useMemo(() => {
        const { priceListSearchTerm, priceListProductLine, priceListStockStatus } = localFilters;
        let filteredData = [...aggregatedData];
        if (priceListSearchTerm) {
            const lower = priceListSearchTerm.toLowerCase();
            filteredData = filteredData.filter(item =>
                item.mtm.toLowerCase().includes(lower) ||
                item.modelName.toLowerCase().includes(lower) ||
                item.description.toLowerCase().includes(lower) ||
                item.salesOrderDetails.some(d => d.salesOrder.toLowerCase().includes(lower) || d.color.toLowerCase().includes(lower))
            );
        }
        
        if (priceListProductLine !== 'all') {
            filteredData = filteredData.filter(item => item.productLine === priceListProductLine);
        }

        if (priceListStockStatus !== 'all') {
            filteredData = filteredData.filter(item => {
                const weeks = item.weeksOfInventory;
                if (priceListStockStatus === 'outOfStock') return item.onHandQty <= 0;
                if (priceListStockStatus === 'lowStock') return item.onHandQty > 0 && weeks !== null && weeks <= 12;
                if (priceListStockStatus === 'inStock') return item.onHandQty > 0;
                return true;
            });
        }
        
        if (sortConfig !== null) {
            const { key, direction } = sortConfig;
            filteredData.sort((a, b) => {
                const aVal = a[key], bVal = b[key];
                
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;

                if (aVal < bVal) {
                  return direction === 'asc' ? -1 : 1;
                }
                if (aVal > bVal) {
                  return direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return filteredData;
    }, [aggregatedData, localFilters, sortConfig]);
    
    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    const fullCurrencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    const percentFormatter = (val: number) => `${val.toFixed(1)}%`;

    const priceListKpis = useMemo(() => {
        const totalOnHandValue = sortedAndFilteredData.reduce((sum, item) => sum + (item.onHandValue || 0), 0);
        const totalOtwValue = sortedAndFilteredData.reduce((sum, item) => sum + (item.otwValue || 0), 0);
        
        let totalSdpProfitValue = 0;
        let totalSdpRevenuePotential = 0;
        
        sortedAndFilteredData.forEach(item => {
            if (item.onHandQty > 0 && item.sdp > 0 && item.sdpProfit !== null) {
                totalSdpProfitValue += item.sdpProfit * item.onHandQty;
                totalSdpRevenuePotential += item.sdp * item.onHandQty;
            }
        });

        const weightedAvgSdpMargin = totalSdpRevenuePotential > 0 ? (totalSdpProfitValue / totalSdpRevenuePotential) * 100 : 0;
        
        const totalListedMtms = sortedAndFilteredData.length;
        const totalUnitsInStock = sortedAndFilteredData.reduce((sum, item) => sum + item.onHandQty, 0);

        return {
            totalInventoryValue: totalOnHandValue + totalOtwValue,
            weightedAvgSdpMargin,
            totalListedMtms,
            totalUnitsInStock,
        };
    }, [sortedAndFilteredData]);


    const profitabilityChartData = useMemo(() => {
        const dataByProductLine = sortedAndFilteredData.reduce((acc, item) => {
            const pl = item.productLine || 'N/A';
            if (!acc[pl]) {
                acc[pl] = { totalSdpProfitValue: 0, totalSdpRevenuePotential: 0, count: 0 };
            }
            if (item.onHandQty > 0 && item.sdp > 0 && item.sdpProfit !== null) {
                acc[pl].totalSdpProfitValue += item.sdpProfit * item.onHandQty;
                acc[pl].totalSdpRevenuePotential += item.sdp * item.onHandQty;
            }
            acc[pl].count++;
            return acc;
        }, {} as Record<string, { totalSdpProfitValue: number, totalSdpRevenuePotential: number, count: number }>);
        
        return Object.entries(dataByProductLine)
            .map(([name, { totalSdpProfitValue, totalSdpRevenuePotential, count }]) => ({
                name,
                margin: totalSdpRevenuePotential > 0 ? (totalSdpProfitValue / totalSdpRevenuePotential) * 100 : 0,
                count
            }))
            .filter(d => d.margin > 0)
            .sort((a, b) => b.margin - a.margin);

    }, [sortedAndFilteredData]);

    const RenderContent = () => {
        const totalPages = Math.ceil(sortedAndFilteredData.length / itemsPerPage);
        const paginatedData = useMemo(() => {
            return sortedAndFilteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        }, [sortedAndFilteredData, currentPage, itemsPerPage]);

        if (isLoading) return <div className="space-y-2 mt-4">{[...Array(10)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
        if (error) return <div className="flex items-center justify-center min-h-[300px] bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg"><ExclamationTriangleIcon className="h-6 w-6 mr-3" /><div><h3 className="font-semibold">Failed to load price list</h3><p className="text-sm">{error}</p></div></div>;
        if (sortedAndFilteredData.length === 0) return <div className="text-center py-10"><DocumentMagnifyingGlassIcon className="mx-auto h-12 w-12 text-secondary-text dark:text-dark-secondary-text" /><h3 className="mt-2 text-sm font-semibold text-primary-text dark:text-dark-primary-text">No matching items found</h3><p className="mt-1 text-sm text-secondary-text dark:text-dark-secondary-text">Try adjusting your search or filters.</p></div>;

        return (
            <>
                 {/* Mobile Card List */}
                <div className="md:hidden space-y-4">
                    {paginatedData.map(item => {
                        const isExpanded = expandedRows.has(item.mtm);
                        return (
                            <Card key={item.mtm} className={`p-0 overflow-hidden`} onClick={() => toggleExpansion(item.mtm)}>
                                <div className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-primary-text dark:text-dark-primary-text">{item.modelName}</p>
                                            <p className="text-sm font-mono text-secondary-text dark:text-dark-secondary-text">{item.mtm}</p>
                                            <p className="text-xs text-secondary-text/80 dark:text-dark-secondary-text/80 whitespace-pre-wrap mt-1">{item.description}</p>
                                        </div>
                                        <ChevronRightIcon className={`h-6 w-6 text-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                    </div>
                                    <div className="mt-3 text-center">
                                        <StockHealthBadge onHandQty={item.onHandQty} weeksOfInventory={item.weeksOfInventory} />
                                    </div>
                                    <div className={`mt-4 grid ${userRole === 'Marketing' ? 'grid-cols-1' : 'grid-cols-2'} gap-4 border-t border-border-color pt-3`}>
                                        {userRole !== 'Marketing' && (
                                            <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                                                <EditablePriceCell initialValue={item.sdp} onSave={val => handleUpdatePrice(item.mtm, 'sdp', val)} formatter={currencyFormatter} isEditable={userRole !== 'Marketing'} />
                                            </div>
                                        )}
                                        <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                                            <EditablePriceCell initialValue={item.srp} onSave={val => handleUpdatePrice(item.mtm, 'srp', val)} formatter={currencyFormatter} isEditable={userRole !== 'Marketing'} />
                                        </div>
                                    </div>
                                    {userRole !== 'Marketing' && (
                                        <div className="mt-4 flex justify-end">
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedItemForAI(item); }} className="p-2 rounded-full text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors" title="Get AI Price Suggestion">
                                                <SparklesIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-3 bg-gray-50 dark:bg-dark-secondary-bg/30 text-sm space-y-2">
                                                 <h4 className="text-sm font-semibold text-primary-text px-1 mb-2">Sales Order & Stock Details</h4>
                                                 {item.salesOrderDetails.map((so, idx) => (
                                                     <div key={idx} className="bg-white dark:bg-dark-secondary-bg/50 p-2 rounded-md">
                                                         <div className="flex justify-between font-semibold"><span>{so.salesOrder}</span> <AgeingCell days={so.ageing} /></div>
                                                         <div className="grid grid-cols-3 text-center mt-1 pt-1 border-t text-xs">
                                                            <div><span className="text-secondary-text">On Hand: </span><span className="font-medium">{so.onHandQty}</span></div>
                                                            <div><span className="text-secondary-text">OTW: </span><span className="font-medium">{so.otwQty}</span></div>
                                                            <div><span className="text-secondary-text">Color: </span><span className="font-medium">{so.color}</span></div>
                                                         </div>
                                                     </div>
                                                 ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Card>
                        )
                    })}
                </div>
                
                 {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto border border-border-color dark:border-dark-border-color rounded-lg">
                    <table className="min-w-full">
                        <thead className="bg-gray-50 dark:bg-dark-secondary-bg/50 sticky top-0 z-10">
                            <tr>
                                <th className="w-12"></th>
                                <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="mtm">Product</TableHeader>
                                <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="onHandQty" className="text-center">Stock Health</TableHeader>
                                <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="sales90d" className="text-center">Sales Trend (90d)</TableHeader>
                                {userRole !== 'Marketing' && <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="sdp" className="text-right">SDP</TableHeader>}
                                <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="srp" className="text-right">SRP</TableHeader>
                                <th className="px-4 py-3.5 text-center text-xs font-semibold text-secondary-text dark:text-dark-secondary-text uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-secondary-bg dark:bg-dark-secondary-bg">
                            {paginatedData.map(item => {
                                const isExpanded = expandedRows.has(item.mtm);
                                return (
                                    <Fragment key={item.mtm}>
                                        <tr className="border-b border-border-color dark:border-dark-border-color hover:bg-gray-50 dark:hover:bg-dark-primary-bg">
                                            <td className="px-4 py-2 text-center">
                                                <button onClick={() => toggleExpansion(item.mtm)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-dark-border-color">
                                                    <ChevronRightIcon className={`h-5 w-5 text-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-2 text-sm">
                                                <div className="font-medium text-primary-text dark:text-dark-primary-text">{item.modelName}</div>
                                                <div className="text-xs text-secondary-text dark:text-dark-secondary-text font-mono">{item.mtm}</div>
                                                <div className="text-xs text-secondary-text/80 dark:text-dark-secondary-text/80 whitespace-pre-wrap">{item.description}</div>
                                            </td>
                                            <td className="px-4 py-2 text-center"><StockHealthBadge onHandQty={item.onHandQty} weeksOfInventory={item.weeksOfInventory} /></td>
                                            <td className="px-4 py-2 text-center"><Sparkline data={item.weeklySales} /></td>
                                            {userRole !== 'Marketing' && (
                                                <td className="px-4 py-2 text-right"><EditablePriceCell initialValue={item.sdp} onSave={val => handleUpdatePrice(item.mtm, 'sdp', val)} formatter={currencyFormatter} isEditable={userRole !== 'Marketing'} /></td>
                                            )}
                                            <td className="px-4 py-2 text-right"><EditablePriceCell initialValue={item.srp} onSave={val => handleUpdatePrice(item.mtm, 'srp', val)} formatter={currencyFormatter} isEditable={userRole !== 'Marketing'} /></td>
                                            <td className="px-4 py-2 text-center">
                                                {userRole !== 'Marketing' && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setSelectedItemForAI(item); }} 
                                                        className="p-2 rounded-full text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                                                        title="Get AI Price Suggestion"
                                                    >
                                                        <SparklesIcon className="h-5 w-5" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        <tr className="p-0">
                                            <td colSpan={userRole === 'Marketing' ? 6 : 7} className="p-0 border-0">
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="p-3 bg-gray-50 dark:bg-dark-secondary-bg/30">
                                                                 <h4 className="text-sm font-semibold text-primary-text px-3 mb-2">Sales Order & Stock Details</h4>
                                                                <table className="min-w-full text-sm">
                                                                    <thead className="text-xs text-secondary-text dark:text-dark-secondary-text">
                                                                        <tr>
                                                                            <th className="px-3 py-1.5 text-left font-medium">SO</th>
                                                                            <th className="px-3 py-1.5 text-center font-medium">On Hand</th>
                                                                            <th className="px-3 py-1.5 text-center font-medium">OTW</th>
                                                                            <th className="px-3 py-1.5 text-left font-medium">Color</th>
                                                                            <th className="px-3 py-1.5 text-left font-medium">Arrival Date</th>
                                                                            <th className="px-3 py-1.5 text-center font-medium">Ageing</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-border-color dark:divide-dark-border-color">
                                                                        {item.salesOrderDetails.map((so, idx) => (
                                                                            <tr key={`${so.salesOrder}-${idx}`} className="text-primary-text dark:text-dark-primary-text">
                                                                                <td className="px-3 py-1.5 whitespace-nowrap">{so.salesOrder}</td>
                                                                                <td className="px-3 py-1.5 text-center">{so.onHandQty}</td>
                                                                                <td className="px-3 py-1.5 text-center">{so.otwQty}</td>
                                                                                <td className="px-3 py-1.5 whitespace-nowrap">{so.color}</td>
                                                                                <td className="px-3 py-1.5 whitespace-nowrap">{so.arrivalDate ? new Date(so.arrivalDate).toLocaleDateString('en-CA') : '-'}</td>
                                                                                <td className="px-3 py-1.5 text-center"><AgeingCell days={so.ageing} /></td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </td>
                                        </tr>
                                    </Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="py-3 flex flex-col sm:flex-row items-center justify-center sm:justify-between border-t border-border-color dark:border-dark-border-color mt-4 gap-4">
                        <div>
                            <p className="text-sm text-secondary-text dark:text-dark-secondary-text">
                                Showing <span className="font-medium">{sortedAndFilteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedAndFilteredData.length)}</span> of{' '}
                                <span className="font-medium">{sortedAndFilteredData.length}</span> items
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <label htmlFor="items-per-page-select-price-list" className="text-sm text-secondary-text dark:text-dark-secondary-text">Rows:</label>
                            <select
                                id="items-per-page-select-price-list"
                                value={itemsPerPage}
                                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1 px-2 text-primary-text dark:text-dark-primary-text text-sm focus:ring-highlight focus:border-highlight"
                            >
                                <option value="15">15</option>
                                <option value="30">30</option>
                                <option value="50">50</option>
                            </select>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text hover:bg-gray-50 dark:hover:bg-dark-primary-bg disabled:opacity-50 transition-colors"
                                >
                                    Previous
                                </button>
                                <span className="relative inline-flex items-center px-4 py-2 border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text hover:bg-gray-50 dark:hover:bg-dark-primary-bg disabled:opacity-50 transition-colors"
                                >
                                    Next
                                </button>
                            </nav>
                        </div>
                    </div>
                )}
            </>
        )
    };

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
            >
                <div className="flex items-center gap-x-3">
                    <BanknotesIcon className="h-8 w-8 text-primary-text dark:text-dark-primary-text" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-primary-text dark:text-dark-primary-text">Price & Profitability Center</h1>
                        <p className="text-secondary-text dark:text-dark-secondary-text mt-1">Analyze costs, manage pricing, and optimize margins with AI-powered insights.</p>
                    </div>
                </div>

                {userRole === 'Admin' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <KpiCard title="Total Inventory Value" value={priceListKpis.totalInventoryValue} icon={BanknotesIcon} formatter={fullCurrencyFormatter} />
                                <KpiCard title="Weighted Avg. SDP Margin" value={priceListKpis.weightedAvgSdpMargin} icon={ChartBarIcon} formatter={(v) => `${v.toFixed(1)}%`} />
                            </div>
                        </div>
                        <div className="h-[350px]">
                            <ProfitabilityChart data={profitabilityChartData} />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <KpiCard title="Listed MTMs" value={priceListKpis.totalListedMtms} icon={CubeIcon} formatter={(v) => v.toLocaleString()} />
                        <KpiCard title="Total Units In Stock" value={priceListKpis.totalUnitsInStock} icon={CubeIcon} formatter={(v) => v.toLocaleString()} />
                    </div>
                )}
            
                <Card className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-primary-text dark:text-dark-primary-text">Price List</h3>
                             <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1">Click a price to edit. Use AI for competitive suggestions.</p>
                        </div>
                        <div className="flex items-center gap-x-4">
                            <button onClick={handleRefresh} disabled={isRefreshing} className="p-2 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover" title="Refresh Price List Data">
                                <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    <RenderContent />
                </Card>
            </motion.div>
             <AIPricingModal 
                isOpen={!!selectedItemForAI} 
                onClose={() => setSelectedItemForAI(null)} 
                item={selectedItemForAI}
                onApply={handleApplyAISuggestion}
                userRole={userRole}
            />
        </main>
    );
};

export default PriceListPage;