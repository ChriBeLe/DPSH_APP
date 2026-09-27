// IL CONTATORE SUL PC (prototipo PC, passo 5): spento di norma; «Contatore» in alto o il tasto C
// lo accendono sopra il Registro. Acceso: Spazio un colpo, Backspace lo toglie, Invio registra,
// F2 modifica la riga scelta. È una preferenza dell'app: non cambia l'impronta del progetto.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const tasto = (app, key) => app.d.body.dispatchEvent(new app.w.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
const acceso = (app) => $(app, 'cardCounterDashboard').style.display !== 'none';

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  app.E('openProject(Object.keys(state.projects)[0])');
  await attesa(80);
  app.w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  app.E('updateUI()');
  t('sul PC il contatore parte spento, col suo interruttore in alto', !acceso(app) && $(app, 'pcBtnContatore').style.display !== 'none' && $(app, 'pcBtnContatore').getAttribute('aria-pressed') === 'false');
  const impronta = app.E('state.projects[state.currentProjectId].modificatoIl');
  clic(app, $(app, 'pcBtnContatore'));
  t('l\'interruttore lo accende sopra il Registro', acceso(app) && $(app, 'cardIntegratedRegister').style.display !== 'none' && $(app, 'pcBtnContatore').getAttribute('aria-pressed') === 'true');
  t('ed è una preferenza dell\'app: il progetto non risulta modificato', app.E('state.projects[state.currentProjectId].modificatoIl') === impronta);

  const colpi = app.E('state.currentCount'), n = app.E('state.logs.length');
  tasto(app, ' '); tasto(app, ' '); tasto(app, ' ');
  tasto(app, 'Backspace');
  t('Spazio dà un colpo, Backspace lo toglie', app.E('state.currentCount') === colpi + 2);
  tasto(app, 'Enter');
  await attesa(60);
  t('Invio registra l\'intervallo', app.E('state.logs.length') === n + 1 && app.E('state.logs[state.logs.length - 1].colpi') === colpi + 2);
  t('la barra di stato dice i tasti del contatore', /Spazio un colpo/.test($(app, 'pcStatoAiuto').textContent));

  tasto(app, 'c');
  t('C lo spegne', !acceso(app));
  const prima = app.E('state.currentCount');
  tasto(app, ' ');
  t('spento, Spazio non conta', app.E('state.currentCount') === prima);
  app.E("switchView('project')");
  t('fuori dalla prova l\'interruttore non si vede', $(app, 'pcBtnContatore').style.display === 'none');

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
