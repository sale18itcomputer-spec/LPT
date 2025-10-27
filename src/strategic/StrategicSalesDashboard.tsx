import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView, Variants } from 'framer-motion';
import type { SalesOpportunity, CustomerSalesOpportunity, LocalFiltersState } from '../../types';
import Card from '../ui/Card';
import AnimatedCounter from '../ui/AnimatedCounter';
import { SparklesIcon, BanknotesIcon, UserGroupIcon, FunnelIcon, XMarkIcon, ArrowUpIcon } from '../ui/Icons';
import CustomerOpportunityTable from './CustomerOpportunityTable';
import SalesPlaybookModal from './SalesPlaybookModal';
import AISalesBriefing from './AISalesBriefing';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../contexts/ToastContext';
import { INITIAL_LOCAL_FILTERS } from '../../constants';

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants: Variants = { hidden: { y: 30, opacity: 0, scale: 0.97 }, visible: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } } };
const headerVariants: Variants = { hidden: { y: -20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } } };
const filterBadgeVariants: Variants = { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } }, exit: { scale: 0, opacity: 0, transition: { duration: 0.2 } } };

const KpiCard = React.forwardRef<HTMLDivElement, { label: string; value: number; icon: React.ReactElement<React.SVGProps<SVGSVGElement>>; formatter?: (val: number) => string; }>(({ label, value, icon, formatter }, ref) => (
    <Card ref={ref} className="p-5 h-full"><div className="flex items-center"><div className="flex-shrink-0">{React.cloneElement(icon, { className: 'h-7 w-7 text-secondary-text' })}</div><div className="ml-5 w-0 flex-1"><dl><dt className="text-sm font-medium text-secondary-text truncate">{label}</dt><dd className="text-2xl font-bold text-primary-text"><AnimatedCounter to={value} formatter={formatter} /></dd></dl></div></div></Card>
));
KpiCard.displayName = 'KpiCard';

interface StrategicSalesDashboardProps {
    onPsrefLookup: (item: { mtm: string; modelName: string }) => void;
    localFilters: LocalFiltersState;
    setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const StrategicSalesDashboard = React.forwardRef<HTMLDivElement, StrategicSalesDashboardProps>(({ onPsrefLookup, localFilters, setLocalFilters }, ref) => {
    const { customerOpportunities } = useData();
    const { showToast } = useToast();
    const [selectedOpportunity, setSelectedOpportunity] = useState<SalesOpportunity | SalesOpportunity[] | null>(null);
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

    const handleGeneratePlaybook = (opportunity: SalesOpportunity | SalesOpportunity[]) => setSelectedOpportunity(opportunity);
    const handleCloseModal = () => setSelectedOpportunity(null);

    const filteredOpportunities = useMemo(() => {
        const { strategicSearchTerm, strategicCustomerTier } = localFilters;
        let filtered = [...customerOpportunities];
        if (strategicSearchTerm) { const lowerSearch = strategicSearchTerm.toLowerCase(); filtered = filtered.filter(co => co.customerName.toLowerCase().includes(lowerSearch)); }
        if (strategicCustomerTier.length > 0) { filtered = filtered.filter(co => co.customerTier && strategicCustomerTier.includes(co.customerTier)); }
        return filtered;
    }, [customerOpportunities, localFilters]);
    
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (localFilters.strategicSearchTerm) count++;
        if (localFilters.strategicCustomerTier.length > 0) count++;
        return count;
    }, [localFilters]);

    const clearAllFilters = useCallback(() => {
        setLocalFilters(prev => ({ ...prev, ...INITIAL_LOCAL_FILTERS }));
        showToast('All strategic filters cleared', 'success');
    }, [setLocalFilters, showToast]);

    const kpiData = useMemo(() => {
        return {
            customersWithOpps: filteredOpportunities.length,
            totalOpportunityValue: filteredOpportunities.reduce((sum, c) => sum + c.totalOpportunityValue, 0),
            highPriorityCustomers: filteredOpportunities.filter(c => c.customerOpportunityScore >= 75).length,
        };
    }, [filteredOpportunities]);

    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    return (
        <main ref={mainContentRef} className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-8">
            <motion.div variants={headerVariants} initial="hidden" animate="visible" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 p-8 shadow-xl">
                 <div className="relative z-10">
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Strategic Sales Advisor</h1>
                    <p className="text-indigo-100 text-lg mb-4">AI-powered insights to sell surplus stock to the right customers.</p>
                     {activeFiltersCount > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/25 backdrop-blur-sm border border-white/40"><FunnelIcon className="h-4 w-4 text-white" /><span className="text-sm font-semibold text-white">{activeFiltersCount} Active Filter(s)</span></div>
                            <AnimatePresence mode="popLayout">{localFilters.strategicCustomerTier.length > 0 && (<motion.button key="tier-filter" variants={filterBadgeVariants} initial="initial" animate="animate" exit="exit" onClick={() => setLocalFilters(p => ({...p, strategicCustomerTier: []}))} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-indigo-700 text-sm font-medium transition-colors"><span>Tier: {localFilters.strategicCustomerTier[0]}</span><XMarkIcon className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" /></motion.button>)}</AnimatePresence>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={clearAllFilters} className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 border border-white/40 text-white text-sm font-medium transition-colors">Clear All</motion.button>
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {filteredOpportunities.length > 0 ? (
                <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8">
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                        <motion.div className="md:col-span-1" variants={itemVariants}><AISalesBriefing customerOpportunities={filteredOpportunities} /></motion.div>
                        <motion.div ref={kpiRef} className="md:col-span-2" initial="hidden" animate={isKpiInView ? "visible" : "hidden"} variants={containerVariants}>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <motion.div variants={itemVariants}><KpiCard label="Customers with Opportunities" value={kpiData.customersWithOpps} icon={<UserGroupIcon />} /></motion.div>
                                <motion.div variants={itemVariants}><KpiCard label="Total Opportunity Value" value={kpiData.totalOpportunityValue} icon={<BanknotesIcon />} formatter={currencyFormatter}/></motion.div>
                                <motion.div variants={itemVariants}><KpiCard label="High-Priority Customers" value={kpiData.highPriorityCustomers} icon={<SparklesIcon />} /></motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                    <motion.div variants={itemVariants}><Card className="p-4 sm:p-6"><CustomerOpportunityTable customerOpportunities={filteredOpportunities} onGeneratePlaybook={handleGeneratePlaybook} onPsrefLookup={onPsrefLookup} /></Card></motion.div>
                </motion.div>
            ) : (
                <motion.div key="no-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm flex items-center justify-center"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-md mx-4 text-center"><div className="mb-4"><FunnelIcon className="h-16 w-16 mx-auto text-indigo-500 opacity-50" /></div><h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Opportunities Found</h3><p className="text-gray-600 dark:text-gray-300 mb-6">Your current filters returned no results. Try adjusting or clearing some filters.</p><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={clearAllFilters} className="px-6 py-3 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all">Clear All Filters</motion.button></motion.div></motion.div>
            )}

            <SalesPlaybookModal isOpen={!!selectedOpportunity} onClose={handleCloseModal} opportunity={selectedOpportunity} />
            <AnimatePresence>{showScrollTop && (<motion.button initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={scrollToTop} className="fixed bottom-8 right-8 z-50 p-4 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-2xl hover:shadow-indigo-500/50" title="Scroll to top"><ArrowUpIcon className="h-6 w-6" /></motion.button>)}</AnimatePresence>
        </main>
    );
});

StrategicSalesDashboard.displayName = 'StrategicSalesDashboard';

export default StrategicSalesDashboard;