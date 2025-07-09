import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { RawMaterial, BillOfMaterial, MoldingLogEntry, Product } from '../types';
import { getRawMaterials, saveRawMaterials, getBOMs, saveBOMs, getMoldingLogs, getProducts } from '../services/storageService';
import { PlusCircleIcon, Trash2Icon, EditIcon, SparklesIcon, DownloadIcon, UploadIcon, XCircleIcon } from './icons/Icons';
import { IntelligentMaterialImportModal } from './IntelligentMaterialImportModal';
import { SearchableInput } from './SearchableInput';

type View = 'inventory' | 'bom';

interface RawMaterialExcelRow {
    Name?: string;
    Quantity?: number;
    Unit?: string;
    CostPerUnit?: number;
}

const commonInputStyle = "px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500";
const buttonPrimaryStyle = "inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700";
const buttonSecondaryStyle = "inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50";

type SortDirection = 'asc' | 'desc';
interface SortConfig {
    key: keyof RawMaterial;
    direction: SortDirection;
}

// Helper component for sortable table headers
const SortableHeader: React.FC<{
  label: string;
  sortConfig: SortConfig | null;
  requestSort: (key: keyof RawMaterial) => void;
  sortKey: keyof RawMaterial;
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
    stagedData: RawMaterialExcelRow[],
    onClose: () => void,
    onConfirm: (finalData: RawMaterialExcelRow[]) => void
}> = ({ stagedData, onClose, onConfirm }) => {
    const [data, setData] = useState(stagedData.map(d => ({...d, _tempId: crypto.randomUUID() })));

    const handleItemChange = (tempId: string, field: keyof RawMaterialExcelRow, value: any) => {
        setData(current =>
            current.map(item =>
                item._tempId === tempId ? { ...item, [field]: value } : item
            )
        );
    };

    const handleRemoveItem = (tempId: string) => {
        setData(current => current.filter(item => item._tempId !== tempId));
    };

    const handleSubmit = () => onConfirm(data);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">ตรวจสอบข้อมูลวัตถุดิบ</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XCircleIcon className="w-6 h-6 text-gray-500"/></button>
                </div>
                <div className="flex-grow overflow-y-auto border rounded-lg bg-gray-50 p-2">
                    <div className="space-y-2">
                        <div className="grid grid-cols-[3fr,1.5fr,1fr,1.5fr,auto] gap-2 text-xs font-bold px-2 py-1">
                            <span>ชื่อ (Name)</span><span>จำนวน (Quantity)</span><span>หน่วย (Unit)</span><span>ต้นทุน/หน่วย (Cost)</span><span></span>
                        </div>
                        {data.map(d => (
                             <div key={d._tempId} className="grid grid-cols-[3fr,1.5fr,1fr,1.5fr,auto] gap-2 items-center bg-white p-2 rounded shadow-sm">
                                <input type="text" value={d.Name || ''} onChange={e => handleItemChange(d._tempId, 'Name', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"/>
                                <input type="number" value={d.Quantity || 0} onChange={e => handleItemChange(d._tempId, 'Quantity', Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"/>
                                <input type="text" value={d.Unit || ''} onChange={e => handleItemChange(d._tempId, 'Unit', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"/>
                                <input type="number" value={d.CostPerUnit || ''} onChange={e => handleItemChange(d._tempId, 'CostPerUnit', Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"/>
                                <button onClick={() => handleRemoveItem(d._tempId)} className="p-1 text-red-500 hover:text-red-700"><Trash2Icon className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md">ยกเลิก</button>
                    <button onClick={handleSubmit} disabled={data.length === 0} className="px-4 py-2 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700">ยืนยันและนำเข้า</button>
                </div>
            </div>
        </div>
    );
};

export const RawMaterialsTab: React.FC = () => {
    const [view, setView] = useState<View>('inventory');
    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
    const [boms, setBoms] = useState<BillOfMaterial[]>([]);

    useEffect(() => {
        const handleStorageChange = () => {
            setRawMaterials(getRawMaterials());
            setBoms(getBOMs());
        };
        handleStorageChange();
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const ViewButton: React.FC<{ targetView: View, label: string }> = ({ targetView, label }) => (
        <button
            onClick={() => setView(targetView)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                view === targetView
                    ? 'bg-green-600 text-white shadow'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">จัดการวัตถุดิบ</h2>
                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                    <ViewButton targetView="inventory" label="คลังวัตถุดิบ" />
                    <ViewButton targetView="bom" label="สูตรการผลิต (BOM)" />
                </div>
            </div>

            {view === 'inventory' ? (
                <InventoryView rawMaterials={rawMaterials} setRawMaterials={setRawMaterials} />
            ) : (
                <BOMView boms={boms} setBoms={setBoms} rawMaterials={rawMaterials} />
            )}
        </div>
    );
};

const InventoryView: React.FC<{ rawMaterials: RawMaterial[], setRawMaterials: React.Dispatch<React.SetStateAction<RawMaterial[]>> }> = ({ rawMaterials, setRawMaterials }) => {
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState(0);
    const [unit, setUnit] = useState('kg');
    const [costPerUnit, setCostPerUnit] = useState<number | ''>('');
    const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExcelReviewModalOpen, setIsExcelReviewModalOpen] = useState(false);
    const [stagedData, setStagedData] = useState<RawMaterialExcelRow[]>([]);
    const importFileRef = useRef<HTMLInputElement>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'name', direction: 'asc' });

    const requestSort = (key: keyof RawMaterial) => {
        let direction: SortDirection = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedRawMaterials = useMemo(() => {
        let sortableItems = [...rawMaterials];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];

                if (aVal === undefined || aVal === null) return 1;
                if (bVal === undefined || bVal === null) return -1;
                
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
    }, [rawMaterials, sortConfig]);

    const handleAddMaterial = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !unit.trim()) return;
        const newMaterial: RawMaterial = { 
            id: crypto.randomUUID(), 
            name, 
            quantity, 
            unit,
            costPerUnit: costPerUnit === '' ? undefined : Number(costPerUnit)
        };
        const updatedMaterials = [...rawMaterials, newMaterial];
        setRawMaterials(updatedMaterials);
        saveRawMaterials(updatedMaterials);
        setName('');
        setQuantity(0);
        setUnit('kg');
        setCostPerUnit('');
    };
    
    const handleUpdateField = (id: string, field: 'quantity' | 'costPerUnit', value: number) => {
        const updated = rawMaterials.map(m => m.id === id ? { ...m, [field]: value } : m);
        setRawMaterials(updated);
        saveRawMaterials(updated);
    };

    const handleDeleteMaterial = (id: string) => {
        if (window.confirm('การลบวัตถุดิบจะทำให้ BOM ที่ใช้วัตถุดิบนี้เสียหายได้ ยืนยันหรือไม่?')) {
            const updated = rawMaterials.filter(m => m.id !== id);
            setRawMaterials(updated);
            saveRawMaterials(updated);
        }
    };
    
    const handleSelectMaterial = (id: string, checked: boolean) => {
        setSelectedMaterials(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) setSelectedMaterials(new Set(rawMaterials.map(m => m.id)));
        else setSelectedMaterials(new Set());
    };

    const handleDeleteSelected = () => {
        if (selectedMaterials.size === 0) return;
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${selectedMaterials.size} รายการที่เลือก?`)) {
            const updated = rawMaterials.filter(m => !selectedMaterials.has(m.id));
            setRawMaterials(updated);
            saveRawMaterials(updated);
            setSelectedMaterials(new Set());
        }
    };

    const handleSaveImportedMaterials = (newMaterials: RawMaterial[]) => {
        const updatedMaterials = [...rawMaterials, ...newMaterials];
        setRawMaterials(updatedMaterials);
        saveRawMaterials(updatedMaterials);
    };

    const handleExportTemplate = () => {
        const headers = [['Name', 'Quantity', 'Unit', 'CostPerUnit']];
        const ws = XLSX.utils.aoa_to_sheet(headers);
        ws['!cols'] = [{wch: 40}, {wch: 15}, {wch: 15}, {wch: 15}];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Raw_Material_Template");
        XLSX.writeFile(wb, "Raw_Material_Import_Template.xlsx");
    };

     const handleImportFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json<RawMaterialExcelRow>(worksheet);

                if (json.length > 0) {
                    setStagedData(json);
                    setIsExcelReviewModalOpen(true);
                } else {
                    alert('ไม่พบข้อมูลในไฟล์');
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

    const handleConfirmExcelImport = (finalData: RawMaterialExcelRow[]) => {
        const materialsMap = new Map(rawMaterials.map(m => [m.name, m]));
        finalData.forEach(row => {
            const name = row.Name;
            if (name) {
                const existing = materialsMap.get(name);
                if (existing) {
                    existing.quantity = Number(row.Quantity ?? existing.quantity);
                    existing.unit = row.Unit ?? existing.unit;
                    existing.costPerUnit = row.CostPerUnit !== undefined ? Number(row.CostPerUnit) : existing.costPerUnit;
                } else {
                    materialsMap.set(name, {
                        id: crypto.randomUUID(),
                        name: name,
                        quantity: Number(row.Quantity || 0),
                        unit: row.Unit || '',
                        costPerUnit: row.CostPerUnit !== undefined ? Number(row.CostPerUnit) : undefined,
                    });
                }
            }
        });
        const updatedList = Array.from(materialsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        saveRawMaterials(updatedList);
        setRawMaterials(updatedList);
        alert(`นำเข้าและอัปเดตสำเร็จ ${finalData.length} รายการ`);
        setIsExcelReviewModalOpen(false);
    };


    return (
        <div>
             {isImportModalOpen && (
                <IntelligentMaterialImportModal 
                    onClose={() => setIsImportModalOpen(false)}
                    onSave={handleSaveImportedMaterials}
                />
            )}
            {isExcelReviewModalOpen && <ImportReviewModal stagedData={stagedData} onClose={() => setIsExcelReviewModalOpen(false)} onConfirm={handleConfirmExcelImport} />}
            <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">เพิ่ม/แก้ไข วัตถุดิบ</h3>
                <div className="flex gap-2 flex-wrap">
                    <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700"
                    >
                        <SparklesIcon className="w-5 h-5"/>
                        นำเข้าอัจฉริยะ
                    </button>
                    <input type="file" ref={importFileRef} onChange={handleImportFromExcel} accept=".xlsx, .xls" className="hidden"/>
                    <button onClick={() => importFileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700">
                        <UploadIcon className="w-5 h-5"/>
                        นำเข้า (Excel)
                    </button>
                    <button onClick={handleExportTemplate} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700">
                        <DownloadIcon className="w-5 h-5"/>
                        ส่งออกฟอร์มเปล่า
                    </button>
                </div>
            </div>
            <form onSubmit={handleAddMaterial} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-lg border mb-8">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">ชื่อวัตถุดิบ</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className={`mt-1 block w-full ${commonInputStyle}`} required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">จำนวน</label>
                    <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className={`mt-1 block w-full ${commonInputStyle}`} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">หน่วย</label>
                    <input type="text" value={unit} onChange={e => setUnit(e.target.value)} placeholder="เช่น kg, ชิ้น, ม้วน" className={`mt-1 block w-full ${commonInputStyle}`} required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">ต้นทุน/หน่วย</label>
                    <input type="number" step="0.01" value={costPerUnit} onChange={e => setCostPerUnit(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Optional" className={`mt-1 block w-full ${commonInputStyle}`} />
                </div>
                <button type="submit" className={`${buttonPrimaryStyle} self-end h-10 col-span-full md:col-span-1`}>
                    <PlusCircleIcon className="w-5 h-5" /> เพิ่ม
                </button>
            </form>
            <div className="flex justify-end mb-4">
                <button 
                    onClick={handleDeleteSelected}
                    disabled={selectedMaterials.size === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <Trash2Icon className="w-5 h-5"/>
                    ลบ ({selectedMaterials.size})
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
                                    checked={rawMaterials.length > 0 && selectedMaterials.size === rawMaterials.length}
                                />
                            </th>
                            <SortableHeader sortKey="name" label="ชื่อวัตถุดิบ" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider" />
                            <SortableHeader sortKey="quantity" label="จำนวนในสต็อก" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider" />
                            <SortableHeader sortKey="unit" label="หน่วย" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider" />
                            <SortableHeader sortKey="costPerUnit" label="ต้นทุน/หน่วย (บาท)" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider" />
                            <th className="px-6 py-3 w-20"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {sortedRawMaterials.map(mat => (
                            <tr key={mat.id} className={selectedMaterials.has(mat.id) ? 'bg-green-50' : ''}>
                                <td className="p-4">
                                    <input 
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        checked={selectedMaterials.has(mat.id)}
                                        onChange={e => handleSelectMaterial(mat.id, e.target.checked)}
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mat.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <input 
                                        type="number" 
                                        value={mat.quantity} 
                                        onChange={e => handleUpdateField(mat.id, 'quantity', Number(e.target.value))}
                                        className={`w-24 text-right ${commonInputStyle}`}
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mat.unit}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                     <input 
                                        type="number"
                                        step="0.01" 
                                        value={mat.costPerUnit ?? ''} 
                                        onChange={e => handleUpdateField(mat.id, 'costPerUnit', Number(e.target.value))}
                                        className={`w-24 text-right ${commonInputStyle}`}
                                        placeholder="N/A"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <button onClick={() => handleDeleteMaterial(mat.id)} className="text-red-500 hover:text-red-700"><Trash2Icon className="w-5 h-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const CopyBomModal: React.FC<{
    sourceBom: BillOfMaterial;
    allProducts: string[];
    existingBomProductNames: Set<string>;
    onClose: () => void;
    onConfirm: (destinationProduct: string) => void;
}> = ({ sourceBom, allProducts, existingBomProductNames, onClose, onConfirm }) => {
    const [destinationProduct, setDestinationProduct] = useState('');

    const availableProductsForCopy = useMemo(() => {
        return allProducts
            .filter(p => !existingBomProductNames.has(p) && p !== sourceBom.productName)
            .map(p => ({ id: p, name: p }));
    }, [allProducts, existingBomProductNames, sourceBom.productName]);

    const handleConfirm = () => {
        if (!destinationProduct) {
            alert('กรุณาเลือกสินค้าปลายทาง');
            return;
        }
        onConfirm(destinationProduct);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">คัดลอกสูตรการผลิต (BOM)</h2>
                <p className="mb-2">จาก: <span className="font-semibold text-green-700">{sourceBom.productName}</span></p>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="destinationProduct" className="block text-sm font-medium text-gray-700">ไปที่สินค้า (ที่ยังไม่มี BOM):</label>
                        <SearchableInput
                            options={availableProductsForCopy}
                            value={destinationProduct}
                            onChange={setDestinationProduct}
                            displayKey="name"
                            valueKey="id"
                            placeholder="ค้นหาสินค้าปลายทาง..."
                            className="mt-1"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-8">
                    <button type="button" onClick={onClose} className={buttonSecondaryStyle}>
                        ยกเลิก
                    </button>
                    <button type="button" onClick={handleConfirm} disabled={!destinationProduct} className={buttonPrimaryStyle}>
                        ยืนยันการคัดลอก
                    </button>
                </div>
            </div>
        </div>
    );
};

const BOMView: React.FC<{ boms: BillOfMaterial[], setBoms: React.Dispatch<React.SetStateAction<BillOfMaterial[]>>, rawMaterials: RawMaterial[] }> = ({ boms, setBoms, rawMaterials }) => {
    const [selectedProduct, setSelectedProduct] = useState('');
    const [editingBom, setEditingBom] = useState<BillOfMaterial | null>(null);
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [bomSortDir, setBomSortDir] = useState<SortDirection>('asc');

    const availableProducts = useMemo(() => {
        const productSet = new Set<string>();
        getMoldingLogs().forEach(log => productSet.add(log.productName));
        getProducts().forEach(prod => productSet.add(`${prod.name} (${prod.color})`));
        const sorted = Array.from(productSet).sort((a,b) => a.localeCompare(b));
        if(bomSortDir === 'desc') {
            return sorted.reverse();
        }
        return sorted;
    }, [bomSortDir]);
    
    const rawMaterialMap = useMemo(() => new Map(rawMaterials.map(rm => [rm.id, rm])), [rawMaterials]);
    const bomProductNames = useMemo(() => new Set(boms.map(b => b.productName)), [boms]);
    
    useEffect(() => {
        if (selectedProduct) {
            const existingBom = boms.find(b => b.productName === selectedProduct);
            setEditingBom(existingBom ? { ...existingBom } : { productName: selectedProduct, components: [] });
        } else {
            setEditingBom(null);
        }
    }, [selectedProduct, boms]);

    const handleAddComponent = () => {
        if (!editingBom || rawMaterials.length === 0) return;
        setEditingBom({
            ...editingBom,
            components: [...editingBom.components, { rawMaterialId: rawMaterials[0].id, quantity: 1 }]
        });
    };

    const handleUpdateComponent = (index: number, field: 'rawMaterialId' | 'quantity', value: string | number) => {
        if (!editingBom) return;
        const newComponents = [...editingBom.components];
        newComponents[index] = { ...newComponents[index], [field]: value };
        setEditingBom({ ...editingBom, components: newComponents });
    };
    
    const handleRemoveComponent = (index: number) => {
        if (!editingBom) return;
        const newComponents = editingBom.components.filter((_, i) => i !== index);
        setEditingBom({ ...editingBom, components: newComponents });
    };

    const handleSaveBom = () => {
        if (!editingBom) return;
        const updatedBoms = boms.filter(b => b.productName !== editingBom.productName);
        setBoms([...updatedBoms, editingBom]);
        saveBOMs([...updatedBoms, editingBom]);
        alert(`บันทึก BOM สำหรับ ${editingBom.productName} เรียบร้อยแล้ว`);
    };

    const handleCopyBom = (destinationProduct: string) => {
        if (!editingBom) return;
        const newBom: BillOfMaterial = {
            productName: destinationProduct,
            components: editingBom.components,
        };
        const updatedBoms = [...boms, newBom];
        setBoms(updatedBoms);
        saveBOMs(updatedBoms);
        alert(`คัดลอก BOM จาก "${editingBom.productName}" ไปยัง "${destinationProduct}" เรียบร้อยแล้ว`);
        setIsCopyModalOpen(false);
        setSelectedProduct(destinationProduct);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">เลือกสินค้า</h3>
                    <div className="flex gap-1">
                        <button onClick={() => setBomSortDir('asc')} className={`p-1 rounded ${bomSortDir === 'asc' ? 'bg-green-200' : 'hover:bg-gray-100'}`}>A-Z</button>
                        <button onClick={() => setBomSortDir('desc')} className={`p-1 rounded ${bomSortDir === 'desc' ? 'bg-green-200' : 'hover:bg-gray-100'}`}>Z-A</button>
                    </div>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                    {availableProducts.map(prod => (
                        <div key={prod} onClick={() => setSelectedProduct(prod)} className={`p-3 rounded-lg cursor-pointer ${selectedProduct === prod ? 'bg-green-600 text-white' : 'bg-white hover:bg-green-50 border'}`}>
                            {prod}
                            {boms.some(b => b.productName === prod) && <span className="ml-2 text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">มี BOM</span>}
                        </div>
                    ))}
                </div>
            </div>
            <div className="md:col-span-2">
                {isCopyModalOpen && editingBom && (
                    <CopyBomModal
                        sourceBom={editingBom}
                        allProducts={availableProducts}
                        existingBomProductNames={bomProductNames}
                        onClose={() => setIsCopyModalOpen(false)}
                        onConfirm={handleCopyBom}
                    />
                )}
                {editingBom ? (
                    <div className="bg-white p-6 rounded-lg shadow-inner border h-full">
                        <h3 className="text-2xl font-bold mb-4 text-green-700">{editingBom.productName}</h3>
                        <div className="space-y-4">
                            {editingBom.components.map((comp, index) => (
                                <div key={index} className="flex items-center gap-2 bg-gray-50 p-3 rounded-md">
                                    <div className="w-1/2">
                                        <SearchableInput
                                            options={rawMaterials}
                                            value={comp.rawMaterialId}
                                            onChange={newValue => handleUpdateComponent(index, 'rawMaterialId', newValue)}
                                            displayKey="name"
                                            valueKey="id"
                                            placeholder="ค้นหาวัตถุดิบ..."
                                        />
                                    </div>
                                    <input type="number" step="0.001" value={comp.quantity} onChange={e => handleUpdateComponent(index, 'quantity', Number(e.target.value))} className={`${commonInputStyle} w-1/4`} />
                                    <span className="text-gray-600 w-1/4">{rawMaterialMap.get(comp.rawMaterialId)?.unit || ''} / 1 ชิ้น</span>
                                    <button onClick={() => handleRemoveComponent(index)} className="text-red-500 hover:text-red-700 p-1"><Trash2Icon className="w-5 h-5"/></button>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex gap-4 flex-wrap">
                            <button onClick={handleAddComponent} className={buttonSecondaryStyle}>เพิ่มส่วนประกอบ</button>
                            <button onClick={handleSaveBom} className={buttonPrimaryStyle}>บันทึก BOM</button>
                             <button
                                onClick={() => setIsCopyModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-blue-300 text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-100 hover:bg-blue-200"
                                title="คัดลอก BOM นี้ไปใช้กับสินค้าอื่น"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                คัดลอก BOM
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed">
                        <EditIcon className="w-16 h-16 text-gray-400 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600">เลือกสินค้าเพื่อสร้างหรือแก้ไข BOM</h3>
                        <p className="text-gray-500">BOM คือสูตรที่บอกว่าสินค้า 1 ชิ้นใช้วัตถุดิบอะไรบ้าง</p>
                    </div>
                )}
            </div>
        </div>
    );
};