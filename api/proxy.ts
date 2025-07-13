

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";
import { MoldingLogEntry } from '../src/types';

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
  type: 'translate' | 'parseOrders' | 'parseRawMaterials' | 'analyzeAnomalies';
  payload: unknown;
}

interface TranslatePayload {
  items: string[];
}

interface ParsePayload {
    text: string;
}

interface AnalyzeAnomaliesPayload {
    moldingLogs: MoldingLogEntry[];
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

const isParsePayload = (payload: unknown): payload is ParsePayload => {
    return (
        typeof payload === 'object' &&
        payload !== null &&
        'text' in payload &&
        typeof (payload as ParsePayload).text === 'string'
    );
};

const isAnalyzeAnomaliesPayload = (payload: unknown): payload is AnalyzeAnomaliesPayload => {
    return (
        typeof payload === 'object' &&
        payload !== null &&
        'moldingLogs' in payload &&
        Array.isArray((payload as AnalyzeAnomaliesPayload).moldingLogs)
    );
};

// Helper to parse JSON, removing markdown fences
const parseJsonResponse = (text: string) => {
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```json') && jsonStr.endsWith('```')) {
        jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
    } else if (jsonStr.startsWith('```') && jsonStr.endsWith('```')) {
         jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
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
          model: "gemini-2.5-flash",
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
      
        case 'parseOrders': {
            if (!isParsePayload(payload)) {
              return res.status(400).json({ error: 'Invalid payload for order parsing request.' });
            }
            const today = new Date().toISOString().split('T')[0];
            const prompt = `You are an intelligent data entry assistant for a factory's ERP system. Your task is to parse a block of free-form text containing multiple product orders and convert it into a structured JSON array.

Each object in the array represents a single order and must have the following keys:
- "name": string, The name of the product.
- "color": string, The color of the product.
- "quantity": number, The number of cases ordered.
- "salePrice": number, The price per case. This is optional. If not mentioned, omit the key or set it to null.
- "dueDate": string, The delivery due date in "YYYY-MM-DD" format. If no date is mentioned for an item, use today's date which is ${today}.

Here are some examples of input text and the expected output:

Input:
ฝาหน้ากาก CT A-103 สีขาว 50 ลัง ราคา 350 บาท ส่งวันที่ 25/12/2024
สายไฟ VAF 2x1.5 สีขาว 20 ลัง 2500 บาท
ปลั๊กกราวด์คู่ สีดำ 100ลัง

Expected Output:
[
  { "name": "ฝาหน้ากาก CT A-103", "color": "สีขาว", "quantity": 50, "salePrice": 350, "dueDate": "2024-12-25" },
  { "name": "สายไฟ VAF 2x1.5", "color": "สีขาว", "quantity": 20, "salePrice": 2500, "dueDate": "${today}" },
  { "name": "ปลั๊กกราวด์คู่", "color": "สีดำ", "quantity": 100, "dueDate": "${today}" }
]

Now, parse the following text and provide ONLY the JSON array as a response:

${payload.text}`;

            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: prompt,
              config: { responseMimeType: "application/json", temperature: 0.1 },
            });

