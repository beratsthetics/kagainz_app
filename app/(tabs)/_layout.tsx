import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { Platform, type ColorValue } from 'react-native';

import { tap } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';

function icon(name: SymbolViewProps['name']) {
  return ({ color }: { color: ColorValue }) => <SymbolView name={name} tintColor={color} size={24} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenListeners={{ tabPress: tap }}
      screenOptions={{
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: 'rgba(8,9,11,0.96)',
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 9.5, letterSpacing: 0.2, lineHeight: 14 },
        // Her ekranın kendi büyük başlığı var, üst bar gerekmiyor.
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'BUGÜN', tabBarIcon: icon({ ios: 'house.fill', android: 'home', web: 'home' }) }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'TOPLULUK',
          tabBarIcon: icon({ ios: 'bubble.left.and.bubble.right.fill', android: 'forum', web: 'forum' }),
        }}
      />
      <Tabs.Screen
        name="macros"
        options={{ title: 'MAKRO', tabBarIcon: icon({ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }) }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: 'ANTRENMAN',
          tabBarIcon: icon({ ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' }),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFİL',
          tabBarIcon: icon({ ios: 'person.crop.circle.fill', android: 'person', web: 'person' }),
        }}
      />
    </Tabs>
  );
}
