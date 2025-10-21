
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Type } from "@google/genai";
import { SparklesIcon, ExclamationTriangleIcon, DocumentDuplicateIcon, CheckIcon } from '../ui/Icons';
import type { InventoryItem, AnnualStrategy } from '../../types';
import type { Holiday } from '../../utils/khmerHolidays';
import Card from '../ui/Card';

interface AIAnnualStrategyProps {
    inventoryData: InventoryItem[];
    allEvents: Holiday[];
    onGenerated: (strategy: AnnualStrategy) => void;
    currentStrategy: AnnualStrategy | null;
}

export const AIAnnualStrategy: React.FC<AIAnnualStrategyProps> = ({ inventoryData, allEvents, onGenerated, currentStrategy }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState<'idle'|'copied'>('idle');

    const generatePrompt = useCallback(() => {
        const surplusContext = inventoryData.filter(item => item.onHandQty > 20 && (item.weeksOfInventory === null || item.weeksOfInventory > 26)).slice(0, 10).map(item => `- ${item.modelName} (MTM: ${item.mtm}), Current Stock: ${item.onHandQty}`).join('\n');
        const eventsContext = allEvents.map(e => `- ${e.date}: ${e.name}`).join('\n');

        return `
You are an expert marketing strategist for a Lenovo electronics retailer in Cambodia. Your task is to create a cohesive, year-long marketing strategy that harmonizes international sales events with local Khmer holidays. The goal is brand penetration and establishing market leadership, not just short-term sales. Focus on themes that resonate with Cambodian culture, youth aspirations, and economic growth. For each quarter, define a strategic focus (e.g., 'Empowering Education,' 'Gaming Community Dominance') and suggest 2-3 high-impact campaign concepts. These concepts should go beyond simple discounts; think partnerships, workshops, community events, and content creation.

**Key Objective:** Maximize sales by creating relevant, timely campaigns with sufficient lead time. Campaigns MUST start several weeks in advance of events.

**Input Data:**
1.  **Inventory Opportunities (Surplus stock to prioritize):**
    ${surplusContext || "No significant surplus stock currently."}

2.  **Key Promotional Events for the Year:**
    ${eventsContext}

**Your Task:**
Generate a comprehensive promotional strategy as a JSON object that strictly adheres to the provided schema. For each campaign, provide a "harmonizationNote" explaining how it logically connects to local culture or bridges the gap between events.

Example Harmonization: "Use the 'Back to School' momentum to lead into Pchum Ben, promoting portable devices for students traveling to their home provinces."
`;
    }, [inventoryData, allEvents]);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = generatePrompt();
            
            const schema = {
                type: Type.OBJECT,
                properties: {
                    overarchingTheme: { type: Type.STRING, description: "A creative, year-long theme for the marketing strategy." },
                    quarterlyPlans: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                quarter: { type: Type.STRING, description: "The quarter, e.g., 'Q1 2025'." },
                                strategicFocus: { type: Type.STRING, description: "The primary marketing focus for this quarter." },
                                campaigns: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            event: { type: Type.STRING, description: "The target event for the campaign." },
                                            theme: { type: Type.STRING, description: "A creative theme for the campaign." },
                                            targetProducts: { type: Type.STRING, description: "Specific products or categories to focus on." },
                                            launchWindow: { type: Type.STRING, description: "Suggested launch window, e.g., 'Early March'." },
                                            harmonizationNote: { type: Type.STRING, description: "Note on how this campaign connects with local culture or other events." },
                                        },
                                        required: ["event", "theme", "targetProducts", "launchWindow", "harmonizationNote"]
                                    }
                                }
                            },
                            required: ["quarter", "strategicFocus", "campaigns"]
                        }
                    }
                },
                required: ["overarchingTheme", "quarterlyPlans"]
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

            const parsedStrategy = JSON.parse(response.text) as AnnualStrategy;
            onGenerated(parsedStrategy);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (!currentStrategy) return;
        const text = `
Annual Strategy: ${currentStrategy.overarchingTheme}

${currentStrategy.quarterlyPlans.map(q => `
## ${q.quarter}: ${q.strategicFocus}
${q.campaigns.map(c => `
### ${c.event} - ${c.theme}
- Products: ${c.targetProducts}
- Launch: ${c.launchWindow}
- Note: ${c.harmonizationNote}
`).join('\n')}
`).join('\n')}
        `.trim();
        navigator.clipboard.writeText(text).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        });
    };

    return (
        <Card className="p-0 h-full flex flex-col">
            <div className="p-4 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-primary-text flex items-center">
                            <SparklesIcon className="h-5 w-5 mr-2 text-indigo-500" />
                            AI Annual Strategy Planner
                        </h3>
                    </div>
                    {!currentStrategy && (
                        <motion.button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="flex-shrink-0 flex items-center px-3 py-1.5 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-60 btn-gradient"
                        >
                             {isLoading ? (
                                <svg className="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                             ) : <SparklesIcon className="h-4 w-4 mr-1.5" />}
                            {isLoading ? 'Generating...' : 'Generate Strategy'}
                        </motion.button>
                    )}
                </div>
                <div className="flex-grow">
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                             <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center text-secondary-text h-full rounded-lg generating-bg">
                                <p className="font-semibold">Synthesizing annual plan...</p>
                                <p className="text-sm">Gemini is aligning local and international events.</p>
                            </motion.div>
                        ) : error ? (
                             <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-start bg-red-100 text-red-800 p-3 rounded-md">
                                <ExclamationTriangleIcon className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">Strategy Generation Failed</p>
                                    <p className="text-sm">{error}</p>
                                </div>
                            </motion.div>
                        ) : currentStrategy ? (
                            <motion.div key="strategy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 text-sm">
                                <div>
                                    <h4 className="font-bold text-base text-primary-text">{currentStrategy.overarchingTheme}</h4>
                                </div>
                                <div className="space-y-3">
                                    {currentStrategy.quarterlyPlans.map(plan => (
                                        <div key={plan.quarter}>
                                            <p className="font-semibold text-primary-text">{plan.quarter}: <span className="font-normal text-secondary-text">{plan.strategicFocus}</span></p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                             <motion.div key="initial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center text-secondary-text h-full border-2 border-dashed border-border-color rounded-lg p-4">
                                <SparklesIcon className="h-8 w-8 text-slate-400 mb-2" />
                                <h4 className="font-semibold text-primary-text">Generate a Year-Long Marketing Plan</h4>
                                <p className="text-xs mt-1">Click the button to create a harmonized marketing calendar.</p>
                             </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            {currentStrategy && !isLoading && (
                <div className="p-4 border-t border-border-color flex-shrink-0 flex justify-end gap-x-2">
                     <button onClick={handleCopy} className="inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200"><DocumentDuplicateIcon className="h-4 w-4 mr-1.5"/>{copyStatus === 'copied' ? 'Copied' : 'Copy Full Strategy'}</button>
                     <button onClick={handleGenerate} disabled={isLoading} className="inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">Regenerate</button>
                </div>
            )}
        </Card>
    );
};
