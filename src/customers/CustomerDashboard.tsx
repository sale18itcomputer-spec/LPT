import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Customer, LocalFiltersState } from '../../types';
import CustomerList from './CustomerList';
import CustomerProfile from './CustomerProfile';
import { useData } from '../../contexts/DataContext';

const viewVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

interface CustomerDashboardProps {
    localFilters: LocalFiltersState;
    userRole: string;
}

const CustomerDashboard = React.forwardRef<HTMLDivElement, CustomerDashboardProps>(({ localFilters, userRole }, ref) => {
    const { customerData } = useData();
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [direction, setDirection] = useState(1);
    
    const handleSelectCustomer = (customer: Customer) => {
        setDirection(1);
        setSelectedCustomer(customer);
    };

    const handleBackToList = () => {
        setDirection(-1);
        setSelectedCustomer(null);
    };

    const filteredCustomers = useMemo(() => {
        const { customerSearchTerm, customerTier, customerStatus } = localFilters;
        return customerData.filter(c => {
            if(customerSearchTerm && !c.name.toLowerCase().includes(customerSearchTerm.toLowerCase())) return false;
            if(customerTier.length > 0 && (!c.tier || !customerTier.includes(c.tier))) return false;
            if(customerStatus !== 'all') {
                if(customerStatus === 'new' && !c.isNew) return false;
                if(customerStatus === 'atRisk' && !c.isAtRisk) return false;
                if(customerStatus === 'active' && c.isAtRisk) return false;
            }
            return true;
        });
    }, [customerData, localFilters]);

    return (
        <main ref={ref} className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
             <div className="relative overflow-hidden">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={selectedCustomer ? selectedCustomer.id : 'list'}
                        custom={direction}
                        variants={viewVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.2 }}
                        className="w-full"
                    >
                        {selectedCustomer ? (
                            <CustomerProfile customer={selectedCustomer} onBack={handleBackToList} userRole={userRole} />
                        ) : (
                            <CustomerList 
                                customers={filteredCustomers} 
                                onSelectCustomer={handleSelectCustomer}
                                userRole={userRole}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </main>
    );
});

CustomerDashboard.displayName = 'CustomerDashboard';

export default CustomerDashboard;