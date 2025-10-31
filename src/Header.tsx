import React, { useContext, useState, useEffect, useRef, useId, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowPathIcon,
    SunIcon,
    MoonIcon,
    UserIcon,
    ArrowRightOnRectangleIcon,
    ChevronDownIcon,
    ClipboardDocumentListIcon,
    UserCircleIcon,
} from './ui/Icons';
import type { ViewType } from '../types';
import { ThemeContext } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';


const NavButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`relative py-2.5 px-4 text-sm font-medium transition-colors duration-200 ${isActive ? 'text-primary-text dark:text-dark-primary-text' : 'text-secondary-text dark:text-dark-secondary-text hover:text-primary-text dark:hover:text-dark-primary-text'}`}
    >
        {label}
        {isActive && <motion.div layoutId="nav-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-highlight" />}
    </button>
);

const DropdownItem: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
    <li role="none">
        <button
          onClick={onClick}
          role="menuitem"
          className={`block w-full text-left px-4 py-2 text-sm transition-colors rounded-md ${isActive ? 'bg-highlight-hover text-highlight font-semibold' : 'text-primary-text dark:text-dark-primary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover'}`}
        >
          {label}
        </button>
    </li>
);

const UserMenuDropdownItem: React.FC<{
    label: string;
    onClick: () => void;
    icon: React.FC<any>;
    isActive?: boolean;
}> = ({ label, onClick, icon: Icon, isActive = false }) => (
    <li role="none">
        <button
            onClick={onClick}
            role="menuitem"
            className={`flex items-center gap-3 w-full text-left px-3 py-2 text-sm transition-colors rounded-md group ${
                isActive
                    ? 'bg-highlight-hover text-highlight font-semibold'
                    : 'text-primary-text dark:text-dark-primary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover'
            }`}
        >
            <Icon className={`h-5 w-5 text-secondary-text dark:text-dark-secondary-text transition-colors ${isActive ? 'text-highlight' : 'group-hover:text-primary-text dark:group-hover:text-dark-primary-text'}`} />
            <span className="flex-grow">{label}</span>
        </button>
    </li>
);


