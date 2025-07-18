
import React, { useState, useMemo } from 'react';
import { PurchaseOrder, Supplier, RawMaterial } from '../types';
import { getRawMaterials, saveRawMaterials } from '../services/storageService';
import { SearchableInput } from './SearchableInput';
import { PlusCircleIcon, Trash2Icon, XCircleIcon } from './icons/Icons';

const commonInputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm";
const buttonPrimaryStyle = "inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400";

interface POFormModalProps {
    suppliers: Supplier[];
    rawMaterials: RawMaterial[];
    initialItems?: { rawMaterialId: string; quantity: number }[];
    onClose: () => void;
    onSave: (po: PurchaseOrder) => void;
}

type POItemState = {
    rawMaterialId: string;
    quantity: number;
    unitPrice: number;
};

export const POFormModal: React.FC<POFormModalProps> = ({ suppliers, rawMaterials, initialItems = [], onClose, onSave }) => {
    const [localRawMaterials, setLocalRawMaterials] = useState(rawMaterials);
    const [po, setPo] = useState<Omit<PurchaseOrder, 'id'>>({
        poNumber: `PO-${Date.now()}`,
        supplierId: suppliers[0]?.id || '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDate: '',
        status: 'Draft',
        items: initialItems.map(item => ({...item, unitPrice: rawMaterials.find(rm => rm.id === item.rawMaterialId)?.costPerUnit || 0 }))
    });

    const rawMaterialMap = useMemo(() => new Map(localRawMaterials.map(rm => [rm.id, rm])), [localRawMaterials]);

    const handleItemChange = (index: number, field: keyof POItemState, value: string | number) => {
        const newItems = [...po.items];
        const currentItem = newItems[index];

        if (field === 'rawMaterialId') {
            const newMaterial = rawMaterialMap.get(String(value));
            newItems[index] = { ...currentItem, rawMaterialId: String(value), unitPrice: newMaterial?.costPerUnit || 0 };
        } else {
            newItems[index] = { ...currentItem, [field]: Number(value) };
        }
        setPo(prev => ({ ...prev, items: newItems }));
    };

    const handleAddNewMaterial = (itemIndex: number) => {
        const newName = window.prompt("กรุณาใส่ชื่อวัตถุดิบใหม่:");
        if (!newName || !newName.trim()) {
            return;
        }

        const newUnit = window.prompt("กรุณาใส่หน่วย (เช่น kg, Pcs., ชิ้น):", "ชิ้น");
        if (!newUnit || !newUnit.trim()) {
            return;
        }

        if (localRawMaterials.some(m => m.name.toLowerCase() === newName.trim().toLowerCase())) {
            alert("วัตถุดิบชื่อนี้มีอยู่แล้วในระบบ");
            return;
        }

        const newMaterial: RawMaterial = {
            id: crypto.randomUUID(),
            name: newName.trim(),
            quantity: 0,
            unit: newUnit.trim(),
            costPerUnit: 0,
        };

        const allMaterials = getRawMaterials();
        const updatedAllMaterials = [...allMaterials, newMaterial];
        saveRawMaterials(updatedAllMaterials);
        
        setLocalRawMaterials(updatedAllMaterials);
        handleItemChange(itemIndex, 'rawMaterialId', newMaterial.id);
    };

    const handleAddItem = () => {
        setPo(prev => ({
            ...prev,
            items: [...prev.items, { rawMaterialId: '', quantity: 1, unitPrice: 0 }]
        }));
    };

    const handleRemoveItem = (index: number) => {
        const newItems = po.items.filter((_, i) => i !== index);
        setPo(prev => ({ ...prev, items: newItems }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!po.supplierId) {
            alert('กรุณาเลือกซัพพลายเออร์');
            return;
        }
        const finalPO: PurchaseOrder = {
            ...po,
            id: crypto.randomUUID(),
            items: po.items.filter(item => item.rawMaterialId && item.quantity > 0)
        };
        if(finalPO.items.length === 0) {
            alert('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ');
            return;
        }
        onSave(finalPO);
    };

    const totalCost = po.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    
    const rawMaterialOptions = useMemo(() => localRawMaterials.map(rm => ({
        id: rm.id,
        name: rm.name,
    })), [localRawMaterials]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">สร้าง/แก้ไข ใบสั่งซื้อ (PO)</h2>
                     <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XCircleIcon className="w-6 h-6 text-gray-500"/></button>
                </div>

                <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">เลขที่ PO</label>
                            <input type="text" value={po.poNumber} onChange={e => setPo({...po, poNumber: e.target.value})} className={commonInputStyle} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ซัพพลายเออร์</label>
                            <select value={po.supplierId} onChange={e => setPo({...po, supplierId: e.target.value})} className={commonInputStyle} required>
                                <option value="" disabled>-- เลือกซัพพลายเออร์ --</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">วันที่คาดว่าจะได้รับ</label>
                            <input type="date" value={po.expectedDate} onChange={e => setPo({...po, expectedDate: e.target.value})} className={commonInputStyle} />
                        </div>
                    </div>

                    <div className="space-y-3 mb-4">
                        <h3 className="font-semibold">รายการสินค้า</h3>
                        {po.items.map((item, index) => (
                            <div key={index} className="grid grid-cols-[4fr,1.5fr,0.5fr,1.5fr,auto] gap-3 items-center p-2 bg-gray-50 rounded">
                                <div className="flex items-center gap-2">
                                    <SearchableInput
                                        options={rawMaterialOptions}
                                        value={item.rawMaterialId}
                                        onChange={(value) => handleItemChange(index, 'rawMaterialId', value)}
                                        displayKey="name"
                                        valueKey="id"
                                        placeholder="ค้นหาวัตถุดิบ..."
                                        className="flex-grow"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => handleAddNewMaterial(index)} 
                                        className="text-blue-600 text-sm font-semibold hover:underline flex-shrink-0"
                                    >
                                        เพิ่มใหม่
                                    </button>
                                </div>
                                <input type="number" placeholder="จำนวน" step="any" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className={`${commonInputStyle} mt-0`} />
                                <span className="text-sm text-gray-500">{rawMaterialMap.get(item.rawMaterialId)?.unit || ''}</span>
                                <input type="number" placeholder="ราคา/หน่วย" step="any" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', e.target.value)} className={`${commonInputStyle} mt-0`} />
                                <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><Trash2Icon className="w-5 h-5"/></button>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={handleAddItem} className="text-blue-600 font-semibold text-sm inline-flex items-center gap-1">
                        <PlusCircleIcon className="w-5 h-5"/> เพิ่มรายการ
                    </button>
                </div>

                <div className="mt-6 pt-4 border-t flex justify-between items-center">
                     <div className="text-right font-bold text-xl">
                        ยอดรวม: {totalCost.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
                    </div>
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md">ยกเลิก</button>
                        <button type="submit" className={buttonPrimaryStyle}>บันทึกใบสั่งซื้อ</button>
                    </div>
                </div>
            </form>
        </div>
    );
}
