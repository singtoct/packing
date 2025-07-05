

import React, { useState, useEffect, useMemo } from 'react';
import { getQCEntries, saveQCEntries, getEmployees } from '../services/storageService';
import { QCEntry, Employee } from '../types';
import { CheckCircle2Icon, XCircleIcon, AlertTriangleIcon, CameraIcon } from './icons/Icons';

const QC_FAILURE_REASONS = [
    'สินค้าชำรุด',
    'แพ็คเกจไม่สวยงาม',
    'จำนวนผิดพลาด',
    'ปิดผนึกไม่ดี',
    'ติดฉลากผิด',
    'อื่นๆ',
];

const QCInspectionModal: React.FC<{
    entry: QCEntry;
    employees: Employee[];
    onClose: () => void;
    onSave: (updatedEntry: QCEntry) => void;
}> = ({ entry, employees, onClose, onSave }) => {
    const [qcInspector, setQcInspector] = useState<string>(employees[0]?.name || '');
    const [status, setStatus] = useState<'Passed' | 'Failed' | null>(null);
    const [reasons, setReasons] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

    const handleReasonChange = (reason: string, checked: boolean) => {
        setReasons(prev =>
            checked ? [...prev, reason] : prev.filter(r => r !== reason)
        );
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (!status) {
            alert('กรุณาเลือกผลการตรวจสอบ (ผ่าน หรือ ไม่ผ่าน)');
            return;
        }
        if (status === 'Failed' && reasons.length === 0) {
            alert('กรุณาเลือกเหตุผลอย่างน้อย 1 ข้อ');
            return;
        }
        onSave({
            ...entry,
            status,
            qcInspector,
            reasons: status === 'Failed' ? reasons : [],
            notes,
            imageUrl,
            qcDate: new Date().toISOString().split('T')[0],
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">ตรวจสอบคุณภาพ (QC)</h2>
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <p><strong>สินค้า:</strong> {entry.productName}</p>
                    <p><strong>จำนวน:</strong> {entry.quantity} ลัง</p>
                    <p><strong>ผู้แพ็ค:</strong> {entry.packerName}</p>
                    <p><strong>วันที่แพ็ค:</strong> {new Date(entry.packingDate).toLocaleDateString('th-TH')}</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label htmlFor="qcInspector" className="block text-sm font-medium text-gray-700">ผู้ตรวจสอบ</label>
                        <select id="qcInspector" value={qcInspector} onChange={e => setQcInspector(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500">
                            {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ผลการตรวจสอบ</label>
                        <div className="flex gap-4">
                            <button onClick={() => setStatus('Passed')} className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-lg font-bold rounded-md border-2 transition-all ${status === 'Passed' ? 'bg-green-600 text-white border-green-700' : 'bg-white text-green-600 border-green-500 hover:bg-green-50'}`}>
                                <CheckCircle2Icon className="w-6 h-6" /> ผ่าน
                            </button>
                            <button onClick={() => setStatus('Failed')} className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-lg font-bold rounded-md border-2 transition-all ${status === 'Failed' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-red-600 border-red-500 hover:bg-red-50'}`}>
                                <XCircleIcon className="w-6 h-6" /> ไม่ผ่าน
                            </button>
                        </div>
                    </div>

                    {status === 'Failed' && (
                        <div className="p-4 border-l-4 border-red-400 bg-red-50 rounded-md">
                            <h3 className="font-bold text-red-800 mb-3">ระบุเหตุผลที่ไม่ผ่าน (เลือกได้มากกว่า 1)</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {QC_FAILURE_REASONS.map(reason => (
                                    <label key={reason} className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" onChange={e => handleReasonChange(reason, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                                        {reason}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">หมายเหตุเพิ่มเติม</label>
                        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"></textarea>
                    </div>

                    <div>
                         <label className="block text-sm font-medium text-gray-700">แนบรูปภาพ (ถ้ามี)</label>
                         <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            {imageUrl ? (
                                <div className="text-center">
                                    <img src={imageUrl} alt="Preview" className="max-h-40 mx-auto rounded-md mb-2" />
                                    <button onClick={() => setImageUrl(undefined)} className="text-sm text-red-600 hover:underline">ลบรูปภาพ</button>
                                </div>
                            ) : (
                                <div className="space-y-1 text-center">
                                    <CameraIcon className="mx-auto h-12 w-12 text-gray-400"/>
                                    <div className="flex text-sm text-gray-600">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500">
                                            <span>อัปโหลดไฟล์</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload}/>
                                        </label>
                                        <p className="pl-1">หรือลากและวาง</p>
                                    </div>
                                    <p className="text-xs text-gray-500">PNG, JPG, GIF ขนาดไม่เกิน 10MB</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-8">
                    <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50">ยกเลิก</button>
                    <button type="button" onClick={handleSave} className="px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">บันทึกผล</button>
                </div>
            </div>
        </div>
    );
};

export const QCTab: React.FC = () => {
    const [qcEntries, setQcEntries] = useState<QCEntry[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filter, setFilter] = useState<'All' | 'Pending' | 'Passed' | 'Failed'>('Pending');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<QCEntry | null>(null);

    useEffect(() => {
        const handleStorageChange = () => {
            setQcEntries(getQCEntries().sort((a,b) => new Date(b.packingDate).getTime() - new Date(a.packingDate).getTime()));
        };
        handleStorageChange();
        setEmployees(getEmployees());
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const openModal = (entry: QCEntry) => {
        setSelectedEntry(entry);
        setModalOpen(true);
    };

    const closeModal = () => {
        setSelectedEntry(null);
        setModalOpen(false);
    };

    const handleSaveInspection = (updatedEntry: QCEntry) => {
        const updatedEntries = qcEntries.map(e => e.id === updatedEntry.id ? updatedEntry : e);
        saveQCEntries(updatedEntries);
        setQcEntries(updatedEntries);
        closeModal();
    };

    const filteredEntries = useMemo(() => {
        if (filter === 'All') return qcEntries;
        return qcEntries.filter(entry => entry.status === filter);
    }, [filter, qcEntries]);

    const FilterButton: React.FC<{ status: 'All' | 'Pending' | 'Passed' | 'Failed'; label: string; count: number }> = ({ status, label, count }) => (
        <button onClick={() => setFilter(status)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === status ? 'bg-green-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
            {label} <span className={`px-2 py-0.5 rounded-full text-xs ${filter === status ? 'bg-white text-green-600' : 'bg-gray-200 text-gray-600'}`}>{count}</span>
        </button>
    );
    
    const StatusBadge: React.FC<{status: QCEntry['status']}> = ({status}) => {
        const statusMap = {
            Pending: { text: 'รอตรวจสอบ', icon: <AlertTriangleIcon className="w-4 h-4" />, color: 'yellow'},
            Passed: { text: 'ผ่าน', icon: <CheckCircle2Icon className="w-4 h-4" />, color: 'green'},
            Failed: { text: 'ไม่ผ่าน', icon: <XCircleIcon className="w-4 h-4" />, color: 'red'},
        };
        const { text, icon, color } = statusMap[status];
        return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-${color}-100 text-${color}-800`}>{icon} {text}</span>;
    };

    return (
        <div>
            {modalOpen && selectedEntry && <QCInspectionModal entry={selectedEntry} employees={employees} onClose={closeModal} onSave={handleSaveInspection} />}
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">ควบคุมคุณภาพ (QC)</h2>
                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                    <FilterButton status="Pending" label="รอตรวจสอบ" count={qcEntries.filter(e=>e.status==='Pending').length} />
                    <FilterButton status="Passed" label="ผ่าน" count={qcEntries.filter(e=>e.status==='Passed').length} />
                    <FilterButton status="Failed" label="ไม่ผ่าน" count={qcEntries.filter(e=>e.status==='Failed').length}/>
                    <FilterButton status="All" label="ทั้งหมด" count={qcEntries.length} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredEntries.length > 0 ? filteredEntries.map(entry => (
                    <div key={entry.id} className="bg-white rounded-lg shadow-md border overflow-hidden">
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <p className="font-bold text-gray-800 flex-1">{entry.productName}</p>
                                <StatusBadge status={entry.status} />
                            </div>
                            <p className="text-sm text-gray-500">จำนวน: <span className="font-semibold">{entry.quantity}</span> ลัง</p>
                            <p className="text-sm text-gray-500">ผู้แพ็ค: <span className="font-semibold">{entry.packerName}</span></p>
                            <p className="text-sm text-gray-500">วันที่แพ็ค: <span className="font-semibold">{new Date(entry.packingDate).toLocaleDateString('th-TH')}</span></p>
                            {entry.status !== 'Pending' && (
                                <div className="mt-2 pt-2 border-t text-sm">
                                    <p className="text-gray-500">ผู้ตรวจ: <span className="font-semibold">{entry.qcInspector}</span></p>
                                    <p className="text-gray-500">วันที่ตรวจ: <span className="font-semibold">{entry.qcDate ? new Date(entry.qcDate).toLocaleDateString('th-TH') : ''}</span></p>
                                </div>
                            )}
                            {entry.status === 'Failed' && entry.reasons && (
                                <div className="mt-2 text-sm">
                                    <p className="font-bold text-red-700">เหตุผล: {entry.reasons.join(', ')}</p>
                                    {entry.notes && <p className="text-gray-600 mt-1"><strong>หมายเหตุ:</strong> {entry.notes}</p>}
                                     {entry.imageUrl && <a href={entry.imageUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline mt-1 inline-block">ดูรูปภาพ</a>}
                                </div>
                            )}
                        </div>
                        {entry.status === 'Pending' && (
                            <div className="bg-gray-50 p-3">
                                <button onClick={() => openModal(entry)} className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600 transition-colors">
                                    ตรวจสอบ
                                </button>
                            </div>
                        )}
                    </div>
                )) : (
                     <div className="col-span-full text-center py-16 text-gray-500">
                        <p className="text-lg">ไม่พบรายการที่ตรงกับฟิลเตอร์</p>
                    </div>
                )}
            </div>
        </div>
    );
};
