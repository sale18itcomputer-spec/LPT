import { useState, useEffect, useCallback } from 'react';
import type { SerializedItem } from '../types';
import { getSerializationData, forceRefreshSerialization, GidError } from '../services/googleScriptService';
import { getCachedData, setCachedData } from '../utils/db';

export const useSerializationData = () => {
  const [allSerializedItems, setAllSerializedItems] = useState<SerializedItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let hasLoadedFromCache = false;

    try {
      // 1. Load from cache
      const cached = await getCachedData('serialization-data');
      if (cached) {
          setAllSerializedItems(cached);
          // Use a simple localStorage timestamp for this non-critical data
          setLastUpdated(localStorage.getItem('serialization-data-timestamp')); 
          hasLoadedFromCache = true;
          // The skeleton will now show until fresh data is fetched.
      }

      // 2. Fetch fresh data
      const items = await getSerializationData();
      setAllSerializedItems(items);
      const newTimestamp = new Date().toISOString();
      setLastUpdated(newTimestamp);
      
      // 3. Update cache
      await setCachedData('serialization-data', items);
      localStorage.setItem('serialization-data-timestamp', newTimestamp);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Serialization data fetch failed:", errorMessage);
      if (err instanceof GidError) {
          setAllSerializedItems([]);
          setError(errorMessage);
      } else if (!hasLoadedFromCache) {
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
      const items = await forceRefreshSerialization();
      setAllSerializedItems(items);
      const newTimestamp = new Date().toISOString();
      setLastUpdated(newTimestamp);
      
      await setCachedData('serialization-data', items);
      localStorage.setItem('serialization-data-timestamp', newTimestamp);

    } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while refreshing';
       if (err instanceof GidError) {
          setAllSerializedItems([]);
          setError(errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return {
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    allSerializedItems,
    handleRefresh,
  };
};