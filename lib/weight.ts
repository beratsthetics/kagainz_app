import type { WeightLog } from './goals';

const DAY_MS = 86400000;
const time = (day: string) => new Date(`${day}T12:00:00`).getTime();

// Kilo trendi: her gün için o güne kadarki son 7 günün ortalaması. Günlük su/tuz oynamalarını yumuşatır.
export function weightTrend(logs: WeightLog[]): number[] {
  return logs.map((w) => {
    const t = time(w.day);
    const window = logs.filter((o) => time(o.day) <= t && time(o.day) > t - 7 * DAY_MS);
    return Math.round((window.reduce((n, o) => n + o.kg, 0) / window.length) * 10) / 10;
  });
}

// Son 21 günün kilo kayıtlarına oturan doğrunun eğimi, haftalık kg olarak.
// En az 3 kayıt ve 7 günlük aralık yoksa null (tek iki tartıdan yön çıkarmayalım).
export function weeklyRate(logs: WeightLog[], now = Date.now()): number | null {
  const recent = logs.filter((w) => time(w.day) > now - 21 * DAY_MS);
  if (recent.length < 3) return null;
  const xs = recent.map((w) => time(w.day) / DAY_MS);
  if (Math.max(...xs) - Math.min(...xs) < 7) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = recent.reduce((a, w) => a + w.kg, 0) / recent.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (recent[i].kg - my);
    den += (x - mx) ** 2;
  });
  return den ? (num / den) * 7 : null;
}
