

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView, Variants } from 'framer-motion';
import type { InventoryItem, ViewType, LocalFiltersState } from '../../types';
import Card from '../ui/Card';
import KpiCard from '../ui/KpiCard';
import ChartCard from '../ui/ChartCard';
import { CubeIcon, BanknotesIcon, ExclamationTriangleIcon, TruckIcon, FunnelIcon, XMarkIcon, ArrowUpIcon } from '../ui/Icons';
import InventoryTable from './InventoryTable';
import InventoryStatusChart from './InventoryStatusChart';
import { INITIAL_LOCAL_FILTERS } from '../../constants';
import { useToast } from '../../contexts/ToastContext';

interface InventoryDashboardProps {
    inventoryData: InventoryItem[];
    onNavigateAndFilter: (view: ViewType, filters: Partial<LocalFiltersState>) => void;
    onPsrefLookup: (item: { mtm: string; modelName: string }) => void;
    localFilters: LocalFiltersState;
    setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
    userRole: string;
}

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants: Variants = { hidden: { y: 30, opacity: 0, scale: 0.97 }, visible: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } } };
const headerVariants: Variants = { hidden: { y: -20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } } };
const filterBadgeVariants: Variants = { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } }, exit: { scale: 0, opacity: 0, transition: { duration: 0.2 } } };

