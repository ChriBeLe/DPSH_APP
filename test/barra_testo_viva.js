// LA BARRA DEL BLOCCO DI TESTO, PREMUTA DAVVERO.
//
// Segnalazione: «qui i tasti escono fuori dal menu, e non sembrano esserci gli allineamenti».
// Due difetti, uno visibile e uno che il primo nascondeva:
//
//  1. la barra andava a capo fra un gruppo e l'altro, ma un GRUPPO non andava a capo dentro
//     di se'. Il primo gruppo ne conteneva quindici (tipo di riga, formule, tag, interruzioni,
//     elenchi, allineamento): su uno schermo stretto la coda usciva dalla finestra, e
//     l'allineamento — che era l'ultimo — diventava irraggiungibile pur essendo li'.
//
//  2. sotto, un difetto peggiore: la barra del blocco di testo e' una COPIA di quella delle
//     note, e i gestori cercavano i pulsanti per id. Gli id della copia erano btnTpl..., i
//     gestori cercavano btnNote...: TREDICI pulsanti non facevano niente. E non davano nessun
//     errore, perche' ogni gestore era protetto da `if (el)`. Sembravano pulsanti veri.
//
// Da cui questa suite: non si guarda se il pulsante c'e' nel file, si preme e si guarda cosa
// succede al documento.
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const src = fs.readFileSync(__dirname + '/../dist/DPSH.html', 'utf8');

const vc = new VirtualConsole(); let errori = [];
vc.on('jsdomError', e => errori.push('JSDOM: ' + (e.message || '')));
vc.on('error', (...a) => errori.push('console.error: ' + a.map(String).join(' ')));
['warn', 'log', 'info', 'debug'].forEach(k => vc.on(k, () => {}));

const stato = {
  projects: { p1: { id: 'p1', name: 'Sava', comune: 'Sava', provincia: 'Taranto', committente: 'Eurisko S.r.l.',
    createdAt: 1, strati: [], notes: null,
    surveys: { s1: { id: 's1', header: { provaNr: '1', comune: 'Sava', date: '2026-05-12' }, logs: [{ start: 0, end: 6, colpi: 4 }], photos: [], strati: [] } } } },
  currentProjectId: 'p1', settings: {},
  reportTemplates: { prova: { id: 'prova', name: 'Con un testo', builtIn: false,
    margins: { top: 14, bottom: 14, left: 12, right: 12 },
    pages: [{ id: 'pg1', cols: 4, header: { imageDataUrl: null, text: '' }, footer: { text: '' },
      rows: [{ id: 'r1', blocks: [{ id: 'b1', type: 'testo', colSpan: 4, richHtml: '<p>Una riga di prova.</p>' }] }] }] } }
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
    // jsdom non impagina: il menu dei tag chiede coordsAtPos, che a sua volta chiede
    // getClientRects sui nodi di testo. Non e' un difetto dell'app — e' un pezzo che jsdom
    // non implementa — quindi si tappa qui invece di far finta di non vedere gli errori.
    if (!w.Text.prototype.getClientRects) w.Text.prototype.getClientRects = function () { return [{ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }]; };
    if (!w.Element.prototype.getClientRects) w.Element.prototype.getClientRects = function () { return [{ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }]; };
    const rett = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 });
    if (!w.Range.prototype.getClientRects) w.Range.prototype.getClientRects = function () { return [rett()]; };
    if (!w.Range.prototype.getBoundingClientRect) w.Range.prototype.getBoundingClientRect = rett;
    Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return 800; }, configurable: true });
  }
});
const w = dom.window, d = w.document;
const attesa = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const clic = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

