// I CARATTERI E LO STILE DEL TESTO.
//
// La scoperta che ha originato questo lavoro: l'app dichiarava 'Arial' dappertutto, ma Arial
// su Android non esiste — e' un font Monotype che arriva con Windows. La WebView ripiegava
// su Roboto, con metriche diverse: a capo in punti diversi fra telefono e PC, quindi blocchi
// che sfondano la pagina solo su un dispositivo. Il controllo che conta, qui, e' che il font
// arrivi DAVVERO nel documento di stampa: e' li' che il carattere sbagliato diventa un PDF
// sbagliato.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../dist/DPSH.html', 'utf8');
// Le ricerche si fanno sul CODICE, non sui commenti: un commento che spiega una rimozione
// nomina la cosa rimossa, e due volte in questo progetto ha reso rosso un controllo giusto.
const codice = src.split('\n').filter(r => !/^\s*(\/\/|\*|\/\*)/.test(r)).join('\n');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };

console.log('--- I caratteri sono nel file, non nella speranza che ci siano ---');
{
  const stile = src.slice(src.indexOf('id="fontIncorporati"'), src.indexOf('</style>', src.indexOf('id="fontIncorporati"')));
  t('c e un blocco di caratteri incorporati', stile.length > 100000);

  // Le quattro famiglie del testo, tonde e grassette, piu' quella delle formule.
  ['Calibri', 'Arial', 'Times New Roman', 'Cambria'].forEach(f => {
    const quante = (stile.match(new RegExp("font-family:'" + f + "'", 'g')) || []).length;
    t(f + ': quattro tagli (tondo/grassetto x diritto/corsivo)', quante === 4);
  });
  t('e il carattere delle formule', /font-family:'Cambria Math'/.test(stile));

  // IL src COMINCIA CON local(): dove il font vero c'e' (Windows, Mac) si usa quello, e il
  // gemello incorporato copre solo il buco. Non si sostituisce niente che gia' funzioni.
  t('SU WINDOWS SI USA IL FONT VERO: ogni src comincia con local()',
     (stile.match(/src:local\(/g) || []).length === (stile.match(/@font-face\{/g) || []).length);

  // IL GRASSETTO CHE NON SI VEDEVA. Ogni faccia diceva local('Calibri') — il nome della
  // FAMIGLIA, che su Windows e Android risolve sempre al taglio REGOLARE. Per la faccia a
  // peso 700 il browser trovava dunque il tondo, lo accettava come se fosse il grassetto, e
  // smetteva di sintetizzarlo: il bold veniva disegnato con le forme del tondo. Un local()
  // deve nominare il TAGLIO, non la famiglia — altrimenti promette una cosa e ne consegna
  // un'altra, in silenzio.
  {
    const facce = [...stile.matchAll(/@font-face\{font-family:'([^']+)';font-style:(\w+);font-weight:(\d+);font-display:swap;src:((?:local\('[^']*'\),?)+)/g)];
    t('tutte e diciassette le facce dichiarano i loro nomi locali', facce.length === 17);
    const sbagliate = facce.filter(m => {
      const [, fam, stileF, peso, locali] = m;
      if (peso === '700' && !/Bold/i.test(locali)) return true;
      if (stileF === 'italic' && !/Italic/i.test(locali)) return true;
      return false;
    }).map(m => m[1] + ' ' + m[2] + ' ' + m[3]);
    if (sbagliate.length) console.log('       facce col local sbagliato:', sbagliate.join(' | '));
    t('NESSUNA FACCIA CHIEDE IL TONDO PER IL GRASSETTO', sbagliate.length === 0);
    // E il contrario: il tondo non deve chiedere il grassetto.
    const tondiSbagliati = facce.filter(m => m[3] === '400' && m[2] === 'normal' && /Bold|Italic/i.test(m[4]));
    t('ne il grassetto per il tondo', tondiSbagliati.length === 0);
  }
  t('e i dati del font sono davvero dentro (woff2 in base64)',
     (stile.match(/url\(data:font\/woff2;base64,/g) || []).length >= 17);

  // I gemelli metricamente compatibili: e' la ragione per cui gli a capo restano gli stessi.
  const carattereReale = f => stile.includes("font-family:'" + f + "'");
  t('i gemelli scelti sono quelli a metriche identiche, non font "simili"',
     carattereReale('Calibri') && /Carlito/.test(src) && /Arimo/.test(src) && /Tinos/.test(src) && /Caladea/.test(src));
}

