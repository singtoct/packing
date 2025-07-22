import { OrderItem, PackingLogEntry, InventoryItem, Employee, QCEntry, MoldingLogEntry, RawMaterial, BillOfMaterial, Machine, MaintenanceLog, Supplier, PurchaseOrder, Shipment, Product, AppSettings, AppRole, Customer, Complaint, ProductionQueueItem, MachineDailyLog, PackingStation, PackingQueueItem } from '../types';
import { db, getCollection, getDocument, setDocument, addDocument, deleteDocument, updateDocument, overwriteCollection as overwriteFirestoreCollection } from './firebaseService';
import * as firestore from 'firebase/firestore';

// --- Data Seeding ---
// The seeding is now initiated from App.tsx to ensure proper async handling.

// Generic getter with sorting
async function getItems<T extends {id: string}>(key: string, sortBy?: keyof T, order: 'asc' | 'desc' = 'asc'): Promise<T[]> {
    return getCollection<T>(key, sortBy, order);
}

// Generic add function
async function addItem<T>(key: string, item: Omit<T, 'id'>): Promise<T & {id: string}> {
    return addDocument<T>(key, item);
}

// Generic update function
async function updateItem<T>(key: string, id: string, updates: Partial<T>): Promise<void> {
    return updateDocument(key, id, updates);
}

// Generic delete function
async function deleteItem(key: string, id: string): Promise<void> {
    return deleteDocument(key, id);
}

// Generic delete multiple function
async function deleteMultipleItems(key: string, ids: string[]): Promise<void> {
    const promises = ids.map(id => deleteDocument(key, id));
    await Promise.all(promises);
}

// Generic "save all" function for collections with a standard 'id' field
const saveCollection = async <T extends { id: string }>(collectionName: string, items: T[]): Promise<void> => {
    const existingDocs = await firestore.getDocs(firestore.collection(db, collectionName));
    const batch = firestore.writeBatch(db);
    existingDocs.forEach(docSnap => batch.delete(docSnap.ref));
    items.forEach(item => {
        const docRef = firestore.doc(db, collectionName, item.id);
        const { id, ...data } = item;
        batch.set(docRef, data);
    });
    await batch.commit();
};

// --- Specific Functions ---

// Order
export const getOrders = (): Promise<OrderItem[]> => getItems<OrderItem>('packing_orders', 'dueDate', 'asc');
export const addOrder = (order: Omit<OrderItem, 'id'>): Promise<OrderItem> => addItem('packing_orders', order);
export const updateOrder = (id: string, updates: Partial<OrderItem>): Promise<void> => updateItem('packing_orders', id, updates);
export const deleteOrder = (id: string): Promise<void> => deleteItem('packing_orders', id);
export const deleteMultipleOrders = (ids: string[]): Promise<void> => deleteMultipleItems('packing_orders', ids);
export const saveOrders = (items: OrderItem[]): Promise<void> => saveCollection('packing_orders', items);

// Packing Log
export const getPackingLogs = (): Promise<PackingLogEntry[]> => getItems<PackingLogEntry>('packing_logs', 'date', 'desc');
export const addPackingLog = (log: Omit<PackingLogEntry, 'id'>): Promise<PackingLogEntry> => addItem('packing_logs', log);
export const deletePackingLog = (id: string): Promise<void> => deleteItem('packing_logs', id);
export const deleteMultiplePackingLogs = (ids: string[]): Promise<void> => deleteMultipleItems('packing_logs', ids);
export const savePackingLogs = (items: PackingLogEntry[]): Promise<void> => saveCollection('packing_logs', items);

// Molding Log
export const getMoldingLogs = (): Promise<MoldingLogEntry[]> => getItems<MoldingLogEntry>('molding_logs', 'date', 'desc');
export const addMoldingLog = (log: Omit<MoldingLogEntry, 'id'>): Promise<MoldingLogEntry> => addItem('molding_logs', log);
export const deleteMoldingLog = (id: string): Promise<void> => deleteItem('molding_logs', id);
export const deleteMultipleMoldingLogs = (ids: string[]): Promise<void> => deleteMultipleItems('molding_logs', ids);
export const saveMoldingLogs = (items: MoldingLogEntry[]): Promise<void> => saveCollection('molding_logs', items);

