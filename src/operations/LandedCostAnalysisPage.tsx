import React, { useState, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import Card from '../ui/Card';
import KpiCard from '../ui/KpiCard';
import { DashboardType } from '../../types';
import { BanknotesIcon, CubeIcon, DocumentMagnifyingGlassIcon, TruckIcon, ChevronUpIcon, ChevronDownIcon, ChevronRightIcon, ChartBarIcon, ScaleIcon } from '../ui/Icons';


// --- Type Definitions ---
interface CostAnalysisItem {
    salesOrder: string;
    mtm: string;
    modelName: string;
    qty: number;
    fobUnitPrice: number;
    totalFobValue: number;
    shippingCostPerUnit: number;
    totalShippingCost: number;
    accessoryCostPerUnit: number;
    totalAccessoryCost: number;
    landedCostPerUnit: number;
    totalLandedCost: number;
    costUpliftPercentage: number;
}
interface CostAnalysisGroup {
    salesOrder: string;
    items: CostAnalysisItem[];
    totalFobValue: number;
    totalShippingCost: number;
    totalAccessoryCost: number;
    totalLandedCost: number;
    totalQty: number;
    itemCount: number;
    avgUpliftPercentage: number;
}
type SortKey = keyof Omit<CostAnalysisGroup, 'items'>;
type SortOrder = 'asc' | 'desc';
interface SortConfig {
  key: SortKey;
  direction: SortOrder;
}
interface LandedCostAnalysisPageProps {
    onNavigateAndFilter: (target: DashboardType, mtm: string) => void;
}

// --- Sub-components ---
const TableHeader: React.FC<{ onSort: (key: SortKey) => void; sortConfig: SortConfig | null; sortKey: SortKey; children: React.ReactNode; className?: string; }> = ({ onSort, sortConfig, sortKey, children, className = '' }) => {
    const isSorted = sortConfig?.key === sortKey;
    const thClassName = `px-4 py-3.5 text-xs font-semibold uppercase tracking-wider select-none cursor-pointer group ${className || 'text-left'}`;
    return (
        <th scope="col" className={thClassName} onClick={() => onSort(sortKey)} aria-sort={isSorted ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <div className={`flex items-center text-gray-600 dark:text-gray-400 ${className?.includes('text-right') ? 'justify-end' : ''}`}>
                {children}
                <span className="w-4 h-4 ml-1.5 flex-shrink-0">{isSorted ? (sortConfig?.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />) : <ChevronUpIcon className="opacity-30 group-hover:opacity-100" />}</span>
            </div>
        </th>
    );
};

// --- Main Component ---
const LandedCostAnalysisPage: React.FC<LandedCostAnalysisPageProps> = ({ onNavigateAndFilter }) => {
    const { allOrders, allShipments, allBackpackCosts } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'salesOrder', direction: 'asc' });
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    const groupedData: CostAnalysisGroup[] = useMemo(() => {
        const shipmentCostMap = new Map<string, number>();
        allShipments.forEach(s => shipmentCostMap.set(`${s.salesOrder}-${s.mtm}`, s.shippingCost));

        const accessoryCostMap = new Map<string, number>();
        allBackpackCosts.forEach(a => accessoryCostMap.set(`${a.so}-${a.mtm}`, a.backpackCost));

        const costItems: CostAnalysisItem[] = allOrders.map(order => {
            const key = `${order.salesOrder}-${order.mtm}`;
            const shippingCostPerUnit = shipmentCostMap.get(key) || 0;
            const accessoryCostPerUnit = accessoryCostMap.get(key) || 0;
            const landedCostPerUnit = order.fobUnitPrice + shippingCostPerUnit + accessoryCostPerUnit;
            const totalFobValue = order.orderValue;
            const totalLandedCost = landedCostPerUnit * order.qty;

            return {
                salesOrder: order.salesOrder, mtm: order.mtm, modelName: order.modelName, qty: order.qty,
                fobUnitPrice: order.fobUnitPrice, totalFobValue,
                shippingCostPerUnit, totalShippingCost: shippingCostPerUnit * order.qty,
                accessoryCostPerUnit, totalAccessoryCost: accessoryCostPerUnit * order.qty,
                landedCostPerUnit, totalLandedCost,
                costUpliftPercentage: totalFobValue > 0 ? ((totalLandedCost - totalFobValue) / totalFobValue) * 100 : 0,
            };
        });

        const groups = costItems.reduce((acc, item) => {
            if (!acc[item.salesOrder]) acc[item.salesOrder] = [];
            acc[item.salesOrder].push(item);
            return acc;
        }, {} as Record<string, CostAnalysisItem[]>);

        return Object.entries(groups).map(([so, items]) => {
            const totals = items.reduce((acc, i) => {
                acc.totalQty += i.qty;
                acc.totalFobValue += i.totalFobValue;
                acc.totalShippingCost += i.totalShippingCost;
                acc.totalAccessoryCost += i.totalAccessoryCost;
                acc.totalLandedCost += i.totalLandedCost;
                return acc;
            }, { totalQty: 0, totalFobValue: 0, totalShippingCost: 0, totalAccessoryCost: 0, totalLandedCost: 0 });
            
            const avgUpliftPercentage = totals.totalFobValue > 0 ? ((totals.totalLandedCost - totals.totalFobValue) / totals.totalFobValue) * 100 : 0;
            return { salesOrder: so, items, itemCount: items.length, ...totals, avgUpliftPercentage };
        });
    }, [allOrders, allShipments, allBackpackCosts]);

    const requestSort = (key: SortKey) => {
        let direction: SortOrder = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const toggleExpansion = (so: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(so)) newSet.delete(so);
            else newSet.add(so);
            return newSet;
        });
    };

    const sortedAndFilteredData = useMemo(() => {
        let filteredData = [...groupedData];
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filteredData = filteredData.filter(group => group.salesOrder.toLowerCase().includes(lower) || group.items.some(item => item.mtm.toLowerCase().includes(lower) || item.modelName.toLowerCase().includes(lower)));
        }
        if (sortConfig) {
            filteredData.sort((a, b) => {
                const aVal = a[sortConfig.key], bVal = b[sortConfig.key];
                const comparison = typeof aVal === 'number' && typeof bVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
        }
        return filteredData;
    }, [groupedData, searchTerm, sortConfig]);

    const kpis = useMemo(() => {
        return sortedAndFilteredData.reduce((acc, group) => {
            acc.totalLandedCost += group.totalLandedCost;
            acc.totalFobValue += group.totalFobValue;
            acc.totalShippingCost += group.totalShippingCost;
            acc.totalAccessoryCost += group.totalAccessoryCost;
            return acc;
        }, { totalLandedCost: 0, totalFobValue: 0, totalShippingCost: 0, totalAccessoryCost: 0 });
    }, [sortedAndFilteredData]);
    const avgUplift = kpis.totalFobValue > 0 ? ((kpis.totalLandedCost - kpis.totalFobValue) / kpis.totalFobValue) * 100 : 0;

    const totalPages = Math.ceil(sortedAndFilteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => sortedAndFilteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [sortedAndFilteredData, currentPage, itemsPerPage]);

    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    const fullCurrencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    const percentFormatter = (val: number) => `${val.toFixed(1)}%`;

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="flex items-center gap-x-3 mb-4">
                    <ScaleIcon className="h-8 w-8 text-primary-text dark:text-dark-primary-text" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-primary-text dark:text-dark-primary-text">Landed Cost Analysis</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Combine FOB, shipping, and accessory costs for a true cost of goods.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <KpiCard label="Total Landed Value" value={kpis.totalLandedCost} icon={<BanknotesIcon />} formatter={fullCurrencyFormatter} />
                    <KpiCard label="Total Shipping Costs" value={kpis.totalShippingCost} icon={<TruckIcon />} formatter={fullCurrencyFormatter} />
                    <KpiCard label="Total Accessory Costs" value={kpis.totalAccessoryCost} icon={<CubeIcon />} formatter={fullCurrencyFormatter} />
                    <KpiCard label="Avg. Cost Uplift vs FOB" value={avgUplift} icon={<ChartBarIcon />} formatter={percentFormatter} description={`FOB: ${fullCurrencyFormatter(kpis.totalFobValue)}`} />
                </div>
                
                <Card className="p-4 sm:p-6">
                    <div className="flex justify-end mb-4">
                        <input type="text" placeholder="Search by SO, MTM, Model..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="block w-full sm:w-80 bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-2 px-3 text-primary-text dark:text-dark-primary-text placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm" />
                    </div>
                    
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 dark:bg-dark-secondary-bg/50">
                                <tr>
                                    <th className="w-12"></th>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="salesOrder">Sales Order</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalQty" className="text-center">QTY</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalFobValue" className="text-right">FOB Value</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalShippingCost" className="text-right">Shipping</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalAccessoryCost" className="text-right">Accessories</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalLandedCost" className="text-right">Total Landed Cost</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="avgUpliftPercentage" className="text-right">Uplift %</TableHeader>
                                </tr>
                            </thead>
                            <tbody className="bg-secondary-bg dark:bg-dark-secondary-bg">
                                {paginatedData.map(group => {
                                    const isExpanded = expandedRows.has(group.salesOrder);
                                    return (
                                        <Fragment key={group.salesOrder}>
                                            <tr className="border-b border-border-color dark:border-dark-border-color hover:bg-gray-50 dark:hover:bg-dark-primary-bg cursor-pointer" onClick={() => toggleExpansion(group.salesOrder)}>
                                                <td className="px-4 py-3 text-center"><ChevronRightIcon className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} /></td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm"><div className="font-medium text-gray-900 dark:text-gray-100">{group.salesOrder}</div><div className="text-xs text-gray-500 dark:text-gray-400">{group.itemCount} MTM(s)</div></td>
                                                <td className="px-4 py-3 text-center font-medium text-gray-800 dark:text-gray-200">{group.totalQty.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-200">{currencyFormatter(group.totalFobValue)}</td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-200">{currencyFormatter(group.totalShippingCost)}</td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-200">{currencyFormatter(group.totalAccessoryCost)}</td>
                                                <td className="px-4 py-3 text-right font-semibold text-highlight">{currencyFormatter(group.totalLandedCost)}</td>
                                                <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">{percentFormatter(group.avgUpliftPercentage)}</td>
                                            </tr>
                                            <tr className="p-0"><td colSpan={8} className="p-0 border-0">
                                                <AnimatePresence>{isExpanded && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                    <div className="p-3 bg-slate-50 dark:bg-dark-primary-bg"><table className="min-w-full text-sm">
                                                        <thead className="text-xs text-gray-500 dark:text-gray-400"><tr className="border-b border-border-color dark:border-dark-border-color">
                                                            <th className="px-3 py-1.5 text-left font-medium">MTM / Model</th><th className="px-3 py-1.5 text-center font-medium">QTY</th><th className="px-3 py-1.5 text-right font-medium">FOB/u</th><th className="px-3 py-1.5 text-right font-medium">Ship/u</th><th className="px-3 py-1.5 text-right font-medium">Acc/u</th><th className="px-3 py-1.5 text-right font-medium">Landed/u</th><th className="px-3 py-1.5 text-right font-medium">Total Landed</th>
                                                        </tr></thead>
                                                        <tbody className="divide-y divide-border-color dark:divide-dark-border-color">
                                                            {group.items.map((item, idx) => (<tr key={idx} className="bg-secondary-bg dark:bg-dark-secondary-bg"><td className="px-3 py-1.5"><div className="font-mono text-xs text-gray-600 dark:text-gray-400">{item.mtm}</div><div className="truncate max-w-xs text-gray-800 dark:text-gray-200">{item.modelName}</div></td><td className="px-3 py-1.5 text-center text-gray-800 dark:text-gray-200">{item.qty}</td><td className="px-3 py-1.5 text-right text-gray-800 dark:text-gray-200">{currencyFormatter(item.fobUnitPrice)}</td><td className="px-3 py-1.5 text-right text-gray-800 dark:text-gray-200">{currencyFormatter(item.shippingCostPerUnit)}</td><td className="px-3 py-1.5 text-right text-gray-800 dark:text-gray-200">{currencyFormatter(item.accessoryCostPerUnit)}</td><td className="px-3 py-1.5 text-right font-semibold text-gray-900 dark:text-gray-100">{currencyFormatter(item.landedCostPerUnit)}</td><td className="px-3 py-1.5 text-right font-semibold text-gray-900 dark:text-gray-100">{currencyFormatter(item.totalLandedCost)}</td></tr>))}
                                                        </tbody>
                                                    </table></div></motion.div>}</AnimatePresence>
                                            </td></tr>
                                        </Fragment>
                                    );
                                })
                            }</tbody>
                        </table>
                    </div>

                     {/* Mobile Card List */}
                     <div className="md:hidden space-y-4">
                        {paginatedData.map(group => {
                            const isExpanded = expandedRows.has(group.salesOrder);
                            return (
                                <Card key={group.salesOrder} className="p-0 overflow-hidden" onClick={() => toggleExpansion(group.salesOrder)}>
                                    <div className="p-4">
                                        <div className="flex justify-between items-start"><div className="flex-1 min-w-0"><p className="font-bold text-lg text-primary-text dark:text-dark-primary-text">{group.salesOrder}</p><p className="text-sm text-gray-500 dark:text-gray-400">{group.itemCount} MTM(s)</p></div><ChevronRightIcon className={`h-6 w-6 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} /></div>
                                        <div className="mt-4 grid grid-cols-3 gap-4 text-center border-t border-border-color dark:border-dark-border-color pt-3">
                                            <div><p className="text-xs text-gray-500 dark:text-gray-400">Total Qty</p><p className="font-bold text-primary-text dark:text-dark-primary-text">{group.totalQty.toLocaleString()}</p></div>
                                            <div><p className="text-xs text-gray-500 dark:text-gray-400">Items</p><p className="font-bold text-primary-text dark:text-dark-primary-text">{group.itemCount}</p></div>
                                            <div><p className="text-xs text-gray-500 dark:text-gray-400">Total Landed Cost</p><p className="font-bold text-highlight">{fullCurrencyFormatter(group.totalLandedCost)}</p></div>
                                        </div>
                                    </div>
                                    <AnimatePresence>
                                        {isExpanded && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                            <div className="p-2 bg-slate-50/70 dark:bg-dark-primary-bg space-y-1">
                                                {group.items.map((item, idx) => (
                                                    <div key={idx} className="bg-secondary-bg dark:bg-dark-secondary-bg/50 rounded-md p-2">
                                                        <div className="flex justify-between items-start text-sm">
                                                            <div>
                                                                <p className="font-semibold truncate text-primary-text dark:text-dark-primary-text">{item.modelName}</p>
                                                                <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{item.mtm}</p>
                                                            </div>
                                                            <p className="font-medium text-primary-text dark:text-dark-primary-text ml-2">{currencyFormatter(item.totalLandedCost)}</p>
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            QTY: {item.qty} @ {currencyFormatter(item.landedCostPerUnit)}/unit
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>}
                                    </AnimatePresence>
                                </Card>
                            );
                        })}
                    </div>
                    
                    {totalPages > 1 && (
                        <div className="py-3 flex flex-col sm:flex-row items-center justify-center sm:justify-between border-t border-border-color dark:border-dark-border-color mt-4 gap-4">
                            <div><p className="text-sm text-gray-600 dark:text-gray-400">Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, sortedAndFilteredData.length)}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedAndFilteredData.length)}</span> of <span className="font-medium">{sortedAndFilteredData.length}</span> items</p></div>
                            <div className="flex items-center space-x-2">
                                <label htmlFor="items-per-page-landed-cost" className="text-sm text-gray-600 dark:text-gray-400">Rows:</label>
                                <select id="items-per-page-landed-cost" value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1 px-2 text-primary-text dark:text-dark-primary-text text-sm"><option value="15">15</option><option value="30">30</option><option value="50">50</option></select>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-primary-bg disabled:opacity-50">Prev</button><span className="relative inline-flex items-center px-4 py-2 border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-gray-700 dark:text-gray-300">{currentPage} / {totalPages}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-primary-bg disabled:opacity-50">Next</button></nav>
                            </div>
                        </div>
                    )}
                </Card>
            </motion.div>
        </main>
    );
};

export default LandedCostAnalysisPage;
