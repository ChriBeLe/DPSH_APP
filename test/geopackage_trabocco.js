// GEOPACKAGE CON RIGHE PIÙ GRANDI DI UNA PAGINA (pagine di trabocco di SQLite). Lo stile QML di un layer è una
// riga sola: con 25-35 elementi stilizzati superava i 64 KB e l'esportazione falliva senza produrre il file.
// Qui: (1) fileSqlite con testi e blob di ogni misura attorno alle soglie, riletti da Python/sqlite3;
// (2) l'esportazione vera di 80 punti e 40 poligoni disegnati, ognuno col suo stile.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true, cancelable: true }));
const LAT0 = 40.1968, LNG0 = 17.993;

const PY = `
import sqlite3, sys, json, hashlib
c = sqlite3.connect(sys.argv[1])
r = {'integrity': c.execute('PRAGMA integrity_check').fetchone()[0], 'pagine': c.execute('PRAGMA page_count').fetchone()[0]}
for nome in sys.argv[2:]:
    r[nome] = [[len(x) if x is not None else None, hashlib.md5(x.encode() if isinstance(x, str) else x).hexdigest()] for (x,) in c.execute('select v from ' + nome + ' order by id')] if nome.startswith('prova') else None
if len(sys.argv) == 2:
    r['stili'] = [[a, len(q)] for a, q in c.execute('select f_table_name, styleQML from layer_styles order by id')]
    for tab in ('disegni_punti', 'disegni_poligoni'):
        try: r[tab] = c.execute('select count(*) from ' + tab).fetchone()[0]
        except Exception as e: r[tab] = str(e)
print(json.dumps(r))
`;
const apriConPython = (byte, tabelle = []) => {
  const dove = path.join(os.tmpdir(), 'dpsh_trabocco_' + process.pid + '.gpkg');
  fs.writeFileSync(dove, Buffer.from(byte));
  try { return JSON.parse(execFileSync('python3', ['-c', PY, dove, ...tabelle], { encoding: 'utf8' })); }
  catch (e) { return { errore: String(e.stderr || e.message).slice(-300) }; }
  finally { fs.rmSync(dove, { force: true }); }
};

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  app.w.HTMLCanvasElement.prototype.getContext = () => null;
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);

  // ---- (1) il livello basso: record di misure attorno alle soglie ----
  const misure = [10, 8199, 65400, 65501, 65502, 65503, 65520, 65535, 65536, 65537, 70000, 131072 - 8, 131072 + 9, 200000, 400000];
  const r1 = app.E(`(() => {
    const misure = ${JSON.stringify(misure)}, righe = [];
    // testi da 1 byte per carattere, con contenuto che cambia (così un pezzo fuori posto si vede dall'md5)
    const testo = n => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(97 + (i * 7 + (i >> 8)) % 26); return s; };
    misure.forEach((n, i) => righe.push({ rowid: i + 1, valori: [null, testo(n)] }));
    // anche blob e righe con più colonne grandi
    righe.push({ rowid: 100, valori: [null, testo(70000)] });
    return Array.from(fileSqlite([{ nome: 'prova_a', sql: 'CREATE TABLE prova_a (id INTEGER PRIMARY KEY, v TEXT)', righe }]));
  })()`);
  const a = apriConPython(r1, ['prova_a']);
  const md5 = s => require('crypto').createHash('md5').update(s).digest('hex');
  const testo = n => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(97 + (i * 7 + (i >> 8)) % 26); return s; };
  const attese = [...misure, 70000].map(n => [n, md5(testo(n))]);
  t(`SQLite apre un file con righe da ${misure.length} misure fino a 400 KB, attorno alle soglie (${a.pagine} pagine): integrity_check «${a.integrity}»`, a.integrity === 'ok');
  t('ogni testo si rilegge uguale (lunghezza e md5)', !!a.prova_a && JSON.stringify(a.prova_a) === JSON.stringify(attese));
  // più righe grandi e piccole mescolate in più tabelle, con le foglie su più pagine
  const r2 = app.E(`(() => {
    const t1 = [], t2 = [];
    for (let i = 1; i <= 40; i++) t1.push({ rowid: i, valori: [null, 'x'.repeat(i % 3 ? 3000 * i : 10)] });
    for (let i = 1; i <= 5; i++) t2.push({ rowid: i, valori: [null, 'y'.repeat(100000 + i)] });
    return Array.from(fileSqlite([{ nome: 'prova_b', sql: 'CREATE TABLE prova_b (id INTEGER PRIMARY KEY, v TEXT)', righe: t1 }, { nome: 'prova_c', sql: 'CREATE TABLE prova_c (id INTEGER PRIMARY KEY, v TEXT)', righe: t2 }]));
  })()`);
  const b = apriConPython(r2, ['prova_b', 'prova_c']);
  t('due tabelle con 40 righe da fino a 120 KB (radice interna e trabocchi insieme): integre, lunghezze giuste',
    b.integrity === 'ok' && b.prova_b && b.prova_b.length === 40 && b.prova_b.every(([n], i) => n === ((i + 1) % 3 ? 3000 * (i + 1) : 10)) && b.prova_c.every(([n], i) => n === 100001 + i));

  // ---- (2) l'esportazione vera ----
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  app.E(`openProject(${JSON.stringify(pid)}); apriVista3d('3d')`);
  app.E(`(() => {
    const colori = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6'], simboli = ['stella', 'cerchio', 'quadrato', 'rombo', 'triangolo'];
    for (let i = 0; i < 80; i++) {
      creaDisegno('punto', [{ lat: ${LAT0} + (i % 20) * 0.0002, lng: ${LNG0} + Math.floor(i / 20) * 0.0002 }]);
    }
    for (let i = 0; i < 40; i++) {
      const la = ${LAT0} + 0.01 + (i % 12) * 0.0004, ln = ${LNG0} + Math.floor(i / 12) * 0.0004;
      creaDisegno('poligono', [{ lat: la, lng: ln }, { lat: la + 0.0002, lng: ln }, { lat: la + 0.0002, lng: ln + 0.0002 }, { lat: la, lng: ln + 0.0002 }]);
    }
    disegniDelProgetto().forEach((x, i) => salvaStile('d:' + x.id, { simbolo: simboli[i % 5], colore: colori[i % 5], etichettaDimensione: 10 + (i % 7), etichettaPosizione: ['sopra', 'sotto', 'destra', 'sinistra'][i % 4] }));
  })()`);
  await attesa(30);
  let esito = app.E(`(() => { try { const r = geopackageGis(state.projects[state.currentProjectId], datiVista3dCorrenti, { punti: true, poligoni: true }); return { n: r.length, byte: Array.from(r) }; } catch (e) { return { errore: e.message }; } })()`);
  t('80 punti e 40 poligoni disegnati, ognuno col suo stile: l\'esportazione non fallisce', !esito.errore && esito.n > 0);
  if (esito.errore) console.log('       ', esito.errore);
  const g = esito.byte && apriConPython(esito.byte);
  t(`SQLite apre il GeoPackage (${esito.n} byte, ${g && g.pagine} pagine) e dice «${g && g.integrity}»`, g && g.integrity === 'ok');
  const grosso = g && g.stili && g.stili.find(s => s[0] === 'disegni_punti');
  t(`lo stile degli 80 punti è una riga sola di ${grosso && grosso[1]} byte (più di una pagina), riletta intera`, grosso && grosso[1] > 65536 && g.disegni_punti === 80 && g.disegni_poligoni === 40);

  // l'esportazione dal menu, come l'utente
  clic(app, app.d.getElementById('btnGpkgSezioni3d'));
  clic(app, app.d.querySelector('#gisFormato [data-formato="gpkg"]'));
  clic(app, app.d.getElementById('gisTutti'));
  const n0 = app.scaricati.length;
  clic(app, app.d.getElementById('gisEsporta'));
  await attesa(80);
  t('dal menu «Esporta…» il file si scarica (prima: errore e niente file)', app.scaricati.length === n0 + 1 && !app.dialogo());

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
