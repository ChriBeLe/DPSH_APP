// IL PERIMETRO DEL MODELLO 3D. Di base il corpo solido sta dentro il poligono delle prove; si allarga a
// un perimetro scelto: un poligono disegnato (tasto destro → «Usa come perimetro del modello 3D») o
// importato da un file vettoriale (GeoPackage, shapefile anche in .zip, GeoJSON, KML), che diventa un
// poligono disegnato. Fuori dalle prove gli strati proseguono paralleli (la colonna del bordo più
// vicino); il perimetro può essere non convesso; la scena 3D si allarga fino a lui; le sezioni ci
// passano dentro. Eliminato il poligono, il modello torna alle prove.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const $ = (app, id) => app.d.getElementById(id);
const LAT0 = 40.1968, LNG0 = 17.993, gradi = (x, y) => [LNG0 + x / 85000, LAT0 + y / 111000];
const L_FORMA = [[-80, -80], [220, -80], [220, 40], [150, 40], [150, 160], [-80, 160]]; // a «L», non convesso

// ---- i file di prova, fatti qui ----
function shapefile(anelli) { // un poligono (con buco), in gradi; .shp + .dbf (NOME) + .prj WGS84
  const pts = anelli.flat(), n = 44 + 4 * anelli.length + 16 * pts.length;
  const shp = Buffer.alloc(100 + 8 + n);
  shp.writeInt32BE(9994, 0); shp.writeInt32BE((100 + 8 + n) / 2, 24); shp.writeInt32LE(1000, 28); shp.writeInt32LE(5, 32);
  shp.writeInt32BE(1, 100); shp.writeInt32BE(n / 2, 104);
  let p = 108; shp.writeInt32LE(5, p); p += 36;
  shp.writeInt32LE(anelli.length, p); shp.writeInt32LE(pts.length, p + 4); p += 8;
  let s = 0; anelli.forEach(a => { shp.writeInt32LE(s, p); p += 4; s += a.length; });
  pts.forEach(([x, y]) => { shp.writeDoubleLE(x, p); shp.writeDoubleLE(y, p + 8); p += 16; });
  const dbf = Buffer.alloc(32 + 32 + 1 + 1 + 20 + 1);
  dbf[0] = 3; dbf.writeUInt32LE(1, 4); dbf.writeUInt16LE(65, 8); dbf.writeUInt16LE(21, 10);
  dbf.write('NOME', 32, 'latin1'); dbf[43] = 'C'.charCodeAt(0); dbf[48] = 20; dbf[64] = 0x0d;
  dbf[65] = 0x20; dbf.write('Lotto edificabile'.padEnd(20), 66, 'latin1'); dbf[86] = 0x1a;
  const prj = Buffer.from('GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]');
  return { shp, dbf, prj };
}
function zip(files, comprimi) { // ZIP minimo (stored o deflate)
  const locali = [], centrali = []; let off = 0;
  Object.entries(files).forEach(([nome, dati]) => {
    const n = Buffer.from(nome), corpo = comprimi ? zlib.deflateRawSync(dati) : dati;
    const l = Buffer.alloc(30); l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(comprimi ? 8 : 0, 8); l.writeUInt32LE(corpo.length, 18); l.writeUInt32LE(dati.length, 22); l.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(comprimi ? 8 : 0, 10); c.writeUInt32LE(corpo.length, 20); c.writeUInt32LE(dati.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    locali.push(l, n, corpo); centrali.push(c, n); off += 30 + n.length + corpo.length;
  });
  const cd = Buffer.concat(centrali), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(centrali.length / 2, 8); e.writeUInt16LE(centrali.length / 2, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...locali, cd, e]);
}

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  app.w.HTMLCanvasElement.prototype.getContext = () => null;
  if (app.dialogo()) app.dialogo().ok.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const P = `state.projects[${JSON.stringify(pid)}]`;
  app.E(`(() => { const S = ${P}.surveys, base = Object.values(S).find(s => (s.logs || []).length > 3);
    Object.keys(S).forEach(k => delete S[k]);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const id = 'g' + i + '_' + j, sv = JSON.parse(JSON.stringify(base)); sv.id = id; sv.header.provaNr = String(i * 3 + j + 1); delete sv.header.interpretazioneDi;
      sv.header.lat = ${LAT0} + j * 35 / 111000; sv.header.lng = ${LNG0} + i * 40 / 85000; S[id] = sv; } })()`);
  app.E(`openProject(${JSON.stringify(pid)}); apriVista3d('3d')`);
  await attesa(50);
  app.E(`vista3d.livelli.solido = true; renderVista3d()`);
  const copia = x => JSON.parse(JSON.stringify(x));
  const file = (nome, byte) => { app.w.__f = app.w.__f || []; app.w.__f.push({ name: nome, arrayBuffer: async () => byte.buffer.slice(byte.byteOffset, byte.byteOffset + byte.byteLength) }); };
  const leggi = async () => { const r = app.E(`(window.__esito = null, poligoniDaFile(window.__f).then(v => window.__esito = { v }, e => window.__esito = { e: e.message }), window.__f = [])`); void r; for (let i = 0; i < 50 && !app.w.__esito; i++) await attesa(10); return copia(app.w.__esito); };

  const lato0 = app.E('datiVista3dCorrenti.lato');
  const inv0 = copia(app.E('involucroModello(modelloSolido(datiVista3dCorrenti))'));
  t('di partenza il corpo sta nel poligono delle prove e la scheda lo dice', inv0.length >= 4 && $(app, 'lblPerimetro3d').textContent === 'il poligono delle prove' && $(app, 'btnTogliPerimetro3d').hidden && $(app, 'notaPerimetro3d').hidden);
  t('la scheda «Modello e tagli» ha il perimetro: importa da file (shapefile, GeoPackage, GeoJSON, KML)', $(app, 'btnImportaPerimetro3d') && /\.gpkg/.test($(app, 'filePerimetro3d').accept) && /\.shp/.test($(app, 'filePerimetro3d').accept) && /\.zip/.test($(app, 'filePerimetro3d').accept) && /\.kml/.test($(app, 'filePerimetro3d').accept));

  // ---- i lettori ----
  file('perimetro.gpkg', fs.readFileSync(path.join(__dirname, 'dati', 'perimetro.gpkg')));
  let r = await leggi();
  const grande = r.v && r.v.find(p => p.nome === 'Area di cantiere');
  t('GeoPackage (SQLite vero, riga su più pagine, srs_id 100 → EPSG 4326): i due poligoni coi nomi', r.v && r.v.length === 2 && grande && grande.punti.length === 360 && r.v.some(p => p.nome === 'Recinto')
    && Math.abs(grande.punti[0].lat - (LAT0 - 80 / 111000)) < 1e-9 && Math.abs(grande.punti[0].lng - (LNG0 - 80 / 85000)) < 1e-9);
  const sh = shapefile([[...L_FORMA].reverse().map(p => gradi(...p)).concat([gradi(...L_FORMA[5])]), [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]].map(p => gradi(...p))]);
  file('lotto.shp', sh.shp); file('lotto.dbf', sh.dbf); file('lotto.prj', sh.prj);
  r = await leggi();
  t('shapefile (.shp + .dbf + .prj): l\'anello esterno (il buco no), il nome dal .dbf', r.v && r.v.length === 1 && r.v[0].nome === 'Lotto edificabile' && r.v[0].punti.length === 6);
  file('lotto.zip', zip({ 'lotto.shp': sh.shp, 'lotto.dbf': sh.dbf, 'lotto.prj': sh.prj }, false));
  r = await leggi();
  t('shapefile in uno .zip', r.v && r.v.length === 1 && r.v[0].nome === 'Lotto edificabile');
  const utm = L_FORMA.map(p => { const g = gradi(...p), u = copia(app.E(`utmDaGeo(${g[1]}, ${g[0]}, 33)`)); return [u.x, u.y]; });
  file('area.geojson', Buffer.from(JSON.stringify({ type: 'FeatureCollection', crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::32633' } },
    features: [{ type: 'Feature', properties: { name: 'Area UTM' }, geometry: { type: 'Polygon', coordinates: [utm.concat([utm[0]])] } }] })));
  r = await leggi();
  t('GeoJSON in UTM 33N (EPSG 32633): riportato in gradi', r.v && r.v[0].nome === 'Area UTM' && r.v[0].punti.length === 6 && r.v[0].punti.every((q, i) => Math.abs(q.lat - gradi(...L_FORMA[i])[1]) < 1e-7 && Math.abs(q.lng - gradi(...L_FORMA[i])[0]) < 1e-7));
  file('area.kml', Buffer.from(`<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Area KML</name><Polygon><outerBoundaryIs><LinearRing><coordinates>${L_FORMA.map(p => gradi(...p).join(',') + ',0').join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>`));
  r = await leggi();
  t('KML', r.v && r.v[0].nome === 'Area KML' && r.v[0].punti.length === 6);
  file('gb.shp', sh.shp); file('gb.prj', Buffer.from('PROJCS["Monte_Mario_Italy_2",GEOGCS["GCS_Monte_Mario"],PROJECTION["Transverse_Mercator"]]'));
  r = await leggi();
  t('Gauss-Boaga: non gestito, lo dice', r.e && /Gauss-Boaga/.test(r.e));
  file('niente.txt', Buffer.from('ciao'));
  r = await leggi();
  t('un file che non è vettoriale: lo dice', r.e && /Formato non riconosciuto/.test(r.e));

  // ---- importa: due poligoni → si sceglie (di base il più grande) → diventa il perimetro ----
  file('perimetro.gpkg', fs.readFileSync(path.join(__dirname, 'dati', 'perimetro.gpkg')));
  app.E('importaPerimetro(window.__f); window.__f = []');
  let dlg; for (let i = 0; i < 50 && !(dlg = app.dialogo()); i++) await attesa(10);
  t('più poligoni nel file: si chiede quale (di base il più grande)', dlg && /2 poligoni/.test(dlg.testo) && /Area di cantiere/.test(app.d.querySelector('#appDialog select').selectedOptions[0].textContent));
  dlg.ok.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
  await attesa(60);
  const id = app.E(`${P}.perimetroModello`);
  const dis = copia(app.E(`disegniDelProgetto().find(x => x.id === ${JSON.stringify(id)})`));
  t('diventa un poligono disegnato (col suo nome) e il perimetro del modello, salvato', dis && dis.tipo === 'poligono' && dis.nome === 'Area di cantiere' && JSON.parse(app.salvato()).projects[pid].perimetroModello === id);
  t('la scheda lo dice, col «Torna alle prove» e la nota che fuori dalle prove è estrapolato', /Area di cantiere/.test($(app, 'lblPerimetro3d').textContent) && !$(app, 'btnTogliPerimetro3d').hidden && !$(app, 'notaPerimetro3d').hidden && /inventato/.test($(app, 'notaPerimetro3d').textContent));
  const inv = copia(app.E('involucroModello(modelloSolido(datiVista3dCorrenti))'));
  t(`il corpo arriva al perimetro (${inv.length} vertici, i 360 del file in fila tolti; in senso antiorario) e la scena si allarga (lato ${lato0.toFixed(0)} → ${app.E('datiVista3dCorrenti.lato').toFixed(0)} m)`, inv.length === 6 && app.E(`areaPoligono(involucroModello(modelloSolido(datiVista3dCorrenti))) > 0`) && app.E('datiVista3dCorrenti.lato') > lato0 * 1.3);
  // fuori dalle prove: gli strati del bordo più vicino (paralleli), dentro il perimetro
  const fuori = copia(app.E(`(() => { const d = datiVista3dCorrenti, so = modelloSolido(d), g = (x, y) => d.daGeo(${LAT0} + y / 111000, ${LNG0} + x / 85000);
    const a = colonnaSolido(d, so, ...g(200, -60)), b = colonnaSolido(d, so, ...g(120, 0)), c = colonnaSolido(d, so, ...g(-60, 140)), e = colonnaSolido(d, so, ...g(0, 70));
    return { a: a.basi, b: b.basi, c: c.basi, e: e.basi }; })()`));
  t('fuori dalle prove gli strati proseguono paralleli (la colonna dell\'angolo più vicino)', fuori.a.every((v, k) => Math.abs(v - fuori.b[k]) < 1e-6) && fuori.c.every((v, k) => Math.abs(v - fuori.e[k]) < 1e-6));
  t('il perimetro a «L» non è convesso e si triangola (niente triangoli fuori)', !app.E('poligonoConvesso(involucroModello(modelloSolido(datiVista3dCorrenti)))')
    && app.E(`(() => { const Q = involucroModello(modelloSolido(datiVista3dCorrenti)), tt = triangoliniPoligono(Q, 2); return tt.length > 0 && tt.every(t => dentroPoligono(Q, (t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3)); })()`)
    && Math.abs(app.E(`(() => { const Q = involucroModello(modelloSolido(datiVista3dCorrenti)); return triangoliPoligono(Q).reduce((s, t) => s + areaPoligono(t), 0) - areaPoligono(Q); })()`)) < 1);
  const nSolido = app.E(`ultimaScena3d.tutte.filter(f => f.cls === 'vista3d-solido').length`);
  t('la scena ha il corpo e i suoi spigoli', nSolido > 50 && app.E(`ultimaScena3d.tutte.some(f => f.cls === 'vista3d-spigolo')`));
  // il terreno: c'è nella rientranza della «L» (fuori dal perimetro), non sopra il corpo
  t('il terreno resta nella rientranza della «L» e non copre il corpo', app.E(`(() => { const d = datiVista3dCorrenti, Q = involucroModello(modelloSolido(d)), g = (x, y) => d.daGeo(${LAT0} + y / 111000, ${LNG0} + x / 85000);
    const notch = g(200, 120); return !dentroPoligono(Q, ...notch) && dentroPoligono(Q, ...g(100, 100)) && dentroPoligono(Q, ...g(200, 0)); })()`));
  // una sezione che esce dalle prove ma resta nel perimetro: strati anche lì
  const sez = copia(app.E(`(() => { const d = datiVista3dCorrenti, ds = datiSezioneTracciata(d, { id: 'x', nome: 'X', a: { lat: ${LAT0 + 100 / 111000}, lng: ${LNG0 - 60 / 85000} }, b: { lat: ${LAT0 - 50 / 111000}, lng: ${LNG0 + 200 / 85000} } }, 30);
    return { n: ds.campioni.length, conStrati: ds.campioni.filter(c => c.col).length }; })()`));
  t(`le sezioni passano nel corpo allargato (${sez.conStrati}/${sez.n} punti con gli strati)`, sez.conStrati === sez.n);

  // ---- il tasto destro sui poligoni disegnati ----
  const voci = id2 => copia(app.E(`vociDisegno(disegniDelProgetto().find(x => x.id === ${JSON.stringify(id2)})).filter(v => Array.isArray(v)).map(v => v[0])`));
  t('tasto destro sul perimetro: «Non usarlo più come perimetro del modello 3D»', voci(id).includes('Non usarlo più come perimetro del modello 3D'));
  app.E(`creaDisegno('poligono', ${JSON.stringify(L_FORMA.map(p => ({ lat: gradi(...p)[1], lng: gradi(...p)[0] })))})`);
  const id2 = app.E('disegniDelProgetto()[disegniDelProgetto().length - 1].id');
  t('su un altro poligono: «Usa come perimetro del modello 3D»; su un punto no', voci(id2).includes('Usa come perimetro del modello 3D')
    && (() => { app.E(`creaDisegno('punto', [{ lat: ${LAT0}, lng: ${LNG0} }])`); const ip = app.E('disegniDelProgetto()[disegniDelProgetto().length - 1].id'); return !voci(ip).some(v => /perimetro/.test(v)); })());
  app.E(`vociDisegno(disegniDelProgetto().find(x => x.id === ${JSON.stringify(id2)})).find(v => v[0] === 'Usa come perimetro del modello 3D')[3]()`);
  t('scelto dal menu: ora il perimetro è lui (6 vertici)', app.E(`${P}.perimetroModello`) === id2 && app.E('involucroModello(modelloSolido(datiVista3dCorrenti)).length') === 6);
  // eliminato il poligono che fa da perimetro: si torna alle prove
  app.E(`vociDisegno(disegniDelProgetto().find(x => x.id === ${JSON.stringify(id2)})).find(v => v[0] === 'Elimina')[3]()`);
  for (let i = 0; i < 50 && !(dlg = app.dialogo()); i++) await attesa(10);
  dlg.ok.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
  await attesa(60);
  t('eliminato il poligono del perimetro: il modello torna al poligono delle prove', !app.E(`${P}.perimetroModello`) && app.E('involucroModello(modelloSolido(datiVista3dCorrenti)).length') === inv0.length && $(app, 'lblPerimetro3d').textContent === 'il poligono delle prove');
  // e «Torna alle prove» dalla scheda
  app.E(`usaPerimetroModello(${JSON.stringify(id)})`);
  $(app, 'btnTogliPerimetro3d').dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
  t('«Torna alle prove»: il perimetro si toglie (il poligono resta tra i disegnati)', !app.E(`${P}.perimetroModello`) && app.E(`disegniDelProgetto().some(x => x.id === ${JSON.stringify(id)})`) && app.E('involucroModello(modelloSolido(datiVista3dCorrenti)).length') === inv0.length);

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})();
