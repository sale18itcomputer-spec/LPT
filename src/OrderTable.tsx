import React, { useState, useMemo, Fragment, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Order } from '../types';
import { exportDataToCsv } from '../utils/csv';
import { 
    ChevronUpIcon, 
    ChevronDownIcon, 
    DocumentMagnifyingGlassIcon, 
    ArrowDownTrayIcon, 
    ChevronRightIcon,
    SparklesIcon,
    TruckIcon
} from './ui/Icons';
import type { DashboardType } from '../types';
import Card from './ui/Card';

type SortKey = keyof Order;
type SortOrder = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortOrder;
}

const TableHeader: React.FC<{
  onSort: (key: SortKey) => void,
  sortConfig: SortConfig | null,
  sortKey: SortKey,
  children: React.ReactNode,
  className?: string,
  isSortable: boolean,
  'aria-label'?: string,
}> = ({ onSort, sortConfig, sortKey, children, className = '', isSortable, 'aria-label': ariaLabel }) => {
  const isSorted = isSortable && sortConfig?.key === sortKey;
  const thClassName = `px-4 py-3.5 text-left text-xs font-semibold text-secondary-text dark:text-dark-secondary-text uppercase tracking-wider select-none ${isSortable ? 'cursor-pointer group' : ''} ${className}`;
  
  return (
    <th
      scope="col"
      className={thClassName}
      onClick={isSortable ? () => onSort(sortKey) : undefined}
      aria-sort={isSorted ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      aria-label={ariaLabel}
    >
      <div className="flex items-center">
        {children}
        {isSortable && (
          <span className="w-4 h-4 ml-1.5">
            {isSorted ? (
              sortConfig?.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
            ) : <div className="h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity"><ChevronUpIcon/></div>}
          </span>
        )}
      </div>
    </th>
  )
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const statusMap: Record<string, string> = {
        'Arrived': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
        'Delivered': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
        'In Transit Hub (SGP)': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        'Pending': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        'Shipped': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        'Released to Manufacturing': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
        'Customer Action': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
    };
    const colorClass = statusMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
            {status}
        </span>
    );
};

const GroupStatusBadge: React.FC<{ status: 'Delivered' | 'Partially Delivered' | 'In Transit' | 'Processing' | 'Delayed' | 'Cancelled' }> = ({ status }) => {
    const statusMap: Record<string, string> = {
        'Delivered': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
        'Partially Delivered': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        'In Transit': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
        'Processing': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        'Delayed': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
        'Cancelled': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };
    const colorClass = statusMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
            {status}
        </span>
    );
};


const NewModelBadge: React.FC = () => (
    <span 
        className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
        title="First ordered within the last 90 days"
    >
        New Model
    </span>
);

const GroupProgressBar: React.FC<{ progress: number; delivered: number; total: number; }> = ({ progress, delivered, total }) => (
    <div className="w-full">
        <div className="flex justify-between text-xs font-medium text-secondary-text dark:text-dark-secondary-text mb-1">
            <span>{Math.round(progress)}% complete</span>
            <span>{delivered.toLocaleString()} / {total.toLocaleString()}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-dark-border-color rounded-full h-1.5">
            <div className="bg-highlight h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
    </div>
);

interface OrderTableProps {
  orders: Order[];
  totalOrderCount: number;
  onRowClick: (order: Order) => void;
  onNavigateAndFilter: (target: DashboardType, mtm: string) => void;
  newModelMtms: Set<string>;
  onPsrefLookup: (item: { mtm: string; modelName: string }) => void;
  onTrackShipment: (deliveryNumber: string) => void;
}

