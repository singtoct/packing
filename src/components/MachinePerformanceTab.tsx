import React, { useState, useEffect, useMemo } from 'react';
import { getMachines, getMoldingLogs } from '../services/storageService';
import { Machine, MoldingLogEntry } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUpIcon, AlertCircleIcon, PackageIcon, PercentIcon } from 'lucide-react';

// Stat Card component
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; description?: string }> = ({ title, value, icon, description }) => (
    <div className="bg-white p-4 rounded-lg shadow border flex items-start gap-4">
        <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            {description && <p className="text-xs text-gray-400">{description}</p>}
        </div>
    </div>
);

export const MachinePerformanceTab: React.FC = () => {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [allLogs, setAllLogs] = useState<MoldingLogEntry[]>([]);
    const [selectedMachineId, setSelectedMachineId] = useState<string>('');
    const [dateRange, setDateRange] = useState<number>(7); // Default to last 7 days

    useEffect(() => {
        const allMachines = getMachines().sort((a,b) => a.name.localeCompare(b.name));
        setMachines(allMachines);
        setAllLogs(getMoldingLogs());
        if (allMachines.length > 0) {
            setSelectedMachineId(allMachines[0].id);
        }
    }, []);

    const filteredLogs = useMemo(() => {
        if (!selectedMachineId) return [];

        const selectedMachine = machines.find(m => m.id === selectedMachineId);
        if (!selectedMachine) return [];

        const endDate = new Date();
        const startDate = new Date();
        if (dateRange === 1) { // Today
             startDate.setHours(0, 0, 0, 0);
        } else {
            startDate.setDate(endDate.getDate() - (dateRange -1));
            startDate.setHours(0,0,0,0);
        }


        return allLogs.filter(log => {
            const logDate = new Date(log.date);
            const isMachineMatch = log.machine === selectedMachine.name;
            const isDateMatch = logDate >= startDate && logDate <= endDate;
            return isMachineMatch && isDateMatch;
        });
    }, [selectedMachineId, dateRange, allLogs, machines]);

    const performanceData = useMemo(() => {
        const totalProduced = filteredLogs.reduce((sum, log) => sum + log.quantityProduced, 0);
        const totalRejected = filteredLogs.reduce((sum, log) => sum + log.quantityRejected, 0);
        const rejectionRate = totalProduced > 0 ? (Number(totalRejected) / Number(totalProduced)) * 100 : 0;

        const productSummary = filteredLogs.reduce((acc, log) => {
            acc[log.productName] = (acc[log.productName] || 0) + log.quantityProduced;
            return acc;
        }, {} as Record<string, number>);

        const topProducts = Object.entries(productSummary)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
        
        const uniqueProductsCount = Object.keys(productSummary).length;

        return {
            totalProduced,
            totalRejected,
            rejectionRate,
            topProducts,
            uniqueProductsCount
        };
    }, [filteredLogs]);
    
    const DateRangeButton: React.FC<{ range: number; label: string }> = ({ range, label }) => (
         <button
            onClick={() => setDateRange(range)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                dateRange === range
                    ? 'bg-green-600 text-white shadow'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">ประสิทธิภาพเครื่องจักรรายเครื่อง</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border mb-8 items-end">
                <div className="md:col-span-1">
                    <label htmlFor="machine-select" className="block text-sm font-medium text-gray-700">เลือกเครื่องจักร</label>
                    <select
                        id="machine-select"
                        value={selectedMachineId}
                        onChange={(e) => setSelectedMachineId(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                    >
                        {machines.map(machine => (
                            <option key={machine.id} value={machine.id}>
                                {machine.name}
                            </option>
                        ))}
                    </select>
                </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">ช่วงเวลา</label>
                    <div className="flex items-center gap-2 p-1 bg-gray-200 rounded-lg w-min">
                        <DateRangeButton range={1} label="วันนี้" />
                        <DateRangeButton range={7} label="7 วันล่าสุด" />
                        <DateRangeButton range={30} label="30 วันล่าสุด" />
                    </div>
                </div>
            </div>

            {selectedMachineId && (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard title="ยอดผลิตรวม" value={performanceData.totalProduced.toLocaleString()} icon={<TrendingUpIcon className="w-6 h-6"/>} />
                    <StatCard title="ยอดของเสียรวม" value={performanceData.totalRejected.toLocaleString()} icon={<AlertCircleIcon className="w-6 h-6"/>} />
                    <StatCard title="อัตราของเสีย" value={`${performanceData.rejectionRate.toFixed(2)}%`} icon={<PercentIcon className="w-6 h-6"/>} />
                    <StatCard title="จำนวนสินค้าที่ผลิต" value={performanceData.uniqueProductsCount} icon={<PackageIcon className="w-6 h-6"/>} />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow border">
                        <h3 className="font-bold mb-4">Top 5 สินค้าที่ผลิต</h3>
                         <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={performanceData.topProducts} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, textAnchor: 'end', width: 110 }} interval={0} />
                                <Tooltip formatter={(value: number) => `${value.toLocaleString()} ชิ้น`}/>
                                <Bar dataKey="quantity" name="จำนวน (ชิ้น)" fill="#10b981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="lg:col-span-3 bg-white p-4 rounded-lg shadow border">
                        <h3 className="font-bold mb-4">ประวัติการผลิตทั้งหมดในช่วงเวลาที่เลือก</h3>
                        <div className="overflow-y-auto max-h-80">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">สินค้า</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">ผลิตได้</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">ของเสีย</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ผู้ควบคุม</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredLogs.length > 0 ? filteredLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                                        <tr key={log.id}>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm">{new Date(log.date).toLocaleDateString('th-TH')}</td>
                                            <td className="px-4 py-2 text-sm">{log.productName}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-green-600 font-semibold">{log.quantityProduced.toLocaleString()}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-red-600">{log.quantityRejected.toLocaleString()}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm">{log.operatorName}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="text-center text-gray-500 py-8">ไม่พบข้อมูลในช่วงเวลานี้</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </>
            )}
        </div>
    );
};