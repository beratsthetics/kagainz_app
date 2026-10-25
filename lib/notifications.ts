import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from './supabase';
import { tx } from './i18n';

// Yerel bildirimler (dinlenme bitti; hatırlatmalar lib/reminders.ts) ve uzak bildirimler (yanıt / tepki geldi).
// Uzak bildirim için EAS proje kimliği gerekir: `npx eas init` sonrası app.json'a eklenir.

const supported = Platform.OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    // Uygulama açıkken dinlenme bildirimi gösterilmez; antrenman ekranı kendi sesini çalar.
    handleNotification: async (n) => {
      const rest = n.request.content.data?.kind === 'rest';
      return { shouldShowBanner: !rest, shouldShowList: !rest, shouldPlaySound: !rest, shouldSetBadge: false };
    },
  });
}

export async function ensurePermission(ask = true): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function scheduleRestDone(seconds: number): Promise<string | null> {
  if (!supported || !(await ensurePermission(false))) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title: tx('Dinlenme bitti'), body: tx('Sıradaki sete geç 💪'), sound: true, data: { kind: 'rest' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, seconds) },
  });
}

export async function cancelNotification(id: string | null | undefined) {
  if (supported && id) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

// Telefonun push token'ını hesaba kaydeder; sunucu (supabase/functions/push) bununla bildirim yollar.
export async function registerPushToken() {
  if (!supported || !Device.isDevice || !isSupabaseConfigured) return;
  const id = projectId();
  if (!id || !(await ensurePermission())) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Kagainz',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    // Token oturumdaki hesaba bağlanır (sunucu auth.uid() kullanır); aynı telefonda hesap değişirse taşınır.
    await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
  } catch {
    // Expo Go'da veya izin yoksa sessizce geç.
  }
}

// Bildirime dokununca ilgili ekrana git (chat, koç mesajı, form check).
export function useNotificationRouting(open: (route: string) => void) {
  useEffect(() => {
    if (!supported) return;
    const go = (r: Notifications.NotificationResponse | null) => {
      const route = r?.notification.request.content.data?.route;
      if (typeof route === 'string' && route.startsWith('/')) open(route);
    };
    Notifications.getLastNotificationResponseAsync().then(go);
    const sub = Notifications.addNotificationResponseReceivedListener(go);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
