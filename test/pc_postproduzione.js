// IL PC, PER LA POST-PRODUZIONE (Fase 7, decisione I), da 1024 px:
//  - niente contatore né schede Conta | Registro: si vede il Registro;
//  - un clic su una riga apre la scheda dell'intervallo col cursore già nei colpi (si corregge da
//    tastiera: Invio salva, Esc chiude);
//  - sul telefono resta tutto com'era.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const schermo = (app, larghezza) => { app.w.matchMedia = q => { const m = /min-width:\s*(\d+)px/.exec(q); return { matches: !!m && larghezza >= +m[1], addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }; }; };

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  app.E('openProject(Object.keys(state.projects)[0])');
  await attesa(80);
  t('sul telefono si parte dal contatore', $(app, 'cardCounterDashboard').style.display !== 'none' && $(app, 'cardIntegratedRegister').style.display === 'none');

  schermo(app, 1280);
  app.E('updateUI()');
  t('sul PC niente contatore: si vede il Registro', $(app, 'cardCounterDashboard').style.display === 'none' && $(app, 'cardIntegratedRegister').style.display !== 'none');
  clic(app, $(app, 'tblIntegratedLogsBody').querySelectorAll('.swipe-content')[1]);
  await attesa(250);
  t('un clic sulla riga apre la scheda col cursore nei colpi', $(app, 'modalEditStep').classList.contains('open') && app.d.activeElement === $(app, 'numModalColpi'));
  const colpi = app.E('state.logs[1].colpi');
  $(app, 'numModalColpi').value = String(colpi + 5);
  $(app, 'numModalColpi').dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await attesa(60);
  t('Invio salva la correzione, che resta tracciata', app.E('state.logs[1].colpi') === colpi + 5 && !!app.E('state.logs[1].modificatoIl') && !$(app, 'modalEditStep').classList.contains('open'));
  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
