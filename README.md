# Kagainz

iOS, Android ve web için tek kod tabanlı fitness uygulaması (Expo / React Native + Supabase).

## Özellikler
- **Makro:** yazarak hesaplama, 150+ besin (Türk yemekleri dahil), Open Food Facts araması, barkod okutma (ücretsiz günde 3), kişisel hedef sihirbazı, öğün bölümleri, su takibi, favoriler, haftalık yemek planı ve alışveriş listesi (Pro).
- **Antrenman:** kas haritası ve hareket animasyonları, 36 hareketlik kütüphane, set/kg/tekrar kaydı (önceki değerler gri), dinlenme sayacı ve bildirimi, rekorlar (e1RM), kas grubu başına haftalık set, koçun atadığı program.
- **Topluluk:** Genel / Pro / Plus / Max odaları, fotoğraf, tepkiler, yanıt, antrenmanı kart olarak paylaşma, koç rozeti ve sabitleme, şikayet / engelle / sustur / sil, haftalık meydan okuma.
- **Koçluk:** form check videosu ve saniyeli yorumlar (Plus 14, Max 7 günde bir), Max için koçla birebir mesaj, koç paneli (form check, mesajlar, şikayetler, üye paketi, program atama).
- **İlerleme:** seri, rozet duvarı, kalori/protein/kilo grafikleri, kutlamalar, açık/koyu tema, akşam hatırlatması, push bildirimleri.
- **Hesap senkronu:** günlük, hedefler, antrenmanlar ve rozetler `user_data` tablosuyla her cihazda aynı.

## Kurulum
```bash
npm install
npx expo start
```

## Supabase
1. supabase.com'da proje aç.
2. `supabase/migrations/0001_init.sql` dosyasını SQL Editor'de çalıştır.
3. Giriş yöntemleri (Authentication):
   - **E-posta:** Email templates > "Magic Link" ve "Confirm signup" şablonlarına `{{ .Token }}` ekle; böylece e-postaya 6 haneli kod gider.
   - **Telefon:** Sign In / Providers > Phone'u aç, SMS sağlayıcısı (Twilio vb.) bağla. Chat'e yazmak için zorunlu.
   - **Google:** Google Cloud'da OAuth istemcisi oluştur, Sign In / Providers > Google'a Client ID ve Secret'ı gir.
   - URL Configuration > Redirect URLs: `kagainz://**`, `exp://**`, `http://localhost:8081/**`.
4. `supabase/migrations/0002_features.sql` dosyasını SQL Editor'de çalıştır (tekrar çalıştırılabilir).
5. Kendini koç yap: `update public.profiles set role = 'coach' where username = 'KULLANICI_ADIN';`
6. Fonksiyonlar (Supabase CLI ile):
   ```bash
   npx supabase login
   npx supabase link --project-ref PROJE_REF
   npx supabase functions deploy push
   ```
7. Bildirim webhook'u: Database > Webhooks > Create: tablo `notifications`, olay `Insert`, tür "Supabase Edge Functions", fonksiyon `push`.
8. Push bildirimleri için bir kez `npx eas init` (app.json'a proje kimliği ekler) ve geliştirme derlemesi (`npx eas build --profile development`). Expo Go'da uzak bildirim çalışmaz; yerel hatırlatmalar çalışır.
9. Üyelik seviyesi `profiles.tier` sütunundadır; istemci değiştiremez. Ödeme açılana kadar koç panelinden elle verilir.

## Sıradaki adımlar
- Abonelik ödemeleri (RevenueCat) ve tier güncelleyen webhook
- Ana ekran widget'ı (geliştirme derlemesi ve native kod gerektirir)
