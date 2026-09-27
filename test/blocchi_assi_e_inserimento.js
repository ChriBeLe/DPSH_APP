// QUATTRO RICHIESTE, UN CRITERIO SOLO: OGNI COMANDO MUOVE CIÒ CHE DICE DI MUOVERE.
//
//  1. «da ogni blocco devi rimuovere assolutamente la possibilità di modificare le righe»
//  2. «per il grafico la strana gestione della larghezza dev'essere rinominata in scala»
//  3. «la maniglia destra modifica la misura orizzontale, quella inferiore l'altezza e le
//      proporzioni senza mai intaccare altri assi di misura scala»
//  4. «il blocco troppo grande va inserito alla minore scala possibile, con l'opzione di
//      inserirlo così com'è; se il ridimensionamento fallisce, lo inserisce comunque»
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const percorso = __dirname + '/../dist/DPSH.html';
const src = fs.readFileSync(percorso, 'utf8');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const attesa = ms => new Promise(r => setTimeout(r, ms));

console.log('\n--- 1. Le righe non si toccano più, da nessun blocco ---');
{
  t('il campo Righe non esiste piu nel menu', src.indexOf('data-action="rowspan-input"') < 0);
  t('e nemmeno il suo gestore', src.indexOf("[data-action=\"rowspan-input\"]") < 0);
  t('la funzione che creava i rowSpan e sparita', src.indexOf('function impostaRowSpanVoce') < 0);
  // Togliere il comando non basta: finche' un template salvato conserva un rowSpan, il motore
  // continua a percorrere il ramo dei "gruppi di righe" — cioe' la logica che si voleva
  // togliere resterebbe viva, senza piu' nessun modo di accorgersene.
  t('i template salvati vengono normalizzati all avvio',
    /Object\.values\(state\.reportTemplates\)\.forEach\(tpl => appiattisciRowSpanTemplate\(tpl\)\)/.test(src));
  t('e la normalizzazione toglie sia il rowSpan sia i segnaposto',
    /function appiattisciRowSpanTemplate[\s\S]{0,700}delete entry\.rowSpan[\s\S]{0,300}filter\(e => !e\.reserved\)/.test(src));
}

