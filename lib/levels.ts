// Aktiflik seviyesi. XP'yi sunucu verir (0009): mesaj, antrenman, seri, check-in, meydan okuma,
// form check ve alınan tebrikler. Seviye n için 10 × (n-1)² XP gerekir: Lv 5 = 160, Lv 10 = 810.
export function levelOf(xp: number | null | undefined) {
  return Math.floor(Math.sqrt(Math.max(0, xp ?? 0) / 10)) + 1;
}

export function xpFor(level: number) {
  return 10 * (level - 1) ** 2;
}

// Seviye aralığına göre chatteki isim efekti. Renkler hem koyu hem açık temada okunur.
export type LevelBand = {
  from: number;
  name: string;
  color: string;
  // Lv 10+: isim parlar. Lv 20+: kalın başlık yazısı, işaret ve mesaj çerçevesi. Lv 30+: renk akar.
  glow?: boolean;
  display?: boolean;
  mark?: string;
  frame?: [string, string];
  flow?: string[];
};

export const LEVEL_BANDS: LevelBand[] = [
  { from: 1, name: 'Çaylak', color: '#8E8F98' },
  { from: 5, name: 'Azimli', color: '#D9822B' },
  { from: 10, name: 'Demir', color: '#14B8A6', glow: true },
  { from: 20, name: 'Altın', color: '#E0A100', glow: true, display: true, mark: '✦', frame: ['#FDE68A', '#D97706'] },
  {
    from: 30,
    name: 'Efsane',
    color: '#EC4899',
    glow: true,
    display: true,
    mark: '♛',
    frame: ['#EC4899', '#8B5CF6'],
    flow: ['#EC4899', '#8B5CF6', '#F59E0B'],
  },
];

export function bandOf(level: number) {
  return [...LEVEL_BANDS].reverse().find((b) => level >= b.from) ?? LEVEL_BANDS[0];
}
