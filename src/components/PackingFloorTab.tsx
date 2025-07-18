import React, { useState, useEffect, useCallback } from 'react';
import { getPackingStations, getPackingQueue, savePackingStations, savePackingQueue } from '../services/storageService';
import { PackingStation, PackingQueueItem } from '../types';
import { BoxIcon, RefreshCwIcon, LoaderIcon, UserIcon, PlusCircleIcon } from 'lucide-react';
import { AssignPackingJobModal } from './AssignPackingJobModal';
import { EditPackingJobModal } from './EditPackingJobModal';
import { LogPackingModal } from './LogPackingModal';

interface StationData {
    station: PackingStation;
    currentJob: (PackingQueueItem & { progressPercent: number; packer: string; }) | null;
}

const getStatusColor = (status: PackingStation['status']): string => {
    switch (status) {
        case 'Running': return '#22c55e'; // green-500
        case 'Maintenance': return '#f59e0b'; // amber-500
        case 'Idle': return '#6b7280'; // gray-500
        default: return '#6b7280';
    }
};

const statusConfig: Record<PackingStation['status'], string> = {
    Running: 'ทำงาน', Maintenance: 'ซ่อมบำรุง', Idle: 'ว่าง'
};

const STATUS_OPTIONS: { value: PackingStation['status']; label: string }[] = [
    { value: 'Running', label: 'ทำงาน' },
    { value: 'Idle', label: 'ว่าง' },
    { value: 'Maintenance', label: 'ซ่อมบำรุง' },
];

