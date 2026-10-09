// SPOSTARE LE SEZIONI IN TEMPO REALE. Nel 3D (strumento Seleziona) una sezione si prende col mouse:
// dalla linea si sposta tutta, da un estremo (A o A') si allunga o si gira. Mentre si trascina la
// scena si ridisegna; se il corpo è tagliato su quella sezione, il taglio la segue (di lato resta
// Nord–Sud/Est–Ovest e il cursore del taglio si sposta; girata, il taglio va di sbieco con lei). Si
// salva quando si lascia. Sulla mappa 2D gli estremi hanno la loro maniglia e la linea si trascina.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const $ = (app, id) => app.d.getElementById(id);

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
      sv.header.lat = 40.1968 + j * 35 / 111000; sv.header.lng = 17.993 + i * 40 / 85000; S[id] = sv; } })()`);
  app.E(`openProject(${JSON.stringify(pid)}); apriVista3d('3d')`);
  await attesa(50);
  app.E(`vista3d.livelli.solido = true; creaGrigliaAssi3d(1, 1); vista3d.az = 0.3; vista3d.el = 0.9; renderVista3d()`);
  const copia = x => JSON.parse(JSON.stringify(x)); // app.E dà gli oggetti vivi dell'app: se ne tiene una copia
  const A = copia(app.E(`tracceDelProgetto().find(t => t.asse === 'ns')`));
  app.E(`tagliaSullaTraccia3d(tracceDelProgetto().find(t => t.asse === 'ns'))`);
  t('di partenza: la sezione A-A\' della griglia, il corpo tagliato lì', A && Math.abs(app.E('vista3d.taglio.pos') - A.pos) < 1e-9 && app.E('vista3d.taglio.dir') === 'ns');

  // dove sta la traccia sullo schermo
  const segmenti = () => app.E(`ultimaScena3d.tutte.filter(f => f.cls === 'vista3d-traccia' && f.traccia === ${JSON.stringify(A.id)}).map(f => [f.x1, f.y1, f.x2, f.y2])`);
  const box = $(app, 'graficoVista3d');
  const ev = (tipo, x, y) => box.dispatchEvent(new app.w.MouseEvent(tipo, { bubbles: true, clientX: x, clientY: y, button: 0 }));
  let s = segmenti(), m = s[12];
  t('sotto il mouse, a metà della linea: «tutta»; su un estremo: quell\'estremo', app.E(`tracciaSottoIlMouse3d(${m[0]}, ${m[1]}).parte`) === 'tutta' && app.E(`tracciaSottoIlMouse3d(${s[0][0]}, ${s[0][1]}).parte`) === 'a'
    && app.E(`tracciaSottoIlMouse3d(${s[s.length - 1][2]}, ${s[s.length - 1][3]}).parte`) === 'b');
  const az0 = app.E('vista3d.az');
  ev('pointerdown', m[0], m[1]);
  ev('pointermove', m[0] + 40, m[1]);
  const durante = copia(app.E(`({ pos: tracceDelProgetto().find(t => t.id === ${JSON.stringify(A.id)}).pos, taglio: vista3d.taglio.pos })`));
  t(`trascinata di lato: si sposta mentre si trascina (pos ${A.pos.toFixed(3)} → ${durante.pos.toFixed(3)}) e il taglio la segue`, Math.abs(durante.pos - A.pos) > 0.01 && Math.abs(durante.taglio - durante.pos) < 1e-9 && app.E('vista3d.az') === az0);
  ev('pointermove', m[0] + 80, m[1] + 10);
  ev('pointerup', m[0] + 80, m[1] + 10);
  const dopo = copia(app.E(`tracceDelProgetto().find(t => t.id === ${JSON.stringify(A.id)})`));
  t('lasciata: salvata nel progetto, ancora della griglia (Nord–Sud), e la vista non è girata', JSON.stringify(JSON.parse(app.salvato()).projects[pid].sezioniTracciate.find(t => t.id === A.id).a) === JSON.stringify(dopo.a)
    && dopo.asse === 'ns' && app.E(`(() => { const d = datiVista3dCorrenti, t = tracceDelProgetto().find(t => t.id === ${JSON.stringify(A.id)}); return Math.abs(d.daGeo(t.a.lat, t.a.lng)[0] - d.daGeo(t.b.lat, t.b.lng)[0]) < 1e-6; })()`) && app.E('vista3d.az') === az0 && Math.abs(app.E('vista3d.taglio.pos') - dopo.pos) < 1e-9);
  t('(il cursore del taglio è andato con lei)', Number($(app, 'rngTaglioV3d').value) === Math.round(dopo.pos * 100));

  // un estremo: la sezione si gira, il taglio la segue di sbieco
  s = segmenti();
  ev('pointerdown', s[0][0], s[0][1]);
  ev('pointermove', s[0][0] + 60, s[0][1] + 15);
  ev('pointerup', s[0][0] + 60, s[0][1] + 15);
  const girata = copia(app.E(`tracceDelProgetto().find(t => t.id === ${JSON.stringify(A.id)})`));
  t('dall\'estremo A: A si sposta, A\' resta; ora è una sezione di sbieco', Math.abs(girata.b.lat - dopo.b.lat) < 1e-7 && Math.abs(girata.b.lng - dopo.b.lng) < 1e-7 && Math.hypot(girata.a.lat - dopo.a.lat, girata.a.lng - dopo.a.lng) > 1e-5 && !girata.asse && !girata.griglia);
  t('e il corpo resta tagliato lungo di lei', !app.E('vista3d.taglio.dir') && app.E('vista3d.taglio.traccia') === A.id && app.E(`(() => { const d = datiVista3dCorrenti, a = d.daGeo(${girata.a.lat}, ${girata.a.lng}); return Math.hypot(vista3d.taglio.retta[0][0] - a[0], vista3d.taglio.retta[0][1] - a[1]) < 1e-6; })()`));
  t('(una sezione non sotto il mouse: si gira la vista, come prima)', (() => { ev('pointerdown', 5, 5); ev('pointermove', 60, 5); ev('pointerup', 60, 5); return app.E('vista3d.az') !== az0; })());

  // Sulla mappa 2D (Leaflet: jsdom non la carica, provata nel browser): maniglie degli estremi trascinabili
  // e linea trascinabile, che passano dalla stessa spostaTraccia.
  const src2d = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', '071l_mappa-progetto.js'), 'utf8');
  t('sulla mappa 2D gli estremi hanno la maniglia trascinabile e la linea si trascina', /mappa-traccia-maniglia/.test(src2d) && /draggable: true/.test(src2d) && /linea\.on\('mousedown'/.test(src2d) && (src2d.match(/spostaTraccia\(t,/g) || []).length === 2);
  app.E(`(() => { const t = tracceDelProgetto().find(x => x.id === ${JSON.stringify(A.id)}); spostaTraccia(t, { lat: t.a.lat + 0.0001, lng: t.a.lng }, t.b, false); fineSpostaTraccia(); })()`);
  t('(spostare un estremo dalla mappa passa di qui: salvato)', JSON.parse(app.salvato()).projects[pid].sezioniTracciate.find(t => t.id === A.id).a.lat === app.E(`tracceDelProgetto().find(t => t.id === ${JSON.stringify(A.id)}).a.lat`));

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})();
