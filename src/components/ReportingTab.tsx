

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getInventory, getPackingLogs, getEmployees, getMoldingLogs, getProducts, getBOMs, getRawMaterials } from '../services/storageService';
import { Employee, PackingLogEntry, MoldingLogEntry, BillOfMaterial, RawMaterial } from '../types';
import { DownloadIcon, FileTextIcon, SearchIcon, BoxIcon, FactoryIcon, BeakerIcon } from './icons/Icons';

const ReportCard: React.FC<{
    title: string;
    description: string;
    children: React.ReactNode;
    onDownload: () => void;
    downloadText?: string;
}> = ({ title, description, children, onDownload, downloadText = "ดาวน์โหลดรายงาน" }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col">
        <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 bg-green-100 text-green-600 p-3 rounded-full">
                <FileTextIcon className="w-6 h-6" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                <p className="text-sm text-gray-600 mt-1">{description}</p>
            </div>
        </div>
        <div className="my-6 flex-grow">{children}</div>
        <div className="text-right mt-auto">
            <button
                onClick={onDownload}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
                <DownloadIcon className="w-5 h-5" />
                {downloadText}
            </button>
        </div>
    </div>
);

interface TraceabilityResult {
    packingLog: PackingLogEntry;
    moldingLogs: MoldingLogEntry[];
    bom: BillOfMaterial | null;
    rawMaterials: (RawMaterial & { required: number })[];
}

