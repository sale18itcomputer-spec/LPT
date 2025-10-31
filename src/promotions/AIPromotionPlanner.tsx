
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Type } from "@google/genai";
import { 
    SparklesIcon, 
    DocumentDuplicateIcon,
    CheckIcon,
    ExclamationTriangleIcon,
    BullseyeIcon,
    GiftIcon,
    ArrowUpCircleIcon,
    LightBulbIcon,
    EnvelopeIcon,
} from '../ui/Icons';
import type { Holiday } from '../../utils/khmerHolidays';
import type { HistoricalHolidaySalesAnalysis, Campaign } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const CampaignPlaybookCard: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    const handleCopy = () => {
        navigator.clipboard.writeText(campaign.fullText).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        });
    };

    const sections = [
        { icon: BullseyeIcon, label: "Target Audience", text: campaign.targetAudience },
        { icon: GiftIcon, label: "Core Offer", text: campaign.coreOffer },
        { icon: ArrowUpCircleIcon, label: "Upsell Suggestion", text: campaign.upsellSuggestion },
        { icon: LightBulbIcon, label: "Marketing Angle", text: campaign.marketingAngle },
        { icon: EnvelopeIcon, label: "Sample Ad Copy", text: campaign.sampleCopy },
    ];

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-dark-secondary-bg/50 border border-border-color dark:border-dark-border-color rounded-lg p-4"
        >
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-highlight">{campaign.title}</h3>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCopy}
                    className="flex items-center px-2 py-1 bg-slate-100 dark:bg-slate-700 text-secondary-text dark:text-dark-secondary-text text-xs font-medium rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                    {copyStatus === 'copied' ? <CheckIcon className="h-4 w-4 mr-1.5 text-green-500" /> : <DocumentDuplicateIcon className="h-4 w-4 mr-1.5" />}
                    {copyStatus === 'copied' ? 'Copied!' : 'Copy All'}
                </motion.button>
            </div>
            <div className="mt-3 space-y-3">
                {sections.map(({ icon: Icon, label, text }) => (
                    <div key={label}>
                        <h4 className="font-semibold text-sm text-primary-text dark:text-dark-primary-text flex items-center">
                            <Icon className="h-4 w-4 mr-2 text-secondary-text dark:text-dark-secondary-text" />
                            {label}
                        </h4>
                        <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1 pl-6">{text}</p>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

interface AIPromotionPlannerProps {
    selectedHoliday: Holiday;
    historicalAnalysis: HistoricalHolidaySalesAnalysis | null;
}

const CAMPAIGN_LEAD_WEEKS = 4;

const AIPromotionPlanner: React.FC<AIPromotionPlannerProps> = ({ selectedHoliday, historicalAnalysis }) => {
    const { user } = useAuth();
    const userRole = user?.role || 'Admin';
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);

    // Reset state when the selected holiday changes
    useEffect(() => {
        setCampaigns(null);
        setError(null);
        setIsLoading(false);
    }, [selectedHoliday]);

    const generatePrompt = useCallback(() => {
        const salesContext = (userRole === 'Admin' && historicalAnalysis) ? `
- Last Year's Total Revenue (2-week period): $${historicalAnalysis.totalRevenue.toFixed(2)}
- Top Customer Segments: ${historicalAnalysis.topSegments.map(s => s.name).join(', ') || 'None'}
- Surplus Stock with Low Sales During Period:
${historicalAnalysis.surplusItems.map(item => `  - ${item.modelName} (In Stock: ${item.inStockQty})`).join('\n') || '  - None'}
` : 'Historical sales data is not available for your role.';

        return `
You are a creative marketing expert for a Lenovo electronics retailer in Cambodia. Your task is to generate three distinct, actionable campaign playbooks for an upcoming event.

**Event Details:**
- Event Name: ${selectedHoliday.name}
- Event Date: ${selectedHoliday.date}
- Description: ${selectedHoliday.description}
- Campaign Lead Time: Start campaigns ${CAMPAIGN_LEAD_WEEKS} weeks before the event date.

**Historical Context (from last year's event period):**
${salesContext}

**Your Task:**
Generate a JSON object containing an array of three unique campaign playbooks. Each playbook must be a complete JSON object adhering to the provided schema. The campaigns should be creative and tailored to the event and historical data. One campaign must specifically focus on moving the surplus stock mentioned.

**Example of one campaign object in the array:**
{
  "id": 1,
  "title": "Khmer New Year 'Tech for Travelers' Deal",
  "targetAudience": "Students and young professionals traveling to their home provinces for the holidays.",
  "coreOffer": "Bundle a lightweight IdeaPad laptop with a portable power bank and a wireless mouse for 15% off.",
  "upsellSuggestion": "Add a premium backpack or a 2-year on-site warranty service for an additional $25.",
  "marketingAngle": "Stay connected and entertained on the go. The perfect tech companion for your holiday journey home.",
  "sampleCopy": "Visiting family for Khmer New Year? Pack light and stay powerful with our exclusive Tech for Travelers bundle. Get everything you need for just $XXX!",
  "fullText": "..." // A concatenation of all fields for easy copy-pasting
}
`;
    }, [selectedHoliday, historicalAnalysis, userRole]);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setCampaigns(null);
        try {
            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = generatePrompt();
            
            const responseSchema = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        targetAudience: { type: Type.STRING },
                        coreOffer: { type: Type.STRING },
                        upsellSuggestion: { type: Type.STRING },
                        marketingAngle: { type: Type.STRING },
                        sampleCopy: { type: Type.STRING },
                        fullText: { type: Type.STRING }
                    },
                    required: ["id", "title", "targetAudience", "coreOffer", "upsellSuggestion", "marketingAngle", "sampleCopy", "fullText"]
                }
            };
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    temperature: 0.8,
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });
            
            const parsedCampaigns = JSON.parse(response.text);
            setCampaigns(parsedCampaigns);
        } catch (err) {
            console.error("Error generating promotion plan:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-bold text-primary-text dark:text-dark-primary-text">{selectedHoliday.name}</h2>
                <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1">{selectedHoliday.description}</p>
            </div>
            <motion.button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 text-white text-base font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed btn-gradient"
            >
                <SparklesIcon className={`h-6 w-6 mr-3 ${isLoading ? 'animate-pulse' : ''}`} />
                {isLoading ? 'Generating Ideas...' : (campaigns ? 'Regenerate Campaign Playbooks' : 'Generate Campaign Playbooks')}
            </motion.button>

            <div className="pt-4">
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div 
                            key="loading" 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center text-center text-secondary-text dark:text-dark-secondary-text min-h-[200px] bg-slate-50 dark:bg-dark-secondary-bg/20 rounded-lg generating-bg"
                        >
                            <p className="font-semibold">Synthesizing campaign concepts...</p>
                            <p className="text-sm">Gemini is analyzing historical data and market trends.</p>
                        </motion.div>
                    ) : error ? (
                        <motion.div 
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-start bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg"
                        >
                            <ExclamationTriangleIcon className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">Generation Failed</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        </motion.div>
                    ) : campaigns ? (
                        <motion.div 
                            key="campaigns" 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            {campaigns.map(campaign => (
                                <CampaignPlaybookCard key={campaign.id} campaign={campaign} />
                            ))}
                        </motion.div>
                    ) : (
                         <motion.div
                            key="placeholder"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center text-center text-secondary-text dark:text-dark-secondary-text p-8 border-2 border-dashed border-border-color dark:border-dark-border-color rounded-lg min-h-[200px]"
                        >
                            <SparklesIcon className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-3" />
                            <h3 className="font-semibold text-primary-text dark:text-dark-primary-text">Ready to plan your next promotion?</h3>
                            <p className="text-sm mt-1">Click the button above to generate three tailored campaign playbooks for this event using Gemini.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AIPromotionPlanner;
