// BARRA DEL TITOLO DELL'EDITOR TEMPLATE: TRE ZONE, TRE PESI — E RIPETI, CHE PRIMA NON C'ERA.
//
// Dal canvas di design "Barra dell'editor template", direzione A. Prima: otto comandi con lo
// stesso trattamento e le misure al contrario dell'uso — 42px per "Salva come copia" e "Aa"
// (che si aprono quasi mai), 32px per l'anteprima di stampa, Chiudi a due pixel da Salva.
// Ora tre pesi: fantasma per gli attrezzi (Annulla/Ripeti, vista), contorno per quello che si
// apre ogni tanto (stile del testo, anteprima), pieno solo per Salva — con "Salva come copia"
// ridotto alla freccia accanto. Chiudi staccato.
//
// Ripeti nel design era disegnato ma nel programma non esisteva. Qui si verifica che esista
// davvero e che non possa produrre stati impossibili: in particolare che i due "ritiri di
// servizio" che usano l'annulla come rete di sicurezza (piazzamento rinunciato, affiancamento
// fallito) e l'annulla con un blocco in mano NON finiscano nella pila di Ripeti.
//
// Non serve jsdom: le funzioni vere si estraggono dal file e girano in un contesto vm.
const fs = require('fs');
const vm = require('vm');
const percorso = __dirname + '/../dist/DPSH.html';
const src = fs.readFileSync(percorso, 'utf8');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };

// "function nome(...) { ... }" contando le graffe, saltando commenti e stringhe: i commenti del
// file sono pieni di apostrofi ("c'è", "L'undo") che altrimenti sembrerebbero stringhe aperte.
function estraiFunzione(nome) {
  const inizio = src.indexOf('function ' + nome + '(');
  if (inizio < 0) return null;
  let i = src.indexOf('{', src.indexOf(')', inizio));
  let prof = 0;
  while (i > 0 && i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { i = src.indexOf('\n', i); continue; }
    if (c === '/' && d === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      const q = c; i++;
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; }
      i++; continue;
    }
    if (c === '{') prof++;
    else if (c === '}') { prof--; if (prof === 0) return src.slice(inizio, i + 1); }
    i++;
  }
  return null;
}

const iBarra = src.indexOf('id="modalTemplateEditor"');
const fBarra = src.indexOf('id="templateEditorPreviewSurveyBar"', iBarra);
const barra = iBarra > 0 && fBarra > iBarra ? src.slice(iBarra, fBarra) : '';
const tagBottone = id => (new RegExp('<button[^>]*id="' + id + '"[^>]*>')).exec(barra);

