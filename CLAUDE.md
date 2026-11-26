# Coop Besteladvies – afspraken voor Claude

Web-app (PWA) van Coop Vogelenzang die per artikel een bestel-advies geeft (vers, KW, AGF, acties). Draait via GitHub Pages, offline met Supabase-sync. Eigenaar: Carlo (werkt alleen vanaf zijn iPhone, spreekt Nederlands).

## Werkwijze
- Pas pas iets aan als Carlo letterlijk "bouwen" zegt. Daarvóór: kort voorstel (wat, waar in de app, hoe het werkt). Is iets onduidelijk, stel één korte vraag.
- **Lees alleen de bestanden die je nodig hebt.** Zoek een functie met `grep -n "function naam\|const naam" app-*.js rekenkern.js` en lees dan alleen dat stuk.
- Pas gericht aan (Edit), herschrijf geen hele bestanden. Houd code compact.
- Nieuw scherm = meteen een eigen hulptekst (HULP).
- Stuur tijdens langer werk korte voortgangsberichten met percentage ("⏳ 40% · nu testen"). Is de tool `mcp__voortgang-balk__voortgang` er, roep die ook aan (de balk zelf toont de iPhone-app nog niet).

## Opbouw
- `index.html`: alleen HTML-geraamte + laadscript met `LADEN`.
- `rekenkern.js`: rekenkern en inleesfuncties (`window.C`), los script.
- `qrcode.min.js`: QR-bibliotheek (MIT, Kazuhiko Arase), los script vóór rekenkern; gebruikt door "Naar de terminal".
- `lib/`: pdf.js, xlsx, html2canvas, jspdf lokaal (LIB in app-basis). Scripts van jsdelivr alleen met SRI (`SRI` in app-basis). CSP staat als meta in index.html: nieuw extern adres = daar toevoegen. LADEN staat op regel 23.
- De `app-*.js`-bestanden zijn stukken van één script: het laadscript zet ze in volgorde van `LADEN` binnen `(function(){'use strict'; … })();` en voert ze als één geheel uit. Functies mogen naar elkaar verwijzen over bestanden heen. Zet géén eigen `'use strict'` of wrapper in die bestanden. Nieuw bestand? Zet het in `LADEN` (index.html) én in `APP` (sw.js).
- `style.css`: alle opmaak. Coop-oranje #f17d04, grote knoppen, simpele Nederlandse teksten.

| Bestand | Inhoud |
|---|---|
| rekenkern.js | datums, getallen, bestelboeken Versunie/Van Tol, actie-pdf, CasPos-export, feestdagen, model |
| app-basis.js | VERSIE, opslag (IndexedDB), Supabase, toestand |
| app-sync.js | laden en synchroniseren |
| app-login.js | koppelen, winkels, medewerkers, inloggen met naam + pincode, demo |
| app-home.js | weergave, Home, assortiment, Meer, instellingen, oefenmodus, export, weer, notities, hulp, updates, push |
| app-deadlines.js | deadlines per groep, overig |
| app-beheer.js | beheer, uploads, telvragen, deadline-regels |
| app-uploaden.js | uploaden op Home, automatisch uploaden |
| app-pdf-print.js | pdf maken/bekijken, gebruiksgemak, printen |
| app-extra.js | bel, uitleg, eigen artikelen, barcode scannen, tellen |
| app-advies.js | beter advies |
| app-acties.js | KW-acties (folderplanning) |
| app-plekken.js | plekken tekenen |
| app-voorkoop.js | voorkooplijst, actieplanning vers, terugblik, back-up, vers-bestellijst, link plakken, bluetooth-scanner |
| app-overig.js | hoe goed was het advies, per leverancier, zoeken, derving, prijswijzigingen, leverdag-check, actietafels |
| app-brood.js | koppeling met Brood Opzet: ophalen (boHaal), advies per weekdag (M.bo), voorraad, waarschuwing "komt niet uit", koppelscherm |
| app-route.js | looproute: paden per onderdeel (ROUTE_STD), pad per artikel, leren bij bestellen (routeTik), route-scherm; opgeslagen in voorkeuren wie='route' |
| app-kantoor.js | werkvloer/kantoor (kantoorMag, KANTOOR_G incl. 'geav' = Geavanceerd, alleen beheerder), Start hier, Rapporten, testpakket, teller 'Wat wordt gebruikt' |
| app-retour.js | retourbonnen Van Tol: scans (pdf iPhone-scanner) + gedrukte tekst lezen (Tesseract), invullen, saldo, Excel import/export, nakijken (vt) + claimrapport-pdf (cl = geclaimd), karren tellen (tab 'karren', RB.tel); opgeslagen in voorkeuren wie='retour', scans lokaal (iget 'rbscan:'+nr) én in privé bucket 'retour' (map per winkel; lezen/wijzigen/verwijderen alleen mag(w,'retour_beheer') = beheerder, uploaden is_lid); voorkeuren wie='retour' in de database alleen beheerder (2.23); karrentellingen apart in wie='karren' (voor iedereen); bedragen alleen voor beheerder (rbGeld) |
| app-start.js | opstarten |

