// CODICI QR: base 45, impronta, sequenza fuori ordine e con doppioni, scelta di cosa portare, foto piccole,
// andata e ritorno di un progetto vero, finestra, strumento dell'assistente.
const fs = require('fs'), path = require('path');
const { avviaApp, attesa } = require('./dati/app_in_jsdom');
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
(async () => {
  const app = await avviaApp({});
  await attesa(50);
  const w = app.w, E = app.E, d = w.document;
  // Node ha già compressione, Blob e Response: li presto alla finestra finta
  w.CompressionStream = CompressionStream; w.DecompressionStream = DecompressionStream; w.Blob = Blob; w.Response = Response;
  // base 45 e impronta
  const bytes = Uint8Array.from({ length: 1001 }, (_, i) => (i * 37 + 11) % 256);
  const b45 = E(`qrBase45Codifica(Uint8Array.from(${JSON.stringify([...bytes])}))`);
  t('base 45 usa solo caratteri da QR alfanumerico', /^[0-9A-Z $%*+\-./:]+$/.test(b45));
  t('base 45 va e torna (dispari)', JSON.stringify([...E(`qrBase45Decodifica(${JSON.stringify(b45)})`)]) === JSON.stringify([...bytes]));
  t('base 45 va e torna (pari)', E(`qrBase45Decodifica(qrBase45Codifica(Uint8Array.from([1,2,3,4]))).join()`) === '1,2,3,4');
  t('base 45 rifiuta dati rovinati', (() => { try { E(`qrBase45Decodifica('GGW')`); return false; } catch (e) { return true; } })());
  t('crc32 noto ("123456789")', E(`qrCrc32(new TextEncoder().encode('123456789'))`) === 'CBF43926');
  // progetto vero
  const prog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'esempi', 'Progetto_esempio_Nardo_con_DTM.json'), 'utf8'));
  const ids = Object.keys(prog.surveys);
  const png = 'data:image/png;base64,' + Buffer.alloc(3000, 7).toString('base64');
  ids.slice(0, 2).forEach((id, k) => { prog.surveys[id].photos = [{ id: 'photoqr_' + k, lat: 40.1, lng: 17.9, timestamp: 'x', dataUrl: png }]; });
  E(`importProjectsFromJSON(${JSON.stringify(prog)})`);
  const pid = E(`Object.keys(state.projects).find(k => state.projects[k].name === ${JSON.stringify(prog.name)})`);
  t('progetto di prova caricato', !!pid);
  // senza canvas in jsdom la miniatura è finta
  E(`qrMiniaturaFoto = async d => d ? 'data:image/jpeg;base64,AAAA' : null`);
  const p1 = await E(`qrPreparaProgetto(${JSON.stringify(pid)}, { prove: null, note: true, foto: false })`);
  t('il DTM non va nei QR', p1.lasciati.includes('dtm') && !JSON.stringify(p1.progetto).includes('"dtm"'));
  t('senza foto: le foto restano senza immagine', p1.foto === 0 && p1.fotoSenza === 4 && !JSON.stringify(p1.progetto).includes('data:image'));
  t('pochi codici per un progetto piccolo', p1.frames.length >= 1 && p1.frames.length <= 12);
  t('ogni codice sta nel limite', p1.frames.every(f => f.length < 440 && /^DPSH1:/.test(f)));
  const p2 = await E(`qrPreparaProgetto(${JSON.stringify(pid)}, { prove: [${JSON.stringify(ids[0])}], note: false, foto: true })`);
  t('scelta di una sola prova', Object.keys(p2.progetto.surveys).length === 1);
  t('senza note: niente note', p2.progetto.notes === undefined);
  t('foto piccole incluse e segnate', p2.foto === 1 && Object.values(p2.progetto.surveys)[0].photos[0].miniaturaQr === true);
  t('meno prove = meno codici', p2.frames.length <= p1.frames.length);
  // andata e ritorno: frames fuori ordine, con doppioni e un intruso
  const intruso = 'DPSH1:ZZZZ:1:3:00000000:ABC';
  const f = p1.frames.slice(); const mischiati = f.map((x, i) => [Math.sin(i * 7.7), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const r = E('qrNuovoRicevitore()');
  const es = [];
  for (const x of [...mischiati, ...mischiati.slice(0, 2), intruso, 'ciao']) es.push(r.aggiungi(x).esito);
  t('doppioni riconosciuti', es.filter(e => e === 'doppio').length === Math.min(2, mischiati.length));
  t('intruso e testo estraneo scartati', es.includes('altra-sequenza') && es.includes('non-dpsh'));
  t('sequenza completa', r.completo() && r.mancanti().length === 0);
  const letto = await r.risultato();
  t('stesso progetto all\'arrivo', letto.id === p1.progetto.id && JSON.stringify(letto.surveys) === JSON.stringify(p1.progetto.surveys));
  // un codice perso → si sa quale manca; uno rovinato → impronta
  const r2 = E('qrNuovoRicevitore()'); p1.frames.slice(1).forEach(x => r2.aggiungi(x));
  t('codice mancante segnalato', p1.frames.length === 1 || (!r2.completo() && r2.mancanti()[0] === 1));
  if (p1.frames.length > 1) {
    const r3 = E('qrNuovoRicevitore()'); const storto = p1.frames.slice(); storto[0] = storto[0].replace(/:([^:]*)$/, (m, c) => ':' + (c[0] === 'A' ? 'B' : 'A') + c.slice(1));
    storto.forEach(x => r3.aggiungi(x));
    let rifiutato = false; try { await r3.risultato(); } catch (e) { rifiutato = true; }
    t('dato rovinato: impronta lo ferma', rifiutato);
  }
  // importazione vera
  const prima = Object.keys(E('state.projects')).length;
  E('statoQr.lettore = null; statoQr.oggetto = null');
  for (const x of mischiati) await E(`qrLeggiTesto(${JSON.stringify(x)})`);
  t('lettura completa: pronto a importare', E('!!statoQr.oggetto') && !d.getElementById('btnQrImporta').disabled);
  await E('qrImportaLetto()');
  t('importato come nuovo progetto', Object.keys(E('state.projects')).length === prima + 1);
  // finestra
  E(`apriQr(${JSON.stringify(pid)}, 'mostra')`);
  await attesa(120);
  t('finestra aperta con le prove da scegliere', d.getElementById('modalQr').classList.contains('open') && d.querySelectorAll('#qrScelte input[data-prova]').length === ids.length);
  t('riepilogo con numero di codici', /codici/.test(d.getElementById('qrRiepilogo').textContent) && !d.getElementById('btnQrAvvia').disabled);
  d.querySelectorAll('#qrScelte input[data-prova]').forEach(i => { i.checked = false; i.dispatchEvent(new w.Event('change', { bubbles: true })); });
  await attesa(60);
  t('nessuna prova: non si parte', d.getElementById('btnQrAvvia').disabled);
  d.querySelector('#qrScelte input[data-prova]').checked = true; d.querySelector('#qrScelte input[data-prova]').dispatchEvent(new w.Event('change', { bubbles: true }));
  await attesa(120);
  d.getElementById('btnQrAvvia').click(); await attesa(150);
  t('parte il primo codice (SVG)', !d.getElementById('qrSchermo').hidden && d.getElementById('qrFigura').innerHTML.includes('<svg') && /1 \//.test(d.getElementById('qrContatore').textContent));
  d.getElementById('btnQrFerma').click();
  t('Ferma spegne i codici', d.getElementById('qrSchermo').hidden);
  E('chiudiQr()');
  t('finestra chiusa', !d.getElementById('modalQr').classList.contains('open'));
  // assistente e palette
  const st = await E(`AI_STRUMENTI.find(x => x.n === 'qr_progetto').run({ azione: 'stima', progetto_id: ${JSON.stringify(pid)}, foto: true })`);
  t('IA stima i codici', st.codici >= 1 && st.fotoPiccole === 4);
  const mo = await E(`AI_STRUMENTI.find(x => x.n === 'qr_progetto').run({ azione: 'mostra', progetto_id: ${JSON.stringify(pid)}, prove_ids: [${JSON.stringify(ids[0])}], note: false })`);
  t('IA mostra: finestra aperta e codici in corso', mo.inCorso === true && !d.getElementById('qrSchermo').hidden);
  E('chiudiQr()');
  const le = await E(`AI_STRUMENTI.find(x => x.n === 'qr_progetto').run({ azione: 'leggi' })`);
  t('IA leggi: apre il lettore', le.aperto === true && !d.getElementById('qrPannelloLeggi').hidden);
  E('chiudiQr()');
  t('comandi in palette', E(`comandiPc().filter(c => /QR/.test(c[1])).length`) >= 1);
  t('pulsante Leggi QR in Home', !!d.getElementById('btnHomeQr'));
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
