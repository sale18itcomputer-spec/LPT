

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// @google/genai-sdk fix: Updated import from "@google/ai" to "@google/genai" to use the correct library.
import { GoogleGenAI, Type } from "@google/genai";
import { XMarkIcon, SparklesIcon, DocumentDuplicateIcon, CheckIcon, LightBulbIcon, ChatBubbleLeftRightIcon, EnvelopeIcon, DocumentTextIcon, ExclamationTriangleIcon } from '../ui/Icons';
import ModalPanel from '../ui/ModalPanel';
import type { SalesOpportunity, CustomerTier } from '../../types';

interface SalesPlaybook {
    summary: string;
    emailDraft: string;
    talkingPoints: string[];
    promotionIdea: string;
}

interface SalesPlaybookModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: SalesOpportunity | SalesOpportunity[] | null;
}

type CopyStatus = 'idle' | 'copied';
interface CopyStates {
    email: CopyStatus;
    points: CopyStatus;
    idea: CopyStatus;
}

const PlaybookSection: React.FC<{ icon: React.ReactNode, title: string, children: React.ReactNode, onCopy?: () => void, copyStatus?: 'idle' | 'copied' }> = 
({ icon, title, children, onCopy, copyStatus }) => (
    <div className="bg-gray-50/70 p-4 rounded-lg border border-border-color">
        <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-primary-text flex items-center">
                {icon}
                {title}
            </h4>
            {onCopy && (
                 <motion.button
                    onClick={onCopy}
                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 disabled:opacity-50"
                >
                    {copyStatus === 'copied' ? <CheckIcon className="h-4 w-4 mr-1.5"/> : <DocumentDuplicateIcon className="h-4 w-4 mr-1.5" />}
                    {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
                </motion.button>
            )}
        </div>
        {children}
    </div>
);

const SalesPlaybookModal: React.FC<SalesPlaybookModalProps> = ({ isOpen, onClose, opportunity }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [playbook, setPlaybook] = useState<SalesPlaybook | null>(null);
    const [copyStates, setCopyStates] = useState<CopyStates>({ email: 'idle', points: 'idle', idea: 'idle' });

    const generatePrompt = (op: SalesOpportunity | SalesOpportunity[]) => {
        const isBulk = Array.isArray(op);
        const customerTier = isBulk ? (op as SalesOpportunity[])[0].customerTier : (op as SalesOpportunity).customerTier;

        const commonHeader = `You are an expert sales strategist for a major electronics retailer like Lenovo. Your task is to analyze a specific sales opportunity and generate a concise "Sales Playbook" to help a sales representative close the deal. Return a JSON object that strictly adheres to the provided schema. The playbook should be professional, insightful, and actionable.

**CRITICAL INSTRUCTION:** Tailor the tone and offer based on the customer's tier (${customerTier}).
- **For Platinum/Gold Tiers:** Use a consultative, partnership-focused tone. Offers should feel exclusive (e.g., 'early access', 'private discount', 'loyalty bonus').
- **For Silver/Bronze Tiers:** Use a clear, value-oriented tone. Offers should be direct and compelling (e.g., 'limited-time 15% discount', 'special bundle deal').`;

        if (isBulk) {
            const opportunities = op as SalesOpportunity[];
            const firstOp = opportunities[0];
            const productList = opportunities.map(o => `- ${o.modelName} (MTM: ${o.mtm}) - previously purchased ${o.customerPastUnits} units.`).join('\n');
            
            return `
${commonHeader}

**Opportunity Details (Bulk):**
- Customer Name: ${firstOp.customerName}
- Customer Tier: ${firstOp.customerTier}
- The customer has previously purchased the following products, which you now have surplus stock of:
${productList}

**Your Task:**
Generate a JSON object for a playbook targeting this customer with all these products. The email should be cohesive, mentioning that several items of interest are back in stock. The talking points should focus on the overall value and convenience. The promotion idea should be a bundle offer.
`;
        } else {
            const singleOp = op as SalesOpportunity;
            const { customerName, customerTier, modelName, mtm, inStockQty, customerPastUnits, customerLastPurchaseDate } = singleOp;
            let lastPurchaseString = customerLastPurchaseDate 
                ? `Their last purchase of this item was on ${new Date(customerLastPurchaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`
                : 'They have purchased this item in the past.';

            return `
${commonHeader}

**Opportunity Details (Single):**
- Customer Name: ${customerName}
- Customer Tier: ${customerTier}
- Product Model Name: ${modelName}
- Product MTM: ${mtm}
- Current Surplus Stock: ${inStockQty} units
- Past Purchase Volume: The customer has purchased ${customerPastUnits} units of this product before.
- Last Purchase Date: ${lastPurchaseString}

**Your Task:**
Generate a JSON object for a playbook targeting this specific product opportunity.
`;
        }
    };

    const generatePlaybook = useCallback(async () => {
        if (!opportunity) return;

        setIsLoading(true);
        setError(null);
        setPlaybook(null);

        try {
            if (!process.env.API_KEY) {
                throw new Error("API key is not configured.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = generatePrompt(opportunity);
            
            const schema = {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "A 1-2 sentence executive summary of the opportunity." },
                    emailDraft: { type: Type.STRING, description: "A ready-to-send, professional email draft. Address the customer by name. Do not include placeholders like '[Your Name]'." },
                    talkingPoints: { 
                        type: Type.ARRAY, 
                        description: "An array of 3-4 bullet points for a sales call.",
                        items: { type: Type.STRING }
                    },
                    promotionIdea: { type: Type.STRING, description: "A specific, creative promotion idea (e.g., bundle offer, volume discount)." }
                },
                required: ["summary", "emailDraft", "talkingPoints", "promotionIdea"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                 config: {
                    temperature: 0.7,
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            });
            
            setPlaybook(JSON.parse(response.text));

        } catch (err) {
            console.error("Error generating playbook:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [opportunity]);

    useEffect(() => {
        if (isOpen && opportunity) {
            generatePlaybook();
        } else if (!isOpen) {
            // Reset state when modal is closed
            setPlaybook(null);
            setError(null);
            setIsLoading(false);
        }
    }, [isOpen, opportunity, generatePlaybook]);

    const handleCopy = (type: keyof CopyStates, content: string) => {
        navigator.clipboard.writeText(content).then(() => {
            setCopyStates(prev => ({ ...prev, [type]: 'copied' }));
            setTimeout(() => setCopyStates(prev => ({ ...prev, [type]: 'idle' })), 2000);
        });
    };

    const customerName = Array.isArray(opportunity) ? opportunity[0]?.customerName : opportunity?.customerName;

    return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <ModalPanel className="w-full max-w-3xl">
              <div className="flex justify-between items-start p-4 border-b border-border-color bg-gray-50 flex-shrink-0">
                <div>
                    <h2 className="text-lg font-semibold text-primary-text flex items-center">
                    <SparklesIcon className="h-5 w-5 mr-2 text-indigo-500" />
                    AI Sales Playbook
                    </h2>
                    <p className="text-sm text-secondary-text">For: {customerName}</p>
                </div>
                <motion.button onClick={onClose} className="p-1 rounded-full text-secondary-text hover:bg-highlight-hover">
                  <XMarkIcon className="h-6 w-6" />
                </motion.button>
              </div>
              
              <div className="p-4 sm:p-6 flex-grow overflow-y-auto min-h-0">
                {isLoading && (
                     <div className="flex flex-col items-center justify-center text-center text-secondary-text h-64">
                        <SparklesIcon className="h-10 w-10 animate-pulse text-indigo-400" />
                        <p className="mt-4 font-medium text-lg">Generating your sales playbook...</p>
                        <p className="text-sm">Analyzing customer history and stock levels.</p>
                    </div>
                )}
                {error && (
                    <div className="flex items-center bg-red-50 text-red-700 p-4 rounded-lg">
                        <ExclamationTriangleIcon className="h-6 w-6 mr-3 flex-shrink-0" />
                        <div>
                            <p className="font-semibold">Playbook Generation Failed</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}
                {playbook && !isLoading && (
                    <div className="space-y-4">
                        <PlaybookSection icon={<DocumentTextIcon className="h-5 w-5 mr-2" />} title="Executive Summary">
                            <p className="text-sm text-secondary-text">{playbook.summary}</p>
                        </PlaybookSection>

                        <PlaybookSection 
                            icon={<EnvelopeIcon className="h-5 w-5 mr-2" />} 
                            title="Email Draft" 
                            onCopy={() => handleCopy('email', playbook.emailDraft)} 
                            copyStatus={copyStates.email}
                        >
                            <p className="text-sm text-secondary-text whitespace-pre-wrap">{playbook.emailDraft}</p>
                        </PlaybookSection>

                        <PlaybookSection 
                            icon={<ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />} 
                            title="Talking Points"
                            onCopy={() => handleCopy('points', playbook.talkingPoints.join('\n'))}
                            copyStatus={copyStates.points}
                        >
                            <ul className="list-disc pl-5 space-y-1 text-sm text-secondary-text">
                                {playbook.talkingPoints.map((point, i) => <li key={i}>{point}</li>)}
                            </ul>
                        </PlaybookSection>
                        
                         <PlaybookSection 
                            icon={<LightBulbIcon className="h-5 w-5 mr-2" />} 
                            title="Promotion Idea"
                            onCopy={() => handleCopy('idea', playbook.promotionIdea)}
                            copyStatus={copyStates.idea}
                        >
                            <p className="text-sm text-secondary-text">{playbook.promotionIdea}</p>
                        </PlaybookSection>
                    </div>
                )}
              </div>

               {(playbook || error) && !isLoading && (
                <div className="p-4 bg-gray-50 border-t border-border-color text-right flex-shrink-0">
                    <motion.button
                        onClick={generatePlaybook}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md"
                    >
                        Regenerate
                    </motion.button>
                </div>
               )}
          </ModalPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SalesPlaybookModal;
