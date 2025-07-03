import { AiSuggestion, BurmeseTranslation } from "../types";

// This function communicates with our secure, serverless API proxy
async function callApiProxy<T>(type: 'translate' | 'suggest', payload: object): Promise<T> {
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


export const getFeatureSuggestions = async (): Promise<AiSuggestion[]> => {
    try {
        // No payload is needed for suggestions
        const suggestions = await callApiProxy<AiSuggestion[]>('suggest', {});
        return suggestions || [];
    } catch (error) {
        console.error("Feature suggestion fetch failed.", error);
        // Return an empty array so the UI doesn't break
        return [];
    }
};
