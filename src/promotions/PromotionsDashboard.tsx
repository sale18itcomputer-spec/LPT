

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, type Variants, useInView, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Type } from "@google/genai";
import type { AnnualStrategy, PromotionCandidate, PromotionPlan, LocalFiltersState, Task, TaskPriority } from '../../types';
import { khmerHolidays, Holiday } from '../../utils/khmerHolidays';
import { getCalendarMonth } from '../../utils/dateHelpers';
import Card from '../ui/Card';
import { AIAnnualStrategy } from './AIAnnualStrategy';
import { SparklesIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, BanknotesIcon, ExclamationTriangleIcon, LightBulbIcon, TruckIcon, FunnelIcon, XMarkIcon, ArrowUpIcon } from '../ui/Icons';
import { useData } from '../../contexts/DataContext';
import PromotionCandidatesTable from './PromotionCandidatesTable';
import { appendSheetData } from '../../services/googleScriptService';
import { MARKETING_PLANS_SHEET_NAME, INITIAL_LOCAL_FILTERS } from '../../constants';
import { useTasks } from '../../contexts/TasksContext';
import AddTaskModal from './AddTaskModal';
import { useToast } from '../../contexts/ToastContext';

const itemVariants: Variants = { hidden: { y: 30, opacity: 0, scale: 0.97 }, visible: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } } };
const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } } };
const headerVariants: Variants = { hidden: { y: -20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } } };
const filterBadgeVariants: Variants = { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } }, exit: { scale: 0, opacity: 0, transition: { duration: 0.2 } } };

const isKhmerHoliday = (name: string) => {
    const keywords = ['Khmer', 'Genocide', 'King', 'Queen', 'Visak Bochea', 'Ploughing', 'Constitution', 'Pchum Ben', 'Independence', 'Water Festival'];
    return keywords.some(k => (name || '').includes(k));
};

const getMonthYear = (date: Date) => date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const addMonths = (date: Date, months: number) => { const d = new Date(date); d.setUTCMonth(d.getUTCMonth() + months); return d; }
const getIctStartDateOfMonth = () => {
    const now = new Date();
    const yearFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Bangkok' });
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone: 'Asia/Bangkok' });
    const year = parseInt(yearFormatter.format(now));
    const month = parseInt(monthFormatter.format(now)) - 1; 
    return new Date(Date.UTC(year, month, 1));
};

const KpiCard: React.FC<{ title: string; value: string; icon: React.ReactElement<React.SVGProps<SVGSVGElement>>; colorClass: string; description: string; }> = ({ title, value, icon, colorClass, description }) => (
    <motion.div variants={itemVariants} className="h-full">
        <div className={`relative overflow-hidden rounded-xl p-5 shadow-sm text-white h-full ${colorClass}`}><div className="absolute -top-4 -right-4 text-white/20">{React.cloneElement(icon, { className: 'h-24 w-24' })}</div><div className="relative"><h3 className="text-sm font-medium text-white/90">{title}</h3><p className="text-3xl font-bold mt-2">{value}</p><p className="text-xs text-white/80 mt-1">{description}</p></div></div>
    </motion.div>
);

const priorityDotColor: Record<TaskPriority, string> = { High: 'bg-red-500', Medium: 'bg-orange-400', Low: 'bg-blue-400' };

interface PromotionsDashboardProps { localFilters: LocalFiltersState; setLocalFilters: React.Dispatch<React.SetStateAction<LocalFiltersState>>; userRole: string; }

