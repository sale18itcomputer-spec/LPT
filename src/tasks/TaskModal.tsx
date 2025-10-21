import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasks } from '../../contexts/TasksContext';
import { Task, TaskPriority, TaskStatus } from '../../types';
import Card from '../ui/Card';
import { XMarkIcon, CalendarDaysIcon, LinkIcon, PencilIcon } from '../ui/Icons';
import SegmentedControl from '../ui/SegmentedControl';

interface TaskModalProps {
    task: Task;
    isOpen: boolean;
    onClose: () => void;
}

const priorityOptions: { label: string, value: TaskPriority }[] = [
    { label: 'Low', value: 'Low' },
    { label: 'Medium', value: 'Medium' },
    { label: 'High', value: 'High' },
];

const statusOptions: { label: string, value: TaskStatus }[] = [
    { label: 'Planning', value: 'Planning' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Done', value: 'Done' },
    { label: 'Canceled', value: 'Canceled' },
    { label: 'Paused', value: 'Paused' },
    { label: 'Backlog', value: 'Backlog' },
];

const DetailItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <h4 className="text-sm font-medium text-secondary-text dark:text-dark-secondary-text">{label}</h4>
        <div className="mt-1">{children}</div>
    </div>
);

const TaskModal: React.FC<TaskModalProps> = ({ task, isOpen, onClose }) => {
    const { updateTask, deleteTask } = useTasks();
    const [isEditing, setIsEditing] = useState(false);
    
    // Form state
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [priority, setPriority] = useState<TaskPriority>(task.priority);
    const [status, setStatus] = useState<TaskStatus>(task.status);
    const [startDate, setStartDate] = useState(task.startDate || '');
    const [dueDate, setDueDate] = useState(task.dueDate || '');
    const [dependencies, setDependencies] = useState(task.dependencies?.join(', ') || '');
    const [progress, setProgress] = useState(task.progress || 0);
    
    const resetState = () => {
        setTitle(task.title);
        setDescription(task.description || '');
        setPriority(task.priority);
        setStatus(task.status);
        setStartDate(task.startDate || '');
        setDueDate(task.dueDate || '');
        setDependencies(task.dependencies?.join(', ') || '');
        setProgress(task.progress || 0);
    };

    useEffect(() => {
        if (isOpen && task) {
            resetState();
            setIsEditing(false); 
        }
    }, [isOpen, task]);

    const handleSave = () => {
        const updates: Partial<Omit<Task, 'id'>> = {};
        if (title.trim() && title.trim() !== task.title) updates.title = title.trim();
        if (description.trim() !== (task.description || '').trim()) updates.description = description.trim();
        if (priority !== task.priority) updates.priority = priority;
        if (status !== task.status) updates.status = status;
        if (startDate !== (task.startDate || '')) updates.startDate = startDate || null;
        if (dueDate !== (task.dueDate || '')) updates.dueDate = dueDate || null;
        if (progress !== (task.progress || 0)) updates.progress = progress;
        
        const depArray = dependencies.trim() ? dependencies.split(',').map(d => d.trim()) : null;
        if (JSON.stringify(depArray) !== JSON.stringify(task.dependencies || null)) {
            updates.dependencies = depArray;
        }

        if (Object.keys(updates).length > 0) {
            updateTask(task.id, updates);
        }
        setIsEditing(false);
    };
    
    const handleCancel = () => {
        resetState();
        setIsEditing(false);
    };

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            deleteTask(task.id);
            onClose();
        }
    };

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
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="w-full max-w-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Card className="p-0 max-h-[90vh] flex flex-col">
                             {/* Header */}
                            <div className="p-4 sm:p-6 flex-shrink-0 flex justify-between items-start border-b border-border-color dark:border-dark-border-color">
                                <h2 className="text-xl font-bold text-primary-text dark:text-dark-primary-text pr-4">{isEditing ? 'Editing Task' : task.title}</h2>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {isEditing ? (
                                        <>
                                            <button onClick={handleCancel} className="px-4 py-1.5 text-sm font-medium rounded-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg hover:bg-gray-100 dark:hover:bg-dark-primary-bg">Cancel</button>
                                            <button onClick={handleSave} className="px-4 py-1.5 text-sm font-medium rounded-md bg-highlight text-white hover:bg-indigo-700">Save Changes</button>
                                        </>
                                    ) : (
                                        <button onClick={() => setIsEditing(true)} className="flex items-center px-3 py-1.5 bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-dark-primary-bg"><PencilIcon className="h-4 w-4 mr-2"/> Edit</button>
                                    )}
                                    <button onClick={onClose} className="p-1.5 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-gray-100 dark:hover:bg-dark-primary-bg"><XMarkIcon className="h-5 w-5" /></button>
                                </div>
                            </div>

                             {/* Body */}
                            <div className="p-4 sm:p-6 flex-grow overflow-y-auto custom-scrollbar min-h-0">
                                <AnimatePresence mode="wait">
                                {isEditing ? (
                                    <motion.div key="edit-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="w-full text-xl font-bold bg-transparent border-0 focus:ring-0 p-0 text-primary-text dark:text-dark-primary-text -ml-1" />
                                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a more detailed description..." rows={3} className="w-full mt-2 text-sm bg-transparent border-0 focus:ring-0 p-0 text-secondary-text dark:text-dark-secondary-text resize-none -ml-1" />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-secondary-text dark:text-dark-secondary-text mb-2">Priority</label><SegmentedControl value={priority} onChange={(val) => setPriority(val as TaskPriority)} options={priorityOptions} label="Task Priority"/></div><div><label className="block text-sm font-medium text-secondary-text dark:text-dark-secondary-text mb-2">Status</label><SegmentedControl value={status} onChange={(val) => setStatus(val as TaskStatus)} options={statusOptions} label="Task Status"/></div></div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label htmlFor="task-start-date" className="block text-sm font-medium text-secondary-text dark:text-dark-secondary-text mb-2 flex items-center"><CalendarDaysIcon className="h-4 w-4 mr-2"/>Start Date</label><input type="date" id="task-start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-lg py-2 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm" /></div><div><label htmlFor="task-due-date" className="block text-sm font-medium text-secondary-text dark:text-dark-secondary-text mb-2 flex items-center"><CalendarDaysIcon className="h-4 w-4 mr-2"/>Due Date</label><input type="date" id="task-due-date" value={dueDate} onChange={e => setDueDate(e.target.value)} min={startDate} className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-lg py-2 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm" /></div></div>
                                        <div><label className="block text-sm font-medium text-secondary-text dark:text-dark-secondary-text mb-2">Progress: {progress}%</label><input type="range" min="0" max="100" value={progress} onChange={e => setProgress(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" /></div>
                                        <div><label htmlFor="task-dependencies" className="block text-sm font-medium text-secondary-text dark:text-dark-secondary-text mb-2 flex items-center"><LinkIcon className="h-4 w-4 mr-2"/>Dependencies</label><input id="task-dependencies" type="text" value={dependencies} onChange={(e) => setDependencies(e.target.value)} placeholder="e.g., TSK-101, TSK-105" className="block w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-lg py-2 px-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm" /><p className="text-xs text-secondary-text dark:text-dark-secondary-text mt-1 pl-1">Comma-separated task IDs.</p></div>
                                    </motion.div>
                                ) : (
                                    <motion.div key="details-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                                        <p className="text-sm text-secondary-text dark:text-dark-secondary-text whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                                            <DetailItem label="Status"><span className="text-base font-semibold text-primary-text dark:text-dark-primary-text">{task.status}</span></DetailItem>
                                            <DetailItem label="Priority"><span className="text-base font-semibold text-primary-text dark:text-dark-primary-text">{task.priority}</span></DetailItem>
                                            <DetailItem label="Start Date"><span className="text-base font-semibold text-primary-text dark:text-dark-primary-text">{task.startDate || 'Not set'}</span></DetailItem>
                                            <DetailItem label="Due Date"><span className="text-base font-semibold text-primary-text dark:text-dark-primary-text">{task.dueDate || 'Not set'}</span></DetailItem>
                                        </div>
                                         <DetailItem label="Progress">
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="w-full bg-gray-200/70 dark:bg-dark-border-color/50 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${task.progress === 100 ? 'bg-green-500' : 'bg-highlight'}`} style={{ width: `${task.progress || 0}%` }}></div></div>
                                                <span className="text-xs font-medium text-secondary-text dark:text-dark-secondary-text w-8 text-left">{task.progress || 0}%</span>
                                            </div>
                                        </DetailItem>
                                        <DetailItem label="Dependencies">
                                            {task.dependencies && task.dependencies.length > 0 ? (
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {task.dependencies.map(dep => (
                                                        <span key={dep} className="px-2.5 py-1 bg-gray-200 dark:bg-dark-secondary-bg text-gray-800 dark:text-dark-primary-text text-sm font-mono rounded-full">{dep}</span>
                                                    ))}
                                                </div>
                                            ) : <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1">None</p>}
                                        </DetailItem>
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </div>
                            
                            {/* Footer */}
                            {!isEditing && (
                                <div className="p-4 bg-gray-50 dark:bg-dark-secondary-bg/20 border-t border-border-color dark:border-dark-border-color flex justify-between items-center flex-shrink-0">
                                    <button onClick={handleDelete} className="px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">Delete Task</button>
                                </div>
                            )}
                        </Card>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TaskModal;