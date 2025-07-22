import { GoogleGenAI, Type } from "@google/genai";
import { BurmeseTranslation, OrderItem, RawMaterial, MoldingLogEntry, AnomalyFinding, AIProductionPlanItem, InventoryItem, Machine, BillOfMaterial, AIInventoryForecastItem } from "../types";

// The application assumes the API_KEY environment variable is set.
// The previous check and alert have been removed to prevent blocking the app's startup.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

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
        console.error("Failed to parse JSON response:", e, "Original text:", text);
        // Throw an error that can be caught by the calling component
        throw new Error(`AI returned malformed JSON. Please check the console for details.`);
    }
};

export const translateToBurmese = async (items: string[]): Promise<BurmeseTranslation> => {
    if (!items || items.length === 0) {
        return {};
    }
    try {
        const prompt = `Translate the following Thai product names into Burmese. Return a single JSON object where keys are the original Thai names and values are their Burmese translations.
    
Input Thai Names: ${JSON.stringify(items)}

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
            return parseJsonResponse(responseText);
        }
        return {};
    } catch (error) {
        console.warn("Translation failed, using fallback.", error);
        return items.reduce((acc, item) => ({ ...acc, [item]: item }), {});
    }
};


export const parseIntelligentOrders = async (text: string): Promise<Partial<OrderItem>[]> => {
    if (!text.trim()) {
        return [];
    }
    try {
        const today = new Date().toISOString().split('T')[0];
        const prompt = `You are an intelligent data entry assistant for a factory's ERP system. Your task is to parse a block of free-form text containing multiple product orders and convert it into a structured JSON array.

Each object in the array represents a single order and must have the following keys:
- "name": string, The name of the product.
- "color": string, The color of the product.
- "quantity": number, The number of pieces ordered.
- "salePrice": number, The price per piece. This is optional. If not mentioned, omit the key or set it to null.
- "dueDate": string, The delivery due date in "YYYY-MM-DD" format. If no date is mentioned for an item, use today's date which is ${today}.

Here are some examples of input text and the expected output:

Input:
ฝาหน้ากาก CT A-103 สีขาว 5000 ชิ้น ราคา 3.57 บาท ส่งวันที่ 25/12/2024
สายไฟ VAF 2x1.5 สีขาว 200 ชิ้น
ปลั๊กกราวด์คู่ สีดำ 1000 ชิ้น ราคา 15 บาท

Expected Output:
[
  { "name": "ฝาหน้ากาก CT A-103", "color": "สีขาว", "quantity": 5000, "salePrice": 3.57, "dueDate": "2024-12-25" },
  { "name": "สายไฟ VAF 2x1.5", "color": "สีขาว", "quantity": 200, "dueDate": "${today}" },
  { "name": "ปลั๊กกราวด์คู่", "color": "สีดำ", "quantity": 1000, "salePrice": 15, "dueDate": "${today}" }
]

Now, parse the following text and provide ONLY the JSON array as a response:

${text}`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json", temperature: 0.1 },
        });

        const responseText = response.text;
        if (responseText) {
            const result = parseJsonResponse(responseText);
            if (Array.isArray(result)) {
                return result || [];
            }
            if (result && typeof result === 'object' && !Array.isArray(result)) {
                 if ('error' in result && typeof (result as any).error === 'string') {
                     throw new Error((result as any).error);
                }
                return [result as Partial<OrderItem>];
            }
            return [];
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

${text}`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json", temperature: 0.1 },
        });

        const responseText = response.text;
        if (responseText) {
            const result = parseJsonResponse(responseText);
             if (Array.isArray(result)) {
                return result || [];
            }
            if (result && typeof result === 'object' && !Array.isArray(result)) {
                 if ('error' in result && typeof (result as any).error === 'string') {
                     throw new Error((result as any).error);
                }
                return [result as Partial<RawMaterial>];
            }
            return [];
        }
        return [];
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
${JSON.stringify(moldingLogs)}
`;
         const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: prompt,
              config: { responseMimeType: "application/json", temperature: 0.3 },
            });
        
        const responseText = response.text;
        if (responseText) {
            return parseJsonResponse(responseText);
        }
        return [];
    } catch (error) {
        console.error("Production anomaly analysis failed.", error);
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

        const payload = {
            orders: orders.map(({ id, name, color, quantity, dueDate }) => ({ id, name, color, quantity, dueDate })),
            inventory: inventory.filter(i => i.minStock !== undefined && i.quantity < i.minStock),
            machines: runningMachines.map(({ name, status }) => ({ name, status })),
            boms: relevantBoms,
            rawMaterials: relevantRawMaterials.map(({ id, name, quantity, unit }) => ({ id, name, quantity, unit }))
        };

        const prompt = `You are an expert production planner for a plastic injection molding factory. Your goal is to create an optimal daily production plan based on the provided data. Today is ${new Date().toLocaleDateString()}.

