
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView, type Variants } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../contexts/ToastContext';
import type { Order, DashboardType, ViewType, LocalFiltersState, OrderKpiData } from '../../types';
import OrderKpiCards from './OrderKpiCards';
import OrderValueTrendChart from '../OrderValueTrendChart';
import Card from '../ui/Card';
import ChartCard from '../ui/ChartCard';
import OrderTable from '../OrderTable';
import { ArrowUpIcon, FunnelIcon, XMarkIcon, ChartBarIcon } from '../ui/Icons';
import { INITIAL_LOCAL_FILTERS } from '../../constants';
import { calculateDatesForPreset, toYYYYMMDD } from '../../utils/dateHelpers';
import ShipmentGanttChart from './ShipmentGanttChart';

interface OrderDashboardProps {
    onRowClick: (order: Order) => void;
    onNavigateAndFilter: (view: ViewType, filters: Partial<LocalFiltersState>) => void;
    onPsrefLookup: (item: { mtm: string; modelName: string }) => void;
    localFilters: LocalFiltersState;
    onTrackShipment: (deliveryNumber: string) => void;
    setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } } };
const itemVariants: Variants = { hidden: { y: 30, opacity: 0, scale: 0.97 }, visible: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } } };
const headerVariants: Variants = { hidden: { y: -20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } } };
const filterBadgeVariants: Variants = { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } }, exit: { scale: 0, opacity: 0, transition: { duration: 0.2 } } };


