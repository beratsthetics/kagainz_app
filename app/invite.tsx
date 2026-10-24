import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import { Text } from '@/components/T';

import { Body, Button, Card, EmptyState, GradientCard, Input, Label, Mono, Reveal, Row, Screen } from '@/components/ui';
import { fonts, spacing, tierColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { locale, tx } from '@/lib/i18n';

// Davet kodu = kullanıcı adı. Davetle gelen biri ücretli pakete geçince davet edene 1 hafta Pro (0008).
export default function InviteScreen() {
  const colors = useColors();
  const { session, profile, refreshProfile } = useAuth();
  const [counts, setCounts] = useState<{ joined: number; paid: number } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session || !isSupabaseConfigured) return;
    supabase.rpc('my_invites').then(({ data }) => setCounts(((data ?? []) as { joined: number; paid: number }[])[0] ?? { joined: 0, paid: 0 }));
  }, [session]);

  if (!session || !profile?.username) {
    return (
      <Screen edges={[]}>
        <EmptyState icon={{ ios: 'gift.fill', android: 'redeem', web: 'redeem' }} title="Davet kodun" body="Davet kodun kullanıcı adındır. Önce bir kullanıcı adı seç." />
        <Button title={session ? 'Kullanıcı adı seç' : 'Giriş yap'} arrow onPress={() => router.push(session ? '/auth/username' : '/auth')} />
      </Screen>
    );
  }

  const myCode = profile.username;
  const bonus = profile.bonus_until && new Date(profile.bonus_until).getTime() > Date.now() ? new Date(profile.bonus_until) : null;
  const canRedeem = !profile.invited_by && profile.created_at != null && Date.now() - new Date(profile.created_at).getTime() < 14 * 86400000;

  async function share() {
    await Share.share({ message: tx('Kagainz\'de birlikte antrenman yapalım 💪 Kayıt olurken davet kodumu gir: {0}\nhttps://tanvogue.xyz', [myCode]) }).catch(() => {});
  }

  async function copy() {
    await Clipboard.setStringAsync(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function redeem() {
    setBusy(true);
    setNotice(null);
    const { data, error } = await supabase.rpc('redeem_invite', { code });
    setBusy(false);
    if (error) {
      return setNotice({
        ok: false,
        text: /redeem_invite|schema cache/.test(error.message) ? "Sunucu güncel değil: 0008 SQL dosyasını Supabase'de çalıştır." : error.message,
      });
    }
    setNotice({ ok: true, text: tx('@{0} davetiyle katıldın. Hoş geldin!', [data]) });
    refreshProfile();
  }

  return (
    <Screen edges={[]}>
      <Reveal index={0}>
        <GradientCard colors={tierColors.pro}>
          <Label>Davet kodun</Label>
          <Text style={{ fontFamily: fonts.display, fontSize: 44, color: colors.text, letterSpacing: 1 }}>{myCode.toLocaleUpperCase(locale())}</Text>
          <Body style={{ fontSize: 14 }}>
            Arkadaşın kayıt olurken bu kodu girsin. Ücretli bir pakete (Pro, Plus ya da Max) geçtiğinde sana 1 hafta Pro hediye.
          </Body>
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button title="Paylaş" arrow icon={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }} onPress={share} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title={copied ? 'Kopyalandı' : 'Kopyala'} variant="outline" icon={{ ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }} onPress={copy} />
            </View>
          </Row>
        </GradientCard>
      </Reveal>

      <Reveal index={1}>
        <Row gap={spacing.sm}>
          <Count label="Katılan" value={counts?.joined} />
          <Count label="Pakete geçen" value={counts?.paid} />
          <Count label="Hediye hafta" value={counts?.paid} />
        </Row>
      </Reveal>

      {bonus && (
        <Reveal index={2}>
          <Card style={{ borderColor: colors.accent }}>
            <Label>Hediye Pro</Label>
            <Body style={{ fontSize: 14.5 }}>{tx('{0} tarihine kadar Pro özellikler açık.', [bonus.toLocaleDateString(locale(), { day: 'numeric', month: 'long' })])}</Body>
          </Card>
        </Reveal>
      )}

      {canRedeem && (
        <Reveal index={3}>
          <Card>
            <Label>Seni biri mi davet etti?</Label>
            <Body muted style={{ fontSize: 13 }}>
              Kodu kayıttan sonraki 14 gün içinde bir kez girebilirsin.
            </Body>
            <Input value={code} onChangeText={setCode} placeholder="Davet kodu" autoCapitalize="none" autoCorrect={false} />
            <Button title="Kodu kullan" variant="outline" loading={busy} disabled={code.trim().length < 3} onPress={redeem} />
          </Card>
        </Reveal>
      )}
      {notice && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: notice.ok ? colors.success : colors.danger }}>{notice.text}</Text>}
    </Screen>
  );
}

function Count({ label, value }: { label: string; value: number | string | undefined }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 2 }}>
      <Mono style={{ fontSize: 22, color: colors.text }}>{value ?? '–'}</Mono>
      <Label>{label}</Label>
    </View>
  );
}
