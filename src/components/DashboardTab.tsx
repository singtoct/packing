import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getOrders, getPackingLogs, getInventory, getQCEntries, getMoldingLogs, getBOMs, getRawMaterials, getDashboardLayout, saveDashboardLayout } from '../services/storageService';
import { OrderItem, PackingLogEntry, InventoryItem, QCEntry, MoldingLogEntry } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ListOrderedIcon, AlertTriangleIcon, TrophyIcon, TrendingUpIcon, CheckCircle2Icon, ClipboardCheckIcon, FactoryIcon, RouteIcon, ExternalLinkIcon, SettingsIcon, XCircleIcon, GripVerticalIcon } from './icons/Icons';

type Tab = 'dashboard' | 'orders' | 'logs' | 'inventory' | 'stats' | 'qc' | 'molding' | 'production_status' | 'employees' | 'reports' | 'procurement' | 'analysis' | 'raw_materials';

interface Insight {
    key: string;
    text: string;
    actionTab: Tab;
    priority: 'high' | 'medium' | 'low';
    entityId: string;
    date: string;
}

interface DashboardWidget {
    id: string;
    title: string;
    Component: React.FC<any>;
    gridSpan?: number;
}

const StatCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; onClick?: () => void; className?: string }> = ({ title, icon, children, onClick, className = '' }) => (
    <div 
      className={`bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col ${onClick ? 'cursor-pointer hover:shadow-xl hover:border-green-300 transition-all duration-300' : ''} ${className}`}
      onClick={onClick}
    >
        <div className="flex items-center gap-3 mb-4">
            {icon}
            <h3 className="text-lg font-bold text-gray-700">{title}</h3>
        </div>
        <div className="flex-grow flex flex-col justify-center">{children}</div>
    </div>
);

// --- Individual Card Components ---

const UpcomingOrdersCard: React.FC<{ setActiveTab: (tab: Tab) => void }> = ({ setActiveTab }) => {
    const [orders, setOrders] = useState<OrderItem[]>([]);
    useEffect(() => {
        setOrders([...getOrders()].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 5));
    }, []);
    return (
        <StatCard title="ออเดอร์ใกล้ถึงกำหนดส่ง" icon={<ListOrderedIcon className="w-6 h-6 text-green-500" />} onClick={() => setActiveTab('orders')}>
            {orders.length > 0 ? (
                <ul className="space-y-3">
                    {orders.map(order => (
                        <li key={order.id} className="text-sm border-b border-gray-100 pb-2">
                            <p className="font-semibold text-gray-800 truncate">{order.name} ({order.color})</p>
                            <div className="flex justify-between items-center text-gray-500">
                                <span>จำนวน: {order.quantity} ลัง</span>
                                <span className="font-bold text-red-500">{new Date(order.dueDate).toLocaleDateString('th-TH')}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : <p className="text-gray-500 text-center pt-8">ไม่มีออเดอร์ที่ใกล้ถึงกำหนด</p>}
        </StatCard>
    );
};

const LowStockCard: React.FC<{ setActiveTab: (tab: Tab) => void }> = ({ setActiveTab }) => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    useEffect(() => {
        setItems(getInventory().filter(item => item.minStock !== undefined && item.quantity < item.minStock));
    }, []);
    return (
        <StatCard title="รายการสต็อกต่ำ" icon={<AlertTriangleIcon className="w-6 h-6 text-yellow-500" />} onClick={() => setActiveTab('inventory')}>
            {items.length > 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-red-600">
                   <AlertTriangleIcon className="w-12 h-12 mb-2"/>
                   <p className="font-semibold">{items.length} รายการต่ำกว่ากำหนด</p>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-green-600">
                   <CheckCircle2Icon className="w-12 h-12 mb-2"/>
                   <p className="font-semibold">สต็อกสินค้าปกติ</p>
                </div>
            )}
        </StatCard>
    );
};

const PendingQcCard: React.FC<{ setActiveTab: (tab: Tab) => void }> = ({ setActiveTab }) => {
    const [count, setCount] = useState(0);
    useEffect(() => setCount(getQCEntries().filter(e => e.status === 'Pending').length), []);
    return (
        <StatCard title="รอตรวจสอบคุณภาพ (QC)" icon={<ClipboardCheckIcon className="w-6 h-6 text-teal-500" />} onClick={() => setActiveTab('qc')}>
            {count > 0 ? (
                <div className="text-center">
                    <p className="text-4xl font-bold text-teal-600">{count}</p>
                    <p className="text-lg text-teal-800">รายการ</p>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-green-600">
                   <CheckCircle2Icon className="w-12 h-12 mb-2"/>
                   <p className="font-semibold">ไม่มีรายการรอตรวจสอบ</p>
                </div>
            )}
        </StatCard>
    );
};

const MoldingTodayCard: React.FC<{ setActiveTab: (tab: Tab) => void }> = ({ setActiveTab }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        setCount(getMoldingLogs().filter(log => log.date === todayStr).reduce((sum, log) => sum + log.quantityProduced, 0));
    }, []);
    return (
        <StatCard title="ยอดผลิต (แผนกฉีด)" icon={<FactoryIcon className="w-6 h-6 text-slate-500" />} onClick={() => setActiveTab('molding')}>
             <div className="text-center">
                <p className="text-4xl font-bold text-slate-600">{count.toLocaleString()}</p>
                <p className="text-lg text-slate-800">ชิ้น (วันนี้)</p>
            </div>
        </StatCard>
    );
};

