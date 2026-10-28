import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Switch, View } from 'react-native';
import { Text } from '@/components/T';
import { AvatarRing, BadgeMedal, LevelMedals } from '@/components/BadgeMedal';
import { LevelBadge, LevelProgress } from '@/components/Level';
import { shownXp } from '@/lib/levels';

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
  Sheet,
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
                <Row key={t} gap={8}>
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
          <Row gap={8}>
            <TierBadge tier={tier} />
            <LevelBadge xp={shownXp(profile?.xp, profile?.role)} size="md" />
          </Row>
          <Mono style={{ color: colors.textMuted }}>
            {session.user.phone ? `+${session.user.phone.replace(/^\+/, '')}` : (session.user.email ?? '')}
          </Mono>
          <LevelProgress xp={shownXp(profile?.xp, profile?.role)} />
        </View>
        {/* Üstte tek bakışta özet: seri, rekor, rozet */}
        <Row gap={spacing.sm}>
          <Summary value={tx('{0} gün', [stats.streak])} label="Seri" emoji="🔥" />
          <Summary value={`${stats.prs}`} label="Rekor" emoji="🏆" />
          <Summary value={`${Object.keys(unlocked).length}/${BADGES.length}`} label="Rozet" emoji="🏅" onPress={() => router.push('/badges')} />
        </Row>
      </Reveal>

      {!profile?.username && (
        <Reveal index={1}>
          <Button title="Kullanıcı adı seç" arrow onPress={() => router.push('/auth/username')} />
        </Reveal>
      )}

      <Reveal index={3}>
        <PressScale onPress={() => router.push('/badges')}>
          <Card style={tier !== 'free' && { borderWidth: 0 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Label>Rozetler</Label>
              <Mono style={{ color: colors.textMuted }}>
                {Object.keys(unlocked).length}/{BADGES.length} ›
              </Mono>
            </Row>
            <LevelMedals xp={shownXp(profile?.xp, profile?.role)} />
            <View style={styles.rule} />
            {recent.length ? (
              <Row gap={spacing.sm} style={{ flexWrap: 'wrap', paddingVertical: 4 }}>
                {recent.map((b, i) => (
                  <BadgeMedal key={b.id} badge={b} earned size={44} delay={i * 300} />
                ))}
              </Row>
            ) : (
              <Body muted style={{ fontSize: 13.5 }}>
                İlk öğününü gir, ilk rozetin gelsin.
              </Body>
            )}
            {tier === 'free' && (
              <Body muted style={{ fontSize: 12.5 }}>
                Pro, Plus ve Max'ta rozetlerin parlar, vitrinin canlanır.
              </Body>
            )}
          </Card>
        </PressScale>
      </Reveal>

      {isCoach && (
        <Reveal index={4}>
          <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
            <LinkRow icon={{ ios: 'person.badge.key.fill', android: 'shield_person', web: 'shield_person' }} label="Koç paneli" href="/coach" last />
          </Card>
        </Reveal>
      )}

      {/* Menü üç grupta: İlerlemem, Topluluk, Ayarlar */}
      <Reveal index={4}>
        <Group title="İlerlemem">
          <LinkRow icon={{ ios: 'chart.xyaxis.line', android: 'monitoring', web: 'monitoring' }} label="İlerleme" sub="Kilo, kalori ve antrenman grafikleri" href="/progress" />
          <LinkRow icon={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }} label="Haftalık özet" href="/week" />
          <LinkRow
            icon={{ ios: 'target', android: 'target', web: 'target' }}
            label="Hedeflerim"
            sub={tx('{0} kcal · {1} g protein', [goals.kcal.toLocaleString(locale()), goals.protein])}
            href="/goals"
          />
          <LinkRow icon={{ ios: 'figure.stand', android: 'accessibility_new', web: 'accessibility_new' }} label="Form kontrolü" locked={!hasFeature(tier, 'form_check')} href="/form-check" />
          <LinkRow icon={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} label="Haftalık check-in" locked={tier !== 'max'} href="/checkin" last />
        </Group>
      </Reveal>

      <Reveal index={5}>
        <Group title="Topluluk">
          <LinkRow icon={{ ios: 'trophy.fill', android: 'trophy', web: 'trophy' }} label="Sıralama" href="/leaderboard" />
          <LinkRow icon={{ ios: 'flag.checkered', android: 'flag', web: 'flag' }} label="Haftalık meydan okuma" href="/challenges" />
          <LinkRow icon={{ ios: 'person.2.fill', android: 'group', web: 'group' }} label="Arkadaşlar" href="/friends" />
          <LinkRow icon={{ ios: 'gift.fill', android: 'redeem', web: 'redeem' }} label="Arkadaşını davet et" href="/invite" last={!(hasFeature(tier, 'coach_dm') && !isCoach)} />
          {hasFeature(tier, 'coach_dm') && !isCoach && (
            <LinkRow icon={{ ios: 'bubble.left.and.text.bubble.right.fill', android: 'forum', web: 'forum' }} label="Koçuma yaz" href="/dm/me" last />
          )}
        </Group>
      </Reveal>

      <Reveal index={5}>
        <Group title="Ayarlar">
          <LinkRow icon={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }} label="Hatırlatmalar" href="/reminders" last />
          <Settings />
        </Group>
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
          <Text style={styles.signOutText}>{tx('Çıkış yap')}</Text>
        </PressScale>
        <DeleteAccount />
      </Reveal>
    </Screen>
  );
}

