import React from 'react';
import { useTasks } from '../../contexts/TasksContext';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../ui/Card';
import { Task, TaskPriority, ViewType, LocalFiltersState } from '../../types';
import { ArrowLongRightIcon, ClipboardDocumentListIcon } from '../ui/Icons';
import { Spinner } from '../ui/Spinner';

const priorityConfig: Record<TaskPriority, { text: string; className: string }> = {
    High: { text: 'High', className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' },
    Medium: { text: 'Med', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' },
    Low: { text: 'Low', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' },
};

const TaskItem: React.FC<{ task: Task }> = ({ task }) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().toDateString());
    const dueDateText = task.dueDate 
        ? new Date(task.dueDate + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
        : 'No due date';

    return (
        <li className="flex items-center justify-between py-3">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary-text dark:text-dark-primary-text truncate">{task.title}</p>
                <p className={`text-xs ${isOverdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-secondary-text dark:text-dark-secondary-text'}`}>{dueDateText}</p>
            </div>
            <div className="ml-2 flex-shrink-0">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${priorityConfig[task.priority].className}`}>
                    {priorityConfig[task.priority].text}
                </span>
            </div>
        </li>
    );
};

interface MyTasksWidgetProps {
    onNavigateAndFilter: (view: ViewType, filters?: Partial<LocalFiltersState>) => void;
}

const MyTasksWidget: React.FC<MyTasksWidgetProps> = ({ onNavigateAndFilter }) => {
    const { user } = useAuth();
    const { tasks, isLoading } = useTasks();

    const myTasks = React.useMemo(() => {
        if (!user) return [];
        
        const priorityOrder: Record<TaskPriority, number> = { High: 3, Medium: 2, Low: 1 };
        
        return tasks
            .filter(task => 
                task.user_email === user.email &&
                task.status !== 'Done' && 
                task.status !== 'Canceled'
            )
            .sort((a, b) => {
                // Sort by priority first (desc)
                const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
                if (priorityDiff !== 0) return priorityDiff;

                // Then by due date (asc, nulls last)
                const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                return dateA - dateB;
            })
            .slice(0, 4);
    }, [tasks, user]);

    return (
        <Card className="h-full flex flex-col">
            <div className="p-4 sm:p-5 border-b border-border-color dark:border-dark-border-color">
                <h3 className="text-base font-semibold text-primary-text dark:text-dark-primary-text">My Priority Tasks</h3>
            </div>
            <div className="flex-grow p-4 sm:p-5 min-h-0">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Spinner size="md" />
                    </div>
                ) : myTasks.length > 0 ? (
                    <ul className="divide-y divide-border-color dark:divide-dark-border-color">
                        {myTasks.map(task => <TaskItem key={task.id} task={task} />)}
                    </ul>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-secondary-text dark:text-dark-secondary-text">
                        <ClipboardDocumentListIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                        <p className="mt-2 text-sm font-medium">No pressing tasks assigned to you.</p>
                        <p className="text-xs">Enjoy the peace!</p>
                    </div>
                )}
            </div>
            <div className="flex-shrink-0 p-3 bg-gray-50/70 dark:bg-dark-secondary-bg/20 border-t border-border-color dark:border-dark-border-color">
                <button 
                    onClick={() => onNavigateAndFilter('tasks')}
                    className="w-full text-sm font-semibold text-highlight hover:text-indigo-700 dark:hover:text-indigo-400 flex items-center justify-center gap-1"
                >
                    <span>View All My Tasks</span>
                    <ArrowLongRightIcon className="h-4 w-4" />
                </button>
            </div>
        </Card>
    );
};

export default MyTasksWidget;
