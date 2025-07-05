
import { OrderItem, PackingLogEntry, InventoryItem, Employee, QCEntry, MoldingLogEntry, RawMaterial, BillOfMaterial, Machine, MaintenanceLog, Supplier, PurchaseOrder, Shipment, Product } from '../types';

const ORDERS_KEY = 'packing_orders';
const LOGS_KEY = 'packing_logs';
const MOLDING_LOGS_KEY = 'molding_logs';
const INVENTORY_KEY = 'packing_inventory';
const EMPLOYEES_KEY = 'packing_employees';
const QC_KEY = 'packing_qc_entries';
const RAW_MATERIALS_KEY = 'packing_raw_materials';
const BOMS_KEY = 'packing_boms';
const MACHINES_KEY = 'factory_machines';
const MAINTENANCE_LOGS_KEY = 'maintenance_logs';
const SUPPLIERS_KEY = 'factory_suppliers';
const PURCHASE_ORDERS_KEY = 'factory_purchase_orders';
const SHIPMENTS_KEY = 'factory_shipments';
const PRODUCTS_KEY = 'factory_products';


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

// Product specific functions
export const getProducts = (): Product[] => {
    const items = getItems<Product>(PRODUCTS_KEY);
     if (items.length === 0) {
        const defaultProducts: Product[] = [
            { id: crypto.randomUUID(), name: "ฝาหน้ากาก CT A-103", color: "ขาว", salePrice: 550 },
            { id: crypto.randomUUID(), name: "สายไฟ VAF 2x1.5", color: "ขาว", salePrice: 2500 },
        ];
        saveItems<Product>(PRODUCTS_KEY, defaultProducts);
        return defaultProducts;
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
};
export const saveProducts = (products: Product[]): void => saveItems<Product>(PRODUCTS_KEY, products);


// Employee specific functions
const INITIAL_EMPLOYEES = ['สมชาย', 'สมศรี', 'มานะ', 'ปิติ', 'ชูใจ', 'สมศักดิ์', 'อมรรัตน์'];

export const getEmployees = (): Employee[] => {
    const items = getItems<Employee>(EMPLOYEES_KEY);
    if (items.length === 0) {
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

// Raw Material specific functions
export const getRawMaterials = (): RawMaterial[] => {
    const items = getItems<RawMaterial>(RAW_MATERIALS_KEY);
    if (items.length === 0) {
        const defaultMaterials: RawMaterial[] = [
            { id: crypto.randomUUID(), name: 'เม็ดพลาสติก PP สีขาว', quantity: 100, unit: 'kg', costPerUnit: 55 },
            { id: crypto.randomUUID(), name: 'เม็ดพลาสติก ABS สีดำ', quantity: 50, unit: 'kg', costPerUnit: 70 },
            { id: crypto.randomUUID(), name: 'ฟิล์มกันรอย', quantity: 10, unit: 'ม้วน', costPerUnit: 300 },
            { id: crypto.randomUUID(), name: 'สกรู M3x10', quantity: 5000, unit: 'ชิ้น', costPerUnit: 0.25 },
        ];
        saveItems<RawMaterial>(RAW_MATERIALS_KEY, defaultMaterials);
        return defaultMaterials;
    }
    return items;
};
export const saveRawMaterials = (materials: RawMaterial[]): void => saveItems<RawMaterial>(RAW_MATERIALS_KEY, materials);

// Bill of Material (BOM) specific functions
export const getBOMs = (): BillOfMaterial[] => getItems<BillOfMaterial>(BOMS_KEY);
export const saveBOMs = (boms: BillOfMaterial[]): void => saveItems<BillOfMaterial>(BOMS_KEY, boms);

// Machine specific functions
export const getMachines = (): Machine[] => {
    const items = getItems<Machine>(MACHINES_KEY);
    if(items.length === 0) {
        const defaultMachines: Machine[] = [
            { id: crypto.randomUUID(), name: 'เครื่องฉีด 1', location: 'โซน A', status: 'Running' },
            { id: crypto.randomUUID(), name: 'เครื่องฉีด 2', location: 'โซน A', status: 'Running' },
            { id: crypto.randomUUID(), name: 'เครื่องปั๊ม 1', location: 'โซน B', status: 'Down' },
        ];
        saveItems<Machine>(MACHINES_KEY, defaultMachines);
        return defaultMachines;
    }
    return items;
};
export const saveMachines = (machines: Machine[]): void => saveItems<Machine>(MACHINES_KEY, machines);

// Maintenance Log specific functions
export const getMaintenanceLogs = (): MaintenanceLog[] => getItems<MaintenanceLog>(MAINTENANCE_LOGS_KEY);
export const saveMaintenanceLogs = (logs: MaintenanceLog[]): void => saveItems<MaintenanceLog>(MAINTENANCE_LOGS_KEY, logs);

// Supplier specific functions
export const getSuppliers = (): Supplier[] => {
    const items = getItems<Supplier>(SUPPLIERS_KEY);
    if(items.length === 0) {
        const defaultSuppliers: Supplier[] = [
            { id: crypto.randomUUID(), name: 'บจก. พลาสติกไทย', contactPerson: 'คุณสมศักดิ์', phone: '081-234-5678' },
            { id: crypto.randomUUID(), name: 'บจก. สกรูภัณฑ์', contactPerson: 'คุณวิชัย', phone: '02-999-8888' },
        ];
        saveItems<Supplier>(SUPPLIERS_KEY, defaultSuppliers);
        return defaultSuppliers;
    }
    return items;
};
export const saveSuppliers = (suppliers: Supplier[]): void => saveItems<Supplier>(SUPPLIERS_KEY, suppliers);

// Purchase Order specific functions
export const getPurchaseOrders = (): PurchaseOrder[] => getItems<PurchaseOrder>(PURCHASE_ORDERS_KEY);
export const savePurchaseOrders = (pos: PurchaseOrder[]): void => saveItems<PurchaseOrder>(PURCHASE_ORDERS_KEY, pos);

// Shipment specific functions
export const getShipments = (): Shipment[] => getItems<Shipment>(SHIPMENTS_KEY);
export const saveShipments = (shipments: Shipment[]): void => saveItems<Shipment>(SHIPMENTS_KEY, shipments);


// Helper function for procurement, re-using analysis logic
export const getAnalysisShortfall = (): { id: string; name: string; unit: string; shortfall: number }[] => {
    const orders = getOrders();
    const boms = getBOMs();
    const rawMaterials = getRawMaterials();

    const bomMap = new Map(boms.map(b => [b.productName, b]));
    const rawMaterialMap = new Map(rawMaterials.map(rm => [rm.id, rm]));
    const requiredMaterials = new Map<string, { required: number, name: string, unit: string }>();

    orders.forEach(order => {
        const productName = `${order.name} (${order.color})`;
        const bom = bomMap.get(productName);
        if (bom) {
            bom.components.forEach(comp => {
                const material = rawMaterialMap.get(comp.rawMaterialId);
                if (material) {
                    const totalRequired = comp.quantity * order.quantity; // Assuming order.quantity is number of cases and BOM is per case
                    const existing = requiredMaterials.get(material.id) || { required: 0, name: material.name, unit: material.unit };
                    existing.required += totalRequired;
                    requiredMaterials.set(material.id, existing);
                }
            });
        }
    });
    
    const summary = Array.from(requiredMaterials.entries()).map(([id, data]) => {
        const materialInStock = rawMaterialMap.get(id);
        const inStock = materialInStock?.quantity || 0;
        const shortfall = data.required - inStock;
        return {
            ...data,
            id,
            inStock,
            shortfall: shortfall > 0 ? shortfall : 0,
        };
    });

    return summary.filter(item => item.shortfall > 0).map(item => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        shortfall: item.shortfall,
    }));
};
