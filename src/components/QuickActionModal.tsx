import React, { useState, useEffect } from 'react';
import { QuickActionType } from '../App';
import { OrderItem, PackingLogEntry, MoldingLogEntry, Employee, Product, RawMaterial, BillOfMaterial, InventoryItem } from '../types';
import { saveOrders, getPackingLogs, savePackingLogs, getInventory, saveInventory, saveMoldingLogs, saveRawMaterials, getEmployees, getProducts, getBOMs, getOrders as getAllOrders, saveQCEntries, getQCEntries } from '../services/storageService';
import { XCircleIcon, PlusCircleIcon } from 'lucide-react';
import { SearchableInput } from './SearchableInput';

interface Props {
    actionType: QuickActionType;
    onClose: () => void;
    onDataUpdate: () => void;
}

const commonInputClass = "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500";
const commonLabelClass = "block text-sm font-medium text-gray-700";

const QuickAddOrderForm: React.FC<{ onSave: () => void }> = ({ onSave }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
        const loadProducts = async () => {
            const prods = await getProducts();
            setProducts(prods);
        };
        loadProducts();
        setDueDate(new Date().toISOString().split('T')[0]);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const selectedProduct = products.find(p => p.id === selectedProductId);
        if (!selectedProduct || !dueDate) return;

        const newOrder: OrderItem = {
            id: crypto.randomUUID(),
            name: selectedProduct.name,
            color: selectedProduct.color,
            quantity,
            dueDate,
            salePrice: selectedProduct.salePrice,
        };
        const allOrders = await getAllOrders();
        await saveOrders([newOrder, ...allOrders]);
        onSave();
    };
    
    const productOptions = products.map(p => ({ ...p, displayName: `${p.name} (${p.color})`}));

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className={commonLabelClass}>สินค้า</label>
                <SearchableInput options={productOptions} value={selectedProductId} onChange={setSelectedProductId} displayKey="displayName" valueKey="id" placeholder="ค้นหาสินค้า..." className="mt-1" />
            </div>
            <div>
                <label className={commonLabelClass}>จำนวน (ชิ้น)</label>
                <input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className={commonInputClass} required />
            </div>
            <div>
                <label className={commonLabelClass}>วันครบกำหนด</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={commonInputClass} required />
            </div>
            <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
                <PlusCircleIcon className="w-5 h-5" /> เพิ่มออเดอร์
            </button>
        </form>
    );
};

const QuickAddPackingLogForm: React.FC<{ onSave: () => void }> = ({ onSave }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [availableItems, setAvailableItems] = useState<string[]>([]);
    const [selectedItem, setSelectedItem] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [packerName, setPackerName] = useState('');

    useEffect(() => {
        const loadData = async () => {
            const emps = await getEmployees();
            setEmployees(emps);
            if(emps.length > 0) setPackerName(emps[0].name);
            
            const orders = await getAllOrders();
            const uniqueItems = Array.from(new Set(orders.map(o => `${o.name} (${o.color})`))).sort();
            setAvailableItems(uniqueItems);
            if(uniqueItems.length > 0) setSelectedItem(uniqueItems[0]);
        };
        loadData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !packerName) return;

        const newLog: PackingLogEntry = {
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            name: selectedItem,
            quantity,
            packerName,
        };
        
        const allLogs = await getPackingLogs();
        await savePackingLogs([newLog, ...allLogs]);

        const inventory = await getInventory();
        const itemInInventory = inventory.find(i => i.name === newLog.name);
        if (itemInInventory) {
            itemInInventory.quantity += newLog.quantity;
        } else {
            inventory.push({ id: newLog.name, name: newLog.name, quantity: newLog.quantity });
        }
        await saveInventory(inventory);
        
        const qcEntries = await getQCEntries();
        await saveQCEntries([{
            id: newLog.id,
            packingLogId: newLog.id,
            productName: newLog.name,
            quantity: newLog.quantity,
            packerName: newLog.packerName,
            packingDate: newLog.date,
            status: 'Pending',
        }, ...qcEntries]);

        onSave();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <label className={commonLabelClass}>สินค้าที่แพ็ค</label>
                <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className={commonInputClass} required>
                    {availableItems.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
            </div>
             <div>
                <label className={commonLabelClass}>จำนวน (ชิ้น)</label>
                <input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className={commonInputClass} required />
            </div>
            <div>
                <label className={commonLabelClass}>ผู้บันทึก</label>
                <select value={packerName} onChange={e => setPackerName(e.target.value)} className={commonInputClass} required>
                    {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                </select>
            </div>
             <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
                <PlusCircleIcon className="w-5 h-5" /> บันทึกการแพ็ค
            </button>
        </form>
    );
};

// Simplified Molding form for quick actions
const QuickAddMoldingLogForm: React.FC<{ onSave: () => void }> = ({ onSave }) => {
    // This is a placeholder as the full logic is complex.
    return (
        <div className="text-center p-8 bg-gray-100 rounded-md">
            <h3 className="font-semibold text-gray-800">บันทึกการผลิต (แผนกฉีด)</h3>
            <p className="text-sm text-gray-600 mt-2">
                ฟังก์ชันนี้มีความซับซ้อน (ต้องตรวจสอบ BOM และวัตถุดิบ) <br/>
                กรุณาใช้หน้า "บันทึกการผลิต" ในเมนูหลักเพื่อความถูกต้องของข้อมูล
            </p>
        </div>
    );
}

export const QuickActionModal: React.FC<Props> = ({ actionType, onClose, onDataUpdate }) => {
    
    const MODAL_CONTENT = {
        order: {
            title: 'เพิ่มออเดอร์ใหม่',
            form: <QuickAddOrderForm onSave={() => { onDataUpdate(); onClose(); }} />
        },
        packing: {
            title: 'บันทึกการแพ็ค',
            form: <QuickAddPackingLogForm onSave={() => { onDataUpdate(); onClose(); }} />
        },
        molding: {
            title: 'บันทึกการผลิต (ฉีด)',
            form: <QuickAddMoldingLogForm onSave={() => { onDataUpdate(); onClose(); }} />
        },
    };

    const content = MODAL_CONTENT[actionType];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{content.title}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XCircleIcon className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
                {content.form}
            </div>
        </div>
    );
};