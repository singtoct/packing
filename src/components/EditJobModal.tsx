
import React, { useState, useEffect } from 'react';
import { Machine, ProductionQueueItem, Employee, MoldingLogEntry } from '../types';
import { getEmployees, getProductionQueue, saveProductionQueue, saveMachines, getMachines, getSettings, getMoldingLogs, saveMoldingLogs } from '../services/storageService';
import { XCircleIcon } from './icons/Icons';

interface EditJobModalProps {
    job: ProductionQueueItem;
    machine: Machine;
    onClose: () => void;
    onSave: () => void;
}

export const EditJobModal: React.FC<EditJobModalProps> = ({ job, machine, onClose, onSave }) => {
    const [formData, setFormData] = useState<ProductionQueueItem>(job);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [startTime, setStartTime] = useState('');

    useEffect(() => {
        setEmployees(getEmployees());
        if (machine.status === 'Running' && machine.lastStartedAt) {
            const date = new Date(machine.lastStartedAt);
            const pad = (num: number) => ('0' + num).slice(-2);
            const formatted = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
            setStartTime(formatted);
        }
    }, [machine]);

    const handleChange = (field: keyof ProductionQueueItem, value: any) => {
        setFormData(prev => ({...prev, [field]: value}));
    };

    const handleSaveChanges = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Save machine start time first if changed
        if (machine.status === 'Running' && startTime) {
            const allMachines = getMachines();
            const newStartTimeIso = new Date(startTime).toISOString();
            const machineInDb = allMachines.find(m => m.id === machine.id);
            if (machineInDb && machineInDb.lastStartedAt !== newStartTimeIso) {
                const updatedMachines = allMachines.map(m => 
                    m.id === machine.id ? { ...m, lastStartedAt: newStartTimeIso } : m
                );
                saveMachines(updatedMachines);
            }
        }
    
        // Then save job data
        const queue = getProductionQueue();
        const updatedQueue = queue.map(j => (j.id === formData.id ? formData : j));
        saveProductionQueue(updatedQueue);
        
        onSave();
    };

    const handleJobAction = (action: 'start' | 'pause' | 'complete' | 'cancel') => {
        const queue = getProductionQueue();
        const machines = getMachines();
        const machineToUpdate = machines.find(m => m.id === machine.id);

        switch (action) {
            case 'start':
                if (machineToUpdate) {
                    machineToUpdate.status = 'Running';
                    machineToUpdate.lastStartedAt = new Date().toISOString();
                    saveMachines(machines);
                }
                const startedQueue = queue.map(j => {
                    if (j.id === job.id) {
                        const updatedJob: ProductionQueueItem = { ...formData, status: 'In Progress', lastCycleTimestamp: Date.now() };
                        return updatedJob;
                    }
                    return j;
                });
                saveProductionQueue(startedQueue);
                break;
            case 'pause':
                 if (machineToUpdate) {
                    machineToUpdate.status = 'Idle';
                    delete machineToUpdate.lastStartedAt;
                    saveMachines(machines);
                }
                const pausedQueue = queue.map(j => {
                    if (j.id === job.id) {
                        const updatedJob: ProductionQueueItem = { ...formData, status: 'Queued', lastCycleTimestamp: undefined };
                        return updatedJob;
                    }
                    return j;
                });
                saveProductionQueue(pausedQueue);
                break;
            case 'complete':
                 if (machineToUpdate) {
                    machineToUpdate.status = 'Idle';
                    delete machineToUpdate.lastStartedAt;
                    saveMachines(machines);
                }

                // If the job is completed, log any remaining quantity automatically.
                const remainingQty = job.quantityGoal - job.quantityProduced;
                if (remainingQty > 0) {
                    const settings = getSettings();
                    const defaultStatus = settings.productionStatuses[0] || 'รอแปะกันรอย';
                    const status = defaultStatus.startsWith('รอ') ? defaultStatus : `รอ${defaultStatus}`;

                    const newLog: MoldingLogEntry = {
                        id: crypto.randomUUID(),
                        date: new Date().toISOString().split('T')[0],
                        productName: job.productName,
                        quantityProduced: remainingQty,
                        quantityRejected: 0,
                        machine: machine.name,
                        operatorName: job.operatorName || 'N/A',
                        shift: 'เช้า', // Default shift on auto-complete
                        status: status,
                        jobId: job.id,
                    };
                    const allMoldingLogs = getMoldingLogs();
                    saveMoldingLogs([newLog, ...allMoldingLogs]);
                }

                const completedQueue = queue.filter(j => j.id !== job.id);
                saveProductionQueue(completedQueue);
                break;
            case 'cancel':
                if(window.confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกงานนี้ออกจากคิว?')) {
                    if (machineToUpdate && job.status === 'In Progress') {
                         machineToUpdate.status = 'Idle';
                         delete machineToUpdate.lastStartedAt;
                         saveMachines(machines);
                    }
                    const cancelledQueue = queue.filter(j => j.id !== job.id);
                    saveProductionQueue(cancelledQueue);
                } else {
                    return;
                }
                break;
        }
        onSave();
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">จัดการงานสำหรับ {machine.name}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XCircleIcon className="w-7 h-7 text-gray-500" />
                    </button>
                </div>
                 <p className="font-semibold text-lg text-blue-700 mb-4">{job.productName}</p>
                 <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold">
                            {formData.quantityProduced.toLocaleString()} / {formData.quantityGoal.toLocaleString()}
                        </span>
                        <span className="font-bold">
                            {(formData.quantityGoal > 0 ? (formData.quantityProduced / formData.quantityGoal) * 100 : 0).toFixed(1)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                            className="bg-blue-600 h-4 rounded-full text-white text-xs flex items-center justify-center" 
                            style={{ width: `${Math.min((formData.quantityGoal > 0 ? (formData.quantityProduced / formData.quantityGoal) * 100 : 0), 100)}%` }}>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSaveChanges} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ผู้ควบคุมเครื่อง</label>
                        <select
                            value={formData.operatorName || ''}
                            onChange={e => handleChange('operatorName', e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="">-- ไม่ได้กำหนด --</option>
                            {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">จำนวนเป้าหมาย (ชิ้น)</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.quantityGoal}
                                onChange={e => handleChange('quantityGoal', Number(e.target.value))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">จำนวนที่ผลิตแล้ว</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.quantityProduced}
                                onChange={e => handleChange('quantityProduced', Number(e.target.value))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                            />
                        </div>
                    </div>
                    {machine.status === 'Running' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">เวลาเริ่มเดินเครื่อง</label>
                            <input
                                type="datetime-local"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ลำดับความสำคัญ (Priority)</label>
                        <input
                            type="number"
                            min="1"
                            value={formData.priority}
                            onChange={e => handleChange('priority', Number(e.target.value))}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">ค่ายิ่งน้อยยิ่งสำคัญมาก</p>
                    </div>

                    <div className="pt-4 border-t">
                        <h4 className="font-semibold mb-2">Actions</h4>
                        <div className="flex flex-wrap gap-2">
                             {formData.status === 'Queued' && machine.status === 'Idle' && (
                                <button type="button" onClick={() => handleJobAction('start')} className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm">เริ่มงาน</button>
                            )}
                             {formData.status === 'In Progress' && (
                                <button type="button" onClick={() => handleJobAction('pause')} className="px-4 py-2 bg-yellow-500 text-white rounded-md text-sm">พักงาน</button>
                            )}
                            <button type="button" onClick={() => handleJobAction('complete')} className="px-4 py-2 bg-green-500 text-white rounded-md text-sm">จบงานนี้</button>
                            <button type="button" onClick={() => handleJobAction('cancel')} className="px-4 py-2 bg-red-500 text-white rounded-md text-sm">ลบออกจากคิว</button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md">ยกเลิก</button>
                        <button type="submit" className="inline-flex items-center justify-center gap-2 px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                           บันทึกการเปลี่ยนแปลง
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
