import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getApiUrl, fetchAnalytics, type DailyFinancial, type WeeklyFinancial, type MonthlyFinancial, type DOW, type Device, type Hour, type Dist, type TopReturning, type TopDaily } from '@/lib/mongo-queries';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Segmented components
import SegmentMetricsOverview from '@/dashboard/SegmentMetricsOverview';
import SegmentRewardDistribution from '@/dashboard/SegmentRewardDistribution';
import SegmentEngagement from '@/dashboard/SegmentEngagement';
import SegmentFinancialOverview from '@/dashboard/SegmentFinancialOverview';
import SegmentGrowthComparisons from '@/dashboard/SegmentGrowthComparisons';
import SegmentCustomerSpendInsights from '@/dashboard/SegmentCustomerSpendInsights';
import SegmentSummaryReports from '@/dashboard/SegmentSummaryReports';

export default function Analytics() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';

  // Auth/user
  const [user, setUser] = useState<{ username: string; routeName: string; displayRouteName?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState<number | undefined>(7);
  const [reloadKey, setReloadKey] = useState(0);

  const apiUrl = useMemo(() => getApiUrl(), []);
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  useEffect(() => {
    (async () => {
      const credsRaw = await AsyncStorage.getItem('auth_creds');
      const u = await AsyncStorage.getItem('auth_user');
      if (!credsRaw) {
        router.replace('/');
        return;
      }
      const creds = JSON.parse(credsRaw) as { username: string; password: string };
      if (u) setUser(JSON.parse(u));

      try {
        setLoading(true);
        const data = await fetchAnalytics({ apiUrl, creds, query: { rangeDays, tz } }); // pass tz
        setTotal(data.totalSpins || 0);
        setUniqueVisitors(data.uniqueVisitors || 0);
        setReturningVisitors(data.returningVisitors || 0);
        setAvgSpend(Number(data.amountStats?.avgAmountSpent || 0));
        setTotalSpend(Number(data.amountStats?.totalAmountSpent || 0));
        setDwellAvg(Number(data.dwellTime?.avgDwellSecs || 0));
        setByResult(data.byResult || []);
        setByHour(data.byHour || []);
        setDayOfWeek(data.dayOfWeek || []);
        setDevices(data.devices || []);
        setTopReturning((data.topReturning || []) as TopReturning[]);
        setDailyFinancial((data.dailyFinancial || []) as DailyFinancial[]);
        setWeeklyFinancial((data.weeklyFinancial || []) as WeeklyFinancial[]);
        setMonthlyFinancial((data.monthlyFinancial || []) as MonthlyFinancial[]);
      } catch (e: any) {
        console.error('Analytics error:', e);
        const msg = String(e?.message || '');
        if (msg.toLowerCase().includes('unauthorized') || msg.includes('401')) {
          await AsyncStorage.multiRemove(['auth_creds', 'auth_user']);
          Alert.alert('Session expired', 'Please sign in again.', [{ text: 'OK', onPress: () => router.replace('/') }]);
          return;
        }
        Alert.alert('Connection Error', msg || 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    })();
  // REMOVED: refreshTick, keep existing deps
  }, [apiUrl, router, rangeDays, reloadKey, tz]); // include tz

  const onRefresh = () => setReloadKey((k) => k + 1);

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#000' }]}>
      <LinearGradient
        colors={['#0B1220', '#1E293B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <TouchableOpacity onPress={() => router.push('/dashboard')} style={styles.backBtn}>
                <IconSymbol name="arrow.left" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={styles.titleContainer}>
                <ThemedText style={styles.appTitle}>Analytics</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.headerSubtitle}>Advanced Business Insights</ThemedText>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFB300" />
          <ThemedText style={[styles.loadingText, { color: '#FFB300' }]}>Loading analytics...</ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <SegmentRow
            title="Daily Metrics Overview"
            subtitle="Key performance indicators"
            color="#FFB300"
            open={open.metrics}
            onToggle={() => setOpen((s) => ({ ...s, metrics: !s.metrics }))}
          >
            <SegmentMetricsOverview
              total={total}
              uniqueVisitors={uniqueVisitors}
              returningVisitors={returningVisitors}
              avgSpend={avgSpend}
              totalSpend={totalSpend}
              dwellAvg={dwellAvg}
            />
          </SegmentRow>

          <SegmentRow
            title="Customer Engagement"
            subtitle="Behavior & peak hours"
            color="#22D3EE"
            open={open.engagement}
            onToggle={() => setOpen((s) => ({ ...s, engagement: !s.engagement }))}
          >
            <SegmentEngagement
              byHour={byHour}
              dayOfWeek={dayOfWeek}
              devices={devices}
              total={total}
              uniqueVisitors={uniqueVisitors}
              returningVisitors={returningVisitors}
              onRefresh={onRefresh}
            />
          </SegmentRow>

          <SegmentRow
            title="Financial Overview"
            subtitle="Sales, costs & profits"
            color="#34D399"
            open={open.financial}
            onToggle={() => setOpen((s) => ({ ...s, financial: !s.financial }))}
          >
            <SegmentFinancialOverview
              daily={dailyFinancial}
              weekly={weeklyFinancial}
              monthly={monthlyFinancial}
              uniqueVisitors={uniqueVisitors}
            />
          </SegmentRow>

          <SegmentRow
            title="Growth & Comparisons"
            subtitle="Trends & ROI analysis"
            color="#FB923C"
            open={open.growth}
            onToggle={() => setOpen((s) => ({ ...s, growth: !s.growth }))}
          >
            <SegmentGrowthComparisons
              daily={dailyFinancial}
              weekly={weeklyFinancial}
              monthly={monthlyFinancial}
            />
          </SegmentRow>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="analytics" />
    </ThemedView>
  );
}

function SegmentRow({
  title,
  subtitle,
  color,
  open,
  onToggle,
  children,
}: React.PropsWithChildren<{ title: string; subtitle: string; color: string; open: boolean; onToggle: () => void }>) {
  return (
    <View style={styles.segmentCard}>
      <TouchableOpacity style={styles.segmentHeader} onPress={onToggle} activeOpacity={0.85}>
        <View style={[styles.badge, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.segmentTitle}>{title}</ThemedText>
          <ThemedText style={styles.segmentSubtitle}>{subtitle}</ThemedText>
        </View>
        <ThemedText style={styles.chevronPremium}>{open ? '▼' : '▶'}</ThemedText>
      </TouchableOpacity>
      {open && <View style={styles.segmentBody}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: { paddingTop: Platform.OS === 'ios' ? 48 : 28, paddingBottom: 14 },
  header: { paddingHorizontal: 20, paddingBottom: 6, marginTop: 20 },
  headerInfo: { marginBottom: 12 },
  titleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'flex-start',
    position: 'relative',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  backText: { 
    fontSize: 18, 
    color: '#fff', 
    fontWeight: '900' 
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 44,
  },
  appTitle: { 
    fontSize: 26, 
    fontWeight: '900', 
    color: '#fff',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.95)', marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  list: { padding: 18, gap: 16 },
  segmentCard: {
    borderRadius: 16,
    backgroundColor: '#111827',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.18)',
  },
  segmentHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  badge: { width: 28, height: 28, borderRadius: 8, opacity: 0.95 },
  segmentTitle: { fontSize: 16, fontWeight: '800', color: '#E2E8F0' },
  segmentSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  chevronPremium: {
    fontSize: 22,
    color: '#FFB300',
    paddingHorizontal: 6,
    fontWeight: '900',
  },
  segmentBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  bottomNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 6,
    paddingBottom: Platform.OS === 'ios' ? 18 : 8,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    height: 62,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavIcon: {
    fontSize: 26,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  bottomNavIconActive: {
    color: '#FFB300',
    fontWeight: '900',
  },
  bottomNavLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  bottomNavLabelActive: {
    color: '#FFB300',
    fontWeight: '900',
  },
});