
import React, { useMemo, useState, useCallback } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import Card from '../ui/Card';
import RevenueByQuarterChart from './charts/RevenueByQuarterChart';
import TopBuyersChart from './charts/TopBuyersChart';
import TopSellingModelsChart from './charts/TopSellingModelsChart';
import SalesBySegmentChart from './charts/SalesBySegmentChart';
import SalesTable from './SalesTable';
import type { DashboardType, SalesKpiData, ViewType, LocalFiltersState } from '../../types';
import SegmentedControl from '../ui/SegmentedControl';
import SalesKpiCards from './SalesKpiCards';
import ChartCard from '../ui/ChartCard';

interface SalesDashboardProps {
  onNavigateAndFilter: (view: ViewType, filters: Partial<LocalFiltersState>) => void;
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

type TopModelsSortBy = 'revenue' | 'units';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};


const SalesDashboard: React.FC<SalesDashboardProps> = ({ onNavigateAndFilter, localFilters, setLocalFilters }) => {
    const { allSales, reconciledSales } = useData();
    const [topModelsSortBy, setTopModelsSortBy] = useState<TopModelsSortBy>('revenue');
    const [timeSeriesGranularity, setTimeSeriesGranularity] = useState<'monthly' | 'quarterly'>('monthly');
    // FIX: Define a constant for the number of items to show in top performer charts.
    const TOP_PERFORMERS_COUNT = 8;

    const locallyFilteredSales = useMemo(() => {
        const {
            salesSearchTerm,
            salesProductLine,
            salesSegment,
            salesBuyer,
            salesStartDate,
            salesEndDate
        } = localFilters;

        let tempSales = allSales;
        
        if (salesStartDate || salesEndDate) {
            const start = salesStartDate ? new Date(salesStartDate).getTime() : -Infinity;
            const end = salesEndDate ? new Date(salesEndDate).getTime() + 86400000 - 1 : Infinity; // inclusive
            tempSales = tempSales.filter(s => {
                if (!s.invoiceDate) return false;
                const saleDate = new Date(s.invoiceDate).getTime();
                return saleDate >= start && saleDate <= end;
            });
        }

        return tempSales.filter(sale => {
            if (salesProductLine.length > 0 && !salesProductLine.includes(sale.productLine)) return false;
            if (salesSegment.length > 0 && !salesSegment.includes(sale.segment)) return false;
            if (salesBuyer.length > 0 && !salesBuyer.includes(sale.buyerName)) return false;
            
            if (salesSearchTerm) {
                const lower = salesSearchTerm.toLowerCase();
                return sale.invoiceNumber.toLowerCase().includes(lower) ||
                       sale.lenovoProductNumber.toLowerCase().includes(lower) ||
                       sale.modelName.toLowerCase().includes(lower) ||
                       sale.buyerName.toLowerCase().includes(lower) ||
                       sale.serialNumber.toLowerCase().includes(lower);
            }
            return true;
        });
    }, [allSales, localFilters]);


    const salesKpiData = useMemo((): SalesKpiData | undefined => {
        if (locallyFilteredSales.length === 0) return undefined;

        const uniqueInvoices = new Set(locallyFilteredSales.map(s => s.invoiceNumber));
        const filteredSaleSerials = new Set(locallyFilteredSales.map(s => s.serialNumber));

        const kpi = locallyFilteredSales.reduce((acc, sale) => {
            acc.totalRevenue += sale.totalRevenue;
            acc.totalUnits += sale.quantity;
            return acc;
        }, { totalRevenue: 0, totalUnits: 0, invoiceCount: 0, averageSalePricePerUnit: 0, averageRevenuePerInvoice: 0, uniqueBuyersCount: 0, averageGrossMargin: 0, totalProfit: 0 });

        kpi.invoiceCount = uniqueInvoices.size;
        kpi.averageSalePricePerUnit = kpi.totalUnits > 0 ? kpi.totalRevenue / kpi.totalUnits : 0;
        kpi.averageRevenuePerInvoice = kpi.invoiceCount > 0 ? kpi.totalRevenue / kpi.invoiceCount : 0;
        kpi.uniqueBuyersCount = new Set(locallyFilteredSales.map(s => s.buyerId)).size;

        const filteredReconciled = reconciledSales.filter(rs => filteredSaleSerials.has(rs.serialNumber));
        const totalProfit = filteredReconciled.reduce((sum, sale) => sum + (sale.unitProfit || 0), 0);
        kpi.totalProfit = totalProfit;
        kpi.averageGrossMargin = kpi.totalRevenue > 0 ? (totalProfit / kpi.totalRevenue) * 100 : 0;

        return kpi;
    }, [locallyFilteredSales, reconciledSales]);
    
    const handleNavigate = (target: DashboardType, searchTerm: string) => {
        onNavigateAndFilter(target, { [target === 'orders' ? 'orderSearchTerm' : 'salesSearchTerm']: searchTerm });
    };

    // FIX: Added handler for segment selection to filter data.
    const handleSegmentSelect = useCallback((segment: string) => {
        const isAlreadySelected = localFilters.salesSegment.length === 1 && localFilters.salesSegment[0] === segment;
        setLocalFilters(prev => ({
            ...prev,
            salesSegment: isAlreadySelected ? [] : [segment],
        }));
    }, [localFilters.salesSegment, setLocalFilters]);

    // FIX: Added handler for buyer selection to filter data.
    const handleBuyerSelect = useCallback((buyer: string) => {
        const isAlreadySelected = localFilters.salesBuyer.length === 1 && localFilters.salesBuyer[0] === buyer;
        setLocalFilters(prev => ({
            ...prev,
            salesBuyer: isAlreadySelected ? [] : [buyer],
        }));
    }, [localFilters.salesBuyer, setLocalFilters]);

    // FIX: Added handler for model selection to filter data.
    const handleModelSelect = useCallback((mtm: string) => {
        const isAlreadySelected = localFilters.salesSearchTerm === mtm;
         setLocalFilters(prev => ({
            ...prev,
            salesSearchTerm: isAlreadySelected ? '' : mtm,
        }));
    }, [localFilters.salesSearchTerm, setLocalFilters]);

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
            <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0 }}>
                <h1 className="text-3xl font-bold tracking-tight text-primary-text dark:text-dark-primary-text">Sales Analytics</h1>
                <p className="text-secondary-text dark:text-dark-secondary-text mt-1">Deep dive into sales performance, revenue trends, and top performers.</p>
            </motion.div>

            {salesKpiData && (
                <motion.div initial="hidden" animate="visible" variants={containerVariants}>
                    <SalesKpiCards kpiData={salesKpiData} />
                </motion.div>
            )}

             <motion.div 
                className="grid grid-cols-1 xl:grid-cols-5 gap-6"
                initial="hidden" animate="visible" variants={containerVariants}
            >
                <motion.div className="xl:col-span-3" variants={itemVariants}>
                    {/* FIX: Pass granularity prop to RevenueByQuarterChart and add controls to change it. */}
                    <ChartCard
                        title="Revenue Trend"
                        description={`${timeSeriesGranularity === 'monthly' ? 'Monthly' : 'Quarterly'} value of invoiced sales for the selected period.`}
                        controls={
                            <SegmentedControl
                                value={timeSeriesGranularity}
                                onChange={(val) => setTimeSeriesGranularity(val as 'monthly' | 'quarterly')}
                                options={[{ label: 'Monthly', value: 'monthly' }, { label: 'Quarterly', value: 'quarterly' }]}
                                label="Time series granularity"
                            />
                        }
                        className="h-[400px]"
                    >
                        <RevenueByQuarterChart data={locallyFilteredSales} granularity={timeSeriesGranularity} />
                    </ChartCard>
                </motion.div>
                 <motion.div className="xl:col-span-2" variants={itemVariants}>
                    <Card title="Revenue by Segment" description="Breakdown of total sales revenue by customer segment. Click a segment to filter.">
                        {/* FIX: Passed onSegmentSelect and selectedSegment props to SalesBySegmentChart */}
                        <SalesBySegmentChart 
                            data={locallyFilteredSales} 
                            onSegmentSelect={handleSegmentSelect}
                            selectedSegment={localFilters.salesSegment.length === 1 ? localFilters.salesSegment[0] : null}
                            itemCount={TOP_PERFORMERS_COUNT}
                        />
                    </Card>
                </motion.div>
            </motion.div>

            <motion.div 
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                initial="hidden" animate="visible" variants={containerVariants}
            >
                <motion.div variants={itemVariants}>
                    <Card 
                        title="Top Selling Models" 
                        description={`by total ${topModelsSortBy}. Click a model to filter.`}
                        controls={
                            <SegmentedControl
                                value={topModelsSortBy}
                                onChange={(val) => setTopModelsSortBy(val as TopModelsSortBy)}
                                options={[{ label: 'Revenue', value: 'revenue' }, { label: 'Units', value: 'units' }]}
                                label="Sort top models"
                            />
                        }
                    >
                        {/* FIX: Passed onModelSelect and selectedModel props to TopSellingModelsChart */}
                        <TopSellingModelsChart 
                            data={locallyFilteredSales} 
                            sortBy={topModelsSortBy} 
                            onModelSelect={handleModelSelect}
                            selectedModel={localFilters.salesSearchTerm}
                            itemCount={TOP_PERFORMERS_COUNT}
                        />
                    </Card>
                </motion.div>
                <motion.div variants={itemVariants}>
                     <Card title="Top Buyers" description="by total revenue. Click a buyer to filter.">
                        {/* FIX: Passed onBuyerSelect and selectedBuyer props to TopBuyersChart */}
                        <TopBuyersChart 
                            data={locallyFilteredSales} 
                            onBuyerSelect={handleBuyerSelect}
                            selectedBuyer={localFilters.salesBuyer.length === 1 ? localFilters.salesBuyer[0] : null}
                            itemCount={TOP_PERFORMERS_COUNT}
                        />
                    </Card>
                </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.5 }}>
                <SalesTable sales={locallyFilteredSales} onNavigateAndFilter={handleNavigate} />
            </motion.div>
        </main>
    );
};

export default SalesDashboard;
