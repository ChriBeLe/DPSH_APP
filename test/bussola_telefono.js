// BUSSOLA DEL TELEFONO: formula dell'angolo, accensione/spegnimento, eventi del sensore, strumento dell'assistente.
const { avviaApp, attesa } = require('./dati/app_in_jsdom');
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
(async () => {
  const app = await avviaApp({});
  await attesa(50);
  const w = app.w, E = app.E;
  const g = (ev, a) => E(`gradiDaOrientamento(${JSON.stringify(ev)}, ${a || 0})`);
  // telefono piatto: alpha 0 = nord; alpha 90 = il telefono ha girato a sinistra, guarda a ovest (270°)
  t('piatto, alpha 0 → 0°', Math.abs(g({ alpha: 0, beta: 0, gamma: 0 }) % 360) < 0.01 || Math.abs(g({ alpha: 0, beta: 0, gamma: 0 }) - 360) < 0.01);
  t('piatto, alpha 90 → 270°', Math.abs(g({ alpha: 90, beta: 0, gamma: 0 }) - 270) < 0.01);
  t('piatto, alpha 270 → 90°', Math.abs(g({ alpha: 270, beta: 0, gamma: 0 }) - 90) < 0.01);
  t('iPhone: usa webkitCompassHeading', g({ webkitCompassHeading: 123 }) === 123);
  t('schermo girato di 90°: somma l\'angolo', g({ webkitCompassHeading: 350 }, 90) === 80);
  t('senza dati → null', g({}) === null);
  t('media sul cerchio: 350 verso 10 passa da 0', Math.abs(E('gradiMorbidi(350, 10, 0.5)') - 0) < 0.01 || Math.abs(E('gradiMorbidi(350, 10, 0.5)') - 360) < 0.01);
  t('direzione a parole', E('nomeDirezione(95)') === 'E' && E('nomeDirezione(359)') === 'N');
  // senza sensore (jsdom): non si accende e dice perché
  const sensoreJsdom = w.DeviceOrientationEvent; delete w.DeviceOrientationEvent; w.DeviceOrientationEvent = undefined;
  const r0 = await E('accendiBussolaTel(true)');
  t('senza sensore: non si accende, con motivo', r0.acceso === false && /sensore/.test(r0.motivo));
  // con sensore finto
  w.DeviceOrientationEvent = function () {};
  const r1 = await E('accendiBussolaTel(true)');
  t('con sensore: si accende', r1.acceso === true && E('bussolaTel.attiva') === true);
  t('tasto della mappa segnato acceso', w.document.querySelector('[data-bussola-tel]').classList.contains('on'));
  const ev = new w.Event('deviceorientation'); ev.alpha = 0; ev.beta = 0; ev.gamma = 0; ev.webkitCompassHeading = 200;
  w.dispatchEvent(ev);
  t('l\'evento aggiorna i gradi', E('statoBussolaTel()').gradi === 200 && E('statoBussolaTel()').direzione === 'S');
  // strumento dell'assistente
  const s = E(`(AI_STRUMENTI.find(x => x.n === 'bussola_telefono') || {}).n`);
  t('strumento IA presente', s === 'bussola_telefono');
  const l = await E(`AI_STRUMENTI.find(x => x.n === 'bussola_telefono').run({ azione: 'leggi' })`);
  t('IA legge: acceso e 200°', l.acceso === true && l.gradi === 200);
  const sp = await E(`AI_STRUMENTI.find(x => x.n === 'bussola_telefono').run({ azione: 'spegni' })`);
  t('IA spegne', sp.acceso === false && E('bussolaTel.attiva') === false);
  t('comando in palette', E(`comandiPc().some(c => /Bussola del telefono/.test(c[1]))`));
  // iPhone: l'IA non può dare il permesso
  w.DeviceOrientationEvent.requestPermission = async () => 'granted';
  const ia = await E(`AI_STRUMENTI.find(x => x.n === 'bussola_telefono').run({ azione: 'accendi' })`);
  t('iPhone: l\'IA chiede un tocco', ia.acceso === false && /tocca/.test(ia.motivo));
  const tocco = await E('accendiBussolaTel(true)');
  t('iPhone: col tocco si accende', tocco.acceso === true);
  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi && app.chiudi();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
