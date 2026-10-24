import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/T';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { fonts } from '@/constants/theme';
import { useColors } from '@/lib/theme';
import { locale } from '@/lib/i18n';

// Tek serili, sade grafikler: ince işaretler, silik ızgara, dokununca değer. Tek seri olduğu için
// lejant yok; başlığı ekran söyler.

export function BarChart({
  values,
  labels,
  goal,
  color,
  height = 150,
  unit = '',
  format = (v: number) => Math.round(v).toLocaleString(locale()),
}: {
  values: number[];
  labels: string[];
  goal?: number;
  color?: string;
  height?: number;
  unit?: string;
  format?: (v: number) => string;
}) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, goal ?? 0, ...values) * 1.1;
  const plotH = height - 22;
  const slot = width / Math.max(1, values.length);
  const barW = Math.min(28, slot * 0.56);
  const y = (v: number) => plotH - (v / max) * plotH;
  const barColor = color ?? c.accent;
  const active = selected ?? values.length - 1;
  // 30 günlük grafikte her gün yazılınca sayılar üst üste biner; bugünden geriye birkaç günde bir ve seçili gün yazılır.
  const step = Math.max(1, Math.ceil((labels.length * 22) / Math.max(1, width)));
  const showLabel = (i: number) => i === active || ((labels.length - 1 - i) % step === 0 && Math.abs(i - active) >= step);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 6, minHeight: 22 }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 15, color: c.text }}>
          {values.length ? `${format(values[active] ?? 0)}${unit ? ` ${unit}` : ''}` : '—'}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: c.textMuted }}>{labels[active]}</Text>
      </View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {[0.5, 1].map((f) => (
              <Line key={f} x1={0} x2={width} y1={y(max * f / 1.1)} y2={y(max * f / 1.1)} stroke={c.border} strokeWidth={1} />
            ))}
            <Line x1={0} x2={width} y1={plotH} y2={plotH} stroke={c.borderStrong} strokeWidth={1} />
            {goal != null && goal > 0 && (
              <Line x1={0} x2={width} y1={y(goal)} y2={y(goal)} stroke={c.textMuted} strokeWidth={1} strokeDasharray="4 4" />
            )}
            {values.map((v, i) => {
              const h = Math.max(v > 0 ? 3 : 0, plotH - y(v));
              const x = i * slot + (slot - barW) / 2;
              const r = Math.min(4, barW / 2, h);
              // Üst köşeleri 4px yuvarlak, taban düz.
              const d = `M${x},${plotH} L${x},${plotH - h + r} Q${x},${plotH - h} ${x + r},${plotH - h} L${x + barW - r},${plotH - h} Q${x + barW},${plotH - h} ${x + barW},${plotH - h + r} L${x + barW},${plotH} Z`;
              return <Path key={i} d={d} fill={barColor} opacity={i === active ? 1 : 0.55} />;
            })}
          </Svg>
        )}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row' }}>
          {values.map((_, i) => (
            <Pressable key={i} style={{ flex: 1 }} onPress={() => setSelected(i)} />
          ))}
        </View>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 14 }}>
          {labels.map((l, i) =>
            showLabel(i) ? (
              <Text
                key={i}
                numberOfLines={1}
                style={{
                  position: 'absolute',
                  left: i * slot + slot / 2 - 16,
                  width: 32,
                  textAlign: 'center',
                  fontFamily: fonts.bodyBold,
                  fontSize: 10,
                  color: i === active ? c.text : c.textDim,
                }}>
                {l}
              </Text>
            ) : null,
          )}
        </View>
      </View>
    </View>
  );
}

export function LineChart({
  values,
  labels,
  color,
  height = 150,
  unit = '',
  format = (v: number) => v.toLocaleString(locale(), { maximumFractionDigits: 1 }),
}: {
  values: number[];
  labels: string[];
  color?: string;
  height?: number;
  unit?: string;
  format?: (v: number) => string;
}) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const lineColor = color ?? c.accentBright;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(0.5, (max - min) * 0.2);
  const lo = min - pad;
  const hi = max + pad;
  const plotH = height - 22;
  const px = 8;
  const x = (i: number) => px + (values.length < 2 ? (width - 2 * px) / 2 : (i * (width - 2 * px)) / (values.length - 1));
  const y = (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * (plotH - 12);
  const active = selected ?? values.length - 1;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 6, minHeight: 22 }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 15, color: c.text }}>
          {values.length ? `${format(values[active])}${unit ? ` ${unit}` : ''}` : '—'}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: c.textMuted }}>{labels[active]}</Text>
      </View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && values.length > 0 && (
          <Svg width={width} height={height}>
            {[0, 0.5, 1].map((f) => (
              <Line key={f} x1={0} x2={width} y1={6 + f * (plotH - 12)} y2={6 + f * (plotH - 12)} stroke={c.border} strokeWidth={1} />
            ))}
            <Line x1={x(active)} x2={x(active)} y1={0} y2={plotH} stroke={c.borderStrong} strokeWidth={1} />
            <Path d={d} stroke={lineColor} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {values.map((v, i) => (
              <Circle key={i} cx={x(i)} cy={y(v)} r={i === active ? 5 : 3} fill={lineColor} stroke={c.surface} strokeWidth={2} />
            ))}
            <Rect x={0} y={plotH} width={width} height={1} fill={c.borderStrong} />
          </Svg>
        )}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row' }}>
          {values.map((_, i) => (
            <Pressable key={i} style={{ flex: 1 }} onPress={() => setSelected(i)} />
          ))}
        </View>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, color: c.textDim }}>{labels[0]}</Text>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, color: c.textDim }}>{labels[labels.length - 1]}</Text>
        </View>
      </View>
    </View>
  );
}
