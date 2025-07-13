
import React from 'react';
import { PurchaseOrder, Supplier, CompanyInfo } from '../types';

interface POPrintViewProps {
    po: PurchaseOrder;
    supplier: Supplier;
    companyInfo: CompanyInfo;
    rawMaterialMap: Map<string, {name: string, unit: string}>;
}

export const POPrintView: React.FC<POPrintViewProps> = ({ po, supplier, companyInfo, rawMaterialMap }) => {
    const total = po.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const vat = total * 0.07;
    const grandTotal = total + vat;

    return (
        <div className="p-8 font-sans bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    {companyInfo.logoUrl && <img src={companyInfo.logoUrl} alt="Company Logo" className="h-20 mb-4" />}
                    <h1 className="text-xl font-bold">{companyInfo.name}</h1>
                    <p className="text-xs whitespace-pre-line">{companyInfo.address}</p>
                    <p className="text-xs">เลขประจำตัวผู้เสียภาษี: {companyInfo.taxId}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-bold text-gray-800">ใบสั่งซื้อ</h2>
                    <h3 className="text-xl text-gray-500">Purchase Order</h3>
                    <div className="mt-4 border border-gray-400 p-2 rounded-lg inline-block">
                        <p><strong>เลขที่:</strong> {po.poNumber}</p>
                        <p><strong>วันที่:</strong> {new Date(po.orderDate).toLocaleDateString('th-TH')}</p>
                    </div>
                </div>
            </div>

            {/* Supplier Info */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-semibold text-gray-600 mb-1">ผู้ขาย / Vendor</h4>
                    <p className="font-bold">{supplier.name}</p>
                    <p className="text-sm">ผู้ติดต่อ: {supplier.contactPerson || '-'}</p>
                    <p className="text-sm">โทร: {supplier.phone || '-'}</p>
                </div>
                 <div className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-semibold text-gray-600 mb-1">ที่อยู่จัดส่ง / Ship To</h4>
                    <p className="font-bold">{companyInfo.name}</p>
                    <p className="text-sm whitespace-pre-line">{companyInfo.address}</p>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse text-sm mb-4">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-2 border text-center font-semibold">ลำดับ</th>
                        <th className="p-2 border text-left font-semibold w-2/5">รายการ</th>
                        <th className="p-2 border text-right font-semibold">จำนวน</th>
                        <th className="p-2 border text-center font-semibold">หน่วย</th>
                        <th className="p-2 border text-right font-semibold">ราคา/หน่วย</th>
                        <th className="p-2 border text-right font-semibold">ราคารวม</th>
                    </tr>
                </thead>
                <tbody>
                    {po.items.map((item, index) => {
                        const material = rawMaterialMap.get(item.rawMaterialId);
                        const itemTotal = item.quantity * item.unitPrice;
                        return (
                            <tr key={index}>
                                <td className="p-2 border text-center">{index + 1}</td>
                                <td className="p-2 border">{material?.name || 'N/A'}</td>
                                <td className="p-2 border text-right">{item.quantity.toLocaleString()}</td>
                                <td className="p-2 border text-center">{material?.unit || ''}</td>
                                <td className="p-2 border text-right">{item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="p-2 border text-right">{itemTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            
            {/* Totals */}
             <div className="flex justify-end">
                <table className="w-1/2 text-sm">
                    <tbody>
                        <tr>
                            <td className="p-2 font-semibold text-right">ยอดรวม</td>
                            <td className="p-2 w-2/5 text-right">{total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-semibold text-right">ภาษีมูลค่าเพิ่ม 7%</td>
                            <td className="p-2 text-right">{vat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                         <tr className="bg-gray-100 font-bold text-base">
                            <td className="p-2 border-y-2 border-black text-right">ยอดรวมทั้งสิ้น</td>
                            <td className="p-2 border-y-2 border-black text-right">{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="mt-16 text-xs absolute bottom-10 w-[190mm]">
                <div className="flex justify-around items-end">
                    <div className="text-center">
                        <p className="border-b border-dotted border-gray-400 w-48 mb-1"></p>
                        <p>(ผู้จัดทำ)</p>
                    </div>
                     <div className="text-center">
                        <p className="border-b border-dotted border-gray-400 w-48 mb-1"></p>
                        <p>(ผู้อนุมัติ)</p>
                    </div>
                </div>
                 <p className="text-center text-gray-500 mt-4">เอกสารนี้จัดทำโดยระบบคอมพิวเตอร์</p>
            </div>
        </div>
    );
};
