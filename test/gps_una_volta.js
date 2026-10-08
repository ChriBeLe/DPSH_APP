// IL PERMESSO DELLA POSIZIONE SI CHIEDE UNA VOLTA: la ricerca del GPS parte la prima volta che si
// entra in una prova e resta accesa (prima si spegneva e riaccendeva a ogni cambio di schermata, e
// aperta come file l'app faceva ricomparire la richiesta ogni volta); rifiutata, non riparte da sola.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) app.dialogo().ok.click();
  await attesa(30);
  // Un GPS finto che conta le richieste.
  app.E(`(() => { window.__richieste = 0; window.__errore = null;
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      watchPosition: (ok, ko) => { window.__richieste++; window.__errore = ko; return 7; }, clearWatch: () => {}, getCurrentPosition: () => { window.__richieste++; } } }); })()`);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const surv = app.E(`Object.keys(state.projects[${JSON.stringify(pid)}].surveys)`);
  app.E(`openProject(${JSON.stringify(pid)}); syncProjectToActiveState(${JSON.stringify(pid)}, ${JSON.stringify(surv[0])}); switchView('field')`);
  app.E(`switchView('project'); syncProjectToActiveState(${JSON.stringify(pid)}, ${JSON.stringify(surv[1])}); switchView('field'); switchView('home'); switchView('field')`);
  t(`entrando e uscendo dalle prove la posizione si chiede una volta sola (${app.E('window.__richieste')})`, app.E('window.__richieste') === 1);
  app.E('window.__errore({ code: 1 })');
  t('rifiutata: ricordato', app.w.localStorage.getItem('dpsh.gpsRifiutato') === '1');
  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
