// ESC CHIUDE UNA FINESTRA ALLA VOLTA (001, 039). Prima Esc toglieva l'«aperta» a TUTTE le finestre:
// dall'editor del testo di un blocco chiudeva anche l'editor del template, dalla procedura guidata
// anche gli Strati. Ora chiude solo quella in cima (l'ultima aperta), passando dalla sua ✕.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  app.E(`openProject(${JSON.stringify(pid)})`);
  const esc = () => app.d.dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  const aperte = () => Array.from(app.d.querySelectorAll('.modal.open')).map(m => m.id).sort().join(',');
  const dopoEsc = async (apri) => {
    app.E("document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'))");
    await attesa(20);
    for (const a of apri) { app.E(a); await attesa(80); }
    esc();
    await attesa(80);
    return aperte();
  };

  t('dall\'editor del testo, Esc chiude il testo e l\'editor del template resta',
    await dopoEsc([`apriTemplateEditor('classico')`, `apriTplTextEditor('classico-b1')`]) === 'modalTemplateEditor');
  t('dalla procedura guidata, Esc torna agli Strati',
    await dopoEsc([`openStratiModal()`, `apriWizardParametri(state.strati[0].id)`]) === 'modalManageStrati');
  t('dall\'archivio litologico, Esc torna agli Strati',
    await dopoEsc([`openStratiModal()`, `openArchivePicker(0)`]) === 'modalManageStrati');
  t('l\'editor del template sopra la libreria: Esc chiude l\'editor (senza modifiche), la libreria resta',
    await dopoEsc([`openReportTemplatesModal()`, `apriTemplateEditor('classico')`]) === 'modalReportTemplates');
  t('una finestra sola: Esc la chiude', await dopoEsc([`openStratiModal()`]) === '');

  // Col testo cambiato, Esc chiede prima di buttarlo via.
  app.E("document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'))");
  app.E(`apriTemplateEditor('classico')`); await attesa(80);
  app.E(`state.reportTemplates.classico.pages[0].rows[0].blocks.push({ id: 'bt', type: 'testo', colSpan: 4, richHtml: '<p>Prima</p>' })`);
  app.E(`apriTemplateEditor('classico')`); await attesa(80);
  app.E(`apriTplTextEditor('bt')`); await attesa(80);
  app.E(`editorTesto.commands.setContent('<p>Scritto a mano</p>')`);
  esc(); await attesa(80);
  const d1 = app.dialogo();
  t('testo cambiato: Esc chiede «Vuoi salvarlo?» invece di buttarlo via', d1 && d1.titolo === 'Testo non salvato' && app.d.getElementById('modalTplTextEditor').classList.contains('open'));
  clic(app, d1 && d1.annulla); await attesa(60);
  t('«Continua a scrivere» lascia il testo aperto', app.d.getElementById('modalTplTextEditor').classList.contains('open') && !app.dialogo());
  esc(); await attesa(80);
  clic(app, app.dialogo() && app.dialogo().ok); await attesa(80);
  t('«Salva» lo salva nel blocco, e l\'editor del template resta aperto',
    !app.d.getElementById('modalTplTextEditor').classList.contains('open') && app.d.getElementById('modalTemplateEditor').classList.contains('open')
    && /Scritto a mano/.test(JSON.stringify(app.E('templateEditorState.pages'))));

  // Il clic sullo sfondo scuro: anche lui chiude solo quella in cima.
  app.E("document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'))");
  app.E('openStratiModal()'); await attesa(60);
  app.E('apriWizardParametri(state.strati[0].id)'); await attesa(60);
  clic(app, app.d.getElementById('modalWizard').previousElementSibling);
  await attesa(60);
  t('il clic sullo sfondo chiude la procedura guidata, non gli Strati', aperte() === 'modalManageStrati');

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log(app.errori.join('\n'));
  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
