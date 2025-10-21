
import React from 'react';
import { motion } from 'framer-motion';
import KpiCard from '../ui/KpiCard';
import { 
    BanknotesIcon, 
    CubeIcon, 
    DocumentTextIcon,
    UserGroupIcon,
    ChartBarIcon
} from '../ui/Icons';
import type { SalesKpiData } from '../../types';

interface SalesKpiCardsProps {
  kpiData: SalesKpiData;
}

const SalesKpiCards: React.FC<SalesKpiCardsProps> = ({ kpiData }) => {
  const currencyFormatter = (val: number) => {
      const formatted = new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: 2
      }).format(val);
      return `$${formatted}`;
  };
  const percentFormatter = (val: number) => `${val.toFixed(1)}%`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        <KpiCard
            label="Total Revenue"
            value={kpiData.totalRevenue}
            formatter={currencyFormatter}
            icon={<BanknotesIcon />}
            description={`from ${kpiData.invoiceCount.toLocaleString()} invoices`}
            colorClass={{ bg: 'bg-emerald-100 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' }}
        />
        <KpiCard
            label="Total Profit"
            value={kpiData.totalProfit}
            formatter={currencyFormatter}
            icon={<BanknotesIcon />}
            description="Reconciled from costs & rebates"
            colorClass={{ bg: 'bg-emerald-100 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' }}
        />
         <KpiCard
            label="Avg. Profit Margin"
            value={kpiData.averageGrossMargin}
            formatter={percentFormatter}
            icon={<ChartBarIcon />}
            description="Across all reconciled sales"
            colorClass={{ bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' }}
        />
        <KpiCard
            label="Units Sold"
            value={kpiData.totalUnits}
            icon={<CubeIcon />}
            description={`Avg. price: ${currencyFormatter(kpiData.averageSalePricePerUnit)}`}
            colorClass={{ bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' }}
        />
         <KpiCard
            label="Unique Buyers"
            value={kpiData.uniqueBuyersCount}
            icon={<UserGroupIcon />}
            description="in the selected period"
            colorClass={{ bg: 'bg-indigo-100 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' }}
        />
    </div>
  );
};

export default SalesKpiCards;
