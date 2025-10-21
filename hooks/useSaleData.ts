

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Sale, SaleFilterOptions, SaleDataResponse } from '../types';
import { getSaleData, forceRefreshSales } from '../services/googleScriptService';
import { getCachedData, setCachedData } from '../utils/db';

export const useSaleData = () => {
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [filterOptions, setFilterOptions] = useState<SaleFilterOptions>({
    quarters: [],
    segments: [],
    buyers: [],
    years: [],
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let hasLoadedFromCache = false;
    
    try {
      // 1. Load from cache
      const cached = await getCachedData('sale-data');
      if (cached && cached.sales.length > 0) {
        setAllSales(cached.sales);
        setFilterOptions(cached.filterOptions);
        setLastUpdated(cached.timestamp);
        hasLoadedFromCache = true;
        // The skeleton will now show until fresh data is fetched.
      }

      // 2. Fetch fresh data
      const data = await getSaleData();
      
      setAllSales(data.sales);
      setFilterOptions(data.filterOptions);
      setLastUpdated(data.timestamp);
      
      // 3. Update cache
      await setCachedData('sale-data', data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Sales data fetch failed:", errorMessage);
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
      const data = await forceRefreshSales();
      
      setAllSales(data.sales);
      setFilterOptions(data.filterOptions);
      setLastUpdated(data.timestamp);
      
      await setCachedData('sale-data', data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while refreshing');
    } finally {
      setIsRefreshing(false);
    }
  }, []);
  
  const allInvoicesCount = useMemo(() => {
    return new Set(allSales.map(s => s.invoiceNumber)).size;
  }, [allSales]);

  return {
    isLoading,
    isRefreshing,
    error,
    filterOptions,
    lastUpdated,
    handleRefresh,
    allSales,
    allInvoicesCount,
  };
};