import { useState, useEffect, useCallback } from 'react';
import type { RebateSale } from '../types';
import { getRebateSaleData, forceRefreshRebateSales } from '../services/googleScriptService';
import { getCachedData, setCachedData } from '../utils/db';

export const useRebateSaleData = () => {
  const [allRebateSales, setAllRebateSales] = useState<RebateSale[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let hasLoadedFromCache = false;

    try {
      const cached = await getCachedData('rebate-sales-data');
      if (cached && cached.length > 0) {
        setAllRebateSales(cached);
        setLastUpdated(localStorage.getItem('rebate-sales-data-timestamp'));
        hasLoadedFromCache = true;
      }

      const data = await getRebateSaleData();
      const newTimestamp = new Date().toISOString();
      setAllRebateSales(data);
      setLastUpdated(newTimestamp);
      
      await setCachedData('rebate-sales-data', data);
      localStorage.setItem('rebate-sales-data-timestamp', newTimestamp);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Rebate sales data fetch failed:", errorMessage);
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
      const data = await forceRefreshRebateSales();
      const newTimestamp = new Date().toISOString();
      setAllRebateSales(data);
      setLastUpdated(newTimestamp);
      
      await setCachedData('rebate-sales-data', data);
      localStorage.setItem('rebate-sales-data-timestamp', newTimestamp);
      
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
    allRebateSales,
  };
};