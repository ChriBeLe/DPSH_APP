// LA STIMA DELLE PAGINE nella finestra Esporta PDF (045). Contava ancora le foto in più e due pagine
// di parametri avanzati per prova, che non escono più da sole (solo quello che c'è nel template):
// diceva 13 pagine per un PDF di 7. Ora: l'indice e le pagine del template di ogni prova, come
// «almeno» (i fogli in più per un blocco che non ci sta si sanno solo impaginando).
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  app.E(`openProject(${JSON.stringify(pid)})`);
  app.E(`apriEsportazionePdfModal({ type: 'project', id: ${JSON.stringify(pid)} })`);
  await attesa(60);
  const attese = app.E(`(() => { const sel = elencoProveSelezionateEsportazionePdf(); const n = sel.reduce((t, s) => t + (state.reportTemplates[getReportTemplateIdPerProva(s)].pages || [1]).length, 0); return (sel.length > 1 && chkEsportaPdfIndice.checked ? 1 : 0) + n; })()`);
  const stima = Number(app.d.getElementById('lblEsportaPdfPagineStima').textContent.replace('≥ ', ''));
  t(`la stima conta indice e pagine del template (${stima}), non foto e tabelle che non escono`, stima === attese);
  t('scritta come «almeno» (un blocco che non sta passa al foglio dopo): «≥ 4» per un PDF di 7, non «13»',
    app.d.getElementById('lblEsportaPdfPagineStima').textContent === '≥ ' + attese && stima <= 7);

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log(app.errori.join('\n'));
  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
