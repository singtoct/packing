
import { OrderItem, PackingLogEntry } from '../types';

const ORDERS_KEY = 'packing_orders';
const LOGS_KEY = 'packing_logs';

// Generic getter
const getItems = <T,>(key: string): T[] => {
    try {
        const itemsJson = localStorage.getItem(key);
        return itemsJson ? JSON.parse(itemsJson) : [];
    } catch (error) {
        console.error(`Error reading from localStorage key "${key}":`, error);
        return [];
    }
};

// Generic setter
const saveItems = <T,>(key: string, items: T[]): void => {
    try {
        localStorage.setItem(key, JSON.stringify(items));
    } catch (error) {
        console.error(`Error saving to localStorage key "${key}":`, error);
    }
};

// Order specific functions
export const getOrders = (): OrderItem[] => getItems<OrderItem>(ORDERS_KEY);
export const saveOrders = (orders: OrderItem[]): void => saveItems<OrderItem>(ORDERS_KEY, orders);

// Packing Log specific functions
export const getPackingLogs = (): PackingLogEntry[] => getItems<PackingLogEntry>(LOGS_KEY);
export const savePackingLogs = (logs: PackingLogEntry[]): void => saveItems<PackingLogEntry>(LOGS_KEY, logs);
