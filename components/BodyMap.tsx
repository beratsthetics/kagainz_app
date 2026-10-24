import { View } from 'react-native';
import { type BodyPart, type Slug } from 'react-native-body-highlighter';
import { bodyBack } from 'react-native-body-highlighter/dist/assets/bodyBack';
import { bodyFront } from 'react-native-body-highlighter/dist/assets/bodyFront';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/T';

import { fonts } from '@/constants/theme';
import type { Muscle } from '@/lib/exercises';
import { useColors } from '@/lib/theme';

// Ön ve arka anatomik kas haritası (react-native-body-highlighter çizimleri, MIT). Çizimleri kendimiz
// basıyoruz: paketin bileşeni her parçaya dokunma işleyicisi ekliyor, web'de uyarı veriyor.
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
  function colors(map: Record<Muscle, Slug | null>): Map<Slug, string> {
    const rank = new Map<Slug, number>();
    for (const [m, slug] of Object.entries(map) as [Muscle, Slug | null][]) {
      if (!slug) continue;
      const v = heat ? (heat[m] ?? 0) / maxHeat : primary.includes(m) ? 2 : secondary.includes(m) ? 1 : 0;
      if (v > (rank.get(slug) ?? 0)) rank.set(slug, v);
    }
    return new Map(
      [...rank].map(([slug, v]) => [
        slug,
        // Az çalışan kas mavi, çok çalışan kas turuncu.
        heat ? (v > 0.66 ? c.fat : v > 0.33 ? c.accentBright : c.accent) : v === 2 ? c.accentBright : `${c.accent}AA`,
      ]),
    );
  }

  function figure(parts: BodyPart[], fills: Map<Slug, string>, viewBox: string) {
    return (
      <Svg viewBox={viewBox} width={height / 2} height={height}>
        {parts.flatMap((p) =>
          [...(p.path?.common ?? []), ...(p.path?.left ?? []), ...(p.path?.right ?? [])].map((d) => (
            <Path key={d} d={d} fill={(p.slug && fills.get(p.slug)) || c.surfaceHigh} stroke={c.background} strokeWidth={1} />
          )),
        )}
      </Svg>
    );
  }

  const label = (text: string) =>
    labels && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.4, color: c.textDim }}>{text}</Text>;

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
      <View style={{ alignItems: 'center' }}>
        {figure(bodyFront, colors(FRONT), '0 0 724 1448')}
        {label('ÖN')}
      </View>
      <View style={{ alignItems: 'center' }}>
        {figure(bodyBack, colors(BACK), '724 0 724 1448')}
        {label('ARKA')}
      </View>
    </View>
  );
}
