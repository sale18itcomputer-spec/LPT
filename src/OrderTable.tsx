
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
  
  const sortableGroupKeys: SortKey[] = ['salesOrder', 'qty', 'ShipDate', 'actualArrival', 'dateIssuePI'];

  const sortedGroups = useMemo(() => {
    const itemsAsArray = Object.entries(groupedOrders).map(([salesOrder, items]: [string, Order[]]) => {
        const latestDateIssuePI = items.reduce((latest, i) => (i.dateIssuePI && (!latest || i.dateIssuePI > latest)) ? i.dateIssuePI : latest, items[0]?.dateIssuePI || null);
        
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        
        const getEarliestShip = () => {
            const dates = items.map(i => {
                if (i.isDelayedProduction) return { date: todayStr, isEstimate: true };
                if (i.ShipDate) return { date: i.ShipDate, isEstimate: false };
                return { date: null, isEstimate: false };
            }).filter(d => d.date);

            if (dates.length === 0) return { date: null, isEstimate: false };

            const earliest = dates.reduce((earliest, current) => {
                if (!earliest.date) return current;
                if (!current.date) return earliest;
                return new Date(current.date) < new Date(earliest.date) ? current : earliest;
            });

            return earliest;
        };
        const earliestShip = getEarliestShip();
        
        const getLatestArrival = () => {
            const dates = items.map(i => {
                if (i.isDelayedTransit) return { date: addDays(todayStr, 7), isEstimate: true };
                if (i.actualArrival) return { date: i.actualArrival, isEstimate: false };
                if (i.eta) return { date: i.eta, isEstimate: true };
                return { date: null, isEstimate: false };
            }).filter(d => d.date);

            if (dates.length === 0) return { date: null, isEstimate: false };
            
            const latest = dates.reduce((latest, current) => {
                if (!latest.date) return current;
                if (!current.date) return latest;
                return new Date(current.date) > new Date(latest.date) ? current : latest;
            });
            return latest;
        };
        const latestArrival = getLatestArrival();

        const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
        const deliveredQty = items.filter(i => i.actualArrival).reduce((sum, i) => sum + i.qty, 0);
        const progress = totalQty > 0 ? (deliveredQty / totalQty) * 100 : 0;
        
        const hasDelayed = items.some(i => i.isDelayedProduction || i.isDelayedTransit);
        const isDelivered = progress === 100;
        const inTransit = items.some(i => i.factoryToSgp === 'Shipped' && !i.actualArrival);
        const processing = items.some(i => !['Shipped', 'Delivered', 'Cancelled'].includes(i.factoryToSgp));
        const hasCancelled = items.some(i => i.factoryToSgp === 'Cancelled');
        
        const getGroupStatus = (): 'Delivered' | 'Partially Delivered' | 'In Transit' | 'Processing' | 'Delayed' | 'Cancelled' => {
            if (hasCancelled && items.every(i => i.factoryToSgp === 'Cancelled')) return 'Cancelled';
            if (hasDelayed) return 'Delayed';
            if (isDelivered) return 'Delivered';
            if (progress > 0) return 'Partially Delivered';
            if (inTransit) return 'In Transit';
            return 'Processing';
        };

        const group: any = {
          salesOrder: salesOrder,
          items: items,
          itemCount: items.length,
          dateIssuePI: latestDateIssuePI,
          ShipDate: earliestShip.date,
          shipIsEstimate: earliestShip.isEstimate,
          actualArrival: latestArrival.date,
          arrivalIsEstimate: latestArrival.isEstimate,
          totalQty: totalQty,
          deliveredQty: deliveredQty,
          progress: progress,
          status: getGroupStatus(),
        };

        return group;
    });

    if (sortConfig !== null) {
      const { key, direction } = sortConfig;
      itemsAsArray.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        const comparison = typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
          
        return direction === 'asc' ? comparison : -comparison;
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

  const totalPages = Math.ceil(sortedGroups.length / itemsPerPage);
  const paginatedGroups = sortedGroups.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    const headers = [
      { label: "Sales Order", key: "salesOrder" },
      { label: "MTM", key: "mtm" },
      { label: "Model Name", key: "modelName" },
      { label: "Specification", key: "specification" },
      { label: "Quantity", key: "qty" },
      { label: "FOB Unit Price", key: "fobUnitPrice" },
      { label: "Landing Cost Unit Price", key: "landingCostUnitPrice" },
      { label: "Order Value", key: "orderValue" },
      { label: "Factory to SGP", key: "factoryToSgp" },
      { label: "SGP to KH", key: "status" },
      { label: "Order Receipt Date", key: "dateIssuePI" },
      { label: "Scheduled Ship Date", key: "ShipDate" },
      { label: "ETA", key: "eta" },
      { label: "Actual Arrival", key: "actualArrival" },
      { label: "Delivery Number", key: "deliveryNumber" },
      { label: "isDelayedProduction", key: "isDelayedProduction" },
      { label: "isDelayedTransit", key: "isDelayedTransit" },
      { label: "isAtRisk", key: "isAtRisk" },
    ];
    exportDataToCsv(orders, headers, 'orders_export.csv');
  };

  if (orders.length === 0) {
    return (
      <Card>
        <div className="text-center py-10">
          <DocumentMagnifyingGlassIcon className="mx-auto h-12 w-12 text-secondary-text dark:text-dark-secondary-text" />
          <h3 className="mt-2 text-sm font-semibold text-primary-text dark:text-dark-primary-text">No matching orders</h3>
          <p className="mt-1 text-sm text-secondary-text dark:text-dark-secondary-text">Try adjusting your filter criteria.</p>
        </div>
      </Card>
    );
  }

  return (
    <div ref={ref}>
      <div className="sm:flex sm:items-center sm:justify-between mb-4">
        <p className="text-sm text-secondary-text dark:text-dark-secondary-text">
            Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, sortedGroups.length)}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedGroups.length)}</span> of <span className="font-medium">{sortedGroups.length}</span> orders
        </p>
        <div className="mt-3 sm:mt-0 sm:ml-4">
            <button
                type="button"
                onClick={handleExport}
                disabled={orders.length === 0}
                className="inline-flex items-center px-4 py-2 bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color text-sm font-medium rounded-md shadow-sm text-primary-text dark:text-dark-primary-text hover:bg-gray-50 dark:hover:bg-dark-primary-bg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-highlight disabled:opacity-50"
            >
                <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" />
                Export CSV
            </button>
        </div>
      </div>
      
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="w-12"></th>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="salesOrder" isSortable={true} aria-label="Sales Order">Sales Order</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="dateIssuePI" isSortable={true}>Date Issued</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="ShipDate" isSortable={true}>Est. Ship</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="actualArrival" isSortable={true}>Arrival</TableHeader>
              <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-secondary-text dark:text-dark-secondary-text uppercase tracking-wider">Status</th>
              <th scope="col" className="relative px-4 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-secondary-bg">
            {paginatedGroups.map((group) => {
              const {
                salesOrder,
                items,
                itemCount,
                dateIssuePI,
                ShipDate,
                shipIsEstimate,
                actualArrival,
                arrivalIsEstimate,
                totalQty,
                deliveredQty,
                progress,
                status
              } = group;
              const isExpanded = expandedOrders.has(salesOrder);
              
              return (
                <Fragment key={salesOrder}>
                  <tr className="border-b border-border-color dark:border-dark-border-color hover:bg-gray-50 dark:hover:bg-dark-primary-bg cursor-pointer" onClick={() => toggleOrderExpansion(salesOrder)}>
                    <td className="px-4 py-3 text-center">
                        <ChevronRightIcon className={`h-5 w-5 text-secondary-text dark:text-dark-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-primary-text dark:text-dark-primary-text">{salesOrder}</div>
                        <div className="text-xs text-secondary-text dark:text-dark-secondary-text">{itemCount} line item{itemCount !== 1 && 's'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-text dark:text-dark-secondary-text">{dateIssuePI}</td>
                    <td className="px-4 py-3 text-sm text-secondary-text dark:text-dark-secondary-text">{renderDateCell(ShipDate, shipIsEstimate)}</td>
                    <td className="px-4 py-3 text-sm text-secondary-text dark:text-dark-secondary-text">{renderDateCell(actualArrival, arrivalIsEstimate)}</td>
                    <td className="px-4 py-3 text-sm">
                        <div className="w-40"><GroupStatusBadge status={status} /></div>
                    </td>
                    <td className="px-4 py-3">
                        <GroupProgressBar progress={progress} delivered={deliveredQty} total={totalQty} />
                    </td>
                  </tr>
                  <tr className="p-0">
                      <td colSpan={7} className="p-0 border-0">
                          <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-slate-50/70 dark:bg-dark-primary-bg p-2 space-y-1">
                                        {items.map(item => (
                                            <div key={item.mtm} className="bg-secondary-bg dark:bg-dark-secondary-bg p-2 rounded-md flex justify-between items-center text-xs border border-border-color dark:border-dark-border-color">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-primary-text dark:text-dark-primary-text truncate">{item.modelName} ({item.mtm})</p>
                                                    <div className="flex items-center gap-x-3 text-secondary-text dark:text-dark-secondary-text mt-1">
                                                        <span>QTY: <span className="font-medium">{item.qty}</span></span>
                                                        <StatusBadge status={item.factoryToSgp} />
                                                        {newModelMtms.has(item.mtm) && <NewModelBadge />}
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0 ml-4 flex items-center gap-x-2">
                                                    <button onClick={(e) => { e.stopPropagation(); onPsrefLookup(item); }} className="p-1.5 rounded-full text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors" title={`View product details for MTM ${item.mtm} on PSREF (new tab)`}><SparklesIcon className="h-4 w-4" /></button>
                                                    {item.deliveryNumber && <button onClick={(e) => { e.stopPropagation(); onTrackShipment(item.deliveryNumber!); }} className="p-1.5 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors" title={`Track Delivery ${item.deliveryNumber}`}><TruckIcon className="h-4 w-4" /></button>}
                                                    <button onClick={(e) => { e.stopPropagation(); onRowClick(item); }} className="p-1.5 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-gray-200 dark:hover:bg-dark-secondary-bg/50 transition-colors" title="View full details"><DocumentMagnifyingGlassIcon className="h-4 w-4" /></button>
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
        {paginatedGroups.map(group => {
          const { salesOrder, dateIssuePI, status, progress, totalQty, deliveredQty, items } = group;
          const isExpanded = expandedOrders.has(salesOrder);

          return (
            <Card key={salesOrder} className="p-0 overflow-hidden" onClick={() => toggleOrderExpansion(salesOrder)}>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg text-primary-text dark:text-dark-primary-text">{salesOrder}</p>
                    <p className="text-xs text-secondary-text dark:text-dark-secondary-text">{dateIssuePI}</p>
                  </div>
                  <ChevronRightIcon className={`h-6 w-6 text-secondary-text dark:text-dark-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
                <div className="mt-4">
                  <GroupProgressBar progress={progress} delivered={deliveredQty} total={totalQty} />
                </div>
                <div className="mt-2 flex justify-start">
                  <GroupStatusBadge status={status} />
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
                     <div className="bg-slate-50/70 dark:bg-dark-primary-bg p-2 space-y-1">
                        {items.map(item => (
                            <div key={item.mtm} className="bg-secondary-bg dark:bg-dark-secondary-bg p-2 rounded-md flex justify-between items-center text-xs border border-border-color dark:border-dark-border-color">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-primary-text dark:text-dark-primary-text truncate">{item.modelName} ({item.mtm})</p>
                                    <div className="flex items-center gap-x-3 text-secondary-text dark:text-dark-secondary-text mt-1">
                                        <span>QTY: <span className="font-medium">{item.qty}</span></span>
                                        <StatusBadge status={item.factoryToSgp} />
                                        {newModelMtms.has(item.mtm) && <NewModelBadge />}
                                    </div>
                                </div>
                                <div className="flex-shrink-0 ml-2 flex items-center gap-x-1">
                                    <button onClick={(e) => { e.stopPropagation(); onPsrefLookup(item); }} className="p-2 rounded-full text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors" title={`View on PSREF`}><SparklesIcon className="h-4 w-4" /></button>
                                     {item.deliveryNumber && <button onClick={(e) => { e.stopPropagation(); onTrackShipment(item.deliveryNumber!); }} className="p-2 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors" title={`Track Delivery`}><TruckIcon className="h-4 w-4" /></button>}
                                    <button onClick={(e) => { e.stopPropagation(); onRowClick(item); }} className="p-2 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-gray-200 dark:hover:bg-dark-secondary-bg/50 transition-colors" title="View details"><DocumentMagnifyingGlassIcon className="h-4 w-4" /></button>
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
      {totalPages > 1 && (
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
                <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text hover:bg-gray-50 dark:hover:bg-dark-primary-bg disabled:opacity-50 transition-colors">Prev</button>
                <span className="relative inline-flex items-center px-4 py-2 border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text hover:bg-gray-50 dark:hover:bg-dark-primary-bg disabled:opacity-50 transition-colors">Next</button>
              </nav>
            </div>
        </div>
      )}
    </div>
  );
});

OrderTable.displayName = 'OrderTable';

export default OrderTable;
