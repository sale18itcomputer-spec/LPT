
import React, { useState, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { InventoryItem } from '../../types';
import { ChevronUpIcon, ChevronDownIcon, DocumentMagnifyingGlassIcon, ChevronRightIcon, SparklesIcon, ExclamationTriangleIcon } from '../ui/Icons';
import Card from '../ui/Card';

type SortKey = keyof InventoryItem;
type SortOrder = 'asc' | 'desc';
type StockStatusFilter = 'oversold' | 'otw' | 'healthy' | 'lowStock' | 'outOfStock' | 'noSales' | null;

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
}> = ({ onSort, sortConfig, sortKey, children, className = '' }) => {
  const isSorted = sortConfig?.key === sortKey;
  const thClassName = `px-4 py-3.5 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider select-none cursor-pointer group ${className}`;
  
  return (
    <th
      scope="col"
      className={thClassName}
      onClick={() => onSort(sortKey)}
      aria-sort={isSorted ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <div className="flex items-center">
        {children}
        <span className="w-4 h-4 ml-1.5">
          {isSorted ? (
            sortConfig?.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
          ) : <div className="h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity"><ChevronUpIcon/></div>}
        </span>
      </div>
    </th>
  )
};

const WeeksOfInventoryCell: React.FC<{ item: InventoryItem }> = ({ item }) => {
    if (item.onHandQty <= 0) {
        return <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">Out of Stock</span>;
    }
    
    if (typeof item.weeksOfInventory !== 'number' || item.weeksOfInventory < 0) {
        return <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-full">No recent sales</span>;
    }

    const weeks = item.weeksOfInventory;

    let colorClass = '';
    if (weeks < 4) colorClass = 'text-red-800 bg-red-200'; // Critical: < 4 weeks
    else if (weeks <= 12) colorClass = 'text-orange-800 bg-orange-200'; // Warning: 4-12 weeks
    else colorClass = 'text-green-800 bg-green-200'; // Healthy: > 12 weeks

    const weekText = weeks === 1 ? 'week' : 'weeks';

    return (
        <span className={`text-sm font-semibold ${colorClass} px-2 py-0.5 rounded-md`}>
            {weeks < 1 ? '< 1' : weeks.toLocaleString()} {weekText}
        </span>
    );
};

const AgeingCell: React.FC<{ days: number | null }> = ({ days }) => {
    if (days === null || days < 0) {
        return <span className="text-secondary-text">-</span>;
    }

    let colorClass = '';
    if (days > 90) colorClass = 'text-red-800 bg-red-100 dark:bg-red-900/20 dark:text-red-300';
    else if (days > 60) colorClass = 'text-orange-800 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300';
    else if (days > 30) colorClass = 'text-yellow-800 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300';
    else colorClass = 'text-green-800 bg-green-100 dark:bg-green-900/20 dark:text-green-300';

    const dayText = days === 1 ? 'day' : 'days';

    return (
        <span className={`text-xs font-semibold ${colorClass} px-2 py-0.5 rounded-md`}>
            {days} {dayText}
        </span>
    );
};

const ExpandedDetailView: React.FC<{
    item: InventoryItem;
    onPsrefLookup: (item: { mtm: string; modelName: string }) => void;
    userRole: string;
}> = ({ item, onPsrefLookup, userRole }) => (
    <div className="bg-gray-50/70 dark:bg-dark-primary-bg p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
            <h4 className="text-sm font-semibold text-primary-text">Stock Summary</h4>
            <div className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-secondary-text">Total Shipped:</span><span className="font-medium text-primary-text">{item.totalShippedQty.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-secondary-text">Total Arrived:</span><span className="font-medium text-primary-text">{item.totalArrivedQty.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-secondary-text">Last Arrival:</span><span className="font-medium text-primary-text">{item.lastArrivalDate ? new Date(item.lastArrivalDate).toLocaleDateString('en-CA') : 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-secondary-text">Total Sold:</span><span className="font-medium text-primary-text">{item.totalSoldQty.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold border-t pt-2 mt-2 border-border-color"><span className="text-secondary-text">Theoretical Stock:</span><span className="text-primary-text">{(item.totalArrivedQty - item.totalSoldQty).toLocaleString()}</span></div>
            </div>
        </div>
        <div className="md:col-span-1 space-y-4">
            <h4 className="text-sm font-semibold text-primary-text">Serialized Stock Details</h4>
            <div className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-secondary-text">Total Serialized:</span><span className="font-medium text-primary-text">{item.totalSerializedQty.toLocaleString()}</span></div>
                <div className="flex justify-between pl-4 border-l-2 border-gray-200"><span className="text-secondary-text">From Arrived Stock:</span><span className="font-medium text-primary-text">{item.totalArrivedSerializedQty.toLocaleString()}</span></div>
                <div className="flex justify-between pl-4 border-l-2 border-gray-200"><span className="text-secondary-text">From OTW Stock:</span><span className="font-medium text-blue-600">{item.totalOtwSerializedQty.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold border-t pt-2 mt-2 border-border-color"><span className="text-secondary-text">On Hand (Arrived, Unsold):</span><span className="text-primary-text">{item.onHandQty.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-orange-600"><span >Unaccounted Stock:</span><span >{item.unaccountedStockQty.toLocaleString()}</span></div>
            </div>
        </div>
        <div className="md:col-span-1 space-y-4">
            <h4 className="text-sm font-semibold text-primary-text">Valuation & Actions</h4>
            {userRole === 'Admin' && (
                <div className="mt-2 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-secondary-text">On Hand Value:</span><span className="font-medium text-primary-text">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.onHandValue)}</span></div>
                    <div className="flex justify-between"><span className="text-secondary-text">OTW Value:</span><span className="font-medium text-primary-text">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.otwValue)}</span></div>
                    <div className="flex justify-between"><span className="text-secondary-text">Avg. Landing Cost:</span><span className="font-medium text-primary-text">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.averageLandingCost)}</span></div>
                </div>
            )}
             <div className="mt-2 pt-2 border-t border-border-color flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); onPsrefLookup(item); }} className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white text-xs font-semibold rounded-md transition-colors" title={`View product details on PSREF (new tab)`}><SparklesIcon className="h-4 w-4 mr-2" />View PSREF</button>
            </div>
        </div>
    </div>
);


