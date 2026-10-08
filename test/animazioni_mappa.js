// TUTTO ANIMATO nell'area di lavoro: la finestra e il passaggio Mappa ⇄ 3D sfumano, le righe dei Livelli
// entrano e scivolano (e non si rifanno se non cambia niente), spunte e «T» rimbalzano, la telecamera
// del 3D vola, segnaposto e disegni nuovi «pop», la prova scelta pulsa.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'css', '04_prova-e-home.css'), 'utf8');

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
  const albero = $(app, 'livelliVista3d');

  console.log('--- Lo stile ---');
  t('la finestra entra ed esce sfumando e ingrandendosi appena', /#modalVista3d\.area-mappa \{ scale: 0\.985; transition: opacity[^}]*scale/.test(css));
  t('Mappa ⇄ 3D in dissolvenza (la scena nascosta non sparisce di colpo)', /\.area-mappa\[data-modo="mappa"\] \.vista3d-scena, \.area-mappa\[data-modo="3d"\] \.mappa2d-scena \{ display: block; opacity: 0; visibility: hidden/.test(css));
  t('comparse: schede, riquadri, scheda della prova, pop dei segnaposto, pulsazione, rimbalzo', ['amComparsa', 'amSale', 'amPop', 'amPulsa', 'amRimbalzo', 'amRigaEntra'].every(k => css.includes('@keyframes ' + k)));

  console.log('--- I Livelli ---');
  const prima = albero.querySelector('.liv-riga');
  app.E('renderVista3d()');
  t('ridisegnando senza cambi le righe restano quelle (le animazioni non ripartono a ogni fotogramma)', albero.querySelector('.liv-riga') === prima);
  app.E(`${P}.sezioniTracciate = [{ id: 'nuova', nome: "Q-Q'", a: { lat: 40.197, lng: 17.992 }, b: { lat: 40.1975, lng: 17.9935 } }]; renderVista3d()`);
  t('una riga nuova entra animata', albero.querySelector('[data-traccia3d="nuova"]').classList.contains('entra') && !albero.querySelector('[data-prova3d]').classList.contains('entra'));
  clic(app, albero.querySelector('[data-livello="falda"] input'));
  t('la spunta toccata rimbalza', albero.querySelector('[data-livello="falda"]').classList.contains('cambiata'));
  clic(app, albero.querySelector('[data-etichette-gruppo="prove"]'));
  t('anche la «T»', albero.querySelector('[data-etichette-gruppo="prove"]').classList.contains('cambiata'));
  clic(app, albero.querySelector('[data-etichette-gruppo="prove"]'));
  clic(app, albero.querySelector('[data-livello="falda"] input'));

  console.log('--- La telecamera ---');
  app.E('vista3d.centro = [0, 0, 0]; vista3d.zoom = 1; vaiAVista3d({ centro: [10, 0, 0], zoom: 4 })');
  await attesa(200);
  const meta = app.E('[vista3d.centro[0], vista3d.zoom]');
  await attesa(600);
  const fine = app.E('[vista3d.centro[0], vista3d.zoom]');
  t(`vola: a metà strada (${meta.map(v => v.toFixed(2)).join(', ')}), poi arriva (${fine.join(', ')})`, meta[0] > 0 && meta[0] < 10 && meta[1] > 1 && meta[1] < 4 && Math.abs(fine[0] - 10) < 1e-9 && Math.abs(fine[1] - 4) < 1e-9);

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
