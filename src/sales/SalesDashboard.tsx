

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, type Variants, AnimatePresence, useInView } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";

import { useData } from '../../contexts/DataContext';
import { useToast } from '../../contexts/ToastContext';
import Card from '../ui/Card';
import RevenueTrendChart from './charts/RevenueTrendChart';
import TopBuyersChart from './charts/TopBuyersChart';
import TopSellingModelsChart from './charts/TopSellingModelsChart';
import SalesBySegmentChart from './charts/SalesBySegmentChart';
import SalesTable from './SalesTable';
import type { DashboardType, SalesKpiData, ViewType, LocalFiltersState } from '../../types';
import SegmentedControl from '../ui/SegmentedControl';
import SalesKpiCards from './SalesKpiCards';
import ChartCard from '../ui/ChartCard';
import { SparklesIcon, ChartBarIcon, MapPinIcon, ArrowUpIcon, FunnelIcon, XMarkIcon } from '../ui/Icons';
import TopBuyersMap from './charts/TopBuyersMap';
import SalesBreakdownByPeriod from './SalesBreakdownByPeriod';
import { INITIAL_LOCAL_FILTERS } from '../../constants';

// Props definition
interface SalesDashboardProps {
  onNavigateAndFilter: (view: ViewType, filters: Partial<LocalFiltersState>) => void;
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
  aiFilteredBuyers: string[] | null;
}

// Animation variants
const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } } };
const itemVariants: Variants = { hidden: { y: 30, opacity: 0, scale: 0.97 }, visible: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } } };
const headerVariants: Variants = { hidden: { y: -20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } } };
const filterBadgeVariants: Variants = { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } }, exit: { scale: 0, opacity: 0, transition: { duration: 0.2 } } };

// Type definitions for component state
type TopModelsSortBy = 'revenue' | 'units';
type TopBuyersSortBy = 'revenue' | 'units';
type ChartView = 'chart' | 'map';

