

import { useState, useEffect, useCallback } from 'react';
import type { Order, FilterOptions, OrderDataResponse } from '../types';
import { getOrderData, forceRefreshOrders } from '../services/googleScriptService';
import { getCachedData, setCachedData } from '../utils/db';

export const useOrderData = () => {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    mtms: [],
    factoryToSgps: [],
    statuses: [],
    years: [],
    quarters: [],
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
      // 1. Try to load from cache first
      const cached = await getCachedData('order-data');
      if (cached && cached.orders.length > 0) {
        setAllOrders(cached.orders);
        setFilterOptions(cached.filterOptions);
        setLastUpdated(cached.timestamp);
        hasLoadedFromCache = true;
        // The skeleton will now show until fresh data is fetched.
      }

      // 2. Fetch fresh data from network
      const data = await getOrderData();
      
      setAllOrders(data.orders);
      setFilterOptions(data.filterOptions);
      setLastUpdated(data.timestamp);
      
      // 3. Update cache with fresh data
      await setCachedData('order-data', data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Order data fetch failed:", errorMessage);
      if (!hasLoadedFromCache) {
        // Only show critical error if we couldn't even load from cache
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
      const data = await forceRefreshOrders();
      
      setAllOrders(data.orders);
      setFilterOptions(data.filterOptions);
      setLastUpdated(data.timestamp);
      
      await setCachedData('order-data', data);
      
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
    filterOptions,
    lastUpdated,
    handleRefresh,
    allOrders,
  };
};