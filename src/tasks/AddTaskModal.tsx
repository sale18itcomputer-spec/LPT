

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasks } from '../../contexts/TasksContext';
import type { Task, TaskPriority, TaskStatus } from '../../types';
import Card from '../ui/Card';
import { XMarkIcon, CalendarDaysIcon, LinkIcon } from '../ui/Icons';
import SegmentedControl from '../ui/SegmentedControl';

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    status: TaskStatus;
}

const priorityOptions: { label: string, value: TaskPriority }[] = [
    { label: 'Low', value: 'Low' },
    { label: 'Medium', value: 'Medium' },
    { label: 'High', value: 'High' },
];

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, status }) => {
    const { addTask } = useTasks();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('Medium');
    const [startDate, setStartDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [dependencies, setDependencies] = useState('');
    const [progress, setProgress] = useState(0);
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
            setDescription('');
            setPriority('Medium');
            setStartDate('');
            setDueDate('');
            setDependencies('');
            setProgress(0);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);
    
    const handleSave = useCallback(() => {
        if (!title.trim() || isSaving) return;

        setIsSaving(true);
        const taskDetails: Omit<Task, 'id' | 'createdAt' | 'user_email' | 'updatedAt' | 'completedAt'> = {
            title: title.trim(),
            description: description.trim() || undefined,
            status,
            priority,
            startDate: startDate || null,
            dueDate: dueDate || null,
            dependencies: dependencies.trim() ? dependencies.split(',').map(d => d.trim()) : null,
            icon: '📄',
            progress: progress,
        };
        
        addTask(taskDetails);

        setTimeout(() => {
            setIsSaving(false);
            onClose();
        }, 300);
    }, [addTask, isSaving, onClose, priority, status, title, description, startDate, dueDate, dependencies, progress]);


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
                        className="w-full max-w-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Card className="p-0 max-h-[90vh] flex flex-col">
                            <div className="p-4 sm:p-6 border-b border-border-color dark:border-dark-border-color flex-shrink-0">
                                 <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-xl font-semibold text-primary-text dark:text-dark-primary-text">Add New Task</h2>
                                        <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1">in <span className="font-medium">{status}</span></p>
                                    </div>
                                    <button onClick={onClose} className="p-1.5 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-gray-100 dark:hover:bg-dark-secondary-bg/50">
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 sm:p-6 flex-grow overflow-y-auto custom-scrollbar space-y-5 min-h-0">
                                 <div>
                                    <label htmlFor="task-title" className="block text-sm font-medium text-secondary-text dark:text-dark-secondary-text mb-2">Task Title</label>
                                    <input
                                        id="task-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Finalize Q4 campaign assets"
                                        className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-lg py-2 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label htmlFor="task-description" className="block text-sm font-medium text-secondary-text dark:text-dark-secondary-text mb-2">Description (Optional)</label>
                                    <textarea
                                        id="task-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add more details about the task..."
                                        className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-lg py-2 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-text dark:text-dark-secondary-text mb-2">Priority</label>
                                    <SegmentedControl value={priority} onChange={(val) => setPriority(val as TaskPriority)} options={priorityOptions} label="Task Priority"/>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="task-start-date" className="block text-sm font-medium text-secondary-text dark:text-dark-secondary-text mb-2 flex items-center"><CalendarDaysIcon className="h-4 w-4 mr-2"/>Start Date</label>
                                        <input type="date" id="task-start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-lg py-2 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm" />
                                    </div>
                                    <div>
                                        <label htmlFor="task-due-date" className="block text-sm font-medium text-secondary-text dark:text-dark-secondary-text mb-2 flex items-center"><CalendarDaysIcon className="h-4 w-4 mr-2"/>Due Date</label>
                                        <input type="date" id="task-due-date" value={dueDate} onChange={e => setDueDate(e.target.value)} min={startDate} className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-lg py-2 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm" />
                                    </div>
                                </div>
                                <div><label className="block text-sm font-medium text-secondary-text dark:text-dark-secondary-text mb-2">Progress: {progress}%</label><input type="range" min="0" max="100" value={progress} onChange={e => setProgress(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" /></div>
                                <div>
                                    <label htmlFor="task-dependencies" className="block text-sm font-medium text-secondary-text dark:text-dark-secondary-text mb-2 flex items-center"><LinkIcon className="h-4 w-4 mr-2"/>Dependencies (Optional)</label>
                                    <input id="task-dependencies" type="text" value={dependencies} onChange={(e) => setDependencies(e.target.value)}
                                        placeholder="e.g., TSK-101, TSK-105"
                                        className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-lg py-2 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm"
                                    />
                                    <p className="text-xs text-secondary-text dark:text-dark-secondary-text mt-1 pl-1">Comma-separated task IDs.</p>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-dark-secondary-bg/20 border-t border-border-color dark:border-dark-border-color flex justify-end gap-3 flex-shrink-0">
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
                                    ) : 'Save Task'}
                                </button>
                            </div>
                        </Card>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AddTaskModal;
