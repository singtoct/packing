

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { MoldingLogEntry, Employee, RawMaterial, BillOfMaterial } from '../types';
import { getMoldingLogs, saveMoldingLogs, getEmployees, getRawMaterials, saveRawMaterials, getBOMs } from '../services/storageService';
import { PlusCircleIcon, Trash2Icon, AlertTriangleIcon, DownloadIcon } from './icons/Icons';

const NEXT_STEPS = ['แปะกันรอย', 'ประกบ', 'ห้องประกอบ', 'ห้องแพ็ค'];

export const MoldingTab: React.FC = () => {
    const [logs, setLogs] = useState<MoldingLogEntry[]>([]);
    const [productName, setProductName] = useState('');
    const [quantityProduced, setQuantityProduced] = useState(1);
    const [quantityRejected, setQuantityRejected] = useState(0);
    const [machine, setMachine] = useState('เครื่อง 1');
    const [operatorName, setOperatorName] = useState('');
    const [date, setDate] = useState('');
    const [nextStep, setNextStep] = useState(NEXT_STEPS[0]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    
    // New state for BOM and Raw Materials
    const [boms, setBoms] = useState<BillOfMaterial[]>([]);
    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

    useEffect(() => {
        const handleStorageChange = () => {
            const storedLogs = getMoldingLogs();
            setLogs(storedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            const loadedEmployees = getEmployees();
            setEmployees(loadedEmployees);
            setBoms(getBOMs());
            setRawMaterials(getRawMaterials());

            if (loadedEmployees.length > 0 && !operatorName) {
                setOperatorName(loadedEmployees[0].name);
            }
        };

        const today = new Date().toISOString().split('T')[0];
        setDate(today);
        handleStorageChange();

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [operatorName]);

    const materialCheck = useMemo(() => {
        if (!productName || quantityProduced <= 0) {
            return { required: [], isSufficient: true, message: "กรุณากรอกข้อมูลสินค้าและจำนวน" };
        }

        const bom = boms.find(b => b.productName === productName);
        if (!bom) {
            return { required: [], isSufficient: true, message: "ไม่พบสูตรการผลิต (BOM) สำหรับสินค้านี้" };
        }

        const rawMaterialMap = new Map(rawMaterials.map(rm => [rm.id, rm]));
        
        let isSufficient = true;
        const required = bom.components.map(comp => {
            const material = rawMaterialMap.get(comp.rawMaterialId);
            const requiredQty = comp.quantity * quantityProduced;
            const hasEnough = material ? material.quantity >= requiredQty : false;
            if (!hasEnough) isSufficient = false;
            return {
                name: material?.name || 'วัตถุดิบไม่พบ',
                unit: material?.unit || '',
                required: requiredQty,
                inStock: material?.quantity || 0,
                sufficient: hasEnough,
            };
        });

        return { required, isSufficient, message: "" };
    }, [productName, quantityProduced, boms, rawMaterials]);

    const handleAddLog = (e: React.FormEvent) => {
        e.preventDefault();
        if (!productName.trim() || !date || !operatorName || !machine || !nextStep || !materialCheck.isSufficient) return;
        
        // Final check before saving
        const currentRawMaterials = getRawMaterials();
        const bom = boms.find(b => b.productName === productName);
        if (bom) {
            for (const component of bom.components) {
                const material = currentRawMaterials.find(rm => rm.id === component.rawMaterialId);
                if (!material || material.quantity < component.quantity * quantityProduced) {
                    alert(`วัตถุดิบไม่เพียงพอ: ${material?.name}. ไม่สามารถบันทึกได้`);
                    setRawMaterials(currentRawMaterials); // Refresh state
                    return;
                }
            }
        }
        
        const newLog: MoldingLogEntry = {
            id: crypto.randomUUID(),
            date,
            productName: productName.trim(),
            quantityProduced,
            quantityRejected,
            machine,
            operatorName,
            status: `รอ${nextStep}`,
        };

        // Deduct raw materials from stock
        if (bom) {
            const updatedRawMaterials = currentRawMaterials.map(rm => {
                const component = bom.components.find(c => c.rawMaterialId === rm.id);
                if (component) {
                    rm.quantity -= component.quantity * quantityProduced;
                }
                return rm;
            });
            saveRawMaterials(updatedRawMaterials);
            setRawMaterials(updatedRawMaterials); // Update local state
        }

        const updatedLogs = [newLog, ...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLogs(updatedLogs);
        saveMoldingLogs(updatedLogs);

        // Reset form
        setProductName('');
        setQuantityProduced(1);
        setQuantityRejected(0);
    };

    const handleDeleteLog = (id: string) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการบันทึกนี้? การกระทำนี้จะไม่คืนวัตถุดิบที่ใช้ไปในสต็อก')) {
            const updatedLogs = logs.filter(log => log.id !== id);
            setLogs(updatedLogs);
            saveMoldingLogs(updatedLogs);
        }
    };
    
    const handleExportTemplate = () => {
        const headers = [['Date', 'ProductName', 'QuantityProduced', 'QuantityRejected', 'Machine', 'OperatorName', 'Status']];
        const ws = XLSX.utils.aoa_to_sheet(headers);
        ws['!cols'] = [{wch: 15}, {wch: 40}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 20}, {wch: 20}];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Molding_Log_Template");
        XLSX.writeFile(wb, "Molding_Log_Import_Template.xlsx");
    };

    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">บันทึกข้อมูลการผลิต (แผนกฉีด)</h2>
                 <button onClick={handleExportTemplate} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none">
                    <DownloadIcon className="w-5 h-5"/>
                    ส่งออกฟอร์มเปล่า
                </button>
            </div>

            <form onSubmit={handleAddLog} className="space-y-6 bg-gray-50 p-6 rounded-lg border mb-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="sm:col-span-2">
                        <label htmlFor="productName" className="block text-sm font-medium text-gray-700">ชื่อสินค้า/ชิ้นส่วน</label>
                        <input type="text" id="productName" value={productName} onChange={e => setProductName(e.target.value)} placeholder="เช่น ฝาหน้ากาก CT A-103" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label htmlFor="quantityProduced" className="block text-sm font-medium text-gray-700">จำนวนที่ผลิตได้</label>
                        <input type="number" id="quantityProduced" min="0" value={quantityProduced} onChange={e => setQuantityProduced(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label htmlFor="quantityRejected" className="block text-sm font-medium text-gray-700">จำนวนของเสีย</label>
                        <input type="number" id="quantityRejected" min="0" value={quantityRejected} onChange={e => setQuantityRejected(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label htmlFor="machine" className="block text-sm font-medium text-gray-700">เครื่องจักร</label>
                        <input type="text" id="machine" value={machine} onChange={e => setMachine(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label htmlFor="operatorName" className="block text-sm font-medium text-gray-700">ผู้ควบคุมเครื่อง</label>
                        <select id="operatorName" value={operatorName} onChange={e => setOperatorName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm" required>
                            {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="nextStep" className="block text-sm font-medium text-gray-700">ขั้นตอนต่อไป</label>
                        <select id="nextStep" value={nextStep} onChange={e => setNextStep(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm" required>
                            {NEXT_STEPS.map(step => <option key={step} value={step}>{step}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="logDate" className="block text-sm font-medium text-gray-700">วันที่ผลิต</label>
                        <input type="date" id="logDate" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                </div>

                {materialCheck.required.length > 0 && (
                    <div className="mt-4 p-4 border-l-4 border-green-400 bg-green-50 rounded-md">
                        <h4 className="font-bold text-green-800 mb-2">วัตถุดิบที่ต้องใช้</h4>
                        <ul className="space-y-1 text-sm">
                            {materialCheck.required.map((mat, idx) => (
                                <li key={idx} className={`flex justify-between ${mat.sufficient ? 'text-gray-700' : 'text-red-600 font-bold'}`}>
                                    <span>{mat.name}</span>
                                    <span>ต้องการ: {mat.required.toLocaleString()} {mat.unit} (มี: {mat.inStock.toLocaleString()})</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                 {!materialCheck.isSufficient && (
                     <div className="mt-4 p-4 border-l-4 border-red-500 bg-red-50 text-red-700 font-bold flex items-center gap-2">
                        <AlertTriangleIcon className="w-5 h-5" />
                        วัตถุดิบในสต็อกไม่เพียงพอ! ไม่สามารถบันทึกการผลิตได้
                    </div>
                 )}

                <div className="col-span-full flex justify-end">
                     <button type="submit" disabled={!materialCheck.isSufficient} className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed">
                        <PlusCircleIcon className="w-5 h-5" />
                        บันทึกข้อมูล
                    </button>
                </div>
            </form>

             <h2 className="text-2xl font-bold mb-4">ประวัติการผลิต</h2>
             <div className="overflow-x-auto">
                <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สินค้า</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผลิตได้</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ของเสีย</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เครื่องจักร</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้ควบคุม</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">ลบ</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {logs.length > 0 ? (
                            logs.map(log => (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{new Date(log.date).toLocaleDateString('th-TH')}</td>
                                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{log.productName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm"><span className="px-2 py-1 font-semibold leading-tight text-yellow-700 bg-yellow-100 rounded-full">{log.status || '-'}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{log.quantityProduced.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{log.quantityRejected.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.machine}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">{log.operatorName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleDeleteLog(log.id)} className="text-red-600 hover:text-red-900" aria-label={`Delete log for ${log.productName}`}><Trash2Icon className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={8} className="text-center text-gray-500 py-8">ยังไม่มีการบันทึกข้อมูลการผลิต</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};