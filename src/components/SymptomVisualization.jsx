import { useState, useEffect, useCallback } from 'react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip, 
    ResponsiveContainer, 
    CartesianGrid 
} from 'recharts';
import { readSymptomReports, SYMPTOM_REPORTS_STORAGE_KEY } from './SymptomReportButton';
import { eventBus } from '../core/events';

export default function SymptomVisualization() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadAggregatedData = useCallback(() => {
        try {
            const reports = readSymptomReports();
            const counts = {};

            if (Array.isArray(reports)) {
                reports.forEach((report) => {
                    if (report && Array.isArray(report.symptoms)) {
                        report.symptoms.forEach((symptom) => {
                            if (typeof symptom === 'string' && symptom.trim() !== '') {
                                counts[symptom] = (counts[symptom] || 0) + 1;
                            }
                        });
                    }
                });
            }

            const aggregated = Object.entries(counts)
                .map(([symptom, count]) => ({ symptom, count }))
                .sort((a, b) => b.count - a.count);

            setData(aggregated);
            setError(null);
        } catch (err) {
            setError(err?.message || 'Failed to load symptom data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAggregatedData();

        const handleUpdate = () => {
            loadAggregatedData();
        };

        eventBus.on('SYMPTOM_REPORT_SUBMITTED', handleUpdate);

        const handleStorage = (e) => {
            if (!e.key || e.key === SYMPTOM_REPORTS_STORAGE_KEY) {
                handleUpdate();
            }
        };
        window.addEventListener('storage', handleStorage);

        return () => {
            eventBus.off('SYMPTOM_REPORT_SUBMITTED', handleUpdate);
            window.removeEventListener('storage', handleStorage);
        };
    }, [loadAggregatedData]);

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
