

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Order, FilterOptions } from '../types';
import ModalPanel from './ui/ModalPanel';
import { XMarkIcon, CalendarDaysIcon, TagIcon, TruckIcon, BanknotesIcon, CubeIcon, ExclamationTriangleIcon, PencilIcon, SparklesIcon } from './ui/Icons';
import { updateSheetData } from '../services/googleScriptService';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  newModelMtms: Set<string>;
  filterOptions: FilterOptions;
  onDataUpdate: () => void;
  onPsrefLookup: (item: { mtm: string; modelName: string }) => void;
}

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
    <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-6 h-6 text-secondary-text mt-1">{icon}</div>
        <div>
            <p className="text-sm text-secondary-text">{label}</p>
            <p className="text-base text-primary-text">{value || <span className="text-secondary-text">N/A</span>}</p>
        </div>
    </div>
);

const EditableField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-xs font-medium text-secondary-text">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

const StatusBadge: React.FC<{ text: string, color: 'red' | 'orange' }> = ({ text, color }) => {
    const colors = {
        red: 'bg-red-100 text-red-800',
        orange: 'bg-orange-100 text-orange-800'
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
            {text}
        </span>
    );
}

const NewModelBadge: React.FC = () => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800" title="First ordered within the last 90 days">
       New Model
   </span>
);

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, onClose, order, newModelMtms, filterOptions, onDataUpdate, onPsrefLookup }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState<Partial<Order>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
        const originalBodyOverflow = document.body.style.overflow;
        const originalBodyPaddingRight = document.body.style.paddingRight;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        
        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
        
        // When modal opens, reset editing state
        if (order) setEditedOrder({ ...order });
        setIsEditing(false);
        setSaveError(null);

        return () => {
            document.body.style.overflow = originalBodyOverflow;
            document.body.style.paddingRight = originalBodyPaddingRight;
        };
    }
  }, [isOpen, order]);

  if (!order) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: string | number | null = value;
    if (type === 'number') {
        finalValue = value === '' ? null : parseFloat(value);
    }
    setEditedOrder(prev => ({ ...prev, [name]: finalValue }));
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    if (!order.salesOrder || !order.mtm) {
        setSaveError("Sales Order and MTM are required to identify the row.");
        setIsSaving(false);
        return;
    }
    
    try {
        const headerMapping: Record<keyof Order, string> = {
            specification: 'Specification', qty: 'Shipping Quantity', fobUnitPrice: 'Unit Price',
            factoryToSgp: 'Status to SGP', status: 'Status to KH',
            ShipDate: 'Schedule ship date', dateIssuePI: 'Order Receipt Date', eta: 'ETA', actualArrival: 'Actual Arrival',
            deliveryNumber: 'Delivery Number',
            // Non-editable fields:
            salesOrder: 'Sales Order Number', mtm: 'Product ID', modelName: 'Model Name',
            orderValue: 'Amount ( $ )', isDelayedProduction: 'isDelayedProduction', isDelayedTransit: 'isDelayedTransit',
            isAtRisk: 'isAtRisk', segment: 'Segment', landingCostUnitPrice: 'Add on Unit Price',
        };

        const changes: Record<string, any> = {};
        Object.keys(editedOrder).forEach(key => {
            const typedKey = key as keyof Order;
            if (editedOrder[typedKey] !== order[typedKey]) {
                const header = headerMapping[typedKey];
                if (header) {
                     if (['ShipDate', 'dateIssuePI', 'eta', 'actualArrival'].includes(typedKey)) {
                        const dateValue = editedOrder[typedKey];
                        if (dateValue && typeof dateValue === 'string') {
                            const d = new Date(dateValue + 'T00:00:00Z');
                            changes[header] = `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
                        } else {
                            changes[header] = ''; // Clear date
                        }
                    } else {
                        changes[header] = editedOrder[typedKey];
                    }
                }
            }
        });

        if (Object.keys(changes).length > 0) {
            const payload = {
                sheetType: 'orders',
                identifier: { 'Sales Order Number': order.salesOrder, 'Product ID': order.mtm },
                updates: changes,
            };
            await updateSheetData(payload);
            onDataUpdate(); // This will also close the modal from Dashboard.tsx
        } else {
            // No changes, just exit edit mode
            setIsEditing(false);
        }
    } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedOrder({ ...order });
    setIsEditing(false);
    setSaveError(null);
  };

  const isNewModel = newModelMtms.has(order.mtm);
  const isDelayed = order.isDelayedProduction || order.isDelayedTransit;

  const defaultInputClass = "block w-full text-sm rounded-md border-gray-300 dark:border-dark-border-color shadow-sm focus:border-highlight focus:ring-highlight bg-primary-bg dark:bg-dark-primary-bg text-primary-text dark:text-dark-primary-text";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-60 z-40 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <ModalPanel className="w-full max-w-2xl">
              {/* Header */}
              <div className="flex justify-between items-start p-6 border-b border-border-color bg-gray-50 flex-shrink-0">
                  <div>
                      <h2 className="text-xl font-semibold text-primary-text">{isEditing ? 'Edit Order' : 'Order Details'}</h2>
                      <div className="flex items-center gap-x-2">
                          <p className="text-sm text-secondary-text font-mono">SO #{order.salesOrder} / {order.mtm}</p>
                          <button onClick={() => onPsrefLookup(order)} className="text-indigo-500 hover:text-indigo-700 transition-colors" title={`View product details on PSREF (new tab)`}>
                              <SparklesIcon className="h-4 w-4"/>
                          </button>
                      </div>
                  </div>
                  <div className="flex items-center space-x-2">
                       {isEditing ? (
                           <>
                              <button onClick={handleCancel} className="px-4 py-1.5 text-sm font-medium rounded-md border border-border-color bg-secondary-bg hover:bg-gray-100 transition-colors">Cancel</button>
                              <button onClick={handleSave} disabled={isSaving} className="px-4 py-1.5 text-sm font-medium rounded-md bg-highlight text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center">
                                   {isSaving && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                  {isSaving ? 'Saving...' : 'Save Changes'}
                              </button>
                           </>
                       ) : (
                           <>
                              <motion.button onClick={() => setIsEditing(true)} className="flex items-center px-3 py-1.5 bg-secondary-bg border border-border-color text-sm font-medium rounded-md hover:bg-gray-100"><PencilIcon className="h-4 w-4 mr-2"/> Edit</motion.button>
                              <motion.button onClick={onClose} className="p-1 rounded-full text-secondary-text hover:bg-highlight-hover hover:text-primary-text" aria-label="Close modal"><XMarkIcon className="h-6 w-6" /></motion.button>
                           </>
                       )}
                  </div>
              </div>
              
              {/* Body */}
              <div className="p-6 overflow-y-auto flex-grow min-h-0">
                  <AnimatePresence mode="wait">
                  {isEditing ? (
                      <motion.div key="edit-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                         {saveError && (
                              <div className="flex items-start bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
                                  <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                                  <span>{saveError}</span>
                              </div>
                          )}
                          <div className="space-y-4">
                              <EditableField label="Specification">
                                  <textarea name="specification" value={editedOrder.specification || ''} onChange={handleInputChange} rows={3} className={defaultInputClass} />
                              </EditableField>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                   <EditableField label="Shipping Quantity">
                                      <input type="number" name="qty" value={editedOrder.qty ?? ''} onChange={handleInputChange} className={defaultInputClass} />
                                  </EditableField>
                                  <EditableField label="FOB Unit Price">
                                      <input type="number" name="fobUnitPrice" value={editedOrder.fobUnitPrice ?? ''} onChange={handleInputChange} step="0.01" className={defaultInputClass} />
                                  </EditableField>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <EditableField label="Factory to SGP Status">
                                      <select name="factoryToSgp" value={editedOrder.factoryToSgp || ''} onChange={handleInputChange} className={defaultInputClass}>
                                          {filterOptions.factoryToSgps.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                      </select>
                                  </EditableField>
                                  <EditableField label="SGP to KH Status">
                                       <select name="status" value={editedOrder.status || ''} onChange={handleInputChange} className={defaultInputClass}>
                                          {filterOptions.statuses.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                      </select>
                                  </EditableField>
                              </div>
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                   <EditableField label="Scheduled Ship Date">
                                      <input type="date" name="ShipDate" value={editedOrder.ShipDate || ''} onChange={handleInputChange} className={defaultInputClass} />
                                  </EditableField>
                                   <EditableField label="ETA">
                                      <input type="date" name="eta" value={editedOrder.eta || ''} onChange={handleInputChange} className={defaultInputClass} />
                                  </EditableField>
                                   <EditableField label="Actual Arrival">
                                      <input type="date" name="actualArrival" value={editedOrder.actualArrival || ''} onChange={handleInputChange} className={defaultInputClass} />
                                  </EditableField>
                                   <EditableField label="Order Receipt Date">
                                      <input type="date" name="dateIssuePI" value={editedOrder.dateIssuePI || ''} onChange={handleInputChange} className={defaultInputClass} />
                                  </EditableField>
                              </div>
                               <EditableField label="Delivery Number">
                                  <input type="text" name="deliveryNumber" value={editedOrder.deliveryNumber || ''} onChange={handleInputChange} className={defaultInputClass} />
                              </EditableField>
                          </div>
                      </motion.div>
                  ) : (
                      <motion.div key="details-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                              <div className="space-y-6">
                                  <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-600 border-b border-border-color pb-2">Product Info</h3>
                                  <DetailItem icon={<TagIcon />} label="Model Name" value={order.modelName} />
                                  <DetailItem icon={<TagIcon />} label="MTM" value={<span className="flex items-center gap-x-2">{order.mtm}{isNewModel && <NewModelBadge />}</span>} />
                                  <DetailItem icon={<TagIcon />} label="Specification" value={<span className="text-xs whitespace-pre-wrap">{order.specification}</span>} />
                              </div>
                              <div className="space-y-6">
                                  <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-600 border-b border-border-color pb-2">Order Metrics</h3>
                                  <DetailItem icon={<CubeIcon />} label="Shipping Quantity" value={order.qty.toLocaleString()} />
                                  <DetailItem icon={<BanknotesIcon />} label="FOB Unit Price" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.fobUnitPrice)} />
                                  <DetailItem icon={<BanknotesIcon />} label="Order Value" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.orderValue)} />
                              </div>
                              <div className="sm:col-span-2 space-y-6 pt-4">
                                  <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-600 border-b border-border-color pb-2">Shipping & Dates</h3>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                                      <div className="space-y-6">
                                          <DetailItem icon={<TruckIcon />} label="Factory to SGP Status" value={order.factoryToSgp} />
                                          <DetailItem icon={<TruckIcon />} label="SGP to KH Status" value={order.status} />
                                      </div>
                                      <div className="space-y-6">
                                          <DetailItem icon={<CalendarDaysIcon />} label="Order Receipt Date" value={order.dateIssuePI} />
                                          <DetailItem icon={<CalendarDaysIcon />} label="Scheduled Ship Date" value={order.ShipDate} />
                                          <DetailItem icon={<CalendarDaysIcon />} label="ETA" value={order.eta} />
                                          <DetailItem icon={<CalendarDaysIcon />} label="Actual Arrival" value={order.actualArrival} />
                                          <DetailItem 
                                              icon={<TruckIcon />} 
                                              label="Delivery Number" 
                                              value={
                                                  order.deliveryNumber ? (
                                                      <div className="flex items-center gap-2">
                                                          <span className="font-mono">{order.deliveryNumber}</span>
                                                          <a 
                                                              href={`https://onlineservices.kuehne-nagel.com/public-tracking/?query=${order.deliveryNumber}`}
                                                              target="_blank" 
                                                              rel="noopener noreferrer"
                                                              onClick={(e) => e.stopPropagation()}
                                                              className="px-2 py-1 text-xs font-semibold text-white bg-highlight rounded-md hover:bg-indigo-700 transition-colors"
                                                          >
                                                              Track
                                                          </a>
                                                      </div>
                                                  ) : (
                                                      <span className="text-secondary-text">N/A</span>
                                                  )
                                              } 
                                          />
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </motion.div>
                  )}
                  </AnimatePresence>
              </div>
          </ModalPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OrderDetailsModal;