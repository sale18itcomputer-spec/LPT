import React from 'react';

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={`bg-gray-200 dark:bg-dark-border-color rounded-md animate-[pulse-slow_2s_cubic-bezier(0.4,0,0.6,1)_infinite] ${className}`}
    />
  );
};

export default Skeleton;