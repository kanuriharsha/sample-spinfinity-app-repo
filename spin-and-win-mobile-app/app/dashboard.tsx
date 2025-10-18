import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Colors } from '@/constants/theme';
import { useColorScheme, setThemePreference, getThemePreference } from '@/hooks/use-color-scheme';
import { getApiUrl, fetchAnalytics, type TopDaily } from '@/lib/mongo-queries';
import RechargeWarning from '@/components/RechargeWarning';

const isWeb = Platform.OS === 'web';

export default function Dashboard() {
  const router = useRouter();
  // Force dashboard to dark only
  const scheme: 'dark' = 'dark';

  // Auth/user
  const [user, setUser] = useState<{ username: string; routeName: string; displayRouteName?: string } | null>(null);

  // Loading
  const [loading, setLoading] = useState(true);

  // Add: manual refresh trigger
  const [reloadKey, setReloadKey] = useState(0);

  // TODAY's KPIs only
  const [todaySpins, setTodaySpins] = useState(0);
  const [todayCustomers, setTodayCustomers] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayReturningCustomers, setTodayReturningCustomers] = useState(0);
  const [todayPrizeAmount, setTodayPrizeAmount] = useState(0);
  const [recentSpins, setRecentSpins] = useState<Array<{ customerName: string; winner: string; spinTime: string; prizeAmount: string }>>([]); // NEW

  // Add: hamburger menu state (overlay) and query for search
  const [menuOpen, setMenuOpen] = useState(false);
  const [onboard, setOnboard] = useState<string | undefined>(undefined);

  const apiUrl = useMemo(() => getApiUrl(), []);
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []); // Detect user timezone

  useEffect(() => {
    (async () => {
      const credsRaw = await AsyncStorage.getItem('auth_creds');
      const u = await AsyncStorage.getItem('auth_user');
      if (!credsRaw) {
        router.replace('/');
        return;
      }
      const creds = JSON.parse(credsRaw) as { username: string; password: string };
      if (u) {
        const userObj = JSON.parse(u);
        setUser(userObj);
        if (String(userObj.access).toLowerCase() === 'disable') {
          await AsyncStorage.multiRemove(['auth_creds', 'auth_user']);
          Alert.alert('Recharge Required', 'Your recharge is over, please recharge.', [{ text: 'OK', onPress: () => router.replace('/') }]);
          return;
        }
      }

      try {
        setLoading(true);
        // Get analytics for today only with timezone
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const data = await fetchAnalytics({ 
          apiUrl, 
          creds, 
          query: { from: startOfToday.toISOString(), to: now.toISOString(), tz } 
        });
        
        // Use topDaily for today's metrics
        const todayData = data.topDaily;
        if (todayData) {
          setTodaySpins(todayData.spins || 0);
          setTodayCustomers(todayData.customers || 0);
          setTodayRevenue(todayData.sales || 0);
          setTodayPrizeAmount(todayData.prizeAmount || 0);
          setRecentSpins(todayData.recentSpins || []); // NEW
          // Calculate returning customers from total analytics
          const totalReturning = data.returningVisitors || 0;
          const totalUnique = data.uniqueVisitors || 0;
          // Estimate today's returning customers as a proportion
          const returningRatio = totalUnique > 0 ? totalReturning / totalUnique : 0;
          setTodayReturningCustomers(Math.round((todayData.customers || 0) * returningRatio));
        } else {
          // Fallback to zeros if no topDaily data
          setTodaySpins(0);
          setTodayCustomers(0);
          setTodayRevenue(0);
          setTodayPrizeAmount(0);
          setTodayReturningCustomers(0);
          setRecentSpins([]); // NEW
        }
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
    // Add reloadKey dependency for manual refresh
  }, [apiUrl, router, reloadKey, tz]);

  useEffect(() => {
    (async () => {
      const userRaw = await AsyncStorage.getItem('auth_user');
      if (userRaw) {
        const user = JSON.parse(userRaw);
        setOnboard(user.onboard);
      }
    })();
  }, []);

  const logout = async () => {
    await AsyncStorage.multiRemove(['auth_creds', 'auth_user']);
    router.replace('/');
  };

  const toggleTheme = async () => {
    const pref = getThemePreference();
    const next = pref === 'dark' ? 'light' : 'dark';
    setThemePreference(next as any);
    await AsyncStorage.setItem('theme_pref', next);
  };

  // Today's label (weekday + date) for main page header
  const todayLabel = useMemo(() => {
    try {
      return new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return new Date().toDateString();
    }
  }, []);

  // Add: simple refresh handler
  const onRefresh = () => setReloadKey((k) => k + 1);

  // Helper to format spin time
  const formatSpinTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#000' }]}> 
      <LinearGradient
        colors={['#0B1220', '#1E293B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        {/* Recharge warning */}
        <RechargeWarning onboard={onboard} />
        {/* ...existing header code... */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            {/* ...existing code... */}
            <View style={styles.titleRow}>
              <TouchableOpacity
                onPress={() => setMenuOpen((s) => !s)}
                accessibilityRole="button"
                accessibilityLabel="Open menu"
                style={styles.hamburgerBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={styles.hBar} />
                <View style={styles.hBar} />
                <View style={styles.hBar} />
              </TouchableOpacity>
              <View style={styles.titleContainer}>
                <ThemedText style={styles.appTitle}>PEH Spinfinity</ThemedText>
              </View>
            </View>
            {/* Replace generic subtitle with "Today's Dashboard" and show today's date */}
            <ThemedText style={styles.headerSubtitle}>Today's Dashboard</ThemedText>
            {/* <ThemedText style={styles.headerSubtle}>{todayLabel}</ThemedText> */}
            {user && (
              <ThemedText style={styles.headerSubtle}>
                {user.displayRouteName ? (user.displayRouteName === 'all' ? 'All Shops' : user.displayRouteName) : (user.routeName === 'all' ? 'All Shops' : user.routeName)}
              </ThemedText>
            )}
          </View>
        </View>
      </LinearGradient>
      {/* ...existing loading and scrollview code... */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[scheme].warning} />
          <ThemedText style={[styles.loadingText, { color: Colors[scheme].warning }]}>Loading analytics...</ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {/* Main page header: stacked left-aligned: Welcome -> Date -> Username */}
          <View style={styles.premiumHeader}>
            <ThemedText style={styles.premiumWelcome}>Welcome back!</ThemedText>
            <ThemedText style={styles.premiumDate}>{todayLabel}</ThemedText>
            <ThemedText style={styles.premiumUser}>{user?.username || 'User'}</ThemedText>
          </View>
          
          {/* ...existing premium grid cards... */}
          <View style={styles.premiumGrid}>
            <View style={styles.premiumCard}>
              <ThemedText style={styles.premiumIcon}>🎯</ThemedText>
              <ThemedText style={styles.premiumValue}>{todaySpins}</ThemedText>
              <ThemedText style={styles.premiumLabel}>Today's Spins</ThemedText>
            </View>
            <View style={styles.premiumCard}>
              <ThemedText style={styles.premiumIcon}>👥</ThemedText>
              <ThemedText style={styles.premiumValue}>{todayCustomers}</ThemedText>
              <ThemedText style={styles.premiumLabel}>Today's Customers</ThemedText>
            </View>
            <View style={styles.premiumCard}>
              <ThemedText style={styles.premiumIcon}>💰</ThemedText>
              <ThemedText style={styles.premiumValue}>₹{todayRevenue}</ThemedText>
              <ThemedText style={styles.premiumLabel}>Today's Revenue</ThemedText>
            </View>
            <View style={styles.premiumCard}>
              <ThemedText style={styles.premiumIcon}>🔄</ThemedText>
              <ThemedText style={styles.premiumValue}>{todayReturningCustomers}</ThemedText>
              <ThemedText style={styles.premiumLabel}>Returning Today</ThemedText>
            </View>
          </View>
          
          {/* ...existing performance card... */}
          <View style={styles.premiumActivityCard}>
            <ThemedText style={styles.premiumActivityTitle}>Today's Performance</ThemedText>
            <View style={styles.performanceRow}>
              <View style={styles.performanceItem}>
                <ThemedText style={styles.performanceLabel}>Spins</ThemedText>
                <ThemedText style={styles.performanceValue}>{todaySpins}</ThemedText>
              </View>
              <View style={styles.performanceDivider} />
              <View style={styles.performanceItem}>
                <ThemedText style={styles.performanceLabel}>Revenue</ThemedText>
                <ThemedText style={styles.performanceValue}>₹{todayRevenue}</ThemedText>
              </View>
              <View style={styles.performanceDivider} />
              <View style={styles.performanceItem}>
                <ThemedText style={styles.performanceLabel}>Rewards</ThemedText>
                <ThemedText style={styles.performanceValue}>₹{todayPrizeAmount}</ThemedText>
              </View>
            </View>
          </View>

          {/* NEW: Recent Spins Section */}
          {recentSpins.length > 0 && (
            <View style={styles.recentSpinsCard}>
              <View style={styles.recentSpinsHeader}>
                <ThemedText style={styles.recentSpinsTitle}> Recent Spins Today</ThemedText>
                <ThemedText style={styles.recentSpinsCount}>{recentSpins.length} spins</ThemedText>
              </View>
              
              <View style={styles.recentSpinsList}>
                {recentSpins.map((spin, index) => (
                  <View key={index} style={styles.recentSpinItem}>
                    <View style={styles.spinLeftSection}>
                      <ThemedText style={styles.spinCustomerName}>
                        {spin.customerName || 'Guest'}
                      </ThemedText>
                      <ThemedText style={styles.spinTime}>
                        {formatSpinTime(spin.spinTime)}
                      </ThemedText>
                    </View>
                    
                    <View style={styles.spinRightSection}>
                      <ThemedText style={styles.spinWinner} numberOfLines={1}>
                        {spin.winner || 'No Prize'}
                      </ThemedText>
                      <ThemedText style={styles.spinPrizeAmount}>
                        {spin.prizeAmount && spin.prizeAmount !== '0' ? spin.prizeAmount : '—'}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      
      {/* Bottom Navigation */}
      <BottomNavigation activeTab="dashboard" />
      
      {/* ...existing drawer code... */}
      {menuOpen && (
        <View style={styles.overlayRoot} pointerEvents="box-none">
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setMenuOpen(false)} />
          <View
            style={[
              styles.drawer,
              {
                backgroundColor: scheme === 'dark' ? '#0F172A' : '#FFFFFF',
                borderColor: scheme === 'dark' ? 'rgba(148,163,184,0.25)' : 'rgba(0,0,0,0.12)',
              },
            ]}
          >
            {/* ...existing drawer code... */}
            <View style={styles.drawerHeader}>
              <ThemedText style={styles.drawerTitle}>Menu</ThemedText>
              <TouchableOpacity onPress={() => setMenuOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <ThemedText style={styles.drawerClose}>✕</ThemedText>
              </TouchableOpacity>
            </View>
            <View style={styles.drawerSection}>
              
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => {
                  onRefresh();
                  setMenuOpen(false);
                }}
              >
                <ThemedText style={styles.drawerItemText}>Refresh</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => {
                  logout();
                  setMenuOpen(false);
                }}
              >
                <ThemedText style={[styles.drawerItemText, { color: Colors[scheme].danger }]}>Logout</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  chevronPremium: {
    fontSize: 22,
    color: '#FFB300',
    paddingHorizontal: 6,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  premiumHeader: {
    flexDirection: 'column',           // changed: stack vertically
    alignItems: 'flex-start',           // changed: left align
    justifyContent: 'flex-start',       // changed: start
    marginBottom: 18,
    marginTop: 10,
    paddingLeft: 4,
  },
  premiumWelcome: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  premiumUser: {
    fontSize: 16,
    color: '#FFB300',
    fontWeight: '700',
    marginBottom: 2,
  },
  premiumDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
    textAlign: 'left',                  // changed: left align date
  },
  premiumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  premiumCard: {
    backgroundColor: '#181818',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '48%', // Changed from flex: 1 to fixed width for 2x2 grid
    minHeight: 120,
    shadowColor: '#FFB300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#FFB300',
  },
  premiumIcon: {
    fontSize: 24, // Slightly smaller icon
    color: '#FFB300',
    marginBottom: 4,
  },
  premiumValue: {
    fontSize: 24, // Reduced from 32 to fit better
    fontWeight: '900',
    color: '#fff',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  premiumLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 14,
  },
  premiumActivityCard: {
    backgroundColor: '#181818',
    borderRadius: 18,
    padding: 18,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#FFB300',
    shadowColor: '#FFB300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumActivityTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  performanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFB300',
  },
  performanceDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8,
  },
  container: { flex: 1 },
  headerGradient: { paddingTop: Platform.OS === 'ios' ? 48 : 28, paddingBottom: 14 },
  header: { paddingHorizontal: 20, paddingBottom: 6, marginTop: 10, marginBottom: -28 },
  headerInfo: { marginBottom: 12 },

  // Title row + hamburger button
  titleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'flex-start',
    position: 'relative',
  },
  hamburgerBtn: {
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
  hBar: { 
    width: 16, 
    height: 2, 
    backgroundColor: '#fff', 
    marginVertical: 1.5, 
    borderRadius: 1 
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 44, // Offset for hamburger width to center the title
  },
  appTitle: { 
    fontSize: 26, 
    fontWeight: '900', 
    color: '#fff',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.95)', marginTop: 2, textAlign: 'center' },
  headerSubtle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Mode row and chips
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    position: 'relative',
    alignItems: 'center',
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  modeChipActive: { backgroundColor: 'rgba(255,255,255,0.28)' },
  modeChipText: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 12 },
  modeChipTextActive: { color: '#fff' },

  // Overlay drawer
  overlayRoot: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0, // moved to left
    width: Platform.OS === 'web' ? '50%' : '80%',
    maxWidth: 520,
    minWidth: 300,
    borderRightWidth: StyleSheet.hairlineWidth, // border on right edge
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  drawerTitle: { fontSize: 18, fontWeight: '900', color: '#E2E8F0' },
  drawerClose: { fontSize: 18, color: '#CBD5E1' },
  drawerSection: { marginTop: 8, gap: 8 },
  drawerItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(148,163,184,0.08)',
  },
  drawerItemText: { fontWeight: '800', color: '#E2E8F0' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },

  // More generous spacing for the list and segment cards
  list: { padding: 18, gap: 16 },

  segmentCard: {
    borderRadius: 16,
    backgroundColor: Platform.OS === 'web' ? 'rgba(17,24,39,0.5)' : '#111827',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.18)',
  },
  segmentHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  badge: { width: 28, height: 28, borderRadius: 8, opacity: 0.95 },
  segmentTitle: { fontSize: 16, fontWeight: '800', color: '#E2E8F0' },
  segmentSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  chevron: { fontSize: 18, color: '#CBD5E1', paddingHorizontal: 6 },
  segmentBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },

  // NEW: Top Daily section styles
  dailyStack: { gap: 10, paddingHorizontal: 2 },
  dailyTitle: { fontSize: 16, fontWeight: '900', color: '#E2E8F0', marginBottom: 2 },
  dailyCard: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(17,24,39,0.6)' : '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(148,163,184,0.35)',
  },
  dailyLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 6 },
  dailyValue: { fontSize: 24, fontWeight: '900', color: '#E2E8F0' },

  // NEW: Recent Spins Styles
  recentSpinsCard: {
    backgroundColor: '#181818',
    borderRadius: 18,
    padding: 18,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#FFB300',
    shadowColor: '#FFB300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  recentSpinsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentSpinsTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  recentSpinsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB300',
    backgroundColor: 'rgba(255,179,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recentSpinsList: {
    gap: 10,
  },
  recentSpinItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  spinLeftSection: {
    flex: 1,
    marginRight: 12,
  },
  spinCustomerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  spinTime: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  spinRightSection: {
    alignItems: 'flex-end',
  },
  spinWinner: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4ECDC4',
    marginBottom: 4,
    maxWidth: 120,
  },
  spinPrizeAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB300',
  },
});