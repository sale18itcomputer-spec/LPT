

import React, { useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import type { Customer } from '../../types';
import { TrophyIcon, BanknotesIcon, ArrowUpCircleIcon, UserSlashIcon, ArrowLongRightIcon, ArrowLongUpIcon } from '../ui/Icons';

const quadrantVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } }
};

const listVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
};


const Quadrant: React.FC<{
    title: string;
    description: string;
    icon: React.FC<any>;
    items: Customer[];
    bgGradientClass: string;
    borderColorClass: string;
    onSelectCustomer: (customer: Customer) => void;
    onSelectQuadrant: () => void;
    isSelected: boolean;
}> = ({ title, description, icon: Icon, items, bgGradientClass, borderColorClass, onSelectCustomer, onSelectQuadrant, isSelected }) => {
    const totalRevenue = useMemo(() => items.reduce((sum, item) => sum + item.totalRevenue, 0), [items]);
    
    return (
        <motion.div
            variants={quadrantVariants}
            className={`rounded-xl p-3 sm:p-4 flex flex-col h-80 sm:h-96 ${bgGradientClass} border ${borderColorClass} shadow-inner transition-all duration-300 ${isSelected ? 'ring-2 ring-highlight ring-offset-2' : 'ring-0'}`}
        >
            <motion.button
                onClick={onSelectQuadrant}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-start gap-x-3 mb-3 text-left"
            >
                <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-white/50 dark:bg-black/20 ring-1 ring-black/5 dark:ring-white/10">
                    <Icon className="h-6 w-6 text-primary-text dark:text-dark-primary-text" />
                </div>
                <div>
                    <h4 className="font-bold text-primary-text dark:text-dark-primary-text">{title}</h4>
                    <p className="text-xs text-secondary-text dark:text-dark-secondary-text">{description}</p>
                </div>
            </motion.button>
             <div className="mb-3">
                <p className="text-3xl font-bold text-primary-text dark:text-dark-primary-text">{items.length} <span className="text-lg font-medium text-secondary-text dark:text-dark-secondary-text">Customers</span></p>
                <p className="text-base font-medium text-secondary-text dark:text-dark-secondary-text mt-1">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalRevenue)} Total Revenue
                </p>
            </div>
            <motion.ul variants={listVariants} initial="hidden" animate="visible" className="flex-grow overflow-y-auto pr-2 -mr-2 text-sm custom-scrollbar divide-y divide-black/5 dark:divide-white/5">
                 {items.length > 0 ? (
                    items.map(customer => (
                        <motion.li key={customer.id} variants={itemVariants} className="py-1.5">
                            <motion.button
                                onClick={() => onSelectCustomer(customer)}
                                whileHover={{ scale: 1.02, x: 2 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full text-left bg-white/60 dark:bg-black/20 p-2 rounded-lg flex justify-between items-center hover:bg-white/90 dark:hover:bg-black/30 transition-all duration-200 border border-black/5 dark:border-white/5 shadow-sm"
                                title={`View details for ${customer.name}`}
                            >
                                <span className="font-medium text-primary-text dark:text-dark-primary-text truncate">{customer.name}</span>
                                <span className="text-secondary-text dark:text-dark-secondary-text ml-2 flex-shrink-0">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(customer.totalRevenue)}</span>
                            </motion.button>
                        </motion.li>
                    ))
                ) : (
                    <div className="flex items-center justify-center h-full text-secondary-text dark:text-dark-secondary-text text-sm">
                        No customers in this category.
                    </div>
                )}
            </motion.ul>
        </motion.div>
    );
};

type QuadrantName = 'champions' | 'highSpenders' | 'loyal' | 'atRisk';

interface CustomerValueMatrixProps {
    customers: Customer[];
    onSelectCustomer: (customer: Customer) => void;
    onQuadrantSelect: (quadrant: QuadrantName | null) => void;
    selectedQuadrant: QuadrantName | null;
}

