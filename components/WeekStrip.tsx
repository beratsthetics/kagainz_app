import { router } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { Card, Icon, Label, PressScale, ProgressBar, Row } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { challengeProgress } from '@/lib/challenges';
import { locale, tx } from '@/lib/i18n';
import { WEEKDAYS } from '@/lib/program';
import { useProgress } from '@/lib/progress';
import { dayKey } from '@/lib/store';
import { useColors } from '@/lib/theme';
import { featuredWeekOffset, weekStart } from '@/lib/week';

// Ana sayfanın altındaki "Bu hafta" şeridi: Pazartesi-Pazar her gün bir daire
// (dolu = antrenman, halka = öğün kaydı), altında haftanın meydan okuması. Dokununca haftalık özet.
export function WeekStrip() {
  const colors = useColors();
  const { activity } = useProgress();
  const challenge = challengeProgress(activity);
  const start = weekStart(0);
  const today = dayKey();
  const featured = featuredWeekOffset();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = dayKey(d);
    const a = activity[key] ?? {};
    return { key, short: WEEKDAYS[d.getDay()].short, trained: (a.w ?? 0) > 0, logged: (a.m ?? 0) > 0, isToday: key === today, future: key > today };
  });
  const trainedCount = days.filter((d) => d.trained).length;

  return (
    <Card>
      <PressScale onPress={() => router.push({ pathname: '/week', params: { offset: String(featured ?? 0) } })}>
        <View style={{ gap: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Bu hafta</Label>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.accentBright }}>
              {featured === -1 ? 'Geçen haftanın özeti →' : featured === 0 ? 'Haftalık özetin hazır →' : tx('{0} antrenman →', [trainedCount])}
            </Text>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            {days.map((d) => (
              <View key={d.key} style={{ alignItems: 'center', gap: 8, flex: 1 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: d.trained ? colors.accent : 'transparent',
                    borderWidth: d.isToday ? 2 : 1.5,
                    borderColor: d.trained ? colors.accent : d.logged ? colors.accentBright : d.isToday ? colors.text : colors.border,
                    opacity: d.future ? 0.45 : 1,
                  }}>
                  {d.trained ? (
                    <Icon name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={14} color={colors.primaryText} />
                  ) : d.logged ? (
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentBright }} />
                  ) : null}
                </View>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10.5, color: d.isToday ? colors.text : colors.textDim }}>{d.short}</Text>
              </View>
            ))}
          </Row>
        </View>
      </PressScale>
      <PressScale onPress={() => router.push('/challenges')}>
        <View style={{ gap: 8, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={spacing.sm} style={{ flex: 1 }}>
              <Text style={{ fontSize: 18 }}>{challenge.challenge.emoji}</Text>
              <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.text, flex: 1 }}>
                {challenge.challenge.title}
              </Text>
            </Row>
            <Text raw style={{ fontFamily: fonts.mono, fontSize: 12.5, color: challenge.done ? colors.success : colors.textMuted }}>
              {challenge.value.toLocaleString(locale())}/{challenge.challenge.target}
            </Text>
          </Row>
          <ProgressBar value={challenge.value / challenge.challenge.target} color={challenge.done ? colors.success : colors.accent} height={5} />
        </View>
      </PressScale>
    </Card>
  );
}
