// Coop Besteladvies – Face ID op de server controleren (Supabase Edge Function "face"), 2.29.
// Het toestel bewaart geen geheim meer: de server geeft een eenmalige uitdaging, Face ID ondertekent die met een sleutel
// die het toestel nooit verlaat, en de server controleert de handtekening met de publieke sleutel. Pas dan komt er een sessie.
export const FUNCTIE_VERSIE = '1.0';
const enc = new TextEncoder();
export const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const unb64u = t => { t = String(t || '').replace(/-/g, '+').replace(/_/g, '/'); t += '='.repeat((4 - t.length % 4) % 4); return Uint8Array.from(atob(t), c => c.charCodeAt(0)); };
export function derNaarRaw(d) { let i = 2; if (d[1] & 0x80) i += d[1] & 0x7f; const deel = () => { i++; const n = d[i++]; let v = d.slice(i, i + n); i += n; while (v.length > 32 && v[0] === 0) v = v.slice(1); const o = new Uint8Array(32); o.set(v, 32 - v.length); return o; }; const r = deel(), s = deel(), x = new Uint8Array(64); x.set(r); x.set(s, 32); return x; }
const ALG = { '-7': [{ name: 'ECDSA', namedCurve: 'P-256' }, { name: 'ECDSA', hash: 'SHA-256' }], '-257': [{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, { name: 'RSASSA-PKCS1-v1_5' }] };
export const sleutel = (pub, alg) => crypto.subtle.importKey('spki', unb64u(pub), ALG[alg][0], false, ['verify']);
// Controle van een WebAuthn-ondertekening; geeft de nieuwe teller terug of null
export async function controleer({ pub, alg, teller, uitdaging, cd, ad, sig, rp, origins }) {
  if (!ALG[alg]) return null; const c = JSON.parse(new TextDecoder().decode(unb64u(cd))), a = unb64u(ad);
  if (c.type !== 'webauthn.get' || c.challenge !== uitdaging || !origins.includes(c.origin) || a.length < 37) return null;
  const rh = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(rp))); if (rh.some((x, i) => x !== a[i])) return null;
  if ((a[32] & 0x05) !== 0x05) return null; // aanwezig én met Face ID/toegangscode bevestigd
  const n = ((a[33] << 24) | (a[34] << 16) | (a[35] << 8) | a[36]) >>> 0; if ((n || teller) && n <= teller) return null; // gekopieerde sleutel
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', unb64u(cd))), data = new Uint8Array(a.length + 32); data.set(a); data.set(h, a.length);
  let s = unb64u(sig); if (+alg === -7) s = derNaarRaw(s);
  return (await crypto.subtle.verify(ALG[alg][1], await sleutel(pub, alg), s, data)) ? n : null;
}
export function start(createClient, SB_URL, GEHEIM, RP = 'carloradici.github.io', ORIGINS = ['https://carloradici.github.io']) {
  const cors = { 'Access-Control-Allow-Origin': ORIGINS[0], 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  const js = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  Deno.serve(async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    try {
      const b = await req.json().catch(() => ({})), auth = req.headers.get('authorization') || '', w = String(b.w || ''), mid = String(b.mid || ''), id = /^[0-9a-f-]{36}$/i;
      if (!id.test(w) || !id.test(mid) || !auth.startsWith('Bearer ')) return js({ ok: false }, 401);
      const sb = createClient(SB_URL, GEHEIM, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: u } = await sb.auth.getUser(auth.slice(7)); const uid = u && u.user && u.user.id; if (!uid) return js({ ok: false }, 401);
      const sleutels = () => sb.from('face_sleutels').select('*').eq('winkel_id', w).eq('medewerker_id', mid).eq('uid', uid);
      if (b.soort === 'aan') {
        const { data: se } = await sb.from('sessies').select('tot').eq('uid', uid).eq('winkel_id', w).eq('medewerker_id', mid); const { data: m } = await sb.from('medewerkers').select('rol,actief').eq('id', mid).eq('winkel_id', w);
        if (!(se || []).some(x => new Date(x.tot) > new Date()) || !m || !m[0] || m[0].rol !== 'beheerder' || m[0].actief === false) return js({ ok: false }, 403);
        if (!ALG[b.alg] || !/^[\w-]{16,400}$/.test(String(b.cred || ''))) return js({ ok: false }, 400); try { await sleutel(b.pub, b.alg); } catch (e) { return js({ ok: false }, 400); }
        const { error } = await sb.from('face_sleutels').upsert({ winkel_id: w, medewerker_id: mid, uid, cred: b.cred, pub: b.pub, alg: +b.alg, teller: 0 }); return js({ ok: !error });
      }
      if (b.soort === 'uit') { await sb.from('face_sleutels').delete().eq('winkel_id', w).eq('medewerker_id', mid).eq('uid', uid); return js({ ok: true }); }
      if (b.soort === 'uitdaging') {
        const { data: k } = await sleutels(); if (!k || !k.length || k[0].cred !== b.cred) return js({ ok: false, weg: true });
        const { count } = await sb.from('face_uitdaging').select('uid', { count: 'exact', head: true }).eq('uid', uid).gt('tot', new Date(Date.now() + 60000).toISOString()); if ((count || 0) >= 5) return js({ ok: false }, 429);
        const c = b64u(crypto.getRandomValues(new Uint8Array(32))); await sb.from('face_uitdaging').insert({ uid, winkel_id: w, medewerker_id: mid, c, tot: new Date(Date.now() + 120000).toISOString() }); return js({ ok: true, c });
      }
      if (b.soort === 'login') {
        let c = ''; try { c = JSON.parse(new TextDecoder().decode(unb64u(b.cd))).challenge; } catch (e) { return js({ ok: false }, 400); }
        const { data: u2 } = await sb.from('face_uitdaging').delete().eq('uid', uid).eq('winkel_id', w).eq('medewerker_id', mid).eq('c', c).gt('tot', new Date().toISOString()).select(); if (!u2 || !u2.length) return js({ ok: false }, 401); // eenmalig
        const { data: k } = await sleutels(); const s = k && k[0]; if (!s || s.cred !== b.cred) return js({ ok: false, weg: true });
        const n = await controleer({ pub: s.pub, alg: s.alg, teller: +s.teller || 0, uitdaging: c, cd: b.cd, ad: b.ad, sig: b.sig, rp: RP, origins: ORIGINS }); if (n === null) return js({ ok: false }, 401);
        await sb.from('face_sleutels').update({ teller: n }).eq('winkel_id', w).eq('medewerker_id', mid).eq('uid', uid);
        const { data: ok } = await sb.rpc('face_sessie', { u: uid, w, mid }); return js({ ok: ok === true });
      }
      return js({ ok: false }, 400);
    } catch (e) { console.error(e); return js({ ok: false, fout: 'Er ging iets mis' }, 500); }
  });
}
