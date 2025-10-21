import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasks } from '../../contexts/TasksContext';
import type { Task, TaskPriority, TaskStatus } from '../../types';
import ModalPanel from '../ui/ModalPanel';
import { XMarkIcon } from '../ui/Icons';
import SegmentedControl from '../ui/SegmentedControl';

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date;
}

const priorityOptions: { label: string, value: TaskPriority }[] = [
    { label: 'Low', value: 'Low' },
    { label: 'Medium', value: 'Medium' },
    { label: 'High', value: 'High' },
];

const toYYYYMMDD = (d: Date): string => {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, selectedDate }) => {
    const { addTask } = useTasks();
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('Medium');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        } else {
            // Reset form when closed
            setTitle('');
            setPriority('Medium');
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);
    
    const handleSave = useCallback(() => {
        if (!title.trim() || isSaving) return;

        setIsSaving(true);
        const taskDetails: Omit<Task, 'id' | 'createdAt' | 'user_email' | 'assignees' | 'updatedAt' | 'completedAt'> & { assignees?: string } = {
            title: title.trim(),
            priority,
            dueDate: toYYYYMMDD(selectedDate),
            status: 'Planning', // default status
            icon: '🗓️',
        };
        
        addTask(taskDetails);

        setTimeout(() => {
            setIsSaving(false);
            onClose();
        }, 300); // give some time for UI feedback
    }, [addTask, isSaving, onClose, priority, title, selectedDate]);
    
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="w-full max-w-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ModalPanel>
                             <div className="p-4 sm:p-6 border-b border-border-color dark:border-dark-border-color">
                                 <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-xl font-semibold text-primary-text dark:text-dark-primary-text">Add Task for {toYYYYMMDD(selectedDate)}</h2>
                                    </div>
                                    <button onClick={onClose} className="p-1.5 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-gray-100 dark:hover:bg-dark-secondary-bg/50">
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                             <div className="p-4 sm:p-6 space-y-4">
                                 <div>
                                    <label htmlFor="task-title-promo" className="block text-sm font-medium text-secondary-text dark:text-dark-secondary-text mb-2">Task Title</label>
                                    <input
                                        id="task-title-promo" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Launch Khmer New Year campaign"
                                        className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-lg py-2 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
                                        autoFocus
                                    />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-secondary-text dark:text-dark-secondary-text mb-2">Priority</label>
                                    <SegmentedControl value={priority} onChange={(val) => setPriority(val as TaskPriority)} options={priorityOptions} label="Task Priority"/>
                                </div>
                            </div>
                             <div className="p-4 bg-gray-50 dark:bg-dark-secondary-bg/20 border-t border-border-color dark:border-dark-border-color flex justify-end gap-3">
                                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-lg border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg hover:bg-gray-100 dark:hover:bg-dark-primary-bg transition-colors">Cancel</button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || !title.trim()}
                                    className="px-6 py-2 text-sm font-semibold text-white bg-highlight rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-highlight disabled:opacity-50 flex items-center min-w-[108px] justify-center"
                                >
                                    {isSaving ? (
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : 'Add Task'}
                                </button>
                            </div>
                        </ModalPanel>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AddTaskModal;
