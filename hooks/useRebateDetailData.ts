import { useState, useEffect, useCallback } from 'react';
import type { RebateDetail } from '../types';
import { getRebateDetailData, forceRefreshRebateDetails } from '../services/googleScriptService';
import { getCachedData, setCachedData } from '../utils/db';

export const useRebateDetailData = () => {
  const [allRebateDetails, setAllRebateDetails] = useState<RebateDetail[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let hasLoadedFromCache = false;

    try {
      const cached = await getCachedData('rebate-details-data');
      if (cached && cached.length > 0) {
        setAllRebateDetails(cached);
        setLastUpdated(localStorage.getItem('rebate-details-data-timestamp'));
        hasLoadedFromCache = true;
      }

      const data = await getRebateDetailData();
      const newTimestamp = new Date().toISOString();
      setAllRebateDetails(data);
      setLastUpdated(newTimestamp);
      
      await setCachedData('rebate-details-data', data);
      localStorage.setItem('rebate-details-data-timestamp', newTimestamp);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Rebate detail data fetch failed:", errorMessage);
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
      const data = await forceRefreshRebateDetails();
      const newTimestamp = new Date().toISOString();
      setAllRebateDetails(data);
      setLastUpdated(newTimestamp);
      
      await setCachedData('rebate-details-data', data);
      localStorage.setItem('rebate-details-data-timestamp', newTimestamp);
      
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
    allRebateDetails,
  };
};