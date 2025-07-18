

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getOrders, getPackingLogs, getInventory, getQCEntries, getMoldingLogs, getBOMs, getRawMaterials, getMachines, getSettings, saveSettings } from '../services/storageService';
import { generateProductionPlan, generateInventoryForecast } from '../services/geminiService';
import { OrderItem, PackingLogEntry, InventoryItem, QCEntry, MoldingLogEntry, AIProductionPlanItem, AIInventoryForecastItem, AppSettings, Tab } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ListOrderedIcon, AlertTriangleIcon, TrophyIcon, TrendingUpIcon, CheckCircle2Icon, ClipboardCheckIcon, FactoryIcon, RouteIcon, SettingsIcon, XCircleIcon, GripVerticalIcon, SparklesIcon, LoaderIcon, BrainCircuitIcon } from './icons/Icons';

interface DashboardWidget {
    id: string;
    title: string;
    Component: React.FC<any>;
    gridSpan?: number;
}

const StatCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; onClick?: () => void; className?: string }> = ({ title, icon, children, onClick, className = '' }) => (
    <div 
      className={`bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col h-full ${onClick ? 'cursor-pointer hover:shadow-xl hover:border-green-300 transition-all duration-300' : ''} ${className}`}
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

const AIInventoryForecastCard: React.FC<{ setActiveTab: (tab: Tab) => void }> = () => {
    const [forecast, setForecast] = useState<AIInventoryForecastItem[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateForecast = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const orders = getOrders();
            const moldingLogs = getMoldingLogs().filter(log => new Date(log.date) >= thirtyDaysAgo);
            const boms = getBOMs();
            const rawMaterials = getRawMaterials();
            
            const generatedForecast = await generateInventoryForecast(orders, moldingLogs, boms, rawMaterials);
            setForecast(generatedForecast);
        } catch (err) {
            setError('Failed to generate forecast. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <StatCard title="AI คาดการณ์สต็อกวัตถุดิบ" icon={<BrainCircuitIcon className="w-6 h-6 text-cyan-500" />} className="bg-cyan-50 border-cyan-200">
             {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full">
                    <LoaderIcon className="w-12 h-12 text-cyan-500"/>
                    <p className="mt-2 text-cyan-700">AI กำลังวิเคราะห์ข้อมูลสต็อก...</p>
                </div>
            ) : error ? (
                 <div className="text-center text-red-600">{error}</div>
            ) : forecast ? (
                forecast.length > 0 ? (
                <div className="space-y-2 h-full max-h-80 overflow-y-auto pr-2">
                    {forecast.map((item, index) => (
                         <div key={index} className="bg-white p-2 rounded-lg border border-gray-200">
                            <p className="font-bold text-sm text-gray-800 truncate">{item.rawMaterialName}</p>
                            <div className="flex justify-between items-baseline">
                                <span className={`text-lg font-bold ${item.daysUntilStockout !== null && item.daysUntilStockout < 7 ? 'text-red-600' : 'text-cyan-600'}`}>
                                    {item.daysUntilStockout !== null ? `${item.daysUntilStockout} วัน` : 'ไม่ลดลง'}
                                </span>
                                <span className="text-xs text-gray-500">{item.reason}</span>
                            </div>
                        </div>
                    ))}
                </div>
                 ) : (
                    <div className="text-center h-full flex flex-col justify-center items-center">
                        <CheckCircle2Icon className="w-12 h-12 text-green-500" />
                        <p className="mt-2 font-semibold text-gray-700">วัตถุดิบเพียงพอ</p>
                        <p className="text-sm text-gray-500">ไม่พบรายการที่มีความเสี่ยงจะหมด</p>
                    </div>
                )
            ) : (
                <div className="text-center h-full flex flex-col justify-center">
                    <p className="text-gray-600 mb-4 text-sm">ให้ AI ช่วยวิเคราะห์อัตราการใช้และออเดอร์ในอนาคต เพื่อคาดการณ์ว่าวัตถุดิบจะหมดเมื่อไหร่</p>
                    <button onClick={handleGenerateForecast} className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-700 transition-colors inline-flex items-center justify-center gap-2">
                        <BrainCircuitIcon className="w-5 h-5"/>
                        สร้างรายการคาดการณ์
                    </button>
                </div>
            )}
        </StatCard>
    );
};

const AIPlannerCard: React.FC<{ setActiveTab: (tab: Tab) => void }> = () => {
    const [plan, setPlan] = useState<AIProductionPlanItem[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGeneratePlan = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const orders = getOrders();
            const inventory = getInventory();
            const machines = getMachines();
            const boms = getBOMs();
            const rawMaterials = getRawMaterials();
            const generatedPlan = await generateProductionPlan(orders, inventory, machines, boms, rawMaterials);
            setPlan(generatedPlan);
        } catch (err) {
            setError('Failed to generate plan. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <StatCard title="แผนการผลิตที่แนะนำโดย AI" icon={<SparklesIcon className="w-6 h-6 text-violet-500" />} className="bg-violet-50 border-violet-200">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full">
                    <LoaderIcon className="w-12 h-12 text-violet-500"/>
                    <p className="mt-2 text-violet-700">AI กำลังวิเคราะห์ข้อมูล...</p>
                </div>
            ) : error ? (
                 <div className="text-center text-red-600">{error}</div>
            ) : plan ? (
                plan.length > 0 ? (
                <div className="space-y-3 h-full max-h-80 overflow-y-auto pr-2">
                    {plan.map((item, index) => (
                         <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start">
                                <p className="font-bold text-gray-800">{item.priority}. {item.productName}</p>
                                <span className="text-sm font-semibold text-violet-600">{item.machine}</span>
                            </div>
                            <p className="text-sm text-gray-600">จำนวน: <span className="font-medium">{item.quantity.toLocaleString()} ชิ้น</span></p>
                            <p className="text-xs text-gray-500 mt-1 italic">เหตุผล: {item.reason}</p>
                        </div>
                    ))}
                </div>
                 ) : (
                    <div className="text-center h-full flex flex-col justify-center items-center">
                        <CheckCircle2Icon className="w-12 h-12 text-green-500" />
                         <p className="mt-2 font-semibold text-gray-700">ทุกอย่างเรียบร้อยดี!</p>
                        <p className="text-sm text-gray-500">ไม่มีรายการผลิตที่จำเป็นในขณะนี้</p>
                    </div>
                )
            ) : (
                <div className="text-center h-full flex flex-col justify-center">
                    <p className="text-gray-600 mb-4">ให้ AI ช่วยวางแผนการผลิตสำหรับวันนี้ โดยพิจารณาจากออเดอร์, สต็อก และวัตถุดิบ</p>
                    <button onClick={handleGeneratePlan} className="bg-violet-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-violet-700 transition-colors inline-flex items-center justify-center gap-2">
                        <SparklesIcon className="w-5 h-5"/>
                        สร้างแผนสำหรับวันนี้
                    </button>
                </div>
            )}
        </StatCard>
    );
};