const PromotionsDashboard = React.forwardRef<HTMLDivElement, PromotionsDashboardProps>(({ localFilters, setLocalFilters, userRole }, ref) => {
    const { promotionCandidates, allPriceListItems, inventoryData } = useData();
    const { tasks } = useTasks();
    const { showToast } = useToast();
    const [addTaskModalState, setAddTaskModalState] = useState<{ isOpen: boolean; date: Date | null }>({ isOpen: false, date: null });
    const [promotionPlans, setPromotionPlans] = useState<Record<string, PromotionPlan>>({});
    const [generatingPlanFor, setGeneratingPlanFor] = useState<string | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    
    const mainContentRef = useRef<HTMLDivElement>(null);
    const kpiRef = useRef<HTMLDivElement>(null);
    const isKpiInView = useInView(kpiRef, { once: true, margin: "-100px" });

    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    const allEvents = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return [...khmerHolidays].filter(h => new Date(h.date) >= today).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, []);

    const filteredCandidates = useMemo(() => {
        const { promotionsSearchTerm, promotionsPriority } = localFilters;
        let filtered = [...promotionCandidates];
        if (promotionsSearchTerm) { const lower = promotionsSearchTerm.toLowerCase(); filtered = filtered.filter(c => (c.mtm || '').toLowerCase().includes(lower) || (c.modelName || '').toLowerCase().includes(lower)); }
        if (promotionsPriority !== 'all') filtered = filtered.filter(c => c.priority === promotionsPriority);
        return filtered;
    }, [promotionCandidates, localFilters]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (localFilters.promotionsSearchTerm) count++;
        if (localFilters.promotionsPriority !== 'all') count++;
        return count;
    }, [localFilters]);

    const clearAllFilters = useCallback(() => {
        setLocalFilters(prev => ({ ...prev, ...INITIAL_LOCAL_FILTERS }));
        showToast('All promotions filters cleared', 'success');
    }, [setLocalFilters, showToast]);

    const handleGeneratePlan = useCallback(async (candidate: PromotionCandidate) => {
        setGeneratingPlanFor(candidate.mtm);
        setGenerationError(null);
        try {
            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const priceListItem = allPriceListItems.find(p => p.mtm === candidate.mtm);
            const oldPrice = priceListItem?.srp || 0;
            const stockStatus = candidate.priority === 'Pre-Launch' ? 'Preorder' : candidate.weeksOfInventory !== null && candidate.weeksOfInventory > 26 ? 'Clearance' : 'In Stock';
            const productActivity = `${candidate.mtm} ${candidate.modelName}`;
            const prompt = `You are a senior GTM strategist for Lenovo Cambodia. Create a strategic marketing plan for a product. Generate a JSON object adhering to the schema. Output ONLY the JSON. Today is 15th September 2025. Brand format: "Lenovo [Category] [Tier]". New SRP must be numeric. Deadline format: DD-MMM-YY (e.g., 28-Nov-25) and after Sept 15, 2025. Product Context: Activity plan: "${productActivity}", User Price: ${oldPrice}, Status: "${stockStatus}", Strategic Insight: ${candidate.reasoning}`;
            const schema = { type: Type.OBJECT, properties: { "Brand": { type: Type.STRING }, "New SRP": { type: Type.NUMBER }, "Warranty": { type: Type.STRING }, "Type": { type: Type.STRING }, "Purpose": { type: Type.STRING }, "Target Audience": { type: Type.STRING }, "Remark": { type: Type.STRING }, "Deadline": { type: Type.STRING }, "Note - Marketing": { type: Type.STRING }, "Support": { type: Type.STRING }, }, required: ["Brand", "New SRP", "Warranty", "Type", "Purpose", "Target Audience", "Remark", "Deadline", "Note - Marketing", "Support"] };
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { temperature: 0.8, responseMimeType: "application/json", responseSchema: schema } });
            const planWithMeta: PromotionPlan = { ...JSON.parse(response.text), 'Activity plan': productActivity, 'User Price': oldPrice, 'Status': stockStatus, unique_id: crypto.randomUUID(), timestamp: new Date().toISOString(), mtm: candidate.mtm };
            setPromotionPlans(prev => ({ ...prev, [candidate.mtm]: planWithMeta }));
            await appendSheetData({ sheetType: MARKETING_PLANS_SHEET_NAME, data: [Object.keys(schema.properties).reduce((acc, key) => ({...acc, [key]: planWithMeta[key as keyof PromotionPlan]}), {})] });
        } catch (err) { setGenerationError(err instanceof Error ? err.message : "An unknown error occurred."); setPromotionPlans(prev => { const newPlans = { ...prev }; delete newPlans[candidate.mtm]; return newPlans; });
        } finally { setGeneratingPlanFor(null); }
    }, [allPriceListItems]);
    
    const [viewDate, setViewDate] = useState(getIctStartDateOfMonth());
    const [annualStrategy, setAnnualStrategy] = useState<AnnualStrategy | null>(null);

    const eventsByDate = useMemo(() => allEvents.reduce((acc, event) => { if (!acc.has(event.date)) acc.set(event.date, []); acc.get(event.date)!.push(event); return acc; }, new Map<string, Holiday[]>()), [allEvents]);
    const tasksByDate = useMemo(() => tasks.reduce((acc, task) => { if (task.dueDate) { const dateStr = task.dueDate.split('T')[0]; if (!acc.has(dateStr)) acc.set(dateStr, []); acc.get(dateStr)!.push(task); } return acc; }, new Map<string, Task[]>()), [tasks]);
    const campaignLaunchDays = useMemo(() => { if (!annualStrategy) return new Set(); const launchDays = new Set<string>(); annualStrategy.quarterlyPlans.forEach(p => p.campaigns.forEach(c => { try { const m = (c.launchWindow || '').match(/(\w{3} \d{1,2})/); if (m) { const d = new Date(`${m[1]}, ${viewDate.getUTCFullYear()}`); if (!isNaN(d.getTime())) launchDays.add(d.toISOString().split('T')[0]); } } catch (e) { console.error("Error parsing launch window date:", e); } })); return launchDays; }, [annualStrategy, viewDate]);

    const promotionKpis = useMemo(() => ({
        urgentCount: filteredCandidates.filter(c => c.priority === 'Urgent').length,
        recommendedCount: filteredCandidates.filter(c => c.priority === 'Recommended').length,
        preLaunchCount: filteredCandidates.filter(c => c.priority === 'Pre-Launch').length,
        totalOpportunityValue: filteredCandidates.reduce((sum, c) => sum + (c.priority === 'Pre-Launch' ? c.otwValue : c.inStockValue), 0),
    }), [filteredCandidates]);

    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    const today_utc = useMemo(() => { const now = new Date(); return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); }, []);

    return (
        <main ref={mainContentRef} className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-8">
            <motion.div variants={headerVariants} initial="hidden" animate="visible" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 p-8 shadow-xl">
                 <div className="relative z-10">
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Marketing Strategy Hub</h1>
                    <p className="text-rose-100 text-lg mb-4">AI-powered hub for strategic campaign planning and market penetration.</p>
                     {activeFiltersCount > 0 && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 flex-wrap"><div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/25 backdrop-blur-sm border border-white/40"><FunnelIcon className="h-4 w-4 text-white" /><span className="text-sm font-semibold text-white">{activeFiltersCount} Active Filter(s)</span></div><AnimatePresence mode="popLayout">{localFilters.promotionsPriority !== 'all' && (<motion.button key="prio-filter" variants={filterBadgeVariants} initial="initial" animate="animate" exit="exit" onClick={() => setLocalFilters(p => ({...p, promotionsPriority: 'all'}))} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-rose-700 text-sm font-medium transition-colors"><span>Prio: {localFilters.promotionsPriority}</span><XMarkIcon className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" /></motion.button>)}</AnimatePresence><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={clearAllFilters} className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 border border-white/40 text-white text-sm font-medium transition-colors">Clear All</motion.button></motion.div>)}
                </div>
            </motion.div>
            
            <motion.div ref={kpiRef} initial="hidden" animate={isKpiInView ? "visible" : "hidden"} variants={containerVariants} className={`grid grid-cols-1 sm:grid-cols-2 ${userRole === 'Admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
                 <KpiCard title="Urgent Opportunities" value={promotionKpis.urgentCount.toLocaleString()} description="Require immediate strategic action" icon={<ExclamationTriangleIcon />} colorClass="bg-gradient-to-br from-red-500 to-orange-500" />
                 <KpiCard title="Pre-Launch Campaigns" value={promotionKpis.preLaunchCount.toLocaleString()} description="Build hype for incoming stock" icon={<TruckIcon />} colorClass="bg-gradient-to-br from-blue-500 to-sky-500" />
                 <KpiCard title="Brand-Building" value={promotionKpis.recommendedCount.toLocaleString()} description="Based on market opportunities" icon={<LightBulbIcon />} colorClass="bg-gradient-to-br from-amber-500 to-yellow-500" />
                {userRole === 'Admin' && <KpiCard title="Total Opportunity Value" value={currencyFormatter(promotionKpis.totalOpportunityValue)} description="Value of stock for promotion" icon={<BanknotesIcon />} colorClass="bg-gradient-to-br from-green-500 to-emerald-500" />}
            </motion.div>
            
            <motion.div initial="hidden" animate="visible" variants={containerVariants}>
                 <Card title="Promotional Candidates" description="AI-prioritized inventory for marketing focus, based on stock age, sales velocity, and value." className="p-0">
                     <div className="p-4 sm:p-6">
                        <PromotionCandidatesTable candidates={filteredCandidates} onGeneratePlan={handleGeneratePlan} promotionPlans={promotionPlans} generatingPlanFor={generatingPlanFor} userRole={userRole} />
                     </div>
                 </Card>
            </motion.div>

            <AnimatePresence>{showScrollTop && (<motion.button initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={scrollToTop} className="fixed bottom-8 right-8 z-50 p-4 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-2xl hover:shadow-pink-500/50" title="Scroll to top"><ArrowUpIcon className="h-6 w-6" /></motion.button>)}</AnimatePresence>
            <AddTaskModal isOpen={addTaskModalState.isOpen} onClose={() => setAddTaskModalState({ isOpen: false, date: null })} selectedDate={addTaskModalState.date || new Date()} />
        </main>
    );
});

PromotionsDashboard.displayName = 'PromotionsDashboard';

export default PromotionsDashboard;