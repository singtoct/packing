import React, { useState, useEffect, useMemo } from 'react';
import { getMoldingLogs, getEmployees, getSettings, getPurchaseOrders, getRawMaterials } from '../services/storageService';
import { MoldingLogEntry, Employee, PurchaseOrder, RawMaterial, AppSettings } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FactoryIcon, ShoppingCartIcon, TruckIcon } from 'lucide-react';

type StatView = 'production' | 'shipping' | 'purchasing';
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#34d399', '#60a5fa', '#fbbf24'];

const StatCard: React.FC<{ title: string; value: string | number; description?: string }> = ({ title, value, description }) => (
    <div className="bg-white p-4 rounded-lg shadow border">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {description && <p className="text-xs text-gray-400">{description}</p>}
    </div>
);

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't render label for small slices
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const ProductionStats: React.FC = () => {
    const [logs, setLogs] = useState<MoldingLogEntry[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [dateRange, setDateRange] = useState(30);
    const [selectedOperator, setSelectedOperator] = useState('All');

    useEffect(() => {
        const loadData = async () => {
            setLogs(await getMoldingLogs());
            setEmployees(await getEmployees());
        };
        loadData();
    }, []);

    const filteredLogs = useMemo(() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - Number(dateRange));
        
        return logs.filter(log => {
            const logDate = new Date(log.date);
            const dateMatch = dateRange === 0 || (logDate >= startDate && logDate <= endDate);
            const operatorMatch = selectedOperator === 'All' || log.operatorName === selectedOperator;
            return dateMatch && operatorMatch;
        });
    }, [logs, dateRange, selectedOperator]);

    const topProductsData = useMemo(() => {
        const aggregated = filteredLogs.reduce((acc, log) => {
            acc[log.productName] = (acc[log.productName] || 0) + log.quantityProduced;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(aggregated).map(([name, quantity]) => ({ name, quantity }))
            .sort((a,b) => b.quantity - a.quantity)
            .slice(0, 10);
    }, [filteredLogs]);
    
    const operatorNames = useMemo(() => {
        const names = new Set(logs.map(l => l.operatorName));
        return employees.filter(e => names.has(e.name));
    }, [logs, employees]);

    return (
        <div className="space-y-6">
            <div className="flex gap-4 items-center p-4 bg-gray-50 rounded-lg">
                <select value={dateRange} onChange={e => setDateRange(Number(e.target.value))} className="p-2 border rounded-md">
                    <option value={7}>7 วันล่าสุด</option>
                    <option value={30}>30 วันล่าสุด</option>
                    <option value={90}>90 วันล่าสุด</option>
                    <option value={0}>ทั้งหมด</option>
                </select>
                <select value={selectedOperator} onChange={e => setSelectedOperator(e.target.value)} className="p-2 border rounded-md">
                    <option value="All">ผู้ควบคุมทั้งหมด</option>
                    {operatorNames.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                </select>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border">
                <h3 className="font-bold mb-4">สินค้าที่ผลิตเยอะที่สุด (หน่วย: ชิ้น)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topProductsData} layout="vertical" margin={{ left: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => `${value.toLocaleString()} ชิ้น`}/>
                        <Legend />
                        <Bar dataKey="quantity" name="จำนวน (ชิ้น)" fill="#10b981" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const ShippingStats: React.FC = () => {
    const [logs, setLogs] = useState<MoldingLogEntry[]>([]);
    const [settings, setSettings] = useState<AppSettings | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setLogs(await getMoldingLogs());
            setSettings(await getSettings());
        };
        loadData();
    }, []);

    const summaryData = useMemo(() => {
        if (!settings) return { finished: 0, inFinalStage: 0, inProgress: 0, topFinished: [] };

        const productionStatuses = settings.productionStatuses;
        const finalStage = productionStatuses.length > 0 ? (productionStatuses[productionStatuses.length - 1].startsWith('รอ') ? productionStatuses[productionStatuses.length - 1] : `รอ${productionStatuses[productionStatuses.length - 1]}`) : 'รอแพ็ค';
        
        let finished = 0;
        let inFinalStage = 0;
        let inProgress = 0;
        const topFinishedProducts = new Map<string, number>();

        logs.forEach(log => {
            if (log.status === 'เสร็จสิ้น') {
                finished += Number(log.quantityProduced);
                topFinishedProducts.set(log.productName, (topFinishedProducts.get(log.productName) || 0) + Number(log.quantityProduced));
            } else if (log.status === finalStage) {
                inFinalStage += Number(log.quantityProduced);
            } else {
                inProgress += Number(log.quantityProduced);
            }
        });

        return {
            finished,
            inFinalStage,
            inProgress,
            topFinished: Array.from(topFinishedProducts.entries()).map(([name, quantity]) => ({name, quantity})).sort((a,b) => b.quantity - a.quantity).slice(0,5)
        };
    }, [logs, settings]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="ผลิตเสร็จสิ้น (พร้อมส่ง)" value={summaryData.finished.toLocaleString()} description="ชิ้น" />
                <StatCard title="อยู่ในขั้นตอนสุดท้าย" value={summaryData.inFinalStage.toLocaleString()} description="ชิ้น" />
                <StatCard title="กำลังอยู่ในสายการผลิต" value={summaryData.inProgress.toLocaleString()} description="ชิ้น" />
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
                <h3 className="font-bold mb-4">Top 5 สินค้าที่ผลิตเสร็จแล้ว (หน่วย: ชิ้น)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={summaryData.topFinished} dataKey="quantity" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={renderCustomizedLabel} labelLine={false}>
                             {summaryData.topFinished.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toLocaleString()} ชิ้น`}/>
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const PurchasingStats: React.FC = () => {
    const [POs, setPOs] = useState<PurchaseOrder[]>([]);
    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

    useEffect(() => {
        const loadData = async () => {
            setPOs(await getPurchaseOrders());
            setRawMaterials(await getRawMaterials());
        };
        loadData();
    }, []);
    
    const materialMap = useMemo(() => new Map(rawMaterials.map(rm => [rm.id, rm])), [rawMaterials]);

    const summaryData = useMemo(() => {
        let totalPcsPurchased = 0;
        const byMaterial = new Map<string, number>();

        POs.forEach(po => {
            po.items.forEach(item => {
                const material = materialMap.get(item.rawMaterialId);
                if (material && (material.unit.toLowerCase() === 'pcs.' || material.unit === 'ชิ้น')) {
                    totalPcsPurchased += item.quantity;
                    byMaterial.set(material.name, (byMaterial.get(material.name) || 0) + item.quantity);
                }
            });
        });
        
        return {
            totalPcsPurchased,
            topMaterials: Array.from(byMaterial.entries()).map(([name, quantity]) => ({name, quantity})).sort((a,b) => b.quantity - a.quantity).slice(0,10),
        };
    }, [POs, materialMap]);
    
    return (
        <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="ยอดสั่งซื้อรวม (หน่วย: ชิ้น)" value={summaryData.totalPcsPurchased.toLocaleString()} description="นับเฉพาะวัตถุดิบที่มีหน่วยเป็น Pcs. หรือ ชิ้น" />
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
                <h3 className="font-bold mb-4">Top 10 วัตถุดิบที่สั่งซื้อเยอะที่สุด (หน่วย: ชิ้น)</h3>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summaryData.topMaterials} layout="vertical" margin={{left: 100}}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => `${value.toLocaleString()} ชิ้น`}/>
                        <Legend />
                        <Bar dataKey="quantity" name="จำนวน (ชิ้น)" fill="#8b5cf6" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export const StatisticsTab: React.FC = () => {
    const [activeView, setActiveView] = useState<StatView>('production');
    
    const ViewButton: React.FC<{ view: StatView, label: string, icon: React.ReactNode }> = ({ view, label, icon }) => (
        <button
            onClick={() => setActiveView(view)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeView === view
                    ? 'bg-green-600 text-white shadow'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    const renderContent = () => {
        switch (activeView) {
            case 'production': return <ProductionStats />;
            case 'shipping': return <ShippingStats />;
            case 'purchasing': return <PurchasingStats />;
            default: return null;
        }
    };

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold">สถิติและข้อมูลเชิงลึก (หน่วย: ชิ้น)</h2>
                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                    <ViewButton view="production" label="การผลิต" icon={<FactoryIcon className="w-5 h-5"/>} />
                    <ViewButton view="shipping" label="สถานะสินค้าพร้อมส่ง" icon={<TruckIcon className="w-5 h-5"/>} />
                    <ViewButton view="purchasing" label="การจัดซื้อ" icon={<ShoppingCartIcon className="w-5 h-5"/>} />
                </div>
            </div>
            {renderContent()}
        </div>
    );
};