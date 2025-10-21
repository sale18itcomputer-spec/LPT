

import React, { useState, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'framer-motion';
import Card from './ui/Card';
import { 
    LinkIcon, ExclamationTriangleIcon, SparklesIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
    // FIX: Add missing NewspaperIcon import
    NewspaperIcon, ChatBubbleLeftRightIcon, BuildingStorefrontIcon, CpuChipIcon, ScaleIcon,
    // FIX: Add missing LightBulbIcon and GlobeAltIcon imports
    LightBulbIcon, GlobeAltIcon, UserGroupIcon, DocumentTextIcon
} from './ui/Icons';
import Skeleton from './ui/Skeleton';

type BriefingType = 'competitor' | 'product' | 'market';
interface Source {
    uri: string;
    title: string;
}

// Internal component to display structured briefing results
const getIconForTitle = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('summary')) return DocumentTextIcon;
    if (lowerTitle.includes('strength')) return ArrowTrendingUpIcon;
    if (lowerTitle.includes('weakness')) return ArrowTrendingDownIcon;
    if (lowerTitle.includes('activities') || lowerTitle.includes('news') || lowerTitle.includes('overview')) return NewspaperIcon;
    if (lowerTitle.includes('sentiment') || lowerTitle.includes('criticism')) return ChatBubbleLeftRightIcon;
    if (lowerTitle.includes('positioning')) return BuildingStorefrontIcon;
    if (lowerTitle.includes('features') || lowerTitle.includes('praise')) return CpuChipIcon;
    if (lowerTitle.includes('comparison')) return ScaleIcon;
    if (lowerTitle.includes('drivers')) return ArrowTrendingUpIcon;
    if (lowerTitle.includes('players')) return UserGroupIcon;
    if (lowerTitle.includes('outlook')) return GlobeAltIcon;
    return LightBulbIcon;
};

const BriefingMarkdownParser: React.FC<{ text: string }> = ({ text }) => {
    const elements = text.split('\n').map((line, i) => {
        if (line.startsWith('- ') || line.startsWith('* ')) {
            const content = line.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            return <li key={i} className="ml-4" dangerouslySetInnerHTML={{ __html: content }}></li>;
        }
        if (line.trim() === '') return null;
        const content = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <p key={i} dangerouslySetInnerHTML={{ __html: content }}></p>;
    }).filter(Boolean);

    return <>{elements}</>;
};

