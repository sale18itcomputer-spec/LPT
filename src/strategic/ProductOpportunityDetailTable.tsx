import React from 'react';
import type { SalesOpportunity } from '../../types';
import GeneratePlaybookButton from './GeneratePlaybookButton';
import { SparklesIcon } from '../ui/Icons';

interface ProductOpportunityDetailTableProps {
    opportunities: SalesOpportunity[];
    onGeneratePlaybook: (opportunity: SalesOpportunity) => void;
    onPsrefLookup: (item: { mtm: string; modelName: string }) => void;
}

const ProductOpportunityDetailTable: React.FC<ProductOpportunityDetailTableProps> = ({ opportunities, onGeneratePlaybook, onPsrefLookup }) => {
    
    const maxInStock = Math.max(...opportunities.map(o => o.inStockQty), 0);
    
    return (
        <div className="bg-slate-50/70 dark:bg-dark-primary-bg p-2 md:p-4">
            <h4 className="text-sm font-semibold text-primary-text mb-2 px-2 hidden md:block">Product Opportunities for {opportunities[0]?.customerName}</h4>
            
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-dark-secondary-bg rounded-lg shadow-sm">
                    <thead className="bg-gray-100 dark:bg-dark-secondary-bg/50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">MTM</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Model Name</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-secondary-text uppercase tracking-wider">In Stock</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-secondary-text uppercase tracking-wider">Past Units</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-secondary-text uppercase tracking-wider">Last Purchase</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-secondary-text uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color dark:divide-dark-border-color">
                        {opportunities.map(op => (
                            <tr key={op.id}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-secondary-text font-mono">{op.mtm}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-secondary-text truncate max-w-xs">{op.modelName}</td>
                                <td className="px-3 py-2 text-center">
                                    <div className="relative w-24 mx-auto">
                                        <div className="absolute inset-0 bg-green-100 rounded-md" style={{ width: `${(op.inStockQty / maxInStock) * 100}%` }}></div>
                                        <span className="relative font-semibold text-green-800">{(op.inStockQty || 0).toLocaleString()}</span>
                                    </div>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-secondary-text text-center font-medium">{(op.customerPastUnits || 0).toLocaleString()}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-secondary-text">{op.customerLastPurchaseDate || 'N/A'}</td>
                                <td className="px-3 py-2 text-center">
                                    <div className="flex justify-center items-center gap-x-2">
                                        <GeneratePlaybookButton opportunity={op} onClick={onGeneratePlaybook} />
                                        <button onClick={(e) => { e.stopPropagation(); onPsrefLookup(op); }}
                                           className="p-1.5 rounded-full text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                                           aria-label={`View product details for MTM ${op.mtm} on PSREF`}
                                           title="View product details on PSREF (new tab)">
                                            <SparklesIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-2">
                {opportunities.map(op => (
                    <div key={op.id} className="bg-white dark:bg-dark-secondary-bg rounded-lg p-3 border border-border-color dark:border-dark-border-color">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-primary-text truncate">{op.modelName}</p>
                                <p className="text-xs font-mono text-secondary-text">{op.mtm}</p>
                            </div>
                            <div className="ml-2 flex-shrink-0 text-right">
                                <p className="text-xs text-secondary-text">In Stock</p>
                                <p className="font-bold text-green-600">{op.inStockQty.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-border-color dark:border-dark-border-color flex justify-between items-center text-xs text-secondary-text">
                            <div>
                                <p>Past Units: <span className="font-semibold text-primary-text">{op.customerPastUnits}</span></p>
                                <p>Last Buy: <span className="font-semibold text-primary-text">{op.customerLastPurchaseDate || 'N/A'}</span></p>
                            </div>
                             <div className="flex items-center gap-x-1">
                                <GeneratePlaybookButton opportunity={op} onClick={onGeneratePlaybook} />
                                <button onClick={(e) => { e.stopPropagation(); onPsrefLookup(op); }}
                                   className="p-2 rounded-full text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                                   aria-label={`View product details for MTM ${op.mtm} on PSREF`}
                                   title="View product details on PSREF (new tab)">
                                    <SparklesIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProductOpportunityDetailTable;