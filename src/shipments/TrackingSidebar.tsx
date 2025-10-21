

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, TruckIcon } from '../ui/Icons';

interface TrackingSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    shipmentNumber: string | null;
}

const TrackingSidebar: React.FC<TrackingSidebarProps> = ({ isOpen, onClose, shipmentNumber }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 bg-black/60 z-40"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                        className="absolute top-0 right-0 h-full w-full max-w-2xl bg-secondary-bg dark:bg-dark-secondary-bg shadow-2xl flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border-color dark:border-dark-border-color">
                            <div className="flex items-center gap-3">
                                <TruckIcon className="h-6 w-6 text-highlight" />
                                <div>
                                    <h2 className="text-lg font-bold text-primary-text dark:text-dark-primary-text">Shipment Details</h2>
                                    <p className="text-xs font-mono text-secondary-text dark:text-dark-secondary-text">{shipmentNumber}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-secondary-bg/50">
                                <XMarkIcon className="h-6 w-6 text-secondary-text dark:text-dark-secondary-text" />
                            </button>
                        </header>

                        <div className="flex-grow overflow-hidden">
                            {shipmentNumber && (
                                <iframe
                                    src={`https://mykn.kuehne-nagel.com/public-tracking/shipments?query=${shipmentNumber}`}
                                    title={`Kuehne+Nagel Tracking for ${shipmentNumber}`}
                                    className="w-full h-full border-0"
                                />
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TrackingSidebar;