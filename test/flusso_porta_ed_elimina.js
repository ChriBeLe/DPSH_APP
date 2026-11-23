// (Fase C) PORTA UNICA TELEFONO→PC ed ELIMINAZIONE CON «CANCELLA».
//  - Home: «Ricevi un progetto»; Impostazioni: «Copia di tutti i progetti»;
//  - ⋯ del progetto senza «Backup» e «Porta su un altro dispositivo»; Consegna con «Porta sul PC»;
//  - Consegna aperta dalla prova con «Questa prova» → il PDF parte con la sola prova spuntata;
//  - eliminare prova e progetto: tasto spento (disabled) finché non si scrive CANCELLA; testo veritiero.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const scrivi = (app, el, v) => { el.value = v; el.dispatchEvent(new app.w.Event('input', { bubbles: true })); };

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E('Object.keys(state.projects)[0]');

  console.log('--- Nomi e voci ---');
  t('Home: «Ricevi un progetto»', $(app, 'btnHomeImportProject').textContent.trim() === 'Ricevi un progetto');
  const titoliDrawer = [...app.d.querySelectorAll('.drawer-section-title')].map(x => x.textContent.trim());
  t('Impostazioni: «Copia di tutti i progetti»', titoliDrawer.includes('Copia di tutti i progetti') && !titoliDrawer.some(x => /Backup Completo/.test(x)));
  t('⋯ del progetto: niente «Backup» né «Porta su un altro dispositivo»', !$(app, 'btnProjActBackup') && !$(app, 'btnProjActPorta') && !/Porta su un altro dispositivo/.test($(app, 'modalProjectActions').textContent));
  t('la Consegna ha «Porta sul PC» e non «Backup Strutturato»', !!$(app, 'btnOptPortaSulPc') && !$(app, 'btnOptExportJSON'));
  t('i messaggi non rimandano più a «Backup Completo»', !/Backup Completo →/.test(fs.readFileSync(path.join(__dirname, '..', 'src', 'js', '004_funzioni-sperimentali.js'), 'utf8')));

  console.log('--- Consegna dalla prova: «Questa prova» → PDF con la sola prova ---');
  app.E(`openProject(${JSON.stringify(pid)})`);
  await attesa(80);
  const survId = app.E('state.currentSurveyId');
  const nProve = app.E(`Object.keys(state.projects[${JSON.stringify(pid)}].surveys).length`);
  clic(app, $(app, 'btnExportHeader'));
  await attesa(40);
  t('Consegna sulla prova, perimetro «Questa prova»', $(app, 'btnPerimetroProva').getAttribute('aria-selected') === 'true' && nProve > 1);
  clic(app, $(app, 'btnOptExportCompletePdf'));
  await attesa(80);
  const spuntate = [...app.d.querySelectorAll('.chk-esporta-pdf-prova')].filter(c => c.checked).map(c => c.dataset.id);
  t('il PDF parte con la sola prova aperta spuntata', spuntate.length === 1 && spuntate[0] === survId);
  const pdfOpen = app.d.getElementById('modalEsportaPdf');
  if (pdfOpen) pdfOpen.classList.remove('open');

  console.log('--- Elimina prova ---');
  const altra = app.E(`Object.keys(state.projects[${JSON.stringify(pid)}].surveys).find(id => id !== state.currentSurveyId)`);
  app.E(`openDeleteSurveyModal(${JSON.stringify(altra)})`);
  const bs = $(app, 'btnConfirmDeleteSurvey');
  t('il testo dice la verità: 10 secondi per annullare, non «definitiva»', /10 secondi/.test($(app, 'modalDeleteSurvey').textContent) && !/definitiva e non può essere annullata/.test($(app, 'modalDeleteSurvey').textContent));
  t('tasto spento davvero: disabled e aria-disabled', bs.disabled === true && bs.getAttribute('aria-disabled') === 'true');
  scrivi(app, $(app, 'txtDeleteSurveyConfirm'), 'cancell');
  t('scritta incompleta: resta spento', bs.disabled === true);
  scrivi(app, $(app, 'txtDeleteSurveyConfirm'), 'cancella');
  t('CANCELLA (anche minuscolo): si accende', bs.disabled === false && bs.getAttribute('aria-disabled') === 'false');
  scrivi(app, $(app, 'txtDeleteSurveyConfirm'), '');
  t('cancellando la scritta si rispegne', bs.disabled === true);
  clic(app, $(app, 'btnCancelDeleteSurvey'));

  console.log('--- Elimina progetto ---');
  app.E('switchView("home")');
  await attesa(40);
  app.E(`openConfirmDeleteModal(${JSON.stringify(pid)}, null)`);
  const bp = $(app, 'btnConfirmDeleteProjModal');
  t('c\'è il campo «Scrivi CANCELLA» come per la prova', !!$(app, 'txtDeleteProjConfirm') && /Scrivi CANCELLA/.test($(app, 'modalConfirmDelete').textContent));
  t('refuso corretto: «Elimina definitivamente»', /Elimina definitivamente/.test(bp.textContent) && !/Definitivemente/.test(bp.textContent));
  t('tasto spento: disabled e aria-disabled', bp.disabled === true && bp.getAttribute('aria-disabled') === 'true');
  clic(app, bp);
  t('un clic a tasto spento non elimina nulla', !!app.E(`state.projects[${JSON.stringify(pid)}]`));
  scrivi(app, $(app, 'txtDeleteProjConfirm'), 'CANCELLA');
  t('con CANCELLA si accende', bp.disabled === false);
  clic(app, bp);
  await attesa(500);
  t('il progetto è eliminato e c\'è il banner di annullamento', !app.E(`state.projects[${JSON.stringify(pid)}]`) && $(app, 'undoNotificationBanner').style.display === 'flex');

  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})();
