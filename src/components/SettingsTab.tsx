
import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../services/storageService';
import { AppSettings, CompanyInfo } from '../types';
import { PlusCircleIcon, Trash2Icon, SaveIcon } from './icons/Icons';
import { EditableList } from './EditableList';

// Reusable component for editing a list of strings
const EditableList: React.FC<{
    title: string;
    items: string[];
    onUpdate: (newItems: string[]) => void;
}> = ({ title, items, onUpdate }) => {
    const [newItem, setNewItem] = useState('');

    const handleAddItem = () => {
        if (newItem.trim() && !items.includes(newItem.trim())) {
            onUpdate([...items, newItem.trim()]);
            setNewItem('');
        }
    };

    const handleRemoveItem = (itemToRemove: string) => {
        onUpdate(items.filter(item => item !== itemToRemove));
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
            <div className="space-y-2 mb-4">
                {items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <span>{item}</span>
                        <button onClick={() => handleRemoveItem(item)} className="p-1 text-red-500 hover:text-red-700">
                            <Trash2Icon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="เพิ่มรายการใหม่"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
                />
                <button onClick={handleAddItem} className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700">
                    <PlusCircleIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

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