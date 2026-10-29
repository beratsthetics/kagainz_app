import { View } from 'react-native';
import { Text } from '@/components/T';

import { Card, Icon, Label, Mono, PressScale, Reveal, Row } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useHabits } from '@/lib/habits';
import { tx } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import { hasFeature } from '@/lib/tiers';

// Bugün sayfasında koçun verdiği günlük görevler (Max). Görev yoksa hiç görünmez.
export function HabitsCard() {
  const colors = useColors();
  const { session, tier } = useAuth();
  const allowed = hasFeature(tier, 'habits');
  const { habits, done, weekCount, toggle } = useHabits(allowed ? session?.user.id : undefined);
  if (!allowed || !habits?.length) return null;
  const finished = habits.filter((h) => done(h.id)).length;

  return (
    <Reveal index={2}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Koçunun görevleri</Label>
          <Mono style={{ color: colors.textMuted, fontSize: 12 }}>
            {tx('{0}/{1} tamam', [finished, habits.length])}
          </Mono>
        </Row>
        {habits.map((h) => {
          const ok = done(h.id);
          return (
            <PressScale key={h.id} onPress={() => toggle(h.id)}>
              <Row gap={spacing.md} style={{ paddingVertical: spacing.xs }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: radius.sm,
                    borderWidth: 1.5,
                    borderColor: ok ? colors.success : colors.borderStrong,
                    backgroundColor: ok ? colors.success : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {ok && (
                    <Icon
                      name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                      size={15}
                      color={colors.primaryText}
                    />
                  )}
                </View>
                <Text
                  raw
                  style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: ok ? colors.textMuted : colors.text }}>
                  {h.title}
                </Text>
                <Mono style={{ color: colors.textDim, fontSize: 12 }}>{tx('{0}/7 gün', [weekCount(h.id)])}</Mono>
              </Row>
            </PressScale>
          );
        })}
      </Card>
    </Reveal>
  );
}
