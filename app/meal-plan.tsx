import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/T';

import { MacroLine } from '@/components/bits';
import {
  Body,
  Button,
  Card,
  Chip,
  Heading,
  Icon,
  IconBox,
  Label,
  LockedCard,
  Mono,
  PressScale,
  Reveal,
  Row,
  Screen,
  Segmented,
  Tag,
  type IconName,
} from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { weekId } from '@/lib/challenges';
import { MEALS, useDaily } from '@/lib/daily';
import { generateDay, shoppingList } from '@/lib/mealplan';
import { WEEKDAYS } from '@/lib/program';
import { useStored } from '@/lib/store';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { hasFeature } from '@/lib/tiers';
import { tx } from '@/lib/i18n';

const ORDER = [1, 2, 3, 4, 5, 6, 0];

const FRESH_SEEDS = [1, 2, 3, 4, 5, 6, 7];

export default function MealPlanScreen() {
  const colors = useColors();
  const { tier, session } = useAuth();
  const { goals, hasCustomGoals, add } = useDaily();
  const week = weekId().id;
  const [seeds, setSeeds] = useStored<{ week: string; seeds: number[] }>('mealplan', { week, seeds: FRESH_SEEDS });
  const [day, setDay] = useState((new Date().getDay() + 6) % 7);
  const [tab, setTab] = useState<'menu' | 'list'>('menu');
  const [listDays, setListDays] = useState(7);
  const [sent, setSent] = useState(false);
  const base = Number(week.replace('-W', ''));
  const daySeeds = seeds.week === week ? seeds.seeds : FRESH_SEEDS;
  const plan = useMemo(() => daySeeds.map((s, i) => generateDay(goals, base + s * 31 + i)), [daySeeds, goals, base]);
  const list = useMemo(() => shoppingList(plan.slice(0, listDays)), [plan, listDays]);
  const current = plan[day];

  if (!hasFeature(tier, 'meal_plans')) {
    return (
      <Screen>
        <Body muted>Hedef kalorine ve makrolarına göre her gün için menü, tek dokunuşla günlüğe ekleme ve haftalık alışveriş listesi.</Body>
        <LockedCard
          tier="pro"
          title="Yemek planı"
          body="Pro ile haftalık menün ve alışveriş listen hazır."
          preview={[['Kahvaltı', '520 kcal'], ['Öğle', '680 kcal'], ['Akşam', '610 kcal']]}
          onPress={() => router.push('/plans')}
        />
      </Screen>
    );
  }

  function regenerate() {
    const next = [...daySeeds];
    next[day] = next[day] + 7;
    setSeeds({ week, seeds: next });
  }

  // Max: planı koçun onayına gönder.
  async function sendToCoach() {
    if (!session || !isSupabaseConfigured) return;
    const text =
      tx('Yemek planım ({0}) için onayını rica ediyorum:\n', [tx(WEEKDAYS[ORDER[day]].day)]) +
      current.meals.map((m) => `${MEALS[m.slot].label}: ${m.items.map((i) => i.label).join(', ')}`).join('\n') +
      tx('\nToplam: {0} kcal, P {1} / K {2} / Y {3}', [current.totals.kcal, Math.round(current.totals.protein), Math.round(current.totals.carb), Math.round(current.totals.fat)]);
    await supabase.from('coach_messages').insert({ member_id: session.user.id, sender_id: session.user.id, body: text });
    setSent(true);
  }

  return (
    <Screen>
      <Reveal index={0}>
        <Segmented
          options={[
            { value: 'menu', label: 'Menü' },
            { value: 'list', label: 'Alışveriş listesi' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </Reveal>

      {!hasCustomGoals && (
        <PressScale onPress={() => router.push('/goals')}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Icon name={{ ios: 'target', android: 'my_location', web: 'my_location' }} size={20} color={colors.accentBright} />
            <Body style={{ flex: 1, fontSize: 13.5 }}>Plan varsayılan hedefe göre. Kendi hedefini hesapla →</Body>
          </Card>
        </PressScale>
      )}

      {tab === 'menu' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {ORDER.map((wd, i) => (
              <Chip key={wd} label={WEEKDAYS[wd].short} active={i === day} onPress={() => setDay(i)} />
            ))}
          </ScrollView>

          <Card glow>
            <Row style={{ justifyContent: 'space-between' }}>
              <Label>{WEEKDAYS[ORDER[day]].day}</Label>
              <PressScale onPress={regenerate}>
                <Row gap={6}>
                  <Icon name={{ ios: 'arrow.triangle.2.circlepath', android: 'refresh', web: 'refresh' }} size={14} color={colors.accentBright} />
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentBright }}>Yenile</Text>
                </Row>
              </PressScale>
            </Row>
            <Text style={{ fontFamily: fonts.display, fontSize: 40, color: colors.text }}>
              {current.totals.kcal}
              <Text style={{ fontSize: 16, color: colors.textMuted }}>{tx('/ {0} kcal', [goals.kcal])}</Text>
            </Text>
            <MacroLine p={current.totals.protein} c={current.totals.carb} f={current.totals.fat} />
          </Card>

          {current.meals.map((m) => (
            <Card key={m.slot}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={spacing.sm}>
                  <IconBox name={MEALS[m.slot].icon as IconName} color={colors.fat} bg={`${colors.fat}1A`} size={32} />
                  <Heading style={{ fontSize: 18 }}>{MEALS[m.slot].label}</Heading>
                </Row>
                <Mono>{tx('{0} kcal', [m.macros.kcal])}</Mono>
              </Row>
              {m.items.map((it) => (
                <Row key={it.key} gap={spacing.sm}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textDim }} />
                  <Body style={{ fontSize: 14 }}>{it.label}</Body>
                </Row>
              ))}
              <Row style={{ justifyContent: 'space-between' }}>
                <MacroLine p={m.macros.protein} c={m.macros.carb} f={m.macros.fat} />
                <PressScale
                  onPress={() =>
                    add(m.items.map((i) => i.label).join(', '), m.macros, { meal: m.slot, source: 'plan' })
                  }>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentBright }}>Günlüğe ekle +</Text>
                </PressScale>
              </Row>
            </Card>
          ))}

          {hasFeature(tier, 'coach_dm') ? (
            <Button
              title={sent ? 'Koçuna gönderildi' : 'Koçumun onayına gönder'}
              variant="outline"
              icon={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
              disabled={sent}
              onPress={sendToCoach}
            />
          ) : (
            <Row gap={spacing.sm} style={{ justifyContent: 'center' }}>
              <Tag color={colors.gold} bg={`${colors.gold}1F`}>Max</Tag>
              <Body muted style={{ fontSize: 12.5 }}>
                Max üyeler planı koç onayına gönderebilir.
              </Body>
            </Row>
          )}
        </>
      ) : (
        <>
          <Row gap={spacing.sm}>
            {[1, 3, 7].map((n) => (
              <Chip key={n} label={n === 1 ? 'Bugün' : tx('{0} gün', [n])} active={listDays === n} onPress={() => setListDays(n)} />
            ))}
          </Row>
          <Card>
            {list.map((i) => (
              <Row key={i.key} style={{ justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Body style={{ fontSize: 14.5 }}>{i.name}</Body>
                <Mono>{i.amount}</Mono>
              </Row>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
