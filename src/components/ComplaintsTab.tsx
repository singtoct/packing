
import React, { useState, useEffect, useMemo } from 'react';
import { Complaint, Customer, OrderItem, PackingLogEntry, MoldingLogEntry, BillOfMaterial, RawMaterial } from '../types';
import { getComplaints, saveComplaints, getCustomers, getOrders, getPackingLogs, getMoldingLogs, getBOMs, getRawMaterials } from '../services/storageService';
import { PlusCircleIcon, Trash2Icon, EditIcon, SearchIcon, MessageSquareWarningIcon } from './icons/Icons';
import { SearchableInput } from './SearchableInput';
import { TraceabilityModal } from './TraceabilityModal';

const ComplaintFormModal: React.FC<{
    complaint?: Complaint;
    customers: Customer[];
    orders: OrderItem[];
    onClose: () => void;
    onSave: (complaint: Complaint) => void;
}> = ({ complaint, customers, orders, onClose, onSave }) => {
    const [formData, setFormData] = useState<Omit<Complaint, 'id'>>({
        customerId: complaint?.customerId || '',
        orderId: complaint?.orderId || '',
        complaintDate: complaint?.complaintDate || new Date().toISOString().split('T')[0],
        description: complaint?.description || '',
        status: complaint?.status || 'Open',
    });

    const filteredOrders = useMemo(() => {
        if (!formData.customerId) return orders;
        return orders.filter(o => o.customerId === formData.customerId);
    }, [formData.customerId, orders]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.customerId || !formData.orderId || !formData.description) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        onSave({ id: complaint?.id || crypto.randomUUID(), ...formData });
    };

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({...prev, [field]: value}));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-6">{complaint ? 'แก้ไข' : 'บันทึก'}ข้อร้องเรียน</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ลูกค้า</label>
                        <SearchableInput options={customers} value={formData.customerId} onChange={val => handleChange('customerId', val)} displayKey="name" valueKey="id" placeholder="ค้นหาลูกค้า..." />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">ออเดอร์ที่เกี่ยวข้อง</label>
                        <SearchableInput options={filteredOrders} value={formData.orderId} onChange={val => handleChange('orderId', val)} displayKey="name" valueKey="id" placeholder="ค้นหาออเดอร์..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">รายละเอียดปัญหา</label>
                        <textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">วันที่รับเรื่อง</label>
                            <input type="date" value={formData.complaintDate} onChange={e => handleChange('complaintDate', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">สถานะ</label>
                            <select value={formData.status} onChange={e => handleChange('status', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="Open">Open</option>
                                <option value="Investigating">Investigating</option>
                                <option value="Resolved">Resolved</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md">ยกเลิก</button>
                        <button type="submit" className="px-4 py-2 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700">บันทึก</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const ComplaintsTab: React.FC = () => {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingComplaint, setEditingComplaint] = useState<Complaint | undefined>(undefined);
    const [traceResult, setTraceResult] = useState<any | null>(null);

    useEffect(() => {
        const refreshData = () => {
            setComplaints(getComplaints().sort((a,b) => new Date(b.complaintDate).getTime() - new Date(a.complaintDate).getTime()));
            setCustomers(getCustomers());
            setOrders(getOrders());
        };
        refreshData();
        window.addEventListener('storage', refreshData);
        return () => window.removeEventListener('storage', refreshData);
    }, []);

    const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);
    const orderMap = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders]);

    const handleSave = (complaint: Complaint) => {
        const existing = complaints.find(c => c.id === complaint.id);
        let updated;
        if (existing) {
            updated = complaints.map(c => c.id === complaint.id ? complaint : c);
        } else {
            updated = [complaint, ...complaints];
        }
        const sorted = updated.sort((a,b) => new Date(b.complaintDate).getTime() - new Date(a.complaintDate).getTime());
        setComplaints(sorted);
        saveComplaints(sorted);
        setIsModalOpen(false);
        setEditingComplaint(undefined);
    };

    const handleDelete = (id: string) => {
        if(window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบันทึกข้อร้องเรียนนี้?')) {
            const updated = complaints.filter(c => c.id !== id);
            setComplaints(updated);
            saveComplaints(updated);
        }
    };
    
    const handleTrace = (orderId: string) => {
        const order = orderMap.get(orderId);
        if (!order) {
            alert("ไม่พบข้อมูลออเดอร์สำหรับตรวจสอบ");
            return;
        }

        const productName = `${order.name} (${order.color})`;
        const packingLogs = getPackingLogs().filter(p => p.name === productName);
        const moldingLogs = getMoldingLogs().filter(m => m.productName === productName);
        const bom = getBOMs().find(b => b.productName === productName) || null;
        
        let materials: (RawMaterial & { required: number })[] = [];
        if (bom) {
            const allRawMaterials = getRawMaterials();
            const materialMap = new Map(allRawMaterials.map(m => [m.id, m]));
            materials = bom.components.map(comp => {
                const material = materialMap.get(comp.rawMaterialId);
                return {
                    ...(material || { id: comp.rawMaterialId, name: 'Unknown Material', quantity: 0, unit: '' }),
                    required: comp.quantity,
                };
            });
        }
        
        setTraceResult({ order, packingLogs, moldingLogs, bom, rawMaterials: materials });
    };

    return (
        <div>
            {isModalOpen && <ComplaintFormModal complaint={editingComplaint} customers={customers} orders={orders} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
            {traceResult && <TraceabilityModal result={traceResult} onClose={() => setTraceResult(null)} />}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">บันทึกข้อร้องเรียนจากลูกค้า</h2>
                <button onClick={() => { setEditingComplaint(undefined); setIsModalOpen(true); }} className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
                    <PlusCircleIcon className="w-5 h-5"/> เพิ่มข้อร้องเรียน
                </button>
            </div>
            <div className="overflow-x-auto">
                 <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ลูกค้า</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ออเดอร์</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-2/5">รายละเอียด</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {complaints.map(c => (
                            <tr key={c.id}>
                                <td className="px-4 py-4 whitespace-nowrap text-sm">{new Date(c.complaintDate).toLocaleDateString('th-TH')}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold">{customerMap.get(c.customerId) || 'N/A'}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm">{orderMap.get(c.orderId)?.name || c.orderId}</td>
                                <td className="px-4 py-4 text-sm whitespace-normal">{c.description}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm"><span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">{c.status}</span></td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-right space-x-2">
                                    <button onClick={() => handleTrace(c.orderId)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full" title="Trace"><SearchIcon className="w-4 h-4"/></button>
                                    <button onClick={() => { setEditingComplaint(c); setIsModalOpen(true); }} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full" title="แก้ไข"><EditIcon className="w-4 h-4"/></button>
                                    <button onClick={() => handleDelete(c.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full" title="ลบ"><Trash2Icon className="w-4 h-4"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
