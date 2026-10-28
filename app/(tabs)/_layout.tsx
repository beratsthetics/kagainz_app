import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { type ColorValue } from 'react-native';

import { TabBar } from '@/components/TabBar';
import { tap } from '@/components/ui';
import { translate } from '@/lib/i18n';

function icon(name: SymbolViewProps['name']) {
  return ({ color }: { color: ColorValue }) => <SymbolView name={name} tintColor={color} size={22} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenListeners={{ tabPress: tap }}
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        // Her ekranın kendi büyük başlığı var, üst bar gerekmiyor.
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: translate('Bugün'), tabBarIcon: icon({ ios: 'house.fill', android: 'home', web: 'home' }) }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: translate('Topluluk'),
          tabBarIcon: icon({ ios: 'bubble.left.and.bubble.right.fill', android: 'forum', web: 'forum' }),
        }}
      />
      <Tabs.Screen
        name="macros"
        options={{ title: translate('Makro'), tabBarIcon: icon({ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }) }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: translate('Antrenman'),
          tabBarIcon: icon({ ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' }),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: translate('Profil'),
          tabBarIcon: icon({ ios: 'person.crop.circle.fill', android: 'person', web: 'person' }),
        }}
      />
    </Tabs>
  );
}
