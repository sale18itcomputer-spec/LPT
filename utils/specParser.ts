import type { SpecificationBreakdown } from '../types';

const matchAndClean = (spec: string, regex: RegExp, cleanFn?: (match: string) => string): string | undefined => {
    const match = spec.match(regex);
    if (!match || !match[1]) return undefined;
    return cleanFn ? cleanFn(match[1]) : match[1].trim();
}

export const parseSpecification = (spec: string): SpecificationBreakdown => {
    if (!spec) return {};

    const breakdown: SpecificationBreakdown = {};

    // CPU
    const cpuMatch = spec.match(/(Core\s?Ultra\s?(?:5|7|9)[\w\s-]*|Core\s?i[3579][\w\s-]*|i[3579][\w\s-]*|Celeron[\w\s-]*)/i);
    if (cpuMatch) {
        breakdown.cpuModel = cpuMatch[0].replace(/Core™?\s?/, '').trim();
        const modelLower = breakdown.cpuModel.toLowerCase();

        if (modelLower.includes('ultra')) {
            const ultraMatch = modelLower.match(/ultra\s(5|7|9)/);
            if (ultraMatch) {
                breakdown.cpuFamily = `Core Ultra ${ultraMatch[1]}`;
            }
        } else if (modelLower.startsWith('i')) {
            const familyMatch = modelLower.match(/i[3579]/);
            if (familyMatch) {
                breakdown.cpuFamily = `Core ${familyMatch[0].toUpperCase()}`;
            }
        } else if (modelLower.startsWith('celeron')) {
            breakdown.cpuFamily = 'Celeron';
        }
    }

    // GPU
    const gpuMatch = spec.match(/RTX\s?\d{4}\s?\d{1,2}GB|Intel\sUHD\sGraphics|Integrated\sGraphics/i);
    if (gpuMatch) {
        const gpuStr = gpuMatch[0];
        if (gpuStr.toLowerCase().includes('rtx')) breakdown.gpu = 'NVIDIA RTX';
        else breakdown.gpu = 'Intel Integrated';
    }

    // RAM
    breakdown.ramSize = matchAndClean(spec, /(\d{1,2}GB)\s?(?:LPDDR|DDR)/i);

    // Storage
    breakdown.storageSize = matchAndClean(spec, /(\d{3,4}GB|\dTB)\s(?:SSD|Gen4)/i);
    
    // Screen Size
    breakdown.screenSize = matchAndClean(spec, /(\d{2}\.?\d?)"/);

    // Screen Type
    const screenTypeMatch = spec.match(/IPS|OLED/i);
    if(screenTypeMatch) breakdown.screenType = screenTypeMatch[0].toUpperCase();

    // OS
    const osMatch = spec.match(/Win\s?\d{2}|Windows®?\s\d{2}|NoOS/i);
    if(osMatch) {
        const osStr = osMatch[0].toLowerCase();
        if (osStr.includes('win')) breakdown.os = 'Windows';
        else if (osStr.includes('noos')) breakdown.os = 'No OS';
    }

    return breakdown;
};
