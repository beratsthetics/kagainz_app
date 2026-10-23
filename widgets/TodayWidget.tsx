import { Gauge, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, gaugeStyle, kerning, monospacedDigit, tint, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

// iPhone ana ekran widget'ı: kalan kalori, protein ve su, seri.
// 'widget' işaretli fonksiyon metne çevrilip widget içinde çalışır; dışarıdaki
// sabitlere erişemez, bu yüzden renkler ve hesaplar içeride yazılı.
export type TodayProps = {
  day: string;
  kcal: number;
  kcalGoal: number;
  protein: number;
  proteinGoal: number;
  water: number;
  waterGoal: number;
  streak: number;
};

const TodayLayout = (props: TodayProps, env: WidgetEnvironment) => {
  'widget';
  const now = env.date ?? new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  // Gün değiştiyse ve uygulama henüz açılmadıysa sıfırdan göster.
  const fresh = props.day === today;
  const kcal = fresh ? props.kcal : 0;
  const protein = fresh ? props.protein : 0;
  const water = fresh ? props.water : 0;
  const left = Math.max(0, props.kcalGoal - kcal);
  const text = '#F4F4F5';
  const muted = '#8B8D98';
  const blue = '#0073F9';
  const bg = '#08090B';
  const family = env.widgetFamily ?? 'systemSmall';

  if (family === 'accessoryCircular') {
    return (
      <Gauge value={Math.min(1, kcal / Math.max(1, props.kcalGoal))} modifiers={[gaugeStyle('circularCapacity')]}>
        <Text modifiers={[font({ size: 12, weight: 'bold' })]}>{`${Math.round(left / 100) / 10}k`}</Text>
      </Gauge>
    );
  }

  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 11, weight: 'semibold' })]}>KAGAINZ</Text>
        <Text modifiers={[font({ size: 17, weight: 'bold' }), monospacedDigit()]}>{`${left.toLocaleString('tr-TR')} kcal kaldı`}</Text>
        <Text modifiers={[font({ size: 11 })]}>{`P ${Math.round(protein)}/${props.proteinGoal} g · 💧 ${water}/${props.waterGoal}`}</Text>
      </VStack>
    );
  }

  const header = (
    <HStack>
      <Text modifiers={[font({ size: 11, weight: 'heavy' }), kerning(1.5), foregroundStyle(text)]}>KAGAINZ</Text>
      <Spacer />
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(muted)]}>{`🔥 ${props.streak}`}</Text>
    </HStack>
  );
  const kcalBlock = (
    <VStack alignment="leading" spacing={0}>
      <Text modifiers={[font({ size: 34, weight: 'heavy', design: 'rounded' }), monospacedDigit(), foregroundStyle(text)]}>
        {left.toLocaleString('tr-TR')}
      </Text>
      <Text modifiers={[font({ size: 10, weight: 'semibold' }), kerning(1.2), foregroundStyle(muted)]}>KCAL KALDI</Text>
    </VStack>
  );
  const bar = (label: string, value: number, goal: number, color: string) => (
    <VStack alignment="leading" spacing={3}>
      <HStack>
        <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(muted)]}>{label}</Text>
        <Spacer />
        <Text modifiers={[font({ size: 10, weight: 'semibold' }), monospacedDigit(), foregroundStyle(text)]}>{`${Math.round(value)}/${goal}`}</Text>
      </HStack>
      <Gauge value={Math.min(1, value / Math.max(1, goal))} modifiers={[gaugeStyle('linearCapacity'), tint(color)]} />
    </VStack>
  );

  if (family === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={8} modifiers={[containerBackground(bg, 'widget'), widgetURL('kagainz://')]}>
        {header}
        <Spacer />
        {kcalBlock}
        {bar('PROTEİN', protein, props.proteinGoal, blue)}
      </VStack>
    );
  }

  return (
    <HStack spacing={16} modifiers={[containerBackground(bg, 'widget'), widgetURL('kagainz://')]}>
      <VStack alignment="leading" spacing={8}>
        {header}
        <Spacer />
        {kcalBlock}
      </VStack>
      <VStack alignment="leading" spacing={10}>
        {bar('KALORİ', kcal, props.kcalGoal, '#F4F4F5')}
        {bar('PROTEİN', protein, props.proteinGoal, blue)}
        {bar('SU', water, props.waterGoal, '#38BDF8')}
      </VStack>
    </HStack>
  );
};

export const TodayWidget = createWidget<TodayProps>('KagainzToday', TodayLayout, {
  day: '',
  kcal: 0,
  kcalGoal: 2200,
  protein: 0,
  proteinGoal: 150,
  water: 0,
  waterGoal: 10,
  streak: 0,
});