const LotTraceability: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [result, setResult] = useState<TraceabilityResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = () => {
        setError(null);
        setResult(null);
        if (!searchTerm.trim()) return;

        const packingLog = getPackingLogs().find(p => p.id === searchTerm.trim());
        if (!packingLog) {
            setError('ไม่พบข้อมูลการแพ็คสำหรับ ID นี้');
            return;
        }

        const moldingLogs = getMoldingLogs().filter(m => m.productName === packingLog.name);
        const bom = getBOMs().find(b => b.productName === packingLog.name) || null;
        
        let materials: (RawMaterial & { required: number })[] = [];
        if (bom) {
            const allRawMaterials = getRawMaterials();
            const materialMap = new Map(allRawMaterials.map(m => [m.id, m]));
            materials = bom.components.map(comp => {
                const material = materialMap.get(comp.rawMaterialId);
                return {
                    ...(material || { id: comp.rawMaterialId, name: 'Unknown Material', quantity: 0, unit: '' }),
                    required: comp.quantity,
                };
            });
        }
        
        setResult({ packingLog, moldingLogs, bom, rawMaterials: materials });
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">ตรวจสอบย้อนกลับ (Lot Traceability)</h3>
            <p className="text-sm text-gray-600 mb-4">ป้อน ID ของล็อตที่แพ็คแล้ว (Packing Log ID) เพื่อดูประวัติการผลิตทั้งหมด</p>
            <div className="flex gap-2 mb-6">
                <input 
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="ป้อน Packing Log ID..."
                    className="flex-grow px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button onClick={handleSearch} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    <SearchIcon className="w-5 h-5" />
                    ค้นหา
                </button>
            </div>

            {error && <p className="text-red-500">{error}</p>}
            {result && (
                <div className="space-y-6">
                    {/* Packing Info */}
                    <div className="p-4 rounded-lg bg-gray-50 border">
                        <h4 className="font-bold flex items-center gap-2 text-gray-700"><BoxIcon className="w-5 h-5 text-blue-500"/>ข้อมูลการแพ็ค</h4>
                        <p><strong>สินค้า:</strong> {result.packingLog.name}</p>
                        <p><strong>จำนวน:</strong> {result.packingLog.quantity.toLocaleString()} ชิ้น</p>
                        <p><strong>ผู้แพ็ค:</strong> {result.packingLog.packerName}</p>
                        <p><strong>วันที่แพ็ค:</strong> {new Date(result.packingLog.date).toLocaleDateString('th-TH')}</p>
                    </div>

                    {/* Molding Info */}
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

                    {/* BOM Info */}
                    <div className="p-4 rounded-lg bg-gray-50 border">
                        <h4 className="font-bold flex items-center gap-2 text-gray-700"><BeakerIcon className="w-5 h-5 text-purple-500"/>วัตถุดิบที่ใช้ (ตาม BOM)</h4>
                         {result.rawMaterials.length > 0 ? (
                            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                {result.rawMaterials.map(mat => (
                                    <li key={mat.id}>
                                       {mat.name}: {mat.required} {mat.unit} / 1 ชิ้นงาน
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-gray-500 mt-2">ไม่พบสูตรการผลิต (BOM) สำหรับสินค้านี้</p>}
                    </div>
                </div>
            )}
        </div>
    );
}


export const ReportingTab: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('All');

    useEffect(() => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        setEndDate(today.toISOString().split('T')[0]);
        setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
        
        setEmployees(getEmployees());
    }, []);

    const downloadReport = (
        reportType: 'Packing' | 'Molding',
        logs: any[],
        fileName: string,
        sheetName: string,
        columns: {header: string, key: string, wch: number}[]
    ) => {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (end) end.setHours(23, 59, 59, 999); // Include the whole end day

        const filteredLogs = logs.filter(log => {
            const logDate = new Date(log.date);
            const operatorKey = reportType === 'Packing' ? 'packerName' : 'operatorName';
            const isEmployeeMatch = selectedEmployee === 'All' || log[operatorKey] === selectedEmployee;
            const isDateMatch = (!start || logDate >= start) && (!end || logDate <= end);
            return isEmployeeMatch && isDateMatch;
        });

        const dataToExport = filteredLogs.map(log => {
            let row: any = {};
            columns.forEach(col => {
                row[col.header] = log[col.key];
                 if (col.key === 'date') {
                    row[col.header] = new Date(log.date).toLocaleDateString('th-TH');
                }
            });
            return row;
        });
        
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        ws['!cols'] = columns.map(c => ({ wch: c.wch }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };


    return (
        <div>
            <h2 className="text-3xl font-bold mb-8 text-gray-800">ระบบรายงานขั้นสูง</h2>
            
            <LotTraceability />

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                
                {/* Common Filters */}
                <div className="bg-gray-50 p-6 rounded-xl border-2 border-dashed lg:col-span-full">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">ตัวกรองรายงานแบบกำหนดเอง</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">วันที่เริ่มต้น</label>
                            <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
                            <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="employeeFilter" className="block text-sm font-medium text-gray-700">พนักงาน</label>
                            <select id="employeeFilter" value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm">
                                <option value="All">พนักงานทั้งหมด</option>
                                {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Molding History Report Card */}
                 <ReportCard
                    title="รายงานประวัติการผลิต (ฉีด)"
                    description="สร้างรายงานประวัติการผลิตชิ้นส่วนจากแผนกฉีด"
                    onDownload={() => downloadReport('Molding', getMoldingLogs(), 'Molding_History_Report', 'Molding History', [
                        { header: 'วันที่', key: 'date', wch: 15 },
                        { header: 'ผู้ควบคุมเครื่อง', key: 'operatorName', wch: 20 },
                        { header: 'สินค้า', key: 'productName', wch: 40 },
                        { header: 'เครื่องจักร', key: 'machine', wch: 15 },
                        { header: 'จำนวนผลิตได้', key: 'quantityProduced', wch: 15 },
                        { header: 'จำนวนของเสีย', key: 'quantityRejected', wch: 15 }
                    ])}
                >
                    <p className="text-gray-700">
                        รายงานนี้จะแสดงข้อมูลการผลิตทั้งหมดจากแผนกฉีดตามตัวกรองที่ท่านเลือก
                    </p>
                </ReportCard>


                {/* Packing History Report Card */}
                <ReportCard
                    title="รายงานประวัติการแพ็ค"
                    description="สร้างรายงานประวัติการแพ็คสินค้าตามตัวกรองที่กำหนด"
                     onDownload={() => downloadReport('Packing', getPackingLogs(), 'Packing_History_Report', 'Packing History', [
                        { header: 'วันที่', key: 'date', wch: 15 },
                        { header: 'ผู้บันทึก', key: 'packerName', wch: 20 },
                        { header: 'สินค้า', key: 'name', wch: 50 },
                        { header: 'จำนวน (ชิ้น)', key: 'quantity', wch: 15 }
                    ])}
                >
                    <p className="text-gray-700">
                        รายงานนี้จะแสดงข้อมูลการแพ็คสินค้าทั้งหมดตามตัวกรองที่ท่านเลือก
                    </p>
                </ReportCard>
                
                {/* Inventory Report Card */}
                <ReportCard
                    title="รายงานสต็อกสินค้าคงคลัง"
                    description="ดาวน์โหลดข้อมูลสรุปสต็อกสินค้าที่แพ็คแล้วทั้งหมด"
                    onDownload={() => {
                        const inventory = getInventory();
                        const dataToExport = inventory.map(item => ({
                            'ชื่อสินค้า': item.name,
                            'สต็อกปัจจุบัน (ชิ้น)': item.quantity,
                            'สต็อกขั้นต่ำ (ชิ้น)': item.minStock ?? 'ไม่ได้ตั้งค่า',
                            'สถานะ': item.minStock !== undefined && item.quantity < item.minStock ? 'ต่ำกว่ากำหนด' : 'ปกติ'
                        }));

                        const ws = XLSX.utils.json_to_sheet(dataToExport);
                        ws['!cols'] = [{ wch: 50 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Inventory Status");
                        XLSX.writeFile(wb, `Inventory_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
                    }}
                    downloadText="ดาวน์โหลดสต็อก"
                >
                    <p className="text-gray-700">
                        รายงานนี้จะแสดงรายการสินค้าที่แพ็คแล้วทั้งหมดในคลัง ไม่ขึ้นกับตัวกรองด้านบน
                    </p>
                </ReportCard>
            </div>
        </div>
    );
