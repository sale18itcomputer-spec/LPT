import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useInView, Variants } from 'framer-motion';
import type { InventoryItem, ViewType, LocalFiltersState } from '../../types';
import Card from '../ui/Card';
import KpiCard from '../ui/KpiCard';
import ChartCard from '../ui/ChartCard';
import { 
    CubeIcon, 
    BanknotesIcon, 
    ExclamationTriangleIcon, 
    TruckIcon, 
    ArrowUpIcon, 
    FunnelIcon, 
    XMarkIcon,
    GlobeAltIcon,
    ShieldCheckIcon,
    FireIcon,
    ArchiveBoxIcon,
    ArrowDownCircleIcon
} from '../ui/Icons';
import InventoryTable from './InventoryTable';
import InventoryStatusChart from './InventoryStatusChart';
import { INITIAL_LOCAL_FILTERS } from '../../constants';
import { useToast } from '../../contexts/ToastContext';

// Animation Variants
const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants: Variants = { hidden: { y: 20, opacity: 0, scale: 0.98 }, visible: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } } };
const headerVariants: Variants = { hidden: { y: -15, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } } };
const filterBadgeVariants: Variants = { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 400, damping: 25 } }, exit: { scale: 0, opacity: 0, transition: { duration: 0.15 } } };

interface InventoryDashboardProps {
  inventoryData: InventoryItem[];
  isLoading?: boolean;
  onNavigateAndFilter: (view: ViewType, filters: Partial<LocalFiltersState>) => void;
  onPsrefLookup: (item: { mtm: string; modelName: string }) => void;
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
  userRole: string;
}

const InventoryDashboard = React.forwardRef<HTMLDivElement, InventoryDashboardProps>(
  ({ inventoryData, isLoading = false, onNavigateAndFilter, onPsrefLookup, localFilters, setLocalFilters, userRole }, ref) => {
    const [showScrollTop, setShowScrollTop] = useState(false);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const kpiRef = useRef<HTMLDivElement>(null);
    const isKpiInView = useInView(kpiRef, { once: true, margin: '-100px' });

    useEffect(() => {
      const handleScroll = () => setShowScrollTop(window.scrollY > 400);
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    const stockStatusFilters: Record<LocalFiltersState['stockStatus'], (item: InventoryItem) => boolean> = {
      all: () => true,
      oversold: item => item.onHandQty < 0,
      otw: item => item.otwQty > 0,
      outOfStock: item => item.onHandQty <= 0,
      noSales: item => item.onHandQty > 0 && item.weeksOfInventory === null,
      lowStock: item => item.onHandQty > 0 && item.weeksOfInventory !== null && item.weeksOfInventory <= 12 && item.weeksOfInventory >= 4,
      critical: item => item.onHandQty > 0 && item.weeksOfInventory !== null && item.weeksOfInventory < 4,
      healthy: item => item.weeksOfInventory !== null && item.weeksOfInventory > 12,
    };

    const filteredInventoryData = useMemo(() => {
      if (!inventoryData) return [];
      return inventoryData.filter(item => {
        if (localFilters.inventorySearchTerm) {
          const lowerSearch = localFilters.inventorySearchTerm.toLowerCase();
          if (!(item.mtm?.toLowerCase().includes(lowerSearch) || item.modelName?.toLowerCase().includes(lowerSearch))) {
            return false;
          }
        }
        return stockStatusFilters[localFilters.stockStatus as LocalFiltersState['stockStatus']](item);
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

    const currencyFormatter = (val: number, currency: string = 'USD') =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(val);

    const handleFilterClick = useCallback(
      (filter: LocalFiltersState['stockStatus']) => {
        setLocalFilters(prev => ({ ...prev, stockStatus: filter }));
      },
      [setLocalFilters]
    );

    return (
      <main ref={mainContentRef} className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-8">
        <motion.div
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 p-8 shadow-xl"
        >
          <div className="relative z-10">
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Inventory Status</h1>
            <p className="text-emerald-100 text-lg">An interactive, high-level overview of your inventory health.</p>
          </div>
        </motion.div>

        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                  ))}
              </div>
              <div className="md:col-span-2 h-96 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </motion.div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8">
            <motion.div
              ref={kpiRef}
              initial="hidden"
              animate={isKpiInView ? 'visible' : 'hidden'}
              variants={containerVariants}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <motion.div className="md:col-span-1" variants={containerVariants}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {userRole === 'Admin' && (
                    <KpiCard
                      label="On Hand Stock Value"
                      value={kpiData.totalOnhandValue}
                      formatter={currencyFormatter}
                      icon={<BanknotesIcon />}
                      colorClass={{ bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' }}
                      description="Based on average FOB cost"
                    />
                  )}
                  <KpiCard
                    label="Units On Hand"
                    value={kpiData.totalOnhandUnits}
                    icon={<CubeIcon />}
                    colorClass={{ bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' }}
                    description="Serialized & available stock"
                  />
                  <KpiCard
                    label="Units On The Way"
                    value={kpiData.totalOtwUnits}
                    icon={<TruckIcon />}
                    colorClass={{ bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' }}
                    description={userRole === 'Admin' ? `${currencyFormatter(kpiData.totalOtwValue)} FOB value` : ''}
                    onClick={() => handleFilterClick('otw')}
                    isActive={localFilters.stockStatus === 'otw'}
                  />
                  <KpiCard
                    label="Unaccounted Stock"
                    value={kpiData.unaccountedUnits}
                    icon={<ExclamationTriangleIcon />}
                    colorClass={{ bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' }}
                    description="Needs serialization."
                  />
                </div>
              </motion.div>
              <motion.div variants={itemVariants} className="md:col-span-2">
                <ChartCard title="Inventory Health Overview" description="Click a segment to filter." className="h-full">
                  <div className="h-full">
                    <InventoryStatusChart
                      data={inventoryData}
                      onFilterChange={(f) => handleFilterClick(f as LocalFiltersState['stockStatus'])}
                      activeFilter={localFilters.stockStatus}
                    />
                  </div>
                </ChartCard>
              </motion.div>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card className="p-4 sm:p-6">
                <InventoryTable data={filteredInventoryData} onPsrefLookup={onPsrefLookup} userRole={userRole} />
              </Card>
            </motion.div>
          </motion.div>
        )}

        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={scrollToTop}
              className="fixed bottom-8 right-8 z-50 p-4 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-2xl hover:shadow-emerald-500/50"
              aria-label="Scroll to top of page"
            >
              <ArrowUpIcon className="h-6 w-6" />
            </motion.button>
          )}
        </AnimatePresence>
      </main>
    );
  }
);

InventoryDashboard.displayName = 'InventoryDashboard';

export default InventoryDashboard;