// FOTO IN INGRESSO: RADDRIZZA E COMPRIMI (072a). jsdom non ha una tela vera: si prova la logica
// (EXIF, matrici, decisioni) e si sostituisce solo il disegno con un finto (dipendenzeFoto).
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa } = require('./dati/app_in_jsdom');
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
(async () => {
  const app = await avviaApp({ stato: null });
  const jpg = fs.readFileSync(path.join(__dirname, 'dati', 'foto_orientamento_6.jpg'));
  const buf = jpg.buffer.slice(jpg.byteOffset, jpg.byteOffset + jpg.length);
  app.w.__buf = new app.w.Uint8Array(buf).buffer;
  const E = (c) => app.E(c);
  t('orientamento EXIF 6 letto dal file', E('orientamentoExifJpeg(window.__buf)') === 6);
  const dim = E('dimensioniJpeg(window.__buf)');
  t('dimensioni grezze 240x120', dim.w === 240 && dim.h === 120);
  t('GPS e data letti PRIMA, dal file com\'era', (() => { const d = E('parseExifData(window.__buf)'); return Math.abs(d.lat - 41.89) < 1e-6 && Math.abs(d.lng - 12.4916667) < 1e-4 && d.dateTimeOriginal === '2026:11:20 10:30:00'; })());
  const p6 = E('pianoFoto(6, 3600, 2400, 2560)');
  t('rotazione 6: dimensioni scambiate e lato lungo 2560', p6.larghezza === 1707 && p6.altezza === 2560 && [0, 0.7111, -0.7111, 0, 1706.67, 0].every((v, i) => Math.abs(p6.matrice[i] - v) < 0.01));
  const p1 = E('pianoFoto(1, 1000, 500, 2560)');
  t('foto piccola: nessun ridimensionamento', p1.scala === 1 && p1.larghezza === 1000 && p1.altezza === 500);
  t('orientamenti 5-8 scambiano, 1-4 no', [1, 2, 3, 4].every(o => E(`pianoFoto(${o}, 300, 200, 2560)`).larghezza === 300) && [5, 6, 7, 8].every(o => E(`pianoFoto(${o}, 300, 200, 2560)`).larghezza === 200));

  // Decisioni, con un disegno finto
  const prova = async (orient, leggera, tipo) => {
    app.w.__esito = null;
    E(`dipendenzeFoto = { decodifica: async () => ({ sorgente: {}, w: 240, h: 120, giaOrientata: false, chiudi() {} }), disegna: async () => 'data:image/jpeg;base64,' + 'A'.repeat(${leggera ? 100 : 100000}) }`);
    const f = new app.w.File([jpg], 'IMG_1.jpg', { type: tipo || 'image/jpeg' });
    app.w.__f = f;
    const orig = 'data:image/jpeg;base64,' + 'B'.repeat(4000);
    app.w.__orig = orig;
    return await E('preparaFotoImportataDettaglio(window.__f, window.__buf, window.__orig)');
  };
  let r = await prova(6, true);
  t('foto ruotata: si salva quella raddrizzata', r.cambiata && r.raddrizzata && r.dataUrl !== app.w.__orig);
  r = await prova(6, false);
  t('ruotata ma più pesante: si tiene lo stesso (serve raddrizzarla)', r.cambiata && r.raddrizzata);
  // senza rotazione: JPEG senza EXIF
  app.w.__buf = new app.w.Uint8Array([0xFF, 0xD8, 0xFF, 0xD9]).buffer;
  r = await prova(1, false);
  t('non ruotata e risultato più pesante: resta l\'originale', !r.cambiata && r.dataUrl === app.w.__orig);
  r = await prova(1, true);
  t('non ruotata e più leggera: si comprime', r.cambiata && !r.raddrizzata);
  r = await prova(1, true, 'application/pdf');
  t('formato non foto: invariato', !r.cambiata);
  E('dipendenzeFoto = { decodifica: async () => { throw new Error("no"); }, disegna: null }');
  r = await E('preparaFotoImportataDettaglio(window.__f, window.__buf, window.__orig)');
  t('errore di decodifica: la foto entra com\'era', !r.cambiata && r.dataUrl === app.w.__orig);
  E('dipendenzeFoto = null');
  app.chiudi();
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