const UpcomingOrdersCard: React.FC<{ setActiveTab: (tab: Tab) => void }> = ({ setActiveTab }) => {
    const [orders, setOrders] = useState<OrderItem[]>([]);
    useEffect(() => {
        setOrders([...getOrders()].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 5));
    }, []);
    return (
        <StatCard title="ออเดอร์ใกล้ถึงกำหนดส่ง" icon={<ListOrderedIcon className="w-6 h-6 text-green-500" />} onClick={() => setActiveTab('production_plan')}>
            {orders.length > 0 ? (
                <ul className="space-y-3">
                    {orders.map(order => (
                        <li key={order.id} className="text-sm border-b border-gray-100 pb-2">
                            <p className="font-semibold text-gray-800 truncate">{order.name} ({order.color})</p>
                            <div className="flex justify-between items-center text-gray-500">
                                <span>จำนวน: {order.quantity.toLocaleString()} ชิ้น</span>
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
             <div className="text-center">
                <p className="text-4xl font-bold text-teal-600">{count}</p>
                <p className="text-gray-500">รายการ</p>
            </div>
        </StatCard>
    );
};

const ProductionSummaryCard: React.FC<{ setActiveTab: (tab: Tab) => void }> = () => {
    const [data, setData] = useState<{ name: string; Produced: number; Rejected: number }[]>([]);
    useEffect(() => {
        const logs = getMoldingLogs();
        const summary = logs.reduce((acc, log) => {
            const day = new Date(log.date).toLocaleDateString('th-TH', { weekday: 'short' });
            if (!acc[day]) acc[day] = { name: day, Produced: 0, Rejected: 0 };
            acc[day].Produced += log.quantityProduced;
            acc[day].Rejected += log.quantityRejected;
            return acc;
        }, {} as Record<string, { name: string; Produced: number; Rejected: number }>);
        setData(Object.values(summary).slice(-7));
    }, []);
    return (
        <StatCard title="สรุปการผลิต 7 วันล่าสุด" icon={<TrendingUpIcon className="w-6 h-6 text-indigo-500" />}>
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data}>
                    <XAxis dataKey="name" stroke="#888" fontSize={12} />
                    <YAxis />
                    <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }}/>
                    <Bar dataKey="Produced" fill="#4ade80" name="ผลิตได้" />
                    <Bar dataKey="Rejected" fill="#f87171" name="ของเสีย" />
                </BarChart>
            </ResponsiveContainer>
        </StatCard>
    );
};

const TopPackersCard: React.FC<{ setActiveTab: (tab: Tab) => void }> = ({ setActiveTab }) => {
    const [packers, setPackers] = useState<{ name: string; quantity: number }[]>([]);
    useEffect(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const logs = getPackingLogs().filter(log => new Date(log.date) > sevenDaysAgo);
        const summary = logs.reduce((acc, log) => {
            if (!acc[log.packerName]) acc[log.packerName] = 0;
            acc[log.packerName] += log.quantity;
            return acc;
        }, {} as Record<string, number>);
        setPackers(Object.entries(summary).map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 5));
    }, []);
    return (
        <StatCard title="ยอดแพ็คสูงสุด (7 วันล่าสุด)" icon={<TrophyIcon className="w-6 h-6 text-amber-500" />} onClick={() => setActiveTab('employees')}>
             {packers.length > 0 ? (
                <ul className="space-y-2">
                    {packers.map((packer, index) => (
                        <li key={packer.name} className="flex justify-between items-center text-sm">
                            <span className="font-semibold">{index + 1}. {packer.name}</span>
                            <span className="font-bold text-green-600">{packer.quantity.toLocaleString()} ชิ้น</span>
                        </li>
                    ))}
                </ul>
            ) : <p className="text-gray-500 text-center pt-8">ไม่มีข้อมูลการแพ็คใน 7 วันที่ผ่านมา</p>}
        </StatCard>
    );
};

