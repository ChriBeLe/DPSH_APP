// MAPPE OFFLINE (071za): le tessere di una zona si scaricano con la rete (servita qui da un finto fetch),
// restano in IndexedDB e la mappa le usa senza rete. Si controlla: il conto delle tessere, il riquadro
// attorno alle prove, il download (anche con un'area che ne condivide un'altra), l'annullo che non lascia
// niente, il servizio che rifiuta, Google escluso, la tessera salvata al posto della rete, il GeoPackage di
// tessere, la finestra e gli strumenti dell'assistente.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  app.E(`openProject(${JSON.stringify(pid)}); switchView('project')`);
  app.E(`(() => { const s = Object.values(state.projects[${JSON.stringify(pid)}].surveys)[0]; s.header.lat = 40.19690; s.header.lng = 17.99320; })()`);

  // Il finto servizio delle tessere: ogni richiesta una JPEG finta di 64 byte (inizia con FF D8), con l'elenco delle richieste.
  const richieste = [];
  let modo = 'ok';
  app.w.fetch = async (url) => {
    richieste.push(String(url));
    if (modo === 'rifiuta') throw new Error('CORS');
    const b = new Uint8Array(64); b[0] = 0xFF; b[1] = 0xD8; b[2] = richieste.length & 255;
    return { ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => b.buffer };
  };
  const conta = async () => app.E('(async () => (await moRichiesta("tessere", "readonly", s => s.getAll())).length)()');

  console.log('--- Il conto e il riquadro ---');
  const n1 = app.E('moTessereDi({ sud: 40.1968, nord: 40.1970, ovest: 17.9930, est: 17.9934 }, 15, 15).length');
  t(`un riquadro piccolo a zoom 15 sta in 1-2 tessere (${n1})`, n1 >= 1 && n1 <= 2);
  t('più zoom, più tessere', app.E('moTessereDi({ sud: 40.1968, nord: 40.1970, ovest: 17.9930, est: 17.9934 }, 15, 19).length') > n1);
  const rq = app.E(`moRiquadroProve(state.projects[${JSON.stringify(pid)}], 300)`);
  t('il riquadro attorno alle prove è allargato di circa 300 m (0,0027° di latitudine)', rq && Math.abs((rq.nord - rq.sud) - 0.0054) < 0.002 && rq.sud < 40.1969 && rq.nord > 40.1969);
  t('senza prove col GPS non c\'è riquadro', app.E('moRiquadroProve({ surveys: {} }, 300)') === null);

  console.log('--- Il download ---');
  const riq = { sud: 40.1968, nord: 40.1970, ovest: 17.9930, est: 17.9934 };
  const g = await app.E(`moScarica({ nome: 'Google', fonteId: 'google-satellite', riquadro: ${JSON.stringify(riq)}, zmin: 17, zmax: 19 })`);
  t('Google non si scarica e non parte nessuna richiesta', /Google/.test(g.errore) && richieste.length === 0);
  const e1 = await app.E(`moScarica({ nome: 'Cantiere', fonteId: 'esri-satellite', riquadro: ${JSON.stringify(riq)}, zmin: 17, zmax: 19 })`);
  const nAtteso = app.E(`moTessereDi(${JSON.stringify(riq)}, 17, 19).length`);
  t(`scaricate le ${nAtteso} tessere (${e1.area && e1.area.n}), salvate e senza errori`, e1.area && e1.area.n === nAtteso && e1.area.errori === 0 && await conta() === nAtteso && richieste.length === nAtteso);
  t('l\'indirizzo chiesto è quello di Esri, con z/y/x', /arcgisonline\.com\/.*\/tile\/\d+\/\d+\/\d+$/.test(richieste[0]));
  t('l\'area è nell\'elenco', (await app.E('moAree()')).length === 1);
  const prima = richieste.length;
  const e2 = await app.E(`moScarica({ nome: 'Doppia', fonteId: 'esri-satellite', riquadro: ${JSON.stringify(riq)}, zmin: 17, zmax: 18 })`);
  t('un\'area sulla stessa zona non richiede di nuovo le tessere', e2.area && richieste.length === prima);
  await app.E(`moEliminaArea(${JSON.stringify(e1.area.id)})`);
  t('tolta la prima area restano le tessere della seconda (zoom 17-18)', await conta() === app.E(`moTessereDi(${JSON.stringify(riq)}, 17, 18).length`));
  await app.E(`moEliminaArea(${JSON.stringify(e2.area.id)})`);
  t('tolta anche l\'ultima non resta niente', await conta() === 0 && (await app.E('moAree()')).length === 0);

  console.log('--- Quando non va ---');
  modo = 'rifiuta';
  const ko1 = await app.E(`moScarica({ nome: 'No', fonteId: 'esri-satellite', riquadro: ${JSON.stringify(riq)}, zmin: 17, zmax: 19 })`);
  t('il servizio che rifiuta: si ferma dopo le prime tessere, lo dice e non lascia niente', /non si lascia salvare/.test(ko1.errore) && await conta() === 0 && (await app.E('moAree()')).length === 0);
  modo = 'ok';
  const prima2 = richieste.length;
  const enorme = await app.E(`moScarica({ nome: 'Enorme', fonteId: 'esri-satellite', riquadro: { sud: 40, nord: 41, ovest: 17, est: 18 }, zmin: 10, zmax: 19 })`);
  t('una zona enorme è rifiutata prima di scaricare', /Troppe tessere/.test(enorme.errore) && richieste.length === prima2);
  const lento = app.E(`moScarica({ nome: 'Annullata', fonteId: 'esri-satellite', riquadro: ${JSON.stringify(riq)}, zmin: 17, zmax: 19 })`);
  app.E('mappeOffline.scarico.annulla = true');
  const ea = await lento;
  t('l\'annullo non lascia niente di nuovo', ea.annullato && await conta() === 0 && (await app.E('moAree()')).length === 0);
  t('finito il download si può rifare', app.E('mappeOffline.scarico') === null);

  console.log('--- La mappa usa le tessere salvate ---');
  const e3 = await app.E(`moScarica({ nome: 'Per la mappa', fonteId: 'esri-satellite', riquadro: ${JSON.stringify(riq)}, zmin: 18, zmax: 18 })`);
  const kSalvata = app.E('moDaChiave("esri-satellite|18|1|2")');
  t('la chiave si rilegge da destra', kSalvata.z === 18 && kSalvata.x === 1 && kSalvata.y === 2 && app.E('moDaChiave("wms|http://a?b|0|18|5|6")').x === 5);
  const [z, x, y] = app.E(`moTessereDi(${JSON.stringify(riq)}, 18, 18)[0]`);
  const falso = app.E(`({ _tileOnLoad() {}, _tileOnError() {}, getTileUrl: () => 'https://rete.test/tessera' })`);
  app.w.__falso = falso;
  app.w.L = { DomEvent: { on: (el, tipo, f) => el.addEventListener(tipo, f) }, Util: { bind: (f, o, ...a) => f.bind(o, ...a) } };
  const tessera = (zz, xx, yy) => app.E(`moRendiOffline(__falso, 'esri-satellite').createTile({ z: ${zz}, x: ${xx}, y: ${yy} }, () => {})`);
  const salvata = tessera(z, x, y), mancante = tessera(3, 1, 1);
  await attesa(80);
  t('la tessera salvata si carica dal database, non dalla rete', /^blob:test-/.test(salvata.src));
  t('una tessera non salvata chiede alla rete', mancante.src === 'https://rete.test/tessera');

  console.log('--- GeoPackage di tessere (QGIS) ---');
  const area = (await app.E('moAree()'))[0];
  const gp = await app.E(`moGeopackage(${JSON.stringify(area)})`);
  const testo = Buffer.from(gp).toString('latin1');
  t('è un file SQLite GeoPackage (GPKG, versione 1.3)', testo.startsWith('SQLite format 3') && new DataView(gp.buffer).getUint32(68) === 0x47504B47);
  t('ha le tabelle di tessere dello standard', ['gpkg_tile_matrix_set', 'gpkg_tile_matrix', 'tiles', 'EPSG', 'Pseudo-Mercator'].every(s => testo.includes(s)));
  t('contiene le tessere (JPEG)', gp.length > 65536 * 2 && Buffer.from(gp).includes(Buffer.from([0xFF, 0xD8])));
  t('senza tessere non esporta', await app.E(`moGeopackage({ nome: 'x', fonteNome: 'y', chiavi: [] }).then(() => 'ok', e => e.message)`) === 'Nessuna tessera salvata per questa area.');

  console.log('--- La finestra ---');
  app.E('apriMappeOffline()');
  await attesa(80);
  t('si apre con le aree salvate', !$(app, 'mappeOffline').hidden && /Per la mappa/.test($(app, 'moAree').textContent));
  t('«attorno alle prove» è scelta e il conto è scritto', $(app, 'moZona').value === 'prove' && /tessere/.test($(app, 'moConto').textContent));
  t('Google non è tra le mappe da scaricare', ![...$(app, 'moFonte').options].some(o => /google/i.test(o.value)));
  $(app, 'moNome').value = 'Da finestra';
  clic(app, $(app, 'moScarica'));
  await attesa(50);
  t('durante il download si vede la barra e il tasto Annulla', !$(app, 'moAvanzamento').hidden && !$(app, 'moAnnulla').hidden && $(app, 'moScarica').hidden);
  for (let i = 0; i < 100 && app.E('mappeOffline.scarico'); i++) await attesa(100);
  await attesa(200);
  t('«Scarica» salva l\'area e dice che funziona senza rete', (await app.E('moAree()')).length === 2 && /senza rete/.test($(app, 'moEsito').textContent));
  clic(app, $(app, 'moAree').querySelector('[data-mo="gpkg"]'));
  for (let i = 0; i < 100 && !app.scaricati.some(s => /\.gpkg$/.test(s.nome)); i++) await attesa(100);
  t('«GeoPackage» scarica un .gpkg', app.scaricati.some(s => /^DPSH_mappa_.*\.gpkg$/.test(s.nome)));
  clic(app, $(app, 'moAree').querySelector('[data-mo="elimina"]'));
  await attesa(60);
  t('«Elimina» chiede conferma', !!app.dialogo());
  clic(app, app.dialogo().ok);
  await attesa(200);
  t('confermata, l\'area sparisce', (await app.E('moAree()')).length === 1);
  app.d.dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  t('Esc chiude la finestra', $(app, 'mappeOffline').hidden);
  t('il comando c\'è nella palette', app.E("comandiPc().some(c => c[1] === 'Mappe offline' && c[3])"));

  console.log('--- L\'assistente IA ---');
  const T = n => `AI_STRUMENTI.find(x => x.n === '${n}')`;
  const el = await app.E(`${T('mappe_offline_elenco')}.run({})`);
  t('«mappe_offline_elenco» elenca aree e mappe (senza Google)', el.aree.length === 1 && el.mappeScaricabili.some(m => m.id === 'esri-satellite') && !el.mappeScaricabili.some(m => /google/.test(m.id)));
  const sc = await app.E(`${T('mappe_offline_scarica')}.run({ nome: 'Da IA', zoom_da: 18, zoom_a: 18, margine_m: 50 })`);
  t('«mappe_offline_scarica» scarica attorno alle prove', sc.ok && sc.tessere > 0 && (await app.E('moAree()')).length === 2);
  let msg = '';
  try { await app.E(`${T('mappe_offline_scarica')}.run({ zona: 'vista' })`); } catch (e) { msg = e.message; }
  t('«vista» senza la mappa aperta lo dice', /mappa 2D/.test(msg));
  await app.E(`${T('mappe_offline_geopackage')}.run({ area_id: ${JSON.stringify(sc.area_id)} })`);
  t('«mappe_offline_geopackage» esporta', app.scaricati.filter(s => /\.gpkg$/.test(s.nome)).length === 2);
  t('chiedono conferma le due che scaricano', app.E(`${T('mappe_offline_scarica')}.w === true && ${T('mappe_offline_geopackage')}.w === true && !${T('mappe_offline_elenco')}.w`));
  t('nessuno strumento elimina le mappe', !app.E('AI_STRUMENTI.map(s => s.n)').some(n => /mappe_offline.*(elimin|cancell)/.test(n)));

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('ERRORE', e); process.exit(2); });
