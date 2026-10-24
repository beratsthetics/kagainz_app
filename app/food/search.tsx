import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Text } from '@/components/T';

import { FoodSheet } from '@/components/FoodSheet';
import { EmptyState, Icon, Input, Label, Mono, PressScale, Row, Screen, Tag, Title } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { mealForNow, type MealSlot } from '@/lib/daily';
import { searchLocal, searchOnline, type FoodResult } from '@/lib/foodsearch';
import { makeStyles, useColors } from '@/lib/theme';

export default function FoodSearchScreen() {
  const colors = useColors();
  const styles = useStyles();
  const params = useLocalSearchParams<{ q?: string; meal?: MealSlot }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [online, setOnline] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<FoodResult | null>(null);
  const local = useMemo(() => searchLocal(query), [query]);

  // Yazmayı bırakınca Open Food Facts'te ara.
  useEffect(() => {
    const q = query.trim();
    setOnline([]);
    setError(null);
    if (q.length < 3) return setLoading(false);
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      searchOnline(q, ctrl.signal)
        .then(setOnline)
        .catch((e: Error) => e.name !== 'AbortError' && setError('Paketli ürün araması şu an yapılamıyor.'))
        .finally(() => setLoading(false));
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Title style={{ fontSize: 32 }}>Yiyecek ara</Title>
        <PressScale onPress={() => router.back()} style={styles.close}>
          <Icon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} />
        </PressScale>
      </Row>
      <Row gap={spacing.sm}>
        <View style={{ flex: 1 }}>
          <Input
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder="ör. lahmacun, süzme yoğurt, Ülker"
            returnKeyType="search"
            prefix={<Icon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={18} color={colors.textMuted} />}
          />
        </View>
        <PressScale onPress={() => router.replace({ pathname: '/food/scan', params: { meal: params.meal } })} style={styles.scan}>
          <Icon name={{ ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' }} size={22} color={colors.primaryText} />
        </PressScale>
      </Row>

      {query.trim().length === 0 && (
        <EmptyState
          icon={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }}
          title="Ne yedin?"
          body="Türk yemekleri ve temel gıdalar hemen çıkar. 3 harften sonra marketteki paketli ürünler de aranır."
        />
      )}

      {local.length > 0 && <Label>Kagainz veritabanı</Label>}
      {local.map((f) => (
        <Result key={f.id} food={f} onPress={() => setPicked(f)} />
      ))}

      {query.trim().length >= 3 && (
        <Row style={{ justifyContent: 'space-between', marginTop: spacing.sm }}>
          <Label>Paketli ürünler</Label>
          {loading && <ActivityIndicator size="small" color={colors.textMuted} />}
        </Row>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      {online.map((f) => (
        <Result key={f.id} food={f} onPress={() => setPicked(f)} />
      ))}
      {!loading && !error && query.trim().length >= 3 && online.length === 0 && local.length === 0 && (
        <EmptyState icon={{ ios: 'questionmark.circle', android: 'help', web: 'help' }} title="Bulunamadı" body="Farklı yaz ya da barkodu okut." />
      )}

      <FoodSheet
        food={picked}
        meal={params.meal ?? mealForNow()}
        source="search"
        onClose={() => setPicked(null)}
        onAdded={() => router.back()}
      />
    </Screen>
  );
}

function Result({ food, onPress }: { food: FoodResult; onPress: () => void }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <PressScale onPress={onPress} style={styles.result}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.name} numberOfLines={1}>
          {food.name}
        </Text>
        <Row gap={6}>
          {food.brand ? <Tag color={colors.textMuted} bg={colors.surfaceAlt}>{food.brand}</Tag> : null}
          <Mono style={{ fontSize: 11.5, color: colors.textMuted }}>
            <Text style={{ color: colors.protein }}>P {food.per100g.protein}</Text> · <Text style={{ color: colors.carb }}>K {food.per100g.carb}</Text> ·{' '}
            <Text style={{ color: colors.fat }}>Y {food.per100g.fat}</Text>
          </Mono>
        </Row>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Mono>{food.per100g.kcal}</Mono>
        <Mono style={{ fontSize: 10.5, color: colors.textDim }}>kcal/100g</Mono>
      </View>
      <Icon name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }} size={24} color={colors.accentBright} />
    </PressScale>
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
  scan: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  name: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger },
}));
