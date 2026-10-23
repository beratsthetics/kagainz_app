import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import {
  Body,
  Button,
  Card,
  Chip,
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
  Tag,
} from '@/components/ui';
import { fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { exerciseById, EXERCISES } from '@/lib/exercises';
import { FORM_CHECK_SELECT, nextAllowedAt, type FormCheck } from '@/lib/formcheck';
import { uploadFile } from '@/lib/media';
import { useProgress } from '@/lib/progress';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { hasFeature, LIMITS } from '@/lib/tiers';

export default function FormCheckList() {
  const colors = useColors();
  const { session, tier } = useAuth();
  const { bump } = useProgress();
  const [items, setItems] = useState<FormCheck[] | null>(null);
  const [open, setOpen] = useState(false);
  const [exerciseId, setExerciseId] = useState(EXERCISES[0].id);
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
          tier="plus"
          title="Video form check"
          body={`Hareketini çek, koç videonun üzerine saniye saniye yorum yazsın. Plus'ta ${LIMITS.formCheckDays.plus} günde bir, Max'ta haftada bir.`}
          onPress={() => router.push('/plans')}
        />
      </Screen>
    );
  }

  const next = nextAllowedAt(tier, items?.[0]);
  const ready = next != null && next <= new Date();
  const daysLeft = next ? Math.ceil((next.getTime() - Date.now()) / 86400000) : 0;

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
    if (!session || !video) return;
    setBusy(true);
    setError(null);
    try {
      const ext = video.mimeType?.includes('quicktime') ? 'mov' : 'mp4';
      const path = await uploadFile('form-checks', `${session.user.id}/${Date.now()}.${ext}`, video.uri, video.mimeType ?? 'video/mp4');
      const { error: err } = await supabase
        .from('form_checks')
        .insert({ user_id: session.user.id, exercise_id: exerciseId, note: note.trim() || null, video_path: path });
      if (err) throw err;
      bump('formChecks');
      setOpen(false);
      setVideo(null);
      setNote('');
      load();
    } catch (e) {
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
          <Heading style={{ fontSize: 24 }}>{ready ? 'Şimdi gönderebilirsin' : `${daysLeft} gün sonra`}</Heading>
          <Body muted style={{ fontSize: 13.5 }}>
            60 saniyeye kadar video. Yandan, tüm vücut görünecek şekilde çek. Koç videonun ilgili saniyelerine yorum bırakır.
          </Body>
          <Button title="Yeni form check" arrow disabled={!ready} onPress={() => setOpen(true)} />
        </Card>
      </Reveal>

      <Reveal index={1}>
        <Label>Gönderdiklerin</Label>
      </Reveal>
      {items == null ? (
        <ActivityIndicator color={colors.textMuted} />
      ) : items.length === 0 ? (
        <EmptyState icon={{ ios: 'video.fill', android: 'videocam', web: 'videocam' }} title="Henüz video yok" body="İlk form check'ini gönder, koçun yorumları burada görünsün." />
      ) : (
        items.map((f, i) => (
          <Reveal key={f.id} index={2 + i}>
            <PressScale onPress={() => router.push({ pathname: '/form-check/[id]', params: { id: f.id } })}>
              <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.text }}>
                    {exerciseById(f.exercise_id)?.trName ?? f.exercise_id}
                  </Text>
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
                  {new Date(f.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                </Mono>
              </Card>
            </PressScale>
          </Reveal>
        ))
      )}

      <Sheet visible={open} onClose={() => !busy && setOpen(false)} title="Form check gönder">
        <Label>Hareket</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {EXERCISES.map((e) => (
            <Chip key={e.id} label={e.trName} active={exerciseId === e.id} onPress={() => setExerciseId(e.id)} />
          ))}
        </View>
        <Label>Not (isteğe bağlı)</Label>
        <Input value={note} onChangeText={setNote} placeholder="ör. Belimde ağrı oluyor, 80 kg 5 tekrar" multiline maxLength={500} />
        <Row gap={spacing.sm}>
          <View style={{ flex: 1 }}>
            <Button title="Çek" variant="outline" icon={{ ios: 'video.fill', android: 'videocam', web: 'videocam' }} onPress={() => pick(true)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Galeriden" variant="outline" icon={{ ios: 'photo.on.rectangle', android: 'video_library', web: 'video_library' }} onPress={() => pick(false)} />
          </View>
        </Row>
        {video && (
          <Mono style={{ color: colors.success }}>
            Video seçildi{video.duration ? ` · ${Math.round(video.duration / 1000)} sn` : ''}
          </Mono>
        )}
        {error && <Text style={{ fontFamily: fonts.bodyBold, color: colors.danger }}>{error}</Text>}
        <Button title={busy ? 'Yükleniyor...' : 'Gönder'} arrow disabled={!video || busy} onPress={submit} />
      </Sheet>
    </Screen>
  );
}
