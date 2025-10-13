import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChartPalette, Colors } from '@/constants/theme';

const isWeb = Platform.OS === 'web';
const R: any = isWeb ? require('recharts') : null;

export default function SegmentGrowthComparisons(props: {
  daily: { day: string; spins: number; sales: number; discount?: number; income: number }[];
  weekly?: { week: string; spins: number; sales: number; discount?: number; income: number }[];
  monthly?: { month: string; spins: number; sales: number; discount?: number; income: number }[];
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = ChartPalette[scheme];

  // Theme tokens for web charts
  const axisColor = scheme === 'dark' ? 'rgba(226,232,240,0.9)' : '#0F172A';
  const gridColor = scheme === 'dark' ? 'rgba(148,163,184,0.25)' : 'rgba(15,23,42,0.08)';
  const legendColor = axisColor;
  const tooltipBg = scheme === 'dark' ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = scheme === 'dark' ? 'rgba(148,163,184,0.35)' : 'rgba(0,0,0,0.1)';

  const [gran, setGran] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Helpers
  const pctGrowthSeries = (values: number[]) =>
    values.map((v, i, a) => (i === 0 ? 0 : Math.round(((v - a[i - 1]) / Math.max(1, a[i - 1])) * 100)));

  const dailyLabels = props.daily.map((d) => d.day.slice(5));
  const dailySales = props.daily.map((d) => d.sales || 0);
  const weeklyArr = props.weekly || [];
  const monthlyArr = props.monthly || [];

  const weeklyLabels = weeklyArr.map((w) => w.week);
  const weeklySales = weeklyArr.map((w) => w.sales || 0);

  const monthlyLabels = monthlyArr.map((m) => fmtMonth(m.month));
  const monthlySales = monthlyArr.map((m) => m.sales || 0);

  const growthData = useMemo(() => {
    if (gran === 'daily') {
      const g = pctGrowthSeries(dailySales);
      return dailyLabels.map((l, i) => ({ label: l, growth: g[i] }));
    }
    if (gran === 'weekly') {
      const g = pctGrowthSeries(weeklySales);
      return weeklyLabels.map((l, i) => ({ label: l, growth: g[i] }));
    }
    const g = pctGrowthSeries(monthlySales);
    return monthlyLabels.map((l, i) => ({ label: l, growth: g[i] }));
  }, [gran, dailyLabels, dailySales, weeklyLabels, weeklySales, monthlyLabels, monthlySales]);

  // ROI Trend (Month-over-Month) = (Profit ÷ Cost of Rewards) × 100
  const roiMonthly = useMemo(() => {
    return monthlyArr.map((m) => {
      const disc = Math.max(0, m.discount || 0);
      const income = Math.max(0, m.income ?? Math.max(0, (m.sales || 0) - disc));
      const roi = disc > 0 ? Math.round((income / disc) * 100) : 0;
      return { label: fmtMonth(m.month), roi };
    });
  }, [monthlyArr]);

  // Incremental Sales (Spin vs Non-Spin Customers)
  // Note: Non-spin sales are not available in the current dataset; display 0 with a hint.
  const incrSpin = monthlySales.reduce((a, v) => a + v, 0);
  const incrNonSpin = 0;
  const incrementalData = [
    { type: 'Spin Customers', value: incrSpin, color: Colors[scheme].info },
    { type: 'Non-Spin Customers', value: incrNonSpin, color: Colors[scheme].warning },
  ];

  return (
    <View style={{ gap: 12 }}>
      {/* Sales Growth (%) with granularity toggle */}
      <View style={styles.kpiRow}>
        {(['daily', 'weekly', 'monthly'] as const).map((g) => {
          const active = gran === g;
          return (
            <TouchableOpacity
              key={g}
              onPress={() => setGran(g)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <ThemedText style={[styles.chipText, active && styles.chipTextActive]}>
                {g[0].toUpperCase() + g.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      {isWeb ? (
        <View style={{ gap: 12 }}>
          {/* Line: Sales Growth (%) */}
          <View style={styles.webCard}>
            <ThemedText style={styles.title}>Sales Growth (%)</ThemedText>
            <R.ResponsiveContainer width="100%" height={220}>
              <R.LineChart data={growthData}>
                <R.CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <R.XAxis dataKey="label" stroke={axisColor} tick={{ fill: axisColor }} />
                <R.YAxis stroke={axisColor} tick={{ fill: axisColor }} />
                <R.Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                  labelStyle={{ color: axisColor, fontWeight: 700 }}
                  itemStyle={{ color: axisColor, fontWeight: 700 }}
                />
                <R.Legend wrapperStyle={{ color: legendColor }} />
                <R.Line type="monotone" name={`${gran} growth`} dataKey="growth" stroke={palette[0]} dot />
              </R.LineChart>
            </R.ResponsiveContainer>
            <ThemedText style={styles.formula}>
              Sales Growth (%) = ((Current − Previous) ÷ Previous) × 100
            </ThemedText>
          </View>

          {/* Line: ROI Trend (MoM) */}
          
          {/* Bar: Incremental Sales */}
          <View style={styles.webCard}>
            <ThemedText style={styles.title}>Incremental Sales</ThemedText>
            <R.ResponsiveContainer width="100%" height={220}>
              <R.BarChart data={incrementalData}>
                <R.CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <R.XAxis dataKey="type" stroke={axisColor} tick={{ fill: axisColor }} />
                <R.YAxis stroke={axisColor} tick={{ fill: axisColor }} />
                <R.Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                  labelStyle={{ color: axisColor, fontWeight: 700 }}
                  itemStyle={{ color: axisColor, fontWeight: 700 }}
                />
                <R.Bar dataKey="value">
                  {incrementalData.map((d, i) => <R.Cell key={i} fill={d.color} />)}
                </R.Bar>
              </R.BarChart>
            </R.ResponsiveContainer>
            <ThemedText style={styles.hint}>Non-spin sales not provided; shown as 0.</ThemedText>
            <ThemedText style={styles.formula}>Incremental = Spin − Non-Spin</ThemedText>
          </View>
        </View>
      ) : (
        // Native fallback: compact lists
        <View style={{ gap: 10 }}>
          <View style={styles.card}>
            <ThemedText style={styles.title}>Sales Growth ({gran})</ThemedText>
            <View style={{ gap: 6 }}>
              {growthData.slice(-8).map((d, i) => (
                <View key={i} style={styles.row}>
                  <ThemedText style={styles.cellLabel}>{d.label}</ThemedText>
                  <ThemedText style={[styles.cellVal, { color: d.growth >= 0 ? Colors[scheme].success : Colors[scheme].danger }]}>
                    {d.growth}%
                  </ThemedText>
                </View>
              ))}
            </View>
            <ThemedText style={styles.formula}>
              Formula: ((Current − Previous) ÷ Previous) × 100
            </ThemedText>
          </View>

          

          
        </View>
      )}
    </View>
  );
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split('-').map((v) => parseInt(v, 10));
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
  return `${MONTHS[(m - 1 + 12) % 12]} ${String(y).slice(-2)}`;
}

const styles = StyleSheet.create({
  // Chips
  kpiRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  chipActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  chipTextActive: { color: '#fff' },

  // Web cards
  webCard: { flexGrow: 1, minWidth: 280, padding: 12, borderRadius: 12, backgroundColor: '#0F172A' },
  title: { fontWeight: '800', marginBottom: 8 },

  // Native cards/list rows
  card: { backgroundColor: '#0F172A', borderRadius: 12, padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0B1626', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  cellLabel: { fontWeight: '800', color: '#E2E8F0' },
  cellVal: { fontWeight: '900' },
  hint: { marginTop: 8, color: '#94A3B8', fontWeight: '700' },
  formula: { marginTop: 6, fontSize: 11, color: '#94A3B8' },
});
