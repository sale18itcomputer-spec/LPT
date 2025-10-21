

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ViewType } from '../types';
import { TableCellsIcon, TruckIcon, BuildingStorefrontIcon, Cog8ToothIcon, BanknotesIcon, ClipboardDocumentListIcon, BullseyeIcon, CubeIcon } from './ui/Icons';
import { useAuth } from '../contexts/AuthContext';

interface BottomNavBarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  onMenuClick: () => void;
}

const NavItem: React.FC<{
    item: { view: ViewType | 'menu'; label: string; icon: React.FC<any>; };
    isActive: boolean;
    onClick: () => void;
}> = ({ item, isActive, onClick }) => {
    const { label, icon: Icon } = item;
    return (
        <button
            onClick={onClick}
            className={`relative flex-1 flex flex-col items-center justify-center pt-2 pb-1 gap-1 text-xs font-medium transition-colors duration-200 focus:outline-none ${
                isActive ? 'text-highlight' : 'text-secondary-text hover:text-primary-text'
            }`}
            aria-current={isActive ? 'page' : undefined}
        >
            <Icon className="h-6 w-6" />
            <span className="mt-1">{label}</span>
            {isActive && (
                <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute bottom-0 h-0.5 w-8 bg-highlight rounded-full"
                />
            )}
        </button>
    );
};

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeView, setActiveView, onMenuClick }) => {
  const { user } = useAuth();
  const userRole = user?.role || 'Admin';

  const navItems = useMemo(() => {
    if (userRole === 'Marketing') {
        return [
            { view: 'promotions' as ViewType, label: 'Promotions', icon: BullseyeIcon },
            { view: 'inventory' as ViewType, label: 'Inventory', icon: CubeIcon },
            { view: 'shipments' as ViewType, label: 'Shipments', icon: TruckIcon },
            { view: 'menu' as const, label: 'Menu', icon: Cog8ToothIcon },
        ];
    }
    // Default for Admin
    return [
        { view: 'orders' as ViewType, label: 'Orders', icon: TableCellsIcon },
        { view: 'sales' as ViewType, label: 'Sales', icon: BanknotesIcon },
        { view: 'inventory' as ViewType, label: 'Inventory', icon: TruckIcon },
        { view: 'menu' as const, label: 'Menu', icon: Cog8ToothIcon },
    ];
  }, [userRole]);

  const menuViews: ViewType[] = [
    'strategic', 'promotions', 'backorders', 'profile', 
    'add-orders', 'data-transformer', 'price-list', 'serialization', 'customers',
    'rebates', 'rebate-validation', 'shipments', 'profit-reconciliation', 'accessory-costs', 'landed-cost-analysis', 'tasks'
  ];

  return (
    <nav className="h-16 bg-secondary-bg/80 dark:bg-dark-secondary-bg/80 backdrop-blur-lg border-t border-border-color dark:border-dark-border-color shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around items-stretch h-full">
        {navItems.map((item) => {
           const isActive = item.view === 'menu'
            ? menuViews.includes(activeView)
            : activeView === item.view;

          const handleClick = item.view === 'menu'
            ? onMenuClick
            : () => setActiveView(item.view);
            
          return (
             <NavItem
                key={item.view}
                item={item}
                isActive={isActive}
                onClick={handleClick}
            />
          )
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;