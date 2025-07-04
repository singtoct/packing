
import React, { useState, useEffect } from 'react';
import { getPackingLogs } from '../services/storageService';
import { PackingLogEntry } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type ChartData = {
    name: string;
    quantity: number;
}

type DateRange = 7 | 30 | 0; // 0 for all time

export const StatisticsTab: React.FC = () => {
    const [data, setData] = useState<ChartData[]>([]);
    const [dateRange, setDateRange] = useState<DateRange>(7);

    useEffect(() => {
        const logs = getPackingLogs();
        let filteredLogs: PackingLogEntry[] = logs;

        if (dateRange > 0) {
            const rangeDate = new Date();
            rangeDate.setDate(rangeDate.getDate() - dateRange);
            filteredLogs = logs.filter(log => new Date(log.date) >= rangeDate);
        }
        
        const aggregatedData = filteredLogs.reduce((acc, log) => {
            if (!acc[log.name]) {
                acc[log.name] = 0;
            }
            acc[log.name] += log.quantity;
            return acc;
        }, {} as { [key: string]: number });

        const chartData: ChartData[] = Object.keys(aggregatedData)
            .map(name => ({
                name: name.length > 30 ? name.substring(0, 27) + '...' : name,
                quantity: aggregatedData[name]
            }))
            .sort((a, b) => b.quantity - a.quantity); 

        setData(chartData);
    }, [dateRange]);

    const FilterButton: React.FC<{ range: DateRange; label: string }> = ({ range, label }) => (
        <button
            onClick={() => setDateRange(range)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                dateRange === range
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
        >
            {label}
        </button>
    );
    
    const getHeading = () => {
        if(dateRange === 7) return "สถิติการแพ็คสินค้า (7 วันล่าสุด)";
        if(dateRange === 30) return "สถิติการแพ็คสินค้า (30 วันล่าสุด)";
        return "สถิติการแพ็คสินค้า (ทั้งหมด)";
    }

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold">{getHeading()}</h2>
                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                    <FilterButton range={7} label="7 วัน" />
                    <FilterButton range={30} label="30 วัน" />
                    <FilterButton range={0} label="ทั้งหมด" />
                </div>
            </div>
            <div className="w-full h-96 bg-gray-50 p-4 rounded-lg border">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 5, right: 20, left: 0, bottom: 20, }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    border: '1px solid #ccc',
                                    borderRadius: '0.5rem',
                                    fontFamily: 'inherit'
                                }}
                            />
                            <Legend wrapperStyle={{paddingTop: '20px'}} />
                            <Bar dataKey="quantity" name="จำนวน (ลัง)" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500 text-lg">ไม่มีข้อมูลในช่วงเวลานี้</p>
                    </div>
                )}
            </div>
        </div>
    );
};