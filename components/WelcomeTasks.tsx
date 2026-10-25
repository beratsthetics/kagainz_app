import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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

// TikTok logosu (Simple Icons, CC0): siyah kare içinde mavi ve kırmızı gölgeli beyaz nota.
const TIKTOK = 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z';

function TikTokLogo({ size = 40 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.24, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size * 0.6} height={size * 0.6} viewBox="-1 -1 26 26">
        <Path d={TIKTOK} fill="#25F4EE" transform="translate(-0.9 -0.9)" />
        <Path d={TIKTOK} fill="#FE2C55" transform="translate(0.9 0.9)" />
        <Path d={TIKTOK} fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

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
            <TikTokLogo />
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
