// CONSEGNA UNICA (Fase 5, punto 2): la finestra Esporta diventa «Consegna».
//  - dalla prova: «Questa prova | Tutto il progetto»; dalla Home (⋯ del progetto) solo il progetto;
//  - nel progetto anche Parametri avanzati (Excel, CSV, PDF, Word) e Confronto prove, che prima
//    stavano solo in Gestione litologica e nel ⋯ del progetto.
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

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E('Object.keys(state.projects)[0]');
  app.E(`openProject(${JSON.stringify(pid)})`);
  await attesa(80);

  console.log('--- Dalla prova ---');
  t('nel ⋯ della prova la voce si chiama «Consegna»', /Consegna/.test($(app, 'btnExportHeader').textContent));
  clic(app, $(app, 'btnExportHeader'));
  await attesa(40);
  t('si apre «Consegna», col nome della prova e del progetto', $(app, 'modalExportFormats').classList.contains('open')
    && $(app, 'lblExportModalTitle').textContent === 'Consegna' && /^Prova /.test($(app, 'lblExportModalSubtitle').textContent));
  t('c\'è la scelta «Questa prova | Tutto il progetto», su «Questa prova»', visibile(app, 'perimetroConsegna')
    && $(app, 'btnPerimetroProva').getAttribute('aria-selected') === 'true');
  t('per la sola prova niente parametri avanzati né confronto', !visibile(app, 'consegnaParametri') && !visibile(app, 'btnOptConfrontoProve'));
  clic(app, $(app, 'btnPerimetroProgetto'));
  await attesa(40);
  t('«Tutto il progetto»: si passa al progetto', app.E('exportModalContext.type') === 'project' && app.E('exportModalContext.id') === pid
    && $(app, 'btnPerimetroProgetto').getAttribute('aria-selected') === 'true');
  t('e compaiono Parametri avanzati e Confronto prove', visibile(app, 'consegnaParametri') && visibile(app, 'btnOptConfrontoProve'));
  const prima = app.scaricati.length;
  clic(app, $(app, 'consegnaParametri').querySelector('[data-parametri="Csv"]'));
  await attesa(80);
  t('Parametri avanzati › CSV scarica il file e chiude la finestra', app.scaricati.length === prima + 1 && !$(app, 'modalExportFormats').classList.contains('open'));
  clic(app, $(app, 'btnExportHeader'));
  clic(app, $(app, 'btnPerimetroProgetto'));
  clic(app, $(app, 'btnOptConfrontoProve'));
  await attesa(80);
  t('Confronto prove apre il confronto', $(app, 'modalConfrontoProve').classList.contains('open'));
  app.E('chiudiConfrontoProve()');

  console.log('--- Dalla Home ---');
  app.E('switchView("home")');
  await attesa(40);
  app.E(`openExportModal('project', ${JSON.stringify(pid)})`);
  await attesa(40);
  t('dal progetto in Home: niente scelta della prova', !visibile(app, 'perimetroConsegna') && $(app, 'lblExportModalTitle').textContent === 'Consegna');
  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  const vecchia = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0, idb: telefonoV0() });
  t('(controprova) prima non c\'erano la scelta né i parametri nella finestra', !vecchia.d.getElementById('perimetroConsegna') && !vecchia.d.getElementById('consegnaParametri'));
  vecchia.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
