

import React, { useState, useEffect } from 'react';
import { getMachines, saveMachines, getMaintenanceLogs, saveMaintenanceLogs, getEmployees } from '../services/storageService';
import { Machine, MaintenanceLog, Employee } from '../types';
import { PlusCircleIcon, Trash2Icon, WrenchIcon, EditIcon } from './icons/Icons';

const MaintenanceModal: React.FC<{
    machine: Machine;
    employees: Employee[];
    onClose: () => void;
    onSave: (log: MaintenanceLog) => void;
}> = ({ machine, employees, onClose, onSave }) => {
    const [type, setType] = useState<'Preventive' | 'Corrective'>('Preventive');
    const [description, setDescription] = useState('');
    const [downtimeHours, setDowntimeHours] = useState(0);
    const [technician, setTechnician] = useState<string>(employees[0]?.name || '');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!description.trim() || !technician) return;
        
        const newLog: MaintenanceLog = {
            id: crypto.randomUUID(),
            machineId: machine.id,
            date: new Date().toISOString().split('T')[0],
            type,
            description,
            downtimeHours,
            technician,
        };
        onSave(newLog);
        onClose();
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-2">บันทึกการซ่อมบำรุง</h2>
                <p className="text-gray-600 mb-6">สำหรับเครื่อง: <span className="font-semibold">{machine.name}</span></p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ประเภท</label>
                        <select value={type} onChange={e => setType(e.target.value as any)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm">
                            <option value="Preventive">บำรุงรักษาเชิงป้องกัน (PM)</option>
                            <option value="Corrective">ซ่อมแซม (Corrective)</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">รายละเอียดการดำเนินการ</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">ชั่วโมงที่เครื่องหยุดทำงาน (Downtime)</label>
                        <input type="number" min="0" value={downtimeHours} onChange={e => setDowntimeHours(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ผู้ดำเนินการ</label>
                        <select value={technician} onChange={e => setTechnician(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm" required>
                             {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                        </select>
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


export const MaintenanceTab: React.FC = () => {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [logs, setLogs] = useState<MaintenanceLog[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [newMachineName, setNewMachineName] = useState('');
    const [newMachineLocation, setNewMachineLocation] = useState('');
    
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        setMachines(getMachines());
        setLogs(getMaintenanceLogs());
        setEmployees(getEmployees());
    }, []);

    const handleAddMachine = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMachineName.trim()) return;
        const newMachine: Machine = {
            id: crypto.randomUUID(),
            name: newMachineName,
            location: newMachineLocation,
            status: 'Running'
        };
        const updated = [...machines, newMachine];
        setMachines(updated);
        saveMachines(updated);
        setNewMachineName('');
        setNewMachineLocation('');
    };
    
    const handleUpdateStatus = (id: string, status: Machine['status']) => {
        const updated = machines.map(m => m.id === id ? {...m, status} : m);
        setMachines(updated);
        saveMachines(updated);
    };

    const handleDeleteMachine = (id: string) => {
        if(window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเครื่องจักรนี้? ประวัติการซ่อมบำรุงที่เกี่ยวข้องจะยังคงอยู่')) {
            const updated = machines.filter(m => m.id !== id);
            setMachines(updated);
            saveMachines(updated);
        }
    };

    const openModal = (machine: Machine) => {
        setSelectedMachine(machine);
        setIsModalOpen(true);
    };
    
    const handleSaveLog = (log: MaintenanceLog) => {
        const updatedLogs = [log, ...logs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLogs(updatedLogs);
        saveMaintenanceLogs(updatedLogs);
    };
    
    const StatusBadge: React.FC<{status: Machine['status']}> = ({status}) => {
        const styles = {
            Running: 'bg-green-100 text-green-800',
            Down: 'bg-red-100 text-red-800',
            Maintenance: 'bg-yellow-100 text-yellow-800',
        };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
    };
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {isModalOpen && selectedMachine && <MaintenanceModal machine={selectedMachine} employees={employees} onClose={() => setIsModalOpen(false)} onSave={handleSaveLog} />}
            <div className="md:col-span-1">
                <h2 className="text-2xl font-bold mb-6">จัดการเครื่องจักร</h2>
                <form onSubmit={handleAddMachine} className="bg-gray-50 p-4 rounded-lg border mb-6 space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ชื่อเครื่องจักร</label>
                        <input type="text" value={newMachineName} onChange={e => setNewMachineName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ตำแหน่ง</label>
                        <input type="text" value={newMachineLocation} onChange={e => setNewMachineLocation(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
                        <PlusCircleIcon className="w-5 h-5"/> เพิ่มเครื่องจักร
                    </button>
                </form>

                <h3 className="text-xl font-semibold mb-4">รายการเครื่องจักร</h3>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                    {machines.map(machine => (
                        <div key={machine.id} className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-gray-800">{machine.name}</p>
                                    <p className="text-sm text-gray-500">{machine.location}</p>
                                </div>
                                <StatusBadge status={machine.status} />
                            </div>
                            <div className="mt-4 pt-3 border-t flex justify-between items-center">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-medium">Status:</span>
                                    <select value={machine.status} onChange={e => handleUpdateStatus(machine.id, e.target.value as any)} className="text-sm border-gray-200 rounded p-1">
                                        <option value="Running">Running</option>
                                        <option value="Down">Down</option>
                                        <option value="Maintenance">Maintenance</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                     <button onClick={() => openModal(machine)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full" title="บันทึกการซ่อมบำรุง">
                                        <WrenchIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDeleteMachine(machine.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full" title="ลบเครื่องจักร">
                                        <Trash2Icon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="md:col-span-2">
                <h2 className="text-2xl font-bold mb-6">ประวัติการซ่อมบำรุง</h2>
                 <div className="overflow-x-auto bg-white rounded-lg shadow-sm border">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เครื่องจักร</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ประเภท</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">รายละเอียด</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ผู้ดำเนินการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                             {logs.length > 0 ? (
                                logs.map(log => {
                                    const machine = machines.find(m => m.id === log.machineId);
                                    return (
                                        <tr key={log.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(log.date).toLocaleDateString('th-TH')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">{machine?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">{log.type}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{log.description}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">{log.technician}</td>
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr><td colSpan={5} className="text-center text-gray-500 py-8">ไม่มีประวัติการซ่อมบำรุง</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