console.log('\n--- Sul file: le tre zone, nell\'ordine giusto ---');
{
  t('la barra si trova', barra.length > 0);
  t('Annulla e Ripeti stanno insieme in un segmento, Annulla per primo',
    /class="tpl-barra-segmento"[^>]*>\s*<button[^>]*id="btnUndoTemplateEditor"[^>]*>[\s\S]*?<\/button>\s*<button[^>]*id="btnRedoTemplateEditor"/.test(barra));
  t('Ripeti ha la sua icona', /id="btnRedoTemplateEditor"[^>]*><svg class="ico"><use href="#i-redo"\/>/.test(barra));
  t('e parte spento, come Annulla (all\'apertura non c\'è niente da ripetere)',
    /disabled/.test((tagBottone('btnRedoTemplateEditor') || [''])[0]));
  t('Riquadri e Schermo intero formano il segmento della vista, separati da un divisore',
    /tpl-barra-vista[\s\S]*?id="btnTemplatePreviewMode"[\s\S]*?tpl-barra-divisore[\s\S]*?id="btnTemplateFullscreenPreview"/.test(barra));
  t('l\'interruttore dice "Riquadri" e non più "Nascondi riquadri"',
    /id="lblBtnTemplatePreviewMode">Riquadri</.test(barra) && barra.indexOf('>Nascondi riquadri<') < 0);
  t('Aa e Anteprima sono a contorno',
    /class="tpl-barra-out[^"]*"[^>]*id="btnStileTesto"/.test(barra) && /class="tpl-barra-out[^"]*"[^>]*id="btnAnteprimaStampaReale"/.test(barra));
  t('Anteprima ha una parola, non solo il glifo', /id="btnAnteprimaStampaReale"[^>]*>[\s\S]{0,80}<\/svg>Anteprima<\/button>/.test(barra));
  t('Salva e la freccia "come copia" sono un pezzo solo',
    /class="tpl-barra-split">\s*<button[^>]*id="btnSaveTemplateEditor"[\s\S]*?<\/button>\s*<button[^>]*id="btnSaveTemplateEditorAsCopy"[^>]*><svg class="ico"><use href="#i-chevron-down"\/>/.test(barra));
  t('pieno c\'è UN tasto solo: Salva', (barra.match(/class="tpl-barra-salva"/g) || []).length === 1);
  t('Chiudi è staccato: linea alta, poi il tasto',
    /class="tpl-barra-uscita">\s*<span class="tpl-barra-sep"><\/span>\s*<button[^>]*id="btnCloseTemplateEditorX"/.test(barra));
  const ordine = ['btnUndoTemplateEditor', 'btnTemplatePreviewMode', 'btnStileTesto', 'btnAnteprimaStampaReale',
    'btnSaveTemplateEditor"', 'btnTemplateEditorMobileMore', 'btnCloseTemplateEditorX'].map(id => barra.indexOf('id="' + id));
  t('ordine: attrezzi → vista → documento → Salva → altro → Chiudi',
    ordine.every(i => i > 0) && ordine.every((v, k) => k === 0 || v > ordine[k - 1]));
  const ids = ['btnUndoTemplateEditor', 'btnRedoTemplateEditor', 'btnTemplatePreviewMode', 'btnTemplateFullscreenPreview',
    'btnStileTesto', 'btnAnteprimaStampaReale', 'btnSaveTemplateEditor', 'btnSaveTemplateEditorAsCopy',
    'btnTemplateEditorMobileMore', 'btnCloseTemplateEditorX'];
  const conStile = ids.filter(id => { const m = tagBottone(id); return !m || /\sstyle=/.test(m[0]); });
  t('nessun bottone della barra ha uno style="" in linea (batterebbe la modalità guanti)', conStile.length === 0);
  if (conStile.length) console.log('        ', conStile);
  const bersagli = [...barra.matchAll(/data-more-target="([^"]+)"/g)].map(m => m[1]);
  t('ogni voce del menu "altro" inoltra a un bottone che esiste ancora',
    bersagli.length >= 5 && bersagli.every(id => barra.indexOf('id="' + id + '"') > 0));
  t('i bottoni icona hanno un nome anche per chi non vede il glifo',
    ['btnUndoTemplateEditor', 'btnRedoTemplateEditor', 'btnTemplateFullscreenPreview', 'btnStileTesto',
      'btnSaveTemplateEditorAsCopy', 'btnCloseTemplateEditorX'].every(id => /aria-label="/.test((tagBottone(id) || [''])[0])));
}

console.log('\n--- Sul file: i pesi nel CSS ---');
{
  t('fantasma: 34px dentro un segmento con 3px di margine (40 in tutto)',
    /\.tpl-barra-gh \{ height: 34px;/.test(src) && /\.tpl-barra-segmento \{[^}]*padding: 3px;/.test(src));
  t('fantasma senza cornice propria', /\.tpl-barra-gh \{[^}]*border: none;[^}]*background: transparent;/.test(src));
  t('contorno: bordo sì, riempimento no', /\.tpl-barra-out \{[^}]*border: 1px solid var\(--border\);[^}]*background: transparent;/.test(src));
  t('pieno: Salva e freccia sul colore d\'accento',
    /\.tpl-barra-salva \{[^}]*background: var\(--accent\);/.test(src) && /\.tpl-barra-freccia \{[^}]*background: var\(--accent\);/.test(src));
  t('lo stato acceso di Riquadri si vede', /\.tpl-barra-gh\.premuto[^{]*\{ background: var\(--accent-soft\); color: var\(--accent-ink\); \}/.test(src));
  t('il fondo del segmento segue il tema dentro @supports (con var() un ripiego in cascata non funziona)',
    /@supports \(background: color-mix\([^)]*\)\) \{\s*\.tpl-barra-segmento \{ background: color-mix\(in srgb, var\(--text-main\)/.test(src));
  t('la modalità guanti raggiunge Salva, i contorni e Chiudi',
    /body\.glove-mode \.tpl-barra-out, body\.glove-mode \.tpl-barra-salva, body\.glove-mode \.tpl-barra-uscita \.tpl-barra-gh/.test(src));
  t('su mobile vista, documento e freccia vanno nel menu "altro"',
    /\.tpl-barra-vista, \.tpl-barra-doc, #btnSaveTemplateEditorAsCopy \{ display: none !important; \}/.test(src));
  t('ma Ripeti resta in barra accanto ad Annulla', !/#btnRedoTemplateEditor[^{]*\{[^}]*display: none/.test(src));
  t('e la vecchia regola che nascondeva i due bottoni singoli non c\'è più',
    src.indexOf('#btnTemplatePreviewMode, #btnTemplateFullscreenPreview { display: none') < 0);
}

console.log('\n--- Sul file: chi usa l\'annulla come rete di sicurezza non alimenta Ripeti ---');
{
  t('i due ritiri di servizio passano senzaTraccia', (src.match(/undoTemplateEditor\(\{ senzaTraccia: true \}\)/g) || []).length === 2);
  t('nessun pop nudo sulla pila di Annulla (ruberebbe la cronologia di Ripeti)', src.indexOf('templateEditorState.undoStack.pop()') < 0);
  t('i clic non passano l\'evento al posto delle opzioni',
    src.indexOf("addEventListener('click', undoTemplateEditor)") < 0 && /addEventListener\('click', \(\) => redoTemplateEditor\(\)\)/.test(src));
  t('Ctrl+Y e Ctrl/⌘+Maiusc+Z chiamano Ripeti',
    /\(e\.shiftKey && tasto === 'z'\) \|\| \(!e\.shiftKey && tasto === 'y'\)\)\) \{\s*e\.preventDefault\(\);\s*redoTemplateEditor\(\);/.test(src));
  t('e un keydown senza "key" (compilazione automatica di Chrome) non fa esplodere niente',
    /const tasto = \(e\.key \|\| ''\)\.toLowerCase\(\);/.test(src));
  t('aprendo l\'editor la pila di Ripeti riparte vuota', /undoStack: \[\], redoStack: \[\], redoStackScartato: \[\]/.test(src));
}

// ======================================================================================
// VIVO: le funzioni della cronologia, estratte dal file, su uno stato finto.
// ======================================================================================
const nomi = ['salvaUndoSnapshotEditor', 'scartaUltimoSnapshotEditor', 'undoTemplateEditor',
  'redoTemplateEditor', 'ripristinaPagineEditor', 'aggiornaBottoneUndoEditor', 'aggiornaBottoneAnteprimaPulita'];
const codici = nomi.map(estraiFunzione);
console.log('\n--- Le funzioni vere, estratte dal file ---');
t('tutte le funzioni si estraggono', codici.every(Boolean));
if (!codici.every(Boolean)) { console.log(nomi.filter((n, k) => !codici[k])); console.log(`\n${ok} ok, ${ko} KO`); process.exit(1); }

function accendi() {
  const classi = new Set(['premuto']);
  const attributi = {};
  const bottoni = {
    btnUndoTemplateEditor: { disabled: true },
    btnRedoTemplateEditor: { disabled: true },
    btnTemplatePreviewMode: {
      title: '', style: new Proxy({}, { set() { throw new Error('scrive btn.style'); } }),
      classList: { toggle(c, v) { if (v) classi.add(c); else classi.delete(c); }, contains: c => classi.has(c) },
      setAttribute(k, v) { attributi[k] = v; }
    },
    lblBtnTemplatePreviewMode: { textContent: 'Riquadri' }
  };
  const ctx = {
    templateEditorState: { pages: [{ v: 0 }], activePageIdx: 0, undoStack: [], redoStack: [], redoStackScartato: [], previewMode: false },
    document: { getElementById: id => bottoni[id] || null },
    renderTemplateEditorPagesStrip() {}, renderTemplateEditorPageControls() {}, renderTemplateEditorCanvas() {},
    renderTemplateEditorPalette() {}, renderBarraSpostamento() {}, renderSuggerimentiLayoutEditor() {},
    JSON, Math
  };
  vm.createContext(ctx);
  vm.runInContext(codici.join('\n'), ctx);
  return { ctx, bottoni, classi, attributi };
}

console.log('\n--- Annulla e Ripeti si alternano senza perdere niente ---');
{
  const { ctx, bottoni } = accendi();
  const S = ctx.templateEditorState;
  const v = () => S.pages[0].v;
  const modifica = n => { ctx.salvaUndoSnapshotEditor(); S.pages = [{ v: n }]; };
  ctx.aggiornaBottoneUndoEditor();
  t('all\'inizio sono spenti tutti e due', bottoni.btnUndoTemplateEditor.disabled && bottoni.btnRedoTemplateEditor.disabled);
  modifica(1); modifica(2); modifica(3);
  t('dopo tre modifiche Annulla si accende, Ripeti no', !bottoni.btnUndoTemplateEditor.disabled && bottoni.btnRedoTemplateEditor.disabled);
  ctx.undoTemplateEditor();
  t('Annulla torna allo stato di prima', v() === 2);
  t('e accende Ripeti', !bottoni.btnRedoTemplateEditor.disabled);
  ctx.redoTemplateEditor();
  t('Ripeti rimette la modifica annullata', v() === 3);
  t('e si spegne quando non resta niente da ripetere', bottoni.btnRedoTemplateEditor.disabled);
  ctx.undoTemplateEditor(); ctx.undoTemplateEditor(); ctx.undoTemplateEditor();
  t('annullando tutto si torna all\'origine', v() === 0 && bottoni.btnUndoTemplateEditor.disabled);
  ctx.redoTemplateEditor(); ctx.redoTemplateEditor(); ctx.redoTemplateEditor();
  t('e ripetendo tutto si torna alla fine', v() === 3 && bottoni.btnRedoTemplateEditor.disabled);
  for (let k = 0; k < 20; k++) { ctx.undoTemplateEditor(); ctx.redoTemplateEditor(); }
  t('venti andata-e-ritorno non spostano niente', v() === 3 && S.undoStack.length === 3 && S.redoStack.length === 0);
  ctx.redoTemplateEditor();
  t('Ripeti a pila vuota non fa niente', v() === 3);
}

console.log('\n--- Una modifica nuova chiude il ramo di Ripeti ---');
{
  const { ctx, bottoni } = accendi();
  const S = ctx.templateEditorState;
  const modifica = n => { ctx.salvaUndoSnapshotEditor(); S.pages = [{ v: n }]; };
  modifica(1); modifica(2);
  ctx.undoTemplateEditor();
  modifica(9);
  t('Ripeti si spegne', bottoni.btnRedoTemplateEditor.disabled && S.redoStack.length === 0);
  ctx.redoTemplateEditor();
  t('e non riporta la modifica annullata sopra quella nuova', S.pages[0].v === 9);
  ctx.undoTemplateEditor();
  t('mentre Annulla torna comunque indietro di un passo', S.pages[0].v === 1);
}

console.log('\n--- I ritiri di servizio lasciano Ripeti com\'era ---');
{
  const { ctx, bottoni } = accendi();
  const S = ctx.templateEditorState;
  const modifica = n => { ctx.salvaUndoSnapshotEditor(); S.pages = [{ v: n }]; };
  modifica(1); modifica(2); modifica(3);
  ctx.undoTemplateEditor();                       // a 2, Ripeti porterebbe a 3
  // Piazzamento: lo snapshot parte, il blocco entra, poi l'utente sceglie "Annulla piazzamento".
  ctx.salvaUndoSnapshotEditor(); S.pages = [{ v: 'blocco-piazzato' }];
  t('durante il piazzamento Ripeti è chiuso', bottoni.btnRedoTemplateEditor.disabled);
  ctx.undoTemplateEditor({ senzaTraccia: true });
  t('la rinuncia rimette la pagina com\'era', S.pages[0].v === 2);
  t('e Ripeti torna disponibile come prima del piazzamento', !bottoni.btnRedoTemplateEditor.disabled && S.redoStack.length === 1);
  t('il blocco rinunciato NON è finito in Ripeti', S.redoStack.every(s => s.indexOf('blocco-piazzato') < 0));
  ctx.redoTemplateEditor();
  t('Ripeti porta ancora dove portava', S.pages[0].v === 3);

  // Affiancamento rifiutato sul nascere: snapshot preso e scartato, pagine mai toccate.
  ctx.undoTemplateEditor();                       // a 2, Ripeti → 3
  const pilaPrima = S.undoStack.length;
  ctx.salvaUndoSnapshotEditor();
  ctx.scartaUltimoSnapshotEditor();
  t('scartare lo snapshot non tocca le pagine', S.pages[0].v === 2);
  t('non lascia niente in più nella pila di Annulla', S.undoStack.length === pilaPrima);
  t('e rimette Ripeti', S.redoStack.length === 1 && !bottoni.btnRedoTemplateEditor.disabled);
}

console.log('\n--- Annulla con un blocco in mano non lo fa sparire con Ripeti ---');
{
  const { ctx, bottoni } = accendi();
  const S = ctx.templateEditorState;
  const modifica = n => { ctx.salvaUndoSnapshotEditor(); S.pages = [{ v: n }]; };
  modifica(1); modifica(2);
  ctx.undoTemplateEditor();                       // a 1, Ripeti → 2
  // Prendere un blocco: snapshot, blocco tolto dalle pagine e tenuto in mano.
  ctx.salvaUndoSnapshotEditor(); S.pages = [{ v: 'pagina-senza-il-blocco' }]; S.bloccoInSpostamento = { id: 'bX' };
  ctx.undoTemplateEditor();
  t('il blocco torna al suo posto e la mano si svuota', S.pages[0].v === 1 && S.bloccoInSpostamento === null);
  t('lo stato "blocco fuori dal foglio" non è ripetibile', S.redoStack.every(s => s.indexOf('pagina-senza-il-blocco') < 0));
  t('Ripeti torna quello di prima di prenderlo', S.redoStack.length === 1 && !bottoni.btnRedoTemplateEditor.disabled);
  ctx.redoTemplateEditor();
  t('e porta dove portava', S.pages[0].v === 2);
}

console.log('\n--- Tetto di 30 passi, in tutte e due le direzioni ---');
{
  const { ctx } = accendi();
  const S = ctx.templateEditorState;
  for (let n = 1; n <= 40; n++) { ctx.salvaUndoSnapshotEditor(); S.pages = [{ v: n }]; }
  t('Annulla tiene gli ultimi 30', S.undoStack.length === 30);
  for (let k = 0; k < 30; k++) ctx.undoTemplateEditor();
  t('annullando tutto si arriva al passo più vecchio conservato', S.pages[0].v === 10 && S.redoStack.length === 30);
  for (let k = 0; k < 30; k++) ctx.redoTemplateEditor();
  t('e ripetendo tutto si torna all\'ultimo', S.pages[0].v === 40 && S.undoStack.length === 30 && S.redoStack.length === 0);
  t('dopo Annulla/Ripeti non resta una cronologia "da restituire" appartenente a un altro snapshot',
    S.redoStackScartato.length === 0);
}

console.log('\n--- Riquadri: la parola resta, lo stato si vede ---');
{
  const { ctx, bottoni, classi, attributi } = accendi();
  const S = ctx.templateEditorState;
  S.previewMode = false;
  let esploso = null;
  try { ctx.aggiornaBottoneAnteprimaPulita(); } catch (e) { esploso = e.message; }
  t('non scrive più colori in linea sul bottone', esploso === null);
  t('riquadri visibili → acceso', classi.has('premuto') && attributi['aria-pressed'] === 'true');
  S.previewMode = true;
  ctx.aggiornaBottoneAnteprimaPulita();
  t('riquadri nascosti → spento', !classi.has('premuto') && attributi['aria-pressed'] === 'false');
  t('l\'etichetta non cambia parola', bottoni.lblBtnTemplatePreviewMode.textContent === 'Riquadri');
  t('il suggerimento dice cosa farà il prossimo clic', /Premi per tornare a mostrare/.test(bottoni.btnTemplatePreviewMode.title));
}

console.log('\n--- Lo script che contiene tutto questo si analizza senza errori ---');
{
  const inizio = src.lastIndexOf('<script', src.indexOf('function redoTemplateEditor('));
  const apertura = src.indexOf('>', inizio) + 1;
  const fine = src.indexOf('</script>', apertura);
  let errore = null;
  try { new vm.Script(src.slice(apertura, fine), { filename: 'Modulo1_integrato.html' }); } catch (e) { errore = e.message; }
  t('nessun errore di sintassi', errore === null);
  if (errore) console.log('        ', errore);
}

console.log(`\n${ok} ok, ${ko} KO`);
process.exit(ko ? 1 : 0);
