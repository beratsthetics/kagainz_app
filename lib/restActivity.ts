import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

import type { RestProps } from '@/widgets/RestActivity';

// Dinlenme sayacını kilit ekranında ve Dynamic Island'da gösterir (iOS 16.2+, EAS derlemesi).
// Expo Go'da, Android'de ve web'de modül yoktur; o zaman sessizce hiçbir şey yapmaz.
function factory() {
  if (Platform.OS !== 'ios' || !requireOptionalNativeModule('ExpoWidgets')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@/widgets/RestActivity') as typeof import('@/widgets/RestActivity')).RestActivity;
  } catch {
    return null;
  }
}

export function startRestActivity(props: RestProps) {
  const f = factory();
  if (!f) return;
  try {
    const running = f.getInstances();
    if (running.length) {
      running[0].update(props, new Date(props.endsAt)).catch(() => {});
      running.slice(1).forEach((a) => a.end('immediate').catch(() => {}));
    } else {
      f.start(props, 'kagainz://workout', new Date(props.endsAt));
    }
  } catch {
    // Kullanıcı canlı etkinlikleri kapatmış olabilir.
  }
}

export function endRestActivity() {
  const f = factory();
  if (!f) return;
  try {
    f.getInstances().forEach((a) => a.end('immediate').catch(() => {}));
  } catch {
    // Yok say.
  }
}
