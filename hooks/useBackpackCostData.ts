import { useState, useEffect, useCallback } from 'react';
import type { AccessoryCost } from '../types';
import { getBackpackCostData, forceRefreshBackpackCostData } from '../services/googleScriptService';
import { getCachedData, setCachedData } from '../utils/db';

export const useBackpackCostData = () => {
  const [allBackpackCosts, setAllBackpackCosts] = useState<AccessoryCost[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let hasLoadedFromCache = false;

    try {
      const cached = await getCachedData('backpack-cost-data');
      if (cached && cached.length > 0) {
        setAllBackpackCosts(cached);
        setLastUpdated(localStorage.getItem('backpack-cost-data-timestamp'));
        hasLoadedFromCache = true;
      }

      const data = await getBackpackCostData();
      const newTimestamp = new Date().toISOString();
      setAllBackpackCosts(data);
      setLastUpdated(newTimestamp);
      
      await setCachedData('backpack-cost-data', data);
      localStorage.setItem('backpack-cost-data-timestamp', newTimestamp);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Backpack cost data fetch failed:", errorMessage);
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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await forceRefreshBackpackCostData();
      const newTimestamp = new Date().toISOString();
      setAllBackpackCosts(data);
      setLastUpdated(newTimestamp);
      
      await setCachedData('backpack-cost-data', data);
      localStorage.setItem('backpack-cost-data-timestamp', newTimestamp);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while refreshing');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return {
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    handleRefresh,
    allBackpackCosts,
  };
};