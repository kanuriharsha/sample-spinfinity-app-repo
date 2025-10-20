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
import { getApiUrl, fetchAnalytics, type DailyFinancial, type WeeklyFinancial, type MonthlyFinancial, type TopReturning } from '@/lib/mongo-queries';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function Reports() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';

  // NEW: user's route for route-scoped reports
  const [userRoute, setUserRoute] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  // Financial data
  const [dailyFinancial, setDailyFinancial] = useState<DailyFinancial[]>([]);
  const [weeklyFinancial, setWeeklyFinancial] = useState<WeeklyFinancial[]>([]);
  const [monthlyFinancial, setMonthlyFinancial] = useState<MonthlyFinancial[]>([]);
  const [topReturning, setTopReturning] = useState<TopReturning[]>([]);

  // Summary stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSpins, setTotalSpins] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);

  const apiUrl = useMemo(() => getApiUrl(), []);
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []); // NEW

  // NEW: periodic refresh tick (real-time updates)
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Helpers for precise ranges
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const startOfISOWeek = (d: Date) => {
    const tmp = new Date(d);
    const day = (tmp.getDay() + 6) % 7; // Mon=0..Sun=6
    tmp.setDate(tmp.getDate() - day);
    return startOfDay(tmp);
  };
  const endOfISOWeek = (d: Date) => {
    const s = startOfISOWeek(d);
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    return endOfDay(e);
  };
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  // NEW: start of current year
  const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);

  // Local date key in tz: returns YYYY-MM-DD
  const localDateKey = (d: Date) => new Date(d).toLocaleDateString('en-CA', { timeZone: tz }); // NEW

  // Build query by selected period
  const buildQueryForPeriod = (period: 'daily' | 'weekly' | 'monthly') => {
    const now = new Date();
    if (period === 'daily') {
      return { from: startOfDay(now).toISOString(), to: now.toISOString(), tz };
    }
    if (period === 'weekly') {
      return { from: startOfISOWeek(now).toISOString(), to: now.toISOString(), tz };
    }
    // monthly: current year to now
    const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
    return { from: startOfYear(now).toISOString(), to: now.toISOString(), tz };
  };

  useEffect(() => {
    (async () => {
      const credsRaw = await AsyncStorage.getItem('auth_creds');
      const userRaw = await AsyncStorage.getItem('auth_user'); // NEW
      if (!credsRaw) {
        router.replace('/');
        return;
      }
      if (userRaw) {
        try {
          const u = JSON.parse(userRaw);
          setUserRoute((u?.routeName || u?.displayRouteName || '').toString().trim() || null);
        } catch {
          setUserRoute(null);
        }
      }
      const creds = JSON.parse(credsRaw) as { username: string; password: string };

      try {
        setLoading(true);
        const query = { ...buildQueryForPeriod(selectedPeriod), tz, routeName: userRoute || undefined }; // include routeName
        const data = await fetchAnalytics({ apiUrl, creds, query });

        setDailyFinancial((data.dailyFinancial || []) as DailyFinancial[]);
        setWeeklyFinancial((data.weeklyFinancial || []) as WeeklyFinancial[]);
        setMonthlyFinancial((data.monthlyFinancial || []) as MonthlyFinancial[]);
        setTopReturning((data.topReturning || []) as TopReturning[]);

        // Summary tailored to selectedPeriod using tz-based keys
        const now = new Date();
        const todayKeyLocal = localDateKey(now);
        const wsKey = localDateKey(startOfISOWeek(now));
        const weKey = localDateKey(endOfISOWeek(now));

        let summarySeries: any[] = [];
        let customersCount = 0;
        
        if (selectedPeriod === 'daily') {
          // For daily: use topDaily data directly
          if (data.topDaily) {
            setTotalRevenue(data.topDaily.sales || 0);
            setTotalSpins(data.topDaily.spins || 0);
            setTotalCustomers(data.topDaily.customers || 0);
            setAvgOrderValue(data.topDaily.customers > 0 ? (data.topDaily.sales || 0) / data.topDaily.customers : 0);
          } else {
            setTotalRevenue(0);
            setTotalSpins(0);
            setTotalCustomers(0);
            setAvgOrderValue(0);
          }
        } else if (selectedPeriod === 'weekly') {
          // For weekly: sum daily data for this week
          summarySeries = (data.dailyFinancial || []).filter((r: any) => String(r.day) >= wsKey && String(r.day) <= weKey);
          const revenue = summarySeries.reduce((sum, r: any) => sum + Number(r?.sales || 0), 0);
          const spins = summarySeries.reduce((sum, r: any) => sum + Number(r?.spins || 0), 0);
          customersCount = summarySeries.reduce((sum, r: any) => sum + Number(r?.customers || 0), 0);

          setTotalRevenue(revenue);
          setTotalSpins(spins);
          setTotalCustomers(customersCount);
          setAvgOrderValue(customersCount > 0 ? revenue / customersCount : 0);
        } else {
          // For monthly: use current month from monthlyFinancial
          const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          summarySeries = (data.monthlyFinancial || []).filter((r: any) => String(r.month) === monthKey);
          const revenue = summarySeries.reduce((sum, r: any) => sum + Number(r?.sales || 0), 0);
          const spins = summarySeries.reduce((sum, r: any) => sum + Number(r?.spins || 0), 0);
          customersCount = summarySeries.reduce((sum, r: any) => sum + Number(r?.customers || 0), 0);

          setTotalRevenue(revenue);
          setTotalSpins(spins);
          setTotalCustomers(customersCount);
          setAvgOrderValue(customersCount > 0 ? revenue / customersCount : 0);
        }
      } catch (e: any) {
        console.error('Reports error:', e);
        const msg = String(e?.message || '');
        if (msg.toLowerCase().includes('unauthorized') || msg.includes('401')) {
          await AsyncStorage.multiRemove(['auth_creds', 'auth_user']);
          Alert.alert('Session expired', 'Please sign in again.', [{ text: 'OK', onPress: () => router.replace('/') }]);
          return;
        }
        Alert.alert('Connection Error', msg || 'Failed to load reports data.');
      } finally {
        setLoading(false);
      }
    })();
  // add userRoute to deps so report re-fetches if route changes
  }, [apiUrl, router, selectedPeriod, reloadKey, tz, userRoute]); // include userRoute

  // Data shown in the list
  const getCurrentData = () => {
    const now = new Date();
    const todayKeyLocal = localDateKey(now);
    if (selectedPeriod === 'daily') {
      return dailyFinancial.filter((r) => String(r.day) === todayKeyLocal);
    }
    if (selectedPeriod === 'weekly') {
      const wsKey = localDateKey(startOfISOWeek(now));
      const weKey = localDateKey(endOfISOWeek(now));
      return dailyFinancial.filter((r) => String(r.day) >= wsKey && String(r.day) <= weKey);
    }
    // Monthly view: only this year up to now (already fetched by query)
    const yearPrefix = `${now.getFullYear()}-`;
    return monthlyFinancial.filter((m) => String(m.month).startsWith(yearPrefix)).slice(-12);
  };

  const formatPeriod = (item: any): string => {
    if (!item) return 'N/A';
    if (selectedPeriod === 'daily' || selectedPeriod === 'weekly') {
      return String(item.day || '').substring(0, 10) || 'N/A';
    }
    return String(item.month || 'N/A');
  };

  // Period label for cards and headings
  const periodLabel = useMemo(
    () => (selectedPeriod === 'daily' ? 'Today' : selectedPeriod === 'weekly' ? 'This Week' : 'This Month'),
    [selectedPeriod]
  );

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
                <ThemedText style={styles.appTitle}>Reports</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.headerSubtitle}>
              {userRoute ? `Financial Performance` : 'Financial Performance & Insights'}
            </ThemedText>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFB300" />
          <ThemedText style={[styles.loadingText, { color: '#FFB300' }]}>Loading reports...</ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {/* Summary Cards */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryIcon}>💰</ThemedText>
              <ThemedText style={styles.summaryValue}>₹{totalRevenue.toFixed(0)}</ThemedText>
              <ThemedText style={styles.summaryLabel}>{periodLabel} Revenue</ThemedText>
            </View>
            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryIcon}>🎯</ThemedText>
              <ThemedText style={styles.summaryValue}>{totalSpins}</ThemedText>
              <ThemedText style={styles.summaryLabel}>{periodLabel} Spins</ThemedText>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryIcon}>👥</ThemedText>
              <ThemedText style={styles.summaryValue}>{totalCustomers}</ThemedText>
              <ThemedText style={styles.summaryLabel}>{periodLabel} Customers</ThemedText>
            </View>
            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryIcon}>📈</ThemedText>
              <ThemedText style={styles.summaryValue}>₹{avgOrderValue.toFixed(0)}</ThemedText>
              <ThemedText style={styles.summaryLabel}>{periodLabel} Avg Order Value</ThemedText>
            </View>
          </View>

          {/* Period Selector */}
          <View style={styles.periodSelector}>
            {(['daily', 'weekly', 'monthly'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                onPress={() => setSelectedPeriod(period)}
                style={[
                  styles.periodBtn,
                  selectedPeriod === period && styles.periodBtnActive
                ]}
              >
                <ThemedText style={[
                  styles.periodBtnText,
                  selectedPeriod === period && styles.periodBtnTextActive
                ]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Financial Data */}
          <View style={styles.financialContainer}>
            <ThemedText style={styles.sectionTitle}>
              {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Performance
            </ThemedText>

            {getCurrentData().map((item, index) => {
              const sales = Number(item?.sales || 0);
              const spins = Number(item?.spins || 0);
              const customers = Number(item?.customers || 0);
              const income = Number(item?.income || 0);
              const discount = Number(item?.discount || 0);
              return (
                <View key={index} style={styles.financialCard}>
                  <View style={styles.financialHeader}>
                    <ThemedText style={styles.financialDate}>{formatPeriod(item)}</ThemedText>
                    <ThemedText style={styles.financialRevenue}>₹{sales.toFixed(0)}</ThemedText>
                  </View>
                  <View style={styles.financialStats}>
                    <View style={styles.financialStat}>
                      <ThemedText style={styles.statLabel}>Spins</ThemedText>
                      <ThemedText style={styles.statValue}>{spins}</ThemedText>
                    </View>
                    <View style={styles.financialStat}>
                      <ThemedText style={styles.statLabel}>Customers</ThemedText>
                      <ThemedText style={styles.statValue}>{customers}</ThemedText>
                    </View>
                    <View style={styles.financialStat}>
                      <ThemedText style={styles.statLabel}>Income</ThemedText>
                      <ThemedText style={[styles.statValue, { color: '#4ECDC4' }]}>₹{income.toFixed(0)}</ThemedText>
                    </View>
                  </View>
                  {discount > 0 && (
                    <View style={styles.discountRow}>
                      <ThemedText style={styles.discountLabel}>Discount Given:</ThemedText>
                      <ThemedText style={styles.discountValue}>-₹{discount.toFixed(0)}</ThemedText>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Performance Insights (dynamic) */}
          <View style={styles.insightsContainer}>
            <ThemedText style={styles.sectionTitle}>
              {selectedPeriod === 'daily'
                ? 'Today Insights'
                : selectedPeriod === 'weekly'
                ? 'This Week Insights'
                : 'Monthly Insights'}
            </ThemedText>

            {selectedPeriod === 'weekly' && (
              <View style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <ThemedText style={styles.insightIcon}>🏆</ThemedText>
                  <ThemedText style={styles.insightTitle}>Best Performing Day (This Week)</ThemedText>
                </View>
                <ThemedText style={styles.insightValue}>
                  {(() => {
                    const now = new Date();
                    const ws = startOfISOWeek(now).getTime();
                    const we = endOfISOWeek(now).getTime();
                    const weekDays = dailyFinancial.filter((d) => {
                      const t = new Date(d.day).getTime();
                      return t >= ws && t <= we;
                    });
                    if (weekDays.length === 0) return 'No data';
                    const best = weekDays.reduce((max, d) => (Number(d.sales || 0) > Number(max.sales || 0) ? d : max));
                    return String(best.day).substring(0, 10);
                  })()}
                </ThemedText>
                <ThemedText style={styles.insightDescription}>Highest revenue day in current week</ThemedText>
              </View>
            )}

            {selectedPeriod === 'monthly' && (
              <View style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <ThemedText style={styles.insightIcon}>📅</ThemedText>
                  <ThemedText style={styles.insightTitle}>Best Performing Month (This Year)</ThemedText>
                </View>
                <ThemedText style={styles.insightValue}>
                  {(() => {
                    // Restrict to current year
                    const now = new Date();
                    const yearPrefix = `${now.getFullYear()}-`;
                    const monthsThisYear = monthlyFinancial.filter((m) =>
                      String(m.month || '').startsWith(yearPrefix)
                    );
                    if (monthsThisYear.length === 0) return 'No data';
                    const best = monthsThisYear.reduce((max, m) =>
                      Number(m.sales || 0) > Number(max.sales || 0) ? m : max
                    );
                    return String(best.month);
                  })()}
                </ThemedText>
                <ThemedText style={styles.insightDescription}>Highest revenue month in the current year</ThemedText>
              </View>
            )}

            {selectedPeriod === 'daily' && (
              <View style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <ThemedText style={styles.insightIcon}>⏱️</ThemedText>
                  <ThemedText style={styles.insightTitle}>Live Today</ThemedText>
                </View>
                <ThemedText style={styles.insightDescription}>
                  Showing real-time performance for today only
                </ThemedText>
              </View>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="reports" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: { paddingTop: Platform.OS === 'ios' ? 48 : 28, paddingBottom: 14 },
  header: { paddingHorizontal: 20, paddingBottom: 6, marginTop: 10, marginBottom: -20 },
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
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.95)', marginTop: 2, textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  list: { padding: 18, gap: 20 },

  // Summary Cards
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB300',
  },
  summaryIcon: {
    fontSize: 24,
    color: '#FFB300',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Period Selector
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 4,
    marginTop: 8,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: '#FFB300',
  },
  periodBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  periodBtnTextActive: {
    color: '#000',
  },

  // Financial Data
  financialContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 16,
  },
  financialCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  financialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  financialDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  financialRevenue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4ECDC4',
  },
  financialStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  financialStat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  discountLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B6B',
  },

  // Insights
  insightsContainer: {
    marginTop: 8,
  },
  insightCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  insightValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFB300',
    marginBottom: 8,
  },
  insightDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },

  // Bottom Navigation
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