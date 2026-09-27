// L'INDICE E LA NUMERAZIONE, letti dal documento FINITO.
// La numerazione dentro il template usciva sbagliata (35 numerate contro 56 vere) perche' un
// blocco lungo traboccava su una pagina fisica che non lasciava marcatori. Ora ogni pagina e'
// un foglio rigido: contarli e numerarli sono finalmente la stessa cosa.
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
}
const NOMI=['raccogliVociIndice','numeraPagineDocumento','numeraFigureERisolviRiferimenti'];
const api=new Function('DOMParser', NOMI.map(corpo).join('\n\n')+'\nreturn {'+NOMI.join(',')+'};')(dom.window.DOMParser);

let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };

const foglio = (dentro) => `<div class="dpsh-sheet"><div class="dpsh-sheet-inner">${dentro}</div></div>`;
const titolo = (liv, testo) => `<div class="tpl-block-richtext" data-titolo-indice="${liv}">${testo}</div>`;

console.log('--- Le voci vengono dal documento, non da un elenco a parte ---');
{
  // Capitolo introduttivo: 2 fogli, con 3 titoli di livelli diversi.
  // Poi due prove senza titoli: devono comparire con la loro riga di sezione.
  const corpoDoc =
      foglio(titolo(1,'1. INTRODUZIONE') + '<p>testo</p>')
    + foglio(titolo(1,'2. PROVE PENETROMETRICHE DPSH') + titolo(2,'2.1 Formula olandese'))
    + foglio('<p>prova 1</p>')
    + foglio('<p>prova 1, pagina 2</p>')
    + foglio('<p>prova 2</p>');
  const sezioni = [
    { id:'__introduzione__', etichetta:'Introduzione', pageCount:2 },
    { id:'s1', numero:'1', pageCount:2 },
    { id:'s2', numero:'2', pageCount:1 }
  ];
  const voci = api.raccogliVociIndice(corpoDoc, sezioni, 1);
  voci.forEach(v => console.log('       liv' + v.livello, 'pag' + v.pagina, '·', v.etichetta));
  t('cinque voci: tre titoli del capitolo, due prove senza titoli', voci.length === 5);
  t('il primo titolo e a pagina 2 (dopo l indice)', voci[0].pagina === 2 && voci[0].etichetta === '1. INTRODUZIONE');
  t('il secondo titolo e sul foglio dopo', voci[1].pagina === 3);
  t('e il sottotitolo porta il suo LIVELLO, non 1', voci[2].livello === 2 && voci[2].etichetta === '2.1 Formula olandese');
  t('una prova senza titoli usa la sua riga di sezione', voci[3].etichetta === 'Prova N° 1' && voci[3].livello === 1);
  t('e la pagina giusta: quarto foglio + indice', voci[3].pagina === 4);
  t('la seconda prova comincia al foglio successivo alla prima', voci[4].pagina === 6);

  const senzaIndice = api.raccogliVociIndice(corpoDoc, sezioni, 0);
  t('senza pagina di indice davanti, tutto scala di uno', senzaIndice[0].pagina === 1);
}

console.log('--- La regola contro i doppioni ---');
{
  const corpoDoc = foglio(titolo(1,'1. INTRODUZIONE'));
  const voci = api.raccogliVociIndice(corpoDoc, [{ id:'i', etichetta:'Introduzione', pageCount:1 }], 0);
  t('una sezione CON titoli non aggiunge anche la propria riga', voci.length === 1);
  t('e in indice compare il titolo vero, non l etichetta della sezione', voci[0].etichetta === '1. INTRODUZIONE');
  const vuoto = api.raccogliVociIndice(foglio('<p>niente titoli</p>'), [{ id:'x', numero:'7', pageCount:1 }], 0);
  t('una sezione SENZA titoli non sparisce dall indice', vuoto.length === 1 && vuoto[0].etichetta === 'Prova N° 7');
}