const OrderTable = React.forwardRef<HTMLDivElement, OrderTableProps>(({ orders, totalOrderCount, onRowClick, newModelMtms, onPsrefLookup, onNavigateAndFilter, onTrackShipment }, ref) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'dateIssuePI', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const itemsPerPageId = useId();

  const addDays = (dateStr: string, days: number): string => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().split('T')[0];
  };

  const renderDateCell = (date: string | null, isEstimate: boolean) => {
      if (date) {
          if (isEstimate) {
              return (
                  <span className="italic text-secondary-text/80 dark:text-dark-secondary-text/80" title={`Estimated: ${date}`}>
                      ~{date}
                  </span>
              );
          }
          return date;
      }
      return 'N/A';
  };

  const groupedOrders = useMemo(() => {
    // FIX: Explicitly type the accumulator and initial value to prevent TS from inferring it as `any` or `unknown`.
    return orders.reduce((acc: Record<string, Order[]>, order) => {
        if (!acc[order.salesOrder]) {
            acc[order.salesOrder] = [];
        }
        acc[order.salesOrder].push(order);
        return acc;
    }, {} as Record<string, Order[]>);
  }, [orders]);

  const requestSort = (key: SortKey) => {
    let direction: SortOrder = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const sortableGroupKeys: SortKey[] = ['salesOrder', 'productLine', 'qty', 'ShipDate', 'actualArrival', 'dateIssuePI'];

  const sortedGroups = useMemo(() => {
    // FIX: Explicitly type `items` as `Order[]` in the map callback to fix type inference issues.
    const itemsAsArray = Object.entries(groupedOrders).map(([salesOrder, items]: [string, Order[]]) => {
        const latestDateIssuePI = items.reduce((latest, i) => (i.dateIssuePI && (!latest || i.dateIssuePI > latest)) ? i.dateIssuePI : latest, items[0]?.dateIssuePI || null);
        
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        
        const getEarliestShip = () => {
            const dates = items.map(i => {
                if (i.isDelayedProduction) return { date: todayStr, isEstimate: true }; // Delayed ship is now estimated
                if (i.ShipDate) return { date: i.ShipDate, isEstimate: false };
                if (i.dateIssuePI) return { date: addDays(i.dateIssuePI, 30), isEstimate: true };
                return { date: null, isEstimate: false };
            }).filter(d => d.date !== null);

            if (dates.length === 0) return { date: null, isEstimate: false };

            return dates.reduce((earliest, current) => {
                if (!earliest.date) return current;
                if (current.date! < earliest.date) return current;
                return earliest;
            });
        };

        const getLatestArrival = () => {
            const dates = items.map(i => {
                if (i.actualArrival) return { date: i.actualArrival, isEstimate: false };
                if (i.isDelayedTransit) return { date: todayStr, isEstimate: true }; // Delayed arrival is now estimated
                if (i.eta) return { date: i.eta, isEstimate: true };
                const estShip = i.ShipDate || (i.dateIssuePI ? addDays(i.dateIssuePI, 30) : null);
                if (estShip) return { date: addDays(estShip, 20), isEstimate: true };
                return { date: null, isEstimate: false };
            }).filter(d => d.date !== null);

            if (dates.length === 0) return { date: null, isEstimate: false };

            return dates.reduce((latest, current) => {
                if (!latest.date) return current;
                if (current.date! > latest.date) return current;
                return latest;
            });
        };

        const earliestShipDateObj = getEarliestShip();
        const latestArrivalObj = getLatestArrival();

        const uniqueProductLines = [...new Set(items.map(item => item.productLine))].sort();
        const displayProductLine = uniqueProductLines.join(', ');
        
        const totalDeliveredQty = items.reduce((sum, i) => (i.factoryToSgp === 'Delivered' ? sum + i.qty : sum), 0);
        const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
        const progressPercentage = totalQty > 0 ? (totalDeliveredQty / totalQty) * 100 : 0;
        
        let groupStatus: 'Delivered' | 'Partially Delivered' | 'In Transit' | 'Processing' | 'Delayed' | 'Cancelled';
        const isGroupDelayed = items.some(i => i.isDelayedProduction || i.isDelayedTransit);
        const isCancelled = items.every(i => i.factoryToSgp === 'Cancelled');

        if (isCancelled) {
            groupStatus = 'Cancelled';
        } else if (isGroupDelayed) {
            groupStatus = 'Delayed';
        } else if (progressPercentage === 100) {
            groupStatus = 'Delivered';
        } else if (progressPercentage > 0) {
            groupStatus = 'Partially Delivered';
        } else if (items.some(i => i.factoryToSgp === 'Shipped')) {
            groupStatus = 'In Transit';
        } else {
            groupStatus = 'Processing';
        }
        
        return {
            salesOrder,
            items,
            totalQty,
            latestDateIssuePI,
            productLine: displayProductLine,
            earliestShipDateObj,
            latestArrivalObj,
            totalDeliveredQty,
            progressPercentage,
            groupStatus,
            // for sorting
            ShipDate: earliestShipDateObj.date,
            actualArrival: latestArrivalObj.date,
            qty: totalQty,
        };
    });

    if (sortConfig !== null) {
        itemsAsArray.sort((a, b) => {
            let aValue: any, bValue: any;
            const key = sortConfig.key;
            
            if (key === 'qty' || key === 'ShipDate' || key === 'actualArrival' || key === 'salesOrder' || key === 'productLine') {
                aValue = a[key];
                bValue = b[key];
            } else if (key === 'dateIssuePI') { 
                aValue = a.latestDateIssuePI; 
                bValue = b.latestDateIssuePI; 
            } else { 
                aValue = a.items[0]?.[key]; 
                bValue = b.items[0]?.[key]; 
            }
            
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;
            
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return itemsAsArray;
  }, [groupedOrders, sortConfig]);

  const toggleOrderExpansion = (salesOrder: string) => {
    setExpandedOrders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(salesOrder)) {
            newSet.delete(salesOrder);
        } else {
            newSet.add(salesOrder);
        }
        return newSet;
    });
  };

  const totalPages = sortedGroups.length > 0 ? Math.ceil(sortedGroups.length / itemsPerPage) : 1;
  const paginatedGroups = sortedGroups.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    exportDataToCsv(orders, [
        { label: 'Sales Order', key: 'salesOrder' }, { label: 'Product Line', key: 'productLine' },
        { label: 'MTM', key: 'mtm' }, { label: 'Model Name', key: 'modelName' }, { label: 'QTY', key: 'qty' },
        { label: 'Order Value', key: 'orderValue' }, { label: 'Factory to SGP', key: 'factoryToSgp' },
        { label: 'SGP to KH Status', key: 'status' }, { label: 'Schedule Ship Date', key: 'ShipDate' },
        { label: 'Order Receipt Date', key: 'dateIssuePI' }, { label: 'ETA', key: 'eta' },
        { label: 'Actual Arrival', key: 'actualArrival' }, { label: 'Delayed (Production)', key: 'isDelayedProduction' },
        { label: 'Delayed (Transit)', key: 'isDelayedTransit' }, { label: 'Is At Risk', key: 'isAtRisk' },
        { label: 'Delivery Number', key: 'deliveryNumber' },
    ], 'lenovo_orders_export.csv');
  };

  if (orders.length === 0) {
    return (
        <div className="text-center py-10">
            <DocumentMagnifyingGlassIcon className="mx-auto h-12 w-12 text-secondary-text dark:text-dark-secondary-text" />
            <h3 className="mt-2 text-sm font-semibold text-primary-text dark:text-dark-primary-text">No matching orders</h3>
            <p className="mt-1 text-sm text-secondary-text dark:text-dark-secondary-text">Try adjusting your filter criteria.</p>
        </div>
    );
  }

  return (
    <div ref={ref}>
      <div className="flex flex-col sm:flex-row justify-end items-center mb-4 gap-4">
        <div className="flex items-center space-x-2">
            <p className="text-sm text-secondary-text dark:text-dark-secondary-text whitespace-nowrap">{orders.length} line items in {sortedGroups.length} orders</p>
            <button onClick={handleExport} disabled={orders.length === 0}
              aria-label="Export filtered order data to a CSV file"
              className="flex items-center px-4 py-2 bg-highlight hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50">
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" aria-hidden="true" /> Export CSV
            </button>
        </div>
      </div>
      
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead className="border-b border-border-color dark:border-dark-border-color">
            <tr>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="salesOrder" isSortable={true} aria-label="Sort by Sales Order Number">Sales Order</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="productLine" isSortable={true} aria-label="Sort by Product Line" className="hidden md:table-cell">Product Line</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="qty" isSortable={true} aria-label="Sort by Quantity" className="text-center">QTY</TableHeader>
              <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-secondary-text dark:text-dark-secondary-text uppercase tracking-wider">Progress</th>
              <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-secondary-text dark:text-dark-secondary-text uppercase tracking-wider">Status</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 text-center text-xs font-semibold text-secondary-text dark:text-dark-secondary-text uppercase tracking-wider">Order Value</th>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="dateIssuePI" isSortable={true} aria-label="Sort by Order Receipt Date" className="hidden lg:table-cell">Order Receipt</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="ShipDate" isSortable={true} aria-label="Sort by Ship Date" className="hidden md:table-cell">Ship Date</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="actualArrival" isSortable={true} aria-label="Sort by Arrival Date">Arrival</TableHeader>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 text-center text-xs font-semibold text-secondary-text dark:text-dark-secondary-text uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-secondary-bg dark:bg-dark-secondary-bg">
            {paginatedGroups.map((group) => {
                const { salesOrder, items, totalQty, productLine, latestDateIssuePI, earliestShipDateObj, latestArrivalObj, groupStatus, progressPercentage, totalDeliveredQty } = group;
                const isExpanded = expandedOrders.has(salesOrder);
                
                return (
                    <Fragment key={salesOrder}>
                        <tr
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          aria-controls={`order-details-${salesOrder}`}
                          className="even:bg-gray-50/60 dark:even:bg-dark-primary-bg hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover border-b border-border-color dark:border-dark-border-color cursor-pointer transition-colors duration-200"
                          onClick={() => toggleOrderExpansion(salesOrder)}
                          onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  toggleOrderExpansion(salesOrder);
                              }
                          }}
                        >
                            <td className="pl-3 pr-4 py-3 whitespace-nowrap text-sm font-medium text-primary-text dark:text-dark-primary-text">
                                <div className="flex items-center">
                                    <ChevronRightIcon className={`h-5 w-5 mr-1 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                    <span className="truncate">{salesOrder}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-text dark:text-dark-secondary-text hidden md:table-cell" title={productLine}>{productLine}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-text dark:text-dark-secondary-text text-center font-medium">{totalQty}</td>
                            <td className="px-4 py-3 text-sm text-secondary-text dark:text-dark-secondary-text min-w-[150px]">
                                <GroupProgressBar progress={progressPercentage} delivered={totalDeliveredQty} total={totalQty} />
                            </td>
                            <td className="px-4 py-3 text-sm text-secondary-text dark:text-dark-secondary-text"><GroupStatusBadge status={groupStatus} /></td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-primary-text dark:text-dark-primary-text font-semibold text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(items.reduce((sum, i) => sum + i.orderValue, 0))}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-text dark:text-dark-secondary-text hidden lg:table-cell">{latestDateIssuePI}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-text dark:text-dark-secondary-text hidden md:table-cell">{renderDateCell(earliestShipDateObj.date, earliestShipDateObj.isEstimate)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-text dark:text-dark-secondary-text">{renderDateCell(latestArrivalObj.date, latestArrivalObj.isEstimate)}</td>
                             <td className="px-4 py-3 text-center">
                                <div className="inline-flex items-center px-3 py-1 text-xs font-semibold leading-5 rounded-full bg-highlight-hover text-highlight dark:bg-dark-highlight-hover dark:text-indigo-300">
                                    {isExpanded ? 'Collapse' : 'Details'}
                                </div>
                            </td>
                        </tr>
                        <tr className="p-0">
                            <td colSpan={10} className="p-0 border-0">
                                <AnimatePresence initial={false}>
                                    {isExpanded && (
                                        <motion.div
                                            key="content"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                            id={`order-details-${salesOrder}`}
                                        >
                                            <div className="bg-gray-100 dark:bg-dark-primary-bg p-4 space-y-3">
                                                {items.map((order) => (
                                                    <div key={order.mtm} className="bg-secondary-bg dark:bg-dark-secondary-bg rounded-md border-b border-gray-200 dark:border-zinc-700/50 last:border-0 sm:border-0">
                                                        {/* This mobile view is now used in the mobile card list as well */}
                                                        <div className="sm:hidden space-y-2 p-3">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <div className="text-sm font-medium text-primary-text dark:text-dark-primary-text flex items-center gap-x-2">
                                                                        {order.modelName}
                                                                        {newModelMtms.has(order.mtm) && <NewModelBadge />}
                                                                    </div>
                                                                    <div className="text-xs text-secondary-text dark:text-dark-secondary-text font-mono">{order.mtm}</div>
                                                                </div>
                                                                <StatusBadge status={order.factoryToSgp} />
                                                            </div>
                                                            <div className="flex justify-between items-center border-t border-border-color dark:border-dark-border-color pt-2 mt-2">
                                                                <div className="text-sm">QTY: <span className="font-bold">{order.qty}</span></div>
                                                                <div className="flex items-center space-x-1">
                                                                    <button onClick={(e) => { e.stopPropagation(); onRowClick(order); }} className="p-2.5 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover" aria-label={`View details for MTM ${order.mtm}`}><DocumentMagnifyingGlassIcon className="h-5 w-5" /></button>
                                                                    <button onClick={(e) => { e.stopPropagation(); onPsrefLookup(order); }} className="p-2.5 rounded-full text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30" aria-label={`View product details for MTM ${order.mtm} on PSREF`}><SparklesIcon className="h-5 w-5" /></button>
                                                                    {order.deliveryNumber && (
                                                                        <button 
                                                                            onClick={(e) => { 
                                                                                e.stopPropagation(); 
                                                                                onTrackShipment(order.deliveryNumber!);
                                                                            }} 
                                                                            className="p-2.5 rounded-full text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30" 
                                                                            aria-label={`Track shipment for MTM ${order.mtm}`}
                                                                            title="Track Shipment"
                                                                        >
                                                                            <TruckIcon className="h-5 w-5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* Desktop View */}
                                                        <div className="hidden sm:grid sm:grid-cols-10 sm:gap-x-4 sm:items-center sm:p-2">
                                                            <div className="col-span-2 text-sm text-secondary-text dark:text-dark-secondary-text font-mono truncate" title={order.mtm}>{order.mtm}</div>
                                                            <div className="col-span-3 text-sm text-secondary-text dark:text-dark-secondary-text truncate" title={order.modelName}>
                                                                <span className="flex items-center gap-x-2">
                                                                    {order.modelName}
                                                                    {newModelMtms.has(order.mtm) && <NewModelBadge />}
                                                                </span>
                                                            </div>
                                                            <div className="col-span-1 text-sm text-secondary-text dark:text-dark-secondary-text text-center">{order.qty}</div>
                                                            <div className="col-span-1 text-sm"><StatusBadge status={order.factoryToSgp} /></div>
                                                            <div className="col-span-3 text-center flex justify-center items-center space-x-2">
                                                                <button onClick={(e) => { e.stopPropagation(); onRowClick(order); }} className="p-1.5 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover hover:text-primary-text dark:hover:text-dark-primary-text transition-colors" aria-label={`View details for MTM ${order.mtm} in order ${order.salesOrder}`} title="View Order Details"><DocumentMagnifyingGlassIcon className="h-5 w-5" /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); onPsrefLookup(order); }} className="p-1.5 rounded-full text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors" aria-label={`View product details for MTM ${order.mtm} on PSREF`} title="View product details on PSREF (new tab)"><SparklesIcon className="h-5 w-5" /></button>
                                                                {order.deliveryNumber && (
                                                                    <button 
                                                                        onClick={(e) => { 
                                                                            e.stopPropagation(); 
                                                                            onTrackShipment(order.deliveryNumber!);
                                                                        }} 
                                                                        className="p-1.5 rounded-full text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors" 
                                                                        aria-label={`Track shipment for MTM ${order.mtm}`} 
                                                                        title="Track Shipment"
                                                                    >
                                                                        <TruckIcon className="h-5 w-5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </td>
                        </tr>
                    </Fragment>
                )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-4">
        {paginatedGroups.map((group) => {
            const { salesOrder, items, totalQty, productLine, latestArrivalObj, groupStatus, progressPercentage, totalDeliveredQty } = group;
            const isExpanded = expandedOrders.has(salesOrder);
            return (
                <Card key={salesOrder} className="p-0 overflow-hidden" onClick={() => toggleOrderExpansion(salesOrder)}>
                     <div className="p-4">
                        <div className="flex justify-between items-start">
                             <div>
                                <div className="flex items-center gap-x-2">
                                    <p className="font-bold text-lg text-primary-text">{salesOrder}</p>
                                </div>
                                <p className="text-sm text-secondary-text mt-1 truncate">{productLine}</p>
                            </div>
                            <ChevronRightIcon className={`h-6 w-6 text-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                        <div className="mt-3">
                            <GroupProgressBar progress={progressPercentage} delivered={totalDeliveredQty} total={totalQty} />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-4 text-center border-t border-border-color pt-3">
                             <div>
                                <p className="text-xs text-secondary-text">Status</p>
                                <div className="mt-1"><GroupStatusBadge status={groupStatus} /></div>
                            </div>
                            <div>
                                <p className="text-xs text-secondary-text">Value</p>
                                <p className="font-bold text-primary-text">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(items.reduce((sum, i) => sum + i.orderValue, 0))}</p>
                            </div>
                            <div>
                                <p className="text-xs text-secondary-text">Arrival</p>
                                <p className="font-bold text-sm text-primary-text">{renderDateCell(latestArrivalObj.date, latestArrivalObj.isEstimate)}</p>
                            </div>
                        </div>
                    </div>
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                key="content-mobile"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-gray-100 dark:bg-dark-primary-bg p-3 space-y-3">
                                    {items.map(order => (
                                        <div key={order.mtm} className="bg-secondary-bg dark:bg-dark-secondary-bg rounded-md p-3">
                                            <div className="sm:hidden space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="text-sm font-medium text-primary-text dark:text-dark-primary-text flex items-center gap-x-2">
                                                            {order.modelName}
                                                            {newModelMtms.has(order.mtm) && <NewModelBadge />}
                                                        </div>
                                                        <div className="text-xs text-secondary-text dark:text-dark-secondary-text font-mono">{order.mtm}</div>
                                                    </div>
                                                    <StatusBadge status={order.factoryToSgp} />
                                                </div>
                                                <div className="flex justify-between items-center border-t border-border-color dark:border-dark-border-color pt-2 mt-2">
                                                    <div className="text-sm">QTY: <span className="font-bold">{order.qty}</span></div>
                                                    <div className="flex items-center space-x-1">
                                                        <button onClick={(e) => { e.stopPropagation(); onRowClick(order); }} className="p-2.5 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover" aria-label={`View details for MTM ${order.mtm}`}><DocumentMagnifyingGlassIcon className="h-5 w-5" /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); onPsrefLookup(order); }} className="p-2.5 rounded-full text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30" aria-label={`View product details for MTM ${order.mtm} on PSREF`}><SparklesIcon className="h-5 w-5" /></button>
                                                        {order.deliveryNumber && (
                                                            <button 
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    onTrackShipment(order.deliveryNumber!);
                                                                }} 
                                                                className="p-2.5 rounded-full text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30" 
                                                                aria-label={`Track shipment for MTM ${order.mtm}`}
                                                                title="Track Shipment"
                                                            >
                                                                <TruckIcon className="h-5 w-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            );
        })}
      </div>

      {/* Pagination */}
      <div className="py-3 flex flex-col sm:flex-row items-center justify-center sm:justify-between border-t border-border-color dark:border-dark-border-color mt-4 gap-4">
        <div>
          <p className="text-sm text-secondary-text dark:text-dark-secondary-text">
              Showing <span className="font-medium">{sortedGroups.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedGroups.length)}</span> of{' '}
              <span className="font-medium">{sortedGroups.length}</span> orders
            </p>
        </div>
        <div className="flex items-center space-x-2">
          <label htmlFor={itemsPerPageId} className="text-sm text-secondary-text dark:text-dark-secondary-text">Rows:</label>
          <select id={itemsPerPageId} value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1 px-2 text-primary-text dark:text-dark-primary-text text-sm focus:ring-highlight focus:border-highlight">
              <option value="10">10</option><option value="25">25</option><option value="50">50</option>
          </select>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p-1))} 
              disabled={currentPage === 1} 
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text hover:bg-gray-50 dark:hover:bg-dark-secondary-bg/50 disabled:opacity-50 transition-colors"
              aria-label="Previous page"
            >
              Prev
            </button>
            <span className="relative inline-flex items-center px-4 py-2 border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text" aria-live="polite" aria-atomic="true">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} 
              disabled={currentPage === totalPages} 
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text hover:bg-gray-50 dark:hover:bg-dark-secondary-bg/50 disabled:opacity-50 transition-colors"
              aria-label="Next page"
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
});

OrderTable.displayName = 'OrderTable';

export default OrderTable;