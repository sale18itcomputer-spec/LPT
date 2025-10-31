
import React, { useMemo, useState } from 'react';
import { SpecificationBreakdown } from '../../types';
import Card from '../ui/Card';
import { ChevronUpIcon, ChevronDownIcon } from '../ui/Icons';

interface FilteredModelsTableProps {
    items: { mtm: string; modelName: string; parsedSpecification: SpecificationBreakdown }[];
    salesMetrics: Map<string, { total90: number }>;
}

const FilteredModelsTable: React.FC<FilteredModelsTableProps> = ({ items, salesMetrics }) => {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'sales90d', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const sortedItems = useMemo(() => {
        let sortableItems = items.map(item => ({
            ...item,
            sales90d: salesMetrics.get(item.mtm)?.total90 || 0,
        }));
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aVal = (a.parsedSpecification as any)[sortConfig.key] ?? (a as any)[sortConfig.key];
                const bVal = (b.parsedSpecification as any)[sortConfig.key] ?? (b as any)[sortConfig.key];

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [items, sortConfig, salesMetrics]);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedItems.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedItems, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedItems.length / itemsPerPage);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const TableHeader: React.FC<{sortKey: string, label: string}> = ({sortKey, label}) => {
        const isSorted = sortConfig?.key === sortKey;
        const direction = isSorted ? sortConfig.direction : null;
        return (
            <th onClick={() => requestSort(sortKey)} className="p-3 text-left text-xs font-semibold text-secondary-text dark:text-dark-secondary-text uppercase cursor-pointer">
                <div className="flex items-center gap-1">
                    {label}
                    {isSorted ? (direction === 'asc' ? <ChevronUpIcon className="h-4 w-4"/> : <ChevronDownIcon className="h-4 w-4"/>) : <ChevronUpIcon className="h-4 w-4 opacity-20"/>}
                </div>
            </th>
        );
    };

    return (
        <Card className="p-0">
             <div className="p-4 border-b border-border-color dark:border-dark-border-color">
                <h3 className="font-semibold text-primary-text dark:text-dark-primary-text">Filtered Models ({items.length.toLocaleString()})</h3>
            </div>
            {items.length === 0 ? (
                 <div className="p-6 text-center text-secondary-text dark:text-dark-secondary-text">No models match the current filter.</div>
            ) : (
                <>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-dark-secondary-bg/20">
                                    <TableHeader sortKey="modelName" label="Model Name" />
                                    <TableHeader sortKey="cpuFamily" label="CPU" />
                                    <TableHeader sortKey="ramSize" label="RAM" />
                                    <TableHeader sortKey="storageSize" label="Storage" />
                                    <TableHeader sortKey="sales90d" label="90d Sales" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-color dark:divide-dark-border-color">
                                {paginatedItems.map(item => (
                                    <tr key={item.mtm} className="hover:bg-gray-50 dark:hover:bg-dark-primary-bg">
                                        <td className="p-3">
                                            <div className="font-medium text-primary-text dark:text-dark-primary-text">{item.modelName}</div>
                                            <div className="text-xs text-secondary-text dark:text-dark-secondary-text font-mono">{item.mtm}</div>
                                        </td>
                                        <td className="p-3 text-secondary-text dark:text-dark-secondary-text">{item.parsedSpecification.cpuFamily || 'N/A'}</td>
                                        <td className="p-3 text-secondary-text dark:text-dark-secondary-text">{item.parsedSpecification.ramSize || 'N/A'}</td>
                                        <td className="p-3 text-secondary-text dark:text-dark-secondary-text">{item.parsedSpecification.storageSize || 'N/A'}</td>
                                        <td className="p-3 text-secondary-text dark:text-dark-secondary-text font-semibold">{item.sales90d}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                         <div className="p-3 border-t border-border-color dark:border-dark-border-color flex justify-center items-center gap-2 text-sm">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-1 disabled:opacity-50 text-secondary-text dark:text-dark-secondary-text">&laquo;</button>
                            <span className="text-secondary-text dark:text-dark-secondary-text">Page {currentPage} of {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-1 disabled:opacity-50 text-secondary-text dark:text-dark-secondary-text">&raquo;</button>
                        </div>
                    )}
                </>
            )}
        </Card>
    );
};

export default FilteredModelsTable;
