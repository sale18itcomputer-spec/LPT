
import React, { useState, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import Card from '../ui/Card';
import KpiCard from '../ui/KpiCard';
import { AccessoryCost } from '../../types';
import { BanknotesIcon, CubeIcon, DocumentMagnifyingGlassIcon, ChevronUpIcon, ChevronDownIcon, ChevronRightIcon } from '../ui/Icons';

// Types
type AugmentedAccessoryItem = AccessoryCost & { modelName: string; qty: number; totalCost: number; };
interface AugmentedAccessoryGroup {
    so: string;
    items: AugmentedAccessoryItem[];
    totalCost: number;
    itemCount: number;
    totalQty: number;
}
type SortKey = keyof Omit<AugmentedAccessoryGroup, 'items'>;
type SortOrder = 'asc' | 'desc';
interface SortConfig {
  key: SortKey;
  direction: SortOrder;
}

// Sub-components
const TableHeader: React.FC<{ onSort: (key: SortKey) => void; sortConfig: SortConfig | null; sortKey: SortKey; children: React.ReactNode; className?: string; }> = ({ onSort, sortConfig, sortKey, children, className = '' }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
        <th scope="col" className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider select-none cursor-pointer group ${className || 'text-left'}`} onClick={() => onSort(sortKey)} aria-sort={isSorted ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <div className={`flex items-center text-secondary-text dark:text-dark-secondary-text ${className?.includes('text-right') ? 'justify-end' : ''}`}>
                {children}
                <span className="w-4 h-4 ml-1.5 flex-shrink-0">{isSorted ? (sortConfig?.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />) : <ChevronUpIcon className="opacity-30 group-hover:opacity-100" />}</span>
            </div>
        </th>
    );
};

// Main Component
const AccessoryCostsPage: React.FC = () => {
    const { allBackpackCosts, allOrders } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'so', direction: 'asc' });
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    const orderInfoMap = useMemo(() => {
        const map = new Map<string, { modelName: string; qty: number }>();
        allOrders.forEach(order => {
            const key = `${order.salesOrder}-${order.mtm}`;
            if (map.has(key)) {
                const existing = map.get(key)!;
                existing.qty += order.qty;
            } else {
                map.set(key, { modelName: order.modelName, qty: order.qty });
            }
        });
        return map;
    }, [allOrders]);

    const groupedData: AugmentedAccessoryGroup[] = useMemo(() => {
        const augmentedItems: AugmentedAccessoryItem[] = allBackpackCosts.map(item => {
            const orderInfo = orderInfoMap.get(`${item.so}-${item.mtm}`);
            const qty = orderInfo?.qty || 0;
            return {
                ...item,
                modelName: orderInfo?.modelName || 'Unknown Model',
                qty: qty,
                totalCost: item.backpackCost * qty,
            };
        });

        const groups: Record<string, AugmentedAccessoryItem[]> = {};
        augmentedItems.forEach(item => {
            if (!groups[item.so]) groups[item.so] = [];
            groups[item.so].push(item);
        });

        return Object.entries(groups).map(([so, items]) => ({
            so,
            items,
            itemCount: items.length,
            totalQty: items.reduce((sum, i) => sum + i.qty, 0),
            totalCost: items.reduce((sum, i) => sum + i.totalCost, 0),
        }));
    }, [allBackpackCosts, orderInfoMap]);
    
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
            filteredData = filteredData.filter(group =>
                group.so.toLowerCase().includes(lower) ||
                group.items.some(item =>
                    item.mtm.toLowerCase().includes(lower) ||
                    item.modelName.toLowerCase().includes(lower)
                )
            );
        }
        if (sortConfig !== null) {
            const { key, direction } = sortConfig;
            filteredData.sort((a, b) => {
                const aVal = a[key], bVal = b[key];
                const comparison = typeof aVal === 'number' && typeof bVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
                return direction === 'asc' ? comparison : -comparison;
            });
        }
        return filteredData;
    }, [groupedData, searchTerm, sortConfig]);
    
    const kpiData = useMemo(() => {
        const totalCost = groupedData.reduce((sum, group) => sum + group.totalCost, 0);
        const totalQty = groupedData.reduce((sum, group) => sum + group.totalQty, 0);
        return {
            totalAccessoryCost: totalCost,
            totalItems: allBackpackCosts.length,
            totalAccessoryQty: totalQty,
        };
    }, [allBackpackCosts.length, groupedData]);


    const totalPages = Math.ceil(sortedAndFilteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        return sortedAndFilteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [sortedAndFilteredData, currentPage, itemsPerPage]);

    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="flex items-center gap-x-3 mb-4">
                    <CubeIcon className="h-8 w-8 text-primary-text dark:text-dark-primary-text" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-primary-text dark:text-dark-primary-text">Accessory Costs</h1>
                        <p className="text-secondary-text dark:text-dark-secondary-text mt-1">Track bundled accessory costs for each sales order.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <KpiCard label="Total Accessory Cost" value={kpiData.totalAccessoryCost} icon={<BanknotesIcon />} formatter={currencyFormatter} />
                    <KpiCard label="Total Accessory Qty" value={kpiData.totalAccessoryQty} icon={<CubeIcon />} />
                    <KpiCard label="Items with Accessories" value={kpiData.totalItems} icon={<CubeIcon />} />
                </div>
                
                <Card className="p-4 sm:p-6">
                    <div className="flex justify-end mb-4">
                        <input
                            type="text"
                            placeholder="Search by SO, MTM, Model..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full sm:w-80 bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-2 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
                        />
                    </div>
                    
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 dark:bg-dark-secondary-bg/50">
                                <tr>
                                    <th className="w-12"></th>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="so">Sales Order</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="itemCount" className="text-center">Items</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalQty" className="text-center">Total Qty</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalCost" className="text-right">Total Cost</TableHeader>
                                </tr>
                            </thead>
                            <tbody className="bg-secondary-bg dark:bg-dark-secondary-bg">
                                {paginatedData.length > 0 ? (
                                    paginatedData.map(group => {
                                        const isExpanded = expandedRows.has(group.so);
                                        return (
                                            <Fragment key={group.so}>
                                                <tr className="border-b border-border-color dark:border-dark-border-color hover:bg-gray-50 dark:hover:bg-dark-primary-bg cursor-pointer" onClick={() => toggleExpansion(group.so)}>
                                                    <td className="px-4 py-3 text-center"><ChevronRightIcon className={`h-5 w-5 text-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} /></td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary-text dark:text-dark-primary-text">{group.so}</td>
                                                    <td className="px-4 py-3 text-center font-medium text-primary-text dark:text-dark-primary-text">{group.itemCount}</td>
                                                    <td className="px-4 py-3 text-center font-medium text-primary-text dark:text-dark-primary-text">{group.totalQty.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right font-semibold text-primary-text dark:text-dark-primary-text">{currencyFormatter(group.totalCost)}</td>
                                                </tr>
                                                <tr className="p-0">
                                                    <td colSpan={5} className="p-0 border-0">
                                                        <AnimatePresence>
                                                            {isExpanded && (
                                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                                    <div className="p-3 bg-slate-50 dark:bg-dark-primary-bg">
                                                                        <table className="min-w-full text-sm">
                                                                             <thead>
                                                                                <tr className="text-xs text-secondary-text dark:text-dark-secondary-text">
                                                                                    <th className="px-3 py-1.5 text-left font-medium">MTM</th>
                                                                                    <th className="px-3 py-1.5 text-left font-medium">Model</th>
                                                                                    <th className="px-3 py-1.5 text-center font-medium">QTY</th>
                                                                                    <th className="px-3 py-1.5 text-right font-medium">Unit Cost</th>
                                                                                    <th className="px-3 py-1.5 text-right font-medium">Total Cost</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-border-color dark:divide-dark-border-color">
                                                                                {group.items.map((item, idx) => (
                                                                                    <tr key={idx} className="bg-secondary-bg dark:bg-dark-secondary-bg">
                                                                                        <td className="px-3 py-1.5 w-1/5 font-mono text-xs text-secondary-text dark:text-dark-secondary-text">{item.mtm}</td>
                                                                                        <td className="px-3 py-1.5 w-2/5 truncate max-w-xs text-primary-text dark:text-dark-primary-text">{item.modelName}</td>
                                                                                        <td className="px-3 py-1.5 w-1/5 text-center font-medium text-primary-text dark:text-dark-primary-text">{item.qty}</td>
                                                                                        <td className="px-3 py-1.5 w-1/5 text-right text-secondary-text dark:text-dark-secondary-text">{currencyFormatter(item.backpackCost)}</td>
                                                                                        <td className="px-3 py-1.5 w-1/5 text-right font-medium text-primary-text dark:text-dark-primary-text">{currencyFormatter(item.totalCost)}</td>
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
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan={5} className="text-center py-12"><div className="flex flex-col items-center"><DocumentMagnifyingGlassIcon className="h-12 w-12 text-gray-400 mb-2" /><h3 className="font-semibold text-primary-text dark:text-dark-primary-text">No Items Found</h3><p className="text-sm text-secondary-text dark:text-dark-secondary-text">Try adjusting your search query.</p></div></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                     {/* Mobile Card List */}
                    <div className="md:hidden space-y-4">
                        {paginatedData.length > 0 ? (
                            paginatedData.map(group => {
                                const isExpanded = expandedRows.has(group.so);
                                return (
                                    <Card key={group.so} className="p-0 overflow-hidden" onClick={() => toggleExpansion(group.so)}>
                                        <div className="p-4">
                                            <div className="flex justify-between items-start"><div className="flex-1 min-w-0"><p className="font-bold text-lg text-primary-text dark:text-dark-primary-text">{group.so}</p><p className="text-sm text-gray-500 dark:text-gray-400">{group.itemCount} MTM(s)</p></div><ChevronRightIcon className={`h-6 w-6 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} /></div>
                                            <div className="mt-4 grid grid-cols-3 gap-4 text-center border-t border-border-color dark:border-dark-border-color pt-3">
                                                <div><p className="text-xs text-gray-500 dark:text-gray-400">Total Qty</p><p className="font-bold text-primary-text dark:text-dark-primary-text">{group.totalQty.toLocaleString()}</p></div>
                                                <div><p className="text-xs text-gray-500 dark:text-gray-400">Items</p><p className="font-bold text-primary-text dark:text-dark-primary-text">{group.itemCount}</p></div>
                                                <div><p className="text-xs text-gray-500 dark:text-gray-400">Total Cost</p><p className="font-bold text-primary-text dark:text-dark-primary-text">{currencyFormatter(group.totalCost)}</p></div>
                                            </div>
                                        </div>
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                    <div className="p-2 bg-slate-50/70 dark:bg-dark-primary-bg space-y-1">
                                                        {group.items.map((item, idx) => (
                                                            <div key={idx} className="bg-secondary-bg dark:bg-dark-secondary-bg/50 rounded-md p-2">
                                                                <div className="flex justify-between items-start text-sm">
                                                                    <div>
                                                                        <p className="font-semibold truncate text-primary-text dark:text-dark-primary-text">{item.modelName}</p>
                                                                        <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{item.mtm}</p>
                                                                    </div>
                                                                    <p className="font-medium text-primary-text dark:text-dark-primary-text ml-2">{currencyFormatter(item.totalCost)}</p>
                                                                </div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                    QTY: {item.qty} @ {currencyFormatter(item.backpackCost)}/unit
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </Card>
                                );
                            })
                        ) : (
                             <div className="text-center py-12"><div className="flex flex-col items-center"><DocumentMagnifyingGlassIcon className="h-12 w-12 text-gray-400 mb-2" /><h3 className="font-semibold text-primary-text dark:text-dark-primary-text">No Items Found</h3><p className="text-sm text-secondary-text dark:text-dark-secondary-text">Try adjusting your search query.</p></div></div>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="py-3 flex flex-col sm:flex-row items-center justify-center sm:justify-between border-t border-border-color dark:border-dark-border-color mt-4 gap-4">
                            <div><p className="text-sm text-gray-600 dark:text-gray-400">Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, sortedAndFilteredData.length)}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedAndFilteredData.length)}</span> of <span className="font-medium">{sortedAndFilteredData.length}</span> items</p></div>
                            <div className="flex items-center space-x-2">
                                <label htmlFor="items-per-page-select-accessory" className="text-sm text-gray-600 dark:text-gray-400">Rows:</label>
                                <select id="items-per-page-select-accessory" value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1 px-2 text-primary-text dark:text-dark-primary-text text-sm"><option value="15">15</option><option value="30">30</option><option value="50">50</option></select>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-primary-bg disabled:opacity-50">Prev</button><span className="relative inline-flex items-center px-4 py-2 border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-gray-700 dark:text-gray-300">{currentPage} / {totalPages}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-primary-bg disabled:opacity-50">Next</button></nav>
                            </div>
                        </div>
                    )}

                </Card>
            </motion.div>
        </main>
    );
};

export default AccessoryCostsPage;
