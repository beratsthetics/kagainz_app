import { useAuth } from './auth';

// Hoş geldin görevleri (0017): ilk 7 gün, ödülü hiç almamış ücretsiz üye 3 gün Pro alabilir.
const WINDOW_DAYS = 7;

export function useWelcomeEligible() {
  const { profile } = useAuth();
  // welcome_claimed sütunu yoksa (0017 çalışmamışsa) undefined gelir ve teklif görünmez.
  return (
    profile?.welcome_claimed === false &&
    profile.tier === 'free' &&
    !!profile.created_at &&
    Date.now() - new Date(profile.created_at).getTime() < WINDOW_DAYS * 86400000
  );
}

// Kilitli kartlardaki "3 gün ücretsiz dene" düğmesi görev penceresini buradan açar.
let opener: (() => void) | null = null;

export function setWelcomeOpener(fn: (() => void) | null) {
  opener = fn;
}

export function openWelcomeTasks() {
  opener?.();
}
