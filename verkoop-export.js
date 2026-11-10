// Coop Besteladvies – kassaverkoop per PLU voor Brood Opzet (Supabase Edge Function "verkoop-export"). Alleen lezen.
// Supabase heeft alleen een korte stub die dit bestand van GitHub haalt. Bijwerken = uploaden + Deploy.
export function start(createClient, SLEUTEL) {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-sleutel", "Access-Control-Allow-Methods": "GET, OPTIONS" };
  const js = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
  const kaal = (s) => String(s ?? "").trim().replace(/^0+(?=\d)/, "");
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (!SLEUTEL || req.headers.get("x-sleutel") !== SLEUTEL) return js({ ok: false, fout: "Verkeerde koppelcode" }, 401);
    try {
      const u = new URL(req.url), plus = new Set((u.searchParams.get("plu") || "").split(",").map(kaal).filter(Boolean));
      if (!plus.size) return js({ ok: false, fout: "Geen PLU opgegeven" }, 400);
      const van = new Date(Date.now() - 63 * 864e5).toISOString().slice(0, 10);
      const sb = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
      const k = await sb.from("dagverkoop").select("winkel_id").gte("dag", van).limit(5000);
      if (k.error) throw k.error;
      const n = {}; for (const x of k.data) n[x.winkel_id] = (n[x.winkel_id] || 0) + 1;
      const w = u.searchParams.get("winkel") || Object.keys(n).sort((a, b) => n[b] - n[a])[0], dagen = {};
      const r = w ? await sb.from("dagverkoop").select("dag,data").eq("winkel_id", w).gte("dag", van) : { data: [] };
      if (r.error) throw r.error;
      for (const x of r.data) { const d = {}; for (const [e, v] of Object.entries(x.data || {})) if (plus.has(kaal(e))) d[kaal(e)] = (d[kaal(e)] || 0) + (+(v?.[0]) || 0); dagen[x.dag] = d; }
      return js({ ok: true, winkel: w || null, dagen });
    } catch (e) { return js({ ok: false, fout: String(e?.message || e) }, 500); }
  });
}
