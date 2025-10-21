import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { OrderDataResponse, SaleDataResponse, PriceListItem, SerializedItem, RebateProgram, RebateDetail, RebateSale, Shipment, AccessoryCost, Task } from '../types';

const DB_NAME = 'limperial-dashboard-db';
const DB_VERSION = 1;

// Define the schema for our database
interface DashboardDB extends DBSchema {
  'order-data': {
    key: string;
    value: OrderDataResponse;
  };
  'sale-data': {
    key: string;
    value: SaleDataResponse;
  };
  'serialization-data': {
      key: string;
      value: SerializedItem[];
  };
  'price-list-data': {
      key: string;
      value: PriceListItem[];
  };
  'rebate-data': {
      key: string;
      value: RebateProgram[];
  };
  'rebate-details-data': {
      key: string;
      value: RebateDetail[];
  };
  'rebate-sales-data': {
      key: string;
      value: RebateSale[];
  };
  'shipment-data': {
    key: string;
    value: Shipment[];
  };
  'backpack-cost-data': {
    key: string;
    value: AccessoryCost[];
  };
  'tasks-data': {
    key: string;
    value: Task[];
  };
}

let dbPromise: Promise<IDBPDatabase<DashboardDB>> | null = null;

type StoreName = 'order-data' | 'sale-data' | 'serialization-data' | 'price-list-data' | 'rebate-data' | 'rebate-details-data' | 'rebate-sales-data' | 'shipment-data' | 'backpack-cost-data' | 'tasks-data';

const getDb = (): Promise<IDBPDatabase<DashboardDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<DashboardDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('order-data')) {
          db.createObjectStore('order-data');
        }
        if (!db.objectStoreNames.contains('sale-data')) {
          db.createObjectStore('sale-data');
        }
        if (!db.objectStoreNames.contains('serialization-data')) {
          db.createObjectStore('serialization-data');
        }
        if (!db.objectStoreNames.contains('price-list-data')) {
          db.createObjectStore('price-list-data');
        }
        if (!db.objectStoreNames.contains('rebate-data')) {
          db.createObjectStore('rebate-data');
        }
        if (!db.objectStoreNames.contains('rebate-details-data')) {
          db.createObjectStore('rebate-details-data');
        }
        if (!db.objectStoreNames.contains('rebate-sales-data')) {
          db.createObjectStore('rebate-sales-data');
        }
        if (!db.objectStoreNames.contains('shipment-data')) {
          db.createObjectStore('shipment-data');
        }
        if (!db.objectStoreNames.contains('backpack-cost-data')) {
          db.createObjectStore('backpack-cost-data');
        }
        if (!db.objectStoreNames.contains('tasks-data')) {
          db.createObjectStore('tasks-data');
        }
      },
    });
  }
  return dbPromise;
};

// Generic get and set functions
export const getCachedData = async <T extends StoreName>(storeName: T): Promise<DashboardDB[T]['value'] | undefined> => {
  try {
    const db = await getDb();
    return await db.get(storeName, 'data');
  } catch (error) {
    console.error(`Failed to get data from ${storeName}:`, error);
    return undefined;
  }
};

export const setCachedData = async <T extends StoreName>(storeName: T, data: DashboardDB[T]['value']): Promise<void> => {
  try {
    const db = await getDb();
    await db.put(storeName, data, 'data');
  } catch (error) {
    console.error(`Failed to set data in ${storeName}:`, error);
  }
};