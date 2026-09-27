// TRACCIABILITÀ DEGLI INTERVALLI (Fase 1, punto 5).
//
// Ogni intervallo nuovo porta registratoIl (data e ora) e origine; una modifica vera aggiunge
// modificatoIl. Gli intervalli di prima restano senza: nessuno inventa date. I campi finiscono nei
// JSON esportati ma non nei report. Si prova con i comandi dell'app, come in campo.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const PA = 'PROJ_Nard__1790450327664';
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const recente = (iso) => ISO.test(iso || '') && Math.abs(Date.now() - Date.parse(iso)) < 60000;

async function apriProva2(app) {
  const sid = app.E('Object.values(state.projects[' + JSON.stringify(PA) + '].surveys).find(s => s.header.provaNr === "2").id');
  app.E('openProject(' + JSON.stringify(PA) + ')');
  await attesa(50);
  app.E('syncProjectToActiveState(' + JSON.stringify(PA) + ', ' + JSON.stringify(sid) + '); updateUI();');
  await attesa(50);
  return sid;
}
const logs = (app) => JSON.parse(app.E('JSON.stringify(state.logs)'));

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  const d = app.d;
  await apriProva2(app);
  const quanti = logs(app).length;

  console.log('--- Gli intervalli di prima restano come sono ---');
  t('nessun intervallo della fixture ha ricevuto date o origini', logs(app).every(l => !('registratoIl' in l) && !('origine' in l) && !('modificatoIl' in l)));

  console.log('--- Contatore: +1 e CONFERMA ---');
  for (let i = 0; i < 7; i++) { clic(app, d.getElementById('btnPlus')); await attesa(2); }
  clic(app, d.getElementById('btnConfirmStepAction'));
  await attesa(50);
  let l = logs(app);
  const contato = l[l.length - 1];
  t('un intervallo in più, coi suoi 7 colpi', l.length === quanti + 1 && contato.colpi === 7);
  t('registratoIl: data e ora di adesso', recente(contato.registratoIl));
  t('origine: contatore', contato.origine === 'contatore');
  t('nessuna modifica ancora', !('modificatoIl' in contato));

  console.log('--- Aggiungi intervalli multipli ---');
  app.E('openBulkImportModal()');
  await attesa(20);
  d.getElementById('txtBulkImportData').value = '11 13 17';
  d.getElementById('txtBulkImportData').dispatchEvent(new app.w.Event('input'));
  d.querySelector('input[name="optImportMode"][value="append"]').checked = true;
  clic(app, d.getElementById('btnConfirmBulkImport'));
  await attesa(80);
  if (app.dialogo()) clic(app, app.dialogo().ok);
  l = logs(app);
  const multipli = l.slice(-3);
  t('tre intervalli, origine inserimento-multiplo', multipli.length === 3 && multipli.every(x => x.origine === 'inserimento-multiplo' && recente(x.registratoIl)));

  console.log('--- Un intervallo scritto a mano nella scheda ---');
  clic(app, d.getElementById('btnAddRowManual'));
  await attesa(50);
  d.getElementById('numModalColpi').value = '19';
  clic(app, d.getElementById('btnModalSave'));
  await attesa(80);
  l = logs(app);
  const aMano = l[l.length - 1];
  t('origine: modifica-manuale, con la sua data', aMano.colpi === 19 && aMano.origine === 'modifica-manuale' && recente(aMano.registratoIl));

  console.log('--- Le modifiche ---');
  app.E('openEditModal(0)');
  await attesa(50);
  clic(app, d.getElementById('btnModalSave'));
  await attesa(80);
  t('riaprire la scheda e salvare senza toccare niente NON è una modifica', !('modificatoIl' in logs(app)[0]));
  app.E('openEditModal(1)');
  await attesa(50);
  d.getElementById('numModalColpi').value = '5';
  clic(app, d.getElementById('btnModalSave'));
  await attesa(80);
  l = logs(app);
  t('cambiare i colpi di un intervallo vecchio aggiunge modificatoIl', l[1].colpi === 5 && recente(l[1].modificatoIl));
  t('e non gli inventa una registrazione', !('registratoIl' in l[1]) && !('origine' in l[1]));
  const ultimo = l.length - 1;
  app.E('openEditModal(' + (ultimo - 1) + ')');
  await attesa(50);
  d.getElementById('txtModalNote').value = 'trovante';
  clic(app, d.getElementById('btnModalSave'));
  await attesa(80);
  l = logs(app);
  t('su un intervallo nuovo la modifica si aggiunge alla registrazione', l[ultimo - 1].note === 'trovante' && recente(l[ultimo - 1].modificatoIl) && l[ultimo - 1].origine === 'inserimento-multiplo');
  // Nota rapida sull'ultimo intervallo: passa da una domanda di conferma.
  const tag = d.querySelector('.btn-tag[data-note]');
  clic(app, tag);
  await attesa(50);
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(50);
  l = logs(app);
  t('una nota rapida è una modifica dell ultimo intervallo', !!tag && recente(l[l.length - 1].modificatoIl));

  console.log('--- Nei dati salvati e nel JSON, non nel report ---');
  app.E('saveState()');
  const salvato = JSON.parse(app.salvato());
  const sid2 = app.E('state.currentSurveyId');
  const salvati = salvato.projects[PA].surveys[sid2].logs;
  t('i campi sono nello stato salvato', salvati.some(x => x.origine === 'contatore') && salvati.some(x => x.modificatoIl));
  await app.E('exportProjectJSON')(PA);
  await attesa(100);
  const file = JSON.parse(await app.scaricati[app.scaricati.length - 1].blob.text());
  t('e nel JSON esportato', file.surveys[sid2].logs.some(x => x.origine === 'contatore' && x.registratoIl));
  const proj = JSON.parse(app.E('JSON.stringify(state.projects[' + JSON.stringify(PA) + '])'));
  const html = ((await app.E('buildSurveyReportHtml')(proj.surveys[sid2], proj, false)) || {}).html;
  const unaData = contato.registratoIl.slice(0, 16);
  if (!(typeof html === 'string' && html.length > 1000)) console.log('       report:', typeof html, html && html.length, String(html).slice(0, 200));
  const trovati = String(html).match(/registratoIl|modificatoIl|inserimento-multiplo|modifica-manuale/g); if (trovati) console.log('       trovati:', trovati.slice(0, 5), html.includes(unaData));
  t('il report della prova non li contiene', typeof html === 'string' && html.length > 1000
    && !html.includes(unaData) && !/registratoIl|modificatoIl|inserimento-multiplo|modifica-manuale/.test(html));
  app.chiudi();

  console.log('--- Cambiare il passo sposta le profondità: è una modifica ---');
  {
    const a2 = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
    await apriProva2(a2);
    const sel = a2.d.getElementById('selStepCm');
    sel.value = '10';
    sel.dispatchEvent(new a2.w.Event('change'));
    await attesa(50);
    const dopo = logs(a2);
    t('gli intervalli spostati hanno modificatoIl', dopo.length > 1 && dopo.slice(1).every(x => recente(x.modificatoIl)));
    t('il primo, che resta a 0,00–0,10… cambia anche lui la fine', recente(dopo[0].modificatoIl));
    a2.chiudi();
  }

  console.log('--- CONTROPROVA: l app di prima non registrava niente ---');
  {
    const vecchia = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0, idb: telefonoV0() });
    await apriProva2(vecchia);
    for (let i = 0; i < 3; i++) { clic(vecchia, vecchia.d.getElementById('btnPlus')); await attesa(2); }
    clic(vecchia, vecchia.d.getElementById('btnConfirmStepAction'));
    await attesa(50);
    const lv = logs(vecchia);
    t('(controprova) l intervallo contato non sapeva né quando né come', !('registratoIl' in lv[lv.length - 1]) && !('origine' in lv[lv.length - 1]));
    vecchia.chiudi();
  }

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log('KO eccezione'); process.exit(1); });
