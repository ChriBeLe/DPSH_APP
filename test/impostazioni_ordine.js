// IMPOSTAZIONI RIORDINATE (Fase 5, punto 3), come nella tavola «Impostazioni» del prototipo:
// In campo · Dati e sicurezza (spazio, copie, backup) · Libreria · Aspetto · Altro (sperimentali, reset).
//  - «Tasto Registra» si sceglie anche da qui, ed è la stessa preferenza della prova;
//  - la Libreria apre template e archivio anche da dentro una prova (prima solo dalla Home).
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');
const { nascosto } = require('./dati/misure_stile');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const titoli = app => [...$(app, 'drawerMenu').querySelectorAll('.drawer-section-title, #btnToggleFunzioniSperimentali')]
  .map(e => e.textContent.trim()).filter(x => !/Debug|Diagnostica/.test(x));

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  app.E('openProject(Object.keys(state.projects)[0])');
  await attesa(80);

  t('le sezioni nell\'ordine del prototipo', JSON.stringify(titoli(app)) === JSON.stringify(
    ['In campo', 'Spazio occupato', 'Copie automatiche', 'Backup Completo Archivio', 'Libreria', 'Aspetto', 'Funzioni Sperimentali', 'Reset']));

  const chk = $(app, 'chkTastoRegistra');
  t('«Tasto Registra» in «In campo», acceso come nella prova', chk.checked && chk.closest('.drawer-section').textContent.includes('In campo'));
  chk.checked = false; chk.dispatchEvent(new app.w.Event('change', { bubbles: true }));
  t('spento dal cassetto: la prova lo nasconde e la scelta resta', nascosto(app.w, $(app, 'btnConfirmStepAction')) && JSON.parse(app.salvato()).settings.tastoRegistraVisibile === false);
  clic(app, $(app, 'btnMostraRegistra'));
  t('rimesso dalla prova: il cassetto torna acceso', chk.checked);

  clic(app, $(app, 'btnHamburger'));
  clic(app, $(app, 'btnDrawerTemplate'));
  await attesa(80);
  t('Libreria › Template: chiude il cassetto e apre i template', !$(app, 'drawerMenu').classList.contains('open') && $(app, 'modalReportTemplates').classList.contains('open'));
  app.E('closeReportTemplatesModal && closeReportTemplatesModal()');
  clic(app, $(app, 'btnHamburger'));
  clic(app, $(app, 'btnDrawerArchivio'));
  await attesa(80);
  t('Libreria › Archivio litologico: apre l\'archivio', !$(app, 'drawerMenu').classList.contains('open') && $(app, 'modalArchiveManager').classList.contains('open'));
  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  const vecchia = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0, idb: telefonoV0() });
  t('(controprova) prima il cassetto non aveva la Libreria né il tasto Registra', !vecchia.d.getElementById('btnDrawerTemplate') && !vecchia.d.getElementById('chkTastoRegistra'));
  vecchia.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
