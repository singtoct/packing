

import React from 'react';
import { OrderItem, PackingLogEntry, MoldingLogEntry, BillOfMaterial, RawMaterial } from '../types';
import { BoxIcon, FactoryIcon, BeakerIcon, XCircleIcon } from './icons/Icons';

interface TraceabilityResult {
    order: OrderItem;
    packingLogs: PackingLogEntry[];
    moldingLogs: MoldingLogEntry[];
    bom: BillOfMaterial | null;
    rawMaterials: (RawMaterial & { required: number })[];
}

interface Props {
    result: TraceabilityResult | null;
    onClose: () => void;
}

export const TraceabilityModal: React.FC<Props> = ({ result, onClose }) => {
    if (!result) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <h2 className="text-2xl font-bold text-gray-800">ผลการตรวจสอบย้อนกลับ</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XCircleIcon className="w-7 h-7 text-gray-500" />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-6">
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <h3 className="font-bold text-lg text-blue-800">ออเดอร์: #{result.order.id}</h3>
                        <p><strong>สินค้า:</strong> {result.order.name} ({result.order.color})</p>
                        <p><strong>จำนวน:</strong> {result.order.quantity.toLocaleString()} ชิ้น</p>
                        <p><strong>วันส่ง:</strong> {new Date(result.order.dueDate).toLocaleDateString('th-TH')}</p>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 border">
                        <h4 className="font-bold flex items-center gap-2 text-gray-700"><FactoryIcon className="w-5 h-5 text-green-500"/>ประวัติการผลิต (ฉีด)</h4>
                        {result.moldingLogs.length > 0 ? (
                            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                {result.moldingLogs.map(log => (
                                    <li key={log.id}>
                                        {new Date(log.date).toLocaleDateString('th-TH')}: ผลิต {log.quantityProduced} ชิ้น (เสีย {log.quantityRejected}) โดย {log.operatorName} ที่เครื่อง {log.machine}
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-gray-500 mt-2">ไม่พบประวัติการผลิตสำหรับสินค้านี้</p>}
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 border">
                        <h4 className="font-bold flex items-center gap-2 text-gray-700"><BoxIcon className="w-5 h-5 text-indigo-500"/>ประวัติการแพ็ค</h4>
                        {result.packingLogs.length > 0 ? (
                            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                {result.packingLogs.map(log => (
                                    <li key={log.id}>
                                        {new Date(log.date).toLocaleDateString('th-TH')}: แพ็ค {log.quantity.toLocaleString()} ชิ้น โดย {log.packerName}
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-gray-500 mt-2">ไม่พบประวัติการแพ็คสำหรับสินค้านี้</p>}
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 border">
                        <h4 className="font-bold flex items-center gap-2 text-gray-700"><BeakerIcon className="w-5 h-5 text-purple-500"/>วัตถุดิบที่ใช้ (ตาม BOM)</h4>
                         {result.rawMaterials.length > 0 ? (
                            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                {result.rawMaterials.map(mat => (
                                    <li key={mat.id}>
                                       {mat.name}: {mat.required.toLocaleString(undefined, { maximumFractionDigits: 4 })} {mat.unit} / 1 ชิ้นงาน
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-gray-500 mt-2">ไม่พบสูตรการผลิต (BOM) สำหรับสินค้านี้</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};