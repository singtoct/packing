import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getMachines, getProductionQueue, saveMachines, getProducts, saveProductionQueue } from '../services/storageService';
import { Machine, ProductionQueueItem, Product } from '../types';
import { FactoryIcon, RefreshCwIcon, LoaderIcon, UserIcon, PlusCircleIcon, ListOrderedIcon, ClockIcon } from './icons/Icons';
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

const formatDuration = (seconds: number) => {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [
        h > 0 ? `${h}h` : '',
        m > 0 ? `${m}m` : '',
        s > 0 ? `${s}s` : (h === 0 && m === 0 ? '0s' : '')
    ].filter(Boolean).join(' ') || '0s';
};

const RunningStatus: React.FC<{ machine: Machine }> = ({ machine }) => {
    const [durationSeconds, setDurationSeconds] = useState(0);

    useEffect(() => {
        if (machine.status !== 'Running' || !machine.lastStartedAt) {
            setDurationSeconds(0);
            return;
        }

        const calculateDuration = () => {
            const startTime = new Date(machine.lastStartedAt!);
            const now = new Date();
            setDurationSeconds((now.getTime() - startTime.getTime()) / 1000);
        };

        calculateDuration();
        const interval = setInterval(calculateDuration, 1000);
        return () => clearInterval(interval);
    }, [machine.lastStartedAt, machine.status]);

    if (machine.status !== 'Running' || !machine.lastStartedAt) {
        return null;
    }

    return (
        <div className="text-sm text-gray-600 flex flex-col gap-2 mt-2 mb-3 pt-2 border-t">
            <div className="flex justify-between items-center">
                <span className="font-semibold">ระยะเวลาเดินเครื่อง:</span>
                <span className="font-bold text-lg text-gray-800">{formatDuration(durationSeconds)}</span>
            </div>
        </div>
    );
};

