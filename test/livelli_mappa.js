// IL PANNELLO LIVELLI DELLA MAPPA, come in HyperGram: le etichette non sono livelli a sé, le accende il
// tasto «T» sulla riga del loro livello (per prove e sezioni, una per una); clic = la riga si
// evidenzia, doppio clic = inquadra, tasto destro = il menu del livello (inquadra, etichette,
// opacità e le voci sue); la mappa di base è una riga sola, col tasto destro per cambiarla.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const ev = (app, el, tipo, extra = {}) => el && el.dispatchEvent(new app.w.MouseEvent(tipo, { bubbles: true, cancelable: true, clientX: 300, clientY: 200, ...extra }));
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
  app.E(`Object.values(${P}.surveys).forEach(s => { s.header.faldaDa = '1.5'; })`);
  app.E('apriVista3d()');
  const albero = $(app, 'livelliVista3d'), menu = $(app, 'menuRiga');
  const svg = () => { const div = app.d.createElement('div'); div.innerHTML = app.E('svgDaScena(ultimaScena3d)'); return div.firstElementChild; };
  const conta = sel => svg().querySelectorAll(sel).length;
  const riga = sel => albero.querySelector(sel);
  const prova2 = () => [...albero.querySelectorAll('[data-prova3d]')].find(r => /DPSH 2/.test(r.textContent));
  const id2 = prova2().dataset.prova3d;
  const voci = () => [...menu.querySelectorAll('[data-voce]')].map(b => b.textContent);
  const voce = re => [...menu.querySelectorAll('[data-voce]')].find(b => re.test(b.textContent));
  const nomi = () => [...svg().querySelectorAll('.vista3d-nome')].map(e => e.textContent).sort().join();

  console.log('--- Le righe ---');
  t('niente più righe «Nomi delle prove» e «Nomi degli strati»: le etichette sono il tasto «T»', !riga('[data-livello="nomi"]') && !riga('[data-livello="nomiGiaciture"]'));
  const conT = [...albero.querySelectorAll('.liv-riga')].filter(r => r.querySelector('.liv-etichette')).map(r => r.querySelector('.liv-nome').textContent);
  const gruppiT = [...albero.querySelectorAll('[data-etichette-gruppo]')].map(b => b.dataset.etichetteGruppo);
  t(`«T» sul gruppo Prove (uno solo per tutte: ${gruppiT.join(', ')}) e sulle righe ${conT.join(', ')}`, gruppiT.join() === 'prove' && conT.join() === 'Falda,Misure' && !riga('[data-prova3d] .liv-etichette'));

  console.log('--- Le etichette ---');
  clic(app, riga('[data-etichette-gruppo="prove"]'));
  t('«T» delle Prove: via i nomi di tutte, le colonne restano', nomi() === '' && svg().querySelectorAll('.vista3d-colonna').length > 0 && !riga('[data-etichette-gruppo="prove"]').classList.contains('attivo'));
  clic(app, riga('[data-etichette-gruppo="prove"]'));
  t('(ritoccato tornano)', nomi() === 'DPSH 1,DPSH 2,DPSH 3');
  const d0 = conta('.vista3d-distanza');
  clic(app, riga('[data-livello="misure"] .liv-etichette'));
  t(`«T» delle Misure: via i numeri (${d0} distanze e l'asta), resta l'asta`, d0 === 3 && conta('.vista3d-distanza') === 0 && conta('text.vista3d-misure') === 0 && conta('line.vista3d-misure') > 0);
  clic(app, riga('[data-livello="misure"] .liv-etichette'));
  clic(app, riga('[data-livello="falda"] .liv-etichette'));
  t('«T» della Falda: la profondità su ogni colonna', conta('.vista3d-falda-nome') === 3 && /falda 1,50? m/.test(svg().querySelector('.vista3d-falda-nome').textContent));
  clic(app, riga('[data-livello="falda"] .liv-etichette'));

  console.log('--- Le giaciture, un gruppo (una riga per strato) ---');
  // Una giacitura vera: tre prove con lo stesso strato sotto il terreno.
  const g = app.E(`(() => {
    const F = (nome, da, a, colore) => ({ nome, da, a, colore });
    const prova = (x, y, fasce, id) => ({ x, y, z: 100, fasce, fondo: 4, occ: occorrenzeFasce(fasce), s: { id, header: { provaNr: id } } });
    const d = { prove: [prova(0, 0, [F('Limo', 0, 1, '#aa0'), F('Sabbia', 1, 3, '#a00')], 'a'), prova(10, 0, [F('Limo', 0, 2, '#aa0'), F('Sabbia', 2, 4, '#a00')], 'b'), prova(0, 10, [F('Limo', 0, 1, '#aa0'), F('Sabbia', 1, 3, '#a00')], 'c')],
      triangoli: [[0, 1, 2]], lati: [[0, 1], [1, 2], [2, 0]], zSuolo: () => 100, lato: 20, zMin: 100, zMax: 100, senzaDtm: true, geo: () => ({ lat: 40, lng: 18 }) };
    datiVista3dCorrenti = d; renderLivelli3d();
    return [...document.querySelectorAll('#livelliVista3d [data-giacitura3d]')].map(r => r.dataset.giacitura3d).join();
  })()`);
  t(`«Giaciture»: ${g}, col suo «T» (il nome dello strato)`, g === 'Sabbia' && !!riga('[data-etichette-gruppo="giaciture"]'));
  // (la scena finta non si disegna: la riga si spegne senza ridisegnare)
  app.E(`accendiLivello3d(document.getElementById('livelliVista3d')._righe.get('g:Sabbia'), false); renderLivelli3d()`);
  t('la spunta spegne le giaciture di quello strato', app.E("vista3d.giacitureNascoste.has('Sabbia')") && riga('[data-giacitura3d="Sabbia"]').classList.contains('spento'));
  app.E(`accendiLivello3d(document.getElementById('livelliVista3d')._righe.get('g:Sabbia'), true)`);
  app.E('apriVista3d()');

  console.log('--- Clic, doppio clic, tasto destro ---');
  clic(app, prova2().querySelector('.liv-nome'));
  t('clic sulla riga: si evidenzia, e della prova esce la scheda (non si spegne)', prova2().classList.contains('sel') && !prova2().classList.contains('spento') && /Prova 2/.test($(app, 'schedaProvaMappa').textContent));
  ev(app, prova2().querySelector('.liv-nome'), 'dblclick');
  const c = app.E('vista3d.centro'), p2 = app.E(`datiVista3dCorrenti.prove.find(p => p.s.id === ${JSON.stringify(id2)})`);
  t('doppio clic: inquadra la prova', Math.abs(c[0] - p2.x) < 1e-6 && Math.abs(c[1] - p2.y) < 1e-6 && app.E('vista3d.zoom') > 1.4);
  ev(app, prova2(), 'contextmenu');
  t(`tasto destro su una prova: ${voci().join(', ')}`, menu.classList.contains('open') && ['Inquadra', 'Opacità…100%', 'Mostra sulla mappa', 'Apri la prova', 'Modifica dati', 'Sposta'].every(v => voci().includes(v)));
  clic(app, voce(/^Opacità/));
  await attesa(20);
  t(`«Opacità…»: ${voci().join(', ')}`, menu.classList.contains('open') && voci().join() === '100%,80%,60%,40%,20%');
  clic(app, voce(/^40%/));
  t('al 40%: la colonna della prova è trasparente, le altre no', app.E(`vista3d.opacita['p:' + ${JSON.stringify(id2)}]`) === 0.4
    && [...svg().querySelectorAll('.vista3d-colonna')].filter(e => e.getAttribute('opacity') === '0.4').length > 0 && [...svg().querySelectorAll('.vista3d-colonna')].some(e => !e.hasAttribute('opacity')));
  ev(app, riga('[data-livello="pannelli"]'), 'contextmenu');
  t(`tasto destro sui pannelli: ${voci().join(', ')}`, voci().join() === 'Inquadra,Opacità…100%');
  clic(app, voce(/^Opacità/)); await attesa(20); clic(app, voce(/^60%/));
  t('e anche loro si fanno trasparenti', [...svg().querySelectorAll('.vista3d-pannello')].every(e => e.getAttribute('opacity') === '0.6'));

  console.log('--- Le sezioni, una riga ciascuna ---');
  app.E("modoAreaMappa('mappa'); scegliStrumentoMappa('profilo')");
  app.E('clicStrumentoMappa2d({ latlng: { lat: 40.1970, lng: 17.9920 } }); clicStrumentoMappa2d({ latlng: { lat: 40.1975, lng: 17.9935 } })');
  app.E("modoAreaMappa('3d')");
  const traccia = () => riga('[data-traccia3d]');
  t('nel gruppo «Sezioni» la traccia A-A\', e la «T» del gruppo', [...albero.querySelectorAll('.liv-gruppo span')].map(e => e.textContent).includes('Sezioni') && /A-A'/.test(traccia().textContent) && !!riga('[data-etichette-gruppo="sezioni"].attivo'));
  t('(nella scena: la linea e le lettere)', conta('.vista3d-traccia') > 0 && conta('.vista3d-traccia-nome') === 2);
  clic(app, riga('[data-etichette-gruppo="sezioni"]'));
  t('«T»: via le lettere, la linea resta', conta('.vista3d-traccia-nome') === 0 && conta('.vista3d-traccia') > 0);
  clic(app, riga('[data-etichette-gruppo="sezioni"]'));
  clic(app, traccia().querySelector('input'));
  t('la spunta: via la traccia', conta('.vista3d-traccia') === 0);
  clic(app, traccia().querySelector('input'));
  ev(app, traccia(), 'contextmenu');
  t(`tasto destro sulla traccia: ${voci().join(', ')}`, ['Inquadra', 'Opacità…100%', 'Vedi la sezione', 'PDF', 'Rinomina…', 'Elimina'].every(v => voci().includes(v)));
  app.E('chiudiMenuRiga()');

  console.log('--- La spunta del gruppo ---');
  clic(app, riga('[data-gruppo3d="prove"]'));
  t('«Prove»: tutte spente', conta('.vista3d-colonna') === 0 && albero.querySelectorAll('[data-prova3d].spento').length === 3);
  clic(app, riga('[data-gruppo3d="prove"]'));
  t('(e riaccese)', conta('.vista3d-colonna') > 0 && albero.querySelectorAll('[data-prova3d].spento').length === 0);

  console.log('--- La mappa di base (modo Mappa) ---');
  app.E("modoAreaMappa('mappa')");
  const base = () => riga('[data-sfondo2d]');
  t(`una riga sola: «${base().querySelector('.liv-nome').textContent}» ${base().querySelector('.liv-conta').textContent}`, albero.querySelectorAll('[data-sfondo2d]').length === 1 && /Satellite/.test(base().textContent) && /100%/.test(base().textContent));
  ev(app, base(), 'contextmenu');
  t(`tasto destro: ${voci().join(', ')}`, voci().join() === 'Cambia mappa di base…,Opacità…100%');
  clic(app, voce(/^Cambia/));
  await attesa(20);
  t(`«Cambia mappa di base…»: ${voci().join(', ')}`, ['Satellite (Esri)', 'Satellite (Google)', 'Strade (Google)', 'CTR Puglia (SIT Puglia)'].every(v => voci().includes(v)) && !/OpenStreetMap/.test(voci().join()));
  clic(app, voce(/^Strade \(Google/));
  t('scelta «Strade (Google)»: la riga la dice, ed è ricordata', app.E('mappaProgetto.stile') === 'google-strade' && /Strade/.test(base().textContent) && app.E('state.settings.sfondo2d') === 'google-strade');
  clic(app, base().querySelector('input'));
  t('la spunta la spegne', app.E('mappaProgetto.sfondoSpento') === true && base().classList.contains('spento'));
  clic(app, base().querySelector('input'));
  app.E("sfondoMappaProgetto('esri-satellite'); modoAreaMappa('3d')");

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
