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
  // Sulla Home i progetti sono già al centro: la barra ha i filtri per stato e gli strumenti.
  t('Home: percorso «Progetti», niente Consegna, nella barra nessun progetto ma i filtri',
    percorso(app).join('/') === 'Progetti' && $(app, 'pcBtnConsegna').style.display === 'none'
    && !$(app, 'pcLato').querySelector('[data-progetto]') && $(app, 'pcLato').querySelectorAll('[data-filtro]').length === 4);
  t('«Tutti» è scelto e conta tutti i progetti', $(app, 'pcLato').querySelector('[data-filtro="tutti"]').getAttribute('aria-current') === 'true'
    && $(app, 'pcLato').querySelector('[data-filtro="tutti"] .pc-filtro-n').textContent === String(nProgetti));
  app.E("Object.values(state.projects)[0].stato = 'consegnato'; renderHomeProjects()");
  clic(app, $(app, 'pcLato').querySelector('[data-filtro="consegnato"]'));
  t('un filtro della barra filtra la tabella', $(app, 'homeProjectsContainer').querySelectorAll('.card-progetto').length === 1
    && $(app, 'pcLato').querySelector('[data-filtro="consegnato"]').getAttribute('aria-current') === 'true');
  clic(app, $(app, 'pcLato').querySelector('[data-filtro="tutti"]'));
  app.E("delete Object.values(state.projects)[0].stato; renderHomeProjects()");
  clic(app, $(app, 'pcLato').querySelector('[data-strumento="btnOpenArchiveManagerHome"]'));
  t('«Archivio litologico» nella barra apre l\'archivio', !!app.d.querySelector('.modal.open'));
  app.E('closeAnyOpenModal()');

  const idProg = app.E('Object.keys(state.projects)[0]');
  clic(app, $(app, 'homeProjectsContainer').querySelector(`.card-progetto-apri[data-id="${idProg}"]`));
  await attesa(30);
  const nome = app.E(`state.projects[${JSON.stringify(idProg)}].name`);
  t('clic sul progetto: schermata Progetto, percorso; nella barra i progetti, le prove no (sono nella tabella)',
    app.E('state.uiState.currentView') === 'project' && percorso(app)[1] === nome
    && $(app, 'pcLato').querySelectorAll('[data-progetto]').length === nProgetti && !$(app, 'pcLato').querySelector('[data-prova]'));
  t('il progetto aperto è segnato', $(app, 'pcLato').querySelector('[aria-current]').dataset.progetto === idProg);

  const righeTabella = $(app, 'listaProveProgetto').querySelectorAll('[data-surv]');
  const ultimaId = righeTabella[righeTabella.length - 1].dataset.surv;
  clic(app, righeTabella[righeTabella.length - 1]);
  await attesa(30);
  const prove = $(app, 'pcLato').querySelectorAll('[data-prova]');
  t('clic sulla prova: la apre, il percorso arriva alla prova e la barra mostra le prove del progetto',
    app.E('state.uiState.currentView') === 'field' && app.E('state.currentSurveyId') === ultimaId && percorso(app).length === 3 && /^Prova /.test(percorso(app)[2])
    && prove.length === app.E(`Object.keys(state.projects[${JSON.stringify(idProg)}].surveys).length`));
  t('la prova aperta è segnata', $(app, 'pcLato').querySelector('[aria-current]').dataset.prova === ultimaId);
  await attesa(450);
  const guida = $(app, 'guidaRapida');
  t('la prima volta in una prova sul PC parte la guida rapida, passo 1 di 3', !guida.hidden && $(app, 'guidaPasso').textContent === '1 di 3');
  clic(app, $(app, 'guidaAvanti')); clic(app, $(app, 'guidaAvanti'));
  t('al terzo passo il bottone dice «Fine»', $(app, 'guidaAvanti').textContent === 'Fine');
  clic(app, $(app, 'guidaAvanti'));
  t('«Fine» la chiude e non torna più', guida.hidden && app.E('state.settings.guidaPcVista') === true);
  app.E("switchView('project')"); app.E("switchView('field')");
  await attesa(450);
  t('(riaprendo una prova non riparte)', guida.hidden);
  app.E('apriScorciatoie()');
  clic(app, $(app, 'btnRivediGuida'));
  t('si rivede dalla guida delle scorciatoie, ed Esc la chiude', !guida.hidden && !$(app, 'modalScorciatoie').classList.contains('open'));
  app.d.body.dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  t('(chiusa)', guida.hidden);
  t('barra di stato: aiuto e versione', /doppio clic/.test($(app, 'pcStatoAiuto').textContent) && /DPSH \d/.test($(app, 'pcStatoVersione').textContent));

  clic(app, $(app, 'pcPercorso').querySelector('[data-vista="project"]'));
  t('il percorso riporta al progetto', app.E('state.uiState.currentView') === 'project');
  clic(app, $(app, 'pcBtnConsegna'));
  await attesa(30);
  t('Consegna apre la finestra del progetto', $(app, 'modalExportFormats').classList.contains('open'));
  app.E('closeAnyOpenModal()');
  clic(app, $(app, 'pcPercorso').querySelector('[data-vista="home"]'));
  t('e «Progetti» riporta alla Home', app.E('state.uiState.currentView') === 'home');

  const destro = (el) => el.dispatchEvent(new app.w.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 200, clientY: 150 }));
  const voci = () => [...$(app, 'menuRiga').querySelectorAll('[data-voce]')].map(b => b.textContent);
  destro($(app, 'homeProjectsContainer').querySelector('[data-id]'));
  t('tasto destro su un progetto della Home: le sue azioni', $(app, 'menuRiga').classList.contains('open') && voci().join('|') === 'Apri|Dati del progetto|Note|Strati|Terreno e sezioni|Consegna|In corso|Da elaborare|Consegnato|Copia, backup, elimina…');
  clic(app, $(app, 'menuRiga').querySelector('[data-voce="0"]'));
  t('«Apri» apre il progetto', app.E('state.uiState.currentView') === 'project' && !$(app, 'menuRiga').classList.contains('open'));
  destro($(app, 'listaProveProgetto').querySelector('[data-surv]'));
  t('tasto destro su una prova: Apri, Dati, Strumento, GPS, Foto, Falda, Mappa', voci().join('|') === 'Apri|Dati della prova|Strumento|Posizione GPS|Foto|Falda|Mostra sulla mappa');
  clic(app, $(app, 'menuRiga').querySelector('[data-voce="1"]'));
  t('«Dati della prova» apre la sua scheda', !!app.d.querySelector('#modalSurveySettings.open'));
  app.E('closeAnyOpenModal()');
  clic(app, $(app, 'pcBtnImpostazioni'));
  t('Impostazioni apre il cassetto', $(app, 'drawerMenu').classList.contains('open'));

  console.log('--- Le voci della barra: spie e tasto destro ---');
  app.E('closeDrawer()');
  await attesa(80); // chiudere il cassetto torna indietro nella cronologia
  app.E(`apriDalLato(${JSON.stringify(idProg)}); switchView('field')`);
  await attesa(30);
  const vocePrima = $(app, 'pcLato').querySelector('[data-prova]'), datiPrima = app.E(`(() => { const s = state.projects[${JSON.stringify(idProg)}].surveys[${JSON.stringify(vocePrima.dataset.prova)}]; return { foto: (s.photos || []).length, strati: s.logs.filter(l => l.lithology).length }; })()`);
  t('sotto ogni prova le spie: GPS, foto, strati, falda', ['#i-pin', '#i-camera', '#i-stack', '#i-droplet'].every(i => vocePrima.querySelector(`.pc-voce-info use[href="${i}"]`))
    && vocePrima.querySelector('.pc-voce-info use[href="#i-camera"]').closest('.pc-spia').textContent === String(datiPrima.foto)
    && vocePrima.querySelector('.pc-voce-info use[href="#i-stack"]').closest('.pc-spia').textContent === String(datiPrima.strati));
  t('e la profondità raggiunta', / m$/.test(vocePrima.querySelector('.pc-voce-prof').textContent));
  t('e la miniatura del profilo: una barra per intervallo', vocePrima.querySelectorAll('.pc-profilo rect').length === app.E(`state.projects[${JSON.stringify(idProg)}].surveys[${JSON.stringify(vocePrima.dataset.prova)}].logs.length`));
  app.E(`state.projects[${JSON.stringify(idProg)}].stato = 'consegnato'; renderPc()`);
  t('sotto il progetto: stato e numero di prove', /^Consegnato · \d+ prov[ae]/.test($(app, 'pcLato').querySelector(`[data-progetto="${idProg}"] .pc-voce-info`).textContent.trim()));
  $(app, 'pcLato').querySelector(`[data-progetto="${idProg}"]`).dispatchEvent(new app.w.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  const vociProgetto = [...$(app, 'menuRiga').querySelectorAll('[role="menuitem"]')].map(b => b.textContent.trim());
  t('tasto destro sul progetto: dati, note, strati e stato', ['Dati del progetto', 'Note', 'Strati', 'In corso', 'Consegnato'].every(v => vociProgetto.includes(v)));
  [...$(app, 'menuRiga').querySelectorAll('[role="menuitem"]')].find(b => b.textContent.trim() === 'Consegnato').click();
  t('lo stato scelto di nuovo si toglie', app.E(`state.projects[${JSON.stringify(idProg)}].stato`) === undefined);
  $(app, 'btnProgettoDati').dispatchEvent(new app.w.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  t('tasto destro anche sul nome del progetto', $(app, 'menuRiga').classList.contains('open') && $(app, 'menuRiga').querySelector('.menu-contesto-titolo').textContent === nome);
  app.E('chiudiMenuRiga()');

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
