import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { BadgeMedal, LevelMedals } from '@/components/BadgeMedal';
import { Body, Button, Card, Label, Mono, PressScale, ProgressBar, Reveal, Row, Screen, Sheet, TierBadge } from '@/components/ui';
import { fonts, radius, spacing, tierColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { shownXp } from '@/lib/levels';
import { BADGES, useProgress, type Badge } from '@/lib/progress';
import { makeStyles, useColors } from '@/lib/theme';
import { TIER_INFO, TIER_RANK, type Tier } from '@/lib/tiers';
import { locale, tx } from '@/lib/i18n';

const ORDER: Tier[] = ['free', 'pro', 'plus', 'max'];

export default function BadgesScreen() {
  const colors = useColors();
  const { tier, profile } = useAuth();
  const { unlocked } = useProgress();
  const [open, setOpen] = useState<Badge | null>(null);
  const earned = BADGES.filter((b) => unlocked[b.id]).length;

  return (
    <Screen edges={[]}>
      <Reveal index={0}>
        <Card glow>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Koleksiyon</Label>
            <Mono style={{ color: colors.textMuted }}>
              {earned}/{BADGES.length}
            </Mono>
          </Row>
          <ProgressBar value={earned / BADGES.length} color={colors.gold} />
        </Card>
      </Reveal>

      <Reveal index={1}>
        <Card>
          <Label>Seviye rozetleri</Label>
          <LevelMedals xp={shownXp(profile?.xp, profile?.role)} />
        </Card>
      </Reveal>

      {ORDER.map((t, i) => {
        const list = BADGES.filter((b) => b.tier === t);
        const reachable = TIER_RANK[tier] >= TIER_RANK[t];
        return (
          <Reveal key={t} index={i + 2}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Label>{t === 'free' ? 'Herkese açık' : tx('{0} rozetleri', [TIER_INFO[t].name])}</Label>
              {!reachable && <TierBadge tier={t} />}
            </Row>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
              {list.map((b, j) => (
                <BadgeTile key={b.id} badge={b} earned={Boolean(unlocked[b.id])} locked={!reachable} delay={j * 250} onPress={() => setOpen(b)} />
              ))}
            </View>
          </Reveal>
        );
      })}

      <Sheet visible={open != null} onClose={() => setOpen(null)}>
        {open && (
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <BadgeMedal badge={open} earned={Boolean(unlocked[open.id])} size={110} />
            <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.text }}>{open.title}</Text>
            <Body muted style={{ textAlign: 'center' }}>
              {open.description}
            </Body>
            {unlocked[open.id] ? (
              <>
                <Mono style={{ color: colors.success }}>{tx('Kazanıldı · {0}', [new Date(unlocked[open.id]).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })])}</Mono>
                <Button
                  title="Hikâyede paylaş"
                  arrow
                  icon={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
                  onPress={() => {
                    const id = open.id;
                    setOpen(null);
                    router.push({ pathname: '/share', params: { kind: 'badge', id } });
                  }}
                />
              </>
            ) : TIER_RANK[tier] < TIER_RANK[open.tier] ? (
              <Button
                title={tx('{0} ile aç', [TIER_INFO[open.tier].name])}
                arrow
                onPress={() => {
                  setOpen(null);
                  router.push('/plans');
                }}
              />
            ) : (
              <Mono style={{ color: colors.textMuted }}>Henüz kazanılmadı</Mono>
            )}
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

function BadgeTile({ badge, earned, locked, delay, onPress }: { badge: Badge; earned: boolean; locked: boolean; delay: number; onPress: () => void }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <PressScale onPress={onPress} style={[styles.tile, earned && { borderColor: tierColors[badge.tier][0] }]}>
      <BadgeMedal badge={badge} earned={earned} locked={locked} size={58} delay={delay} />
      <Text numberOfLines={2} style={[styles.tileText, { color: earned ? colors.text : colors.textMuted }]}>
        {badge.title}
      </Text>
    </PressScale>
  );
}

const useStyles = makeStyles((colors) => ({
  tile: {
    width: 100,
    flexGrow: 1,
    maxWidth: 140,
    aspectRatio: 0.9,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: spacing.sm,
  },
  tileText: { fontFamily: fonts.bodyBold, fontSize: 11.5, textAlign: 'center' },
}));
