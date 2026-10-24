import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Switch, View } from 'react-native';
import { Text } from '@/components/T';
import { LevelBadge, LevelProgress } from '@/components/Level';

import {
  Avatar,
  Body,
  Button,
  Card,
  GradientCard,
  Heading,
  Hero,
  Icon,
  Label,
  Mono,
  PressScale,
  Reveal,
  Row,
  Screen,
  Segmented,
  TierBadge,
  type IconName,
} from '@/components/ui';
import { fonts, spacing, tierColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useDaily } from '@/lib/daily';
import { useLeaderboardVisible } from '@/lib/leaderboard';
import { pickImage, removeAvatar, uploadAvatar } from '@/lib/media';
import { BADGES, useProgress } from '@/lib/progress';
import { hasFeature, TIER_INFO } from '@/lib/tiers';
import { makeStyles, useColors, useTheme } from '@/lib/theme';
import { LANGS, locale, tx, useLangPref } from '@/lib/i18n';

const CHECK: IconName = { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' };

export default function ProfileScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { session, profile, tier, signOut, isCoach } = useAuth();
  const { goals } = useDaily();
  const { stats, unlocked } = useProgress();
  const recent = BADGES.filter((b) => unlocked[b.id])
    .sort((a, b) => unlocked[b.id].localeCompare(unlocked[a.id]))
    .slice(0, 6);

  if (!session) {
    return (
      <Screen>
        <Reveal index={0}>
          <Hero lines={['Hesabını', 'oluştur']} size={52} />
        </Reveal>
        <Reveal index={1}>
          <Body muted>Makrolarını hesaplamak, ilerlemeni kaydetmek ve toplulukta yazmak için e-posta, telefon ya da Google ile giriş yap.</Body>
        </Reveal>
        <Reveal index={2}>
          <Card glow>
            {['Google, e-posta ya da telefonla saniyeler içinde', 'Günlüğün, antrenmanların ve rozetlerin her cihazda', 'Toplulukta kendi kullanıcı adın'].map(
              (t) => (
                <Row key={t} gap={10}>
                  <Icon name={CHECK} size={16} color={colors.success} />
                  <Body style={{ fontSize: 14 }}>{t}</Body>
                </Row>
              ),
            )}
            <View style={{ marginTop: spacing.sm }}>
              <Button title="Giriş yap / Kayıt ol" arrow onPress={() => router.push('/auth')} />
            </View>
          </Card>
        </Reveal>
        <Reveal index={3}>
          <MembershipCard />
        </Reveal>
      </Screen>
    );
  }

  return (
    <Screen>
      <Reveal index={0}>
        <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md }}>
          <ProfilePhoto />
          <Text style={styles.username}>@{profile?.username ?? 'kullanıcı adı yok'}</Text>
          <Row gap={6}>
            <TierBadge tier={tier} />
            <LevelBadge xp={profile?.xp} size="md" />
          </Row>
          <Mono style={{ color: colors.textMuted }}>
            {session.user.phone ? `+${session.user.phone.replace(/^\+/, '')}` : (session.user.email ?? '')}
          </Mono>
          <LevelProgress xp={profile?.xp} />
        </View>
      </Reveal>

      {!profile?.username && (
        <Reveal index={1}>
          <Button title="Kullanıcı adı seç" arrow onPress={() => router.push('/auth/username')} />
        </Reveal>
      )}

      <Reveal index={2}>
        <Card>
          <Label>Günlük hedefler</Label>
          <Row style={{ justifyContent: 'space-between' }}>
            <Goal label="Kalori" value={`${goals.kcal}`} />
            <Goal label="Protein" value={`${goals.protein}g`} color={colors.protein} />
            <Goal label="Karb." value={`${goals.carb}g`} color={colors.carb} />
            <Goal label="Yağ" value={`${goals.fat}g`} color={colors.fat} />
          </Row>
        </Card>
      </Reveal>

      <Reveal index={3}>
        <PressScale onPress={() => router.push('/badges')}>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Label>Rozetler</Label>
              <Mono style={{ color: colors.textMuted }}>
                {Object.keys(unlocked).length}/{BADGES.length} ›
              </Mono>
            </Row>
            {recent.length ? (
              <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
                {recent.map((b) => (
                  <View key={b.id} style={styles.badge}>
                    <Text style={{ fontSize: 24 }}>{b.emoji}</Text>
                  </View>
                ))}
              </Row>
            ) : (
              <Body muted style={{ fontSize: 13.5 }}>
                İlk öğününü gir, ilk rozetin gelsin.
              </Body>
            )}
            <Row gap={spacing.md}>
              <Mono style={{ color: colors.textMuted }}>{tx('🔥 {0} gün seri', [stats.streak])}</Mono>
              <Mono style={{ color: colors.textMuted }}>{tx('🏆 {0} rekor', [stats.prs])}</Mono>
            </Row>
          </Card>
        </PressScale>
      </Reveal>

      <Reveal index={4}>
        <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
          {isCoach && <LinkRow icon={{ ios: 'person.badge.key.fill', android: 'shield_person', web: 'shield_person' }} label="Koç paneli" href="/coach" />}
          <LinkRow icon={{ ios: 'chart.xyaxis.line', android: 'monitoring', web: 'monitoring' }} label="İlerleme" href="/progress" />
          <LinkRow icon={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} label="Haftalık check-in" href="/checkin" />
          <LinkRow icon={{ ios: 'target', android: 'target', web: 'target' }} label="Hedeflerim" href="/goals" />
          <LinkRow icon={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }} label="Haftalık özet" href="/week" />
          <LinkRow icon={{ ios: 'trophy.fill', android: 'trophy', web: 'trophy' }} label="Sıralama" href="/leaderboard" />
          <LinkRow icon={{ ios: 'person.2.fill', android: 'group', web: 'group' }} label="Arkadaşlar" href="/friends" />
          <LinkRow icon={{ ios: 'gift.fill', android: 'redeem', web: 'redeem' }} label="Arkadaşını davet et" href="/invite" />
          <LinkRow icon={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }} label="Hatırlatmalar" href="/reminders" />
          <LinkRow icon={{ ios: 'flag.checkered', android: 'flag', web: 'flag' }} label="Haftalık meydan okuma" href="/challenges" />
          {hasFeature(tier, 'form_check') && (
            <LinkRow icon={{ ios: 'video.fill', android: 'videocam', web: 'videocam' }} label="Form kontrol" href="/form-check" />
          )}
          {hasFeature(tier, 'coach_dm') && !isCoach && (
            <LinkRow icon={{ ios: 'bubble.left.and.text.bubble.right.fill', android: 'forum', web: 'forum' }} label="Koçuma yaz" href="/dm/me" last />
          )}
        </Card>
      </Reveal>

      <Reveal index={5}>
        <Settings />
      </Reveal>

      <Reveal index={6}>
        <MembershipCard />
      </Reveal>

      <Reveal index={7}>
        <PressScale onPress={signOut} style={styles.signOut}>
          <Icon
            name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
            size={18}
            color={colors.danger}
          />
          <Text style={styles.signOutText}>{tx('Çıkış yap').toLocaleUpperCase(locale())}</Text>
        </PressScale>
      </Reveal>
    </Screen>
  );
}

