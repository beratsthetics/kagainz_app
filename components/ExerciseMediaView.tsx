import { useEventListener } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { fonts } from '@/constants/theme';
import { useColors } from '@/lib/theme';

// Koçun yüklediği hareket animasyonu: video sessiz ve döngüde oynar, GIF/resim doğrudan gösterilir.
export function ExerciseMediaView({ url, kind, size }: { url: string; kind: 'video' | 'image'; size: number }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (failed) return <Failed size={size} message={failed} />;
  return kind === 'video' ? (
    <LoopVideo url={url} size={size} onError={setFailed} />
  ) : (
    <Image
      source={{ uri: url }}
      style={{ width: size, height: size }}
      contentFit="contain"
      autoplay
      onError={(e) => setFailed(e.error || 'Görsel açılamadı.')}
    />
  );
}

function LoopVideo({ url, size, onError }: { url: string; size: number; onError: (m: string) => void }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
    p.play();
  });
  // Yedek: ilk birkaç saniye video hazır olup durmuşsa yeniden başlat.
  useEffect(() => {
    let tries = 0;
    const id = setInterval(() => {
      tries++;
      if (player.status === 'readyToPlay' && !player.playing) player.play();
      if (tries >= 6) clearInterval(id);
    }, 800);
    return () => clearInterval(id);
  }, [player]);
  // Bazı cihazlarda ilk play() yükleme bitmeden çağrılıp yutuluyor; hazır olunca tekrar başlat.
  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'readyToPlay' && !player.playing) player.play();
    if (status === 'error') onError(error?.message ?? 'Video oynatılamadı.');
  });
  // Dokununca durdur / oynat.
  return (
    <Pressable onPress={() => (player.playing ? player.pause() : player.play())}>
      <VideoView player={player} style={{ width: size, height: size }} contentFit="contain" nativeControls={false} surfaceType="textureView" />
    </Pressable>
  );
}

function Failed({ size, message }: { size: number; message: string }) {
  const colors = useColors();
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16 }}>
      <Text style={{ fontSize: 28 }}>⚠️</Text>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
        Animasyon oynatılamadı. Koç dosyayı MP4 ya da GIF olarak yeniden yüklemeli.
      </Text>
      <Text style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.textDim, textAlign: 'center' }}>{message}</Text>
    </View>
  );
}