const CustomerValueMatrix: React.FC<CustomerValueMatrixProps> = React.memo(({ customers, onSelectCustomer, onQuadrantSelect, selectedQuadrant }) => {
    const matrixData = useMemo(() => {
        const quadrants = {
            champions: [] as Customer[],
            highSpenders: [] as Customer[],
            loyal: [] as Customer[],
            atRisk: [] as Customer[],
        };
        
        if (customers.length < 4) {
            quadrants.atRisk = [...customers].sort((a,b) => b.totalRevenue - a.totalRevenue);
            return quadrants;
        }

        const revenues = customers.map(c => c.totalRevenue).sort((a,b) => a - b);
        const frequencies = customers.map(c => c.invoiceCount).sort((a,b) => a - b);

        const medianRevenue = revenues[Math.floor(revenues.length / 2)];
        const medianFrequency = frequencies[Math.floor(frequencies.length / 2)];

        customers.forEach(customer => {
            const isHighRevenue = customer.totalRevenue >= medianRevenue;
            const isHighFrequency = customer.invoiceCount >= medianFrequency;

            if (isHighRevenue && isHighFrequency) quadrants.champions.push(customer);
            else if (isHighRevenue && !isHighFrequency) quadrants.highSpenders.push(customer);
            else if (!isHighRevenue && isHighFrequency) quadrants.loyal.push(customer);
            else quadrants.atRisk.push(customer);
        });

        Object.values(quadrants).forEach(q => q.sort((a, b) => b.totalRevenue - a.totalRevenue));

        return quadrants;
    }, [customers]);

    return (
        <div className="relative w-full" aria-label="Customer Value Matrix with four quadrants" role="figure" tabIndex={0}>
            <motion.div variants={{ visible: { transition: { staggerChildren: 0.1 } } }} initial="hidden" animate="visible">
                {/* Desktop View with Axes */}
                <div className="hidden md:grid md:grid-cols-[auto,1fr,1fr] md:grid-rows-[auto,1fr,1fr] gap-4">
                    <div className="col-start-2 col-span-2 flex items-center justify-center gap-x-2 text-xs font-semibold text-secondary-text dark:text-dark-secondary-text tracking-wider">
                        <span className="text-gray-400">LOW</span>
                        <div className="flex-grow h-px bg-border-color dark:bg-dark-border-color"></div>
                        <span>PURCHASE FREQUENCY</span>
                        <div className="flex-grow h-px bg-border-color dark:bg-dark-border-color"></div>
                        <ArrowLongRightIcon className="h-5 w-5" />
                        <span className="text-primary-text dark:text-dark-primary-text">HIGH</span>
                    </div>
                    <div className="row-start-2 row-span-2 flex flex-col items-center justify-center gap-y-2 text-xs font-semibold text-secondary-text dark:text-dark-secondary-text tracking-wider [writing-mode:vertical-rl] rotate-180">
                        <span className="text-gray-400">LOW</span>
                        <div className="flex-grow w-px bg-border-color dark:bg-dark-border-color"></div>
                        <span>TOTAL REVENUE</span>
                        <div className="flex-grow w-px bg-border-color dark:bg-dark-border-color"></div>
                        <ArrowLongUpIcon className="h-5 w-5" />
                        <span className="text-primary-text dark:text-dark-primary-text">HIGH</span>
                    </div>
                    <div className="row-start-2 col-start-3"><Quadrant title="Champions" description="Your best customers. Reward and retain." icon={TrophyIcon} items={matrixData.champions} bgGradientClass="bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30" borderColorClass="border-red-200 dark:border-red-800/30" onSelectCustomer={onSelectCustomer} onSelectQuadrant={() => onQuadrantSelect('champions')} isSelected={selectedQuadrant === 'champions'} /></div>
                    <div className="row-start-2 col-start-2"><Quadrant title="High Spenders" description="High value, low frequency. Increase engagement." icon={BanknotesIcon} items={matrixData.highSpenders} bgGradientClass="bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30" borderColorClass="border-blue-200 dark:border-blue-800/30" onSelectCustomer={onSelectCustomer} onSelectQuadrant={() => onQuadrantSelect('highSpenders')} isSelected={selectedQuadrant === 'highSpenders'} /></div>
                    <div className="row-start-3 col-start-3"><Quadrant title="Loyal Customers" description="High frequency, low value. Upsell opportunities." icon={ArrowUpCircleIcon} items={matrixData.loyal} bgGradientClass="bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30" borderColorClass="border-amber-200 dark:border-amber-800/30" onSelectCustomer={onSelectCustomer} onSelectQuadrant={() => onQuadrantSelect('loyal')} isSelected={selectedQuadrant === 'loyal'} /></div>
                    <div className="row-start-3 col-start-2"><Quadrant title="At Risk / New" description="Low value & frequency. Nurture or re-engage." icon={UserSlashIcon} items={matrixData.atRisk} bgGradientClass="bg-gradient-to-br from-slate-100 to-gray-100 dark:from-slate-800/30 dark:to-gray-800/30" borderColorClass="border-slate-200 dark:border-slate-700/30" onSelectCustomer={onSelectCustomer} onSelectQuadrant={() => onQuadrantSelect('atRisk')} isSelected={selectedQuadrant === 'atRisk'} /></div>
                </div>

                {/* Mobile/Tablet View */}
                <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Quadrant title="Champions" description="Your best customers. Reward and retain." icon={TrophyIcon} items={matrixData.champions} bgGradientClass="bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30" borderColorClass="border-red-200 dark:border-red-800/30" onSelectCustomer={onSelectCustomer} onSelectQuadrant={() => onQuadrantSelect('champions')} isSelected={selectedQuadrant === 'champions'} />
                    <Quadrant title="High Spenders" description="High value, low frequency. Increase engagement." icon={BanknotesIcon} items={matrixData.highSpenders} bgGradientClass="bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30" borderColorClass="border-blue-200 dark:border-blue-800/30" onSelectCustomer={onSelectCustomer} onSelectQuadrant={() => onQuadrantSelect('highSpenders')} isSelected={selectedQuadrant === 'highSpenders'} />
                    <Quadrant title="Loyal Customers" description="High frequency, low value. Upsell opportunities." icon={ArrowUpCircleIcon} items={matrixData.loyal} bgGradientClass="bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30" borderColorClass="border-amber-200 dark:border-amber-800/30" onSelectCustomer={onSelectCustomer} onSelectQuadrant={() => onQuadrantSelect('loyal')} isSelected={selectedQuadrant === 'loyal'} />
                    <Quadrant title="At Risk / New" description="Low value & frequency. Nurture or re-engage." icon={UserSlashIcon} items={matrixData.atRisk} bgGradientClass="bg-gradient-to-br from-slate-100 to-gray-100 dark:from-slate-800/30 dark:to-gray-800/30" borderColorClass="border-slate-200 dark:border-slate-700/30" onSelectCustomer={onSelectCustomer} onSelectQuadrant={() => onQuadrantSelect('atRisk')} isSelected={selectedQuadrant === 'atRisk'} />
                </div>
            </motion.div>
        </div>
    );
});

CustomerValueMatrix.displayName = 'CustomerValueMatrix';

export default CustomerValueMatrix;