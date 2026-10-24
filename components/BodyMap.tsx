import { useEffect } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/T';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { fonts } from '@/constants/theme';
import type { Muscle } from '@/lib/exercises';
import { useColors } from '@/lib/theme';

// Ön ve arka vücut çizimi. Kaslar sol yarı için çizilip sağa aynalanır (viewBox 200×410).
type Shape = { muscle: Muscle | null; d: string };

const FRONT: Shape[] = [
  { muscle: 'traps', d: 'M92,64 L78,74 L92,78 Z' },
  { muscle: 'side_delts', d: 'M78,74 C66,76 59,86 59,100 L67,104 C69,92 73,84 82,79 Z' },
  { muscle: 'front_delts', d: 'M82,80 C76,86 71,96 69,106 L79,108 C81,98 85,90 91,84 Z' },
  { muscle: 'chest', d: 'M99,82 L93,82 L84,86 C78,93 77,105 81,115 C89,121 99,119 99,113 Z' },
  { muscle: 'biceps', d: 'M66,109 C60,121 58,135 60,147 L70,147 C74,135 77,123 77,111 Z' },
  { muscle: 'forearms', d: 'M58,151 C54,167 52,183 52,197 L60,199 C64,185 68,169 70,153 Z' },
  { muscle: 'abs', d: 'M87,121 L99,121 L99,135 L87,135 Z M87,138 L99,138 L99,152 L87,152 Z M87,155 L99,155 L99,169 L87,169 Z M87,172 L99,172 L99,192 L90,188 Z' },
  { muscle: 'obliques', d: 'M81,119 C77,137 77,161 82,185 L85,187 L85,122 Z' },
  { muscle: null, d: 'M80,190 L99,198 L99,212 L77,206 Z' },
  { muscle: 'quads', d: 'M77,208 C71,234 73,264 81,294 L93,296 C93,270 91,242 91,214 Z' },
  { muscle: 'adductors', d: 'M93,214 C94,234 96,250 98,264 L99,264 L99,214 Z' },
  { muscle: 'calves', d: 'M80,314 C76,336 78,362 84,386 L91,386 C93,362 95,336 93,314 Z' },
];

const BACK: Shape[] = [
  { muscle: 'traps', d: 'M99,62 L86,70 L73,78 C84,83 93,94 99,112 Z' },
  { muscle: 'rear_delts', d: 'M75,79 C64,81 59,91 59,103 L69,105 C71,95 75,87 84,83 Z' },
  { muscle: 'triceps', d: 'M64,109 C58,121 58,137 60,149 L70,149 C74,137 76,123 74,109 Z' },
  { muscle: 'forearms', d: 'M58,153 C54,168 52,184 52,198 L60,200 C64,186 68,170 70,155 Z' },
  { muscle: 'lats', d: 'M84,90 C79,110 79,132 86,152 L98,160 L98,118 C94,107 90,98 84,90 Z' },
  { muscle: 'lower_back', d: 'M88,156 L98,163 L98,188 L87,185 Z' },
  { muscle: 'glutes', d: 'M79,190 C74,204 76,222 86,229 C94,231 99,225 99,215 L99,193 Z' },
  { muscle: 'hamstrings', d: 'M78,233 C74,257 76,277 82,295 L95,295 C97,273 97,251 97,235 Z' },
  { muscle: 'calves', d: 'M80,314 C74,334 76,354 82,368 L94,368 C98,352 98,332 94,314 Z' },
];

const AnimatedG = Animated.createAnimatedComponent(G);

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
  const pulse = useSharedValue(0.25);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.85, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse]);
  const glow = useAnimatedProps(() => ({ opacity: pulse.value }));

  const maxHeat = heat ? Math.max(1, ...Object.values(heat).map((v) => v ?? 0)) : 1;

  function fill(m: Muscle | null) {
    if (!m) return c.surfaceHigh;
    if (heat) {
      const v = heat[m] ?? 0;
      if (v <= 0) return c.surfaceHigh;
      // Az çalışan kas mavi, çok çalışan kas turuncu.
      const t = Math.min(1, v / maxHeat);
      return t > 0.66 ? c.fat : t > 0.33 ? c.accentBright : c.accent;
    }
    if (primary.includes(m)) return c.accentBright;
    if (secondary.includes(m)) return c.accent;
    return c.surfaceHigh;
  }

  function opacity(m: Muscle | null) {
    if (!m || heat) return heat && m && (heat[m] ?? 0) > 0 ? 0.55 + 0.45 * Math.min(1, (heat[m] ?? 0) / maxHeat) : 1;
    if (secondary.includes(m) && !primary.includes(m)) return 0.5;
    return 1;
  }

  function figure(shapes: Shape[], back?: boolean) {
    const half = (
      <G>
        {/* Gövde dolgusu */}
        <Rect x={92} y={56} width={8} height={12} fill={c.surfaceHigh} />
        <Circle cx={56} cy={207} r={6} fill={c.surfaceHigh} />
        <Circle cx={88} cy={304} r={7} fill={c.surfaceHigh} />
        <Ellipse cx={87} cy={398} rx={9} ry={5} fill={c.surfaceHigh} />
        {back && <Path d="M99,112 L99,160 L86,152 C82,140 84,126 88,116 Z" fill={c.surfaceHigh} />}
        {shapes.map((s, i) => (
          <Path
            key={i}
            d={s.d}
            fill={fill(s.muscle)}
            opacity={opacity(s.muscle)}
            stroke={c.background}
            strokeWidth={1.4}
          />
        ))}
        {!heat && (
          <AnimatedG animatedProps={glow}>
            {shapes
              .filter((s) => s.muscle && primary.includes(s.muscle))
              .map((s, i) => (
                <Path key={i} d={s.d} fill="none" stroke={c.accentBright} strokeWidth={2.4} />
              ))}
          </AnimatedG>
        )}
      </G>
    );
    return (
      <Svg viewBox="0 0 200 410" width={(height * 200) / 410} height={height}>
        <Ellipse cx={100} cy={36} rx={17} ry={21} fill={c.surfaceHigh} />
        {half}
        <G transform="translate(200,0) scale(-1,1)">{half}</G>
      </Svg>
    );
  }

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
      <View style={{ alignItems: 'center' }}>
        {figure(FRONT)}
        {labels && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.4, color: c.textDim }}>ÖN</Text>}
      </View>
      <View style={{ alignItems: 'center' }}>
        {figure(BACK, true)}
        {labels && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.4, color: c.textDim }}>ARKA</Text>}
      </View>
    </View>
  );
}
