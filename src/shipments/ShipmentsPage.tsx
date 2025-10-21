



import React, { useState, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import Card from '../ui/Card';
import { AugmentedShipmentGroup, LocalFiltersState, ViewType } from '../../types';
import { BanknotesIcon, CubeIcon, DocumentMagnifyingGlassIcon, TruckIcon, ChevronUpIcon, ChevronDownIcon, ChevronRightIcon, ClockIcon, CheckBadgeIcon, PackageIcon, ExclamationTriangleIcon } from '../ui/Icons';
import AnimatedCounter from '../ui/AnimatedCounter';

// --- Type Definitions ---
type AugmentedShipmentItem = AugmentedShipmentGroup['items'][0];

type SortKey = keyof Omit<AugmentedShipmentGroup, 'items' | 'progress'>;
type SortOrder = 'asc' | 'desc';
interface SortConfig {
  key: SortKey;
  direction: SortOrder;
}

interface ShipmentsPageProps {
    onNavigateAndFilter: (view: ViewType, filters: Partial<LocalFiltersState>) => void;
    localFilters: LocalFiltersState;
    onTrackShipment: (deliveryNumber: string) => void;
    userRole: string;
}

// --- Sub-components ---
const KpiCard: React.FC<{ label: string; value: number; icon: React.FC<any>; formatter?: (val: number) => string }> = ({ label, value, icon: Icon, formatter }) => (
    <Card className="p-4">
        <div className="flex items-center">
            <div className="flex-shrink-0 bg-highlight-hover dark:bg-dark-highlight-hover p-3 rounded-lg">
                <Icon className="h-6 w-6 text-highlight" />
            </div>
            <div className="ml-4">
                <dt className="text-sm font-medium text-secondary-text dark:text-dark-secondary-text truncate">{label}</dt>
                <dd className="text-2xl font-bold text-primary-text dark:text-dark-primary-text"><AnimatedCounter to={value} formatter={formatter} /></dd>
            </div>
        </div>
    </Card>
);
KpiCard.displayName = 'KpiCard';

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
      <div className={`flex items-center text-secondary-text dark:text-dark-secondary-text ${className?.includes('text-right') ? 'justify-end' : ''}`}>
        {children}
        <span className="w-4 h-4 ml-1.5 flex-shrink-0">
          {isSorted ? (sortConfig?.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />) : <ChevronUpIcon className="opacity-30 group-hover:opacity-100" />}
        </span>
      </div>
    </th>
  );
};
TableHeader.displayName = 'TableHeader';

