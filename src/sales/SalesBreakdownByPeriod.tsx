import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Sale } from '../../types';
import Card from '../ui/Card';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '../ui/Icons';
import SegmentedControl from '../ui/SegmentedControl';
import { getISOWeek } from '../../utils/dateHelpers';

interface PeriodData {
    period: string;
    revenue: number;
    growth: number | null;
}

type PeriodType = 'quarterly' | 'monthly' | 'weekly';

const SalesBreakdownByPeriod: React.FC<{ sales: Sale[] }> = ({ sales }) => {
    const [periodType, setPeriodType] = useState<PeriodType>('quarterly');

    const periodData = useMemo((): PeriodData[] => {
        const dataByPeriod: Record<string, number> = {};
        const sortKeys: Record<string, string> = {}; // For consistent sorting

        if (periodType === 'quarterly') {
            sales.forEach(sale => {
                if (!sale.invoiceDate) return;
                const date = new Date(sale.invoiceDate);
                const year = date.getUTCFullYear();
                const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
                const key = `Q${quarter} ${year}`;
                dataByPeriod[key] = (dataByPeriod[key] || 0) + sale.totalRevenue;
                sortKeys[key] = `${year}-Q${quarter}`;
            });
        } else if (periodType === 'monthly') {
            sales.forEach(sale => {
                if (!sale.invoiceDate) return;
                const date = new Date(sale.invoiceDate);
                const year = date.getUTCFullYear();
                const month = date.getUTCMonth();
                const monthLabel = date.toLocaleString('en-US', { timeZone: 'UTC', month: 'short' });
                const key = `${monthLabel} ${year}`;
                dataByPeriod[key] = (dataByPeriod[key] || 0) + sale.totalRevenue;
                sortKeys[key] = `${year}-${String(month).padStart(2, '0')}`;
            });
        } else { // weekly
            sales.forEach(sale => {
                if (!sale.invoiceDate) return;
                const date = new Date(sale.invoiceDate);
                const year = date.getUTCFullYear();
                const week = getISOWeek(date);
                const key = `Week ${week}, ${year}`;
                dataByPeriod[key] = (dataByPeriod[key] || 0) + sale.totalRevenue;
                sortKeys[key] = `${year}-${String(week).padStart(2, '0')}`;
            });
        }
        
        const limit = periodType === 'quarterly' ? 4 : periodType === 'monthly' ? 6 : 8;

        const sortedPeriods = Object.entries(dataByPeriod)
            .map(([period, revenue]) => ({ period, revenue, sortKey: sortKeys[period] }))
            .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
            .slice(0, limit);

        return sortedPeriods.map((current, index, arr) => {
            const previous = arr[index + 1];
            let growth: number | null = null;
            if (previous && previous.revenue > 0) {
                growth = ((current.revenue - previous.revenue) / previous.revenue) * 100;
            }
            return { period: current.period, revenue: current.revenue, growth };
        }).reverse(); // Reverse to show oldest first
    }, [sales, periodType]);

    const maxRevenue = useMemo(() => Math.max(...periodData.map(p => p.revenue), 1), [periodData]);
    
    if (periodData.length < 2 && periodType === 'quarterly') {
        return null;
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <Card
            title="Sales Breakdown by Period"
            description={`${periodType.charAt(0).toUpperCase() + periodType.slice(1)} revenue and growth comparison.`}
            controls={
                <SegmentedControl
                    value={periodType}
                    onChange={(val) => setPeriodType(val as PeriodType)}
                    options={[
                        { label: 'Quarterly', value: 'quarterly' },
                        { label: 'Monthly', value: 'monthly' },
                        { label: 'Weekly', value: 'weekly' },
                    ]}
                    label="Select period type"
                />
            }
            className="h-full flex flex-col"
        >
            <div className="p-4 sm:p-6 pt-0 flex-grow">
                <div className="flow-root h-full">
                    <div className="-mx-4 -my-2 sm:-mx-6 lg:-mx-8 h-full">
                        <div className="inline-block min-w-full py-2 align-middle h-full">
                            <div className="flex flex-col h-full">
                                {/* Headers */}
                                <div className="grid grid-cols-12 gap-x-4 px-4 sm:px-6 lg:px-8 border-b border-border-color dark:border-dark-border-color pb-2 flex-shrink-0">
                                    <div className="col-span-3 text-xs font-semibold text-secondary-text dark:text-dark-secondary-text uppercase">Period</div>
                                    <div className="col-span-6 text-xs font-semibold text-secondary-text dark:text-dark-secondary-text uppercase">Revenue</div>
                                    <div className="col-span-3 text-xs font-semibold text-secondary-text dark:text-dark-secondary-text uppercase text-right">Growth</div>
                                </div>
                                {/* Rows */}
                                <motion.div 
                                    className="mt-2 flex-grow"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    {periodData.map((item) => (
                                        <motion.div 
                                            key={item.period} 
                                            variants={itemVariants}
                                            className="grid grid-cols-12 gap-x-4 items-center px-4 sm:px-6 lg:px-8 py-3 border-t border-border-color dark:border-dark-border-color first:border-t-0"
                                        >
                                            <div className="col-span-3 text-sm font-medium text-primary-text dark:text-dark-primary-text">{item.period}</div>
                                            <div className="col-span-6 flex items-center gap-x-3">
                                                <span className="w-28 text-sm font-semibold text-primary-text dark:text-dark-primary-text text-left">
                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(item.revenue)}
                                                </span>
                                                <div className="flex-grow bg-gray-200 dark:bg-dark-border-color rounded-full h-2.5">
                                                    <motion.div 
                                                        className="bg-highlight h-2.5 rounded-full" 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-span-3 text-sm font-medium text-right">
                                                {item.growth !== null ? (
                                                    <span className={`inline-flex items-center ${item.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {item.growth >= 0 ? <ArrowTrendingUpIcon className="h-4 w-4 mr-1" /> : <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />}
                                                        {Math.abs(item.growth).toFixed(1)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-secondary-text dark:text-dark-secondary-text">--</span>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default SalesBreakdownByPeriod;