Edge Functions: `stuur-push.js` (cron alleen met CRON_SLEUTEL), `dagexport.js`, `folder.js`, `verkoop-export.js` (kassaverkoop per PLU voor Brood Opzet, winkel uit VERKOOP_WINKEL), `bo.js` (proxy naar Brood Opzet, geheimen BO_URL/BO_SLEUTEL, alleen is_lid). Code blijft in deze bestanden; `supabase/functions/<naam>/index.ts` is de ingang. **Automatisch live** via `.github/workflows/functies.yml` (Supabase CLI, geheim SUPABASE_ACCESS_TOKEN in GitHub) zodra zo'n bestand verandert: geen Deploy-knop meer. Koppelcode verkoop-export = geheim VERKOOP_SLEUTEL in Supabase (nooit in de openbare repo). verify_jwt: alleen folder aan. Brood Opzet-gegevens komen van de Edge Function `brood-export` in het Brood Opzet-project (bestand `brood-export.js` in repo Broodkarren); adres + koppelcode staan in `S.inst.bo`.

## Nieuwe versie (1.31, 1.32 …)
1. `app-basis.js`: `const VERSIE = 'x.y'`.
2. `version.json`: `{"versie":"x.y"}` (hiermee ziet de app dat er een update is).
3. `sw.js`: `V = 'cba-x.y'`.
4. `index.html`: `?b=x.y` bij style.css en in het laadscript.
5. `app-home.js`: `NIEUWS` bijwerken (icoon, titel, één zin per punt) = venster "Nieuw in versie" (zoals Brood Opzet).

Updates (2.07, zoals Brood Opzet): groene balk bij nieuwe versie; instelling "Updates tonen" per persoon (standaard aan voor beheerder, uit = stil bijwerken op de achtergrond); na bijwerken blijf je ingelogd (`cba-updopen`, 2 min).

## Afspraken over de app (1.46)
- Bestellen: Carlo voert eerst in op de terminal en vinkt daarna af. Knop heet "✓ Besteld · 2 dozen". Andersom kan ook (1.50): eerst afvinken, dan "📲 Naar de terminal" toont per artikel een QR-code met het bestelnummer (terminal leest QR en EAN, geen Code128).
- Voorkooplijst Van Tol: "alle folders" en "alleen Dagwinkel folder" = folder (Coop Vogelenzang staat op de Dagwinkel-folder); alleen het deel "Instore" = instore (inkoopvoordeel, niet naar de klant).
- Teller (geen bestellen/afvinken): geen datumbalk, geen collo/Brood Opzet/actielabels, zoekresultaat opent telscherm.
- Kop: Coop-oranje (--merk #f17d04) met donkere tekst. Oranje (--oranje #b85500) = hoofdactie.
- Meer: groep 'snel' bovenaan (Overtypen, Leverdag-check); Kantoor › Geavanceerd alleen voor beheerder.
- Woorden: lijst, afdeling, groep, besteld, Kantoor.

## Testen
- Test bij telscherm-wijzigingen ook de volgorde: eerst "+ 1 doos", dan cijfers (en andersom).
- Grote versie: volledige Playwright-test, ook een ronde als medewerker; testversie in Claude bijwerken.
- Kleine fix: snelle controle (app laadt zonder fouten, het aangepaste scherm werkt).
- Testen lokaal: `python3 -m http.server`, dan `http://localhost:8000/` (laadt niet via file://). Demo: zet vóór het laden `window.DEMO_DATA={dagen:{},kassa:{},boeken:{},acties:[],agenda:[],inst:{},assort:{}}` (of de data van de testversie), kies beheerder of medewerker, pincode 1234.
- Proefronde nieuwe medewerker: `_proef.js`-aanpak (zonder uitleg taken uitvoeren, tikken tellen; elke taak max 3 tikken navigatie).
- Echte gegevens: Carlo kan via Meer → Kantoor → Winkel en app → Testpakket een JSON maken; die is direct bruikbaar als `DEMO_DATA`.
- Rapporteer alleen de uitkomst.

## Opleveren
- **Bouw altijd verder op de bestanden in deze repo**: haal vóór elke bouw eerst de laatste versie op (Carlo kan zelf iets geüpload hebben), nooit op een eigen kopie. Werk niet in twee chats tegelijk aan deze app.
- Na "bouwen" en testen: **zelf committen en pushen naar main** (versienummer in de commit-boodschap). Carlo uploadt niets meer.
- Lukt pushen niet, dan als terugval een zip `coop-besteladvies-X.Y-github.zip` met alleen de gewijzigde bestanden (plat, geen mappen).
- Supabase: SQL als platte tekst in de chat, compacte delen zonder commentaar (max ~5 KB per deel), altijd met link naar de juiste Supabase-pagina. Nooit "vervang één regel": altijd het hele bestand. Niets nodig? Zeg: "Voor Supabase hoef je niets te doen".
- Pushmelding "Nieuwe versie": `.github/workflows/update-melding.yml` roept na elke versie stuur-push (soort update) aan; de cron doet het ook als reserve.
- Na oplevering alleen: wat nieuw is, dat het op GitHub staat, of Supabase iets nodig heeft (alleen nog SQL; Edge Functions gaan automatisch live, controleer de run van functies-live).

## Beveiliging (2.25)
- Nooit HTML bouwen met tekst van anderen zonder `esc`; eigen artikelen/tafels gaan door `schoon()`.
- Inkoopprijzen staan in tabel `inkoop` (mag inkoop), niet in boeken (`boekOp`). Koppelcode alleen via rpc `koppelcode_info` (team).
- Uitloggen/loskoppelen wist alles lokaal (`wisLokaal`). Pincode: PBKDF2 (`pinHash2`), oplopende blokkade in de database.
- Inbraaktest: SQL t1–t3 (schema inbraaktest, alles teruggedraaid) na elke wijziging aan rechten.
