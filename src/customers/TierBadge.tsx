import React from 'react';
import type { CustomerTier } from '../../types';
import { SparklesIcon, CheckBadgeIcon } from '../ui/Icons';

interface TierBadgeProps {
  tier?: CustomerTier;
}

const tierConfig: Record<CustomerTier, { label: string; icon: React.FC<any>; className: string }> = {
  Platinum: {
    label: 'Platinum',
    icon: SparklesIcon,
    className: 'bg-gradient-to-r from-indigo-200 to-purple-200 text-purple-900 border-purple-300',
  },
  Gold: {
    label: 'Gold',
    icon: SparklesIcon,
    className: 'bg-gradient-to-r from-amber-100 to-yellow-200 text-amber-900 border-amber-300',
  },
  Silver: {
    label: 'Silver',
    icon: CheckBadgeIcon,
    className: 'bg-slate-200 text-slate-800 border-slate-300',
  },
  Bronze: {
    label: 'Bronze',
    icon: CheckBadgeIcon,
    className: 'bg-orange-200 text-orange-900 border-orange-300',
  },
};

const TierBadge: React.FC<TierBadgeProps> = ({ tier }) => {
  if (!tier) {
    return null;
  }

  const config = tierConfig[tier];
  const IconComponent = config.icon;

  return (
    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${config.className}`}>
      <IconComponent className="h-3.5 w-3.5 mr-1.5" />
      {config.label}
    </div>
  );
};

export default TierBadge;
