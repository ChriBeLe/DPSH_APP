// LA MANIGLIA INFERIORE DEL BLOCCO DI TESTO: DA PERCENTUALE INERTE A TAGLIO PAGINA.
//
// Proposta dell'utente, e vale la pena scrivere perche' era giusta. Su un blocco di testo
// quella maniglia trascinava `rigaScale`, il moltiplicatore dell'interlinea. Ma da quando il
// testo prende l'interlinea dallo stile del documento — era proprio quel moltiplicatore a
// "schiacciare riga su riga", ed e' stato tolto — quel valore non tocca piu' niente: la
// maniglia mostrava «49%» e non faceva assolutamente nulla.
//
// Un controllo che mente e' peggio di un controllo che manca, e il gesto giusto era gia' li'
// che cercava un significato: il bordo inferiore del blocco e' esattamente il posto dove uno
// vuole dire «la pagina finisce qui».
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

console.log('--- L\'interruzione finisce NEL TESTO, non in un dato a parte ---');
{
  const finestra = new JSDOM('').window;
  const api = new Function('DOMParser', corpo('inserisciInterruzioneNelTesto')
    + '\nreturn { inserisciInterruzioneNelTesto };')(finestra.DOMParser);

  const blk = { richHtml: '<p>uno</p><p>due</p><p>tre</p>' };
  t('mettere il taglio prima del secondo capoverso riesce', api.inserisciInterruzioneNelTesto(blk, 1) === true);
  t('E FINISCE DENTRO IL DOCUMENTO DEL BLOCCO, non in un campo a parte',
     /<p>uno<\/p><div data-interruzione-pagina="manuale"[^>]*><\/div><p>due<\/p>/.test(blk.richHtml));
  // E' LA STESSA interruzione del tasto forbici nella barra: stesso nodo, stessa classe.
  // Se fossero due cose diverse, aprire «Modifica testo» mostrerebbe un documento che non
  // corrisponde al foglio — ed e' precisamente il difetto che questo progetto ha gia' pagato.
  t('con la classe che l editor del testo riconosce', /class="dpsh-interruzione"/.test(blk.richHtml));

  // DOPO IL PRIMO TAGLIO IL SALTO E' UN FIGLIO, quindi lo stesso confine si presenta a volte
  // come «il bersaglio E' un salto» e a volte come «prima del bersaglio c'e' un salto».
  // Guardarne solo uno lasciava accumulare interruzioni sovrapposte — cioe' pagine bianche.
  const blk2 = { richHtml: '<p>uno</p><p>due</p>' };
  api.inserisciInterruzioneNelTesto(blk2, 1);
  const primaVolta = blk2.richHtml;
  t('rifarlo sullo stesso confine NON accumula (il bersaglio E il salto)',
     api.inserisciInterruzioneNelTesto(blk2, 1) === false && blk2.richHtml === primaVolta);
  t('ne dal lato opposto (prima del bersaglio c e il salto)',
     api.inserisciInterruzioneNelTesto(blk2, 2) === false && blk2.richHtml === primaVolta);
  t('e in tutto resta UNA sola interruzione',
     (blk2.richHtml.match(/data-interruzione-pagina/g) || []).length === 1);

  // Un taglio prima del primo capoverso vorrebbe dire "tutto sulla pagina dopo", cioe' una
  // pagina bianca; dopo l'ultimo non vuol dire niente. Nessuno dei due e' un gesto sensato.
  const blk3 = { richHtml: '<p>uno</p><p>due</p>' };
  t('prima del primo capoverso non si taglia: sarebbe una pagina bianca',
     api.inserisciInterruzioneNelTesto(blk3, 0) === false);
  t('ne oltre l ultimo, che non vuol dire niente',
     api.inserisciInterruzioneNelTesto(blk3, 9) === false);
  t('e in nessuno dei due casi il testo viene toccato', blk3.richHtml === '<p>uno</p><p>due</p>');
  t('un blocco senza testo non esplode', api.inserisciInterruzioneNelTesto({ richHtml: '' }, 1) === false);
}

