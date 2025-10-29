

import React, { useMemo, useState, useContext } from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import type { Sale } from '../../types';
import { ThemeContext } from '../../contexts/ThemeContext';
import AnimatedCounter from '../ui/AnimatedCounter';

const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
const compactCurrencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(val);

interface SalesBySegmentChartProps {
  data: Sale[];
  onSegmentSelect: (segment: string | null) => void;
  selectedSegment: string | null;
}

const PALETTE = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
  '#EF4444', '#6366F1', '#EC4899', '#14B8A6',
];

const SalesBySegmentChart: React.FC<SalesBySegmentChartProps> = ({ data, onSegmentSelect, selectedSegment }) => {
    const themeContext = useContext(ThemeContext);
    const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

    const { segmentData, totalRevenue, maxSegmentValue } = useMemo(() => {
// FIX: Explicitly type the initial value of the reduce function to ensure correct type inference.
        const aggregated = data.reduce<Record<string, number>>((acc, sale) => {
            const segment = sale.segment || 'Unknown';
            if (segment === 'N/A') return acc;
            acc[segment] = (acc[segment] || 0) + sale.totalRevenue;
            return acc;
        }, {});
        
        const total = Object.values(aggregated).reduce((sum, val) => sum + val, 0);

        const sortedData = Object.entries(aggregated)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return {
            totalRevenue: total,
            segmentData: sortedData,
            maxSegmentValue: sortedData[0]?.value || 1,
        };
    }, [data]);
    
    // Data for the radial chart
    const chartData = useMemo(() => segmentData.map((d, i) => ({
        ...d,
        fill: PALETTE[i % PALETTE.length],
    })), [segmentData]);
    
    const activeSegment = hoveredSegment || selectedSegment;
    const activeValue = activeSegment ? segmentData.find(s => s.name === activeSegment)?.value : totalRevenue;

    return (
        <div className="bg-secondary-bg dark:bg-dark-secondary-bg rounded-2xl shadow-lg shadow-primary-text/5 dark:shadow-black/20 border border-border-color dark:border-dark-border-color flex flex-col h-[560px]">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-border-color dark:border-dark-border-color">
                <h3 className="text-lg font-semibold text-primary-text dark:text-dark-primary-text tracking-tight">Sales by Segment</h3>
                <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1">
                    Total Revenue: <span className="font-bold">{currencyFormatter(totalRevenue)}</span>
                </p>
            </div>

            {/* Content */}
            <div className="flex-grow min-h-0 p-4 sm:p-6 flex flex-col md:flex-row gap-6">
                {/* Left: Legend List */}
                <div className="md:w-1/2 flex-grow min-h-0 overflow-y-auto custom-scrollbar -mr-3 pr-3 space-y-2">
                    {segmentData.map((segment, index) => {
// FIX: Ensure arithmetic operations are performed on numbers by correcting type inference in the `useMemo` hook.
                        const percentage = totalRevenue > 0 ? (segment.value / totalRevenue) * 100 : 0;
                        const barPercentage = (segment.value / maxSegmentValue) * 100;
                        const isSelected = selectedSegment === segment.name;
                        const isHovered = hoveredSegment === segment.name;
                        const isDimmed = selectedSegment && !isSelected;

                        return (
                            <motion.button
                                key={segment.name}
                                onClick={() => onSegmentSelect(isSelected ? null : segment.name)}
                                onMouseEnter={() => setHoveredSegment(segment.name)}
                                onMouseLeave={() => setHoveredSegment(null)}
                                className={`w-full text-left p-3 rounded-lg transition-all duration-200 border ${
                                    isSelected ? 'bg-highlight-hover dark:bg-dark-highlight-hover border-highlight/50' : 
                                    isHovered ? 'bg-gray-50 dark:bg-dark-secondary-bg/50 border-border-color dark:border-dark-border-color' :
                                    'bg-secondary-bg dark:bg-dark-secondary-bg border-transparent'
                                } ${isDimmed ? 'opacity-50' : ''}`}
                                whileHover={{ scale: 1.02 }}
                                layout
                            >
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[index % PALETTE.length] }}></span>
                                        <span className="font-semibold text-primary-text dark:text-dark-primary-text">{segment.name}</span>
                                    </div>
                                    <span className="font-bold text-primary-text dark:text-dark-primary-text">{compactCurrencyFormatter(segment.value)}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="w-full bg-gray-200 dark:bg-dark-border-color rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full" style={{ width: `${barPercentage}%`, backgroundColor: PALETTE[index % PALETTE.length] }}></div>
                                    </div>
                                    <span className="text-xs font-medium text-secondary-text dark:text-dark-secondary-text w-12 text-right">{percentage.toFixed(1)}%</span>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Right: Chart */}
                <div className="md:w-1/2 flex-1 min-h-[200px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="50%"
                            outerRadius="100%"
                            barSize={10}
                            data={chartData}
                            startAngle={90}
                            endAngle={-270}
                        >
                            <PolarAngleAxis
                                type="number"
                                domain={[0, maxSegmentValue]}
                                angleAxisId={0}
                                tick={false}
                            />
                            <RadialBar
                                background
                                dataKey="value"
                                cornerRadius={10}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.fill} 
                                        opacity={(selectedSegment && selectedSegment !== entry.name) ? 0.3 : 1}
                                        onMouseEnter={() => setHoveredSegment(entry.name)}
                                        onMouseLeave={() => setHoveredSegment(null)}
                                        onClick={() => onSegmentSelect(selectedSegment === entry.name ? null : entry.name)}
                                        style={{ cursor: 'pointer', transition: 'opacity 0.2s ease-in-out' }}
                                    />
                                ))}
                            </RadialBar>
                            <text
                                x="50%"
                                y="50%"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="transition-opacity duration-300"
                            >
                                <tspan
                                    x="50%"
                                    dy="-0.5em"
                                    className="text-xs fill-secondary-text dark:fill-dark-secondary-text font-medium"
                                >
                                    {activeSegment || 'Total Revenue'}
                                </tspan>
                                <tspan
                                    x="50%"
                                    dy="1.2em"
                                    className="text-2xl fill-primary-text dark:fill-dark-primary-text font-bold"
                                >
                                    <AnimatedCounter to={activeValue || 0} formatter={compactCurrencyFormatter} />
                                </tspan>
                            </text>
                        </RadialBarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default SalesBySegmentChart;