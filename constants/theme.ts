// tanvogue.xyz (Kagainz Coaching) görünümü: siyah zemin, ince grid, beyaz ana buton,
// dar ve kalın büyük harf başlıklar, sayılar için mono yazı. Üstüne mavi parıltı ve renkli makro vurguları.
// Sitedeki güneş/ay düğmesi gibi açık tema da var; renkleri ekranlarda useColors() ile al.
import type { Tier } from '@/lib/tiers';

const dark = {
  background: '#08090B',
  surface: '#101114',
  surfaceAlt: '#17181C',
  surfaceHigh: '#1F2026',
  border: '#24252B',
  borderStrong: '#34353D',
  grid: 'rgba(255,255,255,0.035)',
  overlay: 'rgba(8,9,11,0.96)',
  text: '#F5F5F6',
  textMuted: '#8E8F98',
  textDim: '#5C5D66',
  silver: '#A9AAB2',
  primary: '#F5F5F6',
  primaryText: '#08090B',
  accent: '#3B82F6',
  accentBright: '#60A5FA',
  accentSoft: 'rgba(59,130,246,0.16)',
  glow: 'rgba(59,130,246,0.22)',
  success: '#4ADE80',
  successSoft: 'rgba(74,222,128,0.14)',
  danger: '#F87171',
  dangerSoft: 'rgba(248,113,113,0.14)',
  protein: '#60A5FA',
  carb: '#4ADE80',
  fat: '#FBBF24',
  water: '#38BDF8',
  gold: '#FBBF24',
  sheen: 'rgba(255,255,255,0.06)',
};

export type Palette = typeof dark;

const light: Palette = {
  background: '#F4F4F6',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F0F3',
  surfaceHigh: '#E7E7EC',
  border: '#E2E2E8',
  borderStrong: '#CBCBD3',
  grid: 'rgba(8,9,11,0.045)',
  overlay: 'rgba(244,244,246,0.96)',
  text: '#0B0C0E',
  textMuted: '#5E6069',
  textDim: '#9597A1',
  silver: '#6B6D76',
  primary: '#0B0C0E',
  primaryText: '#FFFFFF',
  accent: '#2563EB',
  accentBright: '#2563EB',
  accentSoft: 'rgba(37,99,235,0.10)',
  glow: 'rgba(37,99,235,0.14)',
  success: '#16A34A',
  successSoft: 'rgba(22,163,74,0.12)',
  danger: '#DC2626',
  dangerSoft: 'rgba(220,38,38,0.10)',
  protein: '#2563EB',
  carb: '#16A34A',
  fat: '#D97706',
  water: '#0284C7',
  gold: '#D97706',
  sheen: 'rgba(255,255,255,0)',
};

export type ThemeMode = 'dark' | 'light';
export const palettes: Record<ThemeMode, Palette> = { dark, light };

export const tierColors: Record<Tier, [string, string]> = {
  free: ['#8E8F98', '#5C5D66'],
  pro: ['#60A5FA', '#2563EB'],
  plus: ['#C4B5FD', '#7C3AED'],
  max: ['#FDE68A', '#D97706'],
};

export const fonts = {
  display: 'Oswald_700Bold',
  displayMedium: 'Oswald_600SemiBold',
  body: 'Inter_400Regular',
  bodyBold: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_500Medium',
};

export const radius = { sm: 10, md: 14, lg: 22, xl: 28 };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
