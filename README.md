# Kagainz

iOS, Android ve web için tek kod tabanlı fitness uygulaması (Expo / React Native + Supabase).

## Özellikler (şu an)
- **Makro hesaplama** (ücretsiz): "2 yumurta, 150g tavuk göğsü" yaz, protein/karb/yağ/kcal otomatik çıksın (`lib/macros.ts`, `lib/foods.ts`).
- **Chat odaları**: Genel (herkes okur, yazmak için SMS doğrulama + kullanıcı adı), Pro Kulüp, Plus Kulüp. Öğün paylaşımlarına makrolar otomatik eklenir.
- **SMS ile giriş** (Supabase Phone Auth) ve kullanıcı adı seçimi.
- **Üyelik seviyeleri** Free / Pro / Plus / Max (`lib/tiers.ts`). Yetkiler veritabanında RLS ile de uygulanır.
- **Antrenman** sekmesi (Pro ve üstü), örnek program.

## Kurulum
```bash
npm install
cp .env.example .env.local   # Supabase URL ve anon key'i gir
npx expo start
```

## Supabase
1. supabase.com'da proje aç.
2. `supabase/migrations/0001_init.sql` dosyasını SQL Editor'de çalıştır.
3. Authentication > Providers > Phone'u aç, SMS sağlayıcısı (Twilio, MessageBird, Vonage veya Textlocal) bağla.
4. Üyelik seviyesi `profiles.tier` sütunundadır; sadece sunucu (ödeme webhook'u) değiştirir.

## Sıradaki adımlar
- Abonelik ödemeleri (RevenueCat) ve tier güncelleyen webhook
- Kas grubu animasyonlu egzersiz kütüphanesi
- Yemek programı oluşturucu (Pro)
- Plus için 2 haftada bir form check (video yükleme + koç yorumu)
- Max paketinin içeriği
