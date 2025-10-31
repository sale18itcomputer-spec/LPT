
import React from 'react';
import { motion, type Variants } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

interface KpiCardProps {
    label: string;
    value: number;
    icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
    formatter?: (val: number) => string;
    description?: React.ReactNode;
    colorClass?: { bg: string; text: string };
    onClick?: () => void;
    isActive?: boolean;
}

const KpiCard = React.forwardRef<HTMLDivElement, KpiCardProps>(({ label, value, icon, formatter, description, colorClass, onClick, isActive }, ref) => {
    const defaultColorClass = { bg: 'bg-highlight-hover dark:bg-dark-highlight-hover', text: 'text-highlight' };
    const colors = colorClass || defaultColorClass;

    return (
      <motion.div ref={ref} onClick={onClick} variants={itemVariants} className="h-full">
        <div className={`relative p-5 rounded-2xl transition-all duration-300 h-full flex flex-col justify-center ${onClick ? 'cursor-pointer' : ''} ${isActive ? 'ring-2 ring-highlight shadow-lg' : 'shadow-md hover:shadow-xl hover:-translate-y-1.5'} bg-secondary-bg dark:bg-dark-secondary-bg`}>
            <div className="flex items-center justify-between">
                <div className="flex-grow">
                    <p className="text-sm font-medium text-secondary-text dark:text-dark-secondary-text">{label}</p>
                    <div className="mt-1 text-3xl font-extrabold tracking-tight text-primary-text dark:text-dark-primary-text">
                        <AnimatedCounter to={value || 0} formatter={formatter} />
                    </div>
                    {description && (
                        <p className="mt-1.5 text-sm text-secondary-text dark:text-dark-secondary-text">{description}</p>
                    )}
                </div>
                <div className={`flex-shrink-0 p-4 rounded-xl ml-4 ${colors.bg}`}>
                    {React.cloneElement(icon, { className: `h-7 w-7 ${colors.text}` })}
                </div>
            </div>
        </div>
      </motion.div>
    );
});
KpiCard.displayName = 'KpiCard';
export default KpiCard;