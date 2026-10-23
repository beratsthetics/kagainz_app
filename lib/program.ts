// Antrenman programı. Koç panelinden üyeye özel program atanırsa o kullanılır (assigned_programs),
// yoksa bu örnek program gösterilir.
export type ProgramExercise = { exerciseId: string; sets: number; reps: string; note?: string };
export type ProgramDay = { day: string; short: string; focus: string; weekday: number; exercises: ProgramExercise[] };
export type Program = { name: string; days: ProgramDay[]; note?: string };

export const WEEKDAYS = [
  { short: 'Paz', day: 'Pazar' },
  { short: 'Pzt', day: 'Pazartesi' },
  { short: 'Sal', day: 'Salı' },
  { short: 'Çar', day: 'Çarşamba' },
  { short: 'Per', day: 'Perşembe' },
  { short: 'Cum', day: 'Cuma' },
  { short: 'Cmt', day: 'Cumartesi' },
];

export const DEFAULT_PROGRAM: Program = {
  name: 'Kagainz 3 gün',
  days: [
    {
      day: 'Pazartesi',
      short: 'Pzt',
      weekday: 1,
      focus: 'Göğüs',
      exercises: [
        { exerciseId: 'incline_smith_press', sets: 2, reps: '6-8' },
        { exerciseId: 'chest_press', sets: 2, reps: '8-10' },
        { exerciseId: 'machine_fly', sets: 2, reps: '10-12' },
        { exerciseId: 'lateral_raise', sets: 3, reps: '12-15' },
        { exerciseId: 'triceps_pushdown', sets: 2, reps: '10-12' },
      ],
    },
    {
      day: 'Çarşamba',
      short: 'Çar',
      weekday: 3,
      focus: 'Sırt',
      exercises: [
        { exerciseId: 'lat_pulldown', sets: 3, reps: '8-10' },
        { exerciseId: 'seated_row', sets: 3, reps: '8-10' },
        { exerciseId: 'straight_arm_pulldown', sets: 2, reps: '12' },
        { exerciseId: 'rear_delt_fly', sets: 2, reps: '12-15' },
        { exerciseId: 'hammer_curl', sets: 2, reps: '10-12' },
      ],
    },
    {
      day: 'Cuma',
      short: 'Cum',
      weekday: 5,
      focus: 'Bacak',
      exercises: [
        { exerciseId: 'hack_squat', sets: 3, reps: '6-8' },
        { exerciseId: 'rdl', sets: 2, reps: '8-10' },
        { exerciseId: 'leg_extension', sets: 2, reps: '12' },
        { exerciseId: 'lying_leg_curl', sets: 2, reps: '12' },
        { exerciseId: 'standing_calf_raise', sets: 3, reps: '12-15' },
      ],
    },
  ],
};

// Bugünün ya da bir sonraki antrenman gününün indeksi.
export function todaysDayIndex(program: Program, date = new Date()) {
  const wd = date.getDay();
  const exact = program.days.findIndex((d) => d.weekday === wd);
  if (exact >= 0) return exact;
  const next = program.days.findIndex((d) => d.weekday > wd);
  return next >= 0 ? next : 0;
}

export function isTrainingDay(program: Program, date = new Date()) {
  return program.days.some((d) => d.weekday === date.getDay());
}
