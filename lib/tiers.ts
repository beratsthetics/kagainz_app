export type Tier = 'free' | 'pro' | 'plus' | 'max';

export const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, plus: 2, max: 3 };

export type Feature =
  | 'macros'
  | 'general_chat'
  | 'training_programs'
  | 'meal_plans'
  | 'pro_chat'
  | 'plus_chat'
  | 'form_check';

// Her özelliğin açıldığı en düşük üyelik. Max henüz tanımlanmadı, şimdilik Plus'ın her şeyini içerir.
const FEATURE_MIN_TIER: Record<Feature, Tier> = {
  macros: 'free',
  general_chat: 'free',
  training_programs: 'pro',
  meal_plans: 'pro',
  pro_chat: 'pro',
  plus_chat: 'plus',
  form_check: 'plus',
};

export function hasFeature(tier: Tier, feature: Feature): boolean {
  return TIER_RANK[tier] >= TIER_RANK[FEATURE_MIN_TIER[feature]];
}

export function minTierFor(feature: Feature): Tier {
  return FEATURE_MIN_TIER[feature];
}

export const TIER_INFO: Record<Tier, { name: string; perks: string[] }> = {
  free: {
    name: 'Ücretsiz',
    perks: ['Otomatik makro hesaplama', 'Genel chat (yazmak için numara doğrulama + kullanıcı adı)'],
  },
  pro: {
    name: 'Pro',
    perks: ['Makro hesaplama', 'Antrenman programları', 'Yemek programı oluşturma', 'Pro üyelere özel chat'],
  },
  plus: {
    name: 'Plus',
    perks: ["Pro'daki her şey", 'Plus üyelere özel chat', '2 haftada bir form check ve yorum'],
  },
  max: {
    name: 'Max',
    perks: ['Yakında'],
  },
};