const NavDropdown: React.FC<{ label: string; children: React.ReactNode; isActive: boolean; dropdownWidthClass?: string }> = ({ label, children, isActive, dropdownWidthClass = 'w-64' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const prevIsOpen = useRef(isOpen);

    const buttonId = useId();
    const menuId = useId();

    // Effect for closing menu on outside click or Escape key
    useEffect(() => {
        const handleEvents = (event: MouseEvent | KeyboardEvent) => {
            if (!isOpen) return;
            
            if (event.type === 'keydown' && (event as KeyboardEvent).key === 'Escape') {
                event.preventDefault();
                setIsOpen(false);
                return;
            }

            if (event.type === 'mousedown' && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleEvents);
        document.addEventListener("keydown", handleEvents);
        
        return () => {
            document.removeEventListener("mousedown", handleEvents);
            document.removeEventListener("keydown", handleEvents);
        };
    }, [isOpen]);

    // Effect for returning focus to trigger button when menu closes
    useEffect(() => {
        if (prevIsOpen.current && !isOpen) {
            triggerRef.current?.focus();
        }
        prevIsOpen.current = isOpen;
    }, [isOpen]);
    
    return (
        <div 
            className="relative" 
            ref={dropdownRef}
        >
            <button
                ref={triggerRef}
                id={buttonId}
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-controls={menuId}
                onClick={() => setIsOpen(prev => !prev)}
                className={`relative py-2.5 px-4 text-sm font-medium flex items-center gap-1 transition-colors duration-200 ${isActive ? 'text-primary-text dark:text-dark-primary-text' : 'text-secondary-text dark:text-dark-secondary-text hover:text-primary-text dark:hover:text-dark-primary-text'}`}
            >
                <span>{label}</span>
                <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                {isActive && <motion.div layoutId="nav-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-highlight" />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        id={menuId}
                        role="menu"
                        aria-labelledby={buttonId}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className={`absolute top-full mt-2 ${dropdownWidthClass} bg-secondary-bg/80 dark:bg-dark-secondary-bg/70 backdrop-blur-lg rounded-xl shadow-lg border border-black/5 dark:border-white/10 z-40 origin-top-left p-2`}
                    >
                        {children}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};

interface HeaderProps {
  title: string;
  lastUpdated: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  activeView?: ViewType;
  setActiveView?: (view: ViewType) => void;
}

const Header: React.FC<HeaderProps> = ({ 
    title, lastUpdated, isRefreshing, onRefresh, 
    activeView, setActiveView
}) => {
  const themeContext = useContext(ThemeContext);
  const { user, logout } = useAuth();
  const userRole = user?.role || 'Admin';
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);

  if (!themeContext) {
    throw new Error('Header must be used within a ThemeProvider');
  }
  const { theme, toggleTheme } = themeContext;

  const userAvatarUrl = useMemo(() => {
    if (user) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4f46e5&color=fff&size=36&font-size=0.4&bold=true`;
    }
    return '';
  }, [user]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        isUserMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node) &&
        userMenuButtonRef.current &&
        !userMenuButtonRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isUserMenuOpen]);

  const analysisViews: ViewType[] = [
    'strategic', 'customers', 'promotions', 'backorders', 'profit-reconciliation', 'landed-cost-analysis', 'order-vs-sale', 'spec-breakdown'
  ];
  const managementViews: ViewType[] = [
    'inventory', 'shipments', 'price-list', 'rebates'
  ];
  const dataViews: ViewType[] = [
    'add-orders', 'serialization', 'rebate-validation', 'accessory-costs', 'data-transformer'
  ];

  const getIsActive = (views: ViewType[]) => activeView ? views.includes(activeView) : false;

  return (
    <header className="bg-secondary-bg/80 dark:bg-dark-secondary-bg/70 backdrop-blur-xl shadow-sm border-b border-black/5 dark:border-white/10">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <img src="https://i.postimg.cc/85tScvnw/Limperial-Technology-Logo01-png-004aad.png" alt="Logo" className="h-10 w-auto dark:logo-white" />
            <h1 className="ml-3 text-xl font-bold tracking-tight text-primary-text dark:text-dark-primary-text hidden sm:block">{title}</h1>
          </div>
          
          <div className="flex items-center gap-x-2 md:gap-x-4">
            <nav className="hidden md:flex items-center">
                {setActiveView && userRole === 'Admin' && (
                    <>
                        <NavButton label="Orders" isActive={activeView === 'orders'} onClick={() => setActiveView('orders')} />
                        <NavButton label="Sales" isActive={activeView === 'sales'} onClick={() => setActiveView('sales')} />
                        
                        <NavDropdown label="Analysis" isActive={getIsActive(analysisViews)} dropdownWidthClass="w-64">
                            <DropdownItem label="Strategic Sales" isActive={activeView === 'strategic'} onClick={() => setActiveView('strategic')} />
                            <DropdownItem label="Customer Intelligence" isActive={activeView === 'customers'} onClick={() => setActiveView('customers')} />
                            <DropdownItem label="Promotions Planner" isActive={activeView === 'promotions'} onClick={() => setActiveView('promotions')} />
                            <DropdownItem label="Backorder Analysis" isActive={activeView === 'backorders'} onClick={() => setActiveView('backorders')} />
                             <DropdownItem label="Profit Reconciliation" isActive={activeView === 'profit-reconciliation'} onClick={() => setActiveView('profit-reconciliation')} />
                            <DropdownItem label="Landed Cost Analysis" isActive={activeView === 'landed-cost-analysis'} onClick={() => setActiveView('landed-cost-analysis')} />
                             <DropdownItem label="Order vs. Sale" isActive={activeView === 'order-vs-sale'} onClick={() => setActiveView('order-vs-sale')} />
                             <DropdownItem label="Specification Breakdown" isActive={activeView === 'spec-breakdown'} onClick={() => setActiveView('spec-breakdown')} />
                        </NavDropdown>

                        <NavDropdown label="Management" isActive={getIsActive(managementViews)} dropdownWidthClass="w-56">
                            <DropdownItem label="Inventory" isActive={activeView === 'inventory'} onClick={() => setActiveView('inventory')} />
                            <DropdownItem label="Shipments" isActive={activeView === 'shipments'} onClick={() => setActiveView('shipments')} />
                            <DropdownItem label="Price List" isActive={activeView === 'price-list'} onClick={() => setActiveView('price-list')} />
                            <DropdownItem label="Rebate Programs" isActive={activeView === 'rebates'} onClick={() => setActiveView('rebates')} />
                        </NavDropdown>

                        <NavDropdown label="Data" isActive={getIsActive(dataViews)} dropdownWidthClass="w-64">
                            <DropdownItem label="Add Orders" isActive={activeView === 'add-orders'} onClick={() => setActiveView('add-orders')} />
                            <DropdownItem label="Serialization" isActive={activeView === 'serialization'} onClick={() => setActiveView('serialization')} />
                            <DropdownItem label="Rebate Validation" isActive={activeView === 'rebate-validation'} onClick={() => setActiveView('rebate-validation')} />
                             <DropdownItem label="Accessory Costs" isActive={activeView === 'accessory-costs'} onClick={() => setActiveView('accessory-costs')} />
                            <DropdownItem label="Data Transformer" isActive={activeView === 'data-transformer'} onClick={() => setActiveView('data-transformer')} />
                        </NavDropdown>
                    </>
                )}
                 {setActiveView && userRole === 'Marketing' && (
                    <>
                        <NavButton label="Promotions" isActive={activeView === 'promotions'} onClick={() => setActiveView('promotions')} />
                        <NavButton label="Inventory" isActive={activeView === 'inventory'} onClick={() => setActiveView('inventory')} />
                        <NavButton label="Shipments" isActive={activeView === 'shipments'} onClick={() => setActiveView('shipments')} />
                        <NavButton label="Price List" isActive={activeView === 'price-list'} onClick={() => setActiveView('price-list')} />
                    </>
                )}
            </nav>

             <div className="flex items-center gap-x-2">
                {setActiveView && (
                    <button
                        onClick={() => setActiveView('tasks')}
                        className={`p-2.5 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover transition-colors ${activeView === 'tasks' ? 'bg-highlight-hover dark:bg-dark-highlight-hover !text-highlight' : ''}`}
                        aria-label="My Tasks"
                        title="My Tasks"
                    >
                        <ClipboardDocumentListIcon className="h-5 w-5" />
                    </button>
                )}
                <button
                    onClick={onRefresh}
                    className="p-2.5 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover"
                    aria-label="Refresh data"
                    disabled={isRefreshing}
                >
                    <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={toggleTheme} className="p-2.5 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover" aria-label="Toggle theme">
                    {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
                </button>

                 <div className="relative">
                    <button ref={userMenuButtonRef} onClick={() => setIsUserMenuOpen(prev => !prev)} className="h-9 w-9 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover flex items-center justify-center">
                        {user ? (
                            <img src={userAvatarUrl} alt="User avatar" className="h-full w-full rounded-full object-cover" />
                        ) : (
                            <UserIcon className="h-5 w-5" />
                        )}
                    </button>
                    <AnimatePresence>
                        {isUserMenuOpen && (
                            <motion.div
                                ref={userMenuRef}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                className="absolute top-full mt-2 w-64 right-0 bg-secondary-bg/80 dark:bg-dark-secondary-bg/70 backdrop-blur-lg rounded-xl shadow-lg border border-black/5 dark:border-white/10 z-40 origin-top-right"
                            >
                                {user && (
                                    <div className="flex items-center gap-3 p-4">
                                        <img src={userAvatarUrl} alt="User avatar" className="h-9 w-9 rounded-full" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-primary-text dark:text-dark-primary-text truncate">{user.name}</p>
                                            <p className="text-xs text-secondary-text dark:text-dark-secondary-text truncate">{user.email}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="h-px bg-border-color dark:border-dark-border-color" />
                                <ul role="menu" className="p-2">
                                    <UserMenuDropdownItem 
                                        icon={UserCircleIcon}
                                        label="My Profile" 
                                        isActive={activeView === 'profile'} 
                                        onClick={() => { if(setActiveView) setActiveView('profile'); setIsUserMenuOpen(false); }}
                                    />
                                    <UserMenuDropdownItem
                                        icon={ArrowRightOnRectangleIcon}
                                        label="Logout"
                                        onClick={logout}
                                    />
                                </ul>
                            </motion.div>
                        )}
                    </AnimatePresence>
                 </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;