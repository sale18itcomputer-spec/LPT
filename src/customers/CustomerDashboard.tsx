

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView, Variants } from 'framer-motion';
import type { Customer, CustomerTier, LocalFiltersState } from '../../types';
import CustomerProfile from './CustomerProfile';
import { useData } from '../../contexts/DataContext';
import Card from '../ui/Card';
import KpiCard from '../ui/KpiCard';
import { UserGroupIcon, ChevronUpIcon, ChevronDownIcon, FireIcon, UserPlusIcon, UserMinusIcon, FunnelIcon, XMarkIcon, ArrowUpIcon, DocumentMagnifyingGlassIcon } from '../ui/Icons';
import TierBadge from './TierBadge';
import CustomerValueMatrix from './CustomerValueMatrix';
import { INITIAL_LOCAL_FILTERS } from '../../constants';
import { useToast } from '../../contexts/ToastContext';
import ChartCard from '../ui/ChartCard';

const viewVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 30 : -30 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction < 0 ? 30 : -30 }),
};

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } } };
const itemVariants: Variants = { hidden: { y: 30, opacity: 0, scale: 0.97 }, visible: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } } };
const headerVariants: Variants = { hidden: { y: -20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } } };
const filterBadgeVariants: Variants = { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } }, exit: { scale: 0, opacity: 0, transition: { duration: 0.2 } } };

type SortKey = keyof Omit<Customer, 'id' | 'sales'>;
type SortOrder = 'asc' | 'desc';
interface SortConfig { key: SortKey; direction: SortOrder; }