const ActionableInsightsCard: React.FC<{ setActiveTab: (tab: Tab) => void }> = ({ setActiveTab }) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    useEffect(() => {
        const newInsights: Insight[] = [];
        const orders = getOrders();
        const boms = getBOMs();
        const rawMaterials = getRawMaterials();
        const inventory = getInventory();
        const finishedGoodsMap = new Map(inventory.map(i => [i.name, i.quantity]));
        
        orders.forEach(order => {
            const productName = `${order.name} (${order.color})`;
            const stock = finishedGoodsMap.get(productName) || 0;
            if (stock < order.quantity) {
                newInsights.push({ key: `stock-${order.id}`, text: `สต็อก ${order.name} ไม่พอสำหรับออเดอร์ (ต้องการ ${order.quantity}, มี ${stock})`, actionTab: 'molding', priority: 'high', entityId: order.id, date:'' });
            }
        });

        const bomMap = new Map(boms.map(b => [b.productName, b]));
        const rawMaterialMap = new Map(rawMaterials.map(rm => [rm.id, rm]));
        const requiredMaterials = new Map<string, { required: number, name: string }>();
        orders.forEach(order => {
            const bom = bomMap.get(`${order.name} (${order.color})`);
            if (bom) {
                bom.components.forEach(comp => {
                    const material = rawMaterialMap.get(comp.rawMaterialId);
                    if (material) {
                        const totalRequired = comp.quantity * order.quantity;
                        const existing = requiredMaterials.get(material.id) || { required: 0, name: material.name };
                        existing.required += totalRequired;
                        requiredMaterials.set(material.id, existing);
                    }
                });
            }
        });
        requiredMaterials.forEach((data, id) => {
            const stock = rawMaterialMap.get(id)?.quantity || 0;
            if (stock < data.required) {
                 newInsights.push({ key: `raw-${id}`, text: `วัตถุดิบ ${data.name} อาจไม่พอ (ต้องการ ${data.required.toFixed(2)}, มี ${stock.toFixed(2)})`, actionTab: 'procurement', priority: 'medium', entityId: id, date:'' });
            }
        });
        setInsights(newInsights.slice(0, 5));
    }, []);
    if (insights.length === 0) return null;
    return (
        <StatCard title="ข้อมูลเชิงปฏิบัติการ" icon={<AlertTriangleIcon className="w-6 h-6 text-orange-500" />} className="col-span-1 sm:col-span-2 lg:col-span-2 bg-orange-50 border-orange-200">
            <ul className="space-y-2">
                {insights.map(insight => (
                    <li key={insight.key} onClick={() => setActiveTab(insight.actionTab)} className="text-sm p-2 rounded-md hover:bg-orange-100 cursor-pointer flex justify-between items-center">
                        <span className="text-orange-800">{insight.text}</span>
                        <span className="text-orange-500"><ExternalLinkIcon className="w-4 h-4"/></span>
                    </li>
                ))}
            </ul>
        </StatCard>
    );
};

const WipCard: React.FC<{ setActiveTab: (tab: Tab) => void }> = ({ setActiveTab }) => {
    const [count, setCount] = useState(0);
    useEffect(() => setCount(getMoldingLogs().filter(log => log.status && log.status !== 'เสร็จสิ้น').length), []);
    return (
        <StatCard title="งานระหว่างผลิต (WIP)" icon={<RouteIcon className="w-6 h-6 text-cyan-500" />} onClick={() => setActiveTab('production_status')}>
            <div className="text-center">
                <p className="text-4xl font-bold text-cyan-600">{count}</p>
                <p className="text-lg text-cyan-800">ล็อต</p>
            </div>
        </StatCard>
    );
};

