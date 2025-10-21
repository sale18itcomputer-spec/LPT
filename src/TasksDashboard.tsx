import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTasks } from '../../contexts/TasksContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Task, TaskStatus, LocalFiltersState, TaskPriority } from '../../types';
import TaskModal from './tasks/TaskModal';
import AddTaskModal from './tasks/AddTaskModal';
import KanbanColumn from './tasks/KanbanColumn';
import { 
    ExclamationTriangleIcon, 
    PlusIcon,
    CheckIcon
} from '../ui/Icons';
import TasksSkeleton from './tasks/TasksSkeleton';
import { columnHeaderConfig } from './taskConstants';

const isDueThisWeek = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    try {
        const dueDate = new Date(dateString + 'T00:00:00Z'); // Assume UTC to match input format
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Sunday as the start of the week (0)
        const dayOfWeek = today.getUTCDay();
        const startOfWeek = new Date(today);
        startOfWeek.setUTCDate(today.getUTCDate() - dayOfWeek);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
        endOfWeek.setUTCHours(23, 59, 59, 999);
        
        return dueDate >= startOfWeek && dueDate <= endOfWeek;
    } catch (e) {
        console.error("Error parsing due date:", e);
        return false;
    }
};


interface TasksDashboardProps {
  localFilters: LocalFiltersState;
  setSidebarActionsContent: (content: React.ReactNode | null) => void;
}

