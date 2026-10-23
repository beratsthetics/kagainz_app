import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { MacroLine } from '@/components/bits';
import {
  Body,
  Button,
  Card,
  Hero,
  Icon,
  Label,
  LockedCard,
  Mono,
  PressScale,
  Reveal,
  Row,
  Screen,
  Segmented,
  Stat,
} from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { MEAL_ORDER, MEALS, mealForNow, useDaily, type MealSlot } from '@/lib/daily';
import type { Macros } from '@/lib/macros';
import { useProgress } from '@/lib/progress';
import { supabase } from '@/lib/supabase';
import { makeStyles, useColors } from '@/lib/theme';
import { hasFeature } from '@/lib/tiers';

type Item = { name: string; grams: number; kcal: number; protein: number; carb: number; fat: number; scale: number };

export default function PhotoMacrosScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { tier } = useAuth();
  const { add } = useDaily();
  const { bump } = useProgress();
  const params = useLocalSearchParams<{ meal?: MealSlot }>();
  const [meal, setMeal] = useState<MealSlot>(params.meal ?? mealForNow());
  const [uri, setUri] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [note, setNote] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasFeature(tier, 'photo_macros')) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Close />
        <Hero lines={['Fotoğraf', 'çek, bitti']} size={44} />
        <Body muted>Tabağın fotoğrafını çek; yapay zekâ yiyecekleri ve gramlarını tahmin etsin, sen sadece onayla.</Body>
        <LockedCard tier="plus" title="Fotoğraftan makro" body="Plus ile ayda 30, Max ile sınırsız tahmin." onPress={() => router.push('/plans')} />
      </Screen>
    );
  }

  async function pick(camera: boolean) {
    setError(null);
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5, base64: true, allowsEditing: true, aspect: [1, 1] };
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError('Kamera izni gerekli.');
    }
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets[0]?.base64) return;
    const asset = res.assets[0];
    setUri(asset.uri);
    setItems([]);
    setLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke('estimate-meal', {
      body: { image: asset.base64, mediaType: asset.mimeType ?? 'image/jpeg' },
    });
    setLoading(false);
    if (fnError) {
      let message = 'Tahmin yapılamadı.';
      try {
        const body = await (fnError as { context?: Response }).context?.json();
        if (body?.error) message = body.error;
      } catch {}
      return setError(message);
    }
    setItems((data.items as Omit<Item, 'scale'>[]).map((i) => ({ ...i, scale: 1 })));
    setNote(data.note ?? '');
    setRemaining(data.remaining ?? null);
  }

  const total = items.reduce<Macros>(
    (a, i) => ({
      kcal: Math.round(a.kcal + i.kcal * i.scale),
      protein: Math.round((a.protein + i.protein * i.scale) * 10) / 10,
      carb: Math.round((a.carb + i.carb * i.scale) * 10) / 10,
      fat: Math.round((a.fat + i.fat * i.scale) * 10) / 10,
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0 },
  );
  const setScale = (idx: number, scale: number) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, scale: Math.max(0, Math.round(scale * 100) / 100) } : it)));

  return (
    <Screen edges={['top', 'bottom']}>
      <Close />
      <Reveal index={0}>
        <Hero lines={['Fotoğraftan', 'makro']} size={44} />
      </Reveal>

      <Reveal index={1}>
        <Row gap={spacing.sm}>
          <View style={{ flex: 1 }}>
            <Button title="Fotoğraf çek" icon={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} onPress={() => pick(true)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Galeriden" variant="outline" icon={{ ios: 'photo', android: 'image', web: 'image' }} onPress={() => pick(false)} />
          </View>
        </Row>
      </Reveal>

      {uri && (
        <View style={styles.photoWrap}>
          <Image source={{ uri }} style={styles.photo} contentFit="cover" />
          {loading && (
            <View style={styles.scanning}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.scanningText}>YİYECEKLER TANINIYOR…</Text>
            </View>
          )}
        </View>
      )}
      {error && <Text style={{ fontFamily: fonts.bodyBold, color: colors.danger }}>{error}</Text>}

      {items.length > 0 && (
        <Card glow>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Tahmin</Label>
            {remaining != null && <Mono style={{ color: colors.textMuted }}>Bu ay {remaining} hak kaldı</Mono>}
          </Row>
          <Row gap={spacing.sm}>
            <Stat label="Kalori" value={`${total.kcal}`} />
            <Stat label="Protein" value={`${total.protein} g`} color={colors.protein} />
            <Stat label="Karb." value={`${total.carb} g`} color={colors.carb} />
            <Stat label="Yağ" value={`${total.fat} g`} color={colors.fat} />
          </Row>
          {items.map((it, i) => (
            <Row key={i} style={styles.item}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.itemName}>{it.name}</Text>
                <MacroLine kcal={Math.round(it.kcal * it.scale)} p={Math.round(it.protein * it.scale)} c={Math.round(it.carb * it.scale)} f={Math.round(it.fat * it.scale)} />
              </View>
              <PressScale onPress={() => setScale(i, it.scale - 0.25)} style={styles.small}>
                <Icon name={{ ios: 'minus', android: 'remove', web: 'remove' }} size={14} />
              </PressScale>
              <Mono style={{ minWidth: 52, textAlign: 'center' }}>{Math.round(it.grams * it.scale)} g</Mono>
              <PressScale onPress={() => setScale(i, it.scale + 0.25)} style={styles.small}>
                <Icon name={{ ios: 'plus', android: 'add', web: 'add' }} size={14} />
              </PressScale>
            </Row>
          ))}
          {note ? (
            <Body muted style={{ fontSize: 12.5 }}>
              {note}
            </Body>
          ) : null}
          <Segmented options={MEAL_ORDER.map((v) => ({ value: v, label: MEALS[v].label }))} value={meal} onChange={setMeal} />
          <Button
            title="Günlüğe ekle"
            icon={{ ios: 'plus', android: 'add', web: 'add' }}
            disabled={total.kcal <= 0}
            onPress={() => {
              const text = items
                .filter((i) => i.scale > 0)
                .map((i) => `${Math.round(i.grams * i.scale)} g ${i.name}`)
                .join(', ');
              add(`📸 ${text}`, total, { meal, source: 'photo' });
              bump('photos');
              router.back();
            }}
          />
        </Card>
      )}
    </Screen>
  );
}

function Close() {
  const styles = useStyles();
  return (
    <Row style={{ justifyContent: 'flex-end' }}>
      <PressScale onPress={() => router.back()} style={styles.close}>
        <Icon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} />
      </PressScale>
    </Row>
  );
}

const useStyles = makeStyles((colors) => ({
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoWrap: { borderRadius: radius.lg, overflow: 'hidden', aspectRatio: 1, backgroundColor: colors.surfaceAlt },
  photo: { width: '100%', height: '100%' },
  scanning: {
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const),
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  scanningText: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.4, color: '#fff' },
  item: { gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  itemName: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  small: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
