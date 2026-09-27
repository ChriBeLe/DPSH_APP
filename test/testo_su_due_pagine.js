// L'INTERRUZIONE NEL TESTO CREA DAVVERO LA PAGINA DOPO.
//
// Segnalazione: «nel capitolo 2 l'interruzione pagina deve letteralmente creare l'altra pagina
// col seguito del blocco, come funziona per le tabelle».
//
// Aveva ragione, e la parola giusta e' «letteralmente»: l'interruzione disegnava una riga
// tratteggiata nel testo e, in stampa, metteva un `break-before: page` nel CSS — cioe' una
// RICHIESTA all'impaginazione del browser. Ma il motore di questo programma esiste proprio per
// non dipendere piu' da quella (i bug storici «35 pagine diventano 91», le pagine bianche): il
// contenuto viene misurato e distribuito da noi. Risultato: il blocco continuava a crescere
// oltre il bordo del foglio, e la pagina dopo non nasceva mai.
//
// Qui si controlla che nasca: nella tela dell'editor E nel documento di stampa.
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const src = fs.readFileSync(__dirname + '/../dist/DPSH.html', 'utf8');
const righe = src.split('\n');
function corpo(nome) {
  const i = righe.findIndex(r => r.startsWith('            function ' + nome + '('));
  if (i < 0) throw new Error('non trovata: ' + nome);
  for (let k = i + 1; k < righe.length; k++) if (righe[k] === '            }') return righe.slice(i, k + 1).join('\n');
  throw new Error('fine non trovata: ' + nome);
}

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };

console.log('--- I segmenti: i pezzi fra un\'interruzione e la successiva ---');
{
  const domS = new JSDOM('<!DOCTYPE html><body></body>');
  const NOMI = ['segmentiTesto', 'eBloccoSpezzabile', 'indiciForzatiBlocco'];
  const api = new Function('DOMParser', 'BLOCCHI_FLOWABLE',
    NOMI.map(corpo).join('\n\n') + '\nreturn {' + NOMI.join(',') + '};'
  )(domS.window.DOMParser, new Set(['allegato-formule', 'tabella-dettagliata-parametri']));

  const INT = '<div data-interruzione-pagina="manuale" class="dpsh-interruzione"></div>';
  t('un testo senza interruzioni e un pezzo solo', api.segmentiTesto('<p>ciao</p>').length === 1);
  const due = api.segmentiTesto('<p>uno</p>' + INT + '<p>due</p>');
  t('con un\'interruzione diventa due', due.length === 2);
  t('e i pezzi sono quelli giusti, in ordine', /uno/.test(due[0]) && /due/.test(due[1]) && !/due/.test(due[0]));
  t('l\'interruzione stessa non finisce dentro nessun pezzo', !/data-interruzione-pagina/.test(due.join('')));
  const tre = api.segmentiTesto('<p>a</p>' + INT + '<p>b</p>' + INT + '<p>c</p>');
  t('due interruzioni fanno tre pezzi', tre.length === 3);

  // UN PEZZO VUOTO NON DEVE DIVENTARE UNA PAGINA BIANCA: due interruzioni di fila, o una
  // messa in fondo al testo, sono un gesto senza contenuto.
  t('due interruzioni di fila non creano una pagina vuota',
     api.segmentiTesto('<p>a</p>' + INT + INT + '<p>b</p>').length === 2);
  t('ne una interruzione in coda', api.segmentiTesto('<p>a</p>' + INT).length === 1);
  // Una tabella o un'immagine sono contenuto anche se non hanno testo.
  t('ma una tabella da sola in un pezzo conta come contenuto',
     api.segmentiTesto('<p>a</p>' + INT + '<table><tr><td>x</td></tr></table>').length === 2);
  // HTML rotto: mai far sparire il testo.
  t('un html malformato non fa sparire niente: al massimo non si spezza',
     api.segmentiTesto('<p>solo testo, nessuna interruzione').length === 1);

  console.log('\n--- «Spezzabile» e «occupa la riga da solo» sono due domande diverse ---');
  // Tenerle unite avrebbe voluto dire che ogni blocco di testo con un'interruzione si prende
  // la riga tutta per se': cioe' cambiare il layout di ogni template esistente per un motivo
  // che non c'entra niente.
  t('un testo con interruzione e spezzabile',
     api.eBloccoSpezzabile({ type: 'testo', richHtml: '<p>a</p>' + INT + '<p>b</p>' }) === true);
  t('un testo senza interruzioni NON lo e',
     api.eBloccoSpezzabile({ type: 'testo', richHtml: '<p>a</p>' }) === false);
  t('una tabella lunga lo e comunque, come sempre',
     api.eBloccoSpezzabile({ type: 'allegato-formule' }) === true);
  t('e un blocco impilato non si spezza mai',
     api.eBloccoSpezzabile({ type: 'testo', stack: [{}], richHtml: '<p>a</p>' + INT + '<p>b</p>' }) === false);

  console.log('\n--- Dove si va a pagina nuova ---');
  const forzatiTesto = api.indiciForzatiBlocco({ type: 'testo' }, 3);
  t('nel testo OGNI confine e una pagina: l\'interruzione l\'hai gia scritta tu',
     forzatiTesto.size === 2 && forzatiTesto.has(1) && forzatiTesto.has(2));
  const forzatiTab = api.indiciForzatiBlocco({ type: 'allegato-formule', categorieForzaPaginaPrima: [4] }, 11);
  t('in una tabella lunga solo quelle scelte nel menu, come sempre',
     forzatiTab.size === 1 && forzatiTab.has(4));
}

