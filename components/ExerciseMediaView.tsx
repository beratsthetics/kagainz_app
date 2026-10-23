import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';

// Koçun yüklediği hareket animasyonu: video sessiz ve döngüde oynar, GIF/resim doğrudan gösterilir.
export function ExerciseMediaView({ url, kind, size }: { url: string; kind: 'video' | 'image'; size: number }) {
  return kind === 'video' ? <LoopVideo url={url} size={size} /> : <Image source={{ uri: url }} style={{ width: size, height: size }} contentFit="contain" autoplay />;
}

function LoopVideo({ url, size }: { url: string; size: number }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView player={player} style={{ width: size, height: size }} contentFit="contain" nativeControls={false} />;
}
