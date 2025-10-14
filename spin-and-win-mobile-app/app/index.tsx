import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View, Modal, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const bg = useThemeColor({}, 'background');

  const apiUrl = useMemo(() => {
    // Try environment variable first
    if (process.env.EXPO_PUBLIC_API_URL) {
      return process.env.EXPO_PUBLIC_API_URL;
    }
    
    // Try Constants for development
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      const actualHost = Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1') 
        ? '10.0.2.2' 
        : host;
      return `http://${actualHost}:4000`;
    }
    
    // Platform-specific fallbacks
    return Platform.select({
      android: 'http://10.0.2.2:4000',
      ios: 'http://127.0.0.1:4000',
      default: 'http://localhost:4000',
    });
  }, []);

  const goDashboardIfAuthed = useCallback(async () => {
    const creds = await AsyncStorage.getItem('auth_creds');
    if (creds) router.replace('/dashboard');
  }, [router]);

  useEffect(() => {
    goDashboardIfAuthed();
  }, [goDashboardIfAuthed]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const onLogin = async () => {
    if (!username || !password) {
      Alert.alert('Missing Information', 'Please enter both username and password.');
      return;
    }
    
    console.log('Attempting login to:', apiUrl);
    
    try {
      setSubmitting(true);
      const res = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Backend also accepts X-User/X-Password; body is enough for /api/login
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Login failed');
      }
      await AsyncStorage.setItem('auth_creds', JSON.stringify({ username, password }));
      await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));
      router.replace('/dashboard');
    } catch (e: unknown) {
      console.error('Login error:', e);
      const errorMessage = (e as Error)?.message || 'Please check your connection and try again.';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Modal state for legal docs
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#000' }]}>
      <LinearGradient
        colors={['#1A1A1A', '#0A0A0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientOverlay}
      />
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.headerWrap}>
          {/* <ThemedText style={styles.title}>PEH Spinfinity</ThemedText> */}
          <ThemedText style={styles.subtitle}>PEH Spinfinity Analytics</ThemedText>
          <ThemedText style={styles.subtitle1}>Track. Analyze. Grow.</ThemedText>

        </View>

        {/* Card */}
        <View style={styles.formContainer}>
          {/* Username */}
          <View style={styles.inputGroup}>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <ThemedText style={styles.iconText}>👤</ThemedText>
              </View>
              <TextInput
                placeholder="Username"
                placeholderTextColor="rgba(255,255,255,0.4)"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
                style={styles.input}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <ThemedText style={styles.iconText}>🔒</ThemedText>
              </View>
              <TextInput
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.4)"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                style={styles.input}
              />
              <TouchableOpacity
                onPress={togglePasswordVisibility}
                style={styles.eyeIcon}
              >
                <ThemedText style={styles.iconText}>
                  {showPassword ? '🙈' : '👁️'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.loginButton, submitting && styles.loginButtonDisabled]}
            onPress={onLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <ThemedText style={styles.loginButtonText}>Log In</ThemedText>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerSubText}>Powered by PEH Network Hub</ThemedText>
          <ThemedText style={styles.footerSubText1}>Turning Spins into insights</ThemedText>
          <ThemedText style={styles.footerText}>Analytics Dashboard Version 1.0</ThemedText>

          {/* Replaced inline Linking with modal-triggering underlined links */}
          <View style={styles.footerAgreement}>
            <Text style={styles.footerAgreementText}>
              By tapping I accept the {''}
              <Text style={styles.linkText} onPress={() => setShowTerms(true)}>Terms of Service</Text>
              {' '} & {' '}
              <Text style={styles.linkText} onPress={() => setShowPrivacy(true)}>Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Terms Modal */}
      <Modal visible={showTerms} transparent animationType="fade" onRequestClose={() => setShowTerms(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Terms of Service</ThemedText>
              <TouchableOpacity onPress={() => setShowTerms(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <ThemedText style={styles.modalClose}>✕</ThemedText>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator
              persistentScrollbar
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              <ThemedText style={styles.modalText}>
                {/* ...Your Terms of Service content goes here... */}
                These Terms of Service govern your use of the PEH Spinfinity Analytics application.
              </ThemedText>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal visible={showPrivacy} transparent animationType="fade" onRequestClose={() => setShowPrivacy(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Privacy Policy</ThemedText>
              <TouchableOpacity onPress={() => setShowPrivacy(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <ThemedText style={styles.modalClose}>✕</ThemedText>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator
              persistentScrollbar
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              <ThemedText style={styles.modalText}>
                {/* ...Your Privacy Policy content goes here... */}
                This Privacy Policy describes how data is collected and processed in PEH Spinfinity Analytics.
              </ThemedText>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  headerWrap: {
    alignItems: 'center',
    marginBottom: 60,
  },
// In the styles object
// In the styles object
title: {
  fontSize: 27,
  // **CHANGE THIS LINE**
  // marginBottom:10,
  fontWeight: '800', // Changed from '900' to '800' (or 'bold')
  color: '#FF9500',
  letterSpacing: 0,
  textAlign: 'center',
  paddingHorizontal: 5, 
  borderWidth: 0,
  borderColor: 'transparent',
},
subtitle1: {
  top: -70,
  fontSize: 14,
  color: '#FF9500',
  marginTop: 4,
  fontWeight: '400',
},
  subtitle: {
    top: -70,
    fontSize: 27,
    color: '#FF9500',
    marginTop: 8,
    fontWeight: '900',
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40,40,40,0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(60,60,60,0.6)',
    overflow: 'hidden',
  },
  inputIcon: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  iconText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#FFFFFF',
    paddingRight: 16,
    fontWeight: '500',
  },
  eyeIcon: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loginButton: {
    backgroundColor: '#FF9500',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: { 
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  loginButtonText: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#000',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    bottom: 50,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '400',
  },
  footerText1: {
    bottom: 119,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '400',
  },
  footerSubText: {
    top: 150,
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  footerSubText1: {
    top: 105,
    marginTop: 6,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  // New: agreement row + link styles
  footerAgreement: {
    marginTop: 8,
  },
  footerAgreementText: {
    bottom: 119, // keep close to existing layout offsets
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
    textAlign: 'center',
  },
  linkText: {
    textDecorationLine: 'underline',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '80%',
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#fff' },
  modalClose: { fontSize: 18, color: '#fff' },
  modalBody: { paddingHorizontal: 16, paddingVertical: 12 },
  modalText: { color: '#E5E7EB', fontWeight: '600', lineHeight: 20, fontSize: 13 },
});
