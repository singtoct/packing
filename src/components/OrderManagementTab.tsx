


import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { OrderItem, BurmeseTranslation, InventoryItem, Product, MoldingLogEntry, QCEntry } from '../types';
import { getOrders, saveOrders, getInventory, saveInventory, getProducts, getMoldingLogs, getQCEntries } from '../services/storageService';
import { translateToBurmese } from '../services/geminiService';
import { PlusCircleIcon, Trash2Icon, PrinterIcon, LoaderIcon, TruckIcon, EditIcon, SparklesIcon, ChevronDownIcon } from './icons/Icons';
import { CTElectricLogo } from '../assets/logo';
import { IntelligentOrderImportModal } from './IntelligentOrderImportModal';
import { SearchableInput } from './SearchableInput';

type OrderSortKey = 'name' | 'quantity' | 'dueDate' | 'stock';
type SortDirection = 'asc' | 'desc';
interface SortConfig {
    key: OrderSortKey;
    direction: SortDirection;
}

const OrderDetailsRow: React.FC<{ order: OrderItem }> = ({ order }) => {
    const [relatedLots, setRelatedLots] = useState<MoldingLogEntry[]>([]);
    const [qcSummary, setQcSummary] = useState({ passed: 0, failed: 0, pending: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const productName = `${order.name} (${order.color})`;
        
        const allMoldingLogs = getMoldingLogs();
        const lots = allMoldingLogs.filter(log => log.productName === productName).slice(0, 5); // Show latest 5
        setRelatedLots(lots);

        const allQcEntries = getQCEntries();
        const relatedQc = allQcEntries.filter(qc => qc.productName === productName);
        
        const summary = relatedQc.reduce((acc, qc) => {
            if (qc.status === 'Passed') acc.passed += qc.quantity;
            else if (qc.status === 'Failed') acc.failed += qc.quantity;
            else if (qc.status === 'Pending') acc.pending += qc.quantity;
            return acc;
        }, { passed: 0, failed: 0, pending: 0 });

        setQcSummary(summary);
        setIsLoading(false);
    }, [order]);

    return (
        <tr className="bg-gray-50 border-b border-gray-200">
            <td colSpan={7} className="p-4">
                {isLoading ? <p>Loading details...</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold text-sm text-gray-700 mb-2">ประวัติการผลิตล่าสุด</h4>
                            {relatedLots.length > 0 ? (
                                <ul className="text-xs space-y-1">
                                    {relatedLots.map(lot => (
                                        <li key={lot.id} className="flex justify-between p-1 bg-white rounded">
                                            <span>{new Date(lot.date).toLocaleDateString('th-TH')} - ผลิตได้ {lot.quantityProduced.toLocaleString()} ชิ้น</span>
                                            <span className="font-semibold">{lot.status}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-xs text-gray-500">ไม่พบประวัติการผลิต</p>}
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm text-gray-700 mb-2">สรุปผล QC ทั้งหมด</h4>
                            <div className="flex justify-around bg-white p-2 rounded-lg">
                                <div className="text-center"><p className="font-bold text-green-600">{qcSummary.passed.toLocaleString()}</p><p className="text-xs">ผ่าน</p></div>
                                <div className="text-center"><p className="font-bold text-red-600">{qcSummary.failed.toLocaleString()}</p><p className="text-xs">ไม่ผ่าน</p></div>
                                <div className="text-center"><p className="font-bold text-yellow-600">{qcSummary.pending.toLocaleString()}</p><p className="text-xs">รอตรวจ</p></div>
                            </div>
                        </div>
                    </div>
                )}
            </td>
        </tr>
    );
};


// Helper component for sortable table headers
const SortableHeader: React.FC<{
  label: string;
  sortConfig: SortConfig | null;
  requestSort: (key: OrderSortKey) => void;
  sortKey: OrderSortKey;
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


// Modal for editing an order
const EditOrderModal: React.FC<{
    order: OrderItem;
    onClose: () => void;
    onSave: (updatedOrder: OrderItem) => void;
}> = ({ order, onClose, onSave }) => {
    const [editedOrder, setEditedOrder] = useState<OrderItem>(order);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setEditedOrder(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(editedOrder);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">แก้ไขออเดอร์</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="editItemName" className="block text-sm font-medium text-gray-700">ชื่อสินค้า</label>
                        <input type="text" id="editItemName" name="name" value={editedOrder.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required />
                    </div>
                    <div>
                        <label htmlFor="editItemColor" className="block text-sm font-medium text-gray-700">สี</label>
                        <input type="text" id="editItemColor" name="color" value={editedOrder.color} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required />
                    </div>
                    <div>
                        <label htmlFor="editItemQuantity" className="block text-sm font-medium text-gray-700">จำนวน (ลัง)</label>
                        <input type="number" id="editItemQuantity" name="quantity" min="1" value={editedOrder.quantity} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required />
                    </div>
                     <div>
                        <label htmlFor="editSalePrice" className="block text-sm font-medium text-gray-700">ราคาขาย (ต่อลัง)</label>
                        <input type="number" id="editSalePrice" name="salePrice" min="0" value={editedOrder.salePrice || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" placeholder="Optional" />
                    </div>
                    <div>
                        <label htmlFor="editDueDate" className="block text-sm font-medium text-gray-700">วันครบกำหนด</label>
                        <input type="date" id="editDueDate" name="dueDate" value={editedOrder.dueDate} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                            ยกเลิก
                        </button>
                        <button type="submit" className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                            บันทึกการเปลี่ยนแปลง
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// This component is now purely for display in the print window. The print action is triggered externally.
const PrintOrderView: React.FC<{ orders: OrderItem[], translations: BurmeseTranslation }> = ({ orders, translations }) => {
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
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [newItemQuantity, setNewItemQuantity] = useState(1);
    const [newDueDate, setNewDueDate] = useState('');
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
    const [isPrintingSelected, setIsPrintingSelected] = useState(false);
    const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'dueDate', direction: 'asc' });
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

    const handleToggleDetails = (orderId: string) => {
        setExpandedOrderId(prev => (prev === orderId ? null : orderId));
    };


    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setNewDueDate(today);
        
        const handleStorageChange = () => {
            setOrders(getOrders());
            setInventory(getInventory());
            const prods = getProducts();
            setProducts(prods);
        };

        handleStorageChange();
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    useEffect(() => {
        saveOrders(orders);
    }, [orders]);

    const inventoryMap = useMemo(() => 
        new Map(inventory.map(item => [item.name, item.quantity])),
    [inventory]);

    const requestSort = (key: OrderSortKey) => {
        let direction: SortDirection = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedOrders = useMemo(() => {
        let sortableItems = [...orders].map(order => {
            const inventoryItemName = `${order.name} (${order.color})`;
            const availableStock = inventoryMap.get(inventoryItemName) || 0;
            return {
                ...order,
                stock: availableStock,
            };
        });

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
    }, [orders, sortConfig, inventoryMap]);

    const handleAddOrder = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedProduct = products.find(p => p.id === selectedProductId);
        if (!selectedProduct || !newDueDate) return;

        const newOrder: OrderItem = {
            id: new Date().toISOString(),
            name: selectedProduct.name,
            color: selectedProduct.color,
            quantity: newItemQuantity,
            dueDate: newDueDate,
            salePrice: selectedProduct.salePrice,
        };
        setOrders(prevOrders => [newOrder, ...prevOrders]);
        setNewItemQuantity(1);
    };

     const handleUpdateOrder = (updatedOrder: OrderItem) => {
        setOrders(prevOrders => prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        setEditingOrder(null);
    };

    const handleDeleteOrder = (id: string) => {
        setOrders(prevOrders => prevOrders.filter(order => order.id !== id));
        setSelectedOrders(prevSelected => {
            const newSelected = new Set(prevSelected);
            newSelected.delete(id);
            return newSelected;
        });
    };

    const handleDeleteSelected = () => {
        if (selectedOrders.size === 0) return;
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${selectedOrders.size} ออเดอร์ที่เลือก?`)) {
            setOrders(prevOrders => prevOrders.filter(order => !selectedOrders.has(order.id)));
            setSelectedOrders(new Set());
        }
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

    const handleShipOrder = (orderId: string) => {
        const orderToShip = orders.find(o => o.id === orderId);
        if (!orderToShip) return;
    
        const currentInventory = getInventory();
        const inventoryItemName = `${orderToShip.name} (${orderToShip.color})`;
        const itemInInventory = currentInventory.find(i => i.name === inventoryItemName);
    
        if (!itemInInventory || itemInInventory.quantity < orderToShip.quantity) {
            alert(`สินค้าในสต็อกไม่เพียงพอ! ต้องการ ${orderToShip.quantity} แต่มีเพียง ${itemInInventory?.quantity || 0} ลัง`);
            return;
        }
    
        itemInInventory.quantity -= orderToShip.quantity;
        const updatedInventory = itemInInventory.quantity > 0 
            ? currentInventory.map(i => i.name === inventoryItemName ? itemInInventory : i)
            : currentInventory.filter(i => i.name !== inventoryItemName);
        
        saveInventory(updatedInventory);
        setInventory(updatedInventory);
    
        const updatedOrders = orders.filter(o => o.id !== orderId);
        setOrders(updatedOrders); 
        
        if (selectedOrders.has(orderId)) {
            handleSelectOrder(orderId, false);
        }
    };

    const handlePrintSelected = async () => {
        if (selectedOrders.size === 0) return;
        setIsPrintingSelected(true);
        const ordersToPrint = orders.filter(o => selectedOrders.has(o.id));
        const uniqueItemNames: string[] = Array.from(new Set(ordersToPrint.map(o => o?.name).filter((name): name is string => !!name)));
        
        try {
            const translations = await translateToBurmese(uniqueItemNames);
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (printWindow) {
                const printRoot = document.createElement('div');
                printWindow.document.body.appendChild(printRoot);
    
                const tailwindScript = printWindow.document.createElement('script');
                tailwindScript.src = 'https://cdn.tailwindcss.com';
                printWindow.document.head.appendChild(tailwindScript);
                
                const kanitFontLink = printWindow.document.createElement('link');
                kanitFontLink.href = "https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap";
                kanitFontLink.rel = "stylesheet";
                printWindow.document.head.appendChild(kanitFontLink);
                
                const fontStyleEl = printWindow.document.createElement('style');
                fontStyleEl.innerHTML = `body { font-family: 'Kanit', sans-serif; }`;
                printWindow.document.head.appendChild(fontStyleEl);
                
                const root = ReactDOM.createRoot(printRoot);
                root.render(<PrintOrderView orders={ordersToPrint} translations={translations} />);

                printWindow.onafterprint = () => printWindow.close();
    
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                }, 500);
            }
        } catch (error) {
            console.error("Failed during print preparation:", error);
            alert("เกิดข้อผิดพลาดในการเตรียมพิมพ์ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsPrintingSelected(false);
        }
    };

    const handleSaveImportedOrders = (newOrders: OrderItem[]) => {
        setOrders(prev => [...newOrders, ...prev]);
    };
    
    const productOptions = useMemo(() => {
        return products.map(p => ({
            ...p,
            displayName: `${p.name} (${p.color})`,
            id: p.id,
        }));
    }, [products]);

    return (
        <div>
            {isImportModalOpen && (
                <IntelligentOrderImportModal 
                    onClose={() => setIsImportModalOpen(false)}
                    onSave={handleSaveImportedOrders}
                />
            )}
            {editingOrder && (
                <EditOrderModal
                    order={editingOrder}
                    onClose={() => setEditingOrder(null)}
                    onSave={handleUpdateOrder}
                />
            )}
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">สร้างออเดอร์ใหม่</h2>
                 <button 
                    onClick={() => setIsImportModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                    <SparklesIcon className="w-5 h-5"/>
                    นำเข้าอัจฉริยะ
                </button>
            </div>
            <form onSubmit={handleAddOrder} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-50 p-4 rounded-lg border">
                <div className="col-span-1 md:col-span-2">
                    <label htmlFor="productSelect" className="block text-sm font-medium text-gray-700">สินค้า</label>
                    <SearchableInput
                        options={productOptions}
                        value={selectedProductId}
                        onChange={setSelectedProductId}
                        displayKey="displayName"
                        valueKey="id"
                        placeholder="ค้นหาสินค้า..."
                        className="mt-1"
                    />
                </div>

                <div>
                    <label htmlFor="itemQuantity" className="block text-sm font-medium text-gray-700">จำนวน (ลัง)</label>
                    <input type="number" id="itemQuantity" min="1" value={newItemQuantity} onChange={e => setNewItemQuantity(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required />
                </div>
                
                <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">วันครบกำหนด</label>
                    <input type="date" id="dueDate" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required />
                </div>
                <div className="col-span-full flex justify-end">
                    <button type="submit" className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <PlusCircleIcon className="w-5 h-5" />
                        เพิ่มออเดอร์
                    </button>
                </div>
            </form>

            <div className="mt-10">
                <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">รายการออเดอร์ทั้งหมด</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleDeleteSelected} 
                            disabled={selectedOrders.size === 0}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            <Trash2Icon className="w-5 h-5" />
                            <span>ลบ ({selectedOrders.size})</span>
                        </button>
                         <button 
                            onClick={handlePrintSelected} 
                            disabled={selectedOrders.size === 0 || isPrintingSelected}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isPrintingSelected ? <LoaderIcon className="w-5 h-5"/> : <PrinterIcon className="w-5 h-5" />}
                            <span>ปริ้นท์ ({selectedOrders.size})</span>
                        </button>
                    </div>
                </div>
                <div className="rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
                    <table className="min-w-full bg-white divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 w-12">
                                    <input 
                                        type="checkbox"
                                        className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        checked={orders.length > 0 && selectedOrders.size === orders.length}
                                        disabled={orders.length === 0}
                                        aria-label="Select all orders"
                                    />
                                </th>
                                <SortableHeader label="สินค้า" sortKey="name" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />
                                <SortableHeader label="จำนวน" sortKey="quantity" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />
                                <SortableHeader label="ครบกำหนด" sortKey="dueDate" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />
                                <SortableHeader label="สต็อก" sortKey="stock" sortConfig={sortConfig} requestSort={requestSort} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                <th scope="col" className="px-2 py-3"><span className="sr-only">Details</span></th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-gray-200">
                            {sortedOrders.length > 0 ? (
                                sortedOrders.map(order => (
                                    <React.Fragment key={order.id}>
                                        <tr className={selectedOrders.has(order.id) ? 'bg-green-50' : 'bg-white'}>
                                            <td className="p-4">
                                                <input 
                                                    type="checkbox"
                                                    className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 flex-shrink-0"
                                                    checked={selectedOrders.has(order.id)}
                                                    onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                                                    aria-labelledby={`order-name-${order.id}`}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div id={`order-name-${order.id}`}>
                                                    <p className="font-semibold text-base text-gray-800">{order.name}</p>
                                                    <p className="text-sm text-gray-500">สี: {order.color}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{order.quantity} ลัง</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className="font-bold text-red-600">{new Date(order.dueDate).toLocaleDateString('th-TH')}</span>
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${order.stock >= order.quantity ? 'text-green-600' : 'text-red-600'}`}>
                                                {order.stock}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <button 
                                                        onClick={() => handleShipOrder(order.id)} 
                                                        disabled={!(order.stock >= order.quantity)}
                                                        className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-full transition-colors disabled:text-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                                                        aria-label={order.stock >= order.quantity ? `Ship order ${order.name}`: `Not enough stock for ${order.name}`}
                                                        title={order.stock >= order.quantity ? `จัดส่งออเดอร์ (มี ${order.stock} ในสต็อก)` : `สต็อกไม่พอ (มี ${order.stock} / ต้องการ ${order.quantity})`}
                                                    >
                                                        <TruckIcon className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => setEditingOrder(order)} className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full transition-colors" aria-label={`Edit order ${order.name}`}>
                                                        <EditIcon className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => handleDeleteOrder(order.id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors" aria-label={`Delete order ${order.name}`}>
                                                        <Trash2Icon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-2 py-4">
                                                <button onClick={() => handleToggleDetails(order.id)} className="p-1 rounded-full hover:bg-gray-200">
                                                    <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${expandedOrderId === order.id ? 'rotate-180' : ''}`} />
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedOrderId === order.id && <OrderDetailsRow order={order} />}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center text-gray-500 py-8 bg-white">ยังไม่มีออเดอร์</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
