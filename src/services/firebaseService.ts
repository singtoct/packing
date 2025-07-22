import { initializeApp, FirebaseApp } from 'firebase/app';
import * as firestore from 'firebase/firestore';
import { AppSettings, AppRole, Product, RawMaterial, PackingStation } from '../types';
import { CTElectricLogo } from '../assets/logo';

// --- IMPORTANT: PASTE YOUR FIREBASE CONFIG OBJECT HERE ---
// 1. Go to your Firebase project settings.
// 2. Under "Your apps", click the web icon (</>).
// 3. Find the `firebaseConfig` object and copy it.
// 4. Paste it here, replacing the placeholder object.
const firebaseConfig = {
  apiKey: "AIzaSyBSnnhiHdlsb1ZxgwG_hxAMNrTGYi4ge4Y",
  authDomain: "ct-plastic.firebaseapp.com",
  projectId: "ct-plastic",
  storageBucket: "ct-plastic.appspot.com",
  messagingSenderId: "511879881850",
  appId: "1:511879881850:web:eb7c3ba032768db193c7c3",
  measurementId: "G-4PDR78NMBC"
};

// --- Firebase Initialization ---
let app: FirebaseApp;
let db: firestore.Firestore;
try {
    app = initializeApp(firebaseConfig);
    db = firestore.getFirestore(app);
} catch (error) {
    console.error("Firebase initialization failed. Please ensure you have pasted your firebaseConfig correctly.", error);
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = `
            <div style="padding: 2rem; text-align: center; font-family: 'Kanit', sans-serif; color: #333; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #f9f9f9;">
                <h1 style="color: #d9534f; font-size: 2rem;">เกิดข้อผิดพลาดในการเชื่อมต่อ</h1>
                <p style="font-size: 1.1rem;">ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้</p>
                <p style="margin-top: 1rem; font-size: 0.9rem; color: #777;">กรุณาตรวจสอบว่าท่านได้ใส่ข้อมูลการตั้งค่า Firebase (firebaseConfig) ที่ถูกต้องในไฟล์ <code>src/services/firebaseService.ts</code></p>
                <p style="font-size: 0.8rem; color: #999;">(Firebase initialization failed. Check console for details.)</p>
            </div>
        `;
    }
    // Re-throw to stop further script execution, preventing a blank page.
    throw new Error("Critical Firebase initialization failed. Application cannot start.");
}

// Export db and other firebase utilities if needed elsewhere
export { db };

// --- Generic Firestore Functions ---

/**
 * Fetches all documents from a collection.
 * @param collectionName The name of the collection.
 * @returns A promise that resolves to an array of documents with their IDs.
 */
export async function getCollection<T>(collectionName: string, sortBy?: keyof T, order: 'asc' | 'desc' = 'asc'): Promise<(T & {id: string})[]> {
    try {
        const collRef = firestore.collection(db, collectionName);
        const q = sortBy ? firestore.query(collRef, firestore.orderBy(sortBy as string, order)) : firestore.query(collRef);
        const snapshot = await firestore.getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T & {id: string}));
    } catch (error) {
        console.error(`Error getting collection ${collectionName}:`, error);
        return [];
    }
}


/**
 * Fetches a single document from a collection by its ID.
 * @param collectionName The name of the collection.
 * @param id The document ID.
 * @returns A promise that resolves to the document data or null if not found.
 */
export async function getDocument<T>(collectionName: string, id: string): Promise<(T & {id: string}) | null> {
    try {
        const docRef = firestore.doc(db, collectionName, id);
        const docSnap = await firestore.getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as T & {id: string} : null;
    } catch (error) {
        console.error(`Error getting document ${id} from ${collectionName}:`, error);
        return null;
    }
}

/**
 * Adds a new document to a collection with an auto-generated ID.
 * @param collectionName The name of the collection.
 * @param data The document data (without an ID).
 * @returns A promise that resolves to the newly created document with its ID.
 */
export async function addDocument<T>(collectionName: string, data: Omit<T, 'id'>): Promise<T & {id: string}> {
    const collRef = firestore.collection(db, collectionName);
    const docRef = await firestore.addDoc(collRef, data as firestore.DocumentData);
    return { id: docRef.id, ...data } as T & {id: string};
}

/**
 * Creates or overwrites a document with a specific ID.
 * @param collectionName The name of the collection.
 * @param id The document ID.
 * @param data The full document data.
 */
export async function setDocument<T>(collectionName: string, id: string, data: T): Promise<void> {
    const docRef = firestore.doc(db, collectionName, id);
    await firestore.setDoc(docRef, data as firestore.DocumentData);
}

/**
 * Updates a document with new data.
 * @param collectionName The name of the collection.
 * @param id The document ID.
 * @param updates The fields to update.
 */
export async function updateDocument<T>(collectionName: string, id: string, updates: Partial<T>): Promise<void> {
    const docRef = firestore.doc(db, collectionName, id);
    await firestore.updateDoc(docRef, updates as firestore.DocumentData);
}

/**
 * Deletes a document from a collection.
 * @param collectionName The name of the collection.
 * @param id The document ID to delete.
 */
export async function deleteDocument(collectionName: string, id: string): Promise<void> {
    const docRef = firestore.doc(db, collectionName, id);
    await firestore.deleteDoc(docRef);
}

