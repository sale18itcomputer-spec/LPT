import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { getISOWeek } from '../../utils/dateHelpers';
import Card from '../ui/Card';
import { CpuChipIcon } from '../ui/Icons';

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

interface CpuInventoryIntelligenceTableProps {
    mtmPrefix: string;
    year: number;
    startWeek: number;
    endWeek: number;
    cpuSalesCpuFilter: string[];
    cpuSalesMtmFilter: string[];
}

const CpuInventoryIntelligenceTable: React.FC<CpuInventoryIntelligenceTableProps> = ({ mtmPrefix, year, startWeek, endWeek, cpuSalesCpuFilter, cpuSalesMtmFilter }) => {
    const { allSales, inventoryData, allOrders, reconciledSales } = useData();

    const { tableData, totals } = useMemo(() => {
        // Create a lookup map for rebates by serial number for efficiency
        const serialToRebateMap = new Map<string, number>();
        reconciledSales.forEach(rs => {
            if (rs.rebateApplied) {
                serialToRebateMap.set(rs.serialNumber, rs.rebateApplied);
            }
        });

        const inventoryToProcess = inventoryData.filter(item => {
            if (mtmPrefix !== 'all' && !item.mtm.startsWith(mtmPrefix)) return false;
            if (cpuSalesCpuFilter.length > 0 && (!item.parsedSpecification?.cpuFamily || !cpuSalesCpuFilter.includes(item.parsedSpecification.cpuFamily))) {
                return false;
            }
            if (cpuSalesMtmFilter.length > 0 && !cpuSalesMtmFilter.includes(item.mtm)) {
                return false;
            }
            return true;
        });

        const salesForPeriod = allSales.filter(sale => {
            if (mtmPrefix !== 'all' && !sale.lenovoProductNumber.startsWith(mtmPrefix)) return false;
            if (cpuSalesCpuFilter.length > 0 && (!sale.parsedSpecification?.cpuFamily || !cpuSalesCpuFilter.includes(sale.parsedSpecification.cpuFamily))) {
                return false;
            }
            if (cpuSalesMtmFilter.length > 0 && !cpuSalesMtmFilter.includes(sale.lenovoProductNumber)) {
                return false;
            }
            if (!sale.invoiceDate) return false;
            const saleDate = new Date(sale.invoiceDate);
            const saleYear = saleDate.getUTCFullYear();
            const saleWeek = getISOWeek(saleDate);
            return saleYear === year && saleWeek >= startWeek && saleWeek <= endWeek;
        });

        const inventoryMap = new Map(inventoryData.map(i => [i.mtm, i]));

        const inventoryByCpuFamily: Record<string, any[]> = {};
        inventoryToProcess.forEach(item => {
            const cpuFamily = item.parsedSpecification?.cpuFamily?.replace('Core ', '').toLowerCase() || 'other';
            if (!inventoryByCpuFamily[cpuFamily]) {
                inventoryByCpuFamily[cpuFamily] = [];
            }
            inventoryByCpuFamily[cpuFamily].push(item);
        });

        const cpuFamilies = ['i3', 'i5', 'i7', 'i9', 'ultra 7', 'ultra 9', 'celeron'];
        const cpuFamilyMap: Record<string, string> = {
            'i3': 'Core i3', 'i5': 'Core i5', 'i7': 'Core i7', 'i9': 'Core i9',
            'ultra 7': 'Core Ultra 7', 'ultra 9': 'Core Ultra 9', 'celeron': 'Celeron'
        };

        const data = cpuFamilies.map(cpuFamily => {
            const itemsInFamily = inventoryByCpuFamily[cpuFamily] || [];
            
            const onHandValue = itemsInFamily.reduce((sum, item) => sum + item.onHandValue, 0);
            const otwValue = itemsInFamily.reduce((sum, item) => sum + item.otwValue, 0);
            const salesVelocity = itemsInFamily.reduce((sum, item) => sum + (item.weeklyRunRate || 0), 0);
            const totalOnHandQty = itemsInFamily.reduce((sum, item) => sum + item.onHandQty, 0);
            const weeksOfSupply = salesVelocity > 0 ? totalOnHandQty / salesVelocity : Infinity;
            const weightedAgeSum = itemsInFamily.reduce((sum, item) => sum + ((item.daysSinceLastArrival || 0) * item.onHandQty), 0);
            const avgAge = totalOnHandQty > 0 ? weightedAgeSum / totalOnHandQty : 0;

            const familyMtms = new Set(itemsInFamily.map(i => i.mtm));
            const salesInFamilyForPeriod = salesForPeriod.filter(s => familyMtms.has(s.lenovoProductNumber));
            const cogsForPeriod = salesInFamilyForPeriod.reduce((sum, sale) => {
                const inventoryItem = inventoryMap.get(sale.lenovoProductNumber);
                return sum + (sale.quantity * (inventoryItem?.averageLandingCost || 0));
            }, 0);
            
            const inventoryTurns = onHandValue > 0 ? cogsForPeriod / onHandValue : 0;
            
            // New KPIs
            const totalMtmsInFamily = itemsInFamily.length;
            const mtmsInStock = itemsInFamily.filter(item => item.onHandQty > 0).length;
            const inStockRate = totalMtmsInFamily > 0 ? (mtmsInStock / totalMtmsInFamily) * 100 : 0;

            const totalUnitsSoldInPeriod = salesInFamilyForPeriod.reduce((sum, s) => sum + s.quantity, 0);
            const sellThroughRate = (totalUnitsSoldInPeriod + totalOnHandQty) > 0 ? (totalUnitsSoldInPeriod / (totalUnitsSoldInPeriod + totalOnHandQty)) * 100 : 0;

            // SCOR KPIs
            const ordersInFamily = allOrders.filter(o => familyMtms.has(o.mtm));
            const ordersInFamilyForPeriod = ordersInFamily.filter(o => {
                if (!o.actualArrival || !o.dateIssuePI) return false;
                const arrivalDate = new Date(o.actualArrival!);
                const arrivalYear = arrivalDate.getUTCFullYear();
                const arrivalWeek = getISOWeek(arrivalDate);
                return arrivalYear === year && arrivalWeek >= startWeek && arrivalWeek <= endWeek;
            });
            const leadTimes = ordersInFamilyForPeriod.map(o => (new Date(o.actualArrival!).getTime() - new Date(o.dateIssuePI!).getTime()) / (1000 * 3600 * 24));
            const avgLeadTime = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;

            const daysInPeriod = (endWeek - startWeek + 1) * 7;
            const daysOfSupply = cogsForPeriod > 0 ? (onHandValue / cogsForPeriod) * daysInPeriod : Infinity;

            return {
                groupName: cpuFamilyMap[cpuFamily],
                inventoryTurns, weeksOfSupply, onHandValue, otwValue, salesVelocity, avgAge,
                inStockRate, sellThroughRate,
                avgLeadTime, daysOfSupply
            };
        });

        // Calculate totals
        const totalOnHandValue = data.reduce((sum, d) => sum + d.onHandValue, 0);
        const totalOtwValue = data.reduce((sum, d) => sum + d.otwValue, 0);
        const totalSalesVelocity = data.reduce((sum, d) => sum + d.salesVelocity, 0);
        const totalCogs = salesForPeriod.reduce((sum, sale) => {
             const inventoryItem = inventoryMap.get(sale.lenovoProductNumber);
             return sum + (sale.quantity * (inventoryItem?.averageLandingCost || 0));
        }, 0);
        const totalInventoryTurns = totalOnHandValue > 0 ? totalCogs / totalOnHandValue : 0;
        const totalOnHandQtyAll = inventoryToProcess.reduce((sum, item) => sum + item.onHandQty, 0);
        const totalWeeksOfSupply = totalSalesVelocity > 0 ? totalOnHandQtyAll / totalSalesVelocity : Infinity;
        const totalWeightedAge = inventoryToProcess.reduce((sum, item) => sum + ((item.daysSinceLastArrival || 0) * item.onHandQty), 0);
        const totalAvgAge = totalOnHandQtyAll > 0 ? totalWeightedAge / totalOnHandQtyAll : 0;
        
        // New KPI Totals
        const totalMtms = inventoryToProcess.length;
        const totalMtmsInStock = inventoryToProcess.filter(i => i.onHandQty > 0).length;
        const totalInStockRate = totalMtms > 0 ? (totalMtmsInStock / totalMtms) * 100 : 0;

        const totalUnitsSoldInPeriodAll = salesForPeriod.reduce((sum, s) => sum + s.quantity, 0);
        const totalSellThroughRate = (totalUnitsSoldInPeriodAll + totalOnHandQtyAll) > 0 ? (totalUnitsSoldInPeriodAll / (totalUnitsSoldInPeriodAll + totalOnHandQtyAll)) * 100 : 0;
        
        // SCOR KPI Totals
        const relevantMtms = new Set(inventoryToProcess.map(i => i.mtm));
        const relevantOrders = allOrders.filter(o => relevantMtms.has(o.mtm));
        const allLeadTimes = relevantOrders
            .filter(o => o.actualArrival && o.dateIssuePI)
            .filter(o => {
                const arrivalDate = new Date(o.actualArrival!);
                const arrivalYear = arrivalDate.getUTCFullYear();
                const arrivalWeek = getISOWeek(arrivalDate);
                return arrivalYear === year && arrivalWeek >= startWeek && arrivalWeek <= endWeek;
            })
            .map(o => (new Date(o.actualArrival!).getTime() - new Date(o.dateIssuePI!).getTime()) / (1000 * 3600 * 24));
        const totalAvgLeadTime = allLeadTimes.length > 0 ? allLeadTimes.reduce((a, b) => a + b, 0) / allLeadTimes.length : 0;

        const daysInPeriod = (endWeek - startWeek + 1) * 7;
        const totalDaysOfSupply = totalCogs > 0 ? (totalOnHandValue / totalCogs) * daysInPeriod : Infinity;

        const totals = {
            inventoryTurns: totalInventoryTurns,
            weeksOfSupply: totalWeeksOfSupply,
            onHandValue: totalOnHandValue,
            otwValue: totalOtwValue,
            salesVelocity: totalSalesVelocity,
            avgAge: totalAvgAge,
            inStockRate: totalInStockRate,
            sellThroughRate: totalSellThroughRate,
            avgLeadTime: totalAvgLeadTime,
            daysOfSupply: totalDaysOfSupply,
        };

        return { tableData: data, totals };
    }, [inventoryData, allSales, allOrders, reconciledSales, mtmPrefix, year, startWeek, endWeek, cpuSalesCpuFilter, cpuSalesMtmFilter]);

    const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    return (
        <Card>
            <div className="p-4 sm:p-6 border-b border-border-color dark:border-dark-border-color">
                <h3 className="text-lg font-semibold text-primary-text dark:text-dark-primary-text flex items-center gap-2">
                    <CpuChipIcon className="h-5 w-5"/>
                    CPU Inventory Intelligence – SCOR-Aligned KPIs
                </h3>
            </div>
             <div className="p-4 sm:p-6 overflow-x-auto custom-scrollbar">
                 <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-blue-600 text-white font-bold">
                        <tr>
                            <Th className="text-left !p-3">CPU</Th>
                            <Th>Avg. Lead Time (Days)</Th>
                            <Th>Days of Supply</Th>
                            <Th>Inventory Turnover</Th>
                            <Th>In-Stock Rate</Th>
                            <Th>Sell-Through Rate</Th>
                            <Th>Weeks of Supply</Th>
                            <Th>On-Hand Value</Th>
                            <Th>OTW Value</Th>
                            <Th>Sales Velocity (Units/Wk)</Th>
                            <Th>Avg. Age (Days)</Th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-secondary-bg text-primary-text dark:text-dark-primary-text">
                        {tableData.map(row => {
                            const daysOfSupply = isFinite(row.daysOfSupply) ? Math.round(row.daysOfSupply) : Infinity;
                            const daysOfSupplyClass = (daysOfSupply < 14 || daysOfSupply > 28) && isFinite(daysOfSupply) ? 'font-bold text-orange-600' : '';
                            return (
                                <tr key={row.groupName} className="odd:bg-gray-50 dark:odd:bg-dark-secondary-bg/50">
                                    <Td className="font-bold text-left !p-3">{row.groupName}</Td>
                                    <Td className={row.avgLeadTime > 3 ? 'font-bold text-red-600' : ''}>{row.avgLeadTime.toFixed(1)}</Td>
                                    <Td className={daysOfSupplyClass}>{isFinite(daysOfSupply) ? daysOfSupply : '∞'}</Td>
                                    <Td>{row.inventoryTurns.toFixed(2)}</Td>
                                    <Td className={row.inStockRate < 95 ? 'font-bold text-red-600' : ''}>{row.inStockRate.toFixed(1)}%</Td>
                                    <Td className={row.sellThroughRate < 70 ? 'font-bold text-orange-600' : ''}>{row.sellThroughRate.toFixed(1)}%</Td>
                                    <Td>{isFinite(row.weeksOfSupply) ? Math.round(row.weeksOfSupply) : '∞'}</Td>
                                    <Td>{currencyFormatter.format(row.onHandValue)}</Td>
                                    <Td>{currencyFormatter.format(row.otwValue)}</Td>
                                    <Td>{Math.round(row.salesVelocity)}</Td>
                                    <Td>{Math.round(row.avgAge)}</Td>
                                </tr>
                            )
                        })}
                    </tbody>
                    <tfoot className="bg-blue-600 text-white font-bold">
                         <tr>
                            <Td className="text-left !p-3">Total / Weighted Avg.</Td>
                            <Td className={totals.avgLeadTime > 3 ? 'font-bold text-red-300' : ''}>{totals.avgLeadTime.toFixed(1)}</Td>
                            <Td className={(totals.daysOfSupply < 14 || totals.daysOfSupply > 28) && isFinite(totals.daysOfSupply) ? 'font-bold text-orange-300' : ''}>{isFinite(totals.daysOfSupply) ? Math.round(totals.daysOfSupply) : '∞'}</Td>
                            <Td>{totals.inventoryTurns.toFixed(2)}</Td>
                            <Td className={totals.inStockRate < 95 ? 'font-bold text-red-300' : ''}>{totals.inStockRate.toFixed(1)}%</Td>
                            <Td className={totals.sellThroughRate < 70 ? 'font-bold text-orange-300' : ''}>{totals.sellThroughRate.toFixed(1)}%</Td>
                            <Td>{isFinite(totals.weeksOfSupply) ? Math.round(totals.weeksOfSupply) : '∞'}</Td>
                            <Td>{currencyFormatter.format(totals.onHandValue)}</Td>
                            <Td>{currencyFormatter.format(totals.otwValue)}</Td>
                            <Td>{Math.round(totals.salesVelocity)}</Td>
                            <Td>{Math.round(totals.avgAge)}</Td>
                        </tr>
                    </tfoot>
                </table>
             </div>
        </Card>
    );
};

export default CpuInventoryIntelligenceTable;