console.log('\n--- 2. Sul grafico si chiama Scala ---');
{
  t('l etichetta cambia in base al tipo di blocco',
    /etichetta: eGraficoStratigrafia \? 'Scala' : 'Larghezza'/.test(src));
  t('e «Ingrandimento» sul grafico non compare proprio',
    /\$\{eGraficoStratigrafia \? '' : htmlControlloNumerico\(\{\s*\n\s*azione: 'scale-input'/.test(src));
}

console.log('\n--- 3. La maniglia inferiore, sul grafico, muove solo l altezza ---');
{
  t('la maniglia riconosce il blocco grafico',
    /const bloccoGrafico = blk\.type === 'grafico-stratigrafia';/.test(src));
  t('e scrive lo STESSO dato del cursore Altezza del menu, non un secondo parallelo',
    /bloccoGrafico \? \(blk\.altezzaScalaGrafico \|\| 1\)/.test(src));
  t('durante il trascinamento il grafico si RIDISEGNA invece di essere stirato',
    /bloccoManigliaStato\.bloccoGrafico\) \{[\s\S]{0,1200}buildBlockContentHtml\('grafico-stratigrafia'/.test(src));
  t('e non gli si applica nessuno zoom',
    !/bloccoGrafico[\s\S]{0,200}innerEl\.style\.zoom/.test(src));
  t('al rilascio il valore finisce su altezzaScalaGrafico',
    /else if \(bloccoGrafico\) \{[\s\S]{0,500}blk\.altezzaScalaGrafico = finale;/.test(src));
  t('la maniglia destra resta quella della misura orizzontale',
    /attivaManigliaColspanBlocco\(handle, handle\.dataset\.entryId\)/.test(src));
}

console.log('\n--- 4. Il blocco che non entra: tre strade, e nessun vicolo cieco ---');
{
  const i = src.indexOf('async function gestisciInserimentoBloccoNuovoConOverflow');
  const corpo = src.slice(i, src.indexOf('BLOCCHI "FLOWABLE"', i));
  // Erano tre risposte; poi è stata chiesta esplicitamente la quarta, «Annulla piazzamento»
  // (vedi il commento QUATTRO STRADE nell'app). Il test resta sul punto: mai un vicolo cieco.
  t('la domanda ha quattro risposte, compresa la rinuncia',
    /okLabel: 'Adatta a questa pagina', extraLabel: 'Inserisci ugualmente',\s*extra2Label: 'Annulla piazzamento', cancelLabel: 'Nuova pagina'/.test(corpo)
    && /if \(scelta === 'extra2'\) \{[\s\S]{0,900}undoTemplateEditor\(\{ senzaTraccia: true \}\);/.test(corpo));
  t('«Inserisci ugualmente» marca il blocco e non lo tocca',
    /blockObj\.fuoriMargineAccettato = true;[\s\S]{0,300}Blocco inserito così com/.test(corpo));
  t('il riflusso automatico rispetta quella scelta invece di spostarlo lo stesso',
    /return !!e\.fuoriMargineAccettato;/.test(src));
  // I 14 tentativi a piccoli passi sono stati sostituiti (richiesta esplicita) da un salto
  // diretto al minimo dell'altezza, poi, solo se serve, alla larghezza: più deciso e non
  // resta «a metà». Il punto del test resta: l'adattamento prova davvero prima di arrendersi.
  t('l adattamento prova davvero prima di arrendersi: prima l altezza al minimo, poi la larghezza',
    /PASSO 1[\s\S]{0,200}scriviValoreAdatta\(scalaMin\);\s*overflowPx = misuraSforamentoAdatta\(\);/.test(corpo)
    && /PASSO 2[\s\S]{0,3000}blockObj\.colSpan = colSpanMassimo;\s*overflowPx = misuraSforamentoAdatta\(\);/.test(corpo));
  // Il punto vero: prima, se l'adattamento non bastava, il blocco veniva ANCHE spostato —
  // l'utente aveva chiesto «adattalo qui» e riceveva un blocco rimpicciolito al minimo E
  // altrove, cioe' il peggio delle due strade e nessuna delle due era quella scelta.
  t('e se non basta, il blocco resta comunque qui invece di essere spostato',
    /if \(!entratoNellaPagina\) \{[\s\S]{0,700}blockObj\.fuoriMargineAccettato = true;/.test(corpo));
  t('con un messaggio che dice cosa e successo davvero',
    /inserito comunque: resta più alto dello spazio rimasto/.test(corpo));
}

// ======================================================================================
// VIVO: il menu si apre su ogni tipo di blocco senza il campo Righe, e nessuno di essi
// perde i comandi che deve avere. È il controllo che un taglio nel menu non abbia portato
// via anche il resto — che è esattamente quello che può succedere tagliando dentro una
// stringa lunga.
// ======================================================================================
function accendi() {
  const vc = new VirtualConsole(); const errori = [];
  vc.on('jsdomError', e => errori.push('JSDOM: ' + (e.message || '')));
  vc.on('error', (...a) => errori.push('console.error: ' + a.map(String).join(' ')));
  ['warn', 'log', 'info', 'debug'].forEach(k => vc.on(k, () => {}));
  const stato = {
    projects: {
      p1: {
        id: 'p1', name: 'Sava', comune: 'Sava', createdAt: 1, strati: [], notes: null,
        surveys: {
          s1: {
            id: 's1', reportTemplateId: 'prova',
            header: { provaNr: '1', comune: 'Sava', localita: 'Contrada', date: '2026-08-29' },
            // Venti intervalli veri: con UN solo intervallo l'altezza del grafico resta
            // incollata al suo minimo (70px) e nessun trascinamento la muoverebbe — il test
            // misurerebbe la clamp, non la maniglia.
            logs: Array.from({ length: 20 }, (_, i) => ({ start: +(i * 0.2).toFixed(1), end: +((i + 1) * 0.2).toFixed(1), colpi: 3 + (i % 7) })),
            photos: [], strati: []
          }
        }
      }
    },
    currentProjectId: 'p1', currentSurveyId: 's1', settings: {}, reportTemplateId: 'prova',
    reportTemplates: {
      prova: {
        id: 'prova', name: 'Tutti i tipi', builtIn: false,
        margins: { top: 14, bottom: 14, left: 12, right: 12 },
        pages: [{
          id: 'pg1', cols: 4, header: { imageDataUrl: null, text: '' }, footer: { text: '' },
          rows: [
            // Un blocco col rowSpan e un segnaposto: la migrazione deve ripulirli.
            { id: 'r1', blocks: [{ id: 'bDati', type: 'dati-prova', colSpan: 4, rowSpan: 2 }] },
            { id: 'r1b', autoCreatedForRowSpan: true, blocks: [{ id: 'bRes', reserved: true, ownerId: 'bDati', colSpan: 4 }] },
            { id: 'r2', blocks: [{ id: 'bGraf', type: 'grafico-stratigrafia', colSpan: 4 }] },
            { id: 'r3', blocks: [{ id: 'bDiv', type: 'divisore', colSpan: 4 }] },
            { id: 'r4', blocks: [{ id: 'bTesto', type: 'testo', colSpan: 4, richHtml: '<p>ciao</p>' }] }
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
  return { dom, errori };
}

(async () => {
  const { dom, errori } = accendi();
  const w = dom.window, d = w.document;
  w.alert = () => {};
  const clic = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const doppioTap = (el) => {
    for (let n = 0; n < 2; n++) {
      el.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 }));
      el.dispatchEvent(new w.PointerEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 }));
    }
  };
  await attesa(1100);
  t('l app si accende senza errori', errori.length === 0);
  if (errori.length) console.log('        ', errori.slice(0, 3));

  console.log('\n--- La migrazione ha ripulito il template salvato ---');
  {
    const tpl = JSON.parse(w.localStorage.getItem('dpsh_app_state') || '{}');
    // Lo stato in memoria è quello normalizzato: si controlla dal DOM, che è il suo effetto.
    const btnHome = d.getElementById('btnHomeView');
    if (btnHome) clic(btnHome);
    await attesa(200);
    clic(d.getElementById('btnOpenReportTemplatesHome'));
    await attesa(300);
    const matita = d.querySelector('#reportTemplatesList .tpl-report-modifica[data-tpl-id="prova"]');
    if (matita) clic(matita);
    await attesa(900);
    t('l editor si apre', d.querySelectorAll('.tpl-editor-block[data-block-id]').length > 0);
    // La riga creata solo per ospitare il segnaposto se n'è andata con lui: era spazio
    // occupato da niente.
    t('il segnaposto invisibile non c e piu', !d.querySelector('[data-block-id="bRes"]'));
    t('e i blocchi veri ci sono tutti',
      ['bDati', 'bGraf', 'bDiv', 'bTesto'].every(id => !!d.querySelector(`.tpl-editor-block-body[data-block-id="${id}"]`)));
  }

  console.log('\n--- Il menu si apre su ogni tipo, senza Righe e senza aver perso il resto ---');
  const menu = () => d.getElementById('templateEditorBlockMenu');
  const apri = async (id) => {
    const corpo = d.querySelector(`.tpl-editor-block-body[data-block-id="${id}"]`);
    if (!corpo) return null;
    doppioTap(corpo);
    await attesa(420);
    return menu();
  };
  const etichette = () => [...menu().querySelectorAll('.tpl-ctrl-num-etichetta')].map(e => e.textContent.trim());

  {
    const m = await apri('bDati');
    t('DATI PROVA: il menu si apre', !!m);
    t('niente campo Righe', !m.querySelector('[data-action="rowspan-input"]'));
    t('ma le disposizioni delle schede ci sono', m.querySelectorAll('[data-action="schede-layout"]').length === 3);
    t('e la larghezza si chiama ancora Larghezza', etichette().indexOf('Larghezza') >= 0);
  }
  {
    const m = await apri('bGraf');
    t('GRAFICO: il menu si apre', !!m);
    t('niente campo Righe', !m.querySelector('[data-action="rowspan-input"]'));
    t('la misura in millimetri si chiama Scala', etichette().indexOf('Scala') >= 0);
    t('e non si chiama piu Larghezza', etichette().indexOf('Larghezza') < 0);
    t('«Ingrandimento» non c e', etichette().indexOf('Ingrandimento') < 0);
    t('ma l Altezza del grafico si', etichette().indexOf('Altezza') >= 0);
    t('e le quattro legende pure', m.querySelectorAll('[data-action="legenda-grafico"]').length === 4);
  }
  {
    const m = await apri('bDiv');
    t('DIVISORE: il menu si apre', !!m);
    t('niente campo Righe', !m.querySelector('[data-action="rowspan-input"]'));
    t('le tre linee ci sono', m.querySelectorAll('[data-action="divisore-linea"]').length === 3);
    t('e lo spaziatore elastico', !!m.querySelector('[data-action="divisore-elastico"]'));
  }
  {
    const m = await apri('bTesto');
    t('TESTO: il menu si apre', !!m);
    t('niente campo Righe', !m.querySelector('[data-action="rowspan-input"]'));
    t('la dimensione carattere in punti c e', etichette().some(e => /Dimensione carattere/.test(e)));
    t('e il tasto per aprire l editor di testo', !!m.querySelector('[data-action="modifica-testo"]'));
  }

  console.log('\n--- La maniglia inferiore sul grafico cambia l altezza, non la scala ---');
  {
    const corpoG = () => d.querySelector('.tpl-editor-block-body[data-block-id="bGraf"]');
    const box = () => {
      const svg = corpoG().querySelector('svg');
      const v = (svg.getAttribute('viewBox') || '0 0 0 0').split(/\s+/).map(Number);
      return { w: v[2], h: v[3] };
    };
    // Le maniglie vivono nell'overlay di SELEZIONE: compaiono solo sul blocco selezionato.
    // Il menu era rimasto aperto sul blocco di testo, quindi qui si torna sul grafico.
    await apri('bGraf');
    const prima = box();
    const maniglia = d.querySelector('.tpl-editor-handle-bottom[data-block-id="bGraf"]')
      || d.querySelector('.tpl-editor-block[data-block-id="bGraf"] .tpl-editor-handle-bottom');
    t('la maniglia inferiore esiste sul grafico', !!maniglia);
    if (maniglia) {
      const pev = (tipo, y) => new w.PointerEvent(tipo, { bubbles: true, clientY: y, clientX: 50, pointerId: 3, button: 0 });
      maniglia.dispatchEvent(pev('pointerdown', 200));
      maniglia.dispatchEvent(pev('pointermove', 400));   // verso il basso = piu' alto
      await attesa(150);
      const durante = box();
      t('trascinando il grafico si allunga', durante.h > prima.h);
      t('e la larghezza non si muove di un pixel', durante.w === prima.w);
      maniglia.dispatchEvent(pev('pointerup', 400));
      await attesa(400);
      const dopo = box();
      t('al rilascio l altezza resta quella nuova', dopo.h > prima.h);
      t('e la larghezza resta quella di prima', dopo.w === prima.w);
      // Nessuno zoom sul contenitore: sarebbe il riscalamento uniforme tolto la volta scorsa.
      const inner = d.querySelector('.tpl-editor-block-inner[data-block-id="bGraf"]');
      t('e il contenitore non ha preso nessuno zoom',
        !inner || !/zoom\s*:\s*(?!1\b)/.test(inner.getAttribute('style') || ''));
    }
  }

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(1); });
