import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTasks } from '../../contexts/TasksContext';
import { Task, TaskStatus } from '../../types';
import KanbanColumn from './KanbanColumn';
import AddTaskModal from './AddTaskModal';
import TaskModal from './TaskModal';
import TasksSkeleton from './TasksSkeleton';
import { useAuth } from '../../contexts/AuthContext';

const COLUMN_ORDER: TaskStatus[] = ['Planning', 'In Progress', 'Paused', 'Done', 'Canceled', 'Backlog'];

const TasksDashboard: React.FC<{ setSidebarActionsContent: (content: React.ReactNode | null) => void }> = ({ setSidebarActionsContent }) => {
    const { user } = useAuth();
    const { tasks, isLoading, updateTask, clearDoneTasks } = useTasks();
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [statusForNewTask, setStatusForNewTask] = useState<TaskStatus>('Planning');
    
    // Drag and Drop state
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);
    const [placeholderIndex, setPlaceholderIndex] = useState<number | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
    const [hiddenColumns, setHiddenColumns] = useState<Set<TaskStatus>>(new Set(['Canceled']));

    const tasksByStatus = useMemo(() => {
        const grouped: { [key in TaskStatus]?: Task[] } = {};
        COLUMN_ORDER.forEach(status => grouped[status] = []);
        tasks.forEach(task => {
            if (grouped[task.status]) {
                grouped[task.status]!.push(task);
            }
        });
        return grouped;
    }, [tasks]);

    useEffect(() => {
        setSidebarActionsContent(
            <div className="flex flex-col gap-2">
                <button
                    onClick={clearDoneTasks}
                    className="w-full px-3 py-2 text-sm font-medium text-secondary-text dark:text-dark-secondary-text bg-secondary-bg dark:bg-dark-primary-bg border border-border-color dark:border-dark-border-color rounded-md hover:bg-gray-100 dark:hover:bg-dark-secondary-bg"
                >
                    Clear 'Done' Tasks
                </button>
            </div>
        );
         return () => setSidebarActionsContent(null);
    }, [setSidebarActionsContent, clearDoneTasks]);

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setIsTaskModalOpen(true);
    };

    const handleAddClick = (status: TaskStatus) => {
        setStatusForNewTask(status);
        setIsAddTaskModalOpen(true);
    };
    
    const toggleColumnVisibility = (status: TaskStatus) => {
        setHiddenColumns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(status)) {
                newSet.delete(status);
            } else {
                newSet.add(status);
            }
            return newSet;
        });
    };

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, task: Task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
    };

    const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
        e.preventDefault();
        if (!draggedTask) return;
        setDragOverStatus(status);
        
        const columnTasks = tasksByStatus[status] || [];
        const dropTarget = e.currentTarget as HTMLElement;
        const taskCards = Array.from(dropTarget.querySelectorAll('[data-task-card="true"]'));
        
        let newIndex = columnTasks.length;

        for (let i = 0; i < taskCards.length; i++) {
            const card = taskCards[i] as HTMLElement;
            const { top, height } = card.getBoundingClientRect();
            if (e.clientY < top + height / 2) {
                newIndex = i;
                break;
            }
        }
        setPlaceholderIndex(newIndex);
    };

    const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
        e.preventDefault();
        if (draggedTask && draggedTask.status !== status) {
            updateTask(draggedTask.id, { status });
        }
        setDraggedTask(null);
        setPlaceholderIndex(null);
        setDragOverStatus(null);
    };
    
    const handleDragLeave = (e: React.DragEvent) => {
        const relatedTarget = e.relatedTarget as Node;
        const currentTarget = e.currentTarget as Node;
        if (!currentTarget.contains(relatedTarget)) {
             setPlaceholderIndex(null);
             setDragOverStatus(null);
        }
    };
    
    if (isLoading) {
        return <TasksSkeleton />;
    }

    const visibleColumns = COLUMN_ORDER.filter(s => !hiddenColumns.has(s));

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-dark-primary-bg">
             <header className="px-4 sm:px-6 lg:px-8 pt-4 pb-2 flex-shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-primary-text dark:text-dark-primary-text">My Tasks</h1>
                    <p className="text-sm text-secondary-text dark:text-dark-secondary-text">{user?.name || 'Current User'}</p>
                </div>
            </header>
            <div className="flex-grow min-h-0 flex gap-6 pb-4 overflow-x-auto h-full pt-2 px-4 sm:px-6 lg:px-8 kanban-column-container">
                {visibleColumns.map(status => (
                    <KanbanColumn
                        key={status}
                        status={status}
                        tasks={tasksByStatus[status] || []}
                        draggedTask={draggedTask}
                        placeholderIndex={dragOverStatus === status ? placeholderIndex : null}
                        isDraggingOver={dragOverStatus === status}
                        onTaskClick={handleTaskClick}
                        onAddClick={handleAddClick}
                        onHide={toggleColumnVisibility}
                        handleDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDragLeave={handleDragLeave}
                    />
                ))}
            </div>
            
            <AddTaskModal isOpen={isAddTaskModalOpen} onClose={() => setIsAddTaskModalOpen(false)} status={statusForNewTask} />
            {selectedTask && <TaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} task={selectedTask} />}
        </div>
    );
};

export default TasksDashboard;
