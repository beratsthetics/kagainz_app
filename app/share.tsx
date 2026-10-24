import * as Sharing from 'expo-sharing';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/T';
import { captureRef } from 'react-native-view-shot';

import { CARD_H, CARD_W, ShareCard, type CardData, type CardStyle } from '@/components/ShareCard';
import { Body, Button, Segmented } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useDaily } from '@/lib/daily';
import { BADGES, useProgress } from '@/lib/progress';
import { makeStyles } from '@/lib/theme';
import { useWeekSummary } from '@/lib/week';
import { useWorkouts, workoutMeta } from '@/lib/workouts';
import { translate } from '@/lib/i18n';

// Hikâye kartı: kind=day (bugün), kind=workout&id=..., kind=week&offset=0|-1.
export default function ShareScreen() {
  const styles = useStyles();
  const { kind = 'day', id, offset } = useLocalSearchParams<{ kind?: 'day' | 'workout' | 'week' | 'badge'; id?: string; offset?: string }>();
  const { width, height } = useWindowDimensions();
  const { profile } = useAuth();
  const { totals, goals, water, waterGoal } = useDaily();
  const { stats, unlocked } = useProgress();
  const { history } = useWorkouts();
  const week = useWeekSummary(Number(offset ?? 0) || 0);
  const [variant, setVariant] = useState<CardStyle>('dark');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const card = useRef<any>(null);

  const data = useMemo<CardData | null>(() => {
    const username = profile?.username;
    if (kind === 'workout') {
      const s = history.find((x) => x.id === id) ?? history.at(-1);
      return s ? { kind, date: new Date(s.startedAt), meta: workoutMeta(s), streak: stats.streak, username } : null;
    }
    if (kind === 'week') return week ? { kind, week, username } : null;
    if (kind === 'badge') {
      const b = BADGES.find((x) => x.id === id);
      return b && unlocked[b.id]
        ? { kind, date: new Date(unlocked[b.id]), emoji: b.emoji, title: b.title, description: b.description, earned: BADGES.filter((x) => unlocked[x.id]).length, total: BADGES.length, username }
        : null;
    }
    return { kind: 'day', date: new Date(), totals, goals, water, waterGoal, streak: stats.streak, username };
  }, [kind, id, history, week, totals, goals, water, waterGoal, stats.streak, unlocked, profile?.username]);

  const scale = Math.min((width - spacing.lg * 2) / CARD_W, (height - 300) / CARD_H, 1.2);

  async function share() {
    if (!card.current) return;
    setBusy(true);
    setError(null);
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1, width: 1080, height: 1920, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) throw new Error('Bu cihazda paylaşım kullanılamıyor.');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Hikâyende paylaş' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Görsel oluşturulamadı.');
    }
    setBusy(false);
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: translate('PAYLAŞ') }} />
      <View style={styles.previewArea}>
        {data ? (
          <View style={{ width: CARD_W * scale, height: CARD_H * scale }}>
            <View style={{ width: CARD_W, height: CARD_H, transform: [{ scale }], transformOrigin: 'top left' }}>
              <ShareCard ref={card} data={data} variant={variant} />
            </View>
          </View>
        ) : (
          <Body muted>{kind === 'workout' ? 'Paylaşılacak antrenman bulunamadı.' : kind === 'badge' ? 'Bu rozet henüz kazanılmadı.' : 'Hazırlanıyor...'}</Body>
        )}
      </View>
      <View style={styles.controls}>
        <Segmented
          options={[
            { value: 'dark', label: 'Koyu' },
            { value: 'blue', label: 'Mavi' },
            { value: 'light', label: 'Açık' },
          ]}
          value={variant}
          onChange={setVariant}
        />
        {Platform.OS === 'web' ? (
          <Body muted style={{ textAlign: 'center', fontSize: 13 }}>
            Görsel olarak paylaşmak için uygulamayı telefondan aç.
          </Body>
        ) : (
          <Button title="Hikâyede paylaş" arrow onPress={share} loading={busy} disabled={!data} />
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        <Button title="Kapat" variant="ghost" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.background },
  previewArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  controls: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger, textAlign: 'center' },
}));