// Inventory (Finished Goods) - Note: Inventory uses name as ID.
export const getInventory = (): Promise<InventoryItem[]> => getItems<InventoryItem>('packing_inventory', 'name', 'asc');
export const updateInventoryItem = (name: string, updates: Partial<InventoryItem>): Promise<void> => updateDocument('packing_inventory', name, updates);
export const deleteInventoryItem = (name: string): Promise<void> => deleteDocument('packing_inventory', name);
export const saveInventory = async (items: InventoryItem[]): Promise<void> => {
    const existingDocs = await firestore.getDocs(firestore.collection(db, 'packing_inventory'));
    const batch = firestore.writeBatch(db);
    existingDocs.forEach(docSnap => batch.delete(docSnap.ref));
    items.forEach(item => {
        const docRef = firestore.doc(db, 'packing_inventory', item.name); // use name as ID
        batch.set(docRef, { id: item.name, name: item.name, quantity: item.quantity, minStock: item.minStock });
    });
    await batch.commit();
}
export async function upsertInventoryItem(name: string, quantityChange: number): Promise<void> {
    const docRef = firestore.doc(db, 'packing_inventory', name);
    const docSnap = await firestore.getDoc(docRef);
    if (docSnap.exists()) {
        await updateDocument('packing_inventory', name, { quantity: firestore.increment(quantityChange) });
    } else {
        await setDocument('packing_inventory', name, { id: name, name, quantity: quantityChange });
    }
}

// Product
export const getProducts = (): Promise<Product[]> => getItems<Product>('factory_products', 'name', 'asc');
export const addProduct = (product: Omit<Product, 'id'>): Promise<Product> => addItem('factory_products', product);
export const updateProduct = (id: string, updates: Partial<Product>): Promise<void> => updateItem('factory_products', id, updates);
export const deleteProduct = (id: string): Promise<void> => deleteItem('factory_products', id);
export const deleteMultipleProducts = (ids: string[]): Promise<void> => deleteMultipleItems('factory_products', ids);
export const saveProducts = (items: Product[]): Promise<void> => saveCollection('factory_products', items);

// Employee
export const getEmployees = (): Promise<Employee[]> => getItems<Employee>('packing_employees', 'name', 'asc');
export const addEmployee = (employee: Omit<Employee, 'id'>): Promise<Employee> => addItem('packing_employees', employee);
export const deleteEmployee = (id: string): Promise<void> => deleteItem('packing_employees', id);
export const deleteMultipleEmployees = (ids: string[]): Promise<void> => deleteMultipleItems('packing_employees', ids);
export const saveEmployees = (items: Employee[]): Promise<void> => saveCollection('packing_employees', items);

// QC Entry
export const getQCEntries = (): Promise<QCEntry[]> => getItems<QCEntry>('packing_qc_entries', 'packingDate', 'desc');
export const addQCEntry = (entry: Omit<QCEntry, 'id'>): Promise<QCEntry> => addItem('packing_qc_entries', entry);
export const updateQCEntry = (id: string, updates: Partial<QCEntry>): Promise<void> => updateItem('packing_qc_entries', id, updates);
export const deleteMultipleQCEntries = (ids: string[]): Promise<void> => deleteMultipleItems('packing_qc_entries', ids);
export const saveQCEntries = (items: QCEntry[]): Promise<void> => saveCollection('packing_qc_entries', items);

// Raw Material
export const getRawMaterials = (): Promise<RawMaterial[]> => getItems<RawMaterial>('packing_raw_materials', 'name', 'asc');
export const addRawMaterial = (material: Omit<RawMaterial, 'id'>): Promise<RawMaterial> => addItem('packing_raw_materials', material);
export const updateRawMaterial = (id: string, updates: Partial<RawMaterial>): Promise<void> => updateItem('packing_raw_materials', id, updates);
export const deleteRawMaterial = (id: string): Promise<void> => deleteItem('packing_raw_materials', id);
export const deleteMultipleRawMaterials = (ids: string[]): Promise<void> => deleteMultipleItems('packing_raw_materials', ids);
export const saveRawMaterials = (items: RawMaterial[]): Promise<void> => saveCollection('packing_raw_materials', items);
export async function updateMultipleRawMaterials(updates: { id: string, quantityChange: number }[]): Promise<void> {
    const batch = firestore.writeBatch(db);
    updates.forEach(update => {
        const docRef = firestore.doc(db, 'packing_raw_materials', update.id);
        batch.update(docRef, { quantity: firestore.increment(update.quantityChange) });
    });
    await batch.commit();
}

