import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';

import { useAuth } from './auth';
import { useCelebrate } from './celebrate';
import { loadCatalog } from './exerciseCatalog';
import { exerciseById, MUSCLES, type Equipment, type Muscle } from './exercises';
import { cancelNotification, scheduleRestDone } from './notifications';
import { DEFAULT_PROGRAM, type Program, type ProgramDay } from './program';
import { useProgress } from './progress';
import { daysAgo, useStored } from './store';
import { isSupabaseConfigured, supabase } from './supabase';
import { tx } from './i18n';

// type yoksa normal set. Isınma setleri hacme, rekora ve ilerleme önerisine sayılmaz.
export type SetType = 'warmup' | 'drop' | 'failure';
export type SetLog = { kg: number | null; reps: number | null; done: boolean; type?: SetType; rpe?: number };
// superset: bu hareket bir sonrakiyle süperset; aralarında dinlenme sayacı başlamaz.
export type ExerciseLog = { exerciseId: string; target?: { sets: number; reps: string }; sets: SetLog[]; superset?: boolean };

export const isWorking = (s: SetLog) => s.type !== 'warmup';
export type PR = { exerciseId: string; kg: number; reps: number; e1rm: number; kind: 'weight' | 'e1rm' };
export type Session = {
  id: string;
  title: string;
  startedAt: string;
  endedAt?: string;
  exercises: ExerciseLog[];
  volume?: number;
  prs?: PR[];
};
export type Record_ = { kg: number; reps: number; e1rm: number; at: string };

// Tahmini 1 tekrar maksimum (Epley).
export function e1rm(kg: number, reps: number) {
  if (!kg || !reps) return 0;
  return reps === 1 ? kg : Math.round(kg * (1 + reps / 30) * 10) / 10;
}

export function sessionVolume(s: Session) {
  return s.exercises.reduce(
    (n, e) => n + e.sets.reduce((m, set) => m + (set.done && isWorking(set) ? (set.kg ?? 0) * (set.reps ?? 0) : 0), 0),
    0,
  );
}

export function doneSets(s: Session) {
  return s.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
}

export type WorkoutMeta = {
  title: string;
  minutes: number;
  sets: number;
  volume: number;
  exercises: { name: string; best: string }[];
  prs: string[];
};

export function workoutMeta(s: Session): WorkoutMeta {
  const minutes = Math.max(1, Math.round((new Date(s.endedAt ?? s.startedAt).getTime() - new Date(s.startedAt).getTime()) / 60000));
  return {
    title: s.title,
    minutes,
    sets: doneSets(s),
    volume: Math.round(s.volume ?? 0),
    exercises: s.exercises.map((e) => {
      const best = e.sets.reduce((b, x) => ((x.kg ?? 0) > (b.kg ?? 0) ? x : b), e.sets[0]);
      return { name: exerciseById(e.exerciseId)?.trName ?? e.exerciseId, best: tx('{0} kg × {1}', [best.kg, best.reps]) };
    }),
    prs: (s.prs ?? []).map((p) => tx('{0}: {1} kg × {2}', [exerciseById(p.exerciseId)?.trName, p.kg, p.reps])),
  };
}

type Rest = { endsAt: number; total: number; notificationId: string | null };

type WorkoutState = {
  program: Program;
  assigned: boolean;
  // Koçun hazır şablonlarından hangileri var (gün sayısı) ve üyenin seçtiği: şablonun gün sayısı ya da 'own'.
  templates: number[];
  templateDays: ProgramChoice;
  setTemplateDays: (choice: ProgramChoice) => void;
  // Üyenin kendi yazdığı program.
  ownProgram: Program | null;
  setOwnProgram: (p: Program | null) => void;
  history: Session[];
  active: Session | null;
  records: Record<string, Record_>;
  rest: Rest | null;
  startDay: (day: ProgramDay) => void;
  startEmpty: () => void;
  addExercise: (exerciseId: string) => void;
  removeExercise: (index: number) => void;
  updateSet: (ei: number, si: number, patch: Partial<SetLog>) => void;
  addSet: (ei: number) => void;
  removeSet: (ei: number, si: number) => void;
  toggleSuperset: (ei: number) => void;
  finish: () => Session | null;
  discard: () => void;
  lastSetsFor: (exerciseId: string) => SetLog[] | null;
  weeklySets: () => Record<Muscle, number>;
  startRest: (seconds: number) => void;
  stopRest: () => void;
  restSeconds: number;
  setRestSeconds: (n: number) => void;
};

