import { useState, useEffect } from 'react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip, 
    ResponsiveContainer, 
    CartesianGrid 
} from 'recharts';

export default function SymptomVisualization() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAggregatedData = async () => {
            try {
                // Fetching from our new backend endpoint
                const response = await fetch('http://localhost:3001/api/symptoms/aggregated');
                if (!response.ok) throw new Error('Failed to fetch symptom data');
                
                const result = await response.json();
                setData(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAggregatedData();
    }, []);

    if (loading) return <div className="p-4 text-center">Loading local health data...</div>;
    if (error) return <div className="p-4 text-center text-red-500">Error loading data: {error}</div>;
    if (!data || data.length === 0) return <div className="p-4 text-center">No recent symptom reports in this area.</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-2">Local Health Impacts</h3>
            <p className="text-sm text-gray-600 mb-6">
                Aggregated, anonymous symptom reports in your area.
            </p>
            
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis 
                            dataKey="symptom" 
                            type="category" 
                            width={120}
                            tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                            cursor={{ fill: '#f3f4f6' }}
                            formatter={(value) => [`${value} reports`, 'Count']}
                        />
                        <Bar 
                            dataKey="count" 
                            fill="#ef4444" 
                            radius={[0, 4, 4, 0]} 
                            barSize={20}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
