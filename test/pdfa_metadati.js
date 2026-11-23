// PDF/A-2b: lo scrittore (071i1) con pagine finte. Si controllano i requisiti che si vedono nei byte:
// XMP con pdfaid, OutputIntent con profilo ICC, ID nel trailer, caratteri incorporati, niente
// cifratura né trasparenze. Se c'è veraPDF (VERAPDF_CP o /tmp/claude-0/vera/lib) si valida davvero.
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { avviaApp } = require('./dati/app_in_jsdom');
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
(async () => {
  const app = await avviaApp({ stato: null });
  const out = await app.E(`(async () => {
    const fonti = fontIncorporatiPerPdfA(document);
    const s = await creaScrittorePdfA({ titolo: 'Prova & <test>', autore: 'Io', produttore: 'DPSH', creatore: 'DPSH' }, fonti);
    const cal = await s.fonte('Calibri', 400, false), bold = await s.fonte('Arial', 700, true);
    const rgb = new Uint8Array(4 * 4 * 3).fill(120);
    await s.pagina(794, 1123, [
      { t: 'r', x: 50, y: 50, w: 200, h: 50, col: '#ffe4a0' },
      { t: 'l', x1: 50, y1: 120, x2: 300, y2: 120, sp: 1, col: '#000000' },
      { t: 's', txt: 'Prova N° 1 èàù €', x: 60, base: 80, size: 16, font: cal, col: '#112233' },
      { t: 's', txt: 'Grassetto corsivo', x: 60, base: 150, size: 14, font: bold, col: '#000000' },
      { t: 'i', x: 300, y: 200, w: 100, h: 100, chiave: 'a', img: { rgb, w: 4, h: 4 } }
    ], {});
    const b = await s.chiudi();
    return { n: s.pagine(), nFonti: fonti.length, b64: btoa(Array.from(b, c => String.fromCharCode(c)).join('')) };
  })()`);
  const bytes = Buffer.from(out.b64, 'base64');
  const txt = bytes.toString('latin1');
  t('trovati i font incorporati dell\'app', out.nFonti >= 16);
  t('una pagina, intestazione PDF', out.n === 1 && txt.startsWith('%PDF-1.'));
  t('XMP: pdfaid part 2 conformance B', /<pdfaid:part>2<\/pdfaid:part>/.test(txt) && /<pdfaid:conformance>B<\/pdfaid:conformance>/.test(txt));
  t('XMP non compresso, tipo Metadata/XML e titolo con caratteri speciali protetti', /\/Type \/Metadata/.test(txt) && /\/Subtype \/XML/.test(txt) && /Prova &amp; &lt;test&gt;/.test(txt));
  t('OutputIntent GTS_PDFA1 con DestOutputProfile ICC a 3 componenti', /\/S \/GTS_PDFA1/.test(txt) && /\/DestOutputProfile \d+ 0 R/.test(txt) && /\/N 3/.test(txt));
  t('ID nel trailer (due uguali)', /\/ID \[\s*<([0-9a-f]{32})>\s*<\1>\s*\]/.test(txt));
  t('caratteri incorporati (FontFile2), nessun font standard', /\/FontFile2/.test(txt) && !/\/BaseFont \/(Helvetica|Times|Courier)/.test(txt));
  t('nessuna cifratura, nessuna trasparenza, nessun JavaScript', !/\/Encrypt/.test(txt) && !/\/SMask|\/CA [\d.]|\/ca [\d.]/.test(txt) && !/\/JavaScript|\/JS /.test(txt));
  const cp = process.env.VERAPDF_CP || '/tmp/claude-0/vera/lib/*';
  if (fs.existsSync(path.dirname(cp))) {
    const f = path.join(os.tmpdir(), 'dpsh_pdfa_test.pdf');
    fs.writeFileSync(f, bytes);
    const r = spawnSync('java', ['-cp', cp, 'org.verapdf.apps.GreenfieldCliWrapper', '--flavour', '2b', f], { encoding: 'utf8' });
    t('veraPDF: conforme a PDF/A-2b', /isCompliant="true"/.test(r.stdout || ''));
  } else console.log('  (veraPDF non presente: validazione completa saltata)');
  app.chiudi();
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
