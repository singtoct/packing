import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { PackingLogTab } from './components/PackingLogTab';
import { StatisticsTab } from './components/StatisticsTab';
import { InventoryTab } from './components/InventoryTab';
import { DashboardTab } from './components/DashboardTab';
import { EmployeeManagementTab } from './components/EmployeeManagementTab';
import { ReportingTab } from './components/ReportingTab';
import { QCTab } from './components/QCTab';
import { MoldingTab } from './components/MoldingTab';
import { RawMaterialsTab } from './components/RawMaterialsTab';
import { AnalysisTab } from './components/AnalysisTab';
import { MaintenanceTab } from './components/MaintenanceTab';
import { ProcurementTab } from './components/ProcurementTab';
import { CostAnalysisTab } from './components/CostAnalysisTab';
import { ProfitabilityAnalysisTab } from './components/ProfitabilityAnalysisTab';
import { ShipmentTrackingTab } from './components/ShipmentTrackingTab';
import { ProductsTab } from './components/ProductsTab';
import { SettingsTab } from './components/SettingsTab';
import { FactoryFloorTab } from './components/FactoryFloorTab';
import { CustomersTab } from './components/CustomersTab';
import { ComplaintsTab } from './components/ComplaintsTab';
import { WorkerApp } from './components/WorkerApp';
import { QuickActionModal } from './components/QuickActionModal';
import { BellIcon, PlusIcon, ListOrderedIcon, ClipboardCheckIcon, WrenchIcon, FactoryIcon, ShieldAlertIcon, LoaderIcon, MenuIcon } from 'lucide-react';
import { getSettings, getInventory, getOrders, getQCEntries, getMachines, getReadNotificationIds, saveReadNotificationIds, getMoldingLogs } from './services/storageService';
import { seedDefaultData } from './services/firebaseService';
import { AppNotification, AppSettings } from './types';
import { ProductionPlanTab } from './components/ProductionPlanTab';
import { PackingFloorTab } from './components/PackingFloorTab';
import { ProductionKanbanTab } from './components/ProductionKanbanTab';
import { MachinePerformanceTab } from './components/MachinePerformanceTab';

