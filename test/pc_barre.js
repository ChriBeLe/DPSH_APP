// LE BARRE DEL PC (prototipo PC, passo 1), da 1024 px:
//  - in alto il percorso Progetti / Progetto / Prova, con Consegna e Impostazioni;
//  - a sinistra i progetti e, sotto quello aperto, le sue prove;
//  - in basso l'aiuto del momento e la versione;
//  - sul telefono restano vuote (e il CSS le nasconde).
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const pc = (app) => { app.w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }); };
const percorso = (app) => [...$(app, 'pcPercorso').querySelectorAll('li')].map(li => li.textContent.trim());

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  app.E("switchView('home')");
  t('sul telefono le barre restano vuote', $(app, 'pcLato').innerHTML === '' && $(app, 'pcPercorso').innerHTML === '');

  pc(app);
  app.E("switchView('home')");
  const nProgetti = app.E('Object.keys(state.projects).length');
  t('Home: percorso «Progetti», un bottone per progetto, niente Consegna',
    percorso(app).join('/') === 'Progetti' && $(app, 'pcLato').querySelectorAll('[data-progetto]').length === nProgetti && $(app, 'pcBtnConsegna').style.display === 'none');

  const idProg = app.E('Object.keys(state.projects)[0]');
  clic(app, $(app, 'pcLato').querySelector(`[data-progetto="${idProg}"]`));
  await attesa(30);
  const nome = app.E(`state.projects[${JSON.stringify(idProg)}].name`);
  const prove = $(app, 'pcLato').querySelectorAll('[data-prova]');
  t('clic sul progetto: schermata Progetto, percorso e prove nella barra',
    app.E('state.uiState.currentView') === 'project' && percorso(app)[1] === nome && prove.length === app.E(`Object.keys(state.projects[${JSON.stringify(idProg)}].surveys).length`) && prove.length > 0);
  t('il progetto aperto è segnato', $(app, 'pcLato').querySelector('[aria-current]').dataset.progetto === idProg);

  const ultima = prove[prove.length - 1];
  clic(app, ultima);
  await attesa(30);
  t('clic sulla prova: la apre e il percorso arriva alla prova',
    app.E('state.uiState.currentView') === 'field' && app.E('state.currentSurveyId') === ultima.dataset.prova && percorso(app).length === 3 && /^Prova /.test(percorso(app)[2]));
  t('la prova aperta è segnata', $(app, 'pcLato').querySelector('[aria-current]').dataset.prova === ultima.dataset.prova);
  t('barra di stato: aiuto e versione', /doppio clic/.test($(app, 'pcStatoAiuto').textContent) && /^DPSH \d/.test($(app, 'pcStatoVersione').textContent));

  clic(app, $(app, 'pcPercorso').querySelector('[data-vista="project"]'));
  t('il percorso riporta al progetto', app.E('state.uiState.currentView') === 'project');
  clic(app, $(app, 'pcBtnConsegna'));
  await attesa(30);
  t('Consegna apre la finestra del progetto', $(app, 'modalExportFormats').classList.contains('open'));
  app.E('closeAnyOpenModal()');
  clic(app, $(app, 'pcPercorso').querySelector('[data-vista="home"]'));
  t('e «Progetti» riporta alla Home', app.E('state.uiState.currentView') === 'home');

  clic(app, $(app, 'pcBtnImpostazioni'));
  t('Impostazioni apre il cassetto', $(app, 'drawerMenu').classList.contains('open'));

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
