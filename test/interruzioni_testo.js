// L'INTERRUZIONE DI PAGINA E LE REGOLE DEL PARAGRAFO.
//
// Quello che l'autore decide non e' DOVE si taglia — quello dipende da corpo, carattere e
// larghezza, e cambia da solo appena si tocca una di quelle tre — ma QUALI paragrafi non si
// possono tagliare. E' il modello di Word, e funziona da trent'anni perche' e' la domanda a
// cui un autore sa rispondere.
//
// Il controllo che conta di piu' qui e' l'ANDATA E RITORNO nel motore vero: lo schema di
// ProseMirror scarta in silenzio tutto cio' che non e' dichiarato, ed e' il difetto che in
// questo progetto ha gia' fatto sparire dati una volta. Un attributo che si scrive ma non si
// rilegge e' peggio di un attributo assente: sembra funzionare finche' non si riapre il file.
const fs = require('fs');
const { JSDOM } = require('jsdom');
const src = fs.readFileSync(__dirname + '/../dist/DPSH.html', 'utf8');
const codice = src.split('\n').filter(r => !/^\s*(\/\/|\*|\/\*)/.test(r)).join('\n');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };

// ---- il motore vero, estratto dal file e acceso ----
const motore = (() => {
  const i = src.indexOf('<script id="motoreNote">');
  return src.slice(src.indexOf('>', i) + 1, src.indexOf('</script>', i));
})();
const dom = new JSDOM('<div id="e"></div>', { pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.DOMParser = dom.window.DOMParser;
global.Node = dom.window.Node;
dom.window.Element.prototype.scrollIntoView = function () {};
eval(motore);
const NE = globalThis.NoteEditor;

console.log('--- Il motore conosce i due concetti nuovi ---');
const ed = new NE.Editor({ element: document.getElementById('e'), extensions: NE.ESTENSIONI, content: '<p>uno</p><p>due</p>' });
t('l interruzione di pagina e un nodo dello schema, non un simbolo riciclato',
   !!ed.schema.nodes.interruzionePagina);
t('ed e un ATOMO: non ci si scrive dentro, si seleziona intera', ed.schema.nodes.interruzionePagina.isAtom);
t('il comando per inserirla esiste', typeof ed.commands.inserisciInterruzionePagina === 'function');
t('e quello per la regola del paragrafo', typeof ed.commands.impostaRegolaPagina === 'function');

console.log('--- Si inseriscono, e si rileggono: ANDATA E RITORNO ---');
{
  ed.commands.setContent('<p>uno</p><p>due</p>');
  ed.commands.setTextSelection(4);
  ed.commands.inserisciInterruzionePagina();
  const conInterruzione = ed.getHTML();
  t('l interruzione finisce nel documento', /data-interruzione-pagina="manuale"/.test(conInterruzione));
  t('e non si mangia il testo intorno', /<p>uno<\/p>/.test(conInterruzione) && /<p>due<\/p>/.test(conInterruzione));

  ed.commands.setTextSelection(2);
  ed.commands.impostaRegolaPagina('non-spezzare');
  const conRegola = ed.getHTML();
  t('la regola si scrive sul paragrafo', /<p data-regola-pagina="non-spezzare">uno<\/p>/.test(conRegola));

  // IL CONTROLLO CHE CONTA. Si riapre quello che si e' scritto: se lo schema non dichiarasse
  // l'attributo, qui tornerebbe un <p> nudo — e nessuno se ne accorgerebbe fino alla stampa.
  ed.commands.setContent(conRegola);
  t('RIAPRENDO IL DOCUMENTO non si perde niente: ne l interruzione ne la regola',
     ed.getHTML() === conRegola);

  ed.commands.setTextSelection(2);
  ed.commands.impostaRegolaPagina(null);
  t('togliendo la regola l attributo SPARISCE, invece di restare vuoto',
     !/data-regola-pagina/.test(ed.getHTML()));

  t('e una regola inventata viene rifiutata, non scritta',
     ed.commands.impostaRegolaPagina('qualunque-cosa') === false);

  // Anche sui titoli: un titolo che deve cominciare in pagina nuova e' il caso piu' comune.
  ed.commands.setContent('<h2>2. Prove penetrometriche</h2><p>testo</p>');
  ed.commands.setTextSelection(3);
  ed.commands.impostaRegolaPagina('pagina-nuova');
  t('le regole valgono anche per i titoli', /<h2 data-regola-pagina="pagina-nuova">/.test(ed.getHTML()));
}

console.log('--- I comandi ci sono, dove si scrive ---');
{
  t('il tasto dell interruzione, con la scorciatoia di Word nel titolo',
     /data-comando-nota="interruzione"[^>]*Ctrl\+Invio/.test(src));
  // LA SCORCIATOIA SI PROVA PREMENDOLA, non cercandola in un pacchetto minificato — dove i
  // nomi sono compressi e una ricerca testuale direbbe "no" anche quando funziona.
  // E c'era un conflitto vero da escludere: StarterKit lega Mod-Enter all'a-capo forzato
  // (hardBreak). Se avesse vinto quello, Ctrl+Invio avrebbe messo un <br> invece del salto
  // pagina — un comando che sembra rispondere ma fa un'altra cosa, il peggio.
  {
    ed.commands.setContent('<p>uno</p>');
    ed.commands.setTextSelection(3);
    ed.view.dom.dispatchEvent(new dom.window.KeyboardEvent('keydown',
        { key: 'Enter', code: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }));
    const dopo = ed.getHTML();
    t('PREMENDO Ctrl+Invio compare davvero l interruzione', /data-interruzione-pagina/.test(dopo));
    t('e NON l a-capo forzato, che si contende la stessa scorciatoia', !/<br/.test(dopo));
  }
  t('la tendina delle quattro possibilita', ['', 'non-spezzare', 'con-successivo', 'pagina-nuova']
     .every(v => src.includes('<option value="' + v + '">')));
  // SEGNALATO: «non ho capito a che serve quel menu a tendina». Diceva «impaginazione
  // normale», che e' il nome della cosa per chi l'ha scritta, non per chi la legge: nessuna
  // delle quattro voci diceva DI COSA parlasse. Ora ogni voce comincia dalla domanda —
  // «Fine pagina:» — e il titolo aggiunge l'altra meta' che mancava: non sposta niente
  // adesso, e' una regola che vale in stampa.
  t('ogni voce dice DI COSA parla, prima di dire cosa fa',
     ['Fine pagina: si spezza', 'Fine pagina: non spezzarlo',
      'Fine pagina: tienilo col dopo', 'Fine pagina: comincia in una nuova']
     .every(v => src.includes('>' + v + '</option>')));
  t('e il titolo dice che e una regola di stampa, non un comando immediato',
     /Non sposta niente adesso: e' una regola che vale in stampa/.test(src));
  t('la tendina segue il cursore, invece di restare ferma sull ultima scelta',
     /if \(document\.activeElement !== sel\) sel\.value = stato\.regolaPagina \|\| ''/.test(codice));
  t('e la stringa vuota diventa null: l attributo deve sparire, non restare vuoto',
     /impostaRegolaPagina\(selReg\.value \|\| null\)/.test(codice));
}

console.log('--- Come si vede scrivendo, e come esce in stampa ---');
{
  t('nell editor e una riga tratteggiata', /\.dpsh-interruzione \{[^}]*border-top: 2px dashed/.test(codice));
  t('con scritto sopra cosa fa, invece di un simbolo da interpretare',
     /\.dpsh-interruzione::after \{ content: 'interruzione di pagina'/.test(codice));
  t('i paragrafi con una regola hanno un segno discreto a margine',
     /\.ProseMirror \[data-regola-pagina\]::before/.test(codice));

  // IN STAMPA L'INTERRUZIONE NON SI VEDE: e' un salto, non un segno.
  t('IN STAMPA la riga tratteggiata sparisce', /\[data-interruzione-pagina\] \{\s*border: none; height: 0; margin: 0;/.test(codice));
  t('e diventa un salto pagina vero', /\[data-interruzione-pagina\] \{[\s\S]{0,120}break-before: page; page-break-before: always;/.test(codice));
  t('anche l etichetta sparisce, o comparirebbe nel PDF',
     /\[data-interruzione-pagina\]::after \{ content: none; \}/.test(codice));

  t('«non spezzare» diventa break-inside: avoid',
     /\[data-regola-pagina="non-spezzare"\] \{ break-inside: avoid-page/.test(codice));
  t('«tienilo col successivo» diventa break-after: avoid',
     /\[data-regola-pagina="con-successivo"\] \{ break-after: avoid-page/.test(codice));
  t('«pagina nuova» diventa break-before: page',
     /\[data-regola-pagina="pagina-nuova"\] \{ break-before: page/.test(codice));

  // La regola che, da sola, toglie la gran parte degli aggiustamenti a mano.
  t('NIENTE RIGHE ORFANE O VEDOVE, senza doverlo chiedere',
     /\.tpl-block-richtext p \{ orphans: 2; widows: 2; \}/.test(codice));
}

console.log('--- Il pacchetto ricostruito, non rattoppato ---');
{
  // La tentazione era riusare l'<hr>, che esiste gia' nello schema e non avrebbe richiesto di
  // ricostruire il pacchetto. Ma sarebbe stato dare a un simbolo due significati.
  t('il motore nel file contiene davvero il nodo nuovo', /interruzionePagina/.test(motore));
  t('e l attributo delle regole', /regolaPagina/.test(motore));
  t('l <hr> resta quello che e, una linea: non e stato riciclato',
     !/horizontalRule[^;]{0,200}interruzione/i.test(motore));
  t('il sorgente dello schema e aggiornato insieme al pacchetto',
     /InterruzionePagina/.test(fs.readFileSync(__dirname + '/../tools/motore-note/schema.js', 'utf8')));
}

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko ? 1 : 0);
