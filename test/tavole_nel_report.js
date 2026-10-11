// LE TAVOLE 2D E 3D NEL REPORT. Un capitolo a sé dopo le prove («Allegati grafici», o come lo si
// chiama), con due sottocapitoli, Modello 3D e Sezioni 2D: un foglio per tavola, nel formato scelto
// nella finestra «Tavole» (A3 orizzontale in mezzo agli A4 verticali delle prove: pagine con nome nel
// PDF, sezioni nel Word). L'indice raccoglie le prove sotto «Prove DPSH». Nella finestra di
// esportazione la riga «Tavole 2D e 3D» lo accende; senza prove col GPS dice cosa serve.
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

  // IL CAPITOLO: un foglio per tavola, nel formato scelto nella finestra «Tavole» (qui A3 orizzontale),
  // in due sottocapitoli, Modello 3D e Sezioni 2D.
  app.E(`${P}.tavole3d.foglio = { carta: 'A3', verso: 'o', scritte: 1.3 }`);
  const cap = await app.E(`capitoloTavoleHtml(${P}, null)`);
  const div = app.d.createElement('div');
  div.innerHTML = cap.sezioni.map(x => x.html).join('');
  const fogli = Array.from(div.querySelectorAll('.dpsh-sheet'));
  const n = voci.length;
  t(`un foglio per tavola: ${n} tavole, ${fogli.length} fogli`, fogli.length === n && cap.pageCount === n);
  t('i fogli sono A3 orizzontali, come nella finestra «Tavole»', fogli.every(f => f.getAttribute('data-formato-tavola') === 'A3o' && /width:420mm; height:297mm/.test(f.getAttribute('style'))));
  t('sottocapitolo «Modello 3D» (e «Sezioni 2D» solo se ci sono sezioni)', cap.sezioni[0].etichetta === 'Modello 3D' && cap.sezioni[0].id === '__tavole3d__' && cap.sezioni.every(x => /^(Modello 3D|Sezioni 2D)$/.test(x.etichetta)));
  t('ogni tavola ha numero e titolo veri, e la sua immagine', div.querySelector('.tavola-report-titolo').textContent === 'Tav. 1 — Modello · vista isometrica verso Nord'
    && div.querySelector('img').getAttribute('src') === 'data:image/jpeg;base64,TAVOLA_iso-n');
  t('l\'ancora dell\'indice sta dentro il primo foglio (fuori, fra formati diversi, sarebbe una pagina bianca)', !/^<a /.test(cap.sezioni[0].html) && fogli[0].querySelector('a#prova-report-__tavole3d__'));
  t('in fondo il progetto e il numero della tavola', /Tav\. 1$/.test(fogli[0].querySelector('.tavola-report-piede').textContent.trim()));
  t('nel Word la figura è un\'immagine', div.querySelector('img').parentElement.getAttribute('data-blocco') === 'immagine-libera');
  const regole = app.E(`regolePagineTavole(${JSON.stringify(div.innerHTML)})`);
  t('nel PDF ogni formato è una pagina con un nome (l\'A3 sta in mezzo agli A4 delle prove)', /@page tavolaA3o \{ size: 420mm 297mm; margin: 0; \}/.test(regole) && /\.dpsh-sheet\[data-formato-tavola="A3o"\] \{ page: tavolaA3o; \}/.test(regole) && app.E('regolePagineTavole("<div></div>")') === '');
  t('e nel Word ogni foglio è una sezione col suo formato', /w:orient="landscape"/.test(fs.readFileSync(path.join(__dirname, '..', 'src', 'js', '071i_export-word.js'), 'utf8')));

  // Il report di progetto: dopo le prove il capitolo delle tavole; l'indice ha «Prove DPSH» con le prove
  // sotto, e il capitolo delle tavole coi suoi due sottocapitoli e le tavole.
  app.E(`buildSurveyReportHtml = async (s) => ({ html: '<div class="dpsh-sheet"><div class="dpsh-sheet-inner">Prova ' + s.header.provaNr + '</div></div>', pageCount: 1 })`);
  app.E(`${P}.tavole3d.capitolo = 'Allegati grafici'`);
  const rep = await app.E(`buildCompleteReportHtml(${JSON.stringify(pid)}, { includiIndice: true, includiTavole: true })`);
  const doc = app.d.createElement('div');
  doc.innerHTML = rep.pagesHtml;
  const tutti = Array.from(doc.querySelectorAll('.dpsh-sheet'));
  const primoTavole = tutti.findIndex(f => f.classList.contains('dpsh-tavola'));
  t('nel report le tavole vengono dopo le prove', primoTavole > 0 && tutti.slice(primoTavole).every(f => f.classList.contains('dpsh-tavola')));
  const righe = Array.from(doc.querySelectorAll('.dpsh-sheet[data-sommario] a[data-voce-indice]')).map(a => [a.getAttribute('data-livello'), a.querySelector('[data-testo-voce]').textContent.trim()]);
  t('indice: «Prove DPSH» (1° livello) con le prove sotto (2°)', righe[0][0] === '1' && righe[0][1] === 'Prove DPSH' && righe[1][0] === '2' && /^Prova N° /.test(righe[1][1]));
  const iCap = righe.findIndex(r => r[1] === 'Allegati grafici');
  t('poi «Allegati grafici» (1°), «Modello 3D» (2°) e le tavole (3°)', iCap > 0 && righe[iCap][0] === '1' && righe[iCap + 1][1] === 'Modello 3D' && righe[iCap + 1][0] === '2' && righe[iCap + 2][0] === '3' && /^Tav\. 1/.test(righe[iCap + 2][1]));
  t('e nel Word: le voci di capitolo e di sezione col loro livello', tutti[0 + 1].getAttribute('data-voce-capitolo-testo') === 'Prove DPSH' && tutti[primoTavole].getAttribute('data-voce-capitolo-testo') === 'Allegati grafici' && tutti[primoTavole].getAttribute('data-voce-livello') === '2');

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
