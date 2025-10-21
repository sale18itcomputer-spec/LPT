import React from 'react';
import { motion } from 'framer-motion';
import { ArrowPathIcon, ExclamationTriangleIcon } from './Icons';

interface UpdateBannerProps {
    type: 'info' | 'warning';
    message: string;
    actionText?: string;
    onAction: () => void;
}

const bannerConfig = {
    info: {
        bg: 'bg-blue-600',
        text: 'text-white',
        icon: ArrowPathIcon,
    },
    warning: {
        bg: 'bg-yellow-400',
        text: 'text-yellow-900',
        icon: ExclamationTriangleIcon,
    },
};

const UpdateBanner: React.FC<UpdateBannerProps> = ({ type, message, actionText, onAction }) => {
    const config = bannerConfig[type];
    const Icon = config.icon;

    if (type === 'info') {
        return (
            <motion.button
                layout
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                onClick={onAction}
                className={`w-full flex items-center justify-center gap-x-3 px-4 py-3 text-sm font-semibold rounded-lg shadow-md ${config.bg} ${config.text}`}
                role="alert"
            >
                <Icon className="h-5 w-5" />
                {message}
            </motion.button>
        );
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-lg shadow-md ${config.bg} ${config.text}`}
            role="alert"
        >
            <div className="flex items-center gap-x-2">
                <Icon className="h-5 w-5" />
                <span>{message}</span>
            </div>
            <button
                onClick={onAction}
                className="px-4 py-1.5 bg-black/80 text-white text-xs font-bold rounded-md hover:bg-black transition-colors"
            >
                {actionText || 'Refresh'}
            </button>
        </motion.div>
    );
};

export default UpdateBanner;