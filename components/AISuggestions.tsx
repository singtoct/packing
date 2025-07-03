
import React, { useState, useCallback } from 'react';
import { getFeatureSuggestions } from '../services/geminiService';
import { AiSuggestion } from '../types';
import { LightbulbIcon, LoaderIcon } from './icons/Icons';

export const AISuggestions: React.FC = () => {
    const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFetchSuggestions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getFeatureSuggestions();
            if (result.length === 0) {
                setError("ไม่สามารถดึงคำแนะนำได้ในขณะนี้ กรุณาลองใหม่ภายหลัง");
            } else {
                setSuggestions(result);
            }
        } catch (err) {
            setError("เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return (
        <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-xl shadow-lg">
            <div className="flex items-center gap-4 mb-4">
                <LightbulbIcon className="w-8 h-8 text-blue-500" />
                <h2 className="text-2xl font-bold text-blue-800">ควรเพิ่มฟังก์ชันอะไรอีก?</h2>
            </div>
            <p className="text-gray-600 mb-6">ให้ AI ช่วยแนะนำฟังก์ชันเพิ่มเติมเพื่อพัฒนาระบบของคุณให้ดียิ่งขึ้น</p>

            {suggestions.length === 0 && !isLoading && (
                 <button 
                    onClick={handleFetchSuggestions}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <LightbulbIcon className="w-5 h-5" />
                    ขอคำแนะนำจาก AI
                </button>
            )}

            {isLoading && (
                <div className="flex items-center justify-center gap-3 text-gray-600">
                    <LoaderIcon className="w-6 h-6" />
                    <p>กำลังประมวลผลคำแนะนำ...</p>
                </div>
            )}

            {error && <p className="text-red-600">{error}</p>}
            
            {suggestions.length > 0 && (
                <div className="grid md:grid-cols-3 gap-6 mt-4">
                    {suggestions.map((s, i) => (
                        <div key={i} className="bg-white p-6 rounded-lg shadow-md border border-gray-200 transform hover:-translate-y-1 transition-transform duration-300">
                            <h3 className="font-bold text-lg text-blue-700 mb-2">{s.title}</h3>
                            <p className="text-sm text-gray-600">{s.description}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
