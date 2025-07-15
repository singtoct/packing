import React, { useState } from 'react';
import { PackingLogTab } from './PackingLogTab';
import { MoldingTab } from './MoldingTab';
import { ProductionStatusTab } from './ProductionStatusTab';
import { FactoryIcon, BoxIcon, RouteIcon, LogOutIcon } from './icons/Icons';
import { getSettings, saveSettings } from '../services/storageService';

interface WorkerAppProps {
    onDataUpdate: () => void;
}

type WorkerTab = 'molding' | 'packing' | 'status';

export const WorkerApp: React.FC<WorkerAppProps> = ({ onDataUpdate }) => {
    const [activeTab, setActiveTab] = useState<WorkerTab | null>(null);
    
    const handleExitWorkerMode = () => {
        if (window.confirm("คุณต้องการออกจาก Worker Mode หรือไม่?")) {
            const settings = getSettings();
            // Find a non-production role, default to manager or the first role available
            const managerRole = settings.roles.find(r => r.name === 'ผู้จัดการโรงงาน');
            const nonProductionRole = managerRole || settings.roles.find(r => r.name !== 'ฝ่ายผลิต');

            if (nonProductionRole) {
                settings.companyInfo.currentUserRoleId = nonProductionRole.id;
                saveSettings(settings);
                window.location.reload();
            } else {
                alert("ไม่พบบทบาทอื่นให้สลับไป โปรดติดต่อผู้ดูแลระบบ");
            }
        }
    };

    const renderContent = () => {
        if (!activeTab) {
            return (
                <div className="p-4">
                    <div className="grid grid-cols-1 gap-6 mt-8">
                        <WorkerButton
                            label="บันทึกการผลิต (ฉีด)"
                            icon={<FactoryIcon className="w-10 h-10" />}
                            onClick={() => setActiveTab('molding')}
                        />
                        <WorkerButton
                            label="บันทึกการแพ็ค"
                            icon={<BoxIcon className="w-10 h-10" />}
                            onClick={() => setActiveTab('packing')}
                        />
                        <WorkerButton
                            label="ติดตามสถานะ (Kanban)"
                            icon={<RouteIcon className="w-10 h-10" />}
                            onClick={() => setActiveTab('status')}
                        />
                    </div>
                </div>
            );
        }

        switch(activeTab) {
            case 'molding':
                return <MoldingTab />;
            case 'packing':
                return <PackingLogTab setLowStockCheck={onDataUpdate} />;
            case 'status':
                return <ProductionStatusTab />;
            default:
                return null;
        }
    };
    
    const WorkerButton: React.FC<{label: string, icon: React.ReactNode, onClick: () => void}> = ({ label, icon, onClick }) => (
        <button
            onClick={onClick}
            className="w-full p-6 bg-green-500 text-white rounded-lg shadow-lg flex flex-col items-center justify-center gap-4 hover:bg-green-600 active:bg-green-700 transition-all duration-200"
        >
            {icon}
            <span className="text-xl font-semibold">{label}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <header className="bg-gray-800 text-white p-4 flex items-center justify-between">
                <div className="flex items-center">
                    {activeTab && (
                        <button onClick={() => setActiveTab(null)} className="mr-4 font-bold text-2xl">&larr;</button>
                    )}
                    <h1 className="text-xl font-bold">
                        {activeTab === 'molding' && 'บันทึกการผลิต'}
                        {activeTab === 'packing' && 'บันทึกการแพ็ค'}
                        {activeTab === 'status' && 'ติดตามสถานะ'}
                        {!activeTab && 'Worker Mode'}
                    </h1>
                </div>
                <button onClick={handleExitWorkerMode} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-700 transition-colors" title="ออกจาก Worker Mode">
                    <LogOutIcon className="w-5 h-5"/>
                    <span>ออก</span>
                </button>
            </header>
            <main className="p-2 sm:p-4">
                <div className="bg-white p-4 rounded-xl shadow-lg min-h-full">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};
