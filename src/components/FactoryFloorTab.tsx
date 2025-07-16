import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getMachines, getProductionQueue, saveMachines } from '../services/storageService';
import { Machine, ProductionQueueItem } from '../types';
import { FactoryIcon, RefreshCwIcon, LoaderIcon, UserIcon, PlusCircleIcon, ListOrderedIcon } from './icons/Icons';
import { AssignJobModal } from './AssignJobModal';
import { EditJobModal } from './EditJobModal';

interface MachineData {
    machine: Machine;
    currentJob: (ProductionQueueItem & { progressPercent: number, operator: string }) | null;
    queue: ProductionQueueItem[];
}

const STATUS_OPTIONS: { value: Machine['status']; label: string }[] = [
    { value: 'Running', label: 'ทำงาน' },
    { value: 'Idle', label: 'ว่าง' },
    { value: 'Mold Change', label: 'รอเปลี่ยนโมล' },
    { value: 'Maintenance', label: 'กำลังซ่อม' },
    { value: 'Down', label: 'เสีย' },
];

export const FactoryFloorTab: React.FC = () => {
    const [machineData, setMachineData] = useState<MachineData[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [selectedJob, setSelectedJob] = useState<ProductionQueueItem | null>(null);

    const [openStatusMenuFor, setOpenStatusMenuFor] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const fetchData = useCallback(() => {
        setIsLoading(true);
        const machines = getMachines().sort((a,b) => a.name.localeCompare(b.name));
        const productionQueue = getProductionQueue();

        const data: MachineData[] = machines.map(machine => {
            const machineQueue = productionQueue
                .filter(job => job.machineId === machine.id && job.status !== 'Completed')
                .sort((a, b) => a.priority - b.priority || new Date(a.addedDate).getTime() - new Date(b.addedDate).getTime());

            const currentJob = machineQueue.find(j => j.status === 'In Progress') || machineQueue[0] || null;
            let jobWithProgress = null;

            if (currentJob) {
                const progressPercent = currentJob.quantityGoal > 0 ? (currentJob.quantityProduced / currentJob.quantityGoal) * 100 : 0;
                const operator = currentJob.operatorName || '-';
                
                jobWithProgress = { ...currentJob, progressPercent, operator };
            }

            return {
                machine,
                currentJob: jobWithProgress,
                queue: machineQueue.filter(j => j.id !== currentJob?.id),
            };
        });

        setMachineData(data);
        setLastUpdated(new Date());
        setIsLoading(false);
    }, []);

    const handleStatusChange = (machineId: string, newStatus: Machine['status']) => {
        const allMachines = getMachines();
        const updatedMachines = allMachines.map(m => m.id === machineId ? { ...m, status: newStatus } : m);
        saveMachines(updatedMachines);
        setOpenStatusMenuFor(null);
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Auto-refresh every 30s
        
        const handleStorageChange = () => {
            fetchData();
        };

        const handleClickOutside = (event: MouseEvent) => {
            if (openStatusMenuFor && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenStatusMenuFor(null);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        document.addEventListener("mousedown", handleClickOutside);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', handleStorageChange);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [fetchData, openStatusMenuFor]);

    const handleCardClick = (machine: Machine, job: (ProductionQueueItem & {progressPercent: number, operator: string}) | null) => {
        setSelectedMachine(machine);
        if (job) {
            const completeJobData = getProductionQueue().find(j => j.id === job.id);
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
        const current = STATUS_OPTIONS.find(opt => opt.value === status) || { bg: 'bg-gray-500', label: 'ไม่ทราบสถานะ' };
        const bgColor = getStatusColor(status);
        
        return (
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{backgroundColor: bgColor, animation: status === 'Running' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'}}></span>
                <span className="font-semibold text-sm">{current.label}</span>
            </div>
        );
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
                        <div key={machine.id} onClick={() => handleCardClick(machine, currentJob)} className="bg-white rounded-xl shadow-lg border-t-4 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer" style={{borderColor: getStatusColor(machine.status)}}>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold text-gray-800">{machine.name}</h3>
                                     <div className="relative">
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenStatusMenuFor(openStatusMenuFor === machine.id ? null : machine.id);
                                            }}
                                            className="cursor-pointer p-1 -m-1"
                                            role="button"
                                            aria-haspopup="true"
                                            aria-expanded={openStatusMenuFor === machine.id}
                                        >
                                            <StatusIndicator status={machine.status} />
                                        </div>
                                        {openStatusMenuFor === machine.id && (
                                            <div ref={menuRef} className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                                                <ul className="py-1" role="menu">
                                                    {STATUS_OPTIONS.map((option) => (
                                                        <li
                                                            key={option.value}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStatusChange(machine.id, option.value);
                                                            }}
                                                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                                            role="menuitem"
                                                        >
                                                            {option.label}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
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