const OrderDashboard: React.FC<OrderDashboardProps> = ({ onRowClick, onNavigateAndFilter, onPsrefLookup, localFilters, onTrackShipment, setLocalFilters }) => {
    
    const { allOrders, totalOrderCount, newModelMtms } = useData();
    const { showToast } = useToast();
    const [showScrollTop, setShowScrollTop] = useState(false);
    
    const mainContentRef = useRef<HTMLDivElement>(null);
    const kpiRef = useRef<HTMLDivElement>(null);
    const isKpiInView = useInView(kpiRef, { once: true, margin: "-100px" });

    // Scroll to top functionality
    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const locallyFilteredOrders = useMemo(() => {
        const { orderSearchTerm, orderShow, orderFactoryStatus, orderLocalStatus, orderStartDate, orderEndDate } = localFilters;
        let tempOrders = [...allOrders];
        if (orderFactoryStatus.length > 0) { tempOrders = tempOrders.filter(o => orderFactoryStatus.includes(o.factoryToSgp)); }
        if (orderLocalStatus.length > 0) { tempOrders = tempOrders.filter(o => orderLocalStatus.includes(o.status)); }
        if (orderStartDate || orderEndDate) {
            const start = orderStartDate ? new Date(orderStartDate).getTime() : -Infinity;
            const end = orderEndDate ? new Date(orderEndDate).getTime() + 86400000 - 1 : Infinity;
            tempOrders = tempOrders.filter(o => { if (!o.dateIssuePI) return false; const issueDate = new Date(o.dateIssuePI).getTime(); return issueDate >= start && issueDate <= end; });
        }
        if (orderSearchTerm) { const lowercasedTerm = orderSearchTerm.toLowerCase(); tempOrders = tempOrders.filter(order => order.salesOrder.toLowerCase().includes(lowercasedTerm) || order.mtm.toLowerCase().includes(lowercasedTerm) || order.modelName.toLowerCase().includes(lowercasedTerm)); }
        if (orderShow === 'all') { return tempOrders; }
        return tempOrders.filter(order => {
            switch (orderShow) {
                case 'overdue': return order.isDelayedProduction || order.isDelayedTransit;
                case 'delayedProduction': return order.isDelayedProduction;
                case 'delayedTransit': return order.isDelayedTransit;
                case 'atRisk': return order.isAtRisk;
                case 'onSchedule': return !order.isDelayedProduction && !order.isDelayedTransit && !order.isAtRisk;
                default: return true;
            }
        });
    }, [allOrders, localFilters]);

    const orderKpiData: OrderKpiData = useMemo(() => {
        const kpiAccumulator = locallyFilteredOrders.reduce((acc, order) => {
            acc.totalOrders++; acc.totalUnits += order.qty; acc.totalLandingCostValue += order.landingCostUnitPrice * order.qty; acc.totalFobValue += order.orderValue; if (order.isDelayedProduction || order.isDelayedTransit) acc.delayedOrdersCount++; if (order.isAtRisk) acc.atRiskOrdersCount++; if (!order.actualArrival) { acc.openUnits += order.qty; acc.backlogValue += order.orderValue; }
            if (order.dateIssuePI && order.actualArrival) { const leadTime = (new Date(order.actualArrival).getTime() - new Date(order.dateIssuePI).getTime()) / (1000 * 60 * 60 * 24); if (leadTime >= 0) { acc.totalLeadTime += leadTime; acc.leadTimeOrderCount++; } }
            return acc;
        }, { totalLandingCostValue: 0, totalFobValue: 0, openUnits: 0, delayedOrdersCount: 0, totalOrders: 0, totalUnits: 0, backlogValue: 0, atRiskOrdersCount: 0, totalLeadTime: 0, leadTimeOrderCount: 0 });
        
        const uniqueOrderCount = new Set(locallyFilteredOrders.map(o => o.salesOrder)).size;
        const avgOrderValue = uniqueOrderCount > 0 ? kpiAccumulator.totalFobValue / uniqueOrderCount : 0;
        
        const onTimeEligibleOrders = locallyFilteredOrders.filter(o => o.eta && o.actualArrival);
        const onTimeArrivals = onTimeEligibleOrders.filter(o => o.actualArrival! <= o.eta!).length;
        
        return {
            totalLandingCostValue: kpiAccumulator.totalLandingCostValue, totalFobValue: kpiAccumulator.totalFobValue, openUnits: kpiAccumulator.openUnits, delayedOrdersCount: kpiAccumulator.delayedOrdersCount, totalOrders: kpiAccumulator.totalOrders, totalUnits: kpiAccumulator.totalUnits, backlogValue: kpiAccumulator.backlogValue, atRiskOrdersCount: kpiAccumulator.atRiskOrdersCount,
            averageLeadTime: kpiAccumulator.leadTimeOrderCount > 0 ? kpiAccumulator.totalLeadTime / kpiAccumulator.leadTimeOrderCount : 0, onTimeArrivalRate: onTimeEligibleOrders.length > 0 ? (onTimeArrivals / onTimeEligibleOrders.length) * 100 : 0, onTimeEligibleCount: onTimeEligibleOrders.length,
            averageFobPrice: kpiAccumulator.totalUnits > 0 ? kpiAccumulator.totalFobValue / kpiAccumulator.totalUnits : 0, averageLandingCost: kpiAccumulator.totalUnits > 0 ? kpiAccumulator.totalLandingCostValue / kpiAccumulator.totalUnits : 0,
            uniqueOrderCount,
            avgOrderValue,
        };
    }, [locallyFilteredOrders]);
    
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (localFilters.orderSearchTerm) count++;
        if (localFilters.orderShow !== 'all') count++;
        if (localFilters.orderFactoryStatus.length > 0) count++;
        if (localFilters.orderLocalStatus.length > 0) count++;
        if (localFilters.orderDateRangePreset !== 'thisYear' && localFilters.orderDateRangePreset !== 'all') count++;
        return count;
    }, [localFilters]);

    const clearAllFilters = useCallback(() => {
        setLocalFilters(prev => ({
            ...prev,
            orderSearchTerm: '',
            orderShow: 'all',
            orderFactoryStatus: [],
            orderLocalStatus: [],
            orderDateRangePreset: 'thisYear',
            orderYear: 'all',
            orderQuarter: 'all',
            orderStartDate: INITIAL_LOCAL_FILTERS.orderStartDate,
            orderEndDate: INITIAL_LOCAL_FILTERS.orderEndDate,
        }));
        showToast('All order filters cleared', 'success');
    }, [setLocalFilters, showToast]);


    const handleNavigate = (target: DashboardType, searchTerm: string) => {
        onNavigateAndFilter(target, { [target === 'orders' ? 'orderSearchTerm' : 'salesSearchTerm']: searchTerm });
    };

    const selectedPeriodKey = useMemo(() => {
        if (localFilters.orderDateRangePreset !== 'custom' || !localFilters.orderStartDate || !localFilters.orderEndDate) return null;
        try {
            const date = new Date(localFilters.orderStartDate + 'T00:00:00Z');
            const endDate = new Date(localFilters.orderEndDate + 'T00:00:00Z');
            const expectedEndDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
            
            // Check if start is the 1st of the month and end date is the last day of the same month
            if (date.getUTCDate() === 1 && endDate.getTime() === expectedEndDate.getTime()) {
                return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
            }
            return null;
        } catch(e) {
            return null;
        }
    }, [localFilters.orderStartDate, localFilters.orderEndDate, localFilters.orderDateRangePreset]);


    return (
        <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-8" ref={mainContentRef}>
             <motion.div 
                variants={headerVariants} 
                initial="hidden" 
                animate="visible"
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 dark:from-indigo-700 dark:via-purple-700 dark:to-fuchsia-700 p-8 shadow-xl"
            >
                <div className="relative z-10">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-4"
                    >
                        <ChartBarIcon className="h-5 w-5 text-white" />
                        <span className="text-sm font-semibold text-white">Analytics Dashboard</span>
                    </motion.div>
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Order Analytics</h1>
                    <p className="text-purple-100 text-lg mb-4">Track backlogs, lead times, and overall order health.</p>

                     {activeFiltersCount > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 flex-wrap"
                        >
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/25 backdrop-blur-sm border border-white/40">
                                <FunnelIcon className="h-4 w-4 text-white" />
                                <span className="text-sm font-semibold text-white">
                                    {activeFiltersCount} Active {activeFiltersCount === 1 ? 'Filter' : 'Filters'}
                                </span>
                            </div>
                             <AnimatePresence mode="popLayout">
                                {localFilters.orderShow !== 'all' && (
                                     <motion.button key="show-filter" variants={filterBadgeVariants} initial="initial" animate="animate" exit="exit" onClick={() => setLocalFilters(prev => ({...prev, orderShow: 'all'}))} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-indigo-700 text-sm font-medium transition-colors">
                                        <span>Show: {localFilters.orderShow}</span><XMarkIcon className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                                    </motion.button>
                                )}
                            </AnimatePresence>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={clearAllFilters} className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 border border-white/40 text-white text-sm font-medium transition-colors">
                                Clear All
                            </motion.button>
                        </motion.div>
                    )}
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-fuchsia-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            </motion.div>

            <motion.div ref={kpiRef} initial="hidden" animate={isKpiInView ? "visible" : "hidden"} variants={containerVariants}>
                <OrderKpiCards kpiData={orderKpiData} />
            </motion.div>
            
            <motion.div initial="hidden" animate="visible" variants={containerVariants} className="grid grid-cols-1 gap-6 md:gap-8">
                <motion.div variants={itemVariants}>
                    <ChartCard title="Order Value Trend" description="Value of orders by Order Receipt Date." className="h-[500px]">
                        <OrderValueTrendChart
                            data={locallyFilteredOrders}
                        />
                    </ChartCard>
                </motion.div>
                <motion.div variants={itemVariants}>
                     <ChartCard title="Planned vs Actual Shipment" description="Compares PI-to-Ship (planned) vs PI-to-Arrival (actual) for recent orders." className="h-[500px]">
                        <ShipmentGanttChart orders={locallyFilteredOrders} />
                    </ChartCard>
                </motion.div>
            </motion.div>
            
            <motion.div 
                variants={itemVariants} 
                initial="hidden" 
                animate="visible" 
                transition={{ delay: 0.6 }}
                className="rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300"
            >
                <Card title="Order Details" description={`${locallyFilteredOrders.length} line items matching filters`} className="p-0">
                    <div className="p-4 sm:p-6 pt-0">
                        <OrderTable 
                            orders={locallyFilteredOrders} 
                            totalOrderCount={totalOrderCount} 
                            onRowClick={onRowClick} 
                            onNavigateAndFilter={handleNavigate} 
                            newModelMtms={newModelMtms} 
                            onPsrefLookup={onPsrefLookup} 
                            onTrackShipment={onTrackShipment}
                        />
                    </div>
                </Card>
            </motion.div>
            
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={scrollToTop}
                        className="fixed bottom-8 right-8 z-50 p-4 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-2xl hover:shadow-purple-500/50 transition-shadow duration-300"
                        title="Scroll to top"
                    >
                        <ArrowUpIcon className="h-6 w-6" />
                    </motion.button>
                )}
            </AnimatePresence>

        </main>
    );
};

export default OrderDashboard;
