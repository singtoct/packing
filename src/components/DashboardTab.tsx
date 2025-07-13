
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getOrders, getPackingLogs, getInventory, getQCEntries, getMoldingLogs, getBOMs, getRawMaterials, getDashboardLayout, saveDashboardLayout, getMachines } from '../services/storageService';
import { generateProductionPlan } from '../services/geminiService';
import { OrderItem, PackingLogEntry, InventoryItem, QCEntry, MoldingLogEntry, AIProductionPlanItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ListOrderedIcon, AlertTriangleIcon, TrophyIcon, TrendingUpIcon, CheckCircle2Icon, ClipboardCheckIcon, FactoryIcon, RouteIcon, ExternalLinkIcon, SettingsIcon, XCircleIcon, GripVerticalIcon, SparklesIcon, LoaderIcon } from './icons/Icons';

type Tab = 'dashboard' | 'orders' | 'logs' | 'inventory' | 'stats' | 'qc' | 'molding' | 'production_status' | 'employees' | 'reports' | 'procurement' | 'analysis' | 'raw_materials';

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

const AIPlannerCard: React.FC = () => {
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
             <div className="text-center">
                <p className="text-4xl font-bold text-teal-600">{count}</p>
                <p className="text-gray-500">รายการ</p>
            </div>
        </StatCard>
    );
};

const ProductionSummaryCard: React.FC = () => {
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
        <StatCard title="พนักงานแพ็คดีเด่น (7 วัน)" icon={<TrophyIcon className="w-6 h-6 text-amber-500" />} onClick={() => setActiveTab('employees')}>
             {packers.length > 0 ? (
                <ul className="space-y-2">
                    {packers.map((packer, index) => (
                        <li key={packer.name} className="flex justify-between items-center text-sm">
                            <span className="font-semibold">{index + 1}. {packer.name}</span>
                            <span className="font-bold text-green-600">{packer.quantity.toLocaleString()} ลัง</span>
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
        aiPlanner: { id: 'aiPlanner', title: 'AI Production Planner', Component: AIPlannerCard, gridSpan: 3 },
        upcomingOrders: { id: 'upcomingOrders', title: 'Upcoming Orders', Component: UpcomingOrdersCard, gridSpan: 1 },
        pendingQc: { id: 'pendingQc', title: 'Pending QC', Component: PendingQcCard, gridSpan: 1 },
        lowStock: { id: 'lowStock', title: 'Low Stock', Component: LowStockCard, gridSpan: 1 },
        productionSummary: { id: 'productionSummary', title: 'Production Summary', Component: ProductionSummaryCard, gridSpan: 2 },
        topPackers: { id: 'topPackers', title: 'Top Packers (Last 7 Days)', Component: TopPackersCard, gridSpan: 1 },
        rawMaterialNeeds: { id: 'rawMaterialNeeds', title: 'Raw Material Needs', Component: RawMaterialNeedsCard, gridSpan: 3 },
    };
    
    const DEFAULT_LAYOUT = ['aiPlanner', 'upcomingOrders', 'pendingQc', 'lowStock', 'productionSummary', 'topPackers', 'rawMaterialNeeds'];
    
    const [layout, setLayout] = useState<string[]>(getDashboardLayout() || DEFAULT_LAYOUT);
    const [isCustomizeMode, setIsCustomizeMode] = useState(false);
    
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragItem.current = position;
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragOverItem.current = position;
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        
        const newLayout = [...layout];
        const dragItemContent = newLayout[dragItem.current];
        newLayout.splice(dragItem.current, 1);
        newLayout.splice(dragOverItem.current, 0, dragItemContent);
        
        dragItem.current = null;
        dragOverItem.current = null;
        
        setLayout(newLayout);
    };

    const handleSaveLayout = () => {
        saveDashboardLayout(layout);
        setIsCustomizeMode(false);
    };

    const handleResetLayout = () => {
        setLayout(DEFAULT_LAYOUT);
        saveDashboardLayout(DEFAULT_LAYOUT);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">ภาพรวมระบบ</h2>
                <div>
                    {isCustomizeMode ? (
                        <div className="flex gap-2">
                             <button onClick={handleResetLayout} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                                รีเซ็ต
                            </button>
                            <button onClick={handleSaveLayout} className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700">
                                บันทึก Layout
                            </button>
                        </div>
                    ) : (
                         <button onClick={() => setIsCustomizeMode(true)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5"/>
                            ปรับแต่ง
                        </button>
                    )}
                </div>
            </div>
            {isCustomizeMode && (
                <div className="p-4 mb-6 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded-md">
                    <h3 className="font-bold">โหมดปรับแต่ง</h3>
                    <p className="text-sm">ลากและวางการ์ดเพื่อจัดเรียงตามที่คุณต้องการ จากนั้นกดบันทึก</p>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
                {layout.map((widgetId, index) => {
                    const widget = WIDGETS[widgetId];
                    if (!widget) return null;
                    const gridSpanClass = {
                        1: 'lg:col-span-1',
                        2: 'lg:col-span-2',
                        3: 'lg:col-span-3',
                    }[widget.gridSpan || 1] || 'lg:col-span-1';
                    
                    const mdGridSpanClass = widget.gridSpan === 3 ? 'md:col-span-2' : 'md:col-span-1';

                    return (
                        <div
                            key={widget.id}
                            className={`${gridSpanClass} ${mdGridSpanClass} ${isCustomizeMode ? 'cursor-move' : ''}`}
                            draggable={isCustomizeMode}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDragEnd={handleDrop}
                        >
                            <div className="h-full relative">
                                {isCustomizeMode && (
                                     <div className="absolute top-2 left-2 z-10 p-2 bg-gray-800 text-white rounded-full cursor-grab">
                                        <GripVerticalIcon className="w-5 h-5" />
                                     </div>
                                )}
                                <widget.Component setActiveTab={setActiveTab} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
