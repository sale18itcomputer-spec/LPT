// This file centralizes the mapping between a view name (ViewType) and the component that renders it.
// This makes the main Dashboard component cleaner and easier to extend.

// @ts-ignore
import React from 'react';
import { ViewType } from '../types';
import OrderDashboard from './orders/OrderDashboard';
import SalesDashboard from './sales/SalesDashboard';
import TasksDashboard from './tasks/TasksDashboard';
import InventoryDashboard from './inventory/InventoryDashboard';
import CustomerDashboard from './customers/CustomerDashboard';
import StrategicSalesDashboard from './strategic/StrategicSalesDashboard';
import BackorderAnalysisDashboard from './backorders/BackorderAnalysisDashboard';
import PromotionsDashboard from './promotions/PromotionsDashboard';
import UserProfile from './UserProfile';
// FIX: Corrected import path casing to match the file name 'addOrdersPage.tsx'.
import addOrdersPage from './addOrdersPage';
import DataTransformer from './transformer/DataTransformer';
import PriceListPage from './pricelist/PriceListPage';
import SerializationPage from './serialization/SerializationPage';
import RebateProgramsPage from './rebates/RebateProgramsPage';
import RebateValidationPage from './rebates/RebateValidationPage';
import ShipmentsPage from './shipments/ShipmentsPage';
import ProfitReconciliationPage from './profit-reconciliation/ProfitReconciliationPage';
import AccessoryCostsPage from './accessory/AccessoryCostsPage';
import LandedCostAnalysisPage from './operations/LandedCostAnalysisPage';
import OrderVsSalePage from './operations/OrderVsSalePage';
import { FILTER_COMPONENTS } from './FilterComponentMap'; // Assuming this file exists and is correct

export const DASHBOARD_COMPONENTS: { [key in ViewType]?: React.FC<any> } = {
    'orders': OrderDashboard,
    'sales': SalesDashboard,
    'tasks': TasksDashboard,
    'inventory': InventoryDashboard,
    'customers': CustomerDashboard,
    'strategic': StrategicSalesDashboard,
    'backorders': BackorderAnalysisDashboard,
    'promotions': PromotionsDashboard,
    'profile': UserProfile,
    'add-orders': addOrdersPage,
    'data-transformer': DataTransformer,
    'price-list': PriceListPage,
    'serialization': SerializationPage,
    'rebates': RebateProgramsPage,
    'rebate-validation': RebateValidationPage,
    'shipments': ShipmentsPage,
    'profit-reconciliation': ProfitReconciliationPage,
    'accessory-costs': AccessoryCostsPage,
    'landed-cost-analysis': LandedCostAnalysisPage,
    'order-vs-sale': OrderVsSalePage,
};

export { FILTER_COMPONENTS };