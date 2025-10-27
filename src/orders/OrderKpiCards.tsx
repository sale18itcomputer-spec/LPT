
import React from 'react';
import KpiCard from '../ui/KpiCard';
import { 
    BanknotesIcon, 
    CubeIcon, 
    ExclamationTriangleIcon,
    ClockIcon,
    ArrowPathIcon,
    CheckBadgeIcon,
} from '../ui/Icons';
import type { OrderKpiData } from '../../types';

interface OrderKpiCardsProps {
  kpiData: OrderKpiData;
}

const OrderKpiCards: React.FC<OrderKpiCardsProps> = ({ kpiData }) => {
  const currencyFormatter = (val: number) => {
      const formatted = new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: 2
      }).format(val);
      return `$${formatted}`;
  };
  const percentFormatter = (val: number) => `${val.toFixed(1)}%`;
  const daysFormatter = (val: number) => `${val.toFixed(0)} days`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
        <KpiCard
            label="Backlog Value"
            value={kpiData.backlogValue}
            formatter={currencyFormatter}
            icon={<BanknotesIcon />}
            description={`${kpiData.openUnits.toLocaleString()} open units`}
            colorClass={{ bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' }}
        />
        <KpiCard
            label="Open Units"
            value={kpiData.openUnits}
            icon={<CubeIcon />}
            description="Total units not yet arrived"
            colorClass={{ bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' }}
        />
        <KpiCard
            label="Delayed Orders"
            value={kpiData.delayedOrdersCount}
            icon={<ExclamationTriangleIcon />}
            description="Past scheduled ship/arrival date"
            colorClass={{ bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' }}
        />
        <KpiCard
            label="At-Risk Orders"
            value={kpiData.atRiskOrdersCount}
            icon={<ClockIcon />}
            description="Approaching ship date without shipping"
            colorClass={{ bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' }}
        />
        <KpiCard
            label="Avg. Lead Time"
            value={kpiData.averageLeadTime}
            icon={<ArrowPathIcon />}
            formatter={daysFormatter}
            description="From PI to actual arrival"
            colorClass={{ bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' }}
        />
        <KpiCard
            label="On-Time Arrival Rate"
            value={kpiData.onTimeArrivalRate}
            icon={<CheckBadgeIcon />}
            formatter={percentFormatter}
            description={`${kpiData.onTimeEligibleCount} eligible orders`}
            colorClass={{ bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' }}
        />
    </div>
  );
};

export default OrderKpiCards;
