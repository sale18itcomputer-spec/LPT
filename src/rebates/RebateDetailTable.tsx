

import React, { useState, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RebateDetail, RebateProgram } from '../../types';
import { useData } from '../../contexts/DataContext';
import RebateSalesTable from './RebateSalesTable';
import { ChevronRightIcon, ExclamationTriangleIcon, LightBulbIcon, TrophyIcon } from '../ui/Icons';

interface RebateDetailTableProps {
    program: RebateProgram;
    details: RebateDetail[];
}

const ProgressBar: React.FC<{ value: number; max: number }> = ({ value, max }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const displayPercentage = Math.min(100, percentage);
    let barColor = 'bg-highlight';
    if (percentage > 100) barColor = 'bg-red-500';
    else if (percentage >= 80) barColor = 'bg-green-500';
    else if (percentage >= 50) barColor = 'bg-yellow-500';


    return (
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700" title={`${value.toLocaleString()} / ${max.toLocaleString()} (${percentage.toFixed(1)}%)`}>
            <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${displayPercentage}%` }}></div>
        </div>
    );
};


const RebateDetailTable: React.FC<RebateDetailTableProps> = ({ program, details }) => {
    const { allRebateSales } = useData();
    const [expandedMtm, setExpandedMtm] = useState<string | null>(null);

    const toggleMtmExpansion = (uniqueKey: string) => {
        setExpandedMtm(current => current === uniqueKey ? null : uniqueKey);
    };
    
    const currencyFormatter = (val: number | null | undefined) => {
        if (val === null || val === undefined) return '-';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const detailsWithCalculations = useMemo(() => {
        return details.map(item => {
            const salesForMtm = allRebateSales.filter(sale => 
                sale.mtm === item.mtm &&
                sale.rebateInvoiceDate &&
                item.startDate &&
                item.endDate &&
                sale.rebateInvoiceDate >= item.startDate &&
                sale.rebateInvoiceDate <= item.endDate
            );
            const trackedSalesQty = salesForMtm.reduce((sum, s) => sum + s.quantity, 0);
            const reportedQty = item.programReportedLPH || 0;
            const variance = trackedSalesQty - reportedQty;
            const potentialRebate = trackedSalesQty * (item.perUnit || 0);
            
            return {
                ...item,
                trackedSalesQty,
                variance,
                potentialRebate,
                salesForMtm,
            };
        });
    }, [details, allRebateSales]);


    if (details.length === 0) {
        if (!program.startDate || !program.endDate) {
            return <div className="p-4 text-center text-sm text-secondary-text bg-slate-50/70 dark:bg-dark-primary-bg">No MTM details or date range specified for this program.</div>;
        }

        const salesInPeriod = allRebateSales.filter(sale => 
            sale.rebateInvoiceDate &&
            sale.rebateInvoiceDate >= program.startDate! &&
            sale.rebateInvoiceDate <= program.endDate!
        );

        const hasPerUnitRebate = program.perUnit && program.perUnit > 0;

        if (salesInPeriod.length === 0 && !hasPerUnitRebate) {
             return <div className="p-4 text-center text-sm text-secondary-text bg-slate-50/70 dark:bg-dark-primary-bg">No sales were recorded during this program's period.</div>;
        }
        
        if (hasPerUnitRebate) {
            // Program-Wide PER-UNIT Rebate
             return (
                <div className="p-4 bg-slate-50/70 dark:bg-dark-primary-bg">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                        <LightBulbIcon className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold text-blue-800 dark:text-blue-200">Program-Wide Rebate</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                This program offers a general rebate of <strong>{currencyFormatter(program.perUnit)} per unit</strong> for all sales within the program dates, as no specific models were targeted. Showing qualifying sales below.
                            </p>
                        </div>
                    </div>
                    <div className="mt-2">
                        <RebateSalesTable sales={salesInPeriod} programPerUnit={program.perUnit} rebateDetails={details} />
                    </div>
                </div>
            );
        } else {
            // Volume-Based SLAB Rebate
            return (
                <div className="p-4 bg-slate-50/70 dark:bg-dark-primary-bg">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50">
                        <TrophyIcon className="h-6 w-6 text-purple-500 flex-shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold text-purple-800 dark:text-purple-200">Sales Milestone Bonus</h4>
                            <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                                This is a volume-based program where rebates are earned by reaching total sales quantity milestones (e.g., sell 650 units, get $3,250). Since no specific models are required, all sales within the program dates contribute to the total volume.
                                {program.remark && <div className="mt-2 p-2 bg-purple-100 dark:bg-purple-800/30 rounded"><strong>Note:</strong> {program.remark}</div>}
                            </p>
                        </div>
                    </div>
                    <div className="mt-2">
                        <RebateSalesTable sales={salesInPeriod} programPerUnit={null} rebateDetails={details} />
                    </div>
                </div>
            );
        }
    }

    const quantityFormatter = (val: number | null) => {
        if (val === null) return '-';
        return val.toLocaleString();
    };

    return (
        <div className="p-3 bg-gray-100 dark:bg-dark-secondary-bg/20">
            <div className="p-2 mb-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-300 flex items-start gap-3">
                <LightBulbIcon className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
                <div>
                    <h4 className="font-bold text-blue-800 dark:text-blue-200">Targeted Product Push</h4>
                    <p>This program offers specific rebates for selling the models listed below.</p>
                </div>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                <table className="min-w-full text-xs">
                    <thead className="bg-gray-200 dark:bg-dark-secondary-bg/40 sticky top-0 z-10">
                        <tr>
                            <th className="w-12"></th>
                            <th className="px-3 py-2 text-left font-medium text-secondary-text uppercase tracking-wider">MTM</th>
                            <th className="px-3 py-2 text-left font-medium text-secondary-text uppercase tracking-wider w-48">Progress to Max</th>
                            <th className="px-3 py-2 text-right font-medium text-secondary-text uppercase tracking-wider">Reported Sales (LPH)</th>
                            <th className="px-3 py-2 text-right font-medium text-secondary-text uppercase tracking-wider">Tracked Sales</th>
                            <th className="px-3 py-2 text-right font-medium text-secondary-text uppercase tracking-wider">Variance</th>
                            <th className="px-3 py-2 text-right font-medium text-secondary-text uppercase tracking-wider">Potential Rebate</th>
                            <th className="px-3 py-2 text-right font-medium text-secondary-text uppercase tracking-wider">Per Unit</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-secondary-bg/80 divide-y divide-border-color dark:divide-dark-border-color">
                        {detailsWithCalculations.map((item, index) => {
                            const uniqueKey = `${item.mtm}-${item.startDate}-${index}`;
                            const isExpanded = expandedMtm === uniqueKey;
                            const varianceColor = item.variance > 0 ? 'text-green-600' : item.variance < 0 ? 'text-red-600' : 'text-secondary-text';

                            return (
                                <Fragment key={uniqueKey}>
                                    <tr className="cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-primary-bg" onClick={() => toggleMtmExpansion(uniqueKey)}>
                                        <td className="px-3 py-1.5 whitespace-nowrap text-center">
                                            <ChevronRightIcon className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                        </td>
                                        <td className="px-3 py-1.5 whitespace-nowrap text-primary-text font-mono">{item.mtm}</td>
                                        <td className="px-3 py-1.5 whitespace-nowrap">
                                            {item.programMax ? <ProgressBar value={item.trackedSalesQty} max={item.programMax} /> : <span className="text-xs text-gray-400">N/A</span>}
                                        </td>
                                        <td className="px-3 py-1.5 text-right text-secondary-text">{quantityFormatter(item.programReportedLPH)}</td>
                                        <td className="px-3 py-1.5 text-right font-semibold text-primary-text">{quantityFormatter(item.trackedSalesQty)}</td>
                                        <td className={`px-3 py-1.5 text-right font-semibold ${varianceColor}`}>{item.variance !== 0 ? item.variance.toLocaleString() : '-'}</td>
                                        <td className="px-3 py-1.5 text-right font-semibold text-green-600">{currencyFormatter(item.potentialRebate)}</td>
                                        <td className="px-3 py-1.5 text-right text-primary-text">{currencyFormatter(item.perUnit)}</td>
                                    </tr>
                                    <tr className="p-0">
                                        <td colSpan={8} className="p-0 border-0">
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                                        <RebateSalesTable sales={item.salesForMtm} rebateDetails={details} />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </td>
                                    </tr>
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RebateDetailTable;
