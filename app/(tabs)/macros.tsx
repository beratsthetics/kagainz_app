import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Body, Card, Heading, Input, Label, Mono, Screen, Stat, Title } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { parseMeal, sumMacros } from '@/lib/macros';

export default function MacrosScreen() {
  const [text, setText] = useState('2 yumurta, 1 dilim tam buğday ekmeği, 10g zeytinyağı');
  const lines = useMemo(() => parseMeal(text), [text]);
  const total = useMemo(() => sumMacros(lines), [lines]);

  return (
    <Screen>
      <Title>Makro{'\n'}Hesapla</Title>
      <Body muted>Ne yediğini yaz, protein, karbonhidrat ve yağ otomatik hesaplansın. Virgülle ayırabilirsin.</Body>

      <Input
        value={text}
        onChangeText={setText}
        multiline
        placeholder="ör. 150g tavuk göğsü, 200g pilav"
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Heading>Toplam</Heading>
          <Mono>{total.kcal} kcal</Mono>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Stat label="Protein" value={`${total.protein} g`} />
          <Stat label="Karb." value={`${total.carb} g`} />
          <Stat label="Yağ" value={`${total.fat} g`} />
        </View>
      </Card>

      {lines.map((l, i) => (
        <Card key={i} style={{ paddingVertical: spacing.sm + 4 }}>
          {l.food ? (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Body style={{ flex: 1 }}>{l.food.name}</Body>
                <Mono style={{ color: colors.textMuted }}>{Math.round(l.grams)} g</Mono>
              </View>
              <Mono style={{ color: colors.textMuted }}>
                {l.macros.kcal} kcal · P {l.macros.protein} · K {l.macros.carb} · Y {l.macros.fat}
              </Mono>
            </>
          ) : (
            <>
              <Body>{l.input}</Body>
              <Label style={{ color: colors.danger }}>Bu yiyeceği tanımadım</Label>
            </>
          )}
        </Card>
      ))}
    </Screen>
  );
}
