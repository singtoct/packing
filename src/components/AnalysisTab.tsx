import React, { useMemo, useState, useEffect } from 'react';
import { getOrders, getBOMs, getRawMaterials, getMoldingLogs } from '../services/storageService';
import { analyzeProductionAnomalies } from '../services/geminiService';
import { AnomalyFinding } from '../types';
import { AlertTriangleIcon, CheckCircle2Icon, SigmaIcon, SparklesIcon, LoaderIcon, ShieldAlertIcon } from './icons/Icons';

type SortDirection = 'asc' | 'desc';
interface SortConfig {
    key: string;
    direction: SortDirection;
}

// Helper component for sortable table headers
const SortableHeader: React.FC<{
  label: string;
  sortConfig: SortConfig | null;
  requestSort: (key: string) => void;
  sortKey: string;
  className?: string;
  justify?: 'left' | 'right' | 'center';
}> = ({ label, sortConfig, requestSort, sortKey, className, justify = 'left' }) => {
  const isSorted = sortConfig?.key === sortKey;
  const directionIcon = isSorted ? (sortConfig?.direction === 'asc' ? '▲' : '▼') : '';
  const justifyClass = {
      left: 'justify-start',
      right: 'justify-end',
      center: 'justify-center',
  }[justify];

  return (
    <th
      scope="col"
      className={`cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
      onClick={() => requestSort(sortKey)}
    >
      <div className={`flex items-center gap-1 ${justifyClass}`}>
        <span>{label}</span>
        {isSorted && <span className="text-xs text-gray-500">{directionIcon}</span>}
      </div>
    </th>
  );
};

const AnomalyDetector: React.FC = () => {
    const [findings, setFindings] = useState<AnomalyFinding[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);

    const handleRunAnalysis = async () => {
        setIsLoading(true);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const logs = getMoldingLogs().filter(log => new Date(log.date) >= thirtyDaysAgo);
        
        if (logs.length === 0) {
            setFindings([]);
            setIsLoading(false);
            setLastAnalyzed(new Date().toLocaleString('th-TH'));
            return;
        }

        const results = await analyzeProductionAnomalies(logs);
        setFindings(results);
        setLastAnalyzed(new Date().toLocaleString('th-TH'));
        setIsLoading(false);
    };

    const AnomalyCard: React.FC<{finding: AnomalyFinding}> = ({finding}) => (
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-full"><ShieldAlertIcon className="w-5 h-5 text-red-600"/></div>
                <div>
                    <h4 className="font-bold text-gray-800 capitalize">{finding.type}: {finding.entityName}</h4>
                    <p className="text-sm text-red-700">{finding.message}</p>
                    <p className="text-sm text-gray-600 mt-1"><strong>Suggestion:</strong> {finding.suggestion}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-gray-50 p-6 rounded-xl border-2 border-dashed mb-8">
             <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-teal-500" />
                        AI ตรวจจับความผิดปกติในการผลิต
                    </h3>
                    {lastAnalyzed && <p className="text-xs text-gray-500 mt-1">วิเคราะห์ล่าสุด: {lastAnalyzed}</p>}
                </div>
                <button onClick={handleRunAnalysis} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-400">
                    {isLoading ? <LoaderIcon className="w-5 h-5"/> : <SparklesIcon className="w-5 h-5" />}
                    {isLoading ? 'กำลังวิเคราะห์...' : 'เริ่มการวิเคราะห์'}
                </button>
            </div>
            {isLoading ? (
                <div className="text-center py-8">
                    <LoaderIcon className="w-8 h-8 mx-auto text-teal-600"/>
                    <p className="mt-2 text-gray-600">AI กำลังประมวลผลข้อมูลการผลิต...</p>
                </div>
            ) : findings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {findings.map((f, i) => <AnomalyCard key={i} finding={f} />)}
                </div>
            ) : lastAnalyzed ? (
                 <div className="text-center py-8">
                    <CheckCircle2Icon className="w-12 h-12 mx-auto text-green-500"/>
                    <p className="mt-2 font-semibold text-gray-700">ไม่พบความผิดปกติที่สำคัญ</p>
                    <p className="text-sm text-gray-500">จากข้อมูลการผลิต 30 วันล่าสุด ทุกอย่างดูเป็นปกติ</p>
                </div>
            ) : (
                <p className="text-center text-gray-500 py-8">คลิกปุ่ม 'เริ่มการวิเคราะห์' เพื่อให้ AI ตรวจหาความผิดปกติ</p>
            )}
        </div>
    );
};


export const AnalysisTab: React.FC = () => {
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'shortfall', direction: 'desc' });

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

        return Array.from(requiredMaterials.entries()).map(([id, data]) => {
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

    }, []);
    
    const requestSort = (key: string) => {
        let direction: SortDirection = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedAnalysisResult = useMemo(() => {
        let sortableItems = [...analysisResult];
        if (sortConfig) {
            sortableItems.sort((a, b) => {
                const aVal = a[sortConfig.key as keyof typeof a];
                const bVal = b[sortConfig.key as keyof typeof b];

                if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
                     if (aVal === bVal) return 0;
                     return sortConfig.direction === 'asc' ? (aVal ? -1 : 1) : (aVal ? 1 : -1);
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [analysisResult, sortConfig]);


    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">วิเคราะห์ด้วย AI และสรุปข้อมูล</h2>
            </div>
            
            <AnomalyDetector />

            <h3 className="text-xl font-bold text-gray-800 mb-4">วิเคราะห์ความต้องการวัตถุดิบ (สำหรับออเดอร์ปัจจุบัน)</h3>
             <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm font-medium mb-4">
                คำนวณจากออเดอร์ที่เปิดอยู่ทั้งหมดในระบบ
            </div>

            {analysisResult.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border">
                    <SigmaIcon className="w-16 h-16 text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600">ไม่มีข้อมูลให้วิเคราะห์</h3>
                    <p className="text-gray-500">กรุณาเพิ่มออเดอร์และกำหนดสูตรการผลิต (BOM) ก่อน</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                        <thead className="bg-gray-50">
                            <tr>
                                <SortableHeader label="วัตถุดิบ" sortKey="name" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider" justify="left" />
                                <SortableHeader label="จำนวนที่ต้องการ" sortKey="required" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider" justify="right" />
                                <SortableHeader label="มีในสต็อก" sortKey="inStock" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider" justify="right" />
                                <SortableHeader label="จำนวนที่ขาด" sortKey="shortfall" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider" justify="right" />
                                <SortableHeader label="สถานะ" sortKey="isSufficient" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider" justify="center" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sortedAnalysisResult.map(item => (
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