const StatusControl: React.FC<{
    station: PackingStation;
    onStatusChange: (stationId: string, newStatus: PackingStation['status']) => void;
}> = ({ station, onStatusChange }) => {
    const { status } = station;
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        e.stopPropagation();
        onStatusChange(station.id, e.target.value as PackingStation['status']);
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

const PackingStationCard: React.FC<{
    stationData: StationData;
    onCardClick: (station: PackingStation) => void;
    onLogPacking: (station: PackingStation, job: PackingQueueItem) => void;
    onStatusChange: (stationId: string, newStatus: PackingStation['status']) => void;
}> = ({ stationData, onCardClick, onLogPacking, onStatusChange }) => {
    const { station, currentJob } = stationData;

    return (
         <div className="bg-white rounded-xl shadow-lg border-t-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-200" style={{borderColor: getStatusColor(station.status)}}>
            <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-gray-800">{station.name}</h3>
                    <StatusControl station={station} onStatusChange={onStatusChange} />
                </div>
                
                {currentJob ? (
                    <div className="space-y-3 pt-3 border-t border-gray-100">
                        <div onClick={() => onCardClick(station)} className="cursor-pointer">
                            <p className="text-xs text-gray-500">{currentJob.status === 'In Progress' ? 'งานปัจจุบัน' : 'งานถัดไปในคิว'}</p>
                            <p className="font-bold text-base text-blue-700 truncate" title={currentJob.productName}>{currentJob.productName}</p>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-semibold text-gray-600">{currentJob.quantityPacked.toLocaleString()} / {currentJob.quantityGoal.toLocaleString()}</span>
                                <span className="font-bold text-blue-700">{currentJob.progressPercent.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(currentJob.progressPercent, 100)}%` }}></div>
                            </div>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-gray-400"/>
                            <span>ผู้แพ็ค: <span className="font-semibold">{currentJob.packer}</span></span>
                        </div>
                        {currentJob.status === 'In Progress' && (
                            <button 
                                onClick={() => onLogPacking(station, currentJob)}
                                className="w-full mt-2 text-sm text-center py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <PlusCircleIcon className="w-5 h-5" />
                                บันทึกการแพ็ค
                            </button>
                        )}
                    </div>
                ) : (
                    <div onClick={() => onCardClick(station)} className="text-center py-8 text-gray-400 border-t border-gray-100 mt-3 pt-3 cursor-pointer">
                        {station.status === 'Idle' ? (
                             <>
                                <p className="font-semibold">โต๊ะว่าง</p>
                                <p className="text-sm">คลิกเพื่อมอบหมายงาน</p>
                            </>
                        ) : (
                             <>
                                <p className="font-bold text-lg">{statusConfig[station.status]}</p>
                                <p className="text-sm">คลิกเพื่อจัดการ</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};


export const PackingFloorTab: React.FC = () => {
    const [stationData, setStationData] = useState<StationData[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(true);
    
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    
    const [selectedStation, setSelectedStation] = useState<PackingStation | null>(null);
    const [selectedJob, setSelectedJob] = useState<PackingQueueItem | null>(null);

    const fetchData = useCallback(() => {
        setIsLoading(true);
        const allStations = getPackingStations().sort((a, b) => a.name.localeCompare(b.name));
        const allQueue = getPackingQueue();

        const data: StationData[] = allStations.map(station => {
            const stationJobs = allQueue.filter(j => j.stationId === station.id);
            let jobToShow = stationJobs.find(j => j.status === 'In Progress') || null;
            if (!jobToShow) {
                const queuedJobs = stationJobs.filter(j => j.status === 'Queued').sort((a, b) => a.priority - b.priority);
                if (queuedJobs.length > 0) {
                    jobToShow = queuedJobs[0];
                }
            }

            let currentJob: StationData['currentJob'] = null;
            if (jobToShow) {
                const progressPercent = jobToShow.quantityGoal > 0 ? (jobToShow.quantityPacked / jobToShow.quantityGoal) * 100 : 0;
                currentJob = { ...jobToShow, progressPercent, packer: jobToShow.packerName || '-' };
            }
            return { station, currentJob };
        });

        setStationData(data);
        setLastUpdated(new Date());
        setIsLoading(false);
    }, []);
    
    const handleStatusChange = useCallback((stationId: string, newStatus: PackingStation['status']) => {
        const allStations = getPackingStations();
        const allQueue = getPackingQueue();
        const station = allStations.find(s => s.id === stationId);
        if (!station || station.status === newStatus) return;

        if (newStatus === 'Running') {
            const queuedJobs = allQueue.filter(j => j.stationId === stationId && j.status === 'Queued').sort((a,b)=>a.priority - b.priority);
            if(queuedJobs.length > 0) {
                const jobToStart = queuedJobs[0];
                jobToStart.status = 'In Progress';
                station.status = 'Running';
                station.lastStartedAt = new Date().toISOString();
            } else {
                alert(`ไม่สามารถเริ่มงานได้เนื่องจากไม่มีงานในคิวสำหรับ ${station.name}`);
                return;
            }
        } else {
            station.status = newStatus;
            delete station.lastStartedAt;
            const runningJob = allQueue.find(j => j.stationId === stationId && j.status === 'In Progress');
            if (runningJob) {
                runningJob.status = 'Queued';
            }
        }
        
        savePackingStations(allStations);
        savePackingQueue(allQueue);
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchData();
        const handleStorageChange = () => fetchData();
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [fetchData]);
    
    const handleCardClick = (station: PackingStation) => {
        const stationJob = stationData.find(sd => sd.station.id === station.id)?.currentJob;
        setSelectedStation(station);
        if (stationJob) {
            setSelectedJob(getPackingQueue().find(j => j.id === stationJob.id) || null);
            setIsEditModalOpen(true);
        } else {
            setIsAssignModalOpen(true);
        }
    };
    
    const handleLogPacking = (station: PackingStation, job: PackingQueueItem) => {
        setSelectedStation(station);
        setSelectedJob(job);
        setIsLogModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAssignModalOpen(false);
        setIsEditModalOpen(false);
        setIsLogModalOpen(false);
        setSelectedStation(null);
        setSelectedJob(null);
    };
    
    const handleSaveAndRefresh = () => {
        fetchData();
        handleCloseModal();
    };


    return (
        <div>
            {isAssignModalOpen && selectedStation && <AssignPackingJobModal station={selectedStation} onClose={handleCloseModal} onSave={handleSaveAndRefresh} />}
            {isEditModalOpen && selectedStation && selectedJob && <EditPackingJobModal job={selectedJob} station={selectedStation} onClose={handleCloseModal} onSave={handleSaveAndRefresh} />}
            {isLogModalOpen && selectedStation && selectedJob && <LogPackingModal station={selectedStation} job={selectedJob} onClose={handleCloseModal} onSave={handleSaveAndRefresh} />}

            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">สถานะโต๊ะแพ็ค (Real-time)</h2>
                    <p className="text-sm text-gray-500">อัปเดตล่าสุด: {lastUpdated.toLocaleTimeString('th-TH')}</p>
                </div>
                <button onClick={fetchData} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
                    <RefreshCwIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    รีเฟรช
                </button>
            </div>
            {isLoading && stationData.length === 0 ? (
                <div className="flex items-center justify-center h-96"><LoaderIcon className="w-12 h-12 text-blue-500 animate-spin" /></div>
            ) : stationData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {stationData.map(sd => (
                        <PackingStationCard
                            key={sd.station.id}
                            stationData={sd}
                            onCardClick={handleCardClick}
                            onLogPacking={handleLogPacking}
                            onStatusChange={handleStatusChange}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
                    <BoxIcon className="w-16 h-16 text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600">ไม่พบข้อมูลโต๊ะแพ็ค</h3>
                    <p className="text-gray-500">กรุณาเพิ่มโต๊ะแพ็คในฐานข้อมูล</p>
                </div>
            )}
        </div>
    );
};