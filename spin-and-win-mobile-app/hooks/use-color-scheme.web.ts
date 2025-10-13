import { useEffect, useState, useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

type ThemePref = 'light' | 'dark' | 'system';
const STORE_KEY = '__APP_THEME_PREF__';

const store = {
  pref: (globalThis as any)[STORE_KEY] as ThemePref | undefined,
  listeners: new Set<() => void>(),
};
function emit() {
  for (const l of store.listeners) l();
}
export function setThemePreference(pref: ThemePref) {
  (globalThis as any)[STORE_KEY] = pref;
  store.pref = pref;
  emit();
}
export function getThemePreference(): ThemePref {
  return store.pref || 'system';
}
function subscribe(cb: () => void) {
  store.listeners.add(cb);
  return () => store.listeners.delete(cb);
}
function getSnapshot(system: 'light' | 'dark' | null) {
  const pref = store.pref || 'system';
  if (pref === 'system') return system;
  return pref;
}

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const system = useRNColorScheme();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const theme = useSyncExternalStore(subscribe, () => getSnapshot(system), () => getSnapshot(system));

  if (hasHydrated) {
    return theme;
  }
  return 'light';
}
