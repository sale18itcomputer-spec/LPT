

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";
import ModalPanel from '../ui/ModalPanel';
import { XMarkIcon, SparklesIcon, ExclamationTriangleIcon, ArrowLongRightIcon, LinkIcon } from '../ui/Icons';
import type { AugmentedMtmGroup } from './PriceListPage';
import Skeleton from '../ui/Skeleton';

interface SuggestedPrice {
    suggested_sdp: number;
    suggested_srp: number;
    reasoning: string;
}

interface Source {
    uri: string;
    title: string;
}

interface AIPricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: AugmentedMtmGroup | null;
    onApply: (mtm: string, sdp: number, srp: number) => void;
    userRole: string;
}

const PriceBox: React.FC<{ label: string; value: number; isSuggestion?: boolean }> = ({ label, value, isSuggestion = false }) => (
    <div className={`p-4 rounded-lg border text-center ${isSuggestion ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-dark-secondary-bg/30 border-gray-200 dark:border-dark-border-color'}`}>
        <p className="text-sm text-secondary-text dark:text-dark-secondary-text">{label}</p>
        <p className={`text-2xl font-bold ${isSuggestion ? 'text-highlight' : 'text-primary-text dark:text-dark-primary-text'}`}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}</p>
    </div>
);

const LoadingState: React.FC = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4">
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-20" /><Skeleton className="h-20" />
            </div>
            <ArrowLongRightIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-20" /><Skeleton className="h-20" />
            </div>
        </div>
        <div>
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-16 w-full mt-2" />
        </div>
        <div>
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-8 w-full mt-2" />
            <Skeleton className="h-8 w-full mt-2" />
        </div>
    </div>
);


