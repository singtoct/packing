

import React, { useState, useEffect } from 'react';
import { Machine, ProductionQueueItem, Employee } from '../types';
import { getEmployees, getProductionQueue, saveProductionQueue } from '../services/storageService';
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

    useEffect(() => {
        setEmployees(getEmployees());
    }, []);

    const handleChange = (field: keyof ProductionQueueItem, value: any) => {
        setFormData(prev => ({...prev, [field]: value}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const queue = getProductionQueue();
        const updatedQueue = queue.map(j => (j.id === formData.id ? formData : j));
        saveProductionQueue(updatedQueue);
        onSave();
    };

    const handleJobAction = (status: 'In Progress' | 'Completed' | 'Queued') => {
         const queue = getProductionQueue();
         // When marking as completed, filter it out instead of just changing status
         const updatedQueue = status === 'Completed'
            ? queue.filter(j => j.id !== job.id)
            : queue.map(j => (j.id === job.id ? { ...formData, status } : j));
         
         saveProductionQueue(updatedQueue);
         onSave();
    };
    
    const handleCancelJob = () => {
        if(window.confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกงานนี้ออกจากคิว?')) {
            const queue = getProductionQueue();
            const updatedQueue = queue.filter(j => j.id !== job.id);
            saveProductionQueue(updatedQueue);
            onSave();
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">แก้ไขงานสำหรับ {machine.name}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XCircleIcon className="w-7 h-7 text-gray-500" />
                    </button>
                </div>
                 <p className="font-semibold text-lg text-blue-700 mb-4">{job.productName}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                max={formData.quantityGoal}
                                value={formData.quantityProduced}
                                onChange={e => handleChange('quantityProduced', Number(e.target.value))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                            />
                        </div>
                    </div>
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
                            {formData.status === 'Queued' && (
                                <button type="button" onClick={() => handleJobAction('In Progress')} className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm">เริ่มงาน</button>
                            )}
                             {formData.status === 'In Progress' && (
                                <button type="button" onClick={() => handleJobAction('Queued')} className="px-4 py-2 bg-yellow-500 text-white rounded-md text-sm">กลับไปที่คิว</button>
                            )}
                            <button type="button" onClick={() => handleJobAction('Completed')} className="px-4 py-2 bg-green-500 text-white rounded-md text-sm">จบงาน</button>
                            <button type="button" onClick={handleCancelJob} className="px-4 py-2 bg-red-500 text-white rounded-md text-sm">ลบออกจากคิว</button>
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
