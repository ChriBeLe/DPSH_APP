// Tre difese: (1) le preferenze dell'APP non tornano indietro cambiando prova; (2) un doppio tocco
// su «Registra» non crea due intervalli e «Annulla ultimo» non perde i colpi gia' contati;
// (3) il blocco dello schermo viene richiesto di nuovo quando la pagina torna visibile.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo && app.dialogo()) app.dialogo().ok.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
  await attesa(30);
  const pid = app.E('Object.keys(state.projects)[0]');
  app.E('openProject(' + JSON.stringify(pid) + ')');
  await attesa(80);

  console.log('--- Preferenze dell\'app e cambio prova ---');
  const sid1 = app.E('state.currentSurveyId');
  // seconda prova = copia della prima, con le preferenze "vecchie" salvate dentro
  app.E(`(() => { const p = state.projects[${JSON.stringify(pid)}]; const s = JSON.parse(JSON.stringify(p.surveys[state.currentSurveyId]));
    s.settings.audio = true; s.settings.haptic = true; s.settings.gloveMode = false; s.settings.wakeLock = false; s.settings.debugMode = false;
    s.settings.righeIndiceAnteprima = 3; s.settings.wmsPersonalizzati = []; p.surveys.provaB = s; })()`);
  app.E('state.settings.audio = false; state.settings.haptic = false; state.settings.gloveMode = true; state.settings.wakeLock = true; state.settings.debugMode = true; state.settings.righeIndiceAnteprima = 7; state.settings.wmsPersonalizzati = [{ nome: "x" }]');
  app.E(`syncProjectToActiveState(${JSON.stringify(pid)}, 'provaB')`);
  t('audio resta spento', app.E('state.settings.audio') === false);
  t('vibrazione resta spenta', app.E('state.settings.haptic') === false);
  t('guanti restano accesi', app.E('state.settings.gloveMode') === true);
  t('schermo sempre acceso resta acceso', app.E('state.settings.wakeLock') === true);
  t('debug resta acceso', app.E('state.settings.debugMode') === true);
  t('righe anteprima indice', app.E('state.settings.righeIndiceAnteprima') === 7);
  t('WMS personalizzati', app.E('state.settings.wmsPersonalizzati.length') === 1);
  t('il passo della prova e\' quello della prova', app.E('state.settings.stepCm') === app.E(`state.projects[${JSON.stringify(pid)}].surveys.provaB.settings.stepCm`));
  app.E(`syncProjectToActiveState(${JSON.stringify(pid)}, ${JSON.stringify(sid1)})`);
  t('tornando alla prima, ancora uguale', app.E('state.settings.audio') === false && app.E('state.settings.gloveMode') === true);

  console.log('--- Doppio tocco su Registra ---');
  app.E('state.currentCount = 5');
  const n0 = app.E('state.logs.length');
  app.E('confirmAndNextStep()');
  app.E('confirmAndNextStep()');
  await attesa(50);
  t('due chiamate ravvicinate = un intervallo', app.E('state.logs.length') === n0 + 1);
  await attesa(700);
  app.E('state.currentCount = 2');
  app.E('confirmAndNextStep()');
  await attesa(50);
  t('un intervallo legittimo dopo la pausa viene registrato', app.E('state.logs.length') === n0 + 2);

  console.log('--- Annulla ultimo con colpi in corso ---');
  app.E('state.currentCount = 4');
  const nl = app.E('state.logs.length');
  const r = app.E('togliUltimoIntervallo()');
  t('non toglie niente', r === null && app.E('state.logs.length') === nl);
  t('i 4 colpi in corso restano', app.E('state.currentCount') === 4);
  app.E('state.currentCount = 0');
  const colpiUltimo = app.E('state.logs[state.logs.length - 1].colpi');
  app.E('togliUltimoIntervallo()');
  t('a contatore vuoto annulla e riporta i colpi', app.E('state.logs.length') === nl - 1 && app.E('state.currentCount') === colpiUltimo);

  console.log('--- Wake lock riacquisito ---');
  let richieste = 0;
  Object.defineProperty(app.w.navigator, 'wakeLock', { configurable: true, value: { request: async () => { richieste++; return { release() {} }; } } });
  let stato = 'hidden';
  Object.defineProperty(app.w.document, 'visibilityState', { configurable: true, get: () => stato });
  app.E('state.settings.wakeLock = true');
  app.w.document.dispatchEvent(new app.w.Event('visibilitychange'));
  await attesa(20);
  t('nascosta: nessuna richiesta', richieste === 0);
  stato = 'visible';
  app.w.document.dispatchEvent(new app.w.Event('visibilitychange'));
  await attesa(20);
  t('di nuovo visibile: lo richiede', richieste === 1);
  app.E('state.settings.wakeLock = false');
  app.w.document.dispatchEvent(new app.w.Event('visibilitychange'));
  await attesa(20);
  t('con la preferenza spenta no', richieste === 1);

  app.chiudi();
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
