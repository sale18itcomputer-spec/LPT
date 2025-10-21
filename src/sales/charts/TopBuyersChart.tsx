

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DocumentMagnifyingGlassIcon } from '../../ui/Icons';
import type { Sale } from '../../../types';

const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
const compactCurrencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(val);

interface TopBuyersChartProps {
  data: Sale[];
  onBuyerSelect: (buyer: string) => void;
  selectedBuyer: string | null;
  itemCount: number;
}

const TopBuyersChart: React.FC<TopBuyersChartProps> = ({ data, onBuyerSelect, selectedBuyer, itemCount }) => {

    const chartData = useMemo(() => {
        // FIX: Explicitly type the accumulator in the reduce function to ensure correct type inference.
        const aggregated = data.reduce((acc: Record<string, number>, sale) => {
            const buyer = sale.buyerName || 'Unknown';
            if (buyer === 'N/A') return acc;
            acc[buyer] = (acc[buyer] || 0) + sale.totalRevenue;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(aggregated)
            .map(([name, value]) => ({ name, value }))
            // FIX: Explicitly type sort parameters `a` and `b` to fix type inference.
            .sort((a: { value: number }, b: { value: number }) => b.value - a.value)
            .slice(0, itemCount);
    }, [data, itemCount]);

    if (chartData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-secondary-text p-4 text-center">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">No buyer data available.</p>
            </div>
        );
    }
    
    const maxRevenue = Math.max(...chartData.map(d => d.value), 1);
    
    return (
        <motion.div
            className="space-y-4 p-4 sm:p-6 h-full flex flex-col"
            initial="hidden"
            animate="visible"
            variants={{
                visible: { transition: { staggerChildren: 0.05 } }
            }}
        >
            {chartData.map((item) => {
                const barWidth = (item.value / maxRevenue) * 100;

                return (
                    <motion.div
                        key={item.name}
                        onClick={() => onBuyerSelect(item.name)}
                        title={`${item.name}: ${currencyFormatter(item.value)}`}
                        className={`cursor-pointer group transition-all duration-200 ${selectedBuyer && selectedBuyer !== item.name ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}
                        variants={{
                            hidden: { opacity: 0, x: -20 },
                            visible: { opacity: 1, x: 0 }
                        }}
                        whileHover={{ scale: 1.01 }}
                    >
                        <div className="flex justify-between items-center text-sm mb-1.5">
                            <span className="font-medium text-primary-text dark:text-dark-primary-text truncate">{item.name}</span>
                            <span className="text-secondary-text dark:text-dark-secondary-text">{currencyFormatter(item.value)}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-dark-border-color rounded-lg h-6 overflow-hidden">
                             <motion.div 
                                className="bg-blue-500 h-full rounded-lg flex items-center"
                                initial={{ width: 0 }}
                                animate={{ width: `${barWidth}%` }}
                                transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
                            >
                                {barWidth > 15 && (
                                    <motion.div
                                        className="ml-1.5 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                    >
                                        {compactCurrencyFormatter(item.value)}
                                    </motion.div>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                );
            })}
        </motion.div>
    );
};

export default TopBuyersChart;