const RawMaterialNeedsCard: React.FC<{ setActiveTab: (tab: Tab) => void }> = ({ setActiveTab }) => {
    const [needs, setNeeds] = useState<{ id: string; name: string; shortfall: number; unit: string }[]>([]);
    useEffect(() => {
        const orders = getOrders();
        const boms = getBOMs();
        const materials = getRawMaterials();
        const bomMap = new Map(boms.map(b => [b.productName, b.components]));
        const materialMap = new Map(materials.map(m => [m.id, m]));
        const required = new Map<string, number>();

        orders.forEach(order => {
            const bom = bomMap.get(`${order.name} (${order.color})`);
            if (bom) {
                bom.forEach(comp => {
                    required.set(comp.rawMaterialId, (required.get(comp.rawMaterialId) || 0) + (comp.quantity * order.quantity));
                });
            }
        });

        const shortfalls = Array.from(required.entries()).map(([id, quantity]) => {
            const material = materialMap.get(id);
            return { id, name: material?.name || 'N/A', shortfall: quantity - (material?.quantity || 0), unit: material?.unit || '' };
        }).filter(item => item.shortfall > 0).sort((a,b) => b.shortfall - a.shortfall).slice(0,5);
        setNeeds(shortfalls);
    }, []);

    return (
        <StatCard title="วัตถุดิบที่ต้องการด่วน" icon={<RouteIcon className="w-6 h-6 text-rose-500" />} onClick={() => setActiveTab('procurement')}>
            {needs.length > 0 ? (
                 <ul className="space-y-2">
                    {needs.map((item) => (
                        <li key={item.id} className="flex justify-between items-center text-sm border-b pb-1">
                            <span className="font-semibold text-gray-800">{item.name}</span>
                            <span className="font-bold text-red-500">ขาด {item.shortfall.toLocaleString(undefined, {maximumFractionDigits: 1})} {item.unit}</span>
                        </li>
                    ))}
                </ul>
            ) : <p className="text-gray-500 text-center pt-8">วัตถุดิบเพียงพอสำหรับออเดอร์ปัจจุบัน</p>}
        </StatCard>
    );
};

