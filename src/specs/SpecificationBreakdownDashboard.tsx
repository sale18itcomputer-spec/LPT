import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
// FIX: Import LocalFiltersState
import { Order, Sale, SpecificationBreakdown, LocalFiltersState } from '../../types';
import Card from '../ui/Card';
import ChartCard from '../ui/ChartCard';
import SpecDistributionChart from './SpecDistributionChart';
import { CpuChipIcon, XMarkIcon, BanknotesIcon, CubeIcon, ChartBarIcon } from '../ui/Icons';
import SegmentedControl from '../ui/SegmentedControl';
import CpuSalesAndStockTable from './CpuSalesAndStockTable';
import FilteredModelsTable from './FilteredModelsTable';
import CpuInventoryIntelligenceTable from './CpuInventoryIntelligenceTable';
import RangeSlider from '../ui/RangeSlider';
import { getISOWeek } from '../../utils/dateHelpers';
import MultiSelect from '../ui/MultiSelect';

type SpecKey = keyof SpecificationBreakdown;

const containerVariants: Variants = { 
  hidden: { opacity: 0 }, 
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } } 
};
const itemVariants: Variants = { 
  hidden: { y: 20, opacity: 0 }, 
  visible: { y: 0, opacity: 1, transition: { ease: 'easeOut', duration: 0.5 } } 
};

