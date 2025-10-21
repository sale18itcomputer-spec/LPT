import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from './Icons';
import { useToast } from '../../contexts/ToastContext';

const toastIcons = {
  success: <CheckCircleIcon className="h-6 w-6 text-green-500" />,
  error: <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />,
  info: <ExclamationTriangleIcon className="h-6 w-6 text-blue-500" />,
};

const Toast: React.FC = () => {
  const { messages, removeToast } = useToast();

  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 flex flex-col items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-[9999]"
    >
      <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.3 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              className="max-w-md w-full bg-secondary-bg dark:bg-dark-secondary-bg shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 border border-border-color dark:border-dark-border-color"
            >
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">{toastIcons[message.type]}</div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-primary-text dark:text-dark-primary-text">
                      {message.type === 'success' ? 'Success' : 'Error'}
                    </p>
                    <p className="mt-1 text-sm text-secondary-text dark:text-dark-secondary-text">{message.message}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex">
                    <button
                      onClick={() => removeToast(message.id)}
                      className="inline-flex text-secondary-text dark:text-dark-secondary-text rounded-md hover:text-primary-text dark:hover:text-dark-primary-text focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-highlight"
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Toast;
