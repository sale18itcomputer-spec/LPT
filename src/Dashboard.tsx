

import React from 'react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// FIX: Import `Type` from "@google/genai" for use in responseSchema.
import { GoogleGenAI, Type } from "@google/genai";


// --- Component & UI Imports ---
import Header from './Header';
import DashboardSkeleton from './DashboardSkeleton';
import OrderDetailsModal from './OrderDetailsModal';
import ErrorBoundary from './ui/ErrorBoundary';
import { ExclamationTriangleIcon } from './ui/Icons';
import FilterManager from './ui/FilterManager';
import BottomNavBar from './BottomNavBar';
import MobileMenu from './MobileMenu';
import UpdateBanner from './ui/UpdateBanner';
import TrackingSidebar from './shipments/TrackingSidebar';
import Footer from './Footer';

// --- Dashboard View Imports ---
import OrderDashboard from './orders/OrderDashboard';
import SalesDashboard from './sales/SalesDashboard';
import TasksDashboard from './tasks/TasksDashboard';
import InventoryDashboard from './inventory/InventoryDashboard';
import CustomerDashboard from './customers/CustomerDashboard';
import StrategicSalesDashboard from './strategic/StrategicSalesDashboard';
import BackorderAnalysisDashboard from './backorders/BackorderAnalysisDashboard';
import PromotionsDashboard from './promotions/PromotionsDashboard';
import UserProfile from './UserProfile';
import AddOrdersPage from './addOrdersPage';
import DataTransformer from './transformer/DataTransformer';
import PriceListPage from './pricelist/PriceListPage';
import SerializationPage from './serialization/SerializationPage';
import { RebateProgramsPage } from './rebates/RebateProgramsPage';
import RebateValidationPage from './rebates/RebateValidationPage';
import ShipmentsPage from './shipments/ShipmentsPage';
import ProfitReconciliationPage from './profit-reconciliation/ProfitReconciliationPage';
import AccessoryCostsPage from './accessory/AccessoryCostsPage';
import LandedCostAnalysisPage from './operations/LandedCostAnalysisPage';
import OrderVsSalePage from './operations/OrderVsSalePage';

// --- Filter Component Imports ---
import OrderFilters from './orders/OrderFilters';
import SalesFilters from './sales/SalesFilters';
import InventoryFilters from './inventory/InventoryFilters';
import CustomerFilters from './customers/CustomerFilters';
import StrategicFilters from './strategic/StrategicFilters';
import BackorderFilters from './backorders/BackorderFilters';
import PromotionsFilters from './promotions/PromotionsFilters';
import PriceListFilters from './pricelist/PriceListFilters';
import RebateFilters from './rebates/RebateFilters';
import ShipmentFilters from './shipments/ShipmentFilters';
import ProfitReconciliationFilters from './profit-reconciliation/ProfitReconciliationFilters';
import OrderVsSaleFilters from './operations/filters/OrderVsSaleFilters';
import TasksFilters from './tasks/TasksFilters';

// --- Contexts, Types, and Constants ---
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Order, ViewType, LocalFiltersState } from '../types';
import { INITIAL_LOCAL_FILTERS } from '../constants';

// Framer Motion type workaround: This is a pragmatic fix for a common issue where Framer Motion's
// props are not correctly inferred in some TypeScript projects.
const MotionDiv = motion.div as any;

/**
 * Custom hook to manage the visibility of the header based on scroll direction on mobile.
 * @returns {boolean} isHeaderVisible
 */
