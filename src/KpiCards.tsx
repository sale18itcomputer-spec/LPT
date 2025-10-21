
import React from 'react';
import { motion } from 'framer-motion';
import { 
    BanknotesIcon, 
    CubeIcon, 
    DocumentTextIcon,
    ScaleIcon,
    UserGroupIcon,
    ChartBarIcon,
} from './ui/Icons';
import type { OrderKpiData, SalesKpiData } from '../types';
import KpiCard from './ui/KpiCard';

interface KpiCardsProps {
  orderKpiData?: OrderKpiData;
  salesKpiData?: SalesKpiData;
  totalOrderCount: number;
  allInvoicesCount: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const KpiCards: React.FC<KpiCardsProps> = ({ orderKpiData, salesKpiData, totalOrderCount, allInvoicesCount }) => {
    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    const compactCurrencyFormatter = (val: number) => {
        const formatted = new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 2
        }).format(val);
        return `$${formatted}`;
    };
    const percentFormatter = (val: number) => `${val.toFixed(1)}%`;

    const orderKpis = orderKpiData ? [
        { key: "backlog", label: "Total Backlog Value", value: orderKpiData.backlogValue, description: `from ${orderKpiData.openUnits.toLocaleString()} open units`, icon: <BanknotesIcon />, formatter: compactCurrencyFormatter, colorClass: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' } },
        { key: "orderValue", label: "Total Order Value", value: orderKpiData.totalFobValue, description: `${orderKpiData.totalOrders.toLocaleString()} line items`, icon: <BanknotesIcon />, formatter: compactCurrencyFormatter, colorClass: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' } },
        { key: "uniqueOrders", label: "Unique Orders", value: orderKpiData.uniqueOrderCount, icon: <DocumentTextIcon />, colorClass: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' } },
        { key: "avgOrderValue", label: "Avg. Order Value", value: orderKpiData.avgOrderValue, icon: <ScaleIcon />, formatter: compactCurrencyFormatter, colorClass: { bg: 'bg-indigo-100 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' } },
    ] : [];
    
    const salesKpis = salesKpiData ? [
        { key: "revenue", label: "Total Revenue", value: salesKpiData.totalRevenue, description: `from ${allInvoicesCount.toLocaleString()} invoices`, icon: <BanknotesIcon />, formatter: compactCurrencyFormatter, colorClass: { bg: 'bg-emerald-100 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' } },
        { key: "profit", label: "Total Profit", value: salesKpiData.totalProfit, description: "Reconciled from costs & rebates", icon: <BanknotesIcon />, formatter: compactCurrencyFormatter, colorClass: { bg: 'bg-emerald-100 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' } },
        { key: "margin", label: "Avg. Profit Margin", value: salesKpiData.averageGrossMargin, icon: <ChartBarIcon />, formatter: percentFormatter, colorClass: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' } },
        { key: "units", label: "Units Sold", value: salesKpiData.totalUnits, description: `Avg. price: ${currencyFormatter(salesKpiData.averageSalePricePerUnit)}`, icon: <CubeIcon />, colorClass: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' } },
        { key: "buyers", label: "Unique Buyers", value: salesKpiData.uniqueBuyersCount, icon: <UserGroupIcon />, colorClass: { bg: 'bg-indigo-100 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' } },
    ] : [];

    return (
        <div className="space-y-6">
            {orderKpiData && (
                <div>
                     <h2 className="text-xl font-semibold text-primary-text dark:text-dark-primary-text tracking-tight mb-4">Order KPIs</h2>
                    <motion.div 
                        className="grid grid-cols-fluid gap-4 sm:gap-6"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {orderKpis.map(kpi => (
                            <KpiCard key={kpi.key} {...kpi} />
                        ))}
                    </motion.div>
                </div>
            )}
             {salesKpiData && (
                 <div>
                     <h2 className="text-xl font-semibold text-primary-text dark:text-dark-primary-text tracking-tight mb-4">Sales KPIs</h2>
                    <motion.div 
                        className="grid grid-cols-fluid gap-4 sm:gap-6"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {salesKpis.map(kpi => (
                            <KpiCard key={kpi.key} {...kpi} />
                        ))}
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default KpiCards;
