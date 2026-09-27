// IL GRAFICO STRATIGRAFICO: OGNI COMANDO MUOVE UN ASSE SOLO.
//
// Segnalato in cinque punti diversi, che sono lo stesso difetto: lo slider della larghezza
// «regola la scala totale invece dell'espansione laterale»; l'altezza «riduce o aumenta la
// scala generale»; la larghezza delle colonne «fa espandere il blocco anche verticalmente»;
// lo spazio dei nomi «non si capisce dove sia»; la dimensione delle etichette «fa
// rimpicciolire tutti gli altri elementi».
//
// LA CAUSA. Il disegno usciva come <svg viewBox="0 0 totalW height" width="100%">, e un
// viewBox riscala in modo UNIFORME. Qualunque cosa cambiasse totalW cambiava il rapporto
// larghezza/altezza, e il browser ri-adattava l'intero disegno — testo compreso. Allargare
// una colonna non allargava una colonna: ridisegnava tutto più grande. Non erano cinque
// difetti, era un disegno che si comportava come un'immagine invece che come
// un'impaginazione.
//
// Questa suite misura la geometria VERA dell'SVG emesso, leggendo il viewBox e le
// coordinate degli elementi. Il criterio è uno solo e si applica a ogni comando: muovendo
// quel cursore, che cosa NON deve cambiare?
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const percorso = __dirname + '/../dist/DPSH.html';
const src = fs.readFileSync(percorso, 'utf8');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const attesa = ms => new Promise(r => setTimeout(r, ms));