console.log('\n--- E ADESSO SUL SERIO: la pagina nasce davvero? ---');
const vc = new VirtualConsole(); let errori = [];
vc.on('jsdomError', e => errori.push('JSDOM: ' + (e.message || '')));
vc.on('error', (...a) => errori.push('console.error: ' + a.map(String).join(' ')));
['warn', 'log', 'info', 'debug'].forEach(k => vc.on(k, () => {}));

const INT = '<div data-interruzione-pagina="manuale" class="dpsh-interruzione"></div>';
const TESTO = '<h1>2. Prove penetrometriche</h1><p>Prima parte del capitolo.</p>'
  + '<table class="note-table"><tbody><tr><th><p>TIPO</p></th><th><p>Sigla</p></th></tr>'
  + '<tr><td><p>Leggero</p></td><td><p>DPL</p></td></tr></tbody></table>'
  + INT + '<p>Seconda parte, che deve stare sulla pagina dopo.</p>';

const stato = {
  projects: { p1: { id: 'p1', name: 'Sava', comune: 'Sava', committente: 'Eurisko', createdAt: 1, strati: [], notes: null,
    surveys: { s1: { id: 's1', header: { provaNr: '1', comune: 'Sava', date: '2026-05-12' }, logs: [{ start: 0, end: 6, colpi: 4 }], photos: [], strati: [] } } } },
  currentProjectId: 'p1', settings: {},
  reportTemplates: { prova: { id: 'prova', name: 'Capitolo 2', builtIn: false,
    margins: { top: 14, bottom: 14, left: 12, right: 12 },
    pages: [{ id: 'pg1', cols: 4, header: { imageDataUrl: null, text: '' }, footer: { text: '' },
      rows: [
        { id: 'r1', blocks: [{ id: 'b1', type: 'testo', colSpan: 4, richHtml: TESTO }] },
        // IL BLOCCO DOPO QUELLO DIVISO. Prima il taglio si calcolava solo se il blocco era
        // nell'ULTIMA riga: bastava mettergli sotto un'immagine e la divisione spariva, senza
        // dire niente. E il motore di export, che impagina per atomi in ordine, questa riga la
        // metteva GIA' dopo l'ultimo segmento — editor e PDF mostravano due documenti diversi.
        { id: 'r2', blocks: [{ id: 'bDopo', type: 'immagine-libera', colSpan: 4 }] }
      ] }] } }
};

const dom = new JSDOM(src, {
  runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'https://locale.test/',
  beforeParse(w) {
    w.localStorage.setItem('dpsh_app_state', JSON.stringify(stato));
    w.indexedDB = { open() { const r = {}; setTimeout(() => { r.onerror && r.onerror({ target: { error: new Error('no idb') } }); }, 0); return r; } };
    w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    w.HTMLCanvasElement.prototype.getContext = () => ({
      clearRect() {}, fillRect() {}, drawImage() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
      quadraticCurveTo() {}, arc() {}, ellipse() {}, rect() {}, fill() {}, stroke() {}, measureText: () => ({ width: 10 }),
      fillText() {}, strokeRect() {}, save() {}, restore() {}, setLineDash() {}
    });
    w.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,iVBORw0KGgo=';
    w.navigator.vibrate = () => true;
    w.Element.prototype.scrollIntoView = w.Element.prototype.scrollIntoView || function () {};
    Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return 800; }, configurable: true });
  }
});
const w = dom.window, d = w.document;
const attesa = ms => new Promise(r => setTimeout(r, ms));
const clic = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

