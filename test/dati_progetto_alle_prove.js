// DATI DEL PROGETTO ALLE PROVE: committente e comune (gruppo «Del progetto») si aggiornano in tutte le
// prove; località, data e numero («Di questa prova») restano della singola prova.
const fs = require('fs'), path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
(async () => {
  const app = await avviaApp({ stato: fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8'), idb: telefonoV0() });
  await attesa(60);
  app.E('openProject(Object.keys(state.projects)[0])'); await attesa(100);
  const $ = id => app.d.getElementById(id);
  const scrivi = (id, v) => { $(id).value = v; $(id).dispatchEvent(new app.w.Event('input', { bubbles: true })); };
  const heads = () => app.E('Object.values(state.projects[state.currentProjectId].surveys).map(s=>s.header)');
  t('il progetto ha più prove', heads().length >= 2);
  scrivi('txtCommittente', 'ACME srl'); scrivi('txtComune', 'Lecce');
  t('committente in tutte le prove', heads().every(h => h.committente === 'ACME srl'));
  t('comune in tutte le prove', heads().every(h => h.comune === 'Lecce'));
  t('anche nel progetto', app.E('state.projects[state.currentProjectId].comune') === 'Lecce');
  scrivi('txtLocalita', 'Via Solo 1');
  const dopo = heads();
  t('la località resta della sola prova aperta', dopo.filter(h => h.localita === 'Via Solo 1').length === 1);
  console.log(`\n${ok} ok, ${ko} KO`); process.exit(ko ? 1 : 0);
})();
