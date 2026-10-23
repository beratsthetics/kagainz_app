// Yeni bildirim satırını (public.notifications) telefona push olarak yollar.
// Kurulum: supabase functions deploy push, sonra Database > Webhooks'ta notifications tablosunun
// INSERT olayı için bu fonksiyonu çağıran bir webhook oluştur (README'de adım adım).
import { createClient } from 'npm:@supabase/supabase-js@2';

type Payload = { type: string; table: string; record?: { id?: number } };
type ExpoTicket = { status: 'ok' | 'error'; details?: { error?: string } };

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  const payload = (await req.json().catch(() => null)) as Payload | null;
  const id = payload?.record?.id;
  if (payload?.table !== 'notifications' || typeof id !== 'number') return new Response('yok sayıldı', { status: 200 });

  // Satırı "gönderildi" diye işaretleyerek sahiplen; aynı bildirim iki kez gitmez ve
  // dışarıdan gelen içerik değil, veritabanındaki içerik gönderilir.
  const { data: note } = await admin
    .from('notifications')
    .update({ pushed_at: new Date().toISOString() })
    .eq('id', id)
    .is('pushed_at', null)
    .select('user_id, title, body, data')
    .maybeSingle();
  if (!note) return new Response('zaten gönderildi', { status: 200 });

  const { data: tokens } = await admin.from('push_tokens').select('token').eq('user_id', note.user_id);
  if (!tokens?.length) return new Response('token yok', { status: 200 });

  const messages = tokens.map((t) => ({
    to: t.token,
    title: note.title,
    body: note.body,
    data: note.data,
    sound: 'default',
    channelId: 'default',
  }));
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  const result = (await res.json().catch(() => ({}))) as { data?: ExpoTicket[] };

  // Uygulaması silinmiş telefonların tokenlarını temizle.
  const dead = (result.data ?? [])
    .map((ticket, i) => (ticket.details?.error === 'DeviceNotRegistered' ? tokens[i].token : null))
    .filter((t): t is string => t != null);
  if (dead.length) await admin.from('push_tokens').delete().in('token', dead);

  return new Response(JSON.stringify({ sent: messages.length, removed: dead.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
