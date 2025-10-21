import React from 'react';
import Skeleton from '../ui/Skeleton';

const SkeletonTaskCard = () => (
    <div className="p-3 bg-secondary-bg dark:bg-dark-secondary-bg rounded-lg border border-border-color dark:border-dark-border-color space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-5" />
            </div>
            <Skeleton className="h-5 w-16" />
        </div>
    </div>
);

const SkeletonKanbanColumn = () => (
    <div className="w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col bg-gray-100/50 dark:bg-dark-secondary-bg/20 rounded-xl">
        <div className="p-3 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-1">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-6 w-6" />
            </div>
        </div>
        <div className="flex-grow min-h-0 overflow-y-auto p-2 space-y-2">
            <SkeletonTaskCard />
            <Skeleton className="h-24 w-full rounded-lg" />
            <SkeletonTaskCard />
        </div>
        <div className="p-2 flex-shrink-0">
            <Skeleton className="h-9 w-full" />
        </div>
    </div>
);

const TasksSkeleton: React.FC = () => {
    return (
        <div className="h-full flex flex-col">
            {/* Header skeleton */}
            <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-2 flex-shrink-0 flex items-center justify-end">
                <Skeleton className="h-10 w-40 rounded-lg" />
            </div>
            {/* Kanban board skeleton */}
            <div className="flex-grow min-h-0 flex gap-6 pb-4 overflow-x-auto h-full pt-2 px-4 sm:px-6 lg:px-8">
                <SkeletonKanbanColumn />
                <SkeletonKanbanColumn />
                <SkeletonKanbanColumn />
                <div className="hidden xl:block">
                    <SkeletonKanbanColumn />
                </div>
            </div>
        </div>
    );
};

export default TasksSkeleton;