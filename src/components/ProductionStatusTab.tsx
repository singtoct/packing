
import React, { useState, useEffect, useMemo } from 'react';
import { getMoldingLogs, saveMoldingLogs, getSettings } from '../services/storageService';
import { MoldingLogEntry } from '../types';
import { RouteIcon } from './icons/Icons';

const UpdateStatusModal: React.FC<{
    log: MoldingLogEntry;
    onClose: () => void;
    onSave: (updatedLog: MoldingLogEntry) => void;
    productionStatuses: string[];
}> = ({ log, onClose, onSave, productionStatuses }) => {
    const [newStatus, setNewStatus] = useState(log.status);
    const availableNextSteps = [...productionStatuses.map(s => s.startsWith('รอ') ? s : `รอ${s}`), 'เสร็จสิ้น'].filter(s => s !== log.status);


    const handleSave = () => {
        onSave({ ...log, status: newStatus });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">อัปเดตสถานะงาน</h2>
                <div className="bg-gray-50 p-4 rounded-lg mb-6 text-sm">
                    <p><strong>สินค้า:</strong> {log.productName}</p>
                    <p><strong>จำนวน:</strong> {log.quantityProduced.toLocaleString()} ชิ้น</p>
                    <p><strong>สถานะปัจจุบัน:</strong> <span className="font-semibold text-yellow-700">{log.status}</span></p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="newStatus" className="block text-sm font-medium text-gray-700">ย้ายไปขั้นตอน</label>
                        <select
                            id="newStatus"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            {availableNextSteps.map(step => (
                                <option key={step} value={step}>{step}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-8">
                    <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50">
                        ยกเลิก
                    </button>
                    <button type="button" onClick={handleSave} className="px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ProductionStatusTab: React.FC = () => {
    const [allLogs, setAllLogs] = useState<MoldingLogEntry[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<MoldingLogEntry | null>(null);
    const [productionStages, setProductionStages] = useState<string[]>([]);


    useEffect(() => {
        const handleStorageChange = () => {
            const logs = getMoldingLogs().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setAllLogs(logs);
            const stagesFromSettings = getSettings().productionStatuses;
            const finalStages = stagesFromSettings.map(s => s.startsWith('รอ') ? s : `รอ${s}`);
            setProductionStages(finalStages);
        };
        handleStorageChange();
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const logsByStage = useMemo(() => {
        const stagesMap: { [key: string]: MoldingLogEntry[] } = {};
        productionStages.forEach(stage => {
            stagesMap[stage] = [];
        });

        allLogs.forEach(log => {
            if (log.status && stagesMap[log.status]) {
                stagesMap[log.status].push(log);
            }
        });
        return stagesMap;
    }, [allLogs, productionStages]);

    const openModal = (log: MoldingLogEntry) => {
        setSelectedLog(log);
        setModalOpen(true);
    };

    const handleSaveStatus = (updatedLog: MoldingLogEntry) => {
        const updatedLogs = allLogs.map(log => log.id === updatedLog.id ? updatedLog : log);
        saveMoldingLogs(updatedLogs);
        setAllLogs(updatedLogs);
    };

    return (
        <div>
             {modalOpen && selectedLog && <UpdateStatusModal log={selectedLog} onClose={() => setModalOpen(false)} onSave={handleSaveStatus} productionStatuses={getSettings().productionStatuses} />}
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">สถานะการผลิต (Kanban Board)</h2>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-4">
                {productionStages.map(stage => (
                    <div key={stage} className="flex-shrink-0 w-80 bg-gray-100 rounded-lg shadow-inner">
                        <div className="p-4 border-b-2 border-gray-200 sticky top-0 bg-gray-100 z-10">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                <RouteIcon className="w-5 h-5 text-gray-500"/>
                                {stage}
                                <span className="ml-auto text-sm font-semibold bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
                                    {logsByStage[stage]?.length || 0}
                                </span>
                            </h3>
                        </div>
                        <div className="p-4 space-y-4 h-[65vh] overflow-y-auto">
                            {logsByStage[stage]?.length > 0 ? (
                                logsByStage[stage].map(log => (
                                <div key={log.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                                    <p className="font-semibold text-gray-800 mb-2">{log.productName}</p>
                                    <p className="text-sm text-gray-500">จำนวน: <span className="font-medium text-gray-700">{log.quantityProduced.toLocaleString()} ชิ้น</span></p>
                                    <p className="text-sm text-gray-500">วันที่ผลิต: <span className="font-medium text-gray-700">{new Date(log.date).toLocaleDateString('th-TH')}</span></p>
                                    <p className="text-sm text-gray-500">ผู้ควบคุม: <span className="font-medium text-gray-700">{log.operatorName}</span></p>
                                    <div className="mt-4 pt-3 border-t">
                                        <button onClick={() => openModal(log)} className="w-full bg-blue-50 text-blue-700 font-bold py-2 px-4 rounded hover:bg-blue-100 transition-colors text-sm">
                                            อัปเดตสถานะ
                                        </button>
                                    </div>
                                </div>
                                ))
                            ) : (
                                <div className="text-center text-sm text-gray-400 pt-10">ไม่มีงานในขั้นตอนนี้</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
