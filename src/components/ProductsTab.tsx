
import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Product, BillOfMaterial, RawMaterial } from '../types';
import { getProducts, saveProducts, getBOMs, getRawMaterials } from '../services/storageService';
import { PlusCircleIcon, Trash2Icon, EditIcon, DownloadIcon, DatabaseIcon, UploadIcon, XCircleIcon } from './icons/Icons';

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
            [name]: type === 'number' ? Number(value) : value,
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
                        <label className="block text-sm font-medium text-gray-700">ราคาขาย (ต่อลัง)</label>
                        <input type="number" name="salePrice" min="0" step="0.01" value={editedProduct.salePrice} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
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
    stagedData: any[],
    onClose: () => void,
    onConfirm: (finalData: any[]) => void
}> = ({ stagedData, onClose, onConfirm }) => {
    const [data, setData] = useState(stagedData.map(d => ({...d, _tempId: crypto.randomUUID() })));

    const handleItemChange = (tempId: string, field: string, value: any) => {
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">ตรวจสอบข้อมูลสินค้า</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XCircleIcon className="w-6 h-6 text-gray-500"/></button>
                </div>
                <div className="flex-grow overflow-y-auto border rounded-lg bg-gray-50 p-2">
                    <div className="space-y-2">
                        <div className="grid grid-cols-[3fr,2fr,2fr,auto] gap-2 text-xs font-bold px-2 py-1">
                            <span>ชื่อสินค้า (Name)</span><span>สี (Color)</span><span>ราคาขาย (SalePrice)</span><span></span>
                        </div>
                        {data.map(p => (
                            <div key={p._tempId} className="grid grid-cols-[3fr,2fr,2fr,auto] gap-2 items-center bg-white p-2 rounded shadow-sm">
                                <input type="text" value={p.Name} onChange={e => handleItemChange(p._tempId, 'Name', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                <input type="text" value={p.Color} onChange={e => handleItemChange(p._tempId, 'Color', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                <input type="number" value={p.SalePrice} onChange={e => handleItemChange(p._tempId, 'SalePrice', Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
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

    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [stagedData, setStagedData] = useState<any[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const importFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const refreshData = () => {
            setProducts(getProducts());
            setBoms(getBOMs());
            setRawMaterials(getRawMaterials());
        };
        refreshData();
        window.addEventListener('storage', refreshData);
        return () => window.removeEventListener('storage', refreshData);
    }, []);

    const productCosts = useMemo(() => {
        const bomMap = new Map(boms.map(b => [b.productName, b.components]));
        const materialMap = new Map(rawMaterials.map(m => [m.id, m.costPerUnit || 0]));
        
        const costs = new Map<string, number>();
        products.forEach(p => {
            const fullName = `${p.name} (${p.color})`;
            const components = bomMap.get(fullName);
            if(components) {
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

    const handleAddProduct = (e: React.FormEvent) => {
        e.preventDefault();
        if(!name.trim() || !color.trim() || salePrice === '') return;

        const newProduct: Product = {
            id: crypto.randomUUID(),
            name,
            color,
            salePrice: Number(salePrice)
        };
        const updated = [...products, newProduct].sort((a,b) => a.name.localeCompare(b.name));
        setProducts(updated);
        saveProducts(updated);
        setName('');
        setColor('');
        setSalePrice('');
    };

    const handleUpdateProduct = (updatedProduct: Product) => {
        const updated = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
        setProducts(updated);
        saveProducts(updated);
        setEditingProduct(null);
    };

    const handleDeleteProduct = (id: string) => {
        if(window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?')) {
            const updated = products.filter(p => p.id !== id);
            setProducts(updated);
            saveProducts(updated);
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

    const handleDeleteSelected = () => {
        if (selectedProducts.size === 0) return;
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${selectedProducts.size} สินค้าที่เลือก?`)) {
            const updated = products.filter(p => !selectedProducts.has(p.id));
            setProducts(updated);
            saveProducts(updated);
            setSelectedProducts(new Set());
        }
    };


    const handleExportTemplate = () => {
        const headers = [['ชื่อสินค้า', 'สี', 'ราคาขาย']];
        const ws = XLSX.utils.aoa_to_sheet(headers);
        ws['!cols'] = [{wch: 40}, {wch: 20}, {wch: 15}];
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
                const json = XLSX.utils.sheet_to_json<any>(worksheet);
                
                const findHeader = (row: any, ...possibleNames: string[]): string | undefined => {
                    const rowKeys = Object.keys(row);
                    for (const name of possibleNames) {
                        const foundKey = rowKeys.find(key => key.toLowerCase().trim() === name.toLowerCase());
                        if (foundKey) return foundKey;
                    }
                    return undefined;
                };

                const firstRow = json[0] || {};
                const nameHeader = findHeader(firstRow, 'name', 'ชื่อสินค้า');
                const colorHeader = findHeader(firstRow, 'color', 'สี');
                const salePriceHeader = findHeader(firstRow, 'saleprice', 'ราคาขาย');

                if (!nameHeader || !colorHeader) {
                    alert('ไม่พบหัวคอลัมน์ที่จำเป็น (Name/ชื่อสินค้า, Color/สี) ในไฟล์ Excel');
                    if (importFileRef.current) importFileRef.current.value = '';
                    return;
                }

                const processedData = json.map(row => {
                    const name = row[nameHeader];
                    const color = row[colorHeader];
                    let salePrice: number | string | undefined = salePriceHeader ? row[salePriceHeader] : undefined;

                    if (typeof salePrice === 'string') {
                        salePrice = Number(salePrice.replace(/[^0-9.-]+/g, ""));
                    }
                    if (salePrice === undefined || salePrice === null || isNaN(Number(salePrice))) {
                        salePrice = 0;
                    }

                    return {
                        Name: name,
                        Color: color,
                        SalePrice: Number(salePrice),
                    };
                }).filter(row => row.Name && row.Color);

                if (processedData.length > 0) {
                    setStagedData(processedData);
                    setIsReviewModalOpen(true);
                } else {
                     alert("ไม่พบข้อมูลสินค้าที่ถูกต้องในไฟล์ Excel");
                }

            } catch (error) {
                console.error("Error importing products:", error);
                alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel");
            } finally {
                if(importFileRef.current) importFileRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleConfirmImport = (finalData: any[]) => {
        const productMap = new Map(products.map(p => [`${p.name}-${p.color}`, p]));
        
        finalData.forEach(row => {
            const name = row.Name;
            const color = row.Color;
            const salePrice = Number(row.SalePrice);

            if (name && color && !isNaN(salePrice)) {
                const key = `${name}-${color}`;
                const existing = productMap.get(key);
                if (existing) {
                    existing.salePrice = salePrice;
                } else {
                    productMap.set(key, { id: crypto.randomUUID(), name, color, salePrice });
                }
            }
        });
        
        const updated = Array.from(productMap.values()).sort((a,b) => a.name.localeCompare(b.name));
        setProducts(updated);
        saveProducts(updated);
        alert(`นำเข้าและอัปเดตสำเร็จ ${finalData.length} รายการ`);
        setIsReviewModalOpen(false);
    };

    return (
        <div>
            {editingProduct && <EditProductModal product={editingProduct} onClose={() => setEditingProduct(null)} onSave={handleUpdateProduct} />}
            {isReviewModalOpen && <ImportReviewModal stagedData={stagedData} onClose={() => setIsReviewModalOpen(false)} onConfirm={handleConfirmImport} />}

            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold">จัดการรายการสินค้า (Master Data)</h2>
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
             <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-50 p-4 rounded-lg border mb-10">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">ชื่อสินค้า</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">สี</label>
                    <input type="text" value={color} onChange={e => setColor(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">ราคาขาย (ต่อลัง)</label>
                    <input type="number" min="0" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                <div className="col-span-full flex justify-end">
                     <button type="submit" className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
                        <PlusCircleIcon className="w-5 h-5" />
                        เพิ่มสินค้า
                    </button>
                </div>
            </form>

            <div className="flex justify-end mb-4">
                 <button 
                    onClick={handleDeleteSelected}
                    disabled={selectedProducts.size === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <Trash2Icon className="w-5 h-5"/>
                    ลบ ({selectedProducts.size})
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
                                    checked={products.length > 0 && selectedProducts.size === products.length}
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">สินค้า</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">ราคาขาย</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">ต้นทุนวัตถุดิบ</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">กำไร</th>
                            <th className="relative px-6 py-3 w-28"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {products.length > 0 ? products.map(p => {
                            const cost = productCosts.get(p.id) || 0;
                            const profit = p.salePrice - cost;
                            return (
                                <tr key={p.id} className={selectedProducts.has(p.id) ? 'bg-green-50' : ''}>
                                    <td className="p-4">
                                        <input 
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                            checked={selectedProducts.has(p.id)}
                                            onChange={e => handleSelectProduct(p.id, e.target.checked)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                                        <p className="text-sm text-gray-500">{p.color}</p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-700">{p.salePrice.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-700">{cost > 0 ? cost.toFixed(2) : '-'}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${profit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                        {cost > 0 ? profit.toFixed(2) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => setEditingProduct(p)} className="text-blue-600 hover:text-blue-900 mr-3"><EditIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDeleteProduct(p.id)} className="text-red-600 hover:text-red-900"><Trash2Icon className="w-5 h-5"/></button>
                                    </td>
                                </tr>
                            )
                        }) : (
                            <tr><td colSpan={6} className="text-center text-gray-500 py-8">
                                <DatabaseIcon className="mx-auto w-12 h-12 text-gray-300"/>
                                <p className="mt-2">ยังไม่มีสินค้าในระบบ</p>
                            </td></tr>
                        )}
                    </tbody>
                 </table>
            </div>
        </div>
    );
};
