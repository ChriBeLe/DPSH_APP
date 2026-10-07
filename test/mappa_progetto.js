// MAPPA DEL PROGETTO: dalla schermata del progetto, tutte le prove su una mappa. Toccando una prova
// la sua scheda (profondità, falda, foto, quota, coordinate, strati, «spostata a mano»), e da lì:
// aprirla, cambiarne i dati (il numero compreso) o spostarla con la doppia conferma, anche se non è
// la prova attiva. (La mappa vera, Leaflet, si è provata nel browser: qui jsdom non la carica.)
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
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const P = `state.projects[${JSON.stringify(pid)}]`;
  app.E(`openProject(${JSON.stringify(pid)}); switchView('project')`);
  await attesa(50);
  const id = nr => app.E(`Object.values(${P}.surveys).find(s => s.header.provaNr == '${nr}').id`);
  const h = nr => app.E(`Object.values(${P}.surveys).find(s => s.header.provaNr == '${nr}').header`);

  t('nella schermata del progetto c\'è «Mappa», e la sua finestra con la mappa e la scheda', !!$(app, 'btnProgettoMappa') && !!$(app, 'mappaProgettoEl') && !!$(app, 'schedaProvaMappa') && !!$(app, 'selSfondo2d'));

  console.log('--- La scheda di una prova ---');
  const id2 = id('2');
  app.E(`mappaProgetto.scelta = ${JSON.stringify(id2)}; renderSchedaProvaMappa()`);
  const scheda = $(app, 'schedaProvaMappa');
  const h2 = h('2');
  t(`numero, profondità e intervalli, falda e foto, coordinate («${scheda.textContent.replace(/\s+/g, ' ').trim().slice(0, 90)}…»)`, !scheda.hidden && /Prova 2/.test(scheda.textContent) && /\d+,\d+ m · \d+ intervall/.test(scheda.textContent)
    && /(Falda a |Falda non impostata)/.test(scheda.textContent) && /(\d+ foto|nessuna foto)/.test(scheda.textContent) && scheda.textContent.includes(parseFloat(h2.lat).toFixed(6)));
  t('la colonna degli strati e i loro nomi', scheda.querySelectorAll('svg rect').length > 0 && scheda.querySelectorAll('.mappa-progetto-strati span').length > 0);
  t('tre azioni: apri la prova, modifica dati, sposta', ['apri', 'dati', 'sposta'].every(a => scheda.querySelector(`[data-mappa-azione="${a}"]`)));
  clic(app, scheda.querySelector('[data-mappa-azione="sposta"]'));
  t('«Sposta»: la scheda si riduce all\'avviso e ad «Annulla» (il segnaposto resta in vista)', app.E('mappaProgetto.spostando') === id2 && /Trascina il segnaposto/.test(scheda.textContent) && !!scheda.querySelector('[data-mappa-azione="annulla"]') && !scheda.querySelector('[data-mappa-azione="apri"]'));
  clic(app, scheda.querySelector('[data-mappa-azione="annulla"]'));
  t('«Annulla lo spostamento» torna alla scheda', app.E('mappaProgetto.spostando') === null && !!scheda.querySelector('[data-mappa-azione="apri"]'));

  console.log('--- Spostare dalla mappa (una prova che non è quella attiva) ---');
  app.E(`syncProjectToActiveState(${JSON.stringify(pid)}, ${JSON.stringify(id('1'))})`);
  const lat0 = parseFloat(h2.lat), lng0 = parseFloat(h2.lng);
  const trascina = async (risposte) => {
    app.E(`mappaProgetto.spostando = ${JSON.stringify(id2)}; spostaProvaDallaMappa(${JSON.stringify(id2)}, { lat: ${lat0 + 0.0002}, lng: ${lng0 + 0.0002} })`);
    for (const r of risposte) { await attesa(30); const d = app.dialogo(); if (!d) break; clic(app, r ? d.ok : d.annulla); }
    await attesa(40);
  };
  await trascina([true, false]);
  t('lasciato il segnaposto: doppia conferma; annullata la seconda, la prova resta dov\'era', parseFloat(h('2').lat) === lat0 && !h('2').spostamento && app.E('mappaProgetto.spostando') === null);
  await trascina([true, true]);
  t('confermata due volte, la prova si sposta e la posizione di prima resta in memoria', Math.abs(parseFloat(h('2').lat) - (lat0 + 0.0002)) < 1e-12 && h('2').spostamento && h('2').spostamento.da.lat === lat0);
  t('(e diventa la prova attiva, come quando la si apre)', app.E('state.currentSurveyId') === id2);
  app.E(`mappaProgetto.scelta = ${JSON.stringify(id2)}; renderSchedaProvaMappa()`);
  t('la scheda dice «spostata a mano»', /Spostata a mano di \d+ m/.test(scheda.textContent));

  console.log('--- Modifica dati e apri ---');
  app.E(`syncProjectToActiveState(${JSON.stringify(pid)}, ${JSON.stringify(id('1'))}); document.getElementById('modalVista3d').classList.add('open'); mappaProgetto.scelta = ${JSON.stringify(id2)}; renderSchedaProvaMappa()`);
  clic(app, scheda.querySelector('[data-mappa-azione="dati"]'));
  await attesa(30);
  t('«Modifica dati» chiude la mappa e apre la scheda «Dati» di quella prova (numero compreso)', !$(app, 'modalVista3d').classList.contains('open') && $(app, 'modalSurveySettings').classList.contains('open') && $(app, 'txtProvaNr').value === '2' && app.E('state.currentSurveyId') === id2);
  app.E('closeSurveySettingsModal()');
  app.E(`syncProjectToActiveState(${JSON.stringify(pid)}, ${JSON.stringify(id('1'))}); switchView('project'); document.getElementById('modalVista3d').classList.add('open'); mappaProgetto.scelta = ${JSON.stringify(id2)}; renderSchedaProvaMappa()`);
  clic(app, scheda.querySelector('[data-mappa-azione="apri"]'));
  await attesa(50);
  t('«Apri la prova» la apre nella schermata della prova', app.E('state.currentSurveyId') === id2 && app.E('state.uiState.currentView') === 'field' && !$(app, 'modalVista3d').classList.contains('open'));

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
