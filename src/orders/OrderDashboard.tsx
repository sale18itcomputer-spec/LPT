import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import type { Order, DashboardType, ViewType, LocalFiltersState, OrderKpiData } from '../../types';
import KpiCards from '../KpiCards';
import OrderValueTrendChart from '../OrderValueTrendChart';
import Card from '../ui/Card';
import ChartCard from '../ui/ChartCard';
import BacklogValueChart from '../BacklogValueChart';
import LeadTimeAnalysisChart from '../LeadTimeAnalysisChart';
import ProductLineValueChart from '../ProductLineValueChart';
import OrderTable from '../OrderTable';

interface OrderDashboardProps {
    onRowClick: (order: Order) => void;
    onNavigateAndFilter: (view: ViewType, filters: Partial<LocalFiltersState>) => void;
    onPsrefLookup: (item: { mtm: string; modelName: string }) => void;
    localFilters: LocalFiltersState;
    onTrackShipment: (deliveryNumber: string) => void;
}

const OrderDashboard: React.FC<OrderDashboardProps> = ({ onRowClick, onNavigateAndFilter, onPsrefLookup, localFilters, onTrackShipment }) => {
    
    const { allOrders, totalOrderCount, allInvoicesCount, newModelMtms } = useData();
    
    const locallyFilteredOrders = useMemo(() => {
        const { orderSearchTerm, orderShow, orderProductLine, orderFactoryStatus, orderLocalStatus, orderStartDate, orderEndDate } = localFilters;
        let tempOrders = [...allOrders];
        if (orderProductLine.length > 0) { tempOrders = tempOrders.filter(o => orderProductLine.includes(o.productLine)); }
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

    const handleNavigate = (target: DashboardType, searchTerm: string) => {
        onNavigateAndFilter(target, { [target === 'orders' ? 'orderSearchTerm' : 'salesSearchTerm']: searchTerm });
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 pt-6 lg:pt-8">
            <KpiCards orderKpiData={orderKpiData} totalOrderCount={totalOrderCount} allInvoicesCount={allInvoicesCount} />
            <ChartCard title="Order Value Trend" description="Monthly value of orders by Order Receipt Date." className="h-[400px]">
                <OrderValueTrendChart orders={locallyFilteredOrders} />
            </ChartCard>
            <section>
                <h2 className="text-xl md:text-2xl font-semibold text-primary-text tracking-tight mb-4">Order Health & Composition</h2>
                <div className="grid grid-cols-fluid gap-4 sm:gap-6">
                    <ChartCard title="Backlog Analysis by Age" description="Breakdown of open order value by age and product line." className="h-[400px]"><BacklogValueChart orders={locallyFilteredOrders} /></ChartCard>
                    <ChartCard title="Lead Time Distribution" description="Box plot showing lead time spread, median, and outliers." className="h-[400px]"><LeadTimeAnalysisChart orders={locallyFilteredOrders} /></ChartCard>
                    <ChartCard title="Order Value by Product Line" description="Click a slice to filter orders by product line." className="h-[400px]"><ProductLineValueChart orders={locallyFilteredOrders} /></ChartCard>
                </div>
            </section>
            <div className="pb-4 sm:pb-6">
                <Card className="p-4 sm:p-6">
                    <OrderTable 
                        orders={locallyFilteredOrders} 
                        totalOrderCount={totalOrderCount} 
                        onRowClick={onRowClick} 
                        onNavigateAndFilter={handleNavigate} 
                        newModelMtms={newModelMtms} 
                        onPsrefLookup={onPsrefLookup} 
                        onTrackShipment={onTrackShipment}
                    />
                </Card>
            </div>
        </div>
    );
};

export default OrderDashboard;