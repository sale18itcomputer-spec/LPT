
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Type } from "@google/genai";
import { SparklesIcon, ExclamationTriangleIcon } from '../ui/Icons';
import type { Customer } from '../../types';

interface AIAnalysis {
    customerSummary: string;
    upsellOpportunities: string[];
    retentionStrategy: string;
}

const AIProfileAnalysis: React.FC<{ customer: Customer }> = ({ customer }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);

    const generatePrompt = useCallback(() => {
        const topProducts = Object.entries(
            customer.sales.reduce((acc: Record<string, number>, sale) => {
                acc[sale.modelName] = (acc[sale.modelName] || 0) + sale.totalRevenue;
                return acc;
            }, {} as Record<string, number>)
        )
        .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, revenue]: [string, number]) => `- ${name} ($${revenue.toFixed(0)})`)
        .join('\n');

        return `
You are a senior account manager for Lenovo. Your task is to provide a strategic analysis for a specific customer based on their profile and purchase history.

**Customer Profile:**
- Name: ${customer.name}
- Tier: ${customer.tier}
- Total Revenue: $${customer.totalRevenue.toFixed(2)}
- Total Invoices: ${customer.invoiceCount}
- Days Since Last Purchase: ${customer.daysSinceLastPurchase}
- Top 5 Products by Revenue:
${topProducts}

**Your Task:**
Analyze the customer data and generate a concise, actionable analysis. Return a JSON object that strictly adheres to the provided schema.

- For **customerSummary**, provide a 2-sentence overview of their buying behavior (e.g., "High-value corporate client specializing in premium laptops," or "Frequent small-batch buyer of entry-level notebooks.").
- For **upsellOpportunities**, suggest 2-3 specific, related products or services they haven't purchased yet. Be specific (e.g., "Suggest premium on-site support packages for their Yoga laptops," or "Introduce them to our Legion gaming monitors to complement their gaming laptop purchases.").
- For **retentionStrategy**, propose a concrete action to maintain loyalty. If they are a new customer, suggest a welcome offer. If they are at risk (long time since last purchase), suggest a re-engagement campaign. If they are a loyal customer, suggest exclusive access or a loyalty bonus.
`;
    }, [customer]);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setAnalysis(null);
        
        try {
            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = generatePrompt();

            const schema = {
                type: Type.OBJECT,
                properties: {
                    customerSummary: { type: Type.STRING },
                    upsellOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                    retentionStrategy: { type: Type.STRING }
                },
                required: ["customerSummary", "upsellOpportunities", "retentionStrategy"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { 
                    temperature: 0.6, 
                    responseMimeType: "application/json", 
                    responseSchema: schema 
                }
            });

            setAnalysis(JSON.parse(response.text));

        } catch (err) {
            console.error("Error generating AI profile analysis:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-indigo-50 dark:bg-dark-secondary-bg border border-indigo-200 dark:border-indigo-900/50 rounded-xl p-4 sm:p-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-200 flex items-center">
                    <SparklesIcon className="h-6 w-6 mr-2 text-indigo-500 dark:text-indigo-400" />
                    AI Strategic Advisor
                </h3>
                {!analysis && (
                    <motion.button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-60"
                    >
                         {isLoading ? 'Analyzing...' : 'Generate Analysis'}
                    </motion.button>
                )}
            </div>
            
            <AnimatePresence>
            {(isLoading || error || analysis) && (
                 <motion.div
                    className="overflow-hidden"
                 >
                    {isLoading && (
                        <div className="flex items-center justify-center h-24">
                            <svg className="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center bg-red-100 text-red-800 p-3 rounded-md">
                            <ExclamationTriangleIcon className="h-5 w-5 mr-3" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                    {analysis && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-3">
                                <h4 className="font-semibold text-indigo-900 dark:text-indigo-200">Summary</h4>
                                <p className="text-sm text-indigo-800/80 dark:text-indigo-300/80 mt-1">{analysis.customerSummary}</p>
                            </div>
                             <div>
                                <h4 className="font-semibold text-indigo-900 dark:text-indigo-200">Upsell Opportunities</h4>
                                <ul className="list-disc pl-5 mt-1 space-y-1 text-sm text-indigo-800/80 dark:text-indigo-300/80">
                                    {analysis.upsellOpportunities.map((opp, i) => <li key={i}>{opp}</li>)}
                                </ul>
                            </div>
                            <div className="md:col-span-2">
                                <h4 className="font-semibold text-indigo-900 dark:text-indigo-200">Retention Strategy</h4>
                                <p className="text-sm text-indigo-800/80 dark:text-indigo-300/80 mt-1">{analysis.retentionStrategy}</p>
                            </div>
                        </div>
                    )}
                 </motion.div>
            )}
            </AnimatePresence>
        </div>
    )
};

export default AIProfileAnalysis;