export const DashboardTab: React.FC<{ setActiveTab: (tab: Tab) => void }> = ({ setActiveTab }) => {
    const WIDGETS: Record<string, DashboardWidget> = {
        aiPlanner: { id: 'aiPlanner', title: 'AI Production Planner', Component: AIPlannerCard, gridSpan: 2 },
        aiInventoryForecast: { id: 'aiInventoryForecast', title: 'AI Inventory Forecast', Component: AIInventoryForecastCard, gridSpan: 1 },
        upcomingOrders: { id: 'upcomingOrders', title: 'Upcoming Orders', Component: UpcomingOrdersCard, gridSpan: 1 },
        pendingQc: { id: 'pendingQc', title: 'Pending QC', Component: PendingQcCard, gridSpan: 1 },
        lowStock: { id: 'lowStock', title: 'Low Stock', Component: LowStockCard, gridSpan: 1 },
        productionSummary: { id: 'productionSummary', title: 'Production Summary', Component: ProductionSummaryCard, gridSpan: 2 },
        topPackers: { id: 'topPackers', title: 'Top Packers', Component: TopPackersCard, gridSpan: 1 },
        rawMaterialNeeds: { id: 'rawMaterialNeeds', title: 'Raw Material Needs', Component: RawMaterialNeedsCard, gridSpan: 1 },
    };
    
    const [settings, setSettings] = useState<AppSettings>(getSettings());
    const [draggableWidgets, setDraggableWidgets] = useState<DashboardWidget[]>([]);
    const dragItem = useRef<string | null>(null);
    const dragOverItem = useRef<string | null>(null);

    // Initialize widgets based on user role
    useEffect(() => {
        const currentSettings = getSettings();
        setSettings(currentSettings);
        
        const userRoleLayout = currentSettings.dashboardLayouts[currentSettings.companyInfo.currentUserRoleId] || Object.keys(WIDGETS);
        const initialWidgets = userRoleLayout
            .map(id => WIDGETS[id])
            .filter(Boolean); // Filter out any undefined widgets if config is stale
        setDraggableWidgets(initialWidgets);
    }, []);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        dragItem.current = id;
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        dragOverItem.current = id;
        
        const dragItemIndex = draggableWidgets.findIndex(w => w.id === dragItem.current);
        const dragOverItemIndex = draggableWidgets.findIndex(w => w.id === dragOverItem.current);
        
        if (dragItemIndex === -1 || dragOverItemIndex === -1) return;

        const newWidgets = [...draggableWidgets];
        const [reorderedItem] = newWidgets.splice(dragItemIndex, 1);
        newWidgets.splice(dragOverItemIndex, 0, reorderedItem);
        
        setDraggableWidgets(newWidgets);
        dragItem.current = null;
        dragOverItem.current = null;
        
        // Save new layout to settings
        const newLayoutOrder = newWidgets.map(w => w.id);
        const newSettings = {
            ...settings,
            dashboardLayouts: {
                ...settings.dashboardLayouts,
                [settings.companyInfo.currentUserRoleId]: newLayoutOrder,
            }
        };
        saveSettings(newSettings);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">ภาพรวมระบบ</h2>
                <button
                    onClick={() => {}}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                    <SettingsIcon className="w-5 h-5"/>
                    ปรับแต่งแดชบอร์ด
                </button>
            </div>
            {draggableWidgets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {draggableWidgets.map(widget => (
                        <div 
                            key={widget.id} 
                            draggable
                            onDragStart={e => handleDragStart(e, widget.id)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => handleDrop(e, widget.id)}
                            className={`relative group ${widget.gridSpan === 2 ? 'xl:col-span-2' : ''}`}
                        >
                             <div className="absolute -top-2 -left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onMouseDown={e => e.stopPropagation()} className="cursor-grab p-1 bg-gray-200 rounded-full text-gray-500 hover:bg-gray-300">
                                    <GripVerticalIcon className="w-4 h-4"/>
                                </button>
                             </div>
                            <widget.Component setActiveTab={setActiveTab} />
                        </div>
                    ))}
                </div>
            ) : (
                <p>No widgets configured for this role.</p>
            )}
        </div>
    );
};