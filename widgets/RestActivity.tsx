import { HStack, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, monospacedDigit, padding, tint } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

// Kilit ekranı ve Dynamic Island'da dinlenme sayacı. Sayaç iOS tarafından canlı sayılır;
// uygulama arka plandayken de ilerler. 'widget' işaretli fonksiyon dışarıdaki sabitlere erişemez.
export type RestProps = {
  // Dinlenmenin başladığı ve bittiği an (ms).
  startedAt: number;
  endsAt: number;
  exercise: string;
  label: string;
};

const RestLayout = (props: RestProps, env: LiveActivityEnvironment) => {
  'widget';
  const range = { lower: new Date(props.startedAt), upper: new Date(props.endsAt) };
  const text = env.colorScheme === 'light' ? '#0B0C0F' : '#F4F4F5';
  const muted = '#8B8D98';
  const blue = '#0073F9';
  const timer = (size: number) => (
    <Text timerInterval={range} countsDown modifiers={[font({ size, weight: 'bold' }), monospacedDigit(), foregroundStyle(text)]} />
  );
  return {
    banner: (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 16 })]}>
        <HStack>
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(muted)]}>{props.label}</Text>
            <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundStyle(text)]}>{props.exercise}</Text>
          </VStack>
          <Spacer />
          {timer(34)}
        </HStack>
        <ProgressView timerInterval={range} countsDown modifiers={[tint(blue)]} />
      </VStack>
    ),
    compactLeading: <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(blue)]}>K</Text>,
    compactTrailing: timer(14),
    minimal: timer(12),
    expandedLeading: <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(muted)]}>{props.label}</Text>,
    expandedTrailing: timer(24),
    expandedBottom: <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(text)]}>{props.exercise}</Text>,
  };
};

export const RestActivity = createLiveActivity<RestProps>('KagainzRest', RestLayout);
