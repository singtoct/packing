export type Tab = 'dashboard' | 'factory_floor' | 'packing_floor' | 'production_plan' | 'production_kanban' | 'analysis' | 'procurement' | 'molding' | 'logs' | 'qc' | 'shipments' | 'inventory' | 'raw_materials' | 'maintenance' | 'employees' | 'cost_analysis' | 'profit_analysis' | 'stats' | 'reports' | 'products' | 'settings' | 'customers' | 'complaints' | 'machine_performance';


export interface OrderItem {
  id: string;
  name: string;
  color: string;
  quantity: number;
  dueDate: string;
  salePrice?: number; // Price per piece
  customerId?: string;
}

export interface PackingLogEntry {
  id:string;
  date: string;
  name: string;
  quantity: number;
  packerName: string;
}

export interface MoldingLogEntry {
  id: string;
  date: string;
  productName: string;
  quantityProduced: number;
  quantityRejected: number;
  machine: string;
  operatorName: string;
  status: string; // e.g., 'รอแปะกันรอย', 'รอประกบ', 'เสร็จสิ้น'
  shift: 'เช้า' | 'บ่าย' | 'ดึก';
  materialCost?: number;
  jobId?: string;
}

export interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    minStock?: number;
}

export interface Product {
  id: string;
  name: string;
  color: string;
  salePrice: number;
  cycleTimeSeconds?: number; // Ideal time in seconds to produce one unit
}

export interface Employee {
  id: string;
  name: string;
  hireDate: string;
}

export interface QCEntry {
  id: string; // Same as PackingLogEntry id for easy mapping
  packingLogId: string;
  productName: string;
  quantity: number;
  packerName: string;
  packingDate: string;
  status: 'Pending' | 'Passed' | 'Failed';
  qcDate?: string;
  qcInspector?: string;
  reasons?: string[];
  notes?: string;
  imageUrl?: string;
}

export interface RawMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string; // e.g., 'kg', 'ชิ้น', 'ม้วน'
  costPerUnit?: number;
  defaultSupplierId?: string;
}

export interface BillOfMaterial {
  id: string;
  productName: string; // The name of the finished good, e.g., "ฝาหน้ากาก CT A-103 (สีขาว)"
  components: {
    rawMaterialId: string;
    quantity: number; // quantity of raw material per ONE unit of finished good
  }[];
}

export interface Machine {
  id: string;
  name: string;
  location: string;
  status: 'Running' | 'Down' | 'Maintenance' | 'Idle' | 'Mold Change';
  nextPmDate?: string;
  lastStartedAt?: string;
  workingHoursPerDay?: number;
}

export interface MaintenanceLog {
  id: string;
  machineId: string;
  date: string;
  type: 'Preventive' | 'Corrective';
  description: string;
  downtimeHours: number;
  technician: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  orderDate: string;
  expectedDate: string;
  status: 'Draft' | 'Sent' | 'Partially Received' | 'Completed' | 'Cancelled';
  items: {
    rawMaterialId: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface Shipment {
    id: string;
    shipmentDate: string;
    orderIds: string[]; // Can be manually entered order numbers or IDs
    carrier: string;
    trackingNumber: string;
    status: 'In Transit' | 'Delivered' | 'Delayed';
}

export interface BurmeseTranslation {
    [key: string]: string;
}

export interface AppRole {
    id: string;
    name: string;
}

export interface CompanyInfo {
    name: string;
    address: string;
    taxId: string;
    logoUrl?: string;
    currentUserRoleId: string;
}

export interface AppSettings {
    companyInfo: CompanyInfo;
    qcFailureReasons: string[];
    productionStatuses: string[];
    roles: AppRole[];
    dashboardLayouts: Record<string, string[]>; // Key is role.id
}

export interface AppNotification {
  id: string;
  type: 'orderDue' | 'qcPending' | 'maintenance' | 'lowFinishedStock' | 'highRejectionRate';
  message: string;
  actionTab: Tab;
  entityId: string;
  date: string;
}

export interface AnomalyFinding {
  type: 'machine' | 'operator' | 'product';
  entityName: string;
  message: string;
  suggestion: string;
  data: {
    produced: number;
    rejected: number;
    rate: number;
  };
}

export interface AIProductionPlanItem {
    productName: string;
    quantity: number;
    machine: string;
    reason: string;
    priority: number;
}

export interface OeeData {
    machineName: string;
    availability: number;
    performance: number;
    quality: number;
    oee: number;
}

export interface AIInventoryForecastItem {
    rawMaterialId: string;
    rawMaterialName: string;
    unit: string;
    currentStock: number;
    daysUntilStockout: number;
    reason: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
}

export interface Complaint {
  id: string;
  customerId: string;
  orderId: string;
  complaintDate: string;
  description: string;
  status: 'Open' | 'Investigating' | 'Resolved';
}

export interface ProductionQueueItem {
  id: string;
  machineId: string;
  productId: string; // The Product ID
  productName: string; // The full product name "Product (Color)"
  quantityGoal: number;
  quantityProduced: number; // Sum from relevant molding logs
  status: 'Queued' | 'In Progress' | 'Completed';
  priority: number; // e.g., 1 = highest
  addedDate: string;
  orderId?: string; // Optional link to sales order
  operatorName?: string;
  lastCycleTimestamp?: number; // Used for cycle time production simulation
}

export interface MachineDailyLog {
  id: string;
  machineId: string;
  jobId: string;
  date: string; // YYYY-MM-DD
  hours: number;
}

export interface PackingStation {
  id: string;
  name: string;
  status: 'Running' | 'Idle' | 'Maintenance';
  lastStartedAt?: string;
}

export interface PackingQueueItem {
  id: string;
  stationId: string;
  productName: string;
  quantityGoal: number;
  quantityPacked: number;
  status: 'Queued' | 'In Progress' | 'Completed';
  priority: number;
  addedDate: string;
  orderId?: string;
  packerName?: string;
}