import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { Body, Button, Row, Sheet } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useCelebrate } from '@/lib/celebrate';
import { useStored } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';

// Hoş geldin görevleri (0017): yeni üye TikTok hesaplarımızı takip edince 3 gün Pro alır.
// TikTok takibi doğrulayamıyoruz; linki açmak görevi tamamlar. Ödülü sunucu hesap başına bir kez verir.
const TASKS = [
  { key: 'tiktok_beratsthetics', handle: '@beratsthetics', url: 'https://www.tiktok.com/@beratsthetics' },
  { key: 'tiktok_kagaizz', handle: '@kagaizz', url: 'https://www.tiktok.com/@kagaizz' },
];

const DELAY_MS = 10_000;
const WINDOW_DAYS = 7;

// "Sonra" denince bu oturumda bir daha açılmaz; uygulama yeniden açılınca tekrar sorar.
let dismissed = false;

export function WelcomeTasks() {
  const colors = useColors();
  const celebrate = useCelebrate();
  const { profile, refreshProfile } = useAuth();
  const [done, setDone] = useStored<string[]>('welcomeTasks', []);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // welcome_claimed sütunu yoksa (0017 çalışmamışsa) undefined gelir ve ekran açılmaz.
  const eligible =
    profile?.welcome_claimed === false &&
    profile.tier === 'free' &&
    !!profile.created_at &&
    Date.now() - new Date(profile.created_at).getTime() < WINDOW_DAYS * 86400000;

  useEffect(() => {
    if (!eligible || dismissed) return;
    const t = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(t);
  }, [eligible]);

  const allDone = TASKS.every((t) => done.includes(t.key));

  function follow(task: (typeof TASKS)[number]) {
    Linking.openURL(task.url).catch(() => {});
    setDone((prev) => (prev.includes(task.key) ? prev : [...prev, task.key]));
  }

  function later() {
    dismissed = true;
    setOpen(false);
  }

  async function claim() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc('claim_welcome_reward');
    setBusy(false);
    if (err) return setError(err.message);
    await refreshProfile();
    setOpen(false);
    celebrate({ title: '3 gün Pro senin!', subtitle: 'Programlar, yemek planı ve Pro chat açıldı.', emoji: '🎁' });
  }

  if (!eligible) return null;

  return (
    <Sheet visible={open} onClose={later} title="Hoş geldin görevleri">
      <Body muted style={{ fontSize: 14 }}>
        İki görevi tamamla, 3 gün ücretsiz Pro kazan.
      </Body>
      {TASKS.map((task) => {
        const ok = done.includes(task.key);
        return (
          <Row
            key={task.key}
            gap={spacing.sm}
            style={{ padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: ok ? colors.success : colors.border, backgroundColor: ok ? colors.successSoft : colors.surfaceHigh }}>
            <Text style={{ fontSize: 26 }}>{ok ? '✅' : '🎵'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text }}>TikTok'ta takip et</Text>
              <Text raw style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>
                {task.handle}
              </Text>
            </View>
            <Button title={ok ? 'Açıldı' : 'Takip et'} variant={ok ? 'outline' : 'primary'} onPress={() => follow(task)} />
          </Row>
        );
      })}
      {error && <Text style={{ fontFamily: fonts.bodyBold, color: colors.danger }}>{error}</Text>}
      <Button title="3 gün Pro'yu al" arrow loading={busy} disabled={!allDone} onPress={claim} />
      <Button title="Sonra" variant="ghost" onPress={later} />
    </Sheet>
  );
}
