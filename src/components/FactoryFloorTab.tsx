import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getMachines, getProductionQueue, saveMachines, getProducts, saveProductionQueue, getMachineDailyLogs, saveMachineDailyLogs } from '../services/storageService';
import { Machine, ProductionQueueItem, Product, MachineDailyLog } from '../types';
import { FactoryIcon, RefreshCwIcon, LoaderIcon, UserIcon, ClockIcon, PlusCircleIcon } from 'lucide-react';
import { AssignJobModal } from './AssignJobModal';
import { EditJobModal } from './EditJobModal';
import { LogProductionModal } from './LogProductionModal';

interface MachineData {
    machine: Machine;
    currentJob: (ProductionQueueItem & { progressPercent: number; operator: string; accumulatedRunTimeSeconds: number }) | null;
}

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

const statusConfig: Record<Machine['status'], string> = {
    Running: 'ทำงาน', Down: 'เสีย', Maintenance: 'กำลังซ่อม', Idle: 'ว่าง', 'Mold Change': 'รอเปลี่ยนโมล'
};

const STATUS_OPTIONS: { value: Machine['status']; label: string }[] = [
    { value: 'Running', label: 'ทำงาน' },
    { value: 'Idle', label: 'ว่าง' },
    { value: 'Down', label: 'เสีย' },
    { value: 'Maintenance', label: 'กำลังซ่อม' },
    { value: 'Mold Change', label: 'รอเปลี่ยนโมล' },
];

const formatDuration = (seconds: number) => {
    if (seconds < 0 || isNaN(seconds) || !isFinite(seconds)) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || (h === 0 && m === 0)) parts.push(`${s}s`);
    
    return parts.join(' ') || '0s';
};

