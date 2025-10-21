

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import Card from '../ui/Card';
import { RebateSale, Sale } from '../../types';
// FIX: Add missing icon import
import { ExclamationTriangleIcon, ShieldCheckIcon, DocumentMagnifyingGlassIcon, CheckCircleIcon, CubeIcon, ChevronLeftIcon, ChevronRightIcon } from '../ui/Icons';
import AnimatedCounter from '../ui/AnimatedCounter';
import SegmentedControl from '../ui/SegmentedControl';

// --- Type Definitions ---
interface ReconciliationItem {
    id: string; // unique key for react
    serialNumber: string;
    mtm: string;
    status: 'Matched' | 'Unclaimed Sale' | 'Unverified Claim';
    ourSaleDate: string | null;
    vendorClaimDate: string | null;
    dateMismatch: boolean;
}

type StatusFilter = 'all' | 'Matched' | 'Unclaimed Sale' | 'Unverified Claim';

// --- Sub-components ---
const KpiCard: React.FC<{ label: string; value: number; icon: React.FC<any>; description: string; }> = ({ label, value, icon: Icon, description }) => (
    <Card className="p-4">
        <div className="flex items-center">
            <div className="flex-shrink-0 bg-highlight-hover dark:bg-dark-highlight-hover p-3 rounded-lg">
                <Icon className="h-6 w-6 text-highlight" />
            </div>
            <div className="ml-4">
                <dt className="text-sm font-medium text-secondary-text dark:text-dark-secondary-text truncate">{label}</dt>
                <dd className="text-2xl font-bold text-primary-text dark:text-dark-primary-text"><AnimatedCounter to={value} /></dd>
                <dd className="text-xs text-secondary-text dark:text-dark-secondary-text">{description}</dd>
            </div>
        </div>
    </Card>
);

const ReconciliationBadge: React.FC<{ status: ReconciliationItem['status'] }> = ({ status }) => {
    if (status === 'Matched') {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">Matched</span>;
    }
    if (status === 'Unclaimed Sale') {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">Unclaimed by Vendor</span>;
    }
    if (status === 'Unverified Claim') {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">Unverified Claim</span>;
    }
    return null;
};


