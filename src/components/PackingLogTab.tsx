


import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { PackingLogEntry, Employee, QCEntry } from '../types';
import { getPackingLogs, savePackingLogs, getOrders, getInventory, saveInventory, getEmployees, getQCEntries, saveQCEntries } from '../services/storageService';
import { PlusCircleIcon, Trash2Icon, FileSpreadsheetIcon, DownloadIcon, UploadIcon } from './icons/Icons';

export const PackingLogTab: React.FC<{ setLowStockCheck: () => void; }> = ({ setLowStockCheck }) => {
    const [logs, setLogs] = useState<PackingLogEntry[]>([]);
    const [logItemName, setLogItemName] = useState('');
    const [logQuantity, setLogQuantity] = useState(1);
    const [logDate, setLogDate] = useState('');
    const [packerName, setPackerName] = useState('');
    const [availableItems, setAvailableItems] = useState<string[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const importFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const storedLogs = getPackingLogs();
        setLogs(storedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        
        const today = new Date().toISOString().split('T')[0];
        setLogDate(today);

        const loadedEmployees = getEmployees();
        setEmployees(loadedEmployees);
        if (loadedEmployees.length > 0) {
            setPackerName(loadedEmployees[0].name);
        }

        const orders = getOrders();
        const uniqueItemNames = [...new Set(orders.map(o => `${o.name} (${o.color})`))].sort();
        setAvailableItems(uniqueItemNames);
        
        if (uniqueItemNames.length > 0 && !logItemName) {
            setLogItemName(uniqueItemNames[0]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    useEffect(() => {
        savePackingLogs(logs);
    }, [logs]);
    
    const addLogEntry = (logData: Omit<PackingLogEntry, 'id'>, currentInventory: any[], currentQCEntries: any[]) => {
        const newLog: PackingLogEntry = { ...logData, id: crypto.randomUUID() };

        const itemIndex = currentInventory.findIndex(item => item.name === newLog.name);
        if (itemIndex > -1) {
            currentInventory[itemIndex].quantity += newLog.quantity;
        } else {
            currentInventory.push({ name: newLog.name, quantity: newLog.quantity });
        }
        
        const newQCEntry: QCEntry = {
            id: newLog.id,
            packingLogId: newLog.id,
            productName: newLog.name,
            quantity: newLog.quantity,
            packerName: newLog.packerName,
            packingDate: newLog.date,
            status: 'Pending',
        };
        currentQCEntries.push(newQCEntry);

        return newLog;
    };


    const handleAddLog = (e: React.FormEvent) => {
        e.preventDefault();
        if (!logItemName.trim() || !logDate || !packerName) return;
        
        const currentInventory = getInventory();
        const currentQCEntries = getQCEntries();

        const newLog = addLogEntry({
            date: logDate,
            name: logItemName.trim(),
            quantity: logQuantity,
            packerName: packerName,
        }, currentInventory, currentQCEntries);

        saveInventory(currentInventory);
        saveQCEntries(currentQCEntries);
        
        const updatedLogs = [newLog, ...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLogs(updatedLogs);
        
        setLowStockCheck();
        setLogQuantity(1);
    };

    const handleDeleteLog = (id: string) => {
        const logToDelete = logs.find(log => log.id === id);
        if (!logToDelete) return;

        // Also delete the corresponding QC entry
        const currentQCEntries = getQCEntries();
        const updatedQCEntries = currentQCEntries.filter(entry => entry.packingLogId !== id);
        saveQCEntries(updatedQCEntries);

        const currentInventory = getInventory();
        const itemIndex = currentInventory.findIndex(item => item.name === logToDelete.name);
        if (itemIndex > -1) {
            currentInventory[itemIndex].quantity -= logToDelete.quantity;
            if (currentInventory[itemIndex].quantity < 0) {
                 currentInventory[itemIndex].quantity = 0; // Prevent negative inventory
            }
        }
        saveInventory(currentInventory);
        setLowStockCheck();
        
        setLogs(prevLogs => prevLogs.filter(log => log.id !== id));
    };

    const handleExportHistory = () => {
        const dataToExport = logs.map(log => ({
            'วันที่': new Date(log.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
            'ชื่อสินค้า': log.name,
            'จำนวน (ลัง)': log.quantity,
            'ผู้บันทึก': log.packerName
        }));
        
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        ws['!cols'] = [{ wch: 15 }, { wch: 50 }, { wch: 15 }, { wch: 20 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Packing History");
        XLSX.writeFile(wb, `Packing_History_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleImportFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json<any>(worksheet);

                const currentInventory = getInventory();
                const currentQCEntries = getQCEntries();
                const newLogs: PackingLogEntry[] = [];
                
                json.forEach((row, index) => {
                    const productName = row['ชื่อสินค้า'];
                    const quantity = row['จำนวน (ลัง)'];
                    const packer = row['ผู้บันทึก'];
                    // XLSX can parse dates, or we handle strings
                    const rowDate = row['วันที่'] instanceof Date ? row['วันที่'] : new Date(row['วันที่']);

                    if (productName && quantity > 0 && packer && !isNaN(rowDate.getTime())) {
                        const newLog = addLogEntry({
                            date: rowDate.toISOString().split('T')[0],
                            name: productName.trim(),
                            quantity: Number(quantity),
                            packerName: packer.trim(),
                        }, currentInventory, currentQCEntries);
                        newLogs.push(newLog);
                    } else {
                        console.warn(`Skipping invalid row ${index + 2}:`, row);
                    }
                });

                if (newLogs.length > 0) {
                    saveInventory(currentInventory);
                    saveQCEntries(currentQCEntries);
                    const updatedLogs = [...newLogs, ...logs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    setLogs(updatedLogs);
                    setLowStockCheck();
                    alert(`นำเข้าสำเร็จ ${newLogs.length} รายการ`);
                } else {
                    alert('ไม่พบข้อมูลที่ถูกต้องในไฟล์');
                }

            } catch (error) {
                console.error("Error importing from Excel:", error);
                alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel");
            } finally {
                if (importFileRef.current) importFileRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };


    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">บันทึกข้อมูลการแพ็คสินค้า</h2>
                <div className="flex gap-2 flex-wrap">
                    <input type="file" ref={importFileRef} onChange={handleImportFromExcel} accept=".xlsx, .xls" className="hidden"/>
                     <button onClick={() => importFileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none">
                        <UploadIcon className="w-5 h-5"/>
                        นำเข้า (Excel)
                    </button>
                    <button onClick={handleExportHistory} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <DownloadIcon className="w-5 h-5"/>
                        ส่งออกประวัติ (Excel)
                    </button>
                    <button onClick={() => {
                        const wb = XLSX.utils.book_new();
                        const ws = XLSX.utils.aoa_to_sheet([["วันที่", "ชื่อสินค้า", "จำนวน (ลัง)", "ผู้บันทึก"]]);
                        XLSX.utils.book_append_sheet(wb, ws, "Packing Import Template");
                        XLSX.writeFile(wb, "Packing_Import_Template.xlsx");
                    }} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                        <FileSpreadsheetIcon className="w-5 h-5"/>
                        ส่งออกฟอร์มเปล่า
                    </button>
                </div>
            </div>

            <form onSubmit={handleAddLog} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-lg border mb-10">
                <div className="md:col-span-2">
                    <label htmlFor="logItemName" className="block text-sm font-medium text-gray-700">สินค้าที่แพ็ค</label>
                    <select id="logItemName" value={logItemName} onChange={e => setLogItemName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required>
                       <option value="" disabled>-- เลือกสินค้า --</option>
                       {availableItems.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="logQuantity" className="block text-sm font-medium text-gray-700">จำนวน (ลัง)</label>
                    <input type="number" id="logQuantity" min="1" value={logQuantity} onChange={e => setLogQuantity(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required />
                </div>
                <div>
                    <label htmlFor="packerName" className="block text-sm font-medium text-gray-700">ผู้บันทึก</label>
                     <select id="packerName" value={packerName} onChange={e => setPackerName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required>
                       {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="logDate" className="block text-sm font-medium text-gray-700">วันที่แพ็ค</label>
                    <input type="date" id="logDate" value={logDate} onChange={e => setLogDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required />
                </div>
                <div className="col-span-1 md:col-span-5 flex justify-end">
                     <button type="submit" className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
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
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้บันทึก</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">ลบ</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {logs.length > 0 ? (
                            logs.map(log => (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{new Date(log.date).toLocaleDateString('th-TH')}</td>
                                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{log.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.quantity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">{log.packerName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleDeleteLog(log.id)} className="text-red-600 hover:text-red-900" aria-label={`Delete log for ${log.name}`}><Trash2Icon className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={5} className="text-center text-gray-500 py-8">ยังไม่มีการบันทึก</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};