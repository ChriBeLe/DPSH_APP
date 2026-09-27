// LA HOME (Fase 3, punti 5–8 e decisione H).
//
//  - testata «Progetti» con «N progetti · N prove»; Impostazioni, e i template di report e
//    l'archivio litologico ancora a un tocco;
//  - niente card dentro una card; «Nuovo progetto» (principale) e «Ricevi»;
//  - promemoria del backup in una riga compatta con «Fai backup»;
//  - ricerca e filtri a pillola SENZA conteggi;
//  - card del progetto tutta toccabile: apre l'ULTIMA PROVA USATA, anche dopo aver chiuso l'app;
//    il ⋯ a destra ha le azioni di progetto, note comprese;
//  - dentro la card: stato, «Comune · Committente: X», «N prove · n/N GPS · N foto»,
//    «Modificato il gg/mm/aaaa · riprende dalla Prova N»;
//  - stato vuoto con un solo «Nuovo progetto» e un solo «Ricevi»;
//  - template: niente «in uso su questa prova» dalla Home, niente «non modificabile»;
//  - via i «Chiudi» doppi (Esporta, Foto, Template) e i doppioni del cassetto;
//  - la striscia «Salvataggio sospeso» spinge giù il contenuto;
//  - misure: niente testo sotto i 12 px, comandi da 44 px.
// Controprove sull'app di prima.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');
const { testiConCarattere, misureComando, nascosto } = require('./dati/misure_stile');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const chiudiAvvisi = async app => { for (let i = 0; i < 3 && app.dialogo(); i++) { clic(app, app.dialogo().ok); await attesa(30); } };

