import React, { useState } from 'react';
import { PackingStation, PackingQueueItem, PackingLogEntry, QCEntry, InventoryItem } from '../types';
import { getPackingLogs, savePackingLogs, getPackingQueue, savePackingQueue, getPackingStations, savePackingStations, getInventory, saveInventory, getQCEntries, saveQCEntries } from '../services/storageService';
import { XCircleIcon, PlusCircleIcon } from 'lucide-react';

interface LogPackingModalProps {
    station: PackingStation;
    job: PackingQueueItem;
    onClose: () => void;
    onSave: () => void;
}

export const LogPackingModal: React.FC<LogPackingModalProps> = ({ station, job, onClose, onSave }) => {
    const [quantity, setQuantity] = useState(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (quantity <= 0) {
            alert("กรุณาใส่จำนวนที่แพ็คให้ถูกต้อง");
            return;
        }

        // 1. Create PackingLogEntry
        const newLog: PackingLogEntry = {
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            name: job.productName,
            quantity: quantity,
            packerName: job.packerName || 'N/A',
        };
        const allPackingLogs = await getPackingLogs();
        await savePackingLogs([newLog, ...allPackingLogs]);

        // 2. Create QCEntry
        const newQCEntry: QCEntry = {
            id: newLog.id,
            packingLogId: newLog.id,
            productName: newLog.name,
            quantity: newLog.quantity,
            packerName: newLog.packerName,
            packingDate: newLog.date,
            status: 'Pending',
        };
        const allQCEntries = await getQCEntries();
        await saveQCEntries([newQCEntry, ...allQCEntries]);

        // 3. Update Inventory
        const inventory = await getInventory();
        const itemIndex = inventory.findIndex(i => i.name === job.productName);
        if (itemIndex > -1) {
            inventory[itemIndex].quantity += quantity;
        } else {
            inventory.push({ id: job.productName, name: job.productName, quantity: quantity });
        }
        await saveInventory(inventory);

        // 4. Update PackingQueueItem
        const queue = await getPackingQueue();
        const jobIndex = queue.findIndex(j => j.id === job.id);
        if (jobIndex > -1) {
            const updatedJob = { ...queue[jobIndex] };
            updatedJob.quantityPacked += quantity;
            
            // 5. Check for job completion
            if (updatedJob.quantityPacked >= updatedJob.quantityGoal) {
                queue.splice(jobIndex, 1); // Remove from queue
                const stations = await getPackingStations();
                const updatedStations = stations.map(s => 
                    s.id === station.id ? { ...s, status: 'Idle' as const, lastStartedAt: undefined } : s
                );
                await savePackingStations(updatedStations);
            } else {
                queue[jobIndex] = updatedJob;
            }
            await savePackingQueue(queue);
        }

        onSave();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">บันทึกผลการแพ็ค</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XCircleIcon className="w-7 h-7 text-gray-500" />
                    </button>
                </div>
                <div className="bg-gray-50 p-3 rounded-md mb-4 text-sm">
                    <p><strong>โต๊ะ:</strong> {station.name}</p>
                    <p><strong>งาน:</strong> {job.productName}</p>
                    <p><strong>เป้าหมาย:</strong> {job.quantityPacked.toLocaleString()} / {job.quantityGoal.toLocaleString()}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">จำนวนที่แพ็คเสร็จ (ชิ้น)</label>
                        <input 
                            type="number" 
                            min="1"
                            value={quantity} 
                            onChange={e => setQuantity(Number(e.target.value))} 
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                            required 
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md">ยกเลิก</button>
                        <button type="submit" className="inline-flex items-center justify-center gap-2 px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
                           <PlusCircleIcon className="w-5 h-5" /> บันทึก
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};