console.log('--- La numerazione delle pagine ---');
{
  const doc5 = foglio('a') + foglio('b') + foglio('c') + foglio('d') + foglio('e');
  const numerato = api.numeraPagineDocumento(doc5);
  const numeri = (numerato.match(/Pagina (\d+) di (\d+)/g) || []);
  console.log('       ', numeri.join(' | '));
  t('ogni foglio riceve il suo numero', numeri.length === 5);
  t('il totale e quello vero, non una stima', numeri.every(n => / di 5$/.test(n)));
  t('e sono in ordine', numeri[0] === 'Pagina 1 di 5' && numeri[4] === 'Pagina 5 di 5');
  t('il numero sta DENTRO il foglio, in fondo', /dpsh-sheet-inner[^>]*>[\s\S]*?bottom:6mm/.test(numerato));
  t('un documento senza fogli non viene toccato', api.numeraPagineDocumento('<p>ciao</p>') === '<p>ciao</p>');
  t('e nemmeno una stringa vuota', api.numeraPagineDocumento('') === '');
}

console.log('--- Le figure e i riferimenti ---');
{
  // La figura porta con se' il suo RUOLO e il suo BLOCCO: senza, un riferimento puo' solo
  // dire "quella dopo di me".
  const fig = (etichetta, ruolo, blocco) => `<div data-ruolo="didascalia"><span data-figura-ancora="figura-${etichetta}" data-figura-ruolo="${ruolo || 'figura'}" data-figura-blocco="${blocco || etichetta}">Figura <span data-figura-numero>1</span> - ${etichetta}</span></div>`;
  // data-rif-figura="1" e' la FORMA VECCHIA, quella dei template gia' salvati: deve continuare
  // a valere come «la prima figura che segue».
  const rif = () => '<span class="dato-cantiere" data-rif-figura="1">fig. ?</span>';
  const rifA = (b) => '<span class="dato-cantiere" data-rif-figura="' + b + '">fig. ?</span>';

  // Il documento vero: capitolo 1 con un riferimento e la sua mappa, capitolo 2 con due figure.
  const doc =
      foglio(titolo(1,'1. INTRODUZIONE') + '<p>Nel sito individuato in ' + rif() + ' e stato realizzato…</p>' + fig('mappa'))
    + foglio(titolo(1,'2. PROVE PENETROMETRICHE DPSH') + '<p>vedi ' + rif() + '</p>' + fig('foto1') + fig('foto2'));
  const out = api.numeraFigureERisolviRiferimenti(doc);
  const numeri = (out.match(/data-figura-numero[^>]*>([^<]+)</g) || []).map(x => x.replace(/.*>/, '').replace('<', ''));
  console.log('       numeri figure:', numeri.join(', '));
  t('LE FIGURE SEGUONO IL CAPITOLO: 1.1 nel primo, 2.1 e 2.2 nel secondo',
     numeri.join(',') === '1.1,2.1,2.2');
  t('il riferimento nel testo diventa "fig. 1.1", non piu "fig. ?"', /fig\. 1\.1/.test(out) && !/fig\. \?/.test(out));
  t('e il secondo riferimento punta alla figura del SUO capitolo', /fig\. 2\.1/.test(out));
  t('il riferimento e CLICCABILE verso l ancora della figura', /<a href="#figura-mappa"/.test(out));
  t('e la figura ha davvero quell ancora come id', /id="figura-mappa"/.test(out));
  t('non resta nessun marcatore da risolvere', !/data-rif-figura/.test(out));

  // Senza titoli di primo livello non si inventano capitoli.
  const senzaCapitoli = foglio('<p>' + rif() + '</p>' + fig('a') + fig('b'));
  const out2 = api.numeraFigureERisolviRiferimenti(senzaCapitoli);
  const n2 = (out2.match(/data-figura-numero[^>]*>([^<]+)</g) || []).map(x => x.replace(/.*>/, '').replace('<', ''));
  console.log('       senza capitoli:', n2.join(', '));
  t('senza capitoli la numerazione e continua: 1, 2', n2.join(',') === '1,2');
  t('e il riferimento diventa "fig. 1"', /fig\. 1</.test(out2));

  // Un riferimento senza nessuna figura dopo non deve restare un "?" muto.
  const orfano = foglio('<p>vedi ' + rif() + '</p>');
  const out3 = api.numeraFigureERisolviRiferimenti(orfano);
  t('UN RIFERIMENTO SENZA FIGURA diventa un dato mancante, contato', /data-mancante="1"/.test(out3) && /\[figura assente\]/.test(out3));

  t('un documento senza figure ne riferimenti passa intatto',
     api.numeraFigureERisolviRiferimenti('<p>ciao</p>') === '<p>ciao</p>');
}

