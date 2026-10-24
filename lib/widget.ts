import { requireOptionalNativeModule } from 'expo';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useDaily } from './daily';
import { useProgress } from './progress';
import { dayKey } from './store';

// Ana ekran widget'ını (iPhone) günlük kayıtla eşitler. Expo Go'da ve web'de widget
// modülü yoktur; o zaman sessizce hiçbir şey yapmaz.
export function useWidgetSync() {
  const { totals, goals, water, waterGoal } = useDaily();
  const { stats } = useProgress();

  useEffect(() => {
    // Modül yokken widget dosyasını yüklemek Expo Go'da kırmızı hata ekranı açar.
    if (Platform.OS !== 'ios' || !requireOptionalNativeModule('ExpoWidgets')) return;
    const t = setTimeout(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { TodayWidget } = require('@/widgets/TodayWidget') as typeof import('@/widgets/TodayWidget');
        TodayWidget.updateSnapshot({
          day: dayKey(),
          kcal: Math.round(totals.kcal),
          kcalGoal: goals.kcal,
          protein: Math.round(totals.protein),
          proteinGoal: goals.protein,
          water,
          waterGoal,
          streak: stats.streak,
        });
      } catch {
        // Widget'sız derleme (Expo Go).
      }
    }, 800);
    return () => clearTimeout(t);
  }, [totals.kcal, totals.protein, goals.kcal, goals.protein, water, waterGoal, stats.streak]);
}
