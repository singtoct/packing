import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { getCustomers, saveCustomers } from '../services/storageService';
import { PlusCircleIcon, Trash2Icon, EditIcon } from 'lucide-react';

export const CustomersTab: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isEditing, setIsEditing] = useState<Customer | null>(null);

    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        setCustomers(getCustomers().sort((a,b) => a.name.localeCompare(b.name)));
    }, []);

    useEffect(() => {
        if(isEditing) {
            setName(isEditing.name);
            setAddress(isEditing.address);
            setContactPerson(isEditing.contactPerson);
            setPhone(isEditing.phone);
        } else {
            setName('');
            setAddress('');
            setContactPerson('');
            setPhone('');
        }
    }, [isEditing]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        let updatedCustomers;
        if(isEditing) {
            updatedCustomers = customers.map(c => c.id === isEditing.id ? {...c, name, address, contactPerson, phone } : c);
        } else {
            const newCustomer: Customer = {
                id: crypto.randomUUID(),
                name,
                address,
                contactPerson,
                phone,
            };
            updatedCustomers = [...customers, newCustomer];
        }

        const sorted = updatedCustomers.sort((a,b) => a.name.localeCompare(b.name));
        setCustomers(sorted);
        saveCustomers(sorted);
        setIsEditing(null);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบลูกค้าท่านนี้?')) {
            const updated = customers.filter(c => c.id !== id);
            setCustomers(updated);
            saveCustomers(updated);
        }
    };
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
                <h2 className="text-2xl font-bold mb-6">{isEditing ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</h2>
                <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border mb-6 space-y-3 sticky top-28">
                     <div>
                        <label className="block text-sm font-medium text-gray-700">ชื่อลูกค้า/บริษัท</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">ที่อยู่</label>
                        <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ผู้ติดต่อ</label>
                        <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
                        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
                            {isEditing ? 'บันทึก' : <><PlusCircleIcon className="w-5 h-5"/> เพิ่มลูกค้า</>}
                        </button>
                        {isEditing && <button type="button" onClick={() => setIsEditing(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm">ยกเลิก</button>}
                    </div>
                 </form>
            </div>
            <div className="md:col-span-2">
                <h3 className="text-xl font-semibold mb-4">รายชื่อลูกค้า</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm border">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อลูกค้า</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ผู้ติดต่อ</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เบอร์โทร</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-gray-200">
                             {customers.map(c => (
                                 <tr key={c.id}>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold">{c.name}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm">{c.contactPerson}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm">{c.phone}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right space-x-2">
                                        <button onClick={() => setIsEditing(c)} className="p-1 text-blue-600 hover:text-blue-900" title="แก้ไข"><EditIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(c.id)} className="p-1 text-red-600 hover:text-red-900" title="ลบ"><Trash2Icon className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                             ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};