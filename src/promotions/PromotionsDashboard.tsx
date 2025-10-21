
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
// @google/genai-sdk fix: Updated import from "@google/ai" to "@google/genai" to use the correct library.
import { GoogleGenAI, Type } from "@google/genai";
import type { Sale, InventoryItem, AnnualStrategy, PromotionCandidate, PromotionPlan, LocalFiltersState, Task, TaskPriority } from '../../types';
import { khmerHolidays, Holiday } from '../../utils/khmerHolidays';
import { getCalendarMonth } from '../../utils/dateHelpers';
import Card from '../ui/Card';
import { AIAnnualStrategy } from './AIAnnualStrategy';
import { SparklesIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, BanknotesIcon, ExclamationTriangleIcon, LightBulbIcon, TruckIcon } from '../ui/Icons';
import { useData } from '../../contexts/DataContext';
import AnimatedCounter from '../ui/AnimatedCounter';
import PromotionCandidatesTable from './PromotionCandidatesTable';
import { appendSheetData } from '../../services/googleScriptService';
import { MARKETING_PLANS_SHEET_NAME } from '../../constants';
import PromotionPlanDetail from './PromotionPlanDetail';
import { useTasks } from '../../contexts/TasksContext';
import AddTaskModal from './AddTaskModal';

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const isKhmerHoliday = (name: string) => {
    const keywords = ['Khmer', 'Genocide', 'King', 'Queen', 'Visak Bochea', 'Ploughing', 'Constitution', 'Pchum Ben', 'Independence', 'Water Festival'];
    return keywords.some(k => name.includes(k));
};

const getMonthYear = (date: Date) => date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const addMonths = (date: Date, months: number) => {
    const d = new Date(date);
    d.setUTCMonth(d.getUTCMonth() + months);
    return d;
}

const getIctStartDateOfMonth = () => {
    const now = new Date();
    // Use Intl.DateTimeFormat to robustly get date parts in the target timezone.
    // Asia/Bangkok is a common IANA name for Indochina Time (UTC+7) which is used in Cambodia.
    const yearFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Bangkok' });
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone: 'Asia/Bangkok' });

    const year = parseInt(yearFormatter.format(now));
    // The month from Intl.DateTimeFormat is 1-based, but the JS Date constructor expects 0-based.
    const month = parseInt(monthFormatter.format(now)) - 1; 

    // Create a new Date object in UTC for the first day of the determined month.
    // This aligns with the rest of the calendar logic which uses UTC dates.
    return new Date(Date.UTC(year, month, 1));
};


const KpiCard: React.FC<{ title: string; value: string; icon: React.ReactElement<React.SVGProps<SVGSVGElement>>; colorClass: string; description: string; }> = ({ title, value, icon, colorClass, description }) => (
    <motion.div variants={itemVariants} className="h-full">
        <div className={`relative overflow-hidden rounded-xl p-5 shadow-sm text-white h-full ${colorClass}`}>
            <div className="absolute -top-4 -right-4 text-white/20">
                {React.cloneElement(icon, { className: 'h-24 w-24' })}
            </div>
            <div className="relative">
                <h3 className="text-sm font-medium text-white/90">{title}</h3>
                <p className="text-3xl font-bold mt-2">{value}</p>
                <p className="text-xs text-white/80 mt-1">{description}</p>
            </div>
        </div>
    </motion.div>
);

const priorityDotColor: Record<TaskPriority, string> = {
    High: 'bg-red-500',
    Medium: 'bg-orange-400',
    Low: 'bg-blue-400',
};


interface PromotionsDashboardProps {
    localFilters: LocalFiltersState;
    userRole: string;
}

