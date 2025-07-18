
import React, { useState } from 'react';
import { PlusCircleIcon, Trash2Icon } from './icons/Icons';

interface EditableListProps {
    title: string;
    items: string[];
    onUpdate: (newItems: string[]) => void;
    placeholder?: string;
}

export const EditableList: React.FC<EditableListProps> = ({ title, items, onUpdate, placeholder = "เพิ่มรายการใหม่" }) => {
    const [newItem, setNewItem] = useState('');

    const handleAddItem = () => {
        if (newItem.trim() && !items.includes(newItem.trim())) {
            onUpdate([...items, newItem.trim()]);
            setNewItem('');
        }
    };

    const handleRemoveItem = (itemToRemove: string) => {
        onUpdate(items.filter(item => item !== itemToRemove));
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2">
                {items.length > 0 ? items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <span className="text-sm">{item}</span>
                        <button onClick={() => handleRemoveItem(item)} className="p-1 text-red-500 hover:text-red-700">
                            <Trash2Icon className="w-4 h-4" />
                        </button>
                    </div>
                )) : (
                    <p className="text-sm text-gray-500 text-center py-4">ไม่มีรายการ</p>
                )}
            </div>
            <div className="flex gap-2 border-t pt-4">
                <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder={placeholder}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddItem();
                        }
                    }}
                />
                <button onClick={handleAddItem} className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700">
                    <PlusCircleIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
