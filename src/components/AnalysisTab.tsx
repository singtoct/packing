import React, { useMemo } from 'react';
import { getOrders, getBOMs, getRawMaterials } from '../services/storageService';
import { AlertTriangleIcon, CheckCircle2Icon, SigmaIcon } from './icons/Icons';

export const AnalysisTab: React.FC = () => {
    
    const analysisResult = useMemo(() => {
        const orders = getOrders();
        const boms = getBOMs();
        const rawMaterials = getRawMaterials();

        const bomMap = new Map(boms.map(b => [b.productName, b]));
        const rawMaterialMap = new Map(rawMaterials.map(rm => [rm.id, rm]));
        const requiredMaterials = new Map<string, { required: number, name: string, unit: string }>();

        orders.forEach(order => {
            const productName = `${order.name} (${order.color})`;
            const bom = bomMap.get(productName);
            if (bom) {
                bom.components.forEach(comp => {
                    const material = rawMaterialMap.get(comp.rawMaterialId);
                    if (material) {
                        const totalRequired = comp.quantity * order.quantity;
                        const existing = requiredMaterials.get(material.id) || { required: 0, name: material.name, unit: material.unit };
                        existing.required += totalRequired;
                        requiredMaterials.set(material.id, existing);
                    }
                });
            }
        });

        const summary = Array.from(requiredMaterials.entries()).map(([id, data]) => {
            const materialInStock = rawMaterialMap.get(id);
            const inStock = materialInStock?.quantity || 0;
            const shortfall = data.required - inStock;
            return {
                ...data,
                id,
                inStock,
                shortfall: shortfall > 0 ? shortfall : 0,
                isSufficient: shortfall <= 0,
            };
        });

        return summary.sort((a,b) => b.shortfall - a.shortfall);

    }, []);


    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">วิเคราะห์ความต้องการวัตถุดิบ</h2>
                <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm font-medium">
                    คำนวณจากออเดอร์ที่เปิดอยู่ทั้งหมดในระบบ
                </div>
            </div>

            {analysisResult.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed">
                    <SigmaIcon className="w-16 h-16 text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600">ไม่มีข้อมูลให้วิเคราะห์</h3>
                    <p className="text-gray-500">กรุณาเพิ่มออเดอร์และกำหนดสูตรการผลิต (BOM) ก่อน</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">วัตถุดิบ</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">จำนวนที่ต้องการ</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">มีในสต็อก</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">จำนวนที่ขาด</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {analysisResult.map(item => (
                                <tr key={item.id} className={!item.isSufficient ? 'bg-red-50' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{item.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                                        {item.required.toLocaleString(undefined, {maximumFractionDigits: 2})} {item.unit}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                                        {item.inStock.toLocaleString(undefined, {maximumFractionDigits: 2})} {item.unit}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${!item.isSufficient ? 'text-red-600' : 'text-green-600'}`}>
                                        {item.shortfall > 0 ? item.shortfall.toLocaleString(undefined, {maximumFractionDigits: 2}) : '-'}
                                        {!item.isSufficient && ` ${item.unit}`}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {item.isSufficient ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                <CheckCircle2Icon className="w-4 h-4" /> เพียงพอ
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                                <AlertTriangleIcon className="w-4 h-4" /> ต้องสั่งซื้อ
                                            </span>
                                        )}
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
