import React, { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

const isWeb = Platform.OS === 'web';

type Daily = { day: string; spins: number; sales: number; income: number; discount?: number; customers?: number };
type Weekly = { week: string; spins: number; sales: number; income: number; discount?: number; customers?: number };
type Monthly = { month: string; spins: number; sales: number; income: number; discount?: number; customers?: number };

export default function SegmentSummaryReports(props: {
  daily: Daily[];
  weekly: Weekly[];
  monthly: Monthly[];
  topReturning: { fullName: string; visits: number; lastVisit?: string }[];
}) {
  const scheme = useColorScheme() ?? 'light';
  const [open, setOpen] = useState({ daily: true, weekly: false, monthly: false });

  const makeRows = (rows: (Daily | Weekly | Monthly)[], getLabel: (r: any) => string) =>
    rows.map((r) => {
      const disc = Number(r.discount || 0);
      const roi = disc > 0 ? Math.round((Number(r.income || 0) / disc) * 100) : 0;
      return {
        label: getLabel(r),
        customers: Number((r as any).customers || 0),
        spins: Number(r.spins || 0),
        discount: disc,
        sales: Number(r.sales || 0),
        income: Number(r.income || 0),
        roi,
      };
    });

  const dailyRows = useMemo(() => makeRows(props.daily, (r) => r.day), [props.daily]);
  const weeklyRows = useMemo(() => makeRows(props.weekly, (r) => r.week), [props.weekly]);
  const monthlyRows = useMemo(() => makeRows(props.monthly, (r) => r.month), [props.monthly]);

  const exportCSV = () => {
    const header = ['Type', 'Period', 'Customers', 'Spins', 'Discount', 'Sales', 'ROI%', 'Income'];
    const lines = [
      header,
      ...dailyRows.map((r) => ['Daily', r.label, r.customers, r.spins, r.discount, r.sales, r.roi, r.income]),
      ...weeklyRows.map((r) => ['Weekly', r.label, r.customers, r.spins, r.discount, r.sales, r.roi, r.income]),
      ...monthlyRows.map((r) => ['Monthly', r.label, r.customers, r.spins, r.discount, r.sales, r.roi, r.income]),
    ]
      .map((l) => l.join(','))
      .join('\n');

    if (isWeb) {
      const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `summary-reports.csv`; a.click();
      URL.revokeObjectURL(url);
    } else {
      Alert.alert('Export', 'CSV export is available on web.');
    }
  };

  const exportPrint = () => {
    if (isWeb) {
      window.print();
    } else {
      Alert.alert('Export', 'Print to PDF is available on web.');
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Section
        title="Daily"
        open={open.daily}
        onToggle={() => setOpen((s) => ({ ...s, daily: !s.daily }))}
        rows={dailyRows}
        scheme={scheme}
      />
      <Section
        title="Weekly"
        open={open.weekly}
        onToggle={() => setOpen((s) => ({ ...s, weekly: !s.weekly }))}
        rows={weeklyRows}
        scheme={scheme}
      />
      <Section
        title="Monthly"
        open={open.monthly}
        onToggle={() => setOpen((s) => ({ ...s, monthly: !s.monthly }))}
        rows={monthlyRows}
        scheme={scheme}
      />

      {/* Top Returning (keep concise) */}
      <View style={{ gap: 6 }}>
        {props.topReturning.slice(0, 10).map((t, i) => (
          <View key={i} style={styles.returnRow}>
            <ThemedText style={styles.returnName}>{t.fullName || 'Unknown'}</ThemedText>
            <ThemedText style={styles.returnVisits}>{t.visits} visits</ThemedText>
          </View>
        ))}
      </View>

      {/* Bottom export buttons */}
      <View style={styles.exportRow}>
        <TouchableOpacity onPress={exportCSV} style={[styles.exportBtn, { backgroundColor: Colors[scheme].info }]}>
          <ThemedText style={styles.exportTxt}>Export CSV (Excel)</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={exportPrint} style={[styles.exportBtn, { backgroundColor: Colors[scheme].accent }]}>
          <ThemedText style={styles.exportTxt}>Print / PDF</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Section({
  title,
  open,
  onToggle,
  rows,
  scheme,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  rows: { label: string; customers: number; spins: number; discount: number; sales: number; roi: number; income: number }[];
  scheme: 'light' | 'dark' | null;
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onToggle} style={styles.sectionHeader} activeOpacity={0.85}>
        <ThemedText style={styles.sectionTitle}>{title} Report</ThemedText>
        <ThemedText style={styles.chev}>{open ? '▾' : '▸'}</ThemedText>
      </TouchableOpacity>
      {open && (
        <ScrollView horizontal contentContainerStyle={{ minWidth: 620 }}>
          <View style={{ flex: 1 }}>
            <View style={styles.tableHeader}>
              <ThemedText style={[styles.th, styles.left]}>Period</ThemedText>
              <ThemedText style={styles.th}>Customers</ThemedText>
              <ThemedText style={styles.th}>Spins</ThemedText>
              <ThemedText style={styles.th}>Discount</ThemedText>
              <ThemedText style={styles.th}>Sales</ThemedText>
              <ThemedText style={styles.th}>ROI%</ThemedText>
              <ThemedText style={[styles.th, styles.right]}>Income</ThemedText>
            </View>
            <View style={{ gap: 6 }}>
              {rows.map((r, i) => (
                <View key={i} style={styles.tr}>
                  <ThemedText style={[styles.td, styles.left]}>{r.label}</ThemedText>
                  <ThemedText style={styles.td}>{r.customers}</ThemedText>
                  <ThemedText style={styles.td}>{r.spins}</ThemedText>
                  <ThemedText style={[styles.td, { color: '#F59E0B' }]}>₹{Math.round(r.discount)}</ThemedText>
                  <ThemedText style={styles.td}>₹{Math.round(r.sales)}</ThemedText>
                  <ThemedText style={[styles.td, { color: r.roi >= 0 ? Colors[scheme!].success : Colors[scheme!].danger }]}>{r.roi}%</ThemedText>
                  <ThemedText style={[styles.td, styles.right, { fontWeight: '900', color: Colors[scheme!].success }]}>₹{Math.round(r.income)}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, backgroundColor: '#0F172A', padding: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontWeight: '900' },
  chev: { fontSize: 18, color: '#CBD5E1' },

  tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(148,163,184,0.25)' },
  th: { flex: 1, fontWeight: '800', color: '#94A3B8' },
  left: { flex: 1.2 },
  right: { textAlign: 'right' },

  tr: { flexDirection: 'row', paddingVertical: 8, backgroundColor: '#0B1626', borderRadius: 8, paddingHorizontal: 10 },
  td: { flex: 1, fontWeight: '700', color: '#E2E8F0' },

  returnRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0B1626', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  returnName: { fontSize: 14, fontWeight: '600', color: '#E2E8F0' },
  returnVisits: { fontSize: 14, fontWeight: '700', color: '#38BDF8' },

  exportRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 6 },
  exportBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8 },
  exportTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
