import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../services/storageService';
import { AppSettings } from '../types';
import { SaveIcon } from './icons/Icons';
import { EditableList } from './EditableList';

export const SettingsTab: React.FC = () => {
    const [settings, setSettings] = useState<AppSettings>(getSettings());

    useEffect(() => {
        // This ensures that if settings are updated elsewhere, this component reflects it.
        const handleStorageChange = () => setSettings(getSettings());
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const handleCompanyInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({
            ...prev,
            companyInfo: {
                ...prev.companyInfo,
                [name]: value,
            },
        }));
    };

    const handleListUpdate = (key: keyof Omit<AppSettings, 'companyInfo'>, newItems: string[]) => {
        setSettings(prev => ({
            ...prev,
            [key]: newItems,
        }));
    };
    
    const handleSaveSettings = () => {
        saveSettings(settings);
        alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
        // Force a reload of the window to ensure all components get the new settings
        window.location.reload();
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">ตั้งค่าระบบ</h2>
                <button onClick={handleSaveSettings} className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
                    <SaveIcon className="w-5 h-5" />
                    บันทึกการเปลี่ยนแปลงทั้งหมด
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">ข้อมูลบริษัท</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ชื่อบริษัท</label>
                                <input type="text" name="name" value={settings.companyInfo.name} onChange={handleCompanyInfoChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ที่อยู่</label>
                                <textarea name="address" value={settings.companyInfo.address} onChange={handleCompanyInfoChange} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">เลขประจำตัวผู้เสียภาษี</label>
                                <input type="text" name="taxId" value={settings.companyInfo.taxId} onChange={handleCompanyInfoChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                        </div>
                    </div>

                    <EditableList
                        title="เหตุผลที่ QC ไม่ผ่าน"
                        items={settings.qcFailureReasons}
                        onUpdate={(newItems) => handleListUpdate('qcFailureReasons', newItems)}
                    />
                </div>
                <div className="space-y-8">
                     <EditableList
                        title="ขั้นตอนการผลิต (สำหรับ Kanban)"
                        items={settings.productionStatuses}
                        onUpdate={(newItems) => handleListUpdate('productionStatuses', newItems)}
                    />
                </div>
            </div>
        </div>
    );
};