

import React, { useState, useMemo, Fragment, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import Card from '../ui/Card';
import KpiCard from '../ui/KpiCard';
import { RebateProgram, RebateDetail, RebateSale, LocalFiltersState } from '../../types';
import { BanknotesIcon, ExclamationTriangleIcon, TrophyIcon, DocumentMagnifyingGlassIcon, ChevronUpIcon, ChevronDownIcon, ChevronRightIcon, ChevronLeftIcon, ArrowDownTrayIcon } from '../ui/Icons';
import RebateDetailTable from './RebateDetailTable';
import { exportDataToCsv } from '../../utils/csv';

// --- Type Definitions ---
type AugmentedRebateProgram = RebateProgram & {
    totalTrackedSales: number;
    totalPotentialRebate: number;
};
interface RebateDetailWithCalculations extends RebateDetail {
    trackedSalesQty: number;
    variance: number;
    potentialRebate: number;
    salesForMtm: RebateSale[];
}
type SortKey = keyof AugmentedRebateProgram;
type SortOrder = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortOrder;
}

// --- Sub-components ---
const TableHeader: React.FC<{
  onSort: (key: SortKey) => void;
  sortConfig: SortConfig | null;
  sortKey: SortKey;
  children: React.ReactNode;
  className?: string;
}> = ({ onSort, sortConfig, sortKey, children, className = '' }) => {
  const isSorted = sortConfig?.key === sortKey;
  const thClassName = `px-4 py-3.5 text-xs font-semibold uppercase tracking-wider select-none cursor-pointer group ${className || 'text-left'}`;
  return (
    <th scope="col" className={thClassName} onClick={() => onSort(sortKey)} aria-sort={isSorted ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <div className={`flex items-center text-secondary-text dark:text-dark-secondary-text ${className.includes('text-right') ? 'justify-end' : ''}`}>
        {children}
        <span className="w-4 h-4 ml-1.5 flex-shrink-0">
          {isSorted ? (sortConfig?.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />) : <ChevronUpIcon className="opacity-30 group-hover:opacity-100" />}
        </span>
      </div>
    </th>
  );
};

const ProgramDurationProgress: React.FC<{ startDate: string | null; endDate: string | null }> = ({ startDate, endDate }) => {
    if (!startDate || !endDate) return <div className="text-xs text-secondary-text">Perpetual</div>;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const totalDuration = end - start;
    const elapsed = now - start;

    if (totalDuration <= 0 || now < start) {
        return <div className="text-xs text-secondary-text">Upcoming</div>;
    }
    if (now > end) {
         return <div className="text-xs text-secondary-text">Completed</div>;
    }

    const percentage = (elapsed / totalDuration) * 100;

    return (
        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700" title={`${Math.floor(percentage)}% complete`}>
            <div className="bg-highlight h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
        </div>
    );
};


const StatusBadge: React.FC<{ status: 'Open' | 'Close' }> = ({ status }) => {
    const colorClass = status === 'Open' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>{status}</span>;
};

const UpdateBadge: React.FC<{ update: string }> = ({ update }) => {
    const colorClass = update === 'Paid' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' : update.includes('Pending') ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>{update}</span>;
}

// --- Main Component ---
interface RebateProgramsPageProps {
    localFilters: LocalFiltersState;
}

export const RebateProgramsPage: React.FC<RebateProgramsPageProps> = ({ localFilters }) => {
    const { allRebates, rebateKpiData, allRebateDetails, allRebateSales } = useData();
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'startDate', direction: 'desc' });
    const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    // Mobile drill-down state
    const [selectedProgram, setSelectedProgram] = useState<AugmentedRebateProgram | null>(null);
    const [selectedMtm, setSelectedMtm] = useState<RebateDetailWithCalculations | null>(null);
    const [direction, setDirection] = useState(1);
    
    const handleSelectProgram = (program: AugmentedRebateProgram) => {
        setDirection(1);
        setSelectedProgram(program);
    };

    const handleSelectMtm = (mtm: RebateDetailWithCalculations) => {
        setDirection(1);
        setSelectedMtm(mtm);
    };

    const handleBack = () => {
        setDirection(-1);
        if (selectedMtm) {
            setSelectedMtm(null);
        } else if (selectedProgram) {
            setSelectedProgram(null);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [localFilters, sortConfig]);

    const programsWithCalculations: AugmentedRebateProgram[] = useMemo(() => {
        return allRebates.map(program => {
            const programDetails = allRebateDetails.filter(d => d.programCode === program.program);
            
            let totalTrackedSales = 0;
            let totalPotentialRebate = 0;

            if (programDetails.length > 0) {
                programDetails.forEach(detail => {
                    const salesForMtm = allRebateSales.filter(sale => 
                        sale.mtm === detail.mtm &&
                        sale.rebateInvoiceDate &&
                        detail.startDate &&
                        detail.endDate &&
                        sale.rebateInvoiceDate >= detail.startDate &&
                        sale.rebateInvoiceDate <= detail.endDate
                    );
                    const trackedQty = salesForMtm.reduce((sum, s) => sum + s.quantity, 0);
                    totalTrackedSales += trackedQty;
                    totalPotentialRebate += trackedQty * (detail.perUnit || 0);
                });
            } else if (program.startDate && program.endDate) {
                // Fallback for programs without specific MTM details
                const salesInPeriod = allRebateSales.filter(sale => 
                    sale.rebateInvoiceDate &&
                    sale.rebateInvoiceDate >= program.startDate! &&
                    sale.rebateInvoiceDate <= program.endDate!
                );
                totalTrackedSales = salesInPeriod.reduce((sum, s) => sum + s.quantity, 0);
                totalPotentialRebate = totalTrackedSales * (program.perUnit || 0);
            }


            return {
                ...program,
                totalTrackedSales,
                totalPotentialRebate
            };
        });
    }, [allRebates, allRebateDetails, allRebateSales]);

    const mtmsForSelectedProgram = useMemo((): RebateDetailWithCalculations[] => {
        if (!selectedProgram) return [];
        const details = allRebateDetails.filter(d => d.programCode === selectedProgram.program);
        
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
    }, [selectedProgram, allRebateDetails, allRebateSales]);
    
    const salesForSelectedMtm = selectedMtm?.salesForMtm || [];

    const toggleExpansion = (programCode: string) => {
        setExpandedProgram(current => current === programCode ? null : programCode);
    };

    const requestSort = (key: SortKey) => {
        let direction: SortOrder = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredData = useMemo(() => {
        const { rebateSearchTerm, rebateStatus, rebateUpdateStatus } = localFilters;
        let filteredData = [...programsWithCalculations];
        
        if (rebateSearchTerm) {
            const lower = rebateSearchTerm.toLowerCase();
            filteredData = filteredData.filter(item =>
                (item.program || '').toLowerCase().includes(lower) ||
                (item.lenovoQuarter || '').toLowerCase().includes(lower) ||
                (item.creditNo || '').toLowerCase().includes(lower)
            );
        }

        if (rebateStatus !== 'all') {
            filteredData = filteredData.filter(item => item.status === rebateStatus);
        }

        if (rebateUpdateStatus !== 'all') {
            filteredData = filteredData.filter(item => item.update === rebateUpdateStatus);
        }

        if (sortConfig !== null) {
            const { key, direction } = sortConfig;
            filteredData.sort((a, b) => {
                const aVal = a[key], bVal = b[key];
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;
                let comparison = 0;
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    comparison = aVal - bVal;
                } else {
                    comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: 'base' });
                }
                return direction === 'asc' ? comparison : -comparison;
            });
        }
        return filteredData;
    }, [programsWithCalculations, localFilters, sortConfig]);

    const totalPages = Math.ceil(sortedAndFilteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        return sortedAndFilteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [sortedAndFilteredData, currentPage, itemsPerPage]);

    const currencyFormatter = (val: number | null | undefined) => (val === null || val === undefined) ? '-' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    const handleExport = useCallback(() => {
        if (sortedAndFilteredData.length === 0) return;
        
        const dataForExport = sortedAndFilteredData.flatMap(program => {
            const programDetails = allRebateDetails.filter(d => d.programCode === program.program);
    
            if (programDetails.length === 0) {
                return [{
                    'Program Name': program.program,
                    'Lenovo Quarter': program.lenovoQuarter,
                    'Program Start Date': program.startDate || '',
                    'Program End Date': program.endDate || '',
                    'Status': program.status,
                    'Update': program.update,
                    'Credit No.': program.creditNo || '',
                    'MTM': 'N/A',
                    'Per Unit Rebate': 0,
                    'Program Max (Units)': null,
                    'Reported Sales (LPH)': null,
                    'Tracked Sales (Calculated)': 0,
                    'Variance': 0,
                    'Potential Rebate (Calculated)': 0,
                }];
            }
    
            return programDetails.map(detail => {
                const salesForMtm = allRebateSales.filter(sale =>
                    sale.mtm === detail.mtm &&
                    sale.rebateInvoiceDate &&
                    detail.startDate &&
                    detail.endDate &&
                    sale.rebateInvoiceDate >= detail.startDate &&
                    sale.rebateInvoiceDate <= detail.endDate
                );
                const trackedSalesQty = salesForMtm.reduce((sum, s) => sum + s.quantity, 0);
                const reportedQty = detail.programReportedLPH || 0;
                const variance = trackedSalesQty - reportedQty;
                const potentialRebate = trackedSalesQty * (detail.perUnit || 0);
    
                return {
                    'Program Name': program.program,
                    'Lenovo Quarter': program.lenovoQuarter,
                    'Program Start Date': program.startDate || '',
                    'Program End Date': program.endDate || '',
                    'Status': program.status,
                    'Update': program.update,
                    'Credit No.': program.creditNo || '',
                    'MTM': detail.mtm,
                    'Per Unit Rebate': detail.perUnit,
                    'Program Max (Units)': detail.programMax,
                    'Reported Sales (LPH)': detail.programReportedLPH,
                    'Tracked Sales (Calculated)': trackedSalesQty,
                    'Variance': variance,
                    'Potential Rebate (Calculated)': potentialRebate,
                };
            });
        });
    
        const headers = [
            { label: 'Program Name', key: 'Program Name' },
            { label: 'Lenovo Quarter', key: 'Lenovo Quarter' },
            { label: 'Program Start Date', key: 'Program Start Date' },
            { label: 'Program End Date', key: 'Program End Date' },
            { label: 'Status', key: 'Status' },
            { label: 'Update', key: 'Update' },
            { label: 'Credit No.', key: 'Credit No.' },
            { label: 'MTM', key: 'MTM' },
            { label: 'Per Unit Rebate', key: 'Per Unit Rebate' },
            { label: 'Program Max (Units)', key: 'Program Max (Units)' },
            { label: 'Reported Sales (LPH)', key: 'Reported Sales (LPH)' },
            { label: 'Tracked Sales (Calculated)', key: 'Tracked Sales (Calculated)' },
            { label: 'Variance', key: 'Variance' },
            { label: 'Potential Rebate (Calculated)', key: 'Potential Rebate (Calculated)' },
        ];
    
        exportDataToCsv(dataForExport, headers, 'rebate_programs_full_details.csv');
    
    }, [sortedAndFilteredData, allRebateDetails, allRebateSales]);

    const viewVariants = {
      enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
      center: { x: 0, opacity: 1 },
      exit: (direction: number) => ({ x: direction < 0 ? '100%' : '-100%', opacity: 0 }),
    };

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="flex items-center gap-x-3 mb-4">
                    <TrophyIcon className="h-8 w-8 text-primary-text dark:text-dark-primary-text" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-primary-text dark:text-dark-primary-text">Rebate Programs</h1>
                        <p className="text-secondary-text dark:text-dark-secondary-text mt-1">Track and manage all Lenovo rebate programs.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <KpiCard label="Total Rebates Earned" value={rebateKpiData.totalEarned} icon={<BanknotesIcon />} formatter={currencyFormatter} />
                    <KpiCard label="Open Programs" value={rebateKpiData.openPrograms} icon={<ExclamationTriangleIcon />} />
                    <KpiCard label="Pending Payment" value={rebateKpiData.pendingPayment} icon={<BanknotesIcon />} />
                    <KpiCard label="Pending Value" value={rebateKpiData.totalPendingValue} icon={<BanknotesIcon />} formatter={currencyFormatter} />
                </div>

                <Card className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-primary-text dark:text-dark-primary-text">All Programs</h2>
                            <p className="text-sm text-secondary-text dark:text-dark-secondary-text">{sortedAndFilteredData.length} programs matching filters.</p>
                        </div>
                        <button 
                            onClick={handleExport} 
                            disabled={sortedAndFilteredData.length === 0} 
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-border-color bg-secondary-bg hover:bg-gray-100 dark:bg-dark-secondary-bg dark:hover:bg-dark-primary-bg transition-colors disabled:opacity-50"
                        >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            Export Full Details
                        </button>
                    </div>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 dark:bg-dark-secondary-bg/50">
                                <tr>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="program">Program</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="lenovoQuarter">Quarter</TableHeader>
                                    <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-secondary-text dark:text-dark-secondary-text uppercase tracking-wider">Program Duration</th>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalTrackedSales" className="text-right">Tracked Sales (QTY)</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalPotentialRebate" className="text-right">Potential Rebate</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="status">Status</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="update">Update</TableHeader>
                                </tr>
                            </thead>
                            <tbody className="bg-secondary-bg dark:bg-dark-secondary-bg">
                                {paginatedData.map(item => {
                                    const isExpanded = expandedProgram === item.program;
                                    const details = allRebateDetails.filter(d => d.programCode === item.program);
                                    
                                    return (
                                        <Fragment key={item.program}>
                                            <tr className="border-b border-border-color dark:border-dark-border-color hover:bg-gray-50 dark:hover:bg-dark-primary-bg cursor-pointer" onClick={() => toggleExpansion(item.program)}>
                                                <td className="px-4 py-3 text-sm font-medium text-primary-text dark:text-dark-primary-text">
                                                    <div className="flex items-center">
                                                        <ChevronRightIcon className={`h-5 w-5 mr-2 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                                        {item.program}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-secondary-text dark:text-dark-secondary-text">{item.lenovoQuarter}</td>
                                                <td className="px-4 py-3 text-sm text-secondary-text dark:text-dark-secondary-text"><ProgramDurationProgress startDate={item.startDate} endDate={item.endDate} /></td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold text-primary-text dark:text-dark-primary-text">{item.totalTrackedSales.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">{item.totalPotentialRebate > 0 ? currencyFormatter(item.totalPotentialRebate) : '-'}</td>
                                                <td className="px-4 py-3 text-sm"><StatusBadge status={item.status} /></td>
                                                <td className="px-4 py-3 text-sm"><UpdateBadge update={item.update} /></td>
                                            </tr>
                                            <tr className="p-0">
                                                <td colSpan={7} className="p-0 border-0">
                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                transition={{ duration: 0.3 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <RebateDetailTable program={item} details={details} />
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

                    {/* Mobile Drill-down View */}
                    <div className="md:hidden relative overflow-x-hidden min-h-[500px]">
                        <AnimatePresence initial={false} custom={direction}>
                            {!selectedProgram && (
                                <motion.div key="programs" custom={direction} variants={viewVariants} initial="enter" animate="center" exit="exit" transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }} className="space-y-4">
                                    {paginatedData.map(item => (
                                        <Card key={item.program} className="p-0 overflow-hidden" onClick={() => handleSelectProgram(item)}>
                                            <div className="p-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1 min-w-0">