const useScrollableHeader = (headerRef: React.RefObject<HTMLElement>) => {
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const SCROLL_THRESHOLD = 10;
        const HEADER_HEIGHT = headerRef.current?.offsetHeight || 80;

        const handleScroll = () => {
            if (window.innerWidth >= 768) {
                setIsHeaderVisible(true);
                return;
            }

            const currentScrollY = window.scrollY;
            if (currentScrollY < HEADER_HEIGHT) {
                setIsHeaderVisible(true);
            } else if (Math.abs(currentScrollY - lastScrollY.current) > SCROLL_THRESHOLD) {
                setIsHeaderVisible(currentScrollY < lastScrollY.current); // Show on scroll up, hide on scroll down
            }
            lastScrollY.current = Math.max(0, currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [headerRef]);

    return isHeaderVisible;
};


const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const dataContext = useData();
    const { showToast } = useToast();
    const headerRef = useRef<HTMLDivElement>(null);

    // --- State Management ---
    const defaultViewForRole: ViewType = user?.role === 'Marketing' ? 'promotions' : 'orders';
    const [activeView, setActiveView] = useState<ViewType>(defaultViewForRole);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showRefreshBanner, setShowRefreshBanner] = useState(false);
    const [sidebarActionsContent, setSidebarActionsContent] = useState<React.ReactNode | null>(null);
    const [trackingSidebarState, setTrackingSidebarState] = useState<{ isOpen: boolean; shipmentNumber: string | null }>({ isOpen: false, shipmentNumber: null });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    
    // Centralized filter state
    const [localFilters, setLocalFilters] = useState<LocalFiltersState>(INITIAL_LOCAL_FILTERS);
    const resetLocalFilters = useCallback(() => setLocalFilters(INITIAL_LOCAL_FILTERS), []);
    const hasActiveLocalFilters = useMemo(() => JSON.stringify(localFilters) !== JSON.stringify(INITIAL_LOCAL_FILTERS), [localFilters]);

    // State for AI-powered sales filters
    const [aiFilteredBuyers, setAiFilteredBuyers] = useState<string[] | null>(null);
    const [isBuyerRegionLoading, setIsBuyerRegionLoading] = useState(false);
    
    // --- Custom Hooks & Memoization ---
    const isHeaderVisible = useScrollableHeader(headerRef);

    if (!dataContext) {
        throw new Error("Dashboard must be used within a DataProvider");
    }

    const { isLoading, isRefreshing, error, handleGlobalRefresh, lastUpdated, orderFilterOptions, newModelMtms, inventoryData, allSales } = dataContext;

    // --- Handlers and Callbacks ---
    const handleAddOrdersSuccess = useCallback(() => {
        handleGlobalRefresh();
        setActiveView('orders');
    }, [handleGlobalRefresh]);

    const handleNavigateAndFilter = useCallback((view: ViewType, filters: Partial<LocalFiltersState>) => {
        sessionStorage.setItem('_nav_filters', JSON.stringify(filters));
        setActiveView(view);
    }, []);

     const handleTrackShipment = useCallback((deliveryNumber: string) => {
        setTrackingSidebarState({ isOpen: true, shipmentNumber: deliveryNumber });
    }, []);
    
    const handlePsrefLookup = useCallback((item: { mtm: string; modelName: string }) => {
        const keywords = ['abyss', 'arctic', 'black', 'blue', 'bronze', 'cloud', 'cosmic', 'eclipse', 'glacier', 'gold', 'graphite', 'gray', 'green', 'grey', 'iron', 'luna', 'mica', 'mineral', 'onyx', 'pink', 'platinum', 'purple', 'red', 'shadow', 'silver', 'storm', 'teal', 'tidal', 'white'];
        const colorPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'i');
        const match = item.modelName.match(colorPattern);
        const baseModelName = match ? item.modelName.substring(0, match.index).trim() : item.modelName.trim();
        const modelSlug = baseModelName.replace(/\s+/g, '_').replace(/[/\\]/g, '_');
        const url = `https://psref.lenovo.com/Detail/${modelSlug}?M=${encodeURIComponent(item.mtm)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    }, []);

    const allBuyerNames = useMemo(() => [...new Set(allSales.map(s => s.buyerName))], [allSales]);

    const handleBuyerRegionSearch = useCallback(async (region: string) => {
        setLocalFilters(prev => ({ ...prev, salesBuyerRegion: region, salesBuyer: [] }));

        if (!region.trim()) {
            setAiFilteredBuyers(null);
            return;
        }

        setIsBuyerRegionLoading(true);
        try {
            if (!process.env.API_KEY) throw new Error("API key is not configured.");
// FIX: Correctly initialize GoogleGenAI with a named apiKey parameter.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `Given this list of company names in Cambodia: ${JSON.stringify(allBuyerNames)}, identify which are most likely located or primarily operate in "${region}". Return ONLY a JSON array of strings with exact matching company names.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    temperature: 0.1,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                },
            });

            const result = JSON.parse(response.text);
            setAiFilteredBuyers(result);
            if (result.length === 0) {
                showToast(`AI found no buyers matching "${region}".`, 'info');
            }

        } catch (err) {
            console.error("Error fetching buyers by region:", err);
            showToast(err instanceof Error ? `AI search failed: ${err.message}` : 'An AI search error occurred.', 'error');
            setAiFilteredBuyers([]);
        } finally {
            setIsBuyerRegionLoading(false);
        }
    }, [allBuyerNames, showToast, setLocalFilters]);


    // --- Effects ---

    // Effect for role-based view enforcement
    useEffect(() => {
        if (user?.role === 'Marketing') {
            const allowedViews: ViewType[] = ['promotions', 'inventory', 'tasks', 'profile', 'price-list', 'shipments'];
            if (!allowedViews.includes(activeView)) {
                setActiveView('promotions');
            }
        }
    }, [activeView, user?.role]);

    // Effect to reset filters and apply navigation filters when the view changes
    useEffect(() => {
        resetLocalFilters();
        setSidebarActionsContent(null);
        setAiFilteredBuyers(null); // Clear AI filter on view change

        const navFiltersRaw = sessionStorage.getItem('_nav_filters');
        if (navFiltersRaw) {
            try {
                const navFilters = JSON.parse(navFiltersRaw);
                setLocalFilters(prev => ({ ...prev, ...navFilters }));
            } catch (e) {
                console.error("Failed to parse navigation filters", e);
            } finally {
                sessionStorage.removeItem('_nav_filters');
            }
        }
    }, [activeView, resetLocalFilters]);

    // Effect to manage the data refresh banner
    useEffect(() => {
        const REFRESH_INTERVAL_MINUTES = 10;
        if (isRefreshing || !lastUpdated) {
            setShowRefreshBanner(false);
            return;
        }

        const checkTime = () => {
            const minutesElapsed = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60);
            setShowRefreshBanner(minutesElapsed > REFRESH_INTERVAL_MINUTES);
        };

        checkTime();
        const intervalId = setInterval(checkTime, 60 * 1000);
        return () => clearInterval(intervalId);
    }, [lastUpdated, isRefreshing]);

    // --- Dynamic Component Rendering ---
    
    let ActiveDashboardComponent: React.FC<any>;
    let FilterComponentForView: React.FC<any> | null = null;

    switch (activeView) {
        case 'orders': ActiveDashboardComponent = OrderDashboard; FilterComponentForView = OrderFilters; break;
        case 'sales': ActiveDashboardComponent = SalesDashboard; FilterComponentForView = SalesFilters; break;
        case 'tasks': ActiveDashboardComponent = TasksDashboard; FilterComponentForView = TasksFilters; break;
        case 'inventory': ActiveDashboardComponent = InventoryDashboard; FilterComponentForView = InventoryFilters; break;
        case 'customers': ActiveDashboardComponent = CustomerDashboard; FilterComponentForView = CustomerFilters; break;
        case 'strategic': ActiveDashboardComponent = StrategicSalesDashboard; FilterComponentForView = StrategicFilters; break;
        case 'backorders': ActiveDashboardComponent = BackorderAnalysisDashboard; FilterComponentForView = BackorderFilters; break;
        case 'promotions': ActiveDashboardComponent = PromotionsDashboard; FilterComponentForView = PromotionsFilters; break;
        case 'profile': ActiveDashboardComponent = UserProfile; FilterComponentForView = null; break;
        case 'add-orders': ActiveDashboardComponent = AddOrdersPage; FilterComponentForView = null; break;
        case 'data-transformer': ActiveDashboardComponent = DataTransformer; FilterComponentForView = null; break;
        case 'price-list': ActiveDashboardComponent = PriceListPage; FilterComponentForView = PriceListFilters; break;
        case 'serialization': ActiveDashboardComponent = SerializationPage; FilterComponentForView = null; break;
        case 'rebates': ActiveDashboardComponent = RebateProgramsPage; FilterComponentForView = RebateFilters; break;
        case 'rebate-validation': ActiveDashboardComponent = RebateValidationPage; FilterComponentForView = null; break;
        case 'shipments': ActiveDashboardComponent = ShipmentsPage; FilterComponentForView = ShipmentFilters; break;
        case 'profit-reconciliation': ActiveDashboardComponent = ProfitReconciliationPage; FilterComponentForView = ProfitReconciliationFilters; break;
        case 'accessory-costs': ActiveDashboardComponent = AccessoryCostsPage; FilterComponentForView = null; break;
        case 'landed-cost-analysis': ActiveDashboardComponent = LandedCostAnalysisPage; FilterComponentForView = null; break;
        case 'order-vs-sale': ActiveDashboardComponent = OrderVsSalePage; FilterComponentForView = OrderVsSaleFilters; break;
        default: ActiveDashboardComponent = OrderDashboard; FilterComponentForView = OrderFilters; break;
    }

    const hasFilters = !!FilterComponentForView;

    // Props that are common to many dashboard components
    const commonDashboardProps = {
        localFilters,
        setLocalFilters,
        userRole: user?.role || 'Admin',
        onNavigateAndFilter: handleNavigateAndFilter,
        onPsrefLookup: handlePsrefLookup,
    };
    
    const mainContent = (
        <>
            {error && (
                <div className="flex items-center justify-center min-h-[calc(100vh-140px)] p-4">
                    <div>
                        <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-primary-text mb-2">An Error Occurred</h2>
                        <p className="text-red-700 bg-red-100 p-4 rounded-lg">{error}</p>
                    </div>
                </div>
            )}
            {isLoading && !error && <DashboardSkeleton />}
            {!isLoading && !error && ActiveDashboardComponent && (
                <AnimatePresence mode="wait">
                    <MotionDiv
                        key={activeView}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                         <ErrorBoundary>
                            <ActiveDashboardComponent
                                {...commonDashboardProps}
                                // View-specific props are passed here
                                {...(activeView === 'orders' && { onRowClick: setSelectedOrder, onTrackShipment: handleTrackShipment })}
                                {...(activeView === 'inventory' && { inventoryData })}
                                {...(activeView === 'add-orders' && { onSaveSuccess: handleAddOrdersSuccess })}
                                {...(activeView === 'tasks' && { setSidebarActionsContent })}
                                {...(activeView === 'sales' && { aiFilteredBuyers })}
                                {...(activeView === 'shipments' && { onTrackShipment: handleTrackShipment })}
                            />
                         </ErrorBoundary>
                    </MotionDiv>
                </AnimatePresence>
            )}
        </>
    );

    return (
        <div className="flex flex-col min-h-screen">
            <div ref={headerRef} className={`app-header sticky top-0 z-30 ${!isHeaderVisible ? 'is-hidden' : ''}`}>
                <AnimatePresence>
                    {showRefreshBanner && !isRefreshing && (
                         <UpdateBanner
                            type="warning"
                            message="Your data is over 10 minutes old."
                            actionText="Refresh Now"
                            onAction={handleGlobalRefresh}
                        />
                    )}
                </AnimatePresence>
                <Header
                    title="Business Dashboard"
                    lastUpdated={lastUpdated}
                    isRefreshing={isRefreshing}
                    onRefresh={handleGlobalRefresh}
                    activeView={activeView}
                    setActiveView={setActiveView}
                />
            </div>
            
            <div className="flex-1 flex min-h-0">
                {/* --- DESKTOP SIDEBAR --- */}
                {hasFilters && (
                    <div className="hidden md:block">
                        <FilterManager
                            onClear={resetLocalFilters}
                            hasActiveFilters={hasActiveLocalFilters}
                            viewName={activeView.replace('-', ' ')}
                            sidebarActionsContent={sidebarActionsContent}
                            isCollapsed={isSidebarCollapsed}
                            onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
                        >
                            <FilterComponentForView
                                localFilters={localFilters}
                                setLocalFilters={setLocalFilters}
                                {...(activeView === 'sales' && {
                                    onBuyerRegionSearch: handleBuyerRegionSearch,
                                    isBuyerRegionLoading: isBuyerRegionLoading
                                })}
                            />
                        </FilterManager>
                    </div>
                )}
                
                {/* --- MAIN CONTENT & FOOTER WRAPPER --- */}
                <div className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${hasFilters ? (isSidebarCollapsed ? 'md:pl-20' : 'md:pl-72') : ''}`}>
                    <main className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
                        {mainContent}
                    </main>
                    <Footer />
                </div>
            </div>
            
            {/* --- MODALS & MOBILE UI --- */}
            <OrderDetailsModal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} order={selectedOrder} newModelMtms={newModelMtms} filterOptions={orderFilterOptions} onDataUpdate={() => { handleGlobalRefresh(); setSelectedOrder(null); }} onPsrefLookup={handlePsrefLookup} />
            <TrackingSidebar isOpen={trackingSidebarState.isOpen} onClose={() => setTrackingSidebarState({ isOpen: false, shipmentNumber: null })} shipmentNumber={trackingSidebarState.shipmentNumber} />
            
             {/* --- MOBILE FILTER --- */}
            <div className="md:hidden">
                {hasFilters && (
                     <FilterManager
                        onClear={resetLocalFilters}
                        hasActiveFilters={hasActiveLocalFilters}
                        viewName={activeView.replace('-', ' ')}
                    >
                        <FilterComponentForView
                            localFilters={localFilters}
                            setLocalFilters={setLocalFilters}
                             {...(activeView === 'sales' && {
                                onBuyerRegionSearch: handleBuyerRegionSearch,
                                isBuyerRegionLoading: isBuyerRegionLoading
                            })}
                        />
                    </FilterManager>
                )}
            </div>

            {!isLoading && !error && (
                <>
                    <div className={`app-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-40 ${!isHeaderVisible ? 'is-hidden' : ''}`}>
                        <BottomNavBar activeView={activeView} setActiveView={setActiveView} onMenuClick={() => setIsMobileMenuOpen(true)} />
                    </div>
                    <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} activeView={activeView} onNavigate={(view) => { setActiveView(view); setIsMobileMenuOpen(false); }} />
                </>
            )}
        </div>
    );
};

export default Dashboard;