
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getMachines, getProductionQueue, saveMachines, getProducts, saveProductionQueue, getMachineDailyLogs, saveMachineDailyLogs } from '../services/storageService';
import { Machine, ProductionQueueItem, Product, MachineDailyLog } from '../types';
import { FactoryIcon, RefreshCwIcon, LoaderIcon, UserIcon, ClockIcon, CalendarIcon } from './icons/Icons';
import { AssignJobModal } from './AssignJobModal';
import { EditJobModal } from './EditJobModal';

interface MachineData {
    machine: Machine;
    currentJob: (ProductionQueueItem & { progressPercent: number, operator: string, accumulatedRunTimeSeconds: number }) | null;
}

const formatDuration = (seconds: number) => {
    if (seconds < 0 || isNaN(seconds)) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || (h === 0 && m === 0)) parts.push(`${s}s`);
    
    return parts.join(' ') || '0s';
};

const DailyHourLogger: React.FC<{
    jobId: string;
    machineId: string;
    dailyLogs: MachineDailyLog[];
    onUpdateHours: (date: string, hours: number) => void;
}> = ({ jobId, machineId, dailyLogs, onUpdateHours }) => {
    const [dates, setDates] = useState<string[]>([]);
    const [extraDate, setExtraDate] = useState('');

    useEffect(() => {
        const today = new Date();
        const recentDates: string[] = [];
        for (let i = 0; i < 5; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            recentDates.push(date.toISOString().split('T')[0]);
        }
        setDates(recentDates);
    }, []);

    const getLogForDate = (date: string) => {
        return dailyLogs.find(log => log.date === date && log.jobId === jobId && log.machineId === machineId);
    };

    const handleQuickSet = (date: string, hours: number) => {
        onUpdateHours(date, hours);
    };

    const handleAddExtraDate = () => {
        if (extraDate && !dates.includes(extraDate)) {
            setDates(prev => [extraDate, ...prev].sort((a,b) => b.localeCompare(a)));
            setExtraDate('');
        }
    };

    return (
        <div className="space-y-3 p-3 bg-gray-50 rounded-b-xl border-t">
            {dates.map(dateStr => {
                const log = getLogForDate(dateStr);
                return (
                    <div key={dateStr} className="grid grid-cols-[1fr,2fr] gap-2 items-center text-xs">
                        <label htmlFor={`hours-${dateStr}`} className="font-medium text-gray-600">
                            {new Date(dateStr).toLocaleDateString('th-TH', { month: 'short', day: 'numeric'})}
                        </label>
                        <div className="flex items-center gap-1">
                             {[8, 12, 16, 24].map(h => (
                                <button key={h} onClick={() => handleQuickSet(dateStr, h)} className="px-1.5 py-0.5 text-xs bg-gray-200 rounded hover:bg-gray-300">{h}</button>
                            ))}
                            <input
                                id={`hours-${dateStr}`}
                                type="number"
                                min="0" max="24" step="0.5"
                                defaultValue={log?.hours || ''}
                                onBlur={(e) => onUpdateHours(dateStr, parseFloat(e.target.value) || 0)}
                                placeholder="ชม."
                                className="w-14 text-center border-gray-300 rounded"
                            />
                        </div>
                    </div>
                );
            })}
             <div className="flex gap-2 items-center pt-2 border-t mt-3">
                <input type="date" value={extraDate} onChange={e => setExtraDate(e.target.value)} className="w-full text-xs p-1 border-gray-300 rounded" />
                <button onClick={handleAddExtraDate} className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">เพิ่มวัน</button>
            </div>
        </div>
    );
};


