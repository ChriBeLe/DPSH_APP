// PREFERENZE ALL'AVVIO (revisione punto 16).
//
// Il difetto: Modalità Guanti e Modalità Debug vengono salvate nelle impostazioni, ma all'avvio
// le funzioni che le applicano (applyGloveMode, applyDebugMode) giravano prima di loadState():
// il body non prendeva la classe 'glove-mode' e le due caselle restavano spente, anche se
// nello stato salvato erano accese.
//
// Qui si prepara un salvataggio vero (lo scrive l'app stessa), si accendono le due preferenze
// e si riavvia l'app: deve trovarsi con la classe sul body e con le caselle accese.
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };

(async () => {
  console.log('--- Le preferenze salvate si riapplicano all avvio ---');
  const idb = telefonoV0();
  // Primo avvio: l'app scrive uno stato nel formato corrente. Ci si limita a leggerlo.
  const primo = await avviaApp({ stato: null, idb });
  const salvato = JSON.parse(primo.salvato());
  primo.chiudi();

  salvato.settings = Object.assign({}, salvato.settings, { gloveMode: true, debugMode: true });
  const stato = JSON.stringify(salvato);

  // Secondo avvio: con le preferenze già accese nel salvataggio.
  const app = await avviaApp({ stato, idb });
  await attesa(200);
  t('le preferenze restano salvate nello stato', app.E('state.settings.gloveMode') === true && app.E('state.settings.debugMode') === true);
  t('il body ha la classe glove-mode', app.d.body.classList.contains('glove-mode'));
  t('la casella Modalità Guanti è accesa', app.d.getElementById('chkGloveMode').checked === true);
  t('la casella Modalità Debug è accesa', app.d.getElementById('chkDebugMode').checked === true);
  t('gli strumenti di debug sono visibili', app.d.getElementById('debugToolsBox').style.display === 'block');
  t('senza errori all avvio', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log('KO eccezione'); process.exit(1); });