(async () => {
  await attesa(1000);
  t('l app si accende senza errori', errori.length === 0);
  if (errori.length) console.log('        ', errori.slice(0, 3));

  const barre = ['noteToolbar', 'tplTextToolbar'];

  console.log('\n--- Le due barre hanno gli stessi comandi: sono la stessa barra ---');
  {
    // I comandi che DEVONO esserci in tutte e due. La galleria, il disegno e la ricerca no:
    // sono cose delle note (le foto del progetto, le altre note) e nel blocco di testo di un
    // template non vogliono dire niente.
    const attesi = ['allineamento', 'evidenzia', 'link', 'immagine', 'tabella', 'riga-divisoria',
                    'annulla', 'ripeti', 'pulisci', 'pedice', 'apice', 'formula', 'simboli',
                    'inserisci-tag', 'interruzione', 'regola-pagina'];
    barre.forEach(id => {
      const barra = d.getElementById(id);
      t('la barra ' + id + ' esiste', !!barra);
      if (!barra) return;
      const mancanti = attesi.filter(c => !barra.querySelector('[data-comando-nota="' + c + '"]'));
      t(id + ': ci sono tutti i comandi' + (mancanti.length ? ' (mancano: ' + mancanti.join(', ') + ')' : ''),
         mancanti.length === 0);
      ['P', 'H1', 'H2', 'H3', 'UL', 'CHECKLIST', 'BLOCKQUOTE'].forEach(tag => {
        t(id + ': c e ' + tag, !!barra.querySelector('[data-format-tag="' + tag + '"]'));
      });
      ['bold', 'italic', 'underline', 'strikeThrough'].forEach(c => {
        t(id + ': c e ' + c, !!barra.querySelector('[data-note-cmd="' + c + '"]'));
      });
      // L'ALLINEAMENTO E LE SUE QUATTRO SCELTE, giustificato compreso: e' quello che la
      // segnalazione diceva di non vedere.
      const pop = barra.querySelector('[data-comando-nota="allineamento"]').parentElement.querySelector('.note-shape-popover');
      t(id + ': il pulsante allineamento ha il suo pannello', !!pop);
      ['left', 'center', 'right', 'justify'].forEach(a => {
        t(id + ': fra le scelte c e ' + a, !!pop && !!pop.querySelector('[data-allinea="' + a + '"]'));
      });
    });
  }

  console.log('\n--- Il pannellino dell allineamento non e piu schiacciato ---');
  {
    // MIA REGRESSIONE, e vale la pena scriverla: per fermare il traboccamento avevo messo
    // `.note-toolbar * { max-width: 100% }`. Quella stella pesca anche i pannellini a
    // scomparsa, che vivono in posizione ASSOLUTA dentro un contenitore largo quanto il loro
    // pulsante: max-width:100% li schiacciava a trenta pixel, e le quattro scelte
    // dell'allineamento si accavallavano sulla riga sotto. Un selettore universale dentro un
    // contenitore e' una rete che pesca anche quello che non doveva esserci.
    const css = [...d.querySelectorAll('style')].map(s => s.textContent).join('\n');
    t('la stella non c e piu: si limita ai figli diretti', !/\.note-toolbar \*\{max-width/.test(css));
    t('e i figli diretti restano contenuti', /\.note-toolbar > \*\{max-width:100%;\}/.test(css));
    t('IL PANNELLINO E ESPLICITAMENTE ESENTE, cosi nessuno lo schiaccia di nuovo',
       /\.note-shape-popover\{max-width:none;\}/.test(css));
    t('e resta assoluto, sotto il suo pulsante', /\.note-shape-popover\{position:absolute;top:calc\(100% \+ 6px\)/.test(css));
  }

  console.log('\n--- Il carattere e l interlinea si raggiungono da dove si scrive ---');
  {
    // Segnalato: «proprio non trovo il modo di cambiare il font, nemmeno l'interlinea».
    // C'erano — dietro un'icona nella barra dell'editor del template, cioe' non dove si scrive.
    const b = d.querySelector('#tplTextToolbar [data-comando-nota="stile-documento"]');
    t('C E UN TASTO nella barra del testo', !!b);
    t('e dice a parole cosa apre, non solo con un icona', /carattere/i.test((b && b.textContent) || ''));
    const css = [...d.querySelectorAll('style')].map(s => s.textContent).join('\n');
    // Il pannello e la finestra del testo stanno nello stesso piano (341) ma il testo viene
    // DOPO nel documento: a parita' di z-index vince l'ultimo. Senza un piano suo, il pannello
    // si sarebbe aperto dietro — lo stesso inciampo del compositore, mesi fa.
    t('e si apre SOPRA la finestra del testo, non dietro',
       /\.modal\.tier-sopra-testo \{ z-index: 351; \}/.test(css)
       && /id="modalStileTesto"/.test(src) && /tier-editor-top tier-sopra-testo" id="modalStileTesto/.test(src));
  }

  console.log('\n--- La tendina dice che cos e ---');
  {
    const sel = d.querySelector('#tplTextToolbar [data-comando-nota="regola-pagina"]');
    t('la tendina c e', !!sel);
    const voci = sel ? [...sel.options].map(o => o.textContent) : [];
    console.log('        voci: ' + JSON.stringify(voci));
    t('OGNI VOCE DICE DI COSA PARLA: «fine pagina», non «impaginazione normale»',
       voci.length === 4 && voci.every(v => /^Fine pagina:/.test(v)));
    t('e il titolo spiega che e una regola di stampa, non un comando che sposta adesso',
       /non sposta niente adesso/i.test(sel ? (sel.getAttribute('title') || '') : ''));
  }

  console.log('\n--- Nessun gruppo puo piu traboccare ---');
  {
    // Non si misura la larghezza (jsdom non impagina): si controlla la REGOLA che impedisce
    // il traboccamento, e che nessun gruppo torni a essere un magazzino da quindici comandi.
    const css = [...d.querySelectorAll('style')].map(s => s.textContent).join('\n');
    const regola = (css.match(/\.note-tb-group\{[^}]*\}/) || [''])[0];
    t('il gruppo va a capo dentro di se', /flex-wrap:\s*wrap/.test(regola));
    t('e non puo essere piu largo della barra', /max-width:\s*100%/.test(regola));
    t('la tendina dell impaginazione puo restringersi', /\.note-tb-group \.note-tb-select\{[^}]*min-width:\s*0/.test(css));
    barre.forEach(id => {
      const gruppi = [...d.querySelectorAll('#' + id + ' > .note-tb-group')];
      t(id + ': i comandi sono divisi in piu famiglie, non in un muro unico', gruppi.length >= 5);
      // Si contano i comandi VISIBILI: quelli dentro un pannellino a scomparsa non occupano
      // spazio nella barra, quindi non c'entrano col traboccamento.
      const visibili = g => [...g.querySelectorAll('.note-tb-btn, select')].filter(b => !b.closest('.note-shape-popover')).length;
      const max = Math.max(...gruppi.map(visibili));
      t(id + ': il gruppo piu grande ha al massimo 8 comandi (ne aveva 15) — ora ' + max, max <= 8);
    });
  }

  console.log('\n--- E ADESSO SI PREMONO: cosa succede al documento ---');
  {
    const btnHome = d.getElementById('btnHomeView');
    if (btnHome) clic(btnHome);
    await attesa(200);
    clic(d.getElementById('btnOpenReportTemplatesHome'));
    await attesa(300);
    const matite = [...d.querySelectorAll('#reportTemplatesList .tpl-report-modifica')];
    if (matite.length) clic(matite[matite.length - 1]);
    await attesa(800);

    // Si apre "Modifica testo" come si apre col dito: doppio tap sul corpo del blocco, poi
    // il comando nel menu.
    const corpo = d.querySelector('.tpl-editor-block-body[data-block-id="b1"]');
    t('il blocco di testo e sul foglio', !!corpo);
    for (let n = 0; n < 2 && corpo; n++) {
      corpo.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 }));
      corpo.dispatchEvent(new w.PointerEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 }));
    }
    await attesa(400);
    const menu = d.getElementById('templateEditorBlockMenu');
    // Il comando si cerca per azione e non per scritta: la scritta è diventata «Modifica»
    // (o «Scrivi» sul blocco vuoto), sotto «Rigenera testo» dei blocchi del modello.
    const voce = menu && [...menu.querySelectorAll('button[data-action="modifica-testo"]')].find(b => /modifica|scrivi/i.test(b.textContent || ''));
    t('nel menu del blocco c e «Modifica testo»', !!voce);
    if (voce) clic(voce);
    await attesa(500);

    const modale = d.getElementById('modalTplTextEditor');
    t('LA FINESTRA SI APRE', !!modale && modale.classList.contains('open'));
    const barra = d.getElementById('tplTextToolbar');
    const html = () => (d.getElementById('tplTextEditorBody') || {}).innerHTML || '';

    const premi = (sel) => { const b = barra.querySelector(sel); if (b) clic(b); return !!b; };
    errori = [];

    // Il cursore dentro il testo: senza, i comandi agiscono su una selezione inesistente.
    const ed = () => w.document.querySelector('#tplTextEditorBody .ProseMirror') || d.getElementById('tplTextEditorBody');
    t('il motore e montato nella finestra', !!ed() && html().length > 0);

    premi('[data-format-tag="H2"]');
    await attesa(120);
    t('H2 TRASFORMA DAVVERO LA RIGA IN UN TITOLO', /<h2/i.test(html()));
    premi('[data-format-tag="P"]');
    await attesa(120);
    t('e si torna a paragrafo', !/<h2/i.test(html()));

    premi('[data-format-tag="UL"]');
    await attesa(120);
    t('l elenco puntato funziona', /<ul/i.test(html()));
    premi('[data-format-tag="UL"]');
    await attesa(120);

    premi('[data-format-tag="BLOCKQUOTE"]');
    await attesa(120);
    t('la citazione funziona', /<blockquote/i.test(html()));
    premi('[data-format-tag="BLOCKQUOTE"]');
    await attesa(120);

    // L'ALLINEAMENTO. Era il pulsante scollegato piu' visibile: c'era, si apriva, e le quattro
    // scelte non facevano niente.
    premi('[data-comando-nota="allineamento"]');
    await attesa(120);
    const pop = barra.querySelector('[data-comando-nota="allineamento"]').parentElement.querySelector('.note-shape-popover');
    t('il pannello dell allineamento si apre', !!pop && pop.style.display === 'block');
    if (pop) clic(pop.querySelector('[data-allinea="justify"]'));
    await attesa(150);
    t('E IL GIUSTIFICATO ARRIVA AL DOCUMENTO', /text-align:\s*justify/.test(html()));
    if (pop) { premi('[data-comando-nota="allineamento"]'); await attesa(100); clic(pop.querySelector('[data-allinea="center"]')); await attesa(150); }
    t('e si puo cambiare in centrato', /text-align:\s*center/.test(html()));

    premi('[data-comando-nota="riga-divisoria"]');
    await attesa(120);
    t('la linea divisoria si inserisce', /<hr/i.test(html()));

    // La tabella chiede righe e colonne in una finestrella: il gesto completo comprende il
    // "Inserisci". Premuta dalla barra del blocco, prima finiva NELLE NOTE DEL PROGETTO —
    // non un pulsante inerte, un pulsante che scrive nel posto sbagliato.
    premi('[data-comando-nota="tabella"]');
    await attesa(300);
    const conferma = [...d.querySelectorAll('.modal.open button, #appDialog button')]
      .find(b => /inserisci/i.test(b.textContent || ''));
    if (conferma) clic(conferma);
    await attesa(300);
    t('la tabella si inserisce NEL BLOCCO', /<table/i.test(html()));
    t('e NON nelle note del progetto',
       !/<table/i.test((d.getElementById('noteEditorBody') || {}).innerHTML || ''));

    premi('[data-comando-nota="pedice"]');
    await attesa(120);
    premi('[data-comando-nota="interruzione"]');
    await attesa(150);
    t('l interruzione di pagina si inserisce', /interruzione|data-interruzione|page-break/i.test(html()));

    // L'EVIDENZIATORE: il pannello si apriva VUOTO, perche' i colori venivano disegnati solo
    // nel contenitore delle note.
    premi('[data-comando-nota="evidenzia"]');
    await attesa(120);
    const popHl = barra.querySelector('[data-comando-nota="evidenzia"]').parentElement.querySelector('.note-shape-popover');
    t('il pannello dell evidenziatore si apre', !!popHl && popHl.style.display === 'block');
    t('E NON E VUOTO: i colori ci sono', !!popHl && popHl.querySelectorAll('[data-hl-color]').length >= 6);

    // ANNULLA: deve disfare l'ultima cosa fatta, non restare inerte.
    const prima = html();
    premi('[data-comando-nota="annulla"]');
    await attesa(200);
    t('ANNULLA cambia davvero il documento', html() !== prima);

    // Il tasto @ apre il menu dei dati del cantiere.
    premi('[data-comando-nota="inserisci-tag"]');
    await attesa(250);
    const menuTag = d.querySelector('#menuTagNota, [data-menu-tag], .dpsh-menu-tag');
    t('IL TASTO @ apre il menu dei dati', !!menuTag && menuTag.style.display !== 'none');

    // LA PALETTA DEI SIMBOLI: closest('#noteToolbar') era null in questa barra, quindi il
    // pannello non veniva mai inserito nella pagina.
    premi('[data-comando-nota="simboli"]');
    await attesa(200);
    const paletta = d.getElementById('palettaSimboli');
    t('LA PALETTA DEI SIMBOLI compare anche in questa barra', !!paletta);

    console.log('\n--- Si scrive come si stampa ---');
    {
      // L'editor mostrava sempre il suo stile — testo a bandiera, corpo di sistema — mentre il
      // documento e' giustificato e col carattere scelto: si componeva un paragrafo e sul
      // foglio ne compariva un altro, con altri a capo.
      const corpo = d.getElementById('tplTextEditorBody');
      const stile = corpo ? (corpo.getAttribute('style') || '') : '';
      t('il corpo dell editor porta le variabili del documento',
         /--tpl-font:/.test(stile) && /--tpl-interlinea:/.test(stile) && /--tpl-allineamento:/.test(stile));
      t('e si dichiara «come stampa», cosi le regole lo trovano',
         !!corpo && corpo.classList.contains('note-editor-come-stampa'));
      const css = [...d.querySelectorAll('style')].map(s => s.textContent).join('\n');
      t('GIUSTIFICATO DI SERIE anche mentre si scrive',
         /\.note-editor-come-stampa p\{text-align:var\(--tpl-allineamento, justify\)/.test(css));
      // GLI ELENCHI HANNO SEMPRE UN RIENTRO: e' il rientro a dire "questi vanno insieme, e
      // sono subordinati a cio' che precede".
      t('gli elenchi hanno un rientro, sia mentre si scrive...',
         /\.note-editor-come-stampa ul,\.note-editor-come-stampa ol\{margin-left:6mm;\}/.test(css));
      t('...sia sul foglio', /\.tpl-block-richtext ul, \.tpl-block-richtext ol \{ margin: 0 0 var\(--tpl-spazio-par, 6pt\) 6mm; padding-left: 5mm; \}/.test(css));
      t('e le voci di elenco non si giustificano: sono righe corte', /\.tpl-block-richtext li > p \{ margin: 0; text-indent: 0; text-align: left; \}/.test(css));
      // LE FORMULE: o dentro il testo, o centrate fuori dal paragrafo. Non c'e' una terza forma
      // sensata, e chiederlo a mano ogni volta e' lavoro che il programma sa fare.
      t('un capoverso di sola formula viene riconosciuto da solo',
         /p\.setAttribute\('data-formula-blocco', '1'\)/.test(src));
      t('e sul foglio e centrato, senza rientro e senza giustificazione',
         /\.tpl-block-richtext p\[data-formula-blocco\] \{ text-align: center; text-indent: 0;/.test(css));
    }

    console.log('\n--- LA BARRA DICE DOVE SEI ---');
    {
      // Segnalato: «voglio che quando sono col cursore su un testo formattato mi dica quali
      // tasti sono accesi. Nel caso dell'allegato doveva essere H1 (o H2, appunto non riesco
      // a capirlo), bold». aggiornaStatoBarraNote esisteva ed era gia' scritta per l'editor
      // attivo — ma nel blocco di testo NON LA CHIAMAVA NESSUNO: onUpdate e onSelectionUpdate
      // aggiornavano il segnaposto e il menu dei tag, e basta. I pulsanti restavano spenti
      // sempre, e su un H1 contro un H2 non si poteva far altro che indovinare.
      const barra = d.getElementById('tplTextToolbar');
      const acceso = sel => { const b = barra.querySelector(sel); return !!b && b.classList.contains('is-active'); };

      premi('[data-format-tag="H2"]');
      await attesa(200);
      t('col cursore in un H2, il tasto H2 e ACCESO', acceso('[data-format-tag="H2"]'));
      t('e H1 no: si distinguono, che era il punto', !acceso('[data-format-tag="H1"]'));
      t('ne «testo normale»', !acceso('[data-format-tag="P"]'));

      // Col cursore fermo, accendere il grassetto non cambia ne' il documento ne' la
      // selezione: e' un «marcatore in attesa». E' proprio il caso in cui il pulsante DEVE
      // dire che e' acceso, altrimenti non si sa cosa succedera' alla prossima lettera.
      premi('[data-note-cmd="bold"]');
      await attesa(200);
      t('e il grassetto si accende anche col cursore fermo, prima di scrivere',
         acceso('[data-note-cmd="bold"]'));
      premi('[data-note-cmd="bold"]');
      await attesa(150);
      t('e si spegne quando non lo e', !acceso('[data-note-cmd="bold"]'));

      premi('[data-format-tag="P"]');
      await attesa(200);
      t('tornando a paragrafo, «testo normale» e acceso e H2 spento',
         acceso('[data-format-tag="P"]') && !acceso('[data-format-tag="H2"]'));
    }

    console.log('\n--- Il tasto che riporta allo stile del template ---');
    {
      // «Mi piaceva comunque il bottone che facesse tornare la formattazione allo stile
      // inserito da template! Salvava il culo!». Diverso da «pulisci», che toglie tutto e
      // riporta a paragrafo: qui restano grassetti, corsivi, titoli ed elenchi — sono
      // contenuto — e se ne vanno solo le eccezioni di impaginazione.
      const barra = d.getElementById('tplTextToolbar');
      const b = barra.querySelector('[data-comando-nota="riporta-stile"]');
      t('IL TASTO C E, e dice a parole cosa fa', !!b && /stile del template/i.test(b.textContent || ''));
      t('e il suggerimento dice cosa NON tocca', !!b && /grassetti, corsivi e titoli restano/i.test(b.getAttribute('title') || ''));

      // Si sporca il testo: titolo, grassetto, colore, allineamento.
      premi('[data-format-tag="H2"]');
      await attesa(150);
      // Il grassetto si mette sul TESTO, quindi prima si seleziona: Ctrl+A dentro l'editor,
      // cioe' il gesto vero. Col cursore fermo resterebbe un marcatore in attesa, e nel
      // documento non comparirebbe nessun <strong> da controllare.
      const corpoEd = d.querySelector('#tplTextEditorBody .ProseMirror') || d.getElementById('tplTextEditorBody');
      if (corpoEd) corpoEd.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'a', code: 'KeyA', ctrlKey: true, bubbles: true }));
      await attesa(150);
      premi('[data-note-cmd="bold"]');
      await attesa(200);
      const popAll = barra.querySelector('[data-comando-nota="allineamento"]').parentElement.querySelector('.note-shape-popover');
      premi('[data-comando-nota="allineamento"]');
      await attesa(120);
      if (popAll) clic(popAll.querySelector('[data-allinea="center"]'));
      await attesa(200);
      t('il testo e stato sporcato per davvero', /text-align:\s*center/.test(html()));

      clic(b);
      await attesa(300);
      t('L ALLINEAMENTO A MANO E SPARITO', !/text-align:\s*center/.test(html()));
      t('MA IL TITOLO E RESTATO: e struttura, non impaginazione', /<h2/i.test(html()));
      t('e il grassetto pure', /<strong>|<b>/i.test(html()));
    }

    t('e NIENTE ha sollevato un errore', errori.length === 0);
    if (errori.length) console.log('        ', errori.slice(0, 4));
  }

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko > 0 ? 1 : 0);
})();
