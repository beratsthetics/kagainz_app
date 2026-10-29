export type Tier = 'free' | 'pro' | 'plus' | 'max';

export const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, plus: 2, max: 3 };

export type Feature =
  | 'macros'
  | 'general_chat'
  | 'training_programs'
  | 'meal_plans'
  | 'pro_chat'
  | 'plus_chat'
  | 'max_chat'
  | 'form_check'
  | 'full_library'
  | 'full_history'
  | 'unlimited_scans'
  | 'all_badges'
  | 'coach_dm';

// Her özelliğin açıldığı en düşük üyelik.
const FEATURE_MIN_TIER: Record<Feature, Tier> = {
  macros: 'free',
  general_chat: 'free',
  training_programs: 'pro',
  meal_plans: 'pro',
  pro_chat: 'pro',
  full_library: 'pro',
  full_history: 'pro',
  unlimited_scans: 'pro',
  all_badges: 'pro',
  plus_chat: 'plus',
  form_check: 'plus',
  max_chat: 'max',
  coach_dm: 'max',
};

export function hasFeature(tier: Tier, feature: Feature): boolean {
  return TIER_RANK[tier] >= TIER_RANK[FEATURE_MIN_TIER[feature]];
}

export function minTierFor(feature: Feature): Tier {
  return FEATURE_MIN_TIER[feature];
}

// Paket limitleri. Sunucu tarafı da aynı sayıları kontrol eder (supabase/migrations/0002).
export const LIMITS = {
  freeScansPerDay: 3,
  freeLibrarySize: 10,
  freeHistoryDays: 7,
  formCheckDays: { plus: 14, max: 7 } as Partial<Record<Tier, number>>,
  photoMacrosPerMonth: { plus: 30, max: Infinity } as Partial<Record<Tier, number>>,
};

export const TIER_INFO: Record<Tier, { name: string; tagline: string; perks: string[] }> = {
  free: {
    name: 'Ücretsiz',
    tagline: 'Başlamak için her şey',
    perks: [
      'Otomatik makro hesaplama ve kişisel hedef',
      'Günde 3 barkod tarama',
      'Serbest antrenman kaydı (son 7 gün)',
      '10 hareketlik kas animasyonlu kütüphane',
      'Genel chat (yazmak için kullanıcı adı)',
      'Seri ve temel rozetler',
    ],
  },
  pro: {
    name: 'Pro',
    tagline: 'Programla ilerle',
    perks: [
      'Kişiye özel antrenman programı',
      'Haftalık yemek planı ve alışveriş listesi',
      'Sınırsız barkod tarama',
      'Tüm hareket kütüphanesi',
      'Tüm antrenman geçmişi, rekorlar ve grafikler',
      'Pro üyelere özel chat ve tüm rozetler',
    ],
  },
  plus: {
    name: 'Plus',
    tagline: 'Koç gözüyle gelişim',
    perks: [
      "Pro'daki her şey",
      '2 haftada bir form check (ön, yan, arka fotoğraf) ve koç yorumu',
      'Plus üyelere özel chat',
    ],
  },
  max: {
    name: 'Max',
    tagline: 'Birebir koçluk',
    perks: [
      "Plus'taki her şey",
      'Koçla birebir mesajlaşma',
      'Haftalık check-in (kilo, ölçü, fotoğraf) ve koç yorumu',
      'Haftada bir form check',
      'Koç onaylı yemek planı',
      'Max chat ve özel rozetler',
      "Chat'te sesli mesaj",
    ],
  },
};
