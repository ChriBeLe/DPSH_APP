// SPOSTARE SULLA MAPPA SOLO CON «SPOSTA» (O ALT). Con Seleziona (o un altro strumento) niente si trascina:
// né sezioni, né prove, né punti, vertici o poligoni disegnati. Con lo strumento Sposta, o tenendo premuto
// ALT, compaiono le maniglie e si trascina: il vertice di un poligono, il poligono intero preso da dentro, un
// punto, una prova (che passa dalla doppia conferma). Nel 3D qui; sulla mappa 2D (Leaflet, non in jsdom) si
// guarda che le maniglie ci siano solo allora.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const $ = (app, id) => app.d.getElementById(id);
const LAT0 = 40.1968, LNG0 = 17.993, G = (x, y) => ({ lat: LAT0 + y / 111000, lng: LNG0 + x / 85000 });

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
  const copia = x => JSON.parse(JSON.stringify(x));
  app.E(`creaDisegno('poligono', ${JSON.stringify([G(-60, -50), G(-20, -50), G(-20, -20), G(-60, -20)])}); creaDisegno('punto', [${JSON.stringify(G(170, 100))}])`);
  const poli = () => copia(app.E(`disegniDelProgetto().find(x => x.tipo === 'poligono')`)), punto = () => copia(app.E(`disegniDelProgetto().find(x => x.tipo === 'punto')`));
  app.E(`vista3d.az = 0; vista3d.el = Math.PI / 2 - 0.01; vista3d.zoom = 1; vista3d.centro = [0, 0, 0]; renderVista3d()`);
  const box = $(app, 'graficoVista3d');
  const ev = (tipo, x, y) => box.dispatchEvent(new app.w.MouseEvent(tipo, { bubbles: true, clientX: x, clientY: y, button: 0 }));
  const trascina = (x0, y0, x1, y1) => { ev('pointerdown', x0, y0); ev('pointermove', (x0 + x1) / 2, (y0 + y1) / 2); ev('pointermove', x1, y1); ev('pointerup', x1, y1); };
  const schermo = g => copia(app.E(`(() => { const q = datiVista3dCorrenti.daGeo(${g.lat}, ${g.lng}); return schermoDalSuolo3d(q[0], q[1]); })()`));
  const maniglie = () => app.E(`ultimaScena3d.tutte.filter(f => f.cls === 'vista3d-maniglia').length`);

  // ---- Con Seleziona: niente si sposta, niente maniglie ----
  let p0 = poli(), v = schermo(p0.punti[0]);
  trascina(v[0], v[1], v[0] + 30, v[1] + 30);
  t('con Seleziona niente maniglie e il vertice del poligono non si sposta', maniglie() === 0 && JSON.stringify(poli().punti) === JSON.stringify(p0.punti));
  ['misura', 'orbita', 'profilo'].forEach(s => app.E(`scegliStrumentoMappa('${s}')`));
  app.E(`scegliStrumentoMappa('sel')`);
  t('(né con gli altri strumenti: le maniglie ci sono solo con Sposta o ALT)', !app.E(`(() => { scegliStrumentoMappa('misura'); const a = modificaMappaAttiva(); scegliStrumentoMappa('sel'); return a; })()`));

  // ---- Strumento Sposta: maniglie e trascinamenti ----
  app.E(`scegliStrumentoMappa('sposta'); vista3d.az = 0; vista3d.el = Math.PI / 2 - 0.01; renderVista3d()`);
  const n = app.E(`2 * tracceDelProgetto().length + datiVista3dCorrenti.prove.length + disegniDelProgetto().reduce((s, x) => s + x.punti.length, 0)`);
  t(`strumento Sposta: le maniglie su sezioni, prove e disegni (${maniglie()})`, maniglie() === n);
  p0 = poli(); v = schermo(p0.punti[0]);
  trascina(v[0], v[1], v[0] + 20, v[1]);
  let p1 = poli();
  t('il vertice del poligono si trascina (gli altri restano) e si salva', p1.punti[0].lng > p0.punti[0].lng + 1e-6 && JSON.stringify(p1.punti.slice(1)) === JSON.stringify(p0.punti.slice(1))
    && JSON.stringify(JSON.parse(app.salvato()).projects[pid].disegni.find(x => x.tipo === 'poligono').punti[0]) === JSON.stringify(p1.punti[0]));
  const c = schermo({ lat: p1.punti.reduce((s, q) => s + q.lat, 0) / 4, lng: p1.punti.reduce((s, q) => s + q.lng, 0) / 4 });
  trascina(c[0], c[1], c[0], c[1] + 25);
  const p2 = poli();
  const dl = p2.punti[0].lat - p1.punti[0].lat, dg = p2.punti[0].lng - p1.punti[0].lng;
  t('preso da dentro, il poligono si sposta tutto (tutti i vertici dello stesso tanto)', Math.abs(dl) > 1e-6 && p2.punti.every((q, i) => Math.abs(q.lat - p1.punti[i].lat - dl) < 1e-9 && Math.abs(q.lng - p1.punti[i].lng - dg) < 1e-9));
  const pt0 = punto(), sp = schermo(pt0.punti[0]);
  trascina(sp[0], sp[1], sp[0] - 15, sp[1] - 15);
  t('il punto disegnato si trascina', Math.hypot(punto().punti[0].lat - pt0.punti[0].lat, punto().punti[0].lng - pt0.punti[0].lng) > 1e-6);

  // ---- Una prova: trascinata, chiede la doppia conferma; annullando resta dov'era ----
  const id = 'g1_1', h = () => copia(app.E(`${P}.surveys.g1_1.header`)), h0 = h();
  const col = copia(app.E(`ultimaScena3d.colonne.find(c => c.id === 'g1_1')`)), cx = (col.x1 + col.x2) / 2, cy = (col.y1 + col.y2) / 2;
  const spostaProva = async (risposte) => {
    app.E(`renderVista3d()`);
    const cc = copia(app.E(`ultimaScena3d.colonne.find(c => c.id === 'g1_1')`)), x = (cc.x1 + cc.x2) / 2, y = (cc.y1 + cc.y2) / 2;
    trascina(x, y, x + 25, y);
    for (const r of risposte) { await attesa(40); const d = app.dialogo(); if (!d) break; (r ? d.ok : d.annulla).dispatchEvent(new app.w.MouseEvent('click', { bubbles: true })); }
    await attesa(60);
  };
  void cx; void cy;
  await spostaProva([true, false]);
  t('la prova trascinata nel 3D chiede la doppia conferma; annullata, resta dov\'era', h().lat === h0.lat && h().lng === h0.lng && !h().spostamento);
  await spostaProva([true, true]);
  t('confermata, si sposta (verso Est) e la posizione di prima resta in memoria', parseFloat(h().lng) > parseFloat(h0.lng) && h().spostamento && h().spostamento.da.lat === parseFloat(h0.lat) && app.E('state.currentSurveyId') === id);

  // ---- ALT: con Seleziona, tenuto premuto, le maniglie; lasciato, via ----
  app.E(`scegliStrumentoMappa('sel'); renderVista3d()`);
  const tasto = tipo => app.d.dispatchEvent(new app.w.KeyboardEvent(tipo, { key: 'Alt', bubbles: true, cancelable: true }));
  tasto('keydown');
  const conAlt = maniglie(), pp0 = punto(), s2 = schermo(pp0.punti[0]);
  trascina(s2[0], s2[1], s2[0] + 20, s2[1] + 10);
  const conAltMosso = Math.hypot(punto().punti[0].lat - pp0.punti[0].lat, punto().punti[0].lng - pp0.punti[0].lng) > 1e-6;
  tasto('keyup');
  t(`ALT tenuto premuto: le maniglie (${conAlt}) e si sposta; lasciato ALT, spariscono`, conAlt === n && conAltMosso && maniglie() === 0 && !$(app, 'modalVista3d').classList.contains('con-alt'));

  // ---- Il perimetro del modello: spostato un vertice, il modello lo segue ----
  const idPoli = app.E(`disegniDelProgetto().find(x => x.tipo === 'poligono').id`);
  app.E(`creaDisegno('poligono', ${JSON.stringify([G(-50, -50), G(170, -50), G(170, 120), G(-50, 120)])}); usaPerimetroModello(disegniDelProgetto()[disegniDelProgetto().length - 1].id)`);
  void idPoli;
  const perim = () => copia(app.E('involucroModello(modelloSolido(datiVista3dCorrenti))'));
  const prima = perim();
  app.E(`scegliStrumentoMappa('sposta'); vista3d.az = 0; vista3d.el = Math.PI / 2 - 0.01; vista3d.zoom = 1; vista3d.centro = [0, 0, 0]; renderVista3d()`);
  const xPer = copia(app.E(`disegniDelProgetto()[disegniDelProgetto().length - 1]`)), vv = schermo(xPer.punti[1]);
  trascina(vv[0], vv[1], vv[0] + 20, vv[1]);
  const dopo = perim();
  t('spostato un vertice del perimetro del modello 3D, il corpo arriva fin lì', dopo.some(q => !prima.some(r => Math.hypot(q[0] - r[0], q[1] - r[1]) < 0.5)));

  // ---- Sulla mappa 2D (Leaflet: provata nel browser): maniglie solo con Sposta o ALT ----
  const src = n => fs.readFileSync(path.join(__dirname, '..', 'src', 'js', n), 'utf8');
  const l = src('071l_mappa-progetto.js'), dn = src('071n_disegni.js');
  t('sulla mappa 2D: sezioni, prove e disegni si trascinano solo con le maniglie accese', /if \(modificaMappaAttiva\(\)\) \{/.test(l) && /draggable: mobile/.test(l) && /const mobile = modificaMappaAttiva\(\)/.test(l)
    && /if \(modificaMappaAttiva\(\)\) maniglieDisegno2d/.test(dn) && !/areaMappa\.strumento === 'sel'/.test(l));

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})();
