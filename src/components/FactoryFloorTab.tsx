

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getMachines, getMoldingLogs, getMaintenanceLogs, getProducts } from '../services/storageService';
import { Machine, MoldingLogEntry, Product, MaintenanceLog } from '../types';
import { FactoryIcon, WrenchIcon, CheckCircle2Icon, AlertTriangleIcon, RefreshCwIcon, LoaderIcon, User, Clock, Package, Milestone } from 'lucide-react'; // Assuming lucide-react is available

interface MachineData {
    machine: Machine;
    currentLog: MoldingLogEntry | null;
    dailyTotalProduced: number;
    estimatedRunHours: number;
}

const calculateDailyData = (
    machine: Machine,
    allMoldingLogs: MoldingLogEntry[],
    productMap: Map<string, Product>
): { dailyTotalProduced: number, estimatedRunHours: number, latestLog: MoldingLogEntry | null } => {
    const todayStr = new Date().toISOString().split('T')[0];

    const machineLogsToday = allMoldingLogs.filter(log => {
        return log.machine === machine.name && log.date === todayStr;
    });

    if (machineLogsToday.length === 0) {
        return { dailyTotalProduced: 0, estimatedRunHours: 0, latestLog: null };
    }

    const dailyTotalProduced = machineLogsToday.reduce((sum, log) => sum + log.quantityProduced, 0);

    const totalCycleTimeSeconds = machineLogsToday.reduce((sum, log) => {
        // Find product by full name first, then by base name if needed
        let product = productMap.get(log.productName);
        if(!product) {
            const baseName = log.productName.split(' (')[0];
            product = productMap.get(baseName);
        }
        const cycleTime = product?.cycleTimeSeconds || 15; // Default cycle time
        return sum + (log.quantityProduced * cycleTime);
    }, 0);

    const estimatedRunHours = totalCycleTimeSeconds / 3600;

    const latestLog = machineLogsToday.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    return { dailyTotalProduced, estimatedRunHours, latestLog };
};


export const FactoryFloorTab: React.FC = () => {
    const [machineData, setMachineData] = useState<MachineData[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(() => {
        setIsLoading(true);
        const machines = getMachines().sort((a,b) => a.name.localeCompare(b.name));
        const allMoldingLogs = getMoldingLogs();
        const allProducts = getProducts();
        // Create a map that includes both full name `Product (Color)` and base name `Product`
        const productMap = new Map<string, Product>();
        allProducts.forEach(p => {
             productMap.set(`${p.name} (${p.color})`, p);
             productMap.set(p.name, p);
        });

        const data: MachineData[] = machines.map(machine => {
            const { dailyTotalProduced, estimatedRunHours, latestLog } = calculateDailyData(machine, allMoldingLogs, productMap);
            return { machine, currentLog: latestLog, dailyTotalProduced, estimatedRunHours };
        });

        setMachineData(data);
        setLastUpdated(new Date());
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Auto-refresh every minute
        
        window.addEventListener('storage', fetchData);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', fetchData);
        };
    }, [fetchData]);

    const StatusIndicator: React.FC<{ status: Machine['status'] }> = ({ status }) => {
        const styles = {
            Running: { bg: 'bg-green-500', text: 'ทำงาน' },
            Down: { bg: 'bg-red-500', text: 'หยุด' },
            Maintenance: { bg: 'bg-yellow-500', text: 'ซ่อมบำรุง' },
        };
        const current = styles[status];
        return (
            <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${current.bg} animate-pulse`}></span>
                <span className="font-semibold text-sm">{current.text}</span>
            </div>
        );
    };
    
    const DataRow: React.FC<{icon: React.ReactNode, label: string, value: React.ReactNode}> = ({icon, label, value}) => (
        <div className="flex items-start gap-3 text-sm">
            <div className="flex-shrink-0 w-5 h-5 text-gray-500 mt-0.5">{icon}</div>
            <div className="flex-1">
                <span className="text-gray-600">{label}:</span>
                <span className="ml-2 font-semibold text-gray-800">{value}</span>
            </div>
        </div>
    );

    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">สถานะเครื่องฉีด (Real-time)</h2>
                    {lastUpdated && <p className="text-sm text-gray-500">อัปเดตล่าสุด: {lastUpdated.toLocaleTimeString('th-TH')}</p>}
                </div>
                <button onClick={fetchData} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
                    <RefreshCwIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    รีเฟรช
                </button>
            </div>
            
            {isLoading && machineData.length === 0 ? (
                <div className="flex items-center justify-center h-96">
                    <LoaderIcon className="w-12 h-12 text-blue-500" />
                </div>
            ) : machineData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {machineData.map(({ machine, currentLog, dailyTotalProduced, estimatedRunHours }) => (
                        <div key={machine.id} className="bg-white p-4 rounded-xl shadow-lg border-t-4" style={{borderColor: machine.status === 'Running' ? '#22c55e' : machine.status === 'Down' ? '#ef4444' : '#f59e0b'}}>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-bold text-gray-800">{machine.name}</h3>
                                <StatusIndicator status={machine.status} />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                <DataRow icon={<Package className="w-5 h-5" />} label="สินค้าที่ผลิต" value={currentLog?.productName || '-'} />
                                <DataRow icon={<Milestone className="w-5 h-5" />} label="ยอดผลิตวันนี้" value={`${dailyTotalProduced.toLocaleString()} ชิ้น`} />
                                <DataRow icon={<Clock className="w-5 h-5" />} label="ชม. ทำงาน" value={`${estimatedRunHours.toFixed(1)} ชม. (โดยประมาณ)`} />
                                <DataRow icon={<User className="w-5 h-5" />} label="ผู้ควบคุม" value={currentLog?.operatorName || '-'} />
                                <DataRow icon={<WrenchIcon className="w-5 h-5" />} label="กะ" value={currentLog?.shift || '-'} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
                    <FactoryIcon className="w-16 h-16 text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600">ไม่พบข้อมูลเครื่องจักร</h3>
                    <p className="text-gray-500">กรุณาเพิ่มเครื่องจักรในหน้า "ซ่อมบำรุงเครื่องจักร"</p>
                </div>
            )}
        </div>
    );
};