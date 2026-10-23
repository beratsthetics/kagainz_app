import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Macros } from './macros';

export type LogEntry = { id: string; text: string; macros: Macros; at: string };

export type Goals = Macros;

// Varsayılan günlük hedef; profil ayarlarından değiştirilebilir hale getirilecek.
export const DEFAULT_GOALS: Goals = { kcal: 2200, protein: 150, carb: 240, fat: 70 };

type DailyState = {
  entries: LogEntry[];
  totals: Macros;
  goals: Goals;
  add: (text: string, macros: Macros) => void;
  remove: (id: string) => void;
};

const DailyContext = createContext<DailyState | null>(null);

const today = () => new Date().toISOString().slice(0, 10);
const storageKey = () => `kagainz:log:${today()}`;

export function DailyProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(storageKey())
      .then((raw) => raw && setEntries(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  function save(next: LogEntry[]) {
    setEntries(next);
    AsyncStorage.setItem(storageKey(), JSON.stringify(next)).catch(() => {});
  }

  const totals = entries.reduce<Macros>(
    (a, e) => ({
      kcal: a.kcal + e.macros.kcal,
      protein: Math.round((a.protein + e.macros.protein) * 10) / 10,
      carb: Math.round((a.carb + e.macros.carb) * 10) / 10,
      fat: Math.round((a.fat + e.macros.fat) * 10) / 10,
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0 },
  );

  return (
    <DailyContext.Provider
      value={{
        entries,
        totals,
        goals: DEFAULT_GOALS,
        add: (text, macros) =>
          save([...entries, { id: String(Date.now()), text, macros, at: new Date().toISOString() }]),
        remove: (id) => save(entries.filter((e) => e.id !== id)),
      }}>
      {children}
    </DailyContext.Provider>
  );
}

export function useDaily() {
  const ctx = useContext(DailyContext);
  if (!ctx) throw new Error('useDaily, DailyProvider içinde kullanılmalı');
  return ctx;
}
