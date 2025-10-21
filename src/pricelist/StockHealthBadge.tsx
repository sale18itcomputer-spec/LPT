import React from 'react';
import { CubeIcon, ExclamationTriangleIcon, FireIcon, ShieldCheckIcon, QuestionMarkCircleIcon } from '../ui/Icons';

interface StockHealthBadgeProps {
    onHandQty: number;
    weeksOfInventory: number | null;
}

const StockHealthBadge: React.FC<StockHealthBadgeProps> = ({ onHandQty, weeksOfInventory }) => {
    let config: { label: string; icon: React.FC<any>; className: string };

    if (onHandQty < 0) {
        config = { label: 'Oversold', icon: ExclamationTriangleIcon, className: 'bg-red-100 text-red-800 border-red-200' };
    } else if (onHandQty === 0) {
        config = { label: 'Out of Stock', icon: CubeIcon, className: 'bg-gray-200 text-gray-800 border-gray-300' };
    } else if (weeksOfInventory === null) {
        config = { label: 'No Sales', icon: QuestionMarkCircleIcon, className: 'bg-blue-100 text-blue-800 border-blue-200' };
    } else if (weeksOfInventory < 4) {
        config = { label: 'Critical', icon: ExclamationTriangleIcon, className: 'bg-red-100 text-red-800 border-red-200' };
    } else if (weeksOfInventory <= 12) {
        config = { label: 'Low Stock', icon: FireIcon, className: 'bg-orange-100 text-orange-800 border-orange-200' };
    } else {
        config = { label: 'Healthy', icon: ShieldCheckIcon, className: 'bg-green-100 text-green-800 border-green-200' };
    }

    return (
        <span className={`inline-flex items-center gap-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.className}`}>
            <config.icon className="h-4 w-4" />
            {config.label}
        </span>
    );
};

export default StockHealthBadge;