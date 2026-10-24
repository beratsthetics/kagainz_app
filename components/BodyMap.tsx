import { View } from 'react-native';
import Body, { type ExtendedBodyPart, type Slug } from 'react-native-body-highlighter';
import { Text } from '@/components/T';

import { fonts } from '@/constants/theme';
import type { Muscle } from '@/lib/exercises';
import { useColors } from '@/lib/theme';

// Ön ve arka anatomik kas haritası (react-native-body-highlighter çizimleri, MIT).
// Bizim kas adlarımız çizimdeki bölgelere eşlenir; omuz ön tarafta ön/yan, arka tarafta arka/yan omuzdur.
const FRONT: Record<Muscle, Slug | null> = {
  chest: 'chest',
  front_delts: 'deltoids',
  side_delts: 'deltoids',
  rear_delts: null,
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearm',
  abs: 'abs',
  obliques: 'obliques',
  traps: 'trapezius',
  lats: null,
  lower_back: null,
  glutes: null,
  quads: 'quadriceps',
  hamstrings: null,
  adductors: 'adductors',
  calves: 'calves',
};

const BACK: Record<Muscle, Slug | null> = {
  chest: null,
  front_delts: null,
  side_delts: 'deltoids',
  rear_delts: 'deltoids',
  biceps: null,
  triceps: 'triceps',
  forearms: 'forearm',
  abs: null,
  obliques: null,
  traps: 'trapezius',
  lats: 'upper-back',
  lower_back: 'lower-back',
  glutes: 'gluteal',
  quads: null,
  hamstrings: 'hamstring',
  adductors: 'adductors',
  calves: 'calves',
};

export function BodyMap({
  primary = [],
  secondary = [],
  heat,
  height = 260,
  labels = true,
}: {
  primary?: Muscle[];
  secondary?: Muscle[];
  heat?: Partial<Record<Muscle, number>>;
  height?: number;
  labels?: boolean;
}) {
  const c = useColors();
  const maxHeat = heat ? Math.max(1, ...Object.values(heat).map((v) => v ?? 0)) : 1;

  // Her bölge için renk: haritada en çok çalışan kası, egzersizde ana kası öne alır.
  function parts(map: Record<Muscle, Slug | null>): ExtendedBodyPart[] {
    const rank = new Map<Slug, number>();
    for (const [m, slug] of Object.entries(map) as [Muscle, Slug | null][]) {
      if (!slug) continue;
      const v = heat ? (heat[m] ?? 0) / maxHeat : primary.includes(m) ? 2 : secondary.includes(m) ? 1 : 0;
      if (v > (rank.get(slug) ?? 0)) rank.set(slug, v);
    }
    return [...rank].map(([slug, v]) => ({
      slug,
      // Az çalışan kas mavi, çok çalışan kas turuncu.
      color: heat ? (v > 0.66 ? c.fat : v > 0.33 ? c.accentBright : c.accent) : v === 2 ? c.accentBright : `${c.accent}AA`,
    }));
  }

  const scale = height / 400;
  const label = (text: string) =>
    labels && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.4, color: c.textDim }}>{text}</Text>;

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
      <View style={{ alignItems: 'center' }}>
        <Body data={parts(FRONT)} side="front" scale={scale} border={c.borderStrong} defaultFill={c.surfaceHigh} defaultStroke={c.background} defaultStrokeWidth={1} />
        {label('ÖN')}
      </View>
      <View style={{ alignItems: 'center' }}>
        <Body data={parts(BACK)} side="back" scale={scale} border={c.borderStrong} defaultFill={c.surfaceHigh} defaultStroke={c.background} defaultStrokeWidth={1} />
        {label('ARKA')}
      </View>
    </View>
  );
}
