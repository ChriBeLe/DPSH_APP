// «STILE…» DI OGNI LIVELLO, come in HyperGram: un pannellino accanto al clic con colore, contorno,
// riempimento e trasparenza, spessore, tratto, dimensione, etichette. Le modifiche si vedono subito
// (3D, mappa, PDF), Esc o «Annulla» tornano a com'era, «Di base» rimette lo stile di partenza; resta nel progetto.
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
  app.E(`(() => { const s = Object.values(${P}.surveys).find(s => s.header.provaNr == '3'); s.header.lat = 40.19690; s.header.lng = 17.99320; Object.values(${P}.surveys).forEach(s => { s.header.faldaDa = '1.5'; }); })()`);
  app.E(`${P}.sezioniTracciate = [{ id: 'tr1', nome: "A-A'", a: { lat: 40.1970, lng: 17.9920 }, b: { lat: 40.1975, lng: 17.9935 } }]`);
  app.E('apriVista3d()');
  const albero = $(app, 'livelliVista3d'), menu = $(app, 'menuRiga'), pop = () => app.d.querySelector('.stile-pop');
  const voce = re => [...menu.querySelectorAll('[data-voce]')].find(b => re.test(b.textContent));
  const pezzi = cls => app.E(`ultimaScena3d.tutte.filter(f => f.cls === '${cls}')`);
  const apriStile = async (sel) => { ev(app, albero.querySelector(sel), 'contextmenu'); clic(app, voce(/^Stile/)); await attesa(20); };

  console.log('--- Una sezione ---');
  await apriStile('[data-traccia3d="tr1"]');
  t(`il pannellino: ${[...pop().querySelectorAll('.stile-nome')].map(e => e.textContent).join(', ')}`, pop().classList.contains('aperto') && /Stile · A-A'/.test(pop().textContent)
    && ['Colore', 'Spessore', 'Tratto', 'Etichette'].every(c => pop().textContent.includes(c)));
  clic(app, pop().querySelector('[data-campo="colore"] [data-v="#22C55E"]'));
  const sp = pop().querySelector('select[data-campo="spessore"]'); sp.value = '6'; sp.dispatchEvent(new app.w.Event('change'));
  clic(app, pop().querySelector('[data-campo="tratto"] [data-v="tratteggiato"]'));
  clic(app, pop().querySelector('[data-campo="etichetta"] [data-v="bordo"]'));
  const linea = pezzi('vista3d-traccia')[0], nome = pezzi('vista3d-traccia-nome')[0];
  t('subito nel 3D: verde, più spessa, tratteggiata; le lettere con sfondo e bordo', linea.stroke === '#22C55E' && Math.abs(linea.sw - 3.9) < 1e-9 && Array.isArray(linea.dash) && nome.box === 'bordo');
  const pagina = app.E(`paginaPdfSezione(${P}, datiVista3dCorrenti, ${P}.sezioniTracciate[0])`);
  t('e nel PDF (la linea sulla vista dal satellite)', /stroke="#22C55E" stroke-width="7\.5"[^>]*stroke-dasharray/.test(pagina));
  app.d.dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  t('Esc annulla: torna com\'era', !pop().classList.contains('aperto') && pezzi('vista3d-traccia')[0].stroke === '#ef4444' && !app.E(`(${P}.stili || {})['t:tr1']`));
  await apriStile('[data-traccia3d="tr1"]');
  clic(app, pop().querySelector('[data-campo="colore"] [data-v="#A855F7"]'));
  app.d.body.dispatchEvent(new app.w.MouseEvent('mousedown', { bubbles: true }));
  t('un clic fuori tiene la modifica (e resta nel progetto)', !pop().classList.contains('aperto') && pezzi('vista3d-traccia')[0].stroke === '#A855F7' && app.E(`${P}.stili['t:tr1'].colore`) === '#A855F7');
  await apriStile('[data-traccia3d="tr1"]');
  clic(app, pop().querySelector('[data-az="base"]'));
  t('«Di base» rimette lo stile di partenza', pezzi('vista3d-traccia')[0].stroke === '#ef4444' && !app.E(`(${P}.stili || {})['t:tr1']`));
  app.E('chiudiStileLivello(true)');

  console.log('--- La falda, le prove, i pannelli ---');
  await apriStile('[data-livello="falda"]');
  clic(app, pop().querySelector('[data-campo="opacita"] [data-v="0.75"]'));
  clic(app, pop().querySelector('[data-campo="colore"] [data-v="#F97316"]'));
  app.E('chiudiStileLivello(true)');
  t('falda: riempimento più pieno, segni del colore scelto', pezzi('vista3d-falda').every(f => f.fo === 0.75) && pezzi('vista3d-falda-segno').every(f => f.stroke === '#F97316'));
  await apriStile('[data-prova3d]');
  t('sulle prove lo stile vale per tutte («Stile · Prove»)', /Stile · Prove/.test(pop().textContent));
  const dim = pop().querySelector('select[data-campo="dimensione"]'); dim.value = '1.8'; dim.dispatchEvent(new app.w.Event('change'));
  clic(app, pop().querySelector('[data-campo="colore"] [data-v="#FACC15"]'));
  app.E('chiudiStileLivello(true)');
  t('prove: le teste delle colonne più grandi e del colore scelto', pezzi('vista3d-testa').every(f => Math.abs(f.r - 7.2) < 1e-9 && f.fill === '#FACC15'));
  await apriStile('[data-livello="pannelli"]');
  clic(app, pop().querySelector('[data-campo="opacita"] [data-v="0.2"]'));
  clic(app, pop().querySelector('[data-campo="contorno"] [data-v="#111111"]'));
  app.E('chiudiStileLivello(true)');
  t('pannelli: più trasparenti, col contorno scuro', pezzi('vista3d-pannello').every(f => f.fo === 0.2 && f.stroke === '#111111'));
  t('tutto resta nel progetto salvato', /"stili":\{/.test(app.w.localStorage.getItem('dpsh_app_state') || ''));

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
