import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { SalesOpportunity, CustomerSalesOpportunity, LocalFiltersState } from '../../types';
import Card from '../ui/Card';
import AnimatedCounter from '../ui/AnimatedCounter';
import { SparklesIcon, BanknotesIcon, UserGroupIcon } from '../ui/Icons';
import CustomerOpportunityTable from './CustomerOpportunityTable';
import SalesPlaybookModal from './SalesPlaybookModal';
import AISalesBriefing from './AISalesBriefing';
import { useData } from '../../contexts/DataContext';

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const KpiCard = React.forwardRef<HTMLDivElement, { label: string; value: number; icon: React.ReactElement<React.SVGProps<SVGSVGElement>>; formatter?: (val: number) => string; }>(({ label, value, icon, formatter }, ref) => (
    <Card ref={ref} className="p-5 h-full">
        <div className="flex items-center">
            <div className="flex-shrink-0">{React.cloneElement(icon, { className: 'h-7 w-7 text-secondary-text' })}</div>
            <div className="ml-5 w-0 flex-1">
                <dl>
                    <dt className="text-sm font-medium text-secondary-text truncate">{label}</dt>
                    <dd className="text-2xl font-bold text-primary-text"><AnimatedCounter to={value} formatter={formatter} /></dd>
                </dl>
            </div>
        </div>
    </Card>
));
KpiCard.displayName = 'KpiCard';


interface StrategicSalesDashboardProps {
    onPsrefLookup: (item: { mtm: string; modelName: string }) => void;
    localFilters: LocalFiltersState;
}

const StrategicSalesDashboard = React.forwardRef<HTMLDivElement, StrategicSalesDashboardProps>(({ onPsrefLookup, localFilters }, ref) => {
    const { customerOpportunities } = useData();
    const [selectedOpportunity, setSelectedOpportunity] = useState<SalesOpportunity | SalesOpportunity[] | null>(null);

    const handleGeneratePlaybook = (opportunity: SalesOpportunity | SalesOpportunity[]) => {
        setSelectedOpportunity(opportunity);
    };

    const handleCloseModal = () => {
        setSelectedOpportunity(null);
    };

    const filteredOpportunities = useMemo(() => {
        const { strategicSearchTerm, strategicCustomerTier } = localFilters;
        let filtered = [...customerOpportunities];

        if (strategicSearchTerm) {
            const lowerSearch = strategicSearchTerm.toLowerCase();
            filtered = filtered.filter(co => co.customerName.toLowerCase().includes(lowerSearch));
        }

        if (strategicCustomerTier.length > 0) {
            filtered = filtered.filter(co => co.customerTier && strategicCustomerTier.includes(co.customerTier));
        }

        return filtered;
    }, [customerOpportunities, localFilters]);
    
    const kpiData = useMemo(() => {
        return {
            customersWithOpps: filteredOpportunities.length,
            totalOpportunityValue: filteredOpportunities.reduce((sum, c) => sum + c.totalOpportunityValue, 0),
            highPriorityCustomers: filteredOpportunities.filter(c => c.customerOpportunityScore >= 75).length,
        };
    }, [filteredOpportunities]);

    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    return (
        <>
            <motion.main 
                ref={ref} 
                className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={itemVariants}>
                    <h1 className="text-3xl font-bold tracking-tight text-primary-text">Strategic Sales Advisor</h1>
                    <p className="text-secondary-text mt-1">AI-powered insights to sell surplus stock to the right customers.</p>
                </motion.div>

                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    <motion.div 
                        className="md:col-span-1"
                        variants={itemVariants}
                    >
                        <AISalesBriefing customerOpportunities={filteredOpportunities} />
                    </motion.div>
                    
                    <motion.div 
                        className="md:col-span-2"
                        variants={itemVariants}
                    >
                         <motion.div 
                            className="grid grid-cols-1 sm:grid-cols-3 gap-6"
                            variants={containerVariants}
                        >
                            <motion.div variants={itemVariants}><KpiCard label="Customers with Opportunities" value={kpiData.customersWithOpps} icon={<UserGroupIcon />} /></motion.div>
                            <motion.div variants={itemVariants}><KpiCard label="Total Opportunity Value" value={kpiData.totalOpportunityValue} icon={<BanknotesIcon />} formatter={currencyFormatter}/></motion.div>
                            <motion.div variants={itemVariants}><KpiCard label="High-Priority Customers" value={kpiData.highPriorityCustomers} icon={<SparklesIcon />} /></motion.div>
                        </motion.div>
                    </motion.div>
                </motion.div>


                <motion.div variants={itemVariants}>
                    <Card className="p-4 sm:p-6">
                        <CustomerOpportunityTable 
                            customerOpportunities={filteredOpportunities} 
                            onGeneratePlaybook={handleGeneratePlaybook}
                            onPsrefLookup={onPsrefLookup}
                        />
                    </Card>
                </motion.div>
            </motion.main>
            <SalesPlaybookModal
                isOpen={!!selectedOpportunity}
                onClose={handleCloseModal}
                opportunity={selectedOpportunity}
            />
        </>
    );
});

StrategicSalesDashboard.displayName = 'StrategicSalesDashboard';

export default StrategicSalesDashboard;