console.log('--- A QUALE figura: per ruolo, per blocco, o la seguente ---');
{
  const fig = (etichetta, ruolo, blocco) => `<div data-ruolo="didascalia"><span data-figura-ancora="figura-${etichetta}" data-figura-ruolo="${ruolo}" data-figura-blocco="${blocco}">Figura <span data-figura-numero>1</span> - ${etichetta}</span></div>`;
  const rifA = (b) => '<span class="dato-cantiere" data-rif-figura="' + b + '">fig. ?</span>';

  // Il caso che prima era impossibile: il testo che parla della mappa viene DOPO la mappa.
  // Con la sola regola "la prima che segue", quel riferimento sarebbe finito sulla foto.
  const doc = foglio(
      fig('mappa', 'inquadramento', 'b1')
    + '<p>Come si vede in ' + rifA('ruolo:inquadramento') + ' il sito e in agro di Sava.</p>'
    + fig('foto', 'foto', 'b2')
    + '<p>La verticale e mostrata in ' + rifA('ruolo:foto') + '.</p>');
  const out = api.numeraFigureERisolviRiferimenti(doc);
  t('IL RIFERIMENTO ALL INQUADRAMENTO PUNTA INDIETRO, alla mappa', /<a href="#figura-mappa"[^>]*>fig\. 1</.test(out));
  t('e quello alla foto punta alla foto', /<a href="#figura-foto"[^>]*>fig\. 2</.test(out));
  t('non resta nessun marcatore da risolvere', !/data-rif-figura/.test(out));

  // PER BLOCCO: si sceglie una figura precisa dell'elenco.
  const perBlocco = foglio('<p>vedi ' + rifA('blocco:b2') + '</p>' + fig('mappa', 'inquadramento', 'b1') + fig('foto', 'foto', 'b2'));
  t('un riferimento per blocco trova la SUA figura, non la prima',
     /<a href="#figura-foto"[^>]*>fig\. 2</.test(api.numeraFigureERisolviRiferimenti(perBlocco)));

  // LA PIU' VICINA, in un fascicolo dove la stessa figura si ripete per ogni prova: e' la
  // ragione per cui «la foto della prova» in un Report Completo non punta sempre alla prima.
  const fascicolo = foglio(fig('f1', 'foto', 'b2') + '<p>prova 1: ' + rifA('ruolo:foto') + '</p>')
                  + foglio(fig('f2', 'foto', 'b2') + '<p>prova 2: ' + rifA('ruolo:foto') + '</p>');
  const outF = api.numeraFigureERisolviRiferimenti(fascicolo);
  t('OGNI PROVA PUNTA ALLA PROPRIA FIGURA, non tutte alla prima',
     /prova 1: <span[^>]*><a href="#figura-f1"/.test(outF) && /prova 2: <span[^>]*><a href="#figura-f2"/.test(outF));

  // E se il bersaglio non c'e', lo dice: mai un numero inventato in un PDF firmato.
  const senza = api.numeraFigureERisolviRiferimenti(foglio('<p>' + rifA('ruolo:inquadramento') + '</p>' + fig('foto', 'foto', 'b2')));
  t('un bersaglio che non esiste viene DICHIARATO, non stampato a caso',
     /data-mancante="1"/.test(senza) && /\[manca inquadramento\]/.test(senza));
  const bloccoSparito = api.numeraFigureERisolviRiferimenti(foglio('<p>' + rifA('blocco:b9') + '</p>' + fig('foto', 'foto', 'b2')));
  t('e cosi anche una figura scelta e poi cancellata', /\[figura non trovata\]/.test(bloccoSparito));
}

