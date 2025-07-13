import React, { useMemo, useState } from 'react';
import { getMoldingLogs, getProducts } from '../services/storageService';
import { MoldingLogEntry, Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { DollarSignIcon, PieChartIcon } from './icons/Icons';

interface ProfitabilityData {
    productName: string;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
    unitsProduced: number;
}

const StatCard: React.FC<{ title: string; value: string; className?: string }> = ({ title, value, className }) => (
    <div className={`p-4 bg-white rounded-lg shadow border ${className}`}>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
    </div>
);


export const ProfitabilityAnalysisTab: React.FC = () => {
    const [dateRange, setDateRange] = useState({
        start: '',
        end: new Date().toISOString().split('T')[0],
    });

    const profitabilityData = useMemo((): ProfitabilityData[] => {
        const logs = getMoldingLogs();
        const products = getProducts();
        const productMap = new Map(products.map(p => [`${p.name} (${p.color})`, p]));
        
        const data = new Map<string, { totalProduced: number; totalCost: number; salePrice: number; date: string }>();

        logs.forEach(log => {
            if (!log.materialCost) return;
            
            const product = productMap.get(log.productName);
            
            if (product) {
                const existing = data.get(log.productName) || { totalProduced: 0, totalCost: 0, salePrice: product.salePrice, date: log.date };
                existing.totalProduced += log.quantityProduced;
                existing.totalCost += log.materialCost;
                if(new Date(log.date) > new Date(existing.date)) {
                    existing.date = log.date;
                }
                data.set(log.productName, existing);
            }
        });
        
        return Array.from(data.entries()).map(([productName, values]) => {
            const totalRevenue = values.totalProduced * values.salePrice;
            const totalProfit = totalRevenue - values.totalCost;
            const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) : 0;
            return {
                productName,
                totalRevenue,
                totalCost: values.totalCost,
                totalProfit,
                profitMargin,
                unitsProduced: values.totalProduced,
            };
        });
    }, []);

    const filteredData = useMemo(() => {
        return profitabilityData.filter(item => {
            const log = getMoldingLogs().find(log => log.productName === item.productName);
            if(!log) return false;
            
            const recordDate = new Date(log.date);
            const startDate = dateRange.start ? new Date(dateRange.start) : null;
            const endDate = dateRange.end ? new Date(dateRange.end) : null;
            if (endDate) endDate.setHours(23, 59, 59, 999);

            return (!startDate || recordDate >= startDate) && (!endDate || recordDate <= endDate);
        });
    }, [profitabilityData, dateRange]);

    const overallStats = useMemo(() => {
        const totalRevenue = filteredData.reduce((sum, item) => sum + item.totalRevenue, 0);
        const totalCost = filteredData.reduce((sum, item) => sum + item.totalCost, 0);
        const totalProfit = totalRevenue - totalCost;
        const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        return { totalRevenue, totalCost, totalProfit, avgMargin };
    }, [filteredData]);

    const chartData = useMemo(() => {
        return [...filteredData].sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 10);
    }, [filteredData]);
    
    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">วิเคราะห์กำไร</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border mb-8">
                <div>
                    <label className="text-sm font-medium">จากวันที่</label>
                    <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="mt-1 w-full p-2 border rounded"/>
                </div>
                <div>
                    <label className="text-sm font-medium">ถึงวันที่</label>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="mt-1 w-full p-2 border rounded"/>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="รายรับรวม" value={overallStats.totalRevenue.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })} className="border-green-300" />
                <StatCard title="ต้นทุนรวม" value={overallStats.totalCost.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })} className="border-red-300" />
                <StatCard title="กำไรสุทธิ" value={overallStats.totalProfit.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })} className="border-blue-300" />
                <StatCard title="อัตรากำไรเฉลี่ย" value={`${overallStats.avgMargin.toFixed(2)}%`} className="border-indigo-300" />
            </div>

            <div className="mb-8 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">10 อันดับสินค้าทำกำไรสูงสุด</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => value.toLocaleString()} />
                        <YAxis type="category" dataKey="productName" width={150} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => value.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })} />
                        <Legend />
                        <Bar dataKey="totalProfit" name="กำไร" fill="#3b82f6" />
                        <Bar dataKey="totalCost" name="ต้นทุน" fill="#f87171" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            <div className="overflow-x-auto">
                 <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                     <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">สินค้า</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">รายรับ</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">ต้นทุน</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">กำไร</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">อัตรากำไร</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredData.sort((a,b) => b.totalProfit - a.totalProfit).map(item => (
                             <tr key={item.productName}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{item.productName}</td>
                                <td className="px-6 py-4 text-sm text-right">{item.totalRevenue.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</td>
                                <td className="px-6 py-4 text-sm text-right">{item.totalCost.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</td>
                                <td className="px-6 py-4 text-sm text-right font-bold text-blue-700">{item.totalProfit.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</td>
                                <td className="px-6 py-4 text-sm text-right font-semibold text-blue-700">{(item.profitMargin * 100).toFixed(2)}%</td>
                             </tr>
                        ))}
                    </tbody>
                 </table>
            </div>

        </div>
    );
};