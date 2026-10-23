import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import type { Pattern } from '@/lib/exercises';
import { useColors } from '@/lib/theme';

// Yandan görünüşlü çizgi figür: her hareket tipi için iki poz (başlangıç / bitiş) arasında gidip gelir.
// viewBox 200×160, zemin y=150. Figür sağa bakar.

type P = [number, number];
type Pose = {
  H: P; // baş
  S: P; // omuz
  E: P; // dirsek
  W: P; // el
  P: P; // kalça
  K: P; // diz
  F: P; // ayak
  K2?: P; // arka bacak (lunge)
  F2?: P;
};
type Props = {
  bench?: [P, P];
  seat?: [P, P];
  cable?: P; // makara noktası; kablo ele bağlanır
  bar?: 'plate' | 'dumbbell' | 'handle' | 'none';
  pullupBar?: boolean;
  step?: boolean;
  platform?: boolean;
};
type Anim = { a: Pose; b: Pose; props?: Props; ms?: number };

const stand: Pose = { H: [100, 30], S: [100, 48], E: [100, 70], W: [101, 92], P: [100, 92], K: [101, 120], F: [100, 148] };
const lying: Pick<Pose, 'H' | 'S' | 'P' | 'K' | 'F'> = { H: [56, 96], S: [70, 98], P: [118, 100], K: [142, 110], F: [150, 148] };
const seated: Pick<Pose, 'H' | 'S' | 'P' | 'K' | 'F'> = { H: [100, 50], S: [99, 68], P: [100, 112], K: [126, 112], F: [126, 148] };
const BENCH: [P, P] = [[48, 108], [128, 108]];
const SEAT: [P, P] = [[84, 118], [118, 118]];

