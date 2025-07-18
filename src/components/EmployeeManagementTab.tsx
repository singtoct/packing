import React, { useState, useEffect, useMemo } from 'react';
import { Employee } from '../types';
import { getEmployees, saveEmployees, getPackingLogs } from '../services/storageService';
import { PlusCircleIcon, Trash2Icon, UsersIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const EmployeeManagementTab: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    useEffect(() => {
        setEmployees(getEmployees());
    }, []);

    const handleAddEmployee = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmployeeName.trim()) return;
        const newEmployee: Employee = {
            id: crypto.randomUUID(),
            name: newEmployeeName.trim(),
            hireDate: new Date().toISOString().split('T')[0]
        };
        const updatedEmployees = [...employees, newEmployee].sort((a,b) => a.name.localeCompare(b.name));
        setEmployees(updatedEmployees);
        saveEmployees(updatedEmployees);
        setNewEmployeeName('');
    };

    const handleDeleteEmployee = (id: string) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบพนักงานคนนี้? ประวัติการแพ็คของพนักงานจะยังคงอยู่')) {
            const updatedEmployees = employees.filter(emp => emp.id !== id);
            setEmployees(updatedEmployees);
            saveEmployees(updatedEmployees);
            if (selectedEmployee?.id === id) {
                setSelectedEmployee(null);
            }
        }
    };
    
    const handleSelectEmployee = (id: string, checked: boolean) => {
        setSelectedEmployees(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedEmployees(new Set(employees.map(e => e.id)));
        } else {
            setSelectedEmployees(new Set());
        }
    };
    
    const handleDeleteSelected = () => {
        if (selectedEmployees.size === 0) return;
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบพนักงาน ${selectedEmployees.size} คนที่เลือก?`)) {
            const updatedEmployees = employees.filter(emp => !selectedEmployees.has(emp.id));
            setEmployees(updatedEmployees);
            saveEmployees(updatedEmployees);
            setSelectedEmployees(new Set());
            if (selectedEmployee && selectedEmployees.has(selectedEmployee.id)) {
                setSelectedEmployee(null);
            }
        }
    };

    const selectedEmployeeLogs = useMemo(() => {
        if (!selectedEmployee) return [];
        const packingLogs = getPackingLogs();
        const dailyLogs = packingLogs
            .filter(log => log.packerName === selectedEmployee.name)
            .reduce((acc, log) => {
                const date = log.date;
                acc[date] = (acc[date] || 0) + log.quantity;
                return acc;
            }, {} as Record<string, number>);

        return Object.entries(dailyLogs)
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .slice(-30)
            .map(([date, quantity]) => ({ date: new Date(date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }), quantity }));
    }, [selectedEmployee]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
                <h2 className="text-2xl font-bold mb-6">จัดการพนักงาน</h2>
                <form onSubmit={handleAddEmployee} className="bg-gray-50 p-4 rounded-lg border mb-6 space-y-3">
                    <div>
                        <label htmlFor="newEmployeeName" className="block text-sm font-medium text-gray-700">ชื่อพนักงานใหม่</label>
                        <input
                            id="newEmployeeName"
                            type="text"
                            value={newEmployeeName}
                            onChange={e => setNewEmployeeName(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>
                    <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
                        <PlusCircleIcon className="w-5 h-5" />
                        เพิ่มพนักงาน
                    </button>
                </form>

                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-semibold">รายชื่อพนักงาน</h3>
                    <button
                        onClick={handleDeleteSelected}
                        disabled={selectedEmployees.size === 0}
                        className="inline-flex items-center gap-1 px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                    >
                        <Trash2Icon className="w-4 h-4"/> ลบ ({selectedEmployees.size})
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        onChange={e => handleSelectAll(e.target.checked)}
                                        checked={employees.length > 0 && selectedEmployees.size === employees.length}
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อ</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่เริ่มงาน</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {employees.map(emp => (
                                <tr key={emp.id} onClick={() => setSelectedEmployee(emp)} className={`cursor-pointer hover:bg-green-50 ${selectedEmployee?.id === emp.id ? 'bg-green-100' : ''} ${selectedEmployees.has(emp.id) ? 'bg-green-50' : ''}`}>
                                    <td className="p-4" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                            checked={selectedEmployees.has(emp.id)}
                                            onChange={e => handleSelectEmployee(emp.id, e.target.checked)}
                                        />
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold">{emp.name}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm">{new Date(emp.hireDate).toLocaleDateString('th-TH')}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp.id); }} className="p-1 text-red-600 hover:text-red-900" title="ลบ"><Trash2Icon className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="md:col-span-2">
                {selectedEmployee ? (
                    <div>
                        <h3 className="text-xl font-semibold mb-4">ผลงานของ: {selectedEmployee.name}</h3>
                        <div className="bg-white p-4 rounded-lg shadow border h-96">
                            <h4 className="font-bold mb-4">ยอดแพ็ครายวัน (30 วันล่าสุด)</h4>
                            {selectedEmployeeLogs.length > 0 ? (
                                <ResponsiveContainer width="100%" height="90%">
                                    <BarChart data={selectedEmployeeLogs} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="quantity" name="จำนวน (ชิ้น)" fill="#10b981" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-center text-gray-500 pt-16">ไม่พบข้อมูลการแพ็คสำหรับพนักงานคนนี้</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed">
                        <UsersIcon className="w-16 h-16 text-gray-400 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600">เลือกพนักงานเพื่อดูรายละเอียด</h3>
                        <p className="text-gray-500">คลิกที่ชื่อพนักงานจากรายการด้านซ้าย</p>
                    </div>
                )}
            </div>
        </div>
    );
};
