import React, { useState, useEffect, useRef } from 'react';
import { getSettings, saveSettings } from '../services/storageService';
import { AppSettings, AppRole } from '../types';
import { SaveIcon, UploadIcon, UsersIcon, DownloadIcon } from 'lucide-react';
import { EditableList } from './EditableList';

const DATA_KEYS = [
    'packing_orders', 'packing_logs', 'molding_logs', 'packing_inventory', 
    'packing_employees', 'packing_qc_entries', 'packing_raw_materials', 
    'packing_boms', 'factory_machines', 'maintenance_logs', 'factory_suppliers', 
    'factory_purchase_orders', 'factory_shipments', 'factory_products', 
    'factory_settings', 'read_notifications', 'factory_customers', 'factory_complaints',
    'production_queue'
];


export const SettingsTab: React.FC = () => {
    const [settings, setSettings] = useState<AppSettings>(getSettings());
    const logoInputRef = useRef<HTMLInputElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // This ensures that if settings are updated elsewhere, this component reflects it.
        const handleStorageChange = () => setSettings(getSettings());
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const handleCompanyInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({
            ...prev,
            companyInfo: {
                ...prev.companyInfo,
                [name]: value,
            },
        }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings(prev => ({
                    ...prev,
                    companyInfo: {
                        ...prev.companyInfo,
                        logoUrl: reader.result as string,
                    },
                }));
            };
            reader.readAsDataURL(file);
        } else {
            alert('กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, SVG, etc.)');
        }
    };

    const handleListUpdate = (key: 'qcFailureReasons' | 'productionStatuses', newItems: string[]) => {
        setSettings(prev => ({
            ...prev,
            [key]: newItems,
        }));
    };
    
    const handleRolesUpdate = (newRoleNames: string[]) => {
        setSettings(prev => {
            const newRoles: AppRole[] = newRoleNames.map(name => {
                const existing = prev.roles.find(r => r.name === name);
                return existing || { id: `role_${Date.now()}_${Math.random()}`, name };
            });

            // Ensure dashboard layouts exist for new roles
            const newLayouts = { ...prev.dashboardLayouts };
            const defaultLayout = prev.dashboardLayouts[prev.roles[0]?.id] || [];
            newRoles.forEach(role => {
                if (!newLayouts[role.id]) {
                    newLayouts[role.id] = defaultLayout;
                }
            });

            // Remove layouts for deleted roles
            const newRoleIds = new Set(newRoles.map(r => r.id));
            Object.keys(newLayouts).forEach(roleId => {
                if (!newRoleIds.has(roleId)) {
                    delete newLayouts[roleId];
                }
            });

            // If current user's role was deleted, switch to the first available role
            const currentUserRoleId = newRoleIds.has(prev.companyInfo.currentUserRoleId)
                ? prev.companyInfo.currentUserRoleId
                : newRoles[0]?.id || '';

            return {
                ...prev,
                roles: newRoles,
                dashboardLayouts: newLayouts,
                companyInfo: {
                    ...prev.companyInfo,
                    currentUserRoleId
                }
            };
        });
    };

    const handleSaveSettings = () => {
        saveSettings(settings);
        alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
        // Force a reload of the window to ensure all components get the new settings
        window.location.reload();
    };
    
    const handleExportData = () => {
        const data: { [key: string]: any } = {};
        DATA_KEYS.forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                try {
                    data[key] = JSON.parse(item);
                } catch(e) {
                    console.warn(`Could not parse localStorage item ${key}:`, e);
                }
            }
        });

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        const date = new Date().toISOString().split('T')[0];
        link.download = `CT_ELECTRIC_backup_${date}.json`;
        link.click();
    };

    const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm("คำเตือน: การนำเข้าข้อมูลจะเขียนทับข้อมูลที่มีอยู่ทั้งหมดในแอปพลิเคชันนี้ คุณแน่ใจหรือไม่ว่าต้องการดำเนินการต่อ?")) {
            if (importInputRef.current) importInputRef.current.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File is not a text file");
                
                const data = JSON.parse(text);

                // Basic validation
                if (typeof data !== 'object' || data === null || !data.factory_settings) {
                    throw new Error("Invalid backup file format.");
                }

                Object.keys(data).forEach(key => {
                    if (DATA_KEYS.includes(key)) {
                        localStorage.setItem(key, JSON.stringify(data[key]));
                    }
                });

                alert("นำเข้าข้อมูลสำเร็จ! แอปพลิเคชันจะรีโหลดใหม่");
                window.location.reload();

            } catch (error) {
                alert(`เกิดข้อผิดพลาดในการนำเข้าข้อมูล: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                if (importInputRef.current) importInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
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
                     <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">การสำรองและกู้คืนข้อมูล</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            ส่งออกข้อมูลทั้งหมดเป็นไฟล์ JSON เพื่อสำรองข้อมูลไว้ใน Google Drive หรือคอมพิวเตอร์ของคุณ
                            และสามารถนำเข้าไฟล์นั้นเพื่อกู้คืนข้อมูลได้
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={handleExportData}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                            >
                                <DownloadIcon className="w-5 h-5"/>
                                ส่งออกข้อมูลทั้งหมด
                            </button>
                             <input
                                type="file"
                                accept=".json"
                                ref={importInputRef}
                                onChange={handleImportData}
                                className="hidden"
                            />
                            <button
                                onClick={() => importInputRef.current?.click()}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <UploadIcon className="w-5 h-5"/>
                                นำเข้าข้อมูล
                            </button>
                        </div>
                    </div>

                    <EditableList
                        title="เหตุผลที่ QC ไม่ผ่าน"
                        items={settings.qcFailureReasons}
                        onUpdate={(newItems) => handleListUpdate('qcFailureReasons', newItems)}
                    />
                </div>
                <div className="space-y-8">
                     <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">โลโก้บริษัท</h3>
                        <div className="flex items-center gap-6">
                            <div className="w-32 h-32 flex-shrink-0 bg-gray-100 rounded-md flex items-center justify-center border p-2">
                                {settings.companyInfo.logoUrl ? (
                                    <img src={settings.companyInfo.logoUrl} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                                ) : (
                                    <span className="text-xs text-gray-500">ไม่มีโลโก้</span>
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-3">
                                    อัปโหลดโลโก้ (แนะนำให้ใช้ไฟล์ .png หรือ .svg ที่มีพื้นหลังโปร่งใส)
                                </p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={logoInputRef}
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => logoInputRef.current?.click()}
                                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    <UploadIcon className="w-5 h-5" />
                                    เลือกไฟล์รูปภาพ
                                </button>
                            </div>
                        </div>
                    </div>
                     <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><UsersIcon className="w-5 h-5" /> การจัดการบทบาท</h3>
                        <p className="text-sm text-gray-500 mb-4">กำหนดบทบาทผู้ใช้เพื่อปรับแต่งแดชบอร์ดให้เหมาะสมกับแต่ละตำแหน่ง</p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">บทบาทผู้ใช้ปัจจุบันของคุณ</label>
                            <select 
                                name="currentUserRoleId" 
                                value={settings.companyInfo.currentUserRoleId} 
                                onChange={handleCompanyInfoChange} 
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm"
                            >
                                {settings.roles.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mt-6">
                            <EditableList
                                title="แก้ไขรายการบทบาท"
                                items={settings.roles.map(r => r.name)}
                                onUpdate={handleRolesUpdate}
                                placeholder="เพิ่มบทบาทใหม่..."
                            />
                        </div>
                    </div>
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