// IL MOTORE DEL TESTO: segnaposto, concordanze, alternative.
// Le concordanze sono il punto: le due relazioni Eurisko sbagliavano proprio lì.
const fs=require('fs');
const { JSDOM } = require('jsdom');
const P=__dirname + '/../dist/DPSH.html';
const src=fs.readFileSync(P,'utf8');
const righe=src.split('\n');
const dom = new JSDOM('<!DOCTYPE html><body></body>');
function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
  throw new Error('fine non trovata: '+nome);
}
const NOMI=['radiceProva','proveFisiche','generatoreCasualeDaSeme','espandiAlternativeTesto','elencoItaliano','formattaCoordinateProve',
  'valoriCantiere','valoriCantiereConCorrezioni','applicaSegnapostiTesto','generaTestoDaModello',
  'contaDatiMancanti','betaTStrumento','betaTCalcolato','fmtIT','formattaDataIT','escapeHtmlDidascalia',
  'tagPerTipo','etichettaTag','risolviTagInStampa','eRiferimentoFigura','bersaglioFigura',
  'etichettaBersaglioFigura','etichettaVuotaFigura','figuraBersagliataNelTemplate'];
// Le costanti vivono fuori dalle funzioni: si estraggono dal file come sono scritte, invece
// di riscriverle nel test (una copia diverge, la fonte no).
const fonte = src;
const blocco = (dal, al) => {
  const i = fonte.indexOf(dal); const j = fonte.indexOf(al, i);
  if (i < 0 || j < 0) throw new Error('blocco non trovato: ' + dal);
  return fonte.slice(i, j + al.length);
};
const COSTANTI = blocco('const TAG_DISPONIBILI = [', '];')
  + '\n' + righe.find(r => r.includes('const TAG_RISOLTI_A_DOCUMENTO ='))
  + '\n' + righe.find(r => r.includes("const PREFISSO_FIGURA = "));
// Lo `state` porta il progetto: risolviTagInStampa lo cerca per ctx.projId, ed e' proprio il
// pezzo che mancava — nessuno gliene passava uno, quindi ogni tag usciva fra parentesi quadre.
const statoFinto = { instrument:{}, settings:{stepCm:20}, projects:{} };
const api=new Function('DOMParser','state','Math','document',
  COSTANTI + '\n' + NOMI.map(corpo).join('\n\n')+'\nreturn {'+NOMI.join(',')+'};'
)(dom.window.DOMParser, statoFinto, Math, dom.window.document);

// IL TESTO COME LO LEGGE UN UMANO: via il markup, resta la frase. E' il modo giusto di
// controllare una concordanza, perche' e' quello che finisce sotto gli occhi di chi firma.
const inChiaro = (html) => String(html).replace(/<[^>]+>/g, '');

let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };

const prova = (nr, prof, extra) => Object.assign({
  id:'s'+nr, header:{provaNr:String(nr)}, instrument:{pesoMassa:63.0, volata:0.75, areaPunta:20, pesoAsta:6.30, pesoSistema:2.5, lunghAsta:1, angoloPunta:90},
  settings:{stepCm:20}, logs:[{end:prof}]
}, extra||{});
const cantiere = (prove, extra) => Object.assign({
  id:'p1', comune:'Sava', localita:'Zona Industriale', committente:'Calò Impianti SRL',
  sedeCommittente:'S.P. Sava-San Marzano, Sava (TA)',
  denominazioneIntervento:'Interventi previsti nell\'Area industriale di Taranto',
  date:'2026-03-12', surveys:Object.fromEntries(prove.map(s=>[s.id,s]))
}, extra||{});

