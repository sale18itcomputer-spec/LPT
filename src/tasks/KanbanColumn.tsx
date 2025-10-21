import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Task, TaskStatus } from '../../types';
import TaskCard from './TaskCard';
import PlaceholderCard from './PlaceholderCard';
import { PlusIcon, XCircleIcon } from '../ui/Icons';
import { columnHeaderConfig } from './taskConstants';

interface KanbanColumnProps {
    status: TaskStatus;
    tasks: Task[];
    draggedTask: Task | null;
    placeholderIndex: number | null;
    onTaskClick: (task: Task) => void;
    onAddClick: (status: TaskStatus) => void;
    onHide: (status: TaskStatus) => void;
    handleDragStart: (e: React.DragEvent, task: Task) => void;
    onDragOver: (e: React.DragEvent, status: TaskStatus) => void;
    onDrop: (e: React.DragEvent, status: TaskStatus) => void;
    onDragLeave: (e: React.DragEvent) => void;
    isDraggingOver: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, tasks, draggedTask, placeholderIndex, onTaskClick, onAddClick, onHide, handleDragStart, onDragOver, onDrop, onDragLeave, isDraggingOver }) => {
    const config = columnHeaderConfig[status];

    return (
        <div 
            onDragOver={(e) => onDragOver(e, status)}
            onDrop={(e) => onDrop(e, status)}
            onDragLeave={onDragLeave}
            className={`w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col transition-colors duration-300 ease-in-out bg-gray-100/50 dark:bg-dark-secondary-bg/20 rounded-xl ${isDraggingOver ? 'bg-blue-100/50 dark:bg-blue-900/10' : ''}`}
        >
            <div className="p-3 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                     <span className={`h-2.5 w-2.5 rounded-full ${config.color}`}></span>
                     <h3 className="font-semibold text-primary-text dark:text-dark-primary-text">{status}</h3>
                     <span className="text-sm font-medium text-secondary-text dark:text-dark-secondary-text">{tasks.length}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => onHide(status)} className="p-1 rounded text-secondary-text dark:text-dark-secondary-text hover:bg-gray-200 dark:hover:bg-dark-secondary-bg/50" title="Hide column">
                        <XCircleIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => onAddClick(status)} className="p-1 rounded text-secondary-text dark:text-dark-secondary-text hover:bg-gray-200 dark:hover:bg-dark-secondary-bg/50">
                        <PlusIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
            <div className="flex-grow min-h-0 overflow-y-auto p-2 kanban-column-content flex flex-col gap-3">
                <AnimatePresence>
                    {tasks.map((task, index) => (
                       <React.Fragment key={task.id}>
                            {isDraggingOver && placeholderIndex === index && <PlaceholderCard />}
                            <TaskCard task={task} isDragging={draggedTask?.id === task.id} onClick={() => onTaskClick(task)} handleDragStart={handleDragStart} />
                       </React.Fragment>
                    ))}
                    {isDraggingOver && placeholderIndex === tasks.length && <PlaceholderCard />}
                </AnimatePresence>
            </div>
            <div className="p-2 flex-shrink-0">
                <button
                    onClick={() => onAddClick(status)}
                    className="w-full flex items-center justify-center gap-1 p-2 text-sm text-secondary-text dark:text-dark-secondary-text hover:bg-gray-200/60 dark:hover:bg-dark-secondary-bg/60 rounded-lg transition-colors"
                >
                    <PlusIcon className="h-4 w-4"/>
                    New
                </button>
            </div>
        </div>
    );
};

export default KanbanColumn;