// --- Main Component ---
const RebateValidationPage: React.FC = () => {
    const { allSales, allRebateSales } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    // Mobile state
    const [mobileView, setMobileView] = useState<'summary' | 'list'>('summary');
    const [selectedStatus, setSelectedStatus] = useState<StatusFilter | null>(null);
    const [direction, setDirection] = useState(1);

    const handleSelectStatus = (status: StatusFilter) => {
        setDirection(1);
        setSelectedStatus(status);
        setMobileView('list');
    };

    const handleBack = () => {
        setDirection(-1);
        setMobileView('summary');
        setSelectedStatus(null);
    };

    const { reconciliationData, kpis } = useMemo(() => {
        const actualSalesMap = new Map<string, Sale>();
        allSales.forEach(sale => actualSalesMap.set(sale.serialNumber, sale));

        const claimedSalesMap = new Map<string, RebateSale>();
        allRebateSales.forEach(claim => claimedSalesMap.set(claim.serialNumber, claim));

        const allSerials = new Set([...actualSalesMap.keys(), ...claimedSalesMap.keys()]);

        const items: ReconciliationItem[] = [];
        
        allSerials.forEach(sn => {
            const actualSale = actualSalesMap.get(sn);
            const claimedSale = claimedSalesMap.get(sn);
            let status: ReconciliationItem['status'];
            let dateMismatch = false;
            
            if (actualSale && claimedSale) {
                status = 'Matched';
                if (actualSale.invoiceDate !== claimedSale.rebateInvoiceDate) {
                    dateMismatch = true;
                }
            } else if (actualSale && !claimedSale) {
                status = 'Unclaimed Sale';
            } else { // !actualSale && claimedSale
                status = 'Unverified Claim';
            }

            items.push({
                id: sn,
                serialNumber: sn,
                mtm: actualSale?.lenovoProductNumber || claimedSale!.mtm,
                status,
                ourSaleDate: actualSale?.invoiceDate || null,
                vendorClaimDate: claimedSale?.rebateInvoiceDate || null,
                dateMismatch,
            });
        });

        const kpiCalcs = items.reduce((acc, item) => {
            if (item.status === 'Matched') acc.matchedCount++;
            if (item.status === 'Unclaimed Sale') acc.unclaimedCount++;
            if (item.status === 'Unverified Claim') acc.unverifiedCount++;
            return acc;
        }, { matchedCount: 0, unclaimedCount: 0, unverifiedCount: 0 });

        return { reconciliationData: items, kpis: kpiCalcs };
    }, [allSales, allRebateSales]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const filteredData = useMemo(() => {
        // Mobile view uses selectedStatus for primary filtering
        const activeFilter = window.innerWidth < 768 ? selectedStatus || 'all' : statusFilter;

        return reconciliationData
            .filter(item => {
                if (activeFilter !== 'all' && item.status !== activeFilter) return false;
                if (searchTerm) {
                    const lower = searchTerm.toLowerCase();
                    return item.serialNumber.toLowerCase().includes(lower) ||
                           item.mtm.toLowerCase().includes(lower);
                }
                return true;
            })
            .sort((a,b) => (b.ourSaleDate || '0').localeCompare(a.ourSaleDate || '0'));
    }, [reconciliationData, searchTerm, statusFilter, selectedStatus]);
    
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        return filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    const getRowClass = (status: ReconciliationItem['status']) => {
        switch(status) {
            case 'Unclaimed Sale': return 'bg-orange-50/50 dark:bg-orange-900/10';
            case 'Unverified Claim': return 'bg-red-50/50 dark:bg-red-900/10';
            default: return 'even:bg-slate-50/50 dark:even:bg-dark-secondary-bg/20';
        }
    }
    
    const viewVariants = {
      enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
      center: { x: 0, opacity: 1 },
      exit: (direction: number) => ({ x: direction < 0 ? '100%' : '-100%', opacity: 0 }),
    };

    const statusSummaryData = [
        { label: 'Matched', value: kpis.matchedCount, filter: 'Matched' as StatusFilter, icon: CheckCircleIcon, color: 'text-green-600' },
        { label: 'Unclaimed Sales', value: kpis.unclaimedCount, filter: 'Unclaimed Sale' as StatusFilter, icon: ExclamationTriangleIcon, color: 'text-orange-500' },
        { label: 'Unverified Claims', value: kpis.unverifiedCount, filter: 'Unverified Claim' as StatusFilter, icon: ExclamationTriangleIcon, color: 'text-red-500' },
    ];

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="flex items-center gap-x-3 mb-4">
                    <ShieldCheckIcon className="h-8 w-8 text-primary-text dark:text-dark-primary-text" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-primary-text dark:text-dark-primary-text">Rebate Reconciliation</h1>
                        <p className="text-secondary-text dark:text-dark-secondary-text mt-1">Cross-check vendor rebate claims against actual sales by serial number.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <KpiCard label="Matched Sales" value={kpis.matchedCount} icon={CheckCircleIcon} description="Correctly claimed by vendor." />
                    <KpiCard label="Unclaimed Sales" value={kpis.unclaimedCount} icon={ExclamationTriangleIcon} description="Potential missed rebates." />
                    <KpiCard label="Unverified Claims" value={kpis.unverifiedCount} icon={ExclamationTriangleIcon} description="Vendor claims not in our sales." />
                </div>

                <Card className="p-4 sm:p-6">
                     <div className="hidden md:flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <SegmentedControl
                            value={statusFilter}
                            onChange={(val) => setStatusFilter(val as StatusFilter)}
                            options={[
                                { label: 'All', value: 'all' },
                                { label: 'Matched', value: 'Matched' },
                                { label: 'Unclaimed', value: 'Unclaimed Sale' },
                                { label: 'Unverified', value: 'Unverified Claim' },
                            ]}
                            label="status-filter"
                        />
                        <input
                            type="text"
                            placeholder="Search by Serial Number or MTM..."
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
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Serial Number</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">MTM</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Our Sale Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Vendor Claim Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Reconciliation</th>
                                </tr>
                            </thead>
                            <tbody className="bg-secondary-bg dark:bg-dark-secondary-bg divide-y divide-border-color dark:divide-dark-border-color">
                                {paginatedData.length > 0 ? (
                                    paginatedData.map(item => (
                                        <tr key={item.id} className={getRowClass(item.status)}>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-primary-text">{item.serialNumber}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-text">{item.mtm}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-text">
                                                <div className="flex items-center gap-2">
                                                    {item.dateMismatch && <span title="Dates do not match"><ExclamationTriangleIcon className="h-4 w-4 text-orange-500" /></span>}
                                                    <span>{item.ourSaleDate || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-text">{item.vendorClaimDate || '-'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm"><ReconciliationBadge status={item.status} /></td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12">
                                            <div className="flex flex-col items-center">
                                                <DocumentMagnifyingGlassIcon className="h-12 w-12 text-gray-400 mb-2" />
                                                <h3 className="font-semibold text-primary-text">No Items Found</h3>
                                                <p className="text-sm text-secondary-text">Try adjusting your search or filter.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden relative overflow-x-hidden min-h-[400px]">
                        <AnimatePresence initial={false} custom={direction}>
                            {mobileView === 'summary' && (
                                <motion.div key="summary" custom={direction} variants={viewVariants} initial="enter" animate="center" exit="exit" transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}>
                                    <h3 className="font-semibold mb-3">Reconciliation Status</h3>
                                    <div className="space-y-3">
                                        {statusSummaryData.map(s => (
                                            <Card key={s.label} className="p-4" onClick={() => handleSelectStatus(s.filter)}>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <s.icon className={`h-6 w-6 ${s.color}`} />
                                                        <span className="font-semibold text-primary-text">{s.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-lg text-primary-text">{s.value.toLocaleString()}</span>
                                                        <ChevronRightIcon className="h-5 w-5 text-secondary-text" />
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                            {mobileView === 'list' && (
                                <motion.div key="list" custom={direction} variants={viewVariants} initial="enter" animate="center" exit="exit" transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }} className="absolute w-full">
                                    <div className="pb-4 mb-4 border-b border-border-color">
                                        <button onClick={handleBack} className="flex items-center text-sm font-medium text-highlight mb-2"><ChevronLeftIcon className="h-4 w-4 mr-1" /> Back to Summary</button>
                                        <h2 className="text-xl font-bold">{selectedStatus}</h2>
                                    </div>
                                    <input type="text" placeholder="Search serials or MTMs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="block w-full bg-secondary-bg border border-border-color rounded-md py-2 px-3 text-primary-text placeholder-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm mb-4" />
                                    <div className="space-y-3">
                                        {filteredData.length > 0 ? filteredData.map(item => (
                                            <Card key={item.id} className="p-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-mono text-sm text-primary-text">{item.serialNumber}</p>
                                                        <p className="text-xs text-secondary-text">{item.mtm}</p>
                                                    </div>
                                                    <ReconciliationBadge status={item.status} />
                                                </div>
                                                <div className="grid grid-cols-2 text-xs mt-2 pt-2 border-t text-secondary-text">
                                                    <p>Our Sale: {item.ourSaleDate || '-'}</p>
                                                    <p>Vendor Claim: {item.vendorClaimDate || '-'}</p>
                                                </div>
                                            </Card>
                                        )) : <p className="text-center text-secondary-text py-8">No items match your search.</p>}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Desktop Pagination */}
                    {totalPages > 1 && (
                        <div className="hidden md:flex py-3 flex-col sm:flex-row items-center justify-center sm:justify-between border-t border-border-color dark:border-dark-border-color mt-4 gap-4">
                            <div>
                                <p className="text-sm text-secondary-text dark:text-dark-secondary-text">
                                    Showing <span className="font-medium">{filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of{' '}
                                    <span className="font-medium">{filteredData.length}</span> items
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <label htmlFor="items-per-page-select-rebate-validation" className="text-sm text-secondary-text dark:text-dark-secondary-text">Rows:</label>
                                <select
                                    id="items-per-page-select-rebate-validation"
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
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text hover:bg-gray-100 dark:hover:bg-dark-primary-bg disabled:opacity-50 transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <span className="relative inline-flex items-center px-4 py-2 border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text hover:bg-gray-100 dark:hover:bg-dark-primary-bg disabled:opacity-50 transition-colors"
                                    >
                                        Next
                                    </button>
                                </nav>
                            </div>
                        </div>
                    )}
                </Card>
            </motion.div>
        </main>
    );
};

export default RebateValidationPage;
