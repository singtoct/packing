import React, { useState, useEffect, useMemo } from 'react';
import { getMachines, saveMachines, getMaintenanceLogs, saveMaintenanceLogs, getEmployees } from '../services/storageService';
import { Machine, MaintenanceLog, Employee } from '../types';
import { PlusCircleIcon, Trash2Icon, WrenchIcon, EditIcon } from 'lucide-react';

type SortDirection = 'asc' | 'desc';
type MachineSortKey = keyof Machine;
interface MachineSortConfig {
    key: MachineSortKey;
    direction: SortDirection;
}

type LogSortKey = keyof MaintenanceLog | 'machineName';
interface LogSortConfig {
    key: LogSortKey;
    direction: SortDirection;
}

// Helper component for sortable table headers
const SortableHeader: React.FC<{
  label: string;
  sortConfig: LogSortConfig | null;
  requestSort: (key: LogSortKey) => void;
  sortKey: LogSortKey;
  className?: string;
}> = ({ label, sortConfig, requestSort, sortKey, className }) => {
  const isSorted = sortConfig?.key === sortKey;
  const directionIcon = isSorted ? (sortConfig?.direction === 'asc' ? '▲' : '▼') : '';

  return (
    <th
      scope="col"
      className={`cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
      onClick={() => requestSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isSorted && <span className="text-xs text-gray-500">{directionIcon}</span>}
      </div>
    </th>
  );
};


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
                        <input type="number" min="0" step="any" value={downtimeHours} onChange={e => setDowntimeHours(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
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

const STATUS_OPTIONS: { value: Machine['status']; label: string }[] = [
    { value: 'Running', label: 'ทำงาน' },
    { value: 'Idle', label: 'ว่าง' },
    { value: 'Down', label: 'เสีย' },
    { value: 'Maintenance', label: 'กำลังซ่อม' },
    { value: 'Mold Change', label: 'รอเปลี่ยนโมล' },
];

export const MaintenanceTab: React.FC = () => {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [selectedMachines, setSelectedMachines] = useState<Set<string>>(new Set());
    const [logs, setLogs] = useState<MaintenanceLog[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [newMachineName, setNewMachineName] = useState('');
    const [newMachineLocation, setNewMachineLocation] = useState('');
    const [newMachineHours, setNewMachineHours] = useState('');
    
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [machineSortConfig, setMachineSortConfig] = useState<MachineSortConfig | null>({ key: 'name', direction: 'asc' });
    const [logSortConfig, setLogSortConfig] = useState<LogSortConfig | null>({ key: 'date', direction: 'desc' });

    useEffect(() => {
        setMachines(getMachines());
        setLogs(getMaintenanceLogs());
        setEmployees(getEmployees());
    }, []);

    const requestMachineSort = (key: MachineSortKey) => {
        let direction: SortDirection = 'asc';
        if (machineSortConfig && machineSortConfig.key === key && machineSortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setMachineSortConfig({ key, direction });
    };

    const sortedMachines = useMemo(() => {
        let sortableItems = [...machines];
        if (machineSortConfig) {
            sortableItems.sort((a, b) => {
                const aVal = a[machineSortConfig.key];
                const bVal = b[machineSortConfig.key];

                // Handle undefined values (for nextPmDate) to prevent crashes
                if (aVal === undefined && bVal === undefined) return 0;
                if (aVal === undefined) return 1; // undefined values go to the end
                if (bVal === undefined) return -1; // undefined values go to the end

                if (aVal < bVal) {
                    return machineSortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return machineSortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [machines, machineSortConfig]);
    
    const requestLogSort = (key: LogSortKey) => {
        let direction: SortDirection = 'asc';
        if (logSortConfig && logSortConfig.key === key && logSortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setLogSortConfig({ key, direction });
    };

    const sortedLogs = useMemo(() => {
        const machineMap = new Map(machines.map(m => [m.id, m.name]));
        let sortableItems = logs.map(log => ({
            ...log,
            machineName: machineMap.get(log.machineId) || 'N/A'
        }));
        if (logSortConfig) {
            sortableItems.sort((a, b) => {
                const aVal = a[logSortConfig.key];
                const bVal = b[logSortConfig.key];
                 if (aVal < bVal) {
                    return logSortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return logSortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [logs, logSortConfig, machines]);


    const handleAddMachine = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMachineName.trim()) return;
        const newMachine: Machine = {
            id: crypto.randomUUID(),
            name: newMachineName,
            location: newMachineLocation,
            status: 'Idle',
            workingHoursPerDay: newMachineHours ? Number(newMachineHours) : undefined,
        };
        const updated = [...machines, newMachine];
        setMachines(updated);
        saveMachines(updated);
        setNewMachineName('');
        setNewMachineLocation('');
        setNewMachineHours('');
    };
    
    const handleUpdateMachineField = (id: string, field: keyof Machine, value: any) => {
        const updated = machines.map(m => {
            if (m.id === id) {
                const updatedMachine = { ...m, [field]: value };
                if (field === 'status') {
                    if (value === 'Running' && !m.lastStartedAt) {
                        // Changing status to 'Running' here is not recommended
                        // as it doesn't link to a job. This might lead to inconsistent data.
                        // However, to prevent broken states, we'll manage the timestamp.
                        updatedMachine.lastStartedAt = new Date().toISOString();
                    } else if (value !== 'Running') {
                        delete updatedMachine.lastStartedAt;
                    }
                }
                return updatedMachine;
            }
            return m;
        });
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
    
    const handleSelectMachine = (id: string, checked: boolean) => {
        setSelectedMachines(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };

    const handleDeleteSelected = () => {
        if(selectedMachines.size === 0) return;
        if(window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเครื่องจักร ${selectedMachines.size} เครื่องที่เลือก?`)) {
            const updated = machines.filter(m => !selectedMachines.has(m.id));
            setMachines(updated);
            saveMachines(updated);
            setSelectedMachines(new Set());
        }
    };

    const openModal = (machine: Machine) => {
        setSelectedMachine(machine);
        setIsModalOpen(true);
    };
    
    const handleSaveLog = (log: MaintenanceLog) => {
        const updatedLogs = [log, ...logs];
        setLogs(updatedLogs);
        saveMaintenanceLogs(updatedLogs);
    };
    
    const StatusBadge: React.FC<{status: Machine['status']}> = ({status}) => {
        const styles: Record<Machine['status'], string> = {
            Running: 'bg-green-100 text-green-800',
            Down: 'bg-red-100 text-red-800',
            Maintenance: 'bg-yellow-100 text-yellow-800',
            Idle: 'bg-gray-100 text-gray-800',
            'Mold Change': 'bg-purple-100 text-purple-800',
        };
        const label = STATUS_OPTIONS.find(opt => opt.value === status)?.label || status;
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{label}</span>;
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
                     <div>
                        <label className="block text-sm font-medium text-gray-700">ชม.ทำงาน/วัน (สำหรับ OEE)</label>
                        <input type="number" min="0" max="24" step="0.5" value={newMachineHours} onChange={e => setNewMachineHours(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="เช่น 8 หรือ 16" />
                    </div>
                    <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
                        <PlusCircleIcon className="w-5 h-5"/> เพิ่มเครื่องจักร
                    </button>
                </form>

                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">รายการเครื่องจักร</h3>
                    <button
                        onClick={handleDeleteSelected}
                        disabled={selectedMachines.size === 0}
                        className="inline-flex items-center gap-1 px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                    >
                        <Trash2Icon className="w-4 h-4"/> ลบที่เลือก
                    </button>
                </div>
                <div className="flex gap-2 mb-2 text-xs">
                    <span>เรียงตาม:</span>
                    <button onClick={() => requestMachineSort('name')} className={`font-semibold ${machineSortConfig?.key === 'name' ? 'text-green-600' : ''}`}>ชื่อ</button>
                    <button onClick={() => requestMachineSort('location')} className={`font-semibold ${machineSortConfig?.key === 'location' ? 'text-green-600' : ''}`}>ตำแหน่ง</button>
                    <button onClick={() => requestMachineSort('status')} className={`font-semibold ${machineSortConfig?.key === 'status' ? 'text-green-600' : ''}`}>สถานะ</button>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                    {sortedMachines.map(machine => (
                        <div key={machine.id} className="bg-white p-4 rounded-lg shadow-sm border">
                           <div className="flex justify-between items-start">
                               <div className="flex items-start gap-3">
                                   <input
                                        type="checkbox"
                                        className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1"
                                        checked={selectedMachines.has(machine.id)}
                                        onChange={e => handleSelectMachine(machine.id, e.target.checked)}
                                    />
                                    <div>
                                        <p className="font-semibold text-gray-800">{machine.name}</p>
                                        <p className="text-sm text-gray-500">{machine.location}</p>
                                    </div>
                               </div>
                                <StatusBadge status={machine.status} />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-600">รอบซ่อมบำรุงถัดไป (PM)</label>
                                    <input
                                        type="date"
                                        value={machine.nextPmDate || ''}
                                        onChange={e => handleUpdateMachineField(machine.id, 'nextPmDate', e.target.value)}
                                        className="mt-1 block w-full px-2 py-1 border border-gray-200 rounded-md text-sm"
                                    />
                                </div>
                                 <div>
                                    <label className="text-xs font-medium text-gray-600" title="จำนวนชั่วโมงทำงานต่อวันสำหรับคำนวณ OEE">ชม.ทำงาน/วัน</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="24"
                                        step="0.5"
                                        value={machine.workingHoursPerDay ?? ''}
                                        onChange={e => handleUpdateMachineField(machine.id, 'workingHoursPerDay', e.target.value === '' ? undefined : Number(e.target.value))}
                                        placeholder="24"
                                        className="mt-1 block w-full px-2 py-1 border border-gray-200 rounded-md text-sm"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t flex justify-between items-center">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-medium">Status:</span>
                                    <select value={machine.status} onChange={e => handleUpdateMachineField(machine.id, 'status', e.target.value as any)} className="text-sm border-gray-200 rounded p-1">
                                        {STATUS_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
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
                                <SortableHeader sortKey="date" label="วันที่" sortConfig={logSortConfig} requestSort={requestLogSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"/>
                                <SortableHeader sortKey="machineName" label="เครื่องจักร" sortConfig={logSortConfig} requestSort={requestLogSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"/>
                                <SortableHeader sortKey="type" label="ประเภท" sortConfig={logSortConfig} requestSort={requestLogSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"/>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">รายละเอียด</th>
                                <SortableHeader sortKey="technician" label="ผู้ดำเนินการ" sortConfig={logSortConfig} requestSort={requestLogSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"/>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                             {sortedLogs.length > 0 ? (
                                sortedLogs.map(log => (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(log.date).toLocaleDateString('th-TH')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">{log.machineName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{log.type}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{log.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{log.technician}</td>
                                    </tr>
                                ))
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