const StatusControl: React.FC<{
    machine: Machine;
    onStatusChange: (machineId: string, newStatus: Machine['status']) => void;
}> = ({ machine, onStatusChange }) => {
    const { status } = machine;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        e.stopPropagation();
        onStatusChange(machine.id, e.target.value as Machine['status']);
    };

    const bgColor = getStatusColor(status);

    return (
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor: bgColor, animation: status === 'Running' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'}}></span>
            <select
                value={status}
                onChange={handleChange}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-sm bg-transparent border-0 focus:ring-0 focus:outline-none p-1 -m-1 rounded cursor-pointer"
            >
                {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
};


const MachineCard: React.FC<{
    machineData: MachineData;
    products: Product[];
    onCardClick: (machine: Machine) => void;
    onLogProduction: (machine: Machine, job: ProductionQueueItem) => void;
    onStatusChange: (machineId: string, newStatus: Machine['status']) => void;
}> = ({ machineData, products, onCardClick, onLogProduction, onStatusChange }) => {
    const { machine, currentJob } = machineData;
    
    const product = currentJob ? products.find(p => p.id === currentJob.productId) : null;
    const cycleTime = product?.cycleTimeSeconds || 0;
    
    const remainingTimeSeconds = useMemo(() => {
        if (!currentJob || cycleTime <= 0 || currentJob.status !== 'In Progress') return null;
        const remainingQty = currentJob.quantityGoal - currentJob.quantityProduced;
        return remainingQty > 0 ? remainingQty * cycleTime : 0;
    }, [currentJob, cycleTime]);

    return (
         <div className="bg-white rounded-xl shadow-lg border-t-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-200" style={{borderColor: getStatusColor(machine.status)}}>
            <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-gray-800">{machine.name}</h3>
                    <StatusControl machine={machine} onStatusChange={onStatusChange} />
                </div>
                
                {currentJob ? (
                    <div className="space-y-3 pt-3 border-t border-gray-100">
                        {currentJob.status === 'In Progress' && (
                            <div className="text-sm text-gray-500 flex justify-between items-center">
                                <span>ระยะเวลาเดินเครื่องสะสม:</span>
                                <span className="font-bold text-lg text-gray-800">{formatDuration(currentJob.accumulatedRunTimeSeconds)}</span>
                            </div>
                        )}
                        <div onClick={() => onCardClick(machine)} className="cursor-pointer">
                            <p className="text-xs text-gray-500">{currentJob.status === 'In Progress' ? 'งานปัจจุบัน' : 'งานถัดไปในคิว'}</p>
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
                            {currentJob.status === 'In Progress' && (
                                 <div className="text-sm text-gray-600 flex items-center gap-2">
                                    <ClockIcon className="w-4 h-4 text-gray-400"/>
                                    <span>เวลาโดยประมาณ: 
                                        <span className="font-semibold ml-1">
                                            {remainingTimeSeconds !== null ? formatDuration(remainingTimeSeconds) : <span className="text-xs text-gray-400">(ไม่มีข้อมูล)</span>}
                                        </span>
                                    </span>
                                </div>
                            )}
                        </div>
                        {currentJob.status === 'In Progress' && (
                            <button 
                                onClick={() => onLogProduction(machine, currentJob)}
                                className="w-full mt-2 text-sm text-center py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <PlusCircleIcon className="w-5 h-5" />
                                บันทึกผลผลิต
                            </button>
                        )}
                    </div>
                ) : (
                    <div onClick={() => onCardClick(machine)} className="text-center py-8 text-gray-400 border-t border-gray-100 mt-3 pt-3 cursor-pointer">
                        {machine.status === 'Idle' ? (
                             <>
                                <p className="font-semibold">เครื่องว่าง</p>
                                <p className="text-sm">คลิกเพื่อมอบหมายงาน</p>
                            </>
                        ) : (
                             <>
                                <p className="font-bold text-lg">{statusConfig[machine.status]}</p>
                                <p className="text-sm">คลิกเพื่อจัดการ</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export const FactoryFloorTab: React.FC = () => {
    const [machineData, setMachineData] = useState<MachineData[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(true);
    
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [selectedJob, setSelectedJob] = useState<ProductionQueueItem | null>(null);
    
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const allMachines = (await getMachines()).sort((a, b) => a.name.localeCompare(b.name));
        const allQueue = await getProductionQueue();
        const allProducts = await getProducts();
        const allDailyLogs = await getMachineDailyLogs();

        // --- Data Synchronization Logic ---
        let machinesChanged = false;
        const inProgressJobsByMachine = new Map<string, ProductionQueueItem>();
        allQueue.forEach(job => {
            if (job.status === 'In Progress') {
                inProgressJobsByMachine.set(job.machineId, job);
            }
        });

        const synchronizedMachines = allMachines.map(machine => {
            const hasInProgressJob = inProgressJobsByMachine.has(machine.id);
            if (machine.status === 'Running' && !hasInProgressJob) {
                machinesChanged = true;
                return { ...machine, status: 'Idle' as Machine['status'], lastStartedAt: undefined };
            }
            if (machine.status !== 'Running' && hasInProgressJob) {
                machinesChanged = true;
                return { ...machine, status: 'Running' as Machine['status'], lastStartedAt: new Date().toISOString() };
            }
            return machine;
        });

        if (machinesChanged) {
            await saveMachines(synchronizedMachines);
        }
        // --- End of Synchronization ---

        setProducts(allProducts);

        const data: MachineData[] = synchronizedMachines.map(machine => {
            const machineJobs = allQueue.filter(j => j.machineId === machine.id);
            let jobToShow = machineJobs.find(j => j.status === 'In Progress') || null;
    
            if (!jobToShow) {
                const queuedJobs = machineJobs
                    .filter(j => j.status === 'Queued')
                    .sort((a, b) => a.priority - b.priority);
                if (queuedJobs.length > 0) {
                    jobToShow = queuedJobs[0];
                }
            }
            
            let currentJob: MachineData['currentJob'] = null;
            if (jobToShow) {
                const jobLogs = allDailyLogs.filter(log => log.jobId === jobToShow!.id);
                const accumulatedRunTimeSeconds = jobLogs.reduce((sum, log) => sum + log.hours, 0) * 3600;
                
                const progressPercent = jobToShow.quantityGoal > 0 ? (jobToShow.quantityProduced / jobToShow.quantityGoal) * 100 : 0;
                const operator = jobToShow.operatorName || '-';
                
                currentJob = { ...jobToShow, progressPercent, operator, accumulatedRunTimeSeconds };
            }

            return {
                machine,
                currentJob,
            };
        });

        setMachineData(data);
        setLastUpdated(new Date());
        setIsLoading(false);
    }, []);

    const handleStatusChange = useCallback(async (machineId: string, newStatus: Machine['status']) => {
        const allMachines = await getMachines();
        const allQueue = await getProductionQueue();
        const machineIndex = allMachines.findIndex(m => m.id === machineId);
        if (machineIndex === -1) return;

        const machine = allMachines[machineIndex];
        
        if (machine.status === newStatus) return;

        if (newStatus === 'Running') {
            const queuedJobs = allQueue
                .filter(j => j.machineId === machineId && j.status === 'Queued')
                .sort((a, b) => a.priority - b.priority);
            
            if (queuedJobs.length > 0) {
                const jobToStart = queuedJobs[0];
                const jobIndexInQueue = allQueue.findIndex(j => j.id === jobToStart.id);
                if (jobIndexInQueue !== -1) {
                    allQueue[jobIndexInQueue].status = 'In Progress';
                }
                machine.status = 'Running';
                machine.lastStartedAt = new Date().toISOString();
            } else {
                alert(`ไม่สามารถเปลี่ยนสถานะเป็น "ทำงาน" ได้เนื่องจากไม่มีงานในคิวสำหรับเครื่อง ${machine.name}`);
                return;
            }
        } else {
            machine.status = newStatus;
            delete machine.lastStartedAt;

            const runningJobIndex = allQueue.findIndex(j => j.machineId === machineId && j.status === 'In Progress');
            if (runningJobIndex !== -1) {
                allQueue[runningJobIndex].status = 'Queued';
            }
        }
        
        await saveMachines(allMachines);
        await saveProductionQueue(allQueue);
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchData();
        const handleStorageChange = () => fetchData();
        window.addEventListener('storage', handleStorageChange as any);
        return () => window.removeEventListener('storage', handleStorageChange as any);
    }, [fetchData]);

    const handleCardClick = async (machine: Machine) => {
        const machineJob = machineData.find(md => md.machine.id === machine.id)?.currentJob;
        setSelectedMachine(machine);
        if (machineJob) {
            const allQueue = await getProductionQueue();
            const completeJobData = allQueue.find(j => j.id === machineJob.id);
            if (completeJobData) {
              setSelectedJob(completeJobData);
              setIsEditModalOpen(true);
            }
        } else {
            setIsAssignModalOpen(true);
        }
    };

    const handleLogProduction = (machine: Machine, job: ProductionQueueItem) => {
        setSelectedMachine(machine);
        setSelectedJob(job);
        setIsLogModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsAssignModalOpen(false);
        setIsEditModalOpen(false);
        setIsLogModalOpen(false);
        setSelectedMachine(null);
        setSelectedJob(null);
    };
    
    const handleSaveAndRefresh = () => {
        fetchData();
        handleCloseModal();
    };

    return (
        <div>
            {isAssignModalOpen && selectedMachine && (
                <AssignJobModal machine={selectedMachine} onClose={handleCloseModal} onSave={handleSaveAndRefresh} />
            )}
            {isEditModalOpen && selectedMachine && selectedJob && (
                <EditJobModal job={selectedJob} machine={selectedMachine} onClose={handleCloseModal} onSave={handleSaveAndRefresh} />
            )}
             {isLogModalOpen && selectedMachine && selectedJob && (
                <LogProductionModal 
                    machine={selectedMachine} 
                    job={selectedJob} 
                    products={products}
                    onClose={handleCloseModal} 
                    onSave={handleSaveAndRefresh}
                />
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
                    <LoaderIcon className="w-12 h-12 text-blue-500 animate-spin" />
                </div>
            ) : machineData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {machineData.map(md => (
                        <MachineCard 
                            key={md.machine.id}
                            machineData={md}
                            products={products}
                            onCardClick={handleCardClick}
                            onLogProduction={handleLogProduction}
                            onStatusChange={handleStatusChange}
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