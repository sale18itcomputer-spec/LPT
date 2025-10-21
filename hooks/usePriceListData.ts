import { useState, useEffect, useCallback } from 'react';
import type { PriceListItem } from '../types';
import { getPriceListData, updateSheetData } from '../services/googleScriptService';
import { getCachedData, setCachedData } from '../utils/db';

// Add a unique ID type to the PriceListItem for internal use
type PriceListItemWithId = PriceListItem & { _uniqueId: string };

export const usePriceListData = () => {
  const [data, setData] = useState<PriceListItemWithId[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    let hasLoadedFromCache = false;

    try {
      // 1. Load from cache
      const cached = await getCachedData('price-list-data');
      if (cached && cached.length > 0) {
        const dataWithId = cached.map((item, index) => ({
            ...item,
            _uniqueId: `${item.mtm}-${index}`,
        }));
        setData(dataWithId);
        hasLoadedFromCache = true;
        setIsLoading(false);
      }

      // 2. Fetch fresh data
      const result = await getPriceListData();
      
      const dataWithId = result.map((item, index) => ({
        ...item,
        _uniqueId: `${item.mtm}-${index}`,
      }));
      setData(dataWithId);
      
      // 3. Update cache
      await setCachedData('price-list-data', result); // Cache the raw data without _uniqueId

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Price List data fetch failed:", errorMessage);
      if (!hasLoadedFromCache) {
          setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateItem = useCallback(async (mtm: string, updates: Partial<PriceListItem>) => {
    const originalData = data;
    // Optimistic UI update
    const updatedData = data.map(item =>
        item.mtm === mtm ? { ...item, ...updates } : item
    );
    setData(updatedData);

    try {
        const headerMapping: Partial<Record<keyof PriceListItem, string>> = {
            modelName: 'Model Name',
            color: 'Color',
            description: 'Description',
            sdp: 'SDP',
            srp: 'SRP',
        };

        const sheetUpdates: Record<string, any> = {};
        for (const key in updates) {
            const sheetHeader = headerMapping[key as keyof PriceListItem];
            if (sheetHeader) {
                sheetUpdates[sheetHeader] = updates[key as keyof PriceListItem];
            }
        }
        
        if (Object.keys(sheetUpdates).length === 0) {
            console.warn("No valid fields to update.");
            setData(originalData); // Revert if nothing to update
            return;
        }

        await updateSheetData({
            sheetType: 'price-list',
            identifier: { MTM: mtm },
            updates: sheetUpdates,
        });
        
        // On success, update cache with new data
        const rawDataToCache = updatedData.map(({ _uniqueId, ...rest }) => rest);
        await setCachedData('price-list-data', rawDataToCache);
    
    } catch (err) {
        console.error("Failed to update price list item, reverting optimistic update.", err);
        setData(originalData); // Revert on failure
        throw err; // Re-throw so UI component knows about the error
    }
  }, [data]);

  const refreshData = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);


  return {
    data,
    isLoading,
    error,
    refreshData,
    updateItem,
  };
};