// Bill of Material (BOM) - productName is the ID
export const getBOMs = (): Promise<BillOfMaterial[]> => getItems<BillOfMaterial>('packing_boms', 'productName', 'asc');
export const saveBOM = (bom: BillOfMaterial): Promise<void> => setDocument('packing_boms', bom.productName, {...bom, id: bom.productName});
export const saveBOMs = async (items: BillOfMaterial[]): Promise<void> => {
    const existingDocs = await firestore.getDocs(firestore.collection(db, 'packing_boms'));
    const batch = firestore.writeBatch(db);
    existingDocs.forEach(docSnap => batch.delete(docSnap.ref));
    items.forEach(item => {
        const docRef = firestore.doc(db, 'packing_boms', item.productName);
        batch.set(docRef, { ...item, id: item.productName });
    });
    await batch.commit();
};

// Machine
export const getMachines = (): Promise<Machine[]> => getItems<Machine>('factory_machines', 'name', 'asc');
export const addMachine = (machine: Omit<Machine, 'id'>): Promise<Machine> => addItem('factory_machines', machine);
export const updateMachine = (id: string, updates: Partial<Machine>): Promise<void> => updateItem('factory_machines', id, updates);
export const deleteMachine = (id: string): Promise<void> => deleteItem('factory_machines', id);
export const deleteMultipleMachines = (ids: string[]): Promise<void> => deleteMultipleItems('factory_machines', ids);
export const saveMachines = (items: Machine[]): Promise<void> => saveCollection('factory_machines', items);

// Maintenance Log
export const getMaintenanceLogs = (): Promise<MaintenanceLog[]> => getItems<MaintenanceLog>('maintenance_logs', 'date', 'desc');
export const addMaintenanceLog = (log: Omit<MaintenanceLog, 'id'>): Promise<MaintenanceLog> => addItem('maintenance_logs', log);
export const saveMaintenanceLogs = (items: MaintenanceLog[]): Promise<void> => saveCollection('maintenance_logs', items);

// Supplier
export const getSuppliers = (): Promise<Supplier[]> => getItems<Supplier>('factory_suppliers', 'name', 'asc');
export const addSupplier = (supplier: Omit<Supplier, 'id'>): Promise<Supplier> => addItem('factory_suppliers', supplier);
export const updateSupplier = (id: string, updates: Partial<Supplier>): Promise<void> => updateItem('factory_suppliers', id, updates);
export const deleteSupplier = (id: string): Promise<void> => deleteItem('factory_suppliers', id);
export const deleteMultipleSuppliers = (ids: string[]): Promise<void> => deleteMultipleItems('factory_suppliers', ids);
export const saveSuppliers = (items: Supplier[]): Promise<void> => saveCollection('factory_suppliers', items);

// Purchase Order
export const getPurchaseOrders = (): Promise<PurchaseOrder[]> => getItems<PurchaseOrder>('factory_purchase_orders', 'orderDate', 'desc');
export const addPurchaseOrder = (po: Omit<PurchaseOrder, 'id'>): Promise<PurchaseOrder> => addItem('factory_purchase_orders', po);
export const updatePurchaseOrder = (id: string, updates: Partial<PurchaseOrder>): Promise<void> => updateItem('factory_purchase_orders', id, updates);
export const savePurchaseOrders = (items: PurchaseOrder[]): Promise<void> => saveCollection('factory_purchase_orders', items);

// Shipment
export const getShipments = (): Promise<Shipment[]> => getItems<Shipment>('factory_shipments', 'shipmentDate', 'desc');
export const addShipment = (shipment: Omit<Shipment, 'id'>): Promise<Shipment> => addItem('factory_shipments', shipment);
export const updateShipment = (id: string, updates: Partial<Shipment>): Promise<void> => updateItem('factory_shipments', id, updates);
export const deleteShipment = (id: string): Promise<void> => deleteItem('factory_shipments', id);
export const deleteMultipleShipments = (ids: string[]): Promise<void> => deleteMultipleItems('factory_shipments', ids);
export const saveShipments = (items: Shipment[]): Promise<void> => saveCollection('factory_shipments', items);

// Customer
export const getCustomers = (): Promise<Customer[]> => getItems<Customer>('factory_customers', 'name', 'asc');
export const addCustomer = (customer: Omit<Customer, 'id'>): Promise<Customer> => addItem('factory_customers', customer);
export const updateCustomer = (id: string, updates: Partial<Customer>): Promise<void> => updateItem('factory_customers', id, updates);
export const deleteCustomer = (id: string): Promise<void> => deleteItem('factory_customers', id);
export const saveCustomers = (items: Customer[]): Promise<void> => saveCollection('factory_customers', items);