const SalesDashboard: React.FC<SalesDashboardProps> = ({ onNavigateAndFilter, localFilters, setLocalFilters, aiFilteredBuyers }) => {
    // Hooks
    const { allSales, reconciledSales, profitabilityKpiData } = useData();
    const { showToast } = useToast();
    const mainContentRef = useRef<HTMLDivElement>(null);
    const kpiRef = useRef<HTMLDivElement>(null);
    const isKpiInView = useInView(kpiRef, { once: true, margin: "-100px" });

    // Component State
    const [topModelsSortBy, setTopModelsSortBy] = useState<TopModelsSortBy>('revenue');
    const [topBuyersSortBy, setTopBuyersSortBy] = useState<TopBuyersSortBy>('revenue');
    const [chartView, setChartView] = useState<ChartView>('chart');
    const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
    const [selectedBuyer, setSelectedBuyer] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    
    // Effects
    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    // Data Processing & Memos
    const locallyFilteredSales = useMemo(() => {
        const { salesSearchTerm, salesSegment, salesBuyer, salesStartDate, salesEndDate, salesRevenueMin, salesRevenueMax } = localFilters;
        
        let salesToFilter = [...allSales];

        if (aiFilteredBuyers !== null) {
            const buyerSet = new Set(aiFilteredBuyers);
            salesToFilter = salesToFilter.filter(s => buyerSet.has(s.buyerName));
        } else if (salesBuyer.length > 0) {
            const buyerSet = new Set(salesBuyer);
            salesToFilter = salesToFilter.filter(s => buyerSet.has(s.buyerName));
        }

        return salesToFilter.filter(sale => {
            if (salesSegment.length > 0 && !salesSegment.includes(sale.segment)) return false;
            
            if (salesStartDate || salesEndDate) {
                const start = salesStartDate ? new Date(salesStartDate).getTime() : -Infinity;
                const end = salesEndDate ? new Date(salesEndDate).getTime() + 86400000 - 1 : Infinity;
                const saleDate = sale.invoiceDate ? new Date(sale.invoiceDate).getTime() : null;
                if (!saleDate || saleDate < start || saleDate > end) return false;
            }
            
            if (salesRevenueMin !== null && sale.totalRevenue < salesRevenueMin) return false;
            if (salesRevenueMax !== null && sale.totalRevenue > salesRevenueMax) return false;
            
            if (salesSearchTerm) {
                const lowercasedTerm = salesSearchTerm.toLowerCase();
                return sale.invoiceNumber.toLowerCase().includes(lowercasedTerm) ||
                       sale.lenovoProductNumber.toLowerCase().includes(lowercasedTerm) ||
                       sale.buyerName.toLowerCase().includes(lowercasedTerm) ||
                       sale.serialNumber.toLowerCase().includes(lowercasedTerm);
            }
            
            return true;
        });
    }, [allSales, localFilters, aiFilteredBuyers]);

    const { kpiData, profitByMtm } = useMemo(() => {
        if (locallyFilteredSales.length === 0) return { kpiData: null, profitByMtm: new Map() };

        const serialsInFilter = new Set(locallyFilteredSales.map(s => s.serialNumber));
        const relevantReconciled = reconciledSales.filter(rs => serialsInFilter.has(rs.serialNumber));
        
        const mtmProfitMap = new Map<string, { totalProfit: number; totalRevenue: number }>();

        const { totalRevenue, totalUnits, totalProfit } = relevantReconciled.reduce((acc, sale) => {
            acc.totalRevenue += sale.unitSalePrice;
            acc.totalUnits += 1; // Each reconciled sale is one unit
            
            if (sale.unitProfit !== null) {
                 acc.totalProfit += sale.unitProfit;
                 const mtm = sale.mtm;
                 const current = mtmProfitMap.get(mtm) || { totalProfit: 0, totalRevenue: 0 };
                 current.totalProfit += sale.unitProfit;
                 current.totalRevenue += sale.unitSalePrice;
                 mtmProfitMap.set(mtm, current);
            }
            return acc;
        }, { totalRevenue: 0, totalUnits: 0, totalProfit: 0 });

        const uniqueInvoices = new Set(locallyFilteredSales.map(s => s.invoiceNumber));

        return {
            kpiData: {
                totalRevenue,
                totalUnits,
                invoiceCount: uniqueInvoices.size,
                averageSalePricePerUnit: totalUnits > 0 ? totalRevenue / totalUnits : 0,
                averageRevenuePerInvoice: uniqueInvoices.size > 0 ? totalRevenue / uniqueInvoices.size : 0,
                uniqueBuyersCount: new Set(locallyFilteredSales.map(s => s.buyerId)).size,
                totalProfit,
                averageGrossMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
            },
            profitByMtm: mtmProfitMap
        };
    }, [locallyFilteredSales, reconciledSales]);

    const trendData = useMemo(() => {
        const aggregated = locallyFilteredSales.reduce((acc, sale) => {
            if (!sale.invoiceDate) return acc;
            const date = new Date(sale.invoiceDate);
            const year = date.getUTCFullYear();
            const month = date.getUTCMonth();
            const key = `${year}-${String(month + 1).padStart(2, '0')}`;
            const label = `${date.toLocaleString('en-US', { timeZone: 'UTC', month: 'short' })} '${String(year).slice(2)}`;
            if (!acc[key]) acc[key] = { sortKey: key, label, value: 0 };
            acc[key].value += sale.totalRevenue;
            return acc;
        }, {} as Record<string, { sortKey: string, label: string, value: number }>);
        return Object.values(aggregated).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }, [locallyFilteredSales]);

    const topBuyersData = useMemo(() => {
        const aggregated = locallyFilteredSales.reduce((acc, sale) => {
            if (sale.buyerName === 'N/A') return acc;
            if (!acc[sale.buyerName]) acc[sale.buyerName] = { revenue: 0, units: 0 };
            acc[sale.buyerName].revenue += sale.totalRevenue;
            acc[sale.buyerName].units += sale.quantity;
            return acc;
        }, {} as Record<string, { revenue: number, units: number }>);
        return Object.entries(aggregated).map(([name, { revenue, units }]) => ({
            name, value: topBuyersSortBy === 'revenue' ? revenue : units, revenue, units
        })).sort((a, b) => b.value - a.value);
    }, [locallyFilteredSales, topBuyersSortBy]);

    const topModelsData = useMemo(() => {
        const aggregated = locallyFilteredSales.reduce((acc, sale) => {
            if (sale.lenovoProductNumber === 'N/A') return acc;
            if (!acc[sale.lenovoProductNumber]) acc[sale.lenovoProductNumber] = { revenue: 0, units: 0, modelName: sale.modelName };
            acc[sale.lenovoProductNumber].revenue += sale.totalRevenue;
            acc[sale.lenovoProductNumber].units += sale.quantity;
            return acc;
        }, {} as Record<string, { revenue: number; units: number; modelName: string; }>);
        return Object.entries(aggregated).map(([name, { revenue, units, modelName }]) => ({ name, value: topModelsSortBy === 'revenue' ? revenue : units, revenue, units, modelName })).sort((a, b) => b.value - a.value);
    }, [locallyFilteredSales, topModelsSortBy]);

    const handleGenerateAnalysis = useCallback(async () => {
        setIsLoadingAnalysis(true);
        setAnalysis(null);
        try {
            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Analyze this sales data trend: ${JSON.stringify(trendData)}. Provide a one-sentence, sharp insight about the trend. For example: "Strong Q4 growth was driven by seasonal demand, but a slight dip in January suggests a need for post-holiday promotions."`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setAnalysis(response.text);
        } catch (err) {
            showToast(err instanceof Error ? `AI analysis failed: ${err.message}` : 'An AI analysis error occurred.', 'error');
        } finally {
            setIsLoadingAnalysis(false);
        }
    }, [trendData, showToast]);
    
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (localFilters.salesSearchTerm) count++;
        if (localFilters.salesSegment.length > 0) count++;
        if (localFilters.salesBuyer.length > 0 || aiFilteredBuyers?.length) count++;
        if (localFilters.salesDateRangePreset !== 'thisYear' && localFilters.salesDateRangePreset !== 'all') count++;
        if (localFilters.salesRevenueMin !== null || localFilters.salesRevenueMax !== null) count++;
        if (localFilters.salesBuyerRegion) count++;
        return count;
    }, [localFilters, aiFilteredBuyers]);

    const clearAllFilters = useCallback(() => {
        setLocalFilters(prev => ({
            ...prev,
            salesSearchTerm: '',
            salesSegment: [],
            salesBuyer: [],
            salesDateRangePreset: 'thisYear',
            salesYear: 'all',
            salesQuarter: 'all',
            salesStartDate: INITIAL_LOCAL_FILTERS.salesStartDate,
            salesEndDate: INITIAL_LOCAL_FILTERS.salesEndDate,
            salesRevenueMin: null,
            salesRevenueMax: null,
            salesBuyerRegion: '',
        }));
        showToast('All sales filters cleared', 'success');
    }, [setLocalFilters, showToast]);

    const handleSegmentSelect = useCallback((segment: string | null) => {
        setSelectedSegment(segment);
        onNavigateAndFilter('promotions', { promotionsSegment: segment });
    }, [onNavigateAndFilter]);

    return (
        <main ref={mainContentRef} className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-8">
            <motion.div variants={headerVariants} initial="hidden" animate="visible" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-600 to-emerald-600 dark:from-blue-700 dark:via-cyan-700 dark:to-emerald-700 p-8 shadow-xl">
                <div className="relative z-10">
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Sales Analytics</h1>
                    <p className="text-cyan-100 text-lg mb-4">Analyze revenue, top products, and key customer segments.</p>
                    {activeFiltersCount > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/25 backdrop-blur-sm border border-white/40"><FunnelIcon className="h-4 w-4 text-white" /><span className="text-sm font-semibold text-white">{activeFiltersCount} Active Filter(s)</span></div>
                            <AnimatePresence mode="popLayout">{localFilters.salesSegment.length > 0 && (<motion.button key="segment-filter" variants={filterBadgeVariants} initial="initial" animate="animate" exit="exit" onClick={() => setLocalFilters(p => ({...p, salesSegment: []}))} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-cyan-700 text-sm font-medium transition-colors"><span>Segment: {localFilters.salesSegment[0]}</span><XMarkIcon className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" /></motion.button>)}</AnimatePresence>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={clearAllFilters} className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 border border-white/40 text-white text-sm font-medium transition-colors">Clear All</motion.button>
                        </motion.div>
                    )}
                </div>
            </motion.div>

            <motion.div ref={kpiRef} initial="hidden" animate={isKpiInView ? "visible" : "hidden"} variants={containerVariants}>
                {kpiData && <SalesKpiCards kpiData={kpiData} />}
            </motion.div>

            <motion.div initial="hidden" animate="visible" variants={containerVariants}>
                <ChartCard
                    title="Revenue Trend"
                    description={`Revenue by invoice date (${locallyFilteredSales.length.toLocaleString()} line items)`}
                    controls={<button onClick={handleGenerateAnalysis} disabled={isLoadingAnalysis} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-highlight-hover text-highlight hover:bg-indigo-200"><SparklesIcon className="h-4 w-4" />{isLoadingAnalysis ? 'Analyzing...' : 'AI Analysis'}</button>}
                    className="h-[550px]"
                >
                    <RevenueTrendChart trendData={trendData} granularity="monthly" analysis={analysis} isLoadingAnalysis={isLoadingAnalysis} onClearAnalysis={() => setAnalysis(null)} onPeriodSelect={()=>{}} />
                </ChartCard>
            </motion.div>

            <motion.div initial="hidden" animate="visible" variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div variants={itemVariants}>
                    <ChartCard title="Sales by Segment" description="Revenue distribution across customer segments. Click to see promotions." className="h-[400px]">
                        <SalesBySegmentChart data={locallyFilteredSales} onSegmentSelect={handleSegmentSelect} selectedSegment={localFilters.promotionsSegment} itemCount={10} />
                    </ChartCard>
                </motion.div>
                <motion.div variants={itemVariants}>
                    <SalesBreakdownByPeriod sales={locallyFilteredSales} />
                </motion.div>
            </motion.div>

            <motion.div initial="hidden" animate="visible" variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div variants={itemVariants}>
                    <ChartCard
                        title="Top Buyers"
                        description="Customers ranked by selected metric."
                        controls={<SegmentedControl value={chartView} onChange={(v) => setChartView(v as ChartView)} options={[{ label: 'Chart', value: 'chart', icon: ChartBarIcon }, { label: 'Map', value: 'map', icon: MapPinIcon }]} label="View type" />}
                    >
                         <AnimatePresence mode="wait">
                            <motion.div key={chartView} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {chartView === 'chart' ? (
                                    <TopBuyersChart data={topBuyersData} sortBy={topBuyersSortBy} onBuyerSelect={setSelectedBuyer} selectedBuyer={selectedBuyer} itemCount={10}/>
                                ) : (
                                    <TopBuyersMap salesData={topBuyersData} locations={{}} isLoading={false} onBuyerSelect={setSelectedBuyer} selectedBuyer={selectedBuyer} />
                                )}
                            </motion.div>
                         </AnimatePresence>
                    </ChartCard>
                </motion.div>
                <motion.div variants={itemVariants}>
                    <ChartCard title="Top Selling Models" description="Products ranked by selected metric.">
                        <TopSellingModelsChart data={topModelsData} sortBy={topModelsSortBy} onModelSelect={setSelectedModel} selectedModel={selectedModel} itemCount={10} profitByMtm={profitByMtm} />
                    </ChartCard>
                </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} initial="hidden" animate="visible"><SalesTable sales={locallyFilteredSales} /></motion.div>

            <AnimatePresence>
                {showScrollTop && (<motion.button initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={scrollToTop} className="fixed bottom-8 right-8 z-50 p-4 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-2xl hover:shadow-blue-500/50" title="Scroll to top"><ArrowUpIcon className="h-6 w-6" /></motion.button>)}
            </AnimatePresence>
        </main>
    );
};

export default SalesDashboard;
