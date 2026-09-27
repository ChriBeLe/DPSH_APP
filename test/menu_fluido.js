// IL MENU DEL BLOCCO NON RIMBALZA E NON PERDE IL SEGNO.
//
// Segnalato: «per ogni azione che compio sul menu di ogni blocco c'e' una fastidiosa
// animazione di rimbalzo, e lo scorrimento si azzera».
//
// La causa e' una sola, e spiega tutti e due i sintomi: ogni comando del menu finisce con
// renderTemplateEditorCanvas() + apriMenuBloccoEditor(), e quella funzione ricostruiva il
// pannello da zero. Elemento nuovo vuol dire due cose: l'animazione d'ingresso riparte da
// capo (con una curva cubic-bezier(.34,1.56,.64,1) — quell'1.56 e' un sorpasso oltre il
// valore finale, cioe' il rimbalzo) e scrollTop torna a zero. Da fuori sembrava che il menu
// si richiudesse e riaprisse a ogni tocco; e se il comando stava in fondo a un pannello
// lungo, dopo averlo premuto spariva dalla vista.
//
// Il rimedio non e' spegnere l'animazione: e' distinguere APRIRE da RICOSTRUIRE. Un
// ingresso animato ha senso quando qualcosa entra; qui non entrava niente.
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const percorso = __dirname + '/../dist/DPSH.html';
const src = fs.readFileSync(percorso, 'utf8');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const attesa = ms => new Promise(r => setTimeout(r, ms));

console.log('\n--- Sul file: la curva che rimbalza non tocca piu questo menu ---');
{
  const rigaMenu = /menu\.className = 'tpl-editor-block-menu'([^\n]*)/.exec(src);
  t('la classe del menu si decide in base al tipo di apertura', !!rigaMenu);
  if (rigaMenu) {
    t('e non e piu quella con il rimbalzo', rigaMenu[1].indexOf('tpl-editor-anim-in-scale') < 0);
    t('prima apertura: una comparsa piatta', rigaMenu[1].indexOf('tpl-editor-menu-entra') > 0);
    t('ricostruzione: nessuna entrata', rigaMenu[1].indexOf('e-senza-entrata') > 0);
  }
  // La comparsa nuova deve essere SOLA OPACITA': niente scale, niente traslazione, niente
  // curva con sorpasso. Se qualcuno ci rimettesse dentro un movimento, il fastidio torna.
  const css = /@keyframes tplEditorComparsaPiatta \{([^}]*\}[^}]*)\}/.exec(src);
  t('la comparsa nuova esiste', !!css);
  if (css) t('e muove solo l opacita, niente scala ne spostamenti',
    !/transform/.test(css[1]));
  const regolaEntra = /\.tpl-editor-menu-entra \{([^}]*)\}/.exec(src);
  t('la comparsa non usa una curva con sorpasso',
    !!regolaEntra && !/1\.5\d|1\.6\d/.test(regolaEntra[1]));
  t('e la soppressione vale anche sul pannello della scheda, non solo sul menu',
    /\.e-senza-entrata \.tpl-editor-menu-pannello\.attiva \{ animation: none/.test(src));
}

