import React, { useState, useEffect, useMemo } from 'react';
import { getOrders, getMoldingLogs, getInventory, getProducts, getSettings } from '../services/storageService';
import { OrderItem, MoldingLogEntry, InventoryItem, Product } from '../types';
import { BoxIcon, FactoryIcon, AlertTriangleIcon, CheckCircle2Icon, ChevronDownIcon } from 'lucide-react';

interface AggregatedProductData {
    productName: string;
    totalOrdered: number;
    inStock: number;
    totalMolded: number;
    netRequirement: number;
    statusBreakdown: Record<string, number>;
    orders: OrderItem[];
}

const ProductDetailsRow: React.FC<{ data: AggregatedProductData, colSpan: number }> = ({ data, colSpan }) => {
    return (
        <tr className="bg-gray-50">
            <td colSpan={colSpan} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">ออเดอร์ที่เกี่ยวข้อง ({data.orders.length})</h4>
                        <ul className="text-xs space-y-1 max-h-40 overflow-y-auto pr-2">
                            {data.orders.map(order => (
                                <li key={order.id} className="flex justify-between p-1.5 bg-white rounded border">
                                    <span>กำหนดส่ง: {new Date(order.dueDate).toLocaleDateString('th-TH')}</span>
                                    <span className="font-semibold">{order.quantity.toLocaleString()} ชิ้น</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </td>
        </tr>
    );
};


export const ProductionPlanTab: React.FC = () => {
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [moldingLogs, setMoldingLogs] = useState<MoldingLogEntry[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
    const [productionStatuses, setProductionStatuses] = useState<string[]>([]);

    useEffect(() => {
        const handleStorageChange = async () => {
            const [ordersData, logsData, inventoryData, productsData, settingsData] = await Promise.all([
                getOrders(),
                getMoldingLogs(),
                getInventory(),
                getProducts(),
                getSettings()
            ]);
            setOrders(ordersData);
            setMoldingLogs(logsData);
            setInventory(inventoryData);
            setProducts(productsData);
            
            const statuses = settingsData.productionStatuses || [];
            if (!statuses.includes('เสร็จสิ้น')) {
                statuses.push('เสร็จสิ้น');
            }
            setProductionStatuses(statuses);
        };
        handleStorageChange();
        window.addEventListener('storage', handleStorageChange as any);
        return () => window.removeEventListener('storage', handleStorageChange as any);
    }, []);

    const aggregatedData = useMemo((): AggregatedProductData[] => {
        const productMap = new Map<string, AggregatedProductData>();
        const allProducts = new Set(products.map(p => `${p.name} (${p.color})`));
        orders.forEach(o => allProducts.add(`${o.name} (${o.color})`));

        allProducts.forEach(productName => {
            productMap.set(productName, {
                productName,
                totalOrdered: 0,
                inStock: 0,
                totalMolded: 0,
                netRequirement: 0,
                statusBreakdown: {},
                orders: [],
            });
        });
        
        orders.forEach(order => {
            const productName = `${order.name} (${order.color})`;
            const entry = productMap.get(productName);
            if (entry) {
                entry.totalOrdered += order.quantity;
                entry.orders.push(order);
            }
        });

        inventory.forEach((item: InventoryItem) => {
            const entry = productMap.get(item.name);
            if (entry) {
                entry.inStock = item.quantity;
            }
        });

        moldingLogs.forEach((log: MoldingLogEntry) => {
            const entry = productMap.get(log.productName);
            if (entry) {
                entry.totalMolded += log.quantityProduced;
                entry.statusBreakdown[log.status] = (entry.statusBreakdown[log.status] || 0) + log.quantityProduced;
            }
        });

        let results = Array.from(productMap.values()).filter(p => p.totalOrdered > 0 || p.inStock > 0 || p.totalMolded > 0);
        
        results.forEach(entry => {
            entry.netRequirement = entry.totalOrdered - entry.inStock - entry.totalMolded;
            entry.orders.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        });

        return results.sort((a, b) => b.netRequirement - a.netRequirement);

    }, [orders, moldingLogs, inventory, products]);

    const filteredData = useMemo(() => {
        if (!searchTerm) return aggregatedData;
        return aggregatedData.filter(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [aggregatedData, searchTerm]);
    
    const tableColSpan = 6 + productionStatuses.length;

    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">แผนการผลิตและสถานะรวม</h2>
                <input
                    type="text"
                    placeholder="ค้นหาสินค้า..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-md shadow-sm"
                />
            </div>
             <div className="overflow-x-auto">
                <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">สินค้า</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ยอดสั่งซื้อ</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">สต็อกสำเร็จรูป</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ผลิตแล้วทั้งหมด</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ต้องผลิตเพิ่ม</th>
                            {productionStatuses.map(status => (
                                <th key={status} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" title={status}>
                                    {status.length > 10 ? status.substring(0, 9) + '...' : status}
                                </th>
                            ))}
                            <th className="relative px-6 py-3"><span className="sr-only">Details</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredData.map(data => (
                            <React.Fragment key={data.productName}>
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.productName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{data.totalOrdered.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-semibold text-right">{data.inStock.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 font-semibold text-right">{data.totalMolded.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right">
                                        {data.netRequirement > 0 ? (
                                            <span className="text-red-600 flex items-center justify-end gap-1.5">
                                                <AlertTriangleIcon className="w-4 h-4" /> {data.netRequirement.toLocaleString()}
                                            </span>
                                        ) : (
                                             <span className="text-green-600 flex items-center justify-end gap-1.5">
                                                <CheckCircle2Icon className="w-4 h-4" /> {Math.abs(data.netRequirement).toLocaleString()}
                                            </span>
                                        )}
                                    </td>
                                    {productionStatuses.map(status => (
                                        <td key={status} className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                            {data.statusBreakdown[status] ? data.statusBreakdown[status].toLocaleString() : '-'}
                                        </td>
                                    ))}
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                         <button onClick={() => setExpandedProduct(expandedProduct === data.productName ? null : data.productName)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="ดูรายละเอียด">
                                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${expandedProduct === data.productName ? 'rotate-180' : ''}`} />
                                        </button>
                                    </td>
                                </tr>
                                {expandedProduct === data.productName && <ProductDetailsRow data={data} colSpan={tableColSpan} />}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
    );
};
