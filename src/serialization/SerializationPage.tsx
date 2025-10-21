import React, { useState, useMemo, useCallback, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { appendSheetData } from '../../services/googleScriptService';
import type { SerializedItem } from '../../types';
import Card from '../ui/Card';
import { CpuChipIcon, CheckCircleIcon, ExclamationTriangleIcon, ChevronRightIcon, DocumentMagnifyingGlassIcon } from '../ui/Icons';

// --- Reusable Components ---

const FormSelect: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder: string;
    disabled?: boolean;
}> = ({ label, value, onChange, options, placeholder, disabled = false }) => (
    <div>
        <label className="block text-sm font-medium text-secondary-text">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-border-color focus:outline-none focus:ring-highlight focus:border-highlight sm:text-sm rounded-md bg-primary-bg dark:bg-dark-secondary-bg disabled:bg-gray-100 dark:disabled:bg-dark-primary-bg disabled:cursor-not-allowed"
        >
            <option value="" disabled>{placeholder}</option>
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);


// --- Expanded Row Content for Bulk Adding ---
interface MtmData {
    mtm: string;
    modelName: string;
    totalQty: number;
    serializedCount: number;
}

interface ExpandedRowContentProps {
    data: MtmData;
    existingSerials: SerializedItem[];
    onSave: (mtm: string, serials: string[]) => Promise<void>;
}

