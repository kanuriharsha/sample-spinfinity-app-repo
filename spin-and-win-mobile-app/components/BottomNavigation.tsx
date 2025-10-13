import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './themed-text';

interface BottomNavigationProps {
  activeTab: 'dashboard' | 'customers' | 'rewards' | 'reports' | 'analytics';
}

export function BottomNavigation({ activeTab }: BottomNavigationProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const navigateTo = (screen: string) => {
    switch (screen) {
      case 'dashboard':
        router.push('/dashboard');
        break;
      case 'customers':
        router.push('/customers');
        break;
      case 'rewards':
        router.push('/rewards');
        break;
      case 'reports':
        router.push('/reports');
        break;
      case 'analytics':
        router.push('/analytics');
        break;
    }
  };

  const getIconStyle = (tabName: string) => [
    styles.bottomNavIcon,
    activeTab === tabName && styles.bottomNavIconActive,
  ];

  const getLabelStyle = (tabName: string) => [
    styles.bottomNavLabel,
    activeTab === tabName && styles.bottomNavLabelActive,
  ];

  return (
    <View style={[
      styles.bottomNavBar,
      {
        paddingBottom: Math.max(insets.bottom, 8), // Use safe area insets or minimum 8px
        height: 62 + Math.max(insets.bottom - 8, 0), // Adjust height based on safe area
      }
    ]}>
      <TouchableOpacity 
        style={styles.bottomNavItem} 
        onPress={() => navigateTo('dashboard')}
      >
        <ThemedText style={getIconStyle('dashboard')}>▦</ThemedText>
        <ThemedText style={getLabelStyle('dashboard')}>Dashboard</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.bottomNavItem} 
        onPress={() => navigateTo('customers')}
      >
        <ThemedText style={getIconStyle('customers')}>👥</ThemedText>
        <ThemedText style={getLabelStyle('customers')}>Customers</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.bottomNavItem} 
        onPress={() => navigateTo('rewards')}
      >
        <ThemedText style={getIconStyle('rewards')}>🏆</ThemedText>
        <ThemedText style={getLabelStyle('rewards')}>Rewards</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.bottomNavItem} 
        onPress={() => navigateTo('reports')}
      >
        <ThemedText style={getIconStyle('reports')}>📄</ThemedText>
        <ThemedText style={getLabelStyle('reports')}>Reports</ThemedText>
      </TouchableOpacity>

      {/* Optional: Add Analytics tab if needed */}
      {activeTab === 'analytics' && (
        <TouchableOpacity 
          style={styles.bottomNavItem} 
          onPress={() => navigateTo('analytics')}
        >
          <ThemedText style={getIconStyle('analytics')}>📊</ThemedText>
          <ThemedText style={getLabelStyle('analytics')}>Analytics</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 6,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
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