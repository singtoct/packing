import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { getSuppliers, saveSuppliers, getPurchaseOrders, savePurchaseOrders, getRawMaterials, saveRawMaterials, getAnalysisShortfall, getSettings, addPurchaseOrder } from '../services/storageService';
import { Supplier, PurchaseOrder, RawMaterial } from '../types';
import { PlusCircleIcon, Trash2Icon, ShoppingCartIcon, EditIcon, PrinterIcon } from 'lucide-react';
import { POFormModal } from './POFormModal';
import { POPrintView } from './POPrintView';

type View = 'shortfall' | 'pos' | 'suppliers';

const buttonPrimaryStyle = "inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400";
const buttonSecondaryStyle = "inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50";

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

    const handleSubmit = async (e: React.FormEvent) => {
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
        await saveSuppliers(updatedSuppliers);
        setIsEditing(null);
    };

    const handleDelete = async (id: string) => {
        if(window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบซัพพลายเออร์รายนี้? การดำเนินการนี้อาจส่งผลกระทบต่อใบสั่งซื้อที่มีอยู่')) {
            const updated = suppliers.filter(s => s.id !== id);
            setSuppliers(updated);
            await saveSuppliers(updated);
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

    const handleDeleteSelected = async () => {
        if (selectedSuppliers.size === 0) return;
        if(window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบซัพพลายเออร์ ${selectedSuppliers.size} รายที่เลือก?`)) {
            const updated = suppliers.filter(s => !selectedSuppliers.has(s.id));
            setSuppliers(updated);
            await saveSuppliers(updated);
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
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className={`${buttonSecondaryStyle} w-full justify-start`} required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">ผู้ติดต่อ</label>
                        <input type="text" value={contact} onChange={e => setContact(e.target.value)} className={`${buttonSecondaryStyle} w-full justify-start`} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
                        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className={`${buttonSecondaryStyle} w-full justify-start`} />
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
    
    const [isPOModalOpen, setIsPOModalOpen] = useState(false);
    const [poInitialItems, setPoInitialItems] = useState<{ rawMaterialId: string; quantity: number }[] | undefined>(undefined);

    useEffect(() => {
        const refreshData = async () => {
            setSuppliers(await getSuppliers());
            const pos = await getPurchaseOrders();
            setPurchaseOrders(pos.sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()));
            setRawMaterials(await getRawMaterials());
            setShortfall(await getAnalysisShortfall());
        };
        refreshData();
        window.addEventListener('storage', refreshData as any);
        return () => window.removeEventListener('storage', refreshData as any);
    }, []);
    
    const handleAutoCreatePOs = async () => {
        if (shortfall.length === 0) return;
        const materialsMap = new Map<string, RawMaterial>(rawMaterials.map(m => [m.id, m]));
        const posBySupplier = new Map<string, { po: Omit<PurchaseOrder, 'id'>, supplierName: string }>();

        for (const item of shortfall) {
            const material = materialsMap.get(item.id);
            if (!material || !material.defaultSupplierId) {
                alert(`กรุณากำหนดซัพพลายเออร์หลักสำหรับ "${material?.name || item.name}" ก่อน`);
                return; // Stop the process
            }

            if (!posBySupplier.has(material.defaultSupplierId)) {
                const supplier = suppliers.find(s => s.id === material.defaultSupplierId);
                posBySupplier.set(material.defaultSupplierId, {
                    supplierName: supplier?.name || 'Unknown',
                    po: {
                        poNumber: `PO-${Date.now()}-${supplier?.name.substring(0,3) || ''}`,
                        supplierId: material.defaultSupplierId,
                        orderDate: new Date().toISOString().split('T')[0],
                        expectedDate: '',
                        status: 'Draft',
                        items: []
                    }
                });
            }
            
            const poData = posBySupplier.get(material.defaultSupplierId)!;
            poData.po.items.push({
                rawMaterialId: item.id,
                quantity: Math.ceil(item.shortfall), // Round up to whole number
                unitPrice: material.costPerUnit || 0
            });
        }
        
        if (window.confirm(`ระบบจะสร้างใบสั่งซื้อฉบับร่าง ${posBySupplier.size} ใบ ยืนยันหรือไม่?`)) {
            const newPOsPromises = Array.from(posBySupplier.values()).map(data => addPurchaseOrder(data.po));
            const newPOs = await Promise.all(newPOsPromises);

            const updatedPOs = [...newPOs, ...purchaseOrders].sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
            setPurchaseOrders(updatedPOs);
            alert('สร้างใบสั่งซื้อฉบับร่างเรียบร้อยแล้ว');
            setView('pos');
        }
    };


    const openNewPOModal = () => {
        setPoInitialItems([]);
        setIsPOModalOpen(true);
    };

    const handleSavePO = async (po: Omit<PurchaseOrder, 'id'>) => {
        const newPO = await addPurchaseOrder(po);
        const updatedPOs = [newPO, ...purchaseOrders].sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
        setPurchaseOrders(updatedPOs);
        setIsPOModalOpen(false);
        setPoInitialItems(undefined);
    };

    const handleReceivePO = async (poId: string) => {
        const poToReceive = purchaseOrders.find(po => po.id === poId);
        if (!poToReceive) return;
        
        const updatedPOs: PurchaseOrder[] = purchaseOrders.map(po => {
            if (po.id === poId) {
                return { ...po, status: 'Completed' };
            }
            return po;
        });

        const currentRawMaterials = await getRawMaterials();
        poToReceive.items.forEach(item => {
            const materialIndex = currentRawMaterials.findIndex(rm => rm.id === item.rawMaterialId);
            if(materialIndex > -1) {
                currentRawMaterials[materialIndex].quantity += item.quantity;
            }
        });
        
        await saveRawMaterials(currentRawMaterials);
        setRawMaterials(currentRawMaterials);
        setPurchaseOrders(updatedPOs);
        await savePurchaseOrders(updatedPOs);
        setShortfall(await getAnalysisShortfall()); // Recalculate shortfall
    };
    
    const handlePrintPO = async (poId: string) => {
        const po = purchaseOrders.find(p => p.id === poId);
        const supplier = suppliers.find(s => s.id === po?.supplierId);
        const companyInfo = await getSettings();
        const allRawMaterials = await getRawMaterials();
        const rawMaterialMap = new Map(allRawMaterials.map(rm => [rm.id, { name: rm.name, unit: rm.unit }]));

        if (!po || !supplier) {
            alert("ไม่พบข้อมูลสำหรับพิมพ์");
            return;
        }

        const printWindow = window.open('', '_blank', 'width=1000,height=800');
        if (!printWindow) {
            alert("กรุณาอนุญาตป๊อปอัปเพื่อพิมพ์ใบสั่งซื้อ");
            return;
        }

        printWindow.document.write('<html><head><title>Purchase Order</title>');
        printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
        printWindow.document.write('<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet">');
        printWindow.document.write('<style>body { font-family: "Kanit", sans-serif; } @media print { @page { size: A4; margin: 0; } body { margin: 1.6cm; } }</style>');
        printWindow.document.write('</head><body><div id="print-root"></div></body></html>');
        printWindow.document.close();

        const printRoot = printWindow.document.getElementById('print-root');
        if (printRoot) {
            const root = ReactDOM.createRoot(printRoot);
            root.render(<POPrintView po={po} supplier={supplier} companyInfo={companyInfo.companyInfo} rawMaterialMap={rawMaterialMap} />);

            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 500); // Wait for styles to load
        }
    };

    const ViewButton: React.FC<{ targetView: View, label: string; count?: number }> = ({ targetView, label, count }) => (
        <button onClick={() => setView(targetView)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === targetView ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
            {label} 
            {count !== undefined && <span className={`px-2 py-0.5 rounded-full text-xs ${view === targetView ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-600'}`}>{count}</span>}
        </button>
    );

    return (
        <div>
            {isPOModalOpen && poInitialItems !== undefined && (
                <POFormModal
                    suppliers={suppliers}
                    rawMaterials={rawMaterials}
                    initialItems={poInitialItems}
                    onClose={() => setIsPOModalOpen(false)}
                    onSave={handleSavePO}
                />
            )}
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
                     <div className="flex gap-4 mb-4">
                        <button onClick={openNewPOModal} className={buttonPrimaryStyle}>
                            <PlusCircleIcon className="w-5 h-5"/> สร้างใบสั่งซื้อใหม่
                        </button>
                        <button onClick={handleAutoCreatePOs} className={buttonPrimaryStyle} disabled={shortfall.length === 0}>
                            <PlusCircleIcon className="w-5 h-5"/> สร้าง PO อัตโนมัติจากรายการที่ขาด
                        </button>
                    </div>
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
                                <th className="px-4 py-3 text-right">Actions</th>
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
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right space-x-2">
                                        <button onClick={() => handlePrintPO(po.id)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="พิมพ์ PO"><PrinterIcon className="w-5 h-5"/></button>
                                        {po.status !== 'Completed' && (
                                            <button onClick={() => handleReceivePO(po.id)} className="text-green-600 hover:underline font-semibold">รับของ</button>
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