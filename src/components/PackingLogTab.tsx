import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { PackingLogEntry } from '../types';
import { getPackingLogs, savePackingLogs, getOrders } from '../services/storageService';
import { PlusCircleIcon, PrinterIcon, Trash2Icon } from './icons/Icons';
import { CTPackingLogo } from '../assets/logo';

const PrintLogSheetView: React.FC = () => {
    useEffect(() => {
        window.print();
        window.onafterprint = () => window.close();
    }, []);

    return (
        <div className="p-8 font-sans">
            <style>{`
                @media print {
                    body { -webkit-print-color-adjust: exact; }
                    @page { size: A4; margin: 15mm; }
                }
                .checkbox-cell {
                    width: 60px;
                    text-align: center;
                }
            `}</style>
            <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
                <img src={CTPackingLogo} alt="CT.ELECTRIC Logo" className="h-20" />
                <div className="text-right">
                    <h1 className="text-2xl font-bold">ใบรายงานการแพ็คสินค้าประจำวัน</h1>
                    <h2 className="text-lg font-semibold text-gray-700">DAILY PACKING REPORT</h2>
                </div>
            </div>
            <div className="flex justify-between items-end mb-4 text-lg">
                <div>
                    <span className="font-semibold">วันที่ / DATE:</span>
                    <span className="border-b-2 border-dotted border-black inline-block w-48 ml-2"></span>
                </div>
                 <div>
                    <span className="font-semibold">ผู้บันทึก / RECORDER:</span>
                    <span className="border-b-2 border-dotted border-black inline-block w-48 ml-2"></span>
                </div>
            </div>
            <table className="w-full border-collapse border border-black text-base">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border border-black p-2 font-bold text-center w-1/12">ลำดับ<br/><span className="font-normal text-sm">No.</span></th>
                        <th className="border border-black p-2 font-bold text-center">
                            รายการสินค้า<br/><span className="font-semibold text-xl">ကုန်ပစ္စည်းအမည်</span>
                        </th>
                        <th className="border border-black p-2 font-bold text-center w-1/6">
                            จำนวน (ลัง)<br/><span className="font-semibold text-xl">အရေအတွက်</span>
                        </th>
                        <th className="border border-black p-2 font-bold text-center checkbox-cell">
                            พร้อมส่ง<br/><span className="font-semibold text-lg">အသင့်</span>
                        </th>
                        <th className="border border-black p-2 font-bold text-center w-1/4">
                            หมายเหตุ<br/><span className="font-semibold text-xl">မှတ်ချက်</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: 18 }).map((_, index) => (
                        <tr key={index}>
                            <td className="border border-black p-2 h-10 text-center">{index + 1}</td>
                            <td className="border border-black p-2 h-10"></td>
                            <td className="border border-black p-2 h-10"></td>
                            <td className="border border-black p-2 h-10 text-center">
                                <div className="w-6 h-6 border-2 border-gray-400 mx-auto"></div>
                            </td>
                            <td className="border border-black p-2 h-10"></td>
                        </tr>
                    ))}
                </tbody>
            </table>
             <div className="flex justify-end mt-8 text-lg">
                 <div>
                    <span className="font-semibold">ผู้ตรวจสอบ / CHECKED BY:</span>
                    <span className="border-b-2 border-dotted border-black inline-block w-64 ml-2"></span>
                </div>
            </div>
        </div>
    );
};

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

    const handlePrintBlankForm = () => {
         const printWindow = window.open('', '_blank', 'width=800,height=1000');
        if (printWindow) {
            const tempDiv = printWindow.document.createElement('div');
            printWindow.document.body.appendChild(tempDiv);
            
            const root = ReactDOM.createRoot(tempDiv);
            
            const style = document.createElement('style');
            style.innerHTML = Array.from(document.styleSheets)
              .map(s => {
                try {
                  return Array.from(s.cssRules).map(r => r.cssText).join('\n');
                } catch (e) {
                  return '';
                }
              })
              .join('\n');
            printWindow.document.head.appendChild(style);

            const kanitFontLink = printWindow.document.createElement('link');
            kanitFontLink.href = "https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap";
            kanitFontLink.rel = "stylesheet";
            printWindow.document.head.appendChild(kanitFontLink);

            root.render(<PrintLogSheetView />);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">บันทึกข้อมูลการแพ็คสินค้า</h2>
                <button onClick={handlePrintBlankForm} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <PrinterIcon className="w-5 h-5"/>
                    ปริ้นท์ฟอร์มเปล่า
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