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
import { getApiUrl, fetchAnalytics, type Dist } from '@/lib/mongo-queries';
import { IconSymbol } from '@/components/ui/icon-symbol';

type RewardAnalysis = {
  name: string;
  occurrences: number;
  prizeAmount: number;
  totalValue: number;
  percentage: number;
  color: string;
};

type TimeFilter = 'today' | 'thisMonth' | 'lastMonth' | 'all';

export default function Rewards() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';

  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [rewards, setRewards] = useState<RewardAnalysis[]>([]);
  const [totalSpins, setTotalSpins] = useState(0);
  const [totalRewardValue, setTotalRewardValue] = useState(0);

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
        
        // Calculate date range based on filter
        let query = {};
        const now = new Date();
        
        if (timeFilter === 'today') {
          query = { rangeDays: 1 };
        } else if (timeFilter === 'thisMonth') {
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          query = { from: thisMonthStart.toISOString() };
        } else if (timeFilter === 'lastMonth') {
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          query = { 
            from: lastMonthStart.toISOString(),
            to: lastMonthEnd.toISOString()
          };
        } else {
          query = { rangeDays: 30 }; // All = last 30 days
        }

        const data = await fetchAnalytics({ apiUrl, creds, query });
        
        const byResult = data.byResult || [];
        const total = byResult.reduce((sum, item) => sum + (item.count || 0), 0);
        setTotalSpins(total);

        // Process rewards with actual prizeAmount from database
        const processedRewards: RewardAnalysis[] = byResult.map((item, index) => {
          const occurrences = item.count || 0;
          const prizeAmount = item.prizeAmount || 0; // Use actual prizeAmount from database
          const totalValue = occurrences * prizeAmount;
          const percentage = total > 0 ? (occurrences / total) * 100 : 0;

          return {
            name: cleanRewardName(item.result || 'Unknown Reward'),
            occurrences,
            prizeAmount,
            totalValue,
            percentage,
            color: getRewardColor(index),
          };
        }).filter(reward => reward.occurrences > 0);

        // Sort by total value descending
        processedRewards.sort((a, b) => b.totalValue - a.totalValue);
        setRewards(processedRewards);

        // Calculate total reward value
        const totalValue = processedRewards.reduce((sum, reward) => sum + reward.totalValue, 0);
        setTotalRewardValue(totalValue);

      } catch (e: any) {
        console.error('Rewards error:', e);
        const msg = String(e?.message || '');
        if (msg.toLowerCase().includes('unauthorized') || msg.includes('401')) {
          await AsyncStorage.multiRemove(['auth_creds', 'auth_user']);
          Alert.alert('Session expired', 'Please sign in again.', [{ text: 'OK', onPress: () => router.replace('/') }]);
          return;
        }
        Alert.alert('Connection Error', msg || 'Failed to load rewards data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiUrl, router, timeFilter]);

  const cleanRewardName = (name: string): string => {
    // Clean up reward names for better display
    return name.replace(/[^\w\s%₹-]/g, '').trim() || 'Mystery Reward';
  };

  const getRewardColor = (index: number): string => {
    const colors = ['#FFB300', '#4ECDC4', '#FF6B6B', '#45B7D1', '#96CEB4', '#FFA726', '#AB47BC', '#66BB6A'];
    return colors[index % colors.length];
  };

  const getFilterLabel = (filter: TimeFilter): string => {
    switch (filter) {
      case 'today': return "Today's Rewards";
      case 'thisMonth': return 'This Month';
      case 'lastMonth': return 'Last Month';
      default: return 'All Time';
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
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <TouchableOpacity onPress={() => router.push('/dashboard')} style={styles.backBtn}>
                <IconSymbol name="arrow.left" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={styles.titleContainer}>
                <ThemedText style={styles.appTitle}>Rewards Analysis</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.headerSubtitle}>{getFilterLabel(timeFilter)}</ThemedText>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFB300" />
          <ThemedText style={[styles.loadingText, { color: '#FFB300' }]}>Loading rewards...</ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          
          {/* Time Filter */}
          <View style={styles.filterContainer}>
            {(['today', 'thisMonth', 'lastMonth', 'all'] as TimeFilter[]).map((filter) => (
              <TouchableOpacity
                key={filter}
                onPress={() => setTimeFilter(filter)}
                style={[
                  styles.filterBtn,
                  timeFilter === filter && styles.filterBtnActive
                ]}
              >
                <ThemedText style={[
                  styles.filterBtnText,
                  timeFilter === filter && styles.filterBtnTextActive,
                  { textAlign: 'center' }
                ]}>
                  {filter === 'today' ? 'Today' : 
                   filter === 'thisMonth' ? 'This Month' :
                   filter === 'lastMonth' ? 'Last Month' : 'All Time'}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary Stats */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryIcon}>🎯</ThemedText>
              <ThemedText style={styles.summaryValue}>{totalSpins}</ThemedText>
              <ThemedText style={styles.summaryLabel}>Total Spins</ThemedText>
            </View>
            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryIcon}>💰</ThemedText>
              <ThemedText style={styles.summaryValue}>₹{totalRewardValue}</ThemedText>
              <ThemedText style={styles.summaryLabel}>Reward Value</ThemedText>
            </View>
          </View>

          {/* Reward Analysis Cards */}
          <View style={styles.rewardsContainer}>
            <ThemedText style={styles.sectionTitle}>Reward Breakdown</ThemedText>
            
            {rewards.length === 0 ? (
              <View style={styles.noDataContainer}>
                <ThemedText style={styles.noDataText}>No rewards data available for this period</ThemedText>
              </View>
            ) : (
              rewards.map((reward, index) => (
                <View key={`${reward.name}-${index}`} style={styles.rewardCard}>
                  {/* Reward Header */}
                  <View style={styles.rewardHeader}>
                    <View style={[styles.rewardColorIndicator, { backgroundColor: reward.color }]} />
                    <View style={styles.rewardTitleContainer}>
                      <ThemedText style={styles.rewardName}>{reward.name}</ThemedText>
                      {/* <ThemedText style={styles.rewardRoute}>Route: {reward.name}</ThemedText> */}
                    </View>
                  </View>

                  {/* Reward Details */}
                  <View style={styles.rewardDetails}>
                    <View style={styles.rewardDetailRow}>
                      <ThemedText style={styles.detailLabel}>Occurrences:</ThemedText>
                      <ThemedText style={styles.detailValue}>{reward.occurrences} times</ThemedText>
                    </View>
                    
                    <View style={styles.rewardDetailRow}>
                      <ThemedText style={styles.detailLabel}>Prize Amount:</ThemedText>
                      <ThemedText style={styles.detailValue}>₹{reward.prizeAmount} each</ThemedText>
                    </View>
                    
                    <View style={styles.calculationRow}>
                      <ThemedText style={styles.calculationText}>
                        {reward.occurrences} × ₹{reward.prizeAmount} = <ThemedText style={styles.totalValue}>₹{reward.totalValue}</ThemedText>
                      </ThemedText>
                    </View>
                  </View>

                  {/* Progress Bar showing value proportion */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${Math.max((reward.totalValue / Math.max(totalRewardValue, 1)) * 100, 2)}%`,
                            backgroundColor: reward.color
                          }
                        ]} 
                      />
                    </View>
                    <ThemedText style={styles.progressLabel}>
                      {((reward.totalValue / Math.max(totalRewardValue, 1)) * 100).toFixed(1)}% of total value
                    </ThemedText>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="rewards" />
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
  list: { padding: 18, gap: 20 },
  
  // Filter Container
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#FFB300',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  filterBtnTextActive: {
    color: '#000',
  },

  // Summary Cards
  summaryContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
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

  // Rewards Section
  rewardsContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 16,
  },
  
  // No Data
  noDataContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },

  // Reward Cards
  rewardCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rewardColorIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 16,
  },
  rewardTitleContainer: {
    flex: 1,
  },
  rewardName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  rewardRoute: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  
  rewardDetails: {
    marginBottom: 16,
  },
  rewardDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  
  calculationRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  calculationText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textAlign: 'center',
  },
  totalValue: {
    fontSize: 18,
    color: '#4ECDC4',
    fontWeight: '900',
  },
  
  // Progress Bar
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    textAlign: 'center',
  },


});