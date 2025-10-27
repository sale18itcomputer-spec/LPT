

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HistoricalHolidaySalesAnalysis } from '../../types';
import type { Holiday } from '../../utils/khmerHolidays';
import Card from '../ui/Card';
import AIPromotionPlanner from './AIPromotionPlanner';
import HistoricalSalesChart from './HistoricalSalesChart';
import SegmentRevenueChart from './SegmentRevenueChart';
import SurplusStockChart from './SurplusStockChart';
import { DocumentMagnifyingGlassIcon, SparklesIcon, CalendarDaysIcon, ChevronLeftIcon } from '../ui/Icons';

interface EventDetailPanelProps {
    holiday: Holiday;
    historicalAnalysis: HistoricalHolidaySalesAnalysis | null;
}

const viewVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
};

const MotionDiv = motion.div as any;

const EventDetailPanel: React.FC<EventDetailPanelProps> = ({ holiday, historicalAnalysis }) => {
    const [activeTab, setActiveTab] = useState<'ai' | 'historical'>('ai');
    const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

    const handleSegmentSelect = (segment: string | null) => {
        setSelectedSegment(prev => prev === segment ? null : segment);
    };

    return (
        <Card className="p-0 h-full flex flex-col">
            <div className="p-4 border-b border-border-color">
                <div className="flex justify-center border-b border-border-color">
                    <button onClick={() => setActiveTab('ai')} className={`relative py-2 px-4 text-sm font-medium ${activeTab === 'ai' ? 'text-highlight' : 'text-secondary-text'}`}>
                        AI Planner
                        {activeTab === 'ai' && <motion.div layoutId="event-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-highlight" />}
                    </button>
                    <button onClick={() => setActiveTab('historical')} className={`relative py-2 px-4 text-sm font-medium ${activeTab === 'historical' ? 'text-highlight' : 'text-secondary-text'}`}>
                        Historical Data
                        {activeTab === 'historical' && <motion.div layoutId="event-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-highlight" />}
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar p-4">
                 <AnimatePresence mode="wait">
                    <MotionDiv
                        key={activeTab}
                        variants={viewVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'ai' ? (
                            <AIPromotionPlanner selectedHoliday={holiday} historicalAnalysis={historicalAnalysis} />
                        ) : (
                            <div className="space-y-6">
                                {historicalAnalysis ? (
                                    <>
                                        <div>
                                            <h3 className="font-semibold text-primary-text mb-2">Last Year's Daily Sales</h3>
                                            <div className="h-24"><HistoricalSalesChart dailySales={historicalAnalysis.dailySales} /></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h3 className="font-semibold text-primary-text mb-2">Revenue by Segment</h3>
                                                <div className="h-48"><SegmentRevenueChart segments={historicalAnalysis.topSegments} onSegmentSelect={handleSegmentSelect} selectedSegment={selectedSegment} /></div>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-primary-text mb-2">Surplus Stock with Low Sales</h3>
                                                <div className="h-48"><SurplusStockChart surplusItems={historicalAnalysis.surplusItems} /></div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-secondary-text">
                                        <DocumentMagnifyingGlassIcon className="h-12 w-12 text-gray-400 mb-3" />
                                        <p className="font-semibold">No historical sales data available for this holiday period.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </MotionDiv>
                </AnimatePresence>
            </div>
        </Card>
    );
};

export default EventDetailPanel;