import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/T';

import { MacroBar, MacroLine, WaterTracker } from '@/components/bits';
import { FoodSheet } from '@/components/FoodSheet';
import {
  Body,
  Button,
  Card,
  Chip,
  Heading,
  Icon,
  IconBox,
  Input,
  Label,
  Mono,
  PressScale,
  Reveal,
  Ring,
  Row,
  Screen,
  ScreenHeader,
  Segmented,
  Stat,
  type IconName,
} from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { MEAL_ORDER, MEALS, mealForNow, totalOf, useDaily, type MealSlot } from '@/lib/daily';
import { searchLocal, type FoodResult } from '@/lib/foodsearch';
import { parseMeal, sumMacros } from '@/lib/macros';
import { makeStyles, useColors } from '@/lib/theme';
import { hasFeature } from '@/lib/tiers';
import { tx } from '@/lib/i18n';

const QUICK = ['2 yumurta', '100g yulaf', '150g tavuk göğsü', '200g pilav', '1 muz', '1 ölçek whey', '1 kase mercimek çorbası', '1 lahmacun'];

// Makro hesaplama ücretsiz ama hesap gerektiriyor.
export default function MacrosScreen() {
  const { session, loading } = useAuth();
  if (loading) return <Screen>{null}</Screen>;
  return session ? <MacroCalculator /> : <MacrosLocked />;
}

function MacrosLocked() {
  const colors = useColors();
  return (
    <Screen>
      <Reveal index={0}>
        <ScreenHeader eyebrow="Ücretsiz" title="Makro hesapla" />
      </Reveal>
      <Reveal index={1}>
        <Card glow>
          <Row gap={spacing.lg}>
            <Ring value={0.68} size={104} stroke={10}>
              <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={26} />
            </Ring>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Heading>Önce hesabını oluştur</Heading>
              <Body muted style={{ fontSize: 13.5 }}>
                30 saniyede ücretsiz kayıt ol, yediklerinin makrolarını anında gör.
              </Body>
            </View>
          </Row>
          <Row gap={spacing.sm}>
            <Stat label="Protein" value="— g" color={colors.protein} />
            <Stat label="Karb." value="— g" color={colors.carb} />
            <Stat label="Yağ" value="— g" color={colors.fat} />
          </Row>
          <Button title="Ücretsiz kayıt ol" arrow onPress={() => router.push('/auth?reason=macros')} />
        </Card>
      </Reveal>
      <Reveal index={2}>
        <Body muted style={{ textAlign: 'center', fontSize: 13 }}>
          Google, e-posta ya da telefonla saniyeler içinde kayıt ol.
        </Body>
      </Reveal>
    </Screen>
  );
}

const MEAL_OPTIONS = MEAL_ORDER.map((m) => ({ value: m, label: MEALS[m].label }));

