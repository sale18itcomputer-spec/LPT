
import React, { useState, useMemo, useContext, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { Customer, Sale } from '../../types';
import Card from '../ui/Card';
import AnimatedCounter from '../ui/AnimatedCounter';
import { ChevronLeftIcon, BanknotesIcon, DocumentTextIcon, CubeIcon, DocumentMagnifyingGlassIcon } from '../ui/Icons';
import TierBadge from './TierBadge';
import AIProfileAnalysis from './AIProfileAnalysis';
import { ThemeContext } from '../../contexts/ThemeContext';
import ChartCard from '../ui/ChartCard';

const KpiCard: React.FC<{ label: string; value: number; icon: React.ReactElement<React.SVGProps<SVGSVGElement>>; formatter?: (val: number) => string; }> = ({ label, value, icon, formatter }) => (
    <Card className="p-5">
        <div className="flex items-center">
            <div className="flex-shrink-0">{React.cloneElement(icon, { className: 'h-7 w-7 text-secondary-text dark:text-dark-secondary-text' })}</div>
            <div className="ml-5 w-0 flex-1">
                <dl>
                    <dt className="text-sm font-medium text-secondary-text dark:text-dark-secondary-text truncate">{label}</dt>
                    <dd className="text-2xl font-bold text-primary-text dark:text-dark-primary-text"><AnimatedCounter to={value} formatter={formatter} /></dd>
                </dl>
            </div>
        </div>
    </Card>
);

const PurchaseHistoryChart: React.FC<{ sales: Sale[] }> = ({ sales }) => {
    const themeContext = useContext(ThemeContext);
    const chartRef = useRef<ReactECharts>(null);
    const isDark = themeContext?.theme === 'dark';
    const labelColor = isDark ? '#d4d4d8' : '#4B5563';
    const gridBorderColor = isDark ? '#3f3f46' : '#E5E7EB';
    
    // Force resize on mount to fix rendering issues inside flex/grid containers
    useEffect(() => {
        const timer = setTimeout(() => {
            chartRef.current?.getEchartsInstance().resize();
        }, 150);
        return () => clearTimeout(timer);
    }, []);

    const chartData = useMemo(() => {
        const aggregated = sales.reduce((acc: Record<string, { value: number, quarter: string, year: number }>, sale) => {
            if (!sale.invoiceDate) return acc;
            const saleDate = new Date(sale.invoiceDate);
            const year = saleDate.getUTCFullYear();
            const quarter = `Q${Math.floor(saleDate.getUTCMonth() / 3) + 1}`;
            const key = `${year}-${quarter}`;
            if (!acc[key]) {
                acc[key] = { value: 0, quarter, year };
            }
            acc[key].value += sale.totalRevenue;
            return acc;
        }, {} as Record<string, { value: number, quarter: string, year: number }>);
        
        return Object.values(aggregated).sort((a: { year: number; quarter: string }, b: { year: number; quarter: string }) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.quarter.localeCompare(b.quarter);
        });

    }, [sales]);
    
    if (chartData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-secondary-text dark:text-dark-secondary-text p-4 text-center">
                <DocumentMagnifyingGlassIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">No purchase history to display.</p>
            </div>
        );
    }

    const isDense = chartData.length > 8;

    const options: EChartsOption = useMemo(() => ({
        grid: {
            left: '3%',
            right: '4%',
            bottom: isDense ? '12%' : '5%',
            top: '10%',
            containLabel: true,
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? '#3f3f46' : '#e4e4e7',
            textStyle: { color: isDark ? '#f9fafb' : '#18181b' },
            formatter: (params: any) => {
                if (!params || params.length === 0) return '';
                const { name, value } = params[0];
                return `<div class="font-sans text-sm">${name}: <strong>${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}</strong></div>`;
            }
        },
        xAxis: {
            type: 'category',
            data: chartData.map(d => `${d.quarter} '${String(d.year).slice(2)}`),
            axisLabel: { color: labelColor, fontSize: 12, rotate: isDense ? -45 : 0 },
            axisLine: { show: false },
            axisTick: { show: false },
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: labelColor, fontSize: 12, formatter: (val: number) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(val) },
            splitLine: { lineStyle: { color: gridBorderColor, type: 'dashed' } }
        },
        series: [{
            name: 'Revenue',
            type: 'bar',
            data: chartData.map(d => Math.round(d.value)),
            barWidth: '25%',
            itemStyle: {
                borderRadius: [4, 4, 0, 0],
                color: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: isDark
                        ? [{ offset: 0, color: '#60a5fa' }, { offset: 1, color: '#3b82f6' }]
                        : [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#2563eb' }]
                }
            }
        }]
    }), [chartData, isDark, isDense, labelColor, gridBorderColor]);

    return <ReactECharts ref={chartRef} option={options} style={{ height: '100%', width: '100%' }} notMerge={true} lazyUpdate={true} />;
};

