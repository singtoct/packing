import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Product, BillOfMaterial, RawMaterial } from '../types';
import { getProducts, saveProducts, getBOMs, getRawMaterials, addProduct } from '../services/storageService';
import { PlusCircleIcon, Trash2Icon, EditIcon, DownloadIcon, DatabaseIcon, UploadIcon, XCircleIcon } from 'lucide-react';

type SortDirection = 'asc' | 'desc';
type ProductWithCost = Product & { cost: number, profit: number };
type SortKey = keyof ProductWithCost;

interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

const SortableHeader: React.FC<{
    label: string;
    sortKey: SortKey;
    sortConfig: SortConfig | null;
    requestSort: (key: SortKey) => void;
    className?: string;
    justify?: 'left' | 'right';
}> = ({ label, sortKey, sortConfig, requestSort, className, justify = 'left' }) => {
    const isSorted = sortConfig?.key === sortKey;
    const directionIcon = isSorted ? (sortConfig?.direction === 'asc' ? '▲' : '▼') : '';
    const justifyClass = justify === 'right' ? 'justify-end' : 'justify-start';

    return (
        <th scope="col" className={`cursor-pointer hover:bg-gray-100 transition-colors ${className || ''}`} onClick={() => requestSort(sortKey)}>
            <div className={`flex items-center gap-1 ${justifyClass}`}>
                <span>{label}</span>
                {isSorted && <span className="text-xs">{directionIcon}</span>}
            </div>
        </th>
    );
};

interface ProductExcelRow {
    Name?: string;
    Color?: string;
    SalePrice?: number;
    CycleTimeSeconds?: number;
}