// ======================================================================================
// VIVO. jsdom non impagina, quindi scrollTop varrebbe sempre 0 e non si potrebbe misurare
// niente. Gli si da' una memoria vera — un valore che si scrive e si rilegge — cosi' il
// test misura esattamente cio' che conta: il numero viene preso PRIMA di smontare il menu
// e rimesso DOPO averlo rimontato. E' il meccanismo, non un suo effetto collaterale.
// ======================================================================================
function accendi() {
  const vc = new VirtualConsole(); const errori = [];
  vc.on('jsdomError', e => errori.push('JSDOM: ' + (e.message || '')));
  vc.on('error', (...a) => errori.push('console.error: ' + a.map(String).join(' ')));
  ['warn', 'log', 'info', 'debug'].forEach(k => vc.on(k, () => {}));

  const prove = {
    s1: {
      id: 's1', reportTemplateId: 'prova',
      header: { provaNr: '1', comune: 'Sava', localita: 'Contrada', date: '2026-08-29' },
      logs: [{ start: 0, end: 8.4, colpi: 5 }], photos: [], strati: []
    }
  };
  const stato = {
    projects: { p1: { id: 'p1', name: 'Sava', comune: 'Sava', createdAt: 1, surveys: prove, strati: [], notes: null } },
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
      // Uno scrollTop che ricorda davvero.
      const memoria = new WeakMap();
      Object.defineProperty(w.Element.prototype, 'scrollTop', {
        get() { return memoria.get(this) || 0; },
        set(v) { memoria.set(this, v); },
        configurable: true
      });
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
  const matita = d.querySelector('#reportTemplatesList .tpl-report-modifica[data-tpl-id="prova"]');
  if (matita) clic(matita);
  await attesa(700);
  const corpo = () => d.querySelector('.tpl-editor-block-body[data-block-id="bDati"]');
  t('l editor si apre sul blocco', !!corpo());
  if (!corpo()) { console.log(`\n${ok} ok, ${ko} KO`); process.exit(1); }

  console.log('\n--- Prima apertura: comparsa piatta, nessun rimbalzo ---');
  doppioTap(corpo());
  await attesa(400);
  let menu = () => d.getElementById('templateEditorBlockMenu');
  t('il menu si apre', !!menu());
  t('con la comparsa piatta', menu().classList.contains('tpl-editor-menu-entra'));
  t('e NON con quella che rimbalza', !menu().classList.contains('tpl-editor-anim-in-scale'));

  console.log('\n--- Premendo un comando: niente ingresso, e lo scorrimento resta dov era ---');
  {
    menu().scrollTop = 137;
    const primoMenu = menu();
    // Un comando qualunque del menu di questo blocco: cambiare disposizione delle schede.
    const btn = d.querySelector('#templateEditorBlockMenu [data-action="schede-layout"][data-val="h3"]');
    t('c e un comando da premere', !!btn);
    clic(btn);
    await attesa(300);
    t('il menu e stato ricostruito davvero (elemento nuovo)', menu() !== primoMenu);
    t('lo scorrimento e ripreso dov era, non azzerato', menu().scrollTop === 137);
    t('e stavolta non c e nessuna animazione d ingresso',
      !menu().classList.contains('tpl-editor-menu-entra'));
    t('il comando ha davvero avuto effetto (non e un menu inerte)',
      /display:flex/.test(corpo().innerHTML));
  }

  console.log('\n--- E vale per qualunque comando, non solo per quello ---');
  {
    menu().scrollTop = 88;
    const chk = d.querySelector('#templateEditorBlockMenu [data-action="schede-zebra"]');
    if (chk) {
      chk.checked = true;
      chk.dispatchEvent(new w.Event('change', { bubbles: true }));
      await attesa(300);
      t('anche una spunta conserva lo scorrimento', menu().scrollTop === 88);
      t('e non rigioca l ingresso', !menu().classList.contains('tpl-editor-menu-entra'));
    }
    menu().scrollTop = 42;
    const tinta = d.querySelector('#templateEditorBlockMenu [data-action="schede-tinta"][data-val="salvia"]');
    if (tinta) {
      clic(tinta);
      await attesa(300);
      t('e anche la scelta di un colore', menu().scrollTop === 42);
    }
  }

  console.log('\n--- Cambiare blocco resta un ingresso vero ---');
  {
    // Un menu che si apre su un ALTRO blocco e' una cosa nuova che arriva: li' la comparsa
    // ci deve essere. Senza questa distinzione avremmo tolto un fastidio creando un salto.
    const menuPrima = menu();
    menuPrima.scrollTop = 55;
    // Si chiude e si riapre sullo stesso blocco passando da "nessun menu": e' il percorso
    // dell'apertura vera, e deve comportarsi come tale.
    const fuori = d.getElementById('templateEditorCanvas');
    if (fuori) fuori.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true, clientX: 1, clientY: 1, pointerId: 2 }));
    await attesa(200);
    doppioTap(corpo());
    await attesa(400);
    t('riaprendo da zero la comparsa torna', !!menu() && menu().classList.contains('tpl-editor-menu-entra'));
    t('e lo scorrimento riparte da capo, come e giusto per un menu appena aperto',
      menu().scrollTop === 0);
  }

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(1); });
