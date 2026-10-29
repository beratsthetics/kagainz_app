import { useEffect, useState } from 'react';

import { useAuth } from './auth';
import { loadHistory, useDaily, type DaySummary, type Goals } from './daily';
import { type BodyProfile, type WeightLog } from './goals';
import { dayKey, useStored } from './store';
import { hasFeature } from './tiers';
import { weeklyRate } from './weight';

// Kendini güncelleyen kalori hedefi: son 14 günde yenen ortalama kalori ile kilo trendinden gerçek harcamayı
// tahmin eder, hedefin haftalık değişimine göre yeni kalori önerir. 1 kg yağ ≈ 7700 kcal.
const KCAL_PER_KG = 7700;
const MAX_STEP = 200;
// Hedef türüne göre istenen haftalık kilo değişimi (kg).
const WANTED: Record<BodyProfile['goal'], number> = { cut: -0.5, recomp: -0.25, maintain: 0, bulk: 0.25 };

export type Proposal = {
  avgKcal: number;
  rate: number;
  from: number;
  to: number;
  goals: Goals;
};

export function proposeTarget(goals: Goals, body: BodyProfile, days: DaySummary[], weights: WeightLog[]): Proposal | null {
  // Bugün yarım gün; 800 kcal altı günler büyük ihtimalle eksik girilmiş.
  const today = dayKey();
  const logged = days.filter((d) => d.day !== today && d.totals.kcal >= 800);
  const rate = weeklyRate(weights);
  if (logged.length < 10 || rate == null) return null;
  const avgKcal = Math.round(logged.reduce((n, d) => n + d.totals.kcal, 0) / logged.length);
  const tdee = avgKcal - (rate * KCAL_PER_KG) / 7;
  const ideal = tdee + (WANTED[body.goal] * KCAL_PER_KG) / 7;
  const floor = body.sex === 'male' ? 1500 : 1200;
  const to = Math.max(floor, Math.round(Math.min(goals.kcal + MAX_STEP, Math.max(goals.kcal - MAX_STEP, ideal)) / 10) * 10);
  // 50 kcal'den küçük farklar için hedefi oynatmayız.
  if (Math.abs(to - goals.kcal) < 50) return null;
  // Protein ve yağ gram olarak kalır, fark karbonhidrattan gelir.
  const carb = Math.max(0, Math.round((to - goals.protein * 4 - goals.fat * 9) / 4));
  return { avgKcal, rate, from: goals.kcal, to, goals: { ...goals, kcal: to, carb } };
}

// Haftanın anahtarı: o haftanın pazartesisi. Öneri haftada bir sorulur.
function weekKey(d = new Date()) {
  const m = new Date(d);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return dayKey(m);
}

export function useAdaptiveTarget() {
  const { tier, isCoach } = useAuth();
  const { goals, body, coachGoals, setBody, entries } = useDaily();
  const [weights] = useStored<WeightLog[]>('weights', []);
  const [decided, setDecided] = useStored<string | null>('adaptive:week', null);
  const [days, setDays] = useState<DaySummary[] | null>(null);
  // Koç hedef atadıysa onun hedefi geçerli; hesaplanmış hedefi olmayanlara da öneri yok.
  const eligible = (isCoach || hasFeature(tier, 'adaptive_kcal')) && !coachGoals && body != null;
  const week = weekKey();

  useEffect(() => {
    if (!eligible || decided === week) return;
    loadHistory(15).then(setDays);
  }, [eligible, decided, week, entries.length]);

  const proposal = eligible && decided !== week && days && body ? proposeTarget(goals, body, days, weights) : null;
  return {
    proposal,
    apply: () => {
      if (!proposal || !body) return;
      setBody(body, proposal.goals);
      setDecided(week);
    },
    skip: () => setDecided(week),
  };
}