// Complaint
export const getComplaints = (): Promise<Complaint[]> => getItems<Complaint>('factory_complaints', 'complaintDate', 'desc');
export const addComplaint = (complaint: Omit<Complaint, 'id'>): Promise<Complaint> => addItem('factory_complaints', complaint);
export const updateComplaint = (id: string, updates: Partial<Complaint>): Promise<void> => updateItem('factory_complaints', id, updates);
export const deleteComplaint = (id: string): Promise<void> => deleteItem('factory_complaints', id);
export const saveComplaints = (items: Complaint[]): Promise<void> => saveCollection('factory_complaints', items);

// Production Queue
export const getProductionQueue = (): Promise<ProductionQueueItem[]> => getItems<ProductionQueueItem>('production_queue', 'priority', 'asc');
export const addProductionQueueItem = (item: Omit<ProductionQueueItem, 'id'>): Promise<ProductionQueueItem> => addItem('production_queue', item);
export const updateProductionQueueItem = (id: string, updates: Partial<ProductionQueueItem>): Promise<void> => updateItem('production_queue', id, updates);
export const deleteProductionQueueItem = (id: string): Promise<void> => deleteItem('production_queue', id);
export const saveProductionQueue = (items: ProductionQueueItem[]): Promise<void> => saveCollection('production_queue', items);

// Machine Daily Log
export const getMachineDailyLogs = (): Promise<MachineDailyLog[]> => getItems<MachineDailyLog>('machine_daily_logs', 'date', 'desc');
export const addMachineDailyLog = (log: Omit<MachineDailyLog, 'id'>): Promise<MachineDailyLog> => addItem('machine_daily_logs', log);
export const updateMachineDailyLog = (id: string, updates: Partial<MachineDailyLog>): Promise<void> => updateItem('machine_daily_logs', id, updates);
export const saveMachineDailyLogs = (items: MachineDailyLog[]): Promise<void> => saveCollection('machine_daily_logs', items);

// Packing Station
export const getPackingStations = (): Promise<PackingStation[]> => getItems<PackingStation>('packing_stations', 'name', 'asc');
export const updatePackingStation = (id: string, updates: Partial<PackingStation>): Promise<void> => updateItem('packing_stations', id, updates);
export const savePackingStations = (items: PackingStation[]): Promise<void> => saveCollection('packing_stations', items);

// Packing Queue
export const getPackingQueue = (): Promise<PackingQueueItem[]> => getItems<PackingQueueItem>('packing_queue', 'priority', 'asc');
export const addPackingQueueItem = (item: Omit<PackingQueueItem, 'id'>): Promise<PackingQueueItem> => addItem('packing_queue', item);
export const updatePackingQueueItem = (id: string, updates: Partial<PackingQueueItem>): Promise<void> => updateItem('packing_queue', id, updates);
export const deletePackingQueueItem = (id: string): Promise<void> => deleteItem('packing_queue', id);
export const savePackingQueue = (items: PackingQueueItem[]): Promise<void> => saveCollection('packing_queue', items);

// App Settings
export const getSettings = async (): Promise<AppSettings> => {
    const settings = await getDocument<AppSettings>('factory_settings', 'main');
    if (!settings) {
        console.error("FATAL: Settings document 'main' could not be found. The application cannot start without settings. Seeding may have failed.");
        throw new Error("Critical application settings are missing.");
    }
    return settings;
};
export const saveSettings = (settings: AppSettings): Promise<void> => setDocument('factory_settings', 'main', settings);

// Helper function for procurement, re-using analysis logic
export const getAnalysisShortfall = async (): Promise<{ id: string; name: string; unit: string; shortfall: number }[]> => {
    const orders = await getOrders();
    const boms = await getBOMs();
    const rawMaterials = await getRawMaterials();

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
                    const totalRequired = comp.quantity * order.quantity;
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

// Functions for notifications
export const getReadNotificationIds = async (): Promise<Set<string>> => {
    const data = await getDocument<{ids: string[]}>('read_notifications', 'user_default');
    return new Set(data?.ids || []);
};

export const saveReadNotificationIds = async (ids: Set<string>): Promise<void> => {
    await setDocument('read_notifications', 'user_default', { ids: Array.from(ids) });
};

// --- Bulk Operations for Import/Export ---
export const overwriteCollection = async (collectionName: string, data: any[]): Promise<void> => {
    return overwriteFirestoreCollection(collectionName, data);
}