// LE DUE VISTE DELLA PROVA (Fase 6, punto 1): «Conta» e «Registro», coi tocchi come li fa l'utente.
//
//  - si entra nella prova su «Conta»: contatore e ultimi 3 intervalli, il registro no;
//  - gli ultimi 3 sono proprio gli ultimi, in ordine di profondità; un tocco apre la scheda;
//  - «Registro · N» (e «Tutto il registro») mostra il registro intero e nasconde il contatore;
//  - il registro non ha più uno scorrimento suo dentro la pagina;
//  - spariscono il lucchetto che comprimeva il contatore e le due barre (compatta e fissa);
//  - tornando alla Home e rientrando si riparte da «Conta».
// Controprove sull'app di prima (riferimento/).
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
const virgola = n => n.toFixed(2).replace('.', ',');

async function apriPrimaProva(app) {
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E('Object.keys(state.projects)[0]');
  app.E('openProject(' + JSON.stringify(pid) + ')');
  await attesa(80);
  return pid;
}

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  const pid = await apriPrimaProva(app);
  const logs = JSON.parse(JSON.stringify(app.E('state.logs'))); // copia: app.E dà l'array vivo

  console.log('--- Si entra su «Conta» ---');
  t('due schede: Conta e Registro', $(app, 'btnVistaConta').textContent === 'Conta' && /^Registro/.test($(app, 'btnVistaRegistro').textContent));
  t('Conta è quella scelta', $(app, 'btnVistaConta').getAttribute('aria-selected') === 'true' && $(app, 'btnVistaRegistro').getAttribute('aria-selected') === 'false');
  t('si vedono contatore e ultimi intervalli', visibile(app, 'cardCounterDashboard') && visibile(app, 'cardUltimiIntervalli'));
  t('il registro no', !visibile(app, 'cardIntegratedRegister') && !visibile(app, 'cardLogsTable') && !visibile(app, 'cardChart'));
  t('la scheda Registro dice quanti intervalli ci sono', $(app, 'btnVistaRegistro').textContent === `Registro · ${logs.length}`);

  console.log('--- Gli ultimi 3 intervalli ---');
  const righe = [...$(app, 'listaUltimiIntervalli').querySelectorAll('.ultimo-intervallo')];
  const attese = logs.slice(-3);
  t('sono 3', logs.length >= 3 && righe.length === 3);
  t('sono proprio gli ultimi, dall\'alto in basso', righe.every((r, k) =>
    r.querySelector('.ultimo-intervallo-prof').textContent === `${virgola(attese[k].start)}–${virgola(attese[k].end)} m`
    && r.querySelector('.ultimo-intervallo-colpi').textContent === String(attese[k].colpi)));
  clic(app, righe[2]);
  t('un tocco apre la scheda di quell\'intervallo', $(app, 'modalViewStep').classList.contains('open') && app.E('viewingIndex') === logs.length - 1);
  app.E('closeViewModal()');
  await attesa(20);
  const colpiPrima = app.E('state.currentCount');
  clic(app, $(app, 'btnPlus'));
  await attesa(700);
  app.E('confirmAndNextStep()');
  await attesa(300);
  const dopo = app.E('state.logs');
  const ultima = [...$(app, 'listaUltimiIntervalli').querySelectorAll('.ultimo-intervallo')].pop();
  t('registrando, l\'ultimo intervallo compare in fondo', dopo.length === logs.length + 1
    && ultima.querySelector('.ultimo-intervallo-colpi').textContent === String(colpiPrima + 1)
    && $(app, 'btnVistaRegistro').textContent === `Registro · ${dopo.length}`);

  console.log('--- «Registro» ---');
  clic(app, $(app, 'btnVistaRegistro'));
  t('mostra il registro e nasconde contatore e ultimi', visibile(app, 'cardIntegratedRegister') && !visibile(app, 'cardCounterDashboard') && !visibile(app, 'cardUltimiIntervalli'));
  t('con tutte le righe', $(app, 'tblIntegratedLogsBody').querySelectorAll('.swipe-row-wrapper').length === dopo.length);
  const involucro = $(app, 'cardIntegratedRegister').querySelector('.logs-table-wrapper');
  const stile = app.w.getComputedStyle(involucro);
  t('niente scorrimento dentro lo scorrimento', !/auto|scroll/.test(stile.overflowY) && (stile.maxHeight === 'none' || stile.maxHeight === ''));
  clic(app, $(app, 'btnToggleViewIntegrated'));
  await attesa(250); // il cambio di vista è animato (160 ms)
  t('anche la vista col grafico sta nella scheda Registro', visibile(app, 'cardLogsTable') && visibile(app, 'cardChart') && !visibile(app, 'cardCounterDashboard'));
  t('e la sua tabella non scorre per conto suo', !/auto|scroll/.test(app.w.getComputedStyle($(app, 'cardLogsTable').querySelector('.logs-table-wrapper')).overflowY));
  clic(app, $(app, 'btnToggleViewChart'));
  await attesa(250);
  clic(app, $(app, 'btnVistaConta'));
  t('«Conta» riporta al contatore', visibile(app, 'cardCounterDashboard') && !visibile(app, 'cardIntegratedRegister'));
  clic(app, $(app, 'btnVaiAlRegistro'));
  t('«Tutto il registro» porta al Registro', visibile(app, 'cardIntegratedRegister') && $(app, 'btnVistaRegistro').getAttribute('aria-selected') === 'true');

  console.log('--- Home e ritorno ---');
  clic(app, $(app, 'btnHomeView'));
  await attesa(50);
  app.E('openProject(' + JSON.stringify(pid) + ')');
  await attesa(80);
  t('rientrando nella prova si riparte da «Conta»', visibile(app, 'cardCounterDashboard') && $(app, 'btnVistaConta').getAttribute('aria-selected') === 'true');

  console.log('--- Via lucchetto e barre doppie ---');
  t('niente lucchetto per comprimere il contatore', !$(app, 'btnCounterLockHandle'));
  t('niente barra compatta né barra fissa in alto', !$(app, 'counterCollapsedBar') && !$(app, 'stickyStatusBar'));
  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log('--- Controprove: l\'app di prima ---');
  const vecchia = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0, idb: telefonoV0() });
  await apriPrimaProva(vecchia);
  t('(controprova) non c\'erano le schede Conta | Registro', !vecchia.d.getElementById('btnVistaConta'));
  t('(controprova) c\'erano il lucchetto e la barra fissa', !!vecchia.d.getElementById('btnCounterLockHandle') && !!vecchia.d.getElementById('stickyStatusBar'));
  t('(controprova) contatore e registro stavano insieme', !nascosto(vecchia.w, vecchia.d.getElementById('cardCounterDashboard')) && !nascosto(vecchia.w, vecchia.d.getElementById('cardIntegratedRegister')));
  vecchia.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
