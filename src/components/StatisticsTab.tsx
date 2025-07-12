


import React, { useState, useEffect } from 'react';
import { getPackingLogs, getEmployees } from '../services/storageService';
import { PackingLogEntry, Employee } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type ChartData = {
    name: string;
    shortName: string;
    quantity: number;
}

type DateRange = 7 | 30 | 0; // 0 for all time

const COLORS = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0', '#047857', '#065f46', '#064e3b'];
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent === 0) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="font-bold text-sm">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};


export const StatisticsTab: React.FC = () => {
    const [data, setData] = useState<ChartData[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [dateRange, setDateRange] = useState<DateRange>(7);
    const [selectedPacker, setSelectedPacker] = useState('All');

    useEffect(() => {
        setEmployees(getEmployees());
    }, []);

    useEffect(() => {
        const logs = getPackingLogs();
        let filteredLogs: PackingLogEntry[] = logs;

        // Filter by date
        if (dateRange > 0) {
            const rangeDate = new Date();
            rangeDate.setDate(rangeDate.getDate() - dateRange);
            filteredLogs = filteredLogs.filter(log => new Date(log.date) >= rangeDate);
        }

        // Filter by packer
        if (selectedPacker !== 'All') {
            filteredLogs = filteredLogs.filter(log => log.packerName === selectedPacker);
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
                name: name,
                shortName: name.length > 25 ? name.substring(0, 22) + '...' : name,
                quantity: aggregatedData[name]
            }))
            .sort((a, b) => b.quantity - a.quantity); 

        setData(chartData);
    }, [dateRange, selectedPacker]);

    const FilterButton: React.FC<{ range: DateRange; label: string }> = ({ range, label }) => (
        <button
            onClick={() => setDateRange(range)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                dateRange === range
                    ? 'bg-green-600 text-white shadow'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
        >
            {label}
        </button>
    );
    
    const getHeading = () => {
        let heading = "สถิติการแพ็คสินค้า";
        if(selectedPacker !== 'All') heading += ` (${selectedPacker})`;
        if(dateRange === 7) return `${heading} - 7 วันล่าสุด`;
        if(dateRange === 30) return `${heading} - 30 วันล่าสุด`;
        return `${heading} - ทั้งหมด`;
    }

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold">{getHeading()}</h2>
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                        <FilterButton range={7} label="7 วัน" />
                        <FilterButton range={30} label="30 วัน" />
                        <FilterButton range={0} label="ทั้งหมด" />
                    </div>
                    <div>
                         <select 
                            value={selectedPacker} 
                            onChange={e => setSelectedPacker(e.target.value)} 
                            className="px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        >
                           <option value="All">พนักงานทั้งหมด</option>
                           {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {data.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-4">
                    <div className="lg:col-span-3 w-full h-96 bg-gray-50 p-4 rounded-lg border">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data}
                                margin={{ top: 5, right: 20, left: 0, bottom: 20, }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="shortName" angle={-15} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
                                <YAxis allowDecimals={false} />
                                <Tooltip
                                    formatter={(value, name, props) => [value, props.payload.name]}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                        border: '1px solid #ccc',
                                        borderRadius: '0.5rem',
                                        fontFamily: 'inherit'
                                    }}
                                />
                                <Legend wrapperStyle={{paddingTop: '20px'}} />
                                <Bar dataKey="quantity" name="จำนวน (ลัง)" fill="#10b981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="lg:col-span-2 w-full h-96 bg-gray-50 p-4 rounded-lg border flex flex-col items-center">
                        <h3 className="text-lg font-bold text-gray-700 mb-2">สัดส่วนการแพ็ค</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="quantity"
                                    nameKey="name"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                        border: '1px solid #ccc',
                                        borderRadius: '0.5rem',
                                        fontFamily: 'inherit'
                                    }}
                                />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{paddingTop: '10px', fontSize: '12px'}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-96 bg-gray-50 p-4 rounded-lg border">
                    <p className="text-gray-500 text-lg">ไม่มีข้อมูลในช่วงเวลานี้</p>
                </div>
            )}
        </div>
    );
};
