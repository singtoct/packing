


import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Product, BillOfMaterial, RawMaterial } from '../types';
import { getProducts, saveProducts, getBOMs, getRawMaterials } from '../services/storageService';
import { PlusCircleIcon, Trash2Icon, EditIcon, DownloadIcon, DatabaseIcon, UploadIcon } from './icons/Icons';

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

export const ProductsTab: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [boms, setBoms] = useState<BillOfMaterial[]>([]);
    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
    
    const [name, setName] = useState('');
    const [color, setColor] = useState('');
    const [salePrice, setSalePrice] = useState<number | ''>('');

    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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

    const handleExportTemplate = () => {
        const headers = [['Name', 'Color', 'SalePrice']];
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
                
                const newProducts: Product[] = [];
                json.forEach((row, index) => {
                    if (row.Name && row.Color && row.SalePrice > 0) {
                        newProducts.push({
                            id: crypto.randomUUID(),
                            name: row.Name,
                            color: row.Color,
                            salePrice: Number(row.SalePrice)
                        });
                    } else {
                        console.warn(`Skipping invalid product row ${index + 2}:`, row);
                    }
                });

                if(newProducts.length > 0) {
                    const updated = [...products, ...newProducts].sort((a,b) => a.name.localeCompare(b.name));
                    setProducts(updated);
                    saveProducts(updated);
                    alert(`นำเข้าสำเร็จ ${newProducts.length} รายการ`);
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

    return (
        <div>
            {editingProduct && <EditProductModal product={editingProduct} onClose={() => setEditingProduct(null)} onSave={handleUpdateProduct} />}
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold">จัดการรายการสินค้า (Master Data)</h2>
                <div className="flex gap-2">
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

            <div className="overflow-x-auto">
                 <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                    <thead className="bg-gray-50">
                        <tr>
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
                                <tr key={p.id}>
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
                            <tr><td colSpan={5} className="text-center text-gray-500 py-8">
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