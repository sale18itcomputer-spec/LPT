
import type { Order, Sale, BackorderRecommendation, InventoryItem, PromotionCandidate, SerializedItem, SpecificationBreakdown } from '../types';

export const calculateInventoryStatus = (allOrders: Order[], allSales: Sale[], allSerializedItems: SerializedItem[]): Map<string, any> => {
    // 1. Build a map to track which order lines (SO + MTM) have arrived.
    const orderArrivalStatus = new Map<string, boolean>();
    allOrders.forEach(order => {
        if (order.actualArrival) {
            const key = `${order.salesOrder}-${order.mtm}`;
            orderArrivalStatus.set(key, true);
        }
    });
    
    // 2. Aggregate order data by MTM
    // FIX: Explicitly type the value of the map to include optional `parsedSpecification`.
    const inventoryMap = new Map<string, { mtm: string; modelName: string; arrivedQty: number; totalLandingValue: number; totalFobValue: number; shippedQty: number; lastArrivalDate?: string; parsedSpecification?: SpecificationBreakdown; }>();
    allOrders.forEach(order => {
        if (!inventoryMap.has(order.mtm)) {
            // FIX: Pass parsedSpecification from the order to the inventory map.
            inventoryMap.set(order.mtm, { mtm: order.mtm, modelName: order.modelName, arrivedQty: 0, totalLandingValue: 0, totalFobValue: 0, shippedQty: 0, parsedSpecification: order.parsedSpecification });
        }
        const item = inventoryMap.get(order.mtm)!;
        item.shippedQty += order.qty;
        item.totalLandingValue += (order.landingCostUnitPrice * order.qty);
        item.totalFobValue += order.orderValue;
        if (order.actualArrival) {
            item.arrivedQty += order.qty;
            if (!item.lastArrivalDate || order.actualArrival > item.lastArrivalDate) {
                item.lastArrivalDate = order.actualArrival;
            }
        }
    });

    // 3. Aggregate sales and serialization data
    const salesMap = new Map<string, number>();
    allSales.forEach(sale => { salesMap.set(sale.lenovoProductNumber, (salesMap.get(sale.lenovoProductNumber) || 0) + sale.quantity); });
    
    const soldSerialsSet = new Set(allSales.map(sale => sale.serialNumber));
    
    // 4. Categorize all serialized items into 'arrived' or 'otw' buckets by MTM.
    const serialsByMtm = new Map<string, { arrived: SerializedItem[], otw: SerializedItem[] }>();
    allSerializedItems.forEach(item => {
        if (!serialsByMtm.has(item.mtm)) {
            serialsByMtm.set(item.mtm, { arrived: [], otw: [] });
        }
        const key = `${item.salesOrder}-${item.mtm}`;
        if (orderArrivalStatus.has(key)) {
            serialsByMtm.get(item.mtm)!.arrived.push(item);
        } else {
            serialsByMtm.get(item.mtm)!.otw.push(item);
        }
    });

    // 5. Calculate final inventory metrics for each MTM
    const finalInventory = new Map<string, any>();
    inventoryMap.forEach((item, mtm) => {
        const totalSoldQty = salesMap.get(mtm) || 0;
        
        const mtmSerials = serialsByMtm.get(mtm) || { arrived: [], otw: [] };
        
        // On Hand quantity is ONLY unsold serials from ARRIVED shipments.
        const onHandQty = mtmSerials.arrived.filter(s => !soldSerialsSet.has(s.fullSerializedString)).length;

        const totalArrivedSerializedQty = mtmSerials.arrived.length;
        const totalOtwSerializedQty = mtmSerials.otw.length;
        const totalSerializedQty = totalArrivedSerializedQty + totalOtwSerializedQty;

        const theoreticalArrivedStock = item.arrivedQty - totalSoldQty;
        
        // Unaccounted stock is the difference between theoretical arrived stock and physical (arrived & serialized) on-hand stock.
        const unaccountedStockQty = theoreticalArrivedStock - onHandQty;

        finalInventory.set(mtm, { 
            ...item,
            totalShippedQty: item.shippedQty,
            totalArrivedQty: item.arrivedQty,
            totalSoldQty,
            totalSerializedQty,
            totalArrivedSerializedQty, // New field
            totalOtwSerializedQty,
            onHandQty, // New calculation
            unaccountedStockQty, // New calculation
            averageLandingCost: item.shippedQty > 0 ? item.totalLandingValue / item.shippedQty : 0,
            averageFobCost: item.shippedQty > 0 ? item.totalFobValue / item.shippedQty : 0,
        });
    });
    return finalInventory;
};