const TasksDashboard: React.FC<TasksDashboardProps> = ({ localFilters, setSidebarActionsContent }) => {
    const { user } = useAuth();
    const { tasks, updateTask, isLoading, error, clearDoneTasks } = useTasks();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [addTaskModal, setAddTaskModal] = useState<{ isOpen: boolean; status: TaskStatus | null }>({ isOpen: false, status: null });
    
    // Drag and Drop State
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
    const [placeholderIndex, setPlaceholderIndex] = useState<number | null>(null);
    
    const [visibleColumns, setVisibleColumns] = useState<TaskStatus[]>(['Planning', 'In Progress', 'Done']);

    const allStatuses: TaskStatus[] = ['Planning', 'In Progress', 'Done', 'Canceled', 'Paused', 'Backlog'];

    const filteredAndSortedTasks = useMemo(() => {
        let filtered = [...tasks];

        // FIX: Destructure taskQuickFilter directly as it's part of LocalFiltersState
        const { taskSearchTerm, taskStatus, taskSortBy, taskSortDir, taskQuickFilter } = localFilters;
        
        if (taskQuickFilter === 'dueThisWeek') {
            filtered = filtered.filter(task => isDueThisWeek(task.dueDate));
        } else {
            // Manual filters apply only when no quick filter is active
            filtered = filtered.filter(task => {
                if (taskSearchTerm && !task.title.toLowerCase().includes(taskSearchTerm.toLowerCase())) return false;
                if (taskStatus.length > 0 && !taskStatus.includes(task.status)) return false;
                return true;
            });
        }

        filtered.sort((a, b) => {
            let compare = 0;
            if (taskSortBy === 'priority') {
                const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
                compare = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            } else {
                const dateA = a[taskSortBy] ? new Date(a[taskSortBy] as string).getTime() : 0;
                const dateB = b[taskSortBy] ? new Date(b[taskSortBy] as string).getTime() : 0;
                if (isNaN(dateA) && isNaN(dateB)) compare = 0;
                else if (isNaN(dateA)) compare = 1;
                else if (isNaN(dateB)) compare = -1;
                else compare = dateA - dateB;
            }
            return taskSortDir === 'asc' ? compare : -compare;
        });

        return filtered;
    }, [tasks, localFilters]);

    const tasksByStatus = useMemo(() => {
        const grouped = allStatuses.reduce((acc, status) => {
            acc[status] = [];
            return acc;
        }, {} as Record<TaskStatus, Task[]>);

        filteredAndSortedTasks.forEach(task => { 
            if (grouped[task.status]) {
                grouped[task.status].push(task); 
            }
        });
        return grouped;
    }, [filteredAndSortedTasks, allStatuses]);

    // Handlers
    const handleOpenAddTaskModal = useCallback((status: TaskStatus) => setAddTaskModal({ isOpen: true, status }), []);
    const handleCloseAddTaskModal = useCallback(() => setAddTaskModal({ isOpen: false, status: null }), []);
    
    useEffect(() => {
        const sidebarContent = (
             <div className="flex flex-col gap-y-6 text-sm">
                <button onClick={() => handleOpenAddTaskModal('Planning')} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                    <PlusIcon className="h-4 w-4" /> New Task
                </button>
                
                <div className="border-t border-border-color dark:border-dark-border-color" />
                
                 <div>
                    <h4 className="px-2 mb-2 font-semibold text-xs text-secondary-text uppercase tracking-wider">Columns</h4>
                     <div className="space-y-1">
                        {allStatuses.map(status => {
                            const config = columnHeaderConfig[status];
                            return (
                                <label key={status} className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-secondary-bg/30 cursor-pointer">
                                    <input type="checkbox" checked={visibleColumns.includes(status)} onChange={() => setVisibleColumns(p => p.includes(status) ? p.filter(s => s !== status) : [...p, status])} className="h-4 w-4 rounded border-gray-300 text-highlight focus:ring-highlight" />
                                    <div className="ml-3 flex items-center gap-2">
                                        <span className={`h-2 w-2 rounded-full ${config.color}`}></span>
                                        <span className="text-primary-text">{status}</span>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>
                {tasksByStatus.Done.length > 0 && (
                    <>
                        <div className="border-t border-border-color dark:border-dark-border-color" />
                        <button onClick={clearDoneTasks} className="w-full text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500">
                            Clear {tasksByStatus.Done.length} Done Task(s)
                        </button>
                    </>
                )}
            </div>
        );
        setSidebarActionsContent(sidebarContent);
        return () => {
            setSidebarActionsContent(null);
        };
    }, [setSidebarActionsContent, visibleColumns, handleOpenAddTaskModal, allStatuses, tasksByStatus.Done, clearDoneTasks]);


    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, task: Task) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('taskId', task.id);
        setDraggedTask(task);
    };

    const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
        e.preventDefault();
        if (!draggedTask) return;
        
        setDragOverStatus(status);
        
        const columnContent = (e.currentTarget as HTMLElement).querySelector('.kanban-column-content');
        if (!columnContent) return;
        
        const cards = Array.from(columnContent.querySelectorAll('[data-task-card="true"]')) as HTMLElement[];
        const mouseY = e.clientY;
        
        let newIndex = cards.length;
        for (let i = 0; i < cards.length; i++) {
            const rect = cards[i].getBoundingClientRect();
            if (mouseY < rect.top + rect.height / 2) {
                newIndex = i;
                break;
            }
        }
        
        if (draggedTask.status !== status || newIndex !== tasksByStatus[status].indexOf(draggedTask)) {
             setPlaceholderIndex(newIndex);
        } else {
             setPlaceholderIndex(null);
        }
    };

    const handleDragLeave = () => {
        setDragOverStatus(null);
        setPlaceholderIndex(null);
    };

    const handleDrop = (e: React.DragEvent, newStatus: TaskStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId && draggedTask && draggedTask.status !== newStatus) {
            updateTask(taskId, { status: newStatus });
        }
        handleDragEnd();
    };

    const handleDragEnd = () => {
        setDraggedTask(null);
        setDragOverStatus(null);
        setPlaceholderIndex(null);
    };

    if (isLoading) return <TasksSkeleton />;
    if (error) return <div className="h-full flex items-center justify-center p-4"><div className="flex items-start bg-red-50 text-red-700 p-4 rounded-lg"><ExclamationTriangleIcon className="h-6 w-6 mr-3" /><p>{error}</p></div></div>;

    return (
        <>
            <main onDragEnd={handleDragEnd} className="h-full flex flex-col">
                <div className="flex-grow min-h-0 flex gap-6 pb-4 overflow-x-auto kanban-column-container h-full pt-2 px-4 sm:px-6 lg:px-8">
                    {visibleColumns.map(status => (
                        <KanbanColumn
                            key={status} status={status} tasks={tasksByStatus[status]}
                            draggedTask={draggedTask} 
                            placeholderIndex={dragOverStatus === status ? placeholderIndex : null}
                            onTaskClick={setSelectedTask} onAddClick={handleOpenAddTaskModal} onHide={(s) => setVisibleColumns(p => p.filter(c => c !== s))}
                            handleDragStart={handleDragStart}
                            onDragOver={handleDragOver} 
                            onDrop={handleDrop} 
                            onDragLeave={handleDragLeave}
                            isDraggingOver={dragOverStatus === status}
                        />
                    ))}
                </div>
            </main>

            <AnimatePresence>
                {selectedTask && (
                    <TaskModal
                        key={selectedTask.id}
                        task={selectedTask}
                        isOpen={!!selectedTask}
                        onClose={() => setSelectedTask(null)}
                    />
                )}
                 {addTaskModal.isOpen && (
                    <AddTaskModal
                        key="add-task-modal"
                        isOpen={addTaskModal.isOpen}
                        onClose={handleCloseAddTaskModal}
                        status={addTaskModal.status!}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default TasksDashboard;