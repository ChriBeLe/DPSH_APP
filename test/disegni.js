// I DISEGNI, come in HyperGram: gli strumenti «Punto» e «Poligono» della barra; ogni disegno è una riga
// del gruppo «Disegnati» nei Livelli (spunta, opacità, «T» del gruppo per i nomi; tasto destro:
// inquadra, rinomina, colore, elimina); si vedono sulla mappa 2D e nel 3D, e restano nel progetto.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const ev = (app, el, tipo) => el && el.dispatchEvent(new app.w.MouseEvent(tipo, { bubbles: true, cancelable: true, clientX: 300, clientY: 200 }));
const clic = (app, el) => ev(app, el, 'click');
const $ = (app, id) => app.d.getElementById(id);

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  app.w.HTMLCanvasElement.prototype.getContext = () => null;
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const P = `state.projects[${JSON.stringify(pid)}]`;
  app.E(`openProject(${JSON.stringify(pid)}); switchView('project')`);
  app.E(`(() => { const s = Object.values(${P}.surveys).find(s => s.header.provaNr == '3'); s.header.lat = 40.19690; s.header.lng = 17.99320; })()`);
  app.E('apriVista3d()');
  const am = $(app, 'modalVista3d'), albero = $(app, 'livelliVista3d'), menu = $(app, 'menuRiga');
  const voci = () => [...menu.querySelectorAll('[data-voce]')].map(b => b.textContent);
  const voce = re => [...menu.querySelectorAll('[data-voce]')].find(b => re.test(b.textContent));
  const scena = cls => app.E(`ultimaScena3d.sopra.filter(f => f.cls === '${cls}').length`);

  console.log('--- Gli strumenti ---');
  t('nella barra: «Punto» e «Poligono»', !!am.querySelector('.mappa-rt[data-rt="punto"]') && !!am.querySelector('.mappa-rt[data-rt="poligono"]'));
  app.E("modoAreaMappa('mappa')");
  clic(app, am.querySelector('.mappa-rt[data-rt="punto"]'));
  app.E('clicStrumentoMappa2d({ latlng: { lat: 40.19720, lng: 17.99250 } }); clicStrumentoMappa2d({ latlng: { lat: 40.19700, lng: 17.99300 } })');
  t('«Punto»: un clic, un punto (si resta nello strumento)', app.E(`${P}.disegni.map(x => x.nome).join()`) === 'Punto 1,Punto 2' && app.E('areaMappa.strumento') === 'punto');
  clic(app, am.querySelector('.mappa-rt[data-rt="poligono"]'));
  const dy = 50 / 111195, dx = 50 / (111195 * Math.cos(40.197 * Math.PI / 180));
  app.E(`[[40.197, 17.992], [40.197, ${17.992 + dx}], [${40.197 + dy}, ${17.992 + dx}], [${40.197 + dy}, ${17.992 + dx}]].forEach(([lat, lng]) => clicStrumentoMappa2d({ latlng: { lat, lng } }))`);
  t('mentre si disegna: area e perimetro sulla mappa', /Area \d/.test(app.E('testoMisura(areaMappa.misura.punti, true)')));
  app.E('finisciMisura()');
  const pol = app.E(`${P}.disegni.find(x => x.tipo === 'poligono')`);
  t(`«Poligono»: doppio clic o Invio lo salva («${pol && pol.nome}», ${pol && pol.punti.length} vertici: il doppio clic ripetuto non conta) e si torna a Seleziona`, pol && pol.nome === 'Poligono 1' && pol.punti.length === 3 && app.E('areaMappa.strumento') === 'sel' && !app.E('areaMappa.misura'));
  t('la barra di stato li conta', /3 disegni/.test($(app, 'lblAreaMappaInfo').textContent));

  console.log('--- Nei Livelli ---');
  const righe = () => [...albero.querySelectorAll('[data-disegno3d]')];
  t(`il gruppo «Disegnati»: ${righe().map(r => r.textContent.trim()).join(' · ')}`, righe().length === 3 && !!albero.querySelector('[data-etichette-gruppo="disegni"]') && /1250 m²|1\.250 m²/.test(righe()[2].textContent));
  app.E("modoAreaMappa('3d')");
  t('nel 3D: il punto, il poligono (lati sul terreno) e i nomi', scena('vista3d-disegno') > 3 && scena('vista3d-disegno-nome') === 3);
  clic(app, albero.querySelector('[data-etichette-gruppo="disegni"]'));
  t('«T» del gruppo: via i nomi', scena('vista3d-disegno-nome') === 0);
  clic(app, albero.querySelector('[data-etichette-gruppo="disegni"]'));
  clic(app, righe()[0].querySelector('input'));
  t('la spunta spegne un disegno', app.E(`vista3d.disegniNascosti.has(${P}.disegni[0].id)`) && scena('vista3d-disegno-nome') === 2);
  clic(app, righe()[0].querySelector('input'));

  console.log('--- Il tasto destro ---');
  ev(app, righe()[2], 'contextmenu');
  t(`sul poligono: ${voci().join(', ')}`, ['Inquadra', 'Opacità…100%', 'Rinomina…', 'Elimina'].every(v => voci().includes(v)) && voci().some(v => /^Colore/.test(v)));
  clic(app, voce(/^Colore/));
  await attesa(20);
  clic(app, [...menu.querySelectorAll('[data-voce]')][4]);
  t('«Colore…»: otto colori, se ne sceglie uno', app.E(`${P}.disegni[2].colore`) === '#ef4444');
  ev(app, righe()[2], 'contextmenu');
  clic(app, voce(/^Rinomina/));
  await attesa(30);
  let d = app.dialogo();
  if (d) { app.d.querySelector('#appDialog input').value = 'Area di cantiere'; clic(app, d.ok); }
  await attesa(30);
  t('«Rinomina…»', app.E(`${P}.disegni[2].nome`) === 'Area di cantiere' && /Area di cantiere/.test(righe()[2].textContent));
  ev(app, righe()[0], 'contextmenu');
  clic(app, voce(/^Elimina/));
  await attesa(30);
  d = app.dialogo();
  if (d) clic(app, d.ok);
  await attesa(30);
  t('«Elimina» (con conferma)', app.E(`${P}.disegni.length`) === 2 && righe().length === 2);
  t('restano nel progetto salvato', /Area di cantiere/.test(app.w.localStorage.getItem('dpsh_app_state') || ''));

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
