


import { BurmeseTranslation, OrderItem, RawMaterial } from "../types";

// This function communicates with our secure, serverless API proxy
async function callApiProxy<T>(type: 'translate' | 'parseOrders' | 'parseRawMaterials', payload: object): Promise<T> {
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
        const orders = await callApiProxy<Partial<OrderItem>[]>('parseOrders', payload);
        return orders || [];
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
        const materials = await callApiProxy<Partial<RawMaterial>[]>('parseRawMaterials', payload);
        return materials || [];
    } catch (error) {
        console.error("Intelligent raw material parsing failed.", error);
        throw error;
    }
};