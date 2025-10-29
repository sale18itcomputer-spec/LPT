import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, type Variants, AnimatePresence, useInView } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";

import { useData } from '../../contexts/DataContext';
import { useToast } from '../../contexts/ToastContext';
import RevenueTrendChart from './RevenueTrendChart';
import TopBuyersChart from './TopBuyersChart';
import TopSellingModelsChart from './TopSellingModelsChart';
import SalesBySegmentChart from './SalesBySegmentChart';
import SalesTable from './SalesTable';
import type { DashboardType, ViewType, LocalFiltersState, Sale } from '../../types';
import SegmentedControl from '../ui/SegmentedControl';
import SalesKpiCards from './SalesKpiCards';
import ChartCard from '../ui/ChartCard';
import { SparklesIcon, ChartBarIcon, ArrowUpIcon, FunnelIcon, XMarkIcon } from '../ui/Icons';
import SalesBreakdownByPeriod from './SalesBreakdownByPeriod';
import { INITIAL_LOCAL_FILTERS } from '../../constants';
import Card from '../ui/Card';

// Props
interface SalesDashboardProps {
  onNavigateAndFilter: (view: ViewType, filters: Partial<LocalFiltersState>) => void;
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
  aiFilteredBuyers: string[] | null;
}

// Animation variants
const containerVariants: Variants = { 
  hidden: { opacity: 0 }, 
  visible: { 
    opacity: 1, 
    transition: { 
      staggerChildren: 0.08, 
      delayChildren: 0.05 
    } 
  } 
};

const itemVariants: Variants = { 
  hidden: { y: 20, opacity: 0 }, 
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { 
      duration: 0.5, 
      ease: 'easeOut' 
    } 
  } 
};

const headerVariants: Variants = { 
  hidden: { y: -20, opacity: 0 }, 
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { 
      duration: 0.6, 
      ease: 'easeOut' 
    } 
  } 
};

const filterBadgeVariants: Variants = { 
  initial: { scale: 0, opacity: 0 }, 
  animate: { 
    scale: 1, 
    opacity: 1, 
    transition: { 
      type: 'spring', 
      stiffness: 500, 
      damping: 30 
    } 
  }, 
  exit: { 
    scale: 0, 
    opacity: 0, 
    transition: { 
      duration: 0.2 
    } 
  } 
};


