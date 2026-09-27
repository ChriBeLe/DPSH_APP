// I TAG, ACCESI DAVVERO — E IL VALORE CHE ARRIVA SUL FOGLIO.
//
// Questa suite nasce da una segnalazione precisa: «le frasi sono tutte rotte, compaiono
// vuote, e i tag non mostrano quello che c'e' scritto». C'erano gia' 45 controlli sui tag,
// tutti verdi. Verdi e inutili, perche' leggevano il FILE: verificavano che il codice
// CHIEDESSE ctx.projId, mai che qualcuno glielo desse. Nessuno glielo dava — ne'
// computeEditorPreviewCtx per l'anteprima, ne' buildSurveyReportHtml per il PDF — quindi
// valoriCantiere riceveva null e OGNI tag usciva come «[Committente]».
//
// Da qui in poi si misura il risultato, non l'intenzione: si accende l'app, si apre un
// template che contiene tag veri, e si guarda cosa c'e' scritto nel foglio.
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const percorso = __dirname + '/../dist/DPSH.html';
const src = fs.readFileSync(percorso, 'utf8');

const vc = new VirtualConsole(); let errori = [];
vc.on('jsdomError', e => errori.push('JSDOM: ' + (e.message || '')));
vc.on('error', (...a) => errori.push('console.error: ' + a.map(String).join(' ')));
['warn', 'log', 'info', 'debug'].forEach(k => vc.on(k, () => {}));

// Tre verticali attorno a Sava (TA), col GPS: servono le coordinate vere, perche' una delle
// cose che qui si controlla e' proprio la frase di ubicazione.
const prove = {};
[[40.4033, 17.5586], [40.4051, 17.5602], [40.4018, 17.5571]].forEach(([lat, lng], i) => {
  prove['s' + (i + 1)] = {
    id: 's' + (i + 1),
    header: { provaNr: String(i + 1), lat: String(lat), lng: String(lng), comune: 'Sava',
              localita: 'Contrada Sant Anna', date: '2026-05-12' },
    logs: [{ start: 0, end: 8.4, colpi: 5 }], photos: [], strati: []
  };
});

// IL TESTO DEL BLOCCO E' QUELLO CHE ESCE DALL'EDITOR: pastiglie vuote, con il solo
// riferimento. Non e' un caso limite costruito ad arte — e' la forma normale del documento
// dopo che qualcuno ha aperto il blocco e ha salvato, perche' il nodo del tag e' un atomo e
// il suo testo non sta nel documento. Se il valore non si rilegge, qui non c'e' piu' niente.
const HTML_DOPO_EDITOR =
  '<h1>1. Premessa</h1>' +
  '<p>Il committente <span data-tag="committente" class="dpsh-tag"></span>, con sede in ' +
  '<span data-tag="sedeCommittente" class="dpsh-tag"></span>, ha incaricato la scrivente. ' +
  '<span data-tag="fraseUbicazione" class="dpsh-tag"></span> ' +
  '<span data-tag="fraseSondaggi" class="dpsh-tag"></span> ' +
  '<span data-tag="fraseProfondita" class="dpsh-tag"></span> (vedi ' +
  '<span data-tag="figuraSeguente" class="dpsh-tag"></span>).</p>' +
  '<p>Coordinate: <span data-tag="coordinate" class="dpsh-tag"></span>. Penetrometro ' +
  '<span data-tag="nomePenetrometro" class="dpsh-tag"></span>, massa ' +
  '<span data-tag="massaBattente" class="dpsh-tag"></span> kg.</p>';

