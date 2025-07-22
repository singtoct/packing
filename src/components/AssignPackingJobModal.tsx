import React, { useState, useEffect, useMemo } from 'react';
import { PackingStation, Product, PackingQueueItem, Employee } from '../types';
import { getProducts, getPackingQueue, savePackingQueue, getEmployees, savePackingStations, getPackingStations } from '../services/storageService';
import { SearchableInput } from './SearchableInput';
import { PlusCircleIcon, XCircleIcon } from 'lucide-react';

interface AssignPackingJobModalProps {
    station: PackingStation;
    onClose: () => void;
    onSave: () => void;
}

export const AssignPackingJobModal: React.FC<AssignPackingJobModalProps> = ({ station, onClose, onSave }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [packerName, setPackerName] = useState('');
    const [quantity, setQuantity] = useState(100);
    const [priority, setPriority] = useState(10);
    
    useEffect(() => {
        const loadData = async () => {
            setProducts(await getProducts());
            const emps = await getEmployees();
            setEmployees(emps);
            if (emps.length > 0) {
                setPackerName(emps[0].name);
            }
        };
        loadData();
    }, []);

    const productOptions = useMemo(() => {
        return products.map(p => ({ id: p.id, name: `${p.name} (${p.color})`}))
            .sort((a,b) => a.name.localeCompare(b.name));
    }, [products]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const product = products.find(p => p.id === selectedProductId);
        if (!product) {
            alert('กรุณาเลือกสินค้าที่ต้องการแพ็ค');
            return;
        }

        const newJob: PackingQueueItem = {
            id: crypto.randomUUID(),
            stationId: station.id,
            productName: `${product.name} (${product.color})`,
            quantityGoal: quantity,
            quantityPacked: 0,
            status: 'Queued',
            priority,
            addedDate: new Date().toISOString(),
            packerName,
        };

        const queue = await getPackingQueue();
        await savePackingQueue([...queue, newJob]);

        const stations = await getPackingStations();
        const updatedStations = stations.map(s => 
            s.id === station.id ? { ...s, status: 'Idle' as const } : s
        );
        await savePackingStations(updatedStations);

        onSave();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">มอบหมายงานแพ็คให้ {station.name}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XCircleIcon className="w-7 h-7 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">สินค้าที่ต้องการแพ็ค</label>
                        <SearchableInput 
                            options={productOptions}
                            value={selectedProductId}
                            onChange={setSelectedProductId}
                            displayKey="name"
                            valueKey="id"
                            placeholder="ค้นหาสินค้า..."
                            className="mt-1"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">ผู้แพ็ค</label>
                        <select value={packerName} onChange={e => setPackerName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required>
                            <option value="" disabled>-- เลือกผู้แพ็ค --</option>
                            {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">จำนวนเป้าหมาย (ชิ้น)</label>
                        <input 
                            type="number" 
                            min="1" 
                            value={quantity} 
                            onChange={e => setQuantity(Number(e.target.value))} 
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">ลำดับความสำคัญ (Priority)</label>
                        <input 
                            type="number" 
                            min="1" 
                            value={priority} 
                            onChange={e => setPriority(Number(e.target.value))} 
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">ค่ายิ่งน้อยยิ่งสำคัญมาก (เช่น 1 คือสำคัญที่สุด)</p>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md">ยกเลิก</button>
                        <button type="submit" className="inline-flex items-center justify-center gap-2 px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                           <PlusCircleIcon className="w-5 h-5" /> มอบหมายงาน
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};