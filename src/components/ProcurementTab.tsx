


import React, { useState, useEffect, useMemo } from 'react';
import { getSuppliers, saveSuppliers, getPurchaseOrders, savePurchaseOrders, getRawMaterials, saveRawMaterials, getAnalysisShortfall } from '../services/storageService';
import { Supplier, PurchaseOrder, RawMaterial } from '../types';
import { PlusCircleIcon, Trash2Icon, ShoppingCartIcon, EditIcon } from './icons/Icons';

type View = 'shortfall' | 'pos' | 'suppliers';

const commonInputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500";
const buttonPrimaryStyle = "inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400";
const buttonSecondaryStyle = "inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50";


const POModal: React.FC<{
    suppliers: Supplier[];
    rawMaterials: RawMaterial[];
    shortfall: { id: string; name: string; unit: string; shortfall: number }[];
    onClose: () => void;
    onSave: (po: PurchaseOrder) => void;
}> = ({ suppliers, rawMaterials, shortfall, onClose, onSave }) => {
    const [po, setPo] = useState<PurchaseOrder>({
        id: crypto.randomUUID(),
        poNumber: `PO-${Date.now()}`,
        supplierId: suppliers[0]?.id || '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDate: '',
        status: 'Draft',
        items: shortfall.map(s => ({ rawMaterialId: s.id, quantity: s.shortfall, unitPrice: 0 }))
    });

    const handleItemChange = (index: number, field: 'quantity' | 'unitPrice', value: number) => {
        const newItems = [...po.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setPo({ ...po, items: newItems });
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(po);
    };

    const rawMaterialMap = useMemo(() => new Map(rawMaterials.map(rm => [rm.id, rm])), [rawMaterials]);
    const totalCost = po.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">สร้างใบสั่งซื้อ (PO) ใหม่</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">เลขที่ PO</label>
                        <input type="text" value={po.poNumber} onChange={e => setPo({...po, poNumber: e.target.value})} className={commonInputStyle} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ซัพพลายเออร์</label>
                        <select value={po.supplierId} onChange={e => setPo({...po, supplierId: e.target.value})} className={commonInputStyle}>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">วันที่คาดว่าจะได้รับ</label>
                        <input type="date" value={po.expectedDate} onChange={e => setPo({...po, expectedDate: e.target.value})} className={commonInputStyle} />
                    </div>
                </div>

                <div className="space-y-2 mb-4">
                    <h3 className="font-semibold">รายการสินค้า</h3>
                    {po.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <span className="flex-1">{rawMaterialMap.get(item.rawMaterialId)?.name}</span>
                            <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} className={`${commonInputStyle} w-24`} />
                            <span className="w-12">{rawMaterialMap.get(item.rawMaterialId)?.unit}</span>
                            <input type="number" placeholder="ราคา/หน่วย" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', Number(e.target.value))} className={`${commonInputStyle} w-28`} />
                        </div>
                    ))}
                </div>

                <div className="text-right font-bold text-xl">
                    ยอดรวม: {totalCost.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
                </div>

                <div className="flex justify-end gap-4 pt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md">ยกเลิก</button>
                    <button type="submit" className={buttonPrimaryStyle}>สร้าง PO</button>
                </div>
            </form>
        </div>
    );
};

