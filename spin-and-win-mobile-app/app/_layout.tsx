import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme, getThemePreference, setThemePreference } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Load persisted theme pref
    (async () => {
      const saved = await AsyncStorage.getItem('theme_pref');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemePreference(saved as any);
      }
    })();
  }, []);

  useEffect(() => {
    // Persist on change
    const pref = getThemePreference();
    AsyncStorage.setItem('theme_pref', String(pref)).catch(() => {});
  }, [colorScheme]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ title: 'Results Analytics', headerShown: false }} />
        <Stack.Screen name="customers" options={{ headerShown: false }} />
        <Stack.Screen name="rewards" options={{ headerShown: false }} />
        <Stack.Screen name="reports" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

