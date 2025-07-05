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
  type: 'translate' | 'suggest' | 'parseOrders' | 'parseRawMaterials';
  payload: unknown;
}

interface TranslatePayload {
  items: string[];
}

interface ParsePayload {
    text: string;
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
        const prompt = `Based on the features of this comprehensive factory production management system (dashboard, order management, shipment tracking, procurement, raw material analysis, molding production logs, production status kanban, packing logs, quality control, finished goods inventory, raw materials inventory & BOMs, machine maintenance, employee management, cost analysis, statistics, and reporting), suggest 3 new, impactful features to further enhance it. The suggestions should be practical for a manufacturing environment. Format the response as a JSON array of objects, each with "title" (string, in Thai) and "description" (string, in Thai).

Example format:
[
  {
    "title": "การแจ้งเตือนอัตโนมัติ",
    "description": "ส่งการแจ้งเตือนผ่าน Line หรือ Email เมื่อสต็อกวัตถุดิบหรือสินค้าใกล้หมด หรือเมื่อมีงาน QC ที่ต้องตรวจสอบ"
  },
  {
    "title": "แดชบอร์ดประสิทธิภาพเครื่องจักร",
    "description": "แสดงผล OEE (Overall Equipment Effectiveness) ของเครื่องจักรแต่ละตัวแบบเรียลไทม์"
  },
  {
    "title": "ระบบบาร์โค้ด/QR Code",
    "description": "ใช้บาร์โค้ดในการรับวัตถุดิบ, ติดตามงานระหว่างผลิต (WIP), และบันทึกการแพ็คเพื่อลดความผิดพลาดและเพิ่มความรวดเร็ว"
  }
]
`;
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-04-17",
          contents: prompt,
          config: { responseMimeType: "application/json", temperature: 0.7 },
        });

<<<<<<< HEAD
        const responseText = response.text;
        if(responseText) {
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
              model: "gemini-2.5-flash-preview-04-17",
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
        const prompt = `You are an intelligent data entry assistant for a factory's inventory system. Your task is to parse a block of free-form text containing multiple raw material entries and convert it into a structured JSON array.

Each object in the array represents a single raw material and must have the following keys:
- "name": string, The name of the raw material.
- "quantity": number, The quantity of the material.
- "unit": string, The unit of measurement (e.g., 'kg', 'ชิ้น', 'ม้วน', 'เมตร').
- "costPerUnit": number, The cost per unit. This is optional. If not mentioned, omit the key or set it to null.

Here are some examples of input text and the expected output:

Input:
เม็ดพลาสติก PP สีขาว 100 kg ราคา 55 บาทต่อโล
สกรู M3x10 5000 ชิ้น 0.25 บาท
ฟิล์มกันรอย 10 ม้วน

Expected Output:
[
  { "name": "เม็ดพลาสติก PP สีขาว", "quantity": 100, "unit": "kg", "costPerUnit": 55 },
  { "name": "สกรู M3x10", "quantity": 5000, "unit": "ชิ้น", "costPerUnit": 0.25 },
  { "name": "ฟิล์มกันรอย", "quantity": 10, "unit": "ม้วน" }
]

Now, parse the following text and provide ONLY the JSON array as a response:

${payload.text}`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-04-17",
          contents: prompt,
          config: { responseMimeType: "application/json", temperature: 0.1 },
        });

=======
>>>>>>> 1840fa9cc8c9710c8a62cf78725126560f1855c9
        const responseText = response.text;
        if(responseText) {
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
