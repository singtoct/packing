import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getMoldingLogs, saveMoldingLogs, getSettings } from '../services/storageService';
import { MoldingLogEntry } from '../types';
import { ChevronRightIcon, MoveIcon, XCircleIcon, ClockIcon, ListIcon, BarChart2Icon } from 'lucide-react';

// Modal to move a log to a new status
const MoveModal: React.FC<{
    log: MoldingLogEntry;
    statuses: string[];
    onClose: () => void;
    onSave: (logId: string, newStatus: string) => void;
}> = ({ log, statuses, onClose, onSave }) => {
    const availableStatuses = statuses.filter(s => s !== log.status);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">ย้ายขั้นตอนการผลิต</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XCircleIcon className="w-6 h-6 text-gray-500"/></button>
                </div>
                <div className="mb-4 bg-gray-50 p-3 rounded-md">
                    <p className="font-semibold">{log.productName}</p>
                    <p className="text-sm text-gray-600">จำนวน: {log.quantityProduced.toLocaleString()} ชิ้น</p>
                    <p className="text-sm text-gray-600">จาก: <span className="font-bold">{log.status}</span></p>
                </div>
                <p className="font-semibold mb-2">ย้ายไปที่:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableStatuses.map(status => (
                        <button 
                            key={status} 
                            onClick={() => onSave(log.id, status)}
                            className="w-full text-left p-3 bg-white hover:bg-green-50 border rounded-md transition-colors flex justify-between items-center"
                        >
                            <span>{status}</span>
                            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Card for a single molding log
const KanbanCard: React.FC<{
    log: MoldingLogEntry;
    onMove: (log: MoldingLogEntry) => void;
}> = ({ log, onMove }) => {
    const daysAgo = Math.floor((new Date().getTime() - new Date(log.date).getTime()) / (1000 * 3600 * 24));

    return (
        <div className="bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
            <p className="font-semibold text-gray-800 text-sm">{log.productName}</p>
            <p className="text-sm text-gray-600 mt-1">จำนวน: <span className="font-bold">{log.quantityProduced.toLocaleString()}</span> ชิ้น</p>
            <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3"/>
                    <span>{daysAgo > 0 ? `${daysAgo} วันที่แล้ว` : 'วันนี้'}</span>
                </div>
                <button onClick={() => onMove(log)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md" title="ย้ายขั้นตอน">
                    <MoveIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const AggregatedKanbanCard: React.FC<{
    data: { productName: string; totalQuantity: number; logCount: number; }
}> = ({ data }) => {
    return (
        <div className="bg-white p-3 rounded-lg border shadow-sm">
            <p className="font-semibold text-gray-800 text-sm">{data.productName}</p>
            <p className="text-sm text-gray-600 mt-1">
                จำนวนรวม: <span className="font-bold">{data.totalQuantity.toLocaleString()}</span> ชิ้น
            </p>
            <p className="text-xs text-gray-500 mt-1">
                จาก {data.logCount} รายการ
            </p>
        </div>
    );
};

// Main Kanban Board Component
export const ProductionKanbanTab: React.FC = () => {
    const [allLogs, setAllLogs] = useState<MoldingLogEntry[]>([]);
    const [statuses, setStatuses] = useState<string[]>([]);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<MoldingLogEntry | null>(null);
    const [viewMode, setViewMode] = useState<'individual' | 'summary'>('individual');

    const fetchData = useCallback(() => {
        const settings = getSettings();
        const productionStatuses = settings.productionStatuses || [];
        if (!productionStatuses.includes('เสร็จสิ้น')) {
            productionStatuses.push('เสร็จสิ้น');
        }
        setStatuses(productionStatuses);

        // We only care about logs that are not finished yet for the Kanban board
        const logs = getMoldingLogs().filter(log => log.status !== 'เสร็จสิ้น');
        setAllLogs(logs);
    }, []);

    useEffect(() => {
        fetchData();
        window.addEventListener('storage', fetchData);
        return () => window.removeEventListener('storage', fetchData);
    }, [fetchData]);

    const logsByStatus = useMemo(() => {
        const grouped: Record<string, MoldingLogEntry[]> = {};
        statuses.forEach(status => {
            if (status !== 'เสร็จสิ้น') {
                grouped[status] = [];
            }
        });
        allLogs.forEach(log => {
            if (grouped[log.status]) {
                grouped[log.status].push(log);
            }
        });
        
        for (const status in grouped) {
            grouped[status].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
        
        return grouped;
    }, [allLogs, statuses]);

    const summaryLogsByStatus = useMemo(() => {
        if (viewMode !== 'summary') return {};

        const grouped: Record<string, Record<string, { totalQuantity: number; logCount: number }>> = {};

        allLogs.forEach(log => {
            if (!grouped[log.status]) {
                grouped[log.status] = {};
            }
            if (!grouped[log.status][log.productName]) {
                grouped[log.status][log.productName] = { totalQuantity: 0, logCount: 0 };
            }
            grouped[log.status][log.productName].totalQuantity += log.quantityProduced;
            grouped[log.status][log.productName].logCount++;
        });

        const result: Record<string, { productName: string; totalQuantity: number; logCount: number }[]> = {};
        for (const status in grouped) {
            result[status] = Object.entries(grouped[status]).map(([productName, data]) => ({
                productName,
                ...data,
            })).sort((a, b) => a.productName.localeCompare(b.productName));
        }
        
        return result;
    }, [allLogs, viewMode]);
    
    const handleMoveClick = (log: MoldingLogEntry) => {
        setSelectedLog(log);
        setIsMoveModalOpen(true);
    };

    const handleSaveMove = (logId: string, newStatus: string) => {
        const currentLogs = getMoldingLogs();
        const updatedLogs = currentLogs.map(log => 
            log.id === logId ? { ...log, status: newStatus } : log
        );
        saveMoldingLogs(updatedLogs);
        fetchData(); 
        setIsMoveModalOpen(false);
        setSelectedLog(null);
    };

    const ViewButton: React.FC<{
        targetView: 'individual' | 'summary';
        label: string;
        icon: React.ReactNode;
    }> = ({ targetView, label, icon }) => (
        <button
            onClick={() => setViewMode(targetView)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === targetView
                    ? 'bg-green-600 text-white shadow'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div>
            {isMoveModalOpen && selectedLog && (
                <MoveModal 
                    log={selectedLog}
                    statuses={statuses}
                    onClose={() => setIsMoveModalOpen(false)}
                    onSave={handleSaveMove}
                />
            )}
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">สายการผลิต (Kanban)</h2>
                <div className="flex items-center gap-2 p-1 bg-gray-200 rounded-lg">
                    <ViewButton targetView="individual" label="มุมมองรายชิ้น" icon={<ListIcon className="w-4 h-4" />} />
                    <ViewButton targetView="summary" label="มุมมองสรุป" icon={<BarChart2Icon className="w-4 h-4" />} />
                </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4">
                {statuses.filter(s => s !== 'เสร็จสิ้น').map(status => {
                    const individualLogs = logsByStatus[status] || [];
                    const summaryLogs = summaryLogsByStatus[status] || [];
                    const count = viewMode === 'individual' ? individualLogs.length : summaryLogs.length;

                    return (
                        <div key={status} className="bg-gray-100 rounded-xl w-72 flex-shrink-0 flex flex-col" style={{height: 'calc(100vh - 200px)'}}>
                            <h3 className="font-bold p-4 border-b text-gray-700 flex-shrink-0">{status} <span className="text-gray-400 font-medium text-sm">({count})</span></h3>
                            <div className="p-2 space-y-2 overflow-y-auto flex-grow">
                                {viewMode === 'individual' ? (
                                    individualLogs.map(log => (
                                        <KanbanCard key={log.id} log={log} onMove={handleMoveClick} />
                                    ))
                                ) : (
                                    summaryLogs.map(summary => (
                                        <AggregatedKanbanCard key={summary.productName} data={summary} />
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