const ANIMS: Record<Pattern, Anim> = {
  squat: {
    a: { H: [102, 30], S: [100, 48], E: [88, 54], W: [96, 46], P: [100, 92], K: [102, 120], F: [100, 148] },
    b: { H: [108, 58], S: [100, 74], E: [88, 80], W: [96, 72], P: [78, 112], K: [112, 116], F: [100, 148] },
    props: { bar: 'plate' },
  },
  leg_press: {
    a: { H: [42, 74], S: [52, 88], E: [64, 104], W: [76, 112], P: [80, 120], K: [102, 90], F: [126, 104] },
    b: { H: [42, 74], S: [52, 88], E: [64, 104], W: [76, 112], P: [80, 120], K: [118, 106], F: [152, 96] },
    props: { seat: [[36, 70], [86, 126]], platform: true, bar: 'none' },
  },
  lunge: {
    a: { ...stand, E: [100, 70], W: [101, 92], K2: [99, 120], F2: [98, 148] },
    b: { H: [100, 50], S: [100, 68], E: [100, 90], W: [101, 112], P: [100, 110], K: [124, 112], F: [126, 148], K2: [90, 140], F2: [68, 148] },
    props: { bar: 'dumbbell' },
  },
  hinge: {
    a: { ...stand, E: [101, 72], W: [102, 94] },
    b: { H: [140, 76], S: [124, 82], E: [124, 104], W: [124, 126], P: [86, 94], K: [94, 122], F: [100, 148] },
    props: { bar: 'plate' },
  },
  hip_thrust: {
    a: { H: [50, 94], S: [62, 100], E: [80, 110], W: [96, 118], P: [96, 126], K: [126, 108], F: [132, 148] },
    b: { H: [50, 94], S: [62, 100], E: [80, 100], W: [98, 96], P: [98, 98], K: [126, 102], F: [132, 148] },
    props: { bench: [[30, 108], [64, 108]], bar: 'plate' },
  },
  leg_extension: {
    a: { ...seated, E: [104, 90], W: [110, 112], F: [126, 146] },
    b: { ...seated, E: [104, 90], W: [110, 112], F: [158, 110] },
    props: { seat: SEAT, bar: 'none' },
  },
  leg_curl: {
    a: { H: [48, 90], S: [62, 96], E: [56, 108], W: [50, 108], P: [110, 98], K: [150, 98], F: [184, 98] },
    b: { H: [48, 90], S: [62, 96], E: [56, 108], W: [50, 108], P: [110, 98], K: [150, 98], F: [160, 66] },
    props: { bench: [[40, 106], [160, 106]], bar: 'none' },
  },
  calf_raise: {
    a: { ...stand },
    b: { H: [100, 22], S: [100, 40], E: [100, 62], W: [101, 84], P: [100, 84], K: [101, 112], F: [100, 140] },
    props: { step: true, bar: 'none' },
    ms: 900,
  },
  bench_press: {
    a: { ...lying, E: [70, 76], W: [70, 54] },
    b: { ...lying, E: [62, 110], W: [76, 88] },
    props: { bench: BENCH, bar: 'plate' },
  },
  incline_press: {
    a: { H: [78, 64], S: [88, 78], E: [86, 56], W: [84, 34], P: [120, 112], K: [142, 114], F: [150, 148] },
    b: { H: [78, 64], S: [88, 78], E: [76, 96], W: [92, 72], P: [120, 112], K: [142, 114], F: [150, 148] },
    props: { bench: [[76, 70], [126, 118]], bar: 'plate' },
  },
  fly: {
    a: { ...lying, E: [72, 76], W: [70, 54] },
    b: { ...lying, E: [62, 104], W: [56, 116] },
    props: { bench: BENCH, bar: 'dumbbell' },
  },
  pushup: {
    a: { H: [56, 92], S: [70, 100], E: [70, 124], W: [70, 146], P: [120, 122], K: [142, 134], F: [164, 146] },
    b: { H: [54, 124], S: [68, 130], E: [86, 134], W: [70, 146], P: [120, 138], K: [142, 142], F: [164, 146] },
    props: { bar: 'none' },
  },
  dip: {
    a: { H: [102, 42], S: [100, 60], E: [100, 82], W: [100, 104], P: [100, 104], K: [96, 130], F: [82, 138] },
    b: { H: [102, 66], S: [100, 84], E: [80, 96], W: [100, 104], P: [100, 128], K: [96, 150], F: [82, 156] },
    props: { bar: 'handle' },
  },
  overhead_press: {
    a: { ...seated, E: [112, 80], W: [108, 62] },
    b: { ...seated, E: [104, 46], W: [102, 24] },
    props: { seat: SEAT, bar: 'plate' },
  },
  lateral_raise: {
    a: { ...stand, E: [101, 72], W: [102, 94] },
    b: { ...stand, E: [122, 52], W: [144, 52] },
    props: { bar: 'dumbbell' },
  },
  rear_fly: {
    a: { H: [140, 74], S: [124, 80], E: [124, 102], W: [124, 122], P: [88, 96], K: [94, 122], F: [98, 148] },
    b: { H: [140, 74], S: [124, 80], E: [110, 70], W: [100, 62], P: [88, 96], K: [94, 122], F: [98, 148] },
    props: { bar: 'dumbbell' },
  },
  pulldown: {
    a: { ...seated, E: [104, 44], W: [108, 22] },
    b: { ...seated, E: [86, 88], W: [106, 72] },
    props: { seat: SEAT, cable: [108, 4], bar: 'handle' },
  },
  pullup: {
    a: { H: [102, 44], S: [100, 60], E: [100, 36], W: [100, 14], P: [100, 104], K: [102, 128], F: [98, 146] },
    b: { H: [104, 8], S: [100, 30], E: [86, 34], W: [100, 14], P: [100, 74], K: [102, 98], F: [98, 116] },
    props: { pullupBar: true, bar: 'none' },
  },
  row: {
    a: { H: [94, 50], S: [92, 68], E: [120, 80], W: [142, 88], P: [90, 112], K: [120, 104], F: [146, 126] },
    b: { H: [90, 50], S: [90, 68], E: [74, 92], W: [104, 96], P: [90, 112], K: [120, 104], F: [146, 126] },
    props: { seat: [[74, 118], [106, 118]], cable: [190, 100], bar: 'handle' },
  },
  curl: {
    a: { ...stand, E: [100, 70], W: [102, 92] },
    b: { ...stand, E: [100, 70], W: [112, 52] },
    props: { bar: 'dumbbell' },
  },
  pushdown: {
    a: { ...stand, E: [100, 70], W: [118, 60] },
    b: { ...stand, E: [100, 70], W: [106, 92] },
    props: { cable: [128, 4], bar: 'handle' },
  },
  overhead_extension: {
    a: { ...stand, E: [108, 34], W: [90, 46] },
    b: { ...stand, E: [108, 34], W: [122, 16] },
    props: { cable: [60, 140], bar: 'handle' },
  },
  crunch: {
    a: { H: [112, 58], S: [110, 76], E: [118, 68], W: [114, 56], P: [110, 118], K: [110, 148], F: [80, 148] },
    b: { H: [140, 104], S: [130, 96], E: [138, 110], W: [136, 98], P: [110, 118], K: [110, 148], F: [80, 148] },
    props: { cable: [112, 4], bar: 'handle' },
  },
  plank: {
    a: { H: [58, 108], S: [70, 116], E: [70, 146], W: [92, 146], P: [120, 124], K: [144, 134], F: [166, 146] },
    b: { H: [58, 106], S: [70, 115], E: [70, 146], W: [92, 146], P: [120, 120], K: [144, 132], F: [166, 146] },
    props: { bar: 'none' },
    ms: 1600,
  },
  shrug: {
    a: { ...stand },
    b: { ...stand, S: [100, 41], E: [100, 63], W: [101, 85] },
    props: { bar: 'dumbbell' },
    ms: 800,
  },
};