const TopPackerCard: React.FC<{ setActiveTab: (tab: Tab) => void }> = ({ setActiveTab }) => {
    const [topPacker, setTopPacker] = useState<{ name: string; quantity: number } | null>(null);
    useEffect(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentLogs = getPackingLogs().filter(log => new Date(log.date) >= sevenDaysAgo);
        const packerStats = recentLogs.reduce((acc, log) => {
            acc[log.packerName] = (acc[log.packerName] || 0) + log.quantity;
            return acc;
        }, {} as Record<string, number>);
        const top = Object.entries(packerStats).sort(([, a], [, b]) => b - a)[0];
        setTopPacker(top ? { name: top[0], quantity: top[1] } : null);
    }, []);
    return (
        <StatCard title="พนักงานดีเด่น (7 วัน)" icon={<TrophyIcon className="w-6 h-6 text-amber-500" />} onClick={() => setActiveTab('stats')}>
            {topPacker ? (
                <div className="text-center">
                    <p className="text-xl font-bold text-amber-900">{topPacker.name}</p>
                    <p className="text-lg text-amber-700">แพ็คได้ {topPacker.quantity} ลัง</p>
                </div>
            ) : <p className="text-gray-500 text-center">ไม่มีข้อมูล</p>}
        </StatCard>
    );
};

const PackingSummaryCard: React.FC<{ setActiveTab: (tab: Tab) => void }> = ({ setActiveTab }) => {
    const [summary, setSummary] = useState<{ date: string; quantity: number }[]>([]);
    useEffect(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setHours(0, 0, 0, 0);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const recentLogs = getPackingLogs().filter(log => new Date(log.date) >= sevenDaysAgo);
        const summaryMap = new Map<string, number>();
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo);
            d.setDate(d.getDate() + i);
            summaryMap.set(d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }), 0);
        }
        recentLogs.forEach(log => {
            const key = new Date(log.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
            if (summaryMap.has(key)) {
                summaryMap.set(key, summaryMap.get(key)! + log.quantity);
            }
        });
        setSummary(Array.from(summaryMap.entries()).map(([date, quantity]) => ({ date, quantity })));
    }, []);
    return (
        <StatCard title="ยอดแพ็ค 7 วันล่าสุด" icon={<TrendingUpIcon className="w-6 h-6 text-emerald-500" />} onClick={() => setActiveTab('stats')} className="col-span-1 sm:col-span-2 lg:col-span-2">
            {summary.reduce((sum, item) => sum + item.quantity, 0) > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                    <BarChart data={summary} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: '0.5rem', fontSize: '12px' }} />
                        <Bar dataKey="quantity" name="จำนวน" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            ) : <p className="text-gray-500 text-center">ไม่มีข้อมูลการแพ็คใน 7 วันล่าสุด</p>}
        </StatCard>
    );
};

const ALL_WIDGETS: DashboardWidget[] = [
    { id: 'upcomingOrders', title: 'ออเดอร์ใกล้ถึงกำหนดส่ง', Component: UpcomingOrdersCard },
    { id: 'actionableInsights', title: 'ข้อมูลเชิงปฏิบัติการ', Component: ActionableInsightsCard, gridSpan: 2 },
    { id: 'lowStock', title: 'รายการสต็อกต่ำ', Component: LowStockCard },
    { id: 'pendingQc', title: 'รอตรวจสอบคุณภาพ (QC)', Component: PendingQcCard },
    { id: 'moldingToday', title: 'ยอดผลิต (แผนกฉีด)', Component: MoldingTodayCard },
    { id: 'wip', title: 'งานระหว่างผลิต (WIP)', Component: WipCard },
    { id: 'topPacker', title: 'พนักงานดีเด่น (7 วัน)', Component: TopPackerCard },
    { id: 'packingSummary', title: 'ยอดแพ็ค 7 วันล่าสุด', Component: PackingSummaryCard, gridSpan: 2 },
];

const DEFAULT_LAYOUT = ['upcomingOrders', 'actionableInsights', 'lowStock', 'pendingQc', 'topPacker', 'packingSummary'];

// --- Settings Modal ---

