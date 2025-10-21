
import React, { useMemo } from 'react';
import type { BackorderRecommendation } from '../../types';
import { FireIcon, ArrowTrendingUpIcon, BanknotesIcon, EyeIcon } from '../ui/Icons';

// Quadrant Component
const MatrixQuadrant: React.FC<{
    title: string;
    description: string;
    icon: React.FC<any>;
    items: BackorderRecommendation[];
    bgColorClass: string;
    borderColorClass: string;
}> = ({ title, description, icon: Icon, items, bgColorClass, borderColorClass }) => (
    <div className={`rounded-lg p-4 flex flex-col h-full ${bgColorClass} border ${borderColorClass}`}>
        <div className="flex items-center gap-x-3 mb-3">
            <Icon className="h-6 w-6 text-primary-text dark:text-dark-primary-text" />
            <div>
                <h4 className="font-bold text-primary-text dark:text-dark-primary-text">{title}</h4>
                <p className="text-xs text-secondary-text dark:text-dark-secondary-text">{description}</p>
            </div>
        </div>
        <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-2">
            {items.length > 0 ? (
                items.map(item => (
                    <div key={item.mtm} className="bg-secondary-bg dark:bg-dark-secondary-bg p-2 rounded-md shadow-sm text-xs group" title={`MTM: ${item.mtm}`}>
                        <div className="flex justify-between items-center">
                            <p className="font-semibold text-primary-text dark:text-dark-primary-text truncate">{item.modelName}</p>
                            <span className="font-bold text-red-600 dark:text-red-400 ml-2">{item.priorityScore}</span>
                        </div>
                        <div className="flex justify-between items-center text-secondary-text dark:text-dark-secondary-text mt-1">
                            <span>Sales (90d): {item.recentSalesUnits}</span>
                            <span>Value: ${new Intl.NumberFormat('en-US', { notation: 'compact' }).format(item.estimatedBackorderValue)}</span>
                        </div>
                    </div>
                ))
            ) : (
                <div className="flex items-center justify-center h-full text-secondary-text dark:text-dark-secondary-text text-sm">
                    No items in this category.
                </div>
            )}
        </div>
    </div>
);

const BackorderPriorityChart: React.FC<{ recommendations: BackorderRecommendation[] }> = ({ recommendations }) => {

    const matrixData = useMemo(() => {
        if (recommendations.length < 2) {
            return {
                critical: [],
                highVelocity: [],
                highValue: [],
                watchList: [],
            };
        }

        const sortedBySales = [...recommendations].sort((a, b) => a.recentSalesUnits - b.recentSalesUnits);
        const medianSales = sortedBySales[Math.floor(sortedBySales.length / 2)].recentSalesUnits;

        const sortedByValue = [...recommendations].sort((a, b) => a.estimatedBackorderValue - b.estimatedBackorderValue);
        const medianValue = sortedByValue[Math.floor(sortedByValue.length / 2)].estimatedBackorderValue;

        const quadrants = {
            critical: [] as BackorderRecommendation[],
            highVelocity: [] as BackorderRecommendation[],
            highValue: [] as BackorderRecommendation[],
            watchList: [] as BackorderRecommendation[],
        };

        recommendations.forEach(item => {
            const isHighSales = item.recentSalesUnits >= medianSales;
            const isHighValue = item.estimatedBackorderValue >= medianValue;

            if (isHighSales && isHighValue) quadrants.critical.push(item);
            else if (isHighSales && !isHighValue) quadrants.highVelocity.push(item);
            else if (!isHighSales && isHighValue) quadrants.highValue.push(item);
            else quadrants.watchList.push(item);
        });
        
        // Sort within each quadrant by priority score
        Object.values(quadrants).forEach(q => q.sort((a,b) => b.priorityScore - a.priorityScore));

        return quadrants;
    }, [recommendations]);


    return (
        <div className="h-full p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 dark:bg-dark-primary-bg rounded-lg">
            <div>
                <MatrixQuadrant
                    title="Critical"
                    description="High Velocity & High Value"
                    icon={FireIcon}
                    items={matrixData.critical}
                    bgColorClass="bg-red-100/70 dark:bg-red-900/20"
                    borderColorClass="border-red-200 dark:border-red-800/30"
                />
            </div>
            <div>
                 <MatrixQuadrant
                    title="High Velocity"
                    description="Fast-Moving, Lower Value"
                    icon={ArrowTrendingUpIcon}
                    items={matrixData.highVelocity}
                    bgColorClass="bg-orange-100/70 dark:bg-orange-900/20"
                    borderColorClass="border-orange-200 dark:border-orange-800/30"
                />
            </div>
            <div>
                 <MatrixQuadrant
                    title="High Value"
                    description="Slower-Moving, High Value"
                    icon={BanknotesIcon}
                    items={matrixData.highValue}
                    bgColorClass="bg-blue-100/70 dark:bg-blue-900/20"
                    borderColorClass="border-blue-200 dark:border-blue-800/30"
                />
            </div>
            <div>
                 <MatrixQuadrant
                    title="Watch List"
                    description="Low Velocity & Low Value"
                    icon={EyeIcon}
                    items={matrixData.watchList}
                    bgColorClass="bg-gray-100/70 dark:bg-gray-800/20"
                    borderColorClass="border-gray-200 dark:border-gray-700/30"
                />
            </div>
        </div>
    );
};

export default BackorderPriorityChart;