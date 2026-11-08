/* ---------- 1.12: uploaden op Home en automatisch uploaden ---------- */
const AUTO_URL = SB_URL + '/functions/v1/dagexport';
function uploadStatus() {
  const last = M.dagLijst[M.dagLijst.length - 1]; const oud = last ? C.diff(last, C.today()) : 99;
  const d = [last ? `Verkoop t/m ${C.fmtDag(last)}` : 'Nog geen verkoop'];
  if (S.boeken.vers) d.push('Vers wk ' + (S.boeken.vers.week || '?'));
  if (S.boeken.kw && S.boeken.kw.datum) d.push('KW ' + C.fmtDag(S.boeken.kw.datum));
  return { tekst: d.join(' · '), mist: oud > 1 };
}
function homeUploadHtml() {
  if (!mag('upload')) return '';
  const s = uploadStatus(); const mis = ontbrekend(); if (mis.length) { s.mist = true; s.tekst = ontbrekendTekst(mis); }
  return `<div class="blk homeup"><label class="homeupKnop"><span class="meeric">📤</span><span style="flex:1"><b>Bestanden uploaden</b><br><span class="small ${s.mist ? 'rood' : ''}">${s.mist ? '⚠️ ' : ''}${esc(s.tekst)}</span></span><span class="btn sm">Kiezen</span><input type="file" id="upH" multiple accept=".xls,.xlsx,.pdf" class="hide"></label></div>`;
}
function homeUploadEvents(v) {
  const i = v.querySelector('#upH'); if (!i) return;
  i.onchange = e => {
    const files = [...e.target.files]; e.target.value = ''; if (!files.length) return;
    if (OEFEN) return toast('Uploaden kan niet tijdens oefenen');
    sheet(`<h2>Uploaden</h2><p class="small">${files.length} bestand${files.length === 1 ? '' : 'en'}. Laat de app open tot het klaar is.</p><div class="log" id="upLog"></div><button class="btn" data-x style="width:100%;margin-top:12px">Sluiten</button>`);
    uploads(files);
  };
}
let AUTO_DEMO = null;
const autoTijd = t => t ? new Date(t).toLocaleString('nl-NL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–';
async function autoLaad() {
  const el = $('#autoIn'); if (!el) return;
  let st, lg;
  try {
    if (DEMO) { st = AUTO_DEMO || { actief: false }; lg = (AUTO_DEMO && AUTO_DEMO.log) || []; }
    else { st = (await rpc('uploadsleutel_status', { w: W })) || {}; lg = ((await rest(`upload_log?winkel_id=eq.${W}&order=ts.desc&limit=10`)) || []).concat((await rest(`upload_log?winkel_id=eq.${W}&ok=eq.false&ts=gte.${new Date(Date.now() - 14 * 864e5).toISOString()}&order=ts.desc&limit=20`)) || []).filter((r, i, a) => a.findIndex(x => x.ts === r.ts && x.bestand === r.bestand) === i); }
  } catch (e) { el.innerHTML = `<p class="small rood">Kon de status niet laden: ${esc(e.message)}</p><p class="small">Is de SQL van versie 1.12 al uitgevoerd in Supabase?</p>`; return; }
  const oud = st.actief && st.laatst && (Date.now() - new Date(st.laatst)) > 36 * 3600e3;
  el.innerHTML = `<div class="kv"><span>Sleutel</span><b>${st.actief ? `✅ actief · …${esc(st.hint || '')}` : 'nog geen'}</b>${st.actief ? `<span>Gemaakt</span><b>${autoTijd(st.aangemaakt)}${st.door ? ' · ' + esc(st.door) : ''}</b><span>Laatst binnen</span><b class="${oud ? 'rood' : ''}">${st.laatst ? autoTijd(st.laatst) : 'nog niets'}</b>` : ''}</div>
  <div class="row" style="margin-top:12px;gap:8px">${st.actief ? `<button class="btn sec" id="auNieuw" style="flex:1">🔑 Nieuw script</button><button class="btn sec" id="auUit">Intrekken</button>` : `<button class="btn" id="auNieuw" style="width:100%">🔑 Sleutel en script maken</button>`}</div>
  <h3>Zo stel je het in</h3><ol class="small stappen"><li>Tik op <b>${st.actief ? 'Nieuw script' : 'Sleutel en script maken'}</b> en stuur het zip-bestand naar jezelf (bijv. per mail).</li><li>Pak het uit op de computer in de map <b>C:\\Besteladvies</b>.</li><li>Dubbelklik <b>1-testen.cmd</b>. Je ziet "Test gelukt".</li><li>Dubbelklik <b>2-installeren.cmd</b>. Het script kijkt nu elke 5 minuten in de map.</li><li>Klaar. Verstuurde bestanden gaan naar de map <b>Verzonden</b>.</li></ol>
  ${lg.some(r => !r.ok) ? `<h3>Niet gelukt</h3><div class="list">${lg.filter(r => !r.ok).map(r => `<div class="it"><span style="flex:1">❌ ${esc(r.bestand || 'bestand')}<br><span class="small">${autoTijd(r.ts)} · ${esc(r.melding || '')}</span></span></div>`).join('')}</div><p class="small">Deze bestanden staan op de pc in de map <b>Niet gelukt</b>. Klopt de bestandsnaam of datum niet, zet het goede bestand dan opnieuw in de map.</p>` : ''}
  <h3>Laatst ontvangen</h3><div class="list">${lg.filter(r => r.ok).map(r => `<div class="it"><span style="flex:1">${r.ok ? '✅' : '❌'} ${r.dag ? 'Verkoop ' + C.fmtDag(r.dag) : esc(r.bestand || 'bestand')}<br><span class="small">${autoTijd(r.ts)} · ${esc(r.melding || '')}</span></span></div>`).join('') || '<div class="small">Nog niets ontvangen</div>'}</div>`;
  $('#auNieuw').onclick = async () => {
    if (st.actief && !await bevestig('Nieuw script maken?', 'Er komt een nieuwe sleutel. Het oude script op de computer werkt dan niet meer; zet het nieuwe ervoor in de plaats.', 'Nieuw script', 'Annuleren')) return;
    autoMaak();
  };
  const u = $('#auUit'); if (u) u.onclick = async () => {
    if (!await bevestig('Sleutel intrekken?', 'De computer kan daarna niets meer uploaden tot je een nieuw script maakt.', 'Intrekken', 'Annuleren')) return;
    try { if (DEMO) AUTO_DEMO = Object.assign({}, AUTO_DEMO, { actief: false }); else await rpc('trek_uploadsleutel_in', { w: W }); log('upload', 'Uploadsleutel ingetrokken'); toast('Sleutel ingetrokken'); } catch (e) { toast('Mislukt: ' + e.message, 5000); }
    autoLaad();
  };
}
function autoMaak() {
  const ov = sheet(`<h2>Script maken</h2><p class="small">In welke map zet de computer straks de dag-exports? Weet je het nog niet, laat dit dan staan. Je kunt het later aanpassen (zie LEESMIJ).</p><div class="form"><div class="f"><label>Map</label><input id="auMap" value="${esc(ls.get('cba-automap') || 'C:\\CasPos\\Export')}" autocapitalize="off" spellcheck="false"></div></div><button class="btn" id="auMaak" style="width:100%;margin-top:10px">Maken</button><button class="btn sec" data-x style="width:100%;margin-top:8px">Annuleren</button>`);
  ov.querySelector('#auMaak').onclick = async e => {
    const map = (ov.querySelector('#auMap').value || '').trim().replace(/[\\/]+$/, '') || 'C:\\CasPos\\Export';
    if (!/^([a-z]:\\|\\\\)/i.test(map)) return toast('Vul een map in zoals C:\\CasPos\\Export');
    e.target.disabled = true; let sleutel;
    try {
      if (DEMO) { sleutel = W + '.' + [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join(''); AUTO_DEMO = { actief: true, hint: sleutel.slice(-4), aangemaakt: new Date().toISOString(), door: mijnNaam(), laatst: null, log: (AUTO_DEMO && AUTO_DEMO.log) || [] }; }
      else sleutel = await rpc('nieuwe_uploadsleutel', { w: W, wie: mijnNaam() });
    } catch (x) { e.target.disabled = false; return toast('Mislukt: ' + x.message + ' (SQL 1.12 uitgevoerd?)', 6000); }
    ls.set('cba-automap', map); log('upload', 'Nieuwe uploadsleutel gemaakt');
    const best = autoBestanden(sleutel, map); const zip = maakZip(best); const file = new File([zip], 'besteladvies-upload.zip', { type: 'application/zip' });
    window.__autoZip = { naam: file.name, bestanden: best.map(b => b[0]), grootte: zip.size };
    ov.querySelector('.sheetIn').innerHTML = `<h2>✅ Script klaar</h2><p class="small">Stuur het zip-bestand naar de computer in de winkel, bijvoorbeeld per mail. De sleutel zit erin; je ziet hem maar één keer. Kwijt? Maak dan een nieuw script.</p><div class="kv"><span>Map</span><b>${esc(map)}</b><span>Sleutel</span><b>…${esc(sleutel.slice(-4))}</b></div><button class="btn" id="auDeel" style="width:100%;margin-top:12px">📦 Zip-bestand delen</button><button class="btn sec" data-x style="width:100%;margin-top:8px">Sluiten</button>`;
    ov.querySelector('#auDeel').onclick = async () => {
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Besteladvies upload' }); else { const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); } }
      catch (x) { if (x && x.name !== 'AbortError') toast('Delen mislukt: ' + x.message, 5000); }
    };
    autoLaad();
  };
}
function autoBestanden(sleutel, map, url = AUTO_URL) {
  const crlf = s => s.replace(/\r?\n/g, '\r\n'); const enc = new TextEncoder(); const bom = s => { const b = enc.encode(crlf(s)); const o = new Uint8Array(b.length + 3); o.set([0xEF, 0xBB, 0xBF]); o.set(b, 3); return o; };
  const q = s => String(s).replace(/'/g, "''"); const winkel = ((WINKEL && WINKEL.naam) || 'Coop').replace(/[^\w .-]/g, '');
  const ps = `# Coop Besteladvies - dag-exports automatisch uploaden
# Gemaakt in de app op ${C.today()} voor ${winkel} (versie ${VERSIE}).
# Gebruik: zonder opties = nieuwe bestanden uploaden, -Test = alleen de verbinding testen.
param([switch]$Test, [switch]$Nu, [string]$Map = '')

# ===== Instellingen =====
# Map waar de dag-exports uit CasPos komen. Pas alleen deze regel aan als het een andere map is.
$StandaardMap = '${q(map)}'
$Sleutel = '${q(sleutel)}'
$Url = '${q(url)}'
# ========================

if (-not $Map) { $Map = $StandaardMap }
$Hier = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogBestand = Join-Path $Hier 'besteladvies-upload.log'

function Schrijf([string]$Tekst) {
  $regel = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '  ' + $Tekst
  try { Add-Content -Path $LogBestand -Value $regel -Encoding UTF8 } catch { }
  Write-Host $regel
}
function Foutinfo($Err) {
  $code = 0; $tekst = $Err.Exception.Message
  try { if ($Err.Exception.Response) { $code = [int]$Err.Exception.Response.StatusCode } } catch { }
  try { if ($Err.ErrorDetails -and $Err.ErrorDetails.Message) { $j = $Err.ErrorDetails.Message | ConvertFrom-Json; if ($j.fout) { $tekst = $j.fout } } } catch { }
  return New-Object PSObject -Property @{ Code = $code; Tekst = $tekst }
}
function Zoek {
  Get-ChildItem -LiteralPath $Map -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'van_\\d{8}_tm_\\d{8}' -and $_.Extension -match '^\\.xlsx?$' } | Sort-Object Name
}
function Verplaats($Bestand, [string]$Doel) {
  if (-not (Test-Path -LiteralPath $Doel)) { New-Item -ItemType Directory -Path $Doel | Out-Null }
  $naar = Join-Path $Doel $Bestand.Name
  if (Test-Path -LiteralPath $naar) { Remove-Item -LiteralPath $naar -Force }
  Move-Item -LiteralPath $Bestand.FullName -Destination $naar
}

try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch { }
try { if ((Test-Path -LiteralPath $LogBestand) -and ((Get-Item -LiteralPath $LogBestand).Length -gt 1MB)) { Move-Item -LiteralPath $LogBestand -Destination ($LogBestand + '.oud') -Force } } catch { }

if ($Test) {
  Schrijf 'Test: verbinding met de app controleren...'
  try {
    $r = Invoke-RestMethod -Uri ($Url + '?test=1') -Method Get -Headers @{ 'x-sleutel' = $Sleutel } -TimeoutSec 60
    Schrijf ('Test gelukt: ' + $r.tekst)
  } catch { $f = Foutinfo $_; Schrijf ('Test mislukt: ' + $f.Tekst); exit 1 }
  if (Test-Path -LiteralPath $Map) { Schrijf ('Map gevonden: ' + $Map + ' (' + @(Zoek).Count + ' dag-export(s) klaar om te versturen)') }
  else { Schrijf ('Let op: de map ' + $Map + ' bestaat nog niet. Dat is goed zolang de export nog niet is ingesteld.') }
  exit 0
}

if (-not (Test-Path -LiteralPath $Map)) { if ($Nu) { Schrijf ('De map ' + $Map + ' bestaat niet.') }; exit 0 }
$Lijst = @(Zoek); if ($Nu) { Schrijf ('Nu versturen: ' + $Lijst.Count + ' dag-export(s) in ' + $Map) }
$Verzonden = Join-Path $Map 'Verzonden'
$NietGelukt = Join-Path $Map 'Niet gelukt'
foreach ($f in $Lijst) {
  if (-not $Nu -and $f.LastWriteTime -gt (Get-Date).AddMinutes(-2)) { continue }
  try {
    $h = @{ 'x-sleutel' = $Sleutel; 'x-bestand' = [Uri]::EscapeDataString($f.Name) }
    $r = Invoke-RestMethod -Uri $Url -Method Post -Headers $h -InFile $f.FullName -ContentType 'application/octet-stream' -TimeoutSec 300
    if ($r.ok) { Verplaats $f $Verzonden; Schrijf ('Verzonden: ' + $f.Name + ' (' + $r.artikelen + ' artikelen)') }
    else { Schrijf ('Onbekend antwoord voor ' + $f.Name + ', later opnieuw') }
  } catch {
    $e = Foutinfo $_
    if ($e.Code -eq 401) { Schrijf ('Sleutel klopt niet of is ingetrokken. Maak in de app een nieuw script. (' + $e.Tekst + ')'); exit 2 }
    elseif ($e.Code -ge 400 -and $e.Code -lt 500) { Verplaats $f $NietGelukt; Schrijf ('Niet gelukt: ' + $f.Name + ' - ' + $e.Tekst + ' (verplaatst naar de map Niet gelukt)') }
    else { Schrijf ('Later opnieuw: ' + $f.Name + ' - ' + $e.Tekst) }
  }
}
exit 0
`;
  const nu = `@echo off
title Besteladvies - nu versturen
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0besteladvies-upload.ps1" -Nu
echo.
pause
`;
  const test = `@echo off
title Besteladvies - testen
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0besteladvies-upload.ps1" -Test
echo.
pause
`;
  const stil = `Set sh = CreateObject("WScript.Shell")
d = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & d & "\\besteladvies-upload.ps1""", 0, True
`;
  const inst = `@echo off
title Besteladvies - installeren
schtasks /Create /TN "Besteladvies upload" /SC MINUTE /MO 5 /TR "wscript.exe //B //Nologo \\"%~dp0stil.vbs\\"" /F
if errorlevel 1 goto fout
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0besteladvies-upload.ps1"
echo.
echo Klaar. De computer kijkt nu elke 5 minuten of er een nieuwe dag-export is.
echo.
pause
exit /b 0
:fout
echo.
echo Installeren is NIET gelukt. Probeer het opnieuw met rechtsklik - Als administrator uitvoeren.
pause
exit /b 1
`;
  const weg = `@echo off
title Besteladvies - stoppen
schtasks /Delete /TN "Besteladvies upload" /F
echo.
echo Het automatisch uploaden is gestopt.
pause
`;
  const lees = `COOP BESTELADVIES - AUTOMATISCH UPLOADEN
${winkel} - gemaakt op ${C.today()}

Wat doet dit?
Elk uur kijkt de computer in de map:
   ${map}
Staat daar een nieuwe dag-export uit CasPos (bijv. ..._van_20261103_tm_20261103.xls),
dan gaat die vanzelf naar de app. Daarna verhuist het bestand naar de map "Verzonden".
Je krijgt in de app een melding "Dag-export binnen" (zet die aan onder Meer > Meldingen).

Instellen (eenmalig, ongeveer 5 minuten)
1. Maak op de computer de map C:\\Besteladvies
2. Rechtsklik op het zip-bestand > Eigenschappen > vink "Blokkering opheffen" aan > OK.
   Pak het daarna uit in C:\\Besteladvies.
3. Dubbelklik 1-testen.cmd. Je moet zien: "Test gelukt: Koppeling met ... werkt."
   Krijg je een blauw venster "Windows heeft uw pc beschermd"? Kies "Meer informatie" > "Toch uitvoeren".
4. Dubbelklik 2-installeren.cmd. Vanaf nu draait het elke 5 minuten.
5. Controleer in de app onder Beheer > Automatisch uploaden of de uploads binnenkomen.

Meteen versturen? Dubbelklik 4-nu-versturen.cmd.

Goed om te weten
- De computer moet aan staan en er moet iemand ingelogd zijn.
- Bestaat de map nog niet? Geen probleem: het script doet dan niets tot de map er is.
- Andere map? Open besteladvies-upload.ps1 met Kladblok en pas de regel $StandaardMap aan.
- Een bestand dat niet goed is (geen dag-export, verkeerde datum) gaat naar de map "Niet gelukt".
- Wat er gebeurd is staat in besteladvies-upload.log (in deze map).
- Stoppen: dubbelklik 3-stoppen.cmd, of trek de sleutel in de app in.
- Dit zip-bestand bevat een geheime sleutel. Stuur het niet door naar anderen.
`;
  return [['besteladvies-upload.ps1', bom(ps)], ['1-testen.cmd', enc.encode(crlf(test))], ['2-installeren.cmd', enc.encode(crlf(inst))], ['3-stoppen.cmd', enc.encode(crlf(weg))], ['4-nu-versturen.cmd', enc.encode(crlf(nu))], ['stil.vbs', enc.encode(crlf(stil))], ['LEESMIJ.txt', bom(lees)]];
}
function maakZip(files) {
  const T = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  const crc = d => { let c = 0xFFFFFFFF; for (let i = 0; i < d.length; i++) c = T[(c ^ d[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const enc = new TextEncoder(); const nu = new Date(); const tm = (nu.getHours() << 11) | (nu.getMinutes() << 5) | (nu.getSeconds() >> 1); const dt = ((nu.getFullYear() - 1980) << 9) | ((nu.getMonth() + 1) << 5) | nu.getDate();
  const delen = [], cd = []; let off = 0;
  for (const [naam, data] of files) {
    const nb = enc.encode(naam), c = crc(data);
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true); h.setUint32(14, c, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true);
    delen.push(new Uint8Array(h.buffer), nb, data);
    const z = new DataView(new ArrayBuffer(46)); z.setUint32(0, 0x02014b50, true); z.setUint16(4, 20, true); z.setUint16(6, 20, true); z.setUint16(8, 0x0800, true); z.setUint16(12, tm, true); z.setUint16(14, dt, true); z.setUint32(16, c, true); z.setUint32(20, data.length, true); z.setUint32(24, data.length, true); z.setUint16(28, nb.length, true); z.setUint32(42, off, true);
    cd.push(new Uint8Array(z.buffer), nb);
    off += 30 + nb.length + data.length;
  }
  const cdLen = cd.reduce((s, x) => s + x.length, 0);
  const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdLen, true); e.setUint32(16, off, true);
  return new Blob([...delen, ...cd, new Uint8Array(e.buffer)], { type: 'application/zip' });
}