const MachineCard: React.FC<{
    machineData: MachineData;
    products: Product[];
    dailyLogs: MachineDailyLog[];
    onUpdateHours: (machineId: string, jobId: string, date: string, hours: number) => void;
    onCardClick: (machine: Machine) => void;
}> = ({ machineData, products, dailyLogs, onUpdateHours, onCardClick }) => {
    const { machine, currentJob } = machineData;
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const getStatusColor = (status: Machine['status']): string => {
        switch (status) {
            case 'Running': return '#22c55e'; // green-500
            case 'Down': return '#ef4444'; // red-500
            case 'Maintenance': return '#f59e0b'; // amber-500
            case 'Idle': return '#6b7280'; // gray-500
            case 'Mold Change': return '#8b5cf6'; // purple-500
            default: return '#6b7280';
        }
    };

    const StatusIndicator: React.FC<{ status: Machine['status'] }> = ({ status }) => {
        const statusConfig = {
            Running: 'ทำงาน', Down: 'เสีย', Maintenance: 'กำลังซ่อม', Idle: 'ว่าง', 'Mold Change': 'รอเปลี่ยนโมล'
        };
        const bgColor = getStatusColor(status);
        
        return (
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{backgroundColor: bgColor, animation: status === 'Running' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'}}></span>
                <span className="font-semibold text-sm">{statusConfig[status] || 'ไม่ทราบ'}</span>
            </div>
        );
    };

    const product = currentJob ? products.find(p => p.id === currentJob.productId) : null;
    const cycleTime = product?.cycleTimeSeconds || 0;
    
    const remainingTimeSeconds = useMemo(() => {
        if (!currentJob || cycleTime <= 0) return null;
        const remainingQty = currentJob.quantityGoal - currentJob.quantityProduced;
        return remainingQty > 0 ? remainingQty * cycleTime : 0;
    }, [currentJob, cycleTime]);

    return (
         <div className="bg-white rounded-xl shadow-lg border-t-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-200" style={{borderColor: getStatusColor(machine.status)}}>
            <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-gray-800">{machine.name}</h3>
                    <StatusIndicator status={machine.status} />
                </div>
                
                {currentJob ? (
                    <div className="space-y-3 pt-3 border-t border-gray-100">
                        <div className="text-sm text-gray-500 flex justify-between items-center">
                            <span>ระยะเวลาเดินเครื่องสะสม:</span>
                            <span className="font-bold text-lg text-gray-800">{formatDuration(currentJob.accumulatedRunTimeSeconds)}</span>
                        </div>
                        <div onClick={() => onCardClick(machine)} className="cursor-pointer">
                            <p className="text-xs text-gray-500">งานปัจจุบัน</p>
                            <p className="font-bold text-base text-blue-700 truncate" title={currentJob.productName}>{currentJob.productName}</p>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-semibold text-gray-600">{currentJob.quantityProduced.toLocaleString()} / {currentJob.quantityGoal.toLocaleString()}</span>
                                <span className="font-bold text-blue-700">{currentJob.progressPercent.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(currentJob.progressPercent, 100)}%` }}></div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-sm text-gray-600 flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-gray-400"/>
                                <span>ผู้ควบคุม: <span className="font-semibold">{currentJob.operator}</span></span>
                            </div>
                             <div className="text-sm text-gray-600 flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 text-gray-400"/>
                                <span>เวลาโดยประมาณ: 
                                    <span className="font-semibold ml-1">
                                        {remainingTimeSeconds !== null ? formatDuration(remainingTimeSeconds) : <span className="text-xs text-gray-400">(ไม่มีข้อมูล)</span>}
                                    </span>
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                            className="w-full mt-2 text-sm text-center py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700 flex items-center justify-center gap-2"
                        >
                            <CalendarIcon className="w-4 h-4" />
                            {isCalendarOpen ? 'ซ่อนปฏิทิน' : 'บันทึกชั่วโมงการทำงาน'}
                        </button>
                    </div>
                ) : (
                    <div onClick={() => onCardClick(machine)} className="text-center py-8 text-gray-400 border-t border-gray-100 mt-3 pt-3 cursor-pointer">
                        <p className="font-semibold">เครื่องว่าง</p>
                        <p className="text-sm">คลิกเพื่อมอบหมายงาน</p>
                    </div>
                )}
            </div>
            {isCalendarOpen && currentJob && (
                <DailyHourLogger 
                    jobId={currentJob.id}
                    machineId={machine.id}
                    dailyLogs={dailyLogs}
                    onUpdateHours={(date, hours) => onUpdateHours(machine.id, currentJob.id, date, hours)}
                />
            )}
        </div>
    );
};

export const FactoryFloorTab: React.FC = () => {
    const [machineData, setMachineData] = useState<MachineData[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [dailyLogs, setDailyLogs] = useState<MachineDailyLog[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(true);
    
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [selectedJob, setSelectedJob] = useState<ProductionQueueItem | null>(null);
    
    const fetchData = useCallback(() => {
        setIsLoading(true);
        const allMachines = getMachines().sort((a, b) => a.name.localeCompare(b.name));
        const allQueue = getProductionQueue();
        const allProducts = getProducts();
        const allDailyLogs = getMachineDailyLogs();

        setProducts(allProducts);
        setDailyLogs(allDailyLogs);

        const data: MachineData[] = allMachines.map(machine => {
            const currentJob = allQueue.find(j => j.machineId === machine.id && j.status === 'In Progress') || null;
            
            let jobWithProgress: MachineData['currentJob'] = null;
            if (currentJob) {
                const jobLogs = allDailyLogs.filter(log => log.jobId === currentJob.id);
                const accumulatedRunTimeSeconds = jobLogs.reduce((sum, log) => sum + log.hours, 0) * 3600;
                
                const progressPercent = currentJob.quantityGoal > 0 ? (currentJob.quantityProduced / currentJob.quantityGoal) * 100 : 0;
                const operator = currentJob.operatorName || '-';
                
                jobWithProgress = { ...currentJob, progressPercent, operator, accumulatedRunTimeSeconds };
            }

            return {
                machine,
                currentJob: jobWithProgress,
            };
        });

        setMachineData(data);
        setLastUpdated(new Date());
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
        const handleStorageChange = () => fetchData();
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [fetchData]);

    const handleUpdateHours = (machineId: string, jobId: string, date: string, hours: number) => {
        let logs = getMachineDailyLogs();
        const logIndex = logs.findIndex(l => l.machineId === machineId && l.jobId === jobId && l.date === date);

        if (logIndex > -1) {
            if (hours > 0) {
                logs[logIndex].hours = hours;
            } else {
                logs.splice(logIndex, 1); // Remove log if hours are 0
            }
        } else if (hours > 0) {
            logs.push({ id: crypto.randomUUID(), machineId, jobId, date, hours });
        }
        
        saveMachineDailyLogs(logs);

        // Recalculate production quantity for the job
        const queue = getProductionQueue();
        const jobIndex = queue.findIndex(j => j.id === jobId);
        if (jobIndex > -1) {
            const product = getProducts().find(p => p.id === queue[jobIndex].productId);
            const cycleTime = product?.cycleTimeSeconds;

            if (cycleTime && cycleTime > 0) {
                const jobTotalHours = logs
                    .filter(l => l.jobId === jobId)
                    .reduce((sum, l) => sum + l.hours, 0);
                
                const newQuantityProduced = Math.floor((jobTotalHours * 3600) / cycleTime);
                queue[jobIndex].quantityProduced = Math.min(newQuantityProduced, queue[jobIndex].quantityGoal);

                if(queue[jobIndex].quantityProduced >= queue[jobIndex].quantityGoal) {
                    queue[jobIndex].status = 'Completed';
                }
            }
            saveProductionQueue(queue.filter(j => j.status !== 'Completed'));
        }
        
        fetchData();
    };

    const handleCardClick = (machine: Machine) => {
        const machineJob = machineData.find(md => md.machine.id === machine.id)?.currentJob;
        setSelectedMachine(machine);
        if (machineJob) {
            const completeJobData = getProductionQueue().find(j => j.id === machineJob.id);
            if (completeJobData) {
              setSelectedJob(completeJobData);
              setIsEditModalOpen(true);
            }
        } else {
            setIsAssignModalOpen(true);
        }
    };
    
    const handleCloseModal = () => {
        setIsAssignModalOpen(false);
        setIsEditModalOpen(false);
        setSelectedMachine(null);
        setSelectedJob(null);
    };
    
    const handleSaveJob = () => {
        fetchData();
        handleCloseModal();
    };

    return (
        <div>
            {isAssignModalOpen && selectedMachine && (
                <AssignJobModal machine={selectedMachine} onClose={handleCloseModal} onSave={handleSaveJob} />
            )}
            {isEditModalOpen && selectedMachine && selectedJob && (
                <EditJobModal job={selectedJob} machine={selectedMachine} onClose={handleCloseModal} onSave={handleSaveJob} />
            )}
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">สถานะเครื่องฉีด (Real-time)</h2>
                    <p className="text-sm text-gray-500">อัปเดตล่าสุด: {lastUpdated.toLocaleTimeString('th-TH')}</p>
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
                    {machineData.map(md => (
                        <MachineCard 
                            key={md.machine.id}
                            machineData={md}
                            products={products}
                            dailyLogs={dailyLogs}
                            onUpdateHours={handleUpdateHours}
                            onCardClick={handleCardClick}
                        />
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