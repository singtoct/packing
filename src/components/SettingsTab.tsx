import React, { useState, useEffect, useRef } from 'react';
import { 
    getSettings, saveSettings, overwriteCollection, getOrders, getPackingLogs, getMoldingLogs, 
    getInventory, getEmployees, getQCEntries, getRawMaterials, getBOMs, getMachines, 
    getMaintenanceLogs, getSuppliers, getPurchaseOrders, getShipments, getProducts, 
    getReadNotificationIds, getCustomers, getComplaints, getProductionQueue, saveReadNotificationIds 
} from '../services/storageService';
import { AppSettings, AppRole } from '../types';
import { SaveIcon, UploadIcon, UsersIcon, DownloadIcon } from 'lucide-react';
import { EditableList } from './EditableList';

const DATA_KEYS = [
    'packing_orders', 'packing_logs', 'molding_logs', 'packing_inventory', 
    'packing_employees', 'packing_qc_entries', 'packing_raw_materials', 
    'packing_boms', 'factory_machines', 'maintenance_logs', 'factory_suppliers', 
    'factory_purchase_orders', 'factory_shipments', 'factory_products', 
    'factory_settings', 'read_notifications', 'factory_customers', 'factory_complaints',
    'production_queue', 'machine_daily_logs', 'packing_stations', 'packing_queue'
];

const dataFetchers: { [key: string]: () => Promise<any> } = {
    'packing_orders': getOrders,
    'packing_logs': getPackingLogs,
    'molding_logs': getMoldingLogs,
    'packing_inventory': getInventory,
    'packing_employees': getEmployees,
    'packing_qc_entries': getQCEntries,
    'packing_raw_materials': getRawMaterials,
    'packing_boms': getBOMs,
    'factory_machines': getMachines,
    'maintenance_logs': getMaintenanceLogs,
    'factory_suppliers': getSuppliers,
    'factory_purchase_orders': getPurchaseOrders,
    'factory_shipments': getShipments,
    'factory_products': getProducts,
    'factory_settings': getSettings,
    'read_notifications': async () => ({ ids: Array.from(await getReadNotificationIds()) }),
    'factory_customers': getCustomers,
    'factory_complaints': getComplaints,
    'production_queue': getProductionQueue,
};

export const SettingsTab: React.FC = () => {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadSettings = async () => {
            const currentSettings = await getSettings();
            setSettings(currentSettings);
        }
        loadSettings();
    }, []);

    if (!settings) {
        return <div>Loading settings...</div>;
    }

    const handleCompanyInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings(prev => prev && ({
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
                setSettings(prev => prev && ({
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
        setSettings(prev => prev && ({
            ...prev,
            [key]: newItems,
        }));
    };
    
    const handleRolesUpdate = (newRoleNames: string[]) => {
        setSettings(prev => {
            if (!prev) return null;
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
        if(settings) {
            saveSettings(settings);
            alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
            // Force a reload of the window to ensure all components get the new settings
            window.location.reload();
        }
    };
    
    const handleExportData = async () => {
        alert('กำลังเตรียมข้อมูลเพื่อส่งออก... โปรดรอสักครู่');
        document.body.style.cursor = 'wait';
        
        const data: { [key: string]: any } = {};
        for (const key of DATA_KEYS) {
            if (dataFetchers[key]) {
                try {
                    data[key] = await dataFetchers[key]();
                } catch (e) {
                    console.error(`Could not fetch data for ${key}:`, e);
                    alert(`เกิดข้อผิดพลาดในการดึงข้อมูลสำหรับ ${key}`);
                    document.body.style.cursor = 'default';
                    return;
                }
            }
        }
    
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        const date = new Date().toISOString().split('T')[0];
        link.download = `CT_ELECTRIC_backup_${date}.json`;
        link.click();
        document.body.style.cursor = 'default';
    };

    const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm("คำเตือน: การนำเข้าข้อมูลจะเขียนทับข้อมูลที่มีอยู่ทั้งหมดในฐานข้อมูล! การกระทำนี้ไม่สามารถย้อนกลับได้ คุณแน่ใจหรือไม่ว่าต้องการดำเนินการต่อ?")) {
            if (importInputRef.current) importInputRef.current.value = '';
            return;
        }

        document.body.style.cursor = 'wait';
        alert('กำลังนำเข้าข้อมูล... โปรดอย่าปิดหน้านี้');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File is not a text file");
                
                const data = JSON.parse(text);

                if (typeof data !== 'object' || data === null || !data.factory_settings) {
                    throw new Error("Invalid backup file format.");
                }

                for (const key of DATA_KEYS) {
                    if (data[key]) {
                        console.log(`Importing ${key}...`);
                        if (key === 'factory_settings') {
                            await saveSettings(data[key]);
                        } else if (key === 'read_notifications') {
                            await saveReadNotificationIds(new Set(data[key].ids || []));
                        } else if (Array.isArray(data[key])) {
                            await overwriteCollection(key, data[key]);
                        }
                    }
                }

                alert("นำเข้าข้อมูลสำเร็จ! แอปพลิเคชันจะรีโหลดใหม่");
                window.location.reload();

            } catch (error) {
                alert(`เกิดข้อผิดพลาดในการนำเข้าข้อมูล: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                if (importInputRef.current) importInputRef.current.value = '';
                document.body.style.cursor = 'default';
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
                            ส่งออกข้อมูลทั้งหมดจากฐานข้อมูลเป็นไฟล์ JSON เพื่อสำรองไว้
                            และสามารถนำเข้าไฟล์นั้นเพื่อเขียนทับข้อมูลทั้งหมดในระบบได้
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