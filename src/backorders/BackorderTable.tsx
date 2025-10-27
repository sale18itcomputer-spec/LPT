

import React, { useState, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BackorderRecommendation, Sale } from '../../types';
import { ChevronUpIcon, ChevronDownIcon, DocumentMagnifyingGlassIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon, ChevronRightIcon, UserGroupIcon } from '../ui/Icons';
import Card from '../ui/Card';

type SortKey = keyof BackorderRecommendation;
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

const PriorityBadge: React.FC<{ priority: 'High' | 'Medium' | 'Low' }> = ({ priority }) => {
    const config = {
        High: { text: 'High', className: 'bg-red-100 text-red-800' },
        Medium: { text: 'Medium', className: 'bg-orange-100 text-orange-800' },
        Low: { text: 'Low', className: 'bg-blue-100 text-blue-800' },
    }[priority];
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>{config.text}</span>
};

const SalesTrendIcon: React.FC<{ trend: 'Increasing' | 'Decreasing' | 'Stable' }> = ({ trend }) => {
    const config = {
        Increasing: { icon: <ArrowTrendingUpIcon className="h-5 w-5 text-green-600"/>, title: 'Sales Trend: Increasing' },
        Decreasing: { icon: <ArrowTrendingDownIcon className="h-5 w-5 text-red-600"/>, title: 'Sales Trend: Decreasing' },
        Stable: { icon: <MinusIcon className="h-5 w-5 text-gray-500"/>, title: 'Sales Trend: Stable' },
    }[trend];
    return <div title={config.title}>{config.icon}</div>;
};

const BackorderTable: React.FC<{ recommendations: BackorderRecommendation[], allSales: Sale[] }> = ({ recommendations, allSales }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'priorityScore', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpansion = (mtm: string) => {
    setExpandedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(mtm)) newSet.delete(mtm);
        else newSet.add(mtm);
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
  
  const sortedAndFilteredData = useMemo(() => {
    let filteredData = [...recommendations];
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filteredData = filteredData.filter(item =>
        item.mtm.toLowerCase().includes(lowercasedFilter) ||
        item.modelName.toLowerCase().includes(lowercasedFilter)
      );
    }
    
    if (sortConfig !== null) {
      filteredData.sort((a, b) => {
        const key = sortConfig.key;
        const aVal = a[key];
        const bVal = b[key];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filteredData;
  }, [recommendations, sortConfig, searchTerm]);

  if (recommendations.length === 0) {
    return (
        <div className="text-center py-10">
            <DocumentMagnifyingGlassIcon className="mx-auto h-12 w-12 text-secondary-text" />
            <h3 className="mt-2 text-sm font-semibold text-primary-text">No Backorder Candidates</h3>
            <p className="mt-1 text-sm text-secondary-text">No out-of-stock items have recent sales demand.</p>
        </div>
    );
  }

  const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h3 className="text-lg font-semibold text-primary-text">Prioritized Re-Order Candidates</h3>
        <input
            type="text"
            placeholder="Search MTM or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full sm:w-64 bg-secondary-bg border border-border-color rounded-md py-2 px-3 text-primary-text placeholder-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
        />
      </div>
      
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="w-12"></th>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="priorityScore">Priority</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="mtm">MTM & Model</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="salesTrend" className="text-center">Sales Trend</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="recentSalesUnits" className="text-center">Sales (90d)</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="affectedCustomers" className="text-center">Affected Cust.</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="estimatedBackorderValue" className="text-right">Est. Backorder Value</TableHeader>
            </tr>
          </thead>
          <tbody className="bg-white">
            {sortedAndFilteredData.map((item) => {
              const isExpanded = expandedItems.has(item.mtm);
              const topBuyers = allSales.filter(s => s.lenovoProductNumber === item.mtm).reduce((acc: Record<string, { units: number, revenue: number, lastDate: string }>, sale) => {
                if(!acc[sale.buyerName]) acc[sale.buyerName] = { units: 0, revenue: 0, lastDate: '1970-01-01' };
                acc[sale.buyerName].units += sale.quantity;
                acc[sale.buyerName].revenue += sale.totalRevenue;
                if(sale.invoiceDate && sale.invoiceDate > acc[sale.buyerName].lastDate) acc[sale.buyerName].lastDate = sale.invoiceDate;
                return acc;
              }, {});
              const sortedTopBuyers = Object.entries(topBuyers).map(([name, data]: [string, { units: number; revenue: number; lastDate: string; }]) => ({ name, ...data })).sort((a,b) => b.revenue - a.revenue).slice(0,5);

              return(
                <Fragment key={item.mtm}>
                  <tr className="border-b border-border-color hover:bg-highlight-hover cursor-pointer" onClick={() => toggleExpansion(item.mtm)}>
                    <td className="pl-4"><ChevronRightIcon className={`h-5 w-5 text-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm"><PriorityBadge priority={item.priority} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="font-medium text-primary-text">{item.mtm}</div>
                        <div className="text-secondary-text truncate max-w-xs">{item.modelName}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center"><SalesTrendIcon trend={item.salesTrend} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium text-primary-text">{(item.recentSalesUnits || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium text-primary-text">{(item.affectedCustomers || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-primary-text">{currencyFormatter(item.estimatedBackorderValue)}</td>
                  </tr>
                  <tr className="p-0">
                    <td colSpan={7} className="p-0 border-0">
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
                                <div className="bg-gray-50/70 p-4">
                                  <div className="flex items-center gap-x-2">
                                    <UserGroupIcon className="h-5 w-5 text-secondary-text"/>
                                    <h4 className="text-sm font-semibold text-primary-text">Top 5 Recent Customers for {item.mtm}</h4>
                                  </div>
                                  <div className="mt-2 space-y-1">
                                    {sortedTopBuyers.map(buyer => (
                                      <div key={buyer.name} className="flex justify-between items-center bg-white p-2 rounded-md text-xs">
                                        <span className="font-medium text-primary-text">{buyer.name}</span>
                                        <div className="flex gap-x-4">
                                            <span>Units: <span className="font-semibold">{buyer.units}</span></span>
                                            <span>Revenue: <span className="font-semibold">{currencyFormatter(buyer.revenue)}</span></span>
                                            <span>Last Buy: <span className="font-semibold">{buyer.lastDate}</span></span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
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
        {sortedAndFilteredData.map(item => {
            const isExpanded = expandedItems.has(item.mtm);
             return (
                <Card key={item.mtm} className="p-4" onClick={() => toggleExpansion(item.mtm)}>
                    <div className="flex justify-between items-start">
                        <div>
                            <PriorityBadge priority={item.priority} />
                            <p className="font-bold text-lg text-primary-text mt-2">{item.modelName}</p>
                            <p className="text-sm font-mono text-secondary-text">{item.mtm}</p>
                        </div>
                         <ChevronRightIcon className={`h-6 w-6 text-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-4 text-center border-t border-border-color pt-3">
                        <div><p className="text-xs text-secondary-text">Sales (90d)</p><p className="font-bold text-primary-text">{item.recentSalesUnits}</p></div>
                        <div><p className="text-xs text-secondary-text">Customers</p><p className="font-bold text-primary-text">{item.affectedCustomers}</p></div>
                        <div><p className="text-xs text-secondary-text">Est. Value</p><p className="font-bold text-primary-text">{currencyFormatter(item.estimatedBackorderValue)}</p></div>
                    </div>
                </Card>
            )
        })}
      </div>
    </>
  );
};

export default BackorderTable;