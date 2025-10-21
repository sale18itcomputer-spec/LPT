import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Order, Sale, InventoryItem, ViewType, LocalFiltersState } from '../../types';
import Card from '../ui/Card';
import KpiCard from '../ui/KpiCard';
import ChartCard from '../ui/ChartCard';
import { CubeIcon, BanknotesIcon, TagIcon, ExclamationTriangleIcon, TruckIcon } from '../ui/Icons';
import InventoryTable from './InventoryTable';
import InventoryStatusChart from './InventoryStatusChart';
import InventoryFilters from './InventoryFilters';
import FilterManager from '../ui/FilterManager';
import { INITIAL_LOCAL_FILTERS } from '../../constants';

interface InventoryDashboardProps {
    inventoryData: InventoryItem[];
    onNavigate: (view: ViewType, filters: Partial<LocalFiltersState>) => void;
    onPsrefLookup: (item: { mtm: string; modelName: string }) => void;
    localFilters: LocalFiltersState;
    userRole: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const InventoryDashboard = React.forwardRef<HTMLDivElement, InventoryDashboardProps>(({ inventoryData, onNavigate, onPsrefLookup, localFilters, userRole }, ref) => {
    
    const baseInventoryData = useMemo(() => {
        return inventoryData.filter(item => item.productLine !== 'Backpack' && item.productLine !== 'Mouse');
    }, [inventoryData]);

    const filteredInventoryData = useMemo(() => {
        const { inventorySearchTerm, inventoryProductLine, stockStatus } = localFilters;
        
        return baseInventoryData.filter(item => {
            if (inventoryProductLine !== 'all' && item.productLine !== inventoryProductLine) {
                return false;
            }
            if (stockStatus) {
                const weeks = item.weeksOfInventory;
                switch (stockStatus) {
                    case 'oversold': return item.onHandQty < 0;
                    case 'otw': return item.otwQty > 0;
                    case 'outOfStock': return item.onHandQty <= 0;
                    case 'noSales': return item.onHandQty > 0 && weeks === null;
                    case 'lowStock': return item.onHandQty > 0 && weeks !== null && weeks <= 12 && weeks >=4;
                    case 'critical': return item.onHandQty > 0 && weeks !== null && weeks < 4;
                    case 'healthy': return weeks !== null && weeks > 12;
                    default: break;
                }
            }
            if (inventorySearchTerm) {
                const lowerSearch = inventorySearchTerm.toLowerCase();
                if (!item.mtm.toLowerCase().includes(lowerSearch) && !item.modelName.toLowerCase().includes(lowerSearch)) {
                    return false;
                }
            }
            return true;
        });
    }, [baseInventoryData, localFilters]);


    const kpiData = useMemo(() => {
        if (!baseInventoryData) {
            return {
                totalOnhandValue: 0,
                totalOtwValue: 0,
                totalOnhandUnits: 0,
                totalOtwUnits: 0,
                unaccountedUnits: 0,
                oversoldItems: 0,
            };
        }
        return {
            totalOnhandValue: baseInventoryData.reduce((sum, item) => sum + (item.onHandValue > 0 ? item.onHandValue : 0), 0),
            totalOtwValue: baseInventoryData.reduce((sum, item) => sum + item.otwValue, 0),
            totalOnhandUnits: baseInventoryData.reduce((sum, item) => sum + item.onHandQty, 0),
            totalOtwUnits: baseInventoryData.reduce((sum, item) => sum + item.otwQty, 0),
            unaccountedUnits: baseInventoryData.reduce((sum, item) => sum + item.unaccountedStockQty, 0),
            oversoldItems: baseInventoryData.filter(item => item.onHandQty < 0).length,
        };
    }, [baseInventoryData]);
    
    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    const handleFilterClick = (filter: LocalFiltersState['stockStatus']) => {
        onNavigate('inventory', { stockStatus: localFilters.stockStatus === filter ? 'all' : filter });
    };

    return (
        <div ref={ref}>
            <motion.div 
                className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={containerVariants}>
                    <h1 className="text-3xl font-bold tracking-tight text-primary-text">Inventory Status</h1>
                    <p className="text-secondary-text mt-1">An interactive, high-level overview of your inventory health.</p>
                </motion.div>
                
                <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                         <motion.div 
                            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                            variants={containerVariants}
                        >
                            {userRole === 'Admin' && (
                                <KpiCard
                                    label="On Hand Stock Value"
                                    value={kpiData.totalOnhandValue}
                                    formatter={currencyFormatter}
                                    icon={<BanknotesIcon />}
                                    colorClass={{ bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' }}
                                    description="Based on average FOB cost"
                                />
                            )}
                            <KpiCard
                                label="Units On Hand"
                                value={kpiData.totalOnhandUnits}
                                icon={<CubeIcon />}
                                colorClass={{ bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' }}
                                description="Serialized & available stock"
                            />
                            <KpiCard
                                label="Units On The Way"
                                value={kpiData.totalOtwUnits}
                                icon={<TruckIcon />}
                                colorClass={{ bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' }}
                                description={userRole === 'Admin' ? `${currencyFormatter(kpiData.totalOtwValue)} FOB value` : ''}
                                onClick={() => handleFilterClick('otw')}
                                isActive={localFilters.stockStatus === 'otw'}
                            />
                            <KpiCard
                                label="Unaccounted Stock"
                                value={kpiData.unaccountedUnits}
                                icon={<ExclamationTriangleIcon />}
                                colorClass={{ bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' }}
                                description="Theoretical stock not yet serialized."
                            />
                        </motion.div>
                    </div>
                    <motion.div variants={containerVariants} className="lg:col-span-2">
                        <ChartCard 
                          title="Inventory Health Overview"
                          description="Hover a segment for details, or click to filter the table below."
                          className="h-full"
                        >
                            <div className="h-full">
                                <InventoryStatusChart 
                                    data={baseInventoryData} 
                                    onFilterChange={(f) => handleFilterClick(f as LocalFiltersState['stockStatus'])} 
                                    activeFilter={localFilters.stockStatus}
                                />
                            </div>
                        </ChartCard>
                    </motion.div>
                </motion.div>

                <motion.div variants={containerVariants}>
                    <Card className="p-4 sm:p-6">
                        <InventoryTable 
                            data={filteredInventoryData}
                            onPsrefLookup={onPsrefLookup}
                            userRole={userRole}
                        />
                    </Card>
                </motion.div>
            </motion.div>
        </div>
    );
});

InventoryDashboard.displayName = 'InventoryDashboard';

export default InventoryDashboard;