import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { Icon, PressScale, ProgressBar, Row } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { GLASS_ML } from '@/lib/goals';
import { useDaily } from '@/lib/daily';
import { useProgress } from '@/lib/progress';
import { useColors, useTheme } from '@/lib/theme';
import { locale, tx } from '@/lib/i18n';

// Sitedeki gibi güneş/ay düğmesi.
export function ThemeToggle() {
  const { mode, toggle, colors } = useTheme();
  return (
    <PressScale
      onPress={toggle}
      style={{
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon
        name={
          mode === 'dark'
            ? { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' }
            : { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' }
        }
        size={18}
        color={colors.text}
      />
    </PressScale>
  );
}

export function StreakPill() {
  const colors = useColors();
  const { stats } = useProgress();
  const on = stats.streak > 0;
  return (
    <PressScale
      onPress={() => router.push('/badges')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
      <Text style={{ fontSize: 12 }}>🔥</Text>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: on ? colors.text : colors.textMuted }}>{tx('{0} gün', [stats.streak])}</Text>
    </PressScale>
  );
}

// Bardak bardak su takibi.
export function WaterTracker() {
  const colors = useColors();
  const { water, waterGoal, setWater } = useDaily();
  const glasses = Math.max(waterGoal, water);
  // Bardaklar ve + düğmesi tek satıra sığsın diye bardak genişliği satıra göre küçülür.
  const [rowWidth, setRowWidth] = useState(0);
  const glassWidth = rowWidth ? Math.max(18, Math.min(26, Math.floor((rowWidth - 34 - 6 * glasses) / glasses))) : 26;
  return (
    <View style={{ gap: spacing.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={8}>
          <Icon name={{ ios: 'drop.fill', android: 'water_drop', web: 'water_drop' }} size={16} color={colors.water} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textMuted }}>Su</Text>
        </Row>
        <Text style={{ fontFamily: fonts.mono, fontSize: 12.5, color: colors.textMuted }}>
          <Text style={{ color: colors.text }}>{((water * GLASS_ML) / 1000).toLocaleString(locale())} L</Text> /{' '}
          {((waterGoal * GLASS_ML) / 1000).toLocaleString(locale())} L
        </Text>
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
        {Array.from({ length: glasses }, (_, i) => {
          const full = i < water;
          return (
            <PressScale
              key={i}
              onPress={() => setWater(full && i === water - 1 ? i : i + 1)}
              style={{
                width: glassWidth,
                height: 34,
                borderRadius: 7,
                borderWidth: 1.5,
                borderColor: full ? colors.water : colors.borderStrong,
                backgroundColor: full ? `${colors.water}33` : 'transparent',
                justifyContent: 'flex-end',
                overflow: 'hidden',
              }}>
              {full && <View style={{ height: '70%', backgroundColor: colors.water, opacity: 0.85 }} />}
            </PressScale>
          );
        })}
        <PressScale
          onPress={() => setWater(water + 1)}
          style={{
            width: 34,
            height: 34,
            borderRadius: radius.sm,
            backgroundColor: colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name={{ ios: 'plus', android: 'add', web: 'add' }} size={16} color={colors.water} />
        </PressScale>
      </View>
      <ProgressBar value={water / waterGoal} color={colors.water} height={4} />
    </View>
  );
}

export function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const colors = useColors();
  return (
    <View style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textMuted }}>
          {label}
        </Text>
        <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.text }}>
          {Math.round(value)}
          <Text style={{ color: colors.textDim }}>/{goal}g</Text>
        </Text>
      </Row>
      <ProgressBar value={value / goal} color={color} height={5} />
    </View>
  );
}

export function MacroLine({ p, c, f, kcal }: { p: number; c: number; f: number; kcal?: number }) {
  const colors = useColors();
  return (
    <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted }}>
      {kcal != null ? tx('{0} kcal · ', [kcal]) : ''}
      <Text style={{ color: colors.protein }}>P {Math.round(p)}</Text> · <Text style={{ color: colors.carb }}>K {Math.round(c)}</Text> ·{' '}
      <Text style={{ color: colors.fat }}>Y {Math.round(f)}</Text>
    </Text>
  );
}
