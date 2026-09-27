// PALETTE DEI COMANDI E GUIDA DELLE SCORCIATOIE (prototipo PC, passo 4), da 1024 px:
//  - Ctrl K apre la palette: comandi di adesso, progetti e prove; si filtra scrivendo (senza
//    badare agli accenti), ↑ ↓ scelgono, Invio esegue; nessun risultato dice cosa fare;
//  - ? apre la guida con tutti i tasti; Ctrl I aggiunge intervalli, Ctrl E consegna, F falda;
//  - sul telefono i tasti non fanno niente.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const pc = (app) => { app.w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }); };
const tasto = (app, key, x, el) => (el || app.d.body).dispatchEvent(new app.w.KeyboardEvent('keydown', Object.assign({ key, bubbles: true, cancelable: true }, x)));
const aperta = (app, id) => $(app, id).classList.contains('open');
const voci = (app) => [...$(app, 'listaPalette').querySelectorAll('[data-i]')].map(b => b.querySelector('span').textContent);

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  app.E("switchView('home')");
  tasto(app, 'k', { ctrlKey: true });
  t('sul telefono Ctrl K non fa niente', !aperta(app, 'modalPalette'));

  pc(app);
  tasto(app, 'k', { ctrlKey: true });
  t('Ctrl K apre la palette', aperta(app, 'modalPalette'));
  t('in Home: comandi di ovunque e i progetti, niente comandi della prova',
    voci(app).includes('Nuovo progetto') && voci(app).includes('Nardò - Scuola Via Roma') && !voci(app).includes('Aggiungi intervalli'));
  const campo = $(app, 'txtPalette');
  campo.value = 'nardo';
  campo.dispatchEvent(new app.w.Event('input'));
  t('si filtra senza badare agli accenti', voci(app).length === 1 && voci(app)[0] === 'Nardò - Scuola Via Roma');
  tasto(app, 'Enter', {}, campo);
  await attesa(30);
  t('Invio apre il progetto e chiude la palette', app.E('state.uiState.currentView') === 'project' && !aperta(app, 'modalPalette'));

  tasto(app, 'k', { ctrlKey: true });
  campo.value = 'prova 2';
  campo.dispatchEvent(new app.w.Event('input'));
  const idProva2 = app.E(`Object.values(state.projects[state.currentProjectId].surveys).find(s => s.header.provaNr == '2').id`);
  tasto(app, 'Enter', {}, campo);
  await attesa(30);
  t('dalla palette si apre una prova del progetto', app.E('state.uiState.currentView') === 'field' && app.E('state.currentSurveyId') === idProva2);

  tasto(app, 'k', { ctrlKey: true });
  campo.value = '';
  campo.dispatchEvent(new app.w.Event('input'));
  t('in una prova ci sono anche i suoi comandi', voci(app).includes('Aggiungi intervalli') && voci(app).includes('Falda'));
  tasto(app, 'ArrowDown', {}, campo);
  t('↓ sceglie la voce dopo', $(app, 'listaPalette').querySelector('[aria-selected]').dataset.i === '1');
  campo.value = 'zzzz';
  campo.dispatchEvent(new app.w.Event('input'));
  t('nessun risultato: dice cosa fare', /guida col tasto \?/.test($(app, 'listaPalette').textContent));
  tasto(app, 'k', { ctrlKey: true });
  t('Ctrl K di nuovo la chiude', !aperta(app, 'modalPalette'));

  tasto(app, '?');
  const guida = $(app, 'gruppiScorciatoie').textContent;
  t('? apre la guida, coi tasti di Registro e prova', aperta(app, 'modalScorciatoie') && /Canc/.test(guida) && /Ctrl I/.test(guida) && /Ctrl K/.test(guida));
  app.E('closeAnyOpenModal()');
  tasto(app, 'i', { ctrlKey: true });
  t('Ctrl I apre Aggiungi intervalli', aperta(app, 'modalBulkImport'));
  app.E('closeAnyOpenModal()');
  tasto(app, 'f');
  await attesa(30);
  t('F apre la falda', !!app.d.querySelector('.modal.open'));
  app.E('closeAnyOpenModal()');
  tasto(app, 'e', { ctrlKey: true });
  await attesa(30);
  t('Ctrl E apre la Consegna', aperta(app, 'modalExportFormats'));
  app.E('closeAnyOpenModal()');
  $(app, 'txtCercaProgetti').focus();
  tasto(app, '?', {}, $(app, 'txtCercaProgetti'));
  t('mentre si scrive in un campo, ? resta un carattere', !aperta(app, 'modalScorciatoie'));

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
