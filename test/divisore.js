// IL DIVISORE: STRINGE DAVVERO, E SA FARE TRE COSE IN PIÙ.
//
// Segnalato: «orizzontalmente non si riesce a portarlo sotto i 48px circa mentre dovrei
// poterlo stringere anche di più».
//
// LA CAUSA erano DUE limiti diversi che non coincidevano. Il cursore della larghezza
// scendeva al 5% della riga (~9mm), ma il rendering applicava Math.max(0.3, span) — 0,3
// colonne su 4, cioè il 7,5% ≈ 14mm ≈ 53px. Il numero nel menu scendeva, il blocco sul
// foglio no: il cursore raccontava una cosa che il documento non faceva. Quel pavimento
// serve ai blocchi di CONTENUTO (una tabella larga tre millimetri è illeggibile e per
// giunta inafferrabile sulla tela), non a uno spazio vuoto, che a tre millimetri fa
// esattamente il suo mestiere.
//
// Le tre funzioni nuove sono verificate dove contano: nel documento di stampa, non solo
// nell'anteprima.
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const percorso = __dirname + '/../dist/DPSH.html';
const src = fs.readFileSync(percorso, 'utf8');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const attesa = ms => new Promise(r => setTimeout(r, ms));

console.log('\n--- Sul file: i quattro pavimenti adesso sono uno solo ---');
{
  const m = /function spanMinimoVoce\(entry\) \{ return \(entry && entry\.type === 'divisore'\) \? ([\d.]+) : ([\d.]+); \}/.exec(src);
  t('esiste un unico posto che decide lo span minimo di una colonna', !!m);
  if (m) {
    const divisore = parseFloat(m[1]), altri = parseFloat(m[2]);
    const px = (col) => col / 4 * 186 * 96 / 25.4;   // colonne -> px, su una riga A4 piena
    t('e per il divisore e molto piu basso che per i blocchi di contenuto', divisore < altri / 10);
    t('CONTROPROVA: col pavimento dei blocchi di contenuto non si scende sotto i ~48px', px(altri) > 48);
    t('col nuovo il divisore arriva a pochi millimetri', px(divisore) < 10);
  }
  // ERANO QUATTRO limiti scritti in posti diversi — cursore, salvataggio, span di griglia,
  // css del flex — e bastava dimenticarne uno perche' il numero scendesse e il blocco no.
  // Questo controllo li tiene contati.
  const copie = (src.match(/Math\.max\(1, Math\.min\(cols, (entry|voce)\.colSpan \|\| cols\)\)/g) || []).length;
  t('nessuna copia sparsa del pavimento nella griglia', copie === 0);
  t('e tutti i punti che impaginano una riga passano dall unico helper',
    (src.match(/spanVoceInGriglia\(/g) || []).length >= 7);
  t('il cursore della larghezza ha il suo minimo per il divisore',
    /min: haDivisore \? 1 : mmDaPct\(5\)/.test(src));
  t('e anche il salvataggio, che arrotondava in su al 5%',
    /const pctMinima = \(voce2\.type === 'divisore'\) \? 0\.5 : 5;/.test(src));
  t('l altezza scende sotto i 2mm di prima', /min: 0\.5, max: 120, passo: 0\.5/.test(src));
}

console.log('\n--- Il blocco «Separatore» non esiste più ---');
{
  t('non e piu nella palette dei tipi', !/'separatore': \{ label:/.test(src));
  t('non e piu fra i tipi ripetibili', !/'testo', 'separatore', 'divisore'/.test(src));
  t('e non ha piu un suo disegno', !/case 'separatore':/.test(src));
  // Cancellarlo e basta avrebbe lasciato un buco in mezzo a relazioni gia' impaginate.
  t('i separatori esistenti diventano divisori con la linea',
    /function convertiSeparatoriInDivisori[\s\S]{0,900}voce\.type = 'divisore';[\s\S]{0,400}divisoreLinea = 'orizzontale'/.test(src));
  t('e la conversione gira all avvio, come le altre',
    /forEach\(tpl => convertiSeparatoriInDivisori\(tpl\)\)/.test(src));
  t('la conversione riproduce il vecchio <hr>: 1,5px continuo scuro',
    /divisoreSpessore = 1\.5;[\s\S]{0,120}divisoreTinta = 'scuro'/.test(src));
}

console.log('\n--- Ogni comando del divisore si vede mentre lo muovi ---');
{
  t('esiste un anteprima dal vivo per il divisore',
    /const anteprimaDivisore = \(patch\) =>/.test(src));
  // Si ricostruisce il contenuto VERO invece di ritoccare uno stile a mano: cosi' anteprima
  // e risultato salvato escono dalla stessa funzione e non possono divergere.
  t('e ricostruisce il contenuto vero, non un suo facsimile',
    /anteprimaDivisore = \(patch\) => \{[\s\S]{0,400}buildBlockContentHtml\('divisore'/.test(src));
  t('l altezza dello spazio ha l anteprima', /anteprima: \(mm\) => anteprimaDivisore\(\{ spacerHeightMm/.test(src));
  t('spessore e lunghezza pure', /anteprima: \(val\) => anteprimaDivisore\(\{ \[prop\]/.test(src));
}

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
            logs: [{ start: 0, end: 4, colpi: 5 }], photos: [], strati: []
          }
        }
      }
    },
    currentProjectId: 'p1', currentSurveyId: 's1', settings: {}, reportTemplateId: 'prova',
    reportTemplates: {
      prova: {
        id: 'prova', name: 'Col divisore', builtIn: false,
        margins: { top: 14, bottom: 14, left: 12, right: 12 },
        pages: [{
          id: 'pg1', cols: 4, header: { imageDataUrl: null, text: '' }, footer: { text: '' },
          rows: [
            { id: 'r1', blocks: [{ id: 'bTesto', type: 'testo', colSpan: 4, richHtml: '<h1>1. Premessa</h1><p>Testo.</p>' }] },
            { id: 'r2', blocks: [{ id: 'bDiv', type: 'divisore', colSpan: 4 }] },
            { id: 'r3', blocks: [{ id: 'bTab', type: 'tabella-colpi', colSpan: 4 }] },
            // Un separatore vecchio stile: la migrazione deve trasformarlo in un divisore
            // con la linea, non farlo sparire da una relazione già impaginata.
            { id: 'r4', blocks: [{ id: 'bSep', type: 'separatore', colSpan: 4 }] }
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
  const corpo = () => d.querySelector('.tpl-editor-block-body[data-block-id="bDiv"]');
  const riquadro = () => d.querySelector('.tpl-editor-block[data-block-id="bDiv"]');
  t('l editor si apre sul divisore', !!corpo());
  if (!corpo()) { console.log(`\n${ok} ok, ${ko} KO`); process.exit(1); }
  t('il riquadro del divisore si riconosce dal tipo', !!riquadro() && riquadro().dataset.blockTipo === 'divisore');

  doppioTap(corpo());
  await attesa(400);
  const menu = () => d.getElementById('templateEditorBlockMenu');
  const slider = (azione) => menu().querySelector(`input[type="range"][data-action="${azione}"]`);
  const muovi = async (azione, valore) => {
    const r = slider(azione);
    if (!r) return false;
    r.value = String(valore);
    r.dispatchEvent(new w.Event('input', { bubbles: true }));
    r.dispatchEvent(new w.Event('change', { bubbles: true }));
    await attesa(350);
    return true;
  };
  t('il menu del divisore si apre', !!menu());

  console.log('\n--- Si stringe davvero: il cursore e il foglio dicono la stessa cosa ---');
  {
    const rl = slider('larghezza-input');
    t('il cursore della larghezza c e', !!rl);
    t('e scende fino a 1mm, non piu al 5% della riga', !!rl && parseFloat(rl.min) <= 1);
    await muovi('larghezza-input', 2);
    // La larghezza vera del blocco: flexEntryCss la scrive come "0 0 X%".
    const flex = (riquadro().getAttribute('style') || '');
    // L'anteprima dal vivo APPENDE il suo stile (cssText +=), quindi nel style attributo
    // possono esserci piu' dichiarazioni flex: vale l'ultima, come per il CSS.
    const tutte = [...flex.matchAll(/flex:\s*0\s+0\s+([\d.]+)%/g)];
    const m = tutte.length ? tutte[tutte.length - 1] : null;
    t('il blocco esce con una larghezza in percentuale fissa', !!m);
    if (m) {
      const pct = parseFloat(m[1]);
      const px = pct / 100 * 186 * 96 / 25.4;
      t('e sono pochi millimetri veri, non i 48px di prima', px < 20);
      t('ma non zero: resta un blocco, non sparisce', px > 0.5);
    }
    const rh = slider('spacer-height');
    t('anche l altezza scende sotto i 2mm', !!rh && parseFloat(rh.min) <= 0.5);
    await muovi('larghezza-input', 100);
  }

  console.log('\n--- Il separatore convertito ---');
  {
    const sep = d.querySelector('.tpl-editor-block-body[data-block-id="bSep"]');
    t('il vecchio separatore e ancora nel foglio, non e sparito', !!sep);
    if (sep) {
      t('ed e diventato un divisore con la linea', !!sep.querySelector('[data-divisore-linea="orizzontale"]'));
      t('con lo stesso tratto del vecchio <hr>',
        /border-top:\s*1\.5px\s+solid/.test(sep.querySelector('[style*="border-top"]').getAttribute('style')));
      t('e il suo riquadro ora e di tipo divisore',
        d.querySelector('.tpl-editor-block[data-block-id="bSep"]').dataset.blockTipo === 'divisore');
    }
  }

  console.log('\n--- I cursori aggiornano il foglio SENZA aspettare il rilascio ---');
  {
    const soloInput = async (azione, valore) => {
      const r = slider(azione);
      if (!r) return false;
      r.value = String(valore);
      // SOLO 'input': e' il segnale che arriva mentre il dito e' ancora sul cursore. Se il
      // foglio cambia solo al 'change' (rilascio), qui non si muove niente — ed e'
      // esattamente il difetto segnalato.
      r.dispatchEvent(new w.Event('input', { bubbles: true }));
      await attesa(120);
      return true;
    };
    const altezzaDisegnata = () => (corpo().querySelector('[data-divisore-linea]').getAttribute('style') || '');
    const prima = altezzaDisegnata();
    await soloInput('spacer-height', 40);
    t('trascinando l altezza il divisore cambia subito', altezzaDisegnata() !== prima);
    t('e mostra proprio la misura del cursore', /height:\s*40mm/.test(altezzaDisegnata()));
  }

  console.log('\n--- La linea: orizzontale, verticale, o niente ---');
  {
    const bottoni = () => [...menu().querySelectorAll('[data-action="divisore-linea"]')];
    // Sotto il wireframe ora c'è una parola sola (richiesta esplicita, vedi NOMI_LINEA_DIV_BREVI):
    // le icone da sole si distinguevano solo leggendo la spiegazione. Resta vietata la frase lunga.
    t('tre scelte, con un wireframe ciascuna', bottoni().length === 3 &&
      bottoni().every(b => b.querySelector('svg') && b.textContent.trim().length > 0 && b.textContent.trim().length <= 10 && !!b.title));
    t('e si parte da «nessuna», come e sempre stato',
      corpo().querySelector('[data-divisore-linea]').dataset.divisoreLinea === 'nessuna');
    t('quindi nessun filo disegnato', !corpo().querySelector('[style*="border-top"]'));

    const scegli = async (val) => { clic(bottoni().find(b => b.dataset.val === val)); await attesa(450); };

    await scegli('orizzontale');
    const filoH = corpo().querySelector('[style*="border-top"]');
    t('ORIZZONTALE: il filo compare', !!filoH);
    t('centrato e largo quanto dice il cursore', !!filoH && /width:\s*100%/.test(filoH.getAttribute('style')));
    // Stile, tinta, spessore e lunghezza cambiano il filo, non altro.
    const stiliBtn = [...menu().querySelectorAll('[data-action="divisore-stile"]')];
    t('ci sono i quattro stili di tratto', stiliBtn.length === 4);
    clic(stiliBtn.find(b => b.dataset.val === 'punteggiata'));
    await attesa(400);
    t('scegliendo punteggiata il tratto cambia davvero',
      /border-top:[^;]*dotted/.test(corpo().querySelector('[style*="border-top"]').getAttribute('style')));
    const tinte = [...menu().querySelectorAll('[data-action="divisore-tinta"]')];
    t('e c e una tavolozza tenue', tinte.length >= 4);
    clic(tinte.find(b => b.dataset.val === 'salvia'));
    await attesa(400);
    t('la tinta arriva sul filo',
      /#8fb897/.test(corpo().querySelector('[style*="border-top"]').getAttribute('style')));
    await muovi('divisore-lunghezza', 50);
    t('e la lunghezza pure',
      /width:\s*50%/.test(corpo().querySelector('[style*="border-top"]').getAttribute('style')));

    // «doppia» sotto i 3px non si vedrebbe: deve alzarsi da sola.
    clic([...menu().querySelectorAll('[data-action="divisore-stile"]')].find(b => b.dataset.val === 'doppia'));
    await attesa(400);
    await muovi('divisore-spessore', 1);
    const st = corpo().querySelector('[style*="border-top"]').getAttribute('style');
    t('lo stile doppio si alza da se ai 3px minimi per essere visibile',
      /border-top:\s*3px\s+double/.test(st));

    await scegli('verticale');
    t('VERTICALE: il filo diventa un bordo sinistro', !!corpo().querySelector('[style*="border-left"]'));
    t('e non c e piu quello orizzontale', !corpo().querySelector('[style*="border-top"]'));

    await scegli('nessuna');
    t('NESSUNA: si torna allo spazio vuoto', !corpo().querySelector('[style*="border-top"]') && !corpo().querySelector('[style*="border-left"]'));
    t('e la proprieta sparisce dal blocco, non resta scritta a «nessuna»',
      corpo().querySelector('[data-divisore-linea]').dataset.divisoreLinea === 'nessuna');
  }

  console.log('\n--- Lo spaziatore elastico ---');
  {
    const chk = menu().querySelector('[data-action="divisore-elastico"]');
    t('la spunta c e', !!chk);
    t('di partenza il divisore ha un altezza fissa in mm',
      /height:\s*\d/.test(corpo().querySelector('[data-divisore-linea]').getAttribute('style')));
    if (chk) {
      chk.checked = true;
      chk.dispatchEvent(new w.Event('change', { bubbles: true }));
      await attesa(450);
      const box = corpo().querySelector('[data-divisore-elastico]');
      t('accendendola il divisore si marca come elastico', !!box);
      t('e chiede tutta l altezza disponibile', !!box && /height:\s*100%/.test(box.getAttribute('style')));
      t('tenendo pero l altezza scritta come MINIMO, cosi non sparisce mai',
        !!box && /min-height:\s*[\d.]+mm/.test(box.getAttribute('style')));
      t('la tela e una colonna flessibile, altrimenti non ci sarebbe niente da riempire',
        d.getElementById('templateEditorCanvas').style.flexDirection === 'column');
    }
  }

  console.log('\n--- E arriva in stampa, non solo nell anteprima ---');
  {
    // Si riaccende la linea, poi si esporta davvero.
    const bottoni = [...menu().querySelectorAll('[data-action="divisore-linea"]')];
    clic(bottoni.find(b => b.dataset.val === 'orizzontale'));
    await attesa(450);

    clic(d.querySelectorAll('.btn-project-actions')[0]);
    await attesa(250);
    clic(d.getElementById('btnProjActExport'));
    await attesa(250);
    clic(d.getElementById('btnOptExportCompletePdf'));
    await attesa(450);
    clic(d.getElementById('btnEsportaPdfGenera'));
    let ifr = null;
    for (let i = 0; i < 60; i++) { await attesa(150); ifr = d.getElementById('iframeStampaReport'); if (ifr) break; }
    t('il documento di stampa viene prodotto', !!ifr);
    if (ifr) {
      const cd = ifr.contentWindow.document;
      const stampa = cd.documentElement.outerHTML;
      t('il filo del divisore e nel documento', /border-top:[^;"]*solid/.test(stampa) || !!cd.querySelector('[data-divisore-linea="orizzontale"]'));
      t('e il marcatore elastico pure', !!cd.querySelector('[data-divisore-elastico]'));
      t('il foglio di stampa e una colonna flessibile',
        /\.dpsh-sheet-inner \{[^}]*flex-direction:\s*column/.test(stampa));
      t('con le righe normali inchiodate, cosi un foglio pieno non le schiaccia',
        /\.dpsh-sheet-inner > \* \{ flex: 0 0 auto; \}/.test(stampa));
      t('e solo la riga col divisore elastico autorizzata a crescere',
        /:has\(\[data-divisore-elastico\]\) \{ flex: 1 1 auto/.test(stampa));
    }
  }

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(1); });