const BriefingDisplay: React.FC<{ briefingText: string }> = ({ briefingText }) => {
    const sections = useMemo(() => {
        if (!briefingText) return [];
        return briefingText.split(/\n## /).map(section => {
            const parts = section.split('\n');
            const title = parts[0].replace('## ', '').trim();
            const content = parts.slice(1).join('\n').trim();
            return { title, content };
        }).filter(s => s.title && s.content);
    }, [briefingText]);

    if (sections.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((section, index) => {
                const Icon = getIconForTitle(section.title);
                return (
                    <div
                        key={section.title}
                        className="bg-slate-50 dark:bg-dark-secondary-bg/50 border border-border-color dark:border-dark-border-color rounded-lg p-4"
                    >
                        <h4 className="font-semibold text-primary-text dark:text-dark-primary-text flex items-center mb-2">
                            <Icon className="h-5 w-5 mr-2 text-highlight" />
                            {section.title}
                        </h4>
                        <div className="text-sm text-secondary-text dark:text-dark-secondary-text space-y-2 prose prose-sm max-w-none">
                            <BriefingMarkdownParser text={section.content} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


// Main Component
const BriefingTab: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`relative py-2 px-4 text-sm font-medium transition-colors ${isActive ? 'text-highlight' : 'text-secondary-text dark:text-dark-secondary-text hover:text-primary-text dark:hover:text-dark-primary-text'}`}
    >
        {label}
        {isActive && <motion.div layoutId="briefing-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-highlight" />}
    </button>
);

const getPrompt = (type: BriefingType, query: string): string => {
    switch (type) {
        case 'competitor':
            return `Analyze the competitor "${query}". Use Google Search for the latest information. Provide a detailed report formatted with clear markdown headings for the following sections: '## Summary', '## Recent Activities & News', '## Key Strengths', '## Potential Weaknesses', and '## Customer Sentiment'.`;
        case 'product':
            return `Analyze the product "${query}". Use Google Search for recent reviews and articles. Provide a detailed report formatted with clear markdown headings for the following sections: '## Market Positioning', '## Key Features & Praise', '## Common Criticisms', and '## Competitor Comparison'.`;
        case 'market':
            return `Analyze the market trend for "${query}". Use Google Search for the latest data and reports. Provide a detailed report formatted with clear markdown headings for the following sections: '## Trend Overview', '## Key Market Drivers', '## Major Players', and '## Future Outlook'.`;
    }
};

const getPlaceholder = (type: BriefingType): string => {
    switch (type) {
        case 'competitor': return "e.g., ASUS in Cambodia";
        case 'product': return "e.g., Lenovo Yoga Slim 7i";
        case 'market': return "e.g., AI PCs in Southeast Asia";
    }
}

const MarketIntelligence: React.FC = () => {
    const [activeTab, setActiveTab] = useState<BriefingType>('competitor');
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [briefingText, setBriefingText] = useState<string>('');
    const [sources, setSources] = useState<Source[]>([]);

    const handleSearch = async () => {
        if (!query.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        setBriefingText('');
        setSources([]);
        
        try {
            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = getPrompt(activeTab, query);
            
            // @google/genai-sdk fix: Use new ai.models.generateContentStream API and specify Google Search tool
            const streamResult = await ai.models.generateContentStream({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { tools: [{ googleSearch: {} }] },
            });

            let fullText = '';
            let collectedGroundingChunks: any[] = [];
            
            for await (const chunk of streamResult) {
                // @google/genai-sdk fix: Access text output correctly from the response object.
                fullText += chunk.text;
                setBriefingText(fullText);

                // @google/genai-sdk fix: Use new groundingMetadata structure
                if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                    collectedGroundingChunks.push(...chunk.candidates[0].groundingMetadata.groundingChunks);
                }
            }
            
            const fetchedSources: Source[] = collectedGroundingChunks
                .map((chunk: any) => chunk.web)
                .filter((web: any): web is Source => web && web.uri && web.title)
                .reduce((acc: Source[], current: Source) => {
                    if (!acc.some(item => item.uri === current.uri)) acc.push(current);
                    return acc;
                }, []);
            
            setSources(fetchedSources);
        } catch (err) {
            console.error("Error fetching market intelligence:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const hasResult = briefingText || sources.length > 0;

    const InitialState = () => (
        <div className="text-center py-8">
            <div className="flex justify-center items-center">
                <SparklesIcon className="h-12 w-12 text-indigo-300" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-primary-text">Strategic Briefing Center</h3>
            <p className="mt-1 text-sm text-secondary-text">Select a briefing type, enter your query, and let Gemini analyze the market for you.</p>
        </div>
    );

    const LoadingState = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-center text-sm text-secondary-text mb-4">
                <svg className="animate-spin h-5 w-5 mr-3 text-highlight" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Gemini is preparing your briefing...
            </div>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div><Skeleton className="h-24 w-full" /></div>
                    <div><Skeleton className="h-24 w-full" /></div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><Skeleton className="h-24 w-full" /></div>
                    <div><Skeleton className="h-24 w-full" /></div>
                </div>
            </div>
        </motion.div>
    );

    return (
        <Card>
            <div className="p-4 sm:p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-semibold text-primary-text">Market Intelligence</h3>
                        <p className="text-sm text-secondary-text">Generate strategic briefings on competitors, products, and market trends.</p>
                    </div>
                </div>

                <div className="mt-4 border-b border-border-color">
                    <div className="flex items-center gap-x-2">
                        <BriefingTab label="Competitor Snapshot" isActive={activeTab === 'competitor'} onClick={() => { setActiveTab('competitor'); setQuery(''); }} />
                        <BriefingTab label="Product Deep Dive" isActive={activeTab === 'product'} onClick={() => { setActiveTab('product'); setQuery(''); }} />
                        <BriefingTab label="Market Trends" isActive={activeTab === 'market'} onClick={() => { setActiveTab('market'); setQuery(''); }} />
                    </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="mt-4 flex items-center gap-x-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={getPlaceholder(activeTab)}
                        className="w-full bg-secondary-bg dark:bg-dark-primary-bg border border-border-color dark:border-dark-border-color rounded-lg py-2.5 px-4 text-primary-text dark:text-dark-primary-text placeholder-secondary-text dark:placeholder-dark-secondary-text focus:outline-none focus:ring-2 focus:ring-highlight focus:shadow-inner"
                        disabled={isLoading}
                    />
                    <motion.button
                        type="submit"
                        disabled={isLoading || !query.trim()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2.5 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-x-2 btn-gradient"
                        aria-label="Analyze"
                    >
                        <SparklesIcon className="h-5 w-5" />
                        <span>Analyze</span>
                    </motion.button>
                </form>

                <div className="mt-6 min-h-[200px]">
                    <AnimatePresence mode="wait">
                        {isLoading ? <LoadingState key="loading" /> :
                         error ? (
                            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-start bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md">
                                <ExclamationTriangleIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">Analysis Failed</p>
                                    <p className="text-sm">{error}</p>
                                </div>
                            </motion.div>
                         ) : hasResult ? (
                            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                                <div>
                                    <BriefingDisplay briefingText={briefingText} />
                                    {isLoading && briefingText && <span className="inline-block w-2 h-5 bg-highlight pulse-block-cursor ml-1 align-bottom"></span>}
                                </div>
                                
                                {!isLoading && sources.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-primary-text mb-2">Sources</h4>
                                        <ul className="space-y-2">
                                            {sources.map((source, index) => (
                                                <motion.li 
                                                    key={index}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.1 }}
                                                >
                                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="block p-2 rounded-md bg-slate-50 dark:bg-dark-secondary-bg/50 hover:bg-slate-100 dark:hover:bg-dark-secondary-bg group transition-colors" title={source.title}>
                                                        <p className="font-semibold text-highlight group-hover:underline truncate text-sm">{source.title}</p>
                                                        <p className="text-xs text-secondary-text truncate">{source.uri}</p>
                                                    </a>
                                                </motion.li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </motion.div>
                         ) : <InitialState key="initial" />}
                    </AnimatePresence>
                </div>
            </div>
        </Card>
    );
};

export default MarketIntelligence;