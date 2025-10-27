

import React, { useState, useMemo, Fragment, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import Card from '../ui/Card';
import KpiCard from '../ui/KpiCard';
import { ReconciledSale, LocalFiltersState } from '../../types';
import { BanknotesIcon, ChartBarIcon, TrophyIcon, DocumentMagnifyingGlassIcon, ChevronUpIcon, ChevronDownIcon, CheckCircleIcon, ExclamationTriangleIcon, LinkIcon, XCircleIcon, QuestionMarkCircleIcon, ChevronRightIcon, ArrowLeftIcon } from '../ui/Icons';
import AnimatedCounter from '../ui/AnimatedCounter';

// --- Type Definitions ---
interface AugmentedInvoiceGroup {
    invoiceNumber: string;
    items: ReconciledSale[];
    totalProfit: number;
    totalRevenue: number;
    itemCount: number;
    buyerName: string;
    invoiceDate: string | null;
};
type SortKey = keyof AugmentedInvoiceGroup;
type SortOrder = 'asc' | 'desc';
interface SortConfig {
  key: SortKey;
  direction: SortOrder;
}

const MotionDiv = motion.div;

// --- Sub-components ---
const ProfitKpiCard: React.FC<{ label: string; value: number; icon: React.FC<any>; formatter?: (val: number) => string; isPrimary?: boolean }> = ({ label, value, icon: Icon, formatter, isPrimary = false }) => (
    <div className={`relative p-4 rounded-xl flex items-center ${isPrimary ? 'bg-highlight text-white' : 'bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color'}`}>
        <div className={`flex-shrink-0 p-3 rounded-lg ${isPrimary ? 'bg-white/20' : 'bg-highlight-hover dark:bg-dark-highlight-hover'}`}>
            <Icon className={`h-6 w-6 ${isPrimary ? 'text-white' : 'text-highlight'}`} />
        </div>
        <div className="ml-4">
            <dt className={`text-sm font-medium truncate ${isPrimary ? 'text-white/80' : 'text-secondary-text dark:text-dark-secondary-text'}`}>{label}</dt>
            <dd className={`text-2xl font-bold ${isPrimary ? 'text-white' : 'text-primary-text dark:text-dark-primary-text'}`}><AnimatedCounter to={value} formatter={formatter} /></dd>
        </div>
    </div>
);

const TableHeader: React.FC<{ onSort: (key: SortKey) => void; sortConfig: SortConfig | null; sortKey: SortKey; children: React.ReactNode; className?: string; }> = ({ onSort, sortConfig, sortKey, children, className = '' }) => {
  const isSorted = sortConfig?.key === sortKey;
  return (
    <th scope="col" className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider select-none cursor-pointer group ${className || 'text-left'}`} onClick={() => onSort(sortKey)} aria-sort={isSorted ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <div className={`flex items-center text-secondary-text dark:text-dark-secondary-text ${className.includes('text-right') ? 'justify-end' : ''}`}>{children}<span className="w-4 h-4 ml-1.5 flex-shrink-0">{isSorted ? (sortConfig?.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />) : <ChevronUpIcon className="opacity-30 group-hover:opacity-100" />}</span></div>
    </th>
  );
};

const ProfitMarginCell: React.FC<{ margin: number | null }> = ({ margin }) => {
    if (margin === null || isNaN(margin)) return <span className="text-secondary-text dark:text-dark-secondary-text">-</span>;
    const color = margin < 0 ? 'text-red-600 dark:text-red-400' : margin < 10 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400';
    return <span className={`font-semibold ${color}`}>{margin.toFixed(1)}%</span>;
};

const StatusBadge: React.FC<{ status: ReconciledSale['status'] }> = ({ status }) => {
    const config = {
        'Matched': { icon: CheckCircleIcon, color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' },
        'No Rebate': { icon: LinkIcon, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' },
        'Cost Missing': { icon: QuestionMarkCircleIcon, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' },
        'Partially Costed': { icon: ExclamationTriangleIcon, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' },
        'No Order Match': { icon: XCircleIcon, color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' },
    }[status];
    return <span className={`inline-flex items-center gap-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}><config.icon className="h-4 w-4" />{status}</span>;
}

const ExpandedDetailView: React.FC<{ item: ReconciledSale }> = ({ item }) => {
    const currencyFormatter = (val: number | null) => (val === null || isNaN(val)) ? 'N/A' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    const profitColor = item.unitProfit === null ? 'text-secondary-text dark:text-dark-secondary-text' : item.unitProfit > 0 ? 'text-green-600' : 'text-red-600';

    return (
        <div className="bg-slate-50/70 dark:bg-dark-primary-bg p-4 sm:p-6 text-primary-text dark:text-dark-primary-text border-t-2 border-highlight">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Column 1: Transaction Details */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary-text dark:text-dark-secondary-text">Transaction Details</h4>
                    <div>
                        <p className="text-xs text-secondary-text dark:text-dark-secondary-text">Buyer</p>
                        <p className="font-medium text-primary-text dark:text-dark-primary-text">{item.buyerName}</p>
                    </div>
                    <div>
                        <p className="text-xs text-secondary-text dark:text-dark-secondary-text">Serial #</p>
                        <p className="font-mono text-xs text-primary-text dark:text-dark-primary-text">{item.serialNumber}</p>
                    </div>
                    <div>
                        <p className="text-xs text-secondary-text dark:text-dark-secondary-text">Sales Order</p>
                        <p className="font-mono text-xs text-primary-text dark:text-dark-primary-text">{item.salesOrder}</p>
                    </div>
                </div>

                {/* Column 2 & 3: Profit Calculation */}
                <div className="md:col-span-1 lg:col-span-2">
                     <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary-text dark:text-dark-secondary-text mb-4">Profit Calculation</h4>
                     <div className="space-y-1.5 text-sm bg-secondary-bg dark:bg-dark-secondary-bg p-4 rounded-lg border border-border-color dark:border-dark-border-color">
                        <div className="flex justify-between items-center font-medium text-primary-text dark:text-dark-primary-text">
                            <span>Sale Price</span>
                            <span>{currencyFormatter(item.unitSalePrice)}</span>
                        </div>
                        <div className="flex justify-between items-center text-secondary-text dark:text-dark-secondary-text">
                            <span>- FOB Cost</span>
                            <span>({currencyFormatter(item.fobCost)})</span>
                        </div>
                        <div className="flex justify-between items-center text-secondary-text dark:text-dark-secondary-text">
                            <span>- Shipping Cost</span>
                            <span>({currencyFormatter(item.shippingCost)})</span>
                        </div>
                        <div className="flex justify-between items-center text-secondary-text dark:text-dark-secondary-text">
                            <span>- Accessory Cost</span>
                            <span>({currencyFormatter(item.accessoryCost)})</span>
                        </div>

                        {item.rebateDetails && item.rebateDetails.length > 0 ? (
                            item.rebateDetails.map((rebate, index) => (
                                <div key={`${rebate.programCode}-${index}`} className="flex justify-between items-center text-secondary-text dark:text-dark-secondary-text pl-4">
                                    <span>- Rebate ({rebate.programCode})</span>
                                    <span>({currencyFormatter(-rebate.perUnitAmount)})</span>
                                </div>
                            ))
                        ) : (
                             <div className="flex justify-between items-center text-secondary-text dark:text-dark-secondary-text">
                                <span>- Rebate</span>
                                <span>($0.00)</span>
                            </div>
                        )}
                        
                        <div className="border-t border-border-color dark:border-dark-border-color my-2"></div>
                        
                        <div className="flex justify-between items-center text-base font-bold">
                            <span className="text-primary-text dark:text-dark-primary-text">Unit Profit</span>
                            <span className={profitColor}>{currencyFormatter(item.unitProfit)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---
interface ProfitReconciliationPageProps {
    localFilters: LocalFiltersState;
    setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const ProfitReconciliationPage: React.FC<ProfitReconciliationPageProps> = ({ localFilters, setLocalFilters }) => {
    const { reconciledSales } = useData();
    // Desktop state
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'invoiceDate', direction: 'desc' });
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    // Mobile drill-down state
    const [selectedInvoice, setSelectedInvoice] = useState<AugmentedInvoiceGroup | null>(null);
    const [selectedItem, setSelectedItem] = useState<ReconciledSale | null>(null);
    const [direction, setDirection] = useState(1);
    
    const handleSelectInvoice = (invoice: AugmentedInvoiceGroup) => {
        setDirection(1);
        setSelectedInvoice(invoice);
    };
    const handleSelectItem = (item: ReconciledSale) => {
        setDirection(1);
        setSelectedItem(item);
    };
    const handleBack = () => {
        setDirection(-1);
        if (selectedItem) {
            setSelectedItem(null);
        } else if (selectedInvoice) {
            setSelectedInvoice(null);
        }
    };


    // Reset to page 1 when filters or sorting change
    useEffect(() => {
        setCurrentPage(1);
    }, [localFilters, sortConfig]);

    const toggleExpansion = (invoiceNumber: string) => {
        setExpandedRows(prev => { const newSet = new Set(prev); if (newSet.has(invoiceNumber)) newSet.delete(invoiceNumber); else newSet.add(invoiceNumber); return newSet; });
    };

    const requestSort = (key: SortKey) => {
        let direction: SortOrder = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const { filteredData, kpis } = useMemo(() => {
        const { profitReconSearchTerm, profitReconStatus } = localFilters;
        let data = [...reconciledSales];
        if (profitReconStatus !== 'all') {
            if (profitReconStatus === 'Issues') {
                data = data.filter(item => item.status === 'No Order Match' || item.status === 'Cost Missing' || item.status === 'Partially Costed');
            } else {
                data = data.filter(item => item.status === profitReconStatus);
            }
        }
        if (profitReconSearchTerm) {
            const lower = profitReconSearchTerm.toLowerCase();
            data = data.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(lower)));
        }
        
        const reducedData = data.reduce((acc, sale) => {
            acc.totalRevenue += sale.unitSalePrice;
            if (sale.unitProfit !== null) acc.totalProfit += sale.unitProfit;
            if (sale.rebateApplied !== null && sale.rebateApplied > 0) { acc.totalRebatesApplied += sale.rebateApplied; acc.salesWithRebates++; }
            if (sale.status === 'No Order Match' || sale.status === 'Cost Missing' || sale.status === 'Partially Costed') {
                acc.salesWithIssues++;
            }
            return acc;
        }, { totalProfit: 0, totalRebatesApplied: 0, salesWithRebates: 0, totalRevenue: 0, salesWithIssues: 0 });

        const kpiData = {
            ...reducedData,
            totalRebates: reducedData.totalRebatesApplied,
        };

        return { filteredData: data, kpis: kpiData };
    }, [reconciledSales, localFilters]);

    const averageMargin = kpis.totalRevenue > 0 ? (kpis.totalProfit / kpis.totalRevenue) * 100 : 0;

    const invoiceGroups: AugmentedInvoiceGroup[] = useMemo(() => {
        // FIX: Explicitly type `grouped` accumulator to fix type inference issue.
        const grouped = filteredData.reduce<Record<string, ReconciledSale[]>>((acc, sale: ReconciledSale) => {
            const key = sale.invoiceNumber;
            if (!acc[key]) acc[key] = [];
            acc[key].push(sale);
            return acc;
        }, {});
        
        return Object.entries(grouped).map(([invoiceNumber, items]) => ({
            invoiceNumber, items,
            itemCount: items.length,
            buyerName: items[0]?.buyerName || 'N/A',
            invoiceDate: items[0]?.invoiceDate || null,
            totalProfit: items.reduce((sum, i) => sum + (i.unitProfit || 0), 0),
            totalRevenue: items.reduce((sum, i) => sum + i.unitSalePrice, 0),
        }));
    }, [filteredData]);

    const sortedGroups = useMemo(() => {
        const data = [...invoiceGroups];
        if (sortConfig !== null) {
            const { key, direction } = sortConfig;
            data.sort((a, b) => {
                const aVal = a[key], bVal = b[key];
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;
                const comparison = typeof aVal === 'number' && typeof bVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
                return direction === 'asc' ? comparison : -comparison;
            });
        }
        return data;
    }, [invoiceGroups, sortConfig]);

    const totalPages = Math.ceil(sortedGroups.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        return sortedGroups.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [sortedGroups, currentPage, itemsPerPage]);

    const currencyFormatter = (val: number | null) => {
        if (val === null || isNaN(val)) return '-';
        const formatted = new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 2,
        }).format(val);
        return `$${formatted}`;
    };
    const percentFormatter = (val: number) => `${val.toFixed(1)}%`;
    
    const viewVariants = {
      enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
      center: { x: 0, opacity: 1 },
      exit: (direction: number) => ({ x: direction < 0 ? '100%' : '-100%', opacity: 0 }),
    };


    return (
        <div className="space-y-6">
            <div className="flex items-center gap-x-3">
                <BanknotesIcon className="h-8 w-8 text-primary-text dark:text-dark-primary-text" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary-text dark:text-dark-primary-text">Profit Reconciliation</h1>
                    <p className="text-secondary-text dark:text-dark-secondary-text mt-1">Analyze true profit by offsetting costs with applicable rebates.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ProfitKpiCard label="Total Reconciled Profit" value={kpis.totalProfit} icon={BanknotesIcon} formatter={currencyFormatter} isPrimary />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <ProfitKpiCard label="Average Profit Margin" value={averageMargin} icon={ChartBarIcon} formatter={percentFormatter} />
                    <ProfitKpiCard label="Total Rebates Applied" value={kpis.totalRebatesApplied} icon={TrophyIcon} formatter={currencyFormatter} />
                    <ProfitKpiCard label="Sales with Rebates" value={kpis.salesWithRebates} icon={TrophyIcon} />
                    <ProfitKpiCard label="Sales with Issues" value={kpis.salesWithIssues} icon={ExclamationTriangleIcon} />
                </div>
            </div>
            
            <Card className="p-4 sm:p-6 mt-6">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-dark-secondary-bg/50">
                            <tr>
                                <th className="px-4 py-3.5 w-12"></th><TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="invoiceNumber">Invoice</TableHeader><TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="buyerName">Buyer</TableHeader><TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="itemCount" className="text-center">Items</TableHeader><TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalRevenue" className="text-right">Total Revenue</TableHeader><TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalProfit" className="text-right">Total Profit</TableHeader>
                            </tr>
                        </thead>
                        <tbody className="bg-secondary-bg dark:bg-dark-secondary-bg">
                            {paginatedData.length > 0 ? paginatedData.map(group => (<Fragment key={group.invoiceNumber}><tr onClick={() => toggleExpansion(group.invoiceNumber)} className="border-b border-border-color dark:border-dark-border-color cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-primary-bg"><td className="px-4 py-2 text-center"><ChevronRightIcon className={`h-5 w-5 text-secondary-text transition-transform duration-200 ${expandedRows.has(group.invoiceNumber) ? 'rotate-90' : ''}`} /></td><td className="px-4 py-2"><div className="font-medium text-primary-text dark:text-dark-primary-text">{group.invoiceNumber}</div><div className="text-xs text-secondary-text dark:text-dark-secondary-text">{group.invoiceDate}</div></td><td className="px-4 py-2 text-secondary-text dark:text-dark-secondary-text">{group.buyerName}</td><td className="px-4 py-2 text-center font-medium text-primary-text dark:text-dark-primary-text">{group.itemCount}</td><td className="px-4 py-2 text-right font-semibold text-primary-text dark:text-dark-primary-text">{currencyFormatter(group.totalRevenue)}</td><td className={`px-4 py-2 text-right font-semibold ${group.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{currencyFormatter(group.totalProfit)}</td></tr><tr className="p-0"><td colSpan={6} className="p-0 border-0"><AnimatePresence>{expandedRows.has(group.invoiceNumber) && <MotionDiv initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><div className="bg-slate-50/70 dark:bg-dark-primary-bg p-2 space-y-1">{group.items.map(item => <ExpandedDetailView key={item.serialNumber} item={item} />)}</div></MotionDiv>}</AnimatePresence></td></tr></Fragment>)) : <tr><td colSpan={6} className="text-center py-12"><div className="flex flex-col items-center"><DocumentMagnifyingGlassIcon className="h-12 w-12 text-gray-400 mb-2" /><h3 className="font-semibold text-primary-text dark:text-dark-primary-text">No Matching Sales Found</h3><p className="text-sm text-secondary-text dark:text-dark-secondary-text">Try adjusting your search query or filter.</p></div></td></tr>}
                        </tbody>
                    </table>
                </div>
                {/* Mobile Card List */}
                <div className="md:hidden relative overflow-x-hidden min-h-[500px]">
                     <AnimatePresence initial={false} custom={direction}>
                         {!selectedInvoice && (
                            <MotionDiv key="invoices" custom={direction} variants={viewVariants} initial="enter" animate="center" exit="exit" transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }} className="space-y-4">
                                {paginatedData.map(group => (<Card key={group.invoiceNumber} className="p-0 overflow-hidden" onClick={() => handleSelectInvoice(group)}><div className="p-4"><div className="flex justify-between items-start"><div className="flex-1 min-w-0"><p className="font-bold text-lg text-primary-text dark:text-dark-primary-text">{group.invoiceNumber}</p><p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1">{group.buyerName}</p><p className="text-xs text-secondary-text dark:text-dark-secondary-text">{group.invoiceDate}</p></div><ChevronRightIcon className="h-6 w-6 text-secondary-text" /></div><div className="flex justify-between items-center mt-4 pt-3 border-t border-border-color dark:border-dark-border-color"><div><p className="text-xs text-secondary-text dark:text-dark-secondary-text">Total Profit</p><p className={`font-bold text-lg ${group.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{currencyFormatter(group.totalProfit)}</p></div><div><p className="text-xs text-secondary-text dark:text-dark-secondary-text text-right">Items</p><p className="font-bold text-lg text-right">{group.itemCount}</p></div></div></div></Card>))}
                            </MotionDiv>
                         )}
                          {selectedInvoice && !selectedItem && (
                            <MotionDiv key="items" custom={direction} variants={viewVariants} initial="enter" animate="center" exit="exit" transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }} className="absolute w-full">
                                <div className="pb-4 mb-4 border-b border-border-color dark:border-dark-border-color"><button onClick={handleBack} className="flex items-center text-sm font-medium text-highlight mb-2"><ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to Invoices</button><h2 className="text-xl font-bold text-primary-text dark:text-dark-primary-text">{selectedInvoice.invoiceNumber}</h2><p className="text-sm text-secondary-text dark:text-dark-secondary-text">Select an item for details</p></div>
                                <div className="space-y-3">
                                    {selectedInvoice.items.map(item => (<Card key={item.serialNumber} className="p-3" onClick={() => handleSelectItem(item)}><div className="flex justify-between items-center"><div className="flex-1 min-w-0"><p className="font-semibold text-primary-text dark:text-dark-primary-text">{item.modelName}</p><p className="text-xs font-mono text-secondary-text dark:text-dark-secondary-text">{item.mtm}</p></div><div className="text-right ml-2"><p className={`font-semibold ${item.unitProfit === null ? 'text-secondary-text' : item.unitProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{currencyFormatter(item.unitProfit)}</p><p className="text-xs text-right"><ProfitMarginCell margin={item.profitMargin} /></p></div><ChevronRightIcon className="h-5 w-5 text-secondary-text ml-2" /></div></Card>))}
                                </div>
                            </MotionDiv>
                          )}
                          {selectedItem && (
                            <MotionDiv key="detail" custom={direction} variants={viewVariants} initial="enter" animate="center" exit="exit" transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }} className="absolute w-full">
                                <div className="pb-4 mb-4 border-b border-border-color dark:border-dark-border-color"><button onClick={handleBack} className="flex items-center text-sm font-medium text-highlight mb-2"><ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to Items</button><h2 className="text-xl font-bold text-primary-text dark:text-dark-primary-text">{selectedItem.modelName}</h2><p className="text-sm font-mono text-secondary-text dark:text-dark-secondary-text">{selectedItem.serialNumber}</p></div>
                                <Card><ExpandedDetailView item={selectedItem} /></Card>
                            </MotionDiv>
                          )}
                     </AnimatePresence>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                     <div className="py-3 flex flex-col sm:flex-row items-center justify-center sm:justify-between border-t border-border-color dark:border-dark-border-color mt-4 gap-4">
                        <div>
                            <p className="text-sm text-secondary-text dark:text-dark-secondary-text">
                                Showing <span className="font-medium">{sortedGroups.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedGroups.length)}</span> of{' '}
                                <span className="font-medium">{sortedGroups.length}</span> invoices
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <label htmlFor="items-per-page-select" className="text-sm text-secondary-text dark:text-dark-secondary-text">Rows:</label>
                            <select id="items-per-page-select" value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1 px-2 text-primary-text dark:text-dark-primary-text text-sm focus:ring-highlight focus:border-highlight"><option value="15">15</option><option value="30">30</option><option value="50">50</option></select>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text hover:bg-gray-100 dark:hover:bg-dark-primary-bg disabled:opacity-50 transition-colors">Previous</button>
                                <span className="relative inline-flex items-center px-4 py-2 border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text">{currentPage} / {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text hover:bg-gray-100 dark:hover:bg-dark-primary-bg disabled:opacity-50 transition-colors">Next</button>
                            </nav>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ProfitReconciliationPage;
