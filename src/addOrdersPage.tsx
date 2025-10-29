

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from './ui/Card';
import { ExclamationTriangleIcon, CheckCircleIcon, ClipboardDocumentListIcon, ArrowLongRightIcon, XMarkIcon } from './ui/Icons';
import { appendSheetData } from '../services/googleScriptService';

const SHEET_HEADERS = [
    'Sales Order Number', 'MTM', 'Model Name', 'Specification',
    'Shipping Quantity', 'Date issue PI', 'Unit Price', 'Add on Unit Price', 'BackPack',
    'Shipping fee', 'Amount ( $ )', 'Factory to SGP', 'SGP to KH', 'Status',
    'Lenovo Support', 'Schedule Ship Date', 'Commercial Invoice', 'Serial Number',
    'ETA', 'Actual Arrival', 'Reorder'
];

type ParsedOrder = {
    [key in typeof SHEET_HEADERS[number]]?: string | number | null;
} & { _row: number; _error?: string };


const parsePastedData = (text: string): { orders: ParsedOrder[], errors: string[] } => {
    if (!text.trim()) {
        return { orders: [], errors: [] };
    }
    const lines = text.trim().split('\n');
    const orders: ParsedOrder[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split('\t');
        const rowNum = i + 1;
        const order: ParsedOrder = { _row: rowNum };
        let rowError = '';

        SHEET_HEADERS.forEach((header, index) => {
            order[header] = values[index] ? values[index].trim() : '';
        });

        const qtyStr = String(order['Shipping Quantity'] || '0');
        const qty = parseInt(qtyStr, 10);
        if (isNaN(qty) || qty <= 0) {
            rowError = "Invalid or missing Shipping Quantity.";
            order['Shipping Quantity'] = 0;
        } else {
            order['Shipping Quantity'] = qty;
        }

        const unitPriceStr = String(order['Unit Price'] || '0').replace(/[^0-9.-]+/g, '');
        const unitPrice = parseFloat(unitPriceStr);
        if (isNaN(unitPrice)) {
            rowError = rowError || "Invalid Unit Price.";
            order['Unit Price'] = 0;
        } else {
            order['Unit Price'] = unitPrice;
        }
        
        if (!order['Sales Order Number'] || !order['MTM']) {
            rowError = "Missing Sales Order or MTM.";
        }

        if (rowError) {
            order._error = rowError;
        }
        orders.push(order);
    }

    return { orders, errors };
};


const formatDateForSheet = (dateString: string | number | null | undefined): string => {
    if (!dateString) return '';
    // Check for MM/DD/YYYY or YYYY-MM-DD
    const dateRegex = /(?:(\d{4})-(\d{1,2})-(\d{1,2}))|(?:(\d{1,2})\/(\d{1,2})\/(\d{4}))/;
    const match = String(dateString).match(dateRegex);
    if (match) {
        let year, month, day;
        if (match[1]) { // YYYY-MM-DD
            [year, month, day] = [match[1], match[2], match[3]];
        } else { // MM/DD/YYYY
            [month, day, year] = [match[4], match[5], match[6]];
        }
        const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
        if (!isNaN(d.getTime())) {
            return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
        }
    }
    // Fallback for other potential date formats recognized by new Date()
    const d = new Date(String(dateString));
    if (!isNaN(d.getTime())) {
         return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
    }
    return '';
};

const ErrorTooltip: React.FC<{ error: string }> = ({ error }) => (
    <div className="relative flex justify-center group">
        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
        <div className="absolute bottom-full mb-2 w-max max-w-xs p-2 text-xs text-white bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {error}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
        </div>
    </div>
);


interface AddOrdersPageProps {
  onSaveSuccess: () => void;
}