export const FactoryFloorTab: React.FC = () => {
    const [machineData, setMachineData] = useState<MachineData[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(true);
    
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [selectedJob, setSelectedJob] = useState<ProductionQueueItem | null>(null);

    const [openStatusMenuFor, setOpenStatusMenuFor] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const productsRef = useRef<Product[]>([]);

    const fetchData = useCallback((isInitial = false) => {
        if(isInitial) setIsLoading(true);
        const machines = getMachines().sort((a,b) => a.name.localeCompare(b.name));
        const productionQueue = getProductionQueue();
        productsRef.current = getProducts();

        const data: MachineData[] = machines.map(machine => {
            const machineQueue = productionQueue
                .filter(job => job.machineId === machine.id && job.status !== 'Completed')
                .sort((a, b) => a.priority - b.priority || new Date(a.addedDate).getTime() - new Date(b.addedDate).getTime());

            const currentJob = machineQueue.find(j => j.status === 'In Progress') || null;
            
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
        if(isInitial) setIsLoading(false);
    }, []);
    
    useEffect(() => {
        fetchData(true);
        
        const simulationInterval = setInterval(() => {
            const queue = getProductionQueue();
            let queueChanged = false;
            let machinesChanged = false;
            const allMachines = getMachines();

            const updatedQueue: ProductionQueueItem[] = queue.map(job => {
                const machine = allMachines.find(m => m.id === job.machineId);
                if (job.status !== 'In Progress' || machine?.status !== 'Running') {
                    return job;
                }

                const product = productsRef.current.find(p => p.id === job.productId);
                const cycleTime = product?.cycleTimeSeconds;

                if (!cycleTime || cycleTime <= 0) {
                    return job;
                }

                const now = Date.now();
                const lastTimestamp = job.lastCycleTimestamp || now;
                const elapsedSeconds = (now - lastTimestamp) / 1000;
                const piecesProduced = Math.floor(elapsedSeconds / cycleTime);

                if (piecesProduced > 0) {
                    const newQuantityProduced = Math.min(job.quantityGoal, job.quantityProduced + piecesProduced);
                    const remainderTime = (elapsedSeconds % cycleTime) * 1000;
                    queueChanged = true;
                    
                    if (newQuantityProduced >= job.quantityGoal) {
                        const machineToUpdate = allMachines.find(m => m.id === job.machineId);
                        if (machineToUpdate) {
                            machineToUpdate.status = 'Idle';
                            delete machineToUpdate.lastStartedAt;
                            machinesChanged = true;
                        }
                        return { ...job, quantityProduced: newQuantityProduced, status: 'Completed', lastCycleTimestamp: undefined };
                    }
                    
                    return { ...job, quantityProduced: newQuantityProduced, lastCycleTimestamp: now - remainderTime };
                }
                return job;
            });

            if (queueChanged) {
                const activeJobs = updatedQueue.filter(j => j.status !== 'Completed');
                saveProductionQueue(activeJobs);
                if (machinesChanged) {
                    saveMachines(allMachines);
                }
                fetchData(false);
            }
            setLastUpdated(new Date());

        }, 1000);

        const handleStorageChange = () => fetchData(false);
        window.addEventListener('storage', handleStorageChange);
        
        return () => {
            clearInterval(simulationInterval);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [fetchData]);

    const handleStatusChange = (machineId: string, newStatus: Machine['status']) => {
        const allMachines = getMachines();
        const updatedMachines = allMachines.map(m => {
            if (m.id === machineId) {
                const updatedMachine = { ...m, status: newStatus };
                if (newStatus === 'Running' && !m.lastStartedAt) {
                    updatedMachine.lastStartedAt = new Date().toISOString();
                } else if (newStatus !== 'Running') {
                    delete updatedMachine.lastStartedAt;
                }
                return updatedMachine;
            }
            return m;
        });
        saveMachines(updatedMachines);
        fetchData(false);
        setOpenStatusMenuFor(null);
    };

    const handleWorkingHoursChange = (machineId: string, hours: string) => {
        setMachineData(prevData =>
            prevData.map(md =>
                md.machine.id === machineId
                    ? {
                          ...md,
                          machine: {
                              ...md.machine,
                              workingHoursPerDay: hours === '' ? undefined : Number(hours),
                          },
                      }
                    : md
            )
        );
    };

    const handleWorkingHoursSave = (machineId: string) => {
        const machineDataItem = machineData.find(md => md.machine.id === machineId);
        if (!machineDataItem) return;

        const allMachines = getMachines();
        const updatedMachines = allMachines.map(m =>
            m.id === machineId
                ? { ...m, workingHoursPerDay: machineDataItem.machine.workingHoursPerDay }
                : m
        );
        saveMachines(updatedMachines);
    };
    
    const handlePresetClick = (machineId: string, hours: number) => {
        setMachineData(prevData =>
            prevData.map(md =>
                md.machine.id === machineId
                    ? { ...md, machine: { ...md.machine, workingHoursPerDay: hours } }
                    : md
            )
        );
        
        const allMachines = getMachines();
        const updatedMachines = allMachines.map(m =>
            m.id === machineId ? { ...m, workingHoursPerDay: hours } : m
        );
        saveMachines(updatedMachines);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openStatusMenuFor && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenStatusMenuFor(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openStatusMenuFor]);

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
            const queue = getProductionQueue();
            const nextJob = queue.find(job => job.machineId === machine.id && job.status === 'Queued');
            if(nextJob){
                setSelectedJob(nextJob);
                setIsEditModalOpen(true);
            } else {
                setIsAssignModalOpen(true);
            }
        }
    };
    
    const handleCloseModal = () => {
        setIsAssignModalOpen(false);
        setIsEditModalOpen(false);
        setSelectedMachine(null);
        setSelectedJob(null);
    };
    
    const handleSaveJob = () => {
        fetchData(false);
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
        const current = STATUS_OPTIONS.find(opt => opt.value === status) || { label: 'ไม่ทราบสถานะ' };
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
                <button onClick={() => fetchData(true)} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
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
                    {machineData.map(({ machine, currentJob, queue }) => {
                        return (
                            <div key={machine.id} onClick={() => handleCardClick(machine)} className="bg-white rounded-xl shadow-lg border-t-4 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer" style={{borderColor: getStatusColor(machine.status)}}>
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
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

                                    <div className="mt-2 text-sm" onClick={e => e.stopPropagation()}>
                                        <label htmlFor={`hours-input-${machine.id}`} className="font-medium text-xs text-gray-600">ชม.ทำงานวันนี้:</label>
                                        <div className="flex items-stretch gap-1 mt-1">
                                            {[8, 12, 16, 24].map(h => (
                                                <button
                                                    key={h}
                                                    type="button"
                                                    onClick={() => handlePresetClick(machine.id, h)}
                                                    className={`px-2 py-1 text-xs rounded-md font-semibold transition-colors flex-grow ${
                                                        machine.workingHoursPerDay === h
                                                            ? 'bg-blue-600 text-white shadow-sm'
                                                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                                    }`}
                                                >
                                                    {h}ชม.
                                                </button>
                                            ))}
                                            <input
                                                id={`hours-input-${machine.id}`}
                                                type="number"
                                                min="0"
                                                max="24"
                                                step="0.5"
                                                value={machine.workingHoursPerDay ?? ''}
                                                onChange={e => handleWorkingHoursChange(machine.id, e.target.value)}
                                                onBlur={() => handleWorkingHoursSave(machine.id)}
                                                placeholder="อื่นๆ"
                                                className="w-16 text-center text-sm px-2 py-1 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                    </div>

                                    <RunningStatus machine={machine} />
                                    
                                    {currentJob ? (
                                        <div className="space-y-3 mt-4">
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
                                                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(currentJob.progressPercent, 100)}%` }}></div>
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-gray-100 space-y-2">
                                                <div className="text-sm text-gray-600 flex items-center gap-2">
                                                    <UserIcon className="w-4 h-4"/>
                                                    <span>ผู้ควบคุม: <span className="font-semibold">{currentJob.operator}</span></span>
                                                </div>
                                                {(() => {
                                                    const product = productsRef.current.find(p => p.id === currentJob.productId);
                                                    const cycleTime = product?.cycleTimeSeconds;
                                                    let remainingTimeSeconds: number | null = null;
                                                    if (cycleTime && cycleTime > 0) {
                                                        const remainingQuantity = currentJob.quantityGoal - currentJob.quantityProduced;
                                                        if (remainingQuantity > 0) {
                                                            remainingTimeSeconds = remainingQuantity * cycleTime;
                                                        } else {
                                                            remainingTimeSeconds = 0;
                                                        }
                                                    }
                                                    
                                                    return (
                                                        <div className="text-sm text-gray-600 flex items-center gap-2">
                                                            <ClockIcon className="w-4 h-4"/>
                                                            <span>เวลาโดยประมาณ: 
                                                                <span className="font-semibold ml-1">
                                                                    {remainingTimeSeconds !== null ? formatDuration(remainingTimeSeconds) : <span className="text-xs text-gray-400">(ไม่มีข้อมูล Cycle Time)</span>}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
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
                        )
                    })}
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