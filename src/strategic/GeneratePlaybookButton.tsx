import React from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon } from '../ui/Icons';
import type { SalesOpportunity } from '../../types';

interface GeneratePlaybookButtonProps {
    opportunity: SalesOpportunity | SalesOpportunity[];
    onClick: (opportunity: SalesOpportunity | SalesOpportunity[]) => void;
    isBulk?: boolean;
}

const GeneratePlaybookButton: React.FC<GeneratePlaybookButtonProps> = ({ opportunity, onClick, isBulk = false }) => {
    const buttonText = isBulk ? 'Bulk Playbook' : 'AI Playbook';

    return (
        <motion.button
            onClick={(e) => {
                e.stopPropagation(); // Prevent row click event
                onClick(opportunity);
            }}
            className="flex items-center justify-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md transition-colors"
            title={`Generate an AI Sales Playbook`}
        >
            <SparklesIcon className="h-4 w-4 mr-1.5" />
            {buttonText}
        </motion.button>
    );
};

export default GeneratePlaybookButton;
