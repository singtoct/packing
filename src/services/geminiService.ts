
import { BurmeseTranslation, OrderItem, RawMaterial, MoldingLogEntry, AnomalyFinding, AIProductionPlanItem, InventoryItem, Machine, BillOfMaterial, AIInventoryForecastItem } from "../types";

// This function communicates with our secure, serverless API proxy
async function callApiProxy<T>(type: 'translate' | 'parseOrders' | 'parseRawMaterials' | 'analyzeAnomalies' | 'generateProductionPlan' | 'generateInventoryForecast', payload: object): Promise<T> {
    try {
        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ type, payload }),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ error: `Request failed with status: ${response.status}` }));
            throw new Error(errorBody.error || 'An unknown API error occurred.');
        }

        return await response.json() as T;

    } catch (error) {
        console.error(`API proxy call for '${type}' failed:`, error);
        // Re-throw the error to be handled by the calling component's logic
        throw error;
    }
}


export const translateToBurmese = async (items: string[]): Promise<BurmeseTranslation> => {
    if (!items || items.length === 0) {
        return {};
    }
    try {
        // The payload must match what the API expects
        const payload = { items };
        const translations = await callApiProxy<BurmeseTranslation>('translate', payload);
        return translations || {};
    } catch (error) {
        // Fallback behavior: if translation fails, return original items
        // This ensures the app remains functional even if the AI service is down.
        console.warn("Translation failed, using fallback.", error);
        return items.reduce((acc, item) => ({ ...acc, [item]: item }), {});
    }
};

export const parseIntelligentOrders = async (text: string): Promise<Partial<OrderItem>[]> => {
    if (!text.trim()) {
        return [];
    }
    try {
        const payload = { text };
        const result = await callApiProxy<Partial<OrderItem>[] | Partial<OrderItem>>('parseOrders', payload);
        
        if (Array.isArray(result)) {
            return result || [];
        }
        
        // Handle case where AI returns a single object instead of an array
        if (result && typeof result === 'object' && !Array.isArray(result)) {
            if ('error' in result && typeof (result as any).error === 'string') {
                 throw new Error((result as any).error);
            }
            return [result as Partial<OrderItem>];
        }

        return [];
    } catch (error) {
        console.error("Intelligent order parsing failed.", error);
        throw error; // Re-throw to be handled by the UI
    }
};

export const parseIntelligentRawMaterials = async (text: string): Promise<Partial<RawMaterial>[]> => {
    if (!text.trim()) {
        return [];
    }
    try {
        const payload = { text };
        const result = await callApiProxy<Partial<RawMaterial>[] | Partial<RawMaterial>>('parseRawMaterials', payload);
        
        if (Array.isArray(result)) {
            return result || [];
        }
        
        // Handle case where AI returns a single object instead of an array
        if (result && typeof result === 'object' && !Array.isArray(result)) {
            if ('error' in result && typeof (result as any).error === 'string') {
                 throw new Error((result as any).error);
            }
            return [result as Partial<RawMaterial>];
        }

        return []; // Return empty array if result is not an array or object
    } catch (error) {
        console.error("Intelligent raw material parsing failed.", error);
        throw error;
    }
};

export const analyzeProductionAnomalies = async (moldingLogs: MoldingLogEntry[]): Promise<AnomalyFinding[]> => {
    if (!moldingLogs || moldingLogs.length === 0) {
        return [];
    }
    try {
        const payload = { moldingLogs };
        const findings = await callApiProxy<AnomalyFinding[]>('analyzeAnomalies', payload);
        return findings || [];
    } catch (error) {
        console.error("Production anomaly analysis failed.", error);
        // In case of error, return an empty array to not break the UI
        return [];
    }
};

export const generateProductionPlan = async (
    orders: OrderItem[], 
    inventory: InventoryItem[], 
    machines: Machine[], 
    boms: BillOfMaterial[], 
    rawMaterials: RawMaterial[]
): Promise<AIProductionPlanItem[]> => {
    try {
        // --- Data Pruning to reduce payload size ---
        // 1. Filter for only the most relevant data to send to the AI
        const runningMachines = machines.filter(m => m.status === 'Running');
        
        const requiredProductNames = new Set<string>();
        orders.forEach(o => requiredProductNames.add(`${o.name} (${o.color})`));
        inventory.forEach(i => {
            if (i.minStock !== undefined && i.quantity < i.minStock) {
                requiredProductNames.add(i.name);
            }
        });

        const relevantBoms = boms.filter(b => requiredProductNames.has(b.productName));
        
        const requiredMaterialIds = new Set<string>();
        relevantBoms.forEach(b => {
            b.components.forEach(c => requiredMaterialIds.add(c.rawMaterialId));
        });

        const relevantRawMaterials = rawMaterials.filter(rm => requiredMaterialIds.has(rm.id));

        // 2. Create a lean payload with only necessary fields to minimize request size
        const payload = {
            orders: orders.map(({ id, name, color, quantity, dueDate }) => ({ id, name, color, quantity, dueDate })),
            inventory: inventory.filter(i => i.minStock !== undefined && i.quantity < i.minStock),
            machines: runningMachines.map(({ name, status }) => ({ name, status })),
            boms: relevantBoms,
            rawMaterials: relevantRawMaterials.map(({ id, name, quantity, unit }) => ({ id, name, quantity, unit }))
        };

        const plan = await callApiProxy<AIProductionPlanItem[]>('generateProductionPlan', payload);
        return plan || [];
    } catch (error) {
        console.error("AI Production Plan generation failed:", error);
        throw error; // Let the UI handle this error
    }
};

export const generateInventoryForecast = async (
    orders: OrderItem[],
    moldingLogs: MoldingLogEntry[],
    boms: BillOfMaterial[],
    rawMaterials: RawMaterial[]
): Promise<AIInventoryForecastItem[]> => {
    try {
        // --- Data Pruning to reduce payload size ---
        // Create a lean payload with only necessary fields for the AI model
        const payload = {
            orders: orders.map(({ name, color, quantity, dueDate }) => ({ name, color, quantity, dueDate })),
            moldingLogs: moldingLogs.map(({ productName, quantityProduced, date }) => ({ productName, quantityProduced, date })),
            boms, // BOMs are relatively small and needed for full context
            rawMaterials: rawMaterials.map(({ id, name, quantity, unit }) => ({ id, name, quantity, unit })),
        };
        const forecast = await callApiProxy<AIInventoryForecastItem[]>('generateInventoryForecast', payload);
        return forecast || [];
    } catch (error) {
        console.error("AI Inventory Forecast generation failed:", error);
        throw error;
    }
};
