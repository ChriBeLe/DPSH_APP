// IL COMPOSITORE, ACCESO DAVVERO.
//
// Le verifiche in mappa_geometria.js leggono il file: dicono che il tasto e' il primo del
// menu e che ogni comando ha il suo gestore. Ma la segnalazione era proprio su una cosa
// STRUTTURALMENTE presente che nella pratica non si raggiungeva, quindi qui l'app viene
// accesa in un DOM vero, con un cantiere di cinque prove con GPS, e il compositore viene
// aperto e usato: si clicca il tasto del menu, si trascina la mappa, si accende
// l'inquadramento regionale, si scrive un'etichetta, si salva. E si guarda cosa e' finito
// nel blocco.
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const src = fs.readFileSync(__dirname + '/../dist/DPSH.html', 'utf8');

const vc = new VirtualConsole(); let errori = [];
vc.on('jsdomError', e => errori.push('JSDOM: ' + (e.message || '')));
vc.on('error', (...a) => errori.push('console.error: ' + a.map(String).join(' ')));
['warn', 'log', 'info', 'debug'].forEach(k => vc.on(k, () => {}));

// Cinque verticali attorno a Sava (TA), il cantiere della relazione vera. Sparse di qualche
// centinaio di metri: abbastanza da NON stare tutte nella stessa tessera, che e' il caso in
// cui l'inquadratura automatica deve fare qualcosa.
const prove = {};
[[40.4033, 17.5586], [40.4051, 17.5602], [40.4018, 17.5571], [40.4044, 17.5559], [40.4029, 17.5614]]
  .forEach(([lat, lng], i) => {
    prove['s' + (i + 1)] = {
      id: 's' + (i + 1),
      header: { provaNr: String(i + 1), lat: String(lat), lng: String(lng), comune: 'Sava', localita: 'Contrada Sant\'Anna', date: '2026-05-12' },
      logs: [], photos: [], strati: []
    };
  });
const stato = {
  projects: { p1: { id: 'p1', name: 'Sava', comune: 'Sava', localita: 'Contrada Sant\'Anna', committente: 'Eurisko', createdAt: 1, surveys: prove, strati: [], notes: null } },
  currentProjectId: 'p1', settings: {}
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
    // jsdom non fa layout: clientWidth e' sempre 0, e disegnaComposizione lo usa per scalare
    // la tavola. Con 0 il fattore verrebbe 0 e non si potrebbe verificare nessuna geometria.
    Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return 800; }, configurable: true });
  }
});
const w = dom.window, d = w.document;
const attesa = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const clic = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const scrivi = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };

