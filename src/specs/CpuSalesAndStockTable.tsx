import React, { useMemo, useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useData } from '../../contexts/DataContext';
import { getISOWeek } from '../../utils/dateHelpers';
import Card from '../ui/Card';
import SegmentedControl from '../ui/SegmentedControl';
import { CpuChipIcon, TableCellsIcon, ArrowTrendingUpIcon, ChartBarIcon } from '../ui/Icons';
import { ThemeContext } from '../../contexts/ThemeContext';

const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <td className={`border border-gray-300 dark:border-gray-600 p-2 text-center ${className || ''}`}>
        {children}
    </td>
);

const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <th className={`border border-gray-300 dark:border-gray-600 p-2 text-center ${className || ''}`}>
        {children}
    </th>
);

const EChartComponent: React.FC<{ data: any[], weeks: any[], type: 'line' | 'bar' }> = ({ data, weeks, type }) => {
    const themeContext = useContext(ThemeContext);
    const isDark = themeContext?.theme === 'dark';
    const textColor = isDark ? '#f1f5f9' : '#0f172a';

    const option: EChartsOption = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? '#3f3f46' : '#e4e4e7',
            textStyle: { color: isDark ? '#f9fafb' : '#18181b' },
        },
        legend: {
            data: data.map(d => d.groupName),
            textStyle: { color: textColor },
            top: 10,
            type: 'scroll',
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            containLabel: true,
            top: '15%',
        },
        xAxis: {
            type: 'category',
            boundaryGap: type === 'bar',
            data: weeks.map(h => `WK ${h.week}`),
            axisLine: { lineStyle: { color: textColor } },
        },
        yAxis: {
            type: 'value',
            name: 'Units Sold',
            nameTextStyle: {
                color: textColor
            },
            axisLine: { lineStyle: { color: textColor } },
            splitLine: { lineStyle: { color: isDark ? '#334155' : '#e2e8f0' } },
        },
        series: data.map(d => ({
            name: d.groupName,
            type: type,
            smooth: type === 'line',
            data: d.weeklySales,
            emphasis: {
                focus: 'series'
            },
        })),
        dataZoom: [
            {
                type: 'inside',
                start: 0,
                end: 100
            },
            {
                type: 'slider',
                start: 0,
                end: 100,
                bottom: 10
            }
        ],
    };

    return <ReactECharts option={option} style={{ height: 500 }} notMerge={true} lazyUpdate={true} />;
};

interface CpuSalesAndStockTableProps {
    mtmPrefix: string;
    year: number;
    startWeek: number;
    endWeek: number;
    cpuSalesCpuFilter: string[];
    cpuSalesMtmFilter: string[];
}