interface InventoryTableProps {
    data: InventoryItem[];
    onPsrefLookup: (item: { mtm: string; modelName: string }) => void;
    userRole: string;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ data, onPsrefLookup, userRole }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'onHandQty', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpansion = (mtm: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mtm)) {
        newSet.delete(mtm);
      } else {
        newSet.add(mtm);
      }
      return newSet;
    });
  };

  const requestSort = (key: SortKey) => {
    let direction: SortOrder = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const sortedData = useMemo(() => {
    let sorted = [...data];
    if (sortConfig !== null) {
      const key = sortConfig.key as keyof InventoryItem;
      sorted.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sorted;
  }, [data, sortConfig]);


  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (data.length === 0) {
    return (
        <div className="text-center py-10">
            <DocumentMagnifyingGlassIcon className="mx-auto h-12 w-12 text-secondary-text" />
            <h3 className="mt-2 text-sm font-semibold text-primary-text">No inventory items match your criteria.</h3>
            <p className="mt-1 text-sm text-secondary-text">Try adjusting your search or filters.</p>
        </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h3 className="text-lg font-semibold text-primary-text">Inventory Details</h3>
      </div>
      
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-dark-secondary-bg/20">
            <tr>
              <th scope="col" className="w-12"></th>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="mtm">MTM</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="modelName" className="hidden lg:table-cell">Model Name</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="otwQty" className="text-center">OTW</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="onHandQty" className="text-center">On Hand (Serialized)</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="unaccountedStockQty" className="text-center">Unaccounted</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="weeksOfInventory" className="text-center">Weeks of Inv.</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="daysSinceLastArrival" className="text-center">Ageing</TableHeader>
              {userRole === 'Admin' && (
                <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="onHandValue" className="text-right hidden lg:table-cell">On Hand Value</TableHeader>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-secondary-bg">
            {paginatedData.map((item) => {
              const onHandClass = item.onHandQty < 0 ? 'text-red-600 font-bold' : item.onHandQty === 0 ? 'text-secondary-text' : 'text-primary-text';
              const rowClass = item.unaccountedStockQty !== 0 ? 'bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20' : 'hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover';
              const isExpanded = expandedItems.has(item.mtm);
              const unaccountedStockClass = item.unaccountedStockQty !== 0 ? 'font-bold text-orange-600' : 'text-secondary-text';

              return (
                <Fragment key={item.mtm}>
                  <tr className={`border-b border-border-color dark:border-dark-border-color cursor-pointer transition-colors ${rowClass}`} onClick={() => toggleExpansion(item.mtm)}>
                    <td className="pl-4 border-l-4" style={{ borderColor: item.unaccountedStockQty !== 0 ? '#F97316' : 'transparent' }}>
                      <ChevronRightIcon className={`h-5 w-5 text-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary-text">{item.mtm}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-text truncate max-w-xs hidden lg:table-cell">{item.modelName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-blue-600 font-medium">
                      {item.otwQty > 0 ? item.otwQty.toLocaleString() : '-'}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-center font-medium ${onHandClass}`}>
                      {(item.onHandQty || 0).toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-center font-medium ${unaccountedStockClass}`}>
                        {item.unaccountedStockQty !== 0 && (
                            <span className="flex items-center justify-center" title="Discrepancy between theoretical stock and serialized on-hand stock.">
                                <ExclamationTriangleIcon className="h-4 w-4 mr-1"/>
                                {item.unaccountedStockQty.toLocaleString()}
                            </span>
                        )}
                        {item.unaccountedStockQty === 0 && '0'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <WeeksOfInventoryCell item={item} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <AgeingCell days={item.daysSinceLastArrival} />
                    </td>
                    {userRole === 'Admin' && (
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold hidden lg:table-cell ${onHandClass}`}>
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.onHandValue)}
                        </td>
                    )}
                  </tr>
                  <tr className="p-0">
                    <td colSpan={userRole === 'Admin' ? 9 : 8} className="p-0 border-0">
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              key="content"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                                <ExpandedDetailView item={item} onPsrefLookup={onPsrefLookup} userRole={userRole} />
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
        {paginatedData.map((item) => {
            const isExpanded = expandedItems.has(item.mtm);
            const onHandClass = item.onHandQty < 0 ? 'text-red-600' : item.onHandQty === 0 ? 'text-secondary-text' : 'text-primary-text';
            const cardBorderClass = item.unaccountedStockQty !== 0 ? 'border-l-4 border-orange-500' : '';

            return (
                <Card key={item.mtm} className={`p-0 overflow-hidden ${cardBorderClass}`} onClick={() => toggleExpansion(item.mtm)}>
                    <div className="p-4">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-primary-text">{item.modelName}</p>
                                <p className="text-sm font-mono text-secondary-text">{item.mtm}</p>
                            </div>
                            <ChevronRightIcon className={`h-6 w-6 text-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4 text-center border-t border-border-color pt-3">
                            <div>
                                <p className="text-xs text-secondary-text">On Hand</p>
                                <p className={`font-bold text-lg ${onHandClass}`}>{item.onHandQty.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-secondary-text">OTW</p>
                                <p className="font-bold text-lg text-blue-600">{item.otwQty > 0 ? item.otwQty.toLocaleString() : '-'}</p>
                            </div>
                        </div>
                        <div className="mt-3 text-center">
                            <WeeksOfInventoryCell item={item} />
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
                                <ExpandedDetailView item={item} onPsrefLookup={onPsrefLookup} userRole={userRole} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            );
        })}
      </div>

      <div className="py-3 flex flex-col sm:flex-row items-center justify-center sm:justify-between border-t border-border-color dark:border-dark-border-color mt-4 gap-4">
        <div>
          <p className="text-sm text-secondary-text dark:text-dark-secondary-text">
              Showing <span className="font-medium">{sortedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedData.length)}</span> of{' '}
              <span className="font-medium">{sortedData.length}</span> items
            </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-secondary-text dark:text-dark-secondary-text">Rows:</span>
          <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1 px-2 text-primary-text dark:text-dark-primary-text text-sm focus:ring-highlight focus:border-highlight">
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
          </select>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text hover:bg-gray-50 dark:hover:bg-dark-primary-bg disabled:opacity-50 transition-colors">Prev</button>
            <span className="relative inline-flex items-center px-4 py-2 border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text hover:bg-gray-50 dark:hover:bg-dark-primary-bg disabled:opacity-50 transition-colors">Next</button>
          </nav>
        </div>
      </div>
    </>
  );
};

export default InventoryTable;
