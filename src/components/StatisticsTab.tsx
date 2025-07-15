
import React, { useState, useEffect, useMemo } from 'react';
import { getPackingLogs, getEmployees, getMoldingLogs, getMachines, getShipments, getPurchaseOrders, getRawMaterials, getSuppliers } from '../services/storageService';
import { PackingLogEntry, Employee, MoldingLogEntry, Machine, Shipment, PurchaseOrder } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BoxIcon, FactoryIcon, ShoppingCartIcon, TruckIcon } from './icons/Icons';

type StatView = 'packing' | 'molding' | 'shipping' | 'purchasing';
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

// --- Child Components for each stat view ---

const PackingStats: React.FC = () => {
    const [logs, setLogs] = useState<PackingLogEntry[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [dateRange, setDateRange] = useState(30);
    const [selectedPacker, setSelectedPacker] = useState('All');

    useEffect(() => {
        setLogs(getPackingLogs());
        setEmployees(getEmployees());
    }, []);

    const filteredLogs = useMemo(() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - dateRange);
        
        return logs.filter(log => {
            const logDate = new Date(log.date);
            const dateMatch = dateRange === 0 || (logDate >= startDate && logDate <= endDate);
            const packerMatch = selectedPacker === 'All' || log.packerName === selectedPacker;
            return dateMatch && packerMatch;
        });
    }, [logs, dateRange, selectedPacker]);

    const topProductsData = useMemo(() => {
        const aggregated = filteredLogs.reduce((acc, log) => {
            acc[log.name] = (acc[log.name] || 0) + log.quantity;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(aggregated).map(([name, quantity]) => ({ name, quantity }))
            .sort((a,b) => b.quantity - a.quantity)
            .slice(0, 10);
    }, [filteredLogs]);

    return (
        <div className="space-y-6">
            <div className="flex gap-4 items-center p-4 bg-gray-50 rounded-lg">
                <select value={dateRange} onChange={e => setDateRange(Number(e.target.value))} className="p-2 border rounded-md">
                    <option value={7}>7 วันล่าสุด</option>
                    <option value={30}>30 วันล่าสุด</option>
                    <option value={90}>90 วันล่าสุด</option>
                    <option value={0}>ทั้งหมด</option>
                </select>
                <select value={selectedPacker} onChange={e => setSelectedPacker(e.target.value)} className="p-2 border rounded-md">
                    <option value="All">พนักงานทั้งหมด</option>
                    {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                </select>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border">
                <h3 className="font-bold mb-4">สินค้าที่แพ็คเยอะที่สุด</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topProductsData} layout="vertical" margin={{ left: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="quantity" name="จำนวน (ลัง)" fill="#10b981" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const MoldingStats: React.FC = () => {
    const [logs, setLogs] = useState<MoldingLogEntry[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [dateRange, setDateRange] = useState(30);

    useEffect(() => {
        setLogs(getMoldingLogs());
        setEmployees(getEmployees());
        setMachines(getMachines());
    }, []);
    
    const filteredLogs = useMemo(() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - dateRange);
        
        return logs.filter(log => {
            const logDate = new Date(log.date);
            return dateRange === 0 || (logDate >= startDate && logDate <= endDate);
        });
    }, [logs, dateRange]);

    const summaryData = useMemo(() => {
        const byProduct = filteredLogs.reduce((acc, log) => {
            const key = log.productName;
            acc[key] = (acc[key] || 0) + log.quantityProduced;
            return acc;
        }, {} as Record<string, number>);

        const byMachine = filteredLogs.reduce((acc, log) => {
             const key = log.machine;
             if(!acc[key]) acc[key] = { produced: 0, rejected: 0};
             acc[key].produced += log.quantityProduced;
             acc[key].rejected += log.quantityRejected;
             return acc;
        }, {} as Record<string, {produced: number, rejected: number}>);

        const totalProduced = filteredLogs.reduce((sum, log) => sum + log.quantityProduced, 0);
        const totalRejected = filteredLogs.reduce((sum, log) => sum + log.quantityRejected, 0);

        return {
            topProducts: Object.entries(byProduct).map(([name, quantity]) => ({ name, quantity })).sort((a,b) => b.quantity - a.quantity).slice(0, 5),
            machinePerf: Object.entries(byMachine).map(([name, data]) => ({ name, ...data, rejectRate: data.produced > 0 ? data.rejected / data.produced : 0 })).sort((a,b) => b.produced - a.produced),
            totalProduced,
            totalRejected
        };
    }, [filteredLogs]);

    return (
        <div className="space-y-6">
            <div className="flex gap-4 items-center p-4 bg-gray-50 rounded-lg">
                 <select value={dateRange} onChange={e => setDateRange(Number(e.target.value))} className="p-2 border rounded-md">
                    <option value={7}>7 วันล่าสุด</option>
                    <option value={30}>30 วันล่าสุด</option>
                    <option value={90}>90 วันล่าสุด</option>
                    <option value={0}>ทั้งหมด</option>
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="ผลิตได้ทั้งหมด" value={summaryData.totalProduced.toLocaleString()} description="ชิ้น" />
                <StatCard title="ของเสียทั้งหมด" value={summaryData.totalRejected.toLocaleString()} description="ชิ้น" />
                <StatCard title="อัตราของเสียรวม" value={`${(summaryData.totalProduced > 0 ? (summaryData.totalRejected / summaryData.totalProduced) * 100 : 0).toFixed(2)}%`} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow border">
                    <h3 className="font-bold mb-4">Top 5 สินค้าที่ผลิตเยอะที่สุด</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={summaryData.topProducts} dataKey="quantity" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={renderCustomizedLabel} labelLine={false}>
                                {summaryData.topProducts.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                 <div className="bg-white p-4 rounded-lg shadow border">
                    <h3 className="font-bold mb-4">ประสิทธิภาพเครื่องจักร (เรียงตามจำนวนผลิต)</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={summaryData.machinePerf} margin={{left: 20}}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tickFormatter={(value) => `${(value*100).toFixed(0)}%`} />
                            <Tooltip />
                            <Legend />
                            <Bar yAxisId="left" dataKey="produced" name="ผลิตได้" fill="#8884d8" />
                            <Bar yAxisId="left" dataKey="rejected" name="ของเสีย" fill="#f87171" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

const ShippingStats: React.FC = () => {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    
    useEffect(() => {
        setShipments(getShipments());
    }, []);

    const summaryData = useMemo(() => {
        const byStatus = shipments.reduce((acc, ship) => {
            acc[ship.status] = (acc[ship.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const byCarrier = shipments.reduce((acc, ship) => {
            acc[ship.carrier] = (acc[ship.carrier] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return {
            total: shipments.length,
            inTransit: byStatus['In Transit'] || 0,
            delivered: byStatus['Delivered'] || 0,
            delayed: byStatus['Delayed'] || 0,
            topCarriers: Object.entries(byCarrier).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value).slice(0,5),
        }
    }, [shipments]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="การจัดส่งทั้งหมด" value={summaryData.total} />
                <StatCard title="กำลังจัดส่ง" value={summaryData.inTransit} />
                <StatCard title="ส่งแล้ว" value={summaryData.delivered} />
                <StatCard title="ล่าช้า" value={summaryData.delayed} />
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
                <h3 className="font-bold mb-4">สัดส่วนบริษัทขนส่ง</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={summaryData.topCarriers} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                             {summaryData.topCarriers.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip/>
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const PurchasingStats: React.FC = () => {
    const [POs, setPOs] = useState<PurchaseOrder[]>([]);
    const suppliers = getSuppliers();
    const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);

    useEffect(() => {
        setPOs(getPurchaseOrders());
    }, []);

    const summaryData = useMemo(() => {
        const totalValue = POs.reduce((sum, po) => sum + po.items.reduce((itemSum, item) => itemSum + (item.quantity * item.unitPrice), 0), 0);

        const bySupplier = POs.reduce((acc, po) => {
            const supplierName = supplierMap.get(po.supplierId) || 'Unknown';
            const poValue = po.items.reduce((itemSum, item) => itemSum + (item.quantity * item.unitPrice), 0);
            acc[supplierName] = (acc[supplierName] || 0) + poValue;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalValue,
            topSuppliers: Object.entries(bySupplier).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value).slice(0,5),
        };
    }, [POs, supplierMap]);
    
    return (
        <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="ใบสั่งซื้อทั้งหมด" value={POs.length.toLocaleString()} />
                <StatCard title="มูลค่าการสั่งซื้อรวม" value={summaryData.totalValue.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })} />
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
                <h3 className="font-bold mb-4">Top 5 ซัพพลายเออร์ (ตามมูลค่าสั่งซื้อ)</h3>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summaryData.topSuppliers} margin={{left: 20}}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(val) => `${(val/1000).toLocaleString()}k`} />
                        <Tooltip formatter={(value: number) => value.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}/>
                        <Legend />
                        <Bar dataKey="value" name="มูลค่าสั่งซื้อ" fill="#8b5cf6" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export const StatisticsTab: React.FC = () => {
    const [activeView, setActiveView] = useState<StatView>('packing');
    
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
            case 'packing': return <PackingStats />;
            case 'molding': return <MoldingStats />;
            case 'shipping': return <ShippingStats />;
            case 'purchasing': return <PurchasingStats />;
            default: return null;
        }
    };

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold">สถิติและข้อมูลเชิงลึก</h2>
                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                    <ViewButton view="packing" label="การแพ็ค" icon={<BoxIcon className="w-5 h-5"/>} />
                    <ViewButton view="molding" label="การผลิต" icon={<FactoryIcon className="w-5 h-5"/>} />
                    <ViewButton view="shipping" label="การจัดส่ง" icon={<TruckIcon className="w-5 h-5"/>} />
                    <ViewButton view="purchasing" label="การจัดซื้อ" icon={<ShoppingCartIcon className="w-5 h-5"/>} />
                </div>
            </div>
            {renderContent()}
        </div>
    );
};
