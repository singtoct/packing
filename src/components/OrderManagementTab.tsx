
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { OrderItem, BurmeseTranslation, InventoryItem, Product, MoldingLogEntry, QCEntry, Customer } from '../types';
import { getOrders, saveOrders, getInventory, saveInventory, getProducts, getMoldingLogs, getQCEntries, getCustomers } from '../services/storageService';
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
    customers: Customer[];
}> = ({ order, onClose, onSave, customers }) => {
    const [editedOrder, setEditedOrder] = useState<OrderItem>(order);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setEditedOrder(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? undefined : Number(value)) : value,
        }));
    };
    
    const handleCustomerChange = (customerId: string) => {
        setEditedOrder(prev => ({ ...prev, customerId }));
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
                        <label className="block text-sm font-medium text-gray-700">ลูกค้า (ไม่จำเป็น)</label>
                        <SearchableInput
                            options={customers}
                            value={editedOrder.customerId || ''}
                            onChange={handleCustomerChange}
                            displayKey="name"
                            valueKey="id"
                            placeholder="ค้นหาลูกค้า..."
                        />
                    </div>
                     <div>
                        <label htmlFor="editItemName" className="block text-sm font-medium text-gray-700">ชื่อสินค้า</label>
                        <input type="text" id="editItemName" name="name" value={editedOrder.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required />
                    </div>
                    <div>
                        <label htmlFor="editItemColor" className="block text-sm font-medium text-gray-700">สี</label>
                        <input type="text" id="editItemColor" name="color" value={editedOrder.color} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required />
                    </div>
                    <div>
                        <label htmlFor="editItemQuantity" className="block text-sm font-medium text-gray-700">จำนวน (ชิ้น)</label>
                        <input type="number" id="editItemQuantity" name="quantity" min="1" value={editedOrder.quantity} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required />
                    </div>
                     <div>
                        <label htmlFor="editSalePrice" className="block text-sm font-medium text-gray-700">ราคาขาย (ต่อชิ้น)</label>
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
                        <th className="border border-black p-2 font-semibold">จำนวน (ชิ้น)</th>
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
    const [translations, setTranslations] = useState<BurmeseTranslation>({});
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);

    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
    const [isPrinting, setIsPrinting] = useState(false);
    const [isPrintingAll, setIsPrintingAll] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editedOrder, setEditedOrder] = useState<OrderItem | null>(null);
    
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'dueDate', direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

    // Form state for adding a new order
    const [newItemProductId, setNewItemProductId] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState(1);
    const [newItemDueDate, setNewItemDueDate] = useState('');

    useEffect(() => {
        const fetchAndSetData = () => {
            setOrders(getOrders());
            setInventory(getInventory());
            setProducts(getProducts());
            setCustomers(getCustomers());
        };
        fetchAndSetData();
        setNewItemDueDate(new Date().toISOString().split('T')[0]);
        window.addEventListener('storage', fetchAndSetData);
        return () => window.removeEventListener('storage', fetchAndSetData);
    }, []);

    const inventoryMap = useMemo(() => new Map(inventory.map(item => [item.name, item.quantity])), [inventory]);
    const productMap = useMemo(() => new Map(products.map(item => [`${item.name} (${item.color})`, item])), [products]);
    const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);

    const productOptions = useMemo(() => {
        return products.map(p => ({
            id: p.id,
            name: `${p.name} (${p.color})`,
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [products]);

    const sortedOrders = useMemo(() => {
        let sortableItems = orders.map(order => {
            const fullName = `${order.name} (${order.color})`;
            return {
                ...order,
                stock: inventoryMap.get(fullName) || 0,
            };
        });

        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return sortableItems.filter(order =>
            order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.customerId && customerMap.get(order.customerId)?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [orders, inventoryMap, sortConfig, searchTerm, customerMap]);

    const requestSort = (key: OrderSortKey) => {
        let direction: SortDirection = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleAddOrder = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedProduct = products.find(p => p.id === newItemProductId);
        if (!selectedProduct) {
            alert("กรุณาเลือกสินค้า");
            return;
        }
        const newOrder: OrderItem = {
            id: crypto.randomUUID(),
            name: selectedProduct.name,
            color: selectedProduct.color,
            quantity: newItemQuantity,
            dueDate: newItemDueDate,
            salePrice: selectedProduct.salePrice,
        };
        const updatedOrders = [newOrder, ...orders];
        saveOrders(updatedOrders);
        setOrders(updatedOrders);

        // Reset form
        setNewItemProductId('');
        setNewItemQuantity(1);
    };

    const handleSelectOrder = (id: string, checked: boolean) => {
        setSelectedOrders(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(id);
            } else {
                newSet.delete(id);
            }
            return newSet;
        });
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedOrders(new Set(sortedOrders.map(o => o.id)));
        } else {
            setSelectedOrders(new Set());
        }
    };
    
    const handleDeleteOrder = (id: string) => {
        const updatedOrders = orders.filter(order => order.id !== id);
        saveOrders(updatedOrders);
        setOrders(updatedOrders);
    };

    const handleDeleteSelected = () => {
        if (selectedOrders.size === 0) return;
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${selectedOrders.size} ออเดอร์ที่เลือก?`)) {
            const updatedOrders = orders.filter(order => !selectedOrders.has(order.id));
            saveOrders(updatedOrders);
            setOrders(updatedOrders);
            setSelectedOrders(new Set());
        }
    };

    const handleTranslate = async () => {
        setIsTranslating(true);
        const itemNames = [...new Set(orders.map(o => o.name))];
        try {
            const result = await translateToBurmese(itemNames);
            setTranslations(result);
        } catch (error) {
            console.error("Translation failed", error);
            alert("การแปลล้มเหลว");
        }
        setIsTranslating(false);
    };

    const handlePrint = (printAll: boolean) => {
        setIsPrinting(true);
        setIsPrintingAll(printAll);

        setTimeout(() => { // allow state to update
            const ordersToPrint = printAll ? sortedOrders : sortedOrders.filter(o => selectedOrders.has(o.id));
            if (ordersToPrint.length === 0) {
                setIsPrinting(false);
                return;
            }

            const printWindow = window.open('', '', 'height=800,width=1000');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Print Orders</title></head><body><div id="print-root"></div></body></html>');
                printWindow.document.close();
                const printRoot = printWindow.document.getElementById('print-root');
                if (printRoot) {
                    const root = ReactDOM.createRoot(printRoot);
                    root.render(<PrintOrderView orders={ordersToPrint} translations={translations} />);
                    setTimeout(() => {
                        printWindow.focus();
                        printWindow.print();
                        printWindow.close();
                        setIsPrinting(false);
                    }, 500);
                } else {
                    setIsPrinting(false);
                }
            } else {
                setIsPrinting(false);
                alert('ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาปิดการบล็อกป๊อปอัป');
            }
        }, 100);
    };

    const handleSaveOrder = (updatedOrder: OrderItem) => {
        const updatedOrders = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
        saveOrders(updatedOrders);
        setOrders(updatedOrders);
        setEditedOrder(null);
    };

    const handleSaveImportedOrders = (importedOrders: OrderItem[]) => {
        const updatedOrders = [...importedOrders, ...orders];
        saveOrders(updatedOrders);
        setOrders(updatedOrders);
        setIsImportModalOpen(false);
    };
    
    return (
        <div>
            {editedOrder && <EditOrderModal order={editedOrder} onClose={() => setEditedOrder(null)} onSave={handleSaveOrder} customers={customers} />}
            {isImportModalOpen && <IntelligentOrderImportModal onClose={() => setIsImportModalOpen(false)} onSave={handleSaveImportedOrders} />}

            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">จัดการออเดอร์</h2>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setIsImportModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none">
                        <SparklesIcon className="w-5 h-5"/>
                        นำเข้าอัจฉริยะ
                    </button>
                    <button onClick={handleTranslate} disabled={isTranslating} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none">
                        {isTranslating ? <LoaderIcon className="w-5 h-5"/> : <TruckIcon className="w-5 h-5"/>}
                        แปลเป็นพม่า
                    </button>
                    <button onClick={() => handlePrint(false)} disabled={selectedOrders.size === 0 || isPrinting} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:bg-gray-400">
                        {isPrinting && !isPrintingAll ? <LoaderIcon className="w-5 h-5"/> : <PrinterIcon className="w-5 h-5"/>}
                        พิมพ์ที่เลือก
                    </button>
                     <button onClick={() => handlePrint(true)} disabled={sortedOrders.length === 0 || isPrinting} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:bg-gray-400">
                        {isPrinting && isPrintingAll ? <LoaderIcon className="w-5 h-5"/> : <PrinterIcon className="w-5 h-5"/>}
                        พิมพ์ทั้งหมด
                    </button>
                </div>
            </div>

            <form onSubmit={handleAddOrder} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-lg border mb-10">
                <div className="md:col-span-2">
                    <label htmlFor="newOrderItemName" className="block text-sm font-medium text-gray-700">สินค้า</label>
                    <SearchableInput
                        options={productOptions}
                        value={newItemProductId}
                        onChange={setNewItemProductId}
                        displayKey="name"
                        valueKey="id"
                        placeholder="ค้นหาสินค้า..."
                        className="mt-1"
                    />
                </div>
                <div>
                    <label htmlFor="newItemQuantity" className="block text-sm font-medium text-gray-700">จำนวน (ชิ้น)</label>
                    <input
                        id="newItemQuantity"
                        type="number"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(Number(e.target.value))}
                        min="1"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="newItemDueDate" className="block text-sm font-medium text-gray-700">วันส่ง</label>
                    <input
                        id="newItemDueDate"
                        type="date"
                        value={newItemDueDate}
                        onChange={(e) => setNewItemDueDate(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        required
                    />
                </div>
                <div>
                    <button type="submit" className="w-full h-10 inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <PlusCircleIcon className="w-5 h-5" />
                        เพิ่มออเดอร์
                    </button>
                </div>
            </form>

            <div className="mb-4 flex justify-between">
                <input
                    type="text"
                    placeholder="ค้นหาออเดอร์ (ชื่อสินค้า, สี, ลูกค้า)..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-md shadow-sm"
                />
                <button
                    onClick={handleDeleteSelected}
                    disabled={selectedOrders.size === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                >
                    <Trash2Icon className="w-5 h-5" />
                    ลบที่เลือก ({selectedOrders.size})
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="p-4">
                                <input type="checkbox" onChange={handleSelectAll} checked={sortedOrders.length > 0 && selectedOrders.size === sortedOrders.length} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                            </th>
                            <SortableHeader label="สินค้า" sortConfig={sortConfig} requestSort={requestSort} sortKey="name" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"/>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อพม่า</th>
                            <SortableHeader label="จำนวน (ชิ้น)" sortConfig={sortConfig} requestSort={requestSort} sortKey="quantity" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"/>
                            <SortableHeader label="สต็อก" sortConfig={sortConfig} requestSort={requestSort} sortKey="stock" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"/>
                            <SortableHeader label="วันส่ง" sortConfig={sortConfig} requestSort={requestSort} sortKey="dueDate" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"/>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {sortedOrders.map((order) => {
                            const isLowStock = order.quantity > order.stock;
                            return (
                                <React.Fragment key={order.id}>
                                    <tr className={selectedOrders.has(order.id) ? 'bg-green-50' : ''}>
                                        <td className="p-4">
                                            <input type="checkbox" checked={selectedOrders.has(order.id)} onChange={e => handleSelectOrder(order.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="text-sm font-medium text-gray-900">{order.name}</p>
                                            <p className="text-sm text-gray-500">{order.color}</p>
                                            {order.customerId && <p className="text-xs text-blue-600 font-semibold">{customerMap.get(order.customerId)}</p>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{translations[order.name] || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.quantity.toLocaleString()}</td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                                            {order.stock.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.dueDate).toLocaleDateString('th-TH')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="ดูรายละเอียดเพิ่มเติม">
                                                <ChevronDownIcon className={`w-5 h-5 transition-transform ${expandedOrderId === order.id ? 'rotate-180' : ''}`} />
                                            </button>
                                            <button onClick={() => setEditedOrder(order)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full" title="แก้ไข"><EditIcon className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteOrder(order.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full" title="ลบ"><Trash2Icon className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                    {expandedOrderId === order.id && <OrderDetailsRow order={order} />}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
