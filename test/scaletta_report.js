// LA SCALETTA DEL REPORT (Fase C, tappa ④): le sezioni del documento in ordine, con template e
// interruttore, che scrivono le STESSE proprietà usate da «Esporta PDF», il quale parte dalle
// prove accese nella scaletta (la selezione della Consegna, se c'è, vince).
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const cambia = (app, el) => el && el.dispatchEvent(new app.w.Event('change', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const aperto = (app, id) => $(app, id).classList.contains('open');

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E('Object.keys(state.projects)[0]');
  app.E(`openProject(${JSON.stringify(pid)})`);
  await attesa(60);
  // Quattro prove, la quarta è un'interpretazione alternativa della prima.
  app.E(`(() => { const p = state.projects[${JSON.stringify(pid)}]; const base = Object.values(p.surveys)[0];
    p.surveys = {}; delete p.ordineProve; delete p.scaletta; delete p.introduzione;
    ['1','2','3','1B'].forEach((n, i) => { const sv = JSON.parse(JSON.stringify(base)); sv.id = 'sc' + i; sv.header.provaNr = n; delete sv.header.interpretazioneDi; if (n === '1B') sv.header.interpretazioneDi = 'sc0'; p.surveys[sv.id] = sv; });
    p.ordineProve = ['sc2', 'sc0', 'sc1', 'sc3']; saveState(); updateUI(); })()`);
  await attesa(30);
  const P = `state.projects[${JSON.stringify(pid)}]`;
  // Il progetto riaggiunge da solo la prova aperta (una 3B, interpretazione alternativa): la si tiene in conto.
  const ex = app.E(`Object.keys(${P}.surveys).filter(k => !/^sc\\d$/.test(k))`);
  t('c\'è al più una prova in più, quella aperta', ex.length <= 1);

  console.log('--- Apertura dalla tappa ④ ---');
  clic(app, $(app, 'btnTappaReport'));
  await attesa(30);
  t('la tappa ④ apre la scaletta', aperto(app, 'modalScaletta') && /Scaletta/.test($(app, 'modalScaletta').textContent));
  t('non apre più la libreria dei template', !aperto(app, 'modalReportTemplates'));
  const chiavi = () => [...app.d.querySelectorAll('#listaScaletta .scaletta-riga')].map(r => r.dataset.riga);
    t('righe in ordine: indice, introduzione, prove nell\'ordine del report, tavole',
    JSON.stringify(chiavi()) === JSON.stringify(['indice', 'introduzione', 'prova:sc2', 'prova:sc0', 'prova:sc1', 'prova:sc3', ...ex.map(k => 'prova:' + k), 'tavole']));
  const riga = k => app.d.querySelector(`#listaScaletta [data-riga="${k}"]`);
  t('l\'interpretazione alternativa parte spenta, le altre prove accese', !riga('prova:sc3').querySelector('input').checked && riga('prova:sc0').querySelector('input').checked);
  t('il capitolo introduttivo parte spento', !riga('introduzione').querySelector('input').checked);
  t('le tavole senza modello sono disattivate', riga('tavole').querySelector('input').disabled || app.E(`!!datiTavoleReport(${P})`));

  console.log('--- Interruttori e template scrivono le proprietà del progetto ---');
  const iIntro = riga('introduzione').querySelector('input');
  iIntro.checked = true; cambia(app, iIntro);
  t('interruttore introduzione → proj.introduzione.attiva', app.E(`${P}.introduzione.attiva`) === true);
  const sIntro = riga('introduzione').querySelector('select');
  const altro = [...sIntro.options].map(o => o.value).find(v => v !== sIntro.value);
  if (altro) { sIntro.value = altro; cambia(app, sIntro); }
  t('template introduzione → proj.introduzione.templateId', !altro || app.E(`${P}.introduzione.templateId`) === altro);
  const sProva = riga('prova:sc1').querySelector('select');
  const altroP = [...sProva.options].map(o => o.value).find(v => v !== sProva.value);
  if (altroP) { sProva.value = altroP; cambia(app, sProva); }
  t('template prova → surveys[id].reportTemplateId', !altroP || app.E(`${P}.surveys.sc1.reportTemplateId`) === altroP);
  const sIdx = riga('indice').querySelector('select');
  const altroI = [...sIdx.options].map(o => o.value).find(v => v !== sIdx.value);
  if (altroI) { sIdx.value = altroI; cambia(app, sIdx); }
  t('template indice → proj.indiceTemplateId', !altroI || app.E(`${P}.indiceTemplateId`) === altroI);
  const iIdx = riga('indice').querySelector('input');
  iIdx.checked = false; cambia(app, iIdx);
  t('interruttore indice → impostazioni di esportazione', app.E('impostazioniEsportazionePdf.includiIndice') === false);
  iIdx.checked = true; cambia(app, iIdx);
  const iP = riga('prova:sc1').querySelector('input');
  iP.checked = false; cambia(app, iP);
    t('spegnere una prova la mette in proj.scaletta.proveSpente', JSON.stringify(app.E(`${P}.scaletta.proveSpente`).sort()) === JSON.stringify(['sc1', 'sc3', ...ex].sort()));
  t('lo stato della tappa ④ si aggiorna («3 sezioni · …»)', /^\d+ sezioni · /.test($(app, 'lblTappaReport').textContent) && /^4 sezioni/.test($(app, 'lblTappaReport').textContent));

  console.log('--- Esporta PDF parte dalla scaletta ---');
  clic(app, $(app, 'btnScalettaPdf'));
  await attesa(40);
  t('«Esporta PDF» chiude la scaletta e apre l\'esportazione', !aperto(app, 'modalScaletta') && aperto(app, 'modalEsportaPdf'));
  const spuntate = () => [...app.d.querySelectorAll('.chk-esporta-pdf-prova')].filter(c => c.checked).map(c => c.dataset.id).sort();
  t('le prove spuntate sono quelle accese nella scaletta', JSON.stringify(spuntate()) === JSON.stringify(['sc0', 'sc2']));
  t('il capitolo introduttivo spuntato come nella scaletta', $(app, 'chkEsportaPdfIntroduzione').checked);
  app.E('chiudiEsportazionePdfModal()');
  // Word: stessa scaletta.
  app.E(`${P}.scaletta = { proveSpente: ['sc0'] }`);
  app.E(`apriEsportazionePdfModal({ type: 'project', id: ${JSON.stringify(pid)}, formato: 'word' })`);
    t('anche il Word legge la scaletta', JSON.stringify(spuntate()) === JSON.stringify(['sc1', 'sc2', 'sc3', ...ex].sort()));
  app.E('chiudiEsportazionePdfModal()');
  // La selezione della Consegna (soloProve) vince.
  app.E(`apriEsportazionePdfModal({ type: 'project', id: ${JSON.stringify(pid)}, soloProve: new Set(['sc0']) })`);
  t('la selezione «Questa prova» della Consegna vince sulla scaletta', JSON.stringify(spuntate()) === JSON.stringify(['sc0']));
  app.E('chiudiEsportazionePdfModal()');

  console.log('--- Modifica template ---');
  apriDopo: {
    app.E('apriScalettaReport()');
    await attesa(20);
    clic(app, $(app, 'btnScalettaTemplate'));
    await attesa(30);
    t('«Modifica template» apre la libreria dei template', !aperto(app, 'modalScaletta') && aperto(app, 'modalReportTemplates'));
  }

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