// Hesabı kalıcı olarak silme (mağaza şartı). Onay penceresiyle korunur.
function DeleteAccount() {
  const colors = useColors();
  const { deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const err = await deleteAccount();
    setBusy(false);
    if (err) return setError(err);
    setOpen(false);
  }

  return (
    <>
      <PressScale onPress={() => setOpen(true)} style={{ alignSelf: 'center', padding: spacing.sm }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textDim, textDecorationLine: 'underline' }}>Hesabımı sil</Text>
      </PressScale>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Hesabını sil">
        <Body muted>
          Hesabın, profilin, öğün ve antrenman kayıtların, check-in fotoğrafların ve mesajların kalıcı olarak silinir. Bu işlem geri
          alınamaz. Ücretli üyeliğin varsa aboneliğini App Store ya da Google Play'den ayrıca iptal etmelisin.
        </Body>
        {error && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger }}>{error}</Text>}
        <Button title="Evet, hesabımı sil" loading={busy} onPress={run} />
        <Button title="Vazgeç" variant="ghost" onPress={() => setOpen(false)} />
      </Sheet>
    </>
  );
}

function Summary({ value, label, emoji, onPress }: { value: string; label: string; emoji: string; onPress?: () => void }) {
  const styles = useStyles();
  return (
    <PressScale flex onPress={onPress} style={styles.summary}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
      <Text raw style={styles.summaryValue}>
        {value}
      </Text>
      <Label>{label}</Label>
    </PressScale>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Label style={{ marginLeft: 4 }}>{title}</Label>
      <Card style={{ gap: 0, paddingVertical: spacing.xs }}>{children}</Card>
    </View>
  );
}

// Profil fotoğrafı: dokununca galeriden kare kırpılmış fotoğraf seçilir.
function ProfilePhoto() {
  const colors = useColors();
  const styles = useStyles();
  const { session, profile, tier, refreshProfile } = useAuth();
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
    <View style={{ alignItems: 'center', gap: 8 }}>
      <PressScale onPress={change}>
        <AvatarRing tier={tier} xp={shownXp(profile?.xp, profile?.role)} size={88}>
          <Avatar name={profile?.username} path={profile?.avatar_url} size={88} />
        </AvatarRing>
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

function LinkRow({ icon, label, href, last, sub, locked }: { icon: IconName; label: string; href: Href; last?: boolean; sub?: string; locked?: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <PressScale onPress={() => router.push(href)} style={[styles.linkRow, !last && styles.linkBorder]}>
      <Icon name={icon} size={18} color={colors.accentBright} />
      <View style={{ flex: 1 }}>
        <Text style={styles.linkText}>{label}</Text>
        {sub ? (
          <Text raw style={styles.linkSub}>
            {sub}
          </Text>
        ) : null}
      </View>
      {locked && <Icon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={13} color={colors.textDim} />}
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
    <View style={{ gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
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
    </View>
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
        <Row key={p} gap={8}>
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
  rule: { height: 1, backgroundColor: colors.border },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  linkBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  linkText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  linkSub: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted, marginTop: 4 },
  summary: { alignItems: 'center', gap: 4, paddingVertical: spacing.sm, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  summaryValue: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  username: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  signOutText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.danger },
}));
