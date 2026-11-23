// FUNZIONAMENTO OFFLINE E CONTENT-SECURITY-POLICY (revisione 2026-11, Fase A, problemi 5 e 26).
//
// Prima font (Google Fonts), SheetJS ed ExcelJS (cdnjs) e Leaflet (unpkg) arrivavano dalla rete:
// in cantiere senza campo l'app cambiava aspetto e Excel e mappe non andavano. Ora sono nel file.
// Qui si controlla che il file costruito non chieda più niente a quei server all'avvio, che le
// librerie ci siano senza rete e che la CSP sia al suo posto. La controprova è il file di prima:
// gli stessi controlli sul riferimento/ falliscono (lì le librerie sono <script src> esterni).
const fs = require('fs');
const path = require('path');
const { avviaApp } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };

const DIST = path.join(__dirname, '..', 'dist', 'DPSH.html');
const html = fs.readFileSync(DIST, 'utf8');

(async () => {
  console.log('--- Il file non chiede niente alla rete all avvio ---');
  t('nessun <link> a Google Fonts', !/<link[^>]+fonts\.(googleapis|gstatic)\.com/.test(html));
  t('nessuno <script src> esterno', !/<script[^>]+src=["']https?:/i.test(html));
  t('nessun leaflet.css o leaflet.js da unpkg', !/unpkg\.com\/leaflet@/.test(html));
  t('Manrope e JetBrains Mono incorporati in woff2', /font-family: 'Manrope'; font-style: normal; font-weight: 700;[^}]*data:font\/woff2;base64,/.test(html)
    && /font-family: 'JetBrains Mono'; font-style: normal; font-weight: 700;[^}]*data:font\/woff2;base64,/.test(html));
  t('lo stile di Leaflet è fra gli stili, con le immagini dentro', /\.leaflet-control-layers-toggle \{[^}]*data:image\/png;base64,/.test(html));

  console.log('--- Content-Security-Policy ---');
  const m = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  t('la CSP c è, nella testata', !!m && html.indexOf(m[0]) < html.indexOf('</head>'));
  const csp = {};
  if (m) m[1].split(';').forEach(r => { const p = r.trim().split(/\s+/); if (p[0]) csp[p[0]] = p.slice(1); });
  t('object-src none, base-uri none, form-action none', String(csp['object-src']) === "'none'" && String(csp['base-uri']) === "'none'" && String(csp['form-action']) === "'none'");
  t('gli script esterni ammessi sono solo unpkg (leaflet-rotate, con impronta)',
    !!csp['script-src'] && csp['script-src'].filter(v => /^https?:/.test(v)).join() === 'https://unpkg.com');
  t('i font solo dal file', !!csp['font-src'] && csp['font-src'].every(v => v === "'self'" || v === 'data:'));
  t('leaflet-rotate si carica con la sua impronta SRI', /leaflet-rotate@0\.2\.8\/dist\/leaflet-rotate\.js';\s*\n(?:\s*\/\/.*\n)*\s*script\.integrity = 'sha384-[A-Za-z0-9+/=]{64}';/.test(html));

  console.log('--- Le librerie ci sono senza rete ---');
  // app_in_jsdom non carica nessuna risorsa esterna: è proprio un telefono senza campo.
  const app = await avviaApp({ stato: null });
  t('SheetJS pronto all avvio', app.E('typeof XLSX !== "undefined" && typeof XLSX.utils.book_new === "function"') === true);
  t('ExcelJS pronto all avvio', app.E('typeof ExcelJS !== "undefined" && typeof ExcelJS.Workbook === "function"') === true);
  t('Leaflet NON eseguito all avvio (si paga solo aprendo una mappa)', app.E('typeof window.L') === 'undefined');
  let errore = null;
  try { await app.E('ensureLeafletLoaded()'); } catch (e) { errore = e; }
  t('ensureLeafletLoaded funziona senza rete', !errore && app.E('!!(window.L && L.map && L.version === "1.9.4")') === true);
  if (errore) console.log('       ', String(errore));
  t('il segnaposto predefinito usa le immagini incorporate',
    app.E('new L.Icon.Default()._getIconUrl("icon")').startsWith('data:image/png;base64,')
    && app.E('new L.Icon.Default()._getIconUrl("shadow")').startsWith('data:image/png;base64,'));
  t('una seconda chiamata non riesegue Leaflet', await app.E('(() => { const prima = window.L; return ensureLeafletLoaded().then(() => window.L === prima); })()') === true);
  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log('--- Controprova: il file di prima dipendeva dalla rete ---');
  const vecchio = fs.readFileSync(path.join(__dirname, '..', 'riferimento', 'Modulo1_integrato_2026-09-11.html'), 'utf8');
  t('il riferimento caricava SheetJS da cdnjs (il controllo sopra lo avrebbe visto)', /<script[^>]+src=["']https?:/i.test(vecchio));

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('KO eccezione: ' + (e && e.stack || e)); process.exit(1); });
