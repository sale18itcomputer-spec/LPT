import React from 'react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Component & UI Imports ---
import Header from './Header';
import DashboardSkeleton from './DashboardSkeleton';
import OrderDetailsModal from './OrderDetailsModal';
import { ExclamationTriangleIcon } from './ui/Icons';
import FilterManager from './ui/FilterManager';
import BottomNavBar from './BottomNavBar';
import MobileMenu from './MobileMenu';
import UpdateBanner from './ui/UpdateBanner';

// --- Dashboard View Imports ---
import { DASHBOARD_COMPONENTS, FILTER_COMPONENTS } from './dashboardConfig';

// --- Contexts, Types, and Constants ---
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
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
    const headerRef = useRef<HTMLDivElement>(null);

    // --- State Management ---
    const defaultViewForRole: ViewType = user?.role === 'Marketing' ? 'promotions' : 'orders';
    const [activeView, setActiveView] = useState<ViewType>(defaultViewForRole);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showRefreshBanner, setShowRefreshBanner] = useState(false);
    const [sidebarActionsContent, setSidebarActionsContent] = useState<React.ReactNode | null>(null);
    
    // Centralized filter state
    const [localFilters, setLocalFilters] = useState<LocalFiltersState>(INITIAL_LOCAL_FILTERS);
    const resetLocalFilters = useCallback(() => setLocalFilters(INITIAL_LOCAL_FILTERS), []);
    const hasActiveLocalFilters = useMemo(() => JSON.stringify(localFilters) !== JSON.stringify(INITIAL_LOCAL_FILTERS), [localFilters]);
    
    // --- Custom Hooks & Memoization ---
    const isHeaderVisible = useScrollableHeader(headerRef);
    const ActiveDashboardComponent = useMemo(() => DASHBOARD_COMPONENTS[activeView] || DASHBOARD_COMPONENTS.orders, [activeView]);

    if (!dataContext) {
        throw new Error("Dashboard must be used within a DataProvider");
    }

    const { isLoading, isRefreshing, error, handleGlobalRefresh, lastUpdated, availableFilterOptions, newModelMtms, inventoryData } = dataContext;

    // --- Handlers and Callbacks ---
    const handleAddOrdersSuccess = useCallback(() => {
        handleGlobalRefresh();
        setActiveView('orders');
    }, [handleGlobalRefresh]);

    const handleNavigateAndFilter = useCallback((view: ViewType, filters: Partial<LocalFiltersState>) => {
        sessionStorage.setItem('_nav_filters', JSON.stringify(filters));
        setActiveView(view);
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
    
    // Select the correct filter UI based on the active view
    const FilterComponentForView = useMemo(() => FILTER_COMPONENTS[activeView], [activeView]);

    const renderContent = () => {
        if (error) {
            return (
                <div className="flex items-center justify-center min-h-[calc(100vh-140px)] p-4">
                    <div>
                        <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-primary-text mb-2">An Error Occurred</h2>
                        <p className="text-red-700 bg-red-100 p-4 rounded-lg">{error}</p>
                    </div>
                </div>
            );
        }
        if (isLoading) {
            return <DashboardSkeleton />;
        }
        
        // Props that are common to many dashboard components
        const commonDashboardProps = {
            localFilters,
            setLocalFilters,
            userRole: user?.role || 'Admin',
            onNavigateAndFilter: handleNavigateAndFilter,
            onPsrefLookup: handlePsrefLookup,
        };

        return (
            <div className="flex-grow flex min-h-0">
                {FilterComponentForView && (
                    <FilterManager
                        onClear={resetLocalFilters}
                        hasActiveFilters={hasActiveLocalFilters}
                        viewName={activeView.replace('-', ' ')}
                        sidebarActionsContent={sidebarActionsContent}
                    >
                        <FilterComponentForView
                            localFilters={localFilters}
                            setLocalFilters={setLocalFilters}
                            {...( (activeView === 'inventory' || activeView === 'price-list') && 
                                { productLineOptions: availableFilterOptions.orders.productLines }
                            )}
                        />
                    </FilterManager>
                )}
                <main className={`flex-grow min-w-0 transition-all duration-300 ${FilterComponentForView ? 'md:pl-72' : ''}`}>
                    <AnimatePresence mode="wait">
                        <MotionDiv
                            key={activeView}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="h-full"
                        >
                             <ActiveDashboardComponent
                                {...commonDashboardProps}
                                // View-specific props are passed here
                                {...(activeView === 'orders' && { onRowClick: setSelectedOrder, onTrackShipment: console.log })}
                                {...(activeView === 'inventory' && { inventoryData })}
                                {...(activeView === 'add-orders' && { onSaveSuccess: handleAddOrdersSuccess })}
                                {...(activeView === 'tasks' && { setSidebarActionsContent })}
                            />
                        </MotionDiv>
                    </AnimatePresence>
                </main>
            </div>
        );
    };

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
            
            {renderContent()}
            
            <OrderDetailsModal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} order={selectedOrder} newModelMtms={newModelMtms} filterOptions={availableFilterOptions.orders} onDataUpdate={() => { handleGlobalRefresh(); setSelectedOrder(null); }} onPsrefLookup={handlePsrefLookup} />
            
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