/**
 * Overwrites an entire collection with new data. Deletes all existing documents.
 * @param collectionName The name of the collection.
 * @param data An array of objects to write. Each object MUST have an 'id' property.
 */
export async function overwriteCollection(collectionName: string, data: any[]): Promise<void> {
    const collRef = firestore.collection(db, collectionName);
    const snapshot = await firestore.getDocs(firestore.query(collRef));
    const batch = firestore.writeBatch(db);

    // 1. Delete all existing documents
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    // 2. Add new documents using their provided IDs
    data.forEach(item => {
        if (item.id) {
            const docRef = firestore.doc(db, collectionName, String(item.id));
            const { id, ...itemData } = item;
            batch.set(docRef, itemData);
        } else {
             console.warn(`Item in ${collectionName} is missing an ID during import, skipping:`, item);
        }
    });

    await batch.commit();
}


// --- Data Seeding Logic ---
// This part ensures that when the app is run for the first time against an empty DB,
// it gets populated with essential default data.

const seedCollection = async <T>(collectionName: string, defaultData: T[], idKey?: keyof T) => {
    const collRef = firestore.collection(db, collectionName);
    const snapshot = await firestore.getDocs(collRef);
    if (snapshot.empty) {
        console.log(`Seeding collection: ${collectionName}...`);
        const batch = firestore.writeBatch(db);
        defaultData.forEach((item: any) => {
            const docId = idKey ? String(item[idKey]) : item.id;
            const docRef = firestore.doc(db, collectionName, docId);
            batch.set(docRef, item);
        });
        await batch.commit();
        console.log(`Collection ${collectionName} seeded successfully.`);
    }
};

let seedingEnsured = false;
export const seedDefaultData = async () => {
    if (seedingEnsured) return;

    try {
        // --- Settings Seeding (Always check/create this first) ---
        const settingsDoc = await getDocument<AppSettings>('factory_settings', 'main');
        if (!settingsDoc) {
            console.log("Seeding default settings...");
            const DEFAULT_ROLES: AppRole[] = [
                { id: 'role_manager', name: 'ผู้จัดการโรงงาน' },
                { id: 'role_sales', name: 'ฝ่ายขาย' },
                { id: 'role_production', name: 'ฝ่ายผลิต' },
            ];
            const DEFAULT_DASHBOARD_LAYOUTS: Record<string, string[]> = {
                [DEFAULT_ROLES[0].id]: ['aiPlanner', 'aiInventoryForecast', 'upcomingOrders', 'pendingQc', 'lowStock', 'productionSummary', 'topPackers', 'rawMaterialNeeds'],
                [DEFAULT_ROLES[1].id]: ['upcomingOrders', 'lowStock', 'productionSummary'],
                [DEFAULT_ROLES[2].id]: ['aiPlanner', 'pendingQc', 'rawMaterialNeeds', 'productionSummary'],
            };
            const DEFAULT_SETTINGS: AppSettings = {
                companyInfo: {
                    name: 'CT.ELECTRIC',
                    address: '123 ถนนสุขุมวิท แขวงบางนา เขตบางนา กรุงเทพมหานคร 10260',
                    taxId: '0105558000111',
                    logoUrl: CTElectricLogo,
                    currentUserRoleId: DEFAULT_ROLES[0].id,
                },
                qcFailureReasons: ['สินค้าชำรุด', 'แพ็คเกจไม่สวยงาม', 'จำนวนผิดพลาด', 'ปิดผนึกไม่ดี', 'ติดฉลากผิด', 'อื่นๆ'],
                productionStatuses: ['รอแปะกันรอย', 'รอประกบ', 'รอตรวจสอบ QC', 'รอแพ็ค', 'กำลังแพ็ค', 'รอส่งมอบ'],
                roles: DEFAULT_ROLES,
                dashboardLayouts: DEFAULT_DASHBOARD_LAYOUTS,
            };
            await setDocument('factory_settings', 'main', DEFAULT_SETTINGS);
            console.log("Default settings seeded.");
        }

        // --- Other Collections Seeding ---
        const DEFAULT_PRODUCTS: Product[] = [ /* Paste DEFAULT_PRODUCTS array here */ ];
        const DEFAULT_RAW_MATERIALS: RawMaterial[] = [ /* Paste DEFAULT_RAW_MATERIALS array here */ ];
        const DEFAULT_PACKING_STATIONS: PackingStation[] = [
            { id: 'ps-1', name: 'โต๊ะแพ็ค 1', status: 'Idle' },
            { id: 'ps-2', name: 'โต๊ะแพ็ค 2', status: 'Idle' },
            { id: 'ps-3', name: 'โต๊ะแพ็ค 3', status: 'Idle' },
        ];

        // Seed other collections if they are empty
        await seedCollection<Product>('factory_products', DEFAULT_PRODUCTS, 'id');
        await seedCollection<RawMaterial>('packing_raw_materials', DEFAULT_RAW_MATERIALS, 'id');
        await seedCollection<PackingStation>('packing_stations', DEFAULT_PACKING_STATIONS, 'id');
        
        seedingEnsured = true;
    } catch (error) {
        console.error("Error during data seeding:", error);
    }
};