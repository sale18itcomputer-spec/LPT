import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import type { ViewType } from '../types';
import { 
    XMarkIcon, UserCircleIcon, ArrowRightOnRectangleIcon, SparklesIcon, BuildingStorefrontIcon, 
    BullseyeIcon, TruckIcon, BanknotesIcon, ClockIcon, CpuChipIcon, PlusCircleIcon, 
    ArrowsRightLeftIcon, ClipboardDocumentListIcon, TableCellsIcon, TrophyIcon, ShieldCheckIcon, CubeIcon, ScaleIcon
} from './ui/Icons';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const allMenuSections = [
  {
    title: 'Core',
    roles: ['Admin', 'Marketing'],
    items: [
      { view: 'orders' as ViewType, label: 'Orders', icon: TableCellsIcon, roles: ['Admin'] },
      { view: 'sales' as ViewType, label: 'Sales', icon: BanknotesIcon, roles: ['Admin'] },
      { view: 'tasks' as ViewType, label: 'My Tasks', icon: ClipboardDocumentListIcon, roles: ['Admin', 'Marketing'] },
    ],
  },
  {
    title: 'Analysis',
    roles: ['Admin', 'Marketing'],
    items: [
      { view: 'strategic' as ViewType, label: 'Strategic Sales', icon: SparklesIcon, roles: ['Admin'] },
      { view: 'customers' as ViewType, label: 'Customer Intelligence', icon: BuildingStorefrontIcon, roles: ['Admin'] },
      { view: 'promotions' as ViewType, label: 'Promotions Planner', icon: BullseyeIcon, roles: ['Admin', 'Marketing'] },
      { view: 'backorders' as ViewType, label: 'Backorder Analysis', icon: ClockIcon, roles: ['Admin'] },
      { view: 'profit-reconciliation' as ViewType, label: 'Profit Reconciliation', icon: ShieldCheckIcon, roles: ['Admin'] },
      { view: 'landed-cost-analysis' as ViewType, label: 'Landed Cost Analysis', icon: ScaleIcon, roles: ['Admin'] },
      { view: 'order-vs-sale' as ViewType, label: 'Order vs. Sale', icon: ArrowsRightLeftIcon, roles: ['Admin'] },
      { view: 'spec-breakdown' as ViewType, label: 'Spec Breakdown', icon: CpuChipIcon, roles: ['Admin'] },
    ],
  },
  {
    title: 'Management',
    roles: ['Admin', 'Marketing'],
    items: [
      { view: 'inventory' as ViewType, label: 'Inventory', icon: TruckIcon, roles: ['Admin', 'Marketing'] },
      { view: 'shipments' as ViewType, label: 'Shipments', icon: TruckIcon, roles: ['Admin'] },
      { view: 'price-list' as ViewType, label: 'Price List', icon: BanknotesIcon, roles: ['Admin', 'Marketing'] },
      { view: 'rebates' as ViewType, label: 'Rebate Programs', icon: TrophyIcon, roles: ['Admin'] },
    ],
  },
  {
    title: 'Data & Tools',
    roles: ['Admin'],
    items: [
      { view: 'add-orders' as ViewType, label: 'Add Orders', icon: PlusCircleIcon, roles: ['Admin'] },
      { view: 'serialization' as ViewType, label: 'Serialization', icon: CpuChipIcon, roles: ['Admin'] },
      { view: 'rebate-validation' as ViewType, label: 'Rebate Validation', icon: ShieldCheckIcon, roles: ['Admin'] },
      { view: 'accessory-costs' as ViewType, label: 'Accessory Costs', icon: CubeIcon, roles: ['Admin'] },
      { view: 'data-transformer' as ViewType, label: 'Data Transformer', icon: ArrowsRightLeftIcon, roles: ['Admin'] },
    ],
  },
];


const MenuItem: React.FC<{
    item: { view: ViewType; label: string; icon: React.FC<any>; };
    isActive: boolean;
    onClick: () => void;
}> = ({ item, isActive, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center text-left p-3 rounded-lg transition-colors text-lg font-medium ${isActive ? 'bg-highlight-hover text-highlight' : 'text-primary-text dark:text-dark-primary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover'}`}
    >
        <item.icon className={`h-6 w-6 mr-4 ${isActive ? 'text-highlight' : 'text-secondary-text dark:text-dark-secondary-text'}`} />
        <span>{item.label}</span>
    </button>
);

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, activeView, onNavigate }) => {
    const { user, logout } = useAuth();
    const userRole = user?.role || 'Admin';

    const menuSections = useMemo(() => {
        return allMenuSections
            .filter(section => section.roles.includes(userRole))
            .map(section => ({
                ...section,
                items: section.items.filter(item => item.roles.includes(userRole)),
            }))
            .filter(section => section.items.length > 0);
    }, [userRole]);
    
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 bg-black/50 z-50 md:hidden"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                        className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-primary-bg dark:bg-dark-primary-bg rounded-t-2xl flex flex-col"
                        onClick={e => e.stopPropagation()}
                        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                    >
                        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border-color dark:border-dark-border-color">
                            <h2 className="text-xl font-bold text-primary-text dark:text-dark-primary-text">Menu</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </header>

                        <div className="flex-grow overflow-y-auto p-4 min-h-0">
                            {user && (
                                <div className="flex items-center gap-4 p-3 mb-4 rounded-lg bg-gray-100 dark:bg-dark-secondary-bg/50">
                                    <UserCircleIcon className="h-12 w-12 text-secondary-text dark:text-dark-secondary-text" />
                                    <div>
                                        <p className="font-bold text-primary-text dark:text-dark-primary-text">{user.name}</p>
                                        <p className="text-sm text-secondary-text dark:text-dark-secondary-text">{user.email}</p>
                                    </div>
                                </div>
                            )}

                            <nav className="space-y-6">
                                {menuSections.map(section => (
                                    <div key={section.title}>
                                        <h3 className="px-3 text-sm font-semibold text-secondary-text dark:text-dark-secondary-text mb-2">{section.title}</h3>
                                        <div className="space-y-1">
                                            {section.items.map(item => (
                                                <MenuItem
                                                    key={item.view}
                                                    item={item}
                                                    isActive={activeView === item.view}
                                                    onClick={() => onNavigate(item.view)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </nav>
                        </div>
                        
                        <footer className="flex-shrink-0 p-4 border-t border-border-color dark:border-dark-border-color">
                            <button
                                onClick={() => {
                                    onNavigate('profile');
                                }}
                                className={`w-full flex items-center text-left p-3 rounded-lg transition-colors text-lg font-medium mb-2 ${activeView === 'profile' ? 'bg-highlight-hover text-highlight' : 'text-primary-text dark:text-dark-primary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover'}`}
                            >
                                <UserCircleIcon className={`h-6 w-6 mr-4 ${activeView === 'profile' ? 'text-highlight' : 'text-secondary-text dark:text-dark-secondary-text'}`} />
                                Profile
                            </button>
                            <button 
                                onClick={logout}
                                className="w-full flex items-center text-left p-3 rounded-lg text-lg font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <ArrowRightOnRectangleIcon className="h-6 w-6 mr-4" />
                                Logout
                            </button>
                        </footer>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MobileMenu;