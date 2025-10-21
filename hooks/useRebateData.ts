import { useState, useEffect, useCallback } from 'react';
import type { RebateProgram } from '../types';
import { getRebateData, forceRefreshRebates } from '../services/googleScriptService';
import { getCachedData, setCachedData } from '../utils/db';

export const useRebateData = () => {
  const [allRebates, setAllRebates] = useState<RebateProgram[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let hasLoadedFromCache = false;

    try {
      // 1. Try to load from cache first
      const cached = await getCachedData('rebate-data');
      if (cached && cached.length > 0) {
        setAllRebates(cached);
        setLastUpdated(localStorage.getItem('rebate-data-timestamp'));
        hasLoadedFromCache = true;
      }

      // 2. Fetch fresh data from network
      const data = await getRebateData();
      const newTimestamp = new Date().toISOString();
      setAllRebates(data);
      setLastUpdated(newTimestamp);
      
      // 3. Update cache with fresh data
      await setCachedData('rebate-data', data);
      localStorage.setItem('rebate-data-timestamp', newTimestamp);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Rebate data fetch failed:", errorMessage);
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
      const data = await forceRefreshRebates();
      const newTimestamp = new Date().toISOString();
      setAllRebates(data);
      setLastUpdated(newTimestamp);
      
      await setCachedData('rebate-data', data);
      localStorage.setItem('rebate-data-timestamp', newTimestamp);
      
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
    allRebates,
  };
};