console.log('--- E arrivano nel documento di stampa, che e il punto ---');
{
  t('il CSS dei font si legge dal tag invece di essere ripetuto',
     /function cssFontIncorporati\(\)/.test(codice) && /getElementById\('fontIncorporati'\)/.test(codice));
  t('e NON e duplicato nel file: 740 KB scritti due volte sarebbero due copie che divergono',
     (src.match(/@font-face\{font-family:'Calibri';font-style:normal;font-weight:400/g) || []).length === 1);
  t('IL CSS DI STAMPA COMINCIA COI CARATTERI',
     /return `\s*\$\{cssFontIncorporati\(\)\}/.test(codice));
  t('i fogli non dichiarano piu Arial a mano',
     !/dpsh-sheet"[^>]*style="font-family:\s*Arial/.test(codice));
  // Erano tre fogli con --tpl-font: il foglio dell'indice nel frattempo ha preso lo stile del
  // suo template (--idx-font, il carattere scelto in «Personalizza indice»). La regola resta:
  // nessun foglio con un carattere scritto a mano, ciascuno legge la variabile del suo stile.
  t('ma leggono la variabile dello stile del documento',
     (codice.match(/style="font-family: var\(--tpl-font, Arial, sans-serif\);"><div class="dpsh-sheet-inner"/g) || []).length === 2
     && (codice.match(/data-tpl-page-label="Indice" data-sommario="[^"]*" style="font-family: var\(--idx-font, Arial, sans-serif\);/g) || []).length === 1);
}

console.log('--- Lo stile del documento: un punto solo che decide ---');
{
  t('c e un modello con i valori di serie', /function stileTestoDiDefault\(\)/.test(codice));
  t('GIUSTIFICATO DI SERIE, come una relazione tecnica', /allineamento: 'justify'/.test(codice));
  t('interlinea 1,5 di serie', /interlinea: 1\.5/.test(codice));
  t('e un template salvato prima di oggi non si rompe: i campi si completano',
     /Object\.assign\(stileTestoDiDefault\(\), \(tpl && tpl\.stileTesto\) \|\| \{\}\)/.test(codice));

  t('lo stile viaggia in variabili CSS, non in valori calcolati punto per punto',
     /function cssVariabiliStileTesto\(stile\)/.test(codice));
  t('scritte in UN SOLO posto, sul foglio', (codice.match(/\.dpsh-sheet \{ \$\{cssVariabiliStileTesto/g) || []).length === 1);
  t('e i blocchi le leggono con var()',
     /blockObj\.fontSizePt \+ 'pt' : 'var\(--tpl-corpo-pt, 11pt\)'/.test(codice)
     && /line-height:var\(--tpl-interlinea, 1\.5\)/.test(codice)
     && /text-align:var\(--tpl-allineamento, justify\)/.test(codice));
  t('e una misura scelta per il singolo blocco vince, come eccezione dichiarata',
     /const ptTesto = blockObj\.fontSizePt \? blockObj\.fontSizePt \+ 'pt'/.test(codice));
  t('anche il titolo, che prende la misura dal suo livello',
     /var\(--tpl-h\$\{Math\.max\(1, Math\.min\(3, livelloNum\)\)\}, 16pt\)/.test(codice));

  // LA MANIGLIA CHE SCHIACCIAVA. line-height:calc(1.5 * var(--tpl-riga-scale)) era il motivo
  // per cui trascinando l'altezza il testo "si condensava annullando il rigore di interlinea".
  t('IL TESTO NON PASSA PIU DAL MOLTIPLICATORE CHE LO SCHIACCIAVA',
     !/line-height:calc\(1\.5 \* var\(--tpl-riga-scale/.test(codice));
  t('ne il titolo', !/line-height:calc\(1\.3 \* var\(--tpl-riga-scale/.test(codice));
}

console.log('--- La misura delle altezze usa lo stesso carattere del foglio ---');
{
  // Se la misura girasse con un font diverso da quello stampato, le parole andrebbero a capo
  // in punti diversi e OGNI altezza misurata sarebbe sbagliata in partenza. E' la radice di
  // tutta la famiglia di sfasamenti che questo progetto ha gia' pagato una volta.
  t('la funzione che misura accetta lo stile del testo',
     /function misuraFigliPerStampaMm\(contenutoHtml, margins, rigaScale, fontScale, stileTesto\)/.test(codice));
  t('e lo passa al CSS di stampa che usa per misurare',
     /getReportPrintStyleBlock\(mrg, stileTestoMisura\)/.test(codice));
  t('ripiegando sullo stile dell editor aperto, non su uno inventato',
     /templateEditorState\.stileTesto\)\s*\n?\s*\|\| stileTestoDiDefault\(\)/.test(codice));
}

console.log('--- Si salva, e non si perde ---');
{
  t('lo stile finisce nel template salvato', /tpl\.stileTesto = Object\.assign\(stileTestoDiDefault\(\)/.test(codice));
  // L'istantanea per "ci sono modifiche non salvate" era scritta a mano in QUATTRO punti:
  // aggiungere un campo e dimenticarne uno voleva dire perdere lavoro in silenzio.
  t('l istantanea delle modifiche e UNA sola funzione', /function istantaneaTemplate\(\)/.test(codice));
  t('e la usano tutti e quattro i punti che prima la ripetevano',
     (codice.match(/istantaneaTemplate\(\)/g) || []).length >= 5);
  t('e comprende lo stile, o cambiarlo non chiederebbe di salvare',
     /stileTesto: templateEditorState\.stileTesto/.test(codice));
}

console.log('--- Il pannello ---');
{
  t('si apre da un tasto suo nella barra', /id="btnStileTesto"/.test(src));
  t('e anche dal menu compatto, per chi lavora col telefono', /data-more-target="btnStileTesto"/.test(src));
  t('con un icona propria, distinta da quella del titolo', /symbol id="i-type"/.test(src));
  t('mostra i quattro caratteri con una nota su cosa sono',
     /FONT_DOCUMENTO\.map\(f => `<option value="\$\{f\.id\}">\$\{f\.nome\} — \$\{f\.nota\}<\/option>`\)/.test(codice));
  t('ha corpo, interlinea, allineamento, i tre titoli, rientro e spazio fra paragrafi',
     ['selStileCorpo', 'selStileInterlinea', 'segStileAllineamento', 'selStileH1', 'selStileH2',
      'selStileH3', 'inpStileRientro', 'inpStileSpazioPar'].every(id => src.includes(id)));
  t('e un tasto per tornare ai valori di serie', /id="btnStileTestoRipristina"/.test(src));

  // IL PESO DEI TITOLI. Stava scritto in un solo posto — la regola CSS del foglio di stampa —
  // e un foglio di stile lo si puo' non ricevere: e' gia' successo per le tabelle del testo
  // (nessun bordo) e per le variabili dello stile (corpo e carattere di serie invece dei
  // tuoi). Un titolo che si legge come il testo attorno non e' piu' un titolo.
  t('IL PESO DEI TITOLI e un dato dello stile, non una riga di CSS sepolta',
     /pesoTitoli: 700/.test(codice) && /--tpl-peso-titoli:\$\{st\.pesoTitoli \|\| 700\}/.test(codice));
  t('la regola del foglio lo legge', /font-weight: var\(--tpl-peso-titoli, 700\); color: #0f172a/.test(codice));
  // IL NUMERO, non var(--tpl-peso-titoli): una variabile CSS si risolve solo se qualcuno
  // l'ha definita sopra, e basta un contenitore fuori dalla catena — il Word, una miniatura
  // costruita a parte — perche' il titolo torni del peso del testo.
  t('E OGNI TITOLO SE LO PORTA SCRITTO ADDOSSO, come numero e non come variabile',
     /'font-weight:' \+ peso/.test(codice)
     && /const peso = \(Object\.assign\(stileTestoDiDefault\(\), stileTesto \|\| \{\}\)\.pesoTitoli\) \|\| 700;/.test(codice));
  t('e anche il grassetto del testo e un numero, non un «bolder» relativo',
     /\.tpl-block-richtext strong, \.tpl-block-richtext b \{ font-weight: 700; \}/.test(codice));
  t('senza scavalcare un peso gia scelto a mano su quel titolo',
     /if \(!\/font-weight\/i\.test\(gia\)\)/.test(codice));
  t('e si sceglie dal pannello', /id="selStilePesoTitoli"/.test(src)
     && /\['selStilePesoTitoli', 'pesoTitoli'/.test(codice));
  t('anche l anteprima del pannello lo segue, invece di mostrare sempre 700',
     /font-weight:var\(--tpl-peso-titoli, 700\); margin-bottom:5px/.test(codice));

  // L'ANTEPRIMA NON PUO' MENTIRE: usa le stesse variabili del foglio vero.
  t("l anteprima usa le variabili del foglio, non uno stile scritto a parte",
     /box\.getAttribute\('style'\)[\s\S]{0,120}cssVariabiliStileTesto\(st\)/.test(codice));
  t('e la formula ci si vede col carattere matematico',
     /font-family:var\(--tpl-font-formule\)/.test(codice));
  t('ogni modifica ridisegna il foglio: lo stile si giudica sul documento',
     /function cambiaStile\(campo, valore\)[\s\S]{0,200}renderTemplateEditorCanvas\(\)/.test(codice));
}

console.log('--- Le eccezioni: il controllo lo fa il programma, non tu ---');
{
  // Il modo per non ricontrollare paranoicamente ogni blocco non e' togliere i comandi: e'
  // che sia l'app a dire dove ci si e' scostati. Se il pallino non c'e', il blocco segue il
  // documento — e questo si puo' credere, perche' e' misurato.
  const righe = src.split('\n');
  const i = righe.findIndex(r => r.startsWith('            const ECCEZIONI_DI_STILE'));
  const f = righe.findIndex((r, k) => k > i && r === '            }');
  t('c e un elenco di cosa conta come eccezione', i > 0);

  // Si esegue davvero la funzione, invece di leggerla: e' l'unico modo di sapere che
  // riconosce quello che deve riconoscere.
  const corpo = (nome) => {
    const a = righe.findIndex(r => r.startsWith('            function ' + nome + '('));
    for (let k = a + 1; k < righe.length; k++) if (righe[k] === '            }') return righe.slice(a, k + 1).join('\n');
  };
  const elenco = righe.slice(i, righe.findIndex((r, k) => k > i && r.trim() === '];') + 1).join('\n');
  const api = new Function('DOMParser', elenco + '\n' + corpo('eccezioniDiStile') + '\n' + corpo('riportaAlloStileDelDocumento')
                           + '\nreturn { eccezioniDiStile, riportaAlloStileDelDocumento };')(global.DOMParser || function(){});

  t('un blocco pulito non ha eccezioni',
     api.eccezioniDiStile({ type: 'testo', richHtml: '<p>Testo normale.</p>' }).length === 0);
  t('un corpo scelto a mano e un eccezione',
     api.eccezioniDiStile({ type: 'testo', fontSizePt: 14, richHtml: '<p>x</p>' }).length === 1);
  t('un carattere diverso dentro il testo pure',
     api.eccezioniDiStile({ type: 'testo', richHtml: '<p style="font-family:Courier">x</p>' }).length === 1);
  t('e se ce ne sono due, sono due',
     api.eccezioniDiStile({ type: 'testo', fontSizePt: 14, richHtml: '<p style="text-align:center">x</p>' }).length === 2);
  t('i blocchi che non sono testo non hanno stile da rispettare',
     api.eccezioniDiStile({ type: 'foto', fontSizePt: 14 }).length === 0);
  t('e nemmeno un blocco inesistente fa esplodere il controllo',
     api.eccezioniDiStile(null).length === 0);

  console.log('  · e il pallino compare SOLO quando c e davvero');
  t('sul foglio', /eccezioniDiStile\(item\)\.length > 0 \? `<span class="tpl-editor-pallino-eccezioni"/.test(codice));
  t('nel menu del blocco, con l elenco di cosa e diverso',
     /const ecc = eccezioniDiStile\(blk\);\s*\n\s*if \(ecc\.length === 0\) return '';/.test(codice));
  t('col tasto per riportare tutto allo stile del documento', /data-action="stile-ripristina"/.test(codice));
  t('che chiede conferma dicendo COSA verra tolto', /ecc\.map\(e => e\.nome\)\.join\(', '\)/.test(codice));
  t('e passa dall annulla, come ogni modifica al template',
     /salvaUndoSnapshotEditor\(\);\s*\n\s*riportaAlloStileDelDocumento\(blk2\);/.test(codice));

  console.log('  · ripristinare NON tocca il testo, solo le dichiarazioni di stile');
  t('toglie il corpo scelto a mano', /delete blockObj\.fontSizePt;/.test(codice));
  t('e le cinque proprieta tipografiche scritte dentro',
     /\['font-family', 'font-size', 'text-align', 'line-height', 'color'\]/.test(codice));
  t('MA LASCIA larghezza, scorrimento e margini: non sono scelte tipografiche',
     /if \(!\['font-family', 'font-size', 'text-align', 'line-height', 'color'\]\.includes\(nome\) && pezzo\.trim\(\)\)/.test(codice));
}

console.log('--- UN SOLO BLOCCO: i titoli li dichiara il contenuto ---');
{
  // IL DIFETTO SEGNALATO: "se inserisco un titolo nel blocco di testo, questo verra' si'
  // mostrato come un titolo ma non avra' lo stesso valore del blocco titolo". Era vero, e la
  // causa stava in una riga: data-titolo-indice era messo sul CONTENITORE del blocco, e
  // l'indice cercava esattamente quello. Un <h2> dentro un blocco di testo si vedeva come
  // titolo ma per l'indice non esisteva: il documento mostrava una gerarchia che l'indice non
  // conosceva.
  const righe = src.split('\n');
  const corpo = (nome) => {
    const a = righe.findIndex(r => r.startsWith('            function ' + nome + '('));
    for (let k = a + 1; k < righe.length; k++) if (righe[k] === '            }') return righe.slice(a, k + 1).join('\n');
  };
  const { JSDOM } = require('jsdom');
  const finestra = new JSDOM('').window;
  const api = new Function('DOMParser',
      // stileTestoDiDefault serve alla marcatura: e' da li' che prende il peso dei titoli da
      // scrivere per esteso sul titolo stesso.
      corpo('stileTestoDiDefault') + '\n'
      + corpo('marcaTitoliPerIndice') + '\n' + corpo('convertiBloccoTitoloInTesto') + '\n' + corpo('convertiTitoliDelTemplate')
      + '\nreturn { marcaTitoliPerIndice, convertiBloccoTitoloInTesto, convertiTitoliDelTemplate };')(finestra.DOMParser);

  console.log('  · un titolo scritto nel testo ORA vale come titolo');
  const marcato = api.marcaTitoliPerIndice('<h2>2. Prove penetrometriche</h2><p>La prova...</p>');
  t('l h2 riceve il marcatore che l indice cerca', /data-titolo-indice="2"/.test(marcato));
  t('col livello giusto, preso dal tag', !/data-titolo-indice="1"/.test(marcato));
  t('e il testo intorno non viene toccato', /<p>La prova\.\.\.<\/p>/.test(marcato));
  t('e il titolo esce col peso scritto per esteso, non con una variabile',
     /font-weight:700/.test(marcato) && !/var\(/.test(marcato));
  const treLivelli = api.marcaTitoliPerIndice('<h1>A</h1><h2>B</h2><h3>C</h3>');
  t('tutti e tre i livelli', (treLivelli.match(/data-titolo-indice="[123]"/g) || []).length === 3);
  t('un testo senza titoli passa liscio, senza costo', api.marcaTitoliPerIndice('<p>x</p>') === '<p>x</p>');
  t('e un HTML malformato non impedisce di stampare', typeof api.marcaTitoliPerIndice('<h1>rotto') === 'string');

  console.log('  · e il blocco di testo lo marca davvero, in stampa');
  // Ora la marcatura riceve il testo GIA' risolto dai tag: le due cose si compongono,
  // prima si sciolgono i riferimenti e poi si marcano i titoli. L'ordine conta — un titolo
  // che contenesse un tag deve arrivare all'indice col valore, non col segnaposto.
  t('il render del testo passa dalla marcatura, dopo aver sciolto i tag',
     /marcaTitoliPerIndice\(risolviTagInStampa\(blockObj\.richHtml, ctx, blockObj\), \(typeof templateEditorState/.test(codice));
  t('l indice continua a cercare lo stesso marcatore, senza modifiche',
     /querySelectorAll\('\[data-titolo-indice\]'\)/.test(codice));

  console.log('  · i vecchi blocchi Titolo si convertono, non si perdono');
  const vecchio = { type: 'titolo', livelloTitolo: 'H2', richHtml: '<p>2. PROVE PENETROMETRICHE DPSH</p>' };
  api.convertiBloccoTitoloInTesto(vecchio);
  t('diventa un blocco di testo', vecchio.type === 'testo');
  t('col titolo dentro, al livello giusto', vecchio.richHtml === '<h2>2. PROVE PENETROMETRICHE DPSH</h2>');
  t('e il livello vecchio sparisce, non resta a contraddire il tag', vecchio.livelloTitolo === undefined);
  // Un <p> dentro un <h2> non e' HTML valido: ProseMirror lo butterebbe via in silenzio, e
  // il titolo sparirebbe dal template senza che nessuno se ne accorga.
  t('IL <p> INTERNO VIENE SCIOLTO, o il motore lo scarterebbe in silenzio',
     !/<p>/.test(vecchio.richHtml));
  const h1 = { type: 'titolo', richHtml: '<p>1. INTRODUZIONE</p>' };
  api.convertiBloccoTitoloInTesto(h1);
  t('senza livello dichiarato vale H1', h1.richHtml === '<h1>1. INTRODUZIONE</h1>');
  const vuoto = { type: 'titolo', richHtml: '' };
  api.convertiBloccoTitoloInTesto(vuoto);
  t('un titolo vuoto non produce un tag vuoto', vuoto.richHtml === '');

  const pagine = [{ rows: [{ blocks: [{ type: 'titolo', richHtml: '<p>A</p>' }, { type: 'testo', richHtml: '<p>B</p>' }] }] }];
  t('la conversione passa tutto il template e conta cosa ha toccato', api.convertiTitoliDelTemplate(pagine) === 1);
  t('e non tocca i blocchi che sono gia a posto', pagine[0].rows[0].blocks[1].richHtml === '<p>B</p>');

  console.log('  · la conversione scatta aprendo il template, come le altre');
  t('all apertura dell editor', /const titoliConvertiti = convertiTitoliDelTemplate\(pages\);/.test(codice));
  t('il tipo Titolo non si offre piu quando si costruisce', /fuoriPalette: true/.test(codice));
  t('ma resta dichiarato, o un template non ancora aperto mostrerebbe "blocco sconosciuto"',
     /'titolo': \{ label: 'Titolo \(vecchio\)'/.test(codice));
  t('e la palette rispetta il ritiro', /!\(REPORT_BLOCK_TYPES\[t\] \|\| \{\}\)\.fuoriPalette/.test(codice));

  console.log('  · e nell editor si scrivono tutti e tre i livelli');
  t('c e anche H3, che prima mancava', /data-format-tag="H3"/.test(src));
  t('il comando usa il livello dal tag, invece di un ternario a due vie',
     /toggleHeading\(\{ level: parseInt\(tag\.substring\(1\), 10\) \}\)/.test(codice));
  t('e la barra si accende anche su H3', /H3: e\.isActive\('heading', \{ level: 3 \}\)/.test(codice));

  console.log('  · i titoli nel testo prendono le misure del documento');
  t('h1/h2/h3 leggono le variabili dei titoli',
     /\.tpl-block-richtext h1 \{ font-size: var\(--tpl-h1, 16pt\); \}/.test(codice));
  t('NON sono giustificati: un titolo giustificato apre buchi fra le parole',
     /\.tpl-block-richtext h1, \.tpl-block-richtext h2, \.tpl-block-richtext h3 \{[\s\S]{0,200}text-align: left;/.test(codice));
  t('e non restano soli in fondo alla pagina, staccati dal loro testo',
     /break-after: avoid-page; page-break-after: avoid;/.test(codice));
  t('i paragrafi prendono rientro e spazio dal documento',
     /\.tpl-block-richtext p \{ margin: 0 0 var\(--tpl-spazio-par, 6pt\); text-indent: var\(--tpl-rientro, 0\); \}/.test(codice));
}

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko ? 1 : 0);