You are given:
1.  **Open Sales Orders**: Prioritize orders with closer due dates.
2.  **Current Finished Goods Inventory**: Identify products below their minimum stock level.
3.  **Available Machines**: Only use machines with 'Running' status.
4.  **Bills of Materials (BOMs)**: Defines raw materials needed for each product.
5.  **Raw Material Inventory**: Current stock of raw materials.

Your task is to generate a prioritized list of production tasks for today.

CRITICAL CONSTRAINTS:
1.  **Material Check**: Before scheduling a product, you MUST verify that ALL required raw materials are available in sufficient quantity by checking the BOM against the raw material inventory. If materials are insufficient, DO NOT schedule the item.
2.  **Prioritization Logic**:
    a. Highest priority: Fulfilling open sales orders. Prioritize orders with the nearest due dates first.
    b. Second priority: Replenishing finished goods that have fallen below their specified 'minStock' level.
3.  **Machine Allocation**: Distribute tasks among available 'Running' machines.

Generate the plan based on the provided data below. If no production is possible or necessary, generate an empty array.
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { text: prompt },
                    { text: "Sales Orders:" },
                    { text: JSON.stringify(payload.orders) },
                    { text: "Finished Goods Inventory:" },
                    { text: JSON.stringify(payload.inventory) },
                    { text: "Machines:" },
                    { text: JSON.stringify(payload.machines) },
                    { text: "BOMs:" },
                    { text: JSON.stringify(payload.boms) },
                    { text: "Raw Materials:" },
                    { text: JSON.stringify(payload.rawMaterials) },
                ]
            },
            config: {
                temperature: 0.2,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            productName: { type: Type.STRING },
                            quantity: { type: Type.NUMBER },
                            machine: { type: Type.STRING },
                            reason: { type: Type.STRING },
                            priority: { type: Type.NUMBER },
                        },
                        required: ["productName", "quantity", "machine", "reason", "priority"]
                    }
                }
            },
        });

        const responseText = response.text;
        if (responseText) {
            return parseJsonResponse(responseText);
        }
        return [];
    } catch (error) {
        console.error("AI Production Plan generation failed:", error);
        throw error;
    }
};

export const generateInventoryForecast = async (
    orders: OrderItem[],
    moldingLogs: MoldingLogEntry[],
    boms: BillOfMaterial[],
    rawMaterials: RawMaterial[]
): Promise<AIInventoryForecastItem[]> => {
    try {
        const payload = {
            orders: orders.map(({ name, color, quantity, dueDate }) => ({ name, color, quantity, dueDate })),
            moldingLogs: moldingLogs.map(({ productName, quantityProduced, date }) => ({ productName, quantityProduced, date })),
            boms,
            rawMaterials: rawMaterials.map(({ id, name, quantity, unit }) => ({ id, name, quantity, unit })),
        };

        const prompt = `You are an inventory forecasting AI for a factory. Analyze the provided data to predict when raw materials will run out of stock. Today is ${new Date().toLocaleDateString()}.

You are given:
1.  **Current Raw Material Inventory**: A list of materials with their current quantities.
2.  **Historical Usage (Molding Logs)**: Production logs from the last 30 days. Use this to calculate an average daily consumption rate for each material.
3.  **Future Demand (Open Orders & BOMs)**: A list of open sales orders and the Bill of Materials (BOMs). Use this to calculate the total upcoming demand for each raw material.

Your task is to calculate the 'daysUntilStockout' for each raw material.
The formula should roughly be: \`Days Until Stockout = Current Stock / (Average Daily Consumption + Prorated Future Demand)\`.
- Prorate future demand over the next 90 days.
- If a material has no consumption or demand, its stockout date is effectively infinite; return -1 for daysUntilStockout in this case.

Return a list of the top 10 most critical items (lowest positive daysUntilStockout).
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { text: prompt },
                    { text: "Raw Materials:" },
                    { text: JSON.stringify(payload.rawMaterials) },
                    { text: "Molding Logs (last 30 days):" },
                    { text: JSON.stringify(payload.moldingLogs) },
                    { text: "Open Orders:" },
                    { text: JSON.stringify(payload.orders) },
                    { text: "BOMs:" },
                    { text: JSON.stringify(payload.boms) },
                ]
            },
            config: {
                temperature: 0.2,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            rawMaterialId: { type: Type.STRING },
                            rawMaterialName: { type: Type.STRING },
                            unit: { type: Type.STRING },
                            currentStock: { type: Type.NUMBER },
                            daysUntilStockout: { type: Type.NUMBER },
                            reason: { type: Type.STRING },
                        },
                        required: ["rawMaterialId", "rawMaterialName", "unit", "currentStock", "daysUntilStockout", "reason"]
                    }
                }
            },
        });
        
        const responseText = response.text;
        if (responseText) {
            return parseJsonResponse(responseText);
        }
        return [];
    } catch (error) {
        console.error("AI Inventory Forecast generation failed:", error);
        throw error;
    }
};