
import React, { useState, useEffect } from 'react';
import { OrderManagementTab } from './components/OrderManagementTab';
import { PackingLogTab } from './components/PackingLogTab';
import { StatisticsTab } from './components/StatisticsTab';
import { AISuggestions } from './components/AISuggestions';
import { BoxIcon, ListOrderedIcon, BarChart3Icon } from './components/icons/Icons';
import { CTPackingLogo } from './assets/logo';

type Tab = 'orders' | 'logs' | 'stats';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('orders');

  useEffect(() => {
    document.title = 'CT.ELECTRIC - Packing System';
    const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (favicon) {
      favicon.href = CTPackingLogo;
    }
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'orders':
        return <OrderManagementTab />;
      case 'logs':
        return <PackingLogTab />;
      case 'stats':
        return <StatisticsTab />;
      default:
        return <OrderManagementTab />;
    }
  };

  const TabButton = ({ tabName, currentTab, setTab, children }: { tabName: Tab, currentTab: Tab, setTab: React.Dispatch<React.SetStateAction<Tab>>, children: React.ReactNode }) => (
    <button
      onClick={() => setTab(tabName)}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
        currentTab === tabName
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-700'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-gray-100 min-h-screen text-gray-800">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-4">
               <img src={CTPackingLogo} alt="CT.ELECTRIC Logo" className="h-12" />
               <div className="border-l border-gray-300 h-10"></div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">ระบบจัดการออเดอร์แพ็คกิ้ง</h1>
            </div>
            <nav className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
              <TabButton tabName="orders" currentTab={activeTab} setTab={setActiveTab}>
                <ListOrderedIcon className="w-5 h-5" />
                <span>สร้างออเดอร์</span>
              </TabButton>
              <TabButton tabName="logs" currentTab={activeTab} setTab={setActiveTab}>
                <BoxIcon className="w-5 h-5" />
                <span>บันทึกการแพ็ค</span>
              </TabButton>
              <TabButton tabName="stats" currentTab={activeTab} setTab={setActiveTab}>
                <BarChart3Icon className="w-5 h-5" />
                <span>สถิติ</span>
              </TabButton>
            </nav>
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
        <p>CT.ELECTRIC Packing Order Management System © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default App;