const PromotionsDashboard = React.forwardRef<HTMLDivElement, PromotionsDashboardProps>(({ localFilters, userRole }, ref) => {
    const { promotionCandidates, allPriceListItems, inventoryData } = useData();
    const { tasks } = useTasks();
    const [addTaskModalState, setAddTaskModalState] = useState<{ isOpen: boolean; date: Date | null }>({ isOpen: false, date: null });
    const [promotionPlans, setPromotionPlans] = useState<Record<string, PromotionPlan>>({});
    const [generatingPlanFor, setGeneratingPlanFor] = useState<string | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [brandName, setBrandName] = useState('');
    const [bulkPlans, setBulkPlans] = useState<PromotionPlan[]>([]);
    const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
    const [bulkError, setBulkError] = useState<string | null>(null);

    const allEvents = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return [...khmerHolidays, ...internationalEvents]
            .filter(h => new Date(h.date) >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, []);

    const filteredCandidates = useMemo(() => {
        const { promotionsSearchTerm, promotionsPriority, promotionsProductLine } = localFilters;
        let filtered = [...promotionCandidates];
        
        if (promotionsSearchTerm) {
            const lower = promotionsSearchTerm.toLowerCase();
            filtered = filtered.filter(c => 
                c.mtm.toLowerCase().includes(lower) || 
                c.modelName.toLowerCase().includes(lower)
            );
        }

        if (promotionsPriority !== 'all') {
            filtered = filtered.filter(c => c.priority === promotionsPriority);
        }

        if (promotionsProductLine !== 'all') {
            filtered = filtered.filter(c => c.productLine === promotionsProductLine);
        }

        return filtered;
    }, [promotionCandidates, localFilters]);

    const handleGeneratePlan = useCallback(async (candidate: PromotionCandidate) => {
        setGeneratingPlanFor(candidate.mtm);
        setGenerationError(null);
        try {
            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const priceListItem = allPriceListItems.find(p => p.mtm === candidate.mtm);
            const oldPrice = priceListItem?.srp || 0;

            const stockStatus = candidate.priority === 'Pre-Launch' ? 'Preorder' 
                : candidate.weeksOfInventory !== null && candidate.weeksOfInventory > 26 ? 'Clearance'
                : 'In Stock';
            
            const productActivity = `${candidate.mtm} ${candidate.modelName} - ${candidate.specification}`;

            const prompt = `
You are a senior Go-to-Market (GTM) strategist for Lenovo Cambodia. Your task is to create a strategic marketing plan for a specific product.
Generate a JSON object that strictly adheres to the provided schema. The output must be ONLY the JSON object.
Today is 15th September 2025, use this as a reference to generate deadlines.

**Guidelines:**
- **Brand**: Based on the product category (e.g., Gaming, Business, Consumer, 2-in-1, All-in-One) and its price point, determine a specific brand segment. The format should be "Lenovo [Category] [Tier]". Examples: "Lenovo Gaming High End", "Lenovo Premium Business", "Lenovo Mainstream Consumer", "Lenovo 2 in 1", "Lenovo All in One". High-end gaming laptops are "Lenovo Gaming High End". Premium business laptops are "Lenovo Premium Business". Mid-range consumer products are "Lenovo Mainstream Consumer". Adapt this logic for other categories.
- **New SRP**: Suggest a new promotional price. If no discount is appropriate, use the old price. Prices must be numeric.
- **Warranty**: Suggest a warranty period as a string (e.g., "1 Year", "2 Years").
- **Type**: Suggest a specific action. Allowed values are 'poster', 'Video', or 'poster, Video'. Make a logical choice: reserve 'Video' for high-value, exciting products (like gaming laptops or new flagship models). For standard or lower-priced items, 'poster' is usually sufficient.
- **Purpose**: Create a short, catchy message. Examples: "New Price!!!", "Back to School", "Student Special".
- **Target Audience**: Be specific to Cambodian demographics. Example: "Gaming High-End", "Students", "SMB", "Creators".
- **Remark**: Add a concise, important remark. **Do not mention the specific number of units in stock.**
- **Deadline**: Format as DD-MMM-YY (e.g., 28-Nov-25). The deadline must be after September 15, 2025.
- **Note - Marketing**: Provide short, actionable instructions.
- **Support**: List needed assets (e.g., "Posters, Social banners, Video ads").

**Product Context:**
- **Activity plan**: "${productActivity}"
- **User Price**: ${oldPrice}
- **Status**: "${stockStatus}"
- **Strategic Insight**: ${candidate.reasoning}

**Your Task:**
Generate a JSON object for the marketing plan with the following keys. 'New SRP' must be a number. All other values must be strings.
`;

            const schema = {
                type: Type.OBJECT,
                properties: {
                    "Brand": { type: Type.STRING },
                    "New SRP": { type: Type.NUMBER },
                    "Warranty": { type: Type.STRING },
                    "Type": { type: Type.STRING },
                    "Purpose": { type: Type.STRING },
                    "Target Audience": { type: Type.STRING },
                    "Remark": { type: Type.STRING },
                    "Deadline": { type: Type.STRING },
                    "Note - Marketing": { type: Type.STRING },
                    "Support": { type: Type.STRING },
                },
                required: ["Brand", "New SRP", "Warranty", "Type", "Purpose", "Target Audience", "Remark", "Deadline", "Note - Marketing", "Support"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    temperature: 0.8,
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            });
            
            const aiResult = JSON.parse(response.text);

            const planWithMeta: PromotionPlan = {
                ...aiResult,
                'Activity plan': productActivity,
                'User Price': oldPrice,
                'Status': stockStatus,
                unique_id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                mtm: candidate.mtm,
            };

            setPromotionPlans(prev => ({ ...prev, [candidate.mtm]: planWithMeta }));
            
            const sheetRow = {
                'Activity plan': planWithMeta['Activity plan'],
                'User Price': planWithMeta['User Price'],
                'New SRP': planWithMeta['New SRP'],
                'Warranty': planWithMeta['Warranty'],
                'Brand': planWithMeta['Brand'],
                'Type': planWithMeta['Type'],
                'Status': planWithMeta['Status'],
                'Purpose': planWithMeta['Purpose'],
                'Target Audience': planWithMeta['Target Audience'],
                'Remark': planWithMeta['Remark'],
                'Deadline': planWithMeta['Deadline'],
                'Note - Marketing': planWithMeta['Note - Marketing'],
                'Support': planWithMeta['Support'],
            };
            
            await appendSheetData({
                sheetType: MARKETING_PLANS_SHEET_NAME,
                data: [sheetRow]
            });

        } catch (err) {
            console.error("Error generating promotion plan:", err);
            setGenerationError(err instanceof Error ? err.message : "An unknown error occurred.");
            setPromotionPlans(prev => {
                const newPlans = { ...prev };
                delete newPlans[candidate.mtm];
                return newPlans;
            });
        } finally {
            setGeneratingPlanFor(null);
        }
    }, [allPriceListItems]);
    
    const handleGenerateBulkPlan = useCallback(async () => {
        if (!brandName.trim()) return;
        setIsGeneratingBulk(true);
        setBulkError(null);
        setBulkPlans([]);

        try {
            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const productExamples = inventoryData
                .filter(item => item.modelName.toLowerCase().includes(brandName.toLowerCase()))
                .slice(0, 10)
                .map(item => `- ${item.modelName} (MTM: ${item.mtm}, On Hand: ${item.onHandQty})`)
                .join('\n');
            
            const priceExamples = allPriceListItems
                .filter(item => item.modelName.toLowerCase().includes(brandName.toLowerCase()))
                .slice(0, 10)
                .map(item => `- ${item.modelName}: SRP $${item.srp}`)
                .join('\n');

            const prompt = `
I need a marketing plan table in Google Sheets format for the brand/series "Lenovo ${brandName}". Please generate 10-15 rows following this format and keeping consistency across all columns. The output must be a JSON array of objects.
For context, today is 15th September 2025.

**Guidelines & Exact Headers:**
- **Activity plan**: Generate a realistic MTM, a short product name, and key specs in the format "MTM Short Name - Full Specs". For example: "82YQ0000US Legion 5 Pro - 16" QHD 165Hz, Ryzen 7, RTX 4070, 16GB RAM, 1TB SSD".
- **User Price** & **New SRP**: Numeric USD values only. Use realistic prices based on the product tier.
- **Warranty**: String value (e.g., "1 Year", "2 Years").
- **Brand**: Based on the generated product's category (e.g., Gaming, Business, 2-in-1) and its price, determine a specific brand segment. The format is "Lenovo [Category] [Tier]". For the "${brandName}" series, this could be "Lenovo Gaming High End", "Lenovo Premium Business", "Lenovo Mainstream Consumer", "Lenovo Yoga 2 in 1", etc. Be creative and consistent with the product you generate.
- **Type**: Allowed values are 'poster', 'Video', or 'poster, Video'. Make a logical choice: reserve 'Video' for high-value, exciting products (like gaming laptops or new flagship models). For standard or lower-priced items, 'poster' is usually sufficient.
- **Status**: e.g., instock, Preorder, Clearance.
- **Purpose**: e.g., New Price!!!, Back to School, Student Special.
- **Target Audience**: e.g., Gaming High-end, Students, SMB, Creators.
- **Remark**: A concise, important remark. **Do not mention specific inventory numbers.**
- **Deadline**: Format as DD-MMM-YY (e.g., 28-Nov-25). All deadlines must be after September 15, 2025.
- **Note - Marketing**: Short instructions (e.g., Urgent, Social push, Bundle highlight).
- **Support**: List of needed assets (e.g., Posters, Social banners, Dealer POP, Video ads).

**Product & Price Examples for Context:**
${productExamples || 'No specific product examples available. Please generate plausible products.'}
${priceExamples || 'No specific price examples available.'}

**Your Task:**
Generate a JSON array of 10-15 marketing plan objects. Each object must have the keys specified in the schema.
`;
            
            const itemSchemaProperties = {
                'Activity plan': { type: Type.STRING },
                'User Price': { type: Type.NUMBER },
                'New SRP': { type: Type.NUMBER },
                'Warranty': { type: Type.STRING },
                'Brand': { type: Type.STRING },
                'Type': { type: Type.STRING },
                'Status': { type: Type.STRING },
                'Purpose': { type: Type.STRING },
                'Target Audience': { type: Type.STRING },
                'Remark': { type: Type.STRING },
                'Deadline': { type: Type.STRING },
                'Note - Marketing': { type: Type.STRING },
                'Support': { type: Type.STRING },
            };

            const itemSchema = {
                type: Type.OBJECT,
                properties: itemSchemaProperties,
                required: Object.keys(itemSchemaProperties),
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    temperature: 0.9,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: itemSchema
                    },
                },
            });

            const aiResult = JSON.parse(response.text);

            if (!Array.isArray(aiResult)) {
                throw new Error("AI did not return a valid array of plans.");
            }

            const plansWithMeta: PromotionPlan[] = aiResult.map(plan => ({
                ...plan,
                unique_id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                mtm: 'N/A-Bulk', // MTM is not applicable for bulk generation
            }));

            setBulkPlans(plansWithMeta);

            const sheetRows = plansWithMeta.map(plan => ({
                'Activity plan': plan['Activity plan'],
                'User Price': plan['User Price'],
                'New SRP': plan['New SRP'],
                'Warranty': plan['Warranty'],
                'Brand': plan['Brand'],
                'Type': plan['Type'],
                'Status': plan['Status'],
                'Purpose': plan['Purpose'],
                'Target Audience': plan['Target Audience'],
                'Remark': plan['Remark'],
                'Deadline': plan['Deadline'],
                'Note - Marketing': plan['Note - Marketing'],
                'Support': plan['Support'],
            }));

            await appendSheetData({
                sheetType: MARKETING_PLANS_SHEET_NAME,
                data: sheetRows,
            });

        } catch (err) {
            console.error("Error generating bulk promotion plan:", err);
            setBulkError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsGeneratingBulk(false);
        }
    }, [brandName, inventoryData, allPriceListItems]);
    
    const [viewDate, setViewDate] = useState(getIctStartDateOfMonth());
    const [annualStrategy, setAnnualStrategy] = useState<AnnualStrategy | null>(null);

    const eventsByDate = useMemo(() => {
        return allEvents.reduce((acc, event) => {
            if (!acc.has(event.date)) acc.set(event.date, []);
            acc.get(event.date)!.push(event);
            return acc;
        }, new Map<string, Holiday[]>());
    }, [allEvents]);
    
    const tasksByDate = useMemo(() => {
        return tasks.reduce((acc, task) => {
            if (task.dueDate) {
                const dateStr = task.dueDate.split('T')[0]; // Normalize to YYYY-MM-DD
                if (!acc.has(dateStr)) {
                    acc.set(dateStr, []);
                }
                acc.get(dateStr)!.push(task);
            }
            return acc;
        }, new Map<string, Task[]>());
    }, [tasks]);

    const campaignLaunchDays = useMemo(() => {
        if (!annualStrategy) return new Set();
        const launchDays = new Set<string>();
        annualStrategy.quarterlyPlans.forEach(plan => {
            plan.campaigns.forEach(campaign => {
                try {
                    const dateMatch = campaign.launchWindow.match(/(\w{3} \d{1,2})/);
                    if (dateMatch) {
                        const launchDateStr = `${dateMatch[1]}, ${viewDate.getUTCFullYear()}`;
                        const launchDate = new Date(launchDateStr);
                        if (!isNaN(launchDate.getTime())) {
                            launchDays.add(launchDate.toISOString().split('T')[0]);
                        }
                    }
                } catch (e) { console.error("Error parsing launch window date:", e); }
            });
        });
        return launchDays;
    }, [annualStrategy, viewDate]);

    const promotionKpis = useMemo(() => {
        return {
            urgentCount: filteredCandidates.filter(c => c.priority === 'Urgent').length,
            recommendedCount: filteredCandidates.filter(c => c.priority === 'Recommended').length,
            preLaunchCount: filteredCandidates.filter(c => c.priority === 'Pre-Launch').length,
            totalOpportunityValue: filteredCandidates.reduce((sum, c) => {
                if (c.priority === 'Pre-Launch') {
                    return sum + c.otwValue;
                }
                return sum + c.inStockValue;
            }, 0),
        };
    }, [filteredCandidates]);

    const currencyFormatter = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    
    const today_utc = useMemo(() => {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }, []);

    return (
        <motion.main 
            ref={ref} 
            className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={itemVariants}>
                <h1 className="text-3xl font-bold tracking-tight text-primary-text dark:text-dark-primary-text">Marketing Strategy Hub</h1>
                <p className="text-secondary-text dark:text-dark-secondary-text mt-1">An AI-powered hub for strategic campaign planning and market penetration.</p>
            </motion.div>
            
            <motion.div className={`grid grid-cols-1 sm:grid-cols-2 ${userRole === 'Admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`} variants={containerVariants}>
                 <KpiCard 
                    title="Urgent Opportunities" 
                    value={promotionKpis.urgentCount.toLocaleString()}
                    description="Require immediate strategic action"
                    icon={<ExclamationTriangleIcon />} 
                    colorClass="bg-gradient-to-br from-red-500 to-orange-500"
                />
                 <KpiCard 
                    title="Pre-Launch Campaigns" 
                    value={promotionKpis.preLaunchCount.toLocaleString()}
                    description="Build hype for incoming stock"
                    icon={<TruckIcon />} 
                    colorClass="bg-gradient-to-br from-blue-500 to-sky-500"
                />
                 <KpiCard 
                    title="Brand-Building Initiatives" 
                    value={promotionKpis.recommendedCount.toLocaleString()}
                    description="Based on market opportunities"
                    icon={<LightBulbIcon />} 
                    colorClass="bg-gradient-to-br from-amber-500 to-yellow-500"
                />
                {userRole === 'Admin' && (
                    <KpiCard 
                        title="Total Opportunity Value" 
                        value={currencyFormatter(promotionKpis.totalOpportunityValue)}
                        description="Value of stock for marketing initiatives"
                        icon={<BanknotesIcon />} 
                        colorClass="bg-gradient-to-br from-emerald-500 to-green-500"
                    />
                )}
            </motion.div>

            <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start" variants={itemVariants}>
                <div className="lg:col-span-1">
                     <AIAnnualStrategy inventoryData={inventoryData} allEvents={allEvents} onGenerated={setAnnualStrategy} currentStrategy={annualStrategy} />
                </div>
                <div className="lg:col-span-2">
                     <Card className="p-2 sm:p-4">
                        <div className="px-2 pb-2 flex justify-between items-center">
                            <h3 className="font-semibold text-primary-text dark:text-dark-primary-text text-lg">{getMonthYear(viewDate)}</h3>
                            <div className="flex items-center gap-x-1">
                                <button onClick={() => setViewDate(d => addMonths(d, -1))} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-dark-secondary-bg/50 text-secondary-text dark:text-dark-secondary-text"><ChevronLeftIcon className="h-5 w-5" /></button>
                                <button onClick={() => setViewDate(d => addMonths(d, 1))} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-dark-secondary-bg/50 text-secondary-text dark:text-dark-secondary-text"><ChevronRightIcon className="h-5 w-5" /></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-px text-center text-xs font-semibold text-secondary-text dark:text-dark-secondary-text border-b border-border-color dark:border-dark-border-color">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="py-2">{day}</div>)}
                        </div>
                        <div className="grid grid-cols-7 grid-rows-6 gap-px">
                            {getCalendarMonth(viewDate.getUTCFullYear(), viewDate.getUTCMonth()).flat().map(day => {
                                const dayStr = day.toISOString().split('T')[0];
                                const isCurrentMonth = day.getUTCMonth() === viewDate.getUTCMonth();
                                const dayEvents = eventsByDate.get(dayStr) || [];
                                const isCampaignLaunch = campaignLaunchDays.has(dayStr);
                                const isToday = day.getTime() === today_utc.getTime();
                                const dayTasks = tasksByDate.get(dayStr) || [];

                                return (
                                    <motion.div 
                                        key={dayStr}
                                        whileHover={{ scale: 1.05 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                        className={`relative h-24 p-1 group border-t border-l border-border-color dark:border-dark-border-color transition-colors ${isCurrentMonth ? 'bg-secondary-bg dark:bg-dark-secondary-bg cursor-pointer hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover' : 'bg-slate-50/50 dark:bg-dark-primary-bg'}`}
                                        onClick={() => isCurrentMonth && setAddTaskModalState({ isOpen: true, date: day })}
                                    >
                                        <time dateTime={dayStr} className={`relative z-10 text-xs ${isToday ? 'bg-highlight text-white rounded-full h-5 w-5 flex items-center justify-center font-bold' : ''} ${!isCurrentMonth ? 'text-slate-400 dark:text-slate-500' : 'text-secondary-text dark:text-dark-secondary-text'}`}>
                                            {day.getUTCDate()}
                                        </time>
                                        <div className="mt-1 space-y-1 relative z-10">
                                            {dayEvents.map(event => (
                                                <div key={event.name} className="flex items-center gap-x-1">
                                                    <div className={`h-1.5 w-1.5 rounded-full ${isKhmerHoliday(event.name) ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                                                    <span className="text-xs truncate font-medium text-primary-text dark:text-dark-primary-text">{event.name}</span>
                                                </div>
                                            ))}
                                             {isCampaignLaunch && (
                                                <div className={`flex items-center gap-x-1 rounded-full ${isCurrentMonth ? 'pulse-glow-animation' : ''}`} title="AI Suggested Campaign Launch">
                                                    <SparklesIcon className="h-3 w-3 flex-shrink-0 text-indigo-500" />
                                                    <span className="text-xs truncate font-medium text-indigo-700 dark:text-indigo-300">Campaign Start</span>
                                                </div>
                                            )}
                                        </div>
                                         {dayTasks.length > 0 && (
                                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1" title={dayTasks.map(t => t.title).join(', ')}>
                                                {dayTasks
                                                    .sort((a, b) => {
                                                        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
                                                        return priorityOrder[b.priority] - priorityOrder[a.priority];
                                                    })
                                                    .slice(0, 3)
                                                    .map(task => (
                                                        <div key={task.id} className={`h-1.5 w-1.5 rounded-full ${priorityDotColor[task.priority]}`}></div>
                                                    ))
                                                }
                                            </div>
                                        )}
                                         {dayEvents.length > 0 && (
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-max max-w-xs p-2 text-xs text-white bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                                {dayEvents.map(e => <div key={e.name}>{e.name}</div>)}
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </motion.div>
            
            <motion.div variants={itemVariants}>
                <Card className="p-4 sm:p-6">
                    <h2 className="text-xl font-semibold text-primary-text dark:text-dark-primary-text">AI Marketing Opportunities</h2>
                    <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1 mb-4">Prioritized list of products suitable for strategic marketing initiatives.</p>
                    <PromotionCandidatesTable
                        candidates={filteredCandidates}
                        onGeneratePlan={handleGeneratePlan}
                        promotionPlans={promotionPlans}
                        generatingPlanFor={generatingPlanFor}
                        userRole={userRole}
                    />
                </Card>
            </motion.div>

            {addTaskModalState.date && (
                <AddTaskModal
                    isOpen={addTaskModalState.isOpen}
                    onClose={() => setAddTaskModalState({ isOpen: false, date: null })}
                    selectedDate={addTaskModalState.date}
                />
            )}
        </motion.main>
    );
});

PromotionsDashboard.displayName = 'PromotionsDashboard';
const internationalEvents: Holiday[] = [
    { date: '2025-02-14', name: "Valentine's Day", description: 'Focus on gifts, couples deals, and tech for two.' },
    { date: '2025-07-15', name: 'Back to School Prep', description: 'Early-bird discounts for students and educators.' },
    { date: '2025-08-15', name: 'Back to School Peak', description: 'Main promotional period for student laptops and bundles.' },
    { date: '2025-11-28', name: 'Black Friday Week', description: 'Global sales event with deep discounts.' },
    { date: '2025-12-22', name: 'Year-End Holiday Sale', description: 'Final sales push of the year for holiday gifting.' },
];
export default PromotionsDashboard;
