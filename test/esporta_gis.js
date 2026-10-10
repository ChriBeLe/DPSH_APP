// ESPORTA PER GIS. Una finestra (formato e livelli da scegliere); il GeoPackage per QGIS con gli stili della
// mappa nella tabella «layer_styles» (QML: simbolo, colori, contorno, grandezza, etichette; il modello 3D e le
// colonne delle prove con lo stile 3D) e il modello 3D in UTM con le quote vere (superfici di triangoli, su più
// pagine di SQLite); il KML/KMZ per Google Earth con gli stili. Il file lo apre SQLite (Python), gli stili li
// legge un parser XML.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const $ = (app, id) => app.d.getElementById(id);
const clic = (app, el) => el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true, cancelable: true }));
const LAT0 = 40.1968, LNG0 = 17.993, G = (x, y) => ({ lat: LAT0 + y / 111000, lng: LNG0 + x / 85000 });

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  app.w.HTMLCanvasElement.prototype.getContext = () => null;
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const P = `state.projects[${JSON.stringify(pid)}]`;
  app.E(`(() => { const S = ${P}.surveys, base = Object.values(S).find(s => (s.logs || []).length > 3);
    Object.keys(S).forEach(k => delete S[k]);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const id = 'g' + i + '_' + j, sv = JSON.parse(JSON.stringify(base)); sv.id = id; sv.header.provaNr = String(i * 3 + j + 1); delete sv.header.interpretazioneDi;
      sv.header.lat = ${LAT0} + j * 35 / 111000; sv.header.lng = ${LNG0} + i * 40 / 85000; S[id] = sv; } })()`);
  app.E(`openProject(${JSON.stringify(pid)}); apriVista3d('3d'); vista3d.livelli.solido = true; creaGrigliaAssi3d(1, 1); renderVista3d()`);
  app.E(`creaDisegno('poligono', ${JSON.stringify([G(-40, -40), G(160, -40), G(160, 110), G(-40, 110)])}); creaDisegno('punto', [${JSON.stringify(G(60, 120))}])`);
  app.E(`usaPerimetroModello(disegniDelProgetto().find(x => x.tipo === 'poligono').id)`);
  // uno stile cambiato: il punto disegnato a stella blu con l'etichetta grande a destra
  app.E(`salvaStile('d:' + disegniDelProgetto().find(x => x.tipo === 'punto').id, { simbolo: 'stella', colore: '#3B82F6', etichettaDimensione: 20, etichettaPosizione: 'destra' })`);
  await attesa(30);

  // ---- La finestra ----
  clic(app, $(app, 'btnGpkgSezioni3d'));
  const livelli = () => [...app.d.querySelectorAll('#gisLivelli [data-livello-gis]')];
  t(`la finestra «Esporta»: tavole, GeoPackage, KMZ, KML, vista 3D (SVG, OBJ); per i GIS i livelli (${livelli().map(c => c.dataset.livelloGis).join(', ')})`, !$(app, 'esportaGis').hidden && ['tavole', 'gpkg', 'kmz', 'kml', 'svg', 'obj'].every(f => app.d.querySelector(`#gisFormato [data-formato="${f}"]`))
    && ['prove', 'sezioni', 'punti', 'poligoni', 'modello3d', 'colonne3d'].every(id => livelli().some(c => c.dataset.livelloGis === id && c.checked && !c.disabled)));
  clic(app, app.d.querySelector('#gisFormato [data-formato="kml"]'));
  t('col KML il modello 3D e le colonne non si possono scegliere (solo nel GeoPackage)', livelli().filter(c => /3d$/.test(c.dataset.livelloGis)).every(c => c.disabled && !c.checked));
  clic(app, app.d.querySelector('#gisFormato [data-formato="gpkg"]'));
  clic(app, $(app, 'gisNessuno'));
  t('«Nessuno» toglie tutto; esportare senza livelli chiede di sceglierne uno', livelli().every(c => !c.checked) && (() => { clic(app, $(app, 'gisEsporta')); return true; })());
  await attesa(30);
  t('(l\'avviso)', /almeno un livello/.test((app.dialogo() || {}).testo || ''));
  if (app.dialogo()) clic(app, app.dialogo().ok);
  clic(app, $(app, 'gisTutti'));
  const n0 = app.scaricati.length;
  clic(app, $(app, 'gisEsporta'));
  await attesa(60);
  const file = app.scaricati[app.scaricati.length - 1];
  t(`si scarica il GeoPackage (${file && file.nome}) e la finestra si chiude; la scelta resta nel progetto`, app.scaricati.length === n0 + 1 && /^DPSH_.*\.gpkg$/.test(file.nome) && $(app, 'esportaGis').hidden && app.E(`${P}.esportaGis.formato`) === 'gpkg');

  // ---- Il GeoPackage, con Python ----
  const dove = path.join(os.tmpdir(), 'dpsh_gis_' + process.pid + '.gpkg');
  fs.writeFileSync(dove, Buffer.from(await file.blob.arrayBuffer()));
  const py = `
import sqlite3, struct, sys, json
import xml.etree.ElementTree as ET
c = sqlite3.connect(sys.argv[1])
r = {}
r['integrity'] = c.execute('PRAGMA integrity_check').fetchone()[0]
r['pagine'] = c.execute('PRAGMA page_count').fetchone()[0]
r['tabelle'] = sorted(x[0] for x in c.execute("select name from sqlite_master where type='table'"))
r['srs'] = [x[0] for x in c.execute('select srs_id from gpkg_spatial_ref_sys order by srs_id')]
r['geomcol'] = {x[0]: [x[1], x[2], x[3]] for x in c.execute('select table_name, geometry_type_name, srs_id, z from gpkg_geometry_columns')}
r['contents'] = {x[0]: x[1] for x in c.execute('select table_name, data_type from gpkg_contents')}
r['stili'] = {}
for nome, schema, col, default, qml in c.execute("select f_table_name, f_table_schema, f_geometry_column, useAsDefault, styleQML from layer_styles"):
    doc = ET.fromstring(qml.split('\\n', 1)[1])
    s = {'schema': schema, 'col': col, 'default': default, 'labels': doc.get('labelsEnabled'), 'cats': doc.get('styleCategories')}
    rend = doc.find('renderer-v2'); s['renderer'] = rend.get('type'); s['attr'] = rend.get('attr')
    s['categorie'] = [x.get('value') for x in rend.iter('category')]
    s['marker'] = [{o.get('name'): o.get('value') for o in l.find('Option')} for l in rend.iter('layer') if l.get('class') == 'SimpleMarker']
    s['linee'] = [{o.get('name'): o.get('value') for o in l.find('Option')} for l in rend.iter('layer') if l.get('class') == 'SimpleLine']
    s['prop'] = len(list(rend.iter('prop')))
    lab = doc.find('labeling')
    s['etichette'] = None if lab is None else {'tipo': lab.get('type'), 'n': len(list(lab.iter('settings'))), 'testo': [dict(x.attrib) for x in lab.iter('text-style')][:2], 'posto': [dict(x.attrib) for x in lab.iter('placement')][:2], 'buffer': [dict(x.attrib) for x in lab.iter('text-buffer')][:1]}
    r3 = doc.find('renderer-3d')
    s['r3d'] = None if r3 is None else {'tipo': r3.get('type'), 'regole': len(r3.find('rules').findall('rule')), 'simboli': [x.get('type') for x in r3.iter('symbol')][:1], 'clamp': [x.get('alt-clamping') for x in r3.iter('data')][:1], 'diffuse': [x.get('diffuse') for x in r3.iter('material')][:1]}
    r['stili'][nome] = s
r['prove'] = [x[0] for x in c.execute('select nome from prove order by fid')]
r['modello'] = c.execute('select count(*), count(distinct strato) from modello_3d').fetchone()
g = c.execute('select geom from modello_3d order by fid limit 1').fetchone()[0]
o = 40; tipo, n = struct.unpack('<II', g[o+1:o+9]); t1 = struct.unpack('<I', g[o+10:o+14])[0]
x, y, z = struct.unpack('<3d', g[o+9+13:o+9+13+24])
r['tri'] = [tipo, n, t1, x, y, z, struct.unpack('<i', g[4:8])[0]]
r['colonne'] = c.execute('select count(*), min(da_m), max(a_m) from prove_colonne_3d').fetchone()
print(json.dumps(r))
`;
  let r = null;
  try { r = JSON.parse(execFileSync('python3', ['-c', py, dove], { maxBuffer: 1 << 26 }).toString()); } catch (e) { console.log('       ', String(e.stderr || e.stdout || e.message).slice(0, 600)); }
  fs.unlinkSync(dove);
  const S = r ? r.stili : {};
  t(`SQLite lo trova integro (${r && r.pagine} pagine da 64 KB)`, r && r.integrity === 'ok');
  t(`i layer: ${r && Object.keys(r.geomcol).join(', ')}`, r && ['prove', 'sezioni', 'sezioni_estremi', 'disegni_punti', 'disegni_poligoni', 'modello_3d', 'prove_colonne_3d'].every(n => r.geomcol[n]) && r.contents.layer_styles === 'attributes');
  t('il modello 3D e le colonne in UTM (EPSG 32633) con la Z; il resto in WGS84', r && r.srs.join() === '-1,0,4326,32633' && JSON.stringify(r.geomcol.modello_3d) === JSON.stringify(['MULTIPOLYGON', 32633, 1]) && JSON.stringify(r.geomcol.prove_colonne_3d) === JSON.stringify(['LINESTRING', 32633, 1]) && r.geomcol.prove[1] === 4326);
  t(`il modello: ${r && r.modello[0]} righe per ${r && r.modello[1]} strati (multipoligoni Z di triangoli, ISO 1006/1003, in metri UTM)`, r && r.modello[0] > r.modello[1] && r.tri[0] === 1006 && r.tri[1] > 0 && r.tri[2] === 1003 && r.tri[3] > 700000 && r.tri[3] < 800000 && r.tri[4] > 4400000 && r.tri[6] === 32633 && Number.isFinite(r.tri[5]));
  t(`le colonne delle prove: ${r && r.colonne[0]} tratti di strato (da ${r && r.colonne[1]} a ${r && r.colonne[2]} m)`, r && r.colonne[0] >= 12 && r.colonne[1] === 0 && r.colonne[2] > 1);
  t('uno stile per layer, quello che QGIS apre da sé (schema vuoto, colonna geom, «useAsDefault»)', r && Object.keys(S).length === Object.keys(r.geomcol).length && Object.values(S).every(s => s.schema === '' && s.col === 'geom' && s.default === 1 && /Symbology/.test(s.cats)));
  const pm = S.prove && S.prove.marker[0];
  t(`le prove: triangolo con la punta sul punto (${pm && [pm.name, pm.angle, pm.offset, pm.size + ' ' + pm.size_unit, pm.color].join(' · ')})`, pm && pm.name === 'triangle' && pm.angle === '180' && pm.offset === '0,-9.2' && pm.size === '18.4' && pm.size_unit === 'Pixel' && pm.color === '220,38,38,255' && pm.outline_color === '255,255,255,255' && S.prove.prop > 0);
  const ep = S.prove && S.prove.etichette;
  t(`e il nome sopra (${ep && [ep.testo[0].fieldName, ep.testo[0].fontSize + 'px', ep.posto[0].quadOffset, ep.posto[0].yOffset].join(' · ')}), bianco con l'alone`, ep && ep.tipo === 'simple' && ep.testo[0].fieldName === 'nome' && ep.testo[0].fontSizeUnit === 'Pixel' && ep.testo[0].fontSize === '12'
    && ep.posto[0].placement === '1' && ep.posto[0].quadOffset === '1' && +ep.posto[0].yOffset === -21.4 && ep.testo[0].textColor === '255,255,255,255' && ep.buffer[0].bufferDraw === '1' && S.prove.labels === '1');
  const dp = S.disegni_punti;
  t(`il punto disegnato a stella blu, l'etichetta grande a destra (per categorie e per regola)`, dp && dp.renderer === 'categorizedSymbol' && dp.attr === 'stile' && dp.marker[0].name === 'star' && dp.marker[0].color === '59,130,246,255'
    && dp.etichette.tipo === 'rule-based' && dp.etichette.testo[0].fontSize === '20' && dp.etichette.posto[0].quadOffset === '5');
  t('le sezioni: una categoria per traccia, linea col suo colore e spessore; gli estremi solo con l\'etichetta', S.sezioni && S.sezioni.categorie.length === app.E('tracceDelProgetto().length') && S.sezioni.linee[0].line_color === '239,68,68,255' && S.sezioni.linee[0].line_width_unit === 'Pixel'
    && S.sezioni_estremi.renderer === 'nullSymbol' && S.sezioni_estremi.etichette.n === app.E('tracceDelProgetto().length'));
  t(`il modello 3D: stile 3D per strato (${S.modello_3d && S.modello_3d.r3d.regole} regole, superfici con le quote assolute), niente nel 2D`, S.modello_3d && S.modello_3d.renderer === 'nullSymbol' && S.modello_3d.r3d.tipo === 'rulebased' && S.modello_3d.r3d.regole >= r.modello[1]
    && S.modello_3d.r3d.simboli[0] === 'polygon' && S.modello_3d.r3d.clamp[0] === 'absolute' && /^\d+,\d+,\d+,255$/.test(S.modello_3d.r3d.diffuse[0]) && S.prove_colonne_3d.r3d.simboli[0] === 'line');
  t('(e le prove ci sono tutte, col nome)', r && r.prove.length === 12 && r.prove.includes('DPSH 1'));

  // ---- KML e KMZ ----
  app.E(`(() => { const t = documentoKmlGis(state.projects[state.currentProjectId], { prove: true, sezioni: true, punti: true, poligoni: true }, false); window.__kml = t.testo; window.__icone = t.icone.length; })()`);
  const kml = app.w.__kml;
  const pyK = `
import sys, json, xml.etree.ElementTree as ET
ns = {'k': 'http://www.opengis.net/kml/2.2'}
d = ET.fromstring(open(sys.argv[1], encoding='utf-8').read())
print(json.dumps({'stili': len(d.findall('.//k:Style', ns)), 'segnaposti': len(d.findall('.//k:Placemark', ns)), 'cartelle': [f.find('k:name', ns).text for f in d.findall('.//k:Folder', ns)],
  'prova': [s.find('.//k:IconStyle/k:Icon/k:href', ns).text for s in d.findall('.//k:Style', ns) if s.get('id') == 'prove'], 'colore': [s.find('.//k:IconStyle/k:color', ns).text for s in d.findall('.//k:Style', ns) if s.get('id') == 'prove']}))
`;
  const fk = path.join(os.tmpdir(), 'dpsh_gis_' + process.pid + '.kml');
  fs.writeFileSync(fk, kml);
  let k = null;
  try { k = JSON.parse(execFileSync('python3', ['-c', pyK, fk]).toString()); } catch (e) { console.log('       ', String(e.stderr || e.message).slice(0, 400)); }
  fs.unlinkSync(fk);
  t(`il KML è XML valido: cartelle ${k && k.cartelle.join(', ')}; ${k && k.segnaposti} segnaposti, ${k && k.stili} stili`, k && k.cartelle.join() === 'Prove,Sezioni,Punti disegnati,Poligoni disegnati' && k.segnaposti >= 12 + 3 * app.E('tracceDelProgetto().length') + 1 + 2);
  t(`le prove nel KML: icona a triangolo nel colore delle prove (${k && k.colore[0]}, aabbggrr)`, k && /shapes\/triangle\.png$/.test(k.prova[0]) && k.colore[0] === 'ff2626dc');
  clic(app, $(app, 'btnGpkgSezioni3d'));
  clic(app, app.d.querySelector('#gisFormato [data-formato="kmz"]'));
  clic(app, $(app, 'gisEsporta'));
  await attesa(60);
  const kmz = app.scaricati[app.scaricati.length - 1], zb = Buffer.from(await kmz.blob.arrayBuffer());
  t(`il KMZ: uno ZIP con doc.kml (${kmz.nome})`, /\.kmz$/.test(kmz.nome) && zb.readUInt32LE(0) === 0x04034b50 && zb.toString('latin1').includes('doc.kml'));

  // ---- Il menu «Esporta» unico: in alto nella mappa (2D e 3D), tavole, GIS, vista 3D ----
  clic(app, $(app, 'btnEsportaMappa'));
  t('«Esporta…» in alto nella mappa apre lo stesso menu (l\'ultimo formato scelto)', !$(app, 'esportaGis').hidden && app.d.querySelector('#gisFormato [aria-pressed="true"]').dataset.formato === 'kmz');
  clic(app, app.d.querySelector('#gisFormato [data-formato="tavole"]'));
  t('«Tavole 2D e 3D»: niente livelli da scegliere, il tasto apre le tavole', $(app, 'gisLivelliBox').hidden && /Apri le tavole/.test($(app, 'gisEsporta').textContent));
  clic(app, $(app, 'gisEsporta'));
  await attesa(30);
  t('(e si aprono)', !$(app, 'tavole3d').hidden && $(app, 'esportaGis').hidden);
  app.E(`document.getElementById('tavole3dChiudi').click()`);
  t('nella barra in alto un tasto solo («Esporta…»): Tavole, SVG e OBJ sono dentro', ['btnTavole3d', 'btnScaricaVista3d', 'btnScaricaObj3d'].every(id => $(app, id).classList.contains('am-nascosto')));
  // una prova col suo stile: nel GeoPackage le prove per categorie (una per prova), nel KML il suo stile
  app.E(`salvaStile('p:g0_0', { simbolo: 'stella', colore: '#22C55E' })`);
  const dimGpkg = app.E(`(() => { const r = geopackageGis(state.projects[state.currentProjectId], datiVista3dCorrenti, { prove: true }); return r.length; })()`);
  const kml2 = app.E(`documentoKmlGis(state.projects[state.currentProjectId], { prove: true }, false).testo`);
  t(`una prova con lo stile suo: il GeoPackage si scrive (${dimGpkg} byte) e nel KML ha il suo stile`, dimGpkg > 0 && /<Style id="p_g0_0">/.test(kml2) && /<styleUrl>#p_g0_0<\/styleUrl>/.test(kml2) && (kml2.match(/<styleUrl>#prove<\/styleUrl>/g) || []).length === 11);
  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})();
