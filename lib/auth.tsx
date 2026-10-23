import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { isSupabaseConfigured, supabase } from './supabase';
import type { Tier } from './tiers';

export type Profile = { id: string; username: string | null; tier: Tier };

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  tier: Tier;
  loading: boolean;
  // Chat'e yazabilmek için: numara doğrulanmış ve kullanıcı adı seçilmiş olmalı.
  canPost: boolean;
  sendCode: (phone: string) => Promise<string | null>;
  verifyCode: (phone: string, code: string) => Promise<string | null>;
  setUsername: (username: string) => Promise<string | null>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

// "0532 123 45 67" veya "532..." -> "+905321234567"
export function normalizeTrPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('90')) return `+${digits}`;
  if (digits.startsWith('0')) return `+9${digits}`;
  return `+90${digits}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) return setProfile(null);
    const { data } = await supabase.from('profiles').select('id, username, tier').eq('id', userId).maybeSingle();
    setProfile((data as Profile | null) ?? { id: userId, username: null, tier: 'free' });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      loadProfile(s?.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const value: AuthState = {
    session,
    profile,
    tier: profile?.tier ?? 'free',
    loading,
    canPost: Boolean(session?.user.phone && profile?.username),
    async sendCode(phone) {
      const { error } = await supabase.auth.signInWithOtp({ phone: normalizeTrPhone(phone) });
      return error?.message ?? null;
    },
    async verifyCode(phone, code) {
      const { error } = await supabase.auth.verifyOtp({ phone: normalizeTrPhone(phone), token: code, type: 'sms' });
      return error?.message ?? null;
    },
    async setUsername(username) {
      if (!session) return 'Önce giriş yapmalısın.';
      const { error } = await supabase.from('profiles').update({ username }).eq('id', session.user.id);
      if (error) return error.code === '23505' ? 'Bu kullanıcı adı alınmış.' : error.message;
      await loadProfile(session.user.id);
      return null;
    },
    refreshProfile: () => loadProfile(session?.user.id),
    async signOut() {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return ctx;
}
