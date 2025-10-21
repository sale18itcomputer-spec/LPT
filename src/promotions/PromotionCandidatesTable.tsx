

import React, { useState, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PromotionCandidate, PromotionPlan } from '../../types';
import { ChevronUpIcon, ChevronDownIcon, SparklesIcon, DocumentMagnifyingGlassIcon, ExclamationTriangleIcon, LightBulbIcon, TruckIcon, ChevronRightIcon } from '../ui/Icons';
import PromotionPlanDetail from './PromotionPlanDetail';
import Card from '../ui/Card';

type SortKey = keyof PromotionCandidate;
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
  isSortable?: boolean,
}> = ({ onSort, sortConfig, sortKey, children, className = '', isSortable = true }) => {
  const isSorted = isSortable && sortConfig?.key === sortKey;
  return (
    <th
      scope="col"
      className={`px-4 py-3.5 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider select-none ${isSortable ? 'cursor-pointer group' : ''} ${className}`}
      onClick={isSortable ? () => onSort(sortKey) : undefined}
      aria-sort={isSorted ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <div className="flex items-center">
        {children}
        {isSortable && <span className="w-4 h-4 ml-1.5">{isSorted ? (sortConfig.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />) : <ChevronUpIcon className="opacity-30 group-hover:opacity-100" />}</span>}
      </div>
    </th>
  );
};

const priorityConfig: Record<PromotionCandidate['priority'], { icon: React.FC<any>, className: string, label: string }> = {
    Urgent: { icon: ExclamationTriangleIcon, className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', label: 'Urgent' },
    Recommended: { icon: LightBulbIcon, className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300', label: 'Recommended' },
    'Pre-Launch': { icon: TruckIcon, className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', label: 'Pre-Launch' },
    Optional: { icon: SparklesIcon, className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', label: 'Optional' },
};

const PriorityCell: React.FC<{ priority: PromotionCandidate['priority'] }> = ({ priority }) => {
    const config = priorityConfig[priority];
    if (!config) return null;
    const Icon = config.icon;
    return (
        <span className={`inline-flex items-center gap-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.className}`}>
            <Icon className="h-4 w-4" />
            {config.label}
        </span>
    );
};

const InStockCell: React.FC<{ quantity: number }> = ({ quantity }) => {
    // Normalize stock for visualization, e.g., cap at 100 for a reasonable bar length
    const maxVisualStock = 100;
    const percentage = Math.min((quantity / maxVisualStock) * 100, 100);
    const barColor = quantity > 50 ? 'bg-green-500' : quantity > 20 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="flex items-center gap-x-3 justify-center">
            <span className="font-semibold w-8 text-right">{quantity.toLocaleString()}</span>
            <div className="w-24 bg-gray-200 dark:bg-dark-border-color rounded-full h-2">
                <div className={`${barColor} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

const CandidateDetail: React.FC<{ candidate: PromotionCandidate; userRole: string; }> = ({ candidate, userRole }) => (
    <div className="bg-slate-50/70 dark:bg-dark-primary-bg p-4">
        <h4 className="text-sm font-semibold text-primary-text">Strategic Description</h4>
        <p className="mt-1 text-sm text-secondary-text italic">"{candidate.reasoning}"</p>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
                <div className="text-xs text-secondary-text">Weeks of Inventory</div>
                <div className="font-semibold text-primary-text">{candidate.weeksOfInventory ?? 'N/A'}</div>
            </div>
            <div>
                <div className="text-xs text-secondary-text">Days Since Last Sale</div>
                <div className="font-semibold text-primary-text">{candidate.daysSinceLastSale ?? 'N/A'}</div>
            </div>
            {userRole === 'Admin' && (
                 <div>
                    <div className="text-xs text-secondary-text">In-Stock Value</div>
                    <div className="font-semibold text-primary-text">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(candidate.inStockValue)}</div>
                </div>
            )}
            {userRole === 'Admin' && (
                 <div>
                    <div className="text-xs text-secondary-text">OTW Value</div>
                    <div className="font-semibold text-primary-text">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(candidate.otwValue)}</div>
                </div>
            )}
        </div>
    </div>
);


interface PromotionCandidatesTableProps {
    candidates: PromotionCandidate[];
    onGeneratePlan: (candidate: PromotionCandidate) => void;
    promotionPlans: Record<string, PromotionPlan>;
    generatingPlanFor: string | null;
    userRole: string;
}

const PromotionCandidatesTable: React.FC<PromotionCandidatesTableProps> = ({ candidates, onGeneratePlan, promotionPlans, generatingPlanFor, userRole }) => {
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'priority', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const requestSort = (key: SortKey) => {
        let direction: SortOrder = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const toggleExpansion = (mtm: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(mtm)) {
                newSet.delete(mtm);
            } else {
                newSet.add(mtm);
            }
            return newSet;
        });
    };

    const sortedAndFilteredData = useMemo(() => {
        let filteredData = [...candidates];
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filteredData = filteredData.filter(c => 
                c.mtm.toLowerCase().includes(lower) || 
                c.modelName.toLowerCase().includes(lower)
            );
        }
        if (sortConfig) {
            filteredData.sort((a, b) => {
                let aVal: any = a[sortConfig.key];
                let bVal: any = b[sortConfig.key];
                
                if (sortConfig.key === 'priority') {
                    const order = { 'Urgent': 4, 'Pre-Launch': 3, 'Recommended': 2, 'Optional': 1 };
                    aVal = order[a.priority];
                    bVal = order[b.priority];
                }

                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;
                
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filteredData;
    }, [candidates, sortConfig, searchTerm]);
    
    if (candidates.length === 0) {
        return (
            <div className="text-center py-10">
                <DocumentMagnifyingGlassIcon className="mx-auto h-12 w-12 text-secondary-text" />
                <h3 className="mt-2 text-sm font-semibold text-primary-text">No Promotion Candidates</h3>
                <p className="mt-1 text-sm text-secondary-text">All inventory appears to be moving at a healthy rate.</p>
            </div>
        );
    }

    const ActionButton: React.FC<{ candidate: PromotionCandidate, isExpanded: boolean }> = ({ candidate, isExpanded }) => {
        const plan = promotionPlans[candidate.mtm];
        const isGenerating = generatingPlanFor === candidate.mtm;

        if (isGenerating) {
            return (
                <div className="flex items-center justify-center text-xs font-semibold text-secondary-text">
                    <svg className="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                </div>
            );
        }
        if (plan) {
            return (
                <button onClick={(e) => { e.stopPropagation(); toggleExpansion(candidate.mtm); }} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${isExpanded ? 'bg-highlight-hover text-highlight' : 'bg-gray-100 dark:bg-dark-secondary-bg text-secondary-text dark:text-dark-secondary-text hover:bg-gray-200 dark:hover:bg-dark-primary-bg'}`}>
                    {isExpanded ? 'Collapse Plan' : 'View Plan'}
                </button>
            );
        }
        return (
            <button onClick={(e) => { e.stopPropagation(); onGeneratePlan(candidate); }} className="flex items-center justify-center px-3 py-1.5 text-white text-xs font-semibold rounded-md transition-colors btn-gradient">
                <SparklesIcon className="h-4 w-4 mr-1.5" />
                Generate Plan
            </button>
        );
    };
    
    return (
        <>
            <div className="flex justify-end mb-4">
                 <input
                    type="text"
                    placeholder="Search by MTM or model..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full sm:w-64 bg-secondary-bg border border-border-color rounded-md py-2 px-3 text-primary-text placeholder-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
                />
            </div>
             
             {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {sortedAndFilteredData.map(c => {
                    const plan = promotionPlans[c.mtm];
                    const isExpanded = expandedRows.has(c.mtm);
                    return (
                        <Card key={c.mtm} className="p-0 overflow-hidden" onClick={() => toggleExpansion(c.mtm)}>
                            <div className="p-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <PriorityCell priority={c.priority} />
                                        <p className="font-bold text-primary-text mt-2 truncate">{c.modelName}</p>
                                        <p className="text-sm font-mono text-secondary-text">{c.mtm}</p>
                                    </div>
                                    <ChevronRightIcon className={`h-6 w-6 text-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-4 text-center border-t border-border-color pt-3">
                                    <div>
                                        <p className="text-xs text-secondary-text">In Stock</p>
                                        <p className="font-bold text-primary-text">{c.inStockQty.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-secondary-text">On The Way</p>
                                        <p className="font-bold text-blue-600">{c.otwQty > 0 ? c.otwQty.toLocaleString() : '-'}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <ActionButton candidate={c} isExpanded={isExpanded} />
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
                                        {plan ? <PromotionPlanDetail plan={plan} userRole={userRole} /> : <CandidateDetail candidate={c} userRole={userRole} />}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Card>
                    );
                })}
            </div>

             {/* Desktop View */}
             <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-dark-secondary-bg/20">
                        <tr>
                            <th scope="col" className="w-12"></th>
                            <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="priority">Priority</TableHeader>
                            <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="mtm">Product</TableHeader>
                            <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="inStockQty" className="text-center">In Stock</TableHeader>
                            <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="otwQty" className="text-center">On The Way</TableHeader>
                            <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="daysSinceLastSale" className="text-center">Days Since Sale</TableHeader>
                            <th scope="col" className="px-4 py-3.5 text-center text-xs font-semibold text-secondary-text uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-secondary-bg">
                        {sortedAndFilteredData.map(c => {
                             const plan = promotionPlans[c.mtm];
                             const isExpanded = expandedRows.has(c.mtm);
                             return (
                                <Fragment key={c.mtm}>
                                    <tr className="border-b border-border-color dark:border-dark-border-color hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover transition-colors cursor-pointer" onClick={() => toggleExpansion(c.mtm)}>
                                        <td className="pl-4 py-3 text-center">
                                            <button className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-dark-border-color">
                                                <ChevronRightIcon className={`h-5 w-5 text-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                            </button>
                                        </td>
                                        <td className="px-4 py-3"><PriorityCell priority={c.priority} /></td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-primary-text">{c.modelName}</div>
                                            <div className="text-xs text-secondary-text font-mono">{c.mtm}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center font-medium text-primary-text">
                                            <InStockCell quantity={c.inStockQty} />
                                        </td>
                                        <td className="px-4 py-3 text-center font-medium text-blue-600">{c.otwQty > 0 ? c.otwQty.toLocaleString() : '-'}</td>
                                        <td className="px-4 py-3 text-center font-medium text-secondary-text">{c.daysSinceLastSale ?? 'N/A'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <ActionButton candidate={c} isExpanded={isExpanded} />
                                        </td>
                                    </tr>
                                    <tr className="p-0">
                                        <td colSpan={7} className="p-0 border-0">
                                            <AnimatePresence initial={false}>
                                                {isExpanded && (
                                                    <motion.div
                                                        key="content"
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                        className="overflow-hidden"
                                                    >
                                                        {plan ? <PromotionPlanDetail plan={plan} userRole={userRole} /> : <CandidateDetail candidate={c} userRole={userRole} />}
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

export default PromotionCandidatesTable;