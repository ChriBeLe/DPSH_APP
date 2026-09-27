// IL PC, PER LA POST-PRODUZIONE (Fase 7, decisione I), da 1024 px:
//  - niente contatore né schede Conta | Registro: si vede il Registro;
//  - clic sceglie la riga e accende la sua barra nel grafico; doppio clic apre la scheda col
//    cursore già nei colpi (Invio salva, Esc chiude); ↑ ↓ scorrono, Invio modifica, Canc elimina;
//  - tasto destro: menu con Modifica ed Elimina dove sta il mouse (passo 2 del prototipo PC);
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
  const riga = (i) => $(app, 'tblIntegratedLogsBody').querySelector(`.swipe-content[data-index="${i}"]`);
  const evento = (el, tipo, x) => el.dispatchEvent(new app.w.MouseEvent(tipo, Object.assign({ bubbles: true, cancelable: true }, x)));
  const tasto = (key) => app.d.body.dispatchEvent(new app.w.KeyboardEvent('keydown', { key, bubbles: true }));
  clic(app, riga(1));
  await attesa(30);
  t('un clic sceglie la riga, senza aprire la scheda', riga(1).parentElement.classList.contains('scelta') && !$(app, 'modalEditStep').classList.contains('open'));
  tasto('ArrowDown');
  t('↓ passa alla riga sotto', riga(2).parentElement.classList.contains('scelta') && !riga(1).parentElement.classList.contains('scelta'));
  app.E('state.settings.integratedChart = false; updateUI()');
  const rigaTab = (i) => $(app, 'tblLogsBody').querySelector(`.swipe-row-wrapper[data-index="${i}"]`);
  t('col grafico accanto la scelta resta e accende la sua barra', rigaTab(2).classList.contains('scelta') && !!$(app, 'svgChart').querySelector('.chart-bar-group.scelta[data-index="2"]'));
  clic(app, $(app, 'svgChart').querySelector('.chart-bar-group[data-index="3"]'));
  t('un clic sulla barra del grafico sceglie la riga', rigaTab(3).classList.contains('scelta'));
  app.E('state.settings.integratedChart = true; updateUI()');
  evento(riga(3), 'contextmenu', { clientX: 300, clientY: 200 });
  const menu = $(app, 'menuRiga');
  t('tasto destro: menu aperto dove sta il mouse, con Modifica ed Elimina',
    menu.classList.contains('open') && menu.style.left === '300px' && menu.querySelectorAll('[data-azione]').length === 2);
  tasto('Escape');
  t('Esc chiude il menu', !menu.classList.contains('open'));
  tasto('Enter');
  await attesa(250);
  t('Invio apre la scheda della riga scelta', $(app, 'modalEditStep').classList.contains('open'));
  app.E('closeAnyOpenModal()');
  await attesa(30);
  evento(riga(1), 'dblclick');
  await attesa(250);
  t('doppio clic apre la scheda col cursore nei colpi', $(app, 'modalEditStep').classList.contains('open') && app.d.activeElement === $(app, 'numModalColpi'));
  const colpi = app.E('state.logs[1].colpi');
  $(app, 'numModalColpi').value = String(colpi + 5);
  $(app, 'numModalColpi').dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await attesa(60);
  t('Invio salva la correzione, che resta tracciata', app.E('state.logs[1].colpi') === colpi + 5 && !!app.E('state.logs[1].modificatoIl') && !$(app, 'modalEditStep').classList.contains('open'));
  const n = app.E('state.logs.length');
  clic(app, riga(0));
  tasto('Delete');
  await attesa(30);
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(60);
  t('Canc elimina la riga scelta, dopo la conferma', app.E('state.logs.length') === n - 1);
  app.E('openBulkImportModal()');
  const campo = $(app, 'txtBulkImportData');
  const nPrima = app.E('state.logs.length'), quota = app.E('state.currentDepthStart');
  campo.value = 'Da\tA\tColpi\n0,00\t0,20\t4\n0,20\t0,40\t6';
  campo.dispatchEvent(new app.w.Event('input'));
  const anteprima = [...$(app, 'anteprimaBulkImport').children].map(d => d.textContent);
  t('Aggiungi: le righe di Excel diventano un\'anteprima dalla quota della prova, intestazione saltata',
    anteprima.length === 2 && anteprima[0].startsWith(app.E(`numeroConVirgola(${quota})`)) && anteprima[1].endsWith('6') && !$(app, 'btnConfirmBulkImport').disabled);
  clic(app, $(app, 'btnConfirmBulkImport'));
  await attesa(30);
  t('e si scrivono', app.E('state.logs.length') === nPrima + 2 && app.E('state.logs[state.logs.length - 1].colpi') === 6);
  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
