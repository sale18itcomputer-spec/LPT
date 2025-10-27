import React, { useMemo, useCallback } from 'react';
import { useTasks } from '../../contexts/TasksContext';
import { useAuth } from '../../contexts/AuthContext';
import type { LocalFiltersState, TaskStatus, TaskSortOption, TaskSortDirection } from '../../types';
import { MagnifyingGlassIcon, CheckIcon } from '../ui/Icons';

interface TasksFiltersProps {
  localFilters: LocalFiltersState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>;
}

const TasksFilters: React.FC<TasksFiltersProps> = ({ localFilters, setLocalFilters }) => {
    const { user } = useAuth();
    const { tasks } = useTasks();

    const allStatuses: TaskStatus[] = ['Planning', 'In Progress', 'Done', 'Canceled', 'Paused', 'Backlog'];

    const handleFilterChange = useCallback(<K extends keyof LocalFiltersState>(key: K, value: LocalFiltersState[K]) => {
        setLocalFilters(prev => {
            if (JSON.stringify(prev[key]) === JSON.stringify(value)) return prev;
            return { ...prev, [key]: value };
        });
    }, [setLocalFilters]);
    
    const handleSortChange = useCallback((value: string) => {
        const [by, dir] = value.split('_');
        setLocalFilters(prev => {
            if (prev.taskSortBy === by && prev.taskSortDir === dir) return prev;
            return { ...prev, taskSortBy: by as TaskSortOption, taskSortDir: dir as TaskSortDirection };
        });
    }, [setLocalFilters]);


    return (
        <>
            <div className={`space-y-4 transition-opacity`}>
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-text dark:text-dark-secondary-text" />
                    <input type="text" placeholder="Search tasks..." value={localFilters.taskSearchTerm} onChange={e => handleFilterChange('taskSearchTerm', e.target.value)} className="w-full bg-secondary-bg dark:bg-dark-primary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 pl-9 pr-3 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm" />
                </div>
                
                <div>
                    <h4 className="px-2 mb-2 font-semibold text-xs text-secondary-text dark:text-dark-secondary-text uppercase tracking-wider">Status</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                        {allStatuses.map(s => <label key={s} className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-secondary-bg/30 cursor-pointer"><input type="checkbox" checked={localFilters.taskStatus.includes(s)} onChange={() => handleFilterChange('taskStatus', localFilters.taskStatus.includes(s) ? localFilters.taskStatus.filter(st => st !== s) : [...localFilters.taskStatus, s])} className="h-4 w-4 rounded border-gray-300 text-highlight focus:ring-highlight" /> <span className="ml-3 text-primary-text dark:text-dark-primary-text">{s}</span></label>)}
                    </div>
                </div>
            </div>

            <div className="border-t border-border-color dark:border-dark-border-color" />

            <div>
                <label htmlFor="task-sort" className="px-2 mb-2 font-semibold text-xs text-secondary-text dark:text-dark-secondary-text uppercase tracking-wider block">Sort</label>
                <select id="task-sort" value={`${localFilters.taskSortBy}_${localFilters.taskSortDir}`} onChange={e => handleSortChange(e.target.value)} className="w-full bg-secondary-bg dark:bg-dark-secondary-bg border border-border-color dark:border-dark-border-color rounded-md py-1.5 px-3 text-primary-text dark:text-dark-primary-text focus:outline-none focus:ring-2 focus:ring-highlight sm:text-sm">
                    <option value="priority_desc">Priority (High-Low)</option>
                    <option value="dueDate_asc">Due Date (Soonest)</option>
                    <option value="createdAt_desc">Creation Date (Newest)</option>
                    <option value="createdAt_asc">Creation Date (Oldest)</option>
                </select>
            </div>
        </>
    );
};

export default TasksFilters;