(async () => {
  await attesa(900);
  t('l app si accende senza errori', errori.length === 0);
  if (errori.length) console.log('       ', errori.slice(0, 3));

  console.log('\n--- Arrivare al compositore come ci si arriva col dito ---');
  // Il template editor si apre dalla Home. Il tasto e' nascosto finche' non si e' in Home.
  const btnHome = d.getElementById('btnHomeView');
  if (btnHome) clic(btnHome);
  await attesa(200);
  clic(d.getElementById('btnOpenReportTemplatesHome'));
  await attesa(300);

  // "Modifica layout" e' la matita a fianco del template: e' da li' che si entra nell'editor.
  const matita = d.querySelector('#reportTemplatesList .tpl-report-modifica');
  t('la lista dei template si apre', !!matita);
  if (matita) clic(matita);
  await attesa(700);
  t('e l editor del template si apre davvero',
     d.querySelectorAll('.tpl-editor-block[data-block-id]').length > 0);

  const tela = d.getElementById('composizioneTela');
  const barra = d.getElementById('composizioneBarra');
  t('la finestra del compositore esiste nel DOM vivo', !!tela && !!barra);

  console.log('\n--- I comandi nuovi ci sono, e non esplodono a vuoto ---');
  // Prima di aprire una composizione, `composizione` e' null: ogni gestore deve uscire
  // subito. Un gestore che non si guarda le spalle qui farebbe morire l'intero script di
  // inizializzazione, e tutta la barra resterebbe inerte — il difetto peggiore possibile.
  const nuovi = ['rngComposizioneOpacitaToponimi', 'selComposizioneEtichettaModo', 'inpComposizioneEtichettaTesto',
                 'rngComposizioneEtichettaMisura', 'rngComposizioneInsetMisura', 'btnComposizioneInsetRiquadro',
                 'inpComposizioneInsetEtichetta', 'lblComposizioneInsetZoom', 'selComposizioneInsetEtichettaModo',
                 'rngComposizioneInsetEtichettaMisura', 'rngComposizioneNordMisura', 'rngComposizioneScalaRiquadro',
                 'rngComposizioneScalaTesto', 'rngComposizioneMisuraPin', 'rngComposizioneLarghezza',
                 'rngComposizioneAltezza', 'btnComposizioneWmsSalva'];
  nuovi.forEach(id => t('c e ' + id, !!d.getElementById(id)));
  errori = [];
  nuovi.forEach(id => {
    const el = d.getElementById(id);
    if (!el) return;
    try {
      if (el.tagName === 'INPUT') scrivi(el, el.type === 'range' ? el.max : 'x');
      else if (el.tagName === 'SELECT') { el.value = 'comune'; el.dispatchEvent(new w.Event('change', { bubbles: true })); }
      else clic(el);
    } catch (e) { errori.push(id + ': ' + e.message); }
  });
  d.querySelectorAll('#composizioneBarra [data-comp-inset-zoom], #composizioneBarra [data-comp-zoom], #composizioneBarra [data-comp-toggle], #composizioneBarra [data-comp-toponimi]')
    .forEach(b => { try { clic(b); } catch (e) { errori.push('data-comp: ' + e.message); } });
  t('NESSUN comando esplode con la composizione chiusa', errori.length === 0);
  if (errori.length) console.log('       ', errori.slice(0, 4));

  console.log('\n--- Il tasto nel menu del blocco: dov e, e cosa apre ---');
  // Il menu del blocco si apre con un DOPPIO TAP sul corpo del blocco (scelta esplicita:
  // un tap solo seleziona e basta, per non far comparire il pannello mentre si afferra
  // una maniglia). Quindi qui si simula proprio quello, non un click.
  const doppioTap = (el) => {
    for (let n = 0; n < 2; n++) {
      el.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 }));
      el.dispatchEvent(new w.PointerEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 }));
    }
  };
  const corpi = [...d.querySelectorAll('.tpl-editor-block-body[data-block-id]')];
  const corpoMappa = corpi.find(e => e.querySelector('[data-mappa-inquadramento]'));
  t('il template aperto contiene un blocco inquadramento', !!corpoMappa);
  let menu = null;
  if (corpoMappa) { doppioTap(corpoMappa); await attesa(400); menu = d.getElementById('templateEditorBlockMenu'); }
  t('il doppio tap apre il menu del blocco', !!menu);

  if (menu) {
    // Si contano solo i comandi del CORPO del pannello: la maniglia di trascinamento, il
    // "riduci a bolla" e la tendina ⋮ sono l'intestazione, e dentro la tendina ci finiscono
    // per scelta le azioni rare e distruttive (sposta, rimuovi) — non sono cio' che si viene
    // a cercare aprendo il menu di un blocco mappa.
    const intestazione = ['collapse-menu', 'apri-menu-altro'];
    const comandi = [...menu.querySelectorAll('[data-action]')]
      .filter(e => !e.closest('[data-role="menu-altro"]') && !e.closest('.tpl-editor-block-menu-drag-handle'))
      .map(e => e.getAttribute('data-action'))
      .filter(a => !intestazione.includes(a));
    // E si verifica che le due azioni pericolose siano davvero nella tendina, non altrove:
    // se un giorno tornassero nel corpo, il conteggio qui sopra le nasconderebbe.
    t('sposta e rimuovi restano nella tendina delle azioni rare',
      ['sposta-blocco', 'remove'].every(a => {
        const el = menu.querySelector(`[data-action="${a}"]`);
        return !el || !!el.closest('[data-role="menu-altro"]');
      }));
    const iComp = comandi.indexOf('componi-mappa');
    t('il menu contiene il tasto del compositore', iComp >= 0);
    t('NEL MENU VIVO IL COMPOSITORE E IL PRIMO COMANDO, non il dodicesimo', iComp === 0);
    if (iComp > 0) console.log('       preceduto da: ' + comandi.slice(0, iComp).join(', '));
    t('e nel menu vivo non resta nessun comando satellite doppione',
      !comandi.some(a => ['pan', 'pan-reset', 'labels-toggle', 'labels-opacity', 'labels-scale',
                          'loclabel-mode', 'loclabel-text', 'loclabel-fontsize', 'loclabel-posx',
                          'loclabel-posy', 'zoom'].includes(a)));

    console.log('\n--- Usarlo ---');
    errori = [];
    const idBlocco = corpoMappa.dataset.blockId;
    clic(menu.querySelector('[data-action="componi-mappa"]'));
    await attesa(400);
    t('il compositore si apre', d.getElementById('modalComposizioneMappa').classList.contains('open'));
    t('e la tavola e disegnata dalla funzione della stampa', !!tela.querySelector('[data-mappa-inquadramento]'));
    t('con le tessere del provider', tela.querySelectorAll('img').length > 0);
    t('lo stato dice la scala vera, non un suggerimento generico',
      /1:[\d.]+/.test(d.getElementById('lblComposizioneStato').textContent));

    clic(d.querySelector('#composizioneBarra [data-comp-toggle="mappaTutteLeProve"]'));
    await attesa(300);
    t('"Tutte le prove" mette in quadro le cinque verticali',
      tela.querySelectorAll('[data-pin-etichetta]').length === 5);

    clic(d.querySelector('#composizioneBarra [data-comp-toggle="inset"]'));
    await attesa(300);
    t('l inquadramento regionale compare sulla tavola', !!tela.querySelector('[data-inset-regionale]'));
    t('col rettangolo rosso dell area di dettaglio', !!tela.querySelector('[data-riquadro-dettaglio]'));
    t('e i suoi comandi si accendono solo adesso, senza far ballare la scheda',
      d.getElementById('rngComposizioneInsetMisura').disabled === false);
    // Per difetto l'etichetta del regionale e' AUTOMATICA: dice il comune del cantiere,
    // riletto ad ogni stampa. E' la correzione del caso Roma/Brindisi in piccolo.
    t('il riquadro regionale nasce gia con il comune del cantiere',
      (tela.querySelector('[data-inset-etichetta]') || {}).textContent === 'Sava');
    const selIns = d.getElementById('selComposizioneInsetEtichettaModo');
    t('e il modo mostrato e "comune"', selIns.value === 'comune');
    selIns.value = 'custom'; selIns.dispatchEvent(new w.Event('change', { bubbles: true }));
    await attesa(250);
    t('passando a "testo mio" compare il campo', d.getElementById('inpComposizioneInsetEtichetta').style.display !== 'none');
    scrivi(d.getElementById('inpComposizioneInsetEtichetta'), 'SAVA (TA)');
    await attesa(150);
    t('e il testo scritto a mano finisce nel riquadro',
      (tela.querySelector('[data-inset-etichetta]') || {}).textContent === 'SAVA (TA)');

    const selMod = d.getElementById('selComposizioneEtichettaModo');
    selMod.value = 'comune'; selMod.dispatchEvent(new w.Event('change', { bubbles: true }));
    await attesa(300);
    const lib = tela.querySelector('[data-etichetta-libera]');
    t('scegliendo "Comune" l etichetta si scrive da sola dal cantiere', !!lib && lib.textContent === 'Sava');
    scrivi(d.getElementById('rngComposizioneEtichettaMisura'), '22');
    await attesa(150);
    t('e la sua misura si regola dal vivo',
      (tela.querySelector('[data-etichetta-libera]') || {}).style.fontSize === '22px');

    clic(d.querySelector('#composizioneBarra [data-comp-toponimi="off"]'));
    await attesa(300);
    t('spegnendo i nomi sparisce il loro livello', !tela.querySelector('[data-livello-toponimi]'));
    t('e il cursore dell opacita si spegne con loro',
      d.getElementById('rngComposizioneOpacitaToponimi').disabled === true);
    clic(d.querySelector('#composizioneBarra [data-comp-toponimi="1"]'));
    await attesa(300);
    t('riaccendendoli tornano', !!tela.querySelector('[data-livello-toponimi]'));
    t('e nessuno di questi gesti ha prodotto un errore', errori.length === 0);
    if (errori.length) console.log('       ', errori.slice(0, 3));

    console.log('\n--- Le schede, e le misure che mancavano ---');
    const schede = [...d.querySelectorAll('#composizioneSchede [data-comp-scheda]')];
    t('ci sono sette schede, una per domanda', schede.length === 7);
    clic(schede.find(b => b.dataset.compScheda === 'decori'));
    await attesa(120);
    const visibili = [...d.querySelectorAll('#composizioneBarra [data-comp-pannello]')].filter(p => p.style.display !== 'none');
    t('e a video ce n e UNA SOLA per volta', visibili.length === 1 && visibili[0].dataset.compPannello === 'decori');
    t('la scheda scelta si vede come scelta', schede.find(b => b.dataset.compScheda === 'decori').classList.contains('is-active'));

    // Nord e scala: prima non si potevano misurare affatto.
    clic(d.querySelector('#composizioneBarra [data-comp-toggle="mappaMostraNord"]'));
    await attesa(250);
    const nordPrima = (tela.querySelector('[data-elemento-mappa="nord"] svg') || {}).getAttribute
      ? parseInt(tela.querySelector('[data-elemento-mappa="nord"] svg').getAttribute('width'), 10) : 0;
    scrivi(d.getElementById('rngComposizioneNordMisura'), '220');
    await attesa(250);
    const nordDopo = parseInt(tela.querySelector('[data-elemento-mappa="nord"] svg').getAttribute('width'), 10);
    t('la freccia del nord si puo ingrandire davvero', nordDopo > nordPrima && nordPrima > 0);
    scrivi(d.getElementById('rngComposizioneScalaTesto'), '14');
    await attesa(250);
    t('e i numeri della barra di scala pure',
      /font-size:14px/.test((tela.querySelector('[data-elemento-mappa="scala"]') || {}).innerHTML || ''));
    scrivi(d.getElementById('rngComposizioneInsetEtichettaMisura'), '18');
    await attesa(250);
    t('l etichetta del riquadro regionale ha finalmente la sua misura',
      (tela.querySelector('[data-inset-etichetta]') || {}).style.fontSize === '18px');

    const quadro = () => tela.querySelector('[data-mappa-inquadramento]');
    console.log('\n--- Il formato: si ritaglia, non si deforma ---');
    clic(schede.find(b => b.dataset.compScheda === 'formato'));
    await attesa(120);
    const altezzaPrima = quadro().style.height;
    clic(d.querySelector('#composizioneBarra [data-comp-rateo="1.7778"]'));
    await attesa(300);
    t('scegliendo 16:9 il riquadro cambia forma', quadro().style.height !== altezzaPrima);
    t('e la larghezza resta quella scelta', quadro().style.width === '140mm');
    t('nessuna prova esce dal riquadro dopo il ritaglio',
      tela.querySelectorAll('[data-pin-etichetta]').length === 5);

    console.log('\n--- La basemap la eredita anche il riquadro regionale ---');
    clic(schede.find(b => b.dataset.compScheda === 'mappa'));
    const selProv = d.getElementById('selComposizioneProvider');
    t('le basemap disponibili sono piu di due', selProv.options.length >= 5);
    selProv.value = 'osm'; selProv.dispatchEvent(new w.Event('change', { bubbles: true }));
    await attesa(350);
    const srcInset = (tela.querySelector('[data-inset-regionale] img') || {}).src || '';
    t('IL RIQUADRO REGIONALE CAMBIA BASEMAP INSIEME ALLA MAPPA GRANDE',
      srcInset.indexOf('openstreetmap') >= 0);

    console.log('\n--- I servizi WMS pronti ---');
    selProv.value = 'wms'; selProv.dispatchEvent(new w.Event('change', { bubbles: true }));
    await attesa(300);
    t('scegliendo WMS compaiono i servizi pronti',
      d.getElementById('composizioneWmsPronti').style.display === 'flex');
    const pronti = [...d.querySelectorAll('#composizioneWmsElenco [data-comp-wms]')];
    t('e sono piu di uno, premibili', pronti.length >= 4);
    clic(pronti[0]);
    await attesa(300);
    t('premendone uno si compila tutto da solo',
      d.getElementById('inpComposizioneWmsUrl').value.length > 20
      && d.getElementById('inpComposizioneAttribuzione').value.length > 3);
    t('e la mappa lo usa per davvero',
      ((tela.querySelector('[data-mappa-inquadramento] img') || {}).src || '').indexOf('request=GetMap') >= 0);
    // Si torna al satellite: il resto del test verifica il salvataggio, non il WMS.
    selProv.value = 'esri-satellite'; selProv.dispatchEvent(new w.Event('change', { bubbles: true }));
    await attesa(300);

    console.log('\n--- Il formato cambia MENTRE si trascina, non al rilascio ---');
    clic(schede.find(b => b.dataset.compScheda === 'formato'));
    await attesa(120);
    const altPrimaLive = quadro().style.height;
    // Solo 'input': e' l'evento che il browser manda DURANTE il trascinamento. Se la mappa
    // cambiasse solo su 'change' (rilascio), qui non si muoverebbe niente.
    const rA = d.getElementById('rngComposizioneAltezza');
    rA.value = '95'; rA.dispatchEvent(new w.Event('input', { bubbles: true }));
    await attesa(300);
    t('trascinando l altezza il riquadro cambia subito', quadro().style.height !== altPrimaLive);
    t('e mostra la misura giusta', quadro().style.height === '95mm');

    console.log('\n--- Nord e scala: i due versi, lo sfondo, la lunghezza ---');
    clic(schede.find(b => b.dataset.compScheda === 'decori'));
    await attesa(120);
    const nord = () => tela.querySelector('[data-elemento-mappa="nord"]');
    const scala = () => tela.querySelector('[data-elemento-mappa="scala"]');
    t('la freccia nasce chiara', nord().getAttribute('data-nord-stile') === 'chiaro');
    clic(d.querySelector('[data-comp-nord-stile="scuro"]'));
    await attesa(250);
    t('e si puo fare NERA DENTRO CON TRACCIA BIANCA', nord().getAttribute('data-nord-stile') === 'scuro');
    t('con i colori davvero invertiti nel disegno',
      /fill="#0f172a" stroke="#fff"/.test(nord().innerHTML));

    t('il cartiglio della scala nasce chiaro', scala().getAttribute('data-scala-sfondo') === 'chiaro');
    clic(d.querySelector('[data-comp-scala-sfondo="nessuno"]'));
    await attesa(250);
    t('e puo NON avere sfondo', scala().getAttribute('data-scala-sfondo') === 'nessuno');
    t('senza sfondo il testo si contorna, o su un campo chiaro sparirebbe',
      /text-shadow/.test(scala().innerHTML));
    t('e la barra ha comunque una traccia che la rende evidente',
      /outline:[^;]*solid/.test(scala().innerHTML));
    clic(d.querySelector('[data-comp-scala-sfondo="scuro"]'));
    await attesa(250);
    t('oppure un cartiglio scuro', scala().getAttribute('data-scala-sfondo') === 'scuro');

    const lunPrima = scala().querySelector('span:last-child').textContent;
    scrivi(d.getElementById('rngComposizioneScalaLunghezza'), '58');
    await attesa(300);
    t('LA BARRA SI PUO ALLUNGARE', scala().querySelector('span:last-child').textContent !== lunPrima);
    t('e resta su un passo tondo, non su un numero qualsiasi',
      /^(1|2|5|10|20|25|50|100|200|250|500)(\s(m|km))$/.test(scala().querySelector('span:last-child').textContent.replace(/ /g, ' ')));

    console.log('\n--- E deve essere LEGGERO: nessuna tessera ricaricata per un colore ---');
    // Segnalato: cambiando i colori del nord e della scala l'app si bloccava per un attimo.
    // La causa non era il colore: il ridisegno riscriveva l'innerHTML dell'intera tela, e
    // cosi' distruggeva e ricreava OGNI immagine — decine di tessere remote da riscaricare.
    // Qui si marcano gli oggetti immagine esistenti e si controlla che siano ancora quelli.
    const marca = () => { tela.querySelectorAll('img').forEach((im, i) => { im.__id = 'i' + i; }); return tela.querySelectorAll('img').length; };
    const superstiti = () => [...tela.querySelectorAll('img')].filter(im => im.__id).length;

    let quante = marca();
    t('la tavola ha davvero un mosaico di tessere da preservare', quante >= 10);
    clic(d.querySelector('[data-comp-nord-stile="chiaro"]'));
    await attesa(200);
    t('cambiare il COLORE DEL NORD non tocca nessuna tessera', superstiti() === quante);
    t('ma la freccia e cambiata davvero', nord().getAttribute('data-nord-stile') === 'chiaro');

    quante = marca();
    clic(d.querySelector('[data-comp-scala-sfondo="chiaro"]'));
    await attesa(200);
    t('cambiare lo SFONDO DELLA SCALA non tocca nessuna tessera', superstiti() === quante);
    t('ma il cartiglio e cambiato davvero', scala().getAttribute('data-scala-sfondo') === 'chiaro');

    quante = marca();
    scrivi(d.getElementById('rngComposizioneScalaLunghezza'), '30');
    await attesa(200);
    t('e nemmeno cambiare la LUNGHEZZA della barra', superstiti() === quante);

    quante = marca();
    scrivi(d.getElementById('rngComposizioneNordMisura'), '160');
    await attesa(200);
    t('ne la misura del nord', superstiti() === quante);
    t('che pero si e ingrandito', parseInt(nord().querySelector('svg').getAttribute('width'), 10) > 30);

    // Il contrario: cambiare inquadratura DEVE rifare le tessere, o mostrerebbe il posto
    // sbagliato. Il guadagno sta nel distinguere i due casi, non nel non ridisegnare mai.
    quante = marca();
    clic(d.querySelector('#composizioneBarra [data-comp-zoom="1"]'));
    await attesa(300);
    t('mentre cambiare zoom le rifa, come deve', superstiti() < quante);

    console.log('\n--- La mappa DENTRO il riquadro regionale si sposta ---');
    clic(schede.find(b => b.dataset.compScheda === 'regionale'));
    await attesa(120);
    t('si sceglie che cosa muove il dito', !!d.querySelector('[data-comp-inset-trascina="mappa"]'));
    t('e per difetto muove il riquadro, come prima',
      d.querySelector('[data-comp-inset-trascina="riquadro"]').classList.contains('is-active'));
    clic(d.querySelector('[data-comp-inset-trascina="mappa"]'));
    await attesa(200);
    const insetEl = tela.querySelector('[data-inset-regionale]');
    // Si guarda il RETTANGOLO ROSSO, non le tessere. Il rettangolo segna dove cade l'area di
    // dettaglio dentro il riquadro regionale, quindi si sposta esattamente quanto si sposta
    // la mappa dell'inset: e' la conseguenza visibile del gesto. Le tessere invece cambiano
    // solo se lo spostamento supera un intero indice di tessera — a scala regionale un
    // trascinamento breve puo' restare dentro la stessa, e il controllo diventerebbe rosso
    // pur essendo tutto giusto. (E' successo: era il controllo a misurare la cosa sbagliata.)
    const rossoPrima = (tela.querySelector('[data-riquadro-dettaglio]') || {}).getAttribute
      ? tela.querySelector('[data-riquadro-dettaglio]').style.left : null;
    const posPrima = insetEl.getAttribute('style');
    insetEl.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 200, pointerId: 3 }));
    tela.dispatchEvent(new w.PointerEvent('pointermove', { bubbles: true, clientX: 320, clientY: 280, pointerId: 3 }));
    tela.dispatchEvent(new w.PointerEvent('pointerup', { bubbles: true, clientX: 320, clientY: 280, pointerId: 3 }));
    await attesa(300);
    const insetDopo = tela.querySelector('[data-inset-regionale]');
    t('trascinando, la mappa DENTRO il riquadro si e mossa',
      !!rossoPrima && tela.querySelector('[data-riquadro-dettaglio]').style.left !== rossoPrima);
    t('e il riquadro NON si e spostato: fa una cosa sola per volta',
      insetDopo.getAttribute('style') === posPrima);

    console.log('\n--- Salvare: quello che si e visto dev essere quello che resta ---');
    clic(d.getElementById('btnComposizioneSalva'));
    await attesa(500);
    t('la finestra si chiude', !d.getElementById('modalComposizioneMappa').classList.contains('open'));
    const dopo = d.querySelector(`.tpl-editor-block-body[data-block-id="${idBlocco}"]`);
    t('sul foglio il blocco mostra ora l inquadramento regionale',
      !!(dopo && dopo.querySelector('[data-inset-regionale]')));
    t('e l etichetta del comune', !!(dopo && dopo.querySelector('[data-etichetta-libera]')));
    t('e le cinque pin', !!dopo && dopo.querySelectorAll('[data-pin-etichetta]').length === 5);
    t('e il formato scelto nel compositore', /height:\s*95mm/.test(dopo.innerHTML));
  }

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})();
