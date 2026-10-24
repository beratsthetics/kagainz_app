import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { Oswald_600SemiBold, Oswald_700Bold } from '@expo-google-fonts/oswald';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import 'react-native-reanimated';

import { AppSplash } from '@/components/AppSplash';
import { fonts } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CelebrateProvider } from '@/lib/celebrate';
import { DailyProvider } from '@/lib/daily';
import { useLeaderboardSync } from '@/lib/leaderboard';
import { useNotificationRouting } from '@/lib/notifications';
import { ProgressProvider } from '@/lib/progress';
import { ThemeModeProvider, useTheme } from '@/lib/theme';
import { useWidgetSync } from '@/lib/widget';
import { WorkoutProvider } from '@/lib/workouts';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Oswald_600SemiBold,
    Oswald_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeModeProvider>
      <AuthProvider>
        <DailyProvider>
          <CelebrateProvider>
            <ProgressProvider>
              <WorkoutProvider>
                <Navigation />
              </WorkoutProvider>
            </ProgressProvider>
          </CelebrateProvider>
        </DailyProvider>
      </AuthProvider>
    </ThemeModeProvider>
  );
}

function Navigation() {
  const { mode, colors } = useTheme();
  const { loading } = useAuth();
  useLeaderboardSync();
  useWidgetSync();
  useNotificationRouting((route) => router.push(route as Href));
  const navTheme = useMemo(() => {
    const base = mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.background,
        border: colors.border,
        text: colors.text,
        primary: colors.text,
      },
    };
  }, [mode, colors]);

  const modal = { headerShown: false, presentation: 'modal' } as const;
  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontFamily: fonts.display, color: colors.text },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="chat/[room]" options={{ title: 'CHAT' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="plans" options={modal} />
        <Stack.Screen name="goals" options={modal} />
        <Stack.Screen name="food/search" options={modal} />
        <Stack.Screen name="food/scan" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="food/photo" options={modal} />
        <Stack.Screen name="workout/index" options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="workout/summary" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="library" options={{ title: 'HAREKETLER' }} />
        <Stack.Screen name="exercise/[id]" options={{ title: '' }} />
        <Stack.Screen name="progress" options={{ title: 'İLERLEME' }} />
        <Stack.Screen name="badges" options={{ title: 'ROZETLER' }} />
        <Stack.Screen name="meal-plan" options={{ title: 'YEMEK PLANI' }} />
        <Stack.Screen name="challenges" options={{ title: 'MEYDAN OKUMA' }} />
        <Stack.Screen name="form-check/index" options={{ title: 'FORM CHECK' }} />
        <Stack.Screen name="form-check/[id]" options={{ title: 'FORM CHECK' }} />
        <Stack.Screen name="dm/[member]" options={{ title: 'KOÇUN' }} />
        <Stack.Screen name="coach/index" options={{ title: 'KOÇ PANELİ' }} />
        <Stack.Screen name="coach/member/[id]" options={{ title: 'ÜYE' }} />
        <Stack.Screen name="week" options={{ title: 'HAFTALIK ÖZET' }} />
        <Stack.Screen name="share" options={{ title: 'PAYLAŞ', presentation: 'modal' }} />
        <Stack.Screen name="leaderboard" options={{ title: 'SIRALAMA' }} />
        <Stack.Screen name="checkin/index" options={{ title: 'CHECK-IN' }} />
        <Stack.Screen name="checkin/[id]" options={{ title: 'CHECK-IN' }} />
        <Stack.Screen name="u/[username]" options={{ title: '' }} />
        <Stack.Screen name="friends" options={{ title: 'ARKADAŞLAR' }} />
        <Stack.Screen name="invite" options={{ title: 'DAVET ET' }} />
      </Stack>
      <AppSplash ready={!loading} />
    </ThemeProvider>
  );
}