const SupplierView: React.FC<{
    suppliers: Supplier[];
    setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
}> = ({ suppliers, setSuppliers }) => {
    const [isEditing, setIsEditing] = useState<Supplier | null>(null);
    const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        if (isEditing) {
            setName(isEditing.name);
            setContact(isEditing.contactPerson);
            setPhone(isEditing.phone);
        } else {
            setName('');
            setContact('');
            setPhone('');
        }
    }, [isEditing]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        let updatedSuppliers;
        if (isEditing) {
            updatedSuppliers = suppliers.map(s => 
                s.id === isEditing.id ? { ...s, name, contactPerson: contact, phone } : s
            );
        } else {
            const newSupplier: Supplier = {
                id: crypto.randomUUID(),
                name,
                contactPerson: contact,
                phone,
            };
            updatedSuppliers = [...suppliers, newSupplier].sort((a,b) => a.name.localeCompare(b.name));
        }
        setSuppliers(updatedSuppliers);
        saveSuppliers(updatedSuppliers);
        setIsEditing(null);
    };

    const handleDelete = (id: string) => {
        if(window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบซัพพลายเออร์รายนี้? การดำเนินการนี้อาจส่งผลกระทบต่อใบสั่งซื้อที่มีอยู่')) {
            const updated = suppliers.filter(s => s.id !== id);
            setSuppliers(updated);
            saveSuppliers(updated);
        }
    };

    const handleSelectSupplier = (id: string, checked: boolean) => {
        setSelectedSuppliers(prev => {
            const newSet = new Set(prev);
            if(checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) setSelectedSuppliers(new Set(suppliers.map(s => s.id)));
        else setSelectedSuppliers(new Set());
    };

    const handleDeleteSelected = () => {
        if (selectedSuppliers.size === 0) return;
        if(window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบซัพพลายเออร์ ${selectedSuppliers.size} รายที่เลือก?`)) {
            const updated = suppliers.filter(s => !selectedSuppliers.has(s.id));
            setSuppliers(updated);
            saveSuppliers(updated);
            setSelectedSuppliers(new Set());
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
                 <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border mb-6 space-y-3 sticky top-28">
                    <h3 className="text-lg font-bold">{isEditing ? 'แก้ไขข้อมูลซัพพลายเออร์' : 'เพิ่มซัพพลายเออร์ใหม่'}</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ชื่อซัพพลายเออร์</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className={commonInputStyle} required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">ผู้ติดต่อ</label>
                        <input type="text" value={contact} onChange={e => setContact(e.target.value)} className={commonInputStyle} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
                        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className={commonInputStyle} />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className={`${buttonPrimaryStyle} w-full`}>
                            {isEditing ? 'บันทึกการเปลี่ยนแปลง' : 'เพิ่มซัพพลายเออร์'}
                        </button>
                        {isEditing && (
                            <button type="button" onClick={() => setIsEditing(null)} className={`${buttonSecondaryStyle}`}>
                                ยกเลิก
                            </button>
                        )}
                    </div>
                 </form>
            </div>
            <div className="md:col-span-2">
                 <div className="overflow-x-auto">
                    <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                        <thead className="bg-gray-50">
                             <tr>
                                 <th className="p-4">
                                     <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        onChange={e => handleSelectAll(e.target.checked)}
                                        checked={suppliers.length > 0 && selectedSuppliers.size === suppliers.length}
                                     />
                                 </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อ</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ผู้ติดต่อ</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เบอร์โทร</th>
                                <th className="px-4 py-3 text-right">
                                    <button
                                        onClick={handleDeleteSelected}
                                        disabled={selectedSuppliers.size === 0}
                                        className="text-red-600 hover:text-red-800 disabled:text-gray-300"
                                    >
                                        <Trash2Icon className="w-5 h-5"/>
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {suppliers.map(s => (
                                <tr key={s.id} className={selectedSuppliers.has(s.id) ? 'bg-blue-50' : ''}>
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={selectedSuppliers.has(s.id)}
                                            onChange={e => handleSelectSupplier(s.id, e.target.checked)}
                                        />
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold">{s.name}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm">{s.contactPerson}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm">{s.phone}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right space-x-2">
                                        <button onClick={() => setIsEditing(s)} className="p-1 text-blue-600 hover:text-blue-900" title="แก้ไข"><EditIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(s.id)} className="p-1 text-red-600 hover:text-red-900" title="ลบ"><Trash2Icon className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export const ProcurementTab: React.FC = () => {
    const [view, setView] = useState<View>('shortfall');
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
    const [shortfall, setShortfall] = useState<{ id: string; name: string; unit: string; shortfall: number }[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const refreshData = () => {
            setSuppliers(getSuppliers());
            setPurchaseOrders(getPurchaseOrders().sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()));
            setRawMaterials(getRawMaterials());
            setShortfall(getAnalysisShortfall());
        };
        refreshData();
        window.addEventListener('storage', refreshData);
        return () => window.removeEventListener('storage', refreshData);
    }, []);

    const handleSavePO = (po: PurchaseOrder) => {
        const updatedPOs = [po, ...purchaseOrders];
        setPurchaseOrders(updatedPOs);
        savePurchaseOrders(updatedPOs);
        setIsModalOpen(false);
    };

    const handleReceivePO = (poId: string) => {
        const poToReceive = purchaseOrders.find(po => po.id === poId);
        if (!poToReceive) return;
        
        const updatedPOs = purchaseOrders.map(po => {
            if (po.id === poId) {
                const updatedPo: PurchaseOrder = { ...po, status: 'Completed' };
                return updatedPo;
            }
            return po;
        });

        const currentRawMaterials = getRawMaterials();
        const updatedRawMaterials = currentRawMaterials.map(rm => {
            const poItem = poToReceive.items.find(i => i.rawMaterialId === rm.id);
            if (poItem) {
                return { ...rm, quantity: rm.quantity + poItem.quantity };
            }
            return rm;
        });
        saveRawMaterials(updatedRawMaterials);
        setRawMaterials(updatedRawMaterials);
        setPurchaseOrders(updatedPOs);
        savePurchaseOrders(updatedPOs);
        setShortfall(getAnalysisShortfall());
    };
    
    const ViewButton: React.FC<{ targetView: View, label: string; count?: number }> = ({ targetView, label, count }) => (
        <button onClick={() => setView(targetView)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === targetView ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
            {label} 
            {count !== undefined && <span className={`px-2 py-0.5 rounded-full text-xs ${view === targetView ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-600'}`}>{count}</span>}
        </button>
    );

    return (
        <div>
            {isModalOpen && <POModal suppliers={suppliers} rawMaterials={rawMaterials} shortfall={shortfall} onClose={() => setIsModalOpen(false)} onSave={handleSavePO} />}
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">ระบบจัดซื้อ</h2>
                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                    <ViewButton targetView="shortfall" label="วัตถุดิบที่ต้องสั่งซื้อ" count={shortfall.length} />
                    <ViewButton targetView="pos" label="ใบสั่งซื้อ (PO)" count={purchaseOrders.length} />
                    <ViewButton targetView="suppliers" label="ซัพพลายเออร์" count={suppliers.length}/>
                </div>
            </div>

            {view === 'shortfall' && (
                <div>
                     <button onClick={() => setIsModalOpen(true)} className={`${buttonPrimaryStyle} mb-4`} disabled={shortfall.length === 0}>
                        <PlusCircleIcon className="w-5 h-5"/> สร้าง PO จากรายการที่ขาดทั้งหมด
                    </button>
                    <p className="text-sm text-gray-600 mb-4">รายการนี้คำนวณจากออเดอร์ที่เปิดอยู่ทั้งหมดเทียบกับสต็อกวัตถุดิบคงเหลือ</p>
                    {shortfall.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {shortfall.map(item => (
                             <div key={item.id} className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                                <p className="font-bold text-red-800">{item.name}</p>
                                <p className="text-red-600">ขาด: {item.shortfall.toLocaleString()} {item.unit}</p>
                             </div>
                        ))}
                    </div>) : <p className="text-center text-gray-500 py-8">ไม่มีวัตถุดิบที่ต้องสั่งซื้อในขณะนี้</p>}
                </div>
            )}
            
            {view === 'pos' && (
                 <div className="overflow-x-auto">
                    <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่สั่ง</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ซัพพลายเออร์</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-gray-200">
                             {purchaseOrders.map(po => {
                                const supplier = suppliers.find(s => s.id === po.supplierId);
                                return (
                                <tr key={po.id}>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm">{new Date(po.orderDate).toLocaleDateString('th-TH')}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold">{po.poNumber}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm">{supplier?.name || 'N/A'}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm">{po.status}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                                        {po.status !== 'Completed' && (
                                            <button onClick={() => handleReceivePO(po.id)} className="text-green-600 hover:underline">รับของ</button>
                                        )}
                                    </td>
                                </tr>);
                            })}
                         </tbody>
                    </table>
                </div>
            )}
            
            {view === 'suppliers' && (
                 <SupplierView suppliers={suppliers} setSuppliers={setSuppliers} />
            )}

        </div>
    );
};