function Goal({ label, value, color }: { label: string; value: string; color?: string }) {
  const colors = useColors();
  color ??= colors.text;
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 22, color }}>{value}</Text>
      <Label>{label}</Label>
    </View>
  );
}

// Profil fotoğrafı: dokununca galeriden kare kırpılmış fotoğraf seçilir.
function ProfilePhoto() {
  const colors = useColors();
  const styles = useStyles();
  const { session, profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = session?.user.id;

  async function change() {
    if (!userId || busy) return;
    const asset = await pickImage(false, true);
    if (!asset?.base64) return;
    setBusy(true);
    setError(null);
    const err = await uploadAvatar(userId, asset.base64, asset.mimeType, profile?.avatar_url);
    if (!err) await refreshProfile();
    setBusy(false);
    setError(err);
  }

  async function remove() {
    if (!userId || busy) return;
    setBusy(true);
    const err = await removeAvatar(userId, profile?.avatar_url);
    if (!err) await refreshProfile();
    setBusy(false);
    setError(err);
  }

  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <PressScale onPress={change}>
        <Avatar name={profile?.username} path={profile?.avatar_url} size={88} />
        <View style={styles.camera}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.primaryText} />
          ) : (
            <Icon name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} size={14} color={colors.primaryText} />
          )}
        </View>
      </PressScale>
      {profile?.avatar_url && !busy && (
        <PressScale onPress={remove}>
          <Text style={styles.removePhoto}>Fotoğrafı kaldır</Text>
        </PressScale>
      )}
      {error && <Text style={styles.photoError}>{error}</Text>}
    </View>
  );
}