const InventoryDashboard = React.forwardRef<HTMLDivElement, InventoryDashboardProps>(({ inventoryData, onNavigateAndFilter, onPsrefLookup, localFilters, setLocalFilters, userRole }, ref) => {
    const { showToast } = useToast();
    const [showScrollTop, setShowScrollTop] = useState(false);
    
    const mainContentRef = useRef<HTMLDivElement>(null);
    const kpiRef = useRef<HTMLDivElement>(null);
    const isKpiInView = useInView(kpiRef, { once: true, margin: "-100px" });

    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    const filteredInventoryData = useMemo(() => {
        const { inventorySearchTerm, stockStatus } = localFilters;
        
        return inventoryData.filter(item => {
            if (stockStatus !== 'all') {
                const weeks = item.weeksOfInventory;
                switch (stockStatus) {
                    case 'oversold': return item.onHandQty < 0;
                    case 'otw': return item.otwQty > 0;
                    case 'outOfStock': return item.onHandQty <= 0;
                    case 'noSales': return item.onHandQty > 0 && weeks === null;
                    case 'lowStock': return item.onHandQty > 0 && weeks !== null && weeks <= 12 && weeks >=4;
                    case 'critical': return item.onHandQty > 0 && weeks !== null && weeks < 4;
                    case 'healthy': return weeks !== null && weeks > 12;
                    default: break;
                }
            }
            if (inventorySearchTerm) {
                const lowerSearch = inventorySearchTerm.toLowerCase();
                return (item.mtm || '').toLowerCase().includes(lowerSearch) || 
                       (item.modelName || '').toLowerCase().includes(lowerSearch);
            }
            return true;
        });
    }, [inventoryData, localFilters]);

    const kpiData = useMemo(() => {
        return {
            totalOnhandValue: inventoryData.reduce((sum, item) => sum + (item.onHandValue > 0 ? item.onHandValue : 0), 0),
            totalOtwValue: inventoryData.reduce((sum, item) => sum + item.otwValue, 0),
            totalOnhandUnits: inventoryData.reduce((sum, item) => sum + item.onHandQty, 0),
            totalOtwUnits: inventoryData.reduce((sum, item) => sum + item.otwQty, 0),
            unaccountedUnits: inventoryData.reduce((sum, item) => sum + item.unaccountedStockQty, 0),
        };
    }, [inventoryData]);
    
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (localFilters.inventorySearchTerm) count++;
        if (localFilters.stockStatus !== 'all') count++;
        return count;
    }, [localFilters]);

    const clearAllFilters = useCallback(() => {
        setLocalFilters(prev => ({ ...prev, ...INITIAL_LOCAL_FILTERS }));
        showToast('All inventory filters cleared', 'success');
    }, [setLocalFilters, showToast]);

    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    const handleFilterClick = (filter: LocalFiltersState['stockStatus']) => onNavigateAndFilter('inventory', { stockStatus: localFilters.stockStatus === filter ? 'all' : filter });

    return (
        <main ref={mainContentRef} className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-8">
            <motion.div variants={headerVariants} initial="hidden" animate="visible" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-8 shadow-xl">
                 <div className="relative z-10">
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Inventory Status</h1>
                    <p className="text-emerald-100 text-lg mb-4">An interactive, high-level overview of your inventory health.</p>
                     {activeFiltersCount > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/25 backdrop-blur-sm border border-white/40"><FunnelIcon className="h-4 w-4 text-white" /><span className="text-sm font-semibold text-white">{activeFiltersCount} Active Filter(s)</span></div>
                            <AnimatePresence mode="popLayout">{localFilters.stockStatus !== 'all' && (<motion.button key="status-filter" variants={filterBadgeVariants} initial="initial" animate="animate" exit="exit" onClick={() => setLocalFilters(p => ({...p, stockStatus: 'all'}))} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-emerald-700 text-sm font-medium transition-colors"><span>{localFilters.stockStatus}</span><XMarkIcon className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" /></motion.button>)}</AnimatePresence>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={clearAllFilters} className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 border border-white/40 text-white text-sm font-medium transition-colors">Clear All</motion.button>
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {filteredInventoryData.length > 0 ? (
                 <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8">
                     <motion.div ref={kpiRef} initial="hidden" animate={isKpiInView ? "visible" : "hidden"} variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <motion.div className="lg:col-span-1" variants={containerVariants}><div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {userRole === 'Admin' && (<KpiCard label="On Hand Stock Value" value={kpiData.totalOnhandValue} formatter={currencyFormatter} icon={<BanknotesIcon />} colorClass={{ bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' }} description="Based on average FOB cost" />)}
                            <KpiCard label="Units On Hand" value={kpiData.totalOnhandUnits} icon={<CubeIcon />} colorClass={{ bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' }} description="Serialized & available stock" />
                            <KpiCard label="Units On The Way" value={kpiData.totalOtwUnits} icon={<TruckIcon />} colorClass={{ bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' }} description={userRole === 'Admin' ? `${currencyFormatter(kpiData.totalOtwValue)} FOB value` : ''} onClick={() => handleFilterClick('otw')} isActive={localFilters.stockStatus === 'otw'} />
                            <KpiCard label="Unaccounted Stock" value={kpiData.unaccountedUnits} icon={<ExclamationTriangleIcon />} colorClass={{ bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' }} description="Needs serialization." />
                        </div></motion.div>
                        <motion.div variants={itemVariants} className="lg:col-span-2"><ChartCard title="Inventory Health Overview" description="Click a segment to filter." className="h-full"><div className="h-full"><InventoryStatusChart data={inventoryData} onFilterChange={(f) => handleFilterClick(f as LocalFiltersState['stockStatus'])} activeFilter={localFilters.stockStatus} /></div></ChartCard></motion.div>
                    </motion.div>
                    <motion.div variants={itemVariants}><Card className="p-4 sm:p-6"><InventoryTable data={filteredInventoryData} onPsrefLookup={onPsrefLookup} userRole={userRole} /></Card></motion.div>
                </motion.div>
            ) : (
                <motion.div key="no-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm flex items-center justify-center"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-md mx-4 text-center"><div className="mb-4"><FunnelIcon className="h-16 w-16 mx-auto text-green-500 opacity-50" /></div><h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Inventory Found</h3><p className="text-gray-600 dark:text-gray-300 mb-6">Your current filters returned no results. Try adjusting or clearing some filters.</p><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={clearAllFilters} className="px-6 py-3 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all">Clear All Filters</motion.button></motion.div></motion.div>
            )}

            <AnimatePresence>{showScrollTop && (<motion.button initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={scrollToTop} className="fixed bottom-8 right-8 z-50 p-4 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-2xl hover:shadow-emerald-500/50" title="Scroll to top"><ArrowUpIcon className="h-6 w-6" /></motion.button>)}</AnimatePresence>
        </main>
    );
});

InventoryDashboard.displayName = 'InventoryDashboard';

export default InventoryDashboard;