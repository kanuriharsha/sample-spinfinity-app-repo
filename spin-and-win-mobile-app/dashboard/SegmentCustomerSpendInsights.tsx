import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, ChartPalette } from '@/constants/theme';

const isWeb = Platform.OS === 'web';
const R: any = isWeb ? require('recharts') : null;

export default function SegmentCustomerSpendInsights(props: { avgSpend: number; totalSpend: number; uniqueVisitors: number }) {
  const { avgSpend, totalSpend, uniqueVisitors } = props;
  const scheme = useColorScheme() ?? 'light';
  const palette = ChartPalette[scheme];

  // Themed chart tokens (web)
  const axisColor = scheme === 'dark' ? 'rgba(226,232,240,0.9)' : '#0F172A';
  const gridColor = scheme === 'dark' ? 'rgba(148,163,184,0.25)' : 'rgba(15,23,42,0.08)';
  const tooltipBg = scheme === 'dark' ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = scheme === 'dark' ? 'rgba(148,163,184,0.35)' : 'rgba(0,0,0,0.1)';

  // Avg Spend per Customer (ARPU)
  const arpu = uniqueVisitors ? totalSpend / Math.max(1, uniqueVisitors) : 0;

  // Spend Slab Distribution (estimated if raw amounts are not provided)
  // Heuristic: allocate distribution based on avgSpend
  const slabs = useMemo(() => {
    const customers = Math.max(0, uniqueVisitors || 0);
    let w = [0.8, 0.15, 0.05]; // default for <=300
    if (avgSpend > 300 && avgSpend <= 500) w = [0.3, 0.5, 0.2];
    if (avgSpend > 500) w = [0.1, 0.3, 0.6];
    const c0 = Math.round(customers * w[0]);
    const c1 = Math.round(customers * w[1]);
    let c2 = Math.max(0, customers - (c0 + c1));
    return [
      { slab: '0–300', count: c0, color: palette[0] },
      { slab: '301–500', count: c1, color: palette[1] },
      { slab: '501–1000', count: c2, color: palette[2] },
    ];
  }, [avgSpend, uniqueVisitors, palette]);

  // Incremental Sales (Spin vs Non-Spin): Non-Spin not available -> 0 with hint
  const incremental = [
    { type: 'Spin', value: totalSpend, color: Colors[scheme].info },
    { type: 'Non-Spin', value: 0, color: Colors[scheme].warning },
  ];

  // Native helpers
  const maxSlab = Math.max(1, ...slabs.map((s) => s.count));
  const maxIncr = Math.max(1, ...incremental.map((s) => s.value));

  return (
    <View style={styles.stack}>
      {/* KPI: Average Spend per Customer */}
      <View style={[styles.kpiCard, { backgroundColor: scheme === 'dark' ? '#0F172A' : '#FFFFFF' }]}>
        <ThemedText style={styles.kpiLabel}>Avg Spend / Customer</ThemedText>
        <ThemedText style={[styles.kpiValue, { color: Colors[scheme].accent }]}>₹{arpu.toFixed(2)}</ThemedText>
        <ThemedText style={styles.formula}>Average Spend per Customer = Total Sales ÷ Total Customers</ThemedText>
      </View>

      {/* Spend Slab Distribution */}
      {isWeb ? (
        <View style={styles.webCard}>
          <ThemedText style={styles.title}>Spend Slab Distribution</ThemedText>
          <R.ResponsiveContainer width="100%" height={220}>
            <R.BarChart layout="vertical" data={slabs} margin={{ left: 12, right: 12 }}>
              <R.CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <R.XAxis type="number" stroke={axisColor} tick={{ fill: axisColor }} allowDecimals={false} />
              <R.YAxis type="category" dataKey="slab" stroke={axisColor} tick={{ fill: axisColor }} width={90} />
              <R.Tooltip
                contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                labelStyle={{ color: axisColor, fontWeight: 700 }}
                itemStyle={{ color: axisColor, fontWeight: 700 }}
                formatter={(v: number) => [v, 'Customers']}
              />
              <R.Bar dataKey="count" name="Customers">
                {slabs.map((s, i) => <R.Cell key={i} fill={s.color} />)}
              </R.Bar>
            </R.BarChart>
          </R.ResponsiveContainer>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: '#0F172A' }]}>
          <ThemedText style={styles.title}>Spend Slab Distribution</ThemedText>
          <View style={{ gap: 8 }}>
            {slabs.map((s, i) => {
              const w = Math.round((s.count / maxSlab) * 100);
              return (
                <View key={i}>
                  <View style={styles.row}>
                    <ThemedText style={styles.rowLabel}>{s.slab}</ThemedText>
                    <ThemedText style={styles.rowVal}>{s.count}</ThemedText>
                  </View>
                  <View style={styles.progressWrap}>
                    <View style={[styles.progressFill, { width: `${w}%`, backgroundColor: s.color }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Incremental Sales: Spin vs Non-Spin */}
      
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },

  // KPI
  kpiCard: { borderRadius: 12, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(148,163,184,0.18)' },
  kpiLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  kpiValue: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  formula: { marginTop: 6, fontSize: 11, color: '#94A3B8' },

  // Cards
  webCard: { flexGrow: 1, minWidth: 280, padding: 12, borderRadius: 12, backgroundColor: '#0F172A' },
  card: { padding: 12, borderRadius: 12 },
  title: { fontWeight: '800', marginBottom: 8 },
  hint: { marginTop: 8, color: '#94A3B8', fontWeight: '700' },

  // Rows / progress
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontWeight: '800', color: '#E2E8F0' },
  rowVal: { fontWeight: '900', color: '#22D3EE' },
  progressWrap: { height: 8, borderRadius: 999, backgroundColor: 'rgba(148,163,184,0.25)', overflow: 'hidden', marginTop: 6 },
  progressFill: { height: '100%' },
});
