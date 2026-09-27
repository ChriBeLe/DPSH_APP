// IL BLOCCO "DATI PROVA": NIENTE PIÙ TESTO TAGLIATO, E TRE MODI DI STARE IN ORIZZONTALE.
//
// Segnalato con screenshot: «località» che esce come «Contrada Madonna delle Scra…» invece
// di andare a capo, le colonne dei DATI STRATIGRAFICI che si sovrappongono stringendo il
// blocco, e in orizzontale una scheda molto più alta delle altre.
//
// I primi due difetti hanno la stessa causa, ed è una sola riga: la colonna etichetta era
// `width:74px`. Settantaquattro pixel non sono una frazione, sono una quantità assoluta:
// quando il box scende sotto ~130px se li prende quasi tutti e alle colonne `da`/`a` resta
// uno spazio prossimo allo zero. Il nowrap+ellissi, messo allora come pezza, non risolveva
// niente — trasformava un dato ILLEGGIBILE in un dato ASSENTE, che su una relazione firmata
// è peggio.
//
// La prima parte di questa suite non guarda le stringhe: prende la regola di larghezza VERA
// dal file e la calcola, alla larghezza a cui il difetto si vedeva. Il controllo passa solo
// se nessuna colonna può essere affamata — e la controprova sulla regola vecchia dimostra
// che il controllo morde.
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const percorso = __dirname + '/../dist/DPSH.html';
const src = fs.readFileSync(percorso, 'utf8');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const attesa = ms => new Promise(r => setTimeout(r, ms));

// ======================================================================================
// PARTE 1 — LA GEOMETRIA, CALCOLATA SULLA REGOLA VERA
// ======================================================================================
console.log('\n--- La colonna etichetta non può più affamare le altre ---');
{
  // La regola si LEGGE dal file: se domani qualcuno rimette un numero fisso, questo test
  // se ne accorge, perché sta misurando quel numero, non una sua copia.
  const m = /const LARGH_ETICHETTA = 'min\((\d+)px, (\d+)%\)'/.exec(src);
  t('la larghezza dell etichetta è un tetto in px PIÙ una quota che scala', !!m);
  const capPx = m ? parseFloat(m[1]) : 0, quota = m ? parseFloat(m[2]) / 100 : 0;

  // table-layout:fixed, prima colonna dichiarata, le altre si dividono il resto.
  const colonne = (larghezzaBox, nCol, regola) => {
    const et = regola(larghezzaBox);
    const resto = Math.max(0, larghezzaBox - et);
    return [et].concat(new Array(nCol - 1).fill(resto / (nCol - 1)));
  };
  const regolaNuova = W => Math.min(capPx, quota * W);
  const regolaVecchia = () => 74;

  // «0,0» a 10,5px di corpo vuole circa 22px più il padding: sotto i ~25px la cella non
  // può mostrare il suo contenuto, ed è esattamente lì che nasceva la sovrapposizione.
  const MINIMO_LEGGIBILE = 25;
  let peggioNuova = Infinity, peggioVecchia = Infinity;
  for (let W = 320; W >= 60; W -= 5) {
    peggioNuova = Math.min(peggioNuova, Math.min.apply(null, colonne(W, 3, regolaNuova).map(c => c / W)));
    peggioVecchia = Math.min(peggioVecchia, Math.min.apply(null, colonne(W, 3, regolaVecchia)));
  }
  t('con la regola nuova nessuna colonna scende sotto il 20% della tabella, a nessuna larghezza',
    peggioNuova >= 0.20);
  t('CONTROPROVA: con i 74px fissi una colonna scendeva sotto il minimo leggibile',
    peggioVecchia < MINIMO_LEGGIBILE);

  // E a larghezza piena l'impaginazione resta quella di sempre: il tetto in px vince.
  t('a box largo la colonna etichetta vale ancora 74px esatti, come prima',
    Math.abs(regolaNuova(300) - 74) < 0.001);
  t('e a box stretto diventa una frazione', regolaNuova(120) < 74 && regolaNuova(120) > 0);

  const m2 = /const LARGH_ETICHETTA_STRETTA = 'min\((\d+)px, (\d+)%\)'/.exec(src);
  t('anche la versione impacchettata su due colonne interne ha la sua quota', !!m2);
  if (m2) {
    // Quattro colonne: due etichette + due valori. Le due quote sommate non possono
    // prendersi più di metà tabella, altrimenti ai valori resterebbe meno che alle
    // etichette — che è il difetto di prima, solo raddoppiato.
    t('e due etichette insieme non superano metà tabella', parseFloat(m2[2]) / 100 * 2 <= 0.5);
  }
}

