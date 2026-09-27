// I TAG @ — riferimenti vivi, non testo cucinato.
//
// La richiesta aveva due meta' che sembravano in conflitto e non lo sono:
//   · il tag NON deve memorizzare il valore  → altrimenti un template fatto per Genzano
//     stampa la sede di Genzano anche su Capurso. E' il caso Roma/Brindisi, in un'altra forma.
//   · il tag DEVE mostrare il valore vero    → altrimenti non si vede l'impaginazione reale
//     mentre si compone, e una sede lunga manda a capo il paragrafo solo a PDF fatto.
// Si tengono insieme cosi': il documento porta il TIPO, la vista legge il VALORE.
const fs = require('fs');
const { JSDOM } = require('jsdom');
const src = fs.readFileSync(__dirname + '/../dist/DPSH.html', 'utf8');
const codice = src.split('\n').filter(r => !/^\s*(\/\/|\*|\/\*)/.test(r)).join('\n');
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };

const motore = (() => {
  const i = src.indexOf('<script id="motoreNote">');
  return src.slice(src.indexOf('>', i) + 1, src.indexOf('</script>', i));
})();
const dom = new JSDOM('<div id="e"></div>', { pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.DOMParser = dom.window.DOMParser;
global.Node = dom.window.Node;
dom.window.Element.prototype.scrollIntoView = function () {};

// Il cantiere che alimenta la vista: si cambia sotto i piedi al documento, ed e' proprio la
// prova che conta — lo stesso testo deve mostrare due sedi diverse.
let cantiere = { etichetta: 'Sede del committente', valore: 'Via dei Mille 3, Genzano' };
globalThis.risolviTagPerVista = () => cantiere;
eval(motore);
const NE = globalThis.NoteEditor;
const ed = new NE.Editor({ element: document.getElementById('e'), extensions: NE.ESTENSIONI, content: '<p>con sede in </p>' });

console.log('--- Il documento porta il TIPO, mai il valore ---');
{
  ed.commands.setTextSelection(13);
  ed.commands.inserisciTag('sedeCommittente');
  const html = ed.getHTML();
  t('il tag e un nodo dello schema', !!ed.schema.nodes.tagDato);
  t('ed e un ATOMO in linea: si seleziona intero, non ci si scrive dentro',
     ed.schema.nodes.tagDato.isAtom && ed.schema.nodes.tagDato.isInline);
  t('nel documento salvato c e il tipo', /data-tag="sedeCommittente"/.test(html));
  t('IL VALORE NON C E: e il motivo per cui non puo diventare falso', !/Genzano/.test(html));
  t('e riaprendo non si perde niente', (() => { ed.commands.setContent(html); return ed.getHTML() === html; })());
}

console.log('--- Ma a video il valore si vede, e cambia col progetto ---');
{
  ed.commands.setContent('<p>con sede in <span data-tag="sedeCommittente"></span></p>');
  const aVideo = () => document.getElementById('e').textContent;
  t('la pastiglia mostra il dato vero', /Via dei Mille 3, Genzano/.test(aVideo()));

  // IL CASO CHE HAI DESCRITTO: stesso template, altro cantiere. Il documento non cambia di
  // una virgola — cambia solo il progetto — quindi la vista va avvisata. Senza l'avviso la
  // pastiglia continuava a mostrare la sede di prima: e' il difetto che i tag esistono per
  // evitare, ricomparso un livello piu' in basso. Questo controllo l'ha trovato.
  cantiere = { etichetta: 'Sede del committente', valore: 'Corso Umberto 128, Capurso' };
  document.dispatchEvent(new dom.window.CustomEvent('dpsh-tag-aggiorna'));
  t('CAMBIANDO PROGETTO cambia anche quello che si legge', /Corso Umberto 128, Capurso/.test(aVideo()));
  t('e la vecchia sede non resta appiccicata da nessuna parte',
     !/Genzano/.test(aVideo()) && !/Genzano/.test(ed.getHTML()));

  // Il dato che manca non finge di esserci.
  cantiere = { etichetta: 'Sede del committente', valore: '' };
  document.dispatchEvent(new dom.window.CustomEvent('dpsh-tag-aggiorna'));
  const el = document.querySelector('#e .dpsh-tag');
  t('se il dato manca lo dice, invece di lasciare un buco', /Sede del committente/.test(el.textContent));
  t('e si vede che manca, non che e compilato', el.classList.contains('dpsh-tag-manca'));

  console.log('  · e l app avvisa le pastiglie quando il dato cambia');
  t('c e una funzione che lo fa', /function aggiornaPastiglieTag\(\)/.test(codice));
  t('la chiama chi cambia il cantiere dell anteprima',
     (codice.match(/previewProjectId = [^\n]*\n\s*aggiornaPastiglieTag\(\)/g) || []).length === 2);
  t('e chi corregge un dato toccando la pastiglia',
     /scriviDatoCantiere\(proj, def, esito\.valore\);\s*\n\s*aggiornaPastiglieTag\(\);/.test(codice));
  t('la vista sa ridisegnarsi senza essere ricreata', /update\(nuovo\) \{/.test(motore) || /update\(/.test(motore));
  // Il pacchetto e' minificato e usa le virgolette doppie: cercare quelle singole diceva "no"
  // su codice giusto. Si cerca la coppia rimuovi-ascoltatore + nome dell'evento, che e' cio'
  // che conta davvero — senza, ogni tag lascerebbe un ascoltatore appeso a ogni ridisegno.
  t('e smette di ascoltare quando sparisce, o resterebbero ascoltatori appesi',
     /removeEventListener\(["']dpsh-tag-aggiorna["']/.test(motore)
     || /dpsh-tag-aggiorna["'],\w+\)\}\}/.test(motore));
}

console.log('--- Il registro: uno solo, da cui prendono tutti ---');
{
  t('c e un elenco unico dei tag', /const TAG_DISPONIBILI = \[/.test(codice));
  t('con i dati del cantiere, quelli dell indagine, lo strumento e le figure',
     ['Cantiere', 'Indagine', 'Strumento', 'Riferimenti'].every(g => codice.includes("gruppo: '" + g + "'")));
  t('e le due informazioni che tipicamente arrivano dopo il cantiere',
     /tipo: 'sedeCommittente'[^}]*campo: 'sedeCommittente'/.test(codice)
     && /tipo: 'denominazioneIntervento'[^}]*campo: 'denominazioneIntervento'/.test(codice));
  // `campo` dice dove il dato vive: e' quello che rende possibile correggerlo da qui.
  t('i dati CALCOLATI non hanno un campo da correggere a mano',
     !/tipo: 'coeffCorrelazione'[^}]*campo:/.test(codice)
     && !/tipo: 'numeroProve'[^}]*campo:/.test(codice));
}

console.log('--- Il menu della chiocciola ---');
{
  t('e scritto a mano come plugin, non con un pacchetto in piu da riverificare',
     /function chiocciolaDavantiAlCursore\(\)/.test(codice));
  t('LA CHIOCCIOLA VALE SOLO A INIZIO PAROLA: un indirizzo di posta non apre il menu',
     /\(\?:\^\|\\s\)@/.test(codice));
  t('l elenco si filtra scrivendo', /t\.etichetta\.toLowerCase\(\)\.includes\(q\)/.test(codice));
  t('e mostra gia il valore, cosi si sceglie sapendo cosa si ottiene',
     /globalThis\.risolviTagPerVista\(t\.tipo\)/.test(codice));
  t('si naviga con le frecce e si conferma con Invio',
     /e\.key === 'ArrowDown'/.test(codice) && /e\.key === 'Enter'/.test(codice));
  t('e si annulla con Esc', /e\.key === 'Escape'/.test(codice));
  t('scegliendo, il testo "@qualcosa" viene cancellato e sostituito dal nodo',
     /deleteRange\(\{ from: ctx\.daPos, to: a \}\)\s*\n?\s*\.inserisciTag\(tipo\)/.test(codice));
  t('il menu compare sotto il cursore, non in un angolo', /coordsAtPos\(ed2\.state\.selection\.from\)/.test(codice));
  // I DUE EDITOR. Il menu era agganciato solo a quello delle note, e i tag servono soprattutto
  // nel blocco di testo del template: scrivendo @ non compariva niente. Ora si chiede chi ha
  // il fuoco, invece di darlo per scontato.
  t('e vale per l editor che ha il fuoco, non solo per le note', /function editorAttivo\(\)/.test(codice));
  t('il blocco di testo avvisa il menu a ogni battuta',
     /aggiornaSegnapostoTestoTemplate\(\);[\s\S]{0,200}?if \(globalThis\.__aggiornaMenuTag\)/.test(codice));
  t('e anche spostando il cursore, che pure puo portare la chiocciola davanti',
     /onSelectionUpdate: \(\) => \{[\s\S]{0,200}?if \(globalThis\.__aggiornaMenuTag\)/.test(codice));
  // E LA BARRA DICE DOVE SEI. aggiornaStatoBarraNote esisteva ed era gia' scritta per
  // l'editor attivo, ma qui non la chiamava nessuno: i pulsanti restavano spenti sempre,
  // e su un H1 contro un H2 non restava che indovinare.
  t('e i pulsanti seguono il cursore, invece di restare spenti',
     /onSelectionUpdate: \(\) => \{[\s\S]{0,120}?aggiornaStatoBarraNote\(\)/.test(codice));
  t('anche col cursore fermo, quando un marcatore e solo «in attesa»',
     /onTransaction: \(\) => \{ if \(typeof aggiornaStatoBarraNote === 'function'\) aggiornaStatoBarraNote\(\); \}/.test(codice));
  t('C E UN TASTO @: la funzione non esiste solo per chi indovina la scorciatoia',
     /data-comando-nota="inserisci-tag"/.test(src));
  t('che mette uno spazio davanti se serve, o il menu non si aprirebbe',
     /const prefisso = \(testoPrima === '' \|\| \/\\s\$\/\.test\(testoPrima\)\) \? '@' : ' @';/.test(codice));
}

console.log('--- Toccare la pastiglia: si compila SUL PROGETTO ---');
{
  t('toccandola si apre il campo',
     /const pastiglia = e\.target\.closest\('\.dpsh-tag\[data-tag\], \.dato-cantiere\[data-dato\]'\);/.test(codice));
  t('e vale per entrambe le forme: il tag scritto a mano e il segnaposto generato',
     /const chiave = pastiglia\.getAttribute\('data-tag'\) \|\| pastiglia\.getAttribute\('data-dato'\);/.test(codice));
  t('il tocco non seleziona anche il blocco sotto: sono due gesti',
     /e\.preventDefault\(\);\s*\n\s*e\.stopPropagation\(\);/.test(codice));
  t('gia compilato con quello che c e, se c e', /const attuale = proj\[def\.campo\] \|\| ''/.test(codice));
  // LA FINESTRA DICEVA «Inserisci / [object Object]». appPrompt vuole (messaggio, valore,
  // opzioni) e le si passava un oggetto: il messaggio finiva stampato cosi', il titolo
  // ripiegava sul generico, e — peggio — il valore di ritorno di appPrompt e' una STRINGA
  // mentre il codice leggeva `esito.v`: confermare avrebbe scritto `undefined` nel cantiere.
  t('la finestra dei campi e quella giusta, con piu di un pezzo di informazione',
     /const esito = await appPromptCampi\(/.test(codice));
  // E LA FIRMA SBAGLIATA NON DEVE ESSERE RIMASTA DA NESSUNA PARTE: era in due posti, la
  // finestra dei tag e quella per salvare un servizio WMS. Entrambe mostravano
  // «[object Object]» e poi leggevano una proprieta' che su una stringa non esiste.
  t('e da nessuna parte si chiama appPrompt con un oggetto', !/await appPrompt\(\{/.test(codice));
  t('IL TITOLO DICE QUALE DATO', /title: 'Compila: ' \+ def\.etichetta/.test(codice));
  t('E IL MESSAGGIO DICE DI QUALE CANTIERE', /'Cantiere: ' \+ dove/.test(codice));
  t('con un nome che distingue due cantieri omonimi', /function nomeProgettoPerAvviso\(proj\)/.test(codice));

  // DOVE FINISCE IL DATO. comune, localita' e committente vivono nell'INTESTAZIONE DI OGNI
  // PROVA: la copia sul progetto e' derivata, e syncStateToProject la riscrive da capo a ogni
  // salvataggio della prova aperta. Scriverli solo sul progetto voleva dire vederli sparire
  // poco dopo, in silenzio — e nel frattempo la scheda «Intestazione cantiere» avrebbe
  // continuato a mostrare il valore vecchio.
  t('E LA CORREZIONE VA DOVE IL DATO VIVE DAVVERO',
     /function scriviDatoCantiere\(proj, def, valore\)/.test(codice));
  t('il registro dichiara la casa di ogni dato', /dove: 'prova'/.test(codice) && /dove: 'progetto'/.test(codice));
  t('i dati della prova si scrivono in TUTTE le prove del cantiere',
     /if \(def\.dove === 'prova'\) \{\s*\n\s*Object\.values\(proj\.surveys \|\| \{\}\)\.forEach/.test(codice));
  t('e nello stato vivo, se e il cantiere aperto: altrimenti la scheda mostra il valore vecchio',
     /if \(proj\.id === state\.currentProjectId\) \{\s*\n\s*if \(!state\.header\) state\.header = \{\};/.test(codice));
  t('e il foglio si ridisegna, cosi si vede subito la nuova impaginazione',
     /renderTemplateEditorCanvas\(\);\s*\n\s*\}\);\s*\n\s*\}/.test(codice));
  t('un dato calcolato dice come si corregge, invece di aprire un campo inutile',
     /l\\'app lo calcola da sola, dalle prove e dallo strumento/.test(codice));
  t('e dice anche quanto vale adesso, che e la domanda vera di chi lo tocca',
     /'\\n\\nValore attuale: ' \+ \(r\.valore \|\| '— non ancora disponibile'\)/.test(codice));
}

console.log('--- In stampa: solo li il valore si cucina ---');
{
  t('c e una risoluzione dedicata alla stampa', /function risolviTagInStampa\(html, ctx, blockObj\)/.test(codice));
  // IL BLOCCO SI PASSA DA SOLO. Un riferimento alla figura deve sapere DOVE si trova per
  // poter dire «la piu' vicina»: senza, «la foto della prova» in un fascicolo di cinque
  // verticali avrebbe puntato sempre alla stessa.
  t('e il blocco di testo ci passa, se stesso compreso',
     /marcaTitoliPerIndice\(risolviTagInStampa\(blockObj\.richHtml, ctx, blockObj\), \(typeof templateEditorState/.test(codice));
  // IL PROGETTO DELLA STAMPA NON E' QUELLO DELL'ANTEPRIMA: confonderli vorrebbe dire
  // stampare i dati del cantiere sbagliato.
  t('il progetto si prende dal contesto della prova che si sta stampando',
     /const proj = \(ctx && ctx\.projId && state\.projects\) \? state\.projects\[ctx\.projId\] : null;/.test(codice));
  t('un dato mancante esce fra parentesi quadre, come gli altri segnaposto',
     /el\.textContent = '\[' \+ etichettaTag\(tipo, valori\) \+ '\]';/.test(codice));
  // NON BASTA CHE IL CODICE CHIEDA ctx.projId: qualcuno deve darglielo. Questi due controlli
  // esistono perche' nessuno lo faceva, ne' l'anteprima ne' la stampa, e i 45 controlli che
  // c'erano erano tutti verdi lo stesso: leggevano la domanda, mai la risposta.
  t('E QUALCUNO GLIELO DA: l anteprima dell editor', /^\s*projId: previewProjId,$/m.test(codice));
  t('e la stampa vera', /projId: \(projData && projData\.id\) \|\| state\.currentProjectId,/.test(codice));
  // I DUE ELENCHI. valoriCantiere sa trenta chiavi, il registro dei tag ne dichiarava
  // diciotto: le altre uscivano stampate col nome grezzo della variabile, «[fraseSondaggi]»,
  // dentro la relazione. Qui si confrontano davvero, invece di fidarsi.
  {
    const chiavi = [...codice.matchAll(/\bmetti\('([A-Za-z0-9_]+)'/g)].map(m => m[1]);
    // Si guarda SOLO dentro il registro: nel file ci sono altre nove strutture con un campo
    // `tipo`, e prenderle tutte renderebbe questo controllo incapace di accorgersi di una
    // chiave dimenticata — cioe' verde e inutile, che e' il modo in cui e' nato il guasto.
    const registro = codice.slice(codice.indexOf('const TAG_DISPONIBILI = ['),
                                  codice.indexOf('];', codice.indexOf('const TAG_DISPONIBILI = [')));
    const dichiarati = new Set([...registro.matchAll(/\{ tipo: '([A-Za-z0-9_]+)'/g)].map(m => m[1]));
    const fuori = chiavi.filter(k => !dichiarati.has(k));
    t('OGNI VALORE DEL CANTIERE E DICHIARATO NEL REGISTRO (' + chiavi.length + ' chiavi)',
       chiavi.length >= 25 && fuori.length === 0);
    if (fuori.length) console.log('        fuori registro:', fuori.join(', '));
    t('e c e comunque una rete: un etichetta si cerca anche fra i valori veri',
       /function etichettaTag\(tipo, valori\)/.test(codice)
       && /const voce = valori && valori\[tipo\];/.test(codice));
  }
  t('ed e contato fra i dati mancanti', /el\.setAttribute\('data-mancante', '1'\)/.test(codice));
  t('in stampa la pastiglia perde il colore: serve a comporre, non a leggere',
     /\.tpl-block-richtext \.dpsh-tag \{ background: none;/.test(codice));
}

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko ? 1 : 0);
