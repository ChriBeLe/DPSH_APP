// DATI DEL PROGETTO: toccando il nome del progetto si apre la finestra con SOLO i dati del progetto,
// non la scheda dell'ultima prova aperta.
const fs = require('fs'), path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
(async () => {
  const app = await avviaApp({ stato: fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8'), idb: telefonoV0() });
  await attesa(60);
  app.E('openProject(Object.keys(state.projects)[0])'); await attesa(80);
  app.E("switchView('project')"); await attesa(80);
  const $ = id => app.d.getElementById(id);
  const nasc = el => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const d = app.w.getComputedStyle(n).display; if (d === 'none') return true; } return false; };
  $('btnProgettoDati').dispatchEvent(new app.w.MouseEvent('click', { bubbles: true })); await attesa(60);
  const m = $('modalSurveySettings');
  t('la finestra si apre in modo progetto', m.classList.contains('open') && m.getAttribute('data-modo') === 'progetto');
  t('titolo «Dati del progetto»', $('lblSurveySettingsTitle').textContent === 'Dati del progetto');
  t('si vedono nome, committente, comune, provincia', ['txtNomeProgetto', 'txtCommittente', 'txtComune', 'txtProvincia'].every(id => !nasc($(id))));
  t('non si vedono località, data, numero prova, strumento', ['txtLocalita', 'txtDataIndagine', 'txtProvaNr', 'selPenetrometer'].every(id => nasc($(id))));
  app.E('closeSurveySettingsModal()');
  app.E("openSurveySettingsModal(state.currentSurveyId, 'dati')"); await attesa(40);
  t('dalla prova si vede ancora la scheda completa', !m.hasAttribute('data-modo') && !nasc($('txtLocalita')));
  console.log(`\n${ok} ok, ${ko} KO`); process.exit(ko ? 1 : 0);
})();
