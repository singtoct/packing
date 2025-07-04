
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getInventory, getPackingLogs, getEmployees } from '../services/storageService';
import { Employee } from '../types';
import { DownloadIcon, FileTextIcon } from './icons/Icons';

const ReportCard: React.FC<{
    title: string;
    description: string;
    children: React.ReactNode;
    onDownload: () => void;
}> = ({ title, description, children, onDownload }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 bg-blue-100 text-blue-600 p-3 rounded-full">
                <FileTextIcon className="w-6 h-6" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                <p className="text-sm text-gray-600 mt-1">{description}</p>
            </div>
        </div>
        <div className="my-6">{children}</div>
        <div className="text-right">
            <button
                onClick={onDownload}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                <DownloadIcon className="w-5 h-5" />
                ดาวน์โหลดรายงาน
            </button>
        </div>
    </div>
);

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

    const handleDownloadInventoryReport = () => {
        const inventory = getInventory();
        const dataToExport = inventory.map(item => ({
            'ชื่อสินค้า': item.name,
            'สต็อกปัจจุบัน (ลัง)': item.quantity,
            'สต็อกขั้นต่ำ (ลัง)': item.minStock ?? 'ไม่ได้ตั้งค่า',
            'สถานะ': item.minStock !== undefined && item.quantity < item.minStock ? 'ต่ำกว่ากำหนด' : 'ปกติ'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        ws['!cols'] = [{ wch: 50 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory Status");
        XLSX.writeFile(wb, `Inventory_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleDownloadPackingReport = () => {
        const allLogs = getPackingLogs();
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (end) end.setHours(23, 59, 59, 999); // Include the whole end day

        const filteredLogs = allLogs.filter(log => {
            const logDate = new Date(log.date);
            const isEmployeeMatch = selectedEmployee === 'All' || log.packerName === selectedEmployee;
            const isDateMatch = (!start || logDate >= start) && (!end || logDate <= end);
            return isEmployeeMatch && isDateMatch;
        });

        const dataToExport = filteredLogs.map(log => ({
            'วันที่': new Date(log.date).toLocaleDateString('th-TH'),
            'ผู้บันทึก': log.packerName,
            'สินค้า': log.name,
            'จำนวน (ลัง)': log.quantity,
        }));
        
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 50 }, { wch: 15 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Packing History");
        XLSX.writeFile(wb, `Packing_History_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-8 text-gray-800">ระบบรายงานขั้นสูง</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Packing History Report Card */}
                <ReportCard
                    title="รายงานประวัติการแพ็ค"
                    description="สร้างรายงานประวัติการแพ็คตามช่วงเวลาและพนักงานที่กำหนด"
                    onDownload={handleDownloadPackingReport}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">วันที่เริ่มต้น</label>
                            <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
                            <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="employeeFilter" className="block text-sm font-medium text-gray-700">กรองตามพนักงาน</label>
                            <select id="employeeFilter" value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm">
                                <option value="All">พนักงานทั้งหมด</option>
                                {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                            </select>
                        </div>
                    </div>
                </ReportCard>
                
                {/* Inventory Report Card */}
                <ReportCard
                    title="รายงานสต็อกสินค้าคงคลัง"
                    description="ดาวน์โหลดข้อมูลสรุปสต็อกสินค้าที่แพ็คแล้วทั้งหมดในปัจจุบัน"
                    onDownload={handleDownloadInventoryReport}
                >
                    <p className="text-gray-700">
                        รายงานนี้จะแสดงรายการสินค้าทั้งหมดในคลัง, จำนวนปัจจุบัน, และระดับสต็อกขั้นต่ำที่ตั้งค่าไว้
                        เพื่อช่วยในการวางแผนการผลิตและจัดการสต็อกให้มีประสิทธิภาพ
                    </p>
                </ReportCard>
            </div>
        </div>
    );
};
