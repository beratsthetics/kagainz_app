import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from './supabase';
import type { Tier } from './tiers';

export type Profile = { id: string; username: string | null; tier: Tier };

// phone: telefonla giriş/kayıt, email: e-postayla giriş/kayıt,
// link_phone: e-posta veya Google ile girmiş kullanıcının hesabına numara eklemesi (chat'e yazmak için).
export type CodeMethod = 'phone' | 'email' | 'link_phone';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  tier: Tier;
  loading: boolean;
  // Chat'e yazabilmek için: numara doğrulanmış ve kullanıcı adı seçilmiş olmalı.
  canPost: boolean;
  hasPhone: boolean;
  sendCode: (method: CodeMethod, target: string) => Promise<string | null>;
  verifyCode: (method: CodeMethod, target: string, code: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  setUsername: (username: string) => Promise<string | null>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

WebBrowser.maybeCompleteAuthSession();

// "0532 123 45 67" veya "532..." -> "+905321234567"
export function normalizeTrPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('90')) return `+${digits}`;
  if (digits.startsWith('0')) return `+9${digits}`;
  return `+90${digits}`;
}

export function formatTarget(method: CodeMethod, target: string) {
  return method === 'email' ? target.trim().toLowerCase() : normalizeTrPhone(target);
}

const GOOGLE_REDIRECT_PATH = 'auth/callback';

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

  const hasPhone = Boolean(session?.user.phone);

  const value: AuthState = {
    session,
    profile,
    tier: profile?.tier ?? 'free',
    loading,
    hasPhone,
    canPost: Boolean(hasPhone && profile?.username),
    async sendCode(method, target) {
      const t = formatTarget(method, target);
      const { error } =
        method === 'email'
          ? await supabase.auth.signInWithOtp({ email: t })
          : method === 'phone'
            ? await supabase.auth.signInWithOtp({ phone: t })
            : await supabase.auth.updateUser({ phone: t });
      return error?.message ?? null;
    },
    async verifyCode(method, target, code) {
      const t = formatTarget(method, target);
      const { error } =
        method === 'email'
          ? await supabase.auth.verifyOtp({ email: t, token: code, type: 'email' })
          : await supabase.auth.verifyOtp({ phone: t, token: code, type: method === 'phone' ? 'sms' : 'phone_change' });
      if (!error && method === 'link_phone') await supabase.auth.refreshSession();
      return error?.message ?? null;
    },
    async signInWithGoogle() {
      // Web'de sayfa Google'a gider ve /auth/callback'e döner; mobilde uygulama içi tarayıcı açılır.
      const redirectTo =
        Platform.OS === 'web'
          ? `${window.location.origin}/${GOOGLE_REDIRECT_PATH}`
          : Linking.createURL(GOOGLE_REDIRECT_PATH);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
      });
      if (error) return error.message;
      if (Platform.OS === 'web' || !data.url) return null;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success')
        return result.type === 'cancel' || result.type === 'dismiss' ? 'cancelled' : 'Google girişi tamamlanamadı.';
      const code = new URL(result.url).searchParams.get('code');
      if (!code) return 'Google girişi tamamlanamadı.';
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      return exchangeError?.message ?? null;
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

// Girişten sonra: kullanıcı adı yoksa onu sor, varsa uygulamaya dön.
export async function nextAfterSignIn(): Promise<'/auth/username' | null> {
  const { data: user } = await supabase.auth.getUser();
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.user?.id ?? '')
    .maybeSingle();
  return data?.username ? null : '/auth/username';
}

// Chat'e yazabilmek için eksik olan adım: giriş, numara doğrulama ya da kullanıcı adı.
export function useJoinStep(): {
  title: string;
  hint: string;
  href: '/auth' | '/auth/phone?link=1' | '/auth/username';
} | null {
  const { session, hasPhone, profile } = useAuth();
  if (!session) return { title: 'Hesap oluştur', hint: 'Ücretsiz hesapla topluluğa katıl.', href: '/auth' };
  if (!hasPhone)
    return {
      title: 'Numaramı doğrula',
      hint: "Chat'e yazmak için numaranı bir kez doğrula.",
      href: '/auth/phone?link=1',
    };
  if (!profile?.username)
    return { title: 'Kullanıcı adı seç', hint: 'Bir kullanıcı adı seç, yazmaya başla.', href: '/auth/username' };
  return null;
}