console.log('\n--- E SI TORNA INDIETRO: lo stesso gesto, nel verso opposto ---');
{
  // «Se mi accorgo di aver tagliato troppo, come torno indietro?». Un comando che si puo'
  // solo dare, e mai ritirare, e' un comando che si usa con paura. Portando la maniglia su un
  // taglio che c'e' gia', lo si toglie: stesso gesto, stessa maniglia, direzione opposta.
  const finestra = new JSDOM('').window;
  const api = new Function('DOMParser',
    corpo('inserisciInterruzioneNelTesto') + '\n' + corpo('togliInterruzioneNelTesto')
    + '\nreturn { inserisciInterruzioneNelTesto, togliInterruzioneNelTesto };')(finestra.DOMParser);

  const blk = { richHtml: '<p>uno</p><p>due</p><p>tre</p>' };
  api.inserisciInterruzioneNelTesto(blk, 1);
  t('il taglio c e', /data-interruzione-pagina/.test(blk.richHtml));
  // Dopo l'inserimento il salto E' il figlio numero 1, e il capoverso «due» slitta al 2:
  // il gesto deve funzionare da entrambi i lati, perche' il dito non conosce gli indici.
  t('TOGLIERLO RIESCE, puntando al salto stesso', api.togliInterruzioneNelTesto(blk, 1) === true);
  t('e il testo torna esattamente com era', blk.richHtml === '<p>uno</p><p>due</p><p>tre</p>');

  const blk2 = { richHtml: '<p>uno</p><p>due</p>' };
  api.inserisciInterruzioneNelTesto(blk2, 1);
  t('e riesce anche puntando al capoverso che lo segue', api.togliInterruzioneNelTesto(blk2, 2) === true);
  t('col testo di nuovo intero', blk2.richHtml === '<p>uno</p><p>due</p>');

  t('togliere dove non c e niente non fa danni',
     api.togliInterruzioneNelTesto({ richHtml: '<p>a</p><p>b</p>' }, 1) === false);
  t('ne su un blocco vuoto', api.togliInterruzioneNelTesto({ richHtml: '' }, 1) === false);

  // PIU' DI DUE PAGINE: e' solo «piu' interruzioni». Nessun caso speciale, ed e' la ragione
  // per cui la domanda «e se devo dividere in tre?» non ha una risposta diversa.
  const blk3 = { richHtml: '<p>a</p><p>b</p><p>c</p><p>d</p>' };
  api.inserisciInterruzioneNelTesto(blk3, 1);
  api.inserisciInterruzioneNelTesto(blk3, 3);   // gli indici sono slittati di uno
  t('DUE INTERRUZIONI = TRE PAGINE, senza nessun caso speciale',
     (blk3.richHtml.match(/data-interruzione-pagina/g) || []).length === 2);
}

console.log('\n--- Sul foglio: la maniglia si presenta per quello che fa ---');
const vc = new VirtualConsole(); let errori = [];
vc.on('jsdomError', e => errori.push('JSDOM: ' + (e.message || '')));
vc.on('error', (...a) => errori.push('console.error: ' + a.map(String).join(' ')));
['warn', 'log', 'info', 'debug'].forEach(k => vc.on(k, () => {}));

