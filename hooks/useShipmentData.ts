import { useState, useEffect, useCallback } from 'react';
import type { Shipment } from '../types';
import { getShipmentData, forceRefreshShipments } from '../services/googleScriptService';
import { getCachedData, setCachedData } from '../utils/db';

export const useShipmentData = () => {
  const [allShipments, setAllShipments] = useState<Shipment[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let hasLoadedFromCache = false;

    try {
      const cached = await getCachedData('shipment-data');
      if (cached && cached.length > 0) {
        setAllShipments(cached);
        setLastUpdated(localStorage.getItem('shipment-data-timestamp'));
        hasLoadedFromCache = true;
      }

      const data = await getShipmentData();
      const newTimestamp = new Date().toISOString();
      setAllShipments(data);
      setLastUpdated(newTimestamp);
      
      await setCachedData('shipment-data', data);
      localStorage.setItem('shipment-data-timestamp', newTimestamp);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Shipment data fetch failed:", errorMessage);
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
      const data = await forceRefreshShipments();
      const newTimestamp = new Date().toISOString();
      setAllShipments(data);
      setLastUpdated(newTimestamp);
      
      await setCachedData('shipment-data', data);
      localStorage.setItem('shipment-data-timestamp', newTimestamp);
      
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
    allShipments,
  };
};