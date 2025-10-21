import React from 'react';
import type { ViewType, LocalFiltersState } from '../types';

// Import all filter components
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

export interface FilterComponentProps {
    localFilters: LocalFiltersState;
    setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
    // Add any other potential props here that specific filters might need
    productLineOptions?: string[];
}

export const FILTER_COMPONENTS: Partial<Record<ViewType, React.FC<any>>> = {
    'orders': OrderFilters,
    'sales': SalesFilters,
    'inventory': InventoryFilters,
    'customers': CustomerFilters,
    'strategic': StrategicFilters,
    'backorders': BackorderFilters,
    'promotions': PromotionsFilters,
    'price-list': PriceListFilters,
    'rebates': RebateFilters,
    'shipments': ShipmentFilters,
    'profit-reconciliation': ProfitReconciliationFilters,
    'order-vs-sale': OrderVsSaleFilters,
    'tasks': TasksFilters,
};
