

import React, { useState, useEffect } from 'react';
import { getOrders, getPackingLogs, getInventory, getQCEntries, getMoldingLogs } from '../services/storageService';
import { OrderItem, PackingLogEntry, InventoryItem, QCEntry, MoldingLogEntry } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ListOrderedIcon, AlertTriangleIcon, TrophyIcon, TrendingUpIcon, CheckCircle2Icon, ClipboardCheckIcon, FactoryIcon, RouteIcon } from './icons/Icons';

type Tab = 'dashboard' | 'orders' | 'logs' | 'inventory' | 'stats' | 'qc' | 'molding' | 'production_status' | 'employees' | 'reports';

const StatCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; onClick?: () => void; className?: string }> = ({ title, icon, children, onClick, className = '' }) => (
    <div 
      className={`bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col ${onClick ? 'cursor-pointer hover:shadow-xl hover:border-blue-300 transition-all duration-300' : ''} ${className}`}
      onClick={onClick}
    >
        <div className="flex items-center gap-3 mb-4">
            {icon}
            <h3 className="text-lg font-bold text-gray-700">{title}</h3>
        </div>
        <div className="flex-grow flex flex-col justify-center">{children}</div>
    </div>
);

export const DashboardTab: React.FC<{ setActiveTab: (tab: Tab) => void }> = ({ setActiveTab }) => {
    const [upcomingOrders, setUpcomingOrders] = useState<OrderItem[]>([]);
    const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
    const [packingSummary, setPackingSummary] = useState<{ date: string; quantity: number }[]>([]);
    const [topPacker, setTopPacker] = useState<{ name: string; quantity: number } | null>(null);
    const [pendingQCCount, setPendingQCCount] = useState(0);
    const [moldingTodayCount, setMoldingTodayCount] = useState(0);
    const [wipCount, setWipCount] = useState(0);

    useEffect(() => {
        const fetchData = () => {
            const orders = getOrders();
            const logs = getPackingLogs();
            const inventory = getInventory();
            const qcEntries = getQCEntries();
            const moldingLogs = getMoldingLogs();
            
            setUpcomingOrders([...orders].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 5));
            setLowStockItems(inventory.filter(item => item.minStock !== undefined && item.quantity < item.minStock));
            setPendingQCCount(qcEntries.filter(e => e.status === 'Pending').length);

            const todayStr = new Date().toISOString().split('T')[0];
            const todayMoldingLogs = moldingLogs.filter(log => log.date === todayStr);
            setMoldingTodayCount(todayMoldingLogs.reduce((sum, log) => sum + log.quantityProduced, 0));
            setWipCount(moldingLogs.filter(log => log.status && log.status !== 'เสร็จสิ้น').length);


            const sevenDaysAgo = new Date();
            sevenDaysAgo.setHours(0, 0, 0, 0);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
            
            const recentLogs = logs.filter(log => new Date(log.date) >= sevenDaysAgo);

            const summaryMap = new Map<string, number>();
            for (let i = 0; i < 7; i++) {
                const d = new Date(sevenDaysAgo);
                d.setDate(d.getDate() + i);
                const key = d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
                summaryMap.set(key, 0);
            }

            recentLogs.forEach(log => {
                const key = new Date(log.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
                if (summaryMap.has(key)) {
                    summaryMap.set(key, summaryMap.get(key)! + log.quantity);
                }
            });
            setPackingSummary(Array.from(summaryMap.entries()).map(([date, quantity]) => ({ date, quantity })));

            const packerStats = recentLogs.reduce((acc, log) => {
                acc[log.packerName] = (acc[log.packerName] || 0) + log.quantity;
                return acc;
            }, {} as Record<string, number>);

            const top = Object.entries(packerStats).sort(([, a], [, b]) => b - a)[0];
            setTopPacker(top ? { name: top[0], quantity: top[1] } : null);
        };

        fetchData();
        window.addEventListener('storage', fetchData);
        return () => window.removeEventListener('storage', fetchData);
    }, []);

    return (
        <div>
            <h2 className="text-3xl font-bold mb-8 text-gray-800">แดชบอร์ดภาพรวม</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <StatCard title="ออเดอร์ใกล้ถึงกำหนดส่ง" icon={<ListOrderedIcon className="w-6 h-6 text-blue-500" />} onClick={() => setActiveTab('orders')}>
                    {upcomingOrders.length > 0 ? (
                        <ul className="space-y-3">
                            {upcomingOrders.map(order => (
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
                
                <StatCard title="รายการสต็อกต่ำ" icon={<AlertTriangleIcon className="w-6 h-6 text-yellow-500" />} onClick={() => setActiveTab('inventory')}>
                    {lowStockItems.length > 0 ? (
                        <ul className="space-y-3">
                            {lowStockItems.slice(0, 5).map(item => (
                                <li key={item.name} className="text-sm border-b border-gray-100 pb-2">
                                    <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                                    <p className="text-red-600 font-bold">มี: {item.quantity} (ขั้นต่ำ: {item.minStock})</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-green-600">
                           <CheckCircle2Icon className="w-12 h-12 mb-2"/>
                           <p className="font-semibold">สต็อกสินค้าปกติ</p>
                        </div>
                    )}
                </StatCard>
                
                <StatCard title="รอตรวจสอบคุณภาพ (QC)" icon={<ClipboardCheckIcon className="w-6 h-6 text-purple-500" />} onClick={() => setActiveTab('qc')}>
                    {pendingQCCount > 0 ? (
                        <div className="text-center">
                            <p className="text-4xl font-bold text-purple-600">{pendingQCCount}</p>
                            <p className="text-lg text-purple-800">รายการ</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-green-600">
                           <CheckCircle2Icon className="w-12 h-12 mb-2"/>
                           <p className="font-semibold">ไม่มีรายการรอตรวจสอบ</p>
                        </div>
                    )}
                </StatCard>
                
                <StatCard title="ยอดผลิต (แผนกฉีด)" icon={<FactoryIcon className="w-6 h-6 text-slate-500" />} onClick={() => setActiveTab('molding')}>
                     <div className="text-center">
                        <p className="text-4xl font-bold text-slate-600">{moldingTodayCount.toLocaleString()}</p>
                        <p className="text-lg text-slate-800">ชิ้น (วันนี้)</p>
                    </div>
                </StatCard>

                 <StatCard title="งานระหว่างผลิต (WIP)" icon={<RouteIcon className="w-6 h-6 text-cyan-500" />} onClick={() => setActiveTab('production_status')}>
                    <div className="text-center">
                        <p className="text-4xl font-bold text-cyan-600">{wipCount}</p>
                        <p className="text-lg text-cyan-800">ล็อต</p>
                    </div>
                </StatCard>
                
                <StatCard title="พนักงานดีเด่น (7 วัน)" icon={<TrophyIcon className="w-6 h-6 text-amber-500" />} onClick={() => setActiveTab('stats')} className="bg-amber-50">
                    {topPacker ? (
                        <div className="text-center">
                            <div className="bg-amber-400 rounded-full p-3 mb-2 inline-block">
                                <TrophyIcon className="w-8 h-8 text-white"/>
                            </div>
                            <p className="text-xl font-bold text-amber-900">{topPacker.name}</p>
                            <p className="text-lg text-amber-700">แพ็คได้ {topPacker.quantity} ลัง</p>
                        </div>
                    ) : <p className="text-gray-500 text-center">ไม่มีข้อมูล</p>}
                </StatCard>

                <StatCard title="ยอดแพ็ค 7 วันล่าสุด" icon={<TrendingUpIcon className="w-6 h-6 text-green-500" />} onClick={() => setActiveTab('stats')} className="col-span-1 sm:col-span-2 lg:col-span-2">
                    {packingSummary.reduce((sum, item) => sum + item.quantity, 0) > 0 ? (
                        <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                            <BarChart data={packingSummary} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                <YAxis allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: '0.5rem', fontSize: '12px' }} />
                                <Bar dataKey="quantity" name="จำนวน" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-gray-500 text-center">ไม่มีข้อมูลการแพ็คใน 7 วันล่าสุด</p>}
                </StatCard>
            </div>
        </div>
    );
};
