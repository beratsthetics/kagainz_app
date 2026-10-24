import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GridBackground, Icon, PressScale, Row } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { makeStyles, useColors } from '@/lib/theme';

const STEPS = 3;

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  const colors = useColors();
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 28 : 8, { duration: 300 }),
    backgroundColor: withTiming(active || done ? colors.text : colors.borderStrong, { duration: 300 }),
  }));
  return <Animated.View style={[{ height: 8, borderRadius: 4 }, style]} />;
}

// Giriş/kayıt adımlarının ortak çerçevesi: geri butonu, adım göstergesi, alt butonlar.
export function AuthShell({
  step,
  steps = STEPS,
  children,
  footer,
  onBack,
}: {
  step?: number;
  steps?: number;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
}) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <GridBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.top}>
            <PressScale onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} style={styles.back}>
              <Icon name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={20} />
            </PressScale>
            {step !== undefined && (
              <Row gap={6}>
                {Array.from({ length: steps }, (_, i) => (
                  <StepDot key={i} active={i === step} done={i < step} />
                ))}
              </Row>
            )}
            <View style={{ width: 44 }} />
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer && <View style={styles.footer}>{footer}</View>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
}));