const AddOrdersPage: React.FC<AddOrdersPageProps> = ({ onSaveSuccess }) => {
    const [pastedText, setPastedText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [pasteSuccess, setPasteSuccess] = useState(false);

    const { orders: parsedOrders, errors: parsingErrors } = useMemo(() => parsePastedData(pastedText), [pastedText]);

    const validOrders = useMemo(() => parsedOrders.filter(o => !o._error), [parsedOrders]);
    const hasErrors = parsedOrders.some(o => o._error) || parsingErrors.length > 0;

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
                setPastedText(text);
                triggerPasteAnimation();
            }
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            setSaveError("Could not access clipboard. You may need to grant permission in your browser.");
            setTimeout(() => setSaveError(null), 3000);
        }
    };

    const handleSave = async () => {
        if (validOrders.length === 0) {
            setSaveError("No valid orders to import.");
            return;
        }
        setIsSaving(true);
        setSaveError(null);
        try {
             const dataToAppend = validOrders.map(o => {
                const newOrder: { [key: string]: any } = {};
                SHEET_HEADERS.forEach(header => {
                    const typedKey = header as keyof typeof o;
                    if (['Date issue PI', 'Schedule Ship Date', 'ETA', 'Actual Arrival'].includes(header)) {
                        newOrder[header] = formatDateForSheet(o[typedKey] as string | null);
                    } else {
                        newOrder[header] = o[typedKey] ?? '';
                    }
                });
                return newOrder;
            });
            
            await appendSheetData({
                sheetType: 'orders',
                data: dataToAppend
            });
            setSaveSuccess(true);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsSaving(false);
        }
    };
    
    useEffect(() => {
        if (saveSuccess) {
            const timer = setTimeout(() => {
                onSaveSuccess();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [saveSuccess, onSaveSuccess]);

    if (saveSuccess) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="text-center p-8"
                >
                    <CheckCircleIcon className="h-24 w-24 text-green-500 mx-auto" />
                    <h2 className="mt-4 text-3xl font-bold text-primary-text">Import Successful!</h2>
                    <p className="mt-2 text-secondary-text">{validOrders.length} orders have been added to the dashboard.</p>
                    <p className="mt-4 text-sm text-secondary-text">Redirecting you back to the overview...</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
                        <motion.div
                            className="bg-green-500 h-1.5 rounded-full"
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 3, ease: 'linear' }}
                        />
                    </div>
                </motion.div>
            </div>
        );
    }
    
    return (
        <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-7xl mx-auto"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Left Panel */}
                    <div className="space-y-6">
                        <h1 className="text-3xl font-bold tracking-tight text-primary-text">Bulk Add New Orders</h1>
                        <div className="space-y-4 text-secondary-text p-4 bg-slate-50 dark:bg-dark-secondary-bg/20 rounded-lg border border-border-color dark:border-dark-border-color">
                           <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-highlight text-white flex items-center justify-center font-bold">1</div>
                                <div>
                                    <h3 className="font-semibold text-primary-text">Copy from Spreadsheet</h3>
                                    <p className="text-sm">In Google Sheets, select and copy the rows you want to import. <strong className="text-highlight">Do not include the header row.</strong></p>
                                </div>
                           </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-highlight text-white flex items-center justify-center font-bold">2</div>
                                <div>
                                    <h3 className="font-semibold text-primary-text">Paste Your Data</h3>
                                    <p className="text-sm">Paste the copied rows into the text area on this page. The app will automatically parse the tab-separated values.</p>
                                </div>
                           </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-highlight text-white flex items-center justify-center font-bold">3</div>
                                <div>
                                    <h3 className="font-semibold text-primary-text">Review and Import</h3>
                                    <p className="text-sm">A preview will appear on the right. Review the data for errors, then click "Import Orders" to save.</p>
                                </div>
                           </div>
                        </div>
                        <div className="space-y-2">
                            <div className={`relative rounded-lg border-2 border-dashed ${pasteSuccess ? 'border-highlight shadow-glow' : 'border-border-color dark:border-dark-border-color'} transition-all duration-300 ease-in-out`}>
                                <AnimatePresence>
                                    {!pastedText && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-secondary-text dark:text-dark-secondary-text"
                                        >
                                            <ClipboardDocumentListIcon className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                                            <p className="mt-2 text-sm">Paste content here or use the button below</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <textarea
                                    id="pasted-data"
                                    rows={12}
                                    value={pastedText}
                                    onChange={(e) => setPastedText(e.target.value)}
                                    onPaste={triggerPasteAnimation}
                                    placeholder=""
                                    className="relative z-10 block w-full text-sm rounded-lg bg-transparent focus:outline-none p-4 text-primary-text dark:text-dark-primary-text font-mono resize-y custom-scrollbar"
                                />
                            </div>
                             <div className="flex items-center justify-between min-h-[34px]">
                                <button
                                    type="button"
                                    onClick={handlePasteFromClipboard}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg/50 hover:bg-gray-100 dark:hover:bg-dark-secondary-bg transition-colors"
                                >
                                    <ClipboardDocumentListIcon className="h-4 w-4" />
                                    Paste from Clipboard
                                </button>
                                <AnimatePresence>
                                    {pastedText && (
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            type="button"
                                            onClick={() => setPastedText('')}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <XMarkIcon className="h-4 w-4" />
                                            Clear
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel */}
                    <div className="md:sticky md:top-36">
                       <AnimatePresence>
                         {pastedText.trim() ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <Card className="p-0">
                                     <div className="p-4 border-b border-border-color dark:border-dark-border-color">
                                        <h3 className="text-lg font-semibold text-primary-text">Preview</h3>
                                         <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
                                                <span className="text-sm text-secondary-text">Total: <span className="font-bold text-primary-text">{parsedOrders.length}</span></span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                                                <span className="text-sm text-secondary-text">Valid: <span className="font-bold text-green-600">{validOrders.length}</span></span>
                                            </div>
                                            {hasErrors && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                                    <span className="text-sm text-secondary-text">Errors: <span className="font-bold text-red-600">{parsedOrders.length - validOrders.length}</span></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="max-h-[30rem] overflow-y-auto custom-scrollbar">
                                        <table className="min-w-full text-sm">
                                            <tbody className="bg-secondary-bg dark:bg-dark-secondary-bg divide-y divide-border-color dark:divide-dark-border-color">
                                                {parsedOrders.map((order, idx) => (
                                                    <tr key={idx} className={`${order._error ? 'bg-red-50 dark:bg-red-900/20' : 'even:bg-slate-50/50 dark:even:bg-dark-secondary-bg/20'}`}>
                                                        <td className="p-3 whitespace-nowrap">
                                                            <div className="font-medium text-primary-text">{order['Sales Order Number']}</div>
                                                            <div className="text-xs text-secondary-text">{order['MTM']}</div>
                                                        </td>
                                                        <td className="p-3 whitespace-nowrap text-secondary-text truncate max-w-xs">{order['Model Name']}</td>
                                                        <td className="p-3 text-center text-primary-text font-semibold">{String(order['Shipping Quantity'])}</td>
                                                        <td className="p-3 text-center">
                                                            {order._error ? (
                                                                <ErrorTooltip error={order._error} />
                                                            ) : (
                                                                <div className="flex justify-center">
                                                                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </motion.div>
                         ) : (
                             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <div className="flex flex-col items-center justify-center text-center text-secondary-text p-8 border-2 border-dashed border-border-color dark:border-dark-border-color rounded-lg min-h-[24rem]">
                                    <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mb-3" />
                                    <h3 className="font-semibold text-primary-text">Waiting for data</h3>
                                    <p className="text-sm mt-1">Paste your copied rows into the text area to see a preview here.</p>
                                </div>
                            </motion.div>
                         )}
                       </AnimatePresence>
                        <div className="mt-6 flex justify-end items-center gap-x-3">
                             {saveError && <p className="text-sm text-red-600 mr-4">{saveError}</p>}
                            <button onClick={handleSave} disabled={isSaving || validOrders.length === 0} className="px-6 py-2.5 text-base font-semibold rounded-lg bg-highlight text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center btn-gradient shadow-lg">
                                {isSaving && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                {isSaving ? 'Importing...' : `Import ${validOrders.length} Orders`}
                                <ArrowLongRightIcon className="h-5 w-5 ml-2"/>
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </main>
    );
};

export default AddOrdersPage;