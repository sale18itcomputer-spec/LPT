import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ModalPanel from './ModalPanel';
import { XMarkIcon, ArrowsPointingOutIcon } from './Icons';

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const ChartModal: React.FC<ChartModalProps> = ({ isOpen, onClose, title, children }) => {
  
  useEffect(() => {
    if (isOpen) {
        const originalBodyOverflow = document.body.style.overflow;
        const originalBodyPaddingRight = document.body.style.paddingRight;

        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        
        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        return () => {
            document.body.style.overflow = originalBodyOverflow;
            document.body.style.paddingRight = originalBodyPaddingRight;
        };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black bg-opacity-70 z-40 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <ModalPanel className="w-full max-w-4xl">
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b border-border-color dark:border-dark-border-color bg-gray-50 dark:bg-dark-secondary-bg flex-shrink-0">
                <h2 className="text-lg font-bold text-primary-text dark:text-dark-primary-text flex items-center">
                    <ArrowsPointingOutIcon className="h-5 w-5 mr-2" /> {title}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-1 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover hover:text-primary-text dark:hover:text-dark-primary-text"
                  aria-label="Close modal"
                >
                  <XMarkIcon className="h-6 w-6" />
                </motion.button>
              </div>
              
              {/* Body */}
              <div className="p-4 flex-grow relative overflow-y-auto min-h-0">
                  {/* Clone the chart component and pass inModal prop to make it fill the space */}
                  {React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<any>, { inModal: true }) : children}
              </div>
          </ModalPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChartModal;
