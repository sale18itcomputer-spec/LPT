
import React, { useMemo } from 'react';
import type { RebateSale, RebateDetail } from '../../types';

interface RebateSalesTableProps {
    sales: RebateSale[];
    rebateDetails?: RebateDetail[];
    programPerUnit?: number | null;
}

const RebateSalesTable: React.FC<RebateSalesTableProps> = ({ sales, rebateDetails, programPerUnit }) => {
    if (sales.length === 0) {
        return <div className="p-4 text-center text-sm text-secondary-text bg-gray-100 dark:bg-dark-secondary-bg/20">No eligible sales found for this context.</div>;
    }
    
    const currencyFormatter = (val: number | null) => (val === null || val === undefined) ? '-' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    const getPerUnitForSale = (sale: RebateSale): number | null => {
        // 1. If the program has specific MTM rules, use those exclusively.
        if (rebateDetails && rebateDetails.length > 0) {
            const detail = rebateDetails.find(d => 
                d.mtm === sale.mtm &&
                sale.rebateInvoiceDate &&
                d.startDate &&
                d.endDate &&
                sale.rebateInvoiceDate >= d.startDate &&
                sale.rebateInvoiceDate <= d.endDate
            );
            // If a specific rule matches and has a perUnit value, use it.
            if (detail && detail.perUnit != null) {
                return detail.perUnit;
            }
            // If there are MTM rules but none match this sale's MTM, it gets no rebate from this program.
            return null;
        }
        
        // 2. If there are NO MTM rules, it's a program-wide rebate. Fall back to the general program-level rebate.
        return programPerUnit ?? null;
    };

    const totals = useMemo(() => {
        return sales.reduce((acc, sale) => {
            acc.quantity += sale.quantity;
            acc.value += sale.quantity * sale.unitBPReportedPrice;
            const perUnit = getPerUnitForSale(sale);
            if(perUnit !== null) {
                acc.totalRebate += perUnit * sale.quantity;
            }
            return acc;
        }, { quantity: 0, value: 0, totalRebate: 0 });
    }, [sales, rebateDetails, programPerUnit]);


    return (
        <div className="p-3 bg-gray-100 dark:bg-dark-secondary-bg/20">
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                <table className="min-w-full text-xs">
                    <thead className="bg-gray-200 dark:bg-dark-secondary-bg/40 sticky top-0 z-10">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium text-secondary-text uppercase tracking-wider">Invoice #</th>
                            <th className="px-3 py-2 text-left font-medium text-secondary-text uppercase tracking-wider">Invoice Date</th>
                            <th className="px-3 py-2 text-left font-medium text-secondary-text uppercase tracking-wider">Buyer ID</th>
                            <th className="px-3 py-2 text-left font-medium text-secondary-text uppercase tracking-wider">MTM</th>
                            <th className="px-3 py-2 text-right font-medium text-secondary-text uppercase tracking-wider">Quantity</th>
                            <th className="px-3 py-2 text-right font-medium text-secondary-text uppercase tracking-wider">Unit Price</th>
                            <th className="px-3 py-2 text-right font-medium text-secondary-text uppercase tracking-wider">Per Unit Rebate</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-secondary-bg/80 divide-y divide-border-color dark:divide-dark-border-color">
                        {sales.map((sale, index) => {
                            const perUnit = getPerUnitForSale(sale);
                            return (
                                <tr key={`${sale.invoiceNumber}-${sale.serialNumber}-${index}`}>
                                    <td className="px-3 py-1.5 whitespace-nowrap text-secondary-text">{sale.invoiceNumber}</td>
                                    <td className="px-3 py-1.5 whitespace-nowrap text-secondary-text">{sale.rebateInvoiceDate}</td>
                                    <td className="px-3 py-1.5 whitespace-nowrap text-secondary-text">{sale.buyerId}</td>
                                    <td className="px-3 py-1.5 whitespace-nowrap text-secondary-text font-mono">{sale.mtm}</td>
                                    <td className="px-3 py-1.5 text-right text-primary-text">{sale.quantity}</td>
                                    <td className="px-3 py-1.5 text-right text-primary-text">{currencyFormatter(sale.unitBPReportedPrice)}</td>
                                    <td className="px-3 py-1.5 text-right font-semibold text-green-600">{currencyFormatter(perUnit)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-gray-200 dark:bg-dark-secondary-bg/40 font-semibold sticky bottom-0">
                        <tr>
                            <td colSpan={4} className="px-3 py-2 text-left text-primary-text">Total</td>
                            <td className="px-3 py-2 text-right text-primary-text">{totals.quantity.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-primary-text">{currencyFormatter(totals.value)}</td>
                            <td className="px-3 py-2 text-right text-green-600">{currencyFormatter(totals.totalRebate)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default RebateSalesTable;