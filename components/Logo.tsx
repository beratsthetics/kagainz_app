import Svg, { Polygon } from 'react-native-svg';

// Kagainz K logosu (berat'ın tasarımı, vektöre çevrildi). Beyaz kısımlar temaya göre renk alır.
export const LOGO_BLUE = '#0073F9';

export function LogoMark({ height = 40, color = '#F4F4F5' }: { height?: number; color?: string }) {
  return (
    <Svg width={(height * 358) / 423} height={height} viewBox="0 0 358 423">
      <Polygon points="80,1 0,97 0,423 80,327 80,277 41,229.5 80,182" fill={color} />
      <Polygon points="168,124 257,124 172,229.5 331,423 239,423 80,229.5" fill={color} />
      <Polygon points="269,0 358,0 284,91.5 196,91.5" fill={LOGO_BLUE} />
    </Svg>
  );
}
