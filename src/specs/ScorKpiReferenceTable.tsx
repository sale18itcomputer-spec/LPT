import React from 'react';
import Card from '../ui/Card';
import { ChartBarIcon } from '../ui/Icons';

const kpiData = [
  { num: 1, kpi: 'Perfect Order Fulfillment', code: 'RL.1.1', formula: '(On-time × Complete × Damage-free × Correct Doc) × 100', target: '> 95%', why: 'Customers expect full CPU orders (no partials)' },
  { num: 2, kpi: 'Order Fill Rate', code: 'RS.3.1', formula: '(Complete Line Items ÷ Total Line Items) × 100', target: '> 98%', why: 'Core i5/i7 must ship complete' },
  { num: 3, kpi: 'Supply Chain Response Time', code: 'RS.3.2', formula: 'Avg Days: Demand Signal → Order Fulfillment', target: '< 3 days', why: 'Fast reaction to Core Ultra 9 launch spikes' },
  { num: 4, kpi: 'Upside Supply Chain Flexibility', code: 'AG.3.1', formula: 'Days to fulfill 20% demand surge', target: '< 30 days', why: 'Handles AI/gaming demand surges' },
  { num: 5, kpi: 'Total Supply Chain Cost', code: 'CO.1.1', formula: '% of Revenue: All SC costs', target: '< 12%', why: 'High-value CPUs → cost control critical' },
  { num: 6, kpi: 'Cash-to-Cash Cycle Time', code: 'CO.3.1', formula: 'Inventory Days + Receivables Days – Payables Days', target: '< 45 days', why: 'Faster cash flow for Intel/AMD partners' },
  { num: 7, kpi: 'Return on Supply Chain Fixed Assets', code: 'CO.2.1', formula: 'SC Contribution ÷ Fixed Assets', target: '> 25%', why: 'Warehouse/DC efficiency for CPU stock' },
  { num: 8, kpi: 'Inventory Days of Supply', code: 'RS.2.1', formula: '(Avg Inventory Value ÷ COGS) × 365', target: '14–28 days', why: 'Balances stockouts vs. obsolescence' },
];

const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <td className={`border border-gray-300 dark:border-gray-600 p-2 ${className || ''}`}>
        {children}
    </td>
);
const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <th className={`border border-gray-300 dark:border-gray-600 p-2 text-center ${className || ''}`}>
        {children}
    </th>
);


const ScorKpiReferenceTable: React.FC = () => {
    return (
        <Card>
            <div className="p-4 sm:p-6 border-b border-border-color dark:border-dark-border-color">
                <h3 className="text-lg font-semibold text-primary-text dark:text-dark-primary-text flex items-center gap-2">
                    <ChartBarIcon className="h-5 w-5"/>
                    The 8 SCOR KPIs (CPU-Optimized)
                </h3>
                <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1">
                    A reference guide for the Supply Chain Operations Reference (SCOR) model KPIs, tailored for CPU inventory management.
                </p>
            </div>
             <div className="p-4 sm:p-6 overflow-x-auto custom-scrollbar">
                 <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-blue-600 text-white font-bold">
                        <tr>
                            <Th>#SCOR KPI</Th>
                            <Th>SCOR Code</Th>
                            <Th>Formula</Th>
                            <Th>Target (Electronics Retail)</Th>
                            <Th>Why for CPUs?</Th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-secondary-bg text-primary-text dark:text-dark-primary-text">
                        {kpiData.map(row => (
                            <tr key={row.num} className="odd:bg-gray-50 dark:odd:bg-dark-secondary-bg/50">
                                <Td className="font-semibold">{row.num} {row.kpi}</Td>
                                <Td className="font-mono text-center">{row.code}</Td>
                                <Td>{row.formula}</Td>
                                <Td className="text-center font-semibold">{row.target}</Td>
                                <Td>{row.why}</Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </Card>
    );
};

export default ScorKpiReferenceTable;