const TableHeader: React.FC<{ onSort: (key: SortKey) => void, sortConfig: SortConfig | null, sortKey: SortKey, children: React.ReactNode, className?: string, }> = ({ onSort, sortConfig, sortKey, children, className = '' }) => {
  const isSorted = sortConfig?.key === sortKey;
  return (<th scope="col" className={`px-4 py-3.5 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider select-none cursor-pointer group ${className}`} onClick={() => onSort(sortKey)} aria-sort={isSorted ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><div className="flex items-center">{children}<span className="w-4 h-4 ml-1.5">{isSorted ? (sortConfig.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />) : <ChevronUpIcon className="opacity-30 group-hover:opacity-100" />}</span></div></th>);
};

const CustomerStatusBadge: React.FC<{ customer: Customer }> = ({ customer }) => {
    if (customer.isNew) { return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">New</span>; }
    if (customer.isAtRisk) { return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">At Risk</span>; }
    return null;
}

interface CustomerDashboardProps {
    localFilters: LocalFiltersState;
    setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
    userRole: string;
}

const CustomerDashboard = React.forwardRef<HTMLDivElement, CustomerDashboardProps>(({ localFilters, setLocalFilters, userRole }, ref) => {
    const { customerData } = useData();
    const { showToast } = useToast();
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [direction, setDirection] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'totalRevenue', direction: 'desc' });
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
    
    const handleSelectCustomer = (customer: Customer) => { setDirection(1); setSelectedCustomer(customer); };
    const handleBackToList = () => { setDirection(-1); setSelectedCustomer(null); };

    const filteredCustomers = useMemo(() => {
        const { customerSearchTerm, customerTier, customerStatus, customerMatrixQuadrant } = localFilters;

        const calculateQuadrants = (customersToQuadrantize: Customer[]) => {
            const quadrants = {
                champions: new Set<string>(),
                highSpenders: new Set<string>(),
                loyal: new Set<string>(),
                atRisk: new Set<string>(),
            };
    
            if (customersToQuadrantize.length === 0) return quadrants;
    
            const revenues = [...customersToQuadrantize].map(c => c.totalRevenue).sort((a, b) => a - b);
            const frequencies = [...customersToQuadrantize].map(c => c.invoiceCount).sort((a, b) => a - b);
    
            if (customersToQuadrantize.length < 4) {
                customersToQuadrantize.forEach(c => quadrants.atRisk.add(c.id));
                return quadrants;
            }
    
            const medianRevenue = revenues[Math.floor(revenues.length / 2)];
            const medianFrequency = frequencies[Math.floor(frequencies.length / 2)];
            
            customersToQuadrantize.forEach(customer => {
                const isHighRevenue = customer.totalRevenue >= medianRevenue;
                const isHighFrequency = customer.invoiceCount >= medianFrequency;
    
                if (isHighRevenue && isHighFrequency) quadrants.champions.add(customer.id);
                else if (isHighRevenue && !isHighFrequency) quadrants.highSpenders.add(customer.id);
                else if (!isHighRevenue && isHighFrequency) quadrants.loyal.add(customer.id);
                else quadrants.atRisk.add(customer.id);
            });
            return quadrants;
        };
        
        const customerQuadrants = calculateQuadrants(customerData);

        return customerData.filter(c => {
            if(customerSearchTerm && !c.name.toLowerCase().includes(customerSearchTerm.toLowerCase())) return false;
            if(customerTier.length > 0 && (!c.tier || !customerTier.includes(c.tier))) return false;
            if(customerStatus !== 'all') {
                if(customerStatus === 'new' && !c.isNew) return false;
                if(customerStatus === 'atRisk' && !c.isAtRisk) return false;
                if(customerStatus === 'active' && c.isAtRisk) return false;
            }
            if (customerMatrixQuadrant) {
                if (!customerQuadrants[customerMatrixQuadrant].has(c.id)) return false;
            }
            return true;
        });
    }, [customerData, localFilters]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (localFilters.customerSearchTerm) count++;
        if (localFilters.customerTier.length > 0) count++;
        if (localFilters.customerStatus !== 'all') count++;
        if (localFilters.customerMatrixQuadrant) count++;
        return count;
    }, [localFilters]);

    const clearAllFilters = useCallback(() => {
        setLocalFilters(prev => ({
            ...prev,
            customerSearchTerm: INITIAL_LOCAL_FILTERS.customerSearchTerm,
            customerTier: INITIAL_LOCAL_FILTERS.customerTier,
            customerStatus: INITIAL_LOCAL_FILTERS.customerStatus,
            customerMatrixQuadrant: null
        }));
        showToast('All customer filters cleared', 'success');
    }, [setLocalFilters, showToast]);

    const kpiData = useMemo(() => {
        return {
            totalCustomers: filteredCustomers.length,
            activeCustomers: filteredCustomers.filter(c => !c.isAtRisk).length,
            newCustomers: filteredCustomers.filter(c => c.isNew).length,
            atRiskCustomers: filteredCustomers.filter(c => c.isAtRisk).length,
        };
    }, [filteredCustomers]);

    const requestSort = (key: SortKey) => {
        let direction: SortOrder = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const sortedCustomers = useMemo(() => {
        let sortedData = [...filteredCustomers];
        if (sortConfig !== null) {
            const tierOrder: Record<CustomerTier, number> = { Platinum: 4, Gold: 3, Silver: 2, Bronze: 1 };
            sortedData.sort((a, b) => {
                if (sortConfig.key === 'tier') {
                    const aVal = a.tier ? tierOrder[a.tier] : 0;
                    const bVal = b.tier ? tierOrder[b.tier] : 0;
                     if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                     if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                     return 0;
                }
                const aVal = a[sortConfig.key as keyof Customer];
                const bVal = b[sortConfig.key as keyof Customer];
                if (aVal! < bVal!) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal! > bVal!) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortedData;
    }, [filteredCustomers, sortConfig]);
    
    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    
    const handleQuadrantSelect = useCallback((quadrant: 'champions' | 'highSpenders' | 'loyal' | 'atRisk' | null) => {
        setLocalFilters(prev => ({
            ...prev,
            customerMatrixQuadrant: prev.customerMatrixQuadrant === quadrant ? null : quadrant,
        }));
    }, [setLocalFilters]);

    const renderListView = () => (
        <main ref={mainContentRef} className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-8">
            <motion.div variants={headerVariants} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-sky-600 to-blue-600 p-8 shadow-xl">
                 <div className="relative z-10">
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Customer Intelligence</h1>
                    <p className="text-sky-100 text-lg mb-4">Strategic overview of your customer base and their purchasing behavior.</p>
                     {activeFiltersCount > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/25 backdrop-blur-sm border border-white/40"><FunnelIcon className="h-4 w-4 text-white" /><span className="text-sm font-semibold text-white">{activeFiltersCount} Active Filter(s)</span></div>
                             <AnimatePresence mode="popLayout">{localFilters.customerStatus !== 'all' && (<motion.button key="status-filter" variants={filterBadgeVariants} initial="initial" animate="animate" exit="exit" onClick={() => setLocalFilters(p => ({...p, customerStatus: 'all'}))} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-sky-700 text-sm font-medium transition-colors"><span>{localFilters.customerStatus}</span><XMarkIcon className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" /></motion.button>)}</AnimatePresence>
                            <AnimatePresence mode="popLayout">{localFilters.customerMatrixQuadrant && (<motion.button key="quadrant-filter" variants={filterBadgeVariants} initial="initial" animate="animate" exit="exit" onClick={() => handleQuadrantSelect(null)} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-sky-700 text-sm font-medium transition-colors capitalize"><span>{localFilters.customerMatrixQuadrant}</span><XMarkIcon className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" /></motion.button>)}</AnimatePresence>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={clearAllFilters} className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 border border-white/40 text-white text-sm font-medium transition-colors">Clear All</motion.button>
                        </motion.div>
                    )}
                </div>
            </motion.div>
            
            <motion.div ref={kpiRef} initial="hidden" animate={isKpiInView ? "visible" : "hidden"} variants={containerVariants} className="grid grid-cols-fluid gap-6">
                <KpiCard label="Total Customers" value={kpiData.totalCustomers} icon={<UserGroupIcon />} />
                <KpiCard label="Active Customers" value={kpiData.activeCustomers} icon={<FireIcon />} description="Purchased in last 180 days"/>
                <KpiCard label="New Customers" value={kpiData.newCustomers} icon={<UserPlusIcon />} description="First purchase in last 90 days"/>
                <KpiCard label="At-Risk Customers" value={kpiData.atRiskCustomers} icon={<UserMinusIcon />} description="No purchase in >180 days"/>
            </motion.div>

            {customerData.length > 0 ? (
                <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8">
                     <motion.div variants={itemVariants}>
                        <ChartCard
                            title="Customer Segmentation Matrix"
                            description="Customers segmented by purchase frequency and total revenue. Click a quadrant to filter."
                        >
                            <CustomerValueMatrix 
                                customers={customerData} 
                                onSelectCustomer={handleSelectCustomer}
                                onQuadrantSelect={handleQuadrantSelect}
                                selectedQuadrant={localFilters.customerMatrixQuadrant}
                            />
                        </ChartCard>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <Card className="p-4 sm:p-6"><h3 className="text-lg font-semibold text-primary-text mb-4">All Customers</h3>
                             <div className="hidden md:block overflow-x-auto"><table className="min-w-full"><thead className="bg-gray-50 dark:bg-dark-secondary-bg/20"><tr><TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="name">Customer</TableHeader><TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="tier">Tier</TableHeader>{userRole === 'Admin' && (<TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalRevenue" className="text-right">Total Revenue</TableHeader>)}<TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="invoiceCount" className="text-center">Invoices</TableHeader><TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="daysSinceLastPurchase" className="text-center">Last Purchase</TableHeader><TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="isNew">Status</TableHeader></tr></thead><tbody className="bg-secondary-bg dark:bg-dark-secondary-bg">{sortedCustomers.map(c => (<tr key={c.id} onClick={() => handleSelectCustomer(c)} className="border-b border-border-color dark:border-dark-border-color hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover cursor-pointer"><td className="px-4 py-3 text-sm font-medium text-highlight">{c.name}</td><td className="px-4 py-3 text-sm"><TierBadge tier={c.tier} /></td>{userRole === 'Admin' && (<td className="px-4 py-3 text-sm text-primary-text dark:text-dark-primary-text text-right font-semibold">{currencyFormatter(c.totalRevenue)}</td>)}<td className="px-4 py-3 text-sm text-center">{c.invoiceCount}</td><td className="px-4 py-3 text-sm text-center"><span className={`font-medium ${c.daysSinceLastPurchase > 180 ? 'text-orange-600 dark:text-orange-400' : 'text-secondary-text'}`}>{c.daysSinceLastPurchase === Infinity ? 'N/A' : `${c.daysSinceLastPurchase}d ago`}</span></td><td className="px-4 py-3 text-sm"><CustomerStatusBadge customer={c} /></td></tr>))}</tbody></table></div>
                             <div className="md:hidden space-y-4">{sortedCustomers.map(c => (<Card key={c.id} onClick={() => handleSelectCustomer(c)} className="p-4"><div className="flex justify-between items-start"><div><p className="font-bold text-lg text-highlight">{c.name}</p><div className="mt-1"><TierBadge tier={c.tier} /></div></div><CustomerStatusBadge customer={c} /></div><div className={`mt-4 grid ${userRole === 'Admin' ? 'grid-cols-2' : 'grid-cols-1'} gap-4 text-center border-t border-border-color pt-3`}>{userRole === 'Admin' && (<div><p className="text-xs text-secondary-text">Revenue</p><p className="font-bold text-primary-text">{currencyFormatter(c.totalRevenue)}</p></div>)}<div><p className="text-xs text-secondary-text">Last Purchase</p><p className="font-bold text-primary-text">{c.daysSinceLastPurchase === Infinity ? 'N/A' : `${c.daysSinceLastPurchase}d ago`}</p></div></div></Card>))}</div>
                        </Card>
                    </motion.div>
                </motion.div>
            ) : (
                <motion.div key="no-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm flex items-center justify-center"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-md mx-4 text-center"><div className="mb-4"><FunnelIcon className="h-16 w-16 mx-auto text-blue-500 opacity-50" /></div><h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Customers Found</h3><p className="text-gray-600 dark:text-gray-300 mb-6">Your current filters returned no results. Try adjusting or clearing some filters.</p><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={clearAllFilters} className="px-6 py-3 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all">Clear All Filters</motion.button></motion.div></motion.div>
            )}

            <AnimatePresence>{showScrollTop && (<motion.button initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={scrollToTop} className="fixed bottom-8 right-8 z-50 p-4 rounded-full bg-gradient-to-br from-sky-600 to-blue-600 text-white shadow-2xl hover:shadow-blue-500/50" title="Scroll to top"><ArrowUpIcon className="h-6 w-6" /></motion.button>)}</AnimatePresence>
        </main>
    );

    return (
        <div ref={ref} className="relative">
            <AnimatePresence initial={false} custom={direction}>
                <motion.div
                    key={selectedCustomer ? 'profile' : 'list'}
                    custom={direction}
                    variants={viewVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="w-full"
                >
                    {selectedCustomer ? (
                        <CustomerProfile customer={selectedCustomer} onBack={handleBackToList} userRole={userRole} />
                    ) : (
                        renderListView()
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
});

CustomerDashboard.displayName = 'CustomerDashboard';

export default CustomerDashboard;