// LE TAVOLE 2D E 3D NEL REPORT. Un capitolo «Tavole» dopo le prove, con le tavole scelte nella
// finestra «Tavole» del 3D (le escluse restano fuori) e le loro inquadrature, due per foglio, coi
// margini e l'intestazione del template della prima prova. Nella finestra di esportazione la riga
// «Tavole 2D e 3D» lo accende; senza prove col GPS dice cosa serve.
// (jsdom non disegna: la tela delle tavole qui è finta. Che le tavole si disegnino lo controlla
// tavole_3d.js; qui si controlla come entrano nel documento.)
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const P = `state.projects[${JSON.stringify(pid)}]`;
  app.E(`openProject(${JSON.stringify(pid)})`);
  await attesa(30);
  // Tre prove col GPS, vicine: c'è il modello 3D.
  app.E(`Object.values(${P}.surveys).forEach((s, i) => { s.header.lat = 40.1968 + i * 0.0003; s.header.lng = 17.993 + i * 0.0004; })`);
  app.E(`telaVoce3d = async (v) => { const c = document.createElement('canvas'); c.width = 1400; c.height = 860; c.toDataURL = () => 'data:image/jpeg;base64,TAVOLA_' + v.id; return c; }`);

  const voci = app.E(`datiTavoleReport(${P}).voci.map(v => v.id)`);
  t('il progetto ha le tavole del 3D (le due viste isometriche)', voci.includes('iso-n') && voci.includes('iso-e'));
  app.E(`${P}.tavole3d = { regola: {}, escluse: ['iso-e'] }`);
  t('quelle escluse nella finestra «Tavole» restano fuori', !app.E(`datiTavoleReport(${P}).voci.some(v => v.id === 'iso-e')`));
  app.E(`${P}.tavole3d.escluse = []`);

  const tpl = `{ margins: { top: 25, bottom: 20, left: 20, right: 20 }, headerEnabled: true, pages: [{ header: { text: 'Studio Rossi' } }] }`;
  const cap = await app.E(`capitoloTavoleHtml(${P}, ${tpl})`);
  const div = app.d.createElement('div');
  div.innerHTML = cap.html;
  const fogli = Array.from(div.querySelectorAll('.dpsh-sheet'));
  const n = voci.length;
  t(`due tavole per foglio: ${n} tavole, ${Math.ceil(n / 2)} fogli`, fogli.length === Math.ceil(n / 2) && cap.pageCount === fogli.length && div.querySelectorAll('.tavola-report').length === n);
  t('il primo foglio apre il capitolo «Tavole»', fogli[0].querySelector('.tavole-report-capitolo').textContent === 'Tavole' && !(fogli[1] && fogli[1].querySelector('.tavole-report-capitolo')));
  t('ogni tavola ha numero e titolo veri, e la sua immagine', div.querySelector('.tavola-report-titolo').textContent === 'Tavola 1 · Modello · vista isometrica verso Nord'
    && div.querySelector('img').getAttribute('src') === 'data:image/jpeg;base64,TAVOLA_iso-n');
  t('i fogli hanno i margini del template', fogli.every(f => /padding:25mm 20mm 20mm 20mm/.test(f.getAttribute('style'))));
  t('e la sua intestazione', fogli.every(f => /Studio Rossi/.test((f.querySelector('[data-blocco="intestazione"]') || {}).textContent || '')));
  const alt = parseFloat(/max-height:([\d.]+)mm/.exec(div.querySelector('img').getAttribute('style'))[1]);
  t('ogni tavola sta in metà foglio (il foglio è rigido: non si taglia)', alt > 60 && 2 * (alt + 14) + 14 <= 297 - 25 - 20);
  t('nel Word le tavole sono immagini', div.querySelector('img').parentElement.getAttribute('data-blocco') === 'immagine-libera');

  // Il report di progetto: dopo le prove, una sezione «Tavole» nell'indice. (Le prove vere qui non si
  // impaginano: jsdom non carica la cornice in cui si misurano. Ogni prova è un foglio finto.)
  app.E(`buildSurveyReportHtml = async (s) => ({ html: '<div class="dpsh-sheet"><div class="dpsh-sheet-inner">Prova ' + s.header.provaNr + '</div></div>', pageCount: 1 })`);
  const rep = await app.E(`buildCompleteReportHtml(${JSON.stringify(pid)}, { includiIndice: true, includiTavole: true })`);
  const doc = app.d.createElement('div');
  doc.innerHTML = rep.pagesHtml;
  const tutti = Array.from(doc.querySelectorAll('.dpsh-sheet'));
  const primoTavole = tutti.findIndex(f => f.querySelector('.tavole-report-capitolo'));
  t('nel report le tavole vengono dopo le prove', primoTavole > 0 && tutti.slice(primoTavole).every(f => f.querySelector('.tavola-report')));
  t('e l\'indice ha la voce «Tavole»', /Tavole/.test((doc.querySelector('.dpsh-sheet[data-sommario]') || {}).textContent || ''));

  // La finestra di esportazione: la riga «Tavole 2D e 3D», spenta di base.
  app.E(`openExportModal('project', ${JSON.stringify(pid)})`);
  clic(app, $(app, 'btnOptExportCompletePdf'));
  await attesa(40);
  const chk = $(app, 'chkEsportaPdfTavole');
  t('nell\'esportazione c\'è la riga «Tavole 2D e 3D», spenta di base', !!chk && !chk.checked && !chk.disabled && /Tavole 2D e 3D/.test(chk.parentElement.textContent));
  chk.checked = true;
  chk.dispatchEvent(new app.w.Event('change', { bubbles: true }));
  t('accesa, il progetto se lo ricorda', app.E(`${P}.tavole3d.nelReport`) === true);
  app.E('chiudiEsportazionePdfModal()');

  // Senza GPS niente modello: la riga lo dice e non si accende.
  app.E(`Object.values(${P}.surveys).forEach(s => { s.header.lat = null; s.header.lng = null; })`);
  app.E(`openExportModal('project', ${JSON.stringify(pid)})`);
  clic(app, $(app, 'btnOptExportCompletePdf'));
  await attesa(40);
  t('senza prove col GPS la riga dice cosa serve e non si accende', $(app, 'chkEsportaPdfTavole').disabled && /servono prove col GPS/.test($(app, 'chkEsportaPdfTavole').parentElement.textContent));

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log(app.errori.join('\n'));
  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