const StatusBadge: React.FC<{ status: AugmentedShipmentGroup['status'] }> = ({ status }) => {
    const config: Record<AugmentedShipmentGroup['status'], { text: string; className: string; icon: React.FC<any> }> = {
        Arrived: { text: 'Arrived', className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300', icon: CheckBadgeIcon },
        'Transit SG > KH': { text: 'Transit SG > KH', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300', icon: TruckIcon },
        'Transit CN > SG': { text: 'Transit CN > SG', className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300', icon: TruckIcon },
        Delayed: { text: 'Delayed', className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300', icon: ExclamationTriangleIcon },
        Upcoming: { text: 'Upcoming', className: 'bg-gray-100 text-gray-800 dark:bg-zinc-700 dark:text-zinc-300', icon: ClockIcon },
    };
    const currentConfig = config[status];
    if (!currentConfig) {
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-zinc-700 dark:text-zinc-300">{status}</span>;
    }
    const Icon = currentConfig.icon;
    return (
        <span className={`inline-flex items-center gap-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${currentConfig.className}`}>
            <Icon className="h-4 w-4" />
            {currentConfig.text}
        </span>
    );
};
StatusBadge.displayName = 'StatusBadge';

const ShipmentTimeline: React.FC<{ group: AugmentedShipmentGroup }> = ({ group }) => {
    const { progress, packingListDate, eta, arrivalDate, status, delayDays } = group;
    const barColor = status === 'Arrived' ? 'bg-green-500' : status === 'Delayed' ? 'bg-blue-500' : 'bg-blue-500';

    return (
        <div className="w-full">
            <div className="relative h-2 bg-gray-200 dark:bg-zinc-700 rounded-full">
                <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${progress.percentage}%` }} />
                {status === 'Delayed' && progress.etaPercentage !== null && (
                     <div className="absolute top-0 h-2 bg-red-500 rounded-r-full" style={{ left: `${progress.etaPercentage}%`, width: `${Math.max(0, progress.percentage - progress.etaPercentage)}%` }} />
                )}
                {progress.etaPercentage !== null && (
                    <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-px bg-secondary-text/50" style={{ left: `${progress.etaPercentage}%` }} />
                )}
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-secondary-text dark:text-dark-secondary-text font-medium">
                <div className="flex items-center gap-1" title={`Packed: ${packingListDate || 'N/A'}`}>
                    <PackageIcon className="h-4 w-4" />
                    <span>{packingListDate ? new Date(packingListDate + 'T00:00:00Z').toLocaleDateString('en-CA') : 'N/A'}</span>
                </div>
                 <div className="flex items-center gap-1" title={`ETA: ${eta || 'N/A'}`}>
                    <ClockIcon className="h-4 w-4" />
                    <span>{eta ? new Date(eta + 'T00:00:00Z').toLocaleDateString('en-CA') : 'N/A'}</span>
                </div>
                 <div className="flex items-center gap-1" title={status === 'Arrived' ? `Arrived: ${new Date(arrivalDate! + 'T00:00:00Z').toLocaleDateString('en-CA')}` : (status === 'Delayed' ? `Delayed ${delayDays} day(s)` : 'On Schedule')}>
                    <CheckBadgeIcon className="h-4 w-4" />
                    <span>{status === 'Arrived' ? `Arrived` : (status === 'Delayed' ? `Delayed` : 'On Schedule')}</span>
                </div>
            </div>
        </div>
    );
};
ShipmentTimeline.displayName = 'ShipmentTimeline';

const ModelSummary: React.FC<{ items: AugmentedShipmentItem[] }> = ({ items }) => {
    const uniqueModels = [...new Map(items.map(item => [item.modelName, item])).values()];
    
    if (uniqueModels.length === 0) return null;

    const displayModels = uniqueModels.slice(0, 2);
    const remainingCount = uniqueModels.length - displayModels.length;

    return (
        <div className="text-xs text-secondary-text dark:text-dark-secondary-text flex items-center gap-1.5 mt-1 flex-wrap">
            {displayModels.map((item, index) => (
                <span key={`${item.mtm}-${index}`} className="truncate max-w-[200px]">{item.modelName}{index < displayModels.length - 1 && ','}</span>
            ))}
            {remainingCount > 0 && (
                <span className="flex-shrink-0 px-1.5 py-0.5 bg-gray-200 dark:bg-zinc-700 rounded-full text-xs font-medium">
                    +{remainingCount} more
                </span>
            )}
        </div>
    );
};
ModelSummary.displayName = 'ModelSummary';

const ExpandedShipmentDetail: React.FC<{ group: AugmentedShipmentGroup, onNavigateToOrder: (so: string, mtm: string) => void, userRole: string }> = ({ group, onNavigateToOrder, userRole }) => (
    <div className="bg-slate-50/70 dark:bg-dark-primary-bg p-4">
        <h4 className="text-sm font-semibold text-primary-text dark:text-dark-primary-text mb-2">Items in Shipment ({group.items.length})</h4>
        <div className="space-y-2">
            {group.items.map((item, idx) => (
                <div key={`${item.salesOrder}-${item.mtm}-${idx}`} className="bg-secondary-bg dark:bg-dark-secondary-bg p-3 rounded-md border border-border-color dark:border-dark-border-color">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-primary-text dark:text-dark-primary-text truncate">{item.modelName}</p>
                            <div className="text-xs text-secondary-text dark:text-dark-secondary-text flex items-center gap-x-3">
                                <span>MTM: <span className="font-mono">{item.mtm}</span></span>
                                <span>SO: <span className="font-mono">{item.salesOrder}</span></span>
                            </div>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                            <p className="font-bold text-primary-text dark:text-dark-primary-text">{item.quantity.toLocaleString()}</p>
                            <p className="text-xs text-secondary-text dark:text-dark-secondary-text">units</p>
                        </div>
                    </div>
                     <div className="mt-2 pt-2 border-t border-border-color dark:border-dark-border-color text-right">
                         {userRole !== 'Marketing' && (
                             <button onClick={() => onNavigateToOrder(item.salesOrder, item.mtm)} className="text-xs font-semibold text-highlight hover:underline">View Order</button>
                         )}
                     </div>
                </div>
            ))}
        </div>
    </div>
);
ExpandedShipmentDetail.displayName = 'ExpandedShipmentDetail';

// --- Main Component ---
const ShipmentsPage: React.FC<ShipmentsPageProps> = ({ onNavigateAndFilter, localFilters, onTrackShipment, userRole }) => {
    const { allShipmentGroups } = useData();
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'packingListDate', direction: 'desc' });
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    const handleNavigateToOrder = (salesOrder: string, mtm: string) => {
        onNavigateAndFilter('orders', { orderSearchTerm: `${salesOrder} ${mtm}` });
    };

    const requestSort = (key: SortKey) => {
        let direction: SortOrder = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const toggleExpansion = (packingList: string) => {
        setExpandedRows(prev => { const newSet = new Set(prev); if (newSet.has(packingList)) newSet.delete(packingList); else newSet.add(packingList); return newSet; });
    };

    const sortedAndFilteredData = useMemo(() => {
        const { shipmentSearchTerm, shipmentStatus } = localFilters;
        let filteredData = [...allShipmentGroups];

        if (shipmentStatus.length > 0) {
            filteredData = filteredData.filter(g => shipmentStatus.includes(g.status as any));
        }
        
        if (shipmentSearchTerm) {
            const lower = shipmentSearchTerm.toLowerCase();
            filteredData = filteredData.filter(group => group.packingList.toLowerCase().includes(lower) || group.items.some(item => item.salesOrder.toLowerCase().includes(lower) || item.mtm.toLowerCase().includes(lower) || item.modelName.toLowerCase().includes(lower)));
        }

        if (sortConfig) {
            filteredData.sort((a, b) => {
                let aVal = a[sortConfig.key], bVal = b[sortConfig.key];
                 // Make sure null/undefined dates are sorted to the end
                if (sortConfig.key === 'packingListDate' || sortConfig.key === 'eta' || sortConfig.key === 'arrivalDate') {
                    if (!aVal) return 1;
                    if (!bVal) return -1;
                }
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;
                const comparison = typeof aVal === 'number' && typeof bVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
        }
        return filteredData;
    }, [allShipmentGroups, localFilters, sortConfig]);
    
    const kpis = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0,0,0,0);

        return allShipmentGroups.reduce((acc, group) => {
            if (group.status.startsWith('Transit')) {
                acc.inTransitCount++;
                acc.inTransitValue += group.totalFobValue || 0;
                acc.inTransitUnits += group.totalQuantity || 0;
            }
            if (group.status === 'Delayed') {
                acc.delayedCount++;
            }
            if (group.arrivalDate) {
                const arrival = new Date(group.arrivalDate + 'T00:00:00Z');
                if (arrival >= thirtyDaysAgo) {
                    acc.arrivedLast30Days++;
                }
            }
            return acc;
        }, {
            inTransitCount: 0,
            inTransitValue: 0,
            inTransitUnits: 0,
            delayedCount: 0,
            arrivedLast30Days: 0,
        });
    }, [allShipmentGroups]);

    const totalPages = Math.ceil(sortedAndFilteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => sortedAndFilteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [sortedAndFilteredData, currentPage, itemsPerPage]);
    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(val);

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="flex items-center gap-x-3 mb-4">
                    <TruckIcon className="h-8 w-8 text-primary-text dark:text-dark-primary-text" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-primary-text dark:text-dark-primary-text">Shipment Tracking</h1>
                        <p className="text-secondary-text dark:text-dark-secondary-text mt-1">Monitor incoming shipments from packing list to final arrival.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {userRole !== 'Marketing' ? (
                        <KpiCard label="Value in Transit" value={kpis.inTransitValue} icon={BanknotesIcon} formatter={currencyFormatter} />
                    ) : (
                        <KpiCard label="Units in Transit" value={kpis.inTransitUnits} icon={CubeIcon} />
                    )}
                    <KpiCard label="Shipments in Transit" value={kpis.inTransitCount} icon={TruckIcon} />
                    <KpiCard label="Delayed Shipments" value={kpis.delayedCount} icon={ExclamationTriangleIcon} />
                    <KpiCard label="Arrived (Last 30d)" value={kpis.arrivedLast30Days} icon={CheckBadgeIcon} />
                </div>
                
                <Card className="p-4 sm:p-6">
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 dark:bg-dark-secondary-bg/50">
                                <tr>
                                    <th className="w-12"></th>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="packingList">Shipment</TableHeader>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-secondary-text dark:text-dark-secondary-text uppercase tracking-wider">Timeline</th>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalQuantity" className="text-center">QTY</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="status">Status</TableHeader>
                                    <th scope="col" className="px-4 py-3.5 text-center text-xs font-semibold text-secondary-text dark:text-dark-secondary-text uppercase tracking-wider">Track</th>
                                </tr>
                            </thead>
                            <tbody className="bg-secondary-bg dark:bg-dark-secondary-bg">
                                {paginatedData.map(group => {
                                    const isExpanded = expandedRows.has(group.packingList);
                                    return (
                                        <Fragment key={group.packingList}>
                                            <tr className="border-b border-border-color dark:border-dark-border-color hover:bg-gray-50 dark:hover:bg-dark-primary-bg cursor-pointer" onClick={() => toggleExpansion(group.packingList)}>
                                                <td className="px-4 py-3 text-center"><ChevronRightIcon className={`h-5 w-5 text-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} /></td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm"><div className="font-medium text-primary-text dark:text-dark-primary-text">{group.packingList}</div><ModelSummary items={group.items} /></td>
                                                <td className="px-4 py-3 w-1/3">{group.source === 'order' && !group.packingListDate ? <div className="text-xs text-secondary-text text-center italic">Details unavailable.</div> : <ShipmentTimeline group={group} />}</td>
                                                <td className="px-4 py-3 text-center font-medium text-primary-text dark:text-dark-primary-text">{group.totalQuantity.toLocaleString()}</td>
                                                <td className="px-4 py-3"><StatusBadge status={group.status} /></td>
                                                <td className="px-4 py-3 text-center"><div className="flex justify-center items-center h-full">{group.packingList && <button onClick={e => { e.stopPropagation(); onTrackShipment(group.packingList) }} className="inline-flex items-center justify-center p-2 rounded-full text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40" title="Track Shipment"><TruckIcon className="h-5 w-5" /></button>}</div></td>
                                            </tr>
                                            <tr className="p-0"><td colSpan={6} className="p-0 border-0"><AnimatePresence>{isExpanded && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><ExpandedShipmentDetail group={group} onNavigateToOrder={handleNavigateToOrder} userRole={userRole} /></motion.div>}</AnimatePresence></td></tr>
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="md:hidden space-y-4">
                        {paginatedData.map(group => {
                            const isExpanded = expandedRows.has(group.packingList);
                            return (
                                <Card key={group.packingList} className="p-0 overflow-hidden" onClick={() => toggleExpansion(group.packingList)}>
                                    <div className="p-4">
                                        <div className="flex justify-between items-start"><div className="flex-1 min-w-0"><p className="font-bold text-lg text-primary-text">{group.packingList}</p><p className="text-sm text-secondary-text">{group.packingListDate ? new Date(group.packingListDate + 'T00:00:00Z').toLocaleDateString('en-CA') : 'N/A'}</p></div><ChevronRightIcon className={`h-6 w-6 text-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} /></div>
                                        <div className="mt-3 border-t pt-3"><p className="text-xs font-semibold text-secondary-text">Contents:</p><p className="text-sm text-primary-text truncate">{group.items.map(i => i.modelName).join(', ')}</p></div>
                                        <div className="mt-4">{group.source === 'order' && !group.packingListDate ? <div className="text-xs text-secondary-text text-center italic py-4">Details unavailable.</div> : <ShipmentTimeline group={group} />}</div>
                                        <div className="mt-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3"><StatusBadge status={group.status} />{group.packingList && <button onClick={e => { e.stopPropagation(); onTrackShipment(group.packingList); }} className="flex items-center gap-1 text-sm font-semibold text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"><TruckIcon className="h-4 w-4" /> Track</button>}</div>
                                            <p className="text-sm">Total Qty: <span className="font-bold">{group.totalQuantity.toLocaleString()}</span></p>
                                        </div>
                                    </div>
                                    <AnimatePresence>{isExpanded && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><ExpandedShipmentDetail group={group} onNavigateToOrder={handleNavigateToOrder} userRole={userRole} /></motion.div>}</AnimatePresence>
                                </Card>
                            );
                        })}
                    </div>
                </Card>
            </motion.div>
        </main>
    );
};

export default ShipmentsPage;