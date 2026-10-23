// tanvogue.xyz (Kagainz Coaching) görünümü: siyah zemin, ince grid, beyaz ana buton,
// dar ve kalın büyük harf başlıklar, sayılar için mono yazı. Üstüne mavi parıltı ve renkli makro vurguları.
import type { Tier } from '@/lib/tiers';

export const colors = {
  background: '#08090B',
  surface: '#101114',
  surfaceAlt: '#17181C',
  surfaceHigh: '#1F2026',
  border: '#24252B',
  borderStrong: '#34353D',
  grid: 'rgba(255,255,255,0.035)',
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
  protein: '#60A5FA',
  carb: '#4ADE80',
  fat: '#FBBF24',
};

export const tierColors: Record<Tier, [string, string]> = {
  free: ['#5C5D66', '#34353D'],
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
