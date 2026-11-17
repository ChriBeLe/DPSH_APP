// NIENTE DIALOGHI BLOCCANTI NELLA VISTA CONTA (Fase C, F-15 e F-22).
//  - le note rapide si applicano al tocco, con toast «Nota «X» su a–b m» e «Annulla»;
//  - senza intervalli le pillole sono disabilitate e non compare nessun alert;
//  - «−1» tenuto premuto toglie l'intervallo senza dialogo, con toast e «Annulla: togli intervallo».
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const toast = (app) => { const e = app.d.getElementById('toastApp'); return e ? { testo: e.querySelector('.toast-testo').textContent, azione: e.querySelector('.toast-azione') } : null; };

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  app.E('openProject(' + JSON.stringify(app.E('Object.keys(state.projects)[0]')) + ')');
  await attesa(80);
  let alertChiamato = 0;
  app.w.alert = () => { alertChiamato++; };
  const pillole = () => [...app.d.querySelectorAll('.note-rapide .btn-tag')];

  console.log('--- Senza intervalli ---');
  app.E('state.logs.length = 0; state.currentDepthStart = 0; state.currentCount = 0; updateUI()');
  t('tutte le pillole sono disabilitate', pillole().length === 4 && pillole().every(b => b.disabled && b.getAttribute('aria-disabled') === 'true'));
  clic(app, pillole()[0]);
  await attesa(20);
  t('nessun alert e nessun dialogo', alertChiamato === 0 && !app.dialogo());

  console.log('--- Con intervalli ---');
  app.E('state.currentCount = 5; confirmAndNextStep()');
  await attesa(30);
  t('le pillole si accendono', pillole().every(b => !b.disabled && b.getAttribute('aria-disabled') === 'false'));
  const intervallo = app.E('testoIntervallo(state.logs[0].start, state.logs[0].end)');
  clic(app, pillole()[0]);
  await attesa(20);
  t('la nota è applicata subito, senza dialogo', app.E('state.logs[0].note') === 'Ciottoli' && !app.dialogo());
  t('il toast dice nota e intervallo', toast(app) && toast(app).testo === `Nota «Ciottoli» su ${intervallo}`);
  t('il toast ha «Annulla»', toast(app).azione.textContent === 'Annulla');
  clic(app, toast(app).azione);
  await attesa(20);
  t('«Annulla» rimette la nota com\'era', !app.E('state.logs[0].note') && !app.E('state.logs[0].modificatoIl'));
  clic(app, pillole()[0]); clic(app, pillole()[1]);
  await attesa(20);
  t('due note si accodano', app.E('state.logs[0].note') === 'Ciottoli, Cavità');
  clic(app, toast(app).azione);
  t('«Annulla» toglie solo l\'ultima', app.E('state.logs[0].note') === 'Ciottoli');

  console.log('--- «−1» tenuto premuto ---');
  const n = app.E('state.logs.length');
  app.E('undoLastStep()');
  await attesa(20);
  t('toglie l\'intervallo senza dialogo', app.E('state.logs.length') === n - 1 && !app.dialogo());
  t('il toast dice quale e offre «Annulla: togli intervallo»', /^Tolto l'intervallo /.test(toast(app).testo) && toast(app).azione.textContent === 'Annulla: togli intervallo');
  clic(app, toast(app).azione);
  await attesa(20);
  t('l\'azione lo rimette, con la nota', app.E('state.logs.length') === n && app.E('state.logs[state.logs.length-1].note') === 'Ciottoli');
  t('mai un alert', alertChiamato === 0);

  app.chiudi();
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