const SalesDashboard: React.FC<SalesDashboardProps> = ({ 
  onNavigateAndFilter, 
  localFilters, 
  setLocalFilters, 
  aiFilteredBuyers 
}) => {
    const { allSales, reconciledSales } = useData();
    const { showToast } = useToast();
    const mainContentRef = useRef<HTMLDivElement>(null);
    const kpiRef = useRef<HTMLDivElement>(null);
    const isKpiInView = useInView(kpiRef, { once: true, margin: "-100px" });

    // State
    const [selectedBuyer, setSelectedBuyer] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    // Scroll to top
    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    // === DATA PROCESSING ===
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
                const lower = salesSearchTerm.toLowerCase();
                return ['invoiceNumber', 'lenovoProductNumber', 'buyerName', 'serialNumber'].some(field =>
                    (sale as any)[field]?.toLowerCase().includes(lower)
                );
            }
            return true;
        });
    }, [allSales, localFilters, aiFilteredBuyers]);

    const { kpiData, profitByMtm } = useMemo(() => {
        if (locallyFilteredSales.length === 0) return { kpiData: null, profitByMtm: new Map() };
        const serials = new Set(locallyFilteredSales.map(s => s.serialNumber));
        const reconciled = reconciledSales.filter(rs => serials.has(rs.serialNumber));
        const mtmMap = new Map<string, { totalProfit: number; totalRevenue: number }>();

        const { totalRevenue, totalUnits, totalProfit } = reconciled.reduce((acc, s) => {
            acc.totalRevenue += s.unitSalePrice;
            acc.totalUnits += 1;
            if (s.unitProfit !== null) {
                acc.totalProfit += s.unitProfit;
                const cur = mtmMap.get(s.mtm) || { totalProfit: 0, totalRevenue: 0 };
                cur.totalProfit += s.unitProfit;
                cur.totalRevenue += s.unitSalePrice;
                mtmMap.set(s.mtm, cur);
            }
            return acc;
        }, { totalRevenue: 0, totalUnits: 0, totalProfit: 0 });

        const uniqueInvoices = new Set(locallyFilteredSales.map(s => s.invoiceNumber));

        return {
            kpiData: {
                totalRevenue, totalUnits, invoiceCount: uniqueInvoices.size,
                averageSalePricePerUnit: totalUnits > 0 ? totalRevenue / totalUnits : 0,
                averageRevenuePerInvoice: uniqueInvoices.size > 0 ? totalRevenue / uniqueInvoices.size : 0,
                uniqueBuyersCount: new Set(locallyFilteredSales.map(s => s.buyerId)).size,
                totalProfit,
                averageGrossMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
            },
            profitByMtm: mtmMap
        };
    }, [locallyFilteredSales, reconciledSales]);

    const trendData = useMemo(() => {
        const map: Record<string, { sortKey: string; label: string; value: number }> = {};
        locallyFilteredSales.forEach(sale => {
            if (!sale.invoiceDate) return;
            const d = new Date(sale.invoiceDate);
            const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
            const label = `${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} '${String(d.getUTCFullYear()).slice(2)}`;
            if (!map[key]) map[key] = { sortKey: key, label, value: 0 };
            map[key].value += sale.totalRevenue;
        });
        return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }, [locallyFilteredSales]);

    // AI Analysis
    const handleGenerateAnalysis = useCallback(async () => {
        setIsLoadingAnalysis(true);
        setAnalysis(null);
        try {
            if (!process.env.API_KEY) throw new Error("API key missing");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Analyze trend: ${JSON.stringify(trendData)}. One sharp sentence.`;
            const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setAnalysis(res.text);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'AI error', 'error');
        } finally {
            setIsLoadingAnalysis(false);
        }
    }, [trendData, showToast]);

    const activeFiltersCount = useMemo(() => {
        let c = 0;
        if (localFilters.salesSearchTerm) c++;
        if (localFilters.salesSegment.length > 0) c++;
        if (localFilters.salesBuyer.length > 0 || aiFilteredBuyers?.length) c++;
        if (localFilters.salesDateRangePreset !== 'thisYear' && localFilters.salesDateRangePreset !== 'all') c++;
        if (localFilters.salesRevenueMin !== null || localFilters.salesRevenueMax !== null) c++;
        if (localFilters.salesBuyerRegion) c++;
        return c;
    }, [localFilters, aiFilteredBuyers]);

    const clearAllFilters = useCallback(() => {
        setLocalFilters(prev => ({
            ...prev,
            salesSearchTerm: '', salesSegment: [], salesBuyer: [],
            salesDateRangePreset: 'thisYear', salesYear: 'all', salesQuarter: 'all',
            salesStartDate: INITIAL_LOCAL_FILTERS.salesStartDate,
            salesEndDate: INITIAL_LOCAL_FILTERS.salesEndDate,
            salesRevenueMin: null, salesRevenueMax: null, salesBuyerRegion: '',
        }));
        showToast('Filters cleared', 'success');
    }, [setLocalFilters, showToast]);

    const handleSegmentSelect = useCallback((segment: string | null) => {
        setLocalFilters(p => ({ ...p, salesSegment: segment ? [segment] : [] }));
    }, [setLocalFilters]);

    return (
        <main ref={mainContentRef} className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-8">
            {/* Header */}
            <motion.div 
                variants={headerVariants} 
                initial="hidden" 
                animate="visible"
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-600 to-emerald-600 dark:from-blue-700 dark:via-cyan-700 dark:to-emerald-700 p-8 shadow-xl"
            >
                <div className="relative z-10">
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Sales Analytics</h1>
                    <div className="my-3 border-t-2 border-dashed border-white/30" />
                    <p className="text-cyan-100 text-lg mb-4">Revenue, top products, and customer insights.</p>
                    {activeFiltersCount > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className="flex items-center gap-3 flex-wrap"
                        >
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/25 backdrop-blur-sm border border-white/40">
                                <FunnelIcon className="h-4 w-4 text-white" />
                                <span className="text-sm font-semibold text-white">{activeFiltersCount} Active Filter(s)</span>
                            </div>
                            <AnimatePresence mode="popLayout">
                                {localFilters.salesSegment.length > 0 && (
                                    <motion.button 
                                        key="seg" 
                                        variants={filterBadgeVariants} 
                                        initial="initial" 
                                        animate="animate" 
                                        exit="exit"
                                        onClick={() => setLocalFilters(p => ({...p, salesSegment: []}))}
                                        className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-cyan-700 text-sm font-medium transition-colors"
                                    >
                                        <span>Segment: {localFilters.salesSegment[0]}</span>
                                        <XMarkIcon className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                                    </motion.button>
                                )}
                            </AnimatePresence>
                            <motion.button 
                                whileHover={{ scale: 1.05 }} 
                                whileTap={{ scale: 0.95 }} 
                                onClick={clearAllFilters}
                                className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 border border-white/40 text-white text-sm font-medium transition-colors"
                            >
                                Clear All
                            </motion.button>
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* KPIs - Always at the top for immediate insight */}
            <motion.div 
                ref={kpiRef} 
                initial="hidden" 
                animate={isKpiInView ? "visible" : "hidden"} 
                variants={containerVariants}
            >
                {kpiData && <SalesKpiCards kpiData={kpiData} />}
            </motion.div>
            
            <motion.div 
                className="space-y-6 md:space-y-8"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                {/* PRIMARY INSIGHT: Revenue Trend - Full width for prominence */}
                <motion.div variants={itemVariants}>
                    <ChartCard 
                        title="Revenue Trend Over Time" 
                        description={`Monthly revenue trend based on ${locallyFilteredSales.length.toLocaleString()} transactions`}
                        controls={
                            <button 
                                onClick={handleGenerateAnalysis} 
                                disabled={isLoadingAnalysis}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <SparklesIcon className="h-4 w-4" />
                                {isLoadingAnalysis ? 'Analyzing...' : 'AI Insight'}
                            </button>
                        }
                        className="h-[420px]"
                    >
                        <RevenueTrendChart
                            trendData={trendData}
                            granularity="monthly"
                            analysis={analysis}
                            isLoadingAnalysis={isLoadingAnalysis}
                            onClearAnalysis={() => setAnalysis(null)}
                            onPeriodSelect={() => {}}
                        />
                    </ChartCard>
                </motion.div>

                {/* SEGMENT OVERVIEW: Sales by Segment - Full width for category breakdown */}
                <motion.div variants={itemVariants}>
                    <SalesBySegmentChart
                        data={locallyFilteredSales}
                        onSegmentSelect={handleSegmentSelect}
                        selectedSegment={localFilters.salesSegment[0] || null}
                    />
                </motion.div>
                
                {/* DETAILED BREAKDOWNS: Three Column Layout */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <TopSellingModelsChart
                        sales={locallyFilteredSales}
                        profitByMtm={profitByMtm}
                        onModelSelect={setSelectedModel}
                        selectedModel={selectedModel}
                    />
                    
                    <TopBuyersChart
                        sales={locallyFilteredSales}
                        onBuyerSelect={setSelectedBuyer}
                        selectedBuyer={selectedBuyer}
                    />
                    
                    <SalesBreakdownByPeriod sales={locallyFilteredSales} />
                </motion.div>
                
                {/* DETAILED DATA TABLE: Full width at bottom for deep exploration */}
                <motion.div variants={itemVariants}>
                    <SalesTable sales={locallyFilteredSales} />
                </motion.div>
            </motion.div>

            {/* Scroll to Top Button */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        whileHover={{ scale: 1.1 }} 
                        whileTap={{ scale: 0.9 }}
                        onClick={scrollToTop}
                        className="fixed bottom-8 right-8 z-50 p-4 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-2xl hover:shadow-blue-500/50 transition-shadow"
                        title="Scroll to top"
                        aria-label="Scroll to top"
                    >
                        <ArrowUpIcon className="h-6 w-6" />
                    </motion.button>
                )}
            </AnimatePresence>
        </main>
    );
};

export default SalesDashboard;