// ======================================================================================
// PARTE 2 — VIVO
// ======================================================================================
function accendi() {
  const vc = new VirtualConsole(); const errori = [];
  vc.on('jsdomError', e => errori.push('JSDOM: ' + (e.message || '')));
  vc.on('error', (...a) => errori.push('console.error: ' + a.map(String).join(' ')));
  ['warn', 'log', 'info', 'debug'].forEach(k => vc.on(k, () => {}));

  // Località volutamente lunga: è il dato che nello screenshot finiva in «…».
  const prove = {
    s1: {
      id: 's1',
      // Senza questo la prova userebbe "classico": l'export uscirebbe da un ALTRO template e
      // il controllo sulla stampa misurerebbe un documento che non c'entra niente.
      reportTemplateId: 'prova',
      header: { provaNr: '1', comune: 'San Donato Milanese', localita: 'Contrada Madonna delle Scrape',
                committente: 'Dottor Culocane', date: '2026-08-29', lat: '45.41', lng: '9.27' },
      logs: [{ start: 0, end: 8.4, colpi: 5 }], photos: [], strati: []
    }
  };
  const stato = {
    projects: {
      p1: {
        id: 'p1', name: 'San Donato', comune: 'San Donato Milanese', provincia: 'Milano',
        localita: 'Contrada Madonna delle Scrape', committente: 'Dottor Culocane',
        date: '2026-08-29', createdAt: 1, surveys: prove, strati: [], notes: null
      }
    },
    currentProjectId: 'p1', currentSurveyId: 's1', settings: {}, reportTemplateId: 'prova',
    reportTemplates: {
      prova: {
        id: 'prova', name: 'Con i dati prova', builtIn: false,
        margins: { top: 14, bottom: 14, left: 12, right: 12 },
        pages: [{
          id: 'pg1', cols: 4, header: { imageDataUrl: null, text: '' }, footer: { text: '' },
          rows: [{ id: 'r1', blocks: [{ id: 'bDati', type: 'dati-prova', colSpan: 4 }] }]
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
  await attesa(1000);
  t('l app si accende senza errori', errori.length === 0);
  if (errori.length) console.log('        ', errori.slice(0, 3));

  const btnHome = d.getElementById('btnHomeView');
  if (btnHome) clic(btnHome);
  await attesa(200);
  clic(d.getElementById('btnOpenReportTemplatesHome'));
  await attesa(300);
  // La matita del template GIUSTO: la lista contiene anche i template predefiniti, e il
  // primo della lista è "Classico" — aprire quello sarebbe un test che misura un altro
  // documento senza dirlo.
  const matita = d.querySelector('#reportTemplatesList .tpl-report-modifica[data-tpl-id="prova"]');
  if (matita) clic(matita);
  await attesa(700);
  const corpo = () => d.querySelector('.tpl-editor-block-body[data-block-id="bDati"]');
  t('l editor del template si apre sul blocco Dati Prova', !!corpo());
  if (!corpo()) { console.log(`\n${ok} ok, ${ko} KO`); process.exit(1); }

  console.log('\n--- Il testo lungo può andare a capo: le pezze che lo tagliavano non ci sono più ---');
  {
    const html = corpo().innerHTML;
    t('la località lunga è tutta nel foglio', html.indexOf('Contrada Madonna delle Scrape') >= 0);
    // Il testo c'era anche prima: quello che lo NASCONDEVA era il CSS. È quello che qui si
    // misura, perché è quello che l'utente vedeva.
    t('nessuna cella con text-overflow:ellipsis', !/text-overflow\s*:\s*ellipsis/.test(html));
    t('nessuna cella con white-space:nowrap', !/white-space\s*:\s*nowrap/.test(html));
    t('e le celle sanno andare a capo anche su una parola sola',
      (html.match(/overflow-wrap\s*:\s*anywhere/g) || []).length >= 10);
    t('l etichetta resta in alto quando il valore prende due righe',
      /vertical-align\s*:\s*top/.test(html));
    const cols = [...corpo().querySelectorAll('col')];
    t('tutte le colonne dichiarate usano la regola con la quota, nessun px nudo',
      cols.length > 0 && cols.every(c => { const wdt = c.getAttribute('style') || ''; return wdt === '' || /min\(\d+px,\s*\d+%\)/.test(wdt); }));
  }

  console.log('\n--- Le tre disposizioni, prese dai bottoni del menu ---');
  doppioTap(corpo());
  await attesa(400);
  let menu = d.getElementById('templateEditorBlockMenu');
  t('il menu del blocco si apre', !!menu);
  const bottoniDisp = () => [...d.querySelectorAll('#templateEditorBlockMenu [data-action="schede-layout"]')];
  t('ci sono tre bottoni di disposizione', bottoniDisp().length === 3);
  t('e ognuno mostra un wireframe, non una parola',
    bottoniDisp().every(b => b.querySelector('svg') && b.textContent.trim() === ''));
  t('i tre valori sono quelli previsti',
    bottoniDisp().map(b => b.dataset.val).join(',') === 'v,h3,h2');

  const scegli = async (val) => {
    const b = bottoniDisp().find(x => x.dataset.val === val);
    if (!b) return null;
    clic(b);
    await attesa(400);
    return corpo();
  };
  // Come si controlla che la scelta sia stata SALVATA e non solo disegnata: il menu viene
  // ricostruito da zero a ogni modifica leggendo il blocco. Se il bottone acceso è quello
  // giusto dopo la ricostruzione, il valore ha fatto tutto il giro — schermo, oggetto,
  // schermo. Leggere direttamente lo stato interno non proverebbe che il menu lo rilegge.
  const dispAccesa = () => {
    const b = bottoniDisp().find(x => (x.getAttribute('style') || '').indexOf('var(--accent)') >= 0);
    return b ? b.dataset.val : null;
  };
  // Le colonne sono i figli del PRIMO contenitore flex dentro il corpo del blocco: il corpo
  // ha i suoi wrapper, quindi cercarlo solo fra i figli diretti lo mancherebbe.
  const colonneDi = (el) => {
    const flex = el.querySelector('div[style*="display:flex"]');
    return flex ? [...flex.children] : null;
  };

  {
    const el = await scegli('v');
    t('IMPILATE: nessuna riga flex al primo livello', !colonneDi(el));
    t('e tre schede una sotto l altra', el.querySelectorAll('table.databox-tabella').length === 3);
  }
  {
    const el = await scegli('h3');
    const col = colonneDi(el);
    t('TRE COLONNE: tre colonne affiancate', !!col && col.length === 3);
    // DATI STRUMENTO ha dieci righe: impacchettata diventano cinque righe da quattro celle.
    const tabelle = [...el.querySelectorAll('table.databox-tabella')];
    const impacchettata = tabelle.find(tb => tb.querySelectorAll('col').length === 4);
    t('la scheda con dieci righe si dispone su due colonne interne', !!impacchettata);
    if (impacchettata) {
      t('e diventa cinque righe invece di dieci', impacchettata.querySelectorAll('tr').length === 5);
      t('con quattro celle per riga', impacchettata.querySelector('tr').querySelectorAll('td').length === 4);
    }
    t('le schede corte NON vengono impacchettate',
      tabelle.filter(tb => tb.querySelectorAll('col').length === 4).length === 1);
    t('la scelta finisce sul blocco e il menu la rilegge', dispAccesa() === 'h3');
  }
  {
    const el = await scegli('h2');
    const col = colonneDi(el);
    t('DUE COLONNE: due colonne affiancate', !!col && col.length === 2);
    if (col) {
      const tabA = col[0].querySelectorAll('table.databox-tabella').length;
      const tabB = col[1].querySelectorAll('table.databox-tabella').length;
      t('una scheda sola da una parte, due dall altra',
        (tabA === 1 && tabB === 2) || (tabA === 2 && tabB === 1));
      const sola = tabA === 1 ? col[0] : col[1];
      t('e quella sola è la più alta (dieci righe)', sola.querySelectorAll('tr').length === 10);
    }
  }
  {
    const b = bottoniDisp().find(x => x.dataset.val === 'hflow');
    t('la disposizione "righe distribuite" e stata tolta', !b);
  }

  console.log('\n--- Le colonne arrivano in fondo: niente rettangoli bianchi ---');
  {
    // Segnalato con screenshot: la colonna piu' corta finiva dove finiva il suo contenuto e
    // sotto restava un vuoto bianco dentro il riquadro del blocco. Il rimedio e' geometrico:
    // le colonne si distendono all'altezza della piu' alta e l'ULTIMO box di ogni colonna si
    // prende lo spazio che avanza. jsdom non impagina, quindi qui si misura la REGOLA — che
    // e' il meccanismo, non un suo effetto collaterale.
    const el = await scegli('h3');
    const flex = el.querySelector('div[style*="display:flex"]');
    t('le colonne si distendono, non si allineano in alto',
      !!flex && /align-items\s*:\s*stretch/.test(flex.getAttribute('style')));
    t('e nessuna riga di colonne e rimasta ancorata in alto',
      !/align-items\s*:\s*flex-start/.test(el.innerHTML));
    const col = colonneDi(el);
    t('ogni colonna e essa stessa una colonna flessibile',
      col.every(c => /flex-direction\s*:\s*column/.test(c.getAttribute('style') || '')));
    t('l ultimo box di ogni colonna si prende lo spazio che avanza',
      col.every(c => { const u = c.children[c.children.length - 1]; return /flex\s*:\s*1/.test(u.getAttribute('style') || ''); }));
    t('e il colore del box arriva fino in fondo al suo posto',
      [...el.querySelectorAll('[data-scheda-idx]')].every(b => /height\s*:\s*100%/.test(b.getAttribute('style') || '')));
  }

  console.log('\n--- Riordino a trascinamento, con la scheda che si accende sul foglio ---');
  {
    await scegli('h3');
    const voci = () => [...d.querySelectorAll('#templateEditorBlockMenu [data-voce-scheda]')];
    t('le tre schede sono elencate come voci trascinabili', voci().length === 3);
    t('niente piu frecce su/giu', !d.querySelector('#templateEditorBlockMenu [data-action="scheda-su"]'));
    t('ogni voce ha la sua maniglia', voci().every(v => v.querySelector('.tpl-scheda-grip')));
    t('e non si porta dietro lo scorrimento della pagina (touch-action)',
      /touch-action:\s*none/.test(src.slice(src.indexOf('.tpl-scheda-voce {'), src.indexOf('.tpl-scheda-voce {') + 700)));
    t('c e il tasto per rimettere l ordine originale',
      !!d.querySelector('#templateEditorBlockMenu [data-action="schede-ordine-reset"]'));

    const ordineMostrato = () => voci().map(v => v.dataset.idx).join(',');
    t('si parte dall ordine di default', ordineMostrato() === '0,1,2');

    // Si trascina la PRIMA voce (Prova / Dati indagine) in fondo.
    const prima = voci()[0];
    Object.defineProperty(prima, 'offsetHeight', { get() { return 36; }, configurable: true });
    const pev = (tipo, y) => new w.PointerEvent(tipo, { bubbles: true, clientY: y, clientX: 20, pointerId: 7, button: 0 });
    prima.dispatchEvent(pev('pointerdown', 100));
    t('presa in mano: la voce si stacca', prima.classList.contains('e-in-mano'));
    const cartaMossa = d.querySelector('.tpl-editor-block-body[data-block-id="bDati"] [data-scheda-idx="0"]');
    t('e la scheda corrispondente si accende SUL FOGLIO',
      !!cartaMossa && cartaMossa.classList.contains('databox-in-movimento'));
    t('mentre le altre si sbiadiscono, cosi si vede quale si sta spostando',
      [...d.querySelectorAll('.tpl-editor-block-body[data-block-id="bDati"] [data-scheda-idx]')]
        .filter(e2 => e2 !== cartaMossa).every(e2 => e2.classList.contains('databox-sbiadita')));

    prima.dispatchEvent(pev('pointermove', 180));   // due posizioni piu' giu' (36+4 = 40 a scatto)
    t('la voce in mano segue il dito', /translateY\(80px\)/.test(prima.getAttribute('style') || ''));
    t('e le altre si scansano da sole, con un movimento visibile',
      voci().filter(v => v !== prima).some(v => /translateY\(-40px\)/.test(v.getAttribute('style') || '')));

    prima.dispatchEvent(pev('pointerup', 180));
    await attesa(400);
    t('lasciando, l ordine cambia davvero', ordineMostrato() === '1,2,0');
    t('e il foglio segue: la scheda spostata e ora l ultima',
      [...d.querySelectorAll('.tpl-editor-block-body[data-block-id="bDati"] [data-scheda-idx]')]
        .map(e2 => e2.dataset.schedaIdx).join(',') === '1,2,0');
    t('niente evidenziazioni rimaste appese dopo il rilascio',
      !d.querySelector('.tpl-editor-block-body[data-block-id="bDati"] .databox-in-movimento')
      && !d.querySelector('.tpl-editor-block-body[data-block-id="bDati"] .databox-sbiadita'));

    clic(d.querySelector('#templateEditorBlockMenu [data-action="schede-ordine-reset"]'));
    await attesa(400);
    t('il tasto di ripristino rimette l ordine originale', ordineMostrato() === '0,1,2');
  }

  console.log('\n--- Righe alternate e tinta ---');
  {
    // Prima di toccare niente: l azzurro storico, identico.
    await scegli('v');
    t('senza impostazioni resta l azzurro di sempre',
      corpo().innerHTML.indexOf('#DCEEFB') >= 0 && corpo().innerHTML.indexOf('#9FCBEA') >= 0);
    t('e nessuna riga colorata: la zebratura è spenta di default',
      corpo().innerHTML.indexOf('#C9E3F7') < 0);

    const chk = d.querySelector('#templateEditorBlockMenu [data-action="schede-zebra"]');
    t('l interruttore delle righe alternate c è', !!chk);
    if (chk) {
      chk.checked = true;
      chk.dispatchEvent(new w.Event('change', { bubbles: true }));
      await attesa(400);
      const righe = [...corpo().querySelectorAll('table.databox-tabella tr')];
      const colorate = righe.filter(r => (r.getAttribute('style') || '').indexOf('#C9E3F7') >= 0);
      t('accendendola le righe dispari si colorano', colorate.length > 0);
      t('ma solo una su due, non tutte', colorate.length < righe.length);
      const chk2 = d.querySelector('#templateEditorBlockMenu [data-action="schede-zebra"]');
      t('e la scelta è salvata: il menu ricostruito la ritrova accesa', !!chk2 && chk2.checked);
    }

    const tinte = [...d.querySelectorAll('#templateEditorBlockMenu [data-action="schede-tinta"]')];
    t('la tavolozza offre più di una tinta', tinte.length >= 6);
    const salvia = tinte.find(b => b.dataset.val === 'salvia');
    t('fra cui una salvia', !!salvia);
    if (salvia) {
      clic(salvia);
      await attesa(400);
      const html = corpo().innerHTML;
      t('scegliendola cambia lo sfondo del box', html.indexOf('#E4EFE5') >= 0);
      t('e anche il bordo, non solo il riempimento', html.indexOf('#A9CBB0') >= 0);
      t('e la riga alternata è la sua, non quella azzurra',
        html.indexOf('#D2E5D5') >= 0 && html.indexOf('#C9E3F7') < 0);
      t('l azzurro sparisce del tutto', html.indexOf('#DCEEFB') < 0);
    }
  }

  console.log('\n--- E arriva fino al PDF, non solo sullo schermo ---');
  {
    // Il difetto classico di queste impostazioni è vivere solo nell'editor. Qui si esporta
    // davvero e si guarda dentro il documento che finirebbe in stampa.
    clic(d.querySelectorAll('.btn-project-actions')[0] || d.createElement('div'));
    await attesa(200);
    const btnExp = d.getElementById('btnProjActExport');
    if (btnExp) { clic(btnExp); await attesa(200); clic(d.getElementById('btnOptExportCompletePdf')); await attesa(400); }
    const gen = d.getElementById('btnEsportaPdfGenera');
    let ifr = null;
    if (gen) {
      clic(gen);
      for (let i = 0; i < 60; i++) { await attesa(150); ifr = d.getElementById('iframeStampaReport'); if (ifr) break; }
    }
    t('il documento di stampa viene prodotto', !!ifr);
    if (ifr) {
      const stampa = ifr.contentWindow.document.documentElement.outerHTML;
      t('la tinta salvia è nel documento di stampa', stampa.indexOf('#E4EFE5') >= 0);
      t('le righe alternate pure', stampa.indexOf('#D2E5D5') >= 0);
      t('e non è rimasto l azzurro di default', stampa.indexOf('#DCEEFB') < 0);
      t('in stampa niente ellissi nelle celle del blocco',
        !/databox-tabella[\s\S]{0,4000}text-overflow\s*:\s*ellipsis/.test(stampa));
    }
  }

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(1); });