const ExpandedRowContent: React.FC<ExpandedRowContentProps> = ({ data, existingSerials, onSave }) => {
    const [pastedText, setPastedText] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    
    const { mtm, totalQty, serializedCount } = data;
    const fullPrefix = `1S${mtm}`;

    const existingSerialsSet = useMemo(() => new Set(existingSerials.map(item => item.fullSerializedString)), [existingSerials]);

    const { parsedSerials, newUniqueSerials, spaceAvailable, serialsToImport } = useMemo(() => {
        const parsed = pastedText.split(/\s+/).map(s => s.trim().toUpperCase()).filter(Boolean);
        const uniqueInPasted = [...new Set(parsed)];
        const newSerials = uniqueInPasted.filter(s => !existingSerialsSet.has(`${fullPrefix}${s}`));
        const space = totalQty - serializedCount;
        const toImport = newSerials.slice(0, Math.max(0, space));
        return {
            parsedSerials: parsed,
            newUniqueSerials: newSerials,
            spaceAvailable: Math.max(0, space),
            serialsToImport: toImport,
        };
    }, [pastedText, existingSerialsSet, fullPrefix, totalQty, serializedCount]);

    const handleSave = async () => {
        if (serialsToImport.length === 0 || saveStatus !== 'idle' && saveStatus !== 'error') return;
        setSaveStatus('saving');
        setErrorMessage('');
        try {
            await onSave(mtm, serialsToImport);
            setSaveStatus('success');
            setPastedText(''); // Clear input
            setTimeout(() => {
                setSaveStatus('idle');
            }, 2500);
        } catch (err) {
            setSaveStatus('error');
            setErrorMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
        }
    };
    
    const buttonContent = useMemo(() => {
        switch (saveStatus) {
            case 'saving':
                return <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Saving...</>;
            case 'success':
                return <><CheckCircleIcon className="h-5 w-5 mr-2" /> Success!</>;
            case 'error':
                return <><ExclamationTriangleIcon className="h-5 w-5 mr-2" /> Retry Import</>;
            default:
                return `Import ${serialsToImport.length} New Serial(s)`;
        }
    }, [saveStatus, serialsToImport.length]);

    const buttonColor = useMemo(() => {
        switch (saveStatus) {
            case 'success': return 'bg-green-600 hover:bg-green-700';
            case 'error': return 'bg-red-600 hover:bg-red-700';
            default: return 'bg-highlight hover:bg-blue-700';
        }
    }, [saveStatus]);

    return (
        <div className="bg-slate-50 dark:bg-dark-primary-bg p-4 grid grid-cols-1 md:grid-cols-2 gap-6" onClick={e => e.stopPropagation()}>
            {/* Left side: Input */}
            <div>
                <label htmlFor={`paste-area-${mtm}`} className="text-sm font-medium text-secondary-text">Paste Serial Numbers for {mtm}</label>
                <textarea
                    id={`paste-area-${mtm}`}
                    value={pastedText}
                    onChange={e => setPastedText(e.target.value)}
                    rows={10}
                    placeholder={`Paste serials here...`}
                    className="mt-1 block w-full text-sm rounded-md border-border-color shadow-sm focus:border-highlight focus:ring-highlight bg-primary-bg dark:bg-dark-secondary-bg font-mono custom-scrollbar text-primary-text dark:text-dark-primary-text"
                    disabled={spaceAvailable <= 0 || saveStatus === 'saving' || saveStatus === 'success'}
                />
                 <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-secondary-text border-t border-border-color pt-2">
                    <span>Pasted: <span className="font-semibold text-primary-text">{parsedSerials.length}</span></span>
                    <span>Duplicates Found: <span className="font-semibold text-primary-text">{newUniqueSerials.length < parsedSerials.length ? parsedSerials.length - newUniqueSerials.length : 0}</span></span>
                    <span>New Unique Serials: <span className="font-semibold text-primary-text">{newUniqueSerials.length}</span></span>
                    <span>Space Remaining: <span className="font-semibold text-primary-text">{spaceAvailable}</span></span>
                </div>
                <div className="mt-4">
                    <button 
                        onClick={handleSave}
                        disabled={saveStatus === 'saving' || saveStatus === 'success' || serialsToImport.length === 0}
                        className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors ${buttonColor} disabled:opacity-50`}
                    >
                        {buttonContent}
                    </button>
                    {saveStatus === 'error' && <p className="text-xs text-red-600 mt-2 text-center">{errorMessage}</p>}
                </div>
            </div>
            {/* Right side: Existing */}
            <div>
                <h4 className="text-sm font-medium text-secondary-text">Existing Serials for {mtm} ({existingSerials.length})</h4>
                {existingSerials.length > 0 ? (
                    <div className="mt-1 h-64 overflow-y-auto custom-scrollbar border border-border-color rounded-md bg-primary-bg dark:bg-dark-secondary-bg p-2">
                        <ul className="text-xs font-mono text-secondary-text space-y-1">
                            {existingSerials.map(item => <li key={item.fullSerializedString} title={new Date(item.timestamp).toLocaleString()}>{item.fullSerializedString}</li>)}
                        </ul>
                    </div>
                ) : <div className="mt-1 h-64 flex items-center justify-center text-sm text-secondary-text border border-dashed rounded-md">No serials recorded yet.</div> }
            </div>
        </div>
    );
};

// --- Main Page Component ---
interface MtmRowProps {
    data: MtmData;
    isExpanded: boolean;
    onToggle: () => void;
    existingSerials: SerializedItem[];
    onSave: (mtm: string, serials: string[]) => Promise<void>;
}

const MtmRow: React.FC<MtmRowProps> = ({ data, isExpanded, onToggle, existingSerials, onSave }) => {
    const { mtm, modelName, totalQty, serializedCount } = data;
    const progress = totalQty > 0 ? (serializedCount / totalQty) * 100 : 0;
    const isComplete = serializedCount >= totalQty;

    let statusIcon: React.ReactNode;
    let statusText: string;
    let statusColor: string;

    if (serializedCount > totalQty) {
        statusIcon = <ExclamationTriangleIcon className="h-5 w-5" />;
        statusText = "Overserialized";
        statusColor = "text-red-600";
    } else if (isComplete) {
        statusIcon = <CheckCircleIcon className="h-5 w-5" />;
        statusText = "Complete";
        statusColor = "text-green-600";
    } else {
        statusIcon = <CpuChipIcon className="h-5 w-5" />;
        statusText = "Pending";
        statusColor = "text-gray-500";
    }

    return (
        <Fragment>
            <tr className={`cursor-pointer transition-colors ${isComplete ? 'bg-green-50/50 dark:bg-green-900/10 opacity-70 hover:opacity-100' : 'hover:bg-gray-50 dark:hover:bg-dark-primary-bg'}`} onClick={onToggle}>
                <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-primary-text">{mtm}</div>
                    <div className="text-sm text-secondary-text truncate max-w-xs">{modelName}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className={`${isComplete ? 'bg-green-600' : 'bg-highlight'}`} style={{ width: `${Math.min(100, progress)}%`, height: '0.625rem', borderRadius: '9999px' }}></div>
                        </div>
                        <span className="text-sm font-medium text-secondary-text">{serializedCount}/{totalQty}</span>
                    </div>
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${statusColor}`}>
                    <div className="flex items-center gap-2">
                        {statusIcon}
                        <span>{statusText}</span>
                    </div>
                </td>
                <td className="px-4 py-3 text-center">
                    <ChevronRightIcon className={`h-5 w-5 text-secondary-text transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                </td>
            </tr>
            <tr className="p-0">
                <td colSpan={4} className="p-0 border-0">
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                            >
                               <ExpandedRowContent data={data} existingSerials={existingSerials} onSave={onSave} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </td>
            </tr>
        </Fragment>
    );
};


const SerializationPage: React.FC = () => {
    const { allOrders, allSerializedItems, handleGlobalRefresh, serializationError } = useData();
    const [selectedSO, setSelectedSO] = useState('');
    const [expandedMTMs, setExpandedMTMs] = useState<Set<string>>(new Set());

    const salesOrders = useMemo(() => {
        const uniqueSOs = [...new Set(allOrders.map(o => o.salesOrder))];
        return uniqueSOs.sort().map(so => ({ value: so, label: so }));
    }, [allOrders]);

    const mtmsForSelectedSO = useMemo(() => {
        if (!selectedSO) return [];
        const mtmMap = new Map<string, MtmData>();

        allOrders
            .filter(o => o.salesOrder === selectedSO)
            .forEach(o => {
                if (!mtmMap.has(o.mtm)) {
                    mtmMap.set(o.mtm, { mtm: o.mtm, modelName: o.modelName, totalQty: 0, serializedCount: 0 });
                }
                mtmMap.get(o.mtm)!.totalQty += o.qty;
            });
            
        allSerializedItems
            .filter(item => item.salesOrder === selectedSO)
            .forEach(item => {
                if(mtmMap.has(item.mtm)) {
                    mtmMap.get(item.mtm)!.serializedCount++;
                }
            });

        return Array.from(mtmMap.values());
    }, [selectedSO, allOrders, allSerializedItems]);
    
    const existingSerialsByMtm = useMemo(() => {
        if (!selectedSO) return new Map<string, SerializedItem[]>();
        const map = new Map<string, SerializedItem[]>();
        allSerializedItems
            .filter(item => item.salesOrder === selectedSO)
            .forEach(item => {
                if (!map.has(item.mtm)) map.set(item.mtm, []);
                map.get(item.mtm)!.push(item);
            });
        
        map.forEach(list => list.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
        
        return map;
    }, [selectedSO, allSerializedItems]);

    const toggleExpansion = (mtm: string) => {
        setExpandedMTMs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(mtm)) newSet.delete(mtm);
            else newSet.add(mtm);
            return newSet;
        });
    };
    
    const handleSaveSerials = useCallback(async (mtm: string, serials: string[]) => {
        const fullPrefix = `1S${mtm}`;
        const dataToAppend = serials.map(sn => ({
            'SO': selectedSO,
            'MTM': mtm,
            'SN': sn,
            'Serialization': `${fullPrefix}${sn}`,
        }));

        await appendSheetData({ sheetType: 'serialization', data: dataToAppend });
        await handleGlobalRefresh();
    }, [selectedSO, handleGlobalRefresh]);

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="flex items-center gap-x-3 mb-4">
                    <CpuChipIcon className="h-8 w-8 text-primary-text dark:text-dark-primary-text" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-primary-text dark:text-dark-primary-text">Product Serialization</h1>
                        <p className="text-secondary-text dark:text-dark-secondary-text mt-1">Scan or paste serial numbers to track inventory from arrival.</p>
                    </div>
                </div>

                {serializationError && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg text-sm flex items-start gap-3"
                    >
                        <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Serialization Data Unavailable</p>
                            <p>{serializationError}</p>
                        </div>
                    </motion.div>
                )}
                
                 <Card className="p-4 sm:p-6 mb-6">
                    <div className="max-w-md">
                        <FormSelect
                            label="Select a Sales Order"
                            value={selectedSO}
                            onChange={so => { setSelectedSO(so); setExpandedMTMs(new Set()); }}
                            options={salesOrders}
                            placeholder="-- Choose an SO to begin --"
                        />
                    </div>
                </Card>
                
                <Card className="p-0">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border-color dark:divide-dark-border-color">
                            <thead className="bg-gray-50 dark:bg-dark-secondary-bg/50">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Product</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Progress</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-secondary-text uppercase tracking-wider">Manage</th>
                                </tr>
                            </thead>
                            <tbody className="bg-secondary-bg dark:bg-dark-secondary-bg divide-y divide-border-color dark:divide-dark-border-color">
                                {selectedSO ? (
                                    mtmsForSelectedSO.length > 0 ? (
                                        mtmsForSelectedSO.map(mtmData => (
                                            <MtmRow
                                                key={mtmData.mtm}
                                                data={mtmData}
                                                isExpanded={expandedMTMs.has(mtmData.mtm)}
                                                onToggle={() => toggleExpansion(mtmData.mtm)}
                                                existingSerials={existingSerialsByMtm.get(mtmData.mtm) || []}
                                                onSave={handleSaveSerials}
                                            />
                                        ))
                                    ) : (
                                        <tr><td colSpan={4} className="text-center py-20 text-secondary-text">No MTMs found for this Sales Order.</td></tr>
                                    )
                                ) : (
                                    <tr><td colSpan={4} className="text-center py-20 text-secondary-text">
                                        <div className="flex flex-col items-center">
                                            <DocumentMagnifyingGlassIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4"/>
                                            <h3 className="text-lg font-semibold text-primary-text">Select a Sales Order</h3>
                                            <p className="mt-1">Choose an SO from the dropdown above to view and manage product serials.</p>
                                        </div>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </motion.div>
        </main>
    );
};

export default SerializationPage;