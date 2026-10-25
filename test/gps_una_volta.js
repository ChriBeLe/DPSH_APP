// LA POSIZIONE SI CHIEDE SOLO QUANDO SERVE: entrare nelle prove o aprire la finestra GPS non chiede
// niente (prima la ricerca partiva da sola a ogni avvio, e sul PC finiva sempre in un popup «Tempo
// scaduto»). La si chiede solo col tasto «Rileva»; da lì la ricerca resta accesa per la sessione
// (le foto hanno una posizione fresca) senza richiedere; rifiutata, non riparte da sola. Se il GPS
// non risponde, lo dice dentro la finestra, senza popup.
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
  // Un GPS finto che conta le richieste e lascia decidere al test come rispondere.
  app.E(`(() => { window.__richieste = 0; window.__guardia = 0; window.__errore = null; window.__puntuale = null;
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      watchPosition: (ok, ko) => { window.__richieste++; window.__guardia++; window.__errore = ko; return 7; }, clearWatch: () => {},
      getCurrentPosition: (ok, ko) => { window.__richieste++; window.__puntuale = { ok, ko }; } } }); })()`);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const surv = app.E(`Object.keys(state.projects[${JSON.stringify(pid)}].surveys)`);
  app.E(`openProject(${JSON.stringify(pid)}); syncProjectToActiveState(${JSON.stringify(pid)}, ${JSON.stringify(surv[0])}); switchView('field')`);
  app.E(`switchView('project'); syncProjectToActiveState(${JSON.stringify(pid)}, ${JSON.stringify(surv[1])}); switchView('field'); switchView('home'); switchView('field')`);
  t('entrando e uscendo dalle prove la posizione non si chiede mai', app.E('window.__richieste') === 0);

  app.E('state.header.lat = null; state.header.lng = null; openGpsModal()');
  t('aprendo la finestra GPS (senza coordinate) non si chiede niente', app.E('window.__richieste') === 0);

  app.d.getElementById('btnGetGpsModal').click();
  t('col tasto «Rileva» si chiede la posizione', app.E('window.__richieste') === 1);
  const dialogiPrima = app.d.querySelectorAll('#appDialog.open, .app-dialog.open').length;
  app.E("window.__puntuale.ko({ code: 3 })"); // alta precisione scaduta: ritenta a bassa
  app.E("window.__puntuale.ko({ code: 3 })"); // anche a bassa
  t('se il GPS non risponde lo dice nella finestra, senza popup',
    /GPS non trovato/.test(app.d.getElementById('lblModalGpsStatus').textContent) && !app.dialogo() && app.d.querySelectorAll('#appDialog.open, .app-dialog.open').length === dialogiPrima);

  app.d.getElementById('btnGetGpsModal').click();
  app.E("window.__puntuale.ok({ coords: { latitude: 40.2, longitude: 18.0, accuracy: 5 } })");
  t('trovata: coordinate nella prova e da lì la ricerca resta accesa', app.E('state.header.lat') === 40.2 && app.E('window.__guardia') === 1);
  app.E(`switchView('project'); switchView('field')`);
  t('(e non si richiede di nuovo cambiando schermata)', app.E('window.__guardia') === 1);
  app.E('window.__errore({ code: 1 })');
  t('rifiutata: ricordato', app.w.localStorage.getItem('dpsh.gpsRifiutato') === '1');
  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
