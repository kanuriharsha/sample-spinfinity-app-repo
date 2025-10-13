import React, { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChartPalette, Colors } from '@/constants/theme'; // + Colors

const isWeb = Platform.OS === 'web';
const R: any = isWeb ? require('recharts') : null;

type Row = { label: string; spins: number; sales: number; disc: number; income: number };
export default function SegmentFinancialOverview(props: {
  daily: { day: string; spins: number; sales: number; discount?: number; income: number }[];
  weekly: { week: string; spins: number; sales: number; discount?: number; income: number }[];
  monthly: { month: string; spins: number; sales: number; discount?: number; income: number }[];
  uniqueVisitors?: number; // + incoming customers for Net Gain per Customer
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = ChartPalette[scheme];
  const [tab, setTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const rows: Row[] = useMemo(() => {
    if (tab === 'daily') return props.daily.map((r) => ({ label: fmtDay(r.day), spins: r.spins, sales: r.sales, disc: r.discount || 0, income: r.income }));
    if (tab === 'weekly') return props.weekly.map((r) => ({ label: r.week, spins: r.spins, sales: r.sales, disc: r.discount || 0, income: r.income }));
    return props.monthly.map((r) => ({ label: fmtMonth(r.month), spins: r.spins, sales: r.sales, disc: r.discount || 0, income: r.income }));
  }, [tab, props.daily, props.weekly, props.monthly]);

  const exportCSV = () => {
    const header = ['Period', 'Spins', 'Sales', 'Discount', 'Income'];
    const lines = [header, ...rows.map((r) => [r.label, r.spins, r.sales, r.disc, r.income])].map((l) => l.join(',')).join('\n');
    if (isWeb) {
      const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `financial-${tab}.csv`; a.click();
      URL.revokeObjectURL(url);
    } else {
      Alert.alert('Export', 'CSV export is available on web.');
    }
  };

  // + Theme tokens for web charts
  const axisColor = scheme === 'dark' ? 'rgba(226,232,240,0.9)' : '#0F172A';
  const gridColor = scheme === 'dark' ? 'rgba(148,163,184,0.25)' : 'rgba(15,23,42,0.08)';
  const legendColor = axisColor;
  const tooltipBg = scheme === 'dark' ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = scheme === 'dark' ? 'rgba(148,163,184,0.35)' : 'rgba(0,0,0,0.1)';

  // + Totals and KPIs
  const totals = rows.reduce(
    (a, r) => {
      a.sales += r.sales || 0;
      a.disc += r.disc || 0;
      a.income += (r.income ?? Math.max(0, (r.sales || 0) - (r.disc || 0)));
      return a;
    },
    { sales: 0, disc: 0, income: 0 }
  );
  const ratioPct = totals.sales ? Math.round((totals.disc / totals.sales) * 100) : 0;
  const netGainPerCustomer = props.uniqueVisitors ? totals.income / Math.max(1, props.uniqueVisitors) : 0;

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.tabs}>
        {(['daily', 'weekly', 'monthly'] as const).map((t) => {
          const active = tab === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.tab, active && styles.activeTab]}
            >
              <ThemedText style={[styles.tabText, active && styles.activeTabText]}>{t[0].toUpperCase() + t.slice(1)}</ThemedText>
            </TouchableOpacity>
          );
        })}
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={exportCSV} style={styles.exportBtn}>
          <ThemedText style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Export</ThemedText>
        </TouchableOpacity>
      </View>

      {/* KPI cards */}
      <View style={styles.kpiRow}>
        <Kpi label="Actual Income" value={`₹${Math.round(totals.income)}`} color={Colors[scheme].success} />
        <Kpi label="Net Gain / Customer" value={props.uniqueVisitors ? `₹${netGainPerCustomer.toFixed(2)}` : '—'} color="#A78BFA" />
      </View>

      {isWeb ? (
        <View style={styles.webRow}>
          {/* Stacked Bars: Sales vs Rewards */}
          <View style={styles.webCard}>
            <ThemedText style={styles.sectionTitle}>Sales vs Rewards</ThemedText>
            <R.ResponsiveContainer width="100%" height={260}>
              <R.BarChart data={rows}>
                <R.CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <R.XAxis
                  dataKey="label"
                  stroke={axisColor}
                  tick={{ fill: axisColor, fontSize: 12 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <R.YAxis allowDecimals={false} stroke={axisColor} tick={{ fill: axisColor }} />
                <R.Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                  labelStyle={{ color: axisColor, fontWeight: 700 }}
                  itemStyle={{ color: axisColor, fontWeight: 700 }}
                />
                <R.Legend wrapperStyle={{ color: legendColor }} />
                <R.Bar dataKey="sales" name="Sales" stackId="v" fill={Colors[scheme].info} />
                <R.Bar dataKey="disc" name="Rewards" stackId="v" fill={Colors[scheme].warning} />
              </R.BarChart>
            </R.ResponsiveContainer>
            <ThemedText style={styles.formula}>Rewards = Discount; Sales stacked with Reward Cost</ThemedText>
          </View>

          {/* Donut: Discount-to-Sales Ratio */}
          <View style={styles.webCard}>
            <ThemedText style={styles.sectionTitle}>Discount-to-Sales Ratio</ThemedText>
            <R.ResponsiveContainer width="100%" height={260}>
              <R.PieChart>
                <R.Pie
                  data={[
                    { name: 'Discounts', value: totals.disc },
                    { name: 'Sales (net of disc)', value: Math.max(0, totals.sales - totals.disc) },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive
                  label={false}
                >
                  <R.Cell fill={Colors[scheme].warning} />
                  <R.Cell fill="rgba(148,163,184,0.35)" />
                </R.Pie>
                <R.Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                  labelStyle={{ color: axisColor, fontWeight: 700 }}
                  itemStyle={{ color: axisColor, fontWeight: 700 }}
                />
                <R.Legend wrapperStyle={{ color: legendColor }} />
              </R.PieChart>
            </R.ResponsiveContainer>
            <ThemedText style={styles.centerHint}>Ratio: {ratioPct}%</ThemedText>
            <ThemedText style={styles.formula}>
              Discount-to-Sales Ratio (%) = (Total Discounts ÷ Total Sales) × 100
            </ThemedText>
          </View>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {/* Ratio card with progress */}
          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Discount-to-Sales Ratio</ThemedText>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${ratioPct}%`, backgroundColor: Colors[scheme].warning }]} />
            </View>
            <ThemedText style={styles.hintText}>{ratioPct}% of Sales are rewards</ThemedText>
            <ThemedText style={styles.formula}>
              Formula: (Total Discounts ÷ Total Sales) × 100
            </ThemedText>
          </View>

          {/* Compact stacked bar rows */}
          <View style={{ gap: 8 }}>
            {rows.slice(-8).map((r, i) => {
              const total = Math.max(1, r.sales + r.disc);
              const wSales = Math.round((r.sales / total) * 100);
              const wDisc = 100 - wSales;
              return (
                <View key={i} style={styles.compactRow}>
                  <ThemedText style={[styles.compactLabel]}>{r.label}</ThemedText>
                  <View style={styles.stackedTrack}>
                    <View style={[styles.stackedSales, { width: `${wSales}%`, backgroundColor: Colors[scheme].info }]} />
                    <View style={[styles.stackedDisc, { width: `${wDisc}%`, backgroundColor: Colors[scheme].warning }]} />
                  </View>
                  <ThemedText style={styles.compactVal}>₹{Math.round(r.sales)}</ThemedText>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.kpi}>
      <ThemedText style={styles.kpiLabel}>{label}</ThemedText>
      <ThemedText style={[styles.kpiValue, { color }]}>{value}</ThemedText>
    </View>
  );
}

function fmtDay(iso: string) {
  const [y, m, d] = iso.split('-').map((v) => parseInt(v, 10));
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
  return `${String(d).padStart(2,'0')} ${MONTHS[(m - 1 + 12) % 12]}`;
}
function fmtMonth(ym: string) {
  const [y, m] = ym.split('-').map((v) => parseInt(v, 10));
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
  return `${MONTHS[(m - 1 + 12) % 12]} ${y}`;
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  activeTab: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabText: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 12 },
  activeTabText: { color: '#fff' },
  exportBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: '#0EA5E9' },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0B1626', borderRadius: 12, padding: 12 },
  cell: { fontWeight: '700' },
  left: { width: 100 },

  kpiRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  kpi: { flexGrow: 1, minWidth: 160, backgroundColor: '#0F172A', borderRadius: 12, padding: 12 },
  kpiLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  kpiValue: { fontSize: 22, fontWeight: '900', marginTop: 4 },

  webRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  webCard: { flexGrow: 1, minWidth: 280, padding: 12, borderRadius: 12, backgroundColor: '#0F172A' },
  sectionTitle: { fontWeight: '800', marginBottom: 8 },
  centerHint: { marginTop: 8, color: '#94A3B8', fontWeight: '700' },
  formula: { marginTop: 6, fontSize: 11, color: '#94A3B8' },

  // Native cards and tracks
  card: { padding: 12, borderRadius: 12, backgroundColor: '#0F172A' },
  track: { height: 10, borderRadius: 999, backgroundColor: 'rgba(148,163,184,0.25)', overflow: 'hidden' },
  trackFill: { height: '100%' },
  hintText: { marginTop: 8, color: '#94A3B8', fontWeight: '700' },

  compactRow: { backgroundColor: '#0B1626', borderRadius: 10, padding: 10, gap: 8 },
  compactLabel: { fontWeight: '800', color: '#E2E8F0' },
  stackedTrack: { height: 8, borderRadius: 999, overflow: 'hidden', flexDirection: 'row', backgroundColor: 'rgba(148,163,184,0.25)' },
  stackedSales: { height: '100%' },
  stackedDisc: { height: '100%' },
  compactVal: { fontWeight: '800', color: '#22D3EE' },
});