console.log('--- Il cablaggio ---');
t('l interruttore non e piu nel template', !src.includes('id="chkFooterPageNumber"'));
t('e l editor lo dice, invece di lasciare un vuoto', /non si imposta piu.{0,4} qui/.test(src));
t('la scelta e nella schermata di esportazione', src.includes('id="chkEsportaPdfNumeriPagina"'));
t('NASCE SPENTA', /numeraPagine: false/.test(src));
t('e arriva davvero alla costruzione del documento', /numeraPagine: numeraPagineScelto/.test(src));
t('la numerazione si applica DOPO l indice, sul documento completo',
   src.indexOf('if (opzioni && opzioni.numeraPagine) pagesHtml = numeraPagineDocumento(pagesHtml);')
   > src.indexOf('let pagesHtml = (includiIndice ? buildIndiceReportCompletoHtml'));
t('l indice si costruisce dal corpo assemblato', /raccogliVociIndice\(corpoHtml, sezioni, 1\)/.test(src));
t('i blocchi Titolo si marcano per l indice', /data-titolo-indice="\$\{livelloIndice\}"/.test(src));
// Il rientro non è più fisso a 6 mm per livello: lo decide il template dell'indice, livello per
// livello (livelli.h1/h2/h3: rientroMm e peso). La gerarchia disegnata resta la stessa cosa.
t('e l indice disegna la gerarchia con rientro e peso',
   /margin-left:\$\{st\.gutter \? '0' : cfgLiv\.rientroMm \+ 'mm'\}/.test(src)
   && /font-weight:var\(\$\{varLiv\}-peso\)/.test(src)
   && /const cfgLiv = st\.livelli\[LIVELLI_KEY\[liv - 1\]\];/.test(src));
t('le figure si numerano prima di assemblare il documento',
   /const corpoNumerato = numeraFigureERisolviRiferimenti\(corpoHtml\);/.test(src));
t('il modello NON scrive piu "fig. 1.1" a mano', !/Nel sito individuato in fig\. 1\.1/.test(src));
// «Nel sito individuato in fig. X» parla della MAPPA. Con «la figura seguente» bastava
// mettere una foto prima dell'inquadramento perche' la frase dicesse una cosa falsa.
t('ma usa un riferimento MIRATO all inquadramento, non "quella che capita"',
   /Nel sito individuato in \{\{figura:ruolo:inquadramento\}\}/.test(src));
t('e i segnaposto possono nominare un bersaglio, non solo una parola sola',
   /\[A-Za-z\]\[A-Za-z0-9_:-\]\*/.test(src));
t('e quel segnaposto non viene contato tra i dati mancanti',
   /TAG_RISOLTI_A_DOCUMENTO\[chiave\] \|\| eRiferimentoFigura\(chiave\)/.test(src));
// IL RIFERIMENTO SOPRAVVIVE ALL'EDITOR. Era uno <span> semplice, con la sola classe: lo
// schema del testo non conosce quel nodo, quindi lo scartava e lasciava la scritta «fig. ?»
// senza nessun aggancio. Bastava aprire il blocco una volta perche' la numerazione non
// potesse piu' agganciarlo — e in un PDF firmato «fig. ?» e' un errore muto.
t('IL RIFERIMENTO E UN TAG, non uno span che l editor cancella',
   /data-tag="' \+ escapeHtmlDidascalia\(chiave\)/.test(src) && /data-rif-figura="' \+ escapeHtmlDidascalia/.test(src));
t('e in stampa riparte col marcatore che la numerazione cerca, bersaglio compreso',
   /el\.setAttribute\('data-rif-figura', b\.modo === 'seguente' \? 'seguente' : \(b\.modo \+ ':' \+ b\.valore\)\);/.test(src));
t('la figura porta con se il suo ruolo e il suo blocco, o nessuno potrebbe cercarla',
   /data-figura-ruolo="/.test(src) && /data-figura-blocco="/.test(src));
t('e il menu @ costruisce le voci sulle figure del template aperto',
   /function tagFigureDisponibili\(\)/.test(src)
   && /TAG_DISPONIBILI\.concat\(tagFigureDisponibili\(\)\)/.test(src));

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
