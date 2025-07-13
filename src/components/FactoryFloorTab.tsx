
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getMachines, getMoldingLogs, getMaintenanceLogs, getProducts } from '../services/storageService';
import { Machine, MoldingLogEntry, Product, MaintenanceLog } from '../types';
import { FactoryIcon, WrenchIcon, CheckCircle2Icon, AlertTriangleIcon, RefreshCwIcon, LoaderIcon } from './icons/Icons';

interface DailyOeeData {
    availability: number;
    performance: number;
    quality: number;
    oee: number;
}

interface MachineData {
    machine: Machine;
    currentLog: MoldingLogEntry | null;
    dailyOEE: DailyOeeData | null;
}

const calculateDailyOEE = (
    machine: Machine,
    allMoldingLogs: MoldingLogEntry[],
    allMaintenanceLogs: MaintenanceLog[],
    productMap: Map<string, Product>
): DailyOeeData => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const machineLogsToday = allMoldingLogs.filter(log => {
        const logDate = new Date(log.date);
        return log.machine === machine.name && logDate >= today && logDate < tomorrow;
    });

    const maintenanceToday = allMaintenanceLogs.filter(log => {
        const logDate = new Date(log.date);
        return log.machineId === machine.id && logDate >= today && logDate < tomorrow;
    });

    const plannedTime = 24 * 3600; // seconds in a day
    const totalDowntime = maintenanceToday.reduce((sum, log) => sum + (log.downtimeHours * 3600), 0);
    const runTime = plannedTime - totalDowntime;

    const availability = runTime > 0 ? (runTime / plannedTime) : 0;
    
    if (machineLogsToday.length === 0) {
        return { availability, performance: 0, quality: 0, oee: 0 };
    }

    const totalProduced = machineLogsToday.reduce((sum, log) => sum + log.quantityProduced, 0);
    const totalRejected = machineLogsToday.reduce((sum, log) => sum + log.quantityRejected, 0);
    const totalGood = totalProduced - totalRejected;
    
    const quality = totalProduced > 0 ? (totalGood / totalProduced) : 0;

    const idealRunTime = machineLogsToday.reduce((sum, log) => {
        const baseProductName = log.productName.split(' (')[0];
        const product = productMap.get(baseProductName);
        const cycleTime = product?.cycleTimeSeconds || 15; // Default if not found
        return sum + (log.quantityProduced * cycleTime);
    }, 0);

    const performance = runTime > 0 ? (idealRunTime / runTime) : 0;
    
    const oee = availability * performance * quality;
    
    return { availability, performance, quality, oee };
};


export const FactoryFloorTab: React.FC = () => {
    const [machineData, setMachineData] = useState<MachineData[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(() => {
        setIsLoading(true);
        const machines = getMachines().sort((a,b) => a.name.localeCompare(b.name));
        const allMoldingLogs = getMoldingLogs();
        const allMaintenanceLogs = getMaintenanceLogs();
        const allProducts = getProducts();
        const productMap = new Map(allProducts.map(p => [p.name, p]));
        
        const todayStr = new Date().toISOString().split('T')[0];

        const data: MachineData[] = machines.map(machine => {
            const machineLogsToday = allMoldingLogs
                .filter(log => log.machine === machine.name && log.date === todayStr)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            const currentLog = machineLogsToday.length > 0 ? machineLogsToday[0] : null;
            
            const dailyOEE = calculateDailyOEE(machine, allMoldingLogs, allMaintenanceLogs, productMap);

            return { machine, currentLog, dailyOEE };
        });

        setMachineData(data);
        setLastUpdated(new Date());
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Auto-refresh every minute
        
        // Listen to storage changes to refresh immediately
        window.addEventListener('storage', fetchData);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', fetchData);
        };
    }, [fetchData]);

    const StatusIndicator: React.FC<{ status: Machine['status'] }> = ({ status }) => {
        const styles = {
            Running: { bg: 'bg-green-500', text: 'Running' },
            Down: { bg: 'bg-red-500', text: 'Down' },
            Maintenance: { bg: 'bg-yellow-500', text: 'Maintenance' },
        };
        const current = styles[status];
        return (
            <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${current.bg}`}></span>
                <span className="font-semibold text-sm">{current.text}</span>
            </div>
        );
    };
    
    const OEEBar: React.FC<{ value: number, label: string }> = ({ value, label }) => (
        <div>
            <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-gray-600">{label}</span>
                <span className="font-bold">{(value * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${value * 100}%` }}></div>
            </div>
        </div>
    );

    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">ภาพรวมโรงงาน (Real-time)</h2>
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
                    {machineData.map(({ machine, currentLog, dailyOEE }) => {
                        const rejectRate = currentLog && currentLog.quantityProduced > 0 
                            ? (currentLog.quantityRejected / currentLog.quantityProduced)
                            : 0;

                        return (
                        <div key={machine.id} className="bg-white p-4 rounded-xl shadow-lg border-t-4" style={{borderColor: machine.status === 'Running' ? '#22c55e' : machine.status === 'Down' ? '#ef4444' : '#f59e0b'}}>
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-bold text-gray-800">{machine.name}</h3>
                                <StatusIndicator status={machine.status} />
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg min-h-[120px]">
                                {currentLog ? (
                                    <>
                                        <p className="text-xs text-gray-500">Current Job:</p>
                                        <p className="font-semibold text-gray-800 break-words">{currentLog.productName}</p>
                                        <p className="text-xs text-gray-500 mt-2">Operator: <span className="font-medium">{currentLog.operatorName}</span></p>
                                        <div className="flex justify-between mt-2 text-xs">
                                            <span>ผลิต: {currentLog.quantityProduced.toLocaleString()}</span>
                                            <span className={rejectRate > 0.05 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                                                เสีย: {currentLog.quantityRejected} ({(rejectRate * 100).toFixed(1)}%)
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                        <WrenchIcon className="w-6 h-6 mb-2"/>
                                        <p className="text-sm">ไม่มีงานสำหรับวันนี้</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Daily OEE</h4>
                                {dailyOEE ? (
                                <div className="space-y-2">
                                    <div className="text-center mb-2">
                                        <p className="text-2xl font-bold text-blue-600">{(dailyOEE.oee * 100).toFixed(1)}%</p>
                                    </div>
                                    <OEEBar value={dailyOEE.availability} label="Avail." />
                                    <OEEBar value={dailyOEE.performance} label="Perf." />
                                    <OEEBar value={dailyOEE.quality} label="Qual." />
                                </div>
                                ) : (
                                    <p className="text-xs text-gray-400 text-center">ไม่มีข้อมูล OEE</p>
                                )}
                            </div>
                        </div>
                    )})}
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
