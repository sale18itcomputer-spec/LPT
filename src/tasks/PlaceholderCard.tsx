import React from 'react';
import { motion } from 'framer-motion';

const PlaceholderCard: React.FC = () => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-24 w-full bg-gray-200/50 dark:bg-dark-secondary-bg/50 rounded-lg border-2 border-dashed border-gray-400 dark:border-gray-500"
        />
    );
};

export default PlaceholderCard;
