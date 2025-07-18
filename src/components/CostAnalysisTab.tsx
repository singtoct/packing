

import React, { useMemo, useState } from 'react';
import { getMoldingLogs, getProducts } from '../services/storageService';
import { MoldingLogEntry, Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSignIcon } from 'lucide-react';

type ProcessedLog = MoldingLogEntry & {
    costPerPiece: number;
    product?: Product;
};

export const CostAnalysisTab: React.FC = () => {
    const [dateRange, setDateRange] = useState({
        start: '',
        end: new Date().toISOString().split('T')[0],
    });
    const [selectedProduct, setSelectedProduct] = useState('All');

    const processedLogs = useMemo(() => {
        const logs = getMoldingLogs();
        const products = getProducts();
        const productMap = new Map(products.map(p => [`${p.name} (${p.color})`, p]));

        return logs
            .filter(log => log.materialCost && log.materialCost > 0 && log.quantityProduced > 0)
            .map(log => ({
                ...log,
                costPerPiece: log.materialCost! / log.quantityProduced,
                product: productMap.get(log.productName)
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, []);

    const filteredLogs = useMemo(() => {
        return processedLogs.filter(log => {
            const logDate = new Date(log.date);
            const startDate = dateRange.start ? new Date(dateRange.start) : null;
            const endDate = dateRange.end ? new Date(dateRange.end) : null;
            if (endDate) endDate.setHours(23, 59, 59, 999);

            const dateMatch = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
            const productMatch = selectedProduct === 'All' || log.productName === selectedProduct;

            return dateMatch && productMatch;
        });
    }, [processedLogs, dateRange, selectedProduct]);

    const productOptions = useMemo(() => (
        ['All', ...Array.from(new Set(processedLogs.map(log => log.productName)))]
    ), [processedLogs]);

    const chartData = useMemo(() => {
        const dataMap = new Map<string, { totalCost: number, totalQty: number, count: number }>();
        filteredLogs.forEach(log => {
            if (!dataMap.has(log.productName)) {
                dataMap.set(log.productName, { totalCost: 0, totalQty: 0, count: 0 });
            }
            const current = dataMap.get(log.productName)!;
            current.totalCost += log.materialCost!;
            current.totalQty += log.quantityProduced;
            current.count++;
        });

        return Array.from(dataMap.entries())
            .map(([name, data]) => ({
                name: name.length > 25 ? name.substring(0, 22) + '...' : name,
                fullName: name,
                avgCostPerPiece: data.totalCost / data.totalQty,
            }))
            .sort((a, b) => b.avgCostPerPiece - a.avgCostPerPiece)
            .slice(0, 15); // Show top 15 most expensive
    }, [filteredLogs]);

    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">วิเคราะห์ต้นทุนการผลิตจริงต่อล็อต</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border mb-8">
                <div>
                    <label className="text-sm font-medium">จากวันที่</label>
                    <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="mt-1 w-full p-2 border rounded"/>
                </div>
                <div>
                    <label className="text-sm font-medium">ถึงวันที่</label>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="mt-1 w-full p-2 border rounded"/>
                </div>
                <div>
                    <label className="text-sm font-medium">สินค้า</label>
                    <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="mt-1 w-full p-2 border bg-white rounded">
                        {productOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>

            <div className="mb-8 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">ต้นทุนเฉลี่ยต่อชิ้น (สินค้าที่แพงที่สุด 15 อันดับแรก)</h3>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                        <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={(value) => `฿${value.toFixed(2)}`} />
                        <Tooltip 
                            formatter={(value, name, props) => [`฿${Number(value).toFixed(3)}`, props.payload.fullName]} 
                            contentStyle={{ borderRadius: '0.5rem', fontSize: '12px' }}/>
                        <Legend wrapperStyle={{paddingTop: '50px'}}/>
                        <Bar dataKey="avgCostPerPiece" name="ต้นทุนเฉลี่ย/ชิ้น" fill="#ef4444" />
                    </BarChart>
                </ResponsiveContainer>
            </div>


            {filteredLogs.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">วันที่ผลิต</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">สินค้า</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">จำนวนที่ผลิต</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">ต้นทุนวัตถุดิบรวม</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">ต้นทุน/ชิ้น</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredLogs.map(log => (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 text-sm whitespace-nowrap">{new Date(log.date).toLocaleDateString('th-TH')}</td>
                                    <td className="px-6 py-4 text-sm font-medium">{log.productName}</td>
                                    <td className="px-6 py-4 text-sm text-right">{log.quantityProduced.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-right text-red-700">{log.materialCost?.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</td>
                                    <td className="px-6 py-4 text-sm text-right font-bold text-red-800">{log.costPerPiece.toLocaleString('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 3 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                 <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed">
                    <DollarSignIcon className="w-16 h-16 text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600">ไม่พบข้อมูลการผลิตที่มีการบันทึกต้นทุน</h3>
                    <p className="text-gray-500">กรุณาตรวจสอบว่าได้บันทึกการผลิตพร้อมข้อมูลต้นทุนวัตถุดิบแล้ว</p>
                </div>
            )}
        </div>
    );
};