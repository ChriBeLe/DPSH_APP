// ESPORTA PER GIS: FOTO, NOTE E PERCORSO NEL GEOPACKAGE. Layer «foto» (posizione della foto, o della sua prova se la foto
// non ha il GPS; l'immagine dentro il file come BLOB), «note» (degli intervalli e del progetto) e «percorso» (la linea
// che unisce le prove nell'ordine del progetto). Il file lo riapre SQLite (Python); l'assistente ha gli strumenti
// «elenco_livelli_gis» e «esporta_gis».
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const $ = (app, id) => app.d.getElementById(id);
const clic = (app, el) => el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true, cancelable: true }));
const LAT0 = 40.1968, LNG0 = 17.993;
// tre «immagini» (byte qualunque, base64): la prima è un PNG vero da 1 pixel
const IMG = [Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'),
  crypto.randomBytes(3000), crypto.randomBytes(70000)];
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const url = (b, i) => `data:image/${i === 0 ? 'png' : 'jpeg'};base64,${b.toString('base64')}`;

const PY = `
import sqlite3, struct, sys, json, hashlib
c = sqlite3.connect(sys.argv[1])
r = {'integrity': c.execute('PRAGMA integrity_check').fetchone()[0]}
r['geomcol'] = {x[0]: [x[1], x[2], x[3]] for x in c.execute('select table_name, geometry_type_name, srs_id, z from gpkg_geometry_columns')}
r['contents'] = sorted(x[0] for x in c.execute('select table_name from gpkg_contents'))
r['stili'] = sorted(x[0] for x in c.execute('select f_table_name from layer_styles'))
def pt(g): return struct.unpack('<2d', g[40+5:40+5+16])
tab = [x[0] for x in c.execute("select name from sqlite_master where type='table'")]
r['foto'] = [] if 'foto' not in tab else [[d, pt(g), nf, desc, pos, fonte, tipo, None if im is None else [len(im), hashlib.md5(im).hexdigest()]] for (d, g, nf, desc, pos, fonte, tipo, im) in c.execute('select prova, geom, nome_file, descrizione, posizione, fonte_gps, tipo_immagine, immagine from foto order by fid')]
r['note'] = [] if 'note' not in tab else [[p, tp, da, a, tx, pt(g)] for (p, tp, da, a, tx, g) in c.execute('select prova, tipo, da_m, a_m, testo, geom from note order by fid')]
try:
    g = c.execute('select geom from percorso').fetchone()[0]
    n = struct.unpack('<I', g[40+5:40+9])[0]
    r['perc'] = [n, [struct.unpack('<2d', g[40+9+16*i:40+9+16*i+16]) for i in range(n)]] + list(c.execute('select nome, prove, lunghezza_m from percorso').fetchone())
except sqlite3.OperationalError:
    r['perc'] = None
r['tabelle'] = sorted(x[0] for x in c.execute("select name from sqlite_master where type='table'"))
print(json.dumps(r))
`;
const leggi = (byte) => {
  const dove = path.join(os.tmpdir(), 'dpsh_gisfn_' + process.pid + '.gpkg');
  fs.writeFileSync(dove, Buffer.from(byte));
  try { return JSON.parse(execFileSync('python3', ['-c', PY, dove], { maxBuffer: 1 << 27 }).toString()); }
  catch (e) { console.log('       ', String(e.stderr || e.message).slice(-500)); return null; }
  finally { fs.rmSync(dove, { force: true }); }
};

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  app.w.HTMLCanvasElement.prototype.getContext = () => null;
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const P = `state.projects[${JSON.stringify(pid)}]`;
  // tre prove in fila (una ogni 100 m verso est), una nota su un intervallo di ognuna delle prime due; le foto: una col suo GPS
  // e la sua didascalia, una senza GPS (va sulla prova), una terza pesante; la nota di progetto in HTML
  app.E(`(() => { const S = ${P}.surveys, base = Object.values(S).find(s => (s.logs || []).length > 3);
    Object.keys(S).forEach(k => delete S[k]);
    for (let i = 0; i < 3; i++) { const id = 'g' + i, sv = JSON.parse(JSON.stringify(base)); sv.id = id; sv.header.provaNr = String(i + 1); delete sv.header.interpretazioneDi;
      sv.header.lat = ${LAT0}; sv.header.lng = ${LNG0} + i * 100 / 85000; sv.photos = []; sv.logs.forEach(l => { delete l.note; }); S[id] = sv; }
    S.g0.logs[1].note = 'Rifiuto a 0,3 m'; S.g1.logs[0].note = 'Terreno di riporto';
    S.g0.photos.push({ id: 'f1', dataUrl: ${JSON.stringify(url(IMG[0], 0))}, nomeFile: 'IMG_1.png', lat: ${LAT0 + 0.0002}, lng: ${LNG0 + 0.0002}, alt: 12.345, hasExifGps: true, gpsSource: 'exif', nota: 'Vista da nord', timestamp: '1/1/2026 10:00', scattataIl: '2026-01-01T09:00:00.000Z' });
    S.g0.photos.push({ id: 'f2', dataUrl: ${JSON.stringify(url(IMG[1], 1))}, nomeFile: 'IMG_2.jpg', lat: null, lng: null, alt: null, hasExifGps: false, gpsSource: null, nota: '', timestamp: '1/1/2026 10:05' });
    S.g2.photos.push({ id: 'f3', dataUrl: ${JSON.stringify(url(IMG[2], 1))}, lat: null, lng: null, hasExifGps: false, gpsSource: 'app', nota: 'Pesante', timestamp: '1/1/2026 11:00' });
    ${P}.ordineProve = ['g2', 'g0', 'g1'];
    ${P}.notes = { html: '<p>Cantiere <b>Nardò</b>: accesso da sud.</p>' }; })()`);
  app.E(`openProject(${JSON.stringify(pid)})`);
  await attesa(30);

  // ---- il GeoPackage ----
  const tutti = { prove: true, foto: true, note: true, percorso: true };
  const byte = await app.E(`(async () => { const pr = state.projects[state.currentProjectId], f = geopackageGis(pr, null, ${JSON.stringify(tutti)}, await immaginiFotoGis(pr)); return Array.from(f); })()`);
  const r = leggi(byte);
  t('SQLite lo trova integro', r && r.integrity === 'ok');
  t('i layer foto (punti), note (punti), percorso (linea) con stile e voce in gpkg_contents',
    r && r.geomcol.foto[0] === 'POINT' && r.geomcol.note[0] === 'POINT' && r.geomcol.percorso[0] === 'LINESTRING' && ['foto', 'note', 'percorso'].every(n => r.contents.includes(n) && r.stili.includes(n)));
  const F = r ? r.foto : [];
  t(`tre foto: ${F.length}`, F.length === 3);
  const f1 = F.find(x => x[2] === 'IMG_1.png'), f2 = F.find(x => x[2] === 'IMG_2.jpg'), f3 = F.find(x => x[3] === 'Pesante');
  t('la foto col GPS sta al suo punto, con la didascalia e la fonte', f1 && Math.abs(f1[1][0] - (LNG0 + 0.0002)) < 1e-9 && Math.abs(f1[1][1] - (LAT0 + 0.0002)) < 1e-9 && f1[3] === 'Vista da nord' && f1[4] === 'della foto' && f1[5] === 'EXIF' && f1[6] === 'image/png');
  t('la foto senza GPS sta sulla sua prova', f2 && Math.abs(f2[1][0] - LNG0) < 1e-9 && Math.abs(f2[1][1] - LAT0) < 1e-9 && f2[4] === 'della prova' && f2[0] === 'DPSH 1');
  t('l\'immagine è dentro il file, uguale all\'originale (anche quella da 70 KB)', f1 && f2 && f3 && [[f1, IMG[0]], [f2, IMG[1]], [f3, IMG[2]]].every(([f, b]) => f[7] && f[7][0] === b.length && f[7][1] === md5(b)));
  const N = r ? r.note : [];
  t('le note: due degli intervalli (da-a in metri, sulla loro prova) e quella del progetto in testo semplice', N.length === 3 && N.filter(n => n[1] === 'intervallo').length === 2
    && N.some(n => n[0] === 'DPSH 1' && n[4] === 'Rifiuto a 0,3 m' && n[2] > 0 && n[3] > n[2]) && N.some(n => n[0] === 'DPSH 2' && n[4] === 'Terreno di riporto')
    && N.some(n => n[1] === 'progetto' && n[0] === null && /Cantiere Nardò: accesso da sud/.test(n[4]) && !/</.test(n[4]) && Math.abs(n[5][0] - (LNG0 + 100 / 85000)) < 1e-9));
  t('il percorso unisce le prove nell\'ordine scelto (3, 1, 2), con la lunghezza', r && r.perc && r.perc[0] === 3 && Math.abs(r.perc[1][0][0] - (LNG0 + 200 / 85000)) < 1e-9 && Math.abs(r.perc[1][1][0] - LNG0) < 1e-9 && r.perc[3] === 3 && Math.abs(r.perc[4] - 200 * 85000 / 85000 * 1) < 120 && r.perc[4] > 100);

  // ---- la finestra: i tre livelli ci sono, solo nel GeoPackage ----
  clic(app, $(app, 'btnGpkgSezioni3d'));
  const liv = () => [...app.d.querySelectorAll('#gisLivelli [data-livello-gis]')];
  t('nella finestra: foto, note e percorso, accesi', ['foto', 'note', 'percorso'].every(id => liv().some(c => c.dataset.livelloGis === id && c.checked && !c.disabled)));
  clic(app, app.d.querySelector('#gisFormato [data-formato="kml"]'));
  t('col KML i tre livelli non si possono scegliere', ['foto', 'note', 'percorso'].every(id => liv().some(c => c.dataset.livelloGis === id && c.disabled && !c.checked)));
  clic(app, app.d.querySelector('#gisFormato [data-formato="gpkg"]'));
  const n0 = app.scaricati.length;
  clic(app, $(app, 'gisEsporta'));
  await attesa(80);
  t('«Esporta» scarica il .gpkg con le foto dentro', app.scaricati.length === n0 + 1 && /\.gpkg$/.test(app.scaricati[n0].nome) && app.scaricati[n0].blob.size > 70000);
  if (app.dialogo()) clic(app, app.dialogo().ok);
  clic(app, $(app, 'gisChiudi'));

  // ---- l'assistente ----
  const lista = await app.E(`JSON.stringify(AI_STRUMENTI.find(x => x.n === 'elenco_livelli_gis').run({ formato: 'gpkg' }))`);
  const L = JSON.parse(lista);
  t('assistente: «elenco_livelli_gis» dice quali livelli ci sono e quanti', ['foto', 'note', 'percorso'].every(id => { const l = L.find(x => x.id === id); return l && l.disponibile && l.n > 0; }) && L.find(x => x.id === 'foto').n === 3);
  const kmlL = JSON.parse(await app.E(`JSON.stringify(AI_STRUMENTI.find(x => x.n === 'elenco_livelli_gis').run({ formato: 'kml' }))`));
  t('assistente: col KML foto, note e percorso non sono disponibili', ['foto', 'note', 'percorso'].every(id => !kmlL.find(x => x.id === id).disponibile));
  const n1 = app.scaricati.length;
  const es = JSON.parse(await app.E(`(async () => JSON.stringify(await AI_STRUMENTI.find(x => x.n === 'esporta_gis').run({ formato: 'gpkg', livelli: ['foto', 'note'] })))()`));
  t('assistente: «esporta_gis» scarica il file con i livelli chiesti', es.ok && es.livelli.join() === 'foto,note' && app.scaricati.length === n1 + 1 && /\.gpkg$/.test(app.scaricati[n1].nome));
  const r2 = leggi(Buffer.from(await app.scaricati[n1].blob.arrayBuffer()));
  t('(e quel file ha solo foto e note, integro)', r2 && r2.integrity === 'ok' && r2.perc === null && r2.foto.length === 3 && r2.note.length === 3 && !r2.tabelle.includes('prove'));
  let errore = '';
  try { await app.E(`(async () => { try { await AI_STRUMENTI.find(x => x.n === 'esporta_gis').run({ formato: 'gpkg', livelli: ['inesistente'] }); return ''; } catch (e) { return e.message; } })()`).then(m => { errore = m; }); } catch (e) { errore = String(e); }
  t('assistente: un livello che non esiste dà un errore chiaro', /sconosciuto/.test(errore));
  t('assistente: le parole «QGIS» o «esporta» portano i due strumenti', app.E(`aiStrumentiPer([{ r: 'u', t: 'esporta per QGIS' }]).map(x => x.n).filter(n => /gis/.test(n)).join()`) === 'elenco_livelli_gis,esporta_gis');

  // ---- foto troppo pesanti: si chiede se comprimerle (limite abbassato a 50 KB per la prova) ----
  app.E(`FOTO_GIS_BUDGET_BYTE = 50000; comprimiImmagineDataUrl = async (u, q) => { const b = u.split(',')[1]; return 'data:image/jpeg;base64,' + b.slice(0, Math.floor(b.length * q * 0.1 / 4) * 4); }`);
  const run = (arg) => app.E(`(async () => JSON.stringify(await AI_STRUMENTI.find(x => x.n === 'esporta_gis').run(${JSON.stringify(arg)})))()`).then(JSON.parse);
  const imm = async (i) => { const r3 = leggi(Buffer.from(await app.scaricati[i].blob.arrayBuffer())); return r3 && r3.foto; };
  let n2 = app.scaricati.length;
  const senza = await run({ formato: 'gpkg', livelli: ['foto'] });
  const F0 = await imm(n2);
  t('foto oltre il limite, senza risposta: le foto pesanti restano senza immagine e l\'avviso dice di chiedere (comprimi_foto)', senza.ok && senza.avvisi.some(a => /comprimi_foto/.test(a)) && F0 && F0.some(x => x[7] === null) && F0.some(x => x[7]));
  n2 = app.scaricati.length;
  const si = await run({ formato: 'gpkg', livelli: ['foto'], comprimi_foto: true });
  const F1 = await imm(n2);
  t('con comprimi_foto: tutte le foto hanno l\'immagine, più piccola, e l\'avviso lo dice', si.avvisi.some(a => /compresse/.test(a)) && F1 && F1.length === 3 && F1.every(x => x[7]) && F1.find(x => x[3] === 'Pesante')[7][0] < 70000);
  n2 = app.scaricati.length;
  const no = await run({ formato: 'gpkg', livelli: ['foto'], comprimi_foto: false });
  const F2 = await imm(n2);
  t('con comprimi_foto false: niente compressione, immagini oltre il limite fuori', F2 && F2.find(x => x[3] === 'Pesante')[7] === null && !no.avvisi.some(a => /compresse/.test(a)));
  // dalla finestra: chiede, e col «sì» le comprime
  clic(app, $(app, 'btnGpkgSezioni3d'));
  clic(app, $(app, 'gisNessuno'));
  app.d.querySelector('[data-livello-gis="foto"]').checked = true; app.d.querySelector('[data-livello-gis="foto"]').dispatchEvent(new app.w.Event('change', { bubbles: true }));
  n2 = app.scaricati.length;
  clic(app, $(app, 'gisEsporta'));
  await attesa(60);
  t('dalla finestra: chiede se comprimere le foto (con i MB e il limite)', !!app.dialogo() && /pesano .* MB/.test(app.dialogo().testo) && /Le comprimo/.test(app.dialogo().testo));
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(80);
  const F3 = app.scaricati.length === n2 + 1 ? await imm(n2) : null;
  t('dicendo di sì: il file ha tutte le immagini compresse', F3 && F3.every(x => x[7]) && F3.find(x => x[3] === 'Pesante')[7][0] < 70000);
  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})();
