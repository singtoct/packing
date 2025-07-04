
import { OrderItem, PackingLogEntry, InventoryItem, Employee, QCEntry, MoldingLogEntry } from '../types';

const ORDERS_KEY = 'packing_orders';
const LOGS_KEY = 'packing_logs';
const MOLDING_LOGS_KEY = 'molding_logs';
const INVENTORY_KEY = 'packing_inventory';
const EMPLOYEES_KEY = 'packing_employees';
const QC_KEY = 'packing_qc_entries';

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

// Molding Log specific functions
export const getMoldingLogs = (): MoldingLogEntry[] => getItems<MoldingLogEntry>(MOLDING_LOGS_KEY);
export const saveMoldingLogs = (logs: MoldingLogEntry[]): void => saveItems<MoldingLogEntry>(MOLDING_LOGS_KEY, logs);

// Inventory specific functions
export const getInventory = (): InventoryItem[] => getItems<InventoryItem>(INVENTORY_KEY);
export const saveInventory = (inventory: InventoryItem[]): void => saveItems<InventoryItem>(INVENTORY_KEY, inventory);

// Employee specific functions
const INITIAL_EMPLOYEES = ['สมชาย', 'สมศรี', 'มานะ', 'ปิติ', 'ชูใจ', 'สมศักดิ์', 'อมรรัตน์'];

export const getEmployees = (): Employee[] => {
    const items = getItems<Employee>(EMPLOYEES_KEY);
    if (items.length === 0) {
        // First run, initialize with default employees from the old list
        const defaultEmployees: Employee[] = INITIAL_EMPLOYEES.map(name => ({
            id: crypto.randomUUID(),
            name,
            hireDate: new Date().toISOString().split('T')[0],
        }));
        saveItems<Employee>(EMPLOYEES_KEY, defaultEmployees);
        return defaultEmployees;
    }
    return items.sort((a,b) => a.name.localeCompare(b.name));
};

export const saveEmployees = (employees: Employee[]): void => saveItems<Employee>(EMPLOYEES_KEY, employees);

// QC Entry specific functions
export const getQCEntries = (): QCEntry[] => getItems<QCEntry>(QC_KEY);
export const saveQCEntries = (entries: QCEntry[]): void => saveItems<QCEntry>(QC_KEY, entries);
