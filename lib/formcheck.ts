import { LIMITS, type Tier } from './tiers';

export type FormCheck = {
  id: string;
  user_id: string;
  exercise_id: string;
  note: string | null;
  video_path: string;
  status: 'pending' | 'reviewed';
  created_at: string;
  reviewed_at: string | null;
  profiles?: { username: string | null; tier?: Tier } | null;
};

export type FormComment = {
  id: number;
  form_check_id: string;
  author_id: string;
  body: string;
  at_seconds: number | null;
  created_at: string;
  profiles?: { username: string | null; role: string | null } | null;
};

export const FORM_CHECK_SELECT = 'id, user_id, exercise_id, note, video_path, status, created_at, reviewed_at, profiles(username, tier)';

// Bir sonraki form check ne zaman gönderilebilir? Plus 14, Max 7 günde bir. Sunucu da aynı kuralı uygular.
export function nextAllowedAt(tier: Tier, last: FormCheck | undefined): Date | null {
  const days = LIMITS.formCheckDays[tier];
  if (!days) return null;
  if (!last) return new Date(0);
  return new Date(new Date(last.created_at).getTime() + days * 86400000);
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
