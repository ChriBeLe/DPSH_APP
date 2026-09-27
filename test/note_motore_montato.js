// VERIFICA DEL MONTAGGIO: il motore incluso NEL FILE DELL'APP (non quello in note-editor/)
// legge le note vere, non perde niente, e tutti i comandi che la barra chiama esistono davvero.
const fs=require('fs');
const { JSDOM } = require('jsdom');
if (!globalThis.requestAnimationFrame) globalThis.requestAnimationFrame = (f) => setTimeout(f, 0);
const P=__dirname + '/../dist/DPSH.html';
const src=fs.readFileSync(P,'utf8');

const dom = new JSDOM('<!DOCTYPE html><body><div id="ed"></div></body>', { pretendToBeVisual: true });
const w = dom.window;
['window','document','navigator','Node','Element','HTMLElement','DocumentFragment','DOMParser','getComputedStyle','MutationObserver','Range','Selection']
  .forEach(k => { if (!(k in globalThis) && w[k]) globalThis[k] = w[k]; });
globalThis.window = w; globalThis.document = w.document;

// Il motore si prende DAL FILE DELL'APP: e' quello che girera' sul telefono.
const apri = '<script id="motoreNote">\n';
const i = src.indexOf(apri) + apri.length;
const bundle = src.slice(i, src.indexOf('\n    </' + 'script>\n', i));
eval(bundle);
const { Editor, ESTENSIONI } = globalThis.NoteEditor;

const righe = src.split('\n');
function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
  throw new Error('fine non trovata: '+nome);
}
const NOMI=['convertiNotaAlNuovoSchema','invariantiNota','confrontaInvariantiNota','noteHtmlToPlainText','noteHtmlToMarkdown'];
const api=new Function('DOMParser','document','Node', NOMI.map(corpo).join('\n\n')+'\nreturn {'+NOMI.join(',')+'};')(w.DOMParser,w.document,w.Node);

let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };
const nuovoEditor = (html) => new Editor({ element: document.createElement('div'), extensions: ESTENSIONI, content: html || '' });

// ---------------------------------------------------------------------------
// 1. UNA NOTA CHE CONTIENE TUTTO QUELLO CHE IL VECCHIO EDITOR SAPEVA PRODURRE
// ---------------------------------------------------------------------------
const NOTA_VECCHIA =
  `Appunti del 12 marzo` +                                    // testo nudo alla radice
  `<h1>Sopralluogo</h1>` +
  `<p>Terreno <b>molto</b> umido, <i>argilla</i> in <u>superficie</u>, <strike>sabbia</strike>.</p>` +
  `<div class="note-check-item checked"><label class="note-check-label" contenteditable="false"><input type="checkbox" class="note-check-box" checked=""></label><span class="note-check-text">Foto del pozzo</span></div>` +
  `<div class="note-check-item"><label class="note-check-label" contenteditable="false"><input type="checkbox" class="note-check-box"></label><span class="note-check-text">Misura falda</span></div>` +
  `<div class="note-check-item checked"><label class="note-check-label" contenteditable="false"><input type="checkbox" class="note-check-box" checked=""></label><span class="note-check-text">Campione S1</span></div>` +
  `<blockquote>Il committente chiede una seconda prova.</blockquote>` +
  `<ul><li>ciottoli a 1,2 m</li><li>cavita a 3,0 m</li></ul>` +
  `<p><span style="background-color: rgb(254, 240, 138);">attenzione al livello</span></p>` +
  `<p><font color="#c00000">rifare la misura</font></p>` +
  `<table class="note-table"><tbody><tr><th>Prof.</th><th>Nota</th></tr><tr><td>1,2</td><td>ciottoli</td></tr></tbody></table>` +
  `<img data-note-img-id="nimg_a" src="" style="width: 50%; max-width: 100%; height: auto;">` +
  `<p>freccia <img data-note-img-id="nimg_b" src="" class="note-inline-shape" data-note-inline="1" style="width: 32px; height: 32px;"></p>` +
  `<p style="text-align: center">Firma del direttore lavori</p>` +
  `<h2 style="text-align: right">Allegati</h2>` +
  `<hr>` +
  `<p><a href="https://esempio.it/scheda" target="_blank" rel="noopener">scheda tecnica</a></p>`;

