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

  useEffect(() => {
    (async () => {
      const credsRaw = await AsyncStorage.getItem('auth_creds');
      if (!credsRaw) {
        router.replace('/');
        return;
      }
      const creds = JSON.parse(credsRaw) as { username: string; password: string };

      try {
        setLoading(true);
        const data = await fetchAnalytics({ apiUrl, creds, query: { rangeDays: 30 } });
        
        setDailyFinancial((data.dailyFinancial || []) as DailyFinancial[]);
        setWeeklyFinancial((data.weeklyFinancial || []) as WeeklyFinancial[]);
        setMonthlyFinancial((data.monthlyFinancial || []) as MonthlyFinancial[]);
        setTopReturning((data.topReturning || []) as TopReturning[]);

        // Calculate summary stats
        const dailyData = (data.dailyFinancial || []) as DailyFinancial[];
        const revenue = dailyData.reduce((sum, day) => sum + (day.sales || 0), 0);
        const spins = dailyData.reduce((sum, day) => sum + (day.spins || 0), 0);
        const customers = dailyData.reduce((sum, day) => sum + (day.customers || 0), 0);
        
        setTotalRevenue(revenue);
        setTotalSpins(spins);
        setTotalCustomers(customers);
        setAvgOrderValue(customers > 0 ? revenue / customers : 0);

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
  }, [apiUrl, router, reloadKey]);

  const getCurrentData = () => {
    switch (selectedPeriod) {
      case 'weekly': return weeklyFinancial.slice(-10);
      case 'monthly': return monthlyFinancial.slice(-6);
      default: return dailyFinancial.slice(-7);
    }
  };

  const formatPeriod = (item: any): string => {
    if (!item) return 'N/A';
    if (selectedPeriod === 'daily') {
      const day = item.day;
      if (!day) return 'N/A';
      return String(day).substring(0, 10);
    }
    if (selectedPeriod === 'weekly') {
      const week = item.week;
      return `Week ${week || 'N/A'}`;
    }
    const month = item.month;
    return String(month || 'N/A');
  };

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
            <ThemedText style={styles.headerSubtitle}>Financial Performance & Insights</ThemedText>
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
              <ThemedText style={styles.summaryLabel}>Total Revenue</ThemedText>
            </View>
            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryIcon}>🎯</ThemedText>
              <ThemedText style={styles.summaryValue}>{totalSpins}</ThemedText>
              <ThemedText style={styles.summaryLabel}>Total Spins</ThemedText>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryIcon}>👥</ThemedText>
              <ThemedText style={styles.summaryValue}>{totalCustomers}</ThemedText>
              <ThemedText style={styles.summaryLabel}>Customers</ThemedText>
            </View>
            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryIcon}>📈</ThemedText>
              <ThemedText style={styles.summaryValue}>₹{avgOrderValue.toFixed(0)}</ThemedText>
              <ThemedText style={styles.summaryLabel}>Avg Order Value</ThemedText>
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
              // Ensure all values have fallbacks
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

          {/* Performance Insights */}
          <View style={styles.insightsContainer}>
            <ThemedText style={styles.sectionTitle}>Performance Insights</ThemedText>
            
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <ThemedText style={styles.insightIcon}>🔥</ThemedText>
                <ThemedText style={styles.insightTitle}>Best Performing Day</ThemedText>
              </View>
              <ThemedText style={styles.insightValue}>
                {(() => {
                  if (dailyFinancial.length === 0) return 'No data';
                  
                  const bestDay = dailyFinancial.reduce((max, day) => {
                    const maxSales = Number(max?.sales || 0);
                    const daySales = Number(day?.sales || 0);
                    return daySales > maxSales ? day : max;
                  });
                  
                  return bestDay?.day ? String(bestDay.day).substring(0, 10) : 'N/A';
                })()}
              </ThemedText>
              <ThemedText style={styles.insightDescription}>
                Highest revenue generating day
              </ThemedText>
            </View>
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