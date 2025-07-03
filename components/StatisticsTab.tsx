
import React, { useState, useEffect } from 'react';
import { getPackingLogs } from '../services/storageService';
import { PackingLogEntry } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
    name: string;
    quantity: number;
}

export const StatisticsTab: React.FC = () => {
    const [data, setData] = useState<ChartData[]>([]);

    useEffect(() => {
        const logs = getPackingLogs();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentLogs = logs.filter(log => new Date(log.date) >= sevenDaysAgo);
        
        const aggregatedData = recentLogs.reduce((acc, log) => {
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
    }, []);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">สถิติการแพ็คสินค้า (7 วันล่าสุด)</h2>
            <div className="w-full h-96 bg-gray-50 p-4 rounded-lg border">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{
                                top: 5,
                                right: 20,
                                left: 0,
                                bottom: 20,
                            }}
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
                        <p className="text-gray-500 text-lg">ไม่มีข้อมูลเพียงพอสำหรับแสดงผล</p>
                    </div>
                )}
            </div>
        </div>
    );
};
