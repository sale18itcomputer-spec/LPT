
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Type } from "@google/genai";
import { SparklesIcon, ExclamationTriangleIcon, LightBulbIcon, BullseyeIcon, UserGroupIcon, CheckIcon, DocumentDuplicateIcon } from '../ui/Icons';
import type { CustomerSalesOpportunity, AISalesBriefingData, TopOpportunity, CustomerTier } from '../../types';
import TierBadge from '../customers/TierBadge';

const BriefingSection: React.FC<{ icon: React.FC<any>, title: string, children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
    <div>
        <h4 className="font-semibold text-primary-text dark:text-dark-primary-text flex items-center mb-2">
            <Icon className="h-5 w-5 mr-2 text-indigo-500" />
            {title}
        </h4>
        <div className="pl-7 text-sm text-secondary-text dark:text-dark-secondary-text space-y-2">{children}</div>
    </div>
);

interface AISalesBriefingProps {
    customerOpportunities: CustomerSalesOpportunity[];
}

const AISalesBriefing: React.FC<AISalesBriefingProps> = ({ customerOpportunities }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [briefing, setBriefing] = useState<AISalesBriefingData | null>(null);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    const generatePrompt = useCallback(() => {
        const opportunitiesString = customerOpportunities
            .slice(0, 25) // Limit to top 25 to keep prompt size manageable
            .map(co => 
                `- Customer: ${co.customerName} (Tier: ${co.customerTier}, Score: ${co.customerOpportunityScore}, Total Value: $${co.totalOpportunityValue.toFixed(0)}, ${co.opportunityCount} products)`
            )
            .join('\n');

        return `
You are a top-tier sales strategist for a Lenovo electronics retailer in Cambodia. Your task is to analyze a list of sales opportunities and generate a high-level strategic sales briefing for the sales director. The goal is to provide actionable insights to maximize revenue from surplus stock.

**Input Data: Customer Opportunities (Customer, Tier, Opportunity Score, Potential Value, # of Products)**
${opportunitiesString}

**Your Task:**
Generate a JSON object that strictly adheres to the provided schema. The analysis should be sharp, concise, and focused on strategy.

1.  **Overall Strategy:** Provide a 1-2 sentence overarching strategy. (e.g., "Prioritize high-value, high-score Platinum-tier customers for immediate outreach, followed by a targeted email campaign to Gold-tier clients with bundle offers.").
2.  **Top Opportunities:** Identify the **three most promising individual opportunities**. For each, specify the customer, their tier, the product, and a compelling, one-sentence **reasoning** for why it's a top opportunity (e.g., "High-value product, recent purchase history, and Platinum tier status indicate strong buying intent.").
3.  **Recommended Tactic:** Suggest one concrete, creative sales tactic to implement this week. (e.g., "Launch a 'Loyalty Flash Sale' for Gold and Platinum customers, offering an exclusive 15% discount on their specific opportunity products, valid for 72 hours.").
`;
    }, [customerOpportunities]);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setBriefing(null);
        try {
            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = generatePrompt();
            
            const schema = {
                type: Type.OBJECT,
                properties: {
                    overallStrategy: { type: Type.STRING },
                    topOpportunities: { 
                        type: Type.ARRAY, 
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                customerName: { type: Type.STRING },
                                customerTier: { type: Type.STRING },
                                modelName: { type: Type.STRING },
                                mtm: { type: Type.STRING },
                                reasoning: { type: Type.STRING }
                            },
                             required: ["customerName", "customerTier", "modelName", "mtm", "reasoning"]
                        }
                    },
                    recommendedTactic: { type: Type.STRING }
                },
                required: ["overallStrategy", "topOpportunities", "recommendedTactic"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { 
                    temperature: 0.7, 
                    responseMimeType: "application/json", 
                    responseSchema: schema 
                }
            });
            
            setBriefing(JSON.parse(response.text));
        } catch (err) {
            console.error("Error generating sales briefing:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (!briefing) return;
        const text = `
## AI Sales Briefing

### Overall Strategy
${briefing.overallStrategy}

### Top Opportunities
${briefing.topOpportunities.map(op => `- **${op.customerName} (${op.customerTier}) - ${op.modelName}**: ${op.reasoning}`).join('\n')}

### Recommended Tactic
${briefing.recommendedTactic}
        `.trim();
        navigator.clipboard.writeText(text).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        });
    };

    return (
        <div className="bg-indigo-50/70 dark:bg-dark-secondary-bg/50 border border-indigo-200 dark:border-indigo-900/50 rounded-xl p-4 sm:p-6 h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-200 flex items-center">
                        <SparklesIcon className="h-6 w-6 mr-2" />
                        AI Sales Briefing
                    </h3>
                    <p className="text-sm text-indigo-800/80 dark:text-indigo-300/80 mt-1">Strategic insights based on current opportunities.</p>
                </div>
                {!briefing && (
                     <motion.button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="flex-shrink-0 flex items-center px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-60"
                    >
                        {isLoading ? 'Analyzing...' : 'Generate'}
                    </motion.button>
                )}
            </div>

            <div className="flex-grow">
                <AnimatePresence>
                {(isLoading || error || briefing) && (
                    <motion.div
                        className="overflow-hidden"
                    >
                        {isLoading && <div className="text-center p-8 text-indigo-700">Analyzing opportunities...</div>}
                        {error && <div className="flex items-center bg-red-100 text-red-800 p-3 rounded-md"><ExclamationTriangleIcon className="h-5 w-5 mr-3" /><p className="text-sm">{error}</p></div>}
                        {briefing && (
                            <div className="space-y-4">
                                <BriefingSection icon={BullseyeIcon} title="Overall Strategy">
                                    <p>{briefing.overallStrategy}</p>
                                </BriefingSection>
                                <BriefingSection icon={UserGroupIcon} title="Top Opportunities">
                                    <ul className="space-y-3">
                                        {briefing.topOpportunities.map((op, i) => (
                                            <li key={i}>
                                                <div className="flex items-center gap-x-2">
                                                    <p className="font-semibold text-primary-text dark:text-dark-primary-text">{op.customerName}</p>
                                                    <TierBadge tier={op.customerTier} />
                                                </div>
                                                <p className="italic">"{op.reasoning}"</p>
                                            </li>
                                        ))}
                                    </ul>
                                </BriefingSection>
                                <BriefingSection icon={LightBulbIcon} title="Recommended Tactic">
                                    <p>{briefing.recommendedTactic}</p>
                                </BriefingSection>
                            </div>
                        )}
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
            
            {briefing && (
                <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-900/50 flex justify-end gap-x-2">
                     <button onClick={handleCopy} className="inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200"><DocumentDuplicateIcon className="h-4 w-4 mr-1.5"/>{copyStatus === 'copied' ? 'Copied' : 'Copy Briefing'}</button>
                     <button onClick={handleGenerate} disabled={isLoading} className="inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">{isLoading ? '...' : 'Regenerate'}</button>
                </div>
            )}
        </div>
    );
};

export default AISalesBriefing;
