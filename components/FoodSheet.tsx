import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Body, Button, Chip, Input, Label, Row, Segmented, Sheet, Stat, Tag } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { MEAL_ORDER, MEALS, useDaily, type EntrySource, type MealSlot } from '@/lib/daily';
import { macrosFor, type FoodResult } from '@/lib/foodsearch';
import { useColors } from '@/lib/theme';

// Seçilen yiyeceğin gramını ayarlayıp günlüğe ekleme paneli (arama ve barkod ortak).
export function FoodSheet({
  food,
  meal: initialMeal,
  source,
  onClose,
  onAdded,
}: {
  food: FoodResult | null;
  meal: MealSlot;
  source: EntrySource;
  onClose: () => void;
  onAdded?: () => void;
}) {
  const colors = useColors();
  const { add } = useDaily();
  const [grams, setGrams] = useState('100');
  const [meal, setMeal] = useState<MealSlot>(initialMeal);

  useEffect(() => {
    if (food) setGrams(String(food.unitGrams ?? 100));
    setMeal(initialMeal);
  }, [food, initialMeal]);

  if (!food) return null;
  const g = Math.max(0, parseFloat(grams.replace(',', '.')) || 0);
  const m = macrosFor(food, g);
  const presets = [
    ...(food.unitGrams ? [{ label: `1 ${food.unitName ?? 'porsiyon'}`, g: food.unitGrams }] : []),
    ...(food.unitGrams ? [{ label: `2 ${food.unitName ?? 'porsiyon'}`, g: food.unitGrams * 2 }] : []),
    { label: '50 g', g: 50 },
    { label: '100 g', g: 100 },
    { label: '150 g', g: 150 },
    { label: '200 g', g: 200 },
  ];

  return (
    <Sheet visible onClose={onClose}>
      <Row gap={spacing.md}>
        {food.image ? (
          <Image source={{ uri: food.image }} style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }} contentFit="cover" />
        ) : null}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.text }} numberOfLines={2}>
            {food.name.toLocaleUpperCase('tr-TR')}
          </Text>
          <Row gap={6}>
            {food.brand ? <Tag color={colors.textMuted} bg={colors.surfaceAlt}>{food.brand}</Tag> : null}
            <Text style={{ fontFamily: fonts.mono, fontSize: 11.5, color: colors.textDim }}>
              100 g: {food.per100g.kcal} kcal
            </Text>
          </Row>
        </View>
      </Row>
      <Row gap={spacing.sm}>
        <View style={{ flex: 1 }}>
          <Input value={grams} onChangeText={setGrams} keyboardType="decimal-pad" placeholder="Gram" selectTextOnFocus />
        </View>
        <Label>gram</Label>
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {presets.map((p) => (
          <Chip key={p.label} label={p.label} active={g === p.g} onPress={() => setGrams(String(p.g))} />
        ))}
      </View>
      <Row gap={spacing.sm}>
        <Stat label="Kalori" value={`${m.kcal}`} />
        <Stat label="Protein" value={`${m.protein} g`} color={colors.protein} />
        <Stat label="Karb." value={`${m.carb} g`} color={colors.carb} />
        <Stat label="Yağ" value={`${m.fat} g`} color={colors.fat} />
      </Row>
      <Segmented options={MEAL_ORDER.map((v) => ({ value: v, label: MEALS[v].label }))} value={meal} onChange={setMeal} />
      {food.source === 'off' && (
        <Body muted style={{ fontSize: 12 }}>
          Değerler Open Food Facts topluluğundan; paketin üstündekiyle karşılaştır.
        </Body>
      )}
      <Button
        title="Günlüğe ekle"
        icon={{ ios: 'plus', android: 'add', web: 'add' }}
        disabled={g <= 0}
        onPress={() => {
          add(`${Math.round(g)} g ${food.name}${food.brand ? ` (${food.brand})` : ''}`, m, { meal, source });
          onClose();
          onAdded?.();
        }}
      />
    </Sheet>
  );
}
