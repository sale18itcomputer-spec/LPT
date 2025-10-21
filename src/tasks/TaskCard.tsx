import React from 'react';
import { motion } from 'framer-motion';
import type { Task, TaskPriority } from '../../types';
import { ChatBubbleLeftRightIcon, GripVerticalIcon, CalendarDaysIcon, LinkIcon } from '../ui/Icons';

interface TaskCardProps {
    task: Task;
    isDragging: boolean;
    onClick: () => void;
    handleDragStart: (e: React.DragEvent, task: Task) => void;
}

const priorityConfig: Record<TaskPriority, { bar: string }> = {
    High: { bar: 'bg-red-500' },
    Medium: { bar: 'bg-orange-400' },
    Low: { bar: 'bg-blue-400' },
};

const TaskCard: React.FC<TaskCardProps> = ({ task, isDragging, onClick, handleDragStart }) => {
    const { title, progress, startDate, dueDate, priority, description, dependencies } = task;

    const formatDateRange = () => {
        if (!startDate && !dueDate) return null;

        const format = (dateStr: string) => {
            const date = new Date(dateStr); // Dates are already ISO strings
            return date.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
        };
        
        if (startDate && dueDate) {
            const start = new Date(startDate);
            const end = new Date(dueDate);
            const startMonth = start.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
            const endMonth = end.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });

            if (startMonth === endMonth) {
                return `${startMonth} ${start.getUTCDate()} → ${end.getUTCDate()}`;
            }
            return `${format(startDate)} → ${format(dueDate)}`;
        }
        if (dueDate) return `Due ${format(dueDate)}`;
        if (startDate) return `Starts ${format(startDate)}`;
        return null;
    };

    const onDragStart = (e: React.DragEvent) => {
        handleDragStart(e, task);
    };

    const priorityClasses = priorityConfig[priority] || priorityConfig.Medium;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isDragging ? {
                rotate: 1.5,
                scale: 0.98,
                opacity: 0.8,
                boxShadow: "0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)"
            } : {
                rotate: 0,
                scale: 1,
                opacity: 1,
                y: 0
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            draggable
            onDragStart={onDragStart as any}
            data-task-card="true"
            className="w-full bg-secondary-bg dark:bg-dark-secondary-bg rounded-lg border border-border-color dark:border-dark-border-color cursor-pointer active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-highlight focus-visible:outline-none overflow-hidden"
            style={{
                boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.05), 0px 1px 2px rgba(0, 0, 0, 0.05)"
            }}
            whileHover={!isDragging ? {
                y: -3,
                boxShadow: "0px 10px 15px -3px rgba(0, 0, 0, 0.07), 0px 4px 6px -2px rgba(0, 0, 0, 0.04)"
            } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={onClick}
        >
            <div className="flex items-start">
                <div className={`w-1.5 h-auto self-stretch flex-shrink-0 ${priorityClasses.bar}`} title={`Priority: ${priority}`}></div>
                <div className="flex-1 p-3">
                    <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-primary-text dark:text-dark-primary-text leading-tight pr-2">{title}</h3>
                        <GripVerticalIcon className="h-5 w-5 text-gray-300 dark:text-gray-600 flex-shrink-0 cursor-grab" />
                    </div>

                    {(progress !== undefined && progress !== null && progress > 0) && (
                        <div className="flex items-center gap-2 mt-3">
                            <span className="text-xs font-medium text-secondary-text dark:text-dark-secondary-text w-8 text-left">{progress}%</span>
                            <div className="w-full bg-gray-200/70 dark:bg-dark-border-color/50 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-highlight'}`} style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-3 text-xs text-secondary-text dark:text-dark-secondary-text">
                        <div className="flex items-center gap-x-3">
                            {description && (
                                <div className="flex items-center" title="This task has a description.">
                                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                </div>
                            )}
                            {dependencies && dependencies.length > 0 && (
                                <div className="flex items-center gap-1" title={`Dependencies: ${dependencies.join(', ')}`}>
                                    <LinkIcon className="h-4 w-4" />
                                    <span>{dependencies.length}</span>
                                </div>
                            )}
                        </div>
                         {formatDateRange() && (
                            <div className="flex items-center gap-1">
                                <CalendarDaysIcon className="h-4 w-4" />
                                <span>{formatDateRange()}</span>
                            </div>
                         )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default TaskCard;