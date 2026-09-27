// L'EXPORT ARRIVA FINO ALLA STAMPA — MISURATO, NON SPERATO.
//
// Segnalato: «salta l'export dopo il caricamento. Non viene prodotto il pdf. Sono da pc».
// Le cause erano due, e la prima nascondeva la seconda.
//
// 1. LO SCRIPT INIETTATO NEL DOCUMENTO DA STAMPARE NON COMPILAVA. Dentro un template
//    literal `\'` non e' una virgoletta protetta: e' gia' una virgoletta. La riga
//    «...non si puo\' correggere dopo.» chiudeva la stringa JavaScript a meta' frase e
//    l'intera IIFE moriva con un SyntaxError. Quella IIFE conteneva l'UNICA chiamata a
//    window.print(). Risultato: documento generato benissimo (887 KB, 4 fogli), modale che
//    annuncia «Completato» e si chiude, e nessun pannello di stampa. Mai. Su qualunque
//    macchina, con qualunque progetto, con o senza mappe.
//
// 2. L'ATTESA E LA SCELTA VIVEVANO DENTRO UNA CORNICE INVISIBILE. Il documento sta in un
//    iframe a -10000px con visibility:hidden. Dentro ci si era messo il velo «Scarico le
//    mappe…» e la scelta «Stampa comunque / Riprova a caricarle», con due pulsanti veri e
//    irraggiungibili. Una sola tessera non arrivata — rete lenta, servizio giu', http
//    bloccato su pagina https — e l'export restava in attesa per sempre.
//
// Qui si guarda una cosa sola, quella che conta: print() e' stato chiamato?
//
// NOTA SUI TEMPI: la cornice aspetta le tessere fino a 20s e la rete di sicurezza scatta a
// 30s. In jsdom nessuna immagine arriva mai, quindi questa suite dura circa un minuto: e'
// il prezzo per misurare l'attesa vera invece di una sua imitazione.
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const percorso = __dirname + '/../dist/DPSH.html';
const src = fs.readFileSync(percorso, 'utf8');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const attesa = ms => new Promise(r => setTimeout(r, ms));