function LinkRow({ icon, label, href, last }: { icon: IconName; label: string; href: Href; last?: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <PressScale onPress={() => router.push(href)} style={[styles.linkRow, !last && styles.linkBorder]}>
      <Icon name={icon} size={18} color={colors.accentBright} />
      <Text style={styles.linkText}>{label}</Text>
      <Icon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} color={colors.textDim} />
    </PressScale>
  );
}

function Settings() {
  const colors = useColors();
  const { pref, setPref } = useTheme();
  const [leaderboardVisible, setLeaderboardVisible] = useLeaderboardVisible();
  const [lang, setLang] = useLangPref();
  return (
    <Card>
      <Label>Dil / Language</Label>
      <Segmented options={LANGS} value={lang} onChange={setLang} />
      <Label>Görünüm</Label>
      <Segmented
        options={[
          { value: 'dark', label: 'Koyu' },
          { value: 'light', label: 'Açık' },
          { value: 'system', label: 'Sistem' },
        ]}
        value={pref}
        onChange={setPref}
      />
      <Row style={{ justifyContent: 'space-between', marginTop: spacing.xs }}>
        <View style={{ flex: 1 }}>
          <Body style={{ fontSize: 14.5 }}>Sıralamada görün</Body>
          <Body muted style={{ fontSize: 12.5 }}>
            Kapatırsan serin ve antrenmanların sıralamada gösterilmez.
          </Body>
        </View>
        <Switch value={leaderboardVisible} trackColor={{ true: colors.accent, false: colors.surfaceHigh }} onValueChange={setLeaderboardVisible} />
      </Row>
    </Card>
  );
}

function MembershipCard() {
  const colors = useColors();
  const { tier } = useAuth();
  return (
    <GradientCard colors={tierColors[tier === 'free' ? 'pro' : tier]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Label>Üyeliğin</Label>
        <TierBadge tier={tier} />
      </Row>
      <Heading style={{ fontSize: 26 }}>{TIER_INFO[tier].name}</Heading>
      {TIER_INFO[tier].perks.map((p) => (
        <Row key={p} gap={10}>
          <Icon name={CHECK} size={15} color={colors.success} />
          <Body muted style={{ flex: 1, fontSize: 14 }}>
            {p}
          </Body>
        </Row>
      ))}
      <View style={{ marginTop: spacing.sm }}>
        <Button title={tier === 'free' ? "Pro'ya geç" : 'Paketleri gör'} arrow onPress={() => router.push('/plans')} />
      </View>
    </GradientCard>
  );
}

const useStyles = makeStyles((colors) => ({
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.background,
  },
  removePhoto: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.textMuted },
  photoError: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.danger, textAlign: 'center' },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md - 2 },
  linkBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  linkText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  username: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  signOutText: { fontFamily: fonts.displayMedium, fontSize: 15, letterSpacing: 1, color: colors.danger },
}));
