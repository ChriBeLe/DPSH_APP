// ANNULLA E RIPETI PER OGNI AZIONE (pezzo 004f), coi tocchi come li fa l'utente.
//
//  - all'avvio e aprendo una prova non c'è niente da annullare;
//  - ogni colpo (+1) è un passo: Annulla lo toglie, Ripeti lo rimette, il messaggio dice dove;
//  - un'azione nuova dopo un Annulla toglie i Ripeti;
//  - le lettere scritte di fila in un campo sono un passo solo;
//  - anche quello che si fa nelle finestre si annulla, a finestra chiusa (non con la finestra aperta);
//  - Ctrl+Z e Ctrl+Y; scrivendo in un campo restano quelli del campo;
//  - progetto eliminato: si rimette anche dopo il banner di 10 secondi, con le sue foto;
//  - progetto nuovo annullato mentre ci si è dentro: si torna alla Home;
//  - archivio litologico e template (dati globali);
//  - quello che si annulla è salvato davvero (localStorage).
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const $ = (app, id) => app.d.getElementById(id);
/** Un tocco vero: pointerdown e poi click (la cronologia conta i tocchi). */
const tocca = (app, el) => {
  if (!el) return;
  el.dispatchEvent(new app.w.Event('pointerdown', { bubbles: true }));
  el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
};
const tasto = (app, key, opz = {}, bersaglio) => (bersaglio || app.d.body).dispatchEvent(new app.w.KeyboardEvent('keydown', Object.assign({ key, bubbles: true, cancelable: true }, opz)));
const passi = (app) => app.E('cronologia().indietro.length');
const avanti = (app) => app.E('cronologia().avanti.length');
// I tasti della testata della prova (sul telefono) e della barra del PC.
const tastoProva = (app, dir) => app.d.querySelector(`#testataProva [data-cronologia="${dir}"]`);
const tastoHome = (app, dir) => app.d.querySelector(`#viewHome [data-cronologia="${dir}"]`);
const toast = (app) => ($(app, 'toastAppTesto') || {}).textContent || '';

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0(), file: process.env.DPSH_FILE });
  if (app.dialogo()) tocca(app, app.dialogo().ok);
  await attesa(50);

  console.log('--- All\'avvio ---');
  t('niente da annullare', passi(app) === 0 && avanti(app) === 0);
  t('Annulla è spento, Ripeti non si vede', tastoHome(app, 'indietro').disabled && tastoHome(app, 'avanti').hidden);
  t('nella barra del PC ci sono tutti e due', !!app.d.querySelector('#pcBarra [data-cronologia="indietro"]') && !!app.d.querySelector('#pcBarra [data-cronologia="avanti"]'));

  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const P = JSON.stringify(pid);
  app.E(`openProject(${P})`);
  await attesa(100);
  t('aprire un progetto e la sua prova non è un passo', passi(app) === 0);
  const altra = app.E(`Object.keys(state.projects[${P}].surveys).find(id => id !== state.currentSurveyId)`);
  app.E(`syncProjectToActiveState(${P}, ${JSON.stringify(altra)}); switchView('field')`);
  await attesa(50);
  t('passare a un\'altra prova nemmeno', passi(app) === 0);

  console.log('--- I colpi ---');
  const colpi0 = app.E('state.currentCount');
  for (let i = 0; i < 3; i++) { tocca(app, $(app, 'btnPlus')); await attesa(20); }
  t('tre colpi, tre passi', app.E('state.currentCount') === colpi0 + 3 && passi(app) === 3);
  t('Annulla si accende', !tastoProva(app, 'indietro').disabled);
  tocca(app, tastoProva(app, 'indietro'));
  await attesa(30);
  t('Annulla toglie un colpo', app.E('state.currentCount') === colpi0 + 2);
  const nr = app.E('state.header.provaNr');
  t('il messaggio dice cosa e dove', toast(app).startsWith(`Annullato: Prova ${nr} · «`));
  t('Ripeti compare', !tastoProva(app, 'avanti').hidden && !tastoProva(app, 'avanti').disabled && avanti(app) === 1);
  t('ed è salvato', JSON.parse(app.salvato()).projects[pid].surveys[altra].currentCount === colpi0 + 2);
  tocca(app, tastoProva(app, 'indietro'));
  await attesa(30);
  tocca(app, tastoProva(app, 'avanti'));
  await attesa(30);
  t('Annulla, Annulla, Ripeti: un colpo in più di prima', app.E('state.currentCount') === colpi0 + 2 && passi(app) === 2 && avanti(app) === 1);
  t('il messaggio di Ripeti', toast(app).startsWith('Ripetuto: Prova'));
  tocca(app, $(app, 'btnPlus'));
  await attesa(20);
  t('un\'azione nuova toglie i Ripeti', avanti(app) === 0 && tastoProva(app, 'avanti').hidden && app.E('state.currentCount') === colpi0 + 3);
  t('nessun passo vuoto rimasto indietro', passi(app) === 3);

  console.log('--- Un intervallo registrato ---');
  const nLog = app.E('state.logs.length');
  tocca(app, $(app, 'btnConfirmStepAction'));
  await attesa(50);
  if (app.dialogo()) { tocca(app, app.dialogo().ok); await attesa(50); }
  const registrato = app.E('state.logs.length') === nLog + 1;
  tocca(app, tastoProva(app, 'indietro'));
  await attesa(30);
  t('registrare e annullare: l\'intervallo sparisce e i colpi tornano nel contatore', registrato && app.E('state.logs.length') === nLog && app.E('state.currentCount') === colpi0 + 3);
  tocca(app, tastoProva(app, 'avanti'));
  await attesa(30);
  t('Ripeti lo registra di nuovo', app.E('state.logs.length') === nLog + 1);

  console.log('--- Scrivere in un campo ---');
  app.E('openCantiereInfoModal()');
  await attesa(50);
  const campo = $(app, 'txtLocalita');
  const prima = campo.value;
  campo.focus();
  const n0 = passi(app);
  for (const c of ['V', 'i', 'a']) {
    campo.value += c;
    campo.dispatchEvent(new app.w.Event('input', { bubbles: true }));
    await attesa(30);
  }
  t('tre lettere di fila, un passo solo', passi(app) === n0 + 1 && app.E('state.header.localita') === prima + 'Via');
  tocca(app, tastoProva(app, 'indietro'));
  await attesa(30);
  t('con la finestra aperta Annulla non fa niente', app.E('state.header.localita') === prima + 'Via' && passi(app) === n0 + 1);
  tasto(app, 'z', { ctrlKey: true }, campo);
  t('Ctrl+Z nel campo resta del campo', passi(app) === n0 + 1);
  app.E('closeSurveySettingsModal()');
  campo.blur();
  await attesa(30);
  tasto(app, 'z', { ctrlKey: true });
  await attesa(30);
  t('chiusa la finestra, Ctrl+Z toglie la parola intera', app.E('state.header.localita') === prima && app.E(`state.projects[${P}].surveys[${JSON.stringify(altra)}].header.localita`) === prima);
  tasto(app, 'y', { ctrlKey: true });
  await attesa(30);
  t('Ctrl+Y la rimette', app.E('state.header.localita') === prima + 'Via');
  tasto(app, 'z', { ctrlKey: true, shiftKey: true });
  t('Ctrl+Maiusc+Z non ha niente da ripetere', app.E('state.header.localita') === prima + 'Via');

  console.log('--- Dati globali: archivio litologico ---');
  const nArch = app.E('Object.keys(state.lithologyArchive).length');
  app.E("state.lithologyArchive.arch_prova_cronologia = { id: 'arch_prova_cronologia', name: 'SABBIA DI PROVA', color: '#fff' }; saveState()");
  await attesa(10);
  tocca(app, tastoProva(app, 'indietro'));
  await attesa(30);
  t('una voce aggiunta all\'archivio si annulla', app.E('Object.keys(state.lithologyArchive).length') === nArch && !app.E('state.lithologyArchive.arch_prova_cronologia'));
  t('e il messaggio lo dice', toast(app) === 'Annullato: archivio litologico');

  console.log('--- Progetto eliminato ---');
  const fotoIds = app.E(`Object.values(state.projects[${P}].surveys).flatMap(s => (s.photos || []).map(p => p.id))`);
  app.E('switchView("home")');
  await attesa(30);
  app.E(`performDeleteProject(${P}, null)`);
  await attesa(50);
  t('eliminato, c\'è il banner di 10 secondi', !app.E(`state.projects[${P}]`) && $(app, 'undoNotificationBanner').style.display === 'flex');
  // Le foto le terrebbe anche la copia automatica fatta prima di eliminare: qui si vuole vedere
  // che bastano i passi della cronologia.
  app.E('copieAutomatiche.idFoto.clear()');
  await attesa(11600); // il banner scade e passa la pulizia delle foto (11 s)
  t('il banner è sparito', $(app, 'undoNotificationBanner').style.display === 'none');
  const fotoRimaste = [];
  for (const id of fotoIds) fotoRimaste.push(await app.E(`getPhotoFromIDB(${JSON.stringify(id)})`));
  t('le foto che Annulla può rimettere restano nel database', fotoIds.length > 0 && fotoRimaste.every(Boolean));
  tocca(app, tastoHome(app, 'indietro'));
  await attesa(50);
  t('Annulla rimette il progetto', !!app.E(`state.projects[${P}]`) && toast(app).startsWith('Annullato: progetto «'));
  t('con le sue prove e le sue foto', app.E(`Object.values(state.projects[${P}].surveys).flatMap(s => (s.photos || []).map(p => p.id)).length`) === fotoIds.length);
  t('la Home lo mostra', $(app, 'homeProjectsContainer').textContent.includes(app.E(`state.projects[${P}].name`)));
  t('ed è salvato', !!JSON.parse(app.salvato()).projects[pid]);

  console.log('--- Progetto nuovo, annullato da dentro ---');
  const nProg = app.E('Object.keys(state.projects).length');
  app.E("const id = 'PROJ_cronologia'; state.projects[id] = { id, name: 'Nuovo di prova', comune: '', surveys: {} }; saveState(); openProject(id)");
  await attesa(100);
  const dentro = app.E("state.uiState.currentView") === 'field' && app.E('state.currentProjectId') === 'PROJ_cronologia';
  // creare il progetto e aprirlo (che ci mette la prima prova) sono due passi
  tocca(app, tastoProva(app, 'indietro'));
  await attesa(30);
  tocca(app, tastoProva(app, 'indietro'));
  await attesa(50);
  t('si torna alla Home e il progetto non c\'è più', dentro && !app.E("state.projects.PROJ_cronologia") && app.E('state.uiState.currentView') === 'home' && app.E('Object.keys(state.projects).length') === nProg);
  t('e nessun progetto fantasma al salvataggio', !JSON.parse(app.salvato()).projects.PROJ_cronologia && Object.keys(JSON.parse(app.salvato()).projects).length === nProg);
  tocca(app, tastoHome(app, 'avanti'));
  await attesa(30);
  tocca(app, tastoHome(app, 'avanti'));
  await attesa(30);
  t('Ripeti lo rimette, con la sua prova', app.E("Object.keys(state.projects.PROJ_cronologia.surveys).length") === 1);

  console.log('--- Cambiare tema non è un passo ---');
  const n1 = passi(app);
  app.E('state.settings.darkMode = !state.settings.darkMode; saveState()');
  t('nessun passo nuovo', passi(app) === n1);

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log(app.errori.join('\n'));
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
