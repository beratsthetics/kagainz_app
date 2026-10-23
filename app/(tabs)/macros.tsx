import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Body,
  Button,
  Card,
  Chip,
  Heading,
  Icon,
  Input,
  Label,
  Mono,
  PressScale,
  Reveal,
  Ring,
  Row,
  Screen,
  ScreenHeader,
  Stat,
} from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useDaily } from '@/lib/daily';
import { parseMeal, sumMacros } from '@/lib/macros';

const QUICK = [
  '2 yumurta',
  '100g yulaf',
  '150g tavuk göğsü',
  '200g pilav',
  '1 muz',
  '1 ölçek whey',
  '200g süzme yoğurt',
  '10g zeytinyağı',
];

export default function MacrosScreen() {
  const [text, setText] = useState('');
  const { entries, totals: dayTotals, goals, add, remove } = useDaily();
  const lines = useMemo(() => parseMeal(text), [text]);
  const total = useMemo(() => sumMacros(lines), [lines]);
  const known = lines.filter((l) => l.food);

  function addQuick(q: string) {
    setText((t) => (t.trim() ? `${t.trim().replace(/,$/, '')}, ${q}` : q));
  }

  function logMeal() {
    add(text.trim(), total);
    setText('');
  }

  return (
    <Screen>
      <Reveal index={0}>
        <ScreenHeader eyebrow="Ücretsiz" title="Makro hesapla" />
        <Body muted>Ne yediğini yaz ya da aşağıdan seç. Gerisini biz hesaplarız.</Body>
      </Reveal>

      <Reveal index={1}>
        <Input
          value={text}
          onChangeText={setText}
          multiline
          placeholder="ör. 3 yumurta, 1 dilim ekmek, 10g zeytinyağı"
          prefix={
            <Icon
              name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
              size={18}
              color={colors.accentBright}
            />
          }
          style={{ minHeight: 64, alignItems: 'flex-start', paddingTop: 2 }}
        />
      </Reveal>

      <Reveal index={2}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {QUICK.map((q) => (
            <Chip key={q} label={`+ ${q}`} onPress={() => addQuick(q)} />
          ))}
        </ScrollView>
      </Reveal>

      <Reveal index={3}>
        <Card glow>
          <Row gap={spacing.lg}>
            <Ring value={total.kcal / goals.kcal} size={112} stroke={10}>
              <Text style={styles.kcal}>{total.kcal}</Text>
              <Label>kcal</Label>
            </Ring>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Heading>Bu öğün</Heading>
              <Body muted style={{ fontSize: 13 }}>
                {known.length
                  ? `${known.length} yiyecek · günlük hedefin %${Math.round((total.kcal / goals.kcal) * 100)}'i`
                  : 'Yazmaya başla, anında hesaplansın'}
              </Body>
              {/* Kalorinin makrolara dağılımı */}
              <View style={styles.split}>
                <View style={{ flex: total.protein * 4 || 0.001, backgroundColor: colors.protein }} />
                <View style={{ flex: total.carb * 4 || 0.001, backgroundColor: colors.carb }} />
                <View style={{ flex: total.fat * 9 || 0.001, backgroundColor: colors.fat }} />
              </View>
            </View>
          </Row>
          <Row gap={spacing.sm}>
            <Stat label="Protein" value={`${total.protein} g`} color={colors.protein} />
            <Stat label="Karb." value={`${total.carb} g`} color={colors.carb} />
            <Stat label="Yağ" value={`${total.fat} g`} color={colors.fat} />
          </Row>
          <Button
            title="Günlüğe ekle"
            icon={{ ios: 'plus', android: 'add', web: 'add' }}
            onPress={logMeal}
            disabled={!known.length}
          />
        </Card>
      </Reveal>

      {lines.map((l, i) => (
        <Reveal key={`${l.input}-${i}`} index={i}>
          <View style={styles.line}>
            {l.food ? (
              <>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName}>{l.food.name}</Text>
                  <Mono style={{ color: colors.textMuted, fontSize: 12 }}>
                    <Text style={{ color: colors.protein }}>P {l.macros.protein}</Text> ·{' '}
                    <Text style={{ color: colors.carb }}>K {l.macros.carb}</Text> ·{' '}
                    <Text style={{ color: colors.fat }}>Y {l.macros.fat}</Text>
                  </Mono>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Mono>{l.macros.kcal} kcal</Mono>
                  <Mono style={{ color: colors.textDim, fontSize: 12 }}>{Math.round(l.grams)} g</Mono>
                </View>
              </>
            ) : (
              <Row style={{ flex: 1 }}>
                <Icon
                  name={{ ios: 'questionmark.circle', android: 'help', web: 'help' }}
                  size={16}
                  color={colors.danger}
                />
                <Body style={{ flex: 1 }}>{l.input}</Body>
                <Label style={{ color: colors.danger }}>Tanınmadı</Label>
              </Row>
            )}
          </View>
        </Reveal>
      ))}

      {entries.length > 0 && (
        <Reveal index={4}>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Heading>Bugünün günlüğü</Heading>
              <Mono style={{ color: colors.textMuted }}>
                {dayTotals.kcal}/{goals.kcal} kcal
              </Mono>
            </Row>
            {entries.map((e) => (
              <Row key={e.id} style={styles.entry}>
                <View style={{ flex: 1 }}>
                  <Body numberOfLines={1} style={{ fontSize: 14 }}>
                    {e.text}
                  </Body>
                  <Mono style={{ color: colors.textDim, fontSize: 11.5 }}>
                    {new Date(e.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} · P{' '}
                    {e.macros.protein} · K {e.macros.carb} · Y {e.macros.fat}
                  </Mono>
                </View>
                <Mono>{e.macros.kcal}</Mono>
                <PressScale onPress={() => remove(e.id)}>
                  <Icon
                    name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                    size={18}
                    color={colors.textDim}
                  />
                </PressScale>
              </Row>
            ))}
          </Card>
        </Reveal>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kcal: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.text },
  split: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2, marginTop: spacing.xs },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  lineName: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text, marginBottom: 3 },
  entry: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm + 4 },
});
