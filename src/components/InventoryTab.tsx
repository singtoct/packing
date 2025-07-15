

import React, { useState, useEffect } from 'react';
import { getInventory, saveInventory } from '../services/storageService';
import { InventoryItem } from '../types';
import { Trash2Icon } from './icons/Icons';

export const InventoryTab: React.FC<{ setLowStockCheck: () => void; }> = ({ setLowStockCheck }) => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchInventory = () => {
            const storedInventory = getInventory();
            setInventory(storedInventory.sort((a, b) => a.name.localeCompare(b.name)));
        };
        
        fetchInventory();
        window.addEventListener('storage', fetchInventory);

        return () => {
            window.removeEventListener('storage', fetchInventory);
        };
    }, []);

    const handleMinStockChange = (itemName: string, value: string) => {
        const newMinStock = parseInt(value, 10);
        setInventory(prev => 
            prev.map(item => 
                item.name === itemName 
                ? { ...item, minStock: isNaN(newMinStock) || newMinStock < 0 ? undefined : newMinStock }
                : item
            )
        );
    };

    const handleSaveMinStock = (itemName: string) => {
        const itemToUpdate = inventory.find(item => item.name === itemName);
        if(!itemToUpdate) return;

        const currentFullInventory = getInventory();
        const updatedFullInventory = currentFullInventory.map(item => 
             item.name === itemName ? itemToUpdate : item
        );
        saveInventory(updatedFullInventory);
        setLowStockCheck(); // Trigger a global check
        alert(`บันทึกสต็อกขั้นต่ำสำหรับ ${itemName} เรียบร้อยแล้ว`);
    };

    const handleDeleteItem = (itemName: string) => {
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ '${itemName}' ออกจากสต็อก? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            const updatedInventory = inventory.filter(item => item.name !== itemName);
            saveInventory(updatedInventory);
            setInventory(updatedInventory); // Update state immediately for a responsive UI
            setLowStockCheck(); // Re-evaluate low stock alerts
        }
    };

    const filteredInventory = inventory.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">สต็อกสินค้าคงคลัง (ชิ้น)</h2>
                <input
                    type="text"
                    placeholder="ค้นหาสินค้า..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">ชื่อสินค้า</th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-1/6">สต็อกปัจจุบัน</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-1/4">สต็อกขั้นต่ำ (ชิ้น)</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">การกระทำ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredInventory.length > 0 ? (
                            filteredInventory.map(item => {
                                const isLowStock = item.minStock !== undefined && item.quantity < item.minStock;
                                return (
                                <tr key={item.name} className={isLowStock ? 'bg-red-50' : ''}>
                                    <td className={`px-6 py-4 whitespace-normal text-sm font-medium ${isLowStock ? 'text-red-900 font-bold' : 'text-gray-800'}`}>
                                        {item.name}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-center text-lg font-bold ${isLowStock ? 'text-red-600' : 'text-blue-600'}`}>
                                        {item.quantity.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number"
                                                min="0"
                                                value={item.minStock ?? ''}
                                                onChange={(e) => handleMinStockChange(item.name, e.target.value)}
                                                placeholder="ยังไม่ได้ตั้งค่า"
                                                className="w-28 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <button 
                                                onClick={() => handleSaveMinStock(item.name)}
                                                className="px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                                            >
                                                บันทึก
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button
                                            onClick={() => handleDeleteItem(item.name)}
                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors"
                                            aria-label={`Delete ${item.name}`}
                                        >
                                            <Trash2Icon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            )})
                        ) : (
                            <tr>
                                <td colSpan={4} className="text-center text-gray-500 py-8">
                                    {inventory.length === 0 ? "ยังไม่มีสินค้าในสต็อก" : "ไม่พบสินค้าที่ตรงกับการค้นหา"}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
