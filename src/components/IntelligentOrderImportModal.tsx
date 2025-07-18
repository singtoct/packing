import React, { useState } from 'react';
import { OrderItem } from '../types';
import { parseIntelligentOrders } from '../services/geminiService';
import { LoaderIcon, Trash2Icon, SparklesIcon, XCircleIcon } from 'lucide-react';

type StagedOrder = Partial<OrderItem> & { _tempId: string };

interface Props {
    onClose: () => void;
    onSave: (orders: OrderItem[]) => void;
}

export const IntelligentOrderImportModal: React.FC<Props> = ({ onClose, onSave }) => {
    const [rawText, setRawText] = useState('');
    const [stagedOrders, setStagedOrders] = useState<StagedOrder[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleParse = async () => {
        setIsLoading(true);
        setError(null);
        setStagedOrders([]);
        try {
            const parsed = await parseIntelligentOrders(rawText);
            const withTempIds = parsed.map(item => ({
                ...item,
                id: item.id || crypto.randomUUID(),
                dueDate: item.dueDate || new Date().toISOString().split('T')[0],
                _tempId: crypto.randomUUID()
            }));
            setStagedOrders(withTempIds);
        } catch (err: any) {
            let errorMessage = 'เกิดข้อผิดพลาดในการประมวลผลข้อมูล';
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            } else if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
                errorMessage = err.message;
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleItemChange = (tempId: string, field: keyof OrderItem, value: any) => {
        setStagedOrders(current =>
            current.map(item =>
                item._tempId === tempId ? { ...item, [field]: value } : item
            )
        );
    };

    const handleRemoveItem = (tempId: string) => {
        setStagedOrders(current => current.filter(item => item._tempId !== tempId));
    };

    const handleConfirm = () => {
        const validatedOrders: OrderItem[] = [];
        for (const item of stagedOrders) {
            if (item.name && item.color && item.quantity && item.dueDate) {
                validatedOrders.push({
                    id: item.id || crypto.randomUUID(),
                    name: item.name,
                    color: item.color,
                    quantity: Number(item.quantity),
                    dueDate: item.dueDate,
                    salePrice: item.salePrice ? Number(item.salePrice) : undefined,
                });
            } else {
                alert(`กรุณากรอกข้อมูลให้ครบถ้วนสำหรับรายการ: ${item.name || 'ไม่มีชื่อ'}`);
                return;
            }
        }
        onSave(validatedOrders);
        onClose();
    };

    const commonInputStyle = "w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">นำเข้าออเดอร์อัจฉริยะ</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XCircleIcon className="w-6 h-6 text-gray-500"/></button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow overflow-hidden">
                    <div className="flex flex-col">
                        <label htmlFor="rawTextInput" className="font-semibold mb-2">1. วางข้อมูลที่นี่</label>
                        <textarea
                            id="rawTextInput"
                            value={rawText}
                            onChange={e => setRawText(e.target.value)}
                            className="flex-grow p-3 border border-gray-300 rounded-md resize-none font-mono text-sm"
                            placeholder="เช่น: ฝาหน้ากาก CT A-103 สีขาว 5000 ชิ้น..."
                        />
                        <button onClick={handleParse} disabled={isLoading || !rawText.trim()} className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent font-semibold rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400">
                            {isLoading ? <LoaderIcon className="w-5 h-5 animate-spin"/> : <SparklesIcon className="w-5 h-5" />}
                            ประมวลผลข้อมูล
                        </button>
                    </div>

                    <div className="flex flex-col">
                        <h3 className="font-semibold mb-2">2. ตรวจทานและแก้ไขข้อมูล</h3>
                        <div className="flex-grow overflow-y-auto border rounded-lg bg-gray-50 p-2">
                             {isLoading && <div className="flex items-center justify-center h-full"><LoaderIcon className="w-8 h-8 animate-spin"/></div>}
                             {error && <div className="text-red-600 p-4">{error}</div>}
                             {!isLoading && !error && stagedOrders.length === 0 && <div className="text-center text-gray-500 pt-16">รอข้อมูล...</div>}
                            
                             {stagedOrders.length > 0 && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-[3fr,2fr,1.5fr,1.5fr,auto] gap-2 text-xs font-bold px-2 py-1">
                                        <span>ชื่อสินค้า</span><span>สี</span><span>จำนวน</span><span>Due Date</span><span></span>
                                    </div>
                                    {stagedOrders.map(item => (
                                        <div key={item._tempId} className="grid grid-cols-[3fr,2fr,1.5fr,1.5fr,auto] gap-2 items-center bg-white p-2 rounded shadow-sm">
                                            <input type="text" value={item.name || ''} onChange={e => handleItemChange(item._tempId, 'name', e.target.value)} className={commonInputStyle} />
                                            <input type="text" value={item.color || ''} onChange={e => handleItemChange(item._tempId, 'color', e.target.value)} className={commonInputStyle} />
                                            <input type="number" value={item.quantity === undefined ? '' : item.quantity} onChange={e => handleItemChange(item._tempId, 'quantity', Number(e.target.value))} className={commonInputStyle} />
                                            <input type="date" value={item.dueDate || ''} onChange={e => handleItemChange(item._tempId, 'dueDate', e.target.value)} className={commonInputStyle} />
                                            <button onClick={() => handleRemoveItem(item._tempId)} className="p-1 text-red-500 hover:text-red-700"><Trash2Icon className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                             )}
                        </div>
                         <button onClick={handleConfirm} disabled={stagedOrders.length === 0} className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent font-semibold rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400">
                            ยืนยันและเพิ่ม {stagedOrders.length} ออเดอร์
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
