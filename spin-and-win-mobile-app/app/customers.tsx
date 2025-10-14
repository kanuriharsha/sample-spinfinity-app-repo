import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getApiUrl, fetchAnalytics, searchCustomers, fetchMonthlyCustomers, fetchCustomerDetails, type Customer, type MonthlyCustomers, type CustomerDetails } from '@/lib/mongo-queries';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function Customers() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';

  // Loading and reload
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // KPIs (from analytics) for quick insights
  const [uniqueVisitors, setUniqueVisitors] = useState(0);
  const [returningVisitors, setReturningVisitors] = useState(0);
  const [avgSpend, setAvgSpend] = useState(0);

  // Default list and search
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Monthly customers data
  const [monthlyCustomers, setMonthlyCustomers] = useState<MonthlyCustomers | null>(null);

  // Customer details view
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);

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

        // KPIs
        const analytics = await fetchAnalytics({ apiUrl, creds, query: { rangeDays: 7 } });
        setUniqueVisitors(analytics.uniqueVisitors || 0);
        setReturningVisitors(analytics.returningVisitors || 0);
        setAvgSpend(Number(analytics.amountStats?.avgAmountSpent || 0));

        // Monthly customers
        const monthly = await fetchMonthlyCustomers({ apiUrl, creds });
        setMonthlyCustomers(monthly);

        // Default list (top recent)
        const list = await searchCustomers({ apiUrl, creds, limit: 100 });
        setCustomers(list.customers || []);
      } catch (e: any) {
        console.error('Customers init error:', e);
        const msg = String(e?.message || '');
        if (msg.toLowerCase().includes('unauthorized') || msg.includes('401')) {
          await AsyncStorage.multiRemove(['auth_creds', 'auth_user']);
          Alert.alert('Session expired', 'Please sign in again.', [{ text: 'OK', onPress: () => router.replace('/') }]);
          return;
        }
        Alert.alert('Connection Error', msg || 'Failed to load customers.');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiUrl, router, reloadKey]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    const credsRaw = await AsyncStorage.getItem('auth_creds');
    if (!credsRaw) return;
    const creds = JSON.parse(credsRaw) as { username: string; password: string };

    if (!query.trim()) {
      setShowSearch(false);
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      setShowSearch(true);
      const res = await searchCustomers({ apiUrl, creds, search: query, limit: 100 });
      setSearchResults(res.customers || []);
    } catch (e) {
      console.error('Search error:', e);
      Alert.alert('Search Error', 'Failed to search customers.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCustomerPress = async (customer: Customer) => {
    const credsRaw = await AsyncStorage.getItem('auth_creds');
    if (!credsRaw) return;
    const creds = JSON.parse(credsRaw) as { username: string; password: string };

    // Generate customer key (same logic as backend)
    const fullName = customer.fullName?.trim().toLowerCase() || '';
    const sessionId = customer.sessionId?.trim().toLowerCase() || '';
    const customerId = fullName || sessionId || '';

    if (!customerId) {
      Alert.alert('Error', 'Unable to load customer details.');
      return;
    }

    try {
      setCustomerDetailsLoading(true);
      setShowCustomerDetails(true);
      const details = await fetchCustomerDetails({ apiUrl, creds, customerId });
      setSelectedCustomer(details);
    } catch (e) {
      console.error('Customer details error:', e);
      Alert.alert('Error', 'Failed to load customer details.');
      setShowCustomerDetails(false);
    } finally {
      setCustomerDetailsLoading(false);
    }
  };

  const toTitleCase = (s?: string) =>
    (s || '')
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

  const formatCurrency = (n: number | string | undefined) => {
    const num = Number(n || 0);
    return `₹${num.toFixed(0)}`;
  };

  const formatDate = (d?: string) => {
    if (!d) return 'N/A';
    const dt = new Date(d);
    // dd/mm/yyyy like your screenshot
    return dt.toLocaleDateString('en-GB');
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return 'N/A';
    }
  };

  const list = showSearch ? searchResults : customers;

  if (showCustomerDetails) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: '#000' }]}>
        {/* Customer Details Header */}
        {/* <LinearGradient
          colors={['#0B1220', '#1E293B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <View style={styles.titleRow}>
                <TouchableOpacity onPress={() => router.push('/dashboard')} style={styles.backBtn}>
                  <ThemedText style={styles.backText}>←</ThemedText>
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                  <ThemedText style={styles.appTitle}>Customer Details</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.headerSubtitle}>
                {selectedCustomer?.customer.fullName || 'Customer Analytics'}
              </ThemedText>
            </View>
          </View>
        </LinearGradient> */}

        {customerDetailsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFB300" />
            <ThemedText style={[styles.loadingText, { color: '#FFB300' }]}>Loading details...</ThemedText>
          </View>
        ) : selectedCustomer ? (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {/* Customer Summary */}
            <View style={styles.customerSummaryCard}>
              <ThemedText style={styles.customerSummaryName}>{selectedCustomer.customer.fullName}</ThemedText>
              
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryLabel}>Total Spins</ThemedText>
                  <ThemedText style={styles.summaryValue}>{selectedCustomer.customer.totalSpins}</ThemedText>
                </View>
                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryLabel}>Total Spent</ThemedText>
                  <ThemedText style={styles.summaryValue}>{formatCurrency(selectedCustomer.customer.totalSpent)}</ThemedText>
                </View>
                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryLabel}>Total Prizes</ThemedText>
                  <ThemedText style={styles.summaryValue}>{formatCurrency(selectedCustomer.customer.totalPrizeAmount)}</ThemedText>
                </View>
                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryLabel}>Avg Spend</ThemedText>
                  <ThemedText style={styles.summaryValue}>{formatCurrency(selectedCustomer.customer.avgSpent)}</ThemedText>
                </View>
              </View>
            </View>

            {/* Recent Spins */}
            <View style={styles.spinsSection}>
              <ThemedText style={styles.sectionTitle}>Recent Spins</ThemedText>
              {selectedCustomer.spins.map((spin, index) => (
                <View key={index} style={styles.spinCard}>
                  <View style={styles.spinHeader}>
                    <ThemedText style={styles.spinDate}>{formatDateTime(spin.spinDate)}</ThemedText>
                    <ThemedText style={styles.spinPrize}>{spin.prize || 'No Prize'}</ThemedText>
                  </View>
                  
                  <View style={styles.spinStats}>
                    <View style={styles.spinStat}>
                      <ThemedText style={styles.spinStatLabel}>Spent</ThemedText>
                      <ThemedText style={styles.spinStatValue}>{formatCurrency(spin.amountSpent)}</ThemedText>
                    </View>
                    <View style={styles.spinStat}>
                      <ThemedText style={styles.spinStatLabel}>Prize Amount</ThemedText>
                      <ThemedText style={[styles.spinStatValue, { color: spin.prizeAmount > 0 ? '#4ECDC4' : '#666' }]}>
                        {formatCurrency(spin.prizeAmount)}
                      </ThemedText>
                    </View>
                    {/* <View style={styles.spinStat}>
                      <ThemedText style={styles.spinStatLabel}>Net</ThemedText>
                      <ThemedText style={[styles.spinStatValue, { 
                        color: (spin.prizeAmount - spin.amountSpent) > 0 ? '#4ECDC4' : '#FF6B6B'
                      }]}>
                        {formatCurrency(spin.prizeAmount - spin.amountSpent)}
                      </ThemedText>
                    </View> */}
                  </View>
                </View>
              ))}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        ) : null}

        {/* Bottom Navigation (safe-area aware) */}
        <BottomNavigation activeTab="customers" />
      </ThemedView>
    );
  }

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
                <ThemedText style={styles.appTitle}>Customers</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.headerSubtitle}>Customer Analytics & Insights</ThemedText>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFB300" />
          <ThemedText style={[styles.loadingText, { color: '#FFB300' }]}>Loading customers...</ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <ThemedText style={styles.searchIcon}>🔍</ThemedText>
              <TextInput
                style={styles.searchInput}
                placeholder="Search customers by name, session or IP..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
                  <ThemedText style={styles.clearIcon}>✕</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Updated KPI cards with monthly data */}
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <ThemedText style={styles.overviewIcon}>👥</ThemedText>
              <ThemedText style={styles.overviewValue}>{uniqueVisitors}</ThemedText>
              <ThemedText style={styles.overviewLabel}>Total Customers</ThemedText>
            </View>
            <View style={styles.overviewCard}>
              <ThemedText style={styles.overviewIcon}>🔄</ThemedText>
              <ThemedText style={styles.overviewValue}>{returningVisitors}</ThemedText>
              <ThemedText style={styles.overviewLabel}>Returning</ThemedText>
            </View>
            {monthlyCustomers && (
              <View style={styles.overviewCard}>
                <ThemedText style={styles.overviewIcon}>📅</ThemedText>
                <ThemedText style={styles.overviewValue}>{monthlyCustomers.thisMonth}</ThemedText>
                <ThemedText style={styles.overviewLabel}>This Month</ThemedText>
              </View>
            )}
          </View>

          {monthlyCustomers && (
            <View style={styles.monthlyComparisonCard}>
              <View style={styles.monthlyRow}>
                <View style={styles.monthlyItem}>
                  <ThemedText style={styles.monthlyLabel}>Last Month</ThemedText>
                  <ThemedText style={styles.monthlyValue}>{monthlyCustomers.lastMonth}</ThemedText>
                </View>
                <View style={styles.monthlyItem}>
                  <ThemedText style={styles.monthlyLabel}>Growth</ThemedText>
                  <ThemedText style={[styles.monthlyValue, { 
                    color: parseFloat(monthlyCustomers.growth) >= 0 ? '#4ECDC4' : '#FF6B6B'
                  }]}>
                    {parseFloat(monthlyCustomers.growth) >= 0 ? '+' : ''}{monthlyCustomers.growth}%
                  </ThemedText>
                </View>
              </View>
            </View>
          )}

          {/* Search state header */}
          {showSearch && (
            <View style={styles.searchHeaderRow}>
              <ThemedText style={styles.searchResultsTitle}>
                {searchLoading ? 'Searching...' : `Results (${list.length})`}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowSearch(false)} style={styles.closeSearchButton}>
                <ThemedText style={styles.closeSearchText}>Close</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* Updated Customer cards list with onPress */}
          <View style={{ gap: 12 }}>
            {list.map((c, i) => (
              <TouchableOpacity
                key={`${c.sessionId}-${i}`}
                style={styles.customerCard}
                onPress={() => handleCustomerPress(c)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <ThemedText style={styles.customerName}>{toTitleCase(c.fullName) || 'Customer'}</ThemedText>
                  <ThemedText style={styles.spinsText}>{c.visits || 0} spins</ThemedText>
                </View>

                <View style={styles.row}>
                  <ThemedText style={styles.muted}>
                    Total Spent: <ThemedText style={styles.val}>{formatCurrency(c.totalSpent)}</ThemedText>
                  </ThemedText>
                </View>

                <ThemedText style={styles.muted}>Last visit: {formatDate(c.lastVisit)}</ThemedText>
                
                <View style={styles.tapHint}>
                  <ThemedText style={styles.tapHintText}>Tap for details →</ThemedText>
                </View>
              </TouchableOpacity>
            ))}

            {list.length === 0 && (
              <View style={styles.noResultsContainer}>
                <ThemedText style={styles.noResultsText}>No customers found</ThemedText>
              </View>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Replace custom bar with shared BottomNavigation */}
      <BottomNavigation activeTab="customers" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: { paddingTop: Platform.OS === 'ios' ? 48 : 28, paddingBottom: 14 },
  header: { paddingHorizontal: 20, paddingBottom: 6, marginTop: 10, marginBottom: -16 },
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
  backText: { fontSize: 18, color: '#fff', fontWeight: '900' },
  titleContainer: { flex: 1, alignItems: 'center', marginRight: 44 },
  appTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 0.5, textAlign: 'center' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.95)', marginTop: 2, textAlign:'center' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  list: { padding: 18, gap: 20 },

  // Search
  searchContainer: { marginBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#FFB300',
  },
  searchIcon: { fontSize: 20, color: '#FFB300', marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#fff', fontWeight: '600' },
  clearButton: { padding: 4 },
  clearIcon: { fontSize: 18, color: 'rgba(255,255,255,0.6)' },
  searchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  searchResultsTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  closeSearchButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFB300', borderRadius: 8 },
  closeSearchText: { fontSize: 12, fontWeight: '800', color: '#000' },

  // KPI mini cards
  overviewGrid: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  overviewCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB300',
  },
  overviewIcon: { fontSize: 20, color: '#FFB300', marginBottom: 6 },
  overviewValue: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 2 },
  overviewLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textAlign: 'center' },

  // Monthly comparison card
  monthlyComparisonCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFB300',
  },
  monthlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthlyItem: {
    alignItems: 'center',
  },
  monthlyLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: 4,
  },
  monthlyValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },

  // Customer cards
  customerCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  customerName: { fontSize: 18, fontWeight: '900', color: '#fff' },
  spinsText: { fontSize: 14, fontWeight: '800', color: '#FBBF24' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  muted: { color: '#94A3B8', fontWeight: '700' },
  val: { color: '#E2E8F0', fontWeight: '900' },

  // Customer details styles
  customerSummaryCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFB300',
  },
  customerSummaryName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFB300',
  },
  spinsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 16,
  },
  spinCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  spinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  spinDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  spinPrize: {
    fontSize: 14,
    color: '#FFB300',
    fontWeight: '800',
  },
  spinStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spinStat: {
    alignItems: 'center',
  },
  spinStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  spinStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  tapHint: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  tapHintText: {
    fontSize: 12,
    color: '#FFB300',
    fontWeight: '600',
  },

  noResultsContainer: { padding: 40, alignItems: 'center' },
  noResultsText: { fontSize: 16, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
});