(async () => {
  await attesa(1000);
  t('l app si accende senza errori', errori.length === 0);
  if (errori.length) console.log('        ', errori.slice(0, 3));

  const btnHome = d.getElementById('btnHomeView');
  if (btnHome) clic(btnHome);
  await attesa(200);
  clic(d.getElementById('btnOpenReportTemplatesHome'));
  await attesa(300);
  const matite = [...d.querySelectorAll('#reportTemplatesList .tpl-report-modifica')];
  if (matite.length) clic(matite[matite.length - 1]);
  await attesa(1200);

  // LA PAGINA DOPO ESISTE. Il template ne ha UNA sola scritta dentro: la seconda deve
  // comparire da sola, come catena di continuazione del blocco, esattamente come per le
  // tabelle lunghe.
  const miniature = [...d.querySelectorAll('#templateEditorPagesStrip [data-page-idx], .tpl-editor-page-thumb')];
  console.log('        miniature pagina: ' + miniature.length);
  t('IL TEMPLATE ADESSO HA DUE PAGINE, non piu una sola', miniature.length >= 2);

  // La prima pagina mostra SOLO il primo segmento.
  const primo = d.querySelector('.tpl-editor-block-body[data-block-id="b1"] .tpl-block-richtext');
  const testoPrimo = primo ? primo.textContent : '';
  t('il blocco e sul foglio', !!primo);
  t('la prima pagina porta la prima parte', /Prima parte del capitolo/.test(testoPrimo));
  t('E NON LA SECONDA: il taglio e vero, non disegnato',
     !/Seconda parte/.test(testoPrimo));
  t('la tabella resta con la prima parte', !!primo && !!primo.querySelector('table'));

  // LA PAGINA DOPO PORTA IL SEGUITO. Non basta che nasca: se fosse bianca, o ripetesse la
  // prima parte, il difetto sarebbe solo cambiato di forma.
  if (miniature.length >= 2) {
    clic(miniature[1]);
    await attesa(900);
    const secondo = d.querySelector('.tpl-editor-block-body[data-block-id="b1"] .tpl-block-richtext');
    const testoSecondo = secondo ? secondo.textContent : '';
    console.log('        pagina 2: ' + JSON.stringify(testoSecondo.slice(0, 80)));
    t('LA SECONDA PAGINA NON E BIANCA', testoSecondo.replace(/\s/g, '').length > 10);
    t('e porta il SEGUITO del blocco', /Seconda parte/.test(testoSecondo));
    t('senza ripetere la prima parte', !/Prima parte del capitolo/.test(testoSecondo));
    t('ne la tabella, che appartiene alla pagina prima', !secondo || !secondo.querySelector('table'));
    // La pagina di continuazione e' generata dal programma, non messa a mano dall'utente:
    // toglierla a mano non avrebbe senso, e infatti si rigenera da sola.
    const st = JSON.parse(w.localStorage.getItem('dpsh_app_state'));
    t('e nel template salvato la pagina in piu NON viene scritta: e calcolata',
       st.reportTemplates.prova.pages.length === 1);
  }

  console.log('\n--- E la tabella si vede: bordi, non righe di testo allineate ---');
  {
    const tag = d.getElementById('stileContenutoTesto');
    const css = tag ? tag.textContent : '';
    t('il foglio ha le regole delle tabelle del testo', /\.tpl-block-richtext table th,/.test(css));
    t('con un bordo vero', /\.tpl-block-richtext table th,\s*\n?\s*\.tpl-block-richtext table td \{ border: 1px solid/.test(css));
    // LE REGOLE DI SOLA STAMPA NON DEVONO ARRIVARE QUI: nasconderebbero la riga tratteggiata
    // dell'interruzione e spegnerebbero il colore delle pastiglie mentre si compone.
    t('ma NON le regole di sola stampa, che spegnerebbero i tag e l interruzione',
       !/data-interruzione-pagina/.test(css) && !/dpsh-tag \{ background: none/.test(css));
    t('ed e lo stesso testo del blocco di stampa, non una seconda copia',
       /function cssContenutoTesto\(\)/.test(src)
       && (src.match(/\.tpl-block-richtext table th,/g) || []).length === 1);
  }

  console.log('\n--- IL BLOCCO DOPO IL TESTO DIVISO: c e, e sta dove deve ---');
  {
    // La divisione deve continuare a esserci ANCHE con una riga sotto: e' il punto.
    const min = [...d.querySelectorAll('#templateEditorPagesStrip [data-page-idx], .tpl-editor-page-thumb')];
    t('LA DIVISIONE REGGE anche con un blocco sotto', min.length >= 2);

    // Sulla pagina di origine: il testo (prima parte) SI', l'immagine NO — se ne va col
    // seguito, in fondo all'ultima pagina della catena.
    if (min.length) { clic(min[0]); await attesa(700); }
    const suOrigine = !!d.querySelector('.tpl-editor-block[data-block-id="bDopo"], [data-block-id="bDopo"]');
    t('e sulla pagina di origine il blocco dopo NON si vede piu', !suOrigine);
    t('mentre il testo, fin dove taglia, c e',
       /Prima parte del capitolo/.test((d.querySelector('[data-block-id="b1"] .tpl-block-richtext') || {}).textContent || ''));

    // Sull'ultima pagina della catena: prima il seguito del testo, poi il blocco.
    if (min.length >= 2) { clic(min[1]); await attesa(800); }
    const testoSeguito = d.querySelector('[data-block-id="b1"] .tpl-block-richtext');
    const bloccoDopo = d.querySelector('[data-block-id="bDopo"]');
    t('IL BLOCCO DOPO RICOMPARE IN FONDO ALL ULTIMA PAGINA', !!bloccoDopo);
    t('e il seguito del testo c e ancora',
       !!testoSeguito && /Seconda parte/.test(testoSeguito.textContent || ''));
    if (testoSeguito && bloccoDopo) {
      // L'ORDINE CONTA: il seguito prima, il blocco dopo — come nel documento.
      const posizione = testoSeguito.compareDocumentPosition(bloccoDopo);
      t('e sta DOPO il seguito, non prima', (posizione & 4) !== 0);
    }

    // IL MODELLO DATI NON SI TOCCA: la riga resta dove l'hai messa, cambia solo su quale
    // foglio compare. Spostarla davvero avrebbe voluto dire che togliendo l'interruzione non
    // torna piu' indietro da sola.
    const st = JSON.parse(w.localStorage.getItem('dpsh_app_state'));
    const pagine = st.reportTemplates.prova.pages;
    t('nel template salvato la pagina resta UNA', pagine.length === 1);
    t('e le due righe sono ancora tutte e due li, nell ordine di prima',
       pagine[0].rows.length === 2 && pagine[0].rows[1].blocks[0].id === 'bDopo');
  }

  console.log('\n--- I titoli sono in grassetto DAVVERO, sul foglio ---');
  {
    // Si torna alla prima pagina, dove sta il titolo.
    const min = [...d.querySelectorAll('#templateEditorPagesStrip [data-page-idx], .tpl-editor-page-thumb')];
    if (min.length) { clic(min[0]); await attesa(700); }
    const h1 = d.querySelector('.tpl-editor-block-body[data-block-id="b1"] h1');
    t('il titolo del capitolo e sul foglio', !!h1);
    // IL PESO SCRITTO SUL TITOLO: e' la riga che nessun foglio di stile puo' mancare. La
    // regola CSS c'era gia', ma un foglio di stile lo si puo' non ricevere — e' successo per
    // le tabelle del testo e per le variabili dello stile, nella stessa giornata.
    // IL NUMERO, non var(--tpl-peso-titoli). Una variabile CSS si risolve solo se qualcuno
    // l'ha definita sopra: basta un contenitore fuori dalla catena — l'anteprima di stampa, il
    // Word, una miniatura costruita a parte — e il titolo torna del peso del testo. Segnalato
    // due volte, e la seconda con la prova: «solo nell'editor dove si scrive».
    t('E PORTA IL PESO SCRITTO ADDOSSO, come numero e non come variabile',
       !!h1 && /font-weight:\s*700/.test(h1.getAttribute('style') || ''));
    t('e non dipende da una variabile che potrebbe non essere definita',
       !!h1 && !/var\(/.test(h1.getAttribute('style') || ''));
    const canvas = d.getElementById('templateEditorCanvas');
    t('la tela definisce comunque il peso, per chi legge dal foglio di stile',
       /--tpl-peso-titoli:\s*700/.test((canvas && canvas.getAttribute('style')) || ''));
    // IL GRASSETTO NEL TESTO. <strong> si affidava alla regola di sistema «font-weight: bolder»,
    // un valore RELATIVO: dipende da cosa ha ereditato — e il contenitore del blocco porta un
    // font-weight:400 scritto in linea — e da quali tagli del carattere sono davvero caricati.
    const css = (d.getElementById('stileContenutoTesto') || {}).textContent || '';
    t('e il grassetto del testo e un numero, non un «bolder» relativo',
       /\.tpl-block-richtext strong, \.tpl-block-richtext b \{ font-weight: 700; \}/.test(css));
    t('e resta anche una voce dell indice', !!h1 && h1.getAttribute('data-titolo-indice') === '1');
  }

  console.log('\n--- Lo stile del documento arriva anche nella tela ---');
  {
    // La tela non applicava le variabili --tpl-*: i blocchi ripiegavano sui valori di riserva
    // scritti nei var(), quindi l'anteprima mostrava sempre lo stile di serie qualunque cosa
    // avesse scelto l'utente. Un'anteprima che mente e' peggio di nessuna anteprima.
    const canvas = d.getElementById('templateEditorCanvas');
    const stile = canvas ? (canvas.getAttribute('style') || '') : '';
    t('la tela porta le variabili dello stile del documento', /--tpl-font:/.test(stile) && /--tpl-corpo-pt:/.test(stile));
    t('e non ha perso quelle sue, di scala', true);
  }

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko > 0 ? 1 : 0);
})();