function MacroCalculator() {
  const colors = useColors();
  const styles = useStyles();
  const { tier } = useAuth();
  const [text, setText] = useState('');
  // Ana sayfadaki "Sıradaki" kartı hangi öğün için açtıysa o seçili gelir.
  const params = useLocalSearchParams<{ meal?: MealSlot }>();
  const [meal, setMeal] = useState<MealSlot>(params.meal ?? mealForNow());
  useEffect(() => {
    if (params.meal) setMeal(params.meal);
  }, [params.meal]);
  const [shelf, setShelf] = useState<'recent' | 'favorites'>('recent');
  const [picked, setPicked] = useState<FoodResult | null>(null);
  const { entries, totals: dayTotals, goals, add, remove, favorites, recent, isFavorite, toggleFavorite } = useDaily();
  const over = Math.round(dayTotals.kcal - goals.kcal);
  const lines = useMemo(() => parseMeal(text), [text]);
  const total = useMemo(() => sumMacros(lines), [lines]);
  const known = lines.filter((l) => l.food);
  // Yazılan son parça için veritabanından öneriler: dokununca gramıyla eklenir.
  const fragment = text.split(/\n|,(?!\d)|\+|\bve\b/i).pop()?.trim() ?? '';
  const query = fragment.replace(/^[\d.,]+\s*(g|gr|gram|ml|kg|adet)?\s*/i, '');
  const suggestions = useMemo(() => (query.length >= 2 ? searchLocal(query, 4) : []), [query]);
  const shelfItems = shelf === 'recent' ? recent : favorites;

  function addQuick(q: string) {
    setText((t) => (t.trim() ? `${t.trim().replace(/,$/, '')}, ${q}` : q));
  }

  return (
    <Screen>
      <Reveal index={0}>
        <ScreenHeader
          eyebrow="Beslenme"
          title="Makro"
          right={
            <PressScale onPress={() => router.push('/goals')} style={styles.goalBtn}>
              <Icon name={{ ios: 'target', android: 'my_location', web: 'my_location' }} size={16} color={colors.accentBright} />
              <Text style={styles.goalBtnText}>Hedef</Text>
            </PressScale>
          }
        />
      </Reveal>

      {/* Günün özeti */}
      <Reveal index={1}>
        <Card glow>
          <Row gap={spacing.lg}>
            {/* Hedef aşılınca uyarı rengi yok: bir günlük fazla haftalık ortalamada kaybolur. */}
            <Ring value={dayTotals.kcal / goals.kcal} size={96} stroke={9} color={colors.accent}>
              <Text style={styles.ringKcal}>{over > 0 ? `+${over}` : goals.kcal - dayTotals.kcal}</Text>
              <Label>{over > 0 ? 'hedefin üstü' : 'kaldı'}</Label>
            </Ring>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <MacroBar label="Protein" value={dayTotals.protein} goal={goals.protein} color={colors.protein} />
              <MacroBar label="Karb." value={dayTotals.carb} goal={goals.carb} color={colors.carb} />
              <MacroBar label="Yağ" value={dayTotals.fat} goal={goals.fat} color={colors.fat} />
            </View>
          </Row>
          {over > 0 && (
            <Body muted style={{ fontSize: 13 }}>
              Bir gün fazla olması sorun değil. Önemli olan haftalık ortalaman.
            </Body>
          )}
        </Card>
      </Reveal>

      <Reveal index={3}>
        <Segmented options={MEAL_OPTIONS} value={meal} onChange={setMeal} />
      </Reveal>

      {/* Tek giriş kutusu: yazınca hem hesaplar hem veritabanında arar; yanında barkod */}
      <Reveal index={4}>
        <Input
          value={text}
          onChangeText={setText}
          multiline
          placeholder="Ne yedin? ör. 3 yumurta, 1 dilim ekmek"
          prefix={<Icon name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={18} color={colors.accentBright} />}
          suffix={
            <PressScale onPress={() => router.push({ pathname: '/food/scan', params: { meal } })} style={styles.inputBtn}>
              <Icon name={{ ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' }} size={19} color={colors.text} />
            </PressScale>
          }
          style={{ minHeight: 64, alignItems: 'flex-start', paddingTop: 4 }}
        />
      </Reveal>

      {text.trim().length === 0 ? (
        <Reveal index={5}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {QUICK.map((q) => (
              <Chip key={q} label={`+ ${tx(q)}`} onPress={() => addQuick(tx(q))} />
            ))}
          </ScrollView>
        </Reveal>
      ) : (
        <View style={{ gap: spacing.xs }}>
          {suggestions.map((f) => (
            <PressScale key={f.id} onPress={() => setPicked(f)} style={styles.suggestion}>
              <Icon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={15} color={colors.textMuted} />
              <Text style={styles.suggestionName} numberOfLines={1}>
                {f.name}
              </Text>
              <Mono style={{ fontSize: 11.5, color: colors.textMuted }}>{tx('{0} kcal/100g', [f.per100g.kcal])}</Mono>
              <Icon name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }} size={20} color={colors.accentBright} />
            </PressScale>
          ))}
          {query.length >= 3 && (
            <PressScale onPress={() => router.push({ pathname: '/food/search', params: { q: query, meal } })}>
              <Text style={[styles.link, { paddingVertical: 4 }]}>{tx('Paketli ürünlerde "{0}" ara →', [query])}</Text>
            </PressScale>
          )}
        </View>
      )}

      {text.trim().length > 0 && (
        <Reveal index={0}>
          <Card>
            <Row gap={spacing.lg}>
              <Ring value={total.kcal / goals.kcal} size={92} stroke={9}>
                <Text style={styles.ringKcal}>{total.kcal}</Text>
                <Label>kcal</Label>
              </Ring>
              <View style={{ flex: 1, gap: spacing.sm }}>
                <Heading style={{ fontSize: 20 }}>{tx('{0} için', [tx(MEALS[meal].label)])}</Heading>
                <Body muted style={{ fontSize: 13 }}>
                  {known.length
                    ? tx('{0} yiyecek · günlük hedefin %{1}\'i', [known.length, Math.round((total.kcal / goals.kcal) * 100)])
                    : 'Tanıdığım bir yiyecek yaz ya da Ara ile seç'}
                </Body>
                <View style={styles.split}>
                  <View style={{ flex: total.protein * 4 || 0.001, backgroundColor: colors.protein }} />
                  <View style={{ flex: total.carb * 4 || 0.001, backgroundColor: colors.carb }} />
                  <View style={{ flex: total.fat * 9 || 0.001, backgroundColor: colors.fat }} />
                </View>
              </View>
            </Row>
            {lines.map((l, i) => (
              <Row key={`${l.input}-${i}`} style={styles.line}>
                {l.food ? (
                  <>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lineName}>{l.food.name}</Text>
                      <MacroLine p={l.macros.protein} c={l.macros.carb} f={l.macros.fat} />
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Mono>{tx('{0} kcal', [l.macros.kcal])}</Mono>
                      <Mono style={{ color: colors.textDim, fontSize: 12 }}>{Math.round(l.grams)} g</Mono>
                    </View>
                  </>
                ) : (
                  <>
                    <Icon name={{ ios: 'questionmark.circle', android: 'help', web: 'help' }} size={16} color={colors.danger} />
                    <Body style={{ flex: 1 }}>{l.input}</Body>
                    <PressScale onPress={() => router.push({ pathname: '/food/search', params: { q: l.input, meal } })}>
                      <Text style={[styles.link, { color: colors.danger }]}>Ara →</Text>
                    </PressScale>
                  </>
                )}
              </Row>
            ))}
            <Button
              title="Günlüğe ekle"
              icon={{ ios: 'plus', android: 'add', web: 'add' }}
              onPress={() => {
                add(text.trim(), total, { meal, source: 'text' });
                setText('');
              }}
              disabled={!known.length}
            />
          </Card>
        </Reveal>
      )}

      {/* Favoriler ve son yenenler: tek dokunuşla tekrar ekle */}
      {(recent.length > 0 || favorites.length > 0) && (
        <Reveal index={6}>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={spacing.sm}>
                <Chip label="Son yenenler" active={shelf === 'recent'} onPress={() => setShelf('recent')} />
                <Chip
                  label={tx('Favoriler{0}', [favorites.length ? ` · ${favorites.length}` : ''])}
                  active={shelf === 'favorites'}
                  onPress={() => setShelf('favorites')}
                />
              </Row>
            </Row>
            {shelfItems.length === 0 ? (
              <Body muted style={{ fontSize: 13 }}>
                Günlükteki bir öğünün yanındaki yıldıza dokun, burada dursun.
              </Body>
            ) : (
              shelfItems.slice(0, 6).map((s) => (
                <Row key={s.id} style={styles.shelfRow}>
                  <View style={{ flex: 1 }}>
                    <Body numberOfLines={1} style={{ fontSize: 14 }}>
                      {s.text}
                    </Body>
                    <MacroLine kcal={s.macros.kcal} p={s.macros.protein} c={s.macros.carb} f={s.macros.fat} />
                  </View>
                  <PressScale onPress={() => add(s.text, s.macros, { meal, source: 'favorite' })} style={styles.addBtn}>
                    <Icon name={{ ios: 'plus', android: 'add', web: 'add' }} size={16} color={colors.primaryText} />
                  </PressScale>
                </Row>
              ))
            )}
          </Card>
        </Reveal>
      )}

      {/* Öğün başlıklarına göre günlük */}
      <Reveal index={7}>
        <View style={{ gap: spacing.sm }}>
          {MEAL_ORDER.map((slot) => {
            const items = entries.filter((e) => (e.meal ?? 'snack') === slot);
            const t = totalOf(items);
            return (
              <Card key={slot} style={{ gap: spacing.sm }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row gap={spacing.sm}>
                    <IconBox name={MEALS[slot].icon as IconName} color={colors.accentBright} bg={colors.accentSoft} size={32} />
                    <Heading style={{ fontSize: 18 }}>{MEALS[slot].label}</Heading>
                  </Row>
                  <Row gap={spacing.sm}>
                    <Mono style={{ color: items.length ? colors.text : colors.textDim }}>{tx('{0} kcal', [t.kcal])}</Mono>
                    <PressScale
                      onPress={() => {
                        setMeal(slot);
                        router.push({ pathname: '/food/search', params: { meal: slot } });
                      }}
                      style={styles.slotAdd}>
                      <Icon name={{ ios: 'plus', android: 'add', web: 'add' }} size={14} />
                    </PressScale>
                  </Row>
                </Row>
                {items.map((e) => (
                  <Row key={e.id} style={styles.entry}>
                    <View style={{ flex: 1 }}>
                      <Body numberOfLines={1} style={{ fontSize: 14 }}>
                        {e.text}
                      </Body>
                      <MacroLine p={e.macros.protein} c={e.macros.carb} f={e.macros.fat} />
                    </View>
                    <Mono>{e.macros.kcal}</Mono>
                    <PressScale onPress={() => toggleFavorite(e.text, e.macros)}>
                      <Icon
                        name={isFavorite(e.text) ? { ios: 'star.fill', android: 'star', web: 'star' } : { ios: 'star', android: 'star_outline', web: 'star_outline' }}
                        size={18}
                        color={isFavorite(e.text) ? colors.fat : colors.textDim}
                      />
                    </PressScale>
                    <PressScale onPress={() => remove(e.id)}>
                      <Icon name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} size={18} color={colors.textDim} />
                    </PressScale>
                  </Row>
                ))}
              </Card>
            );
          })}
        </View>
      </Reveal>

      <Reveal index={8}>
        <Card>
          <WaterTracker />
        </Card>
      </Reveal>

      <Reveal index={9}>
        <PressScale onPress={() => router.push('/meal-plan')}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <IconBox name={{ ios: 'list.bullet.rectangle.fill', android: 'menu_book', web: 'menu_book' }} color={colors.accentBright} bg={colors.accentSoft} />
            <View style={{ flex: 1 }}>
              <Heading style={{ fontSize: 17 }}>Haftalık yemek planı</Heading>
              <Body muted style={{ fontSize: 13 }}>
                Hedefine göre menü ve alışveriş listesi.
              </Body>
            </View>
            {hasFeature(tier, 'meal_plans') ? (
              <Icon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={18} color={colors.textMuted} />
            ) : (
              <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={16} color={colors.textMuted} />
            )}
          </Card>
        </PressScale>
      </Reveal>
      <FoodSheet food={picked} meal={meal} source="search" onClose={() => setPicked(null)} onAdded={() => setText('')} />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  ringKcal: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.text },
  link: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentBright },
  goalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  goalBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentBright },
  tool: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  toolText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
  split: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 4, marginTop: spacing.xs },
  line: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  lineName: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text, marginBottom: 4 },
  shelfRow: { gap: spacing.md, paddingVertical: spacing.xs },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionName: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  slotAdd: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entry: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.md },
}));
