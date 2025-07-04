

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
        const prompt = `You are a senior manufacturing and operations consultant. A web app for managing a factory with Thai and Burmese workers needs new features.
Current features: 
1.  **Order Management:** Create, edit, print (with Thai/Burmese translations), and ship packing orders.
2.  **Molding Department:** Log daily production runs of plastic parts, including good parts, rejects, machine used, and operator. This is the upstream process.
3.  **Production Status Tracking:** A Kanban-style board to visualize the entire production workflow after molding. Batches are tracked through intermediate steps like 'scratch-proofing' and 'sub-assembly' before reaching the final packing or assembly rooms.
4.  **Packing Log:** Log daily packed items, assigning each log to a specific employee.
5.  **Inventory Management:** Inventory of packed goods is automatically updated from packing logs and shipping actions. Users can set minimum stock levels for items, triggering low-stock alerts.
6.  **Employee Management:** Manage employee profiles and view individual performance statistics.
7.  **Dashboard:** A comprehensive overview of key metrics like upcoming orders, low stock items, top performing employees, today's molding production, Work-In-Progress (WIP) count, and recent packing trends.
8.  **Advanced Reporting:** Export packing history, molding history, and inventory status to Excel.
9.  **Quality Control (QC) Module:** After an item is packed, a QC entry is automatically created. A dedicated QC tab allows inspectors to Pass/Fail items, add notes, specify failure reasons, and upload photo evidence. This links packing performance directly to quality outcomes.

Based on this powerful existing system, suggest 3 highly innovative new features that would provide the most business value by integrating the departments or improving efficiency. For each feature, provide a 'title' and a short 'description'. Format the response as a JSON array of objects.`;
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
