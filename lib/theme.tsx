import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { palettes, type Palette, type ThemeMode } from '@/constants/theme';

import { useStored } from './store';

type Pref = ThemeMode | 'system';
type ThemeState = { mode: ThemeMode; pref: Pref; colors: Palette; setPref: (p: Pref) => void; toggle: () => void };

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  // Varsayılan koyu: marka görünümü bu. Kullanıcı profilden açık temaya geçebilir.
  const [pref, setPref] = useStored<Pref>('theme', 'dark');
  const mode: ThemeMode = pref === 'system' ? (system === 'light' ? 'light' : 'dark') : pref;
  const value = useMemo<ThemeState>(
    () => ({
      mode,
      pref,
      colors: palettes[mode],
      setPref,
      toggle: () => setPref(mode === 'dark' ? 'light' : 'dark'),
    }),
    [mode, pref, setPref],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme, ThemeModeProvider içinde kullanılmalı');
  return ctx;
}

export function useColors() {
  return useTheme().colors;
}

// Temaya bağlı stil: makeStyles((c) => ({ kart: { backgroundColor: c.surface } })) → useStyles()
type Styles = Parameters<typeof StyleSheet.create>[0];

export function makeStyles<S extends Styles>(factory: (c: Palette) => S & Styles) {
  const cache = new Map<Palette, Readonly<S>>();
  return function useStyles(): Readonly<S> {
    const c = useColors();
    let styles = cache.get(c);
    if (!styles) {
      styles = StyleSheet.create<S>(factory(c));
      cache.set(c, styles);
    }
    return styles;
  };
}
