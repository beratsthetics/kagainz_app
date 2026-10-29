import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, ScrollView, View } from 'react-native';
import { Text } from '@/components/T';

import { Body, Chip, EmptyState, Label, LockedCard, Row, Screen, SkeletonList } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { FORM_CHECK_SELECT, POSES, type FormCheck } from '@/lib/formcheck';
import { locale } from '@/lib/i18n';
import { useSignedUrl } from '@/lib/media';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { hasFeature } from '@/lib/tiers';

const date = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: '2-digit' });

// Önce / sonra: iki form check'in aynı pozdaki fotoğrafları üst üste; ortadaki çizgi sürüklenince
// soldan "önce", sağdan "sonra" görünür.
export default function CompareScreen() {
  const colors = useColors();
  const { session, tier, isCoach } = useAuth();
  const allowed = isCoach || hasFeature(tier, 'before_after');
  const [checks, setChecks] = useState<FormCheck[] | null>(null);
  const [pose, setPose] = useState(0);
  const [before, setBefore] = useState(0);
  const [after, setAfter] = useState(0);

  useEffect(() => {
    if (!allowed || !session || !isSupabaseConfigured) return setChecks([]);
    supabase
      .from('form_checks')
      .select(FORM_CHECK_SELECT)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const list = ((data ?? []) as unknown as FormCheck[]).filter((f) => f.photos.length === 3);
        setChecks(list);
        setAfter(Math.max(0, list.length - 1));
      });
  }, [allowed, session]);

  if (!allowed) {
    return (
      <Screen edges={[]}>
        <LockedCard
          tier="max"
          title="Önce / sonra"
          body="Form check fotoğraflarını yan yana kaydırarak karşılaştır, değişimini gör."
          preview={[['Önden', '✓'], ['Yandan', '✓'], ['Arkadan', '✓']]}
          onPress={() => router.push('/plans')}
        />
      </Screen>
    );
  }
  if (checks == null) {
    return (
      <Screen edges={[]}>
        <SkeletonList variant="detail" />
      </Screen>
    );
  }
  if (checks.length < 2) {
    return (
      <Screen edges={[]}>
        <EmptyState
          icon={{ ios: 'photo.on.rectangle', android: 'compare', web: 'compare' }}
          title="İki form check gerekiyor"
          body="Karşılaştırma için en az iki form check gönder. Aynı ışıkta ve aynı açıdan çekersen fark daha net görünür."
        />
      </Screen>
    );
  }

  const b = checks[before];
  const a = checks[after];
  return (
    <Screen edges={[]}>
      <Row gap={spacing.sm}>
        {POSES.map((p, i) => (
          <Chip key={p.key} label={p.label} active={pose === i} onPress={() => setPose(i)} />
        ))}
      </Row>
      <Slider before={b.photos[pose]} after={a.photos[pose]} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Text raw style={{ fontFamily: fonts.mono, fontSize: 12.5, color: colors.textMuted }}>
          {date(b.created_at)}
        </Text>
        <Text raw style={{ fontFamily: fonts.mono, fontSize: 12.5, color: colors.textMuted }}>
          {date(a.created_at)}
        </Text>
      </Row>
      <Picker label="Önce" checks={checks} value={before} onChange={setBefore} />
      <Picker label="Sonra" checks={checks} value={after} onChange={setAfter} />
      <Body muted style={{ fontSize: 13 }}>
        Ortadaki çizgiyi sağa sola kaydır.
      </Body>
    </Screen>
  );
}

function Picker({ label, checks, value, onChange }: { label: string; checks: FormCheck[]; value: number; onChange: (i: number) => void }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Label>{label}</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {checks.map((c, i) => (
          <Chip key={c.id} label={date(c.created_at)} active={value === i} onPress={() => onChange(i)} />
        ))}
      </ScrollView>
    </View>
  );
}

function Slider({ before, after }: { before: string; after: string }) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const [pos, setPos] = useState(0.5);
  const widthRef = useRef(0);
  widthRef.current = width;
  const start = useRef(0.5);
  const posRef = useRef(pos);
  posRef.current = pos;
  const before_ = useSignedUrl('form-checks', before);
  const after_ = useSignedUrl('form-checks', after);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        // Dokunulan yere atlar, oradan sürüklenir.
        const w = widthRef.current || 1;
        start.current = Math.min(1, Math.max(0, e.nativeEvent.locationX / w));
        setPos(start.current);
      },
      onPanResponderMove: (_, g) => setPos(Math.min(1, Math.max(0, start.current + g.dx / (widthRef.current || 1)))),
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  const height = Math.round((width * 4) / 3);
  return (
    <View
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
      style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceHigh }}
      {...pan.panHandlers}>
      {before_ && after_ && width > 0 ? (
        <>
          <Image source={{ uri: after_ }} style={{ position: 'absolute', width, height }} contentFit="cover" />
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: width * pos, overflow: 'hidden' }}>
            <Image source={{ uri: before_ }} style={{ width, height }} contentFit="cover" />
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: width * pos - 1, width: 2, backgroundColor: '#fff' }} />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: height / 2 - 18,
              left: width * pos - 18,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text raw style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: '#000' }}>
              ⟷
            </Text>
          </View>
          <Tag text="Önce" left />
          <Tag text="Sonra" />
        </>
      ) : (
        <ActivityIndicator style={{ flex: 1 }} color={colors.textMuted} />
      )}
    </View>
  );
}

function Tag({ text, left }: { text: string; left?: boolean }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: spacing.sm,
        [left ? 'left' : 'right']: spacing.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.sm,
        backgroundColor: 'rgba(0,0,0,0.6)',
      }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: '#fff' }}>{text}</Text>
    </View>
  );
}