(async () => {
  console.log('--- Testata e comandi ---');
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  await chiudiAvvisi(app);
  app.E("switchView('home')");
  await attesa(50);
  const home = $(app, 'viewHome');
  const progetti = app.E('Object.values(state.projects)');
  t('titolo «Progetti»', home.querySelector('h1').textContent === 'Progetti');
  t('sotto: «2 progetti · 5 prove» (la 3B non conta come prova in più)', $(app, 'lblHomeConteggi').textContent === '2 progetti · 5 prove' && progetti.length === 2);
  t('la testata della prova in Home non c\'è', nascosto(app.w, $(app, 'testataProva')));
  t('Impostazioni a un tocco', (clic(app, $(app, 'btnImpostazioniHome')), $(app, 'drawerMenu').classList.contains('open')));
  app.E('closeDrawer()');
  t('template di report e archivio litologico a un tocco dalla Home', home.contains($(app, 'btnOpenReportTemplatesHome')) && home.contains($(app, 'btnOpenArchiveManagerHome'))
    && $(app, 'btnOpenReportTemplatesHome').getAttribute('aria-label') === 'Template di report');
  t('«Nuovo progetto» principale e «Ricevi»', $(app, 'btnHomeNewProject').classList.contains('bt-principale') && $(app, 'btnHomeNewProject').textContent.trim() === 'Nuovo progetto' && $(app, 'btnHomeImportProject').textContent.trim() === 'Ricevi');
  t('nessuna card dentro una card', !$(app, 'homeProjectsContainer').closest('.card') && !home.querySelector('.card .card-progetto'));

  console.log('--- Promemoria, ricerca e filtri ---');
  const promemoria = $(app, 'homePromemoriaBackup');
  t('promemoria del backup: una riga gialla con «Fai backup»', !nascosto(app.w, promemoria) && promemoria.classList.contains('riga-avviso') && $(app, 'btnPromemoriaBackupFai').textContent === 'Fai backup' && /Nessun backup completo/.test(promemoria.textContent));
  clic(app, $(app, 'btnPromemoriaBackupDopo'));
  t('la X lo nasconde fino alla prossima apertura', nascosto(app.w, promemoria));
  const pillole = [...$(app, 'filtroStatoProgetti').querySelectorAll('.pillola')];
  t('filtri: Tutti, In corso, Da elaborare, Consegnati — senza conteggi', JSON.stringify(pillole.map(p => p.textContent.trim())) === JSON.stringify(['Tutti', 'In corso', 'Da elaborare', 'Consegnati']));
  t('«Tutti» è quello scelto', pillole[0].getAttribute('aria-pressed') === 'true');

  console.log('--- La card del progetto ---');
  const cards = [...home.querySelectorAll('.card-progetto')];
  t('una card per progetto', cards.length === 2);
  const pid = cards[0].querySelector('.card-progetto-apri').dataset.id;
  const proj = app.E('state.projects[' + JSON.stringify(pid) + ']');
  const card = cards[0];
  t('nome in grassetto', card.querySelector('.card-progetto-nome').textContent === proj.name);
  t('«Comune · Committente: X», con l\'etichetta', card.querySelector('.card-progetto-luogo').textContent === `${proj.comune} · Committente: ${proj.committente}`);
  t('«N prove · n/N GPS · N foto»', /^\d+ prov[ae] · \d+\/\d+ GPS · \d+ foto$/.test(card.querySelector('.card-progetto-numeri').textContent));
  t('«Modificato il gg/mm/aaaa · riprende dalla Prova N»', /^Modificato il \d\d\/\d\d\/\d{4} · riprende dalla Prova \w+$/.test(card.querySelector('.card-progetto-data').textContent));
  t('a destra il ⋯', !!card.querySelector('.card-progetto-altro.btn-project-actions') && card.querySelector('.card-progetto-altro').getAttribute('aria-label') === 'Azioni sul progetto');
  t('niente più bottone delle note con l\'icona dei template (i-file) sulla card', !card.querySelector('.btn-project-notes') && !card.innerHTML.includes('#i-file'));
  clic(app, card.querySelector('.btn-project-actions'));
  t('le note sono nel ⋯ del progetto, con l\'icona i-note', $(app, 'modalProjectActions').classList.contains('open') && $(app, 'btnProjActNote').innerHTML.includes('#i-note'));
  app.E('closeProjectActionsModal()');

  console.log('--- Decisione H: la card apre l\'ultima prova usata ---');
  const prove = app.E(`Object.keys(state.projects[${JSON.stringify(pid)}].surveys)`);
  t('(il progetto ha più prove)', prove.length >= 2);
  clic(app, card.querySelector('.card-progetto-apri'));
  await attesa(50);
  t('toccando la card si apre il progetto', app.E('state.currentProjectId') === pid && app.E("state.uiState.currentView") === 'field');
  const ultima = prove[prove.length - 1];
  app.E(`saveState(); syncProjectToActiveState(${JSON.stringify(pid)}, ${JSON.stringify(ultima)}); updateUI(); saveState();`);
  const nrUltima = app.E(`state.projects[${JSON.stringify(pid)}].surveys[${JSON.stringify(ultima)}].header.provaNr`);
  clic(app, $(app, 'btnHomeView'));
  await attesa(50);
  const cardDopo = [...$(app, 'viewHome').querySelectorAll('.card-progetto-apri')].find(b => b.dataset.id === pid);
  t('la card dice «riprende dalla Prova ' + nrUltima + '»', cardDopo.closest('.card-progetto').querySelector('.card-progetto-data').textContent.endsWith('riprende dalla Prova ' + nrUltima));
  // Un altro progetto nel frattempo, per essere sicuri che non valga «l'ultima dell'app».
  const altro = app.E(`Object.keys(state.projects).find(id => id !== ${JSON.stringify(pid)})`);
  app.E(`openProject(${JSON.stringify(altro)})`);
  await attesa(30);
  clic(app, $(app, 'btnHomeView'));
  await attesa(30);
  clic(app, [...$(app, 'viewHome').querySelectorAll('.card-progetto-apri')].find(b => b.dataset.id === pid));
  await attesa(50);
  t('toccandola si riprende proprio da quella prova', app.E('state.currentSurveyId') === ultima);
  const salvato = app.salvato();
  app.chiudi();
  const riaperta = await avviaApp({ stato: salvato, idb: telefonoV0() });
  await chiudiAvvisi(riaperta);
  riaperta.E("switchView('home')");
  clic(riaperta, [...$(riaperta, 'viewHome').querySelectorAll('.card-progetto-apri')].find(b => b.dataset.id === pid));
  await attesa(50);
  t('anche dopo aver chiuso e riaperto l\'app', riaperta.E('state.currentSurveyId') === ultima);

  console.log('--- Template, finestre e cassetto ---');
  riaperta.E("switchView('home')");
  clic(riaperta, $(riaperta, 'btnOpenReportTemplatesHome'));
  await attesa(50);
  const tpl = $(riaperta, 'modalReportTemplates');
  t('dalla Home i template non dicono «in uso su questa prova»', tpl.classList.contains('open') && !/in uso su questa prova/.test(tpl.textContent));
  t('né «non modificabile» accanto al tasto che modifica', !/non modificabile/.test(tpl.textContent) && /si può modificare/.test(tpl.textContent));
  riaperta.E('closeReportTemplatesModal()');
  riaperta.E(`openProject(${JSON.stringify(pid)})`);
  await attesa(30);
  riaperta.E('openReportTemplatesModal()');
  await attesa(30);
  t('da una prova aperta sì, dice quale usa', /in uso su questa prova/.test(tpl.textContent));
  riaperta.E('closeReportTemplatesModal()');
  for (const [finestra, x] of [['modalExportFormats', 'btnCloseExportX'], ['modalSurveyPhotos', 'btnClosePhotosModalX'], ['modalReportTemplates', 'btnCloseReportTemplatesX']]) {
    const m = $(riaperta, finestra);
    const chiudi = [...m.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Chiudi');
    t(`${finestra}: solo la X, niente «Chiudi» in fondo`, chiudi.length === 0 && !!$(riaperta, x) && misureComando(riaperta.w, $(riaperta, x)).altezza === 44);
  }
  const cassetto = $(riaperta, 'drawerMenu').textContent;
  t('nel cassetto niente «Registro Grafico Integrato» né «Modalità Espansa»', !/Registro Grafico Integrato/i.test(cassetto) && !/Modalità Espansa/i.test(cassetto) && !$(riaperta, 'chkIntegratedChart') && !$(riaperta, 'chkExpandedMode'));
  riaperta.chiudi();

  console.log('--- Stato vuoto ---');
  const vuota = await avviaApp({ stato: null });
  vuota.E("switchView('home')");
  await attesa(30);
  const conta = re => [...$(vuota, 'viewHome').querySelectorAll('button')].filter(b => !nascosto(vuota.w, b) && re.test(b.textContent.trim())).length;
  t('un solo «Nuovo progetto» e un solo «Ricevi»', conta(/^Nuovo progetto$/i) === 1 && conta(/^Ricevi$/) === 1);
  t('e il testo che spiega cosa fare', /Nessun progetto/.test($(vuota, 'homeProjectsContainer').textContent));
  t('«0 progetti · 0 prove»', $(vuota, 'lblHomeConteggi').textContent === '0 progetti · 0 prove');
  vuota.chiudi();

  console.log('--- Misure della Home ---');
  const m = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  await chiudiAvvisi(m);
  m.E("switchView('home')");
  await attesa(30);
  const piccoli = testiConCarattere(m.w, [$(m, 'viewHome')]).filter(x => x.px < 12);
  t('niente testo sotto i 12 px', piccoli.length === 0);
  if (piccoli.length) console.log('       ', piccoli.slice(0, 6).map(x => x.px + ' «' + x.testo + '»').join(' | '));
  const comandi = [...$(m, 'viewHome').querySelectorAll('button, input[type=search]')].filter(b => !nascosto(m.w, b));
  const bassi = comandi.map(b => ({ b, m: misureComando(m.w, b) })).filter(x => !(x.m.altezza >= 44));
  t('ogni comando è alto almeno 44 px (' + comandi.length + ')', bassi.length === 0 && comandi.length >= 10);
  if (bassi.length) console.log('       ', bassi.slice(0, 8).map(x => (x.b.id || x.b.className) + ' ' + JSON.stringify(x.m)).join(' | '));
  t('«Nuovo progetto» alto 48, il ⋯ della card largo 48', misureComando(m.w, $(m, 'btnHomeNewProject')).altezza === 48 && misureComando(m.w, $(m, 'viewHome').querySelector('.card-progetto-altro')).larghezza === 48);
  t('l\'app non ha dato errori', m.errori.length === 0);
  m.chiudi();

  console.log('--- La striscia «Salvataggio sospeso» spinge giù il contenuto ---');
  const rotta = await avviaApp({ stato: '{ questo non è JSON' });
  await chiudiAvvisi(rotta);
  const barra = $(rotta, 'barraSalvataggioSospeso');
  t('c\'è, in testa alla pagina e non sopra', !!barra && rotta.d.body.firstElementChild === barra && barra.style.position === 'sticky');
  t('e il suo bottone è da 44', /min-height:\s*44px/.test($(rotta, 'btnBarraSalvataggioSospeso').getAttribute('style')));
  rotta.chiudi();

  console.log('--- Controprove: l\'app di prima ---');
  const v = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0, idb: telefonoV0() });
  await chiudiAvvisi(v);
  v.E("switchView('home')");
  await attesa(30);
  const idVecchio = v.d.querySelector('.btn-open-project').dataset.id;
  const primaVecchia = v.E(`Object.keys(state.projects[${JSON.stringify(idVecchio)}].surveys)`);
  v.E(`saveState(); syncProjectToActiveState(${JSON.stringify(idVecchio)}, ${JSON.stringify(primaVecchia[primaVecchia.length - 1])}); saveState(); switchView('home')`);
  clic(v, v.d.querySelector(`.btn-open-project[data-id="${idVecchio}"]`));
  await attesa(30);
  t('(controprova) «Apri» riportava alla prima prova, non all\'ultima usata', v.E('state.currentSurveyId') === primaVecchia[0]);
  v.E("switchView('home')");
  await attesa(30);
  t('(controprova) le card stavano dentro una card', !!v.d.getElementById('homeProjectsContainer').closest('.card'));
  t('(controprova) i filtri avevano i conteggi', /\d/.test(v.d.getElementById('filtroStatoProgetti').textContent));
  t('(controprova) e la finestra dei template diceva «non modificabile»', /non modificabile/.test(v.d.getElementById('modalReportTemplates').textContent));
  v.chiudi();

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})();