// --------------------------------------------------------------------------------------
// PARTE 1 — SUL FILE: la virgoletta che spezzava lo script non deve tornare.
// Il controllo non punta alla frase colpevole: cerca QUALUNQUE `\'` singolo nel corpo di
// getControlloImpaginazioneScriptTag, che e' un template literal e quindi vuole `\\'`.
// E' l'errore che si ripresenta a ogni ritocco del testo, perche' a occhio le due forme
// sono identiche.
// --------------------------------------------------------------------------------------
console.log('\n--- La virgoletta che spezzava il documento ---');
{
  const i = src.indexOf('function getControlloImpaginazioneScriptTag');
  // Il template literal finisce sul tag di chiusura protetto: `<\/script>` seguito da backtick.
  const fine = src.indexOf('<\\/scr' + 'ipt>`;', i);
  const corpo = src.slice(i, fine);
  t('il corpo della funzione si e trovato', i > 0 && fine > i && corpo.length > 3000);

  const rotte = corpo.split('\n').filter(r => /[^\\]\\'/.test(r));
  t("nessun \\' singolo nel template literal dello script iniettato", rotte.length === 0);
  if (rotte.length) rotte.slice(0, 3).forEach(r => console.log('        ', r.trim().slice(0, 120)));

  // La prova che il controllo morde: la stessa regex sulla riga malata di prima.
  t('il controllo riconosce la riga malata (controprova)',
    /[^\\]\\'/.test("+ '<div>non si puo\\' correggere dopo.</div>';"));

  t('la cornice sa di essere una cornice', corpo.includes('var IN_CORNICE ='));
  t('e riferisce al padre invece di decidere da sola', corpo.includes("riferisciAlPadre('Pronta'"));
  t('il velo non si disegna piu dentro la cornice', /function mostraVelo\(\)\s*\{\s*\n\s*if \(IN_CORNICE\) return;/.test(corpo));
  t('il padre puo chiedere di riprovare le mappe', corpo.includes('window.__dpshRicaricaMappe = ricarica'));
}
console.log('\n--- La rete di sicurezza esiste nel codice del padre ---');
{
  const i = src.indexOf('async function avviaGenerazioneEsportazionePdf');
  const corpo = src.slice(i, src.indexOf('MODAL IMPORTAZIONE MASSIVA COLPI', i));
  t('la stampa parte dal padre, non dallo script dentro il documento',
    corpo.includes('iframeStampa.contentWindow.print()'));
  t('c e una scadenza oltre la quale si stampa comunque',
    /reteDiSicurezzaStampa = setTimeout\(stampaOra, 30000\)/.test(corpo));
  t('la scadenza si spegne quando la cornice parla, per non decidere al posto dell utente',
    corpo.includes('clearTimeout(reteDiSicurezzaStampa)'));
  t('i riferimenti sono agganciati PRIMA di scrivere il documento',
    corpo.indexOf('window.__dpshStampaPronta') < corpo.indexOf('docIframe.write(fullDoc)'));
}

// --------------------------------------------------------------------------------------
// PARTE 2 — VIVO: si accende l'app, si esporta davvero, si guarda se print() parte.
// --------------------------------------------------------------------------------------
function accendi() {
  const vc = new VirtualConsole(); const errori = [];
  vc.on('jsdomError', e => errori.push('JSDOM: ' + (e.message || '')));
  vc.on('error', (...a) => errori.push('console.error: ' + a.map(String).join(' ')));
  ['warn', 'log', 'info', 'debug'].forEach(k => vc.on(k, () => {}));

  const prove = {};
  [[40.4033, 17.5586], [40.4051, 17.5602]].forEach(([lat, lng], i) => {
    prove['s' + (i + 1)] = {
      id: 's' + (i + 1),
      header: { provaNr: String(i + 1), lat: String(lat), lng: String(lng), comune: 'Sava', localita: 'Contrada', date: '2026-05-12' },
      logs: [{ start: 0, end: 8.4, colpi: 5 }], photos: [], strati: []
    };
  });
  // Blocco di testo spezzato a mano + una riga dopo: e' il codice piu' nuovo sul percorso
  // di export, quello che vale la pena attraversare davvero.
  const TESTO = '<h1>1. Premessa</h1><p>Primo capoverso.</p><div data-interruzione-pagina="1"></div><p>Secondo capoverso.</p>';
  const stato = {
    projects: {
      p1: {
        id: 'p1', name: 'Sava', comune: 'Sava', provincia: 'Taranto', localita: 'Contrada',
        committente: 'Eurisko S.r.l.', sedeCommittente: 'Via Roma 14', denominazioneIntervento: 'Ampliamento',
        date: '2026-05-12', createdAt: 1, surveys: prove, strati: [], notes: null
      }
    },
    currentProjectId: 'p1', currentSurveyId: 's1', settings: {}, reportTemplateId: 'prova',
    reportTemplates: {
      prova: {
        id: 'prova', name: 'Prova', builtIn: false,
        margins: { top: 14, bottom: 14, left: 12, right: 12 },
        pages: [{
          id: 'pg1', cols: 4, header: { imageDataUrl: null, text: '' }, footer: { text: '' },
          rows: [
            { id: 'r1', blocks: [{ id: 'b1', type: 'testo', colSpan: 4, richHtml: TESTO }] },
            { id: 'r2', blocks: [{ id: 'bMappa', type: 'inquadramento', colSpan: 4 }] },
            { id: 'r3', blocks: [{ id: 'bTab', type: 'tabella-colpi', colSpan: 4 }] }
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

// La spia va installata NEL MOMENTO in cui la cornice nasce: il padre puo' stampare subito
// dopo (quando non ci sono tessere da aspettare) e un controllo ogni 100ms se lo perde.
function spiaLaStampa(d, contatore) {
  const id = setInterval(() => {
    const f = d.getElementById('iframeStampaReport');
    if (f && !f.__spiato) { f.__spiato = true; f.contentWindow.print = () => { contatore.n++; }; }
  }, 2);
  return () => clearInterval(id);
}

async function apriEsporta(w, d) {
  const clic = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  clic(d.querySelectorAll('.btn-project-actions')[0]); await attesa(150);
  clic(d.getElementById('btnProjActExport')); await attesa(150);
  clic(d.getElementById('btnOptExportCompletePdf')); await attesa(350);
  return clic;
}
const dialogoAperto = d => { const b = d.getElementById('appDialog'); return b && b.classList.contains('open') ? b : null; };

(async () => {
  console.log('\n--- Le mappe non arrivano: la scelta e nell app, e stampa davvero ---');
  {
    const { dom, errori } = accendi();
    const w = dom.window, d = w.document;
    w.alert = () => {};
    await attesa(1200);
    const clic = await apriEsporta(w, d);
    const contatore = { n: 0 };
    const spegni = spiaLaStampa(d, contatore);
    clic(d.getElementById('btnEsportaPdfGenera'));

    let dlg = null;
    for (let i = 0; i < 260; i++) { await attesa(120); dlg = dialogoAperto(d); if (dlg || contatore.n) break; }

    const ifr = d.getElementById('iframeStampaReport');
    t('la cornice di stampa viene creata', !!ifr);
    t('lo script iniettato non solleva errori di sintassi', !errori.some(e => /SyntaxError/.test(e)));
    if (errori.some(e => /SyntaxError/.test(e))) console.log('        ', errori.filter(e => /SyntaxError/.test(e))[0]);
    const cd = ifr.contentWindow.document;
    t('il documento ha fogli veri dentro', cd.querySelectorAll('[data-tpl-report-page]').length >= 2);
    t('ci sono tessere di mappa e nessuna e arrivata (rete assente)',
      cd.querySelectorAll('[data-mappa-inquadramento] img').length > 0);
    t('nessun velo ne pulsante disegnato dentro la cornice invisibile',
      !cd.querySelector('div[style*="99999"]'));

    t('la domanda compare nell app, dove si puo leggere e cliccare', !!dlg);
    if (dlg) {
      t('e dice quanti riquadri mancano', /riquadr/.test(d.getElementById('appDialogMessage').textContent));
      t('con un titolo che si capisce', d.getElementById('appDialogTitleText').textContent === 'Mappe incomplete');
      const bOk = d.getElementById('appDialogOk');
      const bNo = d.getElementById('appDialogCancel');
      t('offre "Stampa comunque"', bOk.textContent === 'Stampa comunque');
      t('e "Riprova a caricarle"', bNo.textContent === 'Riprova a caricarle');
      clic(bOk);
      for (let i = 0; i < 40; i++) { await attesa(100); if (contatore.n) break; }
      t('cliccandolo la stampa parte davvero', contatore.n === 1);
    }
    spegni(); dom.window.close();
  }

  console.log('\n--- Se la cornice non risponde piu, l export non sparisce (rete di sicurezza) ---');
  {
    const { dom } = accendi();
    const w = dom.window, d = w.document;
    w.alert = () => {};
    await attesa(1200);
    const clic = await apriEsporta(w, d);
    const contatore = { n: 0 };
    const spegni = spiaLaStampa(d, contatore);
    clic(d.getElementById('btnEsportaPdfGenera'));
    // Si simula il guasto peggiore: la cornice non riferisce piu' niente. E' esattamente
    // cio' che succedeva davvero quando il suo script non compilava.
    for (let i = 0; i < 40; i++) {
      await attesa(50);
      if (typeof w.__dpshStampaPronta === 'function') { w.__dpshStampaPronta = () => {}; w.__dpshStampaAvanzamento = () => {}; break; }
    }
    t('i riferimenti del padre esistono', typeof w.__dpshStampaPronta === 'function');
    const t0 = Date.now();
    for (let i = 0; i < 400; i++) { await attesa(120); if (contatore.n) break; }
    t('la stampa parte lo stesso', contatore.n === 1);
    t('e parte entro la scadenza dichiarata (30s)', contatore.n === 1 && Date.now() - t0 < 34000);
    t('nessun dialogo lasciato aperto', !dialogoAperto(d));
    spegni(); dom.window.close();
  }

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(1); });
