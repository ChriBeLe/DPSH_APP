// IL CONTROLLO DEI DATI SENZA VICOLI CIECHI (004c). Prima l'avviso all'avvio elencava le anomalie
// e finiva in «Ho capito»; nella Consegna l'elenco era solo da leggere. Ora:
//  - l'avviso ha «Mostrami dove»: apre la Consegna del progetto con l'elenco aperto;
//  - accanto a ogni anomalia un tasto porta dove la si corregge (le foto della prova, le note,
//    la prova), coi comandi che ci sono già. L'app continua a non correggere niente da sola.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa } = require('./dati/app_in_jsdom');
const { creaIndexedDB } = require('./dati/idb_finto');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));

(async () => {
  // Senza le foto nel database del telefono: le foto della prova «non si trovano più».
  const app = await avviaApp({ stato: STATO_V0, idb: creaIndexedDB() });
  let dlg = null;
  for (let i = 0; i < 30 && !(dlg = app.dialogo()); i++) await attesa(100);
  t('all\'avvio l\'avviso del controllo dei dati (lo stato di prova ha foto che mancano)', dlg && dlg.titolo === 'Controllo dei dati');
  t('l\'avviso ha «Mostrami dove», non solo «Ho capito»', dlg && dlg.extra && dlg.extra.style.display !== 'none' && dlg.extra.textContent === 'Mostrami dove');
  clic(app, dlg && dlg.extra);
  // il controllo delle foto è asincrono: si aspetta che l'elenco compaia (fino a 5 s)
  for (let i = 0; i < 50 && !app.d.querySelector('#integritaPrimaExport [data-integrita-vai]'); i++) await attesa(100);
  t('«Mostrami dove» apre la Consegna del progetto', app.d.getElementById('modalExportFormats').classList.contains('open'));
  const box = app.d.getElementById('integritaPrimaExport');
  t('con l\'elenco delle anomalie già aperto', !!box.querySelector('details[open]'));
  const tasti = Array.from(box.querySelectorAll('[data-integrita-vai]'));
  t('accanto alle anomalie i tasti per andare a correggerle', tasti.some(b => b.textContent === 'Apri le foto') && tasti.some(b => b.textContent === 'Apri le note'));

  const foto = tasti.find(b => b.dataset.integritaVai === 'foto');
  const sid = foto.dataset.surv;
  clic(app, foto);
  await attesa(100);
  t('«Apri le foto» chiude la Consegna e apre le foto di quella prova',
    !app.d.getElementById('modalExportFormats').classList.contains('open') && app.E('state.currentSurveyId') === sid
    && app.E('state.uiState.currentView') === 'field' && app.d.getElementById('modalSurveyPhotos').classList.contains('open'));
  app.E('typeof closeSurveyPhotosModal === "function" && closeSurveyPhotosModal()');
  await attesa(30);

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log(app.errori.join('\n'));
  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
