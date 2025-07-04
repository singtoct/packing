

import React, { useState, useEffect } from 'react';
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
import { AISuggestions } from './components/AISuggestions';
import { BoxIcon, ListOrderedIcon, BarChart3Icon, ArchiveIcon, BellIcon, LayoutDashboardIcon, UsersIcon, FileTextIcon, ClipboardCheckIcon, FactoryIcon, RouteIcon } from './components/icons/Icons';
import { CTPackingLogo } from './assets/logo';
import { getInventory } from './services/storageService';
import { InventoryItem } from './types';

type Tab = 'dashboard' | 'orders' | 'molding' | 'production_status' | 'logs' | 'qc' | 'inventory' | 'stats' | 'employees' | 'reports';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  const checkLowStock = () => {
    const inventory = getInventory();
    const lowItems = inventory.filter(item => item.minStock && item.quantity < item.minStock);
    setLowStockItems(lowItems);
  };

  useEffect(() => {
    document.title = 'CT.ELECTRIC - Packing System';
    const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (favicon) {
      favicon.href = CTPackingLogo;
    }
    
    checkLowStock(); // Initial check
    const handleStorageChange = () => checkLowStock();
    window.addEventListener('storage', handleStorageChange); // Listen for changes from other tabs
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab setActiveTab={setActiveTab} />;
      case 'orders':
        return <OrderManagementTab />;
      case 'molding':
        return <MoldingTab />;
      case 'production_status':
        return <ProductionStatusTab />;
      case 'logs':
        return <PackingLogTab setLowStockCheck={checkLowStock} />;
      case 'qc':
        return <QCTab />;
      case 'inventory':
        return <InventoryTab setLowStockCheck={checkLowStock}/>;
      case 'stats':
        return <StatisticsTab />;
      case 'employees':
        return <EmployeeManagementTab />;
      case 'reports':
        return <ReportingTab />;
      default:
        return <DashboardTab setActiveTab={setActiveTab} />;
    }
  };

  const TabButton = ({ tabName, currentTab, setTab, children }: { tabName: Tab, currentTab: Tab, setTab: React.Dispatch<React.SetStateAction<Tab>>, children: React.ReactNode }) => (
    <button
      onClick={() => setTab(tabName)}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
        currentTab === tabName
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-700'
      }`}
      aria-current={currentTab === tabName ? 'page' : undefined}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-gray-100 min-h-screen text-gray-800">
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center gap-4">
               <img src={CTPackingLogo} alt="CT.ELECTRIC Logo" className="h-12" />
               <div className="border-l border-gray-300 h-10"></div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">ระบบจัดการการผลิต</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button onClick={() => setIsAlertsOpen(!isAlertsOpen)} className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-full">
                  <BellIcon className="w-6 h-6" />
                  {lowStockItems.length > 0 && (
                    <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center ring-2 ring-white">
                      {lowStockItems.length}
                    </span>
                  )}
                </button>
                {isAlertsOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-30">
                    <div className="p-3 border-b font-bold text-gray-700">รายการสต็อกต่ำ</div>
                    {lowStockItems.length > 0 ? (
                      <ul className="max-h-80 overflow-y-auto">
                        {lowStockItems.map(item => (
                           <li key={item.name} className="px-3 py-2 border-b text-sm hover:bg-gray-50">
                             <p className="font-semibold">{item.name}</p>
                             <p className="text-red-600">มี: {item.quantity} (ขั้นต่ำ: {item.minStock})</p>
                           </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="p-4 text-sm text-gray-500">ไม่มีรายการสต็อกต่ำในขณะนี้</p>
                    )}
                  </div>
                )}
              </div>
              <nav className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg flex-wrap">
                <TabButton tabName="dashboard" currentTab={activeTab} setTab={setActiveTab}>
                  <LayoutDashboardIcon className="w-5 h-5" />
                  <span>แดชบอร์ด</span>
                </TabButton>
                <TabButton tabName="orders" currentTab={activeTab} setTab={setActiveTab}>
                  <ListOrderedIcon className="w-5 h-5" />
                  <span>ออเดอร์</span>
                </TabButton>
                <TabButton tabName="molding" currentTab={activeTab} setTab={setActiveTab}>
                  <FactoryIcon className="w-5 h-5" />
                  <span>แผนกฉีด</span>
                </TabButton>
                 <TabButton tabName="production_status" currentTab={activeTab} setTab={setActiveTab}>
                  <RouteIcon className="w-5 h-5" />
                  <span>สถานะการผลิต</span>
                </TabButton>
                <TabButton tabName="logs" currentTab={activeTab} setTab={setActiveTab}>
                  <BoxIcon className="w-5 h-5" />
                  <span>บันทึกการแพ็ค</span>
                </TabButton>
                <TabButton tabName="qc" currentTab={activeTab} setTab={setActiveTab}>
                  <ClipboardCheckIcon className="w-5 h-5" />
                  <span>ควบคุมคุณภาพ</span>
                </TabButton>
                <TabButton tabName="inventory" currentTab={activeTab} setTab={setActiveTab}>
                  <ArchiveIcon className="w-5 h-5" />
                  <span>สต็อกสินค้า</span>
                </TabButton>
                <TabButton tabName="stats" currentTab={activeTab} setTab={setActiveTab}>
                  <BarChart3Icon className="w-5 h-5" />
                  <span>สถิติ</span>
                </TabButton>
                 <TabButton tabName="employees" currentTab={activeTab} setTab={setActiveTab}>
                  <UsersIcon className="w-5 h-5" />
                  <span>พนักงาน</span>
                </TabButton>
                <TabButton tabName="reports" currentTab={activeTab} setTab={setActiveTab}>
                  <FileTextIcon className="w-5 h-5" />
                  <span>รายงาน</span>
                </TabButton>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          {renderTabContent()}
        </div>
        <div className="mt-8">
            <AISuggestions />
        </div>
      </main>
      <footer className="text-center py-4 text-gray-500 text-sm">
        <p>CT.ELECTRIC Production Management System © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default App;
