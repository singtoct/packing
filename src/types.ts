
export interface OrderItem {
  id: string;
  name: string;
  color: string;
  quantity: number;
  dueDate: string;
}

export interface PackingLogEntry {
  id:string;
  date: string;
  name: string;
  quantity: number;
  packerName: string;
}

export interface InventoryItem {
    name: string;
    quantity: number;
    minStock?: number;
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

export interface AiSuggestion {
    title: string;
    description: string;
}

export interface BurmeseTranslation {
    [key: string]: string;
}
