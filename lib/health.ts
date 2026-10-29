import { useCallback, useEffect, useState } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AppState, Platform } from 'react-native';

import { type WeightLog } from './goals';
import { dayKey, useStored } from './store';

// Apple Sağlık (iOS) ve Health Connect (Android): bugünkü adım ve son tartı okunur, yazılmaz.
// Yerel modüller sadece EAS derlemesinde var; Expo Go'da ve web'de bağlan düğmesi hiç görünmez.
type Reader = { connect: () => Promise<boolean>; steps: () => Promise<number>; weight: () => Promise<{ kg: number; day: string } | null> };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function appleReader(): Reader | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const hk = require('@kingstinct/react-native-healthkit') as typeof import('@kingstinct/react-native-healthkit');
    if (!hk.isHealthDataAvailable()) return null;
    return {
      connect: () => hk.requestAuthorization({ toRead: ['HKQuantityTypeIdentifierStepCount', 'HKQuantityTypeIdentifierBodyMass'] }),
      steps: async () => {
        const r = await hk.queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], {
          filter: { date: { startDate: startOfToday(), endDate: new Date() } },
          unit: 'count',
        });
        return Math.round(r.sumQuantity?.quantity ?? 0);
      },
      weight: async () => {
        const s = await hk.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg');
        return s ? { kg: Math.round(s.quantity * 10) / 10, day: dayKey(new Date(s.startDate)) } : null;
      },
    };
  } catch {
    return null;
  }
}

function androidReader(): Reader | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const hc = require('react-native-health-connect') as typeof import('react-native-health-connect');
    const range = (from: Date) => ({ operator: 'between' as const, startTime: from.toISOString(), endTime: new Date().toISOString() });
    return {
      connect: async () => {
        if (!(await hc.initialize())) return false;
        const granted = await hc.requestPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'Weight' },
        ]);
        return granted.length > 0;
      },
      steps: async () => {
        await hc.initialize();
        const r = await hc.aggregateRecord({ recordType: 'Steps', timeRangeFilter: range(startOfToday()) });
        return r.COUNT_TOTAL ?? 0;
      },
      weight: async () => {
        await hc.initialize();
        const monthAgo = new Date(Date.now() - 30 * 86400000);
        const { records } = await hc.readRecords('Weight', { timeRangeFilter: range(monthAgo), ascendingOrder: false, pageSize: 1 });
        const w = records[0];
        return w ? { kg: Math.round(w.weight.inKilograms * 10) / 10, day: dayKey(new Date(w.time)) } : null;
      },
    };
  } catch {
    return null;
  }
}

let cached: Reader | null | undefined;
function reader() {
  // Expo Go'da bu yerel modüller yok; yüklemeyi hiç denemeyiz.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  if (cached === undefined) cached = Platform.OS === 'ios' ? appleReader() : Platform.OS === 'android' ? androidReader() : null;
  return cached;
}

export const HEALTH_NAME = Platform.OS === 'ios' ? 'Apple Sağlık' : 'Health Connect';

export function useHealth() {
  const [connected, setConnected] = useStored<boolean>('device:health', false);
  const [, setWeights] = useStored<WeightLog[]>('weights', []);
  const [steps, setSteps] = useState<number | null>(null);
  const available = reader() != null;

  const sync = useCallback(async () => {
    const r = reader();
    if (!r || !connected) return;
    try {
      setSteps(await r.steps());
      const w = await r.weight();
      // Tartı o gün uygulamaya girilmediyse Sağlık'taki değer eklenir; elle girilen kilo ezilmez.
      if (w) setWeights((prev) => (prev.some((x) => x.day === w.day) ? prev : [...prev, w].sort((a, b) => a.day.localeCompare(b.day)).slice(-365)));
    } catch {
      // İzin geri alınmış olabilir.
    }
  }, [connected, setWeights]);

  useEffect(() => {
    sync();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && sync());
    return () => sub.remove();
  }, [sync]);

  async function connect() {
    const r = reader();
    if (!r) return false;
    try {
      const ok = await r.connect();
      setConnected(ok);
      return ok;
    } catch {
      return false;
    }
  }

  return { available, connected, steps, connect, disconnect: () => setConnected(false) };
}