const stato = {
  projects: { p1: { id: 'p1', name: 'Sava', comune: 'Sava', committente: 'Eurisko', createdAt: 1, strati: [], notes: null,
    surveys: { s1: { id: 's1', header: { provaNr: '1', comune: 'Sava', date: '2026-05-12' }, logs: [{ start: 0, end: 6, colpi: 4 }], photos: [], strati: [] } } } },
  currentProjectId: 'p1', settings: {},
  reportTemplates: { prova: { id: 'prova', name: 'Testo e tabella', builtIn: false,
    margins: { top: 14, bottom: 14, left: 12, right: 12 },
    pages: [{ id: 'pg1', cols: 4, header: { imageDataUrl: null, text: '' }, footer: { text: '' },
      rows: [
        { id: 'r1', blocks: [{ id: 'bTesto', type: 'testo', colSpan: 4, richHtml: '<p>uno</p><p>due</p><p>tre</p>' }] },
        { id: 'r2', blocks: [{ id: 'bTab', type: 'tabella-colpi', colSpan: 4 }] }
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
  await attesa(900);

  // Le maniglie compaiono solo sul blocco scelto: prima lo si seleziona, come farebbe un dito.
  const corpoTesto = d.querySelector('.tpl-editor-block-body[data-block-id="bTesto"]');
  t('il blocco di testo e sul foglio', !!corpoTesto);
  if (corpoTesto) {
    corpoTesto.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 }));
    corpoTesto.dispatchEvent(new w.PointerEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 }));
  }
  await attesa(500);

  const manTesto = d.querySelector('.tpl-editor-block[data-block-id="bTesto"] .tpl-editor-handle-bottom, .tpl-editor-block-body[data-block-id="bTesto"] .tpl-editor-handle-bottom')
    || d.querySelector('[data-block-id="bTesto"] .tpl-editor-handle-bottom');
  t('la maniglia inferiore c e', !!manTesto);
  if (manTesto) {
    const titolo = manTesto.getAttribute('title') || '';
    console.log('        titolo: ' + JSON.stringify(titolo));
    // NIENTE PERCENTUALE. Era il primo punto della segnalazione: quel numero non misurava
    // piu' niente da quando il testo ha smesso di passare dal moltiplicatore.
    t('NON PARLA PIU DI PERCENTUALI: non c era piu niente da misurare', !/%/.test(titolo));
    t('e nemmeno di spazio fra le righe', !/spazio tra le righe/i.test(titolo));
    t('DICE CHE TAGLIA LA PAGINA, e come si fa', /finisca la pagina/i.test(titolo) && /trascina/i.test(titolo));
    t('e porta le forbici, la stessa icona del comando nella barra',
       !!manTesto.querySelector('use[href="#i-scissors"]'));
    t('e si dichiara maniglia di taglio', manTesto.classList.contains('e-taglio'));
  }

  // SUGLI ALTRI BLOCCHI NON CAMBIA NIENTE: li' la maniglia regola davvero qualcosa.
  const corpoTab = d.querySelector('.tpl-editor-block-body[data-block-id="bTab"]');
  if (corpoTab) {
    corpoTab.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, pointerId: 2 }));
    corpoTab.dispatchEvent(new w.PointerEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10, pointerId: 2 }));
  }
  await attesa(500);
  const manTab = d.querySelector('[data-block-id="bTab"] .tpl-editor-handle-bottom');
  t('la tabella ha la sua maniglia', !!manTab);
  if (manTab) {
    const titolo = manTab.getAttribute('title') || '';
    t('e li LA PERCENTUALE RESTA: quel valore cambia ancora qualcosa', /%/.test(titolo));
    t('e parla ancora di spazio fra le righe', /spazio tra le righe/i.test(titolo));
    t('con la sua icona di sempre, non le forbici', !manTab.querySelector('use[href="#i-scissors"]'));
  }

  console.log('\n--- Il gesto: si vede dove cadra il taglio, prima di mollare ---');
  {
    const codice = src.split('\n').filter(r => !/^\s*(\/\/|\*|\/\*)/.test(r)).join('\n');
    // IL TAGLIO SI AGGANCIA AI CONFINI FRA CAPOVERSI. Dentro un capoverso non significa
    // niente: le righe si riformano appena cambia la larghezza, e il taglio si mangerebbe
    // da solo. E' la stessa ragione per cui nessun impaginatore lascia spezzare un rigo.
    // LA STESSA IDEA IN DUE UNITA'. Un testo si taglia fra un capoverso e l'altro, una
    // tabella lunga fra una categoria e l'altra: e' «il pezzo piu' piccolo che ha senso non
    // spezzare», e da li' in giu' il gesto e' identico. Restava un menu a categorie per le
    // tabelle e una maniglia per il testo: due linguaggi per la stessa cosa.
    t('i confini li sa dare una funzione sola, per tutti i blocchi',
       /function confiniTaglioBlocco\(itemId, blk\)/.test(codice));
    t('capoversi per il testo...', /const contenuto = document\.querySelector\(`\.tpl-editor-block-body\[data-block-id="\$\{itemId\}"\] \.tpl-block-richtext`\)/.test(codice));
    t('...categorie per le tabelle lunghe', /corpo\.querySelectorAll\('table\[data-categoria-index\]'\)/.test(codice));
    t('e una categoria non visibile su questa pagina non e un bersaglio', /if \(r\.height === 0\) return;/.test(codice));
    t('e il primo non conta: prima di tutto non e un taglio', /if \(i === 0\) return;/.test(codice));
    t('si aggancia al confine PIU VICINO al dito', /if \(d < distanza\) \{ distanza = d; vicino = c; \}/.test(codice));
    t('E LO FA VEDERE, prima di mollare', /function mostraAnteprimaTaglio\(y, togli\)/.test(codice)
       && /la pagina finisce qui/.test(src));
    // UN TOCCO SENZA TRASCINARE NON DEVE TAGLIARE: una maniglia che agisce al solo sfioro
    // e' una trappola su uno schermo tattile.
    t('un tocco senza trascinare non taglia niente', /if \(!scelto\) return;/.test(codice));
    // L'annulla si salva PRIMA di toccare qualunque cosa, e vale per tutti e due i modi:
    // il taglio a categoria e quello a capoverso.
    t('e l azione si puo annullare',
       /if \(!scelto\) return;[\s\S]{0,400}?salvaUndoSnapshotEditor\(\);[\s\S]{0,80}?if \(scelto\.categoria\)/.test(codice));
    // LA MANIGLIA SCRIVE LO STESSO DATO DEL MENU, non uno parallelo: due modi di dire la
    // stessa cosa devono restare la stessa cosa, o si torna ai due elenchi da tenere
    // allineati a mano — che in questo file e' gia' costato tre volte.
    t('sulle tabelle scrive categorieForzaPaginaPrima, lo stesso dato del menu',
       /if \(!Array\.isArray\(blkT\.categorieForzaPaginaPrima\)\) blkT\.categorieForzaPaginaPrima = \[\];/.test(codice));
    t('e la scelta a mano mette da parte l automatismo, come da sempre',
       /blkT\.tagliAutomatici = \[\];/.test(codice));
    t('e viene detto dove ritrovarla', /La ritrovi anche in «Modifica testo»/.test(src));

    // IL MAGNETISMO SI VEDE, non si subisce. Segnalato: «fallo meno scattoso, tipo
    // un'animazione magnetica che fa capire che non si ferma sul singolo rigo». La riga non
    // salta da un capoverso all'altro: ci scivola, con una molla corta — e la vibrazione
    // scatta SOLO al cambio di capoverso, non a ogni pixel (un ronzio continuo non dice piu'
    // niente, e fa sembrare il gesto scattoso proprio mentre cerca di dire il contrario).
    t('LA RIGA SCIVOLA fra un capoverso e l altro, non salta',
       /transition: top 140ms cubic-bezier\(\.22,1\.4,\.36,1\)/.test(src));
    t('e la vibrazione scatta solo quando si cambia capoverso',
       /if \(bloccoManigliaStato\.ultimoIndice !== vicino\.indice\) \{[\s\S]{0,120}?triggerVibrate\(6\);/.test(codice));
    t('portandola su un taglio esistente, la riga diventa rossa e dice di toglierlo',
       /togli questa interruzione/.test(src) && /#dc2626/.test(src));
    t('e mollando li, il taglio viene TOLTO', /if \(scelto\.gia\) \{[\s\S]{0,120}?togliInterruzioneNelTesto/.test(codice));
    t('con piu di due pagine il messaggio lo dice', /il blocco ora occupa \$\{quante\} pagine/.test(src));
  }

  console.log('\n--- DUE MANIGLIE AFFIANCATE, mai sugli angoli ---');
  {
    // «Ho paura che possa andare in conflitto con l'altezza delle righe per le tabelle»:
    // giusto. Per il testo quella maniglia era libera perche' non faceva piu' niente; per una
    // tabella l'altezza delle righe fa un lavoro vero — ed e' quella che si usa per far stare
    // un allegato in tre pagine invece di quattro. Prendergliela sarebbe stato togliere un
    // comando che funziona per farne uno che esiste gia' altrove.
    const corpoTab2 = d.querySelector('.tpl-editor-block-body[data-block-id="bTab"]');
    // La tabella-colpi non e' divisibile: una maniglia sola, quella dell'altezza.
    const manigileTab = d.querySelectorAll('[data-block-id="bTab"] .tpl-editor-handle-bottom, [data-block-taglio="bTab"]');
    t('un blocco NON divisibile tiene una maniglia sola', manigileTab.length === 1);

    const css = [...d.querySelectorAll('style')].map(s => s.textContent).join('\n');
    // NON SUGLI ANGOLI: in ogni programma di disegno un angolo vuol dire «ridimensiona in
    // diagonale», e metterci un comando che taglia le pagine sarebbe una promessa falsa.
    t('le due maniglie stanno a un terzo e a due terzi del lato inferiore',
       /\.tpl-editor-handle-bottom\.e-coppia-sx \{ left: 30%; \}/.test(css)
       && /\.tpl-editor-handle-bottom\.e-coppia-dx \{ left: 70%; \}/.test(css));
    t('quindi affiancate, mai agli angoli', !/e-coppia-(sx|dx) \{ left: (0|100)%/.test(css));
    t('e si distinguono anche dal colore, non solo dall icona',
       /\.tpl-editor-handle-bottom\.e-taglio \{ background: #f59e0b;/.test(css));
    // Chi e' divisibile E ha un'altezza vera le tiene tutte e due.
    const codice = src.split('\n').filter(r => !/^\s*(\/\/|\*|\/\*)/.test(r)).join('\n');
    t('le due maniglie compaiono insieme solo su chi ha entrambi i mestieri',
       /const dueManiglie = puoEssereTagliato && haAltezzaVera;/.test(codice));
    t('e il testo, che un altezza vera non ce l ha, tiene solo le forbici',
       /const haAltezzaVera = bloccoARighe && item\.type !== 'testo';/.test(codice));
    t('la seconda maniglia e cablata al solo taglio',
       /attivaManigliaScalaBlocco\(handle, handle\.dataset\.blockId \|\| handle\.dataset\.blockTaglio,\s*\n?\s*!!handle\.dataset\.blockTaglio\)/.test(codice));
    t('e il doppio tap di reset non le si applica: non c e niente da azzerare',
       /const chiaveTap = \(soloTaglio \? 'taglio:' : 'scala:'\) \+ itemId;/.test(codice));
  }

  console.log('\n--- Dal seguito del blocco: i comandi ci sono davvero ---');
  {
    const codice = src.split('\n').filter(r => !/^\s*(\/\/|\*|\/\*)/.test(r)).join('\n');
    // «Modifica testo» dal continuo non partiva: cercava il blocco SOLO nella pagina aperta,
    // e una pagina di continuazione ha le righe vuote per costruzione — li' non c'e' niente
    // da trovare. Usciva in silenzio: il comando c'era, si premeva, non succedeva nulla.
    t('l editor del testo cerca il blocco in TUTTE le pagine',
       /function apriTplTextEditor\(blockId\) \{[\s\S]{0,600}?const blk = [^;\n]*trovaBloccoPerIdOvunque\(blockId\);/.test(codice));
    t('e anche il salvataggio, o si perderebbero le modifiche appena fatte',
       /const blk = trovaBloccoPerIdOvunque\(tplTextEditorTargetBlockId\);/.test(codice));

    // UN BLOCCO POSATO SU UNA PAGINA GENERATA SPARIVA AL PRIMO RICALCOLO: una cancellazione
    // silenziosa, cioe' il difetto peggiore possibile. Ora il rifiuto e' esplicito.
    t('una pagina generata dal programma rifiuta i blocchi, invece di mangiarseli',
       /function paginaGenerataDalProgramma\(page\)/.test(codice)
       && /if \(page && page\.autoContinuazione\) return false;/.test(codice));
    t('e lo dice, spiegando dove metterlo davvero',
       /QUESTA PAGINA LA COSTRUISCE L/.test(src) && /Mettilo sulla pagina di origine/.test(src));
    t('anche quando si tocca la palette, non solo trascinando',
       /if \(paginaGenerataDalProgramma\(page\)\) return;/.test(codice));
  }

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko > 0 ? 1 : 0);
})();
