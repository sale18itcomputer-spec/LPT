
import React, { useState, useMemo, Fragment, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Sale, DashboardType } from '../../types';
import { exportDataToCsv } from '../../utils/csv';
import { 
    ChevronUpIcon, 
    ChevronDownIcon, 
    DocumentMagnifyingGlassIcon, 
    ArrowDownTrayIcon, 
    ChevronRightIcon
} from '../ui/Icons';
import Card from '../ui/Card';

interface AugmentedInvoice {
    invoiceNumber: string;
    items: Sale[];
    totalQuantity: number;
    totalRevenue: number;
    invoiceDate: string | null;
    buyerName: string;
    itemCount: number;
}
type SortKey = keyof Omit<AugmentedInvoice, 'items'>;
type SortOrder = 'asc' | 'desc';
interface SortConfig {
  key: SortKey;
  direction: SortOrder;
}

const TableHeader: React.FC<{
  onSort: (key: SortKey) => void;
  sortConfig: SortConfig | null;
  sortKey: SortKey;
  children: React.ReactNode;
  className?: string;
}> = ({ onSort, sortConfig, sortKey, children, className = '' }) => {
  const isSorted = sortConfig?.key === sortKey;
  const thClassName = `px-4 py-3.5 text-xs font-semibold text-secondary-text dark:text-dark-secondary-text uppercase tracking-wider select-none cursor-pointer group ${className || 'text-left'}`;
  return (
    <th scope="col" className={thClassName} onClick={() => onSort(sortKey)} aria-sort={isSorted ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <div className={`flex items-center ${className.includes('text-right') ? 'justify-end' : ''}`}>{children}<span className="w-4 h-4 ml-1.5 flex-shrink-0">{isSorted ? (sortConfig.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />) : <ChevronUpIcon className="opacity-30 group-hover:opacity-100" />}</span></div>
    </th>
  );
};

const ExpandedDetailView: React.FC<{ items: Sale[] }> = ({ items }) => (
    <div className="bg-slate-50/70 dark:bg-dark-primary-bg p-2 md:p-4 space-y-2">
        {items.map(item => (
            <div key={item.serialNumber} className="bg-secondary-bg dark:bg-dark-secondary-bg p-3 rounded-lg text-sm border border-border-color dark:border-dark-border-color">
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-primary-text dark:text-dark-primary-text truncate">{item.modelName}</p>
                        <p className="text-xs font-mono text-secondary-text dark:text-dark-secondary-text">{item.lenovoProductNumber}</p>
                    </div>
                    <p className="ml-4 font-medium text-primary-text dark:text-dark-primary-text text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.unitPrice)}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-border-color dark:border-dark-border-color flex justify-between text-xs text-secondary-text dark:text-dark-secondary-text">
                    <span>Serial: <span className="font-mono text-primary-text dark:text-dark-primary-text">{item.serialNumber}</span></span>
                    <span>Segment: <span className="font-medium text-primary-text dark:text-dark-primary-text">{item.segment}</span></span>
                </div>
            </div>
        ))}
    </div>
);


interface SalesTableProps {
  sales: Sale[];
}

const SalesTable: React.FC<SalesTableProps> = ({ sales }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'invoiceDate', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  const itemsPerPageId = useId();

  const groupedSales: AugmentedInvoice[] = useMemo(() => {
    const invoices = sales.reduce((acc: Record<string, AugmentedInvoice>, sale) => {
        if (!acc[sale.invoiceNumber]) {
            acc[sale.invoiceNumber] = { invoiceNumber: sale.invoiceNumber, items: [], totalQuantity: 0, totalRevenue: 0, invoiceDate: sale.invoiceDate, buyerName: sale.buyerName, itemCount: 0 };
        }
        acc[sale.invoiceNumber].items.push(sale);
        acc[sale.invoiceNumber].totalQuantity += sale.quantity;
        acc[sale.invoiceNumber].totalRevenue += sale.totalRevenue;
        return acc;
    }, {} as Record<string, AugmentedInvoice>);
    Object.values(invoices).forEach((inv: AugmentedInvoice) => (inv.itemCount = inv.items.length));
    return Object.values(invoices);
  }, [sales]);

  const requestSort = (key: SortKey) => {
    let direction: SortOrder = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedInvoices = useMemo(() => {
    let sorted = [...groupedSales];
    if (sortConfig) {
        sorted.sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            const comparison = typeof aVal === 'number' && typeof bVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
    }
    return sorted;
  }, [groupedSales, sortConfig]);

  const toggleInvoiceExpansion = (invoiceNumber: string) => {
    setExpandedInvoices(prev => {
        const newSet = new Set(prev);
        if (newSet.has(invoiceNumber)) newSet.delete(invoiceNumber);
        else newSet.add(invoiceNumber);
        return newSet;
    });
  };

  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);
  const paginatedInvoices = sortedInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    exportDataToCsv(sales, [
        { label: 'Invoice Number', key: 'invoiceNumber' }, { label: 'Invoice Date', key: 'invoiceDate' },
        { label: 'Buyer Name', key: 'buyerName' }, { label: 'Buyer ID', key: 'buyerId' },
        { label: 'Segment', key: 'segment' }, { label: 'Lenovo Product Number', key: 'lenovoProductNumber' },
        { label: 'Model Name', key: 'modelName' }, { label: 'Serial Number', key: 'serialNumber' },
        { label: 'Quantity', key: 'quantity' }, { label: 'Unit Price', key: 'unitPrice' },
        { label: 'Total Revenue', key: 'totalRevenue' }, { label: 'Currency', key: 'localCurrency' },
    ], 'sales_export.csv');
  };

  if (sales.length === 0) {
    return (
        <Card>
            <div className="text-center py-10"><DocumentMagnifyingGlassIcon className="mx-auto h-12 w-12 text-secondary-text" /><h3 className="mt-2 text-sm font-semibold text-primary-text">No matching sales</h3><p className="mt-1 text-sm text-secondary-text">Try adjusting your filter criteria.</p></div>
        </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div>
            <h3 className="text-xl font-semibold text-primary-text dark:text-dark-primary-text">Invoice Details</h3>
            <p className="text-sm text-secondary-text dark:text-dark-secondary-text">{sales.length.toLocaleString()} line items across {groupedSales.length.toLocaleString()} invoices</p>
        </div>
        <button onClick={handleExport} disabled={sales.length === 0} className="flex items-center px-4 py-2 bg-highlight hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"><ArrowDownTrayIcon className="h-4 w-4 mr-2" /> Export CSV</button>
      </div>
      
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-dark-secondary-bg/50">
            <tr>
              <th className="w-12"></th>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="invoiceNumber">Invoice</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="buyerName">Buyer</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="itemCount" className="text-center">Items</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalQuantity" className="text-center">Total QTY</TableHeader>
              <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalRevenue" className="text-right">Total Revenue</TableHeader>
            </tr>
          </thead>
          <tbody className="bg-secondary-bg dark:bg-dark-secondary-bg">
            {paginatedInvoices.map((group) => {
                const { invoiceNumber, invoiceDate, buyerName, itemCount, totalQuantity, totalRevenue, items } = group;
                const isExpanded = expandedInvoices.has(invoiceNumber);
                return (
                    <Fragment key={invoiceNumber}>
                        <tr className="border-b border-border-color dark:border-dark-border-color hover:bg-gray-50 dark:hover:bg-dark-primary-bg cursor-pointer" onClick={() => toggleInvoiceExpansion(invoiceNumber)}>
                            <td className="px-4 py-3 text-center"><ChevronRightIcon className={`h-5 w-5 text-secondary-text dark:text-dark-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} /></td>
                            <td className="px-4 py-3 text-sm"><div className="font-medium text-primary-text dark:text-dark-primary-text">{invoiceNumber}</div><div className="text-xs text-secondary-text dark:text-dark-secondary-text">{invoiceDate}</div></td>
                            <td className="px-4 py-3 text-sm text-secondary-text dark:text-dark-secondary-text">{buyerName}</td>
                            <td className="px-4 py-3 text-center text-sm text-secondary-text dark:text-dark-secondary-text">{itemCount}</td>
                            <td className="px-4 py-3 text-center text-sm font-medium text-primary-text dark:text-dark-primary-text">{totalQuantity}</td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-primary-text dark:text-dark-primary-text">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalRevenue)}</td>
                        </tr>
                        <tr className="p-0"><td colSpan={6} className="p-0 border-0"><AnimatePresence>{isExpanded && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><ExpandedDetailView items={items} /></motion.div>}</AnimatePresence></td></tr>
                    </Fragment>
                )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-4">
        {paginatedInvoices.map((group) => {
            const { invoiceNumber, invoiceDate, buyerName, totalQuantity, totalRevenue, items } = group;
            const isExpanded = expandedInvoices.has(invoiceNumber);
            return (
                <Card key={invoiceNumber} className="p-0 overflow-hidden" onClick={() => toggleInvoiceExpansion(invoiceNumber)}>
                     <div className="p-4">
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="font-bold text-lg text-primary-text dark:text-dark-primary-text">{invoiceNumber}</p>
                                <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1">{buyerName}</p>
                                <p className="text-xs text-secondary-text dark:text-dark-secondary-text">{invoiceDate}</p>
                            </div>
                            <ChevronRightIcon className={`h-6 w-6 text-secondary-text dark:text-dark-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4 text-center border-t border-border-color dark:border-dark-border-color pt-3">
                             <div>
                                <p className="text-xs text-secondary-text dark:text-dark-secondary-text">Total Qty</p>
                                <p className="font-bold text-primary-text dark:text-dark-primary-text">{totalQuantity}</p>
                            </div>
                            <div>
                                <p className="text-xs text-secondary-text dark:text-dark-secondary-text">Total Revenue</p>
                                <p className="font-bold text-primary-text dark:text-dark-primary-text">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalRevenue)}</p>
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
                                <ExpandedDetailView items={items} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            );
        })}
      </div>

      {totalPages > 1 && (
        <div className="py-3 flex flex-col sm:flex-row items-center justify-center sm:justify-between border-t border-border-color dark:border-dark-border-color mt-4 gap-4">
            <div><p className="text-sm text-secondary-text dark:text-dark-secondary-text">Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, sortedInvoices.length)}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedInvoices.length)}</span> of <span className="font-medium">{sortedInvoices.length}</span> invoices</p></div>
            <div className="flex items-center space-x-2">
                <label htmlFor={itemsPerPageId} className="text-sm text-secondary-text dark:text-dark-secondary-text">Rows:</label>
                <select id={itemsPerPageId} value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1 px-2 text-primary-text dark:text-dark-primary-text text-sm focus:ring-highlight focus:border-highlight">
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="500">500</option>
                </select>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text hover:bg-gray-50 dark:hover:bg-dark-primary-bg disabled:opacity-50">Prev</button><span className="relative inline-flex items-center px-4 py-2 border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text">{currentPage} / {totalPages}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text hover:bg-gray-50 dark:hover:bg-dark-primary-bg disabled:opacity-50">Next</button></nav>
            </div>
        </div>
      )}
    </Card>
  );
};

export default SalesTable;
