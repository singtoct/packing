

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
import { BellIcon } from './components/icons/Icons';
import { CTPackingLogo } from './assets/logo';
import { getInventory } from './services/storageService';
import { InventoryItem } from './types';
import { AISuggestions } from './components/AISuggestions';

export type Tab = 'dashboard' | 'orders' | 'analysis' | 'procurement' | 'molding' | 'production_status' | 'logs' | 'qc' | 'shipments' | 'inventory' | 'raw_materials' | 'maintenance' | 'employees' | 'cost_analysis' | 'stats' | 'reports';

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
    document.title = 'CT.ELECTRIC - Production System';
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
      case 'analysis':
        return <AnalysisTab />;
       case 'procurement':
        return <ProcurementTab />;
      case 'molding':
        return <MoldingTab />;
      case 'production_status':
        return <ProductionStatusTab />;
      case 'logs':
        return <PackingLogTab setLowStockCheck={checkLowStock} />;
      case 'qc':
        return <QCTab />;
      case 'shipments':
        return <ShipmentTrackingTab />;
      case 'inventory':
        return <InventoryTab setLowStockCheck={checkLowStock}/>;
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
      default:
        return <DashboardTab setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm z-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-end items-center py-2 h-16">
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
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6 lg:p-8">
          <div className="bg-white p-6 rounded-xl shadow-lg min-h-full">
            {renderTabContent()}
          </div>
           <div className="mt-8">
                <AISuggestions />
            </div>
        </main>
      </div>
    </div>
  );
};

export default App;