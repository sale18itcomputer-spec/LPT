

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  initialInputData,
  initialInputHeaders,
  transformDataLocally,
  PIVOT_GROUP_BY_OPTIONS,
  PIVOT_VALUE_OPTIONS,
  PIVOT_AGGREGATION_OPTIONS,
} from '../../utils/transformer';
import type { TransformedData } from '../../types';
import Card from '../ui/Card';
import { ArrowLongRightIcon, CpuChipIcon, TableCellsIcon, ArrowDownTrayIcon, ClipboardDocumentListIcon, DocumentMagnifyingGlassIcon, SparklesIcon } from '../ui/Icons';
import { exportDataToCsv } from '../../utils/csv';

// --- Type definitions ---
const transformedDataMap: { header: string; key: keyof TransformedData }[] = [
    { header: "*Lenovo Product Number", key: "lenovoProductNumber" },
    { header: "*Invoice Date", key: "invoiceDate" },
    { header: "Quantity", key: "quantity" },
    { header: "*Buyer ID", key: "buyerId" },
    { header: "*Invoice Number", key: "invoiceNumber" },
    { header: "Serial Number / Barcode", key: "serialNumberBarcode" },
    { header: "Unit BP Reported Price", key: "unitBPReportedPrice" },
    { header: "*Total BP Reported Rev", key: "totalBPReportedRev" },
    { header: "*Local Currency", key: "localCurrency" },
    { header: "MCN/Contract Number", key: "mcnContractNumber" },
    { header: "Comment", key: "comment" },
    { header: "*Buyer Name", key: "buyerName" },
];

// --- Sub-components for clarity ---