const convertita = api.convertiNotaAlNuovoSchema(NOTA_VECCHIA);
const ed = nuovoEditor(convertita);
const uscita = ed.getHTML();

console.log('--- 1. Il giro completo: nota vecchia -> conversione -> motore -> HTML ---');
const perdite = api.confrontaInvariantiNota(api.invariantiNota(NOTA_VECCHIA), api.invariantiNota(uscita));
console.log('       perdite dichiarate:', perdite.length ? perdite.join(' | ') : 'nessuna');
t('nessuna perdita secondo gli invarianti', perdite.length === 0);
t('il testo nudo iniziale non e sparito', /Appunti del 12 marzo/.test(uscita));
t('titolo', /<h1>Sopralluogo<\/h1>/.test(uscita));
t('grassetto/corsivo/sottolineato/barrato', /<strong>molto<\/strong>/.test(uscita) && /<em>argilla<\/em>/.test(uscita) && /<u>superficie<\/u>/.test(uscita) && /<s>sabbia<\/s>/.test(uscita));
t('3 voci di lista di controllo in UNA lista', (uscita.match(/data-type="taskItem"/g)||[]).length===3 && (uscita.match(/data-type="taskList"/g)||[]).length===1);
t('2 voci spuntate', (uscita.match(/data-checked="true"/g)||[]).length===2);
t('citazione', /<blockquote>/.test(uscita));
t('elenco puntato con 2 voci', (uscita.match(/<li><p>/g)||[]).length===2);
t('evidenziazione, col suo colore', /<mark[^>]*>attenzione al livello<\/mark>/.test(uscita));
t('colore del testo (il vecchio <font color>)', /color: ?(#c00000|rgb\(192, 0, 0\))/i.test(uscita));
t('tabella con intestazione e celle', /<table/.test(uscita) && /<th[^>]*>/.test(uscita) && /ciottoli/.test(uscita));
t('foto: id verso IndexedDB e dimensione scelta', /data-note-img-id="nimg_a"/.test(uscita) && /width: 50%/.test(uscita));
t('forma in linea: classe, marcatore e misura', /note-inline-shape/.test(uscita) && /data-note-inline="1"/.test(uscita) && /width: 32px/.test(uscita));
t('linea divisoria', /<hr>/.test(uscita));
t('link, con indirizzo intatto', /href="https:\/\/esempio\.it\/scheda"/.test(uscita));
t('allineamento al centro su un paragrafo', /<p style="text-align: center;?">Firma del direttore lavori<\/p>/.test(uscita));
t('allineamento a destra su un titolo', /<h2 style="text-align: right;?">Allegati<\/h2>/.test(uscita));

console.log('--- 2. Stabilita: riaprire non degrada ---');
const secondoGiro = nuovoEditor(uscita).getHTML();
t('secondo giro identico al primo', secondoGiro === uscita);

console.log('--- 3. Gli export dicono le stesse cose prima e dopo ---');
const norm = s2 => s2.replace(/\s+/g,'').trim();  // contenuto e ordine, non spaziatura
const txtPrima = norm(api.noteHtmlToPlainText(NOTA_VECCHIA)), txtDopo = norm(api.noteHtmlToPlainText(uscita));
t('stesso testo esportato', txtPrima === txtDopo);
if (txtPrima !== txtDopo) { console.log('       PRIMA: ' + JSON.stringify(txtPrima)); console.log('       DOPO : ' + JSON.stringify(txtDopo)); }
const vociMd = h => (api.noteHtmlToMarkdown(h).match(/- \[[x ]\]/g)||[]).length;
const spunteMd = h => (api.noteHtmlToMarkdown(h).match(/- \[x\]/g)||[]).length;
t('markdown: 3 voci di controllo prima e dopo', vociMd(NOTA_VECCHIA)===3 && vociMd(uscita)===3);
t('markdown: 2 spuntate prima e dopo', spunteMd(NOTA_VECCHIA)===2 && spunteMd(uscita)===2);
t('markdown: il link sopravvive in entrambe', /\(https:\/\/esempio\.it\/scheda\)/.test(api.noteHtmlToMarkdown(NOTA_VECCHIA)) && /\(https:\/\/esempio\.it\/scheda\)/.test(api.noteHtmlToMarkdown(uscita)));

// ---------------------------------------------------------------------------
// 4. OGNI COMANDO CHE LA BARRA CHIAMA ESISTE DAVVERO SUL MOTORE
//    (un nome sbagliato qui sarebbe un pulsante muto, e nessun errore a schermo)
// ---------------------------------------------------------------------------
console.log('--- 4. I comandi cablati nella barra esistono sul motore ---');
const zi = src.indexOf("IL MOTORE DELL'EDITOR");
const zf = src.indexOf('STRUMENTO DI DISEGNO', zi);
if (zi < 0 || zf < 0) { console.log('  KO  non trovo la zona del codice delle note nel file'); process.exit(1); }
const zona = src.slice(zi, zf);
const chiamati = new Set();
// forma diretta:  .chain().focus().nomeComando(
for (const m of zona.matchAll(/\.focus\(\)\s*\.([A-Za-z][A-Za-z0-9]*)\(/g)) chiamati.add(m[1]);
// forma a tabella: 'chiave': 'nomeComando'  dentro le mappe COMANDI_* / AZIONI_*
for (const blocco of zona.matchAll(/(?:COMANDI_MARCATORE_NOTA|AZIONI_TABELLA)\s*=\s*\{([^}]*)\}/g))
  for (const m of blocco[1].matchAll(/:\s*'([A-Za-z][A-Za-z0-9]*)'/g)) chiamati.add(m[1]);
const disponibili = new Set(Object.keys(ed.commands));
const mancanti = [...chiamati].filter(c => !disponibili.has(c));
console.log('       comandi trovati nel codice (' + chiamati.size + '):', [...chiamati].sort().join(', '));
t('nessun comando inesistente', mancanti.length === 0);
if (mancanti.length) console.log('       MANCANTI:', mancanti.join(', '));
t('sono almeno 18 comandi, non due per sbaglio', chiamati.size >= 18);

console.log('--- 5. I comandi funzionano davvero, non solo esistono ---');
try {
let e2 = nuovoEditor('<p>una riga</p>');
e2.chain().focus().selectAll().toggleBold().run();
t('grassetto', /<strong>/.test(e2.getHTML()));
// Da qui in poi si riparte con il cursore dentro il testo, non con "tutto selezionato":
// su una selezione che copre l'intero documento isActive non risponde (e non e' un difetto
// dell'app — nella barra il cursore e' sempre dentro una riga).
e2 = nuovoEditor('<p>una riga</p>');
e2.chain().focus().run();
e2.chain().focus().toggleHighlight({ color: '#fef08a' }).run();
t('evidenziatore acceso', e2.isActive('highlight'));
e2.chain().focus().toggleHighlight({ color: '#fef08a' }).run();
t('lo stesso colore lo SPEGNE (era il difetto di hiliteColor)', !e2.isActive('highlight'));
e2.chain().focus().toggleTaskList().run();
t('lista di controllo', e2.isActive('taskList'));
e2.chain().focus().toggleTaskList().run();
e2.chain().focus().toggleBlockquote().run();
t('citazione', e2.isActive('blockquote'));
e2.chain().focus().toggleBlockquote().run();
t('ripremere la citazione la toglie (non ne annida un altra)', !e2.isActive('blockquote'));
e2.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run();
t('tabella inserita', e2.isActive('table'));
const primaDiRiga = (e2.getHTML().match(/<tr>/g)||[]).length;
e2.chain().focus().addRowAfter().run();
t('una riga in piu nella tabella', (e2.getHTML().match(/<tr>/g)||[]).length === primaDiRiga + 1);
e2.chain().focus().deleteTable().run();
t('tabella eliminata', !e2.isActive('table'));
const primaDiAnnulla = e2.getHTML();
e2.chain().focus().insertContent({ type: 'image', attrs: { 'data-note-img-id': 'nimg_z', src: 'data:image/png;base64,AAA' } }).run();
t('immagine inserita come nodo', /nimg_z/.test(e2.getHTML()));
e2.chain().focus().undo().run();
t('L ANNULLA DISFA ANCHE L IMMAGINE', !/nimg_z/.test(e2.getHTML()) && e2.getHTML() === primaDiAnnulla);

} catch (err) { ko++; console.log('  KO  eccezione nella prova dei comandi: ' + err.message); }

// ---------------------------------------------------------------------------
// 6. IL CABLAGGIO NEL FILE
// ---------------------------------------------------------------------------
console.log('--- 6. Il file dell app e cablato di conseguenza ---');
t('il motore e incluso nel file', src.includes('<script id="motoreNote">') && bundle.length > 300000);
t('noteEditorBody non e piu un contenteditable', !/id="noteEditorBody"[^>]*contenteditable/.test(src));
// Era: "l'editor del template invece resta un contenteditable". Non e' piu' vero, ed e' una
// scelta: il testo generato del capitolo introduttivo contiene una tabella, e execCommand non
// la sa nemmeno inserire. Ora il motore e' montato in tutti e due.
t('anche l editor di testo dei template e passato al motore',
   !/id="tplTextEditorBody"[^>]*contenteditable/.test(src) && /function creaEditorTesto\(\)/.test(src));
t('nessun execCommand rimasto nel codice delle note (solo commenti)',
  !zona.split('\n').some(r => r.includes('execCommand') && !r.trim().startsWith('//') && !r.trim().startsWith('*')));
['restoreNoteSelectionIfNeeded','noteSavedSelectionRange','aggiornaStatoFormatButtons','applyNoteFormatBlock','creaElementoChecklist','deselezionaImmagineNota']
  .forEach(n => t('rimosso il vecchio impianto: ' + n, !zona.includes(n + ' =') && !zona.includes('function ' + n)));
t('la barra della tabella esiste nell HTML', src.includes('id="noteTableBar"') && src.includes('data-tab-cmd="riga-dopo"'));
t('la riga di conferma della conversione esiste', src.includes('id="noteConversioneRow"') && src.includes('id="btnNoteRipristinaPrima"') && src.includes('id="btnNoteScaricaPrima"'));
t('gli export leggono dal motore, non dal contenitore', !src.includes('noteEditorBody.innerHTML)') && (src.match(/htmlNotaCorrente\(\)/g)||[]).length >= 6);
t('la copia pre-conversione viene alleggerita prima di localStorage', src.includes('stripNoteImagesHtml(proj.notes.htmlPrimaDelMotore)'));
t('il CSS della lista di controllo nuova c e nell app, in stampa e in Word',
  (src.match(/ul\[data-type="taskList"\]/g)||[]).length >= 12);

// ---------------------------------------------------------------------------
// 6-bis. LE SCORCIATOIE DI SCRITTURA
//   Non le abbiamo aggiunte noi: vengono con lo schema. Ma se non si misurano non si
//   possono promettere, e su un telefono in cantiere sono il guadagno piu' grosso di
//   tutti — il viaggio dito -> barra -> dito sparisce.
// ---------------------------------------------------------------------------
console.log('--- 6-bis. Scrivere senza toccare la barra ---');
{
  const digita = (ed, testo) => {
    for (const ch of testo) {
      const { view } = ed;
      const { from, to } = view.state.selection;
      if (!view.someProp('handleTextInput', f => f(view, from, to, ch)))
        view.dispatch(view.state.tr.insertText(ch, from, to));
    }
  };
  const prova = (testo) => { const ed = nuovoEditor('<p></p>'); ed.commands.focus(); digita(ed, testo); return ed.getHTML(); };
  t('"# " diventa un titolo',            /<h1>Sopralluogo<\/h1>/.test(prova('# Sopralluogo')));
  t('"- " diventa un elenco',            /<ul><li><p>ciottoli/.test(prova('- ciottoli')));
  t('"[] " diventa una lista di controllo', /data-type="taskList"/.test(prova('[] misura falda')));
  t('"> " diventa una citazione',        /<blockquote><p>il committente/.test(prova('> il committente')));
  t('"**testo**" si mette in grassetto', /<strong>importante<\/strong>/.test(prova('nota **importante** qui')));
  t('"--- " diventa una linea',          /<hr>/.test(prova('--- ')));
  t('"1. " diventa un elenco numerato',  /<ol><li><p>primo/.test(prova('1. primo')));
  const edAll = nuovoEditor('<p>riga</p>');
  edAll.commands.focus();
  t('il comando di allineamento esiste', typeof edAll.commands.impostaAllineamento === 'function');
  edAll.chain().focus().impostaAllineamento('justify').run();
  t('giustificato', /text-align: justify/.test(edAll.getHTML()));
  edAll.chain().focus().togliAllineamento().run();
  t('e si toglie', !/text-align/.test(edAll.getHTML()));
}

// ---------------------------------------------------------------------------
// 7. LA PAGINA SI MONTA DAVVERO COSI' COM'E' SCRITTA
//    (un tag mal chiuso nell'HTML non da' errori: sposta soltanto i pezzi altrove)
// ---------------------------------------------------------------------------
console.log('--- 7. La finestra delle note e montata come previsto ---');
{
  const pagina = new JSDOM(src, { runScripts: 'outside-only' }).window.document;
  const modale = pagina.getElementById('modalProjectNotes');
  const dentro = (id) => { const el = pagina.getElementById(id); return !!(el && modale && modale.contains(el)); };
  t('la finestra delle note esiste', !!modale);
  ['noteToolbar','noteTableBar','noteImageSizeBar','noteEditorBody','noteConversioneRow']
    .forEach(id => t('dentro la finestra: #' + id, dentro(id)));
  const corpo = pagina.getElementById('noteEditorBody');
  t('il contenitore dell editor e vuoto (lo riempie il motore)', corpo && corpo.children.length === 0);
  t('non e piu contenteditable', corpo && !corpo.hasAttribute('contenteditable'));
  t('ha ancora il segnaposto', corpo && !!corpo.getAttribute('data-placeholder'));
  const barraTab = pagina.getElementById('noteTableBar');
  t('la barra tabella ha 6 comandi', barraTab && barraTab.querySelectorAll('[data-tab-cmd]').length === 6);
  t('la barra tabella nasce nascosta', barraTab && /display:\s*none/.test(barraTab.getAttribute('style')||''));
  const conv = pagina.getElementById('noteConversioneRow');
  t('la riga di conversione nasce nascosta', conv && /display:\s*none/.test(conv.getAttribute('style')||''));
  t('e ha i tre tasti', conv && ['btnNoteScaricaPrima','btnNoteRipristinaPrima','btnNoteConversioneOk'].every(id => !!conv.querySelector('#'+id)));
  t('i 19 comandi della barra sono ancora tutti li',
     pagina.querySelectorAll('#noteToolbar .note-tb-btn').length >= 19);
  t('anche il contenitore del testo template e vuoto, pronto per il motore',
     pagina.getElementById('tplTextEditorBody')
     && !pagina.getElementById('tplTextEditorBody').hasAttribute('contenteditable')
     && pagina.getElementById('tplTextEditorBody').children.length === 0);
  t('gli elenchi numerati hanno una regola CSS (li produce "1. ")',
     /\.note-editor-body ol\s*\{/.test(src) && /\.note-print-body ol\s*\{/.test(src));
}

console.log('\nTOTALE: ' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