export type Tab = 'dashboard' | 'factory_floor' | 'packing_floor' | 'production_plan' | 'production_kanban' | 'analysis' | 'procurement' | 'molding' | 'logs' | 'qc' | 'shipments' | 'inventory' | 'raw_materials' | 'maintenance' | 'employees' | 'cost_analysis' | 'profit_analysis' | 'stats' | 'reports' | 'products' | 'settings' | 'customers' | 'complaints' | 'machine_performance';
export type QuickActionType = 'order' | 'packing' | 'molding';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('factory_floor');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [quickActionType, setQuickActionType] = useState<QuickActionType | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isWorkerMode, setIsWorkerMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const generateNotifications = useCallback(async () => {
    const today = new Date();
    const newNotifications: AppNotification[] = [];

    // 1. Low Finished Stock -> Suggest Production
    const inventory = await getInventory();
    inventory.forEach(item => {
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
    const moldingLogs = await getMoldingLogs();
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
    const orders = await getOrders();
    orders.forEach(order => {
        const dueDate = new Date(order.dueDate);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 3) {
            newNotifications.push({
                id: `order-${order.id}`,
                type: 'orderDue',
                message: `ออเดอร์ ${order.name} (${order.color}) ใกล้ถึงกำหนดส่ง`,
                actionTab: 'production_plan',
                entityId: order.id,
                date: today.toISOString()
            });
        }
    });

    // 4. Pending QC
    const qcEntries = await getQCEntries();
    qcEntries.forEach(entry => {
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
    const machines = await getMachines();
    machines.forEach(machine => {
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
  }, []);
  
  const handleQuickActionSelect = (type: QuickActionType) => {
    setQuickActionType(type);
    setIsQuickActionsOpen(false);
  }

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
        // Ensure database is seeded with default data before fetching anything
        await seedDefaultData();

        const currentSettings = await getSettings();
        setSettings(currentSettings);
        
        const productionRole = currentSettings.roles.find(r => r.name === 'ฝ่ายผลิต');
        if (productionRole && currentSettings.companyInfo.currentUserRoleId === productionRole.id) {
            setIsWorkerMode(true);
        } else {
            setIsWorkerMode(false);
        }
        
        document.title = currentSettings.companyInfo.name || 'CT.ELECTRIC - Production System';
        const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (favicon && currentSettings.companyInfo.logoUrl) {
          favicon.href = currentSettings.companyInfo.logoUrl;
        }

        const readIds = await getReadNotificationIds();
        setReadNotifications(readIds);
        await generateNotifications();
    } catch (error) {
        console.error("Error loading initial data:", error);
        // Error will be displayed by firebaseService if initialization fails
    } finally {
        setIsLoading(false);
    }
  }, [generateNotifications]);


  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);
  
  const onDataUpdate = useCallback(async () => {
    await generateNotifications();
    const newSettings = await getSettings();
    setSettings(newSettings);
  }, [generateNotifications]);

  const handleNotificationClick = (notification: AppNotification) => {
    markAsRead(notification.id);
    setActiveTab(notification.actionTab);
    setIsAlertsOpen(false);
  };
  
  const markAsRead = async (id: string) => {
      const newReadNotifications = new Set<string>(readNotifications);
      newReadNotifications.add(id);
      setReadNotifications(newReadNotifications);
      await saveReadNotificationIds(newReadNotifications);
  };

  const markAllAsRead = async () => {
      const newReadNotifications = new Set<string>(notifications.map(n => n.id));
      setReadNotifications(newReadNotifications);
      await saveReadNotificationIds(newReadNotifications);
  };
  
  const unreadCount = notifications.filter(n => !readNotifications.has(n.id)).length;

  if (isLoading || !settings) {
      return (
          <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
              <LoaderIcon className="w-16 h-16 animate-spin text-green-600" />
          </div>
      );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab setActiveTab={setActiveTab} />;
      case 'factory_floor':
        return <FactoryFloorTab />;
      case 'packing_floor':
        return <PackingFloorTab />;
      case 'production_plan':
        return <ProductionPlanTab />;
      case 'production_kanban':
        return <ProductionKanbanTab />;
      case 'analysis':
        return <AnalysisTab />;
       case 'procurement':
        return <ProcurementTab />;
      case 'molding':
        return <MoldingTab />;
      case 'logs':
        return <PackingLogTab setLowStockCheck={onDataUpdate} />;
      case 'qc':
        return <QCTab />;
      case 'shipments':
        return <ShipmentTrackingTab />;
      case 'inventory':
        return <InventoryTab setLowStockCheck={onDataUpdate}/>;
      case 'products':
        return <ProductsTab />;
      case 'raw_materials':
        return <RawMaterialsTab />;
      case 'maintenance':
        return <MaintenanceTab />;
      case 'employees':
        return <EmployeeManagementTab />;
      case 'customers':
        return <CustomersTab />;
      case 'complaints':
        return <ComplaintsTab />;
      case 'cost_analysis':
        return <CostAnalysisTab />;
      case 'profit_analysis':
        return <ProfitabilityAnalysisTab />;
      case 'machine_performance':
        return <MachinePerformanceTab />;
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

  if (isWorkerMode) {
      return <WorkerApp onDataUpdate={onDataUpdate} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        logoUrl={settings.companyInfo.logoUrl}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen} 
      />
      
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"></div>}
      
      {quickActionType && <QuickActionModal actionType={quickActionType} onClose={() => setQuickActionType(null)} onDataUpdate={onDataUpdate} />}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm z-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-2 h-16 gap-2">
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 text-gray-600 hover:text-green-600 md:hidden"
                    aria-label="Open menu"
                >
                    <MenuIcon className="w-6 h-6" />
                </button>
                
                {/* This div is for spacing to keep right icons on the right on mobile */}
                <div className="flex-1 md:hidden"></div>

               <div className="flex items-center gap-2">
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
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6 lg:p-8">
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg min-h-full">
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