const EditProductModal: React.FC<{
    product: Product;
    onClose: () => void;
    onSave: (updatedProduct: Product) => void;
}> = ({ product, onClose, onSave }) => {
    const [editedProduct, setEditedProduct] = useState(product);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setEditedProduct(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? undefined : Number(value)) : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(editedProduct);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">แก้ไขสินค้า</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ชื่อสินค้า</label>
                        <input type="text" name="name" value={editedProduct.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">สี</label>
                        <input type="text" name="color" value={editedProduct.color} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ราคาขาย (ต่อชิ้น)</label>
                        <input type="number" name="salePrice" min="0" step="any" value={editedProduct.salePrice} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cycle Time (วินาที)</label>
                        <input type="number" name="cycleTimeSeconds" min="0" step="any" value={editedProduct.cycleTimeSeconds ?? ''} onChange={handleChange} placeholder="Optional for OEE" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md">ยกเลิก</button>
                        <button type="submit" className="px-4 py-2 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700">บันทึก</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ImportReviewModal: React.FC<{
    stagedData: ProductExcelRow[],
    onClose: () => void,
    onConfirm: (finalData: ProductExcelRow[]) => void
}> = ({ stagedData, onClose, onConfirm }) => {
    const [data, setData] = useState(stagedData.map(d => ({...d, _tempId: crypto.randomUUID() })));

    const handleItemChange = (tempId: string, field: keyof ProductExcelRow, value: any) => {
        setData(current =>
            current.map(item =>
                item._tempId === tempId ? { ...item, [field]: value } : item
            )
        );
    };

    const handleRemoveItem = (tempId: string) => {
        setData(current => current.filter(item => item._tempId !== tempId));
    };

    const handleSubmit = () => {
        onConfirm(data);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">ตรวจสอบข้อมูลสินค้า</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XCircleIcon className="w-6 h-6 text-gray-500"/></button>
                </div>
                <div className="flex-grow overflow-y-auto border rounded-lg bg-gray-50 p-2">
                    <div className="space-y-2">
                        <div className="grid grid-cols-[3fr,2fr,2fr,2fr,auto] gap-2 text-xs font-bold px-2 py-1">
                            <span>ชื่อสินค้า (Name)</span><span>สี (Color)</span><span>ราคาขาย (SalePrice)</span><span>CycleTime (sec)</span><span></span>
                        </div>
                        {data.map(p => (
                            <div key={p._tempId} className="grid grid-cols-[3fr,2fr,2fr,2fr,auto] gap-2 items-center bg-white p-2 rounded shadow-sm">
                                <input type="text" value={p.Name || ''} onChange={e => handleItemChange(p._tempId, 'Name', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                <input type="text" value={p.Color || ''} onChange={e => handleItemChange(p._tempId, 'Color', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                <input type="number" value={p.SalePrice || 0} onChange={e => handleItemChange(p._tempId, 'SalePrice', Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                <input type="number" value={p.CycleTimeSeconds || ''} onChange={e => handleItemChange(p._tempId, 'CycleTimeSeconds', Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                <button onClick={() => handleRemoveItem(p._tempId)} className="p-1 text-red-500 hover:text-red-700"><Trash2Icon className="w-4 h-4"/></button>
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

export const ProductsTab: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    const [boms, setBoms] = useState<BillOfMaterial[]>([]);
    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
    
    const [name, setName] = useState('');
    const [color, setColor] = useState('');
    const [salePrice, setSalePrice] = useState<number | ''>('');
    const [cycleTime, setCycleTime] = useState<number | ''>('');

    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [stagedData, setStagedData] = useState<ProductExcelRow[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const importFileRef = useRef<HTMLInputElement>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'name', direction: 'asc' });

    useEffect(() => {
        const refreshData = async () => {
            setProducts(await getProducts());
            setBoms(await getBOMs());
            setRawMaterials(await getRawMaterials());
        };
        refreshData();
        window.addEventListener('storage', refreshData as any);
        return () => window.removeEventListener('storage', refreshData as any);
    }, []);

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const productCosts = useMemo(() => {
        const bomMap = new Map(boms.map(b => [b.productName, b.components]));
        const materialMap = new Map(rawMaterials.map(m => [m.id, m.costPerUnit || 0]));
        
        const costs = new Map<string, number>();
        products.forEach(p => {
            const fullName = `${p.name} (${p.color})`;
            const components = bomMap.get(fullName);
            if(components && Array.isArray(components)) {
                const totalCost = components.reduce((sum, comp) => {
                    const cost = materialMap.get(comp.rawMaterialId) || 0;
                    return sum + (cost * comp.quantity);
                }, 0);
                costs.set(p.id, totalCost);
            } else {
                costs.set(p.id, 0);
            }
        });
        return costs;
    }, [products, boms, rawMaterials]);
    
    const sortedProducts = useMemo(() => {
        let sortableItems: ProductWithCost[] = products.map((p: Product) => {
            const cost = productCosts.get(p.id) || 0;
            const salePriceValue = Number(p.salePrice) || 0;
            return {
                ...p,
                salePrice: salePriceValue,
                cost,
                profit: Number(salePriceValue) - Number(cost),
            };
        });

        if (sortConfig) {
            sortableItems.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
        
                if (aVal === undefined || aVal === null) return 1;
                if (bVal === undefined || bVal === null) return -1;
        
                let comparison = 0;
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    comparison = aVal - bVal;
                } else {
                    comparison = String(aVal).localeCompare(String(bVal));
                }
                
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
        }
        return sortableItems;
    }, [products, productCosts, sortConfig]);

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!name.trim() || !color.trim() || salePrice === '') return;

        const newProductData: Omit<Product, 'id'> = {
            name,
            color,
            salePrice: Number(salePrice),
            cycleTimeSeconds: cycleTime === '' ? undefined : Number(cycleTime),
        };
        const newProduct = await addProduct(newProductData);
        const updated = [...products, newProduct];
        setProducts(updated);
        setName('');
        setColor('');
        setSalePrice('');
        setCycleTime('');
    };

    const handleUpdateProduct = async (updatedProduct: Product) => {
        const updated = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
        setProducts(updated);
        await saveProducts(updated);
        setEditingProduct(null);
    };

    const handleDeleteProduct = async (id: string) => {
        if(window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?')) {
            const updated = products.filter(p => p.id !== id);
            setProducts(updated);
            await saveProducts(updated);
        }
    };

    const handleSelectProduct = (id: string, checked: boolean) => {
        setSelectedProducts(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) setSelectedProducts(new Set(products.map(p => p.id)));
        else setSelectedProducts(new Set());
    };

    const handleDeleteSelected = async () => {
        if (selectedProducts.size === 0) return;
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${selectedProducts.size} สินค้าที่เลือก?`)) {
            const updated = products.filter(p => !selectedProducts.has(p.id));
            setProducts(updated);
            await saveProducts(updated);
            setSelectedProducts(new Set());
        }
    };


    const handleExportTemplate = () => {
        const headers = [['Name', 'Color', 'SalePrice', 'CycleTimeSeconds']];
        const ws = XLSX.utils.aoa_to_sheet(headers);
        ws['!cols'] = [{wch: 40}, {wch: 20}, {wch: 15}, {wch: 20}];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Product_Template");
        XLSX.writeFile(wb, "Product_Import_Template.xlsx");
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
                const json = XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet);
                
                const findHeader = (row: Record<string, any>, ...possibleNames: string[]): string | undefined => {
                    const rowKeys = Object.keys(row);
                    for (const name of possibleNames) {
                        const foundKey = rowKeys.find(key => key.toLowerCase().trim().replace(/ /g, '') === name.toLowerCase());
                        if (foundKey) return foundKey;
                    }
                    return undefined;
                };

                const firstRow = json[0] || {};
                const nameHeader = findHeader(firstRow, 'name', 'ชื่อสินค้า');
                const colorHeader = findHeader(firstRow, 'color', 'สี');
                const salePriceHeader = findHeader(firstRow, 'saleprice', 'ราคาขาย');
                const cycleTimeHeader = findHeader(firstRow, 'cycletimeseconds', 'cycletime');

                if (!nameHeader || !colorHeader || !salePriceHeader) {
                    alert('ไม่พบ Header ที่จำเป็นในไฟล์ Excel (ต้องมี: Name/ชื่อสินค้า, Color/สี, SalePrice/ราคาขาย)');
                    if (importFileRef.current) importFileRef.current.value = '';
                    return;
                }
                
                const newStagedData: ProductExcelRow[] = json.map(row => {
                    const name = row[nameHeader];
                    const color = row[colorHeader];
                    const salePrice = row[salePriceHeader];
                    const cycleTime = cycleTimeHeader ? row[cycleTimeHeader] : undefined;

                    return {
                        Name: typeof name === 'string' ? name.trim() : undefined,
                        Color: typeof color === 'string' ? color.trim() : undefined,
                        SalePrice: typeof salePrice === 'number' ? salePrice : undefined,
                        CycleTimeSeconds: typeof cycleTime === 'number' ? cycleTime : undefined,
                    };
                }).filter(p => p.Name && p.Color && typeof p.SalePrice === 'number');


                if (newStagedData.length > 0) {
                    setStagedData(newStagedData);
                    setIsReviewModalOpen(true);
                } else {
                    alert('ไม่พบข้อมูลสินค้าที่ถูกต้องในไฟล์');
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

    const handleConfirmImport = async (finalData: ProductExcelRow[]) => {
        const productMap: Map<string, Product> = new Map(products.map(p => [`${p.name} (${p.color})`.toLowerCase(), p]));
        
        for (const row of finalData) {
            if (row.Name && row.Color && row.SalePrice !== undefined) {
                const key = `${row.Name} (${row.Color})`.toLowerCase();
                const existing = productMap.get(key);
                if (existing) {
                    // Update existing
                    existing.salePrice = row.SalePrice;
                    existing.cycleTimeSeconds = row.CycleTimeSeconds;
                } else {
                    // Add new
                    const newProduct: Product = {
                        id: crypto.randomUUID(),
                        name: row.Name,
                        color: row.Color,
                        salePrice: row.SalePrice,
                        cycleTimeSeconds: row.CycleTimeSeconds,
                    };
                    productMap.set(key, newProduct);
                }
            }
        }

        const updatedList = Array.from(productMap.values()).sort((a,b) => a.name.localeCompare(b.name));
        setProducts(updatedList);
        await saveProducts(updatedList);
        alert(`นำเข้าและอัปเดตสำเร็จ ${finalData.length} รายการ`);
        setIsReviewModalOpen(false);
    };

    return (
        <div>
            {editingProduct && <EditProductModal product={editingProduct} onClose={() => setEditingProduct(null)} onSave={handleUpdateProduct} />}
            {isReviewModalOpen && <ImportReviewModal stagedData={stagedData} onClose={() => setIsReviewModalOpen(false)} onConfirm={handleConfirmImport} />}
            
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">จัดการรายการสินค้า</h2>
                 <div className="flex gap-2 flex-wrap">
                    <input type="file" ref={importFileRef} onChange={handleImportFromExcel} accept=".xlsx, .xls" className="hidden"/>
                    <button onClick={() => importFileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700">
                        <UploadIcon className="w-5 h-5"/>
                        นำเข้า (Excel)
                    </button>
                    <button onClick={handleExportTemplate} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700">
                        <DownloadIcon className="w-5 h-5"/>
                        ส่งออกฟอร์มเปล่า
                    </button>
                </div>
            </div>

            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-lg border mb-10">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">ชื่อสินค้า</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">สี</label>
                    <input type="text" value={color} onChange={e => setColor(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">ราคาขาย</label>
                    <input type="number" min="0" step="any" value={salePrice} onChange={e => setSalePrice(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Cycle Time (วินาที)</label>
                    <input type="number" min="0" step="any" value={cycleTime} onChange={e => setCycleTime(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Optional" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <button type="submit" className="md:col-start-5 inline-flex items-center justify-center gap-2 w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
                    <PlusCircleIcon className="w-5 h-5" /> เพิ่มสินค้า
                </button>
            </form>

            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">รายการสินค้าทั้งหมด</h3>
                <button
                    onClick={handleDeleteSelected}
                    disabled={selectedProducts.size === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                >
                    <Trash2Icon className="w-5 h-5"/>
                    ลบ ({selectedProducts.size})
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                    <thead className="bg-gray-50">
                        <tr>
                             <th className="p-4"><input type="checkbox" onChange={e => handleSelectAll(e.target.checked)} checked={products.length > 0 && selectedProducts.size === products.length} /></th>
                            <SortableHeader label="ชื่อสินค้า" sortKey="name" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase w-2/5" />
                            <SortableHeader label="ราคาขาย" sortKey="salePrice" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase" justify="right" />
                            <SortableHeader label="ต้นทุนวัตถุดิบ" sortKey="cost" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase" justify="right" />
                            <SortableHeader label="กำไร" sortKey="profit" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase" justify="right" />
                            <th className="px-6 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {sortedProducts.map(p => (
                            <tr key={p.id} className={selectedProducts.has(p.id) ? 'bg-green-50' : ''}>
                                <td className="p-4"><input type="checkbox" checked={selectedProducts.has(p.id)} onChange={e => handleSelectProduct(p.id, e.target.checked)} /></td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.name} ({p.color})</td>
                                <td className="px-6 py-4 text-sm text-right">{p.salePrice.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</td>
                                <td className="px-6 py-4 text-sm text-right">{p.cost > 0 ? p.cost.toLocaleString('th-TH', { style: 'currency', currency: 'THB' }) : '-'}</td>
                                <td className={`px-6 py-4 text-sm font-bold text-right ${p.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>{p.profit.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => setEditingProduct(p)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><EditIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2Icon className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};