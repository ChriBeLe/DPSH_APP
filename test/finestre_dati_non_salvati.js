// ESC, SFONDO E TASTO INDIETRO CON I DATI NON SALVATI (Fase C, F-21 e F-14).
// Prima: ESC e il clic sullo sfondo chiudevano TUTTE le finestre insieme anche con campi modificati,
// e Indietro (Android) cambiava schermata con una finestra aperta. Ora: si chiude solo la finestra
// più in alto; con campi modificati e non salvati si chiede conferma; Indietro chiude la finestra
// e non cambia schermata.
const { avviaApp } = require('./dati/app_in_jsdom');
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO = JSON.stringify({ projects: {} });

(async () => {
  const app = await avviaApp({ stato: STATO });
  const { w, d, attesa } = app;
  const $ = id => d.getElementById(id);
  const aperta = id => $(id).classList.contains('open');
  const esc = () => d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const apri = id => { $(id).classList.add('open'); const ov = $(id).previousElementSibling; if (ov) ov.classList.add('open'); };
  const clic = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const scrivi = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const campo = id => $(id).querySelector('input[type="text"], input[type="number"], input:not([type]), textarea');

  console.log('--- Esc con un campo modificato ---');
  apri('modalEditStep'); await attesa(20);
  esc(); await attesa(20);
  t('senza modifiche Esc chiude', !aperta('modalEditStep'));
  apri('modalEditStep'); await attesa(20);
  scrivi(campo('modalEditStep'), '12345');
  esc(); await attesa(300);
  t('con un campo modificato la finestra resta aperta', aperta('modalEditStep'));
  let dl = app.dialogo();
  t('e chiede conferma col dialogo dell\'app', !!dl && /dati non salvati/.test(dl.testo) && dl.ok.textContent === 'Chiudi senza salvare' && dl.annulla.textContent === 'Torna alla finestra');
  clic(dl.annulla); await attesa(300);
  t('«Torna alla finestra»: resta aperta', aperta('modalEditStep') && !app.dialogo());
  esc(); await attesa(300);
  clic(app.dialogo().ok); await attesa(300);
  t('«Chiudi senza salvare»: si chiude', !aperta('modalEditStep') && !aperta('modalOverlay'));

  console.log('--- Clic sullo sfondo con un campo modificato ---');
  apri('modalEditStep'); await attesa(20);
  scrivi(campo('modalEditStep'), '777');
  clic($('modalOverlay')); await attesa(300);
  t('lo sfondo non chiude e chiede conferma', aperta('modalEditStep') && !!app.dialogo());
  clic(app.dialogo().annulla); await attesa(300);
  clic($('modalOverlay')); await attesa(300);
  clic(app.dialogo().ok); await attesa(300);
  t('confermando, si chiude', !aperta('modalEditStep'));

  console.log('--- Due finestre impilate ---');
  apri('modalEditStep'); await attesa(20);
  apri('modalManageStrati'); await attesa(20);
  esc(); await attesa(20);
  t('Esc chiude solo quella sopra', !aperta('modalManageStrati') && aperta('modalEditStep'));
  esc(); await attesa(20);
  t('il secondo Esc chiude l\'altra', !aperta('modalEditStep'));

  console.log('--- Tasto Indietro ---');
  app.E("state.uiState = state.uiState || {}; state.uiState.currentView = 'project'");
  w.history.pushState({ dpsh: true }, '');
  const n0 = w.history.length;
  apri('modalEditStep'); await attesa(20);
  w.dispatchEvent(new w.PopStateEvent('popstate'));
  await attesa(20);
  t('Indietro con una finestra aperta la chiude', !aperta('modalEditStep'));
  t('e non cambia schermata', app.E('state.uiState.currentView') === 'project');
  t('la voce di cronologia è rimessa (il prossimo Indietro funziona)', w.history.state && w.history.state.dpsh === true && w.history.length >= n0);
  apri('modalEditStep'); await attesa(20);
  scrivi(campo('modalEditStep'), '9');
  w.dispatchEvent(new w.PopStateEvent('popstate')); await attesa(300);
  t('con dati non salvati Indietro chiede e non cambia schermata', aperta('modalEditStep') && !!app.dialogo() && app.E('state.uiState.currentView') === 'project');
  clic(app.dialogo().ok); await attesa(300);
  t('confermando si chiude la finestra, la schermata resta', !aperta('modalEditStep') && app.E('state.uiState.currentView') === 'project');

  t('nessun errore in console', app.errori.length === 0);
  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('KO eccezione', e); process.exit(1); });
