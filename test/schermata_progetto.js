// LA SCHERMATA PROGETTO (Fase 5, punto 1) e il tasto indietro.
//  - dalla prova «‹» porta al Progetto; dal Progetto «‹ Progetti» alla Home;
//  - dalla Home «Apri» porta ancora all'ultima prova (decisione H);
//  - il Progetto elenca le prove con profondità, intervalli, spie e avvisi; toccarne una la apre;
//  - «Riprendi», Nuova prova, Dati, Strati, Note, Consegna, ⋯;
//  - indietro (popstate): prova → progetto → Home.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');
const { nascosto } = require('./dati/misure_stile');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const visibile = (app, id) => !!$(app, id) && !nascosto(app.w, $(app, id));
const vista = app => app.E('state.uiState.currentView');

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E('Object.keys(state.projects)[0]');
  const proj = app.E(`state.projects[${JSON.stringify(pid)}]`);
  app.E(`openProject(${JSON.stringify(pid)})`);
  await attesa(80);
  t('dalla Home si entra nell\'ultima prova (decisione H)', vista(app) === 'field');
  const provaAperta = app.E('state.currentSurveyId');

  console.log('--- Il Progetto ---');
  clic(app, $(app, 'btnHomeView'));
  await attesa(60);
  t('«‹» nella prova porta al Progetto', vista(app) === 'project' && visibile(app, 'viewProject') && !visibile(app, 'viewField') && !visibile(app, 'testataProva'));
  t('col nome del progetto', $(app, 'lblProgettoNome').textContent === proj.name);
  const righe = [...$(app, 'listaProveProgetto').querySelectorAll('.prova-riga')];
  t('una riga per ogni prova', righe.length === Object.keys(proj.surveys).length);
  const s1 = Object.values(proj.surveys).find(s => s.logs && s.logs.length);
  const riga1 = righe.find(r => r.dataset.surv === s1.id);
  const fondo = Math.max(...s1.logs.map(l => l.end)).toFixed(2).replace('.', ',');
  t('con profondità e numero di intervalli', riga1.textContent.includes(`${fondo} m · ${s1.logs.length} intervall`));
  t('e lo stato: «Pronta» o «N avvisi»', righe.every(r => /^(Pronta|\d+ avvis[oi])$/.test(r.querySelector('.prova-riga-stato').textContent)));
  t('la prova aperta è segnata, e «Riprendi» la nomina', righe.find(r => r.classList.contains('attiva')).dataset.surv === provaAperta
    && /^Riprendi la Prova /.test($(app, 'btnProgettoRiprendi').textContent));
  clic(app, $(app, 'btnProgettoConsegna'));
  t('«Consegna» apre la Consegna del progetto', $(app, 'modalExportFormats').classList.contains('open') && app.E('exportModalContext.type') === 'project');
  app.E('closeExportModal()');
  clic(app, $(app, 'btnProgettoStrati'));
  t('«Strati» apre la gestione litologica', $(app, 'modalManageStrati').classList.contains('open'));
  app.E('closeStratiModal && closeStratiModal()');
  const altra = righe.find(r => r.dataset.surv !== provaAperta);
  clic(app, altra);
  await attesa(60);
  t('toccare una prova la apre', vista(app) === 'field' && app.E('state.currentSurveyId') === altra.dataset.surv);

  console.log('--- Indietro ---');
  app.w.dispatchEvent(new app.w.PopStateEvent('popstate', { state: null }));
  await attesa(60);
  t('indietro dalla prova: il Progetto', vista(app) === 'project');
  app.w.dispatchEvent(new app.w.PopStateEvent('popstate', { state: null }));
  await attesa(60);
  t('indietro dal Progetto: la Home', vista(app) === 'home' && visibile(app, 'viewHome'));
  app.E(`openProject(${JSON.stringify(pid)})`);
  await attesa(60);
  clic(app, $(app, 'btnHomeView'));
  clic(app, $(app, 'btnProgettoAiProgetti'));
  await attesa(60);
  t('«‹ Progetti» porta alla Home', vista(app) === 'home');
  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  const vecchia = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0, idb: telefonoV0() });
  t('(controprova) prima non c\'era la schermata Progetto', !vecchia.d.getElementById('viewProject'));
  vecchia.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