export type ProgramChoice = number | 'own' | null;

const WorkoutContext = createContext<WorkoutState | null>(null);

function emptySets(n: number): SetLog[] {
  return Array.from({ length: Math.max(1, n) }, () => ({ kg: null, reps: null, done: false }));
}

export type Suggestion = { kg: number; reps: number; reason: 'up' | 'reps' | 'same' };

// Hedef aralığı: "6-8" -> [6, 8], "10" -> [10, 10]. Sayı yoksa null.
function repRange(target?: string): [number, number] | null {
  const m = target?.match(/(\d+)\s*(?:-\s*(\d+))?/);
  if (!m) return null;
  const lo = Number(m[1]);
  return [lo, m[2] ? Number(m[2]) : lo];
}

const STEP_KG: Partial<Record<Equipment, number>> = { Barbell: 2.5, Smith: 2.5, Dumbbell: 2.5, Makine: 5, Kablo: 5 };

// Çift ilerleme: geçen sefer en ağır kiloda her çalışma seti aralığın üstüne ulaştıysa kilo artar ve tekrar
// aralığın altına iner; hepsi en az alt sınırdaysa bir tekrar eklenir; değilse aynı kiloda kalınır.
export function suggestNext(prev: SetLog[] | null, target?: string, equipment?: Equipment): Suggestion | null {
  const range = repRange(target);
  const working = (prev ?? []).filter((s) => isWorking(s) && s.type !== 'drop' && s.kg != null && s.reps != null);
  if (!range || !working.length) return null;
  const [lo, hi] = range;
  const top = Math.max(...working.map((s) => s.kg!));
  const reps = working.filter((s) => s.kg === top).map((s) => s.reps!);
  const step = equipment ? STEP_KG[equipment] : undefined;
  if (reps.every((r) => r >= hi)) return step ? { kg: top + step, reps: lo, reason: 'up' } : { kg: top, reps: hi + 1, reason: 'reps' };
  if (reps.every((r) => r >= lo)) return { kg: top, reps: Math.min(hi, Math.min(...reps) + 1), reason: 'reps' };
  return { kg: top, reps: lo, reason: 'same' };
}

