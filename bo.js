// Coop Besteladvies – Brood Opzet ophalen via de server (Supabase Edge Function "bo"), 2.25.
// Adres en koppelcode van brood-export staan als geheim in Supabase (BO_URL, BO_SLEUTEL), niet meer in de gedeelde instellingen.
// Alleen een ingelogde medewerker (pincode-sessie, is_lid) van de winkel krijgt antwoord. De retoursleutel komt alleen van het beheerderstoestel mee.
export function start(createClient, URL_, SLEUTEL, SB_URL, ANON) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-retour-sleutel', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
  const js = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (!URL_ || !SLEUTEL) return js({ ok: false, fout: 'Koppeling met Brood Opzet is nog niet ingesteld (geheimen BO_URL en BO_SLEUTEL in Supabase).' }, 503);
    const w = new URL(req.url).searchParams.get('w') || '', auth = req.headers.get('authorization') || '';
    if (!/^[0-9a-f-]{36}$/i.test(w) || !/^Bearer .+/.test(auth)) return js({ ok: false, fout: 'Niet ingelogd' }, 401);
    try {
      const sb = createClient(SB_URL, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
      const { data: lid, error } = await sb.rpc('is_lid', { w });
      if (error || lid !== true) return js({ ok: false, fout: 'Niet ingelogd' }, 401);
      const h = { 'x-sleutel': SLEUTEL }, rs = req.headers.get('x-retour-sleutel'); if (rs) h['x-retour-sleutel'] = rs;
      const r = await fetch(URL_, { headers: h, redirect: 'error' });
      return new Response(await r.text(), { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
    } catch (e) { return js({ ok: false, fout: 'Brood Opzet is nu niet bereikbaar' }, 502); }
  });
}
