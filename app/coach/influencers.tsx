import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import { Text } from '@/components/T';

import { Body, Button, Card, EmptyState, Input, Label, Mono, PressScale, Reveal, Row, Screen, Segmented, SkeletonList, Stat } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { refLink, toCode } from '@/lib/refcode';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { tx } from '@/lib/i18n';

type RefStat = {
  code: string;
  name: string;
  bonus_days: number;
  active: boolean;
  created_at: string;
  joined: number;
  joined_30d: number;
  paid: number;
  paying: number;
};

const BONUS = ['0', '7', '14'] as const;

// Koç paneli: influencer kodları ve her kodla gelenlerin sayısı (0014).
export default function InfluencersScreen() {
  const colors = useColors();
  const { isCoach } = useAuth();
  const [rows, setRows] = useState<RefStat[] | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [codeEdited, setCodeEdited] = useState(false);
  const [bonus, setBonus] = useState<(typeof BONUS)[number]>('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('ref_stats');
    if (err) {
      setError(/ref_stats|schema cache/.test(err.message) ? "Sunucu güncel değil: 0014 SQL dosyasını Supabase'de çalıştır." : err.message);
      return setRows([]);
    }
    setRows((data ?? []) as RefStat[]);
  }, []);

  useEffect(() => {
    if (isCoach) load();
  }, [isCoach, load]);

  if (!isCoach) return <EmptyState icon={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} title="Sadece koçlar" />;

  const valid = name.trim().length > 0 && /^[a-z0-9_]{3,20}$/.test(code);

  async function create() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('ref_codes').insert({ code, name: name.trim(), bonus_days: Number(bonus) });
    setBusy(false);
    if (err) return setError(err.code === '23505' ? 'Bu kod zaten var.' : err.message);
    setName('');
    setCode('');
    setCodeEdited(false);
    load();
  }

  async function toggle(row: RefStat) {
    const { error: err } = await supabase.from('ref_codes').update({ active: !row.active }).eq('code', row.code);
    if (err) return setError(err.message);
    load();
  }

  async function copy(text: string) {
    await Clipboard.setStringAsync(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  }

  function share(row: RefStat) {
    Share.share({
      message: tx("Kagainz'e kayıt olurken {0} kodunu gir 💪\n{1}", [row.code.toUpperCase(), refLink(row.code)]),
    }).catch(() => {});
  }

  return (
    <Screen edges={[]}>
      <Reveal index={0}>
        <Body muted style={{ fontSize: 14 }}>
          Her influencer için bir kod aç. Takipçi linke tıklayınca kayıt ekranı kod dolu açılır; kodu kayıt olurken ya da sonraki 14 gün içinde Davet ekranından da girebilir.
          Ödeme sistemi gelince bu kodla gelenlere indirimli fiyat gösterilecek.
        </Body>
      </Reveal>

      <Reveal index={1}>
        <Card>
          <Label>Yeni kod</Label>
          <Input
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (!codeEdited) setCode(toCode(t));
            }}
            placeholder="Influencer adı"
          />
          <Input
            value={code}
            onChangeText={(t) => {
              setCodeEdited(true);
              setCode(toCode(t));
            }}
            placeholder="kod (ör. ahmet)"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Label>Hediye Pro</Label>
          <Segmented
            options={BONUS.map((b) => ({ value: b, label: b === '0' ? 'Yok' : tx('{0} gün', [b]) }))}
            value={bonus}
            onChange={setBonus}
          />
          <Button title="Kodu oluştur" arrow loading={busy} disabled={!valid} onPress={create} />
          {error && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger }}>{error}</Text>}
        </Card>
      </Reveal>

      {rows == null ? (
        <SkeletonList />
      ) : rows.length === 0 ? (
        <EmptyState icon={{ ios: 'megaphone.fill', android: 'campaign', web: 'campaign' }} title="Henüz kod yok" body="İlk influencer kodunu yukarıdan oluştur." />
      ) : (
        rows.map((row, i) => (
          <Reveal key={row.code} index={i + 2}>
            <Card style={!row.active && { opacity: 0.6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text raw style={{ fontFamily: fonts.display, fontSize: 24, color: colors.text }}>
                    {row.code.toUpperCase()}
                  </Text>
                  <Text raw style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>
                    {row.bonus_days > 0 ? tx('{0} · {1} gün Pro hediye', [row.name, row.bonus_days]) : row.name}
                  </Text>
                </View>
                <PressScale onPress={() => toggle(row)}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: row.active ? colors.danger : colors.success }}>
                    {row.active ? 'Durdur' : 'Aç'}
                  </Text>
                </PressScale>
              </Row>
              <Row gap={spacing.sm}>
                <Stat label="Katılan" value={String(row.joined)} />
                <Stat label="Son 30 gün" value={String(row.joined_30d)} />
                <Stat label="Ödemeye geçen" value={String(row.paid)} color={colors.success} />
              </Row>
              <Mono style={{ color: colors.textMuted, fontSize: 12 }}>{tx('Şu an ücretli: {0}', [row.paying])}</Mono>
              <Mono style={{ color: colors.textMuted, fontSize: 12 }}>{refLink(row.code)}</Mono>
              <Row gap={spacing.sm}>
                <View style={{ flex: 1 }}>
                  <Button title="Paylaş" arrow icon={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }} onPress={() => share(row)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title={copied === refLink(row.code) ? 'Kopyalandı' : 'Kopyala'}
                    variant="outline"
                    icon={{ ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }}
                    onPress={() => copy(refLink(row.code))}
                  />
                </View>
              </Row>
            </Card>
          </Reveal>
        ))
      )}
    </Screen>
  );
}
