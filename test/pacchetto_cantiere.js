// ESPORTA CANTIERE (044d): il pacchetto ZIP. jsdom non impagina, quindi PDF/A e Word sono finti
// (generatoriPacchetto); Excel, KMZ, foto e dati sono quelli veri.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const $ = (app, id) => app.d.getElementById(id);
(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) app.dialogo().ok.click();
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  app.E(`openProject(${JSON.stringify(pid)})`);
  await attesa(80);
  t('il pulsante «Esporta cantiere» è nella Consegna', !!$(app, 'btnOptEsportaCantiere') && /Esporta cantiere/.test($(app, 'btnOptEsportaCantiere').textContent));
  app.E(`generatoriPacchetto.documentoReport = async () => ({ html: '<html></html>', titolo: 'T' });
    generatoriPacchetto.pdfaEWord = async (d, q, s, avanza) => { avanza('pdfa', 'x', 1); return { pdfa: { bytes: new Uint8Array([37, 80, 68, 70]), pagine: 1, mancanti: 0 }, word: { bytes: new Uint8Array([80, 75]), pagine: 1 } }; }`);
  const avanzamenti = [];
  app.w.__av = (t, q) => avanzamenti.push(q);
  const r = await app.E(`costruisciPacchettoProgetto(${JSON.stringify(pid)}, { onAvanzamento: window.__av })`);
  const nomi = Array.from(r.voci, v => v.name);
  t('c\'è il PDF/A', nomi.some(n => /_Report\.pdf$/.test(n)));
  t('c\'è il Word', nomi.some(n => /_Report\.docx$/.test(n)));
  t('c\'è l\'Excel vero', nomi.some(n => /_Registro\.xlsx$/.test(n)) && r.voci.find(v => /\.xlsx$/.test(v.name)).bytes[0] === 0x50);
  t('foto con una cartella per prova', nomi.filter(n => /^Foto\/Prova_[^/]+\/[^/]+\.(png|jpe?g)$/.test(n)).length === 3);
  t('progetto.json, librerie.json e LEGGIMI.txt', ['progetto.json', 'librerie.json', 'LEGGIMI.txt'].every(n => nomi.includes(n)));
  const prog = JSON.parse(Buffer.from(r.voci.find(v => v.name === 'progetto.json').bytes).toString('utf8'));
  t('il JSON del progetto punta alle foto dello ZIP', Object.values(prog.surveys).flatMap(s => s.photos || []).filter(p => p.zipFile).every(p => nomi.includes(p.zipFile)));
  t('la barra va da 0 a 1 senza tornare indietro', avanzamenti.length > 3 && avanzamenti.every((q, i) => i === 0 || q >= avanzamenti[i - 1] - 1e-9) && avanzamenti[avanzamenti.length - 1] === 1);
  // Un pezzo che fallisce non butta via il resto, e si dice nel LEGGIMI
  app.E(`generatoriPacchetto.pdfaEWord = async () => ({ pdfaErrore: new Error('memoria'), word: { bytes: new Uint8Array([80, 75]), pagine: 1 } })`);
  const r2 = await app.E(`costruisciPacchettoProgetto(${JSON.stringify(pid)}, { salta: { excel: true, kmz: true, foto: true } })`);
  const n2 = Array.from(r2.voci, v => v.name);
  t('PDF/A fallito: il Word c\'è e il motivo è nel LEGGIMI', !n2.some(n => /\.pdf$/.test(n)) && n2.some(n => /\.docx$/.test(n)) && /memoria/.test(Buffer.from(r2.voci.find(v => v.name === 'LEGGIMI.txt').bytes).toString('utf8')) && r2.note.length === 1);
  // Annullare
  const c = new app.w.AbortController(); c.abort();
  app.w.__c = c;
  let annullato = false;
  try { await app.E(`costruisciPacchettoProgetto(${JSON.stringify(pid)}, { segnale: window.__c.signal })`); } catch (e) { annullato = e.name === 'AbortError'; }
  t('annullare ferma tutto', annullato);
  app.chiudi();
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