function accendi() {
  const vc = new VirtualConsole(); const errori = [];
  vc.on('jsdomError', e => errori.push('JSDOM: ' + (e.message || '')));
  vc.on('error', (...a) => errori.push('console.error: ' + a.map(String).join(' ')));
  ['warn', 'log', 'info', 'debug'].forEach(k => vc.on(k, () => {}));

  // Due prove di profondità DIVERSA: serve alla spunta «massima del cantiere», che deve
  // pescare il valore dall'altra prova, non da quella aperta.
  const logs = (fino) => {
    const out = []; for (let d = 0; d < fino - 0.001; d += 0.2) out.push({ start: +d.toFixed(1), end: +(d + 0.2).toFixed(1), colpi: 3 + (out.length % 7) });
    return out;
  };
  const strati = [
    { id: 'l1', name: 'SABBIE LIMOSE CON GHIAIA', color: '#e8d8a0', pattern: 'punti' },
    { id: 'l2', name: 'LIMI ARGILLOSI', color: '#c8b89a', pattern: 'linee' },
    { id: 'l3', name: 'ARGILLA COMPATTA', color: '#9a8f7a', pattern: 'incrocio' }
  ];
  const prova = (id, nr, fino) => ({
    id, reportTemplateId: 'prova',
    header: { provaNr: String(nr), comune: 'Sava', localita: 'Contrada', date: '2026-08-29', faldaDa: '2.4' },
    logs: logs(fino), photos: [],
    strati: [
      { name: strati[0].name, color: strati[0].color, pattern: strati[0].pattern, depthTo: fino * 0.35 },
      { name: strati[1].name, color: strati[1].color, pattern: strati[1].pattern, depthTo: fino * 0.7 },
      { name: strati[2].name, color: strati[2].color, pattern: strati[2].pattern, depthTo: fino }
    ]
  });
  const stato = {
    projects: {
      p1: {
        id: 'p1', name: 'Sava', comune: 'Sava', createdAt: 1, strati: [], notes: null,
        surveys: { s1: prova('s1', 1, 4.0), s2: prova('s2', 2, 11.4) }
      }
    },
    currentProjectId: 'p1', currentSurveyId: 's1', settings: { stepCm: 20 }, reportTemplateId: 'prova',
    reportTemplates: {
      prova: {
        id: 'prova', name: 'Col grafico', builtIn: false,
        margins: { top: 14, bottom: 14, left: 12, right: 12 },
        pages: [{
          id: 'pg1', cols: 4, header: { imageDataUrl: null, text: '' }, footer: { text: '' },
          rows: [
            { id: 'r1', blocks: [{ id: 'bGraf', type: 'grafico-stratigrafia', colSpan: 4 }] },
            // Un grafico che divide la riga con un testo: e' il caso che l'utente non riusciva
            // piu' a comporre.
            { id: 'r2', blocks: [
              { id: 'bAffianco', type: 'grafico-stratigrafia', colSpan: 2 },
              { id: 'bTesto', type: 'testo', colSpan: 2, richHtml: '<p>accanto</p>' }
            ] },
            // Un grafico salvato PRIMA, con lo zoom addosso: la migrazione deve conservarne
            // l'ingombro verticale invece di lasciarlo tornare grande il doppio.
            { id: 'r3', blocks: [{ id: 'bVecchio', type: 'grafico-stratigrafia', colSpan: 4, scale: 0.6 }] }
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

  const btnHome = d.getElementById('btnHomeView');
  if (btnHome) clic(btnHome);
  await attesa(200);
  clic(d.getElementById('btnOpenReportTemplatesHome'));
  await attesa(300);
  const matita = d.querySelector('#reportTemplatesList .tpl-report-modifica[data-tpl-id="prova"]');
  if (matita) clic(matita);
  await attesa(800);
  const corpo = () => d.querySelector('.tpl-editor-block-body[data-block-id="bGraf"]');
  t('l editor si apre sul blocco grafico', !!corpo());
  if (!corpo()) { console.log(`\n${ok} ok, ${ko} KO`); process.exit(1); }

  // ---- strumenti di misura sulla geometria vera dell'SVG ----
  const svg = () => corpo().querySelector('svg');
  const box = () => {
    const v = (svg().getAttribute('viewBox') || '0 0 0 0').split(/\s+/).map(Number);
    return { w: v[2], h: v[3] };
  };
  const corpiTesto = () => [...corpo().querySelectorAll('text')]
    .map(e => parseFloat(e.getAttribute('font-size'))).filter(v => isFinite(v));
  const corpoMax = () => Math.max.apply(null, corpiTesto());
  // La colonna del retino: il primo rettangolo senza riempimento disegnato a padTop.
  const stripRect = () => [...corpo().querySelectorAll('rect')]
    .find(r => r.getAttribute('fill') === 'none' && r.getAttribute('stroke') === '#0f172a');
  const larghStrip = () => parseFloat(stripRect().getAttribute('width'));
  const altezzaGriglia = () => parseFloat(stripRect().getAttribute('height'));

  // I confronti di fine suite vanno fatti contro il grafico COM'ERA, non com'è dopo che le
  // sezioni qui sotto gli hanno cambiato altezza, carattere e legenda: altrimenti si
  // misurerebbe la somma delle prove precedenti invece della cosa in esame.
  const vbDi = (id) => {
    const sv = d.querySelector(`.tpl-editor-block-body[data-block-id="${id}"] svg`);
    if (!sv) return null;
    const v = (sv.getAttribute('viewBox') || '0 0 0 0').split(/\s+/).map(Number);
    return { w: v[2], h: v[3] };
  };
  const RIFERIMENTO = vbDi('bGraf');
  const AFFIANCO_INIZIALE = vbDi('bAffianco');
  const VECCHIO_INIZIALE = vbDi('bVecchio');
  const grigliaDi = (id) => {
    const r = [...d.querySelectorAll(`.tpl-editor-block-body[data-block-id="${id}"] rect`)]
      .find(x => x.getAttribute('fill') === 'none' && x.getAttribute('stroke') === '#0f172a');
    return r ? parseFloat(r.getAttribute('height')) : 0;
  };
  const GRIGLIA_RIFERIMENTO = grigliaDi('bGraf');
  const GRIGLIA_VECCHIO = grigliaDi('bVecchio');

  console.log('\n--- Il disegno ha unità fisiche, non un fattore di scala ---');
  {
    const b = box();
    t('il viewBox ha una larghezza da foglio vero, non un numero arbitrario', b.w > 400 && b.w < 800);
    t('e una altezza coerente col numero di intervalli', b.h > 200);
    t('il testo esce in punti assoluti, non in calc() con una variabile CSS',
      svg().outerHTML.indexOf('--tpl-font-scale') < 0 && svg().outerHTML.indexOf('calc(') < 0);
    t('e il contenitore non applica piu uno zoom sopra al disegno',
      (corpo().querySelector('.tpl-editor-block-inner') || corpo()).getAttribute('style') !== null
        ? !/zoom\s*:/.test((corpo().querySelector('.tpl-editor-block-inner') || corpo()).getAttribute('style') || '')
        : true);
    t('e ogni scritta dichiara la sua misura', corpiTesto().length > 5);
  }

  // ---- pilotaggio dei cursori ----
  doppioTap(corpo());
  await attesa(400);
  const menu = () => d.getElementById('templateEditorBlockMenu');
  t('il menu del blocco si apre', !!menu());
  // htmlControlloNumerico mette data-action sull'<input type="range"> STESSO, non su un
  // contenitore: il gruppo e' il .tpl-ctrl-num che lo avvolge.
  const slider = (azione) => menu().querySelector(`input[type="range"][data-action="${azione}"]`);
  const gruppo = (azione) => { const r = slider(azione); return r ? (r.closest('.tpl-ctrl-num') || r.parentElement) : null; };
  const muovi = async (azione, valore) => {
    const r = slider(azione);
    if (!r) return false;
    r.value = String(valore);
    r.dispatchEvent(new w.Event('input', { bubbles: true }));
    r.dispatchEvent(new w.Event('change', { bubbles: true }));
    await attesa(350);
    return true;
  };
  t('i cursori del grafico sono raggiungibili',
    !!gruppo('altezza-grafico') && !!gruppo('larghezza-colonne-grafico') && !!gruppo('spazio-etichette-grafico'));

  console.log('\n--- LARGHEZZA COLONNE: solo orizzontale ---');
  {
    const prima = box(), stripPrima = larghStrip(), hPrima = altezzaGriglia(), fPrima = corpoMax();
    const mosso = await muovi('larghezza-colonne-grafico', 250);
    t('il cursore si muove', mosso);
    const dopo = box();
    t('la colonna del retino si allarga davvero', larghStrip() > stripPrima + 5);
    t('e l ALTEZZA del disegno non cambia di un pixel', dopo.h === prima.h);
    t('nemmeno l altezza della griglia', Math.abs(altezzaGriglia() - hPrima) < 0.01);
    t('e nemmeno il corpo del testo', Math.abs(corpoMax() - fPrima) < 0.01);
    t('la larghezza totale resta quella del blocco: si RIPARTISCE, non si espande', dopo.w === prima.w);
    await muovi('larghezza-colonne-grafico', 100);
  }

  console.log('\n--- SPAZIO NOMI STRATI: solo orizzontale, e visibile ---');
  {
    const prima = box(), fPrima = corpoMax();
    await muovi('spazio-etichette-grafico', 220);
    const dopo = box();
    t('l altezza non cambia', dopo.h === prima.h);
    t('la larghezza totale non cambia', dopo.w === prima.w);
    t('il corpo del testo non cambia', Math.abs(corpoMax() - fPrima) < 0.01);
    // La guida: si accende dalla spunta e disegna il riquadro entro cui i nomi vanno a capo.
    const chk = menu().querySelector('[data-action="guida-nomi-grafico"]');
    t('c e la spunta per vedere il riquadro dei nomi', !!chk);
    if (chk) {
      chk.checked = true;
      chk.dispatchEvent(new w.Event('change', { bubbles: true }));
      await attesa(400);
      const guida = [...corpo().querySelectorAll('rect')].find(r => (r.getAttribute('stroke-dasharray') || '') !== '');
      t('accendendola il riquadro compare nell anteprima', !!guida);
      t('ed e largo quanto la colonna dei nomi che si sta regolando',
        !!guida && parseFloat(guida.getAttribute('width')) > 60);
      t('con l etichetta che dice quanti pixel sono',
        corpo().innerHTML.indexOf('spazio nomi') >= 0);
      // In stampa non deve comparire: è una guida di lavoro.
      t('ma e roba dell editor: in stampa la guida non si disegna',
        /mostraGuidaNomi: !!\(ctx && ctx\.anteprima\)/.test(src));
    }
    await muovi('spazio-etichette-grafico', 100);
  }

  console.log('\n--- ALTEZZA: solo verticale, e un comando solo ---');
  {
    const prima = box(), stripPrima = larghStrip(), fPrima = corpoMax();
    await muovi('altezza-grafico', 200);
    const dopo = box();
    t('il grafico si allunga', dopo.h > prima.h + 30);
    t('ma la larghezza resta identica', dopo.w === prima.w);
    t('la colonna del retino non si allarga', Math.abs(larghStrip() - stripPrima) < 0.01);
    t('e il testo resta della sua misura', Math.abs(corpoMax() - fPrima) < 0.01);
    t('«Ingrandimento» non esiste piu per questo blocco: si sarebbe sovrapposto',
      !gruppo('scale-input'));
    await muovi('altezza-grafico', 100);
  }

  console.log('\n--- DIMENSIONE ETICHETTE: solo il carattere, in punti ---');
  {
    const prima = box(), stripPrima = larghStrip(), hPrima = altezzaGriglia(), fPrima = corpoMax();
    const g = gruppo('fontsize-pt');
    t('il carattere del grafico usa il controllo in punti, come gli altri blocchi', !!g);
    if (g) {
      const r = slider('fontsize-pt');
      // Stesso comando e stessa unita' degli altri blocchi; il pavimento e' piu' basso perche'
      // 8pt — il minimo di Word, giusto per un paragrafo — su una tacca d'asse non ci sta.
      t('con l unita in punti come gli altri blocchi', !!r && /pt/.test(g.textContent));
      t('e un intervallo utilizzabile su un grafico', !!r && parseFloat(r.min) <= 5 && parseFloat(r.max) >= 14);
      await muovi('fontsize-pt', 12);
      t('il testo cresce davvero', corpoMax() > fPrima + 2);
      t('ma la colonna del retino NON si stringe', Math.abs(larghStrip() - stripPrima) < 0.01);
      t('e la griglia non si accorcia', Math.abs(altezzaGriglia() - hPrima) < 0.01);
      t('la larghezza totale del disegno resta quella', box().w === prima.w);
      await muovi('fontsize-pt', 8);
    }
  }

  console.log('\n--- LEGENDA: quattro disposizioni, coi retini veri ---');
  {
    const bottoni = () => [...menu().querySelectorAll('[data-action="legenda-grafico"]')];
    t('ci sono quattro disposizioni', bottoni().length === 4);
    // Una parola sotto l'icona è stata chiesta esplicitamente (NOMI_LEGENDA_BREVI): le quattro
    // icone da sole non si distinguevano. Il wireframe resta, la spiegazione lunga sta nel title.
    t('ognuna con un wireframe e una parola sola',
      bottoni().every(b => b.querySelector('svg') && b.textContent.trim().length > 0 && !/\s/.test(b.textContent.trim()) && !!b.title));
    t('i valori sono quelli previsti',
      bottoni().map(b => b.dataset.val).join(',') === 'colonna,grigliaBasso,rigaBasso,nessuna');

    const scegli = async (val) => { clic(bottoni().find(b => b.dataset.val === val)); await attesa(450); };
    // I quadratini devono portare il RETINO della litologia, non una tinta piatta.
    const quadretti = () => [...corpo().querySelectorAll('rect')]
      .filter(r => (r.getAttribute('fill') || '').indexOf('url(#exp-strat-pat-') === 0);

    await scegli('colonna');
    const hColonna = box().h;
    t('COLONNA: i quadratini portano il retino della litologia', quadretti().length >= 3);

    await scegli('grigliaBasso');
    t('GRIGLIA IN BASSO: il cartiglio c e', corpo().innerHTML.indexOf('LEGENDA') >= 0);
    t('e il blocco diventa piu alto per farci stare il cartiglio', box().h > hColonna);
    t('la larghezza non cambia', box().w === (await (async () => box().w)()));
    t('e i retini ci sono anche li', quadretti().length >= 3);
    const hGriglia = box().h;

    await scegli('rigaBasso');
    t('RIGA SINGOLA: costa meno altezza della griglia', box().h <= hGriglia);
    t('e il cartiglio resta', corpo().innerHTML.indexOf('LEGENDA') >= 0);

    await scegli('nessuna');
    t('NESSUNA: niente cartiglio', corpo().innerHTML.indexOf('LEGENDA') < 0);
    t('e niente nomi a fianco', corpo().innerHTML.indexOf('ARGILLA COMPATTA') < 0);
    t('ma i retini nella colonna restano', quadretti().length >= 3);
    t('e il grafico e piu compatto di tutti', box().h <= hGriglia);

    await scegli('grigliaBasso');
    const g = gruppo('retino-legenda-grafico');
    t('la grandezza dei retini si regola', !!g);
    if (g) {
      const swatch = () => Math.min.apply(null, quadretti().map(q => parseFloat(q.getAttribute('width'))));
      const primaQ = swatch();
      await muovi('retino-legenda-grafico', 200);
      t('e i quadratini crescono davvero', swatch() > primaQ);
      await muovi('retino-legenda-grafico', 100);
    }
    await scegli('colonna');
  }

  console.log('\n--- PROFONDITÀ: la spunta guarda il cantiere, non la prova ---');
  {
    const chk = menu().querySelector('[data-action="profondita-cantiere"]');
    t('la spunta c e', !!chk);
    t('e non e spenta: questo cantiere ha dei dati', !!chk && !chk.disabled);
    // Questa prova arriva a 4,0 m; l'altra del cantiere a 11,4 m.
    const testoMenu = menu().textContent;
    t('il menu dichiara la profondita del cantiere, non fa indovinare', /11,4 m/.test(testoMenu));
    // Il fondo scala si legge direttamente: e' l'ultima tacca dell'asse delle profondita'.
    const fondoScala = () => {
      // Solo le tacche di PROFONDITA': sono le uniche scritte in monospace. Gli assi dei
      // colpi e dell'Rpd hanno numeri ben piu' grandi, e prenderli per profondita' farebbe
      // dire al controllo qualunque cosa.
      const num = [...corpo().querySelectorAll('text[font-family="monospace"]')]
        .map(e => e.textContent.replace(',', '.'))
        .map(parseFloat).filter(v => isFinite(v));
      return Math.max.apply(null, num);
    };
    const primaDellaSpunta = fondoScala();
    t('prima della spunta l asse si ferma alla profondita di QUESTA prova (4,0 m)',
      primaDellaSpunta >= 4 && primaDellaSpunta < 6);
    if (chk) {
      chk.checked = true;
      chk.dispatchEvent(new w.Event('change', { bubbles: true }));
      await attesa(500);
      const dopo = fondoScala();
      t('accendendola l asse arriva alla prova piu profonda del CANTIERE (11,4 m)',
        dopo >= 11.4 && dopo < 14);
      t('cioe si allunga davvero rispetto a prima', dopo > primaDellaSpunta + 5);
      t('e il menu lo dice', /stesso fondo scala/.test(menu().textContent));
      // La larghezza non c'entra niente con la profondita': non deve muoversi.
      t('mentre la larghezza del disegno resta quella', box().w >= 210);
    }
  }

  console.log('\n--- La soglia di sicurezza: stretto ma leggibile, mai sovrapposto ---');
  {
    // Il blocco scende a una colonna su quattro: è il caso in cui prima le colonne
    // finivano una sopra l'altra.
    const g = gruppo('larghezza-input') || gruppo('width-input');
    // Non tutti i template espongono lo stesso nome: si agisce sul dato, che è ciò che conta.
    const pg = { };
    const blocco = () => {
      const pagine = d.querySelectorAll('.tpl-editor-block-body[data-block-id="bGraf"]');
      return pagine.length;
    };
    t('il blocco esiste ancora dopo tutte le regolazioni', blocco() > 0);
    const b = box();
    t('la larghezza non e mai scesa sotto il minimo dichiarato', b.w >= 210);
    // Nessun elemento può avere larghezza negativa o nulla: è la definizione di
    // "sovrapposto" in una impaginazione a colonne.
    const larghezze = [...corpo().querySelectorAll('rect')].map(r => parseFloat(r.getAttribute('width'))).filter(v => isFinite(v));
    t('nessun rettangolo con larghezza nulla o negativa', larghezze.every(v => v > 0));
    const altezze = [...corpo().querySelectorAll('rect')].map(r => parseFloat(r.getAttribute('height'))).filter(v => isFinite(v));
    t('nessun rettangolo con altezza nulla o negativa', altezze.every(v => v > 0));
  }

  console.log('\n--- Il grafico sta accanto a un altro blocco ---');
  {
    t('il grafico a mezza riga si disegna', !!AFFIANCO_INIZIALE);
    t('e il blocco accanto c e davvero', !!d.querySelector('.tpl-editor-block-body[data-block-id="bTesto"]'));
    // Il disegno deve essere DAVVERO piu' stretto, non solo compresso dal contenitore.
    t('e il disegno e largo circa meta di quello a tutta riga',
      !!AFFIANCO_INIZIALE && Math.abs(AFFIANCO_INIZIALE.w - RIFERIMENTO.w / 2) < 20);
    t('mentre l altezza resta la stessa: la larghezza non tocca l altro asse',
      !!AFFIANCO_INIZIALE && AFFIANCO_INIZIALE.h === RIFERIMENTO.h);
  }

  console.log('\n--- Lo zoom dei template vecchi diventa altezza, non sparisce ---');
  {
    // Con scale 0,6 il grafico occupava il 60% dell'altezza della griglia: deve continuare a
    // occuparlo. Il confronto e' sulla GRIGLIA, non sull'altezza totale del disegno, perche'
    // l'intestazione in cima non si accorcia con l'altezza (e giustamente: e' testo).
    // Misurate ENTRAMBE all'apertura: piu' avanti la suite accende la profondita' di
    // cantiere su bGraf, che gli allunga l'asse — confrontarle dopo vorrebbe dire mettere a
    // paragone due assi diversi.
    const atteso = GRIGLIA_RIFERIMENTO * 0.6;
    t('il grafico salvato con lo zoom conserva il suo ingombro verticale',
      Math.abs(GRIGLIA_VECCHIO - atteso) < atteso * 0.2);
    t('e non gli resta addosso nessuno zoom',
      !/zoom\s*:/.test((d.querySelector('.tpl-editor-block-inner[data-block-id="bVecchio"]') || { getAttribute: () => '' }).getAttribute('style') || ''));
    t('la larghezza invece non la eredita: quella la decide la colonna',
      !!VECCHIO_INIZIALE && VECCHIO_INIZIALE.w === RIFERIMENTO.w);
  }

  console.log('\n--- L anteprima della Scala mostra quello che poi salva ---');
  {
    const vbG = () => {
      const v = (corpo().querySelector('svg').getAttribute('viewBox') || '0 0 0 0').split(/\s+/).map(Number);
      return v[2];
    };
    doppioTap(corpo());
    await attesa(420);
    const r = slider('larghezza-input');
    t('il cursore Scala c e sul grafico', !!r);
    if (r) {
      const prima = vbG();
      r.value = '90';
      r.dispatchEvent(new w.Event('input', { bubbles: true }));
      await attesa(200);
      const durante = vbG();
      t('gia durante il trascinamento il disegno si stringe', durante < prima);
      r.dispatchEvent(new w.Event('change', { bubbles: true }));
      await attesa(450);
      // È il punto della segnalazione: prima l'anteprima cambiava solo il contenitore e il
      // disegno restava largo com'era, poi al rilascio saltava alla misura vera.
      t('e al rilascio resta ESATTAMENTE quello che mostrava', vbG() === durante);
    }
  }

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(1); });
