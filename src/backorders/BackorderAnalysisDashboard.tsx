
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Sale, BackorderRecommendation, LocalFiltersState } from '../../types';
import Card from '../ui/Card';
import KpiCard from '../ui/KpiCard';
import ChartCard from '../ui/ChartCard';
import { CubeIcon, BanknotesIcon, ExclamationTriangleIcon, UserGroupIcon } from '../ui/Icons';
import BackorderTable from './BackorderTable';
import BackorderPriorityChart from './BackorderPriorityChart';
import { useData } from '../../contexts/DataContext';

interface BackorderAnalysisDashboardProps {
    localFilters: LocalFiltersState;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};


const BackorderAnalysisDashboard = React.forwardRef<HTMLDivElement, BackorderAnalysisDashboardProps>(({ localFilters }, ref) => {
    const { allSales, backorderRecommendations } = useData();
    
    const filteredRecommendations = useMemo(() => {
        const { backorderSearchTerm, backorderPriority } = localFilters;
        let filtered = [...backorderRecommendations];
        
        if (backorderSearchTerm) {
            const lowercasedFilter = backorderSearchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                item.mtm.toLowerCase().includes(lowercasedFilter) ||
                item.modelName.toLowerCase().includes(lowercasedFilter) ||
                item.productLine.toLowerCase().includes(lowercasedFilter)
            );
        }

        if (backorderPriority !== 'all') {
            filtered = filtered.filter(item => item.priority === backorderPriority);
        }

        return filtered;
    }, [backorderRecommendations, localFilters]);
    
    const { kpiData, uniqueAffectedCustomers } = useMemo(() => {
        const highPriorityItems = filteredRecommendations.filter(r => r.priority === 'High');
        const kpiData = {
            highPriority: highPriorityItems.length,
            totalPotentialRevenue: filteredRecommendations.reduce((sum, r) => sum + r.estimatedBackorderValue, 0),
            oosWithDemand: filteredRecommendations.length,
        };
        
        const customerSet = new Set<string>();
        const now = new Date();
        const ninetyDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
        const backorderedMtms = new Set(filteredRecommendations.map(r => r.mtm));

        allSales.forEach(sale => {
            if (backorderedMtms.has(sale.lenovoProductNumber)) {
                const saleDate = sale.invoiceDate ? new Date(sale.invoiceDate) : null;
                if (saleDate && saleDate >= ninetyDaysAgo) {
                    customerSet.add(sale.buyerId);
                }
            }
        });
        
        return { kpiData, uniqueAffectedCustomers: customerSet.size };
    }, [filteredRecommendations, allSales]);
    
    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    return (
        <motion.main 
            ref={ref} 
            className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={containerVariants}>
                <h1 className="text-3xl font-bold tracking-tight text-primary-text">Backorder Command Center</h1>
                <p className="text-secondary-text mt-1">Intelligent prioritization of out-of-stock items based on sales velocity and customer impact.</p>
            </motion.div>

            <motion.div 
                className="grid grid-cols-fluid gap-6"
                variants={containerVariants}
            >
                <KpiCard
                    label="High-Priority Items"
                    value={kpiData.highPriority}
                    description="Requiring immediate attention"
                    icon={<ExclamationTriangleIcon />}
                />
                <KpiCard
                    label="Potential Revenue"
                    value={kpiData.totalPotentialRevenue}
                    description="Estimated value of backordered items"
                    icon={<BanknotesIcon />}
                    formatter={currencyFormatter}
                />
                <KpiCard
                    label="OOS SKUs with Demand"
                    value={kpiData.oosWithDemand}
                    description="Unique items out of stock with recent sales"
                    icon={<CubeIcon />}
                />
                <KpiCard
                    label="Affected Customers"
                    value={uniqueAffectedCustomers}
                    description="Unique customers who purchased these items recently"
                    icon={<UserGroupIcon />}
                />
            </motion.div>
            
            <motion.div variants={containerVariants}>
                <ChartCard
                    title="Backorder Strategy Matrix"
                    description="A 2x2 matrix segmenting backorders by sales velocity vs. potential value."
                >
                        <div className="min-h-[500px]">
                        <BackorderPriorityChart recommendations={filteredRecommendations} />
                        </div>
                </ChartCard>
            </motion.div>
            
            <motion.div variants={containerVariants}>
                <Card className="p-4 sm:p-6">
                    <BackorderTable recommendations={filteredRecommendations} allSales={allSales} />
                </Card>
            </motion.div>
        </motion.main>
    );
});
BackorderAnalysisDashboard.displayName = 'BackorderAnalysisDashboard';

export default BackorderAnalysisDashboard;