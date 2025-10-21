

import React from 'react';
import type { PromotionPlan } from '../../types';
import {
    TagIcon,
    BanknotesIcon,
    ShieldCheckIcon,
    CubeIcon,
    UserGroupIcon,
    ChatBubbleLeftRightIcon,
    CalendarDaysIcon,
    LightBulbIcon,
    CpuChipIcon,
    BuildingStorefrontIcon,
    ClipboardDocumentListIcon
} from '../ui/Icons';

const DetailItem: React.FC<{ icon: React.FC<any>, label: string, value: string | number | undefined, className?: string }> = ({ icon: Icon, label, value, className = '' }) => (
    <div className={`flex items-start ${className}`}>
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-highlight-hover dark:bg-dark-highlight-hover rounded-lg">
            <Icon className="h-5 w-5 text-highlight" />
        </div>
        <div className="ml-3">
            <dt className="text-sm font-medium text-secondary-text dark:text-dark-secondary-text">{label}</dt>
            <dd className="mt-0.5 text-base font-semibold text-primary-text dark:text-dark-primary-text whitespace-pre-wrap">{value}</dd>
        </div>
    </div>
);


interface PromotionPlanDetailProps {
    plan: PromotionPlan;
    userRole: string;
}

const PromotionPlanDetail: React.FC<PromotionPlanDetailProps> = ({ plan, userRole }) => {
    const currencyFormatter = (val: number | undefined) => {
        if (val === undefined) return 'N/A';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    return (
        <div className="bg-slate-50/70 dark:bg-dark-primary-bg p-4 sm:p-6 border-t-2 border-highlight">
             <div className="mb-4">
                <DetailItem icon={TagIcon} label="Activity plan" value={plan['Activity plan']} />
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                
                {userRole === 'Admin' && <DetailItem icon={BanknotesIcon} label="Original Price (User Price)" value={currencyFormatter(plan['User Price'])} />}
                {userRole === 'Admin' && <DetailItem icon={BanknotesIcon} label="New Suggested SRP" value={currencyFormatter(plan['New SRP'])} />}
                <DetailItem icon={ShieldCheckIcon} label="Warranty" value={plan['Warranty']} />

                <DetailItem icon={BuildingStorefrontIcon} label="Brand Segment" value={plan['Brand']} />
                <DetailItem icon={ClipboardDocumentListIcon} label="Campaign Type" value={plan['Type']} />
                <DetailItem icon={CubeIcon} label="Stock Status" value={plan['Status']} />

                <DetailItem icon={LightBulbIcon} label="Purpose / Slogan" value={plan['Purpose']} className="md:col-span-3" />
                
                <DetailItem icon={UserGroupIcon} label="Target Audience" value={plan['Target Audience']} />
                <DetailItem icon={ChatBubbleLeftRightIcon} label="Key Remark" value={plan['Remark']} />
                <DetailItem icon={CalendarDaysIcon} label="Deadline" value={plan['Deadline']} />

                <DetailItem icon={LightBulbIcon} label="Marketing Note" value={plan['Note - Marketing']} className="md:col-span-3" />
                <DetailItem icon={CpuChipIcon} label="Support Assets" value={plan['Support']} className="md:col-span-3" />
            </dl>
        </div>
    );
};

export default PromotionPlanDetail;