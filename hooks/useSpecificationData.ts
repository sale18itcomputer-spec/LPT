
import { useState, useEffect, useCallback } from 'react';
import type { SpecificationSheetItem } from '../types';
import { getSpecificationData } from '../services/googleScriptService';
import { getCachedData, setCachedData } from '../utils/db';

export const useSpecificationData = () => {
  const [data, setData] = useState<SpecificationSheetItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let hasLoadedFromCache = false;

    try {
      const cached = await getCachedData('specification-data');
      if (cached) {
        setData(cached);
        hasLoadedFromCache = true;
      }

      const freshData = await getSpecificationData();
      setData(freshData);
      
      await setCachedData('specification-data', freshData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Specification data fetch failed:", errorMessage);
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

  return { data, isLoading, error, fetchData };
};
