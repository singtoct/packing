
import React, { useState, useEffect } from 'react';
import { PackingStation, PackingQueueItem, Employee } from '../types';
import { getEmployees, getPackingQueue, savePackingQueue, savePackingStations, getPackingStations } from '../services/storageService';
import { XCircleIcon } from './icons/Icons';

interface EditPackingJobModalProps {
    job: PackingQueueItem;
    station: PackingStation;
    onClose: () => void;
    onSave: () => void;
}

export const EditPackingJobModal: React.FC<EditPackingJobModalProps> = ({ job, station, onClose, onSave }) => {
    const [formData, setFormData] = useState<PackingQueueItem>(job);
    const [employees, setEmployees] = useState<Employee[]>([]);

    useEffect(() => {
        setEmployees(getEmployees());
    }, []);

    const handleChange = (field: keyof PackingQueueItem, value: any) => {
        setFormData(prev => ({...prev, [field]: value}));
    };

    const handleSaveChanges = (e: React.FormEvent) => {
        e.preventDefault();
        const queue = getPackingQueue();
        const updatedQueue = queue.map(j => (j.id === formData.id ? formData : j));
        savePackingQueue(updatedQueue);
        onSave();
    };

    const handleJobAction = (action: 'start' | 'pause' | 'complete' | 'cancel') => {
        const queue = getPackingQueue();
        const stations = getPackingStations();
        const stationToUpdate = stations.find(s => s.id === station.id);

        switch (action) {
            case 'start':
                if (stationToUpdate) {
                    stationToUpdate.status = 'Running';
                    stationToUpdate.lastStartedAt = new Date().toISOString();
                    savePackingStations(stations);
                }
                const startedQueue = queue.map((j): PackingQueueItem => j.id === job.id ? { ...formData, status: 'In Progress' } : j);
                savePackingQueue(startedQueue);
                break;
            case 'pause':
                 if (stationToUpdate) {
                    stationToUpdate.status = 'Idle';
                    delete stationToUpdate.lastStartedAt;
                    savePackingStations(stations);
                }
                const pausedQueue = queue.map((j): PackingQueueItem => j.id === job.id ? { ...formData, status: 'Queued' } : j);
                savePackingQueue(pausedQueue);
                break;
            case 'complete':
                 if (stationToUpdate) {
                    stationToUpdate.status = 'Idle';
                    delete stationToUpdate.lastStartedAt;
                    savePackingStations(stations);
                }
                const completedQueue = queue.filter(j => j.id !== job.id);
                savePackingQueue(completedQueue);
                break;
            case 'cancel':
                if(window.confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกงานนี้ออกจากคิว?')) {
                    if (stationToUpdate && job.status === 'In Progress') {
                         stationToUpdate.status = 'Idle';
                         delete stationToUpdate.lastStartedAt;
                         savePackingStations(stations);
                    }
                    const cancelledQueue = queue.filter(j => j.id !== job.id);
                    savePackingQueue(cancelledQueue);
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
                    <h2 className="text-2xl font-bold text-gray-800">จัดการงานแพ็คสำหรับ {station.name}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XCircleIcon className="w-7 h-7 text-gray-500" />
                    </button>
                </div>
                 <p className="font-semibold text-lg text-blue-700 mb-4">{job.productName}</p>
                 <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold">{formData.quantityPacked.toLocaleString()} / {formData.quantityGoal.toLocaleString()}</span>
                        <span className="font-bold">{(formData.quantityGoal > 0 ? (formData.quantityPacked / formData.quantityGoal) * 100 : 0).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                        <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${Math.min((formData.quantityGoal > 0 ? (formData.quantityPacked / formData.quantityGoal) * 100 : 0), 100)}%` }}></div>
                    </div>
                </div>

                <form onSubmit={handleSaveChanges} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ผู้แพ็ค</label>
                        <select value={formData.packerName || ''} onChange={e => handleChange('packerName', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                            <option value="">-- ไม่ได้กำหนด --</option>
                            {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">จำนวนเป้าหมาย</label>
                            <input type="number" min="1" value={formData.quantityGoal} onChange={e => handleChange('quantityGoal', Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">จำนวนที่แพ็คแล้ว</label>
                            <input type="number" min="0" value={formData.quantityPacked} onChange={e => handleChange('quantityPacked', Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ลำดับความสำคัญ (Priority)</label>
                        <input type="number" min="1" value={formData.priority} onChange={e => handleChange('priority', Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                    </div>

                    <div className="pt-4 border-t">
                        <h4 className="font-semibold mb-2">Actions</h4>
                        <div className="flex flex-wrap gap-2">
                             {formData.status === 'Queued' && station.status === 'Idle' && (
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
