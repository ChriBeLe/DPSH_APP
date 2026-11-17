// FOGLIO «DAI UN NOME AGLI STRATI» e PERCORSO NEL PROGETTO (Fase C, passi C e H).
//  - dopo «Riconosci strati» si apre da solo il foglio (non più un toast che scade);
//  - una riga per strato con la quota da–a e il campo nome; «Salva i nomi» li scrive;
//  - la scelta dall'Archivio porta nome, colore e collegamento; «Chiudi» non salva;
//  - la schermata Progetto mostra le tappe ① Prove … ⑤ Consegna con lo stato in breve, e
//    ② Strati apre il foglio se ci sono strati senza nome, la Gestione altrimenti.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const aperto = (app, id) => $(app, id).classList.contains('open');

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  app.E(`openProject(${JSON.stringify(pid)})`);
  await attesa(30);
  // Tre strati dal nome generico, a due intervalli ciascuno.
  app.E(`state.strati = [
    { id: 'sA', name: 'Strato 1', color: '#fbbf24' },
    { id: 'sB', name: 'Strato 2', color: '#3b82f6' },
    { id: 'sC', name: 'Sabbia limosa', color: '#10b981' }];
    state.logs = [0,1,2,3,4,5].map(i => ({ start: i * 0.2, end: (i + 1) * 0.2, colpi: 5 + i, lithology: i === 0 ? 'sA' : (i === 2 ? 'sB' : (i === 4 ? 'sC' : undefined)) }));
    saveState(); updateUI();`);

  console.log('--- Il foglio ---');
  app.E('apriDaiNomeStrati()');
  await attesa(20);
  t('si apre il foglio «Dai un nome agli strati»', aperto(app, 'modalDaiNome') && /Dai un nome agli strati/.test($(app, 'modalDaiNome').textContent));
  const righe = [...$(app, 'listaDaiNome').querySelectorAll('[data-strato]')];
  t('una riga per strato', righe.length === 3);
  t('con la quota da–a (virgola)', /da 0,00 a 0,40 m/.test(righe[0].textContent) && /da 0,40 a 0,80 m/.test(righe[1].textContent));
  t('l\'intro dice quanti sono senza nome', /2 strati non hanno ancora un nome/.test($(app, 'lblDaiNomeIntro').textContent));
  t('c\'è «Salva i nomi» e «Chiudi»', /Salva i nomi/.test($(app, 'btnDaiNomeSalva').textContent) && /^Chiudi$/.test($(app, 'btnDaiNomeChiudi').textContent));

  const campi = [...$(app, 'listaDaiNome').querySelectorAll('input')];
  campi[0].value = 'Argilla limosa';
  campi[1].value = '  ';
  clic(app, $(app, 'btnDaiNomeSalva'));
  await attesa(20);
  t('«Salva i nomi» scrive il nome e chiude il foglio', !aperto(app, 'modalDaiNome') && app.E("state.strati[0].name") === 'Argilla limosa');
  t('un campo vuoto lascia il nome com\'era', app.E("state.strati[1].name") === 'Strato 2');

  console.log('--- Dall\'Archivio ---');
  app.E(`state.lithologyArchive = { arch_x: { id: 'arch_x', name: 'Ghiaia sabbiosa', color: '#aa5500', pattern: 'dots', behavior: 'granulare', parametriPreferiti: {} } }`);
  app.E('apriDaiNomeStrati()');
  await attesa(20);
  const rigaB = $(app, 'listaDaiNome').querySelectorAll('[data-strato]')[1];
  clic(app, rigaB.querySelector('.dai-nome-archivio'));
  await attesa(20);
  t('«Dall\'Archivio» apre il selettore dell\'archivio', aperto(app, 'modalArchivePicker'));
  clic(app, $(app, 'archivePickerList').querySelector('.archive-pick-checkbox'));
  clic(app, $(app, 'btnConfirmArchivePicker'));
  await attesa(20);
  const rigaB2 = $(app, 'listaDaiNome').querySelectorAll('[data-strato]')[1];
  t('la riga prende il nome della voce', rigaB2.querySelector('input').value === 'Ghiaia sabbiosa');
  t('ma non scrive niente finché non si salva', app.E("state.strati[1].name") === 'Strato 2');
  clic(app, $(app, 'btnDaiNomeSalva'));
  await attesa(20);
  t('«Salva i nomi» porta nome, colore, retino e collegamento', app.E("state.strati[1].name") === 'Ghiaia sabbiosa' && app.E("state.strati[1].color") === '#aa5500' && app.E("state.strati[1].pattern") === 'dots' && app.E("state.strati[1].sourceArchiveId") === 'arch_x');

  console.log('--- Chiudi non salva ---');
  app.E(`state.strati[2].name = 'Strato 9'`);
  app.E('apriDaiNomeStrati()');
  await attesa(20);
  clic(app, $(app, 'btnDaiNomeChiudi'));
  await attesa(20);
  t('senza modifiche «Chiudi» chiude subito', !aperto(app, 'modalDaiNome'));
  app.E('apriDaiNomeStrati()');
  await attesa(20);
  $(app, 'listaDaiNome').querySelector('input').value = 'Qualcosa';
  clic(app, $(app, 'btnDaiNomeChiudi'));
  await attesa(20);
  t('con nomi non salvati chiede prima', aperto(app, 'modalDaiNome') && !!app.dialogo());
  clic(app, app.dialogo().ok);
  await attesa(20);
  t('e chiudendo non salva', !aperto(app, 'modalDaiNome') && app.E("state.strati[0].name") === 'Argilla limosa');

  console.log('--- Dopo «Riconosci strati» ---');
  app.E(`state.lithologyArchive = {}; state.strati = [{ id: 'sA', name: 'Strato 1', color: '#fbbf24' }]; state.logs = [0,1,2,3,4,5,6,7].map(i => ({ start: i * 0.2, end: (i + 1) * 0.2, colpi: i < 4 ? 4 : 20 }));`);
  app.E(`numAutoStratiDeltaColpi.value = '5'; numAutoStratiMinThickness.value = '0.2';`);
  clic(app, $(app, 'btnRunAutoStrati'));
  await attesa(60);
  t('il riconoscimento apre da solo il foglio', aperto(app, 'modalDaiNome'));
  t('e non c\'è più il toast «Dai un nome»', !/Dai un nome/.test((app.d.getElementById('toastApp') || { textContent: '' }).textContent));
  t('con una riga per ogni strato riconosciuto', $(app, 'listaDaiNome').querySelectorAll('[data-strato]').length === app.E('state.strati.length') && app.E('state.strati.length') >= 2);
  app.E('chiudiDaiNomeStrati()');

  console.log('--- Il percorso nel Progetto ---');
  app.E(`state.strati = [{ id: 'sA', name: 'Strato 1', color: '#fbbf24' }, { id: 'sB', name: 'Sabbia', color: '#3b82f6' }]; saveState();`);
  app.E(`switchView('project')`);
  await attesa(30);
  const nProve = app.E('Object.keys(state.projects[state.currentProjectId].surveys).length');
  const etichette = ['btnTappaProve', 'btnProgettoStrati', 'btnTappaParametri', 'btnTappaReport', 'btnProgettoConsegna'].map(id => $(app, id).querySelector('strong').textContent);
  t('cinque tappe in ordine', etichette.join('|') === '① Prove|② Strati|③ Parametri|④ Report|⑤ Consegna');
  t('① Prove dice quante sono', new RegExp('^' + nProve + ' prov').test($(app, 'lblTappaProve').textContent));
  t('② Strati dice quanti e quanti senza nome', $(app, 'lblTappaStrati').textContent === '2 · 1 senza nome');
  t('③ Parametri e ⑤ Consegna mostrano solo il nome', $(app, 'lblTappaParametri').textContent === '' && $(app, 'lblTappaConsegna').textContent === '');
  t('④ Report dice il modello', /Classico/.test($(app, 'lblTappaReport').textContent));
  t('le card Strati e Consegna non sono duplicate', app.d.querySelectorAll('#btnProgettoStrati').length === 1 && app.d.querySelectorAll('#btnProgettoConsegna').length === 1 && !$(app, 'progettoPercorso').nextElementSibling.querySelector('#btnProgettoStrati'));
  t('Dati, Note e Terreno restano raggiungibili', !!$(app, 'btnProgettoDati') && !!$(app, 'btnProgettoNote') && !!$(app, 'btnProgettoTerreno'));

  clic(app, $(app, 'btnProgettoStrati'));
  await attesa(20);
  t('② Strati con strati senza nome apre il foglio', aperto(app, 'modalDaiNome') && !aperto(app, 'modalManageStrati'));
  const campo = $(app, 'listaDaiNome').querySelector('input');
  campo.value = 'Argilla';
  clic(app, $(app, 'btnDaiNomeSalva'));
  await attesa(20);
  t('dopo il salvataggio la tappa dice che tutti hanno il nome', $(app, 'lblTappaStrati').textContent === '2 · tutti con il nome');
  clic(app, $(app, 'btnProgettoStrati'));
  await attesa(20);
  t('senza strati senza nome ② apre la Gestione', aperto(app, 'modalManageStrati') && !aperto(app, 'modalDaiNome'));
  app.E('closeStratiModal()');
  app.E(`state.strati[0].name = 'Strato 1'`);
  app.E(`renderSchermataProgetto()`);
  clic(app, $(app, 'btnProgettoStrati'));
  await attesa(20);
  clic(app, $(app, 'btnDaiNomeApriStrati'));
  await attesa(20);
  t('dal foglio «Apri Strati» porta alla Gestione', aperto(app, 'modalManageStrati') && !aperto(app, 'modalDaiNome'));
  app.E('closeStratiModal()');
  clic(app, $(app, 'btnTappaParametri'));
  await attesa(20);
  t('③ Parametri apre la procedura guidata', aperto(app, 'modalWizard'));
  app.E('chiudiWizardParametri(true)');
  clic(app, $(app, 'btnTappaReport'));
  t('④ Report apre i modelli di report', aperto(app, 'modalReportTemplates'));
  app.E('closeReportTemplatesModal()');
  clic(app, $(app, 'btnProgettoConsegna'));
  t('⑤ Consegna apre la Consegna del progetto', aperto(app, 'modalExportFormats'));

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
