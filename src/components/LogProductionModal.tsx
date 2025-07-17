
import React, { useState, useEffect } from 'react';
import { Machine, ProductionQueueItem, MoldingLogEntry, MachineDailyLog } from '../types';
import { getSettings, saveMoldingLogs, getMoldingLogs, saveProductionQueue, getProductionQueue, saveMachineDailyLogs, getMachineDailyLogs, saveMachines, getMachines } from '../services/storageService';
import { XCircleIcon, PlusCircleIcon } from './icons/Icons';

interface LogProductionModalProps {
    machine: Machine;
    job: ProductionQueueItem;
    onClose: () => void;
    onSave: () => void;
}

export const LogProductionModal: React.FC<LogProductionModalProps> = ({ machine, job, onClose, onSave }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [shift, setShift] = useState<'เช้า' | 'บ่าย' | 'ดึก'>('เช้า');
    const [hoursWorked, setHoursWorked] = useState(8);
    const [quantityProduced, setQuantityProduced] = useState(0);
    const [quantityRejected, setQuantityRejected] = useState(0);
    const [nextStep, setNextStep] = useState('');
    const [productionStatuses, setProductionStatuses] = useState<string[]>([]);

    useEffect(() => {
        const settings = getSettings();
        setProductionStatuses(settings.productionStatuses);
        if (settings.productionStatuses.length > 0) {
            setNextStep(settings.productionStatuses[0]);
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Create MoldingLogEntry
        const status = nextStep.startsWith('รอ') ? nextStep : `รอ${nextStep}`;
        const newLog: MoldingLogEntry = {
            id: crypto.randomUUID(),
            date,
            productName: job.productName,
            quantityProduced,
            quantityRejected,
            machine: machine.name,
            operatorName: job.operatorName || 'N/A',
            shift,
            status,
            jobId: job.id,
        };
        const allMoldingLogs = getMoldingLogs();
        saveMoldingLogs([newLog, ...allMoldingLogs]);

        // 2. Update MachineDailyLog
        const dailyLogs = getMachineDailyLogs();
        const logIndex = dailyLogs.findIndex(l => l.machineId === machine.id && l.jobId === job.id && l.date === date);
        if (logIndex > -1) {
            dailyLogs[logIndex].hours += hoursWorked;
        } else if (hoursWorked > 0) {
            dailyLogs.push({ id: crypto.randomUUID(), machineId: machine.id, jobId: job.id, date, hours: hoursWorked });
        }
        saveMachineDailyLogs(dailyLogs);

        // 3. Update ProductionQueueItem
        const queue = getProductionQueue();
        const jobIndex = queue.findIndex(j => j.id === job.id);
        if (jobIndex > -1) {
            const updatedJob = { ...queue[jobIndex] };
            updatedJob.quantityProduced += quantityProduced;
            
            // 4. Check for job completion
            if (updatedJob.quantityProduced >= updatedJob.quantityGoal) {
                // Remove completed job from queue
                queue.splice(jobIndex, 1);
                
                // Update machine status
                const machines = getMachines();
                const updatedMachines = machines.map(m => {
                    if (m.id === machine.id) {
                        return { ...m, status: 'Idle' as Machine['status'], lastStartedAt: undefined };
                    }
                    return m;
                });
                saveMachines(updatedMachines);
            } else {
                queue[jobIndex] = updatedJob;
            }
             saveProductionQueue(queue);
        }

        onSave();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">บันทึกผลผลิต</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XCircleIcon className="w-7 h-7 text-gray-500" />
                    </button>
                </div>
                <div className="bg-gray-50 p-3 rounded-md mb-4 text-sm">
                    <p><strong>เครื่อง:</strong> {machine.name}</p>
                    <p><strong>งาน:</strong> {job.productName}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">วันที่</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">กะ</label>
                            <select value={shift} onChange={e => setShift(e.target.value as any)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="เช้า">เช้า</option>
                                <option value="บ่าย">บ่าย</option>
                                <option value="ดึก">ดึก</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ชั่วโมงที่ทำงาน (สำหรับ OEE)</label>
                        <input type="number" min="0" step="0.5" value={hoursWorked} onChange={e => setHoursWorked(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">จำนวนผลิตได้ (ชิ้น)</label>
                            <input type="number" min="0" value={quantityProduced} onChange={e => setQuantityProduced(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">จำนวนของเสีย (ชิ้น)</label>
                            <input type="number" min="0" value={quantityRejected} onChange={e => setQuantityRejected(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ส่งไปขั้นตอนต่อไป</label>
                        <select value={nextStep} onChange={e => setNextStep(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required>
                             {productionStatuses.map(step => <option key={step} value={step}>{step}</option>)}
                        </select>
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