const DashboardSettingsModal: React.FC<{
    currentLayout: string[];
    onClose: () => void;
    onSave: (newLayout: string[]) => void;
}> = ({ currentLayout, onClose, onSave }) => {
    const [visibleWidgets, setVisibleWidgets] = useState<string[]>(currentLayout);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleToggleVisibility = (id: string, checked: boolean) => {
        setVisibleWidgets(prev =>
            checked ? [...prev, id] : prev.filter(widgetId => widgetId !== id)
        );
    };

    const handleDragSort = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        const newLayout = [...visibleWidgets];
        const [draggedItemContent] = newLayout.splice(dragItem.current, 1);
        newLayout.splice(dragOverItem.current, 0, draggedItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        setVisibleWidgets(newLayout);
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">ตั้งค่าแดชบอร์ด</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XCircleIcon className="w-6 h-6 text-gray-500" /></button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold mb-2 text-gray-600">การ์ดที่แสดงผล (ลากเพื่อจัดเรียง)</h3>
                        <div className="space-y-2">
                            {visibleWidgets.map((widgetId, index) => {
                                const widget = ALL_WIDGETS.find(w => w.id === widgetId);
                                if (!widget) return null;
                                return (
                                    <div
                                        key={widget.id}
                                        className="flex items-center gap-3 p-3 rounded-lg border bg-white cursor-grab"
                                        draggable
                                        onDragStart={() => dragItem.current = index}
                                        onDragEnter={() => dragOverItem.current = index}
                                        onDragEnd={handleDragSort}
                                        onDragOver={(e) => e.preventDefault()}
                                    >
                                        <GripVerticalIcon className="w-5 h-5 text-gray-400" />
                                        <span className="flex-1 text-sm font-medium">{widget.title}</span>
                                        <input
                                            type="checkbox"
                                            checked={true}
                                            onChange={(e) => handleToggleVisibility(widget.id, e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mb-4">
                        <h3 className="text-sm font-semibold mb-2 text-gray-600">การ์ดที่ซ่อนอยู่</h3>
                        <div className="space-y-2">
                            {ALL_WIDGETS.filter(w => !visibleWidgets.includes(w.id)).map(widget => (
                                <div key={widget.id} className="flex items-center gap-3 p-3 rounded-lg border bg-gray-100">
                                    <GripVerticalIcon className="w-5 h-5 text-gray-300" />
                                    <span className="flex-1 text-sm font-medium text-gray-500">{widget.title}</span>
                                    <input
                                        type="checkbox"
                                        checked={false}
                                        onChange={(e) => handleToggleVisibility(widget.id, e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t mt-auto">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm">ยกเลิก</button>
                    <button onClick={() => onSave(visibleWidgets)} className="px-4 py-2 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700 text-sm">บันทึก</button>
                </div>
            </div>
        </div>
    );
};


export const DashboardTab: React.FC<{ setActiveTab: (tab: Tab) => void }> = ({ setActiveTab }) => {
    const [layout, setLayout] = useState<string[]>(getDashboardLayout() || DEFAULT_LAYOUT);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        const handleStorageChange = () => {
            const newLayout = getDashboardLayout();
            if (newLayout) setLayout(newLayout);
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const handleSaveLayout = (newLayout: string[]) => {
        setLayout(newLayout);
        saveDashboardLayout(newLayout);
        setIsSettingsOpen(false);
    };

    const widgetsToRender = useMemo(() => {
        return layout.map(id => ALL_WIDGETS.find(w => w.id === id)).filter((w): w is DashboardWidget => !!w);
    }, [layout]);

    return (
        <div>
            {isSettingsOpen && <DashboardSettingsModal currentLayout={layout} onClose={() => setIsSettingsOpen(false)} onSave={handleSaveLayout} />}
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800">แดชบอร์ดภาพรวม</h2>
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded-full transition-colors"
                    title="ตั้งค่าแดชบอร์ด"
                    aria-label="Customize dashboard layout"
                >
                    <SettingsIcon className="w-6 h-6" />
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {widgetsToRender.map(({ id, Component, gridSpan }) => {
                    const props = { key: id, setActiveTab };
                    const className = `col-span-1 ${gridSpan === 2 ? `sm:col-span-2 lg:col-span-2` : ''}`;
                    // The component needs to be wrapped for the className to apply to the grid item
                    return <div key={id} className={className}><Component {...props} /></div>;
                })}
            </div>
        </div>
    );
};