const AIPricingModal: React.FC<AIPricingModalProps> = ({ isOpen, onClose, item, onApply, userRole }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestion, setSuggestion] = useState<SuggestedPrice | null>(null);
    const [sources, setSources] = useState<Source[]>([]);

    const generateSuggestion = useCallback(async () => {
        if (!item) return;
        setIsLoading(true);
        setError(null);
        setSuggestion(null);
        setSources([]);
        try {
            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
You are an expert pricing strategist for Lenovo's Cambodian domestic market. Your goal is to suggest an optimal Suggested Dealer Price (SDP) and Suggested Retail Price (SRP) for a product. Your recommendations must be based on real-time competitor pricing and our internal data.

**Analysis Task:**

1.  **Research Competitors (MANDATORY):** Use Google Search to find current retail prices for the **"${item.modelName}" (MTM: ${item.mtm})** and its direct competitors **specifically in Cambodia**. Analyze its specifications to make relevant comparisons.

2.  **Analyze Internal Data:**
    ${userRole === 'Admin' ? `- **Average Landing Cost (our cost): $${item.averageLandingCost.toFixed(2)}**` : ''}
    - On-Hand Stock: ${item.onHandQty} units
    - Weeks of Inventory: ${item.weeksOfInventory === null ? 'N/A (No sales history)' : `${item.weeksOfInventory} weeks`}
    - 90-Day Sales Velocity: ${item.sales90d} units sold

3.  **Synthesize & Recommend:** Based on both market research and internal data, recommend an optimal SDP and SRP.
    ${userRole === 'Admin' ? `- The SDP **must** ensure a healthy profit margin over our **Average Landing Cost**.` : ''}
    - The SRP must be competitive in the Cambodian market while offering an attractive margin to dealers (the difference between SRP and SDP).
    - Round prices to psychologically appealing numbers (e.g., ending in 5, 8, or 9).

4.  **Provide Reasoning:** Explain your reasoning in **one concise sentence**, referencing both market conditions (e.g., competitor prices) and our internal stock/sales situation (e.g., slow-moving, high demand).

5.  **Format Output:** Return your response as a **single, valid JSON object** with no other text, markdown, or formatting. The JSON object must have this exact structure: \`{"suggested_sdp": <number>, "suggested_srp": <number>, "reasoning": "<string>"}\`.
`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    temperature: 0.5,
                    tools: [{ googleSearch: {} }],
                },
            });
            
            const text = response.text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                setSuggestion(JSON.parse(jsonMatch[0]));
            } else {
                throw new Error("AI did not return a valid JSON object in its response.");
            }
            
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks) {
                const fetchedSources: Source[] = groundingChunks
                    .map((chunk: any) => chunk.web)
                    .filter((web: any): web is Source => web && web.uri && web.title)
                    .reduce((acc: Source[], current: Source) => {
                        if (!acc.some(item => item.uri === current.uri)) {
                            acc.push(current);
                        }
                        return acc;
                    }, []);
                setSources(fetchedSources);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [item, userRole]);
    
    useEffect(() => {
        if (isOpen && item) {
            generateSuggestion();
        }
    }, [isOpen, item, generateSuggestion]);
    
    const handleApply = () => {
        if(item && suggestion) {
            onApply(item.mtm, suggestion.suggested_sdp, suggestion.suggested_srp);
            onClose();
        }
    };
    
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <ModalPanel className="w-full max-w-2xl">
                        <div className="flex justify-between items-start p-4 border-b border-border-color dark:border-dark-border-color flex-shrink-0">
                            <div>
                                <h2 className="text-lg font-semibold text-primary-text dark:text-dark-primary-text flex items-center">
                                    <SparklesIcon className="h-5 w-5 mr-2 text-highlight" />
                                    AI Price Suggestion
                                </h2>
                                <p className="text-sm text-secondary-text dark:text-dark-secondary-text">{item?.modelName} ({item?.mtm})</p>
                            </div>
                            <button onClick={onClose} className="p-1 rounded-full text-secondary-text dark:text-dark-secondary-text hover:bg-gray-100 dark:hover:bg-dark-secondary-bg"><XMarkIcon className="h-6 w-6" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-grow min-h-0">
                            {isLoading && <LoadingState />}
                            {error && (
                                <div className="flex items-start bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md">
                                    <ExclamationTriangleIcon className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold">Analysis Failed</p>
                                        <p className="text-sm">{error}</p>
                                    </div>
                                </div>
                            )}
                            {suggestion && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <PriceBox label="Current SDP" value={item?.sdp || 0} />
                                            <PriceBox label="Current SRP" value={item?.srp || 0} />
                                        </div>
                                        <ArrowLongRightIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <PriceBox label="Suggested SDP" value={suggestion.suggested_sdp} isSuggestion />
                                            <PriceBox label="Suggested SRP" value={suggestion.suggested_srp} isSuggestion />
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-primary-text dark:text-dark-primary-text">Reasoning</h4>
                                        <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1 p-3 bg-gray-50 dark:bg-dark-secondary-bg/30 border border-border-color dark:border-dark-border-color rounded-lg italic">"{suggestion.reasoning}"</p>
                                    </div>
                                     {sources.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-primary-text dark:text-dark-primary-text">Sources</h4>
                                            <ul className="mt-2 space-y-2 text-sm">
                                                {sources.map((source, index) => (
                                                    <motion.li 
                                                        key={index}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.1 }}
                                                    >
                                                        <a 
                                                            href={source.uri} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="flex items-center p-2 rounded-md bg-gray-100 dark:bg-dark-secondary-bg/50 hover:bg-gray-200 dark:hover:bg-dark-secondary-bg group transition-colors"
                                                            title={source.title}
                                                        >
                                                            <LinkIcon className="h-4 w-4 mr-2 flex-shrink-0 text-secondary-text dark:text-dark-secondary-text" />
                                                            <span className="truncate text-highlight group-hover:underline">{source.title}</span>
                                                        </a>
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-dark-secondary-bg/50 border-t border-border-color dark:border-dark-border-color flex justify-end gap-3 flex-shrink-0">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-border-color dark:border-dark-border-color bg-secondary-bg dark:bg-dark-secondary-bg hover:bg-gray-100 dark:hover:bg-dark-primary-bg">Cancel</button>
                            <button
                                onClick={handleApply}
                                disabled={!suggestion || isLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-highlight rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                Apply Suggestions
                            </button>
                        </div>
                    </ModalPanel>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AIPricingModal;