const EditableGrid: React.FC<{
    gridData: string[][];
    setGridData: React.Dispatch<React.SetStateAction<string[][]>>;
}> = ({ gridData, setGridData }) => {
    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newData = [...gridData];
        newData[rowIndex][colIndex] = value;
        setGridData(newData);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>, startRow: number, startCol: number) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text');
        const pastedRows = pasteData.split('\n').map(r => r.split('\t'));
        
        const requiredRows = startRow + pastedRows.length;
        const newGrid = [...gridData.map(row => [...row])];
        
        const rowsToAdd = requiredRows > newGrid.length ? requiredRows - newGrid.length : 0;
        
        if (rowsToAdd > 0) {
            for (let i = 0; i < rowsToAdd; i++) {
                newGrid.push(Array(initialInputHeaders.length).fill(''));
            }
        }
        
        pastedRows.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const targetRow = startRow + rowIndex;
                const targetCol = startCol + colIndex;
                if (targetRow < newGrid.length && targetCol < initialInputHeaders.length) {
                    newGrid[targetRow][targetCol] = cell;
                }
            });
        });
        setGridData(newGrid);
    };

    return (
        <div className="overflow-auto custom-scrollbar border border-border-color dark:border-dark-border-color rounded-lg bg-secondary-bg dark:bg-dark-secondary-bg">
            <table className="min-w-full text-xs border-separate border-spacing-0">
                <thead className="sticky top-0 bg-gray-50 dark:bg-dark-secondary-bg/50 z-10">
                    <tr>
                        <th className="sticky left-0 bg-gray-50 dark:bg-dark-secondary-bg/50 p-2 border-b border-r border-border-color dark:border-dark-border-color w-12 text-secondary-text dark:text-dark-secondary-text">#</th>
                        {initialInputHeaders.map((header, i) => (
                            <th key={i} className="p-2 border-b border-r border-border-color dark:border-dark-border-color font-semibold whitespace-nowrap text-secondary-text dark:text-dark-secondary-text">{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {gridData.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            <td className="sticky left-0 bg-gray-50 dark:bg-dark-secondary-bg/50 p-2 border-b border-r border-border-color dark:border-dark-border-color text-center text-secondary-text dark:text-dark-secondary-text">{rowIndex + 1}</td>
                            {row.map((cell, colIndex) => (
                                <td key={colIndex} className="border-b border-r border-border-color dark:border-dark-border-color p-0">
                                    <textarea
                                        value={cell}
                                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                        onPaste={(e) => handlePaste(e, rowIndex, colIndex)}
                                        className="w-full h-full p-1.5 bg-transparent border-0 focus:ring-1 focus:ring-highlight resize-none outline-none block text-primary-text dark:text-dark-primary-text"
                                        rows={1}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const TransformedDataGrid: React.FC<{ data: TransformedData[] }> = ({ data }) => (
    <div className="overflow-auto custom-scrollbar border border-border-color dark:border-dark-border-color rounded-lg">
        <table className="min-w-full text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 bg-gray-50 dark:bg-dark-secondary-bg/50 z-10">
                <tr>
                    {transformedDataMap.map(({ header }) => (
                        <th key={header} className="p-2 border-b border-r border-border-color dark:border-dark-border-color font-semibold whitespace-nowrap text-secondary-text dark:text-dark-secondary-text">{header.replace('*', '')}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="even:bg-slate-50/50 dark:even:bg-dark-secondary-bg/20">
                        {transformedDataMap.map(({ key }) => (
                            <td key={key} className="p-2 border-b border-r border-border-color dark:border-dark-border-color truncate max-w-xs text-secondary-text dark:text-dark-secondary-text">
                                {String(row[key] ?? '')}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const PivotResultGrid: React.FC<{ headers: string[], data: any[] }> = ({ headers, data }) => (
     <div className="overflow-auto custom-scrollbar border border-border-color dark:border-dark-border-color rounded-lg">
        <table className="min-w-full text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 bg-gray-50 dark:bg-dark-secondary-bg/50 z-10">
                <tr>
                    {headers.map((header, i) => (
                        <th key={i} className="p-2 border-b border-r border-border-color dark:border-dark-border-color font-semibold whitespace-nowrap text-secondary-text dark:text-dark-secondary-text">{header}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="even:bg-slate-50/50 dark:even:bg-dark-secondary-bg/20">
                        {headers.map((header) => (
                            <td key={header} className="p-2 border-b border-r border-border-color dark:border-dark-border-color truncate max-w-xs text-secondary-text dark:text-dark-secondary-text">
                                {row[header]}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; disabled?: boolean }> = ({ label, isActive, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`relative py-3 px-4 text-base font-semibold transition-colors disabled:cursor-not-allowed ${
            isActive 
                ? 'text-highlight' 
                : 'text-secondary-text dark:text-dark-secondary-text hover:text-primary-text dark:hover:text-dark-primary-text disabled:text-gray-300 dark:disabled:text-gray-600'
        }`}
    >
        {label}
        {isActive && <motion.div layoutId="transformer-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-highlight" />}
    </button>
);


// --- Main Component ---
const DataTransformer: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'input' | 'output'>('input');
    const [inputData, setInputData] = useState<string[][]>(initialInputData);
    const [transformedData, setTransformedData] = useState<TransformedData[]>([]);
    const [pivotConfig, setPivotConfig] = useState({
        groupBy: PIVOT_GROUP_BY_OPTIONS[0].value,
        value: PIVOT_VALUE_OPTIONS[0].value,
        aggregation: PIVOT_AGGREGATION_OPTIONS[0].value,
    });
    const [pivotResult, setPivotResult] = useState<{ headers: string[]; data: any[] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [pasteSuccess, setPasteSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const triggerPasteAnimation = () => {
        setPasteSuccess(true);
        setTimeout(() => setPasteSuccess(false), 500);
    };
    
    const handlePasteFromClipboard = async () => {
        if (!navigator.clipboard?.readText) {
            alert("Clipboard API not available. Please paste manually (Ctrl+V).");
            return;
        }
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                const rows = text.split('\n').map(r => r.split('\t'));
                const numCols = initialInputHeaders.length;
                
                const sanitizedRows = rows.map(row => {
                    if (row.length > numCols) return row.slice(0, numCols);
                    if (row.length < numCols) return [...row, ...Array(numCols - row.length).fill('')];
                    return row;
                });

                for (let i = 0; i < 10; i++) {
                    sanitizedRows.push(Array(numCols).fill(''));
                }

                setInputData(sanitizedRows);
                triggerPasteAnimation();
            }
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            setSaveError("Could not access clipboard. You may need to grant permission in your browser.");
            setTimeout(() => setSaveError(null), 3000);
        }
    };

    const handleTransform = useCallback(() => {
        setIsLoading(true);
        setTimeout(() => {
            const result = transformDataLocally(inputData);
            setTransformedData(result);
            setIsLoading(false);
            setPivotResult(null);
            setActiveTab('output');
        }, 500);
    }, [inputData]);

    const handleGeneratePivot = useCallback(() => {
        if (transformedData.length === 0) return;
        const grouped: Record<string, TransformedData[]> = transformedData.reduce((acc: Record<string, TransformedData[]>, row) => {
            const key = String(row[pivotConfig.groupBy as keyof TransformedData]);
            if (!acc[key]) acc[key] = [];
            acc[key].push(row);
            return acc;
        }, {} as Record<string, TransformedData[]>);
        
        const valueKey = pivotConfig.value as keyof TransformedData;
        const pivotData = Object.entries(grouped).map(([key, rows]) => {
            const values = rows.map(r => r[valueKey] as number);
            let aggregatedValue: number;

            switch (pivotConfig.aggregation) {
                case 'COUNT': aggregatedValue = values.length; break;
                case 'AVERAGE': aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length; break;
                case 'SUM': default: aggregatedValue = values.reduce((a, b) => a + b, 0); break;
            }
            return { groupBy: key, value: aggregatedValue };
        });

        const groupByLabel = PIVOT_GROUP_BY_OPTIONS.find(o => o.value === pivotConfig.groupBy)?.label || 'Group';
        const valueLabel = `${PIVOT_AGGREGATION_OPTIONS.find(o => o.value === pivotConfig.aggregation)?.label} of ${PIVOT_VALUE_OPTIONS.find(o => o.value === pivotConfig.value)?.label}`;
        const valueOption = PIVOT_VALUE_OPTIONS.find(v => v.value === pivotConfig.value)!;
        
        setPivotResult({
            headers: [groupByLabel, valueLabel],
            data: pivotData.map(d => ({ 
                [groupByLabel]: d.groupBy, 
                [valueLabel]: valueOption.isCurrency
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(d.value)
                    : d.value.toLocaleString()
            }))
        });
    }, [transformedData, pivotConfig]);

    const handleExport = useCallback(() => {
        if (transformedData.length === 0) return;
        const headers = transformedDataMap.map(h => ({ label: h.header.replace('*', ''), key: h.key }));
        exportDataToCsv(transformedData, headers, 'transformed_data.csv');
    }, [transformedData]);
    
    const hasInputData = useMemo(() => inputData.some(row => row.some(cell => cell.trim() !== '')), [inputData]);

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="flex items-center gap-x-3 mb-4">
                    <CpuChipIcon className="h-8 w-8 text-primary-text dark:text-dark-primary-text" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-primary-text dark:text-dark-primary-text">Instant Data Transformer</h1>
                        <p className="text-secondary-text dark:text-dark-secondary-text mt-1">Paste, transform, and pivot raw sales data in seconds.</p>
                    </div>
                </div>
                
                 <div className="border-b border-border-color dark:border-dark-border-color">
                    <TabButton label="1. Input Data" isActive={activeTab === 'input'} onClick={() => setActiveTab('input')} />
                    <TabButton label="2. Analyze Output" isActive={activeTab === 'output'} onClick={() => setActiveTab('output')} disabled={transformedData.length === 0} />
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="mt-6"
                    >
                       {activeTab === 'input' && (
                           <div>
                                <Card className="p-4 sm:p-6">
                                    <h3 className="text-lg font-semibold text-primary-text dark:text-dark-primary-text">Input Raw Data</h3>
                                    <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1 mb-4">Paste spreadsheet data into the grid below to get started.</p>
                                    
                                    <div className="flex flex-wrap items-center gap-4 mb-4">
                                        <button onClick={handlePasteFromClipboard} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg hover:bg-gray-100 dark:hover:bg-dark-primary-bg transition-colors">
                                            <ClipboardDocumentListIcon className="h-4 w-4" />
                                            Paste from Clipboard
                                        </button>
                                        
                                        <motion.button onClick={handleTransform} disabled={isLoading || !hasInputData} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-5 py-2 text-sm text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-x-2 btn-gradient shadow-md">
                                            {isLoading ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : <ArrowLongRightIcon className="h-5 w-5" />}
                                            <span>{isLoading ? 'Transforming...' : 'Transform & Analyze'}</span>
                                        </motion.button>

                                         <button onClick={() => { setInputData(initialInputData); setTransformedData([]); }} className="ml-auto text-sm text-secondary-text dark:text-dark-secondary-text hover:underline">
                                            Clear Input Data
                                        </button>
                                    </div>

                                    <EditableGrid gridData={inputData} setGridData={setInputData} />
                                </Card>
                           </div>
                       )}
                       {activeTab === 'output' && (
                           <div>
                                {transformedData.length > 0 ? (
                                     <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                        <Card className="p-4 sm:p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-primary-text dark:text-dark-primary-text">Transformed Output</h3>
                                                    <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1">{transformedData.length} rows processed.</p>
                                                </div>
                                                <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg hover:bg-gray-100 dark:hover:bg-dark-primary-bg"><ArrowDownTrayIcon className="h-4 w-4" /> Export CSV</button>
                                            </div>
                                            <TransformedDataGrid data={transformedData} />
                                        </Card>
                                        <Card className="p-4 sm:p-6">
                                             <h3 className="text-lg font-semibold text-primary-text dark:text-dark-primary-text">Pivot Table</h3>
                                             <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1 mb-4">Summarize your transformed data.</p>
                                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-slate-50 dark:bg-dark-secondary-bg/20 rounded-lg border border-border-color dark:border-dark-border-color">
                                                {Object.entries({ groupBy: PIVOT_GROUP_BY_OPTIONS, value: PIVOT_VALUE_OPTIONS, aggregation: PIVOT_AGGREGATION_OPTIONS }).map(([key, options]: [string, { value: string; label: string; isCurrency?: boolean; }[]]) => (
                                                    <div key={key} className="space-y-1">
                                                        <label className="text-xs font-medium text-secondary-text dark:text-dark-secondary-text capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                                                        <select value={pivotConfig[key as keyof typeof pivotConfig]} onChange={e => setPivotConfig(p => ({...p, [key]: e.target.value}))} className="w-full text-sm rounded-md border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg focus:ring-highlight focus:border-highlight text-primary-text dark:text-dark-primary-text">
                                                            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                        </select>
                                                    </div>
                                                ))}
                                             </div>
                                             <button onClick={handleGeneratePivot} className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-highlight text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700"><TableCellsIcon className="h-4 w-4" /> Generate Pivot</button>
                                             
                                             <AnimatePresence>
                                                {pivotResult ? (
                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                                                        <PivotResultGrid headers={pivotResult.headers} data={pivotResult.data} />
                                                    </motion.div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-center text-secondary-text h-40 mt-4 border-2 border-dashed border-border-color dark:border-dark-border-color rounded-lg">
                                                        <DocumentMagnifyingGlassIcon className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2"/>
                                                        <p className="font-semibold text-sm text-primary-text dark:text-dark-primary-text">Your pivot results will appear here</p>
                                                    </div>
                                                )}
                                             </AnimatePresence>
                                        </Card>
                                     </div>
                                ) : (
                                     <div className="flex flex-col items-center justify-center text-center text-secondary-text h-64">
                                        <DocumentMagnifyingGlassIcon className="h-12 w-12 text-gray-400 mb-3"/>
                                        <h3 className="font-semibold text-primary-text">No data to display</h3>
                                        <p className="text-sm mt-1">Go back to the "Input Data" tab to transform your data first.</p>
                                    </div>
                                )}
                           </div>
                       )}
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </main>
    );
};

export default DataTransformer;