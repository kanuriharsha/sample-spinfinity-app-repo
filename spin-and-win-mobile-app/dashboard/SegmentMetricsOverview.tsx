import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function SegmentMetricsOverview(props: {
  total: number;
  uniqueVisitors: number;
  returningVisitors: number;
  avgSpend: number;
  totalSpend: number;
  dwellAvg: number;
}) {
  const { total, uniqueVisitors, returningVisitors, avgSpend, totalSpend, dwellAvg } = props;
  const scheme = useColorScheme() ?? 'light';
  const returningRate = uniqueVisitors > 0 ? Math.round((returningVisitors / uniqueVisitors) * 100) : 0;
  const avgSpinsPerCustomer = uniqueVisitors > 0 ? (total / uniqueVisitors) : 0;

  const Card = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <View style={[styles.card, { backgroundColor: scheme === 'dark' ? '#0F172A' : '#FFFFFF' }]}>
      <ThemedText style={[styles.label]}>{label}</ThemedText>
      <ThemedText style={[styles.value, { color }]}>{value}</ThemedText>
    </View>
  );

  return (
    <View style={styles.row}>
      <Card label="Total Spins" value={`${total}`} color={Colors[scheme].info} />
      <Card label="Unique Customers" value={`${uniqueVisitors}`} color={Colors[scheme].tint} />
      <Card label="Returning Customers" value={`${returningVisitors}`} color={Colors[scheme].success} />
      <Card label="Returning Rate" value={`${returningRate}%`} color={Colors[scheme].success} />
      {/* <Card label="Avg Spins/Customer" value={avgSpinsPerCustomer.toFixed(2)} color="#A78BFA" /> */}
      <Card label="Avg Spend" value={`₹${Math.round(avgSpend)}`} color={Colors[scheme].info} />
      <Card label="Total Spend" value={`₹${Math.round(totalSpend)}`} color={Colors[scheme].success} />
      {/* <Card label="Avg Visit Time" value={`${Math.round(dwellAvg)}s`} color={Colors[scheme].warning} /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 2 },
  card: {
    flexBasis: '47%',
    minWidth: 140,
    minHeight: 84,
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.18)',
  },
  label: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  value: { fontSize: 22, fontWeight: '900', marginTop: 6 },
});