export const getFirstOrderDates = (allOrders: Order[]): Map<string, string> => {
    const firstOrderDateMap = new Map<string, string>();
    allOrders.forEach(order => {
        if (order.dateIssuePI) {
            if (!firstOrderDateMap.has(order.mtm) || order.dateIssuePI < firstOrderDateMap.get(order.mtm)!) {
                firstOrderDateMap.set(order.mtm, order.dateIssuePI);
            }
        }
    });
    return firstOrderDateMap;
};

export const getSalesMetricsByMtm = (allSales: Sale[]): Map<string, { last30: number; prev30: number; total90: number; affectedCustomers: Set<string> }> => {
    const metricsMap = new Map<string, { last30: number; prev30: number; total90: number; affectedCustomers: Set<string> }>();
    const now = new Date();
    const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));
    const sixtyDaysAgo = new Date(new Date().setDate(now.getDate() - 60));
    const ninetyDaysAgo = new Date(new Date().setDate(now.getDate() - 90));

    allSales.forEach(sale => {
        if (!sale.invoiceDate) return;
        const saleDate = new Date(sale.invoiceDate);
        if (saleDate < ninetyDaysAgo) return;

        if (!metricsMap.has(sale.lenovoProductNumber)) {
            metricsMap.set(sale.lenovoProductNumber, { last30: 0, prev30: 0, total90: 0, affectedCustomers: new Set() });
        }
        const metric = metricsMap.get(sale.lenovoProductNumber)!;
        metric.total90 += sale.quantity;
        metric.affectedCustomers.add(sale.buyerId);

        if (saleDate >= thirtyDaysAgo) {
            metric.last30 += sale.quantity;
        } else if (saleDate >= sixtyDaysAgo) {
            metric.prev30 += sale.quantity;
        }
    });
    return metricsMap;
};

export const analyzeBackorderCandidates = (
    inventoryStatus: Map<string, any>,
    allSales: Sale[],
    firstOrderDates: Map<string, string>,
    newModelMtms: Set<string>
): BackorderRecommendation[] => {
    const salesMetrics = getSalesMetricsByMtm(allSales);
    const candidates = Array.from(inventoryStatus.values())
        .filter(item => item.onHandQty <= 0 && salesMetrics.has(item.mtm))
        .map(item => ({ item, metrics: salesMetrics.get(item.mtm)! }));

    if (candidates.length === 0) return [];
    
    const maxRevenue = Math.max(...candidates.map(c => c.metrics.total90 * c.item.averageLandingCost), 1);
    const timestamp = new Date().toISOString();

    return candidates.map(c => {
        const { item, metrics } = c;
        const { last30, prev30, total90, affectedCustomers } = metrics;
        
        const volumeScore = Math.min(40, Math.log2(total90 + 1) * 6); 
        
        let velocityScore = 15;
        if (last30 > prev30 * 1.1) velocityScore = 30;
        else if (prev30 > last30 * 1.1) velocityScore = 0;
        
        const estimatedBackorderValue = total90 * item.averageLandingCost;
        const revenueScore = (estimatedBackorderValue / maxRevenue) * 20;

        const newModelBonus = newModelMtms.has(item.mtm) ? 10 : 0;
        
        const priorityScore = Math.round(volumeScore + velocityScore + revenueScore + newModelBonus);

        let priority: 'High' | 'Medium' | 'Low';
        if (priorityScore >= 70) priority = 'High';
        else if (priorityScore >= 35) priority = 'Medium';
        else priority = 'Low';

        let salesTrend: 'Increasing' | 'Decreasing' | 'Stable';
        if (velocityScore === 30) salesTrend = 'Increasing';
        else if (velocityScore === 0) salesTrend = 'Decreasing';
        else salesTrend = 'Stable';

        return {
            mtm: item.mtm,
            modelName: item.modelName,
            priority,
            priorityScore,
            recentSalesUnits: total90,
            estimatedBackorderValue,
            firstOrderDate: firstOrderDates.get(item.mtm) || null,
            inStockQty: item.onHandQty,
            averageLandingCost: item.averageLandingCost,
            salesTrend,
            affectedCustomers: affectedCustomers.size,
            salesLast30Days: last30,
            timestamp,
        };
    });
};

