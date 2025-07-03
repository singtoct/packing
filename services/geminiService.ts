
import { GoogleGenAI } from "@google/genai";
import { AiSuggestion, BurmeseTranslation } from "../types";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const parseJsonResponse = <T,>(text: string): T | null => {
    let jsonStr = text.trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
        jsonStr = match[1].trim();
    }
    try {
        return JSON.parse(jsonStr) as T;
    } catch (e) {
        console.error("Failed to parse JSON response:", e, "Original text:", text);
        return null;
    }
};

export const translateToBurmese = async (items: string[]): Promise<BurmeseTranslation> => {
    const prompt = `Translate the following Thai product names into Burmese. Return a single JSON object where keys are the original Thai names and values are their Burmese translations.
    
Input Thai Names: ${JSON.stringify(items)}

Example response format:
{
  "ฝาหน้ากาก CT A-103": "မျက်နှာဖုံးအဖုံး CT A-103",
  "สายไฟ VAF 2x1.5": "VAF 2x1.5 ဝါယာကြိုး"
}
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.2,
            },
        });
        
        const translations = parseJsonResponse<BurmeseTranslation>(response.text);
        if (translations) {
            return translations;
        }
        // Fallback: if JSON parsing fails, return original items
        return items.reduce((acc, item) => ({ ...acc, [item]: item }), {});
        
    } catch (error) {
        console.error("Error translating to Burmese:", error);
        // On error, return an object mapping original names to themselves
        return items.reduce((acc, item) => ({ ...acc, [item]: item }), {});
    }
};


export const getFeatureSuggestions = async (): Promise<AiSuggestion[]> => {
    const prompt = `You are a senior logistics and operations consultant. A web app for managing a packing department with Thai and Burmese workers needs new features.
Current features: 
1. Create packing orders.
2. Print orders with Thai names translated to Burmese.
3. Log daily packed items.
4. View weekly packing statistics.

Suggest 3 innovative new features. For each feature, provide a 'title' and a short 'description'. Format the response as a JSON array of objects.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.7,
            }
        });

        const suggestions = parseJsonResponse<AiSuggestion[]>(response.text);
        return suggestions || [];
    } catch (error) {
        console.error("Error getting feature suggestions:", error);
        return [];
    }
};
