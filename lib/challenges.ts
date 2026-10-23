import { dayKey } from './store';

// Haftalık meydan okuma: her hafta (Pazartesi-Pazar) listeden sıradaki seçilir. İlerleme telefondaki
// kayıtlardan hesaplanır, tamamlayınca challenge_completions tablosuna yazılır ve listede görünür.
type DayActivity = { m?: number; w?: number; p?: boolean; h?: boolean };

export type Challenge = {
  code: string;
  title: string;
  description: string;
  emoji: string;
  target: number;
  unit: string;
  measure: (days: DayActivity[]) => number;
};

export const CHALLENGES: Challenge[] = [
  {
    code: 'workouts_4',
    title: '4 antrenman',
    description: 'Bu hafta 4 antrenman bitir.',
    emoji: '🏋️',
    target: 4,
    unit: 'antrenman',
    measure: (d) => d.reduce((n, x) => n + (x.w ?? 0), 0),
  },
  {
    code: 'protein_5',
    title: 'Protein haftası',
    description: '5 gün protein hedefini doldur.',
    emoji: '🥩',
    target: 5,
    unit: 'gün',
    measure: (d) => d.filter((x) => x.p).length,
  },
  {
    code: 'log_7',
    title: 'Her gün kayıt',
    description: '7 günün hepsinde en az bir öğün gir.',
    emoji: '📒',
    target: 7,
    unit: 'gün',
    measure: (d) => d.filter((x) => (x.m ?? 0) > 0).length,
  },
  {
    code: 'water_5',
    title: 'Su içen kazanır',
    description: '5 gün su hedefini tamamla.',
    emoji: '💧',
    target: 5,
    unit: 'gün',
    measure: (d) => d.filter((x) => x.h).length,
  },
  {
    code: 'workouts_5',
    title: 'Beşte beş',
    description: 'Bu hafta 5 antrenman bitir.',
    emoji: '🔥',
    target: 5,
    unit: 'antrenman',
    measure: (d) => d.reduce((n, x) => n + (x.w ?? 0), 0),
  },
];

// ISO hafta numarası.
export function weekId(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { id: `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`, week };
}

export function weekDays(date = new Date()) {
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return dayKey(d);
  });
}

export function currentChallenge(date = new Date()) {
  const { id, week } = weekId(date);
  const challenge = CHALLENGES[week % CHALLENGES.length];
  return { challenge, weekId: id, key: `${challenge.code}:${id}` };
}

export function challengeProgress(activity: Record<string, DayActivity>, date = new Date()) {
  const { challenge, weekId: id, key } = currentChallenge(date);
  const days = weekDays(date).map((d) => activity[d] ?? {});
  const value = Math.min(challenge.target, challenge.measure(days));
  return { challenge, weekId: id, key, value, done: value >= challenge.target };
}
