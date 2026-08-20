import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { getAirQuality } from '../src/services/api';

interface AQIData {
  current: {
    pm2_5: number;
    pm10: number;
    no2: number;
    so2: number;
    o3: number;
    co: number;
  };
}

export default function DashboardScreen() {
  const [data, setData] = useState<AQIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    
    const result = await getAirQuality({
      latitude: 28.6139,
      longitude: 77.2090,
      hourly: ['pm2_5', 'pm10', 'no2', 'so2', 'o3', 'co'],
    });

    if (result.data) {
      setData(result.data);
      setFromCache(result.fromCache);
    } else {
      setError(result.error || 'Failed to load data');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading air quality data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <Text style={styles.retryText} onPress={loadDashboard}>Tap to retry</Text>
      </View>
    );
  }

  const pollutants = [
    { key: 'pm2_5', label: 'PM2.5', value: data?.current?.pm2_5, unit: 'µg/m³' },
    { key: 'pm10', label: 'PM10', value: data?.current?.pm10, unit: 'µg/m³' },
    { key: 'no2', label: 'NO₂', value: data?.current?.no2, unit: 'µg/m³' },
    { key: 'so2', label: 'SO₂', value: data?.current?.so2, unit: 'µg/m³' },
    { key: 'o3', label: 'O₃', value: data?.current?.o3, unit: 'µg/m³' },
    { key: 'co', label: 'CO', value: data?.current?.co, unit: 'µg/m³' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Delhi Air Quality</Text>
        <Text style={styles.subtitle}>Real-time pollution monitoring</Text>
        {fromCache && (
          <View style={styles.cacheBadge}>
            <Text style={styles.cacheText}>📱 Offline (cached data)</Text>
          </View>
        )}
      </View>

      <View style={styles.grid}>
        {pollutants.map((p) => (
          <View key={p.key} style={styles.card}>
            <Text style={styles.cardLabel}>{p.label}</Text>
            <Text style={styles.cardValue}>
              {p.value != null ? p.value.toFixed(1) : '--'}
            </Text>
            <Text style={styles.cardUnit}>{p.unit}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryText: {
    color: '#6366f1',
    fontSize: 14,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  cacheBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 12,
  },
  cacheText: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginVertical: 4,
  },
  cardUnit: {
    fontSize: 12,
    color: '#64748b',
  },
});
