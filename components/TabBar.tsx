import type { BottomTabBarProps } from 'expo-router/tabs';
import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { QuickAdd } from '@/components/QuickAdd';
import { Text } from '@/components/T';
import { Icon, tap } from '@/components/ui';
import { translate } from '@/lib/i18n';
import { fonts } from '@/constants/theme';
import { makeStyles, useColors } from '@/lib/theme';

// Alt sekme çubuğu: zeminden ayrık, yuvarlak bir kapsül. Seçili sekme genişleyip
// adını gösterir, diğerleri sadece simge. Ortadaki + düğmesi hızlı kayıt penceresini açar.
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const colors = useColors();
  const styles = useStyles();
  const [quick, setQuick] = useState(false);
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.capsule}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused ? colors.primaryText : colors.textDim;
          const label = typeof options.title === 'string' ? options.title : route.name;
          function press() {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          }
          return (
            <Fragment key={route.key}>
              <Animated.View layout={LinearTransition.springify().damping(18).stiffness(180)} style={{ flex: focused ? 2 : 1 }}>
                <Pressable
                  onPress={press}
                  onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={label}
                  style={[styles.tab, focused && styles.tabActive]}>
                  {options.tabBarIcon?.({ focused, color, size: 22 })}
                  {focused && (
                    <Animated.View entering={FadeIn.duration(220)}>
                      <Text numberOfLines={1} style={[styles.label, { color }]}>
                        {label}
                      </Text>
                    </Animated.View>
                  )}
                </Pressable>
              </Animated.View>
              {index === 1 && (
                <Pressable
                  onPress={() => {
                    tap();
                    setQuick(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={translate('Hızlı kayıt')}
                  style={styles.plus}>
                  <Icon name={{ ios: 'plus', android: 'add', web: 'add' }} size={26} color={colors.background} />
                </Pressable>
              )}
            </Fragment>
          );
        })}
      </View>
      <QuickAdd visible={quick} onClose={() => setQuick(false)} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { paddingHorizontal: 14, paddingTop: 8, backgroundColor: colors.background },
  capsule: {
    flexDirection: 'row',
    gap: 4,
    padding: 6,
    borderRadius: 30,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  tab: { height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8 },
  tabActive: { backgroundColor: colors.primary },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.4 },
  plus: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
}));
