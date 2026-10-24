import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Text } from '@/components/T';
import { Icon, PressScale, Row } from '@/components/ui';
import { fonts } from '@/constants/theme';
import { useSignedUrl } from '@/lib/media';
import { useColors } from '@/lib/theme';

export const VOICE_MAX_MS = 60000;
const RECORDING = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000 };

export function voiceMime(uri: string) {
  return /\.webm($|\?)/.test(uri) || Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4';
}

export function formatMs(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Basılı tut: kaydeder, bırakınca onDone ile gönderilir. 1 saniyeden kısa kayıt atılır,
// 60 saniyede kendiliğinden biter. Kayıt sürerken süre onTick ile üst bileşene bildirilir.
export function VoiceRecordButton({
  style,
  onDone,
  onTick,
  onError,
}: {
  style: object;
  onDone: (uri: string, ms: number) => void;
  onTick: (ms: number | null) => void;
  onError: (message: string) => void;
}) {
  const colors = useColors();
  const recorder = useAudioRecorder(RECORDING);
  const state = useAudioRecorderState(recorder, 200);
  const holding = useRef(false);
  const busy = useRef(false);

  async function start() {
    holding.current = true;
    if (busy.current) return;
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return onError('Sesli mesaj için mikrofon izni gerekiyor.');
    // İzin penceresi açıldıysa parmak çoktan kalkmıştır; bir sonraki basışta kaydeder.
    if (!holding.current) return;
    busy.current = true;
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: VOICE_MAX_MS / 1000 });
      if (!holding.current) await finish();
    } catch {
      busy.current = false;
      onError('Kayıt başlatılamadı.');
    }
  }

  async function finish() {
    holding.current = false;
    if (!busy.current) return;
    const ms = recorder.getStatus().durationMillis;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    busy.current = false;
    onTick(null);
    if (ms < 1000 || !recorder.uri) return onError('Kaydetmek için mikrofona basılı tut.');
    onDone(recorder.uri, Math.min(ms, VOICE_MAX_MS));
  }

  useEffect(() => {
    if (state.isRecording) onTick(state.durationMillis);
    // 60 saniye dolunca kayıt kendiliğinden durur; bırakmayı beklemeden gönder.
    if (busy.current && !state.isRecording && state.durationMillis >= VOICE_MAX_MS - 500) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isRecording, state.durationMillis]);

  return (
    <Pressable onPressIn={start} onPressOut={finish} style={[style, state.isRecording && { backgroundColor: colors.danger, transform: [{ scale: 1.15 }] }]}>
      <Icon name={{ ios: 'mic.fill', android: 'mic', web: 'mic' }} size={20} color={state.isRecording ? '#fff' : colors.primaryText} />
    </Pressable>
  );
}

// Mesaj balonundaki oynatıcı: oynat/durdur, ilerleyen dalga çubukları ve süre.
export function VoicePlayer({ path, ms, mine }: { path: string; ms: number | null; mine: boolean }) {
  const colors = useColors();
  const url = useSignedUrl('chat', path);
  const player = useAudioPlayer(url ? { uri: url } : null);
  const status = useAudioPlayerStatus(player);
  const total = status.duration > 0 ? status.duration * 1000 : (ms ?? 0);
  const progress = total > 0 ? Math.min(1, (status.currentTime * 1000) / total) : 0;
  const ink = mine ? colors.primaryText : colors.text;
  const bars = useRef(waveform(path)).current;

  useEffect(() => {
    if (status.didJustFinish) {
      player.pause();
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  function toggle() {
    if (!url) return;
    if (status.playing) player.pause();
    else player.play();
  }

  return (
    <Row gap={10} style={{ minWidth: 200 }}>
      <PressScale onPress={toggle} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: mine ? colors.primaryText + '1F' : colors.accentSoft }}>
        <Icon
          name={status.playing ? { ios: 'pause.fill', android: 'pause', web: 'pause' } : { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
          size={16}
          color={mine ? colors.primaryText : colors.accentBright}
        />
      </PressScale>
      <Row gap={2} style={{ flex: 1, height: 28, alignItems: 'center' }}>
        {bars.map((h, i) => (
          <View key={i} style={{ flex: 1, height: h * 28, borderRadius: 2, backgroundColor: ink, opacity: i / bars.length <= progress && progress > 0 ? 1 : 0.3 }} />
        ))}
      </Row>
      <Text raw style={{ fontFamily: fonts.mono, fontSize: 11.5, color: ink, opacity: 0.8 }}>
        {formatMs(status.playing || status.currentTime > 0 ? status.currentTime * 1000 : total)}
      </Text>
    </Row>
  );
}

// Dosya yolundan sabit görünümlü dalga çubukları (gerçek ses analizi değil).
function waveform(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: 24 }, () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return 0.25 + ((h >>> 16) % 75) / 100;
  });
}
