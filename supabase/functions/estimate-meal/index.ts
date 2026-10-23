// Fotoğraftan makro tahmini (Plus: ayda 30, Max: sınırsız).
// Kurulum: supabase secrets set ANTHROPIC_API_KEY=... && supabase functions deploy estimate-meal
import Anthropic from 'npm:@anthropic-ai/sdk';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk/helpers/zod';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod';

const MONTHLY_LIMIT: Record<string, number> = { plus: 30, max: Number.POSITIVE_INFINITY };

const Meal = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      grams: z.number(),
      kcal: z.number(),
      protein: z.number(),
      carb: z.number(),
      fat: z.number(),
    }),
  ),
  note: z.string(),
});

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

const anthropic = new Anthropic();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return json({ error: 'Giriş yapmalısın.' }, 401);

  const { data: profile } = await supabase.from('profiles').select('tier').eq('id', auth.user.id).single();
  const limit = MONTHLY_LIMIT[profile?.tier ?? 'free'] ?? 0;
  if (!limit) return json({ error: 'Fotoğraftan makro Plus ve Max paketlerinde.' }, 403);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .eq('kind', 'photo_macros')
    .gte('created_at', monthStart.toISOString());
  if ((count ?? 0) >= limit) return json({ error: `Bu ayki ${limit} tahmin hakkın doldu.` }, 429);

  const { image, mediaType = 'image/jpeg' } = (await req.json()) as { image?: string; mediaType?: string };
  if (!image || image.length > 7_000_000) return json({ error: 'Fotoğraf okunamadı.' }, 400);

  try {
    const response = await anthropic.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'low', format: zodOutputFormat(Meal) },
      system:
        'Sen bir beslenme uzmanısın. Fotoğraftaki tabakta görünen her yiyeceği ayrı ayrı listele, ' +
        'porsiyon gramını tabak, çatal ve kap boyutlarına göre tahmin et, kalori ve makroları bu grama göre hesapla. ' +
        'Türk mutfağını tanı (ör. mercimek çorbası, pilav, cacık). Yiyecek adları Türkçe olsun. ' +
        'Emin olmadığın şeyi note alanında kısaca söyle. Yemek yoksa items boş olsun.',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: image } },
            { type: 'text', text: 'Bu öğünün makrolarını tahmin et.' },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      return json({ error: 'Bu fotoğraftan tahmin yapılamadı, başka bir açıdan dene.' }, 422);
    }
    await supabase.from('ai_usage').insert({ user_id: auth.user.id, kind: 'photo_macros' });
    return json({ ...response.parsed_output, remaining: Number.isFinite(limit) ? limit - (count ?? 0) - 1 : null });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'Yoğunluk var, biraz sonra tekrar dene.' }, 429);
    if (error instanceof Anthropic.APIError) return json({ error: 'Tahmin servisi şu an yanıt vermiyor.' }, 502);
    throw error;
  }
});
