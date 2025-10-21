import React from 'react';
import Card from './ui/Card';
import Skeleton from './ui/Skeleton';

const KpiCardSkeletonSimple: React.FC = () => (
    <Card className="p-4 sm:p-5">
        <Skeleton className="h-5 w-1/3 mb-3" />
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-3 w-2/3" />
    </Card>
);

const ChartCardSkeleton: React.FC<{ height?: string }> = ({ height = 'h-[350px]' }) => (
    <Card className="p-4 sm:p-6">
        <div className="flex justify-between items-start mb-4">
            <div className="flex-grow">
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-8 w-24 ml-4" />
        </div>
        <Skeleton className={`${height} w-full`} />
    </Card>
);

const DashboardSkeleton: React.FC = () => {
  return (
    <main className="px-4 sm:p-6 lg:px-8 space-y-6 lg:space-y-8 pt-6 lg:pt-8">
      {/* KPIs Skeleton */}
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-4" />
          <div className="grid grid-cols-fluid gap-6">
            {[...Array(4)].map((_, i) => <KpiCardSkeletonSimple key={`kpi1-${i}`} />)}
          </div>
        </div>
        <div>
          <Skeleton className="h-8 w-72 mb-4" />
          <div className="grid grid-cols-fluid gap-6">
            {[...Array(4)].map((_, i) => <KpiCardSkeletonSimple key={`kpi2-${i}`} />)}
          </div>
        </div>
         <div>
          <Skeleton className="h-8 w-56 mb-4" />
          <div className="grid grid-cols-fluid gap-6">
            {[...Array(5)].map((_, i) => <KpiCardSkeletonSimple key={`kpi3-${i}`} />)}
          </div>
        </div>
      </div>
      
      {/* Main Trends Skeleton */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </section>

      {/* Order Health Skeleton */}
      <section>
          <Skeleton className="h-8 w-80 mb-4" />
          <div className="grid grid-cols-fluid gap-6 lg:gap-8">
            <ChartCardSkeleton />
            <ChartCardSkeleton />
            <ChartCardSkeleton />
          </div>
      </section>
      
      {/* Sales Performance Skeleton */}
       <section>
         <Skeleton className="h-8 w-64 mb-4" />
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            <div className="space-y-6 lg:space-y-8">
                <ChartCardSkeleton height="h-[300px]" />
                <ChartCardSkeleton height="h-[300px]" />
            </div>
            <div className="space-y-6 lg:space-y-8">
                <ChartCardSkeleton height="h-[300px]" />
                <ChartCardSkeleton height="h-[300px]" />
            </div>
         </div>
      </section>

      {/* Market Intelligence Skeleton */}
      <section>
        <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-x-3 mb-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-grow">
                    <Skeleton className="h-6 w-1/3 mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            </div>
            <div className="flex items-center gap-x-2">
                <Skeleton className="h-11 flex-grow rounded-md" />
                <Skeleton className="h-11 w-28 rounded-md" />
            </div>
        </Card>
      </section>


      {/* Table Skeleton */}
      <Card className="p-4 sm:p-6">
        <nav className="flex border-b border-border-color dark:border-dark-border-color mb-4">
            <Skeleton className="h-10 w-24 mr-2 rounded-t-md rounded-b-none" />
            <Skeleton className="h-10 w-24 rounded-t-md rounded-b-none" />
        </nav>
        <div className="flex justify-end mb-4">
             <Skeleton className="h-10 w-48 rounded-md" />
        </div>
        <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
        </div>
        <div className="flex justify-between items-center mt-4">
            <Skeleton className="h-6 w-48 rounded-md" />
            <Skeleton className="h-10 w-64 rounded-md" />
        </div>
      </Card>
    </main>
  );
};

export default DashboardSkeleton;