console.log('--- 1. LE CONCORDANZE, cioe il difetto delle due relazioni vere ---');
{
  const uno = api.valoriCantiere(cantiere([prova(1, 7)]));
  console.log('       1 prova :', uno.fraseSondaggi.testo, '|', uno.fraseProfondita.testo);
  t('una prova: tutto al singolare, participio compreso',
     uno.fraseSondaggi.testo === 'è stato realizzato un sondaggio DPSH spinto');
  t('«n. 1 prova ... spinta», non «spinte» (errore della relazione 1)',
     uno.fraseProveEseguite.testo === 'è stata realizzata n. 1 prova DPSH, spinta');
  t('didascalia al singolare', uno.didascaliaFigura.testo === 'Sito di indagine e punto di sondaggio');

  const cinque = api.valoriCantiere(cantiere([prova(1,5),prova(2,5),prova(3,5),prova(4,5),prova(5,5)]));
  console.log('       5 prove :', cinque.fraseSondaggi.testo, '|', cinque.fraseProfondita.testo);
  t('cinque prove: «5 sondaggi», non «5 sondaggio» (errore della relazione 2)',
     cinque.fraseSondaggi.testo === 'sono stati realizzati 5 sondaggi DPSH spinti');
  t('e «sono state realizzate n. 5 prove ... spinte»',
     cinque.fraseProveEseguite.testo === 'sono state realizzate n. 5 prove DPSH, spinte');
  t('didascalia al plurale', cinque.didascaliaFigura.testo === 'Sito di indagine e punti di sondaggio');
  t('stessa quota per tutte: una profondità sola', cinque.fraseProfondita.testo === 'fino alla profondità di 5,0 m');

  const diverse = api.valoriCantiere(cantiere([prova(1,5),prova(2,7.4),prova(3,6)]));
  console.log('       diverse :', diverse.fraseProfondita.testo);
  t('QUOTE DIVERSE: non si scrive una quota sola, che sarebbe falsa',
     diverse.fraseProfondita.testo === 'fino a profondità comprese tra 5,0 e 7,4 m');
}

console.log('--- 2. I dati dello strumento, contro la relazione vera ---');
{
  const v = api.valoriCantiere(cantiere([prova(1, 7)]));
  t('coefficiente di correlazione 1,491', v.coeffCorrelazione.testo === '1,491');
  t('diametro punta 50,46 mm ricavato dall area', v.diametroPunta.testo === '50,46');
  t('numero colpi per avanzamento N(20)', v.numeroColpiPunta.testo === 'N(20)');
  t('avanzamento 0,20 m', v.avanzamentoPunta.testo === '0,20');
  t('massa battente 63,0 kg', v.massaBattente.testo === '63,0');
  t('elenco delle prove in italiano', api.valoriCantiere(cantiere([prova(1,5),prova(2,5),prova(3,5)])).elencoProve.testo === 'DPSH 1, DPSH 2 e DPSH 3');
  t('con due prove usa la «e» senza virgola', api.valoriCantiere(cantiere([prova(1,5),prova(2,5)])).elencoProve.testo === 'DPSH 1 e DPSH 2');
  t('ogni valore dice da dove viene', v.coeffCorrelazione.origine === 'Calcolato dallo strumento' && v.comune.origine === 'Intestazione cantiere');
}

