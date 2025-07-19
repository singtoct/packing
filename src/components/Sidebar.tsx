import React, { useState, useMemo } from 'react';
import { Tab } from '../App';
import { 
    LayoutDashboardIcon, ListOrderedIcon, TruckIcon, SigmaIcon, ShoppingCartIcon, 
    FactoryIcon, RouteIcon, BoxIcon, ClipboardCheckIcon, ArchiveIcon, BeakerIcon, 
    UsersIcon, WrenchIcon, DollarSignIcon, BarChart3Icon, FileTextIcon, ChevronDownIcon,
    DatabaseIcon, SearchIcon, SettingsIcon, LayoutGridIcon, PieChartIcon, HeartHandshakeIcon, 
    MessageSquareWarningIcon, EditIcon, ClipboardListIcon
} from 'lucide-react';

// Define a type for the Lucide icons to ensure type safety
type IconComponent = React.ComponentType<{ className: string }>;

// --- Sub-components expecting icon component references ---

interface MenuItemProps {
    tab: Tab;
    title: string;
    icon: IconComponent; // Icon is now a component reference
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ tab, title, icon: Icon, activeTab, setActiveTab }) => (
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
        <Icon className="w-5 h-5" /> {/* Create the element here */}
        <span>{title}</span>
    </a>
);


interface MenuCategoryProps {
    title: string;
    icon: IconComponent; // Icon is now a component reference
    children: React.ReactNode;
    isOpen: boolean;
    toggle: () => void;
}

const MenuCategory: React.FC<MenuCategoryProps> = ({ title, icon: Icon, children, isOpen, toggle }) => (
    <div>
        <button 
            onClick={toggle}
            className="w-full flex items-center justify-between p-2.5 rounded-md text-sm font-semibold text-gray-200 hover:bg-gray-700 transition-colors"
        >
            <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" /> {/* Create the element here */}
                <span>{title}</span>
            </div>
            <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`pl-5 pr-2 pt-1 space-y-1 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
            {children}
        </div>
    </div>
);

// --- Menu Configuration with Component References ---
const menuConfig = [
    { isCategory: false, tab: 'dashboard' as Tab, title: 'ภาพรวมระบบ', icon: LayoutDashboardIcon },
    { isCategory: false, tab: 'factory_floor' as Tab, title: 'สถานะเครื่องฉีด', icon: LayoutGridIcon },
    { isCategory: false, tab: 'packing_floor' as Tab, title: 'สถานะเครื่องแพ็ค', icon: BoxIcon },
    { isCategory: false, tab: 'production_plan' as Tab, title: 'แผนการผลิต', icon: ClipboardCheckIcon },
    { isCategory: false, tab: 'production_kanban' as Tab, title: 'สายการผลิต (Kanban)', icon: ClipboardListIcon },
    {
        isCategory: true,
        title: 'บันทึกข้อมูล',
        icon: EditIcon,
        children: [
            { tab: 'molding', title: 'บันทึกการผลิต (ฉีด)', icon: FactoryIcon },
            { tab: 'logs', title: 'บันทึกการแพ็ค', icon: BoxIcon },
            { tab: 'qc', title: 'ควบคุมคุณภาพ (QC)', icon: ClipboardCheckIcon },
        ],
    },
    {
        isCategory: true,
        title: 'คลังสินค้า',
        icon: ArchiveIcon,
        children: [
            { tab: 'inventory', title: 'สต็อกสินค้าสำเร็จรูป', icon: ArchiveIcon },
            { tab: 'raw_materials', title: 'วัตถุดิบ/BOM', icon: BeakerIcon },
            { tab: 'products', title: 'จัดการสินค้า', icon: DatabaseIcon },
        ],
    },
    {
        isCategory: true,
        title: 'การขายและลูกค้า',
        icon: TruckIcon,
        children: [
            { tab: 'customers', title: 'จัดการลูกค้า', icon: UsersIcon },
            { tab: 'shipments', title: 'ติดตามการจัดส่ง', icon: TruckIcon },
            { tab: 'complaints', title: 'ข้อร้องเรียน', icon: MessageSquareWarningIcon },
        ]
    },
    {
        isCategory: true,
        title: 'การจัดซื้อ',
        icon: ShoppingCartIcon,
        children: [
            { tab: 'analysis', title: 'วิเคราะห์วัตถุดิบ', icon: SigmaIcon },
            { tab: 'procurement', title: 'การจัดซื้อ', icon: ShoppingCartIcon },
        ],
    },
    {
        isCategory: true,
        title: 'การจัดการ',
        icon: SettingsIcon,
        children: [
            { tab: 'employees', title: 'จัดการพนักงาน', icon: UsersIcon },
            { tab: 'maintenance', title: 'ซ่อมบำรุงเครื่องจักร', icon: WrenchIcon },
            { tab: 'settings', title: 'ตั้งค่า', icon: SettingsIcon },
        ],
    },
    {
        isCategory: true,
        title: 'วิเคราะห์และรายงาน',
        icon: BarChart3Icon,
        children: [
            { tab: 'profit_analysis', title: 'วิเคราะห์กำไร', icon: PieChartIcon },
            { tab: 'cost_analysis', title: 'วิเคราะห์ต้นทุน', icon: DollarSignIcon },
            { tab: 'stats', title: 'สถิติ', icon: BarChart3Icon },
            { tab: 'reports', title: 'รายงาน', icon: FileTextIcon },
        ],
    },
];

// --- Main Sidebar Component ---
export const Sidebar: React.FC<{ activeTab: Tab, setActiveTab: (tab: Tab) => void, logoUrl?: string }> = ({ activeTab, setActiveTab, logoUrl }) => {
    const [openMenus, setOpenMenus] = useState<Set<string>>(new Set(['บันทึกข้อมูล', 'คลังสินค้า', 'การขายและลูกค้า']));
    const [searchTerm, setSearchTerm] = useState('');

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
    
    const filteredMenu = useMemo(() => {
        if (!searchTerm.trim()) {
          return menuConfig;
        }
    
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
    
        const result = menuConfig.map(item => {
          if (!item.isCategory) {
            return item.title.toLowerCase().includes(lowerCaseSearchTerm) ? item : null;
          }
    
          const categoryTitleMatches = item.title.toLowerCase().includes(lowerCaseSearchTerm);
          const matchingChildren = item.children?.filter(child =>
            child.title.toLowerCase().includes(lowerCaseSearchTerm)
          );
    
          if (categoryTitleMatches) {
            return item;
          }
    
          if (matchingChildren && matchingChildren.length > 0) {
            return { ...item, children: matchingChildren };
          }
    
          return null;
        });
    
        return result.filter((item): item is NonNullable<typeof item> => !!item);
      }, [searchTerm]);

    return (
        <aside className="w-64 bg-gray-800 text-white flex-shrink-0 flex flex-col">
            <div className="bg-gray-900 h-16 flex items-center justify-center px-4">
                <div className="flex items-center gap-3">
                    {logoUrl && <img src={logoUrl} alt="Company Logo" className="h-10 w-auto object-contain" />}
                </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                 <div className="relative mb-3 px-1">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="ค้นหาเมนู..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-700 text-white rounded-md py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                </div>
                {filteredMenu.map((item) => {
                    if (item.isCategory) {
                        return (
                            <MenuCategory 
                                key={item.title}
                                title={item.title} 
                                icon={item.icon}
                                isOpen={!!searchTerm.trim() || openMenus.has(item.title)}
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