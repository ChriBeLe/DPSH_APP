// L'AREA DI LAVORO DELLA MAPPA (presa da HyperGram): una finestra con i modi Mappa e 3D, la barra degli
// strumenti, i pannelli Livelli e Comandi (fissi ai lati, si possono solo ridurre; ricordati), la barra di
// stato, la tastiera del 3D, il tasto destro. (La mappa 2D vera, Leaflet con la rotazione, si è provata nel
// browser: qui jsdom non la carica; si provano la logica e il 3D.)
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
  app.w.HTMLCanvasElement.prototype.getContext = () => null;
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const P = `state.projects[${JSON.stringify(pid)}]`;
  app.E(`openProject(${JSON.stringify(pid)}); switchView('project')`);
  app.E(`(() => { const s = Object.values(${P}.surveys).find(s => s.header.provaNr == '3'); s.header.lat = 40.19690; s.header.lng = 17.99320; })()`);
  app.E('apriVista3d()');
  const am = $(app, 'modalVista3d');
  const rt = n => am.querySelector(`.mappa-rt[data-rt="${n}"]`);

  console.log('--- La finestra ---');
  t('una finestra sola, a tutto schermo: testata coi modi Mappa e 3D, barra degli strumenti, scena, barra di stato', am.classList.contains('area-mappa') && am.classList.contains('open')
    && am.querySelectorAll('[data-modo-mappa]').length === 2 && !!$(app, 'railMappa') && !!$(app, 'scenaAreaMappa') && !!$(app, 'statoAreaMappa'));
  t('si apre nel 3D; la barra di stato dice cosa c\'è', am.dataset.modo === '3d' && /3 prove · 0 sezioni/.test($(app, 'lblAreaMappaInfo').textContent));
  t(`gli strumenti di HyperGram: ${[...am.querySelectorAll('.mappa-rt span')].map(s => s.textContent).join(', ')}`, ['sel', 'orbita', 'sposta', 'profilo', 'misura', 'area', 'tutti', 'iniziale', 'alto', 'tasti'].every(n => rt(n)));
  clic(app, am.querySelector('[data-modo-mappa="mappa"]'));
  t('il modo Mappa: la scena 2D, gli strumenti del 2D (Area sì, Orbita no)', am.dataset.modo === 'mappa' && app.E('areaMappa.modo') === 'mappa');
  t('nel modo Mappa i livelli sono le prove e la mappa di base (le sezioni quando ci sono)', [...app.d.querySelectorAll('#livelliVista3d .liv-gruppo span')].map(e => e.textContent).join() === 'Prove,Sfondo' && app.d.querySelectorAll('#livelliVista3d [data-sfondo2d]').length === 1);
  clic(app, am.querySelector('[data-modo-mappa="3d"]'));

  console.log('--- Gli strumenti ---');
  clic(app, rt('misura'));
  t('uno strumento si accende (uno alla volta) e la barra di stato dice come si usa', rt('misura').classList.contains('attivo') && !rt('sel').classList.contains('attivo') && /Distanza/.test($(app, 'lblMappaProgetto').textContent));
  clic(app, rt('misura'));
  t('ritoccato, torna Seleziona', app.E('areaMappa.strumento') === 'sel');
  const lato = app.E(`testoMisura([{ lat: 40, lng: 18 }, { lat: 40 + 100 / 111195, lng: 18 }], false)`);
  const quadrato = app.E(`(() => { const dy = 100 / 111195, dx = 100 / (111195 * Math.cos(40 * Math.PI / 180)); return testoMisura([{ lat: 40, lng: 18 }, { lat: 40, lng: 18 + dx }, { lat: 40 + dy, lng: 18 + dx }, { lat: 40 + dy, lng: 18 }], true); })()`);
  t(`misura: «${lato}»; area di un quadrato di 100 m: «${quadrato}»`, /^Distanza 100(,0)? m$/.test(lato) && /^Area 10\.?000 m² · perimetro 400(,0)? m$/.test(quadrato));
  // Profilo nel 2D: due clic danno una traccia A-A' (la mappa vera non serve: i clic arrivano in gradi).
  app.E("modoAreaMappa('mappa'); scegliStrumentoMappa('profilo')");
  app.E('clicStrumentoMappa2d({ latlng: { lat: 40.1970, lng: 17.9920 } }); clicStrumentoMappa2d({ latlng: { lat: 40.1975, lng: 17.9935 } })');
  t('Profilo: due clic, e c\'è la sezione «A-A\'» (e si torna a Seleziona)', app.E(`(${P}.sezioniTracciate || []).map(t => t.nome).join()`) === "A-A'" && app.E('areaMappa.strumento') === 'sel' && /1 sezione/.test($(app, 'lblAreaMappaInfo').textContent));
  app.E("modoAreaMappa('3d')");
  clic(app, rt('profilo'));
  t('Profilo nel 3D: si traccia dall\'alto, come «Traccia una sezione»', !!app.E('vista3d.disegno') && $(app, 'btnTracciaSezione3d').getAttribute('aria-pressed') === 'true');
  clic(app, rt('sel'));
  t('(e lasciandolo la traccia in corso sparisce)', !app.E('vista3d.disegno'));
  clic(app, rt('tasti'));
  t('«Tasti»: le scorciatoie del 3D', !$(app, 'tastiMappa3d').hidden && /W A S D/.test($(app, 'tastiMappa3d').textContent));
  clic(app, rt('tasti'));

  console.log('--- La tastiera del 3D ---');
  const tasto = (k, tipo = 'keydown', extra = {}) => app.d.dispatchEvent(new app.w.KeyboardEvent(tipo, { key: k, bubbles: true, cancelable: true, ...extra }));
  tasto('w');
  t('W tenuto premuto: si va avanti (il passo dura finché lo si tiene)', app.E('moto3d.tasti.has("w")'));
  tasto('w', 'keyup');
  t('lasciato, ci si ferma', !app.E('moto3d.tasti.has("w")'));
  const c0 = app.E('JSON.stringify(vista3d.centro)');
  app.E("moto3d.tasti.add('d'); vista3d.az = 0;");
  await attesa(80);
  app.E("moto3d.tasti.delete('d')");
  t(`D va di lato, verso destra (con la vista verso Nord, verso Est): ${c0} → ${app.E('JSON.stringify(vista3d.centro.map(v => +v.toFixed(2)))')}`, app.E('vista3d.centro[0]') > 0 && Math.abs(app.E('vista3d.centro[1]')) < 1e-9);
  const pr = app.E('vista3d.prospettiva');
  tasto('o');
  t('O accende e spegne la prospettiva', app.E('vista3d.prospettiva') === !pr);
  tasto('o');
  rt('misura').click();
  tasto('Escape');
  t('Esc lascia lo strumento (e non chiude la finestra)', app.E('areaMappa.strumento') === 'sel' && am.classList.contains('open'));

  console.log('--- I pannelli ---');
  const pnl = k => app.d.querySelector(`.am-pnl[data-pnl="${k}"]`);
  t('Livelli agganciato a sinistra, Comandi a destra; la vista rientra di quanto sono larghi', pnl('liv').classList.contains('dl') && pnl('cmd').classList.contains('dr')
    && am.querySelector('.am-vista').style.getPropertyValue('--vl') === '250px' && am.querySelector('.am-vista').style.getPropertyValue('--vr') === '340px');
  t('fissi: niente da staccare, spostare o cambiare di lato (solo «riduci»)', !am.querySelector('[data-pnl-azione="pin"], [data-pnl-azione="lato"]') && !!pnl('cmd').querySelector('[data-pnl-azione="riduci"]'));
  clic(app, pnl('cmd').querySelector('[data-pnl-azione="riduci"]'));
  t('Comandi ridotto: resta la testata, la vista prende il posto', pnl('cmd').classList.contains('red') && pnl('cmd').classList.contains('dr') && am.querySelector('.am-vista').style.getPropertyValue('--vr') === '0px');
  clic(app, pnl('cmd').querySelector('[data-pnl-azione="riduci"]'));
  clic(app, $(app, 'btnLivelli3d'));
  t('Livelli ridotto dal suo titolo', pnl('liv').classList.contains('red') && am.querySelector('.am-vista').style.getPropertyValue('--vl') === '0px');
  t('ricordato', app.w.localStorage.getItem('dpsh.pannelliMappa') === '{"liv":{"red":true},"cmd":{"red":false}}');
  clic(app, $(app, 'btnLivelli3d'));

  console.log('--- Il tasto destro ---');
  const id1 = app.E(`Object.values(${P}.surveys).find(s => s.header.provaNr == '1').id`);
  app.E(`menuProvaMappa(new MouseEvent('contextmenu', { clientX: 300, clientY: 200 }), ${JSON.stringify(id1)})`);
  const menu = $(app, 'menuRiga');
  t(`su una prova: ${[...menu.querySelectorAll('[data-voce]')].map(b => b.textContent).join(', ')}`, menu.classList.contains('open') && /Apri la prova/.test(menu.textContent) && /Modifica dati/.test(menu.textContent) && /Sposta/.test(menu.textContent) && !$(app, 'schedaProvaMappa').hidden);
  app.E(`menuTracciaMappa(new MouseEvent('contextmenu', { clientX: 300, clientY: 200 }), ${P}.sezioniTracciate[0])`);
  t(`su una traccia: ${[...menu.querySelectorAll('[data-voce]')].map(b => b.textContent).join(', ')}`, /Vedi la sezione/.test(menu.textContent) && /Rinomina/.test(menu.textContent) && /Elimina/.test(menu.textContent));
  clic(app, [...menu.querySelectorAll('[data-voce]')].find(b => /Rinomina/.test(b.textContent)));
  await attesa(40);
  const d = app.dialogo();
  if (d) { app.d.querySelector('#appDialog input, #appDialog textarea').value = "Z-Z'"; clic(app, d.ok); }
  await attesa(40);
  t('«Rinomina…» cambia il nome della traccia', app.E(`${P}.sezioniTracciate[0].nome`) === "Z-Z'");

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
