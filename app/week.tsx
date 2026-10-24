import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { LOGO_BLUE } from '@/components/Logo';
import { Body, Button, Card, Eyebrow, GradientCard, Hero, Label, Mono, Reveal, Row, Screen, Segmented, SkeletonList } from '@/components/ui';
import { fonts, radius, spacing, tierColors } from '@/constants/theme';
import { useDaily } from '@/lib/daily';
import { makeStyles, useColors } from '@/lib/theme';
import { useWeekSummary, type WeekSummary } from '@/lib/week';

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function WeekScreen() {
  const colors = useColors();
  const styles = useStyles();
  const params = useLocalSearchParams<{ offset?: string }>();
  const [offset, setOffset] = useState<'0' | '-1'>(params.offset === '-1' ? '-1' : '0');
  const week = useWeekSummary(Number(offset));
  const { goals } = useDaily();

  return (
    <Screen edges={[]}>
      <Reveal index={0}>
        <Eyebrow>{week?.label ?? ' '}</Eyebrow>
        <Hero lines={['Haftanın', 'özeti']} size={48} />
      </Reveal>
      <Reveal index={1}>
        <Segmented
          options={[
            { value: '0', label: 'Bu hafta' },
            { value: '-1', label: 'Geçen hafta' },
          ]}
          value={offset}
          onChange={setOffset}
        />
      </Reveal>

      {!week ? (
        <SkeletonList variant="detail" />
      ) : (
        <View key={offset} style={{ gap: spacing.md }}>
          <Animated.View entering={FadeInDown.duration(380)}>
            <GradientCard colors={tierColors.pro}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <View>
                  <Label>Antrenman</Label>
                  <Row gap={10} style={{ alignItems: 'flex-end' }}>
                    <CountUp value={week.workouts} style={styles.hero} />
                    <Delta now={week.workouts} prev={week.prev?.workouts} />
                  </Row>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Label>Aktif gün</Label>
                  <Text style={styles.side}>{week.activeDays}/7</Text>
                </View>
              </Row>
              <DayRow week={week} />
            </GradientCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(90).duration(380)}>
            <Card>
              <Label>Beslenme</Label>
              <Row gap={spacing.sm}>
                <Box label="Ort. kalori" value={week.avgKcal ? week.avgKcal.toLocaleString('tr-TR') : '–'} hint={`hedef ${goals.kcal.toLocaleString('tr-TR')}`} />
                <Box label="Ort. protein" value={week.avgProtein ? `${week.avgProtein} g` : '–'} hint={`hedef ${goals.protein} g`} color={colors.protein} />
              </Row>
              <Row gap={spacing.sm}>
                <Box label="Protein hedefi" value={`${week.proteinDays}/7 gün`} color={colors.protein} />
                <Box label="Su hedefi" value={`${week.waterDays}/7 gün`} color={colors.water} />
              </Row>
              <Mono style={{ color: colors.textMuted, fontSize: 12 }}>{week.loggedDays} gün öğün girdin.</Mono>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(380)}>
            <Card>
              <Label>Antrenman detayı</Label>
              <Row gap={spacing.sm}>
                <Box label="Hacim" value={week.volume ? `${week.volume.toLocaleString('tr-TR')} kg` : '–'} />
                <Box label="Süre" value={week.minutes ? `${week.minutes} dk` : '–'} />
              </Row>
              <Row gap={spacing.sm}>
                <Box label="Set" value={`${week.sets}`} />
                <Box label="Rekor" value={week.prs ? `🏆 ${week.prs}` : '–'} color={colors.fat} />
              </Row>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(270).duration(380)}>
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <View>
                  <Label>Kilo</Label>
                  <Text style={styles.side}>{weightText(week)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Label>Seri</Label>
                  <Text style={styles.side}>🔥 {week.streak} gün</Text>
                </View>
              </Row>
              {week.weightStart == null && (
                <PressLink label="Kilonu gir, değişimi burada gör" onPress={() => router.push('/progress')} />
              )}
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(360).duration(380)}>
            <Card style={{ borderColor: colors.accent }}>
              <Body style={{ fontSize: 15 }}>{verdict(week)}</Body>
            </Card>
          </Animated.View>

          <Button title="Haftalık check-in" variant="outline" icon={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} onPress={() => router.push('/checkin')} />
          <Button
            title="Hikâyede paylaş"
            arrow
            icon={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
            onPress={() => router.push({ pathname: '/share', params: { kind: 'week', offset } })}
          />
        </View>
      )}
    </Screen>
  );
}