            const responseText = response.text;
            if (responseText) {
                result = parseJsonResponse(responseText);
            } else {
                result = null;
            }
            break;
      }
      
      case 'parseRawMaterials': {
        if (!isParsePayload(payload)) {
          return res.status(400).json({ error: 'Invalid payload for raw material parsing request.' });
        }
        const prompt = `You are an intelligent data entry assistant for a factory's inventory system. Your task is to parse a block of free-form or tabular text containing multiple raw material entries and convert it into a structured JSON array.

Each object in the array represents a single raw material and MUST have the following keys with primitive values:
- "name": string. The name of the raw material.
- "quantity": number. The initial quantity. If not mentioned in the text for an item, you MUST default this value to 0.
- "unit": string. The unit of measurement (e.g., 'kg', 'Pcs.', 'ชิ้น').
- "costPerUnit": number. The cost per unit. This is optional. If not mentioned or empty, omit this key from the object.

The input can be tabular data copied from a spreadsheet, where columns might be separated by tabs or multiple spaces. The first line might be a header (e.g., "ชื่อ หน่วยนับ ราคาซื้อ"); you should ignore this header row. The data format can be inconsistent.

Example 1: Tabular input from a spreadsheet
Input:
ชื่อ	หน่วยนับ	ราคาซื้อ
กล่อง GN2 2นิ้วx4นิ้ว ขนาด 280x390x440 mm. CT	Pcs.	14.00
พลาสติกกันรอย NEW 2 153 mm. (1 ม้วน แปะได้ 1,730 ชิ้น)	Pcs.	
เม็ด ABS ดำ			kg		47.50

Expected Output:
[
  { "name": "กล่อง GN2 2นิ้วx4นิ้ว ขนาด 280x390x440 mm. CT", "quantity": 0, "unit": "Pcs.", "costPerUnit": 14.00 },
  { "name": "พลาสติกกันรอย NEW 2 153 mm. (1 ม้วน แปะได้ 1,730 ชิ้น)", "quantity": 0, "unit": "Pcs." },
  { "name": "เม็ด ABS ดำ", "quantity": 0, "unit": "kg", "costPerUnit": 47.50 }
]

Example 2: Tabular format with interleaved labels
Input:
กล่อง GN2 2นิ้วx4นิ้ว ขนาด 280x390x440 mm. G-Power	ราคา	14.00	ต่อ 1	Pcs.

Expected Output:
[
  { "name": "กล่อง GN2 2นิ้วx4นิ้ว ขนาด 280x390x440 mm. G-Power", "quantity": 0, "unit": "Pcs.", "costPerUnit": 14.00 }
]

Example 3: Tabular format with quantity and price labels. This is a very important case.
Input:
กล่อง GN2 2นิ้วx4นิ้ว ขนาด 280x390x440 mm. CT  	1	Pcs.	ราคา	14.00	บาท

Expected Output:
[
  { "name": "กล่อง GN2 2นิ้วx4นิ้ว ขนาด 280x390x440 mm. CT", "quantity": 1, "unit": "Pcs.", "costPerUnit": 14.00 }
]

Example 4: Free-form text input
Input:
เม็ดพลาสติก PP สีขาว 100 kg ราคา 55 บาทต่อโล
ฟิล์มกันรอย 10 ม้วน

Expected Output:
[
  { "name": "เม็ดพลาสติก PP สีขาว", "quantity": 100, "unit": "kg", "costPerUnit": 55 },
  { "name": "ฟิล์มกันรอย", "quantity": 10, "unit": "ม้วน" }
]

CRITICAL INSTRUCTIONS:
- Your output MUST be a valid JSON array.
- Each object in the array MUST only contain the keys: "name", "quantity", "unit", "costPerUnit".
- Every value in the objects MUST be a primitive (string, number). DO NOT use nested objects.
- The "quantity" field MUST ALWAYS be a number. Default to 0 if not provided in the source text.
- IGNORE text labels like 'ราคา', 'ต่อ 1', or 'บาท'. Find the numeric price and assign it to "costPerUnit".
- The columns can be in different orders. Be robust in parsing the values. For example, in 'Name Qty Unit ราคา Price บาท', you must extract Name, Qty, Unit, and Price correctly.

Now, parse the following text and provide ONLY the JSON array as a response:

${payload.text}`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json", temperature: 0.1 },
        });

        const responseText = response.text;
        if (responseText) {
            result = parseJsonResponse(responseText);
        } else {
            result = null;
        }
        break;
      }
      
      case 'analyzeAnomalies': {
        if (!isAnalyzeAnomaliesPayload(payload)) {
            return res.status(400).json({ error: 'Invalid payload for anomaly analysis request.' });
        }
        const today = new Date().toISOString().split('T')[0];
        const prompt = `You are a production analyst AI for a factory. Your task is to analyze the provided JSON data of molding logs from the last 30 days to identify anomalies. Today's date is ${today}.

Anomalies to look for:
1.  **High Machine Rejection Rate**: Any machine with a total rejection rate over 5% on more than 100 parts produced.
2.  **High Operator Rejection Rate**: Any operator with a total rejection rate over 5% on more than 100 parts produced.
3.  **High Product Rejection Rate**: Any product with a total rejection rate over 5% across all production.

Return your findings as a JSON array of objects. Each object must have these keys:
- "type": string, one of "machine", "operator", or "product".
- "entityName": string, the name of the machine, operator, or product.
- "message": string, a human-readable summary of the anomaly (e.g., "Rejection rate of 8.5% (55 rejected / 650 produced)").
- "suggestion": string, a recommended action (e.g., "Schedule maintenance check for this machine.", "Review production process with this operator.").
- "data": object, containing { "produced": number, "rejected": number, "rate": number }.

Example output:
[
  {
    "type": "machine",
    "entityName": "เครื่องฉีด 5",
    "message": "Rejection rate of 8.5% (55 rejected / 650 produced).",
    "suggestion": "Schedule maintenance check for this machine.",
    "data": { "produced": 650, "rejected": 55, "rate": 0.085 }
  }
]

If no anomalies are found, return an empty array [].

Now, analyze the following data:
${JSON.stringify(payload.moldingLogs)}
`;
         const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: prompt,
              config: { responseMimeType: "application/json", temperature: 0.3 },
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