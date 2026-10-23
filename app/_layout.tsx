import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { Oswald_600SemiBold, Oswald_700Bold } from '@expo-google-fonts/oswald';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { colors, fonts } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth';
import { DailyProvider } from '@/lib/daily';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    border: colors.border,
    text: colors.text,
    primary: colors.text,
  },
};

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
    <AuthProvider>
      <DailyProvider>
        <ThemeProvider value={theme}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTitleStyle: { fontFamily: fonts.display, color: colors.text },
              headerTintColor: colors.text,
              contentStyle: { backgroundColor: colors.background },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
            <Stack.Screen name="chat/[room]" options={{ title: 'CHAT' }} />
            <Stack.Screen name="plans" options={{ headerShown: false, presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </DailyProvider>
    </AuthProvider>
  );
}