function lerp(t: number, a: P, b: P): P {
  'worklet';
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

const ALine = Animated.createAnimatedComponent(Line);
const ACircle = Animated.createAnimatedComponent(Circle);
const ARect = Animated.createAnimatedComponent(Rect);

function Seg({ t, a1, b1, a2, b2, color, width = 7 }: { t: SharedValue<number>; a1: P; b1: P; a2: P; b2: P; color: string; width?: number }) {
  const props = useAnimatedProps(() => {
    const p1 = lerp(t.value, a1, b1);
    const p2 = lerp(t.value, a2, b2);
    return { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] };
  });
  return <ALine animatedProps={props} stroke={color} strokeWidth={width} strokeLinecap="round" />;
}

function Dot({ t, a, b, r, fill }: { t: SharedValue<number>; a: P; b: P; r: number; fill: string }) {
  const props = useAnimatedProps(() => {
    const p = lerp(t.value, a, b);
    return { cx: p[0], cy: p[1] };
  });
  return <ACircle animatedProps={props} r={r} fill={fill} />;
}

function Weight({ t, a, b, kind, color }: { t: SharedValue<number>; a: P; b: P; kind: Props['bar']; color: string }) {
  const w = kind === 'plate' ? 8 : kind === 'dumbbell' ? 14 : 10;
  const h = kind === 'plate' ? 24 : kind === 'dumbbell' ? 7 : 4;
  const props = useAnimatedProps(() => {
    const p = lerp(t.value, a, b);
    return { x: p[0] - w / 2, y: p[1] - h / 2 };
  });
  return <ARect animatedProps={props} width={w} height={h} rx={2} fill={color} />;
}

export function MovementAnim({ pattern, size = 220 }: { pattern: Pattern; size?: number }) {
  const c = useColors();
  const anim = ANIMS[pattern];
  const t = useSharedValue(0);
  useEffect(() => {
    const ms = anim.ms ?? 1300;
    t.value = 0;
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: ms, easing: Easing.inOut(Easing.cubic) }),
        withTiming(1, { duration: 250 }),
        withTiming(0, { duration: ms, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 250 }),
      ),
      -1,
    );
  }, [anim, t]);

  const { a, b, props = {} } = anim;
  const body = c.text;
  const prop = c.textDim;
  const accent = c.accentBright;
  const cableProps = useAnimatedProps(() => {
    const p = lerp(t.value, a.W, b.W);
    return { x2: p[0], y2: p[1] };
  });

  return (
    <Svg viewBox="0 0 200 160" width={size} height={(size * 160) / 200}>
      <Line x1={10} y1={150} x2={190} y2={150} stroke={c.border} strokeWidth={2} />
      {props.bench && <Line x1={props.bench[0][0]} y1={props.bench[0][1]} x2={props.bench[1][0]} y2={props.bench[1][1]} stroke={prop} strokeWidth={6} strokeLinecap="round" />}
      {props.seat && <Line x1={props.seat[0][0]} y1={props.seat[0][1]} x2={props.seat[1][0]} y2={props.seat[1][1]} stroke={prop} strokeWidth={6} strokeLinecap="round" />}
      {props.step && <Rect x={80} y={148} width={44} height={8} rx={2} fill={prop} />}
      {props.pullupBar && <Line x1={60} y1={14} x2={140} y2={14} stroke={prop} strokeWidth={4} strokeLinecap="round" />}
      {props.cable && (
        <>
          <Circle cx={props.cable[0]} cy={props.cable[1]} r={4} fill={prop} />
          <ALine x1={props.cable[0]} y1={props.cable[1]} animatedProps={cableProps} stroke={prop} strokeWidth={1.5} />
        </>
      )}
      {props.platform && <Seg t={t} a1={[a.F[0] + 4, a.F[1] - 22]} b1={[b.F[0] + 4, b.F[1] - 22]} a2={[a.F[0] + 4, a.F[1] + 22]} b2={[b.F[0] + 4, b.F[1] + 22]} color={prop} width={5} />}

      {a.K2 && b.K2 && a.F2 && b.F2 && (
        <>
          <Seg t={t} a1={a.P} b1={b.P} a2={a.K2} b2={b.K2} color={c.textMuted} />
          <Seg t={t} a1={a.K2} b1={b.K2} a2={a.F2} b2={b.F2} color={c.textMuted} />
        </>
      )}
      <Seg t={t} a1={a.P} b1={b.P} a2={a.K} b2={b.K} color={body} />
      <Seg t={t} a1={a.K} b1={b.K} a2={a.F} b2={b.F} color={body} />
      <Seg t={t} a1={a.S} b1={b.S} a2={a.P} b2={b.P} color={body} width={9} />
      <Seg t={t} a1={a.S} b1={b.S} a2={a.E} b2={b.E} color={accent} />
      <Seg t={t} a1={a.E} b1={b.E} a2={a.W} b2={b.W} color={accent} width={6} />
      <Dot t={t} a={a.H} b={b.H} r={10} fill={body} />
      {props.bar && props.bar !== 'none' && <Weight t={t} a={a.W} b={b.W} kind={props.bar} color={c.fat} />}
    </Svg>
  );
}
