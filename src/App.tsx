
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { OrderManagementTab } from './components/OrderManagementTab';
import { PackingLogTab } from './components/PackingLogTab';
import { StatisticsTab } from './components/StatisticsTab';
import { InventoryTab } from './components/InventoryTab';
import { DashboardTab } from './components/DashboardTab';
import { EmployeeManagementTab } from './components/EmployeeManagementTab';
import { ReportingTab } from './components/ReportingTab';
import { QCTab } from './components/QCTab';
import { MoldingTab } from './components/MoldingTab';
import { ProductionStatusTab } from './components/ProductionStatusTab';
import { RawMaterialsTab } from './components/RawMaterialsTab';
import { AnalysisTab } from './components/AnalysisTab';
import { MaintenanceTab } from './components/MaintenanceTab';
import { ProcurementTab } from './components/ProcurementTab';
import { CostAnalysisTab } from './components/CostAnalysisTab';
import { ShipmentTrackingTab } from './components/ShipmentTrackingTab';
import { ProductsTab } from './components/ProductsTab';
import { SettingsTab } from './components/SettingsTab';
import { FactoryFloorTab } from './components/FactoryFloorTab';
import { QuickActionModal } from './components/QuickActionModal';
import { BellIcon, PlusIcon, ListOrderedIcon, ClipboardCheckIcon, WrenchIcon, FactoryIcon, ShieldAlertIcon } from './components/icons/Icons';
import { getSettings, getInventory, getOrders, getQCEntries, getMachines, getReadNotificationIds, saveReadNotificationIds, getMoldingLogs } from './services/storageService';
import { InventoryItem, AppNotification, AppSettings } from './types';

