import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { PackingLogEntry } from '../types';
import { getPackingLogs, savePackingLogs, getOrders } from '../services/storageService';
import { PlusCircleIcon, Trash2Icon, FileSpreadsheetIcon } from './icons/Icons';

export const PackingLogTab: React.FC = () => {
    const [logs, setLogs] = useState<PackingLogEntry[]>([]);
    const [logItemName, setLogItemName] = useState('');
    const [logQuantity, setLogQuantity] = useState(1);
    const [logDate, setLogDate] = useState('');
    const [availableItems, setAvailableItems] = useState<string[]>([]);

    useEffect(() => {
        const storedLogs = getPackingLogs();
        setLogs(storedLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        const today = new Date().toISOString().split('T')[0];
        setLogDate(today);

        const orders = getOrders();
        const uniqueItemNames = [...new Set(orders.map(o => `${o.name} (${o.color})`))];
        setAvailableItems(uniqueItemNames);
        if(uniqueItemNames.length > 0) {
            setLogItemName(uniqueItemNames[0]);
        }

    }, []);

    useEffect(() => {
        savePackingLogs(logs);
    }, [logs]);

    const handleAddLog = (e: React.FormEvent) => {
        e.preventDefault();
        if (!logItemName.trim() || !logDate) return;
        const newLog: PackingLogEntry = {
            id: new Date().toISOString(),
            date: logDate,
            name: logItemName.trim(),
            quantity: logQuantity,
        };
        const updatedLogs = [newLog, ...logs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLogs(updatedLogs);
        setLogQuantity(1);
    };

    const handleDeleteLog = (id: string) => {
        setLogs(prevLogs => prevLogs.filter(log => log.id !== id));
    };

    const handleExportToExcel = () => {
        const wb = XLSX.utils.book_new();

        // --- DATA PREPARATION ---
        const title = [["ใบรายงานการแพ็คสินค้าประจำวัน / DAILY PACKING REPORT"]];
        const info = [
            ["วันที่ / DATE:", "", "", "ผู้บันทึก / RECORDER:", ""],
        ];
        const headers = [
            ["ลำดับ\nNo.", "รายการสินค้า\nကုန်ပစ္စည်းအမည်", "จำนวน (ลัง)\nအရေအတွက်", "พร้อมส่ง\nအသင့်", "หมายเหตุ\nမှတ်ချက်"]
        ];
        const emptyData = Array.from({ length: 20 }, () => ["", "", "", "", ""]);
        const footer = [["ผู้ตรวจสอบ / CHECKED BY:"]];

        const finalData = [
            ...title,
            [], // Spacer
            ...info,
            [], // Spacer
            ...headers,
            ...emptyData,
            [], // Spacer
            ...footer,
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(finalData);

        // --- STYLING & FORMATTING ---
        ws["!merges"] = [
            // Title
            { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
            // Footer
            { s: { r: finalData.length - 1, c: 3 }, e: { r: finalData.length - 1, c: 4 } },
        ];

        ws["!cols"] = [
            { wch: 10 }, // No.
            { wch: 45 }, // Item Name
            { wch: 20 }, // Quantity
            { wch: 15 }, // Ready
            { wch: 35 }, // Notes
        ];

        ws["!rows"] = [
            { hpt: 24 }, // Title row
            null,
            { hpt: 18 }, // Info row
            null,
            { hpt: 36 }, // Header row
        ];

        // Style the title
        if(ws['A1']) {
            ws['A1'].s = { font: { sz: 18, bold: true }, alignment: { horizontal: "center", vertical: "center" } };
        }
        
        // Style headers
        const headerStyle = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, fill: { fgColor: { rgb: "EAEAEA" } } };
        ['A5', 'B5', 'C5', 'D5', 'E5'].forEach(cellRef => {
            if (ws[cellRef]) ws[cellRef].s = headerStyle;
        });

        // Add borders to the table area
        const border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        for (let R = 4; R < 4 + headers.length + emptyData.length; ++R) {
            for (let C = 0; C < 5; ++C) {
                const cell_address = XLSX.utils.encode_cell({ c: C, r: R });
                if (!ws[cell_address]) ws[cell_address] = { t: 's', v: '' };
                ws[cell_address].s = { ...ws[cell_address].s, border };
            }
        }
        
        XLSX.utils.book_append_sheet(wb, ws, "Packing Report");
        XLSX.writeFile(wb, `CT_Packing_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">บันทึกข้อมูลการแพ็คสินค้า</h2>
                <button onClick={handleExportToExcel} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                    <FileSpreadsheetIcon className="w-5 h-5"/>
                    ส่งออกฟอร์ม Excel
                </button>
            </div>

            <form onSubmit={handleAddLog} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-50 p-4 rounded-lg border mb-10">
                <div className="md:col-span-2">
                    <label htmlFor="logItemName" className="block text-sm font-medium text-gray-700">สินค้าที่แพ็ค</label>
                    <select id="logItemName" value={logItemName} onChange={e => setLogItemName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                       <option value="" disabled>-- เลือกสินค้า --</option>
                       {availableItems.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="logQuantity" className="block text-sm font-medium text-gray-700">จำนวน (ลัง)</label>
                    <input type="number" id="logQuantity" min="1" value={logQuantity} onChange={e => setLogQuantity(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                    <label htmlFor="logDate" className="block text-sm font-medium text-gray-700">วันที่แพ็ค</label>
                    <input type="date" id="logDate" value={logDate} onChange={e => setLogDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div className="col-span-1 md:col-span-4 flex justify-end">
                     <button type="submit" className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <PlusCircleIcon className="w-5 h-5" />
                        บันทึกข้อมูล
                    </button>
                </div>
            </form>

             <h2 className="text-2xl font-bold mb-4">ประวัติการบันทึก</h2>
             <div className="overflow-x-auto">
                <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อสินค้า</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวน (ลัง)</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">ลบ</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {logs.length > 0 ? (
                            logs.map(log => (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{new Date(log.date).toLocaleDateString('th-TH')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.quantity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleDeleteLog(log.id)} className="text-red-600 hover:text-red-900"><Trash2Icon className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={4} className="text-center text-gray-500 py-8">ยังไม่มีการบันทึก</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};