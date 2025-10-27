

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView, Variants } from 'framer-motion';
import type { Sale, BackorderRecommendation, LocalFiltersState } from '../../types';
import Card from '../ui/Card';
import KpiCard from '../ui/KpiCard';
import ChartCard from '../ui/ChartCard';
import { CubeIcon, BanknotesIcon, ExclamationTriangleIcon, UserGroupIcon, FunnelIcon, XMarkIcon, ArrowUpIcon } from '../ui/Icons';
import BackorderTable from './BackorderTable';
import BackorderPriorityChart from './BackorderPriorityChart';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../contexts/ToastContext';
import { INITIAL_LOCAL_FILTERS } from '../../constants';

interface BackorderAnalysisDashboardProps {
    localFilters: LocalFiltersState;
    setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants: Variants = { hidden: { y: 30, opacity: 0, scale: 0.97 }, visible: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } } };
const headerVariants: Variants = { hidden: { y: -20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } } };
const filterBadgeVariants: Variants = { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } }, exit: { scale: 0, opacity: 0, transition: { duration: 0.2 } } };

const BackorderAnalysisDashboard = React.forwardRef<HTMLDivElement, BackorderAnalysisDashboardProps>(({ localFilters, setLocalFilters }, ref) => {
    const { allSales, backorderRecommendations } = useData();
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
    
    const filteredRecommendations = useMemo(() => {
        const { backorderSearchTerm, backorderPriority } = localFilters;
        let filtered = [...backorderRecommendations];
        
        if (backorderSearchTerm) {
            const lowercasedFilter = backorderSearchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                (item.mtm || '').toLowerCase().includes(lowercasedFilter) ||
                (item.modelName || '').toLowerCase().includes(lowercasedFilter)
            );
        }

        if (backorderPriority !== 'all') {
            filtered = filtered.filter(item => item.priority === backorderPriority);
        }

        return filtered;
    }, [backorderRecommendations, localFilters]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (localFilters.backorderSearchTerm) count++;
        if (localFilters.backorderPriority !== 'all') count++;
        return count;
    }, [localFilters]);

    const clearAllFilters = useCallback(() => {
        setLocalFilters(prev => ({ ...prev, ...INITIAL_LOCAL_FILTERS }));
        showToast('All backorder filters cleared', 'success');
    }, [setLocalFilters, showToast]);
    
    const { kpiData, uniqueAffectedCustomers } = useMemo(() => {
        const highPriorityItems = filteredRecommendations.filter(r => r.priority === 'High');
        const kpiData = {
            highPriority: highPriorityItems.length,
            totalPotentialRevenue: filteredRecommendations.reduce((sum, r) => sum + r.estimatedBackorderValue, 0),
            oosWithDemand: filteredRecommendations.length,
        };
        
        const customerSet = new Set<string>();
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const backorderedMtms = new Set(filteredRecommendations.map(r => r.mtm));

        allSales.forEach(sale => {
            if (backorderedMtms.has(sale.lenovoProductNumber)) {
                const saleDate = sale.invoiceDate ? new Date(sale.invoiceDate) : null;
                if (saleDate && saleDate >= ninetyDaysAgo) customerSet.add(sale.buyerId);
            }
        });
        
        return { kpiData, uniqueAffectedCustomers: customerSet.size };
    }, [filteredRecommendations, allSales]);
    
    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    const handleQuadrantSelect = useCallback((priority: 'High' | 'Medium' | 'Low' | null) => {
        const newPriority = priority || 'all';
        setLocalFilters(prev => ({
            ...prev,
            backorderPriority: prev.backorderPriority === newPriority ? 'all' : newPriority
        }));
    }, [setLocalFilters]);

    return (
        <main ref={mainContentRef} className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-8">
            <motion.div variants={headerVariants} initial="hidden" animate="visible" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 p-8 shadow-xl">
                 <div className="relative z-10">
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Backorder Command Center</h1>
                    <p className="text-rose-100 text-lg mb-4">Prioritize out-of-stock items based on sales velocity and customer impact.</p>
                     {activeFiltersCount > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/25 backdrop-blur-sm border border-white/40"><FunnelIcon className="h-4 w-4 text-white" /><span className="text-sm font-semibold text-white">{activeFiltersCount} Active Filter(s)</span></div>
                             <AnimatePresence mode="popLayout">{localFilters.backorderPriority !== 'all' && (<motion.button key="priority-filter" variants={filterBadgeVariants} initial="initial" animate="animate" exit="exit" onClick={() => setLocalFilters(p => ({...p, backorderPriority: 'all'}))} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-red-700 text-sm font-medium transition-colors"><span>Priority: {localFilters.backorderPriority}</span><XMarkIcon className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" /></motion.button>)}</AnimatePresence>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={clearAllFilters} className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 border border-white/40 text-white text-sm font-medium transition-colors">Clear All</motion.button>
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {filteredRecommendations.length > 0 ? (
                 <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8">
                    <motion.div ref={kpiRef} initial="hidden" animate={isKpiInView ? "visible" : "hidden"} variants={containerVariants} className="grid grid-cols-fluid gap-6">
                        <KpiCard label="High-Priority Items" value={kpiData.highPriority} description="Requiring immediate attention" icon={<ExclamationTriangleIcon />} />
                        <KpiCard label="Potential Revenue" value={kpiData.totalPotentialRevenue} description="Est. value of backordered items" icon={<BanknotesIcon />} formatter={currencyFormatter} />
                        <KpiCard label="OOS SKUs with Demand" value={kpiData.oosWithDemand} description="Unique items with recent sales" icon={<CubeIcon />} />
                        <KpiCard label="Affected Customers" value={uniqueAffectedCustomers} description="Purchased these items recently" icon={<UserGroupIcon />} />
                    </motion.div>
                    <motion.div variants={itemVariants}><ChartCard title="Backorder Strategy Matrix" description="Segmenting backorders by sales velocity vs. potential value." className="h-full"><div className="min-h-[500px]">
                        <BackorderPriorityChart 
                            recommendations={filteredRecommendations}
                            onQuadrantSelect={handleQuadrantSelect}
                            selectedQuadrant={localFilters.backorderPriority === 'all' ? null : localFilters.backorderPriority}
                        />
                    </div></ChartCard></motion.div>
                    <motion.div variants={itemVariants}><Card className="p-4 sm:p-6"><BackorderTable recommendations={filteredRecommendations} allSales={allSales} /></Card></motion.div>
                </motion.div>
            ) : (
                 <motion.div key="no-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm flex items-center justify-center"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-md mx-4 text-center"><div className="mb-4"><FunnelIcon className="h-16 w-16 mx-auto text-red-500 opacity-50" /></div><h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Backorders Found</h3><p className="text-gray-600 dark:text-gray-300 mb-6">Your current filters returned no results. Try adjusting or clearing some filters.</p><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={clearAllFilters} className="px-6 py-3 rounded-xl bg-gradient-to-br from-red-600 to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all">Clear All Filters</motion.button></motion.div></motion.div>
            )}

            <AnimatePresence>{showScrollTop && (<motion.button initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={scrollToTop} className="fixed bottom-8 right-8 z-50 p-4 rounded-full bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-2xl hover:shadow-red-500/50" title="Scroll to top"><ArrowUpIcon className="h-6 w-6" /></motion.button>)}</AnimatePresence>
        </main>
    );
});
BackorderAnalysisDashboard.displayName = 'BackorderAnalysisDashboard';

export default BackorderAnalysisDashboard;