const TopProductsTable: React.FC<{ sales: Sale[]; userRole: string }> = ({ sales, userRole }) => {
    const topProducts = useMemo(() => {
        const aggregated = sales.reduce((acc: Record<string, { mtm: string; modelName: string; units: number; revenue: number; }>, sale) => {
            const key = sale.lenovoProductNumber;
            if (!acc[key]) {
                acc[key] = { mtm: key, modelName: sale.modelName, units: 0, revenue: 0 };
            }
            acc[key].units += sale.quantity;
            acc[key].revenue += sale.totalRevenue;
            return acc;
        }, {} as Record<string, { mtm: string; modelName: string; units: number; revenue: number; }>);
        return Object.values(aggregated).sort((a: { revenue: number }, b: { revenue: number }) => b.revenue - a.revenue).slice(0, 10);
    }, [sales]);

    if (topProducts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-secondary-text dark:text-dark-secondary-text p-4 text-center">
                <p className="text-sm">No products purchased yet.</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar">
            {/* Desktop Table */}
            <div className="hidden md:block">
                <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-dark-secondary-bg/20 sticky top-0">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-secondary-text dark:text-dark-secondary-text uppercase">MTM</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-secondary-text dark:text-dark-secondary-text uppercase">Model Name</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-secondary-text dark:text-dark-secondary-text uppercase">Units</th>
                            {userRole === 'Admin' && <th className="px-4 py-2 text-right text-xs font-medium text-secondary-text dark:text-dark-secondary-text uppercase">Revenue</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-secondary-bg dark:bg-dark-secondary-bg">
                        {topProducts.map(p => (
                            <tr key={p.mtm} className="border-b border-border-color dark:border-dark-border-color last:border-b-0">
                                <td className="px-4 py-2 text-sm text-primary-text dark:text-dark-primary-text font-medium">{p.mtm}</td>
                                <td className="px-4 py-2 text-sm text-secondary-text dark:text-dark-secondary-text truncate max-w-xs">{p.modelName}</td>
                                <td className="px-4 py-2 text-sm text-secondary-text dark:text-dark-secondary-text text-center">{p.units}</td>
                                {userRole === 'Admin' && <td className="px-4 py-2 text-sm text-primary-text dark:text-dark-primary-text text-right font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.revenue)}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-3">
                {topProducts.map(p => (
                    <div key={p.mtm} className="p-3 bg-gray-50 dark:bg-dark-secondary-bg/50 rounded-lg">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-primary-text dark:text-dark-primary-text truncate">{p.modelName}</p>
                                <p className="text-xs text-secondary-text dark:text-dark-secondary-text font-mono">{p.mtm}</p>
                            </div>
                            <div className="ml-2 flex-shrink-0 text-right">
                                {userRole === 'Admin' && <p className="font-semibold text-primary-text dark:text-dark-primary-text">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.revenue)}</p>}
                                <p className="text-xs text-secondary-text dark:text-dark-secondary-text">{p.units} units</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface CustomerProfileProps {
    customer: Customer, 
    onBack: () => void,
    userRole: string
}

const CustomerProfile = React.forwardRef<HTMLDivElement, CustomerProfileProps>(({ customer, onBack, userRole }, ref) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    const customerInvoices = useMemo(() => {
        const invoices = customer.sales.reduce((acc: Record<string, { date: string | null; revenue: number; units: number }>, sale) => {
            if(!acc[sale.invoiceNumber]) {
                acc[sale.invoiceNumber] = {
                    date: sale.invoiceDate,
                    revenue: 0,
                    units: 0,
                };
            }
            acc[sale.invoiceNumber].revenue += sale.totalRevenue;
            acc[sale.invoiceNumber].units += sale.quantity;
            return acc;
        }, {} as Record<string, { date: string | null; revenue: number; units: number }>);
        return Object.entries(invoices).map(([number, data]: [string, { date: string | null; revenue: number; units: number }]) => ({ number, ...data })).sort((a,b) => (b.date || '').localeCompare(a.date || ''));
    }, [customer.sales]);

    const totalPages = Math.ceil(customerInvoices.length / itemsPerPage);
    const paginatedInvoices = customerInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div ref={ref} className="space-y-6">
            <motion.div>
                <button onClick={onBack} className="flex items-center text-sm font-medium text-highlight mb-4 p-1 rounded-md hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover">
                    <ChevronLeftIcon className="h-5 w-5 mr-1" />
                    Back to All Customers
                </button>
                <div className="flex items-center gap-x-4">
                    <h1 className="text-3xl font-bold tracking-tight text-primary-text dark:text-dark-primary-text">{customer.name}</h1>
                    <TierBadge tier={customer.tier} />
                </div>
                <p className="text-secondary-text dark:text-dark-secondary-text mt-1">Customer ID: {customer.id}</p>
            </motion.div>

            <div className={`grid grid-cols-1 md:grid-cols-2 ${userRole === 'Admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-6`}>
                {userRole === 'Admin' && <KpiCard label="Total Revenue" value={customer.totalRevenue} icon={<BanknotesIcon />} formatter={currencyFormatter}/>}
                {userRole === 'Admin' && <KpiCard label="Total Units" value={customer.totalUnits} icon={<CubeIcon />} />}
                <KpiCard label="Total Invoices" value={customer.invoiceCount} icon={<DocumentTextIcon />} />
                {userRole === 'Admin' && <KpiCard label="Avg. Invoice Value" value={customer.invoiceCount > 0 ? customer.totalRevenue / customer.invoiceCount : 0} icon={<BanknotesIcon />} formatter={currencyFormatter}/>}
            </div>
            
             <AIProfileAnalysis customer={customer} />
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <ChartCard title="Purchase History by Quarter" className="h-[400px]">
                        <PurchaseHistoryChart sales={customer.sales} />
                    </ChartCard>
                </div>
                <div className="lg:col-span-2">
                    <ChartCard title="Top 10 Products by Revenue" className="h-[400px]">
                        <TopProductsTable sales={customer.sales} userRole={userRole} />
                    </ChartCard>
                </div>
            </div>

            <Card className="p-0">
                <h3 className="text-lg font-semibold text-primary-text dark:text-dark-primary-text px-6 pt-4">Invoice History</h3>
                <div className="overflow-x-auto">
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <table className="min-w-full mt-2">
                            <thead className="bg-gray-50 dark:bg-dark-secondary-bg/20">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text dark:text-dark-secondary-text uppercase">Invoice #</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-text dark:text-dark-secondary-text uppercase">Date</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-text dark:text-dark-secondary-text uppercase">Units</th>
                                    {userRole === 'Admin' && <th className="px-6 py-3 text-right text-xs font-medium text-secondary-text dark:text-dark-secondary-text uppercase">Revenue</th>}
                                </tr>
                            </thead>
                            <tbody className="bg-secondary-bg dark:bg-dark-secondary-bg">
                                {paginatedInvoices.map(invoice => (
                                    <tr key={invoice.number} className="border-b border-border-color dark:border-dark-border-color last:border-b-0">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-text dark:text-dark-primary-text">{invoice.number}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text dark:text-dark-secondary-text">{invoice.date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text dark:text-dark-secondary-text text-center">{invoice.units}</td>
                                        {userRole === 'Admin' && <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-text dark:text-dark-primary-text font-medium text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(invoice.revenue)}</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile Card List */}
                    <div className="md:hidden space-y-3 p-4">
                         {paginatedInvoices.map(invoice => (
                            <div key={invoice.number} className="p-3 bg-gray-50 dark:bg-dark-secondary-bg/50 rounded-lg border border-border-color dark:border-dark-border-color">
                                <div className="flex justify-between font-medium text-primary-text dark:text-dark-primary-text">
                                    <span>{invoice.number}</span>
                                    {userRole === 'Admin' && <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(invoice.revenue)}</span>}
                                </div>
                                <div className="flex justify-between text-sm text-secondary-text dark:text-dark-secondary-text mt-1">
                                    <span>{invoice.date}</span>
                                    <span>{invoice.units} units</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="py-3 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-center sm:justify-between border-t border-border-color dark:border-dark-border-color gap-4">
                    <div>
                        <p className="text-sm text-secondary-text dark:text-dark-secondary-text">
                            Showing <span className="font-medium">{paginatedInvoices.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, customerInvoices.length)}</span> of{' '}
                            <span className="font-medium">{customerInvoices.length}</span> invoices
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text hover:bg-gray-50 dark:hover:bg-dark-primary-bg disabled:opacity-50 transition-colors">Prev</button>
                        <span className="relative inline-flex items-center px-4 py-2 border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text">{currentPage} / {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg text-sm font-medium text-secondary-text dark:text-dark-secondary-text hover:bg-gray-50 dark:hover:bg-dark-primary-bg disabled:opacity-50 transition-colors">Next</button>
                    </div>
                </div>
            </Card>
        </div>
    );
});

CustomerProfile.displayName = 'CustomerProfile';

export default CustomerProfile;