export type Tab = 'dashboard' | 'factory_floor' | 'orders' | 'analysis' | 'procurement' | 'molding' | 'production_status' | 'logs' | 'qc' | 'shipments' | 'inventory' | 'raw_materials' | 'maintenance' | 'employees' | 'cost_analysis' | 'stats' | 'reports' | 'products' | 'settings';
export type QuickActionType = 'order' | 'packing' | 'molding';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [quickActionType, setQuickActionType] = useState<QuickActionType | null>(null);
  const [settings, setSettings] = useState<AppSettings>(getSettings());

  const generateNotifications = () => {
    const today = new Date();
    const newNotifications: AppNotification[] = [];

    // 1. Low Finished Stock -> Suggest Production
    getInventory().forEach(item => {
        if (item.minStock !== undefined && item.quantity < item.minStock) {
            newNotifications.push({
                id: `low-stock-${item.name}`,
                type: 'lowFinishedStock',
                message: `สต็อก ${item.name} ใกล้หมด แนะนำให้สร้างใบสั่งผลิต`,
                actionTab: 'molding',
                entityId: item.name,
                date: today.toISOString()
            });
        }
    });

    // 2. High Rejection Rate -> Suggest Maintenance
    const moldingLogs = getMoldingLogs();
    const logsByMachine: Record<string, { produced: number, rejected: number }> = {};
    moldingLogs.forEach(log => {
        if (!logsByMachine[log.machine]) {
            logsByMachine[log.machine] = { produced: 0, rejected: 0 };
        }
        logsByMachine[log.machine].produced += log.quantityProduced;
        logsByMachine[log.machine].rejected += log.quantityRejected;
    });

    Object.entries(logsByMachine).forEach(([machineName, stats]) => {
        if (stats.produced > 50 && (stats.rejected / stats.produced) > 0.05) { // Thresholds: >50 parts produced & >5% reject rate
            newNotifications.push({
                id: `reject-rate-${machineName}`,
                type: 'highRejectionRate',
                message: `เครื่อง ${machineName} มีอัตราของเสียสูงผิดปกติ (${((stats.rejected / stats.produced) * 100).toFixed(1)}%)`,
                actionTab: 'maintenance',
                entityId: machineName,
                date: today.toISOString()
            });
        }
    });


    // 3. Order Due Dates
    getOrders().forEach(order => {
        const dueDate = new Date(order.dueDate);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 3) {
            newNotifications.push({
                id: `order-${order.id}`,
                type: 'orderDue',
                message: `ออเดอร์ ${order.name} (${order.color}) ใกล้ถึงกำหนดส่ง`,
                actionTab: 'orders',
                entityId: order.id,
                date: today.toISOString()
            });
        }
    });

    // 4. Pending QC
    getQCEntries().forEach(entry => {
        if (entry.status === 'Pending') {
            const packingDate = new Date(entry.packingDate);
            const diffTime = today.getTime() - packingDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 2) {
                newNotifications.push({
                    id: `qc-${entry.id}`,
                    type: 'qcPending',
                    message: `งาน QC สำหรับ ${entry.productName} ค้างมา ${diffDays} วัน`,
                    actionTab: 'qc',
                    entityId: entry.id,
                    date: today.toISOString()
                });
            }
        }
    });
    
    // 5. Machine Maintenance
    getMachines().forEach(machine => {
        if (machine.nextPmDate) {
            const pmDate = new Date(machine.nextPmDate);
            if (pmDate <= today) {
                newNotifications.push({
                    id: `pm-${machine.id}`,
                    type: 'maintenance',
                    message: `เครื่องจักร ${machine.name} ถึงรอบซ่อมบำรุง`,
                    actionTab: 'maintenance',
                    entityId: machine.id,
                    date: today.toISOString()
                });
            }
        }
    });

    setNotifications(newNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  
  const handleQuickActionSelect = (type: QuickActionType) => {
    setQuickActionType(type);
    setIsQuickActionsOpen(false);
  }

  useEffect(() => {
    const currentSettings = getSettings();
    setSettings(currentSettings);
    
    document.title = currentSettings.companyInfo.name || 'CT.ELECTRIC - Production System';
    const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (favicon && currentSettings.companyInfo.logoUrl) {
      favicon.href = currentSettings.companyInfo.logoUrl;
    }

    setReadNotifications(getReadNotificationIds());
    generateNotifications();
    
    const handleStorageChange = () => {
        generateNotifications();
        setSettings(getSettings());
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  const onDataUpdate = () => {
    generateNotifications();
    setSettings(getSettings());
    setActiveTab(activeTab); 
  }

  const handleNotificationClick = (notification: AppNotification) => {
    markAsRead(notification.id);
    setActiveTab(notification.actionTab);
    setIsAlertsOpen(false);
  };
  
  const markAsRead = (id: string) => {
      const newReadNotifications = new Set(readNotifications);
      newReadNotifications.add(id);
      setReadNotifications(newReadNotifications);
      saveReadNotificationIds(newReadNotifications);
  };

  const markAllAsRead = () => {
      const newReadNotifications = new Set(notifications.map(n => n.id));
      setReadNotifications(newReadNotifications);
      saveReadNotificationIds(newReadNotifications);
  };
  
  const unreadCount = notifications.filter(n => !readNotifications.has(n.id)).length;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab setActiveTab={setActiveTab} />;
      case 'factory_floor':
        return <FactoryFloorTab />;
      case 'orders':
        return <OrderManagementTab />;
      case 'analysis':
        return <AnalysisTab />;
       case 'procurement':
        return <ProcurementTab />;
      case 'molding':
        return <MoldingTab />;
      case 'production_status':
        return <ProductionStatusTab />;
      case 'logs':
        return <PackingLogTab setLowStockCheck={generateNotifications} />;
      case 'qc':
        return <QCTab />;
      case 'shipments':
        return <ShipmentTrackingTab />;
      case 'inventory':
        return <InventoryTab setLowStockCheck={generateNotifications}/>;
      case 'products':
        return <ProductsTab />;
      case 'raw_materials':
        return <RawMaterialsTab />;
      case 'maintenance':
        return <MaintenanceTab />;
      case 'employees':
        return <EmployeeManagementTab />;
      case 'cost_analysis':
        return <CostAnalysisTab />;
      case 'stats':
        return <StatisticsTab />;
      case 'reports':
        return <ReportingTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <DashboardTab setActiveTab={setActiveTab} />;
    }
  };
  
  const NotificationIcon: React.FC<{type: AppNotification['type']}> = ({ type }) => {
    const iconMap = {
      orderDue: <ListOrderedIcon className="w-5 h-5 text-red-500" />,
      qcPending: <ClipboardCheckIcon className="w-5 h-5 text-teal-500" />,
      maintenance: <WrenchIcon className="w-5 h-5 text-blue-500" />,
      lowFinishedStock: <FactoryIcon className="w-5 h-5 text-orange-500" />,
      highRejectionRate: <ShieldAlertIcon className="w-5 h-5 text-purple-500" />,
    };
    return iconMap[type] || <BellIcon className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} logoUrl={settings.companyInfo.logoUrl} />
      
      {quickActionType && <QuickActionModal actionType={quickActionType} onClose={() => setQuickActionType(null)} onDataUpdate={onDataUpdate} />}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm z-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-end items-center py-2 h-16 gap-2">
               <div className="relative">
                 <button onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)} className="p-2 text-gray-600 hover:text-green-600 hover:bg-gray-100 rounded-full">
                   <PlusIcon className="w-6 h-6" />
                 </button>
                 {isQuickActionsOpen && (
                   <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-30">
                     <ul className="py-1">
                        <li onClick={() => handleQuickActionSelect('order')} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">เพิ่มออเดอร์ใหม่</li>
                        <li onClick={() => handleQuickActionSelect('molding')} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">บันทึกการผลิต (ฉีด)</li>
                        <li onClick={() => handleQuickActionSelect('packing')} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">บันทึกการแพ็ค</li>
                     </ul>
                   </div>
                 )}
               </div>
              <div className="relative">
                <button onClick={() => setIsAlertsOpen(!isAlertsOpen)} className="relative p-2 text-gray-600 hover:text-green-600 hover:bg-gray-100 rounded-full">
                  <BellIcon className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center ring-2 ring-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {isAlertsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-30">
                    <div className="p-3 border-b flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">การแจ้งเตือน</h3>
                        {unreadCount > 0 && 
                            <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline">อ่านทั้งหมด</button>
                        }
                    </div>
                    {notifications.length > 0 ? (
                      <ul className="max-h-96 overflow-y-auto">
                        {notifications.map(item => (
                           <li key={item.id} onClick={() => handleNotificationClick(item)} className={`px-4 py-3 border-b text-sm cursor-pointer hover:bg-gray-50 flex items-start gap-3 ${!readNotifications.has(item.id) ? 'bg-blue-50' : ''}`}>
                             <div className="mt-1"><NotificationIcon type={item.type} /></div>
                             <div className="flex-1">
                                <p className="text-gray-800">{item.message}</p>
                                <p className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString('th-TH')}</p>
                             </div>
                           </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="p-4 text-sm text-gray-500">ไม่มีการแจ้งเตือนในขณะนี้</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6 lg:p-8">
          <div className="bg-white p-6 rounded-xl shadow-lg min-h-full">
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
