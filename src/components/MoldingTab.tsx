import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { MoldingLogEntry, Employee, RawMaterial, BillOfMaterial, Product } from '../types';
import { getMoldingLogs, saveMoldingLogs, getEmployees, getRawMaterials, saveRawMaterials, getBOMs, getProducts } from '../services/storageService';
import { PlusCircleIcon, Trash2Icon, AlertTriangleIcon, DownloadIcon, UploadIcon, XCircleIcon } from './icons/Icons';
import { SearchableInput } from './SearchableInput';

const NEXT_STEPS = ['แปะกันรอย', 'ประกบ', 'ห้องประกอบ', 'ห้องแพ็ค'];

type StagedLog = Omit<MoldingLogEntry, 'id'> & { _tempId: string };

interface MoldingLogExcelRow {
    Date?: Date | string;
    ProductName?: string;
    QuantityProduced?: number;
    QuantityRejected?: number;
    Machine?: string;
    OperatorName?: string;
    Status?: string;
}

type SortDirection = 'asc' | 'desc';
interface SortConfig {
    key: keyof MoldingLogEntry;
    direction: SortDirection;
}

// Helper component for sortable table headers
const SortableHeader: React.FC<{
  label: string;
  sortConfig: SortConfig | null;
  requestSort: (key: keyof MoldingLogEntry) => void;
  sortKey: keyof MoldingLogEntry;
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
        onConfirm(logs);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">ตรวจสอบข้อมูลนำเข้า (แผนกฉีด)</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XCircleIcon className="w-6 h-6 text-gray-500"/></button>
                </div>
                <div className="flex-grow overflow-y-auto border rounded-lg bg-gray-50 p-2">
                     <div className="space-y-2">
                        <div className="grid grid-cols-[1fr,2fr,1fr,1fr,1fr,1.5fr,1.5fr,auto] gap-2 text-xs font-bold px-2 py-1">
                            <span>วันที่</span><span>สินค้า</span><span>ผลิตได้</span><span>ของเสีย</span><span>เครื่องจักร</span><span>ผู้ควบคุม</span><span>สถานะ</span><span></span>
                        </div>
                        {logs.map(log => (
                            <div key={log._tempId} className="grid grid-cols-[1fr,2fr,1fr,1fr,1fr,1.5fr,1.5fr,auto] gap-2 items-center bg-white p-2 rounded shadow-sm">
                               <input type="date" value={log.date} onChange={e => handleItemChange(log._tempId, 'date', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"/>
                               <input type="text" value={log.productName} onChange={e => handleItemChange(log._tempId, 'productName', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"/>
                               <input type="number" value={log.quantityProduced} onChange={e => handleItemChange(log._tempId, 'quantityProduced', Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"/>
                               <input type="number" value={log.quantityRejected} onChange={e => handleItemChange(log._tempId, 'quantityRejected', Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"/>
                               <input type="text" value={log.machine} onChange={e => handleItemChange(log._tempId, 'machine', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"/>
                               <input type="text" value={log.operatorName} onChange={e => handleItemChange(log._tempId, 'operatorName', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"/>
                               <input type="text" value={log.status} onChange={e => handleItemChange(log._tempId, 'status', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"/>
                               <button onClick={() => handleRemoveItem(log._tempId)} className="p-1 text-red-500 hover:text-red-700"><Trash2Icon className="w-4 h-4"/></button>
                            </div>
                        ))}
                     </div>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md">ยกเลิก</button>
                    <button onClick={handleSubmit} disabled={logs.length === 0} className="px-4 py-2 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700">ยืนยันและนำเข้า</button>
                </div>
            </div>
        </div>
    );
};

export const MoldingTab: React.FC = () => {
    const [logs, setLogs] = useState<MoldingLogEntry[]>([]);
    const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
    const [productName, setProductName] = useState('');
    const [quantityProduced, setQuantityProduced] = useState(1);
    const [quantityRejected, setQuantityRejected] = useState(0);
    const [machine, setMachine] = useState('เครื่อง 1');
    const [operatorName, setOperatorName] = useState('');
    const [date, setDate] = useState('');
    const [nextStep, setNextStep] = useState(NEXT_STEPS[0]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    
    // New state for BOM and Raw Materials
    const [boms, setBoms] = useState<BillOfMaterial[]>([]);
    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [stagedLogs, setStagedLogs] = useState<StagedLog[]>([]);
    const importFileRef = useRef<HTMLInputElement>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'date', direction: 'desc' });

    useEffect(() => {
        const handleStorageChange = () => {
            const storedLogs = getMoldingLogs();
            setLogs(storedLogs);
            const loadedEmployees = getEmployees();
            setEmployees(loadedEmployees);
            setBoms(getBOMs());
            setRawMaterials(getRawMaterials());
            setProducts(getProducts());

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
    
    const requestSort = (key: keyof MoldingLogEntry) => {
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

    const materialCheck = useMemo(() => {
        if (!productName || quantityProduced <= 0) {
            return { required: [], isSufficient: true, message: "กรุณากรอกข้อมูลสินค้าและจำนวน", hasBOM: false, totalCost: 0 };
        }

        const bom = boms.find(b => b.productName === productName);
        if (!bom || !Array.isArray(bom.components)) {
            return { required: [], isSufficient: false, message: "ไม่พบสูตรการผลิต (BOM) สำหรับสินค้านี้", hasBOM: false, totalCost: 0 };
        }

        const rawMaterialMap = new Map<string, RawMaterial>(rawMaterials.map(rm => [rm.id, rm]));
        
        let isSufficient = true;
        let totalCost = 0;
        const required = bom.components.map(comp => {
            const material = rawMaterialMap.get(comp.rawMaterialId);
            const requiredQty = comp.quantity * quantityProduced;
            const hasEnough = material ? material.quantity >= requiredQty : false;
            const costPerUnit = material?.costPerUnit || 0;
            const itemTotalCost = requiredQty * costPerUnit;
            totalCost += itemTotalCost;

            if (!hasEnough) isSufficient = false;
            
            return {
                name: material?.name || 'วัตถุดิบไม่พบ',
                unit: material?.unit || '',
                required: requiredQty,
                inStock: material?.quantity || 0,
                sufficient: hasEnough,
                costPerUnit: costPerUnit,
                totalCost: itemTotalCost,
            };
        });

        return { required, isSufficient, message: "", hasBOM: true, totalCost };
    }, [productName, quantityProduced, boms, rawMaterials]);

    const handleAddLog = (e: React.FormEvent) => {
        e.preventDefault();
        if (!productName.trim() || !date || !operatorName || !machine || !nextStep) return;

        if (!materialCheck.hasBOM) {
            alert(materialCheck.message || 'ไม่สามารถบันทึกได้เนื่องจากไม่พบสูตรการผลิต (BOM)');
            return;
        }
        if (!materialCheck.isSufficient) {
            const insufficientItemsMessage = materialCheck.required
                .filter(item => !item.sufficient)
                .map(item => {
                    const needed = item.required.toLocaleString(undefined, {maximumFractionDigits: 2});
                    const inStock = item.inStock.toLocaleString(undefined, {maximumFractionDigits: 2});
                    const shortfall = (item.required - item.inStock).toLocaleString(undefined, {maximumFractionDigits: 2});
                    return `\n- ${item.name}: ต้องการ ${needed} ${item.unit}, มีในสต็อก ${inStock} ${item.unit} (ขาด ${shortfall} ${item.unit})`;
                })
                .join('');
            
            alert(`วัตถุดิบไม่พอสำหรับผลิต "${productName}" จำนวน ${quantityProduced.toLocaleString()} ชิ้น:${insufficientItemsMessage}\n\nกรุณาตรวจสอบสต็อกหรือลดจำนวนการผลิต`);
            return;
        }

        const bom = boms.find(b => b.productName === productName)!;
        
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

        const currentRawMaterials = getRawMaterials();
        const updatedRawMaterials = currentRawMaterials.map(rm => {
            const component = bom.components.find(c => c.rawMaterialId === rm.id);
            if (component) {
                rm.quantity -= component.quantity * quantityProduced;
            }
            return rm;
        });
        saveRawMaterials(updatedRawMaterials);
        setRawMaterials(updatedRawMaterials);

        const updatedLogs = [newLog, ...logs];
        setLogs(updatedLogs);
        saveMoldingLogs(updatedLogs);

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

    const handleSelectLog = (id: string, checked: boolean) => {
        setSelectedLogs(prev => {
            const newSet = new Set(prev);
            if(checked) newSet.add(id);
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
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${selectedLogs.size} รายการที่เลือก? การกระทำนี้จะไม่คืนวัตถุดิบที่ใช้ไป`)) {
            const updatedLogs = logs.filter(log => !selectedLogs.has(log.id));
            setLogs(updatedLogs);
            saveMoldingLogs(updatedLogs);
            setSelectedLogs(new Set());
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
                const jsonLogs = XLSX.utils.sheet_to_json<MoldingLogExcelRow>(worksheet);

                const newStagedLogs: StagedLog[] = [];
                jsonLogs.forEach((row) => {
                    if (row.ProductName && row.QuantityProduced && row.QuantityProduced > 0) {
                        newStagedLogs.push({
                            _tempId: crypto.randomUUID(),
                            date: (row.Date instanceof Date ? row.Date : new Date()).toISOString().split('T')[0],
                            productName: row.ProductName,
                            quantityProduced: Number(row.QuantityProduced),
                            quantityRejected: Number(row.QuantityRejected || 0),
                            machine: row.Machine || 'N/A',
                            operatorName: row.OperatorName || 'N/A',
                            status: row.Status || 'รอแปะกันรอย'
                        });
                    }
                });
                
                if (newStagedLogs.length > 0) {
                    setStagedLogs(newStagedLogs);
                    setIsReviewModalOpen(true);
                } else {
                    alert("ไม่พบข้อมูลที่ถูกต้องในไฟล์");
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
        // Pre-flight check
        const bomsMap = new Map(getBOMs().map(b => [b.productName, b]));
        const materialsMap = new Map(getRawMaterials().map(m => [m.id, m]));
        const requiredMaterials = new Map<string, number>();

        for (const row of finalLogs) {
            const bom = bomsMap.get(row.productName);
            if (bom) {
                for (const comp of bom.components) {
                    const needed = comp.quantity * (row.quantityProduced || 0);
                    requiredMaterials.set(comp.rawMaterialId, (requiredMaterials.get(comp.rawMaterialId) || 0) + needed);
                }
            }
        }
        
        for (const [id, needed] of requiredMaterials.entries()) {
            const material = materialsMap.get(id);
            if (!material || material.quantity < needed) {
                const materialName = material?.name || id;
                alert(`วัตถุดิบไม่เพียงพอสำหรับนำเข้าทั้งหมด: ${materialName}. ต้องการ ${needed}, มี ${material?.quantity || 0}`);
                return;
            }
        }

        // Proceed with import
        const newLogs: MoldingLogEntry[] = [];
        const updatedRawMaterials = getRawMaterials();
        finalLogs.forEach(row => {
            const newLog: MoldingLogEntry = { ...row, id: crypto.randomUUID() };
            newLogs.push(newLog);
            const bom = bomsMap.get(row.productName);
            if(bom) {
                bom.components.forEach(comp => {
                    const matIndex = updatedRawMaterials.findIndex(m => m.id === comp.rawMaterialId);
                    if(matIndex > -1) {
                        updatedRawMaterials[matIndex].quantity -= comp.quantity * newLog.quantityProduced;
                    }
                });
            }
        });

        saveRawMaterials(updatedRawMaterials);
        setRawMaterials(updatedRawMaterials);
        const allLogs = [...newLogs, ...logs];
        saveMoldingLogs(allLogs);
        setLogs(allLogs);
        alert(`นำเข้าสำเร็จ ${newLogs.length} รายการ`);
        setIsReviewModalOpen(false);
    };
    
    const moldingProductOptions = useMemo(() => {
        return products.map(p => ({
            id: `${p.name} (${p.color})`,
            name: `${p.name} (${p.color})`,
        })).sort((a,b) => a.name.localeCompare(b.name));
    }, [products]);


    return (
        <div>
            {isReviewModalOpen && <ImportReviewModal stagedLogs={stagedLogs} onClose={() => setIsReviewModalOpen(false)} onConfirm={handleConfirmImport} />}
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">บันทึกข้อมูลการผลิต (แผนกฉีด)</h2>
                 <div className="flex gap-2 flex-wrap">
                    <input type="file" ref={importFileRef} onChange={handleImportFromExcel} accept=".xlsx, .xls" className="hidden"/>
                    <button onClick={() => importFileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none">
                        <UploadIcon className="w-5 h-5"/>
                        นำเข้า (Excel)
                    </button>
                    <button onClick={handleExportTemplate} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none">
                        <DownloadIcon className="w-5 h-5"/>
                        ส่งออกฟอร์มเปล่า
                    </button>
                </div>
            </div>

            <form onSubmit={handleAddLog} className="space-y-6 bg-gray-50 p-6 rounded-lg border mb-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="sm:col-span-2">
                        <label htmlFor="productName" className="block text-sm font-medium text-gray-700">ชื่อสินค้า/ชิ้นส่วน</label>
                        <SearchableInput
                            options={moldingProductOptions}
                            value={productName}
                            onChange={setProductName}
                            displayKey="name"
                            valueKey="id"
                            placeholder="ค้นหาสินค้า..."
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <label htmlFor="quantityProduced" className="block text-sm font-medium text-gray-700">จำนวนที่ผลิตได้</label>
                        <div className="relative mt-1">
                            <input type="number" id="quantityProduced" min="0" value={quantityProduced} onChange={e => setQuantityProduced(Number(e.target.value))} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm pr-12" required />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">Pcs.</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="quantityRejected" className="block text-sm font-medium text-gray-700">จำนวนของเสีย</label>
                        <div className="relative mt-1">
                            <input type="number" id="quantityRejected" min="0" value={quantityRejected} onChange={e => setQuantityRejected(Number(e.target.value))} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm pr-12" required />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">Pcs.</span>
                            </div>
                        </div>
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

                <div className="col-span-full flex justify-end">
                     <button type="submit" disabled={!materialCheck.isSufficient || !materialCheck.hasBOM} className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed">
                        <PlusCircleIcon className="w-5 h-5" />
                        บันทึกข้อมูล
                    </button>
                </div>
            </form>

            {materialCheck.hasBOM && materialCheck.required.length > 0 && (
                <div className="mt-8 mb-10">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">วัตถุดิบและต้นทุนสำหรับล็อตนี้</h3>
                    <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
                        <table className="min-w-full bg-white">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ลำดับ</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สินค้า</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวนที่ใช้</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ต้นทุน/หน่วย</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ต้นทุนรวม</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {materialCheck.required.map((mat, index) => (
                                    <tr key={index} className={!mat.sufficient ? 'bg-red-50' : ''}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{mat.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                                            {mat.required.toLocaleString(undefined, {maximumFractionDigits: 3})} {mat.unit}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                                            {mat.costPerUnit > 0 ? mat.costPerUnit.toLocaleString('th-TH', { style: 'currency', currency: 'THB' }) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right font-semibold">
                                            {mat.totalCost > 0 ? mat.totalCost.toLocaleString('th-TH', { style: 'currency', currency: 'THB' }) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-100 border-t-2 border-gray-200">
                                <tr>
                                    <td colSpan={4} className="px-6 py-3 text-right font-bold text-gray-700 text-base">
                                        ต้นทุนวัตถุดิบรวม
                                    </td>
                                    <td className="px-6 py-3 text-right font-bold text-gray-800 text-lg">
                                        {materialCheck.totalCost.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

             {!materialCheck.isSufficient && materialCheck.hasBOM && (
                 <div className="mb-10 p-4 border-l-4 border-red-500 bg-red-50 text-red-700 font-bold flex items-center gap-2 rounded-r-md">
                    <AlertTriangleIcon className="w-5 h-5" />
                    วัตถุดิบในสต็อกไม่เพียงพอ! ไม่สามารถบันทึกการผลิตได้
                </div>
             )}

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">ประวัติการผลิต</h2>
                <button
                    onClick={handleDeleteSelected}
                    disabled={selectedLogs.size === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                >
                    <Trash2Icon className="w-5 h-5" />
                    ลบ ({selectedLogs.size})
                </button>
            </div>
             <div className="overflow-x-auto">
                <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    onChange={e => handleSelectAll(e.target.checked)}
                                    checked={logs.length > 0 && selectedLogs.size === logs.length}
                                />
                            </th>
                            <SortableHeader sortKey="date" label="วันที่" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />
                            <SortableHeader sortKey="productName" label="สินค้า" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />
                            <SortableHeader sortKey="status" label="สถานะ" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />
                            <SortableHeader sortKey="quantityProduced" label="ผลิตได้" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />
                            <SortableHeader sortKey="quantityRejected" label="ของเสีย" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />
                            <SortableHeader sortKey="machine" label="เครื่องจักร" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />
                            <SortableHeader sortKey="operatorName" label="ผู้ควบคุม" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />
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
                            <tr><td colSpan={9} className="text-center text-gray-500 py-8">ยังไม่มีการบันทึกข้อมูลการผลิต</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};