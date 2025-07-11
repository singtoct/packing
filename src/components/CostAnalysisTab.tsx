

import React, { useMemo } from 'react';
import { getOrders, getBOMs, getRawMaterials } from '../services/storageService';
import { DollarSignIcon } from './icons/Icons';

export const CostAnalysisTab: React.FC = () => {
    
    const analysisResult = useMemo(() => {
        const orders = getOrders();
        const boms = getBOMs();
        const rawMaterials = getRawMaterials();

        const bomMap = new Map(boms.map(b => [b.productName, b]));
        const rawMaterialMap = new Map(rawMaterials.map(rm => [rm.id, rm]));

        return orders.map(order => {
            const productName = `${order.name} (${order.color})`;
            const bom = bomMap.get(productName);
            let materialCost = 0;

            if (bom) {
                bom.components.forEach(comp => {
                    const material = rawMaterialMap.get(comp.rawMaterialId);
                    if (material && material.costPerUnit) {
                        // Cost per single finished good unit
                        const costPerUnit = comp.quantity * material.costPerUnit;
                        // Total cost for the order quantity (assuming order quantity is number of cases)
                        materialCost += costPerUnit * order.quantity;
                    }
                });
            }

            const totalRevenue = order.salePrice ? order.salePrice * order.quantity : 0;
            const profit = totalRevenue - materialCost;

            return {
                id: order.id,
                name: productName,
                quantity: order.quantity,
                salePrice: order.salePrice || 0,
                totalRevenue,
                materialCost,
                profit
            };
        }).sort((a,b) => b.profit - a.profit);

    }, []);

    const totals = useMemo(() => {
        return analysisResult.reduce((acc, current) => {
            acc.revenue += current.totalRevenue;
            acc.cost += current.materialCost;
            acc.profit += current.profit;
            return acc;
        }, { revenue: 0, cost: 0, profit: 0 });
    }, [analysisResult]);


    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">วิเคราะห์ต้นทุนและกำไร (จากออเดอร์ที่เปิดอยู่)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                 <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-sm font-medium text-green-800">รายรับรวม</p>
                    <p className="text-2xl font-bold text-green-600">{totals.revenue.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</p>
                </div>
                 <div className="bg-red-50 p-4 rounded-lg text-center">
                    <p className="text-sm font-medium text-red-800">ต้นทุนวัตถุดิบรวม</p>
                    <p className="text-2xl font-bold text-red-600">{totals.cost.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</p>
                </div>
                 <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-sm font-medium text-blue-800">กำไรรวม</p>
                    <p className="text-2xl font-bold text-blue-600">{totals.profit.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</p>
                </div>
            </div>

            {analysisResult.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed">
                    <DollarSignIcon className="w-16 h-16 text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600">ไม่มีข้อมูลให้วิเคราะห์</h3>
                    <p className="text-gray-500">กรุณาเพิ่มออเดอร์, กำหนดราคาขาย, BOM, และต้นทุนวัตถุดิบ</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">สินค้า</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">จำนวน (ลัง)</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">รายรับ</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">ต้นทุนวัตถุดิบ</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">กำไร</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {analysisResult.map(item => (
                                <tr key={item.id} className={item.profit < 0 ? 'bg-red-50' : ''}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{item.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 text-right">{item.quantity.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-green-700 text-right">{item.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    <td className="px-6 py-4 text-sm text-red-700 text-right">{item.materialCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    <td className={`px-6 py-4 text-sm font-bold text-right ${item.profit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                        {item.profit.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};