// --- Sub-component: Active Filter Badges ---
const ActiveFilterBadges: React.FC<{
    filters: Partial<SpecificationBreakdown>;
    onClear: (key: SpecKey) => void;
    onClearAll: () => void;
}> = ({ filters, onClear, onClearAll }) => {
    const active = Object.entries(filters);
    if (active.length === 0) return null;

    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-3 bg-gray-50 dark:bg-dark-secondary-bg/50 rounded-lg border border-border-color dark:border-dark-border-color flex items-center flex-wrap gap-2">
            <span className="text-sm font-semibold mr-2 text-primary-text dark:text-dark-primary-text">Active Filters:</span>
            <AnimatePresence>
                {active.map(([key, value]) => (
                    <motion.div key={key} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-highlight-hover dark:bg-dark-highlight-hover text-highlight text-xs font-semibold rounded-full">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}: {value}</span>
                            <button onClick={() => onClear(key as SpecKey)} className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><XMarkIcon className="h-3.5 w-3.5" /></button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
            <button onClick={onClearAll} className="ml-auto text-xs font-semibold text-secondary-text hover:underline">Clear All</button>
        </motion.div>
    );
};


// --- Main Dashboard Component ---
interface SpecificationBreakdownDashboardProps {
    localFilters: LocalFiltersState;
    setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const SpecificationBreakdownDashboard: React.FC<SpecificationBreakdownDashboardProps> = ({ localFilters, setLocalFilters }) => {
    const { allOrders, allSales, salesMetricsByMtm, inventoryData } = useData();
    const [activeFilters, setActiveFilters] = useState<Partial<SpecificationBreakdown>>({});
    const [dataView, setDataView] = useState<'units' | 'revenue' | 'count'>('units');

    const allItemsWithSpecs = useMemo(() => {
        const itemsByMtm = new Map<string, { parsedSpecification: SpecificationBreakdown, mtm: string, modelName: string }>();
        const processItem = (item: Order | Sale) => {
            const mtm = 'mtm' in item ? item.mtm : item.lenovoProductNumber;
            const modelName = item.modelName;
            if (item.parsedSpecification && Object.keys(item.parsedSpecification).length > 0 && !itemsByMtm.has(mtm)) {
                itemsByMtm.set(mtm, { parsedSpecification: item.parsedSpecification, mtm, modelName });
            }
        };
        allOrders.forEach(processItem);
        allSales.forEach(processItem);
        return Array.from(itemsByMtm.values());
    }, [allOrders, allSales]);

    const handleFilterChange = useCallback((key: SpecKey, value: string) => {
        setActiveFilters(prev => {
            const newFilters = { ...prev };
            if (newFilters[key] === value) delete newFilters[key];
            else newFilters[key] = value;
            return newFilters;
        });
    }, []);

    const clearFilter = useCallback((key: SpecKey) => {
        setActiveFilters(prev => { const newFilters = { ...prev }; delete newFilters[key]; return newFilters; });
    }, []);

    const clearAllFilters = useCallback(() => setActiveFilters({}), []);

    const filteredItems = useMemo(() => {
        const filters = Object.entries(activeFilters);
        if (filters.length === 0) return allItemsWithSpecs;
        return allItemsWithSpecs.filter(item => 
            filters.every(([key, value]) => item.parsedSpecification[key as SpecKey] === value)
        );
    }, [allItemsWithSpecs, activeFilters]);

    const aggregateSpecData = useCallback((items: typeof allItemsWithSpecs, key: SpecKey) => {
        if (dataView === 'count') {
            const counts = items.reduce((acc: Record<string, number>, item) => {
                const value = item.parsedSpecification[key];
                if (value) acc[value] = (acc[value] || 0) + 1;
                return acc;
            }, {});
            return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        }

        const filteredMtmSet = new Set(items.map(i => i.mtm));
        const mtmToSpecValueMap = new Map<string, string>();
        items.forEach(item => {
            const specValue = item.parsedSpecification[key];
            if (specValue) mtmToSpecValueMap.set(item.mtm, specValue);
        });

        const relevantSales = allSales.filter(sale => filteredMtmSet.has(sale.lenovoProductNumber));

        const aggregation = relevantSales.reduce((acc: Record<string, number>, sale: Sale) => {
            const specValue = mtmToSpecValueMap.get(sale.lenovoProductNumber);
            if (specValue) {
                const metric = dataView === 'units' ? sale.quantity : sale.totalRevenue;
                acc[specValue] = (acc[specValue] || 0) + metric;
            }
            return acc;
        }, {});

        return Object.entries(aggregation).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    }, [dataView, allSales]);

    const chartConfigs: { title: string; data: any[]; filterKey: SpecKey; chartType?: 'pie' | 'bar' }[] = [
        { title: 'CPU Family', data: useMemo(() => aggregateSpecData(filteredItems, 'cpuFamily'), [filteredItems, aggregateSpecData]), filterKey: 'cpuFamily' },
        { title: 'RAM Size', data: useMemo(() => aggregateSpecData(filteredItems, 'ramSize'), [filteredItems, aggregateSpecData]), filterKey: 'ramSize' },
        { title: 'Storage Capacity', data: useMemo(() => aggregateSpecData(filteredItems, 'storageSize'), [filteredItems, aggregateSpecData]), filterKey: 'storageSize' },
        { title: 'GPU Type', data: useMemo(() => aggregateSpecData(filteredItems, 'gpu'), [filteredItems, aggregateSpecData]), filterKey: 'gpu', chartType: 'pie' },
        { title: 'Screen Type', data: useMemo(() => aggregateSpecData(filteredItems, 'screenType'), [filteredItems, aggregateSpecData]), filterKey: 'screenType', chartType: 'pie' },
        { title: 'Operating System', data: useMemo(() => aggregateSpecData(filteredItems, 'os'), [filteredItems, aggregateSpecData]), filterKey: 'os', chartType: 'pie' },
    ];
    
    return (
        <motion.main 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-8"
        >
             <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 to-teal-600 p-8 shadow-xl">
                 <div className="relative z-10">
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Specification Analysis</h1>
                    <p className="text-sky-100 text-lg">Interactively explore your product mix by hardware and software specifications.</p>
                </div>
            </motion.div>
                
            <motion.div variants={itemVariants}>
                <Card className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-secondary-text">Data View</h3>
                         <SegmentedControl
                            label="Data View"
                            value={dataView}
                            onChange={(val) => setDataView(val as 'count' | 'units' | 'revenue')}
                            options={[
                                { label: 'By Units Sold', value: 'units', icon: CubeIcon },
                                { label: 'By Revenue', value: 'revenue', icon: BanknotesIcon },
                                { label: 'By Model Count', value: 'count', icon: ChartBarIcon },
                            ]}
                        />
                    </div>
                </Card>
            </motion.div>

            <ActiveFilterBadges filters={activeFilters} onClear={clearFilter} onClearAll={clearAllFilters} />

            <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {chartConfigs.map(config => (
                    <motion.div key={config.title} variants={itemVariants}>
                        <ChartCard title={config.title} className="h-[450px]">
                            <SpecDistributionChart
                                data={config.data}
                                filterKey={config.filterKey}
                                onFilterClick={handleFilterChange}
                                activeValue={activeFilters[config.filterKey] || null}
                                dataView={dataView}
                                chartType={config.chartType}
                            />
                        </ChartCard>
                    </motion.div>
                ))}
            </motion.div>

            <motion.div variants={itemVariants}>
                <CpuSalesAndStockTable
                    year={localFilters.cpuSalesYear}
                    startWeek={localFilters.cpuSalesStartWeek}
                    endWeek={localFilters.cpuSalesEndWeek}
                    mtmPrefix={localFilters.cpuSalesMtmPrefix}
                    cpuSalesCpuFilter={localFilters.cpuSalesCpuFilter}
                    cpuSalesMtmFilter={localFilters.cpuSalesMtmFilter}
                />
            </motion.div>
            
            <motion.div variants={itemVariants}>
                <CpuInventoryIntelligenceTable
                    year={localFilters.cpuSalesYear}
                    startWeek={localFilters.cpuSalesStartWeek}
                    endWeek={localFilters.cpuSalesEndWeek}
                    mtmPrefix={localFilters.cpuSalesMtmPrefix}
                    cpuSalesCpuFilter={localFilters.cpuSalesCpuFilter}
                    cpuSalesMtmFilter={localFilters.cpuSalesMtmFilter}
                />
            </motion.div>
            
            <motion.div variants={itemVariants}>
                <FilteredModelsTable items={filteredItems} salesMetrics={salesMetricsByMtm} />
            </motion.div>
        </motion.main>
    );
};

export default SpecificationBreakdownDashboard;
