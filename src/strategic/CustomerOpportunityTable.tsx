
import React, { useState, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CustomerSalesOpportunity, CustomerTier, SalesOpportunity } from '../../types';
import TierBadge from '../customers/TierBadge';
import { ChevronUpIcon, ChevronDownIcon, DocumentMagnifyingGlassIcon, ChevronRightIcon } from '../ui/Icons';
import GeneratePlaybookButton from './GeneratePlaybookButton';
import ProductOpportunityDetailTable from './ProductOpportunityDetailTable';
import Card from '../ui/Card';

type SortKey = keyof Omit<CustomerSalesOpportunity, 'opportunities' | 'customerId'>;
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
    <th scope="col" className={thClassName} onClick={() => onSort(sortKey)} aria-sort={isSorted ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <div className="flex items-center">
        {children}
        <span className="w-4 h-4 ml-1.5">{isSorted ? (sortConfig.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />) : <ChevronUpIcon className="opacity-30 group-hover:opacity-100" />}</span>
      </div>
    </th>
  );
};

const OpportunityScoreCell: React.FC<{ score: number }> = ({ score }) => {
    const getScoreColor = (s: number) => {
        if (s >= 80) return 'bg-red-500 dark:bg-red-600';
        if (s >= 60) return 'bg-orange-500 dark:bg-orange-600';
        if (s >= 40) return 'bg-amber-500 dark:bg-amber-500';
        return 'bg-sky-500 dark:bg-sky-600';
    };
    return (
        <div className="flex items-center gap-x-3">
            <span className="font-semibold w-8 text-right text-primary-text">{score}</span>
            <div className="w-full bg-gray-200 dark:bg-dark-border-color rounded-full h-2">
                <div className={`${getScoreColor(score)} h-2 rounded-full transition-all duration-300`} style={{ width: `${score}%` }}></div>
            </div>
        </div>
    );
};

interface CustomerOpportunityTableProps {
    customerOpportunities: CustomerSalesOpportunity[];
    onGeneratePlaybook: (opportunity: SalesOpportunity | SalesOpportunity[]) => void;
    onPsrefLookup: (item: { mtm: string; modelName: string }) => void;
}

const CustomerOpportunityTable: React.FC<CustomerOpportunityTableProps> = ({ customerOpportunities, onGeneratePlaybook, onPsrefLookup }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'customerOpportunityScore', direction: 'desc' });
    const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

    const toggleExpansion = (customerId: string) => {
        setExpandedCustomers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(customerId)) {
                newSet.delete(customerId);
            } else {
                newSet.add(customerId);
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

    const sortedAndFilteredData = useMemo(() => {
        let filteredData = customerOpportunities.filter(c => 
            c.customerName.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (sortConfig !== null) {
            const tierOrder: Record<CustomerTier, number> = { Platinum: 4, Gold: 3, Silver: 2, Bronze: 1 };
            filteredData.sort((a, b) => {
                let aVal: any, bVal: any;

                if (sortConfig.key === 'customerTier') {
                    aVal = a.customerTier ? tierOrder[a.customerTier] : 0;
                    bVal = b.customerTier ? tierOrder[b.customerTier] : 0;
                } else {
                    aVal = a[sortConfig.key] ?? 0;
                    bVal = b[sortConfig.key] ?? 0;
                }
                
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filteredData;
    }, [customerOpportunities, searchTerm, sortConfig]);
    
    if (customerOpportunities.length === 0) {
        return (
            <div className="text-center py-10">
                <DocumentMagnifyingGlassIcon className="mx-auto h-12 w-12 text-secondary-text" />
                <h3 className="mt-2 text-sm font-semibold text-primary-text">No Opportunities Found</h3>
                <p className="mt-1 text-sm text-secondary-text">No items with surplus stock match past customer purchases.</p>
            </div>
        );
    }
    
    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h3 className="text-lg font-semibold text-primary-text">Customer Opportunities</h3>
                <input
                    type="text"
                    placeholder="Search by customer name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full sm:w-64 bg-secondary-bg border border-border-color rounded-md py-2 px-3 text-primary-text placeholder-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
                />
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-4">
                {sortedAndFilteredData.map(custOp => {
                    const isExpanded = expandedCustomers.has(custOp.customerId);
                    return (
                        <Card key={custOp.customerId} className="p-0 overflow-hidden" onClick={() => toggleExpansion(custOp.customerId)}>
                            <div className="p-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-lg text-primary-text">{custOp.customerName}</p>
                                        <div className="mt-1"><TierBadge tier={custOp.customerTier} /></div>
                                    </div>
                                    <ChevronRightIcon className={`h-6 w-6 text-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                                <div className="mt-3">
                                    <p className="text-xs text-secondary-text">Opportunity Score</p>
                                    <OpportunityScoreCell score={custOp.customerOpportunityScore} />
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-4 text-center border-t border-border-color pt-3">
                                    <div>
                                        <p className="text-xs text-secondary-text">Opportunities</p>
                                        <p className="font-bold text-primary-text">{custOp.opportunityCount}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-secondary-text">Total Value</p>
                                        <p className="font-bold text-primary-text">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(custOp.totalOpportunityValue)}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <GeneratePlaybookButton opportunity={custOp.opportunities} onClick={onGeneratePlaybook} isBulk />
                                </div>
                            </div>
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <ProductOpportunityDetailTable opportunities={custOp.opportunities} onGeneratePlaybook={onGeneratePlaybook} onPsrefLookup={onPsrefLookup} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Card>
                    );
                })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="w-12"></th>
                            <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="customerName">Customer</TableHeader>
                            <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="customerOpportunityScore">Customer Score</TableHeader>
                            <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="opportunityCount" className="text-center">Opportunities</TableHeader>
                            <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalOpportunityValue" className="text-right hidden md:table-cell">Total Value</TableHeader>
                            <th scope="col" className="px-4 py-3.5 text-center text-xs font-semibold text-secondary-text uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredData.map(custOp => {
                            const isExpanded = expandedCustomers.has(custOp.customerId);
                            return (
                                <Fragment key={custOp.customerId}>
                                    <tr className="border-b border-border-color hover:bg-highlight-hover cursor-pointer" onClick={() => toggleExpansion(custOp.customerId)}>
                                        <td className="pl-4">
                                            <ChevronRightIcon className={`h-5 w-5 text-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            <div className="font-medium text-primary-text">{custOp.customerName}</div>
                                            <div className="mt-1"><TierBadge tier={custOp.customerTier} /></div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-text w-56">
                                            <OpportunityScoreCell score={custOp.customerOpportunityScore} />
                                        </td>
                                        <td className="px-4 py-3 text-center font-medium text-primary-text">{custOp.opportunityCount}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-primary-text hidden md:table-cell">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(custOp.totalOpportunityValue)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <GeneratePlaybookButton opportunity={custOp.opportunities} onClick={onGeneratePlaybook} isBulk />
                                        </td>
                                    </tr>
                                    <tr className="p-0">
                                        <td colSpan={6} className="p-0 border-0">
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
                                                        <ProductOpportunityDetailTable opportunities={custOp.opportunities} onGeneratePlaybook={onGeneratePlaybook} onPsrefLookup={onPsrefLookup} />
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
        </>
    );
};

export default CustomerOpportunityTable;