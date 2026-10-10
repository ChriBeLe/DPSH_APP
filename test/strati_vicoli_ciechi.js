// STRATI E PARAMETRI SENZA VICOLI CIECHI (071q).
//
// Gli strati e le scelte sono del progetto, i valori di una prova: quella aperta. Prima:
//  - la Gestione degli strati calcolava sull'ultima prova usata senza dirlo;
//  - per uno strato senza intervalli in quella prova il messaggio diceva «assegna la litologia
//    nella scheda Prova» senza un tasto per arrivarci;
//  - la X della procedura guidata non chiudeva finché mancava una scelta;
//  - l'export dei parametri stava in fondo agli strati, doppione della Consegna.
// Si controlla che:
//  - in cima alla Gestione ci sia la prova su cui si calcola, e che si cambi da lì;
//  - lo strato senza intervalli dica dove compare, con «Calcola sulla Prova N°…» e «Assegna gli
//    intervalli», e che i due tasti facciano quello che dicono;
//  - la X della procedura guidata chiuda anche con una scelta mancante, e il messaggio la dica;
//  - la Consegna esporti ancora i parametri (i suoi bottoni premono quelli nascosti degli strati).
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  // Nardò: lo strato «…851» ha intervalli nelle prove 1, 3 e 3B, non nella 2.
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const p1 = app.E(`Object.values(state.projects[${JSON.stringify(pid)}].surveys).find(s => s.header.provaNr === '1').id`);
  const p2 = app.E(`Object.values(state.projects[${JSON.stringify(pid)}].surveys).find(s => s.header.provaNr === '2').id`);
  const strato = 'strato_1790450331851';
  app.E(`openProject(${JSON.stringify(pid)})`);
  await attesa(20);
  app.E(`syncProjectToActiveState(${JSON.stringify(pid)}, ${JSON.stringify(p2)})`);
  app.E(`switchView('project')`);
  await attesa(20);

  // Dal Progetto, «Strati».
  clic(app, $(app, 'btnProgettoStrati'));
  await attesa(20);
  t('la Gestione degli strati si apre dal Progetto', $(app, 'modalManageStrati').classList.contains('open'));
  const sel = $(app, 'selStratiProvaCalcolo');
  t('in cima c\'è la prova su cui si calcola, con tutte le prove del progetto', !!sel && sel.options.length === 4);
  t('ed è quella aperta (Prova N° 2)', !!sel && sel.value === p2);
  const lista = $(app, 'stratiListContainer');
  t('lo strato senza intervalli dice dove compare', /non ha intervalli nella Prova N° 2/.test(lista.textContent) && /Compare nella Prova N° 1/.test(lista.textContent));
  const calcola = lista.querySelector(`[data-calcola-prova="${p1}"]`);
  t('e ha il tasto «Calcola sulla Prova N° 1»', !!calcola && /Calcola sulla Prova N° 1/.test(calcola.textContent));
  t('e il tasto «Assegna gli intervalli»', !!lista.querySelector('[data-assegna-intervalli]'));
  t('le spiegazioni stanno dopo gli strati', !!(lista.compareDocumentPosition($(app, 'modalManageStrati').querySelector('.info-collapsible')) & app.w.Node.DOCUMENT_POSITION_FOLLOWING));
  t('l\'export dei parametri non è più in fondo agli strati: c\'è la porta verso la Consegna', !!$(app, 'btnStratiVaiConsegna') && $(app, 'stratiExportNascosto').hidden);

  // «Calcola sulla Prova N° 1»: si resta nella Gestione, cambia la prova.
  clic(app, calcola);
  await attesa(20);
  t('«Calcola sulla Prova N° 1» apre la prova 1', app.E('state.currentSurveyId') === p1);
  t('restando nella Gestione degli strati', $(app, 'modalManageStrati').classList.contains('open'));
  t('la tendina dice Prova N° 1', $(app, 'selStratiProvaCalcolo').value === p1);
  t('e lo strato ora ha i suoi valori', !/non ha intervalli/.test($(app, 'stratiListContainer').textContent));

  // La tendina riporta alla 2.
  const sel2 = $(app, 'selStratiProvaCalcolo');
  sel2.value = p2;
  sel2.dispatchEvent(new app.w.Event('change', { bubbles: true }));
  await attesa(20);
  t('la tendina cambia la prova su cui si calcola', app.E('state.currentSurveyId') === p2);

  // «Assegna gli intervalli»: porta al Registro della prova aperta.
  clic(app, $(app, 'stratiListContainer').querySelector('[data-assegna-intervalli]'));
  await attesa(20);
  t('«Assegna gli intervalli» chiude la Gestione', !$(app, 'modalManageStrati').classList.contains('open'));
  t('e apre la prova sul Registro', app.E("state.uiState.currentView") === 'field' && app.E('vistaProva') === 'registro');

  // Procedura guidata: la X chiude anche con una scelta mancante.
  app.E(`syncProjectToActiveState(${JSON.stringify(pid)}, ${JSON.stringify(p1)})`);
  app.E(`state.strati.forEach(s => { s.parametriAvanzati = {}; })`);
  app.E(`apriWizardParametri(${JSON.stringify(strato)})`);
  await attesa(20);
  t('la procedura guidata si apre', $(app, 'modalWizard').classList.contains('open'));
  t('e dice su quale prova calcola', /Prova N° 1/.test($(app, 'wizardBody').querySelector('.wiz-eyebrow').textContent));
  clic(app, $(app, 'btnCloseWizardX'));
  await attesa(20);
  t('la X chiude anche con scelte mancanti', !$(app, 'modalWizard').classList.contains('open'));
  t('senza un avviso da confermare', !app.dialogo());
  const toast = $(app, 'toastApp');
  t('il messaggio dice cosa manca e offre «Completa»', !!toast && /Manca ancora/.test(toast.textContent) && $(app, 'toastAppAzione').textContent === 'Completa');
  clic(app, $(app, 'toastAppAzione'));
  await attesa(20);
  t('«Completa» riapre la procedura guidata', $(app, 'modalWizard').classList.contains('open'));

  // La Consegna esporta ancora i parametri: il suo bottone preme quello nascosto degli strati.
  let premuto = false;
  $(app, 'btnExportProcessingCsv').addEventListener('click', () => { premuto = true; }, true);
  clic(app, app.d.querySelector('[data-parametri="Csv"]'));
  t('la Consegna esporta ancora i parametri', premuto);

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log(app.errori.join('\n'));
  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
