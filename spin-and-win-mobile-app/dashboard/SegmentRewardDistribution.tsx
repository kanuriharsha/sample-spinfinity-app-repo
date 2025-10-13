import React from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, ChartPalette } from '@/constants/theme';

const isWeb = Platform.OS === 'web';
const R: any = isWeb ? require('recharts') : null;

export default function SegmentRewardDistribution({ byResult }: { result: string; count: number }[] | { byResult: { result: string; count: number }[] } | any) {
  const scheme = useColorScheme() ?? 'light';
  const palette = ChartPalette[scheme];
  // + themed chart tokens (web)
  const axisColor = scheme === 'dark' ? 'rgba(226,232,240,0.9)' : '#0F172A';
  const gridColor = scheme === 'dark' ? 'rgba(148,163,184,0.25)' : 'rgba(15,23,42,0.08)';
  const legendColor = axisColor;
  const tooltipBg = scheme === 'dark' ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = scheme === 'dark' ? 'rgba(148,163,184,0.35)' : 'rgba(0,0,0,0.1)';

  // Normalize props shape if needed
  const data: { result: string; count: number }[] = Array.isArray(byResult) ? byResult : (byResult?.byResult ?? []);
  const total = Math.max(1, data.reduce((a, b) => a + (b.count || 0), 0));
  const maxCount = Math.max(1, ...data.map((d) => d.count || 0));

  // Shares (%)
  const share = data.map((d, i) => ({
    ...d,
    pct: Math.round(((d.count || 0) / total) * 100),
    color: palette[i % palette.length],
  }));

  // "Big Wins" = 50% OFF / 100% OFF
  const is50 = (s: string) => /50\s*%/i.test(s) && /off/i.test(s);
  const is100 = (s: string) => /100\s*%/i.test(s) && /off/i.test(s);
  const big50 = data.filter((d) => is50(String(d.result || ''))).reduce((a, b) => a + (b.count || 0), 0);
  const big100 = data.filter((d) => is100(String(d.result || ''))).reduce((a, b) => a + (b.count || 0), 0);

  if (isWeb) {
    // Web: Pie (share %) + Bar (counts) + Big Wins panel
    return (
      <View style={styles.webRow}>
        {/* Pie: Reward Share (%) */}
        <View style={styles.webCard}>
          <ThemedText style={styles.sectionTitle}>Reward Share (%)</ThemedText>
          <R.ResponsiveContainer width="100%" height={240}>
            <R.PieChart>
              <R.Pie
                data={share}
                dataKey="count"
                nameKey="result"
                outerRadius={90}
                innerRadius={50}
                isAnimationActive
                label={false}
                labelLine={{ stroke: gridColor }}>
                {share.map((s, i) => <R.Cell key={i} fill={s.color} />)}
              </R.Pie>
              <R.Tooltip
                formatter={(value: number, _name: string, item: any) => {
                  const pct = Math.round(((value || 0) / total) * 100);
                  return [`${value} (${pct}%)`, item?.payload?.result || 'N/A'];
                }}
                contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                labelStyle={{ color: axisColor, fontWeight: 700 }}
                itemStyle={{ color: axisColor, fontWeight: 700 }}
              />
              <R.Legend wrapperStyle={{ color: legendColor }} />
            </R.PieChart>
          </R.ResponsiveContainer>
        </View>

        {/* Bar: Reward Counts */}
        <View style={styles.webCard}>
          <ThemedText style={styles.sectionTitle}>Reward Counts</ThemedText>
          <R.ResponsiveContainer width="100%" height={240}>
            <R.BarChart data={data}>
              <R.CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <R.XAxis
                dataKey="result"
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 12 }}
                interval={0}
                angle={-30}
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
              <R.Bar dataKey="count">
                {data.map((_, i: number) => <R.Cell key={i} fill={palette[i % palette.length]} />)}
              </R.Bar>
            </R.BarChart>
          </R.ResponsiveContainer>
        </View>

        {/* Big Wins */}
        <View style={[styles.webCard, styles.bigWinsCard]}>
          <ThemedText style={styles.sectionTitle}>Big Wins</ThemedText>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: '#34D399' }]}>
              <ThemedText style={styles.badgeText}>50% OFF</ThemedText>
              <ThemedText style={styles.badgeValue}>{big50}</ThemedText>
            </View>
            <View style={[styles.badge, { backgroundColor: '#F59E0B' }]}>
              <ThemedText style={styles.badgeText}>100% OFF</ThemedText>
              <ThemedText style={styles.badgeValue}>{big100}</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.bigWinsHint}>
            Total: {big50 + big100} ({Math.round(((big50 + big100) / total) * 100)}%)
          </ThemedText>
        </View>
      </View>
    );
  }

  // Native: horizontally scrollable cards for Share, Counts, Big Wins
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nativeScroll}>
      {/* Share card */}
      <View style={styles.card}>
        <ThemedText style={styles.sectionTitle}>Share (%)</ThemedText>
        <View style={{ gap: 8 }}>
          {share.map((s, i) => (
            <View key={i} style={styles.row}>
              <View style={[styles.swatch, { backgroundColor: s.color }]} />
              <ThemedText style={styles.cellLabel} numberOfLines={1}>{s.result || 'N/A'}</ThemedText>
              <ThemedText style={[styles.cellValue, { color: Colors[scheme].success }]}>{s.pct}%</ThemedText>
            </View>
          ))}
        </View>
      </View>

      {/* Counts card */}
      <View style={styles.card}>
        <ThemedText style={styles.sectionTitle}>Counts</ThemedText>
        <View style={{ gap: 10 }}>
          {data.map((d, i) => {
            const w = Math.max(8, Math.round(((d.count || 0) / maxCount) * 100));
            return (
              <View key={i}>
                <View style={styles.countHeader}>
                  <ThemedText style={styles.countLabel} numberOfLines={1}>{d.result || 'N/A'}</ThemedText>
                  <ThemedText style={styles.countValue}>{d.count}</ThemedText>
                </View>
                <View style={styles.progressWrap}>
                  <View style={[styles.progressFill, { width: `${w}%`, backgroundColor: palette[i % palette.length] }]} />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Big Wins card */}
      <View style={styles.card}>
        <ThemedText style={styles.sectionTitle}>Big Wins</ThemedText>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: '#34D399' }]}>
            <ThemedText style={styles.badgeText}>50% OFF</ThemedText>
            <ThemedText style={styles.badgeValue}>{big50}</ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: '#F59E0B' }]}>
            <ThemedText style={styles.badgeText}>100% OFF</ThemedText>
            <ThemedText style={styles.badgeValue}>{big100}</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.bigWinsHint}>
          Total: {big50 + big100} ({Math.round(((big50 + big100) / total) * 100)}%)
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Web layout
  webRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  webCard: { flexGrow: 1, minWidth: 260, padding: 12, borderRadius: 12, backgroundColor: '#0F172A' },
  bigWinsCard: { justifyContent: 'center' },

  // Shared
  sectionTitle: { fontWeight: '800', marginBottom: 8 },

  // Native horizontal cards
  nativeScroll: { gap: 12, paddingRight: 4 },
  card: { minWidth: 280, maxWidth: 340, padding: 12, borderRadius: 12, backgroundColor: '#0F172A' },

  // Simple rows
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  swatch: { width: 14, height: 14, borderRadius: 3 },
  cellLabel: { flex: 1, fontWeight: '600' },
  cellValue: { width: 64, textAlign: 'right', fontWeight: '800' },

  // Counts list with progress
  countHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countLabel: { flex: 1, fontWeight: '700', marginRight: 8 },
  countValue: { fontWeight: '900' },
  progressWrap: { height: 8, borderRadius: 999, backgroundColor: 'rgba(148,163,184,0.25)', overflow: 'hidden', marginTop: 6 },
  progressFill: { height: '100%' },

  // Big wins badges
  badgeRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  badge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minWidth: 120, alignItems: 'center' },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  badgeValue: { color: '#fff', fontWeight: '900', fontSize: 18, marginTop: 4 },
  bigWinsHint: { marginTop: 8, color: '#94A3B8', fontWeight: '700' },
});
