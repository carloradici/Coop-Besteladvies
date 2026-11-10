# Coop Besteladvies – afspraken voor Claude

Web-app (PWA) van Coop Vogelenzang die per artikel een bestel-advies geeft (vers, KW, AGF, acties). Draait via GitHub Pages, offline met Supabase-sync. Eigenaar: Carlo (werkt alleen vanaf zijn iPhone, spreekt Nederlands).

## Werkwijze
- Pas pas iets aan als Carlo letterlijk "bouwen" zegt. Daarvóór: kort voorstel (wat, waar in de app, hoe het werkt). Is iets onduidelijk, stel één korte vraag.
- **Lees alleen de bestanden die je nodig hebt.** Zoek een functie met `grep -n "function naam\|const naam" app-*.js rekenkern.js` en lees dan alleen dat stuk.
- Pas gericht aan (Edit), herschrijf geen hele bestanden. Houd code compact.
- Nieuw scherm = meteen een eigen hulptekst (HULP).
- Stuur tijdens langer werk korte voortgangsberichten met percentage ("⏳ 40% · nu testen").

## Opbouw
- `index.html`: alleen HTML-geraamte + laadscript met `LADEN`.
- `rekenkern.js`: rekenkern en inleesfuncties (`window.C`), los script.
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
| app-start.js | opstarten |

Edge Functions: `stuur-push.js`, `dagexport.js`, `folder.js` (vaste naam, Supabase heeft alleen een stub die ze importeert). Brood Opzet-gegevens komen van de Edge Function `brood-export` in het Brood Opzet-project (bestand `brood-export.js` in repo Broodkarren); adres + koppelcode staan in `S.inst.bo`.

## Nieuwe versie (1.31, 1.32 …)
1. `app-basis.js`: `const VERSIE = 'x.y'`.
2. `version.json`: `{"versie":"x.y"}` (hiermee ziet de app dat er een update is).
3. `sw.js`: `V = 'cba-x.y'`.
4. `index.html`: `?b=x.y` bij style.css en in het laadscript.

## Testen
- Grote versie: volledige Playwright-test, ook een ronde als medewerker; testversie in Claude bijwerken.
- Kleine fix: snelle controle (app laadt zonder fouten, het aangepaste scherm werkt).
- Testen lokaal: `python3 -m http.server`, dan `http://localhost:8000/` (laadt niet via file://). Demo: zet vóór het laden `window.DEMO_DATA={dagen:{},kassa:{},boeken:{},acties:[],agenda:[],inst:{},assort:{}}` (of de data van de testversie), kies beheerder of medewerker, pincode 1234.
- Rapporteer alleen de uitkomst.

## Opleveren
- Zip `coop-besteladvies-X.Y-github.zip` met alleen de gewijzigde GitHub-bestanden (plat, geen mappen).
- Supabase: SQL als platte tekst in de chat, compacte delen zonder commentaar (max ~5 KB per deel), altijd met link naar de juiste Supabase-pagina. Nooit "vervang één regel": altijd het hele bestand. Niets nodig? Zeg: "Voor Supabase hoef je niets te doen".
- Na oplevering alleen: wat nieuw is, wat te uploaden, of Supabase iets nodig heeft.
