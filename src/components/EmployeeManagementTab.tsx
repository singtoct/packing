
import React, { useState, useEffect, useMemo } from 'react';
import { Employee, PackingLogEntry } from '../types';
import { getEmployees, saveEmployees, getPackingLogs } from '../services/storageService';
import { PlusCircleIcon, Trash2Icon, UsersIcon } from './icons/Icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const EmployeeManagementTab: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
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

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column: Employee List and Add Form */}
            <div className="md:col-span-1">
                <h2 className="text-2xl font-bold mb-6">จัดการพนักงาน</h2>
                <form onSubmit={handleAddEmployee} className="bg-gray-50 p-4 rounded-lg border mb-6">
                    <label htmlFor="employeeName" className="block text-sm font-medium text-gray-700">ชื่อพนักงานใหม่</label>
                    <div className="mt-1 flex gap-2">
                        <input
                            type="text"
                            id="employeeName"
                            value={newEmployeeName}
                            onChange={e => setNewEmployeeName(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="เช่น สมใจ"
                            required
                        />
                        <button type="submit" className="inline-flex items-center justify-center p-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                            <PlusCircleIcon className="w-5 h-5" />
                        </button>
                    </div>
                </form>

                <h3 className="text-xl font-semibold mb-4">รายชื่อพนักงาน</h3>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                    {employees.map(emp => (
                        <div
                            key={emp.id}
                            onClick={() => setSelectedEmployee(emp)}
                            className={`p-4 rounded-lg cursor-pointer transition-all flex justify-between items-center ${selectedEmployee?.id === emp.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white hover:bg-blue-50 border'}`}
                        >
                            <div>
                                <p className="font-semibold">{emp.name}</p>
                                <p className={`text-xs ${selectedEmployee?.id === emp.id ? 'text-blue-200' : 'text-gray-500'}`}>
                                    เริ่มงาน: {new Date(emp.hireDate).toLocaleDateString('th-TH')}
                                </p>
                            </div>
                             <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp.id); }} 
                                className={`p-1 rounded-full ${selectedEmployee?.id === emp.id ? 'hover:bg-blue-500' : 'text-gray-400 hover:bg-red-100 hover:text-red-600'}`}
                                aria-label={`Delete ${emp.name}`}
                            >
                                <Trash2Icon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Column: Employee Details */}
            <div className="md:col-span-2">
                {selectedEmployee ? (
                    <EmployeeDetails employee={selectedEmployee} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed">
                        <UsersIcon className="w-16 h-16 text-gray-400 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600">เลือกพนักงานเพื่อดูรายละเอียด</h3>
                        <p className="text-gray-500">ข้อมูลสถิติและประวัติการแพ็คจะแสดงที่นี่</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Sub-component for displaying employee details
const EmployeeDetails: React.FC<{ employee: Employee }> = ({ employee }) => {
    const [logs, setLogs] = useState<PackingLogEntry[]>([]);

    useEffect(() => {
        const allLogs = getPackingLogs();
        const employeeLogs = allLogs.filter(log => log.packerName === employee.name)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLogs(employeeLogs);
    }, [employee]);

    const stats = useMemo(() => {
        const totalPacks = logs.reduce((sum, log) => sum + log.quantity, 0);
        return { totalPacks };
    }, [logs]);

    const weeklyChartData = useMemo(() => {
        const last7Days = new Map<string, number>();
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.set(d.toLocaleDateString('th-TH', { weekday: 'short' }), 0);
        }
        logs.forEach(log => {
            const logDate = new Date(log.date);
            const today = new Date();
            const diffDays = Math.ceil((today.getTime() - logDate.getTime()) / (1000 * 3600 * 24));
            if (diffDays <= 7) {
                const dayName = logDate.toLocaleDateString('th-TH', { weekday: 'short' });
                if (last7Days.has(dayName)) {
                    last7Days.set(dayName, last7Days.get(dayName)! + log.quantity);
                }
            }
        });
        return Array.from(last7Days.entries()).map(([name, quantity]) => ({ name, quantity }));
    }, [logs]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-inner border h-full">
            <h2 className="text-3xl font-bold mb-1 text-blue-700">{employee.name}</h2>
            <p className="text-gray-500 mb-6">เริ่มงานวันที่: {new Date(employee.hireDate).toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-sm font-medium text-blue-800">ยอดแพ็ครวมทั้งหมด</p>
                    <p className="text-4xl font-bold text-blue-600">{stats.totalPacks.toLocaleString()}</p>
                    <p className="text-sm text-blue-800">ลัง</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800 text-center mb-2">ยอดแพ็ค 7 วันล่าสุด</h4>
                    <ResponsiveContainer width="100%" height={80}>
                        <BarChart data={weeklyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                             <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                             <YAxis allowDecimals={false} />
                             <Tooltip contentStyle={{ borderRadius: '0.5rem', fontSize: '12px' }}/>
                             <Bar dataKey="quantity" name="จำนวน" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <h3 className="text-xl font-semibold mb-4">ประวัติการแพ็ค</h3>
            <div className="overflow-auto max-h-[40vh] border rounded-lg">
                <table className="min-w-full bg-white divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สินค้า</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">จำนวน (ลัง)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {logs.length > 0 ? (
                            logs.map(log => (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(log.date).toLocaleDateString('th-TH')}</td>
                                    <td className="px-6 py-4 text-sm">{log.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">{log.quantity}</td>
                                </tr>
                            ))
                        ) : (
                             <tr><td colSpan={3} className="text-center text-gray-500 py-8">ไม่พบประวัติการแพ็ค</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
