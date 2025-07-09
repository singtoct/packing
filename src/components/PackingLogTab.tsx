import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { PackingLogEntry, Employee, QCEntry } from '../types';
import { getPackingLogs, savePackingLogs, getOrders, getInventory, saveInventory, getEmployees, getQCEntries, saveQCEntries } from '../services/storageService';
import { PlusCircleIcon, Trash2Icon, FileSpreadsheetIcon, DownloadIcon, UploadIcon, XCircleIcon } from './icons/Icons';
import { SearchableInput } from './SearchableInput';

type SortDirection = 'asc' | 'desc';
interface SortConfig {
    key: keyof PackingLogEntry;
    direction: SortDirection;
}

// Helper component for sortable table headers
const SortableHeader: React.FC<{
  label: string;
  sortConfig: SortConfig | null;
  requestSort: (key: keyof PackingLogEntry) => void;
  sortKey: keyof PackingLogEntry;
  className?: string;
}> = ({ label, sortConfig, requestSort, sortKey, className }) => {
  const isSorted = sortConfig?.key === sortKey;
  const directionIcon = isSorted ? (sortConfig?.direction === 'asc' ? '▲' : '▼') : '';

  return (
    <th
      scope="col"
      className={`cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
      onClick={() => requestSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isSorted && <span className="text-xs text-gray-500">{directionIcon}</span>}
      </div>
    </th>
  );
};

type StagedLog = Omit<PackingLogEntry, 'id'> & { _tempId: string };

const ImportReviewModal: React.FC<{
    stagedLogs: StagedLog[],
    onClose: () => void,
    onConfirm: (finalLogs: StagedLog[]) => void
}> = ({ stagedLogs, onClose, onConfirm }) => {
    const [logs, setLogs] = useState(stagedLogs);

    const handleItemChange = (tempId: string, field: keyof StagedLog, value: any) => {
        setLogs(current =>
            current.map(item =>
                item._tempId === tempId ? { ...item, [field]: value } : item
            )
        );
    };

    const handleRemoveItem = (tempId: string) => {
        setLogs(current => current.filter(item => item._tempId !== tempId));
    };

    const handleSubmit = () => {
        // Basic validation
        for (const log of logs) {
            if (!log.name || !log.date || !log.packerName || !log.quantity || log.quantity <= 0) {
                alert(`กรุณากรอกข้อมูลให้ครบถ้วนสำหรับแถวที่มีข้อมูล: "${log.name || 'N/A'}"`);
                return;
            }
        }
        onConfirm(logs);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">ตรวจสอบข้อมูลนำเข้า</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XCircleIcon className="w-6 h-6 text-gray-500"/></button>
                </div>
                <p className="text-sm text-gray-600 mb-4">โปรดตรวจสอบและแก้ไขข้อมูลก่อนบันทึกลงในระบบ</p>
                <div className="flex-grow overflow-y-auto border rounded-lg bg-gray-50 p-2">
                    <div className="space-y-2">
                        <div className="grid grid-cols-[2fr,1fr,2fr,1fr,auto] gap-2 text-xs font-bold px-2 py-1">
                            <span>ชื่อสินค้า</span><span>จำนวน</span><span>ผู้บันทึก</span><span>วันที่</span><span></span>
                        </div>
                        {logs.map(log => (
                             <div key={log._tempId} className="grid grid-cols-[2fr,1fr,2fr,1fr,auto] gap-2 items-center bg-white p-2 rounded shadow-sm">
                                <input type="text" value={log.name} onChange={e => handleItemChange(log._tempId, 'name', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"/>
                                <input type="number" value={log.quantity} onChange={e => handleItemChange(log._tempId, 'quantity', Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"/>
                                <input type="text" value={log.packerName} onChange={e => handleItemChange(log._tempId, 'packerName', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"/>
                                <input type="date" value={log.date} onChange={e => handleItemChange(log._tempId, 'date', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"/>
                                <button onClick={() => handleRemoveItem(log._tempId)} className="p-1 text-red-500 hover:text-red-700"><Trash2Icon className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md">ยกเลิก</button>
                    <button onClick={handleSubmit} disabled={logs.length === 0} className="px-4 py-2 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400">ยืนยันและบันทึก</button>
                </div>
            </div>
        </div>
    );
};

export const PackingLogTab: React.FC<{ setLowStockCheck: () => void; }> = ({ setLowStockCheck }) => {
    const [logs, setLogs] = useState<PackingLogEntry[]>([]);
    const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
    const [logItemName, setLogItemName] = useState('');
    const [logQuantity, setLogQuantity] = useState(1);
    const [logDate, setLogDate] = useState('');
    const [packerName, setPackerName] = useState('');
    const [availableItems, setAvailableItems] = useState<string[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [stagedLogs, setStagedLogs] = useState<StagedLog[]>([]);
    const importFileRef = useRef<HTMLInputElement>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'date', direction: 'desc' });

    useEffect(() => {
        const storedLogs = getPackingLogs();
        setLogs(storedLogs);
        
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

    const requestSort = (key: keyof PackingLogEntry) => {
        let direction: SortDirection = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedLogs = useMemo(() => {
        let sortableItems = [...logs];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (aVal < bVal) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [logs, sortConfig]);
    
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
        
        setLogs(prevLogs => [...prevLogs, newLog]);
        
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

    const handleSelectLog = (id: string, checked: boolean) => {
        setSelectedLogs(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) setSelectedLogs(new Set(logs.map(l => l.id)));
        else setSelectedLogs(new Set());
    };

    const handleDeleteSelected = () => {
        if (selectedLogs.size === 0) return;
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${selectedLogs.size} รายการที่เลือก? การกระทำนี้จะลบสินค้าออกจากสต็อกด้วย`)) {
            const logsToDelete = new Set(selectedLogs);
            const logsToDeleteArray = logs.filter(log => logsToDelete.has(log.id));

            // Reverse inventory update
            const currentInventory = getInventory();
            const logsByProduct = logsToDeleteArray.reduce((acc, log) => {
                acc[log.name] = (acc[log.name] || 0) + log.quantity;
                return acc;
            }, {} as Record<string, number>);

            const updatedInventory = currentInventory.map(item => {
                if (logsByProduct[item.name]) {
                    item.quantity -= logsByProduct[item.name];
                    if (item.quantity < 0) item.quantity = 0;
                }
                return item;
            });

            // Delete associated QC entries
            const currentQCEntries = getQCEntries();
            const updatedQCEntries = currentQCEntries.filter(entry => !logsToDelete.has(entry.packingLogId));
            
            saveInventory(updatedInventory);
            saveQCEntries(updatedQCEntries);
            setLowStockCheck();

            setLogs(prevLogs => prevLogs.filter(log => !logsToDelete.has(log.id)));
            setSelectedLogs(new Set());
        }
    };

    const handleExportHistory = () => {
        const dataToExport = sortedLogs.map(log => ({
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

                const newStagedLogs: StagedLog[] = [];
                json.forEach((row) => {
                    const productName = row['ชื่อสินค้า'];
                    const quantity = row['จำนวน (ลัง)'];
                    const packer = row['ผู้บันทึก'];
                    const rowDate = row['วันที่'];

                    if (productName && quantity > 0 && packer && rowDate) {
                        newStagedLogs.push({
                            _tempId: crypto.randomUUID(),
                            date: (rowDate instanceof Date ? rowDate : new Date(rowDate)).toISOString().split('T')[0],
                            name: productName.trim(),
                            quantity: Number(quantity),
                            packerName: packer.trim(),
                        });
                    }
                });
                
                if (newStagedLogs.length > 0) {
                    setStagedLogs(newStagedLogs);
                    setIsReviewModalOpen(true);
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
    
    const handleConfirmImport = (finalLogs: StagedLog[]) => {
        const currentInventory = getInventory();
        const currentQCEntries = getQCEntries();
        const newLogs: PackingLogEntry[] = [];

        finalLogs.forEach(logData => {
            const newLog = addLogEntry(logData, currentInventory, currentQCEntries);
            newLogs.push(newLog);
        });

        if (newLogs.length > 0) {
            saveInventory(currentInventory);
            saveQCEntries(currentQCEntries);
            const updatedLogs = [...newLogs, ...logs];
            setLogs(updatedLogs);
            setLowStockCheck();
            alert(`นำเข้าสำเร็จ ${newLogs.length} รายการ`);
        }
        setIsReviewModalOpen(false);
        setStagedLogs([]);
    };

    const packingProductOptions = useMemo(() => {
        return availableItems.map(item => ({
            id: item,
            name: item,
        }));
    }, [availableItems]);


    return (
        <div>
            {isReviewModalOpen && <ImportReviewModal stagedLogs={stagedLogs} onClose={() => setIsReviewModalOpen(false)} onConfirm={handleConfirmImport} />}
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">บันทึกข้อมูลการแพ็คสินค้า</h2>
                <div className="flex gap-2 flex-wrap">
                    <input type="file" ref={importFileRef} onChange={handleImportFromExcel} accept=".xlsx, .xls" className="hidden"/>
                     <button onClick={() => importFileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none">
                        <UploadIcon className="w-5 h-5"/>
                        นำเข้า (Excel)
                    </button>
                    <button onClick={handleExportHistory} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none">
                        <DownloadIcon className="w-5 h-5"/>
                        ส่งออกประวัติ (Excel)
                    </button>
                    <button onClick={() => {
                        const wb = XLSX.utils.book_new();
                        const ws = XLSX.utils.aoa_to_sheet([["วันที่", "ชื่อสินค้า", "จำนวน (ลัง)", "ผู้บันทึก"]]);
                        ws['!cols'] = [{ wch: 15 }, { wch: 50 }, { wch: 15 }, { wch: 20 }];
                        XLSX.utils.book_append_sheet(wb, ws, "Packing Import Template");
                        XLSX.writeFile(wb, "Packing_Import_Template.xlsx");
                    }} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none">
                        <FileSpreadsheetIcon className="w-5 h-5"/>
                        ส่งออกฟอร์มเปล่า
                    </button>
                </div>
            </div>

            <form onSubmit={handleAddLog} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-lg border mb-10">
                <div className="md:col-span-2">
                    <label htmlFor="logItemName" className="block text-sm font-medium text-gray-700">สินค้าที่แพ็ค</label>
                    <SearchableInput
                        options={packingProductOptions}
                        value={logItemName}
                        onChange={setLogItemName}
                        displayKey="name"
                        valueKey="id"
                        placeholder="ค้นหาสินค้าที่แพ็ค..."
                        className="mt-1"
                    />
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
            <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">ประวัติการบันทึก</h2>
                <button 
                    onClick={handleDeleteSelected}
                    disabled={selectedLogs.size === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <Trash2Icon className="w-5 h-5"/>
                    ลบ ({selectedLogs.size})
                </button>
            </div>
             <div className="overflow-x-auto">
                <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="p-4">
                                <input 
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    onChange={e => handleSelectAll(e.target.checked)}
                                    checked={logs.length > 0 && selectedLogs.size === logs.length}
                                />
                            </th>
                            <SortableHeader sortKey="date" label="วันที่" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />
                            <SortableHeader sortKey="name" label="ชื่อสินค้า" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />
                            <SortableHeader sortKey="quantity" label="จำนวน (ลัง)" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />
                            <SortableHeader sortKey="packerName" label="ผู้บันทึก" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">ลบ</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {sortedLogs.length > 0 ? (
                            sortedLogs.map(log => (
                                <tr key={log.id} className={selectedLogs.has(log.id) ? 'bg-green-50' : ''}>
                                    <td className="p-4">
                                        <input 
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                            checked={selectedLogs.has(log.id)}
                                            onChange={e => handleSelectLog(log.id, e.target.checked)}
                                        />
                                    </td>
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
                            <tr><td colSpan={6} className="text-center text-gray-500 py-8">ยังไม่มีการบันทึก</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};