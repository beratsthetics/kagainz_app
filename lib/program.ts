// Örnek antrenman programı. Gerçek programlar ve kas animasyonları sonraki adımda veritabanından gelecek.
export type Exercise = { name: string; sets: string; muscle: string };
export type Day = { day: string; short: string; focus: string; exercises: Exercise[] };

export const PROGRAM: Day[] = [
  {
    day: 'Pazartesi',
    short: 'Pzt',
    focus: 'Göğüs',
    exercises: [
      { name: 'Smith machine incline press', sets: '2×8', muscle: 'Üst göğüs' },
      { name: 'Chest press', sets: '2×8', muscle: 'Göğüs' },
      { name: 'Machine chest fly', sets: '2×8', muscle: 'Göğüs' },
      { name: 'Triceps pushdown', sets: '2×12', muscle: 'Arka kol' },
    ],
  },
  {
    day: 'Çarşamba',
    short: 'Çar',
    focus: 'Sırt',
    exercises: [
      { name: 'Lat pulldown', sets: '3×10', muscle: 'Kanat' },
      { name: 'Seated cable row', sets: '3×10', muscle: 'Orta sırt' },
      { name: 'Straight arm pulldown', sets: '2×12', muscle: 'Kanat' },
      { name: 'Hammer curl', sets: '2×12', muscle: 'Ön kol' },
    ],
  },
  {
    day: 'Cuma',
    short: 'Cum',
    focus: 'Bacak',
    exercises: [
      { name: 'Hack squat', sets: '3×8', muscle: 'Ön bacak' },
      { name: 'Leg extension', sets: '2×12', muscle: 'Ön bacak' },
      { name: 'Lying leg curl', sets: '2×12', muscle: 'Arka bacak' },
      { name: 'Standing calf raise', sets: '3×15', muscle: 'Kalf' },
    ],
  },
];

const DAY_INDEX: Record<number, number> = { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 2, 0: 2 };

export function todaysWorkout(): Day {
  return PROGRAM[DAY_INDEX[new Date().getDay()]];
}
