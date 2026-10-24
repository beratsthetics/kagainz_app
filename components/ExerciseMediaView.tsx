import { useEventListener } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/T';

import { fonts } from '@/constants/theme';
import { useColors } from '@/lib/theme';

// Koçun yüklediği hareket animasyonu: video sessiz ve döngüde oynar, GIF/resim doğrudan gösterilir.
// interactive: dokununca durdur/oynat. Küçük önizlemede kapalı, dokunuş dış bileşene gider.
// height verilmezse kare gösterilir.
// url: imzalı adres ya da uygulamayla gelen dosya (require).
export function ExerciseMediaView({ url, kind, size, height = size, interactive = true }: { url: string | number; kind: 'video' | 'image'; size: number; height?: number; interactive?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (failed) return size < 120 ? <View style={{ width: size, height }} /> : <Failed size={size} message={failed} />;
  return kind === 'video' ? (
    <LoopVideo url={url} size={size} height={height} onError={setFailed} interactive={interactive} />
  ) : (
    <Image
      source={typeof url === 'string' ? { uri: url } : url}
      style={{ width: size, height }}
      contentFit="contain"
      autoplay
      onError={(e) => setFailed(e.error || 'Görsel açılamadı.')}
    />
  );
}

function LoopVideo({ url, size, height, onError, interactive }: { url: string | number; size: number; height: number; onError: (m: string) => void; interactive: boolean }) {
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
  const view = <VideoView player={player} style={{ width: size, height }} contentFit="contain" nativeControls={false} surfaceType="textureView" />;
  if (!interactive) return <View pointerEvents="none">{view}</View>;
  return <Pressable onPress={() => (player.playing ? player.pause() : player.play())}>{view}</Pressable>;
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
