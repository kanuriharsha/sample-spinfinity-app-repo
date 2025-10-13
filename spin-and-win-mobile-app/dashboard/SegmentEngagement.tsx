import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, View, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChartPalette, Colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient'; // added

const isWeb = Platform.OS === 'web';
const R: any = isWeb ? require('recharts') : null;

export default function SegmentEngagement(props: {
  byHour: { hour: number; count: number }[];
  dayOfWeek: { dow: number; count: number }[];
  devices: { device: string; count: number }[];
  total: number; // total spins
  uniqueVisitors: number; // total customers
  returningVisitors: number; // returning customers
  onRefresh?: () => void; // added
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = ChartPalette[scheme];
  // + themed chart tokens (web)
  const axisColor = scheme === 'dark' ? 'rgba(226,232,240,0.9)' : '#0F172A';
  const gridColor = scheme === 'dark' ? 'rgba(148,163,184,0.25)' : 'rgba(15,23,42,0.08)';
  const legendColor = axisColor;
  const tooltipBg = scheme === 'dark' ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = scheme === 'dark' ? 'rgba(148,163,184,0.35)' : 'rgba(0,0,0,0.1)';

  const hours = useMemo(() => ensure24Hours(props.byHour), [props.byHour]);
  const dow = useMemo(
    () => props.dayOfWeek.map((d) => ({ ...d, label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][(d.dow - 1 + 7) % 7] })),
    [props.dayOfWeek]
  );

  // Native-only segmented toggle to reduce clutter
  const [nativeTab, setNativeTab] = useState<'hours' | 'dow' | 'devices'>('hours');

  // KPIs: Returning customer rate and average spins per customer
  const totalCustomers = Math.max(0, props.uniqueVisitors || 0);
  const totSpins = Math.max(0, props.total || 0);
  const ret = Math.max(0, props.returningVisitors || 0);
  const returningRate = totalCustomers ? Math.round((ret / totalCustomers) * 100) : 0;
  const avgSpinsPerCustomer = totalCustomers ? totSpins / totalCustomers : 0;

  return (
    <View style={{ gap: 14 }}>
      {/* Web: show all sections with tooltips. Native: show segmented tabs */}
      {!isWeb && (
        <View style={styles.tabs}>
          {(['hours', 'dow', 'devices'] as const).map((t) => {
            const active = nativeTab === t;
            return (
              <TouchableOpacity key={t} onPress={() => setNativeTab(t)} style={[styles.tab, active && styles.activeTab]}>
                <ThemedText style={[styles.tabText, active && styles.activeTabText]}>
                  {t === 'hours' ? 'Hours' : t === 'dow' ? 'Day' : 'Devices'}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Peak Hours */}
      {(isWeb || nativeTab === 'hours') && (
        <>
          <View style={styles.titleRow}>
            <ThemedText style={styles.title}>Peak Hours</ThemedText>
            {!!props.onRefresh && (
              <TouchableOpacity onPress={props.onRefresh} style={[styles.refreshBtn, { backgroundColor: Colors[scheme].accent }]}>
                <ThemedText style={styles.refreshText}>Refresh</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          

          {/* KPIs under the chart */}
          <View style={[styles.kpiRow, isWeb ? styles.kpiRowWeb : styles.kpiRowNative]}>
            <View style={styles.kpi}>
              <ThemedText style={styles.kpiLabel}>Returning Customer Rate</ThemedText>
              <ThemedText style={[styles.kpiValue, { color: Colors[scheme].success }]}>{returningRate}%</ThemedText>
            </View>
            
          </View>
        </>
      )}

      {/* Day of Week */}
      {(isWeb || nativeTab === 'dow') && (
        <>
          <ThemedText style={styles.title}>Day of Week</ThemedText>
          {isWeb ? (
            <R.ResponsiveContainer width="100%" height={200}>
              <R.AreaChart data={dow}>
                <R.CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <R.XAxis dataKey="label" stroke={axisColor} tick={{ fill: axisColor }} />
                <R.YAxis allowDecimals={false} stroke={axisColor} tick={{ fill: axisColor }} />
                <R.Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                  labelStyle={{ color: axisColor, fontWeight: 700 }}
                  itemStyle={{ color: axisColor, fontWeight: 700 }}
                />
                <R.Legend wrapperStyle={{ color: legendColor }} />
                <R.Area type="monotone" dataKey="count" stroke={palette[0]} fill={palette[0]} fillOpacity={0.2} />
              </R.AreaChart>
            </R.ResponsiveContainer>
          ) : (
            <BarTrack
              items={dow.map((d) => ({ key: d.label, label: d.label, value: d.count }))}
              barColor={Colors[scheme].success}
              maxHeight={140}
              barMinWidth={48}
              tickEvery={1}
              ariaLabel="Spins by day of week"
            />
          )}
        </>
      )}

      {/* Devices */}
      {(isWeb || nativeTab === 'devices') && (
        <>
          <ThemedText style={styles.title}>Devices</ThemedText>
          {isWeb ? (
            <R.ResponsiveContainer width="100%" height={200}>
              <R.PieChart>
                <R.Pie data={props.devices} dataKey="count" nameKey="device" outerRadius={70} innerRadius={40} isAnimationActive>
                  {props.devices.map((_, i: number) => <R.Cell key={i} fill={palette[i % palette.length]} />)}
                </R.Pie>
                <R.Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                  labelStyle={{ color: axisColor, fontWeight: 700 }}
                  itemStyle={{ color: axisColor, fontWeight: 700 }}
                />
                <R.Legend wrapperStyle={{ color: legendColor }} />
              </R.PieChart>
            </R.ResponsiveContainer>
          ) : (
            <DeviceList devices={props.devices} />
          )}
        </>
      )}
    </View>
  );
}

function ensure24Hours(items: { hour: number; count: number }[]) {
  const map = new Map<number, number>(items.map((i) => [i.hour, i.count]));
  return Array.from({ length: 24 }, (_, h) => ({ hour: h, count: map.get(h) || 0 }));
}

/**
 * Native bar track with:
 * - horizontal scroll for crowded data (e.g., 24 hours)
 * - press to show a value tag over the bar
 * - fewer tick labels using `tickEvery`
 */
function BarTrack({
  items,
  barColor,
  maxHeight,
  barMinWidth,
  tickEvery = 1,
  ariaLabel,
}: {
  items: { key: string; label: string; value: number }[];
  barColor: string;
  maxHeight: number;
  barMinWidth: number;
  tickEvery?: number;
  ariaLabel?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const max = Math.max(1, ...items.map((i) => i.value));

  const content = (
    <View style={styles.trackRow} accessibilityLabel={ariaLabel}>
      {items.map((i, idx) => {
        const h = Math.max(10, Math.round((i.value / max) * maxHeight));
        const active = selected === i.key;
        const showTick = idx % tickEvery === 0;
        return (
          <View key={i.key} style={[styles.barWrap, { minWidth: barMinWidth }]}>
            <Pressable
              onPress={() => setSelected((s) => (s === i.key ? null : i.key))}
              style={{ alignItems: 'center' }}
              accessibilityHint={`${i.label}, ${i.value} spins`}
            >
              {/* Tag */}
              {active && (
                <View style={styles.tag}>
                  <ThemedText style={styles.tagText}>{i.value}</ThemedText>
                </View>
              )}
              {/* Bar */}
              <View style={[styles.bar, { height: h, backgroundColor: barColor }]} />
              {/* Baseline label */}
              <ThemedText style={[styles.tickLabel, !showTick && styles.tickFaint]}>{showTick ? i.label : ' '}</ThemedText>
            </Pressable>
          </View>
        );
      })}
    </View>
  );

  // Scroll horizontally if many items
  return items.length > 12 ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackScroll}>
      {content}
    </ScrollView>
  ) : (
    content
  );
}

function DeviceList({ devices }: { devices: { device: string; count: number }[] }) {
  const total = Math.max(1, devices.reduce((a, b) => a + b.count, 0));
  return (
    <View style={{ gap: 10 }}>
      {devices.map((d, i) => {
        const pct = Math.round((d.count / total) * 100);
        return (
          <View key={i} style={styles.deviceRow}>
            <ThemedText style={{ fontWeight: '800' }}>{d.device}</ThemedText>
            <ThemedText style={{ fontWeight: '800' }}>{d.count} ({pct}%)</ThemedText>
          </View>
        );
      })}
      {/* Proportional bars */}
      <View style={{ gap: 8 }}>
        {devices.map((d, i) => {
          const pct = (d.count / total) * 100;
          return (
            <View key={`${d.device}-bar-${i}`} style={styles.progressWrap}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Titles
  title: { fontWeight: '800', marginTop: 4, marginBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, // added

  // Refresh
  refreshBtn: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 }, // added
  refreshText: { color: '#fff', fontWeight: '700', fontSize: 12 }, // added

  // Chart card
  chartCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  chartGrad: { flex: 1, borderRadius: 12 },

  // Native tabs
  tabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  activeTab: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabText: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 12 },
  activeTabText: { color: '#fff' },

  // Bars
  trackScroll: { paddingHorizontal: 4 },
  trackRow: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: 2 },
  barWrap: { alignItems: 'center', paddingHorizontal: 6 },
  bar: { width: '76%', minHeight: 10, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: '#60A5FA' },
  tickLabel: { fontSize: 10, color: '#94A3B8', marginTop: 6 },
  tickFaint: { color: 'transparent' },

  // Tag bubble
  tag: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#0EA5E9', borderRadius: 8, marginBottom: 6 },
  tagText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  // Devices
  deviceRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0B1626', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  progressWrap: { height: 8, borderRadius: 999, backgroundColor: 'rgba(148,163,184,0.25)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#22D3EE' },

  // Engagement KPIs
  kpiRow: { gap: 10, marginTop: 10 },
  kpiRowWeb: { flexDirection: 'row' },
  kpiRowNative: { flexDirection: 'column' },
  kpi: { flex: 1, backgroundColor: '#0F172A', borderRadius: 12, padding: 12 },
  kpiLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  kpiValue: { fontSize: 20, fontWeight: '900', marginTop: 4 },
});