const CpuSalesAndStockTable: React.FC<CpuSalesAndStockTableProps> = ({ mtmPrefix, year, startWeek, endWeek, cpuSalesCpuFilter, cpuSalesMtmFilter }) => {
    const { allSales, inventoryData } = useData();
    const [viewMode, setViewMode] = useState<'cpu' | 'mtm'>('cpu');
    const [visualizationMode, setVisualizationMode] = useState<'table' | 'line' | 'bar'>('table');

    const { tableData, weekHeaders, totals } = useMemo(() => {
        const salesToProcess = allSales.filter(sale => {
            if (mtmPrefix !== 'all' && !sale.lenovoProductNumber.startsWith(mtmPrefix)) {
                return false;
            }
            if (cpuSalesCpuFilter.length > 0 && (!sale.parsedSpecification?.cpuFamily || !cpuSalesCpuFilter.includes(sale.parsedSpecification.cpuFamily))) {
                return false;
            }
            if (cpuSalesMtmFilter.length > 0 && !cpuSalesMtmFilter.includes(sale.lenovoProductNumber)) {
                return false;
            }
            if (!sale.invoiceDate) return false;
            const saleYear = new Date(sale.invoiceDate).getUTCFullYear();
            return saleYear === year;
        });

        const inventoryToProcess = inventoryData.filter(item => {
            if (mtmPrefix !== 'all' && !item.mtm.startsWith(mtmPrefix)) {
                return false;
            }
            if (cpuSalesCpuFilter.length > 0 && (!item.parsedSpecification?.cpuFamily || !cpuSalesCpuFilter.includes(item.parsedSpecification.cpuFamily))) {
                return false;
            }
            if (cpuSalesMtmFilter.length > 0 && !cpuSalesMtmFilter.includes(item.mtm)) {
                return false;
            }
            return true;
        });

        const weekHeaders: { week: number; year: number }[] = [];
        if (startWeek && endWeek && startWeek <= endWeek && year) {
            for (let i = startWeek; i <= endWeek; i++) {
                weekHeaders.push({ week: i, year: year });
            }
        }
        
        const groupingKey = viewMode === 'mtm' ? 'mtm' : 'cpuFamily';

        const salesByGroupWeek: Record<string, Record<string, number>> = {};
        salesToProcess.forEach(sale => {
            const groupValue = groupingKey === 'mtm'
                ? sale.lenovoProductNumber
                : sale.parsedSpecification?.cpuFamily?.replace('Core ', '').toLowerCase();

            if (!groupValue || !sale.invoiceDate) return;

            const saleDate = new Date(sale.invoiceDate);
            const saleWeek = getISOWeek(saleDate);
            const saleYear = saleDate.getUTCFullYear();
            const weekKey = `${saleYear}-W${saleWeek}`;
            
            if (!salesByGroupWeek[groupValue]) {
                salesByGroupWeek[groupValue] = {};
            }
            salesByGroupWeek[groupValue][weekKey] = (salesByGroupWeek[groupValue][weekKey] || 0) + sale.quantity;
        });

        const inventoryByGroup: Record<string, { stock: number; otw: number }> = {};
        inventoryToProcess.forEach(item => {
            const groupValue = groupingKey === 'mtm'
                ? item.mtm
                : item.parsedSpecification?.cpuFamily?.replace('Core ', '').toLowerCase();
            if (!groupValue) return;

            if (!inventoryByGroup[groupValue]) {
                inventoryByGroup[groupValue] = { stock: 0, otw: 0 };
            }
            inventoryByGroup[groupValue].stock += item.onHandQty;
            inventoryByGroup[groupValue].otw += item.otwQty;
        });
        
        const cpuFamilyMap: Record<string, string> = {
            'i3': 'Core i3',
            'i5': 'Core i5',
            'i7': 'Core i7',
            'i9': 'Core i9',
            'ultra 7': 'Core Ultra 7',
            'ultra 9': 'Core Ultra 9',
            'celeron': 'Celeron'
        };

        let allGroups: string[];
        if (viewMode === 'mtm') {
            const mtmSet = new Set<string>();
            salesToProcess.forEach(s => mtmSet.add(s.lenovoProductNumber));
            inventoryToProcess.forEach(i => mtmSet.add(i.mtm));
            allGroups = [...mtmSet].sort();
        } else {
            allGroups = ['i3', 'i5', 'i7', 'i9', 'ultra 7', 'ultra 9', 'celeron'];
        }
        
        const salesDataForGroups = allGroups.map(group => {
            const weeklySales = weekHeaders.map(header => {
                const weekKey = `${header.year}-W${header.week}`;
                return salesByGroupWeek[group]?.[weekKey] || 0;
            });
            const totalSales = weeklySales.reduce((a, b) => a + b, 0);
            return { group, weeklySales, totalSales };
        });

        const grandTotalSales = salesDataForGroups.reduce((sum, data) => sum + data.totalSales, 0);

        const tableData = salesDataForGroups.map(data => {
            const { group, weeklySales, totalSales } = data;
            const stock = inventoryByGroup[group]?.stock || 0;
            const otw = inventoryByGroup[group]?.otw || 0;
            const displayName = viewMode === 'cpu' ? (cpuFamilyMap[group] || group) : group;
            const salesPercentage = grandTotalSales > 0 ? (totalSales / grandTotalSales) * 100 : 0;

            return {
                groupName: displayName,
                weeklySales,
                totalSales,
                stock,
                otw,
                totalStock: stock + otw,
                salesPercentage
            };
        });

        const columnTotals = weekHeaders.map((_, index) => 
            tableData.reduce((sum, row) => sum + row.weeklySales[index], 0)
        );
        const totalOfTotals = tableData.reduce((sum, row) => sum + row.totalSales, 0);
        const totalStock = tableData.reduce((sum, row) => sum + row.stock, 0);
        const totalOtw = tableData.reduce((sum, row) => sum + row.otw, 0);
        const grandTotalStock = tableData.reduce((sum, row) => sum + row.totalStock, 0);
        
        const totals = {
            columnTotals,
            totalOfTotals,
            totalStock,
            totalOtw,
            grandTotalStock,
        };

        return { tableData, weekHeaders, totals };
    }, [allSales, inventoryData, mtmPrefix, year, startWeek, endWeek, viewMode, cpuSalesCpuFilter, cpuSalesMtmFilter]);
    

    const description = useMemo(() => {
        const filters = [];
        if (mtmPrefix !== 'all') filters.push(`Prefix: '${mtmPrefix}'`);
        if (cpuSalesCpuFilter.length > 0) filters.push(`${cpuSalesCpuFilter.length} CPU(s)`);
        if (cpuSalesMtmFilter.length > 0) filters.push(`${cpuSalesMtmFilter.length} MTM(s)`);

        if (filters.length === 0) return `Displaying data for all ${viewMode === 'mtm' ? 'MTMs' : 'CPUs'}`;
        return `Filtered by: ${filters.join(', ')}`;
    }, [mtmPrefix, viewMode, cpuSalesCpuFilter, cpuSalesMtmFilter]);

    const tableControls = (
         <div className="flex flex-wrap items-end gap-x-4 gap-y-2 justify-start lg:justify-end">
             <SegmentedControl
                label="Group By"
                options={[
                    { label: 'By CPU', value: 'cpu', icon: CpuChipIcon },
                    { label: 'By MTM', value: 'mtm', icon: TableCellsIcon },
                ]}
                value={viewMode}
                onChange={(val) => setViewMode(val as 'cpu' | 'mtm')}
            />
             <SegmentedControl
                label="View Mode"
                options={[
                    { label: 'Table', value: 'table', icon: TableCellsIcon },
                    { label: 'Line', value: 'line', icon: ArrowTrendingUpIcon },
                    { label: 'Bar', value: 'bar', icon: ChartBarIcon },
                ]}
                value={visualizationMode}
                onChange={(val) => setVisualizationMode(val as 'table' | 'line' | 'bar')}
            />
        </div>
    );

    return (
        <Card
            title="CPU Sales & Stock Overview"
            description={description}
            controls={tableControls}
            className="p-0"
        >
            <div className="p-4 sm:p-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={visualizationMode}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {visualizationMode === 'table' && (
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="min-w-full border-collapse text-sm">
                                    <thead className="bg-blue-600 text-white font-bold">
                                        <tr>
                                            <Th className="text-left !p-3">{viewMode === 'mtm' ? 'MTM' : 'CPU'}</Th>
                                            {weekHeaders.map(h => <Th key={`${h.year}-W${h.week}`}>WK {h.week}</Th>)}
                                            <Th>Total</Th>
                                            <Th>Sales % of Total</Th>
                                            <Th>Stock</Th>
                                            <Th>OTW</Th>
                                            <Th>Total</Th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-dark-secondary-bg text-primary-text dark:text-dark-primary-text">
                                        {tableData.map(row => (
                                            <tr key={row.groupName} className="odd:bg-gray-50 dark:odd:bg-dark-secondary-bg/50">
                                                <Td className="font-bold text-left !p-3">{row.groupName}</Td>
                                                {row.weeklySales.map((sale, index) => <Td key={index}>{sale || ''}</Td>)}
                                                <Td className="font-medium">{row.totalSales}</Td>
                                                <Td className="font-medium">{row.salesPercentage > 0 ? `${row.salesPercentage.toFixed(1)}%` : ''}</Td>
                                                <Td className="font-medium">{row.stock}</Td>
                                                <Td className="font-medium">{row.otw}</Td>
                                                <Td className="font-medium">{row.totalStock}</Td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-blue-600 text-white font-bold">
                                        <tr>
                                            <Td className="text-left !p-3">Total</Td>
                                            {totals.columnTotals.map((total, index) => <Td key={index}>{total}</Td>)}
                                            <Td>{totals.totalOfTotals}</Td>
                                            <Td>100%</Td>
                                            <Td>{totals.totalStock}</Td>
                                            <Td>{totals.totalOtw}</Td>
                                            <Td>{totals.grandTotalStock}</Td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                         {visualizationMode === 'line' && <EChartComponent data={tableData} weeks={weekHeaders} type="line" />}
                         {visualizationMode === 'bar' && <EChartComponent data={tableData} weeks={weekHeaders} type="bar" />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </Card>
    );
};

export default CpuSalesAndStockTable;
