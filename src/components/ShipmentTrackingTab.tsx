

import React, { useState, useEffect } from 'react';
import { getShipments, saveShipments } from '../services/storageService';
import { Shipment } from '../types';
import { PlusCircleIcon, Trash2Icon, TruckIcon } from './icons/Icons';

const commonInputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500";
const buttonPrimaryStyle = "inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700";

export const ShipmentTrackingTab: React.FC = () => {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [selectedShipments, setSelectedShipments] = useState<Set<string>>(new Set());
    const [orderIds, setOrderIds] = useState('');
    const [carrier, setCarrier] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [shipmentDate, setShipmentDate] = useState('');
    
    useEffect(() => {
        setShipments(getShipments().sort((a,b) => new Date(b.shipmentDate).getTime() - new Date(a.shipmentDate).getTime()));
        setShipmentDate(new Date().toISOString().split('T')[0]);
    }, []);

    const handleAddShipment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!carrier.trim() || !shipmentDate) return;
        const newShipment: Shipment = {
            id: crypto.randomUUID(),
            shipmentDate,
            orderIds: orderIds.split(',').map(s => s.trim()).filter(Boolean),
            carrier,
            trackingNumber,
            status: 'In Transit'
        };
        const updated = [newShipment, ...shipments];
        setShipments(updated);
        saveShipments(updated);

        // Reset form
        setOrderIds('');
        setCarrier('');
        setTrackingNumber('');
    };

    const handleDeleteShipment = (id: string) => {
        if(window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลการจัดส่งนี้?')) {
            const updated = shipments.filter(s => s.id !== id);
            setShipments(updated);
            saveShipments(updated);
        }
    };
    
    const handleUpdateStatus = (id: string, status: Shipment['status']) => {
        const updated = shipments.map(s => s.id === id ? {...s, status} : s);
        setShipments(updated);
        saveShipments(updated);
    };

    const handleSelectShipment = (id: string, checked: boolean) => {
        setSelectedShipments(prev => {
            const newSet = new Set(prev);
            if(checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) setSelectedShipments(new Set(shipments.map(s => s.id)));
        else setSelectedShipments(new Set());
    };

    const handleDeleteSelected = () => {
        if (selectedShipments.size === 0) return;
        if(window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลการจัดส่ง ${selectedShipments.size} รายการที่เลือก?`)) {
            const updated = shipments.filter(s => !selectedShipments.has(s.id));
            setShipments(updated);
            saveShipments(updated);
            setSelectedShipments(new Set());
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">บันทึกและติดตามการจัดส่ง</h2>
            <form onSubmit={handleAddShipment} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-lg border mb-10">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">เลขที่ออเดอร์ (คั่นด้วย ,)</label>
                    <input type="text" value={orderIds} onChange={e => setOrderIds(e.target.value)} placeholder="เช่น SO-001, SO-002" className={commonInputStyle} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">บริษัทขนส่ง</label>
                    <input type="text" value={carrier} onChange={e => setCarrier(e.target.value)} className={commonInputStyle} required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">เลข Tracking</label>
                    <input type="text" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} className={commonInputStyle} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">วันที่ส่ง</label>
                    <input type="date" value={shipmentDate} onChange={e => setShipmentDate(e.target.value)} className={commonInputStyle} required />
                </div>
                <div className="col-span-full flex justify-end">
                    <button type="submit" className={buttonPrimaryStyle}>
                        <PlusCircleIcon className="w-5 h-5"/> บันทึกการจัดส่ง
                    </button>
                </div>
            </form>

            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">ประวัติการจัดส่ง</h3>
                <button
                    onClick={handleDeleteSelected}
                    disabled={selectedShipments.size === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                >
                    <Trash2Icon className="w-5 h-5"/>
                    ลบ ({selectedShipments.size})
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    onChange={e => handleSelectAll(e.target.checked)}
                                    checked={shipments.length > 0 && selectedShipments.size === shipments.length}
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่ส่ง</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ออเดอร์</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">บริษัทขนส่ง</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking No.</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {shipments.map(s => (
                            <tr key={s.id} className={selectedShipments.has(s.id) ? 'bg-blue-50' : ''}>
                                <td className="p-4">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={selectedShipments.has(s.id)}
                                        onChange={e => handleSelectShipment(s.id, e.target.checked)}
                                    />
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm">{new Date(s.shipmentDate).toLocaleDateString('th-TH')}</td>
                                <td className="px-4 py-4 text-sm">{s.orderIds.join(', ')}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold">{s.carrier}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm">{s.trackingNumber}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                    <select value={s.status} onChange={e => handleUpdateStatus(s.id, e.target.value as any)} className="text-sm border border-gray-200 rounded-md p-1 bg-white">
                                        <option value="In Transit">In Transit</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Delayed">Delayed</option>
                                    </select>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-right">
                                     <button onClick={() => handleDeleteShipment(s.id)} className="p-2 text-gray-500 hover:text-red-700 hover:bg-red-100 rounded-full" title="ลบ"><Trash2Icon className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};