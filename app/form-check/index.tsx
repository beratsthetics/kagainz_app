import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';

import { CheckinPhoto } from '@/components/CheckinPhoto';

import {
  Body,
  Button,
  Card,
  EmptyState,
  Heading,
  Input,
  Label,
  LockedCard,
  Mono,
  PressScale,
  Reveal,
  Row,
  Screen,
  Sheet,
  SkeletonList,
  Tag,
} from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { FORM_CHECK_SELECT, formCheckTitle, nextAllowedAt, PHYSIQUE, POSES, type FormCheck } from '@/lib/formcheck';
import { pickImage, uploadBase64, uploadFile } from '@/lib/media';
import { useProgress } from '@/lib/progress';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { hasFeature } from '@/lib/tiers';
import { locale, tx } from '@/lib/i18n';

export default function FormCheckList() {
  const colors = useColors();
  const { session, tier } = useAuth();
  const { bump } = useProgress();
  const [items, setItems] = useState<FormCheck[] | null>(null);
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<(ImagePicker.ImagePickerAsset | null)[]>([null, null, null]);
  const [note, setNote] = useState('');
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allowed = hasFeature(tier, 'form_check');

  const load = useCallback(() => {
    if (!session || !isSupabaseConfigured) return setItems([]);
    supabase
      .from('form_checks')
      .select(FORM_CHECK_SELECT)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setItems((data ?? []) as unknown as FormCheck[]));
  }, [session]);

  useEffect(load, [load]);

  if (!allowed) {
    return (
      <Screen edges={[]}>
        <LockedCard
          tier="max"
          title="Form check"
          body="Önden, yandan ve arkadan fotoğrafını gönder, koçun formuna bakıp yorum yazsın."
          preview={[['Önden', '✓'], ['Yandan', '✓'], ['Arkadan', '✓']]}
          onPress={() => router.push('/plans')}
        />
      </Screen>
    );
  }

  const next = nextAllowedAt(tier, items?.[0]);
  const ready = next != null && next <= new Date();
  const daysLeft = next ? Math.ceil((next.getTime() - Date.now()) / 86400000) : 0;

  async function pickPose(i: number, camera: boolean) {
    const a = await pickImage(camera);
    if (!a) return;
    setPhotos((prev) => prev.map((p, j) => (j === i ? a : p)));
  }

  async function pick(camera: boolean) {
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['videos'],
      videoMaxDuration: 60,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    };
    if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return;
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    const asset = res.canceled ? null : res.assets[0];
    if (!asset) return;
    if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) return setError('Video 50 MB sınırını aşıyor. Daha kısa çek.');
    if (asset.duration && asset.duration > 61000) return setError('Video en fazla 60 saniye olabilir.');
    setError(null);
    setVideo(asset);
  }

  async function submit() {
    if (!session || photos.some((p) => !p)) return;
    setBusy(true);
    setError(null);
    const uploaded: string[] = [];
    try {
      const ts = Date.now();
      for (const [i, p] of photos.entries()) {
        const type = p!.mimeType === 'image/png' || p!.mimeType === 'image/webp' ? p!.mimeType : 'image/jpeg';
        const ext = type.split('/')[1].replace('jpeg', 'jpg');
        uploaded.push(await uploadBase64('form-checks', `${session.user.id}/${ts}-${POSES[i].key}.${ext}`, p!.base64!, type));
      }
      let videoPath: string | null = null;
      if (video) {
        const ext = video.mimeType?.includes('quicktime') ? 'mov' : 'mp4';
        videoPath = await uploadFile('form-checks', `${session.user.id}/${ts}-pose.${ext}`, video.uri, video.mimeType ?? 'video/mp4');
        uploaded.push(videoPath);
      }
      const { error: err } = await supabase
        .from('form_checks')
        .insert({ user_id: session.user.id, exercise_id: PHYSIQUE, note: note.trim() || null, photos: uploaded.slice(0, 3), video_path: videoPath });
      if (err) throw err;
      bump('formChecks');
      setOpen(false);
      setPhotos([null, null, null]);
      setVideo(null);
      setNote('');
      load();
    } catch (e) {
      if (uploaded.length) await supabase.storage.from('form-checks').remove(uploaded);
      setError(e instanceof Error ? e.message : 'Yüklenemedi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={[]}>
      <Reveal index={0}>
        <Card glow>
          <Label>Sıradaki hakkın</Label>
          <Heading style={{ fontSize: 24 }}>{ready ? 'Şimdi gönderebilirsin' : tx('{0} gün sonra', [daysLeft])}</Heading>
          <Body muted style={{ fontSize: 13.5 }}>
            Önden, yandan ve arkadan birer fotoğraf. Aynı ışıkta, tüm vücut görünecek şekilde çek. Koç formuna, yağ ve kas durumuna bakıp yorum yazar.
          </Body>
          <Button title="Yeni form check" arrow disabled={!ready} onPress={() => setOpen(true)} />
        </Card>
      </Reveal>

      {(items?.filter((f) => f.photos.length === 3).length ?? 0) >= 2 && (
        <Reveal index={1}>
          <Button
            title="Önce / sonra karşılaştır"
            variant="outline"
            icon={{ ios: 'photo.on.rectangle', android: 'compare', web: 'compare' }}
            onPress={() => router.push('/compare')}
          />
        </Reveal>
      )}

      <Reveal index={1}>
        <Label>Gönderdiklerin</Label>
      </Reveal>
      {items == null ? (
        <SkeletonList count={3} />
      ) : items.length === 0 ? (
        <EmptyState icon={{ ios: 'figure.stand', android: 'accessibility_new', web: 'accessibility_new' }} title="Henüz form check yok" body="İlk form check'ini gönder, koçun yorumları burada görünsün." />
      ) : (
        items.map((f, i) => (
          <Reveal key={f.id} index={2 + i}>
            <PressScale onPress={() => router.push({ pathname: '/form-check/[id]', params: { id: f.id } })}>
              <Card>
                {f.photos.length > 0 && (
                  <Row gap={spacing.xs}>
                    {f.photos.map((p) => (
                      <View key={p} style={{ flex: 1 }}>
                        <CheckinPhoto bucket="form-checks" path={p} width="100%" />
                      </View>
                    ))}
                  </Row>
                )}
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.text }}>{formCheckTitle(f)}</Text>
                  {f.status === 'reviewed' ? (
                    <Tag color={colors.success} bg={colors.successSoft}>
                      Yorumlandı
                    </Tag>
                  ) : (
                    <Tag color={colors.fat} bg={colors.surfaceHigh}>
                      Bekliyor
                    </Tag>
                  )}
                </Row>
                <Mono style={{ color: colors.textMuted }}>
                  {new Date(f.created_at).toLocaleDateString(locale(), { day: 'numeric', month: 'long' })}
                </Mono>
              </Card>
            </PressScale>
          </Reveal>
        ))
      )}

      <Sheet visible={open} onClose={() => !busy && setOpen(false)} title="Form check gönder">
        <Label>Fotoğraflar</Label>
        <Row gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
          {POSES.map((pose, i) => (
            <View key={pose.key} style={{ flex: 1, gap: 8 }}>
              {photos[i] ? (
                <CheckinPhoto uri={photos[i]!.uri} width="100%" />
              ) : (
                <View
                  style={{
                    width: '100%',
                    aspectRatio: 3 / 4,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ fontSize: 28, opacity: 0.5 }}>🧍</Text>
                </View>
              )}
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, textAlign: 'center', color: photos[i] ? colors.success : colors.text }}>{pose.label}</Text>
              <Row gap={4}>
                <View style={{ flex: 1 }}>
                  <Button title="📷" variant="outline" onPress={() => pickPose(i, true)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="🖼️" variant="outline" onPress={() => pickPose(i, false)} />
                </View>
              </Row>
            </View>
          ))}
        </Row>
        <Label>Not (isteğe bağlı)</Label>
        <Input value={note} onChangeText={setNote} placeholder="ör. Son bir ayda 2 kg verdim, karın bölgesi zor iniyor" multiline maxLength={500} />
        <Label>Poz videosu (isteğe bağlı)</Label>
        <Row gap={spacing.sm}>
          <View style={{ flex: 1 }}>
            <Button title="Çek" variant="outline" icon={{ ios: 'video.fill', android: 'videocam', web: 'videocam' }} onPress={() => pick(true)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Galeriden" variant="outline" icon={{ ios: 'photo.on.rectangle', android: 'video_library', web: 'video_library' }} onPress={() => pick(false)} />
          </View>
        </Row>
        {video && (
          <Mono style={{ color: colors.success }}>{tx('Video seçildi{0}', [video.duration ? ` · ${Math.round(video.duration / 1000)} sn` : ''])}</Mono>
        )}
        {error && <Text style={{ fontFamily: fonts.bodyBold, color: colors.danger }}>{error}</Text>}
        <Button title={busy ? 'Yükleniyor...' : 'Gönder'} arrow disabled={photos.some((p) => !p) || busy} onPress={submit} />
      </Sheet>
    </Screen>
  );
}