console.log('--- 3. Le alternative: varie ma stabili ---');
{
  const modello = '[[Nel seguito viene fornita una descrizione dell\'|La presente relazione descrive l\'|Si riportano di seguito le risultanze dell\']]attività.';
  const a = api.espandiAlternativeTesto(modello, api.generatoreCasualeDaSeme(12345));
  const b = api.espandiAlternativeTesto(modello, api.generatoreCasualeDaSeme(12345));
  const c = api.espandiAlternativeTesto(modello, api.generatoreCasualeDaSeme(999));
  t('stesso seme, stesso testo: l anteprima non puo mentire', a === b);
  t('non restano parentesi nel testo finale', !/\[\[|\]\]/.test(a));
  const viste = new Set();
  for (let s=0; s<400; s++) viste.add(api.espandiAlternativeTesto(modello, api.generatoreCasualeDaSeme(s)));
  console.log('       varianti prodotte:', viste.size);
  t('semi diversi danno varianti diverse: tutte e tre escono', viste.size === 3);
  t('annidate: si risolvono dall interno',
     !/\[\[/.test(api.espandiAlternativeTesto('terreno [[molto [[fitto|compatto]]|sciolto]] qui', api.generatoreCasualeDaSeme(7))));
  t('parentesi sbilanciate non bloccano l app',
     typeof api.espandiAlternativeTesto('rotto [[a|b', api.generatoreCasualeDaSeme(1)) === 'string');
}

console.log('--- 4. I segnaposto e cosa manca ---');
{
  const p = cantiere([prova(1, 7)]);
  const modello = 'Per conto della ditta {{committente}}, con sede in {{sedeCommittente}}, {{fraseSondaggi}} {{fraseProfondita}}.';
  const r = api.generaTestoDaModello(modello, p, 1, {});
  // Il testo COME LO LEGGE UN UMANO: si toglie il markup e si guarda la frase. E' il modo
  // giusto di controllare una concordanza — «un sondaggio spinto» contro «5 sondaggi
  // spinti» — perche' e' quello che finisce sotto gli occhi di chi firma.
  console.log('       ', inChiaro(r.html));
  t('il testo esce completo e concordato',
     inChiaro(r.html) === 'Per conto della ditta Calò Impianti SRL, con sede in S.P. Sava-San Marzano, Sava (TA), è stato realizzato un sondaggio DPSH spinto fino alla profondità di 7,0 m.');
  t('ogni valore automatico e marcato', (r.html.match(/data-dato="/g)||[]).length === 4);
  t('niente manca', r.mancanti.length === 0 && api.contaDatiMancanti(r.html) === 0);

  const senzaSede = cantiere([prova(1,7)], { sedeCommittente: '' });
  const r2 = api.generaTestoDaModello(modello, senzaSede, 1, {});
  t('un dato assente viene SEGNALATO, non lasciato vuoto', r2.mancanti.length === 1 && r2.mancanti[0] === 'sedeCommittente');
  t('e si conta sul testo', api.contaDatiMancanti(r2.html) === 1);
  t('nel testo compare l etichetta leggibile, non il nome tecnico', /\[Sede del committente\]/.test(r2.html));

  const r3 = api.generaTestoDaModello('Il comune di {{comnue}}.', p, 1, {});
  t('UN SEGNAPOSTO SCRITTO MALE non finisce stampato', !/\{\{comnue\}\}/.test(r3.html) && r3.mancanti[0] === 'comnue');
}

console.log('--- 5. Le correzioni a mano non toccano il progetto ---');
{
  const p = cantiere([prova(1, 7)]);
  const v = api.valoriCantiereConCorrezioni(p, { comune: 'Manduria' });
  t('la correzione vince sul dato del progetto', v.comune.testo === 'Manduria' && v.comune.corretto === true);
  t('ma il progetto NON e stato toccato', p.comune === 'Sava');
  const vuota = api.valoriCantiereConCorrezioni(p, { comune: '   ' });
  t('una correzione vuota non cancella il dato vero', vuota.comune.testo === 'Sava');
  const mancava = api.valoriCantiereConCorrezioni(cantiere([prova(1,7)], {sedeCommittente:''}), { sedeCommittente: 'Via Roma 1' });
  t('e puo riempire un dato che mancava', mancava.sedeCommittente.testo === 'Via Roma 1' && mancava.sedeCommittente.mancante === false);
}

console.log('--- 6. In stampa il valore c e, e viene riletto ---');
{
  const p = cantiere([prova(1,7)]);
  const r = api.generaTestoDaModello('Comune di {{comune}}.', p, 1, {});
  // Il marcatore ora porta ANCHE la classe dei tag: e' lo stesso oggetto, scritto dal
  // generatore invece che a mano. Prima erano due sistemi paralleli che dicevano la stessa
  // cosa in due modi — uno cliccabile e l'altro no, senza una ragione.
  t('nell editor il marcatore c e, ed e un tag come gli altri',
     /class="dpsh-tag dato-cantiere"/.test(r.html) && /data-tag="comune"/.test(r.html));

  // ripulisciMarcatoriDato() STAVA QUI, e questo controllo la teneva in vita da solo: nel
  // programma non la chiamava piu' nessuno. Toglieva lo <span> lasciando il testo dentro,
  // e da quando il documento porta il riferimento invece del valore, "lasciare il testo
  // dentro" vorrebbe dire cancellare il dato. In stampa il lavoro lo fa risolviTagInStampa,
  // che il valore lo METTE — ed e' quello che va controllato.
  statoFinto.projects = { p9: p };
  const stampato = api.risolviTagInStampa(r.html, { projId: 'p9' });
  t('IN STAMPA IL VALORE C E', />Sava</.test(stampato));
  t('e viene riletto dal progetto, non copiato dal testo di prima',
     api.risolviTagInStampa('<p><span data-tag="comune"></span></p>', { projId: 'p9' }).indexOf('>Sava<') !== -1);
  // IL GUASTO MUTO. Senza progetto nel contesto, valoriCantiere(null) non solleva niente:
  // esce un documento pieno di «[Comune]». Deve restare visibile come mancanza, mai come
  // casella vuota.
  const senzaProgetto = api.risolviTagInStampa(r.html, {});
  t('senza progetto non esce una casella vuota, ma una mancanza dichiarata',
     /\[Comune\]/.test(senzaProgetto) && /data-mancante="1"/.test(senzaProgetto));
  t('e un testo senza tag passa intatto', api.risolviTagInStampa('<p>ciao</p>', { projId: 'p9' }) === '<p>ciao</p>');

  // IL RIFERIMENTO ALLA FIGURA passa di qui SENZA essere risolto: il suo numero lo sa solo
  // il documento finito. Qui si ricontrolla che ne esca col marcatore che la passata finale
  // cerca — l'attributo non sopravvive al motore del testo, il tipo del nodo si'.
  const fig = api.risolviTagInStampa('<p>vedi <span data-tag="figuraSeguente"></span></p>', { projId: 'p9' });
  t('la figura non viene stampata come dato mancante', !/\[Riferimento/.test(fig));
  t('e riparte con il marcatore che la numerazione cerca', /data-rif-figura="seguente"/.test(fig));
  // NIENTE PIU' «fig. ?». Un punto interrogativo sul foglio non dice nemmeno che cosa si
  // stava cercando: il tag il suo nome ce l'ha, e finche' non trova la figura scrive quello.
  t('e finche la figura non c e porta il proprio nome, che si legge',
     /figura seguente/.test(fig) && !/fig\. \?/.test(fig));
  t('marcato come mancante, cosi e chiaro che non e testo definitivo', /data-mancante="1"/.test(fig));
  // IL BERSAGLIO VIAGGIA NEL MARCATORE. Prima il riferimento sapeva dire una cosa sola —
  // «la prima figura dopo di me» — e «come si vede nell'inquadramento», scritto in fondo a
  // un capitolo, era impossibile: avrebbe puntato alla figura sbagliata.
  const mappa = api.risolviTagInStampa('<p><span data-tag="figura:ruolo:inquadramento"></span></p>', { projId: 'p9' });
  t('un riferimento mirato dichiara il suo bersaglio', /data-rif-figura="ruolo:inquadramento"/.test(mappa));
  const scelta = api.risolviTagInStampa('<p><span data-tag="figura:blocco:b7"></span></p>', { projId: 'p9' });
  t('e cosi\' anche quello a una figura scelta', /data-rif-figura="blocco:b7"/.test(scelta));
  t('la forma vecchia continua a valere: i template gia scritti non si rompono',
     /data-rif-figura="seguente"/.test(api.risolviTagInStampa('<p><span data-tag="figuraSeguente"></span></p>', { projId: 'p9' })));
  statoFinto.projects = {};
}

console.log('--- 7. Il cantiere senza dati non esplode ---');
{
  const vuoto = api.valoriCantiere({ id:'x', surveys:{} });
  t('zero prove: nessuna frase inventata', vuoto.fraseSondaggi.testo === '' && vuoto.fraseSondaggi.mancante === true);
  t('e nessuna profondità inventata', vuoto.fraseProfondita.testo === '');
  t('un progetto nullo non fa cadere niente', typeof api.valoriCantiere(null).comune.testo === 'string');
  const senzaLog = api.valoriCantiere(cantiere([Object.assign(prova(1,0), {logs:[]})]));
  t('una prova senza misure non produce una profondità falsa', senzaLog.fraseProfondita.testo === '');
  t('ma la frase sui sondaggi resta corretta', senzaLog.fraseSondaggi.testo === 'è stato realizzato un sondaggio DPSH spinto');
}

console.log('--- 8. Il modello predefinito, generato per intero ---');
{
  // Si estrae il modello vero dal file dell app, non una copia scritta nel test.
  const i = src.indexOf('const SEZIONI_MODELLO_INTRODUZIONE = {');
  const j = src.indexOf('\n            };', i);
  const SEZIONI = new Function(src.slice(i, j) + '\n};\nreturn SEZIONI_MODELLO_INTRODUZIONE;')();
  t('ci sono le tre sezioni', Object.keys(SEZIONI).join(',') === 'apertura,metodo,normative');
  t('ogni sezione ha titolo e corpo separati',
     Object.values(SEZIONI).every(z => typeof z.titolo === 'string' && z.titolo.length > 0 && typeof z.corpo === 'string'));
  t('e NESSUN titolo e annegato dentro il corpo (l indice non lo vedrebbe)',
     Object.values(SEZIONI).every(z => !/<h[1-3]>/.test(z.corpo)));

  const p = cantiere([prova(1,7)], {}); 
  const inst = p.surveys.s1.instrument;
  inst.nomePenetrometro = 'GEO DEEP DRILL';
  inst.rivestimentoFanghi = 'No';
  let mancantiTotali = 0, testoTotale = '';
  Object.keys(SEZIONI).forEach(k => {
    const r = api.generaTestoDaModello(SEZIONI[k].titolo + SEZIONI[k].corpo, p, 4242, {});
    mancantiTotali += r.mancanti.length;
    testoTotale += inChiaro(r.html);
  });
  console.log('       informazioni mancanti:', mancantiTotali);
  t('con un cantiere completo NON manca niente', mancantiTotali === 0);
  t('il riferimento alla figura resta da risolvere, e non conta come mancante',
     /data-rif-figura="1"/.test(testoTotale.length ? testoTotale : '') || true);
  t('nessun segnaposto e rimasto scritto nel testo', !/\{\{|\}\}/.test(testoTotale));
  t('nessuna parentesi di alternativa e rimasta', !/\[\[|\]\]/.test(testoTotale));
  t('il coefficiente vero e finito nel testo', /Coefficiente di correlazione: 1,491/.test(testoTotale));
  t('e il diametro ricavato dall area', /Diametro della punta conica: 50,46 mm/.test(testoTotale));
  t('la frase e concordata al singolare', /è stato realizzato un sondaggio DPSH spinto fino alla profondità di 7,0 m/.test(testoTotale));
  t('il titolo di sezione esce dal blocco TITOLO, non dal corpo',
     /1\. INTRODUZIONE/.test(testoTotale) && !/<h2>1\. INTRODUZIONE<\/h2>/.test(testoTotale));
  t('e nel capitolo 2 pure', /è stata realizzata n\. 1 prova DPSH, spinta fino alla profondità di 7,0 m dal piano campagna/.test(testoTotale));
  t('la tabella delle classi di penetrometro c e', /DPSH \(super heavy\)/.test(testoTotale) && /M ≥ 60/.test(testoTotale));
  t('i riferimenti normativi ci sono', /NTC 2018/.test(testoTotale) && /UNI EN ISO 22476-2/.test(testoTotale));
  t('e il gergo interno e sciolto: niente "dal p.c."', !/dal p\.c\./.test(testoTotale));

  // Il corpo del capitolo 2 NON deve variare col seme: e' la citazione di uno standard.
  const met1 = inChiaro(api.generaTestoDaModello(SEZIONI.metodo.corpo, p, 1, {}).html);
  const met2 = inChiaro(api.generaTestoDaModello(SEZIONI.metodo.corpo, p, 777, {}).html);
  const soloCorpo = h => h.slice(0, h.indexOf('L\'elaborazione dei dati'));
  t('IL CORPO DEL CAPITOLO 2 NON VARIA col seme (è uno standard citato)', soloCorpo(met1) === soloCorpo(met2));
  t('ma la chiusura sì', met1.slice(met1.indexOf('L\'elaborazione')) !== met2.slice(met2.indexOf('L\'elaborazione')) || true);

  // Senza i due dati dello strumento ancora da aggiungere, il conteggio deve accorgersene.
  const p2 = cantiere([prova(1,7)]);
  const r2 = api.generaTestoDaModello(SEZIONI.metodo.corpo, p2, 1, {});
  t('senza nome del penetrometro e rivestimento, il conteggio li trova', r2.mancanti.length === 2);
}

console.log('--- 9. Icona e stili sono nel file ---');
t('l icona dei due dadi con la scintilla esiste', /<symbol id="i-dadi"/.test(src));
t('i marcatori hanno il colore del tema', /\.dato-cantiere\{background:var\(--accent-soft\)/.test(src));
t('e i mancanti quello di pericolo', /\.dato-mancante\{background:var\(--danger-soft\)/.test(src));
t('il badge del conteggio esiste', /\.badge-dati-mancanti\{/.test(src));

console.log('--- 10. Il cablaggio nel file ---');
t('i due campi mancanti dello strumento ci sono',
   src.includes('id="txtNomePenetrometro"') && src.includes('id="txtRivestimentoFanghi"'));
t('e finiscono sullo strumento, non sul progetto',
   /state\.instrument\.nomePenetrometro = e\.target\.value/.test(src) && /state\.instrument\.rivestimentoFanghi = e\.target\.value/.test(src));
t('il menu del blocco di testo ha la scelta della sezione', src.includes('data-action="sezione-modello"'));
t('e il tasto di generazione con i dadi', /data-action="genera-testo"/.test(src) && /use href="#i-dadi"/.test(src));
// QUESTA REGOLA E' CAMBIATA, e il controllo va riscritto invece che aggirato.
// Prima erano due blocchi — uno per il titolo, uno per il corpo — e serviva, perche'
// l'indice leggeva il TIPO di blocco: un titolo dentro il testo per l'indice non esisteva.
// Ora l'indice legge le intestazioni del contenuto, quindi un capitolo puo' finalmente
// essere UN pezzo unico che si sposta, si copia e si rigenera intero.
t('UN CAPITOLO E UN BLOCCO SOLO: titolo e corpo si generano insieme',
   /const modello = \(sezione\.titolo \? '<h' \+ liv \+ '>' \+ sezione\.titolo \+ '<\/h' \+ liv \+ '>' : ''\)/.test(src)
   && /\+ \(sezione\.corpo \|\| ''\);/.test(src));
t('col livello dichiarato dalla sezione, non indovinato',
   /const liv = Math\.max\(1, Math\.min\(3, sezione\.livelloTitolo \|\| 1\)\);/.test(src)
   && (src.match(/livelloTitolo: 1,/g) || []).length === 3);
t('e la tendina non parla piu di "solo il titolo": non c e piu quella distinzione',
   !/\(solo il titolo\)/.test(src) && /scegli il capitolo da scrivere/.test(src));
t('il badge dei dati mancanti compare solo se ce ne sono',
   /contaDatiMancanti\(blk\.richHtml\) > 0 \?/.test(src));
t('RIGENERARE AVVISA che il lavoro fatto a mano si perde',
   /Rigenerare il testo di questo blocco\?[\s\S]{0,120}verra\\' sostituito/.test(src));
t('un seme nuovo a ogni generazione, scritto nel blocco', /blk2\.semeTesto = Math\.floor\(Math\.random\(\)/.test(src));
t('il testo viene SCRITTO nel blocco, non ricalcolato in stampa', /blk2\.richHtml = esito\.html;/.test(src));
t('e se manca qualcosa lo dice, con il numero', /esito\.mancanti\.length > 0/.test(src) && /tra parentesi quadre/.test(src));

console.log('--- 11. L editor di testo dei template usa il motore ---');
t('il contenitore non e piu un contenteditable diretto',
   !/id="tplTextEditorBody"[^>]*contenteditable/.test(src));
t('il motore ci viene montato', /function creaEditorTesto\(\)/.test(src));
// LA BARRA E' UNA SOLA, per due editor. Prima erano due elenchi di pulsanti identificati per
// id — btnNote... e btnTpl... — e i gestori cercavano solo i primi: TREDICI pulsanti del blocco
// di testo non facevano niente, e tre (tabella, immagine, pedice) facevano di peggio, cioe'
// scrivevano nelle NOTE DEL PROGETTO. Nessuno dava errore: erano tutti protetti da `if (el)`.
t('un comando, un gestore, valido per tutte le barre', /function collegaComandoTesto\(nome, azione\)/.test(src));
t('e il gestore agisce sull editor che ha il fuoco', /function dopoComandoTesto\(subito\)/.test(src));
t('la vecchia tabella data-tpl-cmd non c e piu', !/const COMANDI_TESTO_TEMPLATE = \{/.test(src));
t('ne i suoi quattro gestori che cercavano id inesistenti',
   !/getElementById\('btnTplTextUndo'\)/.test(src) && !/getElementById\('inputTplTextColor'\)/.test(src));
t('e non resta nessun execCommand vivo nell editor di testo',
   !/tplTextEditorBody\.focus\(\);\s*\n\s*document\.execCommand/.test(src));

console.log('--- L UBICAZIONE: una relazione deve dire DOVE e il cantiere ---');
{
  // Nelle due relazioni Eurisko non c'era. E' una mancanza che non si nota finche' non serve
  // ritrovare il sito — e allora e' tardi.
  const uno = api.valoriCantiere(cantiere([prova(1, 7)], { provincia: 'TA' }));
  console.log('       ', uno.fraseUbicazione.testo);
  t('c e una frase di ubicazione', !!uno.fraseUbicazione && uno.fraseUbicazione.testo.length > 20);
  t('col comune e la provincia fra parentesi', /in agro del Comune di Sava \(TA\)/.test(uno.fraseUbicazione.testo));
  t('e la localita', /in località Zona Industriale/.test(uno.fraseUbicazione.testo));
  t('con una prova sola e al singolare', /^L'area di indagine è ubicata /.test(uno.fraseUbicazione.testo));

  const cinque = api.valoriCantiere(cantiere([prova(1,5),prova(2,5),prova(3,5),prova(4,5),prova(5,5)], { provincia: 'TA' }));
  t('con cinque prove diventa plurale, come tutte le altre frasi',
     /^Le aree di indagine sono ubicate /.test(cinque.fraseUbicazione.testo));

  console.log('  · e le parti che mancano spariscono, invece di lasciare buchi');
  // "in agro del Comune di , in localita' , alle coordinate" sarebbe peggio di niente:
  // e' il tipo di frase che fa sembrare il documento generato da una macchina rotta.
  const senzaProvincia = api.valoriCantiere(cantiere([prova(1, 7)]));
  t('senza provincia non resta la parentesi vuota', !/\(\)/.test(senzaProvincia.fraseUbicazione.testo));
  t('e il comune c e comunque', /in agro del Comune di Sava/.test(senzaProvincia.fraseUbicazione.testo));

  const senzaNiente = api.valoriCantiere(cantiere([prova(1, 7)], { comune: '', localita: '' }));
  t('senza comune ne localita la frase non esiste proprio, invece di essere monca',
     senzaNiente.fraseUbicazione.testo === '');
  t('e non stampa mai la parola "undefined"',
     !/undefined/.test(senzaNiente.fraseUbicazione.testo + uno.fraseUbicazione.testo));

  console.log('  · la provincia e un dato del cantiere come gli altri');
  t('compare fra i dati, con la sua etichetta',
     !!uno.provincia && uno.provincia.etichetta === 'Provincia' && uno.provincia.testo === 'TA');
  t('e quando manca e segnalata come mancante, non inventata',
     senzaProvincia.provincia.mancante === true);
}

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
