
export type Tab = 'dashboard' | 'factory_floor' | 'orders' | 'analysis' | 'procurement' | 'molding' | 'production_status' | 'logs' | 'qc' | 'shipments' | 'inventory' | 'raw_materials' | 'maintenance' | 'employees' | 'cost_analysis' | 'stats' | 'reports' | 'products' | 'settings';


export interface OrderItem {
  id: string;
  name: string;
  color: string;
  quantity: number;
  dueDate: string;
  salePrice?: number; // Price per case
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
  materialCost?: number;
}

export interface InventoryItem {
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
}

export interface BillOfMaterial {
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
  status: 'Running' | 'Down' | 'Maintenance';
  nextPmDate?: string;
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

export interface CompanyInfo {
    name: string;
    address: string;
    taxId: string;
}

export interface AppSettings {
    companyInfo: CompanyInfo;
    qcFailureReasons: string[];
    productionStatuses: string[];
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
