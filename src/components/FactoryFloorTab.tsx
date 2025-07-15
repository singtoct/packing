
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getMachines, getMoldingLogs, getProducts, getProductionQueue, saveProductionQueue } from '../services/storageService';
import { Machine, MoldingLogEntry, Product, ProductionQueueItem } from '../types';
import { FactoryIcon, RefreshCwIcon, LoaderIcon, UserIcon, ClockIcon, PackageIcon, PlusCircleIcon, ListOrderedIcon } from './icons/Icons';
import { AssignJobModal } from './AssignJobModal';

interface MachineData {
    machine: Machine;
    currentJob: (ProductionQueueItem & { progressPercent: number, operator: string }) | null;
    queue: ProductionQueueItem[];
}

export const FactoryFloorTab: React.FC = () => {
    const [machineData, setMachineData] = useState<MachineData[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

    const fetchData = useCallback(() => {
        setIsLoading(true);
        const machines = getMachines().sort((a,b) => a.name.localeCompare(b.name));
        const allMoldingLogs = getMoldingLogs();
        const productionQueue = getProductionQueue();
        const todayStr = new Date().toISOString().split('T')[0];

        const data: MachineData[] = machines.map(machine => {
            const machineQueue = productionQueue
                .filter(job => job.machineId === machine.id && job.status !== 'Completed')
                .sort((a, b) => a.priority - b.priority || new Date(a.addedDate).getTime() - new Date(b.addedDate).getTime());

            let currentJob = machineQueue.length > 0 ? machineQueue[0] : null;
            let jobWithProgress = null;

            if (currentJob) {
                const relevantLogs = allMoldingLogs.filter(log => 
                    log.machine === machine.name &&
                    log.date === todayStr &&
                    log.productName === currentJob!.productName
                );
                const quantityProduced = relevantLogs.reduce((sum, log) => sum + log.quantityProduced, 0);
                
                // This is a view-only update. The actual status update should happen elsewhere.
                currentJob.quantityProduced = quantityProduced;

                const progressPercent = currentJob.quantityGoal > 0 ? (quantityProduced / currentJob.quantityGoal) * 100 : 0;
                const operator = relevantLogs.length > 0 ? relevantLogs[relevantLogs.length - 1].operatorName : '-';
                
                jobWithProgress = { ...currentJob, progressPercent, operator };
            }

            return {
                machine,
                currentJob: jobWithProgress,
                queue: machineQueue.slice(1),
            };
        });

        setMachineData(data);
        setLastUpdated(new Date());
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Auto-refresh every 30s
        
        window.addEventListener('storage', fetchData);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', fetchData);
        };
    }, [fetchData]);

    const handleOpenModal = (machine: Machine) => {
        setSelectedMachine(machine);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedMachine(null);
    };
    
    const handleSaveJob = () => {
        fetchData(); // Re-fetch all data to show the new job
        handleCloseModal();
    };

    const StatusIndicator: React.FC<{ status: Machine['status'] }> = ({ status }) => {
        const styles = {
            Running: { bg: 'bg-green-500', text: 'ทำงาน' },
            Down: { bg: 'bg-red-500', text: 'หยุด' },
            Maintenance: { bg: 'bg-yellow-500', text: 'ซ่อมบำรุง' },
        };
        const current = styles[status];
        return (
            <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${current.bg} ${status === 'Running' ? 'animate-pulse' : ''}`}></span>
                <span className="font-semibold text-sm">{current.text}</span>
            </div>
        );
    };

    return (
        <div>
            {isModalOpen && selectedMachine && (
                <AssignJobModal machine={selectedMachine} onClose={handleCloseModal} onSave={handleSaveJob} />
            )}
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
                    {machineData.map(({ machine, currentJob, queue }) => (
                        <div key={machine.id} onClick={() => handleOpenModal(machine)} className="bg-white rounded-xl shadow-lg border-t-4 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer" style={{borderColor: machine.status === 'Running' ? '#22c55e' : machine.status === 'Down' ? '#ef4444' : '#f59e0b'}}>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold text-gray-800">{machine.name}</h3>
                                    <StatusIndicator status={machine.status} />
                                </div>
                                {currentJob ? (
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-gray-500">งานปัจจุบัน</p>
                                            <p className="font-bold text-lg text-blue-700 truncate" title={currentJob.productName}>{currentJob.productName}</p>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-semibold">{currentJob.quantityProduced.toLocaleString()} / {currentJob.quantityGoal.toLocaleString()}</span>
                                                <span className="font-bold">{currentJob.progressPercent.toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min(currentJob.progressPercent, 100)}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-600 flex items-center gap-2">
                                            <UserIcon className="w-4 h-4"/>
                                            <span>ผู้ควบคุม: <span className="font-semibold">{currentJob.operator}</span></span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <PlusCircleIcon className="w-12 h-12 mx-auto text-gray-300"/>
                                        <p className="mt-2 font-semibold">เครื่องว่าง</p>
                                        <p className="text-sm">คลิกเพื่อมอบหมายงาน</p>
                                    </div>
                                )}
                            </div>
                            {queue.length > 0 && (
                                <div className="border-t bg-gray-50 p-4 rounded-b-xl">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><ListOrderedIcon className="w-4 h-4"/> คิวถัดไป</h4>
                                    <ul className="space-y-1 text-sm">
                                        {queue.slice(0, 2).map(job => (
                                            <li key={job.id} className="text-gray-700 truncate">
                                                <span className="font-medium">{job.productName}</span> ({job.quantityGoal.toLocaleString()} ชิ้น)
                                            </li>
                                        ))}
                                        {queue.length > 2 && <li className="text-xs text-gray-500">และอีก {queue.length - 2} งาน...</li>}
                                    </ul>
                                </div>
                            )}
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
