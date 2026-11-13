/* ---------- login, koppelen, winkels en medewerkers ---------- */
const KLEMBORD = '<svg class="merkicoon" viewBox="0 0 100 110" aria-hidden="true"><rect x="10" y="12" width="80" height="94" rx="9" fill="#fff"/><rect x="31" y="4" width="38" height="18" rx="5" fill="#fff" stroke="#f17d04" stroke-width="3"/><g fill="none" stroke="#f17d04" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M23 44l7 7 12-14M23 66l7 7 12-14M23 88l7 7 12-14"/><path d="M54 46h24M54 68h24M54 90h24"/></g></svg>';
const LOGO_KAAL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAggAAAEgCAMAAADmNXuXAAAAkFBMVEXxfQP+/v7iCRT55tPsiirtmkn21bTvqmfxs3fiFxHzxJbxu4fkJxHtkjr0zKXvoljpRw/rVw7mNxD33cP67uHtYQ7shh/eCBEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACcgbw1AAAAMHRSTlMA//////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC100O/AAAQoElEQVR42u2d63bbuA5GpfIaKqKayG3f/02P7LQ9acYXgQAhyvrwa1ZXp7bJTQDEjV0HgUAgEAgEAoFAIBAIBAKBQCAQCAQCgUAgEAgEAoFAIBDIFxldCHFIKQ0xTM5iQQ4odkqz6f8VkwJgOJYE398QH8HCYZTBYPp7koDCITBI/UMBCs8vQ79GTgEr9YQ6wIX4+z8n068U/xML90wAJG9O53390PW5Xy9mxAruHYBxWgCYT5939fznzvQkcVjKvWqACwDXtvsMQuypMmFNd6cBhjzfO+8LCKmnC3TCs90DvPV9icBP2JGs2WIzF3HQG9wdnguEYvFYX4BwEUSWdiNzVRB6RJsV3X47nsWWrbmpCwKMg0roL/177TM+xck2BQLukJXrQgZ/cwdNphSI1AYBKqFicdDjzfOrWagNAlRCHQrCai8/rQrn2NocQCVUkCmTtiC7FkBAfFFaGUS6Fn9cK6QAQsLeKZeIldQKjfVBMNi9rTG42Ae7NQjIR3e6lYK3DuRdT8EpgJCxgzIuoqkY8NcA4YQ9lLAKmb8T8Q5lCiAglCAg4SSxE8Ptf18DhAH7yJVUeytUQJixkUyzMFcvDIgaICAZzROnYKd1QHDH6gbJ3nzI7NMQ2AMDZLW2sUI3U5OHZSxCNkLe6hMhcO4HurFkkRFnjyrJH6oTYv6mNSlu7NNHEtzgHyyHSW6DINL6Y5nKkxfWIMr8kRFeqR5NbIKD6y5bZrBkT/AWaRnh02A3tgs3jYPn6JTp6N7io6EhV1CIG/qJ97I/npVP9ofOO7ksn/vRSQAYVjW7YXzRJ7w2OF890GpPvVq/ycwLBpijFqewUkDebt1zMjNqVxPHl/EoDKCbh9T3eiG+1SCcLKeu5blAcEYj1hpUS4oN07CZAwYSkkpXqNVN/5yYkYB8OBCc0ekPrtud/NV9t9xS5Hi0iFJQysQF3ZJiy21OcLsB4ac9SysFIg8bPgh65+SXFKcbnYu+mEO2s2cb73K5zIi7pIV/L5oxPg/T2MI0CSMCnP/c9kwodx+KDvRtg3ZqFoT7ncK+IDNsjVY34OouA+9KTYoX1uymyWTDqoygIY6St0ZtoEwuj9imIvffscMAvj0Q3LA6JJfHLTm4ecAcx980JfmfiZ0qyI2B4IgJwdUo1ODg1gljna5Q4iRM7G1MLYFg41wrB2SNXjug4xkWUwBh0HJvNUAYC+92qwaIe8UO4cxL5KWCjw7sksOhFRDGXLNNN/e92gBCyzydruBKH9nVBLENEMZcqymwctW/KT1bgR2Mmsif6VoHwaa6XXlOdWiA4XaPeTr9Azs+3AIIEg2ig76jeOPiMLFzVpGeP0rs1OH2IIy+djYw973ijCnP3pOJjmBmV5XErUPMsXo2MKj2ilu+UzPS3RPPtp8bg2B99RxQ7XljpmRB76/nSlNJBSEIVO+NbVeJ3LslkzpYlq7XGOOdbNdDVeQFBg0YcoDbs+172rIeISo0ba+/MSztjf//mdNcZhusRDTUk0/nzD7NiVH62lKVyE3jYEpjEamotjxI+N70BNDMnoWVt6tZzBphvlDeq+BLcpBZYjkTOYRh2J/qNwOhQvTfFCuEgeNlTtTP8zJtF0QQZoHt8Dt5g2gq9EIiy4UZqB7JIANCoN0zvEBblt/JW1S5TCEk3sXTUNmZZJzoSPumWeCmktr3D67ebiJvatxaf5HKt5WpuSeCkARAiI3fF265i4a3L/SSMyPicdUB4a5Bsps8+xeV5kZPXIttiMtjZQwtGYSRfZrtFjknpxXvZed/PNFbDDKzyTYAwW0QYa4a/B/JyRuBsh1PM3mDOAiOrdanDeaze63mUH61hiPGFr2MoQ1Ug80HIejHk6Law0OG7UtbokESMrSBGjWZep3ko9+Hg/DlqzqBXaHlAa2QoSWDENggZPU5/TMtKxymaRrmoldGkoCym0lbOwmlcsllY5ENwqx9e4xFzx0SXsGxgpaBmgeUMrTkaiE+CEb50mALe9nW15+ONMsQRKL+jvK3H4MwUJlP3OuR1b40rA0pmqnUtZjk7gzrz+Ykm9OvA8LAvj16dU9xLq8OCGLtBQQQgmwqN1VxhxL7dybtEIJnPGMWScru0U+jtZsboUcPyJolcT/X6/qKjlFyZokgBJGf5iqAkITOixdsazC6lauZc72aaXH/JOIGk0CwUn38nqpZuEmVUTeuOPacU5ppyzxTWwP4IIxSE84NFSjP9PmVXYTEMqEDCQQr85AhaW+dLgiRqi3HRlyEn7y4WySB4GT8thogBKGFmqjkOGZ0x6oOPU0yudkoY65Jh3zSHeM8itWZBd0owszDjgZCltkTEgih1/zQzyafOVzPq9YrjkyHpMaVfhICIYiCMFH9G8trEx51q5O4011IGmHlKzqjzJ783tsoBEKk+jeWNzkg6V4euQW+ocJNzgpVBjhREBJVU1ODbUUKYVC1DAP3nPzOVq07yeanaGWAFAieerwta4SE17UMkVsvdN+0LEPbU5xGS6NGtjJgEAKBHO+1nMEBoZcJuYjmm+ijQc2ch08ASJs90hwRIY1Aj4WNjFkirtdtbbHsAM+/e3syftEAzlbu7SVVBgiB4MjXK1c+S2R1xY9UNIk/dM6vAUAaBJJmEQKBnjedigcHOPWXPwVGg+YY3GgFrygrfl2mqOkgk2vI5BM6lfYERpl3i8RdBLEJPbbfojIgyNzDTKV5PV9Hw/wMRuCxGu0oQhUQBiHNkkkHM0l896G4Z+iUFt96dDGfZB88lYwieGUQhBPCTuR0FYzjqts8JqoQJl2PRKxE5ERx3JzIa6oF47iqg+CUX+WOysWRUglhJ5L76YqLbofdKATtKlmpygBiyuIkcCWfCo7osBuFsLIWwSk//CuUEDbEltlROgKberUOc5VLQ3sgEEt3PP9ji3JzWfdl+vpe/KjcahtkXJuBeDITO5Q5ar5MLzlAa9wpCJlW5xTZibyyaVxVQfAbjM+yrYFALLOc2Lo2F1XYzTsxDKttdnMa4UTz3CxX2bqy+6fZiWHQfydGCISRmscxPG27MiccFEHIohyoPzMaZSKL5IRw5uXySkfl1wPBbDNyV/v6GEW+9kiP9SZOd2dQBMFuA4J2ZHGQLq9znFidLz6kp779kCKJde1cg0hCOJWcTVP+zlnQG2Ubuo1eZ0jKIHiJf2UqivF9GQ7kctELUnVBCJs916Jdj+AlDJotrBUa/vgW1sWZpa3H3XDAMH9VQTACCRJffjiNP4thX+fcbjhYHQMVc1IlEsJFgxrrhv2vV3W6XfiJpOWZOtVsp8STmD9VH6IOSuOtTZ0XX1eDMCh/4CTfklMz3Hsjzje1Hk+kg+CVAxeDfLNmzWqhG+dUGoRTqMXB+luV1Y0xe/kCfKtfMiZsjrKtxsH6WqqgG1q8A14s/b5Z5XUa8lf1K/1n47quARCybiVMjUFjVr10cN2QfrvGPpvQVZVBPcthmOD5ch8jaVcKDSt118NXL3xlDChWLLYRuRgY/3cdlTAzj9nlghTuhDBNcl11mdQT4APrwhpYyjr2uhf7RDCCbriqFsygQAEt5BGUP9EydtIKvFslEODJNG9oDHk2nwPdw2Q7JRnVa2Jsuem1meu9jbqBvlwQRF36oc8yqiFAL50Iys+Mft3O9VMDrNbblrPl/9Sxa0KMeph7/V7Mn8zjDRNKJjZrBnz9FkVnCs8AZ21r1JtlMlsIQyKlhGex5y25CZh5RyAM+pnwql0fD/O01ujVBZgdgUALh1v9jxQ/p0IkzFbG7po2OCD60SJugq3KweOFFSFhkHLAWgGBmKYvm/cakt7UgBXxFz4J89g9HQheXiN+WfZovvzamu/Sxxo/utBXsqqjlFW9Rbp1sMPpv8Ehv3lHIKdKJVlJG+hbAcHVrKJ16eqvraYS1h8vZ2pjsDcQCtqy1lbKTF55gARJW5UoBTNYaUc8NwNCSaxtxXq4ZG5j71roCBypOM6hwo2sHRDKrvXDPb/ZhmTu/9rURMW/8xRlMFaxuqkZEEqv9T5eW3jrvkJw/ddWKC4v6b0Y07pJ20VVATsDgWGwP55oGO1FxikMeT6tDL9MTXBw+SYPWJhTsBWrfoZ2QJj66jLULyDkFPKMIc03OHe2stGN7YBQtwfo5q8VzT0ZflZ/MWpxSPksacl5TvzSkN2BMGwCgtUrENlI4ma9zU1mgRRaRFPXpAyq7cWdZpuLbHB+anlggBYIrjuSSpgquqneNsoBqZr9ICphqndhiV0HEHajEpx47qd5dVBYzb4LB7fGJd9y8k9zS57W29vb9+/f91rErBRLGGswaEIDW//+/vr6+vLy8u1DXnYPgtsMhG6c96QNzuf+/fPe/yOve61mV4oqPfi1gayPslPf/vfL9n+7L+9kLdueazNv+cZEJHWwRKu6/w+3nwGCaQ+EmjeHNYH5tUNgY30/+wd1///K9ycAoWIW8rTOTXnY3miKM8LrFcBrEQBPBUK9FqTT+tL3bG6VPtQcFnAGgLP/f+WtI1aDzt1ug+O1nxtZRmEP2Zs/4vO5+MXWswEyBFwBYWdFzBoktKf/LndASQJ+S/ckIFQioaFfK64DboMw7hmEGrFmExtRAjUJuBJY3Fk1+398d+F3iObQBgLfNORlz0XMommgLUYENoHAlQjz3kGQMw8+HAeBKyDsrZq9klLQiwM3gUApCLFrWxwv81DQHybCQH13kJBqCM8Awv3pwI90wXgoNcACIXTtiyvokzY5WH0GGkDgSqoh7q6a/U5Xsyd1QkZ3MFNwF4T9VbPfZyGbdZrAqTPwrTl523kRc/e4R/R0ryPaWV1b0CIDRwDhT4/o0iLq/XzJCc5+yQoOEp2itEzB4g+0CsHXVMOuRnLvSdo0BrcjzAChgnxvH4JCECw2d7U12AUDAOEwELx8ltcP+efPXv6NMK8rC8cmt3o3+LPN7+/vSwfb96Wb6e3Hj65K85iZc8RGN6QJLlt/2fe3t06ji/BjCBmswgPHUAeC8+6fN1907x+AYJYXaYKzIGDFFfGl+v4vh7/i7ndXq9mXWuwzAdjg7e2B3v5/LmJeAm+LERhBwPaq4GwAvr/92OI3BYdoUQP3gw8CsLoHVgUg4PAXBCCwTwqAAAzC+6soA1jRY7sFL69QA0enAAyAgsUWgIGDU/DyAn/g8BTAGOxefnApwMUA8QIogicxCazYISCAYwBr8DwmoZwC3A/hGAAC3BIAAZQBIIB/ePEMAQGUwXJFxMI9l5CVwa9viBM8YeQI9gBCjhks9uAHVu3ot0WoAtgEuIawCaAAGMAgwDX4EzaEbwjXAAYBGICCZ48k/1pJAdwCeIigABiAAmDwcUcABcDgG7xDYAAKgMFH7BBRI2DwDRFkYACT0CGKeDEJWCRggIjBIeTHIwxgEg4h7wgcQRYfEcoA8uiqAGUAHxHXhAPJHQx+wSbAR4RNgHPwO46M5YFzgHsCrAIwgFWAa9AhngwMjmkVfgEDSPd2yyqg7KhDBAkYwElE2ADq4K9vgJVBtnnBAEYBd0bcFKAOgMEh1cFVJ/EFGEAdIKeAywKKj6AOEDiAOvhchAYfsUNmAc5Bh0QjrALsAsLJAAGRA8grrALkPyWqyC4BhLPgrgAQ4CR2iCoidAD5CwLUwdHlDeoA8gcEqAPIAgLUAaQ7FypiDSAQCAQCgUAgZ/kf77A1udys5DUAAAAASUVORK5CYII=';
function plaatsNu() { return ((S.inst && S.inst.plaats) || (S.winkel && S.winkel.plaats) || (WINKEL && WINKEL.plaats) || 'Vogelenzang').trim(); }
function logoSrc() { return /^vogelenzang$/i.test(plaatsNu()) ? LOGO : LOGO_KAAL; }
const ONDERDELEN = [['agf', 'AGF', '🥬'], ['vers', 'Vers', '🧀'], ['brood', 'Brood', '🥖'], ['diep', 'Diepvries', '🧊'], ['kw', 'KW', '🥫'], ['overig', 'Overig', '📦']];
const BESTEL_OD = ['agf', 'vers', 'brood', 'diep', 'kw'];
const odNaam = k => (ONDERDELEN.find(o => o[0] === k) || [k, k])[1];
const RECHTEN = [['Afdelingen zien', [['o_agf', 'AGF'], ['o_vers', 'Vers'], ['o_brood', 'Brood'], ['o_diep', 'Diepvries'], ['o_kw', 'KW'], ['o_overig', 'Overig']]], ['Doen', [['tellen', 'Voorraad tellen'], ['bestellen', 'Bestelling aanpassen'], ['afvinken', 'Besteld afvinken'], ['schap', 'Schap aangepast afvinken'], ['saneren', 'Saneren en opnemen in assortiment'], ['heleboek', 'Hele bestelboek bekijken'], ['inout', 'In/out: ingekocht invullen']]], ['Beheer', [['inkoop', 'Inkoopprijzen zien'], ['upload', 'Bestanden uploaden'], ['instellingen', 'Instellingen, besteldagen en feestdagen'], ['team', 'Medewerkers en koppelcode'], ['tafels', 'Actietafels indelen']]]];
RECHTEN.push(['Weergave', [['beginner', 'Beginnersmodus: alleen bestellen en tellen']]]);
const ALLE_R = RECHTEN.flatMap(g => g[1].map(r => r[0])).filter(r => r !== 'beginner');
const PRESET = { medewerker: ['o_agf', 'o_vers', 'o_brood', 'o_diep', 'o_kw', 'o_overig', 'tellen', 'afvinken', 'schap'] };
PRESET.leider = PRESET.medewerker.concat(['bestellen', 'saneren', 'heleboek', 'inout', 'upload', 'inkoop', 'tafels']);
PRESET.beheerder = ALLE_R.slice();
const presetRechten = p => Object.fromEntries(ALLE_R.map(r => [r, PRESET[p].includes(r)]));
const DEMO_MW = [{ id: 'd1', naam: 'Carlo', rol: 'beheerder', rechten: presetRechten('beheerder'), heeft_pin: true }, { id: 'd2', naam: 'Medewerker A', rol: 'medewerker', rechten: Object.assign(presetRechten('medewerker'), { afvinken: false }), heeft_pin: true }, { id: 'd3', naam: 'Medewerker B', rol: 'medewerker', rechten: Object.assign(presetRechten('medewerker'), { o_kw: false, o_overig: false, o_diep: false }), heeft_pin: false }];
function mwLijst() { return DEMO ? DEMO_MW : S.medewerkers; }
function huidigeMw() { return mw ? mwLijst().find(x => x.id === mw.id) : null; }
function mag(r) { if (eigenaar) return true; const m = huidigeMw(); if (!m) return false; if (m.rol === 'beheerder') return true; const R = Object.assign(presetRechten('medewerker'), m.rechten || {}); return !!R[r]; }
const recht = mag;
function beginner() { if (isBeheer()) return false; const m = huidigeMw(); return !!(m && m.rechten && m.rechten.beginner); }
function isBeheer() { return eigenaar || (huidigeMw() || {}).rol === 'beheerder'; }
function mijnNaam() { if (mw) return mw.naam; if (!eigenaar) return 'Winkel'; { const e = sess && sess.email && String(sess.email).toLowerCase(); const me = e && mwLijst().find(m => m.email && String(m.email).toLowerCase() === e); if (me) return me.naam; } if (S.inst && S.inst.beheerNaam) return S.inst.beheerNaam; const b = mwLijst().filter(m => m.rol === 'beheerder'); return b.length === 1 ? b[0].naam : 'Beheerder'; }
function wieSleutel() { return eigenaar ? 'mail:' + ((sess && sess.email) || '') : mw ? 'mw:' + mw.id : 'toestel'; }
const ini = n => String(n || '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const hhmm = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const log = (wat, tekst) => write('activiteit', [{ wie: mijnNaam(), wat, tekst, dag: C.today(), ts: new Date().toISOString() }]);

function loginKader(onder, inhoud, compact) {
  document.body.classList.toggle('vast', !!compact); window.scrollTo(0, 0);
  document.body.classList.add('inlog'); $('nav.tabs').classList.add('hide'); $('#kop').classList.add('hide'); ['#updBalk', '#oefenBalk'].forEach(s => $(s) && $(s).remove());
  $('#app').innerHTML = compact ? `<div class="login compact"><img class="merklogo" src="${logoSrc()}" alt="Coop"><div class="merkregel">${KLEMBORD}<h1>Besteladvies</h1></div>${inhoud}` : `<div class="login"><img class="merklogo" src="${logoSrc()}" alt="Coop">${KLEMBORD}<h1>Besteladvies</h1><div class="ond">${onder}</div>${inhoud}<div class="versie">${esc((WINKEL && WINKEL.naam) || 'Coop Vogelenzang')} · versie ${VERSIE}</div></div>`;
}
function showLogin(msg) {
  if (DEMO) {
    loginKader('Testversie', `<p>Deze testversie gebruikt voorbeelddata. Kies hoe je wilt kijken:</p><div class="form"><button class="btn" id="dA">Bekijk als beheerder</button><button class="btn sec" id="dW">Bekijk als medewerker</button></div>`);
    $('#dA').onclick = () => startDemo('admin'); $('#dW').onclick = () => startDemo('winkel'); return;
  }
  const modus = ui.loginModus || 'code';
  loginKader('Toestel koppelen', `<div class="segment"><button class="${modus === 'code' ? 'aan' : ''}" data-mo="code">Met koppelcode</button><button class="${modus === 'mail' ? 'aan' : ''}" data-mo="mail">Met e-mail</button></div>
  ${modus === 'code' ? `<p>Vraag de beheerder om de koppelcode van de winkel (Meer → Winkel). Daarna kies je je naam en vul je je pincode in.</p><div class="form"><label for="lC">Koppelcode</label><input type="text" id="lC" class="codeveld" placeholder="Bijv. K7MX4PQ2" autocapitalize="characters" autocomplete="off"><button class="btn" id="lK">Koppelen</button><div class="msg" id="lM">${esc(msg || '')}</div></div>` :
  `<p>${ui.pinVergeten ? 'Log in met je e-mail. Daarna kies je een nieuwe pincode.' : 'Voor de eigenaar van de winkel. Daarna log je in met je pincode.'}</p><div class="form"><label for="lE">E-mailadres</label><input type="email" id="lE" placeholder="voorbeeld@voorbeeld.nl" autocomplete="username"><label for="lP">Wachtwoord</label><input type="password" id="lP" autocomplete="current-password"><button class="btn" id="lB">Inloggen</button><div class="msg" id="lM">${esc(msg || '')}</div></div>`}`);
  document.querySelectorAll('[data-mo]').forEach(b => b.onclick = () => { ui.loginModus = b.dataset.mo; showLogin(); });
  if (modus === 'code') {
    const go = async () => { const code = $('#lC').value.trim().toUpperCase(); if (!code) return; $('#lM').textContent = 'Bezig…'; try { if (!sess || sess.kind !== 'anon') await anoniem(); const w = await rpc('koppel', { code }); if (!w) throw new Error('Deze koppelcode klopt niet of is verlopen.'); W = w; ls.set('cba-w', W); mw = null; ls.del('cba-mw'); start(); } catch (e) { $('#lM').textContent = !navigator.onLine || /Failed to fetch|NetworkError|Load failed/i.test(e.message) ? 'Geen internet. Koppelen kan alleen met internet.' : e.message; } };
    $('#lK').onclick = go; $('#lC').onkeydown = e => { if (e.key === 'Enter') go(); };
  } else {
    const go = async () => { $('#lM').textContent = 'Bezig…'; try { await authCall('password', { email: $('#lE').value.trim(), password: $('#lP').value }); mw = null; ls.del('cba-mw'); OPEN = false; VERS_IN = true; start(); } catch (e) { $('#lM').textContent = /Invalid login/i.test(e.message) ? 'E-mailadres of wachtwoord klopt niet.' : !navigator.onLine || /Failed to fetch|NetworkError|Load failed/i.test(e.message) ? 'Geen internet. Inloggen met e-mail kan alleen met internet.' : e.message; } };
    $('#lB').onclick = go; $('#lP').onkeydown = e => { if (e.key === 'Enter') go(); };
  }
}
function ontkoppeld() { sess = null; ls.del('cba-sess'); mw = null; ls.del('cba-mw'); showLogin('Dit toestel is niet (meer) gekoppeld. Vraag de beheerder om de koppelcode.'); }
function geenWinkel() { loginKader('Geen winkel', '<p>Dit account hoort nog bij geen enkele winkel. Vraag de eigenaar om je als beheerder toe te voegen.</p><div class="form"><button class="btn sec" id="lUit">Uitloggen</button></div>'); $('#lUit').onclick = () => { sess = null; ls.del('cba-sess'); showLogin(); }; }
function kiesWinkel() {
  loginKader('Kies een winkel', `<div class="form namen">${winkels.map(w => `<button class="btn" data-w="${w.id}">${esc(w.naam)}<small>${esc(w.plaats || '')}</small></button>`).join('')}</div>`);
  document.querySelectorAll('[data-w]').forEach(b => b.onclick = async () => { await saveCache(); W = b.dataset.w; ls.set('cba-w', W); mw = null; ls.del('cba-mw'); OPEN = false; S.dagen = {}; S.dagMeta = {}; S.boeken = {}; S.kassa = {}; M = null; start(); });
}
async function pinHash(id, pin) { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id + ':' + pin)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { return id + ':' + pin; } }
/* ---------- inloggen: naam + pincode, elke keer bij openen ---------- */
function berekenEigenaar() { if (!WINKEL || WINKEL.rol !== 'beheer' || !mw) return false; if (DEMO) return mw.id === 'd1'; const em = ls.get('cba-emw:' + W); return !!(isMail() && em && em.id === mw.id); }
function demoNamen() { return DEMO_MW.map(m => Object.assign({}, m, { eigen: m.id === 'd1' && WINKEL && WINKEL.rol === 'beheer', mail: m.id === 'd1' })); }
const IN = { namen: [], keuze: null, pin: '', eerste: null, msg: '', blokTot: 0 };
function naarMail(msg, vergeten) { OPEN = false; sess = null; ls.del('cba-sess'); mw = null; ls.del('cba-mw'); ui.loginModus = 'mail'; ui.pinVergeten = !!vergeten; showLogin(msg); }
function opruimen() { const u = $('#undoBalk'); if (u) u.remove(); document.querySelectorAll('.sheet,.telmodus').forEach(x => x.remove()); telHook = null; }
async function inlogScherm(msg) {
  OPEN = false; mw = null; ls.del('cba-mw'); opruimen();
  IN.pin = ''; IN.eerste = null; IN.msg = msg || ''; IN.faceAuto = false;
  if (DEMO) { IN.namen = demoNamen(); return tekenInlog(); }
  const cache = W && ls.get('cba-namen:' + W);
  if (cache && !ui.pinVergeten && !VERS_IN) { IN.namen = cache; tekenInlog(); } else loginKader('Inloggen', '<p>Even geduld…</p>');
  try {
    winkels = await rpc('mijn_winkels');
    if (!winkels.length) return sess && sess.kind === 'anon' ? ontkoppeld() : geenWinkel();
    if (!W || !winkels.some(x => x.id === W)) { if (winkels.length === 1) { W = winkels[0].id; ls.set('cba-w', W); } else return kiesWinkel(); }
    WINKEL = winkels.find(x => x.id === W);
    if (WINKEL.rol === 'beheer' && isMail()) {
      await rpc('eigen_toestel', { w: W });
      const r = await rpc('eigenaar_mw', { w: W, nm: null });
      if (r && r.nodig) return naamScherm(r.namen || []);
      ls.set('cba-emw:' + W, { id: r.id, naam: r.naam });
      if (ui.pinVergeten) {
        if (!VERS_IN) return naarMail('Log in met je e-mail. Daarna kies je een nieuwe pincode.', true);
        if (!(await rpc('eigenaar_pin_reset', { w: W }))) return naarMail('Log opnieuw in met je e-mail om een nieuwe pincode te kiezen.', true);
        const lok = ls.get('cba-pin') || {}; delete lok[r.id]; ls.set('cba-pin', lok); ls.del('cba-face:' + W); ls.del('cba-face2:' + W + ':' + r.id); ui.pinVergeten = false;
      }
      if (VERS_IN) IN.keuze = r.id;
    }
    await rpc('vergrendel', { w: W }).catch(() => { });
    IN.namen = await rpc('namen', { w: W }); ls.set('cba-namen:' + W, IN.namen);
    tekenInlog();
  } catch (e) {
    if (/niet ingelogd|refresh|Invalid Refresh|401|JWT/i.test(e.message) && navigator.onLine) return isMail() ? naarMail('Je sessie is verlopen. Log opnieuw in met je e-mail.') : ontkoppeld();
    if (!cache) { loginKader('Geen verbinding', '<p>Er is geen internet. De eerste keer inloggen op dit toestel, met e-mail, koppelcode of je pincode, kan alleen met internet. Daarna kun je op dit toestel ook zonder internet inloggen met je pincode.</p><div class="form"><button class="btn" id="opn">Opnieuw proberen</button></div>'); $('#opn').onclick = () => inlogScherm(); }
  }
}
function naamScherm(namen) {
  loginKader('Wie ben jij?', `<p>Eenmalig: kies je naam of vul hem in. Daarna kies je een pincode.</p><div class="form namen">${namen.map(n => `<button class="btn" data-nm="${esc(n)}">${esc(n)}<small>beheerder</small></button>`).join('')}</div><div class="form"><label for="nmI">${namen.length ? 'Of vul je naam in' : 'Jouw naam'}</label><input type="text" id="nmI" placeholder="Bijv. Carlo" autocomplete="given-name"><button class="btn" id="nmB">Verder</button><div class="msg" id="nmM"></div></div>`);
  const kies = async n => { try { const r = await rpc('eigenaar_mw', { w: W, nm: n }); ls.set('cba-emw:' + W, { id: r.id, naam: r.naam }); IN.keuze = r.id; inlogScherm(); } catch (e) { $('#nmM').textContent = e.message; } };
  document.querySelectorAll('[data-nm]').forEach(b => b.onclick = () => kies(b.dataset.nm));
  $('#nmB').onclick = () => { const n = $('#nmI').value.trim(); if (!n) return ($('#nmM').textContent = 'Vul je naam in.'); kies(n); };
}
const FACE_SVG = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M8.5 9v1.5M15.5 9v1.5M12 9v4h-1M9 16.2c1.8 1.3 4.2 1.3 6 0"/></svg>';
function faceKan() { return !!(window.PublicKeyCredential && navigator.credentials && window.isSecureContext !== false); }
function faceCfg(mid) { const f = ls.get('cba-face2:' + W + ':' + mid); if (f) return f; const o = ls.get('cba-face:' + W); return o && o.mid === mid ? o : null; }
function faceVoor(g) { return !!(g && g.rol === 'beheerder' && faceCfg(g.id) && faceKan()); }
function kanFace() { const m = huidigeMw(); return !DEMO && !!m && m.rol === 'beheerder'; }
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = t => { t = t.replace(/-/g, '+').replace(/_/g, '/'); t += '='.repeat((4 - t.length % 4) % 4); return Uint8Array.from(atob(t), c => c.charCodeAt(0)); };
function tekenInlog() {
  const lijst = IN.namen || [];
  if (!IN.keuze || !lijst.some(m => m.id === IN.keuze)) { const l = ls.get('cba-laatste:' + W); IN.keuze = lijst.some(m => m.id === l) ? l : null; }
  const g = lijst.find(m => m.id === IN.keuze); const nieuw = g && !g.heeft_pin;
  const label = !g ? 'Pincode' : nieuw ? (IN.eerste ? 'Herhaal je pincode' : 'Kies je pincode (4 cijfers)') : 'Pincode';
  const face = faceVoor(g);
  loginKader('Inloggen', `<div class="form inlog"><label for="iNaam">Naam</label><div class="naamkeuze"><select id="iNaam" aria-label="Kies je naam"><option value="" ${g ? '' : 'selected'} disabled>Kies je naam</option>${lijst.map(m => `<option value="${m.id}" ${m.id === IN.keuze ? 'selected' : ''}>${esc(m.naam)}</option>`).join('')}</select>${g && g.rol === 'beheerder' ? '<span class="rol">Beheerder</span>' : ''}<span class="pijlneer">▾</span></div>
  ${`<label>${label}</label><div class="pinbolletjes" id="iDots">${[0, 1, 2, 3].map(i => `<i class="${i < IN.pin.length ? 'vol' : ''}"></i>`).join('')}</div><div class="msg" id="iM">${esc(IN.msg)}</div>
  <div class="cijferblok">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-cijfer="${n}">${n}</button>`).join('')}${face ? `<button class="wis" id="iFace" aria-label="Inloggen met Face ID">${FACE_SVG}</button>` : '<span></span>'}<button data-cijfer="0">0</button><button class="wis" id="iWis" aria-label="Wissen">⌫</button></div>
  <p class="merkhint">${!g ? (lijst.length ? 'Kies eerst je naam.' : 'Er zijn nog geen medewerkers. De beheerder voegt ze toe via Meer → Medewerkers.') : face ? 'Tik linksonder voor Face ID, of vul je pincode in' : nieuw && g.mail && !g.eigen ? 'Deze pincode stel je eenmalig in op je eigen telefoon.' : 'Na het 4e cijfer log je automatisch in'}</p>
  ${g && g.eigen ? '<button class="merklink" id="iVerg">Pincode vergeten</button>' : ''}`}
  ${winkels.length > 1 ? '<button class="merklink" id="iWinkel">Andere winkel</button>' : ''}</div>`, true);
  $('#iNaam').onchange = e => { IN.keuze = e.target.value; IN.pin = ''; IN.eerste = null; IN.msg = ''; tekenInlog(); };
  const wk = $('#iWinkel'); if (wk) wk.onclick = () => { W = null; ls.del('cba-w'); kiesWinkel(); };
  const dots = () => { const d = $('#iDots'); if (d) d.querySelectorAll('i').forEach((x, i) => x.classList.toggle('vol', i < IN.pin.length)); };
  document.querySelectorAll('[data-cijfer]').forEach(b => b.onclick = () => { if (!g) { const m = $('#iM'); if (m) m.textContent = 'Kies eerst je naam.'; const s2 = $('.naamkeuze'); if (s2) { s2.classList.remove('fout'); void s2.offsetWidth; s2.classList.add('fout'); } return; } if (IN.pin.length >= 4) return; IN.pin += b.dataset.cijfer; dots(); if (IN.pin.length === 4) setTimeout(() => probeerPin(g), 120); });
  $('#iWis').onclick = () => { IN.pin = IN.pin.slice(0, -1); dots(); };
  const fb = $('#iFace'); if (fb) fb.onclick = () => faceLogin();
  const vg = $('#iVerg'); if (vg) vg.onclick = () => DEMO ? toast('In de echte app log je dan opnieuw in met je e-mail') : naarMail('Log in met je e-mail. Daarna kies je een nieuwe pincode.', true);
}
function pinFout(t) { IN.pin = ''; IN.msg = t; tekenInlog(); const d = $('#iDots'); if (d) d.classList.add('fout'); }
async function probeerPin(g) {
  const p = IN.pin;
  if (!g.heeft_pin && !IN.eerste) { IN.eerste = p; IN.pin = ''; IN.msg = ''; return tekenInlog(); }
  if (!g.heeft_pin && IN.eerste !== p) { IN.eerste = null; return pinFout('De twee pincodes zijn niet gelijk. Kies opnieuw.'); }
  if (Date.now() < IN.blokTot) return pinFout(`Te vaak fout. Probeer het over ${Math.ceil((IN.blokTot - Date.now()) / 1000)} seconden opnieuw.`);
  IN.msg = 'Bezig…'; const m = $('#iM'); if (m) m.textContent = IN.msg;
  let ok = false;
  if (DEMO) ok = !g.heeft_pin || p === '1234';
  else {
    const lok = ls.get('cba-pin') || {}; let r = null;
    try { r = await rpc('pin_login', { w: W, mid: g.id, pin: p }); }
    catch (e) { if (!lok[g.id]) return pinFout('Geen internet. Probeer het opnieuw zodra je verbinding hebt.'); }
    if (r) {
      ok = !!r.ok;
      if (r.wacht) { IN.blokTot = Date.now() + r.wacht * 1000; return pinFout(`5 keer fout. Wacht ${r.wacht} seconden.`); }
      if (r.mail) { IN.eerste = null; return pinFout('Deze pincode stel je eenmalig in op je eigen telefoon (inloggen met e-mail).'); }
      if (!ok) { IN.eerste = null; return pinFout(r.fout ? `Pincode klopt niet (${r.fout} van 5).` : 'Pincode klopt niet.'); }
    } else {
      ok = lok[g.id] === await pinHash(g.id, p);
      if (!ok) { const f = (ls.get('cba-pinfout') || 0) + 1; if (f >= 5) { ls.set('cba-pinfout', 0); IN.blokTot = Date.now() + 30000; return pinFout('5 keer fout. Wacht 30 seconden.'); } ls.set('cba-pinfout', f); return pinFout(`Pincode klopt niet (${f} van 5).`); }
    }
  }
  if (!ok) return pinFout('Pincode klopt niet.');
  const lok = ls.get('cba-pin') || {}; lok[g.id] = await pinHash(g.id, p); ls.set('cba-pin', lok); ls.set('cba-pinfout', 0);
  g.heeft_pin = true; ingelogd(g);
}
async function faceLogin(auto) {
  const g = (IN.namen || []).find(m => m.id === IN.keuze); if (!faceVoor(g)) return;
  const f = faceCfg(g.id);
  try {
    await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: unb64u(f.cred) }], userVerification: 'required', timeout: 60000 } });
    const r = await rpc('face_login', { w: W, mid: g.id, geheim: f.geheim });
    if (!r || !r.ok) { ls.del('cba-face:' + W); ls.del('cba-face2:' + W + ':' + g.id); return pinFout('Face ID is uitgezet. Zet het opnieuw aan onder Meer → Pincode en Face ID.'); }
    ingelogd(g);
  } catch (e) { if (auto) return; pinFout(e && e.name === 'NotAllowedError' ? 'Face ID geannuleerd. Gebruik je pincode.' : 'Face ID lukte niet. Gebruik je pincode.'); }
}
function ingelogd(g) {
  ls.set('cba-laatste:' + W, g.id); IN.msg = ''; IN.eerste = null; IN.pin = '';
  mw = { id: g.id, naam: g.naam }; ls.set('cba-mw', mw); OPEN = true; VERS_IN = false;
  eigenaar = berekenEigenaar(); rol = eigenaar ? 'admin' : 'winkel';
  if (!DEMO) return start();
  S.pref = Object.assign({}, (ls.get('cba-pref-' + wieSleutel()) || {})); pasPrefToe();
  shell(); if (!M) rebuild(); ui.tab = startTab(); render(); tourAlsNodig(); setTimeout(weerHist, 2500); setTimeout(kwAutoHaal, 4000); setTimeout(versAutoHaal, 6000); setTimeout(pdfOpruimen, 8000); setTimeout(boHaal, 3000);
}
async function faceInstellen() {
  if (DEMO) return toast('Face ID werkt alleen in de echte app');
  const f = faceCfg(mw.id);
  if (f) { try { await rpc('face_uit', { w: W, mid: mw.id }); } catch (e) { } ls.del('cba-face:' + W); ls.del('cba-face2:' + W + ':' + mw.id); toast('Face ID staat uit'); return render(); }
  if (!faceKan()) return toast('Face ID wordt op dit toestel niet ondersteund');
  try {
    const c = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'Besteladvies' }, user: { id: new TextEncoder().encode(mw.id), name: mw.naam, displayName: mw.naam }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' }, timeout: 60000 } });
    const geheim = [...crypto.getRandomValues(new Uint8Array(32))].map(x => x.toString(16).padStart(2, '0')).join('');
    if (!(await rpc('face_aan', { w: W, mid: mw.id, geheim }))) throw new Error('Niet gelukt');
    ls.del('cba-face:' + W); ls.set('cba-face2:' + W + ':' + mw.id, { cred: b64u(c.rawId), geheim, mid: mw.id }); toast('Face ID staat aan'); render();
  } catch (e) { toast(e && e.name === 'NotAllowedError' ? 'Face ID geannuleerd' : 'Face ID aanzetten lukte niet'); }
}
document.addEventListener('click', e => { if (e.target && e.target.matches && e.target.matches('input[type=file]')) kiestBestand = true; }, true);
document.addEventListener('change', e => { if (e.target && e.target.matches && e.target.matches('input[type=file]')) kiestBestand = false; }, true);
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('touchmove', e => { if (e.scale !== undefined && e.scale !== 1) e.preventDefault(); }, { passive: false });
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { verborgen = Date.now(); return; }
  const lang = verborgen && Date.now() - verborgen > 15000; verborgen = 0;
  if (kiestBestand || buitenApp > 0 || scanStop) { kiestBestand = false; return; }
  if (lang && OPEN && !OEFEN) inlogScherm();
});
function startDemo(r) {
  const d = window.DEMO_DATA;
  Object.assign(S, { dagen: d.dagen, kassa: d.kassa, boeken: d.boeken, acties: d.acties, agenda: d.agenda, inst: d.inst, medewerkers: DEMO_MW, winkel: { code: 'K7MX4PQ2', tot: C.add(C.today(), 30) + 'T12:00:00Z', toestellen: 2, naam: 'Coop Vogelenzang', plaats: 'Vogelenzang' }, assort: d.assort || {}, notities: {}, act: [] });
  ['eigen', 'route', 'kwplan', 'versplan', 'tafels', 'indeling'].forEach(k => { if (d[k]) S[k] = d[k]; });
  S.dagMeta = {}; Object.keys(d.dagen).forEach(k => S.dagMeta[k] = 'demo'); S.bo = d.bo ? (o => Object.assign({}, d.bo, { nu: C.add(d.bo.nu, o), t: Date.now(), dagen: Object.fromEntries(Object.entries(d.bo.dagen).map(([k, v]) => [C.add(k, o), v])) }))(C.diff(d.bo.nu, C.today())) : null;
  W = 'demo'; WINKEL = { id: 'demo', naam: 'Coop Vogelenzang', plaats: 'Vogelenzang', rol: r === 'admin' ? 'beheer' : 'toestel' }; winkels = [WINKEL];
  sess = { email: r === 'admin' ? 'carlo@coopvogelenzang.nl' : '', kind: r === 'admin' ? 'email' : 'anon' };
  rebuild(); IN.keuze = r === 'admin' ? 'd1' : null; inlogScherm();
}
async function start() {
  if (!OPEN) return inlogScherm();
  shell();
  const had = await loadCache();
  eigenaar = berekenEigenaar(); rol = eigenaar ? 'admin' : 'winkel';
  S.pref = ls.get('cba-pref-' + wieSleutel()) || S.pref || {}; pasPrefToe();
  S.bo = await iget('bo:' + W) || null; S.route = ls.get('cba-route') || null;
  if (had) { rebuild(); ui.tab = startTab(); render(); }
  else $('#view').innerHTML = '<div class="empty">Gegevens laden…</div>';
  await sync(!had);
  if (document.body.classList.contains('inlog')) return;
  if (!M) { rebuild(); render(); }
  tourAlsNodig(); setTimeout(kwAutoHaal, 4000); setTimeout(versAutoHaal, 6000); setTimeout(pdfOpruimen, 8000);
}
function startTab() { const s = (S.pref && S.pref.start) || 'home'; return s === 'home' || (BESTEL_OD.includes(s) && mag('o_' + s)) || (s === 'overig' && mag('o_overig')) ? s : 'home'; }
function shell() {
  document.body.classList.remove('inlog', 'vast'); $('#kop').classList.remove('hide'); $('nav.tabs').classList.remove('hide');
  if (!$('#view')) $('#app').innerHTML = '<div id="view"></div>';
  document.querySelectorAll('nav.tabs button').forEach(b => b.onclick = () => navKlik(b.dataset.t)); const hb = $('#hulpB'); if (hb) hb.onclick = hulp;
 $('#belB').onclick = () => ga('taken'); $('#terugB').onclick = () => { if (ui.tab === 'meer' && ui.meerG) { ui.meerG = KANTOOR_G.includes(ui.meerG) ? 'kantoor' : null; return render(); } if (ui.tab === 'tafels' && ui.tafel) { ui.tafel = null; return render(); } if (ui.tab === 'acties') return ga('plekken'); if (ui.tab === 'beheer') { ui.meerG = BSUB_GROEP[ui.bsub] || 'data'; ui.bsub = null; return ga('meer'); } ga(MEER_SUB.includes(ui.tab) ? (ui.tab === 'mwedit' ? 'medewerkers' : 'meer') : 'home'); };
  $('#wieB').onclick = () => { if (OEFEN) return toast('Stop eerst met oefenen'); inlogScherm(); };
  $('.koplogo').src = logoSrc(); setSync(); oefenBalk();
}
const MEER_SUB = ['tafels', 'kwacties', 'rapport', 'gebruik', 'route', 'medewerkers', 'mwedit', 'winkel', 'meldingen', 'appinst', 'vandaag', 'export', 'beheer', 'uitleg', 'hoegoed', 'leverancier', 'levering'];
const SCROLL = {}; let scrollSleutel = '';
function schermSleutel() { return [ui.tab, ui.bsub || '', ui.meerG || '', ui.tafel || '', ui.kwKop || '', ui.kwStap || '', ui.versStap || ''].join('|'); }
function zoekKruis(root) { (root || document).querySelectorAll('input[type=search]:not([data-kr])').forEach(i => { i.dataset.kr = 1; const w = document.createElement('span'); w.className = 'zwrap'; const cs = getComputedStyle(i); w.style.flex = cs.flex; if (i.style.width) w.style.width = i.style.width; i.parentNode.insertBefore(w, i); w.appendChild(i); i.style.width = '100%'; const k = document.createElement('button'); k.type = 'button'; k.className = 'zkruis'; k.textContent = '✕'; k.setAttribute('aria-label', 'Wissen'); k.onclick = () => { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); i.focus(); }; w.appendChild(k); w.classList.toggle('vol', !!i.value); }); }
document.addEventListener('input', e => { if (e.target.matches && e.target.matches('input[type=search]') && e.target.parentNode.classList.contains('zwrap')) e.target.parentNode.classList.toggle('vol', !!e.target.value); });
new MutationObserver(() => zoekKruis()).observe(document.documentElement, { childList: true, subtree: true });
addEventListener('scroll', () => { if (scrollSleutel) SCROLL[scrollSleutel] = window.scrollY; }, { passive: true });
function ga(tab) { const u = $('#undoBalk'); if (u) u.remove(); if (tab === 'plekken') tab = ui.plekSoort === 'kop' ? 'kwacties' : 'tafels'; if (BESTEL_OD.includes(tab) && ui.tab !== tab && !window.__E2E_ALLES) ui.modus = 'todo'; ui.tab = tab; ui.q = ''; ui.groep = ''; ui.blijf = null; render(); }
async function logout() {
  if (!ask(sess && sess.kind === 'anon' ? 'Dit toestel ontkoppelen? Daarna is de koppelcode weer nodig.' : 'Uitloggen op dit apparaat?')) return;
  sess = null; ls.del('cba-sess'); mw = null; ls.del('cba-mw'); OPEN = false; outbox = []; await iset('outbox', []); showLogin();
}