const stato = {
  projects: {
    p1: {
      id: 'p1', name: 'Sava', comune: 'Sava', provincia: 'Taranto', localita: 'Contrada Sant Anna',
      committente: 'Eurisko S.r.l.', sedeCommittente: 'Via Roma 14, Sava (TA)',
      denominazioneIntervento: 'Ampliamento capannone', date: '2026-05-12',
      createdAt: 1, surveys: prove, strati: [], notes: null
    },
    // Un SECONDO cantiere, che serve a una cosa sola: dimostrare che il valore si rilegge
    // dal progetto scelto e non e' cotto dentro al testo.
    p2: {
      id: 'p2', name: 'Genzano', comune: 'Genzano di Lucania', provincia: 'Potenza', localita: 'Serra',
      committente: 'Comune di Genzano', sedeCommittente: 'Piazza Municipio 1, Genzano (PZ)',
      // Una prova senza registro misurazioni: il cantiere esiste (altrimenti non comparirebbe
      // nella tendina), ma non ha profondita' da dichiarare — e' il caso in cui il testo NON
      // deve inventarsi un numero.
      createdAt: 2, strati: [], notes: null,
      surveys: { z1: { id: 'z1', header: { provaNr: '1', comune: 'Genzano di Lucania', localita: 'Serra', date: '2026-06-01' }, logs: [], photos: [], strati: [] } }
    }
  },
  currentProjectId: 'p1',
  settings: {},
  reportTemplates: {
    prova: {
      id: 'prova', name: 'Con i tag', builtIn: false,
      margins: { top: 14, bottom: 14, left: 12, right: 12 },
      pages: [{
        id: 'pg1', cols: 4, header: { imageDataUrl: null, text: '' }, footer: { text: '' },
        rows: [
          { id: 'r1', blocks: [{ id: 'b1', type: 'testo', colSpan: 4, richHtml: HTML_DOPO_EDITOR }] },
          // Due figure vere: servono a controllare che il menu @ offra QUESTE, non un elenco
          // fisso scritto a mano.
          { id: 'r2', blocks: [{ id: 'bMappa', type: 'inquadramento', colSpan: 4 }] },
          { id: 'r3', blocks: [{ id: 'bFoto', type: 'immagine-libera', colSpan: 4 }] }
        ]
      }]
    }
  }
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
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const clic = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

(async () => {
  await attesa(1000);
  t('l app si accende senza errori', errori.length === 0);
  if (errori.length) console.log('        ', errori.slice(0, 3));

  console.log('\n--- Il valore si legge, senza essere scritto nel documento ---');
  {
    const r = tipo => w.risolviTagPerVista(tipo);
    t('il committente arriva dal progetto', r('committente').valore === 'Eurisko S.r.l.');
    t('e la sede, che e il dato che cambia l impaginazione', r('sedeCommittente').valore === 'Via Roma 14, Sava (TA)');
    // LE DODICI CHIAVI FUORI REGISTRO. valoriCantiere ne conosceva trenta, il registro dei
    // tag ne dichiarava diciotto: le altre — tutte usate dal testo generato — uscivano
    // stampate col nome grezzo della variabile.
    t('anche una frase gia accordata, che prima usciva come [fraseSondaggi]',
       /^sono stati realizzati 3 sondaggi DPSH spinti$/.test(r('fraseSondaggi').valore));
    t('e la didascalia', r('didascaliaFigura').valore.length > 0);
    t('e un dato dello strumento', r('massaBattente').valore.length > 0);
  }

  console.log('\n--- Le coordinate: due errori che si nascondevano a vicenda ---');
  {
    // La chiave 'coordinate' non veniva MAI creata da valoriCantiere, e la frase di
    // ubicazione la leggeva come `.valore` invece che `.testo`. Il primo errore rendeva il
    // secondo invisibile, e il risultato era che la relazione non diceva dove fosse il
    // cantiere — la mancanza per cui quella frase era stata scritta.
    const c = w.risolviTagPerVista('coordinate').valore;
    t('il tag coordinate mostra qualcosa', c.length > 0);
    t('con i gradi e i punti cardinali, non due numeri crudi', /° [NS] — .*° [EO]$/.test(c));
    const u = w.risolviTagPerVista('fraseUbicazione').valore;
    t('LA FRASE DI UBICAZIONE DICE IL COMUNE', /in agro del Comune di Sava/.test(u));
    t('e la provincia', /\(Taranto\)/.test(u));
    t('e la localita', /in località Contrada Sant Anna/.test(u));
    t('E LE COORDINATE, che prima non ci finivano mai', /alle coordinate geografiche .*°/.test(u));
  }

  console.log('\n--- IL FOGLIO: quello che l utente guarda davvero ---');
  // Qui casca tutto il resto. Le pastiglie nel template sono VUOTE (e' la forma che esce
  // dall'editor): se la risoluzione non funziona, sul foglio non c'e' niente da leggere.
  {
    const btnHome = d.getElementById('btnHomeView');
    if (btnHome) clic(btnHome);
    await attesa(200);
    clic(d.getElementById('btnOpenReportTemplatesHome'));
    await attesa(300);
    const matite = [...d.querySelectorAll('#reportTemplatesList .tpl-report-modifica')];
    t('il template di prova compare nella lista', matite.length >= 1);
    // L'ultimo della lista e' quello aggiunto: il "Classico" e' sempre il primo.
    if (matite.length) clic(matite[matite.length - 1]);
    await attesa(800);

    const blocco = d.querySelector('.tpl-editor-block-body[data-block-id="b1"] .tpl-block-richtext');
    t('il blocco di testo e sul foglio', !!blocco);
    const testo = blocco ? blocco.textContent : '';
    console.log('        testo sul foglio: ' + JSON.stringify(testo.slice(0, 120)));

    t('IL BLOCCO NON E VUOTO', testo.replace(/\s/g, '').length > 60);
    t('il committente si legge, e non e «[Committente]»',
       testo.indexOf('Eurisko S.r.l.') !== -1 && testo.indexOf('[Committente]') === -1);
    t('e la sede', testo.indexOf('Via Roma 14, Sava (TA)') !== -1);
    t('LE FRASI CI SONO: non sono pastiglie vuote',
       /in agro del Comune di Sava/.test(testo) && /sondaggi DPSH spinti/.test(testo));
    t('e le profondita vere del registro', /8,4 m/.test(testo));
    t('nessun nome di variabile stampato nel foglio',
       !/\[frase|\[elencoProve|\[massaBattente|\[coordinate/.test(testo));
    t('il titolo del contenuto e rimasto un titolo', !!blocco && !!blocco.querySelector('h1'));

    // IL RIFERIMENTO ALLA FIGURA. Era uno <span> semplice, e lo schema del testo lo
    // cancellava al primo salvataggio: «fig. ?» restava scritto cosi' per sempre, senza
    // piu' nessun aggancio. Ora e' un tag, e il marcatore si ricostruisce a ogni stampa.
    const rif = d.querySelector('.tpl-editor-block-body[data-block-id="b1"] [data-rif-figura]');
    t('IL RIFERIMENTO ALLA FIGURA E ANCORA AGGANCIATO', !!rif);
    // IL NUMERO SI VEDE SUL FOGLIO. Il template ha l'inquadramento subito dopo il testo:
    // «la figura seguente» e' quella, ed e' la numero 1.
    t('E PORTA IL NUMERO VERO, non «fig. ?»', !!rif && rif.textContent === 'fig. 1');
    t('e non e marcato come mancante, perche la figura c e', !!rif && !rif.hasAttribute('data-mancante'));

    console.log('\n--- La figura: il numero si vede subito, se la figura c e ---');
    {
    // «fig. ?» sul foglio era un buco inutile: la numerazione girava solo sul documento
    // assemblato, ma il template APERTO le sue figure le conosce gia'. E quando la figura
    // davvero non c'e', la pastiglia porta il NOME del riferimento — che si legge — invece
    // di un punto interrogativo che non dice nemmeno cosa si stava cercando.
      const f = w.risolviTagPerVista('figura:ruolo:inquadramento');
      t('IL NUMERO C E, non un punto interrogativo', /^fig\. \d/.test(f.valore));
      t('e non e piu segnato come in attesa', f.attesa === false);
      const senza = w.risolviTagPerVista('figura:ruolo:stratigrafia');
      t('e se quella figura non c e, il tag dice il proprio nome',
         senza.valore === 'figura stratigrafia' && senza.attesa === true);
    }


  }

  console.log('\n--- Cambiando cantiere cambia il testo: il valore non e cotto dentro ---');
  {
    const sel = d.getElementById('selTemplateEditorPreviewProject');
    t('c e la tendina del cantiere di anteprima', !!sel);
    if (sel) {
      sel.value = 'p2';
      sel.dispatchEvent(new w.Event('change', { bubbles: true }));
      await attesa(600);
      const blocco = d.querySelector('.tpl-editor-block-body[data-block-id="b1"] .tpl-block-richtext');
      const testo = blocco ? blocco.textContent : '';
      console.log('        con l altro cantiere: ' + JSON.stringify(testo.slice(0, 90)));
      t('IL TESTO SEGUE IL CANTIERE SCELTO', testo.indexOf('Comune di Genzano') !== -1);
      t('e il vecchio valore non e rimasto appiccicato', testo.indexOf('Eurisko S.r.l.') === -1);
      t('un cantiere senza prove non inventa profondita: lo dichiara mancante',
         /\[Frase «profondità»\]/.test(testo));
    }
  }

  console.log('\n--- COMPILARE UN TAG ROSSO: cosa dice la finestra, e dove finisce il dato ---');
  {
    // Si torna sul primo cantiere, quello con i dati veri.
    const sel = d.getElementById('selTemplateEditorPreviewProject');
    if (sel) { sel.value = 'p1'; sel.dispatchEvent(new w.Event('change', { bubbles: true })); }
    await attesa(500);
    const pastiglie = [...d.querySelectorAll('.tpl-editor-block-body[data-block-id="b1"] .dpsh-tag[data-tag]')];
    const sede = pastiglie.find(p => p.getAttribute('data-tag') === 'sedeCommittente');
    t('la pastiglia della sede e sul foglio', !!sede);

    if (sede) {
      clic(sede);
      await attesa(400);
      const titolo = (d.getElementById('appDialogTitleText') || {}).textContent || '';
      const messaggio = (d.getElementById('appDialogMessage') || {}).textContent || '';
      const etichetta = (d.querySelector('#appDialogFields label') || {}).textContent || '';
      const campo = d.querySelector('#appDialogFields [data-campo="valore"]');
      console.log('        titolo:    ' + JSON.stringify(titolo));
      console.log('        messaggio: ' + JSON.stringify(messaggio));

      // LA FINESTRA DICEVA «Inserisci / [object Object]». appPrompt vuole
      // (messaggio, valore, opzioni) e le si passava un oggetto: finiva stampato cosi'.
      t('NIENTE [object Object] da nessuna parte',
         !/\[object Object\]/.test(titolo + messaggio + etichetta));
      t('IL TITOLO DICE QUALE DATO SI STA COMPILANDO', /Sede del committente/i.test(titolo));
      t('E IL MESSAGGIO DICE DI QUALE CANTIERE', /Sava/.test(messaggio));
      t('con quante prove ha, per non confondere due cantieri omonimi', /3 prove/.test(messaggio));
      t('e dice anche dove verra salvato', /anagrafica del cantiere/i.test(messaggio));
      t('il campo mostra il valore attuale, non uno vuoto',
         !!campo && campo.value === 'Via Roma 14, Sava (TA)');
      t('e il tasto dice cosa fa', /salva nel cantiere/i.test((d.getElementById('appDialogOk') || {}).textContent || ''));

      // Si compila e si conferma.
      if (campo) { campo.value = 'Corso Umberto 3, Manduria (TA)'; }
      clic(d.getElementById('appDialogOk'));
      await attesa(500);

      const proj = JSON.parse(w.localStorage.getItem('dpsh_app_state')).projects.p1;
      t('IL DATO E SALVATO NELL ANAGRAFICA DEL CANTIERE', proj.sedeCommittente === 'Corso Umberto 3, Manduria (TA)');
      const testo = (d.querySelector('.tpl-editor-block-body[data-block-id="b1"] .tpl-block-richtext') || {}).textContent || '';
      t('E IL TESTO LO MOSTRA SUBITO', testo.indexOf('Corso Umberto 3, Manduria (TA)') !== -1);
      t('e il vecchio valore e sparito', testo.indexOf('Via Roma 14') === -1);
    }

    // IL COMUNE E' UN CASO DIVERSO, ed e' il caso che si perdeva. comune, localita' e
    // committente vivono nell'INTESTAZIONE DI OGNI PROVA: la copia sul progetto e' derivata, e
    // syncStateToProject la riscrive da capo a ogni salvataggio della prova aperta. Scrivere
    // solo sul progetto voleva dire vedere il dato sparire poco dopo, senza nessun avviso.
    {
      const sede2 = [...d.querySelectorAll('.tpl-editor-block-body[data-block-id="b1"] .dpsh-tag[data-tag]')]
        .find(p => p.getAttribute('data-tag') === 'committente');
      t('la pastiglia del committente e sul foglio', !!sede2);
      if (sede2) {
        clic(sede2);
        await attesa(400);
        const messaggio = (d.getElementById('appDialogMessage') || {}).textContent || '';
        t('per un dato che vive nella prova, la finestra lo dice',
           /Intestazione Cantiere/i.test(messaggio) && /tutte le prove/i.test(messaggio));
        const campo = d.querySelector('#appDialogFields [data-campo="valore"]');
        if (campo) campo.value = 'Calò Impianti SRL';
        clic(d.getElementById('appDialogOk'));
        await attesa(500);

        const st = JSON.parse(w.localStorage.getItem('dpsh_app_state'));
        const proj = st.projects.p1;
        t('il dato e sul progetto', proj.committente === 'Calò Impianti SRL');
        const prove = Object.values(proj.surveys || {});
        t('E NELL INTESTAZIONE DI TUTTE LE PROVE, che e la casa vera del dato',
           prove.length === 3 && prove.every(sv => sv.header.committente === 'Calò Impianti SRL'));
        t('e nello stato vivo, cosi la scheda Intestazione Cantiere lo mostra',
           (st.header || {}).committente === 'Calò Impianti SRL');
        const testo = (d.querySelector('.tpl-editor-block-body[data-block-id="b1"] .tpl-block-richtext') || {}).textContent || '';
        t('e il testo lo mostra', testo.indexOf('Calò Impianti SRL') !== -1);
      }
    }

    // I DATI CALCOLATI non si compilano: si dice da dove vengono, e di quale cantiere.
    const calcolato = [...d.querySelectorAll('.tpl-editor-block-body[data-block-id="b1"] .dpsh-tag[data-tag]')]
      .find(p => p.getAttribute('data-tag') === 'fraseSondaggi');
    if (calcolato) {
      clic(calcolato);
      await attesa(400);
      const messaggio = (d.getElementById('appDialogMessage') || {}).textContent || '';
      t('un dato calcolato non apre un campo da riempire', !d.querySelector('#appDialogFields [data-campo="valore"]'));
      t('ma dice cosa vale adesso e perche non si tocca',
         /Valore attuale/.test(messaggio) && /si corregge/i.test(messaggio) && /Sava/.test(messaggio));
      clic(d.getElementById('appDialogOk'));
      await attesa(200);
    }
  }

  console.log('\n--- SI SCEGLIE TOCCANDO, senza cancellare e riscrivere ---');
  {
    const rif = d.querySelector('.tpl-editor-block-body[data-block-id="b1"] [data-rif-figura]');
    t('la pastiglia della figura e sul foglio', !!rif);
    t('e sa quale tag e nel sorgente del blocco', !!rif && rif.hasAttribute('data-tag-i'));
    if (rif) {
      clic(rif);
      await attesa(400);
      const titolo = (d.getElementById('appDialogTitleText') || {}).textContent || '';
      const tendina = d.querySelector('#appDialogFields [data-campo="bersaglio"]');
      t('SI APRE UNA SCELTA, non un avviso che dice di cancellare il tag',
         /riferimento alla figura/i.test(titolo) && !!tendina && tendina.tagName === 'SELECT');
      const opzioni = tendina ? [...tendina.options].map(o => o.value) : [];
      console.log('        scelte: ' + JSON.stringify(opzioni));
      t('con l inquadramento fra le scelte', opzioni.indexOf('figura:ruolo:inquadramento') !== -1);
      t('e le figure vere del template, che e il caso delle foto delle prove',
         opzioni.indexOf('figura:blocco:bFoto') !== -1);
      t('e quella attuale gia selezionata', tendina && tendina.value === 'figura');

      // Si sceglie la foto, si conferma, e il testo deve cambiare da solo.
      if (tendina) { tendina.value = 'figura:blocco:bFoto'; }
      clic(d.getElementById('appDialogOk'));
      await attesa(600);
      const dopo = d.querySelector('.tpl-editor-block-body[data-block-id="b1"] [data-rif-figura]');
      t('IL RIFERIMENTO E CAMBIATO, e punta alla foto (figura 2)',
         !!dopo && dopo.textContent === 'fig. 2');
      const st = JSON.parse(w.localStorage.getItem('dpsh_app_state'));
      t('e il testo attorno non e stato toccato',
         /ha incaricato la scrivente/.test((d.querySelector('.tpl-editor-block-body[data-block-id="b1"] .tpl-block-richtext') || {}).textContent || ''));

      // E si rimette com'era, per non falsare i controlli che seguono.
      clic(dopo);
      await attesa(400);
      const t2 = d.querySelector('#appDialogFields [data-campo="bersaglio"]');
      if (t2) t2.value = 'figura';
      clic(d.getElementById('appDialogOk'));
      await attesa(500);
      t('e si puo tornare indietro allo stesso modo',
         (d.querySelector('.tpl-editor-block-body[data-block-id="b1"] [data-rif-figura]') || {}).textContent === 'fig. 1');
    }
  }

  console.log('\n--- A QUALE figura punta il riferimento: il menu lo chiede ---');
  {
    const voci = w.tagFigureDisponibili ? w.tagFigureDisponibili() : null;
    // tagFigureDisponibili vive nello scope dell'app: si controlla dal menu vero, che e'
    // comunque il posto dove l'utente la incontra.
    const modale = d.getElementById('modalTplTextEditor');
    const corpo = d.querySelector('.tpl-editor-block-body[data-block-id="b1"]');
    for (let n = 0; n < 2 && corpo; n++) {
      corpo.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 }));
      corpo.dispatchEvent(new w.PointerEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 }));
    }
    await attesa(400);
    const menuBlocco = d.getElementById('templateEditorBlockMenu');
    // Per azione, non per scritta: il comando ora dice solo «Modifica» (o «Scrivi»).
    const voceTesto = menuBlocco && menuBlocco.querySelector('button[data-action="modifica-testo"]');
    if (voceTesto) clic(voceTesto);
    await attesa(500);
    t('la finestra del testo si apre', !!d.getElementById('modalTplTextEditor') && d.getElementById('modalTplTextEditor').classList.contains('open'));

    const btnAt = d.querySelector('#tplTextToolbar [data-comando-nota="inserisci-tag"]');
    if (btnAt) clic(btnAt);
    await attesa(400);
    const menu = d.getElementById('menuTagNota');
    t('il menu @ si apre', !!menu);
    if (menu) {
      const etichette = [...menu.querySelectorAll('[data-tag-scelto]')].map(b => ({
        tipo: b.dataset.tagScelto, nome: (b.querySelector('.menu-tag-nome') || {}).textContent || ''
      }));
      const tipi = etichette.map(v => v.tipo);
      console.log('        voci figura: ' + JSON.stringify(tipi.filter(x => x.indexOf('figura') === 0)));
      t('C E LA FIGURA SEGUENTE, com era prima', tipi.indexOf('figura') !== -1);
      t('E L INQUADRAMENTO, che prima non si poteva nominare', tipi.indexOf('figura:ruolo:inquadramento') !== -1);
      t('e la foto della prova', tipi.indexOf('figura:ruolo:foto') !== -1);
      // LE FIGURE VERE DEL TEMPLATE: l'elenco non e' scritto a mano, si costruisce sui blocchi
      // che ci sono davvero. Un elenco fisso sarebbe il solito secondo elenco da tenere
      // allineato, e in questo file e' gia' andata male tre volte.
      t('E LE FIGURE VERE DEL TEMPLATE, una per blocco',
         tipi.indexOf('figura:blocco:bMappa') !== -1 && tipi.indexOf('figura:blocco:bFoto') !== -1);
      const nomeMappa = (etichette.find(v => v.tipo === 'figura:blocco:bMappa') || {}).nome || '';
      t('col nome che si legge sotto la figura, non l id del blocco', /inquadramento/i.test(nomeMappa));
      t('e non c e piu la vecchia voce senza bersaglio', tipi.indexOf('figuraSeguente') === -1);
    }
    const annulla = d.getElementById('btnTplTextEditorAnnulla');
    if (annulla) clic(annulla);
    await attesa(200);
  }

  console.log('\n--- Andata e ritorno nel motore: il tag sopravvive ---');
  {
    const host = d.createElement('div'); d.body.appendChild(host);
    const entrata = '<p>Ciao <span class="dpsh-tag" data-tag="comune">Sava</span> e ' +
                    '<span class="dpsh-tag" data-tag="figuraSeguente" data-rif-figura="1">fig. ?</span>.</p>';
    let uscita = '';
    try {
      const ed = new w.NoteEditor.Editor({ element: host, extensions: w.NoteEditor.ESTENSIONI, content: entrata });
      uscita = ed.getHTML(); ed.destroy();
    } catch (e) { uscita = 'ERRORE ' + e.message; }
    t('il riferimento al dato attraversa l editor', /data-tag="comune"/.test(uscita));
    t('E ANCHE QUELLO ALLA FIGURA, che prima veniva cancellato', /data-tag="figuraSeguente"/.test(uscita));
    // Il testo NON sopravvive, ed e' giusto cosi': il documento porta il riferimento, il
    // valore si rilegge. Dichiararlo qui evita che qualcuno "aggiusti" la cosa sbagliata.
    t('il valore non resta scritto nel documento (e il punto di tutto il sistema)',
       !/>Sava</.test(uscita));
  }

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko > 0 ? 1 : 0);
})();
