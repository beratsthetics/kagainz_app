import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { colors, fonts } from '@/constants/theme';

function icon(name: SymbolViewProps['name']) {
  return ({ color }: { color: ColorValue }) => <SymbolView name={name} tintColor={color} size={24} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.6, lineHeight: 14 },
        // Her ekranın kendi büyük başlığı var, üst bar gerekmiyor.
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'CHAT',
          tabBarIcon: icon({ ios: 'bubble.left.and.bubble.right', android: 'forum', web: 'forum' }),
        }}
      />
      <Tabs.Screen
        name="macros"
        options={{
          title: 'MAKRO',
          tabBarIcon: icon({ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }),
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: 'ANTRENMAN',
          tabBarIcon: icon({ ios: 'dumbbell', android: 'fitness_center', web: 'fitness_center' }),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFİL',
          tabBarIcon: icon({ ios: 'person.crop.circle', android: 'person', web: 'person' }),
        }}
      />
    </Tabs>
  );
}
