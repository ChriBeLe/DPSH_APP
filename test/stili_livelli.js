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
  const sp = pop().querySelector('input[type="range"][data-campo="spessore"]'); sp.value = '6'; sp.dispatchEvent(new app.w.Event('input'));
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
  // LE PROVE: lo stile del gruppo (tasto destro sul gruppo «Prove») vale per tutte
  const apriGruppo = async g => { ev(app, albero.querySelector(`.liv-gruppo[data-gruppo="${g}"] span`), 'contextmenu'); clic(app, voce(/^Stile del gruppo/)); await attesa(20); };
  await apriGruppo('prove');
  t('tasto destro sul gruppo «Prove»: lo stile del gruppo («Stile del gruppo · Prove»)', /Stile del gruppo · Prove/.test(pop().textContent));
  t('le prove: il simbolo (di base il triangolo con la punta sul punto) e le etichette (grandezza, colore, alone, posizione)', pop().querySelector('.stile-simboli [data-v="triangolo-giu"][aria-checked="true"]')
    && ['etichettaDimensione', 'etichettaColore', 'etichettaAlone', 'etichettaPosizione'].every(c => pop().querySelector(`[data-campo="${c}"]`)));
  const dim = pop().querySelector('input[type="range"][data-campo="dimensione"]'); dim.value = '1.8'; dim.dispatchEvent(new app.w.Event('input'));
  clic(app, pop().querySelector('[data-campo="colore"] [data-v="#FACC15"]'));
  clic(app, pop().querySelector('.stile-simboli [data-v="quadrato"]'));
  const ed = pop().querySelector('input[type="range"][data-campo="etichettaDimensione"]'); ed.value = '18'; ed.dispatchEvent(new app.w.Event('input'));
  clic(app, pop().querySelector('[data-campo="etichettaPosizione"] [data-v="destra"]'));
  app.E('chiudiStileLivello(true)');
  const lato = f => Math.max(...f.p.map(q => q[0])) - Math.min(...f.p.map(q => q[0]));
  t('nel 3D lo stesso simbolo della mappa 2D: tutte quadrati gialli, grandi 1,8 (28,8 px)', pezzi('vista3d-testa').length > 0 && pezzi('vista3d-testa').every(f => f.t === 'poli' && f.p.length === 4 && Math.abs(lato(f) - 28.8) < 1e-6 && f.fill === '#FACC15'));
  t('e la stessa etichetta: Arial 18 px, bianca con l\'alone, a destra del simbolo', pezzi('vista3d-nome').every(f => f.size === 18 && f.famiglia === 'Arial' && f.colore === '#ffffff' && f.alone && f.anchor === undefined));
  // una prova col suo stile: vince su quello del gruppo
  const pid1 = app.E('datiVista3dCorrenti.prove[0].s.id'), testaDi = id => pezzi('vista3d-testa').find(f => f.prova === id);
  await apriStile(`[data-prova3d="${pid1}"]`);
  t('tasto destro su una prova: il suo stile («Come il gruppo» spento: per ora segue il gruppo)', /^Stile · /.test(pop().querySelector('.stile-testa b').textContent) && pop().querySelector('[data-az="base"]').disabled && /segue lo stile di «Prove»/.test(pop().textContent));
  clic(app, pop().querySelector('[data-campo="colore"] [data-v="#22C55E"]'));
  app.E('chiudiStileLivello(true)');
  t('la prova col suo colore (verde); le altre restano del gruppo (gialle)', testaDi(pid1).fill === '#22C55E' && pezzi('vista3d-testa').filter(f => f.prova !== pid1).every(f => f.fill === '#FACC15'));
  await apriGruppo('prove');
  clic(app, pop().querySelector('[data-campo="colore"] [data-v="#3B82F6"]'));
  app.E('chiudiStileLivello(true)');
  t('cambiato il gruppo (blu): le altre lo seguono, quella col suo stile no (resta verde, ma quadrata come il gruppo)', testaDi(pid1).fill === '#22C55E' && testaDi(pid1).p.length === 4 && pezzi('vista3d-testa').filter(f => f.prova !== pid1).every(f => f.fill === '#3B82F6'));
  await apriStile(`[data-prova3d="${pid1}"]`);
  t('(il suo pannello lo dice: stile suo, non segue il gruppo)', /non segue «Prove»/.test(pop().textContent) && !pop().querySelector('[data-az="base"]').disabled && /Come il gruppo/.test(pop().querySelector('[data-az="base"]').textContent));
  clic(app, pop().querySelector('[data-az="base"]'));
  app.E('chiudiStileLivello(true)');
  t('«Come il gruppo»: torna a seguire il gruppo (blu)', testaDi(pid1).fill === '#3B82F6' && !app.E(`(${P}.stili || {})['p:${pid1}']`));
  // «Tutti come il gruppo» dal tasto destro sul gruppo
  app.E(`salvaStile('p:${pid1}', { colore: '#EF4444' }); salvaStile('p:' + datiVista3dCorrenti.prove[1].s.id, { simbolo: 'stella' })`);
  ev(app, albero.querySelector('.liv-gruppo[data-gruppo="prove"] span'), 'contextmenu');
  const tutti = voce(/^Tutti come il gruppo/);
  t(`il gruppo lo sa: «${tutti && tutti.textContent.trim()}»`, tutti && /2 con lo stile suo/.test(tutti.textContent));
  clic(app, tutti);
  t('e le rimette tutte come il gruppo', pezzi('vista3d-testa').every(f => f.fill === '#3B82F6' && f.p && f.p.length === 4) && !Object.keys(app.E(`${P}.stili`)).some(k => k.startsWith('p:')));
  t('lo stile del gruppo resta (simbolo, grandezza dell\'etichetta, posizione)', /"simbolo":"quadrato"/.test(app.E(`JSON.stringify(stileLivello('prove'))`)) && /"etichettaPosizione":"destra"/.test(app.E(`JSON.stringify(stileLivello('prove'))`)));
  // le sezioni: lo stile del gruppo per tutte, e le lettere nel 3D come nella mappa 2D
  await apriGruppo('sezioni');
  t('anche il gruppo «Sezioni» ha il suo stile', /Stile del gruppo · Sezioni/.test(pop().textContent));
  clic(app, pop().querySelector('[data-campo="colore"] [data-v="#00E5FF"]'));
  app.E('chiudiStileLivello(true)');
  t('le sezioni seguono il gruppo (azzurre); le lettere in Arial come nella mappa', pezzi('vista3d-traccia').every(f => f.stroke === '#00E5FF') && pezzi('vista3d-traccia-nome').every(f => f.famiglia === 'Arial' && f.size === 14));
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