// Setler geçen seferin kilo ve tekrarıyla dolu gelir; ilerleme önerisi varsa çalışma setleri ondan dolar.
// Geçmiş yoksa tekrar hedefin alt sınırıdır ("8-10" -> 8). Üye çoğu zaman sadece ✓'ye basar.
function prefilledSets(n: number, prev: SetLog[] | null, targetReps?: string, next?: Suggestion | null): SetLog[] {
  const target = targetReps ? parseInt(targetReps, 10) : NaN;
  const warmups: SetLog[] = (prev ?? []).filter((s) => !isWorking(s)).map((p) => ({ kg: p.kg, reps: p.reps, done: false, type: p.type }));
  const working = (prev ?? []).filter(isWorking);
  return [
    ...warmups,
    ...emptySets(n).map((s, i): SetLog => {
      const p = working[i] ?? working[working.length - 1];
      if (next && p?.type !== 'drop') return { ...s, kg: next.kg, reps: next.reps };
      return { ...s, kg: p?.kg ?? null, reps: p?.reps ?? (Number.isFinite(target) ? target : null), type: p?.type };
    }),
  ];
}

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const { session, tier, isCoach } = useAuth();
  const { markWorkout, bump } = useProgress();
  const celebrate = useCelebrate();
  const [history, setHistory] = useStored<Session[]>('workouts', []);
  const [active, setActive] = useStored<Session | null>('workout:active', null);
  const [records, setRecords] = useStored<Record<string, Record_>>('records', {});
  const [assignedProgram, setAssignedProgram] = useStored<Program | null>('program:assigned', null);
  const [templates, setTemplates] = useStored<Record<number, Program>>('device:program-templates', {});
  const [templateDays, setTemplateDays] = useStored<ProgramChoice>('program:template', null);
  const [ownProgram, setOwnProgram] = useStored<Program | null>('program:own', null);
  const paid = isCoach || tier !== 'free';
  const [rest, setRest] = useStored<Rest | null>('device:rest', null);
  const [restSeconds, setRestSeconds] = useStored<number>('rest-seconds', 90);
  const restRef = useRef(rest);
  restRef.current = rest;

  // Koçun atadığı program varsa onu çek.
  useEffect(() => {
    if (!session || !isSupabaseConfigured) return;
    supabase
      .from('assigned_programs')
      .select('program')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return;
        setAssignedProgram((data?.program as Program | undefined) ?? null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  // Koçun eklediği/kaldırdığı hareketler (0011); programlarda adları görünsün diye erkenden yüklenir.
  useEffect(() => {
    if (session) loadCatalog();
  }, [session]);

  // Koçun 3-6 günlük şablonları (0010). Sadece ücretli üyeler ve koç okuyabilir.
  useEffect(() => {
    if (!session || !isSupabaseConfigured || !paid) return;
    supabase
      .from('program_templates')
      .select('days, program')
      .then(({ data, error }) => {
        if (error) return;
        setTemplates(Object.fromEntries((data ?? []).map((r) => [r.days, r.program as Program])));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, paid]);

  const lastSetsFor = useCallback(
    (exerciseId: string) => {
      for (let i = history.length - 1; i >= 0; i--) {
        const ex = history[i].exercises.find((e) => e.exerciseId === exerciseId && e.sets.some((s) => s.done));
        if (ex) return ex.sets.filter((s) => s.done);
      }
      return null;
    },
    [history],
  );

  const mutate = useCallback(
    (fn: (s: Session) => Session) => setActive((prev) => (prev ? fn(prev) : prev)),
    [setActive],
  );

  const stopRest = useCallback(() => {
    cancelNotification(restRef.current?.notificationId);
    setRest(null);
  }, [setRest]);

  const startRest = useCallback(
    async (seconds: number) => {
      cancelNotification(restRef.current?.notificationId);
      const endsAt = Date.now() + seconds * 1000;
      setRest({ endsAt, total: seconds, notificationId: null });
      const notificationId = await scheduleRestDone(seconds);
      if (notificationId) setRest({ endsAt, total: seconds, notificationId });
    },
    [setRest],
  );

  const finish = useCallback((): Session | null => {
    if (!active) return null;
    stopRest();
    const exercises = active.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done && s.kg != null && s.reps != null) }))
      .filter((e) => e.sets.length);
    const prs: PR[] = [];
    const nextRecords = { ...records };
    const now = new Date().toISOString();
    for (const e of exercises) {
      const work = e.sets.filter(isWorking);
      const best = work.reduce<SetLog | null>((b, s) => (!b || e1rm(s.kg!, s.reps!) > e1rm(b.kg!, b.reps!) ? s : b), null);
      const heaviest = work.reduce<SetLog | null>((b, s) => (!b || s.kg! > b.kg! ? s : b), null);
      const old = records[e.exerciseId];
      if (!best || !heaviest) continue;
      const bestE = e1rm(best.kg!, best.reps!);
      // İlk kayıt rekor sayılmaz; bir önceki en iyiden ileri gitmek gerekir.
      if (old && heaviest.kg! > old.kg) {
        prs.push({ exerciseId: e.exerciseId, kg: heaviest.kg!, reps: heaviest.reps!, e1rm: e1rm(heaviest.kg!, heaviest.reps!), kind: 'weight' });
      } else if (old && bestE > old.e1rm) {
        prs.push({ exerciseId: e.exerciseId, kg: best.kg!, reps: best.reps!, e1rm: bestE, kind: 'e1rm' });
      }
      nextRecords[e.exerciseId] = {
        kg: Math.max(old?.kg ?? 0, heaviest.kg!),
        reps: !old || heaviest.kg! >= old.kg ? heaviest.reps! : old.reps,
        e1rm: Math.max(old?.e1rm ?? 0, bestE),
        at: now,
      };
    }
    const done: Session = { ...active, exercises, endedAt: now, prs };
    done.volume = sessionVolume(done);
    setActive(null);
    if (!exercises.length) return null;
    setHistory((prev) => [...prev, done].slice(-500));
    setRecords(nextRecords);
    markWorkout();
    if (prs.length) {
      bump('prs', prs.length);
      const first = prs[0];
      celebrate({
        title: prs.length > 1 ? tx('{0} yeni rekor', [prs.length]) : 'Yeni rekor',
        subtitle: tx('{0}: {1} kg × {2}', [exerciseById(first.exerciseId)?.trName ?? '', first.kg, first.reps]),
        emoji: '🏆',
      });
    }
    return done;
  }, [active, records, stopRest, setActive, setHistory, setRecords, markWorkout, bump, celebrate]);

  const value = useMemo<WorkoutState>(
    () => ({
      program:
        assignedProgram ??
        (!paid || templateDays == null ? null : templateDays === 'own' ? ownProgram : templates[templateDays]) ??
        DEFAULT_PROGRAM,
      assigned: assignedProgram != null,
      templates: paid ? Object.keys(templates).map(Number).sort() : [],
      templateDays,
      setTemplateDays,
      ownProgram,
      setOwnProgram,
      history,
      active,
      records,
      rest,
      startDay: (day) =>
        setActive({
          id: `${Date.now()}`,
          title: tx('{0} günü', [day.focus]),
          startedAt: new Date().toISOString(),
          exercises: day.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            target: { sets: e.sets, reps: e.reps },
            sets: prefilledSets(e.sets, lastSetsFor(e.exerciseId), e.reps, suggestNext(lastSetsFor(e.exerciseId), e.reps, exerciseById(e.exerciseId)?.equipment)),
          })),
        }),
      startEmpty: () =>
        setActive({ id: `${Date.now()}`, title: 'Serbest antrenman', startedAt: new Date().toISOString(), exercises: [] }),
      addExercise: (exerciseId) =>
        mutate((s) => ({ ...s, exercises: [...s.exercises, { exerciseId, sets: prefilledSets(3, lastSetsFor(exerciseId)) }] })),
      removeExercise: (index) => mutate((s) => ({ ...s, exercises: s.exercises.filter((_, i) => i !== index) })),
      updateSet: (ei, si, patch) =>
        mutate((s) => ({
          ...s,
          exercises: s.exercises.map((e, i) =>
            i !== ei ? e : { ...e, sets: e.sets.map((set, j) => (j !== si ? set : { ...set, ...patch })) },
          ),
        })),
      addSet: (ei) =>
        mutate((s) => ({
          ...s,
          exercises: s.exercises.map((e, i) => {
            if (i !== ei) return e;
            const last = e.sets[e.sets.length - 1];
            return { ...e, sets: [...e.sets, { kg: last?.kg ?? null, reps: last?.reps ?? null, done: false }] };
          }),
        })),
      toggleSuperset: (ei) =>
        mutate((s) => ({ ...s, exercises: s.exercises.map((e, i) => (i !== ei ? e : { ...e, superset: !e.superset })) })),
      removeSet: (ei, si) =>
        mutate((s) => ({
          ...s,
          exercises: s.exercises.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.filter((_, j) => j !== si) })),
        })),
      finish,
      discard: () => {
        stopRest();
        setActive(null);
      },
      lastSetsFor,
      weeklySets: () => {
        const since = daysAgo(7).toISOString();
        const out = Object.fromEntries(Object.keys(MUSCLES).map((m) => [m, 0])) as Record<Muscle, number>;
        for (const s of history) {
          if (s.startedAt < since) continue;
          for (const e of s.exercises) {
            const ex = exerciseById(e.exerciseId);
            if (!ex) continue;
            const n = e.sets.filter((x) => x.done && isWorking(x)).length;
            ex.primary.forEach((m) => (out[m] += n));
            ex.secondary.forEach((m) => (out[m] += n / 2));
          }
        }
        return out;
      },
      startRest,
      stopRest,
      restSeconds,
      setRestSeconds,
    }),
    [assignedProgram, paid, templates, templateDays, setTemplateDays, ownProgram, setOwnProgram, history, active, records, rest, setActive, mutate, finish, stopRest, lastSetsFor, startRest, restSeconds, setRestSeconds],
  );

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkouts() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkouts, WorkoutProvider içinde kullanılmalı');
  return ctx;
}