export const analyzePromotionCandidates = (inventoryData: InventoryItem[]): PromotionCandidate[] => {
    const candidates = inventoryData.filter(item => item.onHandQty > 0 || (item.onHandQty <= 5 && item.otwQty > 20));

    if (candidates.length === 0) return [];

    const maxInStockValue = Math.max(...candidates.map(item => item.onHandValue), 1); // Avoid division by zero
    const timestamp = new Date().toISOString();

    return candidates
        .map(item => {
            const { onHandQty, otwQty, weeksOfInventory, daysSinceLastSale, onHandValue, otwValue, daysSinceLastArrival } = item;
            
            // 1. Check for Pre-Launch special case
            if (onHandQty <= 5 && otwQty > 20 && otwValue > 10000) {
                const preLaunchCandidate: PromotionCandidate = {
                    mtm: item.mtm,
                    modelName: item.modelName,
                    inStockQty: item.onHandQty,
                    otwQty: item.otwQty,
                    inStockValue: item.onHandValue,
                    otwValue: item.otwValue,
                    weeksOfInventory: null, // Pre-launch items don't have a WOI metric.
                    daysSinceLastSale: item.daysSinceLastSale ?? null,
                    priority: 'Pre-Launch',
                    reasoning: `Key opportunity to build market hype with ${otwQty} incoming units and capture early adopters.`,
                    timestamp,
                };
                return preLaunchCandidate;
            }
            
            // If not pre-launch, it must have stock to be a promotion candidate
            if (onHandQty <= 0) {
                return null;
            }

            // 2. Calculate scores for regular promotion candidates
            let stockPressureScore = 0;
            let stockPressureReason = '';
            if (weeksOfInventory === null) {
                stockPressureScore = 40;
                stockPressureReason = "Untapped potential; this item has never been sold.";
            } else if (weeksOfInventory > 52) {
                stockPressureScore = 35;
                stockPressureReason = `High inventory (${weeksOfInventory} weeks) presents a major market penetration opportunity.`;
            } else if (weeksOfInventory > 26) {
                stockPressureScore = 25;
                stockPressureReason = `Significant stock (${weeksOfInventory} weeks) allows for a sustained marketing campaign.`;
            } else if (weeksOfInventory > 12) {
                stockPressureScore = 15;
                stockPressureReason = `Healthy stock level (${weeksOfInventory} weeks) can support a promotional push.`;
            }

            let agingStockScore = 0;
            let agingStockReason = '';
            if (daysSinceLastSale === null && (daysSinceLastArrival ?? 0) > 30) {
                agingStockScore = 30;
                agingStockReason = `New stock needs a launch campaign to build momentum.`;
            } else if (daysSinceLastSale !== null) {
                if (daysSinceLastSale > 90) {
                    agingStockScore = 25;
                    agingStockReason = `Stagnant sales require a market re-activation campaign.`;
                } else if (daysSinceLastSale > 60) {
                    agingStockScore = 15;
                    agingStockReason = `Slowing sales suggest a need for a marketing boost.`;
                } else if (daysSinceLastSale > 30) {
                    agingStockScore = 5;
                    agingStockReason = `Proactive push can prevent sales from stagnating.`;
                }
            }
            
            const valueAtRiskScore = Math.min(30, (onHandValue / maxInStockValue) * 30);
            const valueAtRiskReason = `Significant capital tied to this stock ($${onHandValue.toLocaleString(undefined, {notation: 'compact'})}) justifies a strategic marketing push.`;
            
            const totalScore = stockPressureScore + agingStockScore + valueAtRiskScore;

            let priority: 'Urgent' | 'Recommended' | 'Optional';
            if (totalScore >= 70) {
                priority = 'Urgent';
            } else if (totalScore >= 40) {
                priority = 'Recommended';
            } else {
                priority = 'Optional';
            }

            // Generate dynamic reasoning based on top scores
            const scores = [
                { score: stockPressureScore, reason: stockPressureReason },
                { score: agingStockScore, reason: agingStockReason },
                { score: valueAtRiskScore, reason: valueAtRiskReason }
            ].filter(s => s.reason).sort((a,b) => b.score - a.score);
            
            let reasoning = scores.length > 0 ? scores[0].reason : 'Healthy stock levels. Suitable for brand-building campaigns.';
            if (scores.length > 1 && scores[1].score > 10) {
                reasoning += ` Additionally: ${scores[1].reason.charAt(0).toLowerCase() + scores[1].reason.slice(1)}`;
            }

            const regularCandidate: PromotionCandidate = {
                mtm: item.mtm,
                modelName: item.modelName,
                inStockQty: item.onHandQty,
                otwQty: item.otwQty,
                inStockValue: item.onHandValue,
                otwValue: item.otwValue,
                weeksOfInventory: item.weeksOfInventory ?? null,
                daysSinceLastSale: item.daysSinceLastSale ?? null,
                priority,
                reasoning,
                timestamp,
            };
            return regularCandidate;
        })
        .filter((c): c is PromotionCandidate => c !== null)
        .sort((a, b) => {
            const priorityOrder: Record<PromotionCandidate['priority'], number> = { 'Urgent': 4, 'Pre-Launch': 3, 'Recommended': 2, 'Optional': 1 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            const aValue = a.priority === 'Pre-Launch' ? a.otwValue : a.inStockValue;
            const bValue = b.priority === 'Pre-Launch' ? b.otwValue : b.inStockValue;
            return bValue - aValue;
        });
};
