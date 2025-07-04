
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

// Ensure API key is available in the serverless environment
if (!process.env.API_KEY) {
  // Log the error on the server, but don't expose details to the client
  console.error("FATAL: API_KEY environment variable not set.");
  // This will cause the function to fail, which is appropriate.
  throw new Error("Server configuration error.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Type definitions for request body to ensure type safety
interface ApiRequestBody {
  type: 'translate' | 'suggest';
  payload: unknown;
}

interface TranslatePayload {
  items: string[];
}

// Type guards to validate payloads
const isTranslatePayload = (payload: unknown): payload is TranslatePayload => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'items' in payload &&
    Array.isArray((payload as TranslatePayload).items)
  );
};

// Helper to parse JSON, removing markdown fences
const parseJsonResponse = (text: string) => {
    let jsonStr = text.trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
        jsonStr = match[1].trim();
    }
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse JSON response on server:", e, "Original text:", text);
        return null; // Return null on parsing error
    }
};

// Main handler for the serverless function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { type, payload } = req.body as ApiRequestBody;

    let result: unknown;

    switch (type) {
      case 'translate': {
        if (!isTranslatePayload(payload)) {
          return res.status(400).json({ error: 'Invalid payload for translation request.' });
        }
        const prompt = `Translate the following Thai product names into Burmese. Return a single JSON object where keys are the original Thai names and values are their Burmese translations.
    
Input Thai Names: ${JSON.stringify(payload.items)}

Example response format:
{
  "ฝาหน้ากาก CT A-103": "မျက်နှာဖုံးအဖုံး CT A-103",
  "สายไฟ VAF 2x1.5": "VAF 2x1.5 ဝါယာကြိုး"
}
`;
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-04-17",
          contents: prompt,
          config: { responseMimeType: "application/json", temperature: 0.2 },
        });

        const responseText = response.text;
        if (responseText) {
            result = parseJsonResponse(responseText);
        } else {
            result = null;
        }
        break;
      }
      
      case 'suggest': {
        const prompt = `You are a senior logistics and operations consultant. A web app for managing a packing department with Thai and Burmese workers needs new features.
Current features: 
1. Create, **edit**, print, and ship packing orders. Orders have Thai/Burmese translations.
2. Log daily packed items. **Logs are now assigned to a specific employee.**
3. Inventory is automatically updated from packing logs and shipping actions.
4. **Automated low-stock alerts:** Users can set a minimum stock level for each item, and the UI highlights items that fall below this threshold. A global notification icon alerts users.
5. **Advanced statistics dashboard:** Features date-range filters and can now be **filtered by employee** to track individual performance.
6. Ability to export packing history and blank forms to Excel.

Based on this powerful existing system, suggest 3 highly innovative new features that would provide the most business value. For each feature, provide a 'title' and a short 'description'. Format the response as a JSON array of objects.`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: prompt,
            config: { responseMimeType: "application/json", temperature: 0.7 },
        });
        
        const responseText = response.text;
        if (responseText) {
            result = parseJsonResponse(responseText);
        } else {
            result = null;
        }
        break;
      }

      default:
        return res.status(400).json({ error: 'Invalid API call type specified.' });
    }
    
    // If the AI returns nothing or parsing fails, send an appropriate response
    if (result === null) {
        return res.status(502).json({ error: 'Failed to get a valid response from the AI model.' });
    }

    // Send the successful result
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error in API proxy handler:', error);
    // Do not expose internal error details to the client
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
}