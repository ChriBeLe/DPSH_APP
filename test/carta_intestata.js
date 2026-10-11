// LA CARTA INTESTATA COME SFONDO DEI FOGLI (071u). Nel gruppo «Foglio» dell'editor del template si
// carica la carta dell'ufficio (PDF, Word o immagine): ogni foglio del report ci viene scritto sopra.
// Qui (jsdom non disegna: niente pdf.js né tele) si controlla il percorso dei dati: la carta sta nel
// template, l'editor la mostra sotto al foglio (la prima pagina sulla prima), il report mette in ogni
// foglio un riquadro vuoto e l'immagine arriva da una regola CSS scritta una volta sola; il primo
// foglio del documento prende la prima pagina della carta, gli altri la seconda; la carta si stampa
// anche senza «grafica di sfondo»; il Word la mette nell'intestazione, dietro al testo.
// La lettura vera di un PDF e di un Word e i margini dalle zone libere si sono provati nel browser
// con test/dati/carta/carta.pdf e carta.docx.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const $ = (app, id) => app.d.getElementById(id);
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const PRIMA = 'data:image/jpeg;base64,UFJJTUE=', ALTRE = 'data:image/jpeg;base64,QUxUUkU=';

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'DPSH.html'), 'utf8');

  console.log('--- Il lettore di PDF ---');
  t('pdf.js è nel file, come testo che non parte da solo (si esegue la prima volta che serve)',
    /<script type="text\/plain" id="vendorPdfjs">/.test(html) && /<script type="text\/plain" id="vendorPdfjsWorker">/.test(html) && !app.E('typeof globalThis.pdfjsLib !== "undefined"'));
  t('e il lettore gira senza eseguire codice preso dal PDF (isEvalSupported: false)', /isEvalSupported: false/.test(fs.readFileSync(path.join(__dirname, '..', 'src', 'js', '071u_carta-intestata.js'), 'utf8')));

  console.log('--- Nell\'editor ---');
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  app.E(`openProject(${JSON.stringify(pid)})`);
  await attesa(40);
  const tid = app.E(`getReportTemplateIdPerProva(Object.values(state.projects[${JSON.stringify(pid)}].surveys)[0])`);
  app.E(`apriTemplateEditor(${JSON.stringify(tid)})`);
  await attesa(40);
  const file = $(app, 'fileCartaIntestata');
  t('nel gruppo «Foglio» c\'è «Carica carta intestata…» (PDF, Word o immagine)', !!$(app, 'btnCaricaCarta') && /Carica carta intestata/.test($(app, 'btnCaricaCarta').textContent)
    && /\.pdf/.test(file.accept) && /\.docx/.test(file.accept) && /image/.test(file.accept) && !!$(app, 'btnCaricaCarta').closest('[data-tpl-sez="foglio"]'));
  t('senza carta: niente anteprima, niente «Margini dalla carta» né «Togli»', $(app, 'tplCartaAnteprima').hidden && $(app, 'btnCartaMargini').hidden && $(app, 'btnTogliCarta').hidden && !$(app, 'templateEditorCarta'));
  app.E(`templateEditorState.cartaIntestata = { id: 'cartaProva', nome: 'carta.pdf', prima: '${PRIMA}', altre: '${ALTRE}', larghezzaMm: 210, altezzaMm: 297 }; renderTemplateEditorPageControls(); renderTemplateEditorCanvas();`);
  await attesa(20);
  const sotto = $(app, 'templateEditorCarta');
  t('con la carta: il foglio dell\'editor ce l\'ha sotto, la prima pagina sulla prima', !!sotto && sotto.parentElement.id === 'templateEditorPageFrame' && sotto.getAttribute('data-prima') === '1' && sotto.getAttribute('data-carta') === 'cartaProva');
  t('l\'immagine viene da una regola CSS (una sola volta), con le due pagine', ($(app, 'stileCarteEditor') || {}).textContent.includes(PRIMA) && $(app, 'stileCarteEditor').textContent.includes(ALTRE));
  t('e la barra mostra le due pagine, il nome, «Margini dalla carta» e «Togli»', !$(app, 'tplCartaAnteprima').hidden && $(app, 'imgCartaPrima').src === PRIMA && !$(app, 'imgCartaAltre').hidden
    && /carta\.pdf · 2 pagine/.test($(app, 'lblCartaNome').textContent) && !$(app, 'btnCartaMargini').hidden && !$(app, 'btnTogliCarta').hidden && /Cambia/.test($(app, 'btnCaricaCarta').textContent));
  t('una modifica da salvare', app.E('templateEditorHasUnsavedChanges()'));
  app.E('salvaTemplateEditor()');
  await attesa(30);
  t('salvata col template', app.E(`(state.reportTemplates[${JSON.stringify(tid)}].cartaIntestata || {}).prima`) === PRIMA);

  console.log('--- Nel report ---');
  // Le prove vere qui non si impaginano (jsdom non misura): ogni prova è un foglio finto fatto come
  // quelli del motore (071), che riceve la carta del template della prova (067).
  const src = n => fs.readFileSync(path.join(__dirname, '..', 'src', 'js', n), 'utf8');
  t('il motore mette la carta in ogni foglio della prova, quella del suo template',
    /\$\{stileSopra\}">\$\{htmlCartaNelFoglio\(carta\)\}\$\{intestazione\}/.test(src('071_motore-unificato-di-impaginazione.js')) && /isLastOfDoc, !!template\.headerEnabled, !!template\.footerEnabled, cartaDelTemplate\(template\)\)/.test(src('067_generatore-html-per-singola-prova.js')));
  app.E(`buildSurveyReportHtml = async (s) => ({ html: [1, 2].map(() => '<div class="dpsh-sheet">' + htmlCartaNelFoglio(cartaDelTemplate(state.reportTemplates[getReportTemplateIdPerProva(s)])) + '<div class="dpsh-sheet-inner">Prova ' + s.header.provaNr + '</div></div>').join(''), pageCount: 2 })`);
  const rep = await app.E(`buildCompleteReportHtml(${JSON.stringify(pid)}, { includiIndice: true })`);
  const fogli = (rep.pagesHtml.match(/class="dpsh-sheet"/g) || []).length, carte = (rep.pagesHtml.match(/class="dpsh-carta"/g) || []).length;
  t(`ogni foglio (anche l'indice) ha la carta: ${carte} su ${fogli}`, fogli > 1 && carte === fogli);
  t('il foglio porta solo un riquadro vuoto: l\'immagine non si ripete in ogni foglio', !rep.pagesHtml.includes(PRIMA));
  const marcato = app.E(`marcaCartePrimaEAltre(${JSON.stringify(rep.pagesHtml)})`);
  t('il primo foglio del documento prende la prima pagina della carta, gli altri la seconda',
    (marcato.match(/data-prima="1"/g) || []).length === 1 && (marcato.match(/data-altre="1"/g) || []).length === fogli - 1 && marcato.indexOf('data-prima') < marcato.indexOf('data-altre'));
  const regole = app.E(`regoleCarteIntestate(${JSON.stringify(rep.pagesHtml)})`);
  t('le regole della carta sono una volta sola per documento', (regole.match(new RegExp(PRIMA.replace(/[+/=]/g, '\\$&'), 'g')) || []).length === 1 && (regole.match(/QUxUUkU=/g) || []).length === 1);
  const stile = app.E('getReportPrintStyleBlock()');
  t('si stampa anche senza «grafica di sfondo» (print-color-adjust), sotto al contenuto', /\.dpsh-carta \{[^}]*print-color-adjust: exact/.test(stile) && /z-index: -1/.test(stile) && /\.dpsh-sheet \{ isolation: isolate; \}/.test(stile));
  t('il documento di stampa e l\'anteprima mettono le regole e segnano prima e altre',
    /regoleCarteIntestate\(pagesHtml\)/.test(src('046_modal-personalizza-indice.js')) && /marcaCartePrimaEAltre\(pagesHtml\)/.test(src('046_modal-personalizza-indice.js'))
    && /regoleCarteIntestate\(pagineHtml\)/.test(src('039_fase-b-anteprima-di-stampa-reale.js')) && /marcaCartePrimaEAltre\(pagineHtml\)/.test(src('039_fase-b-anteprima-di-stampa-reale.js')));
  t('l\'indice, con la carta, sta nei margini del template (non sopra la testata)', /data-tpl-page-label="Indice"[^>]*padding:\d/.test(rep.pagesHtml));
  t('nel Word la carta va nell\'intestazione, ancorata alla pagina dietro al testo', /cartaDelFoglioWord\(foglio\)/.test(src('071i_export-word.js')) && /ancoraWord\(ctx, carta, 0, 0, rf\.width, rf\.height, 'Carta intestata'\)/.test(src('071i_export-word.js')));

  console.log('--- Togliere ---');
  app.E(`apriTemplateEditor(${JSON.stringify(tid)})`);
  await attesa(30);
  t('riaperto il template, la carta c\'è ancora', app.E('!!(templateEditorState.cartaIntestata && templateEditorState.cartaIntestata.id === "cartaProva")') && !!$(app, 'templateEditorCarta'));
  clic(app, $(app, 'btnTogliCarta'));
  await attesa(20);
  t('«Togli»: via dal foglio e dalla barra', !$(app, 'templateEditorCarta') && $(app, 'tplCartaAnteprima').hidden);
  app.E('salvaTemplateEditor()');
  await attesa(30);
  t('e salvato, il template non ce l\'ha più', !app.E(`state.reportTemplates[${JSON.stringify(tid)}].cartaIntestata`));

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})();
