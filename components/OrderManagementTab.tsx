
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { OrderItem, BurmeseTranslation } from '../types';
import { getOrders, saveOrders } from '../services/storageService';
import { translateToBurmese } from '../services/geminiService';
import { PlusCircleIcon, Trash2Icon, PrinterIcon, LoaderIcon } from './icons/Icons';
import { CTElectricLogo } from '../assets/logo';

// This component is redesigned to handle multiple orders in a single print-friendly table view.
const PrintOrderView: React.FC<{ orders: OrderItem[], translations: BurmeseTranslation }> = ({ orders, translations }) => {
    useEffect(() => {
        window.print();
        window.onafterprint = () => window.close();
    }, []);

    const getItemName = (name: string) => translations[name] || name;

    const sortedOrders = [...orders].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return (
        <div className="p-8 font-sans">
            <style>{`
                @media print {
                    body { -webkit-print-color-adjust: exact; }
                    @page { size: A4; margin: 20mm; }
                    .no-break { page-break-inside: avoid; }
                }
            `}</style>
            <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
                <img src={CTElectricLogo} alt="CT.ELECTRIC Logo" className="h-20" />
                <div className="text-right">
                    <h1 className="text-3xl font-bold">ใบรวมสั่งงานแพ็คสินค้า</h1>
                    <h2 className="text-xl font-semibold text-gray-700">Consolidated Packing Order</h2>
                </div>
            </div>
            <div className="flex justify-end mb-4">
                <p className="text-lg">วันที่พิมพ์: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <table className="w-full border-collapse border border-black text-lg">
                <thead className="bg-gray-200">
                    <tr>
                        <th className="border border-black p-2 font-semibold">วันส่ง</th>
                        <th className="border border-black p-2 font-semibold">ชื่อสินค้า (ไทย)</th>
                        <th className="border border-black p-2 font-semibold">ชื่อสินค้า (พม่า)</th>
                        <th className="border border-black p-2 font-semibold">สี</th>
                        <th className="border border-black p-2 font-semibold">จำนวน (ลัง)</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedOrders.map(order => (
                         <tr key={order.id} className="no-break">
                             <td className="border border-black p-2 text-center whitespace-nowrap bg-yellow-100 font-bold">{new Date(order.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'numeric' })}</td>
                             <td className="border border-black p-2">{order.name}</td>
                             <td className="border border-black p-2 font-semibold">{getItemName(order.name)}</td>
                             <td className="border border-black p-2">{order.color}</td>
                             <td className="border border-black p-2 text-center font-bold text-red-600 text-2xl">{order.quantity}</td>
                         </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-12 text-lg">
                <p className="mb-12">หมายเหตุ / Note: .............................................................................................................................</p>
                <p>ผู้รับผิดชอบ / Person in Charge: .......................................................</p>
            </div>
        </div>
    );
};


export const OrderManagementTab: React.FC = () => {
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemColor, setNewItemColor] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState(1);
    const [newDueDate, setNewDueDate] = useState('');
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
    const [isPrintingSelected, setIsPrintingSelected] = useState(false);

    useEffect(() => {
        setOrders(getOrders());
        const today = new Date().toISOString().split('T')[0];
        setNewDueDate(today);
    }, []);

    useEffect(() => {
        saveOrders(orders);
    }, [orders]);

    const handleAddOrder = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim() || !newItemColor.trim() || !newDueDate) return;
        const newOrder: OrderItem = {
            id: new Date().toISOString(),
            name: newItemName.trim(),
            color: newItemColor.trim(),
            quantity: newItemQuantity,
            dueDate: newDueDate,
        };
        setOrders(prevOrders => [newOrder, ...prevOrders]);
        setNewItemName('');
        setNewItemColor('');
        setNewItemQuantity(1);
    };

    const handleDeleteOrder = (id: string) => {
        setOrders(prevOrders => prevOrders.filter(order => order.id !== id));
        setSelectedOrders(prevSelected => {
            const newSelected = new Set(prevSelected);
            newSelected.delete(id);
            return newSelected;
        });
    };
    
    const handleSelectOrder = (orderId: string, checked: boolean) => {
        setSelectedOrders(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(orderId);
            } else {
                newSet.delete(orderId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedOrders(new Set(orders.map(o => o.id)));
        } else {
            setSelectedOrders(new Set());
        }
    };

    const handlePrintSelected = async () => {
        if (selectedOrders.size === 0) return;

        setIsPrintingSelected(true);
        const ordersToPrint = orders.filter(o => selectedOrders.has(o.id));
        const uniqueItemNames = [...new Set(ordersToPrint.map(o => o.name))];
        
        const translations = await translateToBurmese(uniqueItemNames);
        setIsPrintingSelected(false);

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
            const tempDiv = printWindow.document.createElement('div');
            printWindow.document.body.appendChild(tempDiv);
            
            const root = ReactDOM.createRoot(tempDiv);
            const TailwindCDN = '<script src="https://cdn.tailwindcss.com"><\/script>';
            const KanitFont = `<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet"><style>body {font-family: 'Kanit', sans-serif;}</style>`;

            printWindow.document.head.innerHTML = TailwindCDN + KanitFont;
            root.render(<PrintOrderView orders={ordersToPrint} translations={translations} />);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">สร้างออเดอร์ใหม่</h2>
            <form onSubmit={handleAddOrder} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-lg border">
                <div className="col-span-1 md:col-span-2">
                    <label htmlFor="itemName" className="block text-sm font-medium text-gray-700">ชื่อสินค้า</label>
                    <input type="text" id="itemName" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="เช่น ฝาหน้ากาก CT A-103" required />
                </div>
                <div>
                    <label htmlFor="itemColor" className="block text-sm font-medium text-gray-700">สี</label>
                    <input type="text" id="itemColor" value={newItemColor} onChange={e => setNewItemColor(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="เช่น สีขาว" required />
                </div>
                <div>
                    <label htmlFor="itemQuantity" className="block text-sm font-medium text-gray-700">จำนวน (ลัง)</label>
                    <input type="number" id="itemQuantity" min="1" value={newItemQuantity} onChange={e => setNewItemQuantity(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">วันครบกำหนด</label>
                    <input type="date" id="dueDate" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div className="col-span-1 md:col-span-5 flex justify-end">
                    <button type="submit" className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <PlusCircleIcon className="w-5 h-5" />
                        เพิ่มออเดอร์
                    </button>
                </div>
            </form>

            <div className="mt-10">
                <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">รายการออเดอร์ทั้งหมด</h2>
                     <button 
                        onClick={handlePrintSelected} 
                        disabled={selectedOrders.size === 0 || isPrintingSelected}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isPrintingSelected ? <LoaderIcon className="w-5 h-5"/> : <PrinterIcon className="w-5 h-5" />}
                        <span>ปริ้นท์ ({selectedOrders.size}) รายการที่เลือก</span>
                    </button>
                </div>
                <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gray-50 p-4 flex items-center gap-4">
                        <input 
                            type="checkbox"
                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            checked={orders.length > 0 && selectedOrders.size === orders.length}
                            disabled={orders.length === 0}
                            aria-label="Select all orders"
                        />
                        <label className="font-semibold text-gray-700">เลือกทั้งหมด</label>
                    </div>
                    <div className="space-y-px bg-gray-200">
                        {orders.length > 0 ? (
                            orders.map(order => (
                                <div key={order.id} className="bg-white p-4 flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 flex-grow min-w-[250px]">
                                        <input 
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                                            checked={selectedOrders.has(order.id)}
                                            onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                                            aria-labelledby={`order-name-${order.id}`}
                                        />
                                        <div id={`order-name-${order.id}`}>
                                            <p className="font-semibold text-lg text-gray-800">{order.name}</p>
                                            <p className="text-sm text-gray-500">สี: {order.color} | จำนวน: {order.quantity} ลัง</p>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-600 font-medium">
                                        <span>ครบกำหนด: </span>
                                        <span className="font-bold text-red-600">{new Date(order.dueDate).toLocaleDateString('th-TH')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleDeleteOrder(order.id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors" aria-label={`Delete order ${order.name}`}>
                                            <Trash2Icon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-8 bg-white">ยังไม่มีออเดอร์</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};