import React, { useState } from 'react';
import { RawMaterial } from '../types';
import { parseIntelligentRawMaterials } from '../services/geminiService';
import { LoaderIcon, Trash2Icon, SparklesIcon, XCircleIcon } from './icons/Icons';

type StagedMaterial = Partial<RawMaterial> & { _tempId: string };

interface Props {
    onClose: () => void;
    onSave: (materials: RawMaterial[]) => void;
}

export const IntelligentMaterialImportModal: React.FC<Props> = ({ onClose, onSave }) => {
    const [rawText, setRawText] = useState('');
    const [stagedMaterials, setStagedMaterials] = useState<StagedMaterial[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleParse = async () => {
        setIsLoading(true);
        setError(null);
        setStagedMaterials([]);
        try {
            const parsed = await parseIntelligentRawMaterials(rawText);
            const withTempIds = parsed.map(item => ({
                ...item,
                id: item.id || crypto.randomUUID(),
                _tempId: crypto.randomUUID()
            }));
            setStagedMaterials(withTempIds);
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

    const handleItemChange = (tempId: string, field: keyof RawMaterial, value: any) => {
        setStagedMaterials(current =>
            current.map(item =>
                item._tempId === tempId ? { ...item, [field]: value } : item
            )
        );
    };

    const handleRemoveItem = (tempId: string) => {
        setStagedMaterials(current => current.filter(item => item._tempId !== tempId));
    };

    const handleConfirm = () => {
        const validatedMaterials: RawMaterial[] = [];
        for (const item of stagedMaterials) {
            if (item.name && item.unit && item.quantity !== undefined) {
                validatedMaterials.push({
                    id: item.id || crypto.randomUUID(),
                    name: item.name,
                    quantity: Number(item.quantity),
                    unit: item.unit,
                    costPerUnit: item.costPerUnit ? Number(item.costPerUnit) : undefined,
                });
            } else {
                alert(`กรุณากรอกข้อมูลให้ครบถ้วนสำหรับรายการ: ${item.name || 'ไม่มีชื่อ'}`);
                return;
            }
        }
        onSave(validatedMaterials);
        onClose();
    };

    const commonInputStyle = "w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">นำเข้าวัตถุดิบอัจฉริยะ</h2>
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
                            placeholder="เช่น: เม็ดพลาสติก PP 100 kg ราคา 55 บาท..."
                        />
                        <button onClick={handleParse} disabled={isLoading || !rawText.trim()} className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent font-semibold rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400">
                            {isLoading ? <LoaderIcon className="w-5 h-5"/> : <SparklesIcon className="w-5 h-5" />}
                            ประมวลผลข้อมูล
                        </button>
                    </div>

                    <div className="flex flex-col">
                        <h3 className="font-semibold mb-2">2. ตรวจทานและแก้ไขข้อมูล</h3>
                        <div className="flex-grow overflow-y-auto border rounded-lg bg-gray-50 p-2">
                             {isLoading && <div className="flex items-center justify-center h-full"><LoaderIcon className="w-8 h-8"/></div>}
                             {error && <div className="text-red-600 p-4">{error}</div>}
                             {!isLoading && !error && stagedMaterials.length === 0 && <div className="text-center text-gray-500 pt-16">รอข้อมูล...</div>}
                            
                             {stagedMaterials.length > 0 && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-[4fr,2fr,2fr,2fr,auto] gap-2 text-xs font-bold px-2 py-1">
                                        <span>ชื่อวัตถุดิบ</span><span>จำนวน</span><span>หน่วย</span><span>ราคา/หน่วย</span><span></span>
                                    </div>
                                    {stagedMaterials.map(item => (
                                        <div key={item._tempId} className="grid grid-cols-[4fr,2fr,2fr,2fr,auto] gap-2 items-center bg-white p-2 rounded shadow-sm">
                                            <input type="text" value={item.name || ''} onChange={e => handleItemChange(item._tempId, 'name', e.target.value)} className={commonInputStyle} />
                                            <input type="number" value={item.quantity === undefined ? '' : item.quantity} onChange={e => handleItemChange(item._tempId, 'quantity', Number(e.target.value))} className={commonInputStyle} />
                                            <input type="text" value={item.unit || ''} onChange={e => handleItemChange(item._tempId, 'unit', e.target.value)} className={commonInputStyle} />
                                            <input type="number" value={item.costPerUnit === undefined ? '' : item.costPerUnit} onChange={e => handleItemChange(item._tempId, 'costPerUnit', Number(e.target.value))} className={commonInputStyle} />
                                            <button onClick={() => handleRemoveItem(item._tempId)} className="p-1 text-red-500 hover:text-red-700"><Trash2Icon className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                             )}
                        </div>
                         <button onClick={handleConfirm} disabled={stagedMaterials.length === 0} className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent font-semibold rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400">
                            ยืนยันและเพิ่ม {stagedMaterials.length} รายการ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
