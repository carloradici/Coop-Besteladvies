/* 2.29: Excel-bestanden van buiten lezen in een aparte worker: een kwaadaardig bestand kan zo niet bij de app of de inlog. */
importScripts('xlsx.full.min.js');
onmessage = e => { try { const wb = XLSX.read(e.data.buf, e.data.o || {}); postMessage({ rows: XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], e.data.j || {}) }); } catch (x) { postMessage({ fout: String((x && x.message) || x) }); } };
