import { router } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { StreakPill, ThemeToggle } from '@/components/bits';
import { AvatarRing } from '@/components/BadgeMedal';
import { HabitsCard } from '@/components/HabitsCard';
import { NextUp } from '@/components/NextUp';
import { TodayRings } from '@/components/TodayRings';
import { WeekStrip } from '@/components/WeekStrip';
import { shownXp } from '@/lib/levels';
import { Avatar, Eyebrow, PressScale, Reveal, Row, Screen, TierBadge } from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { WEEKDAYS } from '@/lib/program';
import { makeStyles, useColors } from '@/lib/theme';
import { locale, tx } from '@/lib/i18n';

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export default function TodayScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { session, profile, tier } = useAuth();
  return (
    <Screen>
      <Reveal index={0}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Eyebrow>{tx('Bugün · {0}', [tx(WEEKDAYS[new Date().getDay()].day)])}</Eyebrow>
            <Text maxFontSizeMultiplier={1} style={styles.greet}>
              {tx(greeting()).toLocaleUpperCase(locale())}
              {profile?.username ? (
                <Text style={{ color: colors.silver }}>{`, ${profile.username.toLocaleUpperCase(locale())}`}</Text>
              ) : null}
            </Text>
          </View>
          <Row gap={spacing.sm}>
            <ThemeToggle />
            <PressScale onPress={() => router.push(session ? '/profile' : '/auth')}>
              <AvatarRing tier={session ? tier : null} xp={shownXp(profile?.xp, profile?.role)} size={42}>
                <Avatar name={profile?.username ?? 'K'} path={profile?.avatar_url} size={42} />
              </AvatarRing>
            </PressScale>
          </Row>
        </Row>
        <Row style={{ marginTop: spacing.sm }}>
          <TierBadge tier={tier} />
          <StreakPill />
          {!session && (
            <PressScale onPress={() => router.push('/auth')}>
              <Text style={styles.link}>Giriş yap →</Text>
            </PressScale>
          )}
        </Row>
      </Reveal>

      <Reveal index={1}>
        <NextUp />
      </Reveal>

      <Reveal index={2}>
        <TodayRings />
      </Reveal>

      <HabitsCard />

      <Reveal index={3}>
        <WeekStrip />
      </Reveal>

    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  greet: { fontFamily: fonts.display, fontSize: 30, lineHeight: 39, color: colors.text },
  link: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentBright },
}));
