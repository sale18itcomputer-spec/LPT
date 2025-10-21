
import React from 'react';
import { TaskStatus } from '../../types';
import { ClockIcon, CheckCircleIcon, XCircleIcon, MinusCircleIcon, ArchiveBoxIcon } from '../ui/Icons';

export const columnHeaderConfig: Record<TaskStatus, { color: string, icon: React.FC<any> }> = {
    Planning: { color: 'bg-blue-500', icon: ClockIcon },
    'In Progress': { color: 'bg-yellow-500', icon: ClockIcon },
    Done: { color: 'bg-green-500', icon: CheckCircleIcon },
    Canceled: { color: 'bg-red-500', icon: XCircleIcon },
    Paused: { color: 'bg-purple-500', icon: MinusCircleIcon },
    Backlog: { color: 'bg-gray-500', icon: ArchiveBoxIcon },
};