function weightText(w: WeekSummary) {
  if (w.weightStart == null) return '–';
  if (w.weightEnd == null) return `${w.weightStart.toLocaleString('tr-TR')} kg`;
  const d = Math.round((w.weightEnd - w.weightStart) * 10) / 10;
  return `${d > 0 ? '+' : ''}${d.toLocaleString('tr-TR')} kg`;
}

// Haftanın tek cümlelik yorumu.
function verdict(w: WeekSummary) {
  if (w.activeDays === 0) return 'Bu hafta henüz kayıt yok. Bugün bir öğün girerek başla, seri kendiliğinden gelir.';
  const parts: string[] = [];
  if (w.workouts >= 4) parts.push(`${w.workouts} antrenmanla çok güçlü bir hafta`);
  else if (w.workouts > 0) parts.push(`${w.workouts} antrenman yaptın`);
  else parts.push('Bu hafta antrenman yok');
  if (w.prev && w.workouts > w.prev.workouts) parts.push(`geçen haftadan ${w.workouts - w.prev.workouts} fazla`);
  if (w.proteinDays >= 5) parts.push('proteini neredeyse her gün tutturdun');
  else if (w.loggedDays > 0 && w.proteinDays <= 2) parts.push('protein hedefine biraz daha odaklan');
  return `${parts.join(', ')}. ${w.activeDays >= 6 ? 'Disiplin tam.' : 'Gelecek hafta bir gün daha ekle.'}`;
}

function Delta({ now, prev }: { now: number; prev?: number }) {
  const colors = useColors();
  if (prev == null || now === prev) return null;
  const up = now > prev;
  return (
    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, marginBottom: 12, color: up ? colors.success : colors.textMuted }}>
      {up ? '▲' : '▼'} {Math.abs(now - prev)} geçen haftaya göre
    </Text>
  );
}

function DayRow({ week }: { week: WeekSummary }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: spacing.sm }}>
      {week.days.map((d, i) => (
        <View key={d.day} style={{ alignItems: 'center', gap: 6 }}>
          <Animated.View
            entering={ZoomIn.delay(200 + i * 60).springify()}
            style={[
              styles.day,
              d.workouts > 0
                ? { backgroundColor: LOGO_BLUE, borderColor: LOGO_BLUE }
                : d.active
                  ? { backgroundColor: colors.surfaceHigh, borderColor: colors.borderStrong }
                  : d.future
                    ? { borderStyle: 'dashed' }
                    : null,
            ]}>
            {d.workouts > 0 ? <Text style={{ fontSize: 14 }}>💪</Text> : d.active ? <Text style={{ fontSize: 12 }}>✓</Text> : null}
          </Animated.View>
          <Text style={styles.dayLabel}>{WEEKDAYS[i]}</Text>
        </View>
      ))}
    </Row>
  );
}

function Box({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.box}>
      <Row gap={6}>
        {color && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />}
        <Label>{label}</Label>
      </Row>
      <Text style={styles.boxValue}>{value}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

function PressLink({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Text onPress={onPress} style={styles.link}>
      {label} →
    </Text>
  );
}

function CountUp({ value, style }: { value: number; style: object }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 700);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t === 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [value]);
  return <Text style={style}>{shown}</Text>;
}

const useStyles = makeStyles((colors) => ({
  hero: { fontFamily: fonts.display, fontSize: 76, lineHeight: 82, color: colors.text },
  side: { fontFamily: fonts.display, fontSize: 26, color: colors.text, marginTop: 4 },
  day: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted },
  box: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, gap: 4 },
  boxValue: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: 11.5, color: colors.textMuted },
  link: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.accentBright, marginTop: spacing.xs },
}));
