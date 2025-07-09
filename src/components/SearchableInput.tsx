
import React, { useState, useEffect, useRef, useMemo } from 'react';

interface SearchableInputProps<T> {
    options: T[];
    value: string;
    onChange: (value: string) => void;
    displayKey: keyof T;
    valueKey: keyof T;
    secondaryDisplayKey?: keyof T;
    placeholder?: string;
    className?: string;
}

export const SearchableInput = <T extends { [key: string]: any }>({
    options,
    value,
    onChange,
    displayKey,
    valueKey,
    secondaryDisplayKey,
    placeholder,
    className
}: SearchableInputProps<T>) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = useMemo(() => 
        options.find(option => option[valueKey] === value)
    , [options, value, valueKey]);

    useEffect(() => {
        if (selectedOption) {
            setSearchTerm(String(selectedOption[displayKey]));
        } else {
            setSearchTerm('');
        }
    }, [value, selectedOption, displayKey]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                if (selectedOption) {
                    setSearchTerm(String(selectedOption[displayKey]));
                } else {
                    setSearchTerm('');
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [wrapperRef, selectedOption, displayKey]);
    
    const filteredOptions = useMemo(() =>
        options.filter(option =>
            String(option[displayKey]).toLowerCase().includes(searchTerm.toLowerCase()) ||
            (secondaryDisplayKey && String(option[secondaryDisplayKey]).toLowerCase().includes(searchTerm.toLowerCase()))
        )
    , [options, searchTerm, displayKey, secondaryDisplayKey]);

    const handleSelect = (option: T) => {
        onChange(option[valueKey]);
        setSearchTerm(String(option[displayKey]));
        setIsOpen(false);
    };
    
    return (
        <div className={`relative ${className || ''}`} ref={wrapperRef}>
            <input
                type="text"
                value={searchTerm}
                onChange={e => {
                    setSearchTerm(e.target.value);
                    if (!isOpen) setIsOpen(true);
                    if (e.target.value === '') {
                        onChange('');
                    }
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                autoComplete="off"
            />
            {isOpen && (
                <ul className="absolute z-20 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <li
                                key={option[valueKey]}
                                onClick={() => handleSelect(option)}
                                className="px-4 py-2 cursor-pointer hover:bg-blue-50 flex justify-between items-center border-b last:border-b-0"
                            >
                                <span>{String(option[displayKey])}</span>
                                {secondaryDisplayKey && (
                                    <span className="text-xs text-gray-400 font-mono">{String(option[secondaryDisplayKey])}</span>
                                )}
                            </li>
                        ))
                    ) : (
                         <li className="px-3 py-2 text-gray-500">ไม่พบรายการ</li>
                    )}
                </ul>
            )}
        </div>
    );
};
