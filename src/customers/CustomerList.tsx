import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Customer, CustomerTier, LocalFiltersState } from '../../types';
import Card from '../ui/Card';
import KpiCard from '../ui/KpiCard';
import { UserGroupIcon, ChevronUpIcon, ChevronDownIcon, FireIcon, UserPlusIcon, UserMinusIcon } from '../ui/Icons';
import TierBadge from './TierBadge';
import CustomerValueMatrix from './CustomerValueMatrix';

type SortKey = keyof Omit<Customer, 'id' | 'sales'>;
type SortOrder = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortOrder;
}

const TableHeader: React.FC<{
  onSort: (key: SortKey) => void,
  sortConfig: SortConfig | null,
  sortKey: SortKey,
  children: React.ReactNode,
  className?: string,
}> = ({ onSort, sortConfig, sortKey, children, className = '' }) => {
  const isSorted = sortConfig?.key === sortKey;
  const thClassName = `px-4 py-3.5 text-left text-xs font-semibold text-secondary-text dark:text-dark-secondary-text uppercase tracking-wider select-none cursor-pointer group ${className}`;
  
  return (
    <th scope="col" className={thClassName} onClick={() => onSort(sortKey)} aria-sort={isSorted ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <div className="flex items-center">
        {children}
        <span className="w-4 h-4 ml-1.5">{isSorted ? (sortConfig.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />) : <ChevronUpIcon className="opacity-30 group-hover:opacity-100" />}</span>
      </div>
    </th>
  );
};

const CustomerStatusBadge: React.FC<{ customer: Customer }> = ({ customer }) => {
    if (customer.isNew) {
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">New</span>;
    }
    if (customer.isAtRisk) {
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">At Risk</span>;
    }
    return null;
}

interface CustomerListProps {
    customers: Customer[], 
    onSelectCustomer: (customer: Customer) => void
    userRole: string;
}

const CustomerList = React.forwardRef<HTMLDivElement, CustomerListProps>(({ customers, onSelectCustomer, userRole }, ref) => {
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'totalRevenue', direction: 'desc' });

    const kpiData = useMemo(() => {
        return {
            totalCustomers: customers.length,
            activeCustomers: customers.filter(c => !c.isAtRisk).length,
            newCustomers: customers.filter(c => c.isNew).length,
            atRiskCustomers: customers.filter(c => c.isAtRisk).length,
        };
    }, [customers]);

    const requestSort = (key: SortKey) => {
        let direction: SortOrder = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedCustomers = useMemo(() => {
        let sortedData = [...customers];
        if (sortConfig !== null) {
            const tierOrder: Record<CustomerTier, number> = { Platinum: 4, Gold: 3, Silver: 2, Bronze: 1 };
            sortedData.sort((a, b) => {
                if (sortConfig.key === 'tier') {
                    const aVal = a.tier ? tierOrder[a.tier] : 0;
                    const bVal = b.tier ? tierOrder[b.tier] : 0;
                     if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                     if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                     return 0;
                }
                const aVal = a[sortConfig.key as keyof Customer];
                const bVal = b[sortConfig.key as keyof Customer];

                if (aVal! < bVal!) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal! > bVal!) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortedData;
    }, [customers, sortConfig]);
    
    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    return (
        <div ref={ref} className="space-y-6">
            <motion.div>
                <h1 className="text-3xl font-bold tracking-tight text-primary-text dark:text-dark-primary-text">Customer Intelligence Center</h1>
                <p className="text-secondary-text dark:text-dark-secondary-text mt-1">Strategic overview of your customer base and their purchasing behavior.</p>
            </motion.div>
            
            <motion.div className="grid grid-cols-fluid gap-6">
                <KpiCard label="Total Customers" value={kpiData.totalCustomers} icon={<UserGroupIcon />} />
                <KpiCard label="Active Customers" value={kpiData.activeCustomers} icon={<FireIcon />} description="Purchased in last 180 days"/>
                <KpiCard label="New Customers" value={kpiData.newCustomers} icon={<UserPlusIcon />} description="First purchase in last 90 days"/>
                <KpiCard label="At-Risk Customers" value={kpiData.atRiskCustomers} icon={<UserMinusIcon />} description="No purchase in >180 days"/>
            </motion.div>
            
            <motion.div>
                <h2 className="text-2xl font-semibold tracking-tight text-primary-text dark:text-dark-primary-text">Customer Segmentation Matrix</h2>
                <p className="text-secondary-text dark:text-dark-secondary-text mt-1 mb-4">Strategic 2x2 grid segmenting customers by purchase frequency and total revenue.</p>
                <CustomerValueMatrix customers={customers} onSelectCustomer={onSelectCustomer} />
            </motion.div>

            <motion.div>
                <Card className="p-4 sm:p-6">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h3 className="text-lg font-semibold text-primary-text dark:text-dark-primary-text">All Customers</h3>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 dark:bg-dark-secondary-bg/20">
                                <tr>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="name">Customer Name</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="tier">Tier</TableHeader>
                                    {userRole === 'Admin' && (
                                        <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="totalRevenue" className="text-right">Total Revenue</TableHeader>
                                    )}
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="invoiceCount" className="text-center hidden md:table-cell">Invoices</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="daysSinceLastPurchase" className="text-center hidden md:table-cell">Days Since Last Purchase</TableHeader>
                                    <TableHeader onSort={requestSort} sortConfig={sortConfig} sortKey="isNew">Status</TableHeader>
                                </tr>
                            </thead>
                            <tbody className="bg-secondary-bg dark:bg-dark-secondary-bg">
                                {sortedCustomers.map(customer => (
                                    <tr key={customer.id} onClick={() => onSelectCustomer(customer)} className="border-b border-border-color dark:border-dark-border-color hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover cursor-pointer">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-highlight">{customer.name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm"><TierBadge tier={customer.tier} /></td>
                                        {userRole === 'Admin' && (
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-primary-text dark:text-dark-primary-text text-right font-semibold">{currencyFormatter(customer.totalRevenue)}</td>
                                        )}
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-text dark:text-dark-secondary-text text-center hidden md:table-cell">{customer.invoiceCount}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center hidden md:table-cell">
                                            <span className={`font-medium ${customer.daysSinceLastPurchase > 180 ? 'text-orange-600 dark:text-orange-400' : 'text-secondary-text dark:text-dark-secondary-text'}`}>
                                                {customer.daysSinceLastPurchase === Infinity ? 'N/A' : customer.daysSinceLastPurchase}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm"><CustomerStatusBadge customer={customer} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Mobile Card List */}
                    <div className="md:hidden space-y-4">
                        {sortedCustomers.map(customer => (
                            <Card key={customer.id} onClick={() => onSelectCustomer(customer)} className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-lg text-highlight">{customer.name}</p>
                                        <div className="mt-1"><TierBadge tier={customer.tier} /></div>
                                    </div>
                                    <CustomerStatusBadge customer={customer} />
                                </div>
                                <div className={`mt-4 grid ${userRole === 'Admin' ? 'grid-cols-2' : 'grid-cols-1'} gap-4 text-center border-t border-border-color pt-3`}>
                                    {userRole === 'Admin' && (
                                        <div>
                                            <p className="text-xs text-secondary-text">Total Revenue</p>
                                            <p className="font-bold text-primary-text">{currencyFormatter(customer.totalRevenue)}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs text-secondary-text">Last Purchase</p>
                                        <p className="font-bold text-primary-text">{customer.daysSinceLastPurchase === Infinity ? 'N/A' : `${customer.daysSinceLastPurchase}d ago`}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                </Card>
            </motion.div>
        </div>
    );
});

CustomerList.displayName = 'CustomerList';

export default CustomerList;