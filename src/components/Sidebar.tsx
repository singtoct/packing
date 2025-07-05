

import React, { useState } from 'react';
import { CTElectricLogo } from '../assets/logo';
import { Tab } from '../App';
import { 
    LayoutDashboardIcon, ListOrderedIcon, TruckIcon, SigmaIcon, ShoppingCartIcon, 
    FactoryIcon, RouteIcon, BoxIcon, ClipboardCheckIcon, ArchiveIcon, BeakerIcon, 
    UsersIcon, WrenchIcon, DollarSignIcon, BarChart3Icon, FileTextIcon, ChevronDownIcon,
    PackageIcon, DatabaseIcon
} from './icons/Icons';

interface MenuItemProps {
    tab: Tab;
    title: string;
    icon: React.ReactNode;
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ tab, title, icon, activeTab, setActiveTab }) => (
    <a
        href="#"
        onClick={(e) => {
            e.preventDefault();
            setActiveTab(tab);
        }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === tab 
                ? 'bg-green-600 text-white shadow-inner' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
    >
        {icon}
        <span>{title}</span>
    </a>
);


interface MenuCategoryProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    isOpen: boolean;
    toggle: () => void;
}

const MenuCategory: React.FC<MenuCategoryProps> = ({ title, icon, children, isOpen, toggle }) => (
    <div>
        <button 
            onClick={toggle}
            className="w-full flex items-center justify-between p-2.5 rounded-md text-sm font-semibold text-gray-200 hover:bg-gray-700 transition-colors"
        >
            <div className="flex items-center gap-3">
                {icon}
                <span>{title}</span>
            </div>
            <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`pl-5 pr-2 pt-1 space-y-1 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
            {children}
        </div>
    </div>
);

const menuConfig = [
    { 
        isCategory: false, 
        tab: 'dashboard' as Tab, 
        title: 'แดชบอร์ด', 
        icon: <LayoutDashboardIcon className="w-5 h-5"/> 
    },
    {
        isCategory: true,
        title: 'การขายและจัดส่ง',
        icon: <TruckIcon className="w-5 h-5"/>,
        children: [
            { tab: 'orders', title: 'จัดการออเดอร์', icon: <ListOrderedIcon className="w-5 h-5"/> },
            { tab: 'shipments', title: 'ติดตามการจัดส่ง', icon: <TruckIcon className="w-5 h-5"/> },
        ],
    },
    {
        isCategory: true,
        title: 'การจัดซื้อ',
        icon: <ShoppingCartIcon className="w-5 h-5"/>,
        children: [
            { tab: 'analysis', title: 'วิเคราะห์วัตถุดิบ', icon: <SigmaIcon className="w-5 h-5"/> },
            { tab: 'procurement', title: 'ใบสั่งซื้อ/ซัพพลายเออร์', icon: <ShoppingCartIcon className="w-5 h-5"/> },
        ],
    },
    {
        isCategory: true,
        title: 'การผลิต',
        icon: <FactoryIcon className="w-5 h-5"/>,
        children: [
            { tab: 'molding', title: 'บันทึกการผลิต', icon: <FactoryIcon className="w-5 h-5"/> },
            { tab: 'production_status', title: 'ติดตามสถานะ', icon: <RouteIcon className="w-5 h-5"/> },
            { tab: 'logs', title: 'บันทึกการแพ็ค', icon: <BoxIcon className="w-5 h-5"/> },
            { tab: 'qc', title: 'ควบคุมคุณภาพ', icon: <ClipboardCheckIcon className="w-5 h-5"/> },
        ],
    },
    {
        isCategory: true,
        title: 'คลังสินค้าและวัตถุดิบ',
        icon: <ArchiveIcon className="w-5 h-5"/>,
        children: [
            { tab: 'products', title: 'จัดการสินค้า', icon: <DatabaseIcon className="w-5 h-5"/> },
            { tab: 'inventory', title: 'สต็อกสินค้าสำเร็จรูป', icon: <ArchiveIcon className="w-5 h-5"/> },
            { tab: 'raw_materials', title: 'คลังวัตถุดิบ/BOM', icon: <BeakerIcon className="w-5 h-5"/> },
        ],
    },
    {
        isCategory: true,
        title: 'การจัดการ',
        icon: <UsersIcon className="w-5 h-5"/>,
        children: [
            { tab: 'employees', title: 'จัดการพนักงาน', icon: <UsersIcon className="w-5 h-5"/> },
            { tab: 'maintenance', title: 'ซ่อมบำรุงเครื่องจักร', icon: <WrenchIcon className="w-5 h-5"/> },
        ],
    },
    {
        isCategory: true,
        title: 'วิเคราะห์และรายงาน',
        icon: <BarChart3Icon className="w-5 h-5"/>,
        children: [
            { tab: 'cost_analysis', title: 'วิเคราะห์ต้นทุน', icon: <DollarSignIcon className="w-5 h-5"/> },
            { tab: 'stats', title: 'สถิติ', icon: <BarChart3Icon className="w-5 h-5"/> },
            { tab: 'reports', title: 'รายงาน', icon: <FileTextIcon className="w-5 h-5"/> },
        ],
    },
];

export const Sidebar: React.FC<{ activeTab: Tab, setActiveTab: (tab: Tab) => void }> = ({ activeTab, setActiveTab }) => {
    const [openMenus, setOpenMenus] = useState<Set<string>>(new Set(['การผลิต', 'การขายและจัดส่ง', 'คลังสินค้าและวัตถุดิบ']));

    const toggleMenu = (title: string) => {
        setOpenMenus(prev => {
            const newSet = new Set(prev);
            if (newSet.has(title)) {
                newSet.delete(title);
            } else {
                newSet.add(title);
            }
            return newSet;
        });
    };

    return (
        <aside className="w-64 bg-gray-800 text-white flex-shrink-0 flex flex-col">
            <div className="bg-gray-900 h-16 flex items-center justify-center px-4">
                <div className="flex items-center gap-3">
                    <img src={CTElectricLogo} alt="CT.ELECTRIC Logo" className="h-10" />
                </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
                {menuConfig.map((item, index) => {
                    if (item.isCategory) {
                        return (
                            <MenuCategory 
                                key={index}
                                title={item.title} 
                                icon={item.icon}
                                isOpen={openMenus.has(item.title)}
                                toggle={() => toggleMenu(item.title)}
                            >
                                {item.children?.map(child => (
                                    <MenuItem 
                                        key={child.tab}
                                        tab={child.tab as Tab}
                                        title={child.title}
                                        icon={child.icon}
                                        activeTab={activeTab}
                                        setActiveTab={setActiveTab}
                                    />
                                ))}
                            </MenuCategory>
                        )
                    }
                    return (
                         <MenuItem 
                            key={item.tab!}
                            tab={item.tab!}
                            title={item.title}
                            icon={item.icon}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                        />
                    )
                })}
            </nav>
            <div className="text-center py-4 px-2 text-gray-500 text-xs border-t border-gray-700">
                <p>CT.ELECTRIC © {new Date().getFullYear()}</p>
            </div>
        </aside>
    );
};
