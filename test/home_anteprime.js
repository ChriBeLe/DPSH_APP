// LE ANTEPRIME E LE TRE VISTE DELLA HOME (071za, 28/11/2026).
//
//  - tre schede: Anteprime | Elenco | Mappa; la prima volta «Anteprime» (scelta di Romeo);
//  - la scelta resta nel browser (dpsh.vistaHome), non nei dati del progetto;
//  - Anteprime: ogni card ha il riquadro della miniatura (o «Senza GPS");
//  - Elenco: le righe di sempre, senza riquadro;
//  - Mappa: niente card, il riquadro della mappa e sotto i progetti senza GPS;
//  - le miniature non entrano nei dati (non cambia il formato, niente modifica);
//  - l'assistente IA cambia vista e legge lo stato delle anteprime.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const chiudiAvvisi = async app => { for (let i = 0; i < 3 && app.dialogo(); i++) { clic(app, app.dialogo().ok); await attesa(30); } };

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  await chiudiAvvisi(app);
  app.E("switchView('home')");
  await attesa(80);
  const cont = $(app, 'homeProjectsContainer');
  const schede = [...$(app, 'homeVistaProgetti').querySelectorAll('[data-vista-home]')];

  console.log('--- Le schede ---');
  t('tre schede: Anteprime, Elenco, Mappa', JSON.stringify(schede.map(b => b.getAttribute('aria-label'))) === JSON.stringify(['Anteprime', 'Elenco', 'Mappa']));
  t('la prima volta: Anteprime', schede[0].getAttribute('aria-selected') === 'true' && cont.dataset.vista === 'griglia');
  t('le schede usano il riquadro che scivola (schede-prova)', $(app, 'homeVistaProgetti').classList.contains('schede-prova'));

  console.log('--- Anteprime ---');
  const cards = [...cont.querySelectorAll('.card-progetto')];
  t('ogni card ha il riquadro dell\'anteprima', cards.length === 2 && cards.every(c => c.querySelector('.card-progetto-anteprima')));
  t('il progetto senza GPS lo dice', cards.some(c => /Senza GPS/.test(c.querySelector('.card-progetto-anteprima').textContent)));
  t('il riquadro è dentro il tasto che apre il progetto', cards.every(c => c.querySelector('.card-progetto-apri .card-progetto-anteprima')));

  console.log('--- Elenco ---');
  clic(app, schede[1]);
  await attesa(50);
  t('Elenco: le righe di sempre, senza riquadro', cont.dataset.vista === 'elenco' && cont.querySelectorAll('.card-progetto').length === 2 && !cont.querySelector('.card-progetto-anteprima'));
  t('la scelta resta nel browser', app.w.localStorage.getItem('dpsh.vistaHome') === 'elenco');

  console.log('--- Mappa ---');
  clic(app, schede[2]);
  await attesa(150);
  t('Mappa: niente card', cont.dataset.vista === 'mappa' && !cont.querySelector('.card-progetto'));
  t('si vede il riquadro della mappa', $(app, 'homeMappaProgetti').style.display !== 'none');
  t('sotto, il progetto senza GPS, toccabile', /1 progetto senza GPS/.test($(app, 'homeMappaNota').textContent) && !!$(app, 'homeMappaNota').querySelector('[data-apri-progetto]'));

  console.log('--- Fuori dai dati ---');
  t('nessun progetto ha un campo per la miniatura', app.E('Object.values(state.projects).every(p => !("miniaturaMappa" in p))'));
  t('centro del progetto con GPS calcolato', app.E('Object.keys(state.projects).filter(id => centroProgettoHome(state.projects[id])).length') === 1);

  console.log('--- Assistente IA ---');
  const strumenti = app.E("AI_STRUMENTI.map(s => s.n)");
  t('ci sono vista_home e anteprime_progetti', strumenti.includes('vista_home') && strumenti.includes('anteprime_progetti'));
  const esito = app.E("(AI_STRUMENTI || []).find(s => s.n === 'vista_home').run({ vista: 'griglia' })");
  t('vista_home cambia vista e dà lo stato', esito.ok === true && esito.vista === 'griglia' && cont.dataset.vista === 'griglia' && esito.progetti.length === 2);
  let errore = '';
  try { app.E("(AI_STRUMENTI || []).find(s => s.n === 'vista_home').run({ vista: 'boh' })"); } catch (e) { errore = String(e.message || e); }
  t('vista sconosciuta: errore chiaro', /Vista sconosciuta/.test(errore));

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
