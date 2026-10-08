// SEZIONI TRACCIATE (vista 3D, scheda «Sezioni»): tracce disegnate con due clic o a griglia, coi
// nomi A-A', B-B', 1-1'; salvate nel progetto in gradi; la sezione lungo la traccia (terreno,
// strati del modello solido, prove vicine); il PDF (sezione + vista dal satellite); il GeoPackage,
// che qui si apre con SQLite vero (Python) per vedere che è un file valido.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  app.w.HTMLCanvasElement.prototype.getContext = () => null;
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const idNardo = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const P = `state.projects[${JSON.stringify(idNardo)}]`;
  app.E(`openProject(${JSON.stringify(idNardo)}); switchView('project')`);
  // Tre prove col GPS non in fila: c'è il modello solido.
  app.E(`(() => { const s = Object.values(${P}.surveys).find(s => s.header.provaNr == '3'); s.header.lat = 40.19690; s.header.lng = 17.99320; })()`);
  app.E('apriVista3d()');
  const svg = () => { const div = app.d.createElement('div'); div.innerHTML = app.E('svgDaScena(ultimaScena3d)'); return div.firstElementChild; };

  console.log('--- Tracciare ---');
  t('la scheda «Sezioni» c\'è, con traccia, griglia, fascia, PDF e GeoPackage', !!app.d.querySelector('[data-scheda3d="sezioni"]') && ['btnTracciaSezione3d', 'btnCreaGriglia3d', 'numFasciaSezione3d', 'btnPdfSezioni3d', 'btnGpkgSezioni3d'].every(id => $(app, id)));
  // Due clic sulla figura vista dall'alto (senza animazione: la si mette lì).
  clic(app, $(app, 'btnTracciaSezione3d'));
  app.E('vista3d.el = Math.PI / 2; vista3d.az = 0; renderVista3d()');
  t('«Traccia una sezione» mette la vista dall\'alto, senza prospettiva', app.E('!!vista3d.disegno') && app.E('vista3d.prospettiva') === false && $(app, 'btnTracciaSezione3d').getAttribute('aria-pressed') === 'true');
  const W = app.E('ultimaScena3d.W'), H = app.E('ultimaScena3d.H');
  const box = $(app, 'graficoVista3d');
  const canvasRect = () => ({ left: 0, top: 0, right: W, bottom: H, width: W, height: H, x: 0, y: 0 });
  box.querySelector('canvas').getBoundingClientRect = canvasRect;
  app.E('vista3d.mosso = 0');
  box.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true, clientX: W / 2 - 150, clientY: H / 2 }));
  box.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true, clientX: W / 2 + 150, clientY: H / 2 }));
  const tracce = () => app.E(`${P}.sezioniTracciate || []`);
  const a = tracce()[0];
  t(`due clic: una traccia «A-A'», salvata in gradi (${a && a.nome})`, tracce().length === 1 && a.nome === "A-A'" && Math.abs(a.a.lat - a.b.lat) < 1e-4 && a.b.lng > a.a.lng && !app.E('vista3d.disegno'));
  const lung = app.E(`tracciaInScena(datiVista3dCorrenti, ${P}.sezioniTracciate[0]).L`), atteso = 300 / app.E('ultimaScena3d.k');
  t(`dall'alto, lunga quanto i pixel tra i clic diviso la scala (${lung.toFixed(1)} m)`, Math.abs(lung - atteso) < 0.01);
  t('nella figura: la linea e i nomi A e A\' agli estremi', svg().querySelectorAll('.vista3d-traccia').length > 10 && [...svg().querySelectorAll('.vista3d-traccia-nome')].map(e => e.textContent).join() === "A,A'");

  console.log('--- Griglia ---');
  $(app, 'numGrigliaDir3d').value = '90'; $(app, 'numGrigliaPasso3d').value = '20'; $(app, 'numGrigliaN3d').value = '3'; $(app, 'chkGrigliaIncrociata3d').checked = true;
  clic(app, $(app, 'btnCreaGriglia3d'));
  t(`griglia 3 + 3 di traverso: ${tracce().map(x => x.nome).join(', ')}`, tracce().map(x => x.nome).join() === "A-A',B-B',C-C',D-D',1-1',2-2',3-3'");
  const dist = app.E(`(() => { const d = datiVista3dCorrenti, s = ${P}.sezioniTracciate.slice(1, 3).map(x => tracciaInScena(d, x)); return Math.abs(s[1].a[1] - s[0].a[1]); })()`);
  t(`le parallele distano il passo (${dist.toFixed(2)} m)`, Math.abs(dist - 20) < 0.01);
  t('l\'elenco ha una riga per traccia, col nome da cambiare', app.d.querySelectorAll('#elencoSezioni3d [data-id]').length === 7);
  const campo = app.d.querySelector('#elencoSezioni3d [data-id] [data-nome-sezione]');
  campo.value = "X-X'"; campo.dispatchEvent(new app.w.Event('change', { bubbles: true }));
  t('il nome si cambia e la figura lo scrive', tracce()[0].nome === "X-X'" && [...svg().querySelectorAll('.vista3d-traccia-nome')].some(e => e.textContent === 'X'));

  console.log('--- La sezione lungo la traccia ---');
  // Una traccia che passa per la prova 1 e la prova 3.
  app.E(`(() => { const S = Object.values(${P}.surveys), p1 = S.find(s => s.header.provaNr == '1').header, p3 = S.find(s => s.header.provaNr == '3').header;
    ${P}.sezioniTracciate.push({ id: 'sez_prova', nome: "P-P'", a: { lat: +p1.lat, lng: +p1.lng }, b: { lat: +p3.lat, lng: +p3.lng } }); renderElencoSezioni3d(); })()`);
  const ds = app.E(`(() => { const r = datiSezioneTracciata(datiVista3dCorrenti, ${P}.sezioniTracciate.find(x => x.id === 'sez_prova'), 25);
    return { L: r.L, prove: r.prove.map(q => [nomeDpsh(q.p.s), +q.s.toFixed(2), +q.lato.toFixed(2)]), conStrati: r.campioni.filter(c => c.col).length, n: r.campioni.length, so: !!r.so }; })()`);
  t(`le prove sulla traccia: ${JSON.stringify(ds.prove)}`, ds.prove.length >= 2 && ds.prove[0][0] === 'DPSH 1' && ds.prove[0][1] === 0 && ds.prove.some(q => q[0] === 'DPSH 3' && Math.abs(q[1] - ds.L) < 0.01 && q[2] < 0.01));
  t(`gli strati del modello dove la traccia è dentro il perimetro delle prove (${ds.conStrati} campioni su ${ds.n})`, ds.so && ds.conStrati > 100);
  clic(app, app.d.querySelector('#elencoSezioni3d [data-id="sez_prova"] [data-vedi-sezione]'));
  const vista = $(app, 'vistaSezioneTracciata');
  t('«Vedi»: la sezione sotto l\'elenco, con P e P\', le prove, gli strati e la legenda', !!vista.querySelector('svg') && /P'/.test(vista.textContent) && /DPSH 1/.test(vista.textContent) && vista.querySelectorAll('polygon').length > 0 && /Esagerazione verticale ×\d+/.test(vista.textContent));
  $(app, 'numFasciaSezione3d').value = '0'; $(app, 'numFasciaSezione3d').dispatchEvent(new app.w.Event('input'));
  t('la fascia decide quali prove entrano (a 0 m, solo quelle sulla linea)', !/DPSH 2/.test(vista.textContent) && /DPSH 1/.test(vista.textContent));
  $(app, 'numFasciaSezione3d').value = '25'; $(app, 'numFasciaSezione3d').dispatchEvent(new app.w.Event('input'));
  const scelte = () => [...vista.querySelectorAll('[data-prova-sezione]')];
  t(`le prove vicine si scelgono una per una: ${scelte().map(c => c.parentNode.textContent.trim()).join(' · ')}`, scelte().length >= 2 && scelte().every(c => c.checked));
  const due = scelte().find(c => /DPSH 2/.test(c.parentNode.textContent));
  due.checked = false; due.dispatchEvent(new app.w.Event('change', { bubbles: true }));
  t('tolta la DPSH 2: non è più nel disegno (e la scelta resta nella traccia)', !/DPSH 2/.test(vista.querySelector('svg').textContent) && /DPSH 1/.test(vista.querySelector('svg').textContent)
    && app.E(`${P}.sezioniTracciate.find(x => x.id === 'sez_prova').escluse.length`) === 1 && scelte().some(c => !c.checked));

  console.log('--- PDF ---');
  const pagina = app.E(`paginaPdfSezione(${P}, datiVista3dCorrenti, ${P}.sezioniTracciate.find(x => x.id === 'sez_prova'))`);
  t('una pagina per sezione: titolo, la sezione, la vista dal satellite con la traccia (niente riquadro dei dati)', /<h1>Sezione P-P'<\/h1>/.test(pagina) && /class="sezione-tracciata"/.test(pagina) && /data-mappa-inquadramento/.test(pagina)
    && /server\.arcgisonline\.com|arcgisonline/.test(pagina) && /<line [^>]*stroke="#ef4444"/.test(pagina) && !/<table/.test(pagina));
  const numeri = [...pagina.matchAll(/font-size="13" font-weight="700"[^>]*>([^<]+)<\/text>/g)].map(m => m[1]);
  t(`sulla vista dal satellite tutte le prove col solo numero: ${numeri.join(', ')}`, numeri.length >= 3 && numeri.every(n => /^\w+$/.test(n)) && !/DPSH \d/.test(pagina.split('data-mappa-inquadramento')[1]));

  console.log('--- GeoPackage ---');
  app.E(`${P}.disegni = [{ id: 'd1', tipo: 'poligono', nome: 'Recinto', colore: '#22c55e', punti: [{ lat: 40.197, lng: 17.992 }, { lat: 40.197, lng: 17.993 }, { lat: 40.198, lng: 17.993 }] }, { id: 'd2', tipo: 'punto', nome: 'Pozzo', colore: '#3b82f6', punti: [{ lat: 40.1975, lng: 17.9925 }] }]`);
  const n0 = app.scaricati.length;
  clic(app, $(app, 'btnGpkgSezioni3d'));
  await attesa(30);
  const file = app.scaricati[app.scaricati.length - 1];
  t('si scarica «Sezioni_….gpkg»', app.scaricati.length === n0 + 1 && /^Sezioni_.*\.gpkg$/.test(file.nome));
  const dove = path.join(os.tmpdir(), 'dpsh_test_' + process.pid + '.gpkg');
  fs.writeFileSync(dove, Buffer.from(await file.blob.arrayBuffer()));
  const py = `
import sqlite3, struct, sys, json
c = sqlite3.connect(sys.argv[1])
r = {}
r['integrity'] = c.execute('PRAGMA integrity_check').fetchone()[0]
r['app_id'] = c.execute('PRAGMA application_id').fetchone()[0]
r['user_version'] = c.execute('PRAGMA user_version').fetchone()[0]
r['tabelle'] = sorted(x[0] for x in c.execute("select name from sqlite_master where type='table'"))
r['srs'] = [x[0] for x in c.execute('select srs_id from gpkg_spatial_ref_sys order by srs_id')]
r['contents'] = [list(x) for x in c.execute('select table_name, data_type, srs_id from gpkg_contents')]
r['geomcol'] = [list(x) for x in c.execute('select table_name, column_name, geometry_type_name from gpkg_geometry_columns')]
righe = c.execute("select fid, nome, inizio, fine, lunghezza_m, typeof(lunghezza_m), geom from sezioni where nome = 'P-P'''").fetchall()
fid, nome, inizio, fine, lung, tipo, g = righe[0]
# intestazione GP, flags, srs, riquadro, poi WKB LineString
flags = g[3]; srs = struct.unpack('<i', g[4:8])[0]
o = 40; tipo_wkb = struct.unpack('<I', g[o+1:o+5])[0]; npt = struct.unpack('<I', g[o+5:o+9])[0]
x0, y0, x1, y1 = struct.unpack('<4d', g[o+9:o+41])
r['sezione'] = [nome, inizio, fine, round(lung, 2), tipo, g[:2].decode(), flags, srs, tipo_wkb, npt, x0, y0, x1, y1]
r['n_sezioni'] = c.execute('select count(*) from sezioni').fetchone()[0]
r['prove'] = [x[0] for x in c.execute('select nome from prove order by fid')]
nome, area, g = c.execute('select nome, area_m2, geom from disegni_poligoni').fetchone()
o = 40; tipo_wkb, anelli, npt = struct.unpack('<III', g[o+1:o+13])
pts = [struct.unpack('<2d', g[o+13+16*i:o+29+16*i]) for i in range(npt)]
r['poligono'] = [nome, round(area), tipo_wkb, anelli, npt, pts[0] == pts[-1]]
r['punti'] = [x[0] for x in c.execute('select nome from disegni_punti')]
print(json.dumps(r))
`;
  let r = null;
  try { r = JSON.parse(execFileSync('python3', ['-c', py, dove]).toString()); } catch (e) { console.log('       ', String(e.stdout || e.message).slice(0, 400)); }
  fs.unlinkSync(dove);
  t('SQLite lo apre e lo trova integro', r && r.integrity === 'ok');
  t('è un GeoPackage 1.3 («GPKG», versione 10300) con le sue tabelle', r && r.app_id === 0x47504B47 && r.user_version === 10300
    && ['gpkg_contents', 'gpkg_geometry_columns', 'gpkg_spatial_ref_sys', 'prove', 'sezioni'].every(n => r.tabelle.includes(n)) && r.srs.join() === '-1,0,4326');
  t(`i disegni: il poligono (${r && r.poligono.join(' · ')}) e i punti (${r && r.punti.join(', ')})`, r && r.poligono[0] === 'Recinto' && r.poligono[2] === 3 && r.poligono[3] === 1 && r.poligono[4] === 4 && r.poligono[5] === true && r.poligono[1] > 3000 && r.punti.join() === 'Pozzo');
  t('quattro layer: sezioni (linee), prove (punti), disegni (punti e poligoni), in WGS84', r && JSON.stringify(r.geomcol) === JSON.stringify([['sezioni', 'geom', 'LINESTRING'], ['prove', 'geom', 'POINT'], ['disegni_punti', 'geom', 'POINT'], ['disegni_poligoni', 'geom', 'POLYGON']]) && r.contents.every(x => x[1] === 'features' && x[2] === 4326));
  const p1 = app.E(`(() => { const h = Object.values(${P}.surveys).find(s => s.header.provaNr == '1').header; return [+h.lng, +h.lat]; })()`);
  t(`la traccia P-P': nome, estremi, lunghezza, geometria GP + WKB dalla prova 1 (${r && r.sezione.slice(0, 4).join(' · ')})`, r && r.sezione[0] === "P-P'" && r.sezione[1] === 'P' && r.sezione[2] === "P'" && Math.abs(r.sezione[3] - ds.L) < 0.01 && r.sezione[4] === 'real'
    && r.sezione[5] === 'GP' && r.sezione[6] === 3 && r.sezione[7] === 4326 && r.sezione[8] === 2 && r.sezione[9] === 2 && Math.abs(r.sezione[10] - p1[0]) < 1e-9 && Math.abs(r.sezione[11] - p1[1]) < 1e-9);
  t(`tutte le tracce (${r && r.n_sezioni}) e le prove (${r && r.prove.join(', ')})`, r && r.n_sezioni === 8 && r.prove.includes('DPSH 1'));

  console.log('--- Eliminare ---');
  clic(app, app.d.querySelector('#elencoSezioni3d [data-id="sez_prova"] [data-elimina-sezione]'));
  await attesa(30);
  clic(app, app.dialogo().ok);
  await attesa(30);
  t('una traccia si elimina (con conferma), e la sua sezione sparisce', !tracce().some(x => x.id === 'sez_prova') && !vista.querySelector('svg'));

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
