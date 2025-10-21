import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

const MotionDiv = motion.div as any;

const ModalPanel = React.forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(({ children, className, ...props }, ref) => {
    const baseClassName = "bg-secondary-bg dark:bg-dark-secondary-bg rounded-xl shadow-2xl flex flex-col max-h-[90vh] w-full";
    const combinedClassName = [baseClassName, className].filter(Boolean).join(' ');

    return (
        <MotionDiv
            ref={ref}
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={combinedClassName}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            {...props}
        >
            {children}
        </MotionDiv>
    );
});

ModalPanel.displayName = 'ModalPanel';

export default ModalPanel;
