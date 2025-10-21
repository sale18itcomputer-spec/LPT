import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import type { Task, TaskStatus } from '../types';
import { useAuth } from './AuthContext';
import { getTasksData, appendSheetData, updateSheetData, deleteSheetData } from '../services/googleScriptService';
import { TASKS_SHEET_NAME } from '../constants';
import { getCachedData, setCachedData } from '../utils/db';
import { useToast } from './ToastContext';

interface TasksContextType {
    tasks: Task[];
    addTask: (taskDetails: Omit<Task, 'id' | 'createdAt' | 'user_email' | 'updatedAt' | 'completedAt'>) => void;
    updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>>) => void;
    deleteTask: (id: string) => void;
    clearDoneTasks: () => void;
    error: string | null;
    isLoading: boolean;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchTasks = async () => {
            if (!user) {
                setAllTasks([]);
                setIsLoading(false);
                return;
            }

            setError(null);
            let hasRenderedInitialData = false;

            // Phase 1: Try to get data on screen ASAP from cache.
            try {
                const cachedTasks = await getCachedData('tasks-data');
                if (cachedTasks && cachedTasks.length > 0) {
                    setAllTasks(cachedTasks);
                    setIsLoading(false); // We have data, so loading is done for now.
                    hasRenderedInitialData = true;
                }
            } catch (cacheError) {
                console.warn("Failed to load tasks from cache:", cacheError);
                // Don't set error, just proceed to network fetch.
            }
            
            // If we have not rendered data yet, isLoading remains true from its initial state.

            // Phase 2: Fetch fresh data from network.
            try {
                const freshTasks = await getTasksData();
                setAllTasks(freshTasks);
                await setCachedData('tasks-data', freshTasks);
            } catch (networkError) {
                const errorMessage = networkError instanceof Error ? networkError.message : 'Failed to load tasks.';
                console.error("Failed to fetch tasks from network:", errorMessage);
                if (!hasRenderedInitialData) {
                    // Only show a blocking error if we couldn't show anything.
                    setError(errorMessage);
                } else {
                    // Show a non-blocking toast if we are showing stale data.
                    showToast('Could not fetch latest tasks. Displaying cached data.', 'info');
                }
            } finally {
                // Always ensure loading is false after the whole process.
                setIsLoading(false);
            }
        };

        fetchTasks();
    }, [user, showToast]);


    const userTasks = useMemo(() => {
        if (!user) {
            return [];
        }
        // Filter tasks to only show those assigned to the current user.
        return allTasks.filter(task => task.user_email === user.email);
    }, [allTasks, user]);

    const addTask = useCallback(async (taskDetails: Omit<Task, 'id' | 'createdAt' | 'user_email' | 'updatedAt' | 'completedAt'>) => {
        if (!taskDetails.title.trim() || !user) return;
        
        const now = new Date().toISOString();
        const newTask: Task = {
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
            completedAt: null,
            user_email: user.email,
            title: taskDetails.title,
            description: taskDetails.description,
            status: taskDetails.status,
            priority: taskDetails.priority,
            startDate: taskDetails.startDate,
            dueDate: taskDetails.dueDate,
            dependencies: taskDetails.dependencies,
            icon: taskDetails.icon || '📄',
            progress: taskDetails.progress,
        };
        
        const newTasksState = [...allTasks, newTask];
        setAllTasks(newTasksState);

        try {
            const dataToAppend = {
                'unique_id': newTask.id,
                'title': newTask.title,
                'description': newTask.description || '',
                'status': newTask.status,
                'priority': newTask.priority,
                'createdAt': newTask.createdAt,
                'timestamp': newTask.updatedAt,
                'completedAt': '',
                'user_email': newTask.user_email,
                'Start Date': newTask.startDate || '',
                'Due Date': newTask.dueDate || '',
                'Dependencies': newTask.dependencies ? newTask.dependencies.join(', ') : '',
                'Icon': newTask.icon,
                '# Progress': newTask.progress || 0,
            };
            await appendSheetData({ sheetType: TASKS_SHEET_NAME, data: [dataToAppend] });
            await setCachedData('tasks-data', newTasksState);
            showToast('Task added successfully!', 'success');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            console.error("Failed to add task, reverting.", err);
            showToast(`Failed to sync new task: ${errorMessage}`, 'error');
            setAllTasks(prev => prev.filter(t => t.id !== newTask.id));
        }
    }, [user, showToast, allTasks]);

    const updateTask = useCallback(async (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>>) => {
        const originalTasks = allTasks;
        const originalTask = originalTasks.find(t => t.id === id);
        if (!originalTask) return;

        const now = new Date().toISOString();

        const updatedTask: Task = {
            ...originalTask,
            ...updates,
            updatedAt: now,
            completedAt: originalTask.completedAt,
        };

        if (updates.status && updates.status !== originalTask.status) {
            if (updates.status === 'Done') updatedTask.completedAt = now;
            else if (originalTask.status === 'Done') updatedTask.completedAt = null;
        }
        
        const newTasksState = originalTasks.map(t => t.id === id ? updatedTask : t);
        setAllTasks(newTasksState);

        try {
            const keyMap: Record<string, string> = {
                startDate: 'Start Date', dueDate: 'Due Date', dependencies: 'Dependencies', progress: '# Progress', completedAt: 'completedAt'
            };
            const sheetUpdates: Record<string, any> = { timestamp: updatedTask.updatedAt };
            if (updatedTask.completedAt !== originalTask.completedAt) { (updates as any).completedAt = updatedTask.completedAt; }

            for (const key in updates) {
                const sheetKey = keyMap[key] || key;
                let value = (updates as any)[key];
                if (key === 'dependencies' && Array.isArray(value)) value = value.join(', ');
                else if (value === null) value = '';
                sheetUpdates[sheetKey] = value;
            }
            
            await updateSheetData({ sheetType: TASKS_SHEET_NAME, identifier: { unique_id: id }, updates: sheetUpdates });
            await setCachedData('tasks-data', newTasksState);
            showToast('Task updated!', 'success');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            console.error("Failed to update task, reverting.", err);
            showToast(`Failed to sync update: ${errorMessage}`, 'error');
            setAllTasks(originalTasks);
        }
    }, [allTasks, showToast]);
    
    const deleteTask = useCallback(async (id: string) => {
        const originalTasks = allTasks;
        const taskToDelete = originalTasks.find(t => t.id === id);
        if (!taskToDelete) return;
        
        const newTasksState = originalTasks.filter(t => t.id !== id);
        setAllTasks(newTasksState);

        try {
            await deleteSheetData({ sheetType: TASKS_SHEET_NAME, identifier: { unique_id: id } });
            await setCachedData('tasks-data', newTasksState);
            showToast('Task deleted successfully.', 'success');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            console.error("Failed to delete task, reverting.", err);
            showToast(`Failed to sync deletion: ${errorMessage}`, 'error');
            setAllTasks(originalTasks);
        }
    }, [showToast, allTasks]);
    
    const clearDoneTasks = useCallback(async () => {
        if (!user) return;
        
        const originalTasks = allTasks;
        const tasksToDelete = originalTasks.filter(task => task.status === 'Done');
        if (tasksToDelete.length === 0) return;

        const idsToDelete = new Set(tasksToDelete.map(t => t.id));
        const newTasksState = originalTasks.filter(task => !idsToDelete.has(task.id));
        
        setAllTasks(newTasksState);
        
        try {
            const results = await Promise.allSettled(
                tasksToDelete.map(task => deleteSheetData({ sheetType: TASKS_SHEET_NAME, identifier: { unique_id: task.id } }))
            );

            const failedDeletes = results.filter(r => r.status === 'rejected');
            
            if (failedDeletes.length > 0) {
                console.error(`Failed to delete ${failedDeletes.length} tasks. Reverting.`);
                showToast(`Failed to clear ${failedDeletes.length} completed task(s).`, 'error');
                setAllTasks(originalTasks);
            } else {
                await setCachedData('tasks-data', newTasksState);
                showToast(`${tasksToDelete.length} task(s) cleared.`, 'success');
            }
        } catch (err) {
            console.error("Unexpected error during clearDoneTasks, reverting.", err);
            showToast('An unexpected error occurred while clearing tasks.', 'error');
            setAllTasks(originalTasks);
        }
    }, [user, allTasks, showToast]);

    const value = { tasks: userTasks, addTask, updateTask, deleteTask, clearDoneTasks, error, isLoading };

    return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
};

export const useTasks = (): TasksContextType => {
    const context = useContext(TasksContext);
    if (context === undefined) {
        throw new Error('useTasks must be used within a TasksProvider');
    }
    return context;
};