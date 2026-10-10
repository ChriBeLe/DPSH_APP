// LA GEOMETRIA DELLA MAPPA. E' l'unico punto dove un errore si traduce in una figura storta
// consegnata a un cliente: funzioni pure, senza DOM, con i loro numeri.
const fs=require('fs');
const P=__dirname + '/../dist/DPSH.html';
const src=fs.readFileSync(P,'utf8');
const righe=src.split('\n');
function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
}
const NOMI=['tessereXDaLng','tessereYDaLat','lngDaTessereX','latDaTessereY','calcolaTessereFinestra',
            'puntoNellaFinestra','riquadroGeograficoFinestra','inquadraturaPerPunti','convertiInquadramentoVecchio','inquadraturaSicura','testoEtichettaAutomatica'];
const api=new Function('LATO_TESSERA','Math', NOMI.map(corpo).join('\n\n')+'\nreturn {'+NOMI.join(',')+'};')(256, Math);

// LA SORGENTE SENZA COMMENTI. Serve a cercare CODICE, non spiegazioni: due volte un
// controllo e' diventato rosso solo perche' il commento che spiega una rimozione nomina la
// cosa rimossa. Un test che legge le spiegazioni punisce chi documenta, ed e' un incentivo
// esattamente al contrario di quello che serve a questo file.
const codice = src.split('\n').filter(r => !/^\s*(\/\/|\*|\/\*)/.test(r)).join('\n');
let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };
const vicino=(a,b,e)=>Math.abs(a-b)<=(e===undefined?1e-6:e);

// Sava (TA), il cantiere della relazione vera.
const SAVA = { lat: 40.4033, lng: 17.5586 };

console.log('--- Andata e ritorno: la proiezione non deve perdere niente ---');
{
  [SAVA, {lat:0,lng:0}, {lat:-33.9,lng:151.2}, {lat:60.1,lng:-2.5}].forEach(p => {
    const z = 16;
    const x = api.tessereXDaLng(p.lng, z), y = api.tessereYDaLat(p.lat, z);
    t('ritorna al punto di partenza: ' + p.lat + ',' + p.lng,
       vicino(api.lngDaTessereX(x, z), p.lng, 1e-9) && vicino(api.latDaTessereY(y, z), p.lat, 1e-9));
  });
  t('zoom 0: il mondo intero sta in una tessera sola',
     vicino(api.tessereXDaLng(-180, 0), 0) && vicino(api.tessereXDaLng(180, 0), 1));
  t('ogni zoom in piu raddoppia la griglia',
     vicino(api.tessereXDaLng(0, 10), Math.pow(2,10)/2) && vicino(api.tessereXDaLng(0, 11), Math.pow(2,11)/2));
}

console.log('--- La finestra continua: si sposta di PIXEL, non di tessere ---');
{
  const f = api.calcolaTessereFinestra(SAVA, 16, 600, 400);
  t('la finestra e coperta da abbastanza tessere', f.tessere.length >= 6);
  t('tutte allo zoom chiesto', f.tessere.every(x => x.z === 16));
  // Il centro della finestra deve cadere davvero sul centro geografico chiesto.
  const c = api.puntoNellaFinestra(SAVA, SAVA, 16, 600, 400);
  t('il centro geografico cade al centro della finestra', vicino(c.x, 300, 0.001) && vicino(c.y, 200, 0.001));

  // ECCO LA DIFFERENZA COL MOSAICO VECCHIO: uno spostamento minuscolo deve muovere qualcosa.
  const pocoPiuAEst = { lat: SAVA.lat, lng: SAVA.lng + 0.0002 };  // ~17 metri
  const f2 = api.calcolaTessereFinestra(pocoPiuAEst, 16, 600, 400);
  const spostamento = Math.abs(f2.tessere[0].sinistra - f.tessere[0].sinistra);
  console.log('       17 metri a est spostano le tessere di', spostamento, 'pixel');
  t('DICIASSETTE METRI SPOSTANO L INQUADRATURA (col mosaico a tessere intere: zero)',
     spostamento > 0 && spostamento < 256);

  // e un pixel per volta, non 256 alla volta
  let scattiGrossi = 0, precedente = null;
  for (let i = 0; i < 40; i++) {
    const p = { lat: SAVA.lat, lng: SAVA.lng + i * 0.00005 };
    const off = api.calcolaTessereFinestra(p, 16, 600, 400).tessere[0].sinistra;
    if (precedente !== null && Math.abs(off - precedente) > 20 && Math.abs(off - precedente) < 240) scattiGrossi++;
    precedente = off;
  }
  t('lo spostamento e graduale, non a salti di una tessera', scattiGrossi === 0);
}

console.log('--- Il riquadro geografico, che disegna il rettangolo rosso ---');
{
  const r = api.riquadroGeograficoFinestra(SAVA, 14, 800, 600);
  t('il centro chiesto sta dentro il riquadro',
     r.ovest < SAVA.lng && SAVA.lng < r.est && r.sud < SAVA.lat && SAVA.lat < r.nord);
  t('nord e piu a nord di sud', r.nord > r.sud);
  const stretto = api.riquadroGeograficoFinestra(SAVA, 17, 800, 600);
  t('piu zoom = riquadro piu piccolo', (stretto.est - stretto.ovest) < (r.est - r.ovest));
  console.log('       a zoom 14 la finestra copre', ((r.est-r.ovest)*111*Math.cos(SAVA.lat*Math.PI/180)).toFixed(1), 'km in larghezza');
}

console.log('--- Inquadrare TUTTE le prove insieme ---');
{
  const prove = [
    { lat: 40.4033, lng: 17.5586 }, { lat: 40.4051, lng: 17.5602 },
    { lat: 40.4019, lng: 17.5571 }, { lat: 40.4044, lng: 17.5559 }, { lat: 40.4008, lng: 17.5610 }
  ];
  const inq = api.inquadraturaPerPunti(prove, 600, 600, 19);
  console.log('       zoom scelto:', inq.zoom, '· centro', inq.centro.lat.toFixed(4), inq.centro.lng.toFixed(4));
  t('trova un inquadratura', !!inq);
  const dentro = prove.every(p => {
    const q = api.puntoNellaFinestra(p, inq.centro, inq.zoom, 600, 600);
    return q.x > 0 && q.x < 600 && q.y > 0 && q.y < 600;
  });
  t('TUTTE le prove cadono dentro la finestra', dentro);
  const conMargine = prove.every(p => {
    const q = api.puntoNellaFinestra(p, inq.centro, inq.zoom, 600, 600);
    return q.x > 40 && q.x < 560 && q.y > 40 && q.y < 560;
  });
  t('e con un margine, non appiccicate ai bordi', conMargine);
  t('con una prova sola non azzera lo zoom', api.inquadraturaPerPunti([prove[0]], 600, 600, 19).zoom >= 15);
  t('senza prove non inventa un inquadratura', api.inquadraturaPerPunti([], 600, 600, 19) === null);
  t('e ignora le prove senza coordinate',
     api.inquadraturaPerPunti([{lat:null,lng:null}, prove[0]], 600, 600, 19).zoom >= 15);
}

console.log('--- I template gia salvati non devono spostarsi ---');
{
  const vecchio = { satelliteZoom: 16, satelliteOffsetX: 0, satelliteOffsetY: 0 };
  const m = api.convertiInquadramentoVecchio(vecchio, SAVA.lat, SAVA.lng);
  t('la conversione produce un centro geografico', m && isFinite(m.centro.lat) && isFinite(m.centro.lng));
  t('lo zoom resta quello salvato', m.zoom === 16);
  // Il vecchio mosaico era centrato sulla TESSERA del pin: il centro nuovo deve cadere
  // dentro quella stessa tessera, non altrove.
  const tx = Math.floor(api.tessereXDaLng(SAVA.lng, 16)), ty = Math.floor(api.tessereYDaLat(SAVA.lat, 16));
  t('e cade nella stessa tessera su cui era centrato il mosaico',
     Math.floor(api.tessereXDaLng(m.centro.lng, 16)) === tx && Math.floor(api.tessereYDaLat(m.centro.lat, 16)) === ty);
  const spostato = api.convertiInquadramentoVecchio({ satelliteZoom: 16, satelliteOffsetX: 2, satelliteOffsetY: -1 }, SAVA.lat, SAVA.lng);
  t('lo scostamento in tessere diventa uno scostamento geografico',
     Math.floor(api.tessereXDaLng(spostato.centro.lng, 16)) === tx + 2
     && Math.floor(api.tessereYDaLat(spostato.centro.lat, 16)) === ty - 1);
  const giaNuovo = { mappa: { centro: { lat: 1, lng: 2 }, zoom: 12 } };
  t('un blocco GIA convertito non viene riconvertito',
     api.convertiInquadramentoVecchio(giaNuovo, SAVA.lat, SAVA.lng).centro.lat === 1);
}

console.log('--- Il disegno della mappa ---');
{
  // Si estraggono anche le funzioni che producono HTML: qui bastano le stringhe.
  const NOMI2=['posizioneElementoMappa','htmlPinMappa','htmlBarraScalaMappa','htmlNordMappa',
               'htmlInsetRegionaleMappa','htmlTessereFinestra','buildMappaInquadramentoHtml','puntiProveDelProgetto','escapeHtmlDidascalia','radiceProva','proveFisiche'];
  const RIGHE_COST = righe.filter(r =>
      r.includes('const LATO_TESSERA = 256;') ||
      r.includes('const VERTICI_MAPPA = {') ||
      r.includes("'alto-sinistra':") || r.includes("'basso-sinistra':") ||
      r.trim() === '};' && false).join('\n');
  const iV = righe.findIndex(r => r.includes('const VERTICI_MAPPA = {'));
  const vertici = righe.slice(iV, iV + 4).join('\n');
  const iP = righe.findIndex(r => r.includes('const PROVIDER_MAPPA = {'));
  let fineP = iP; while (righe[fineP] !== '            };') fineP++;
  const providers = righe.slice(iP, fineP + 1).join('\n');
  const iE = righe.findIndex(r => r.includes('const ETICHETTE_MAPPA_URL ='));
  const etich = righe.slice(iE, iE + 2).join('\n');
  const api2 = new Function('Math','location',
    'const LATO_TESSERA = 256;\n' + providers + '\n' + etich + '\n' + vertici + '\n'
    + NOMI.map(corpo).join('\n\n') + '\n' + NOMI2.map(corpo).join('\n\n')
    + '\nreturn {' + NOMI2.join(',') + '};')(Math, { protocol: 'https:' });

  const SAVA5 = [
    { lat: 40.4033, lng: 17.5586, numero: '1' }, { lat: 40.4051, lng: 17.5602, numero: '2' },
    { lat: 40.4019, lng: 17.5571, numero: '3' }
  ];
  const html = api2.buildMappaInquadramentoHtml({
    centro: SAVA, zoom: 16, larghezzaMm: 140, altezzaMm: 140, pin: SAVA5,
    mostraNord: true, mostraScala: true
  });
  t('il riquadro esce con la misura chiesta', /width:140mm; height:140mm/.test(html));
  t('le tessere sono posate a offset di PIXEL, non in una griglia',
     /left:-?\d+px; top:-?\d+px; width:256px/.test(html) && !/grid-template-columns/.test(html));
  {
    // Una tessera che non arriva non lascia una fascia grigia: si richiede, e sotto c'è lo
    // stesso pezzo allo zoom di sopra (×2); persa due volte, si toglie (il buco è coperto).
    const ins = api2.buildMappaInquadramentoHtml({ centro: SAVA, zoom: 16, larghezzaMm: 140, altezzaMm: 100, inset: { attivo: true, zoom: 11 } });
    const riserve = ins.match(/data-tessere-riserva="1"[^>]*transform:scale\(2\)/g) || [];
    t('sotto le tessere (mappa e inquadramento regionale) c\'è lo strato di riserva allo zoom di sopra', riserve.length === 2 && /\/tile\/15\//.test(ins) && /\/tile\/10\//.test(ins));
    t('una tessera persa si richiede una volta, poi si toglie', /onerror="if\(!this\.dataset\.riprova\)[^"]*else this\.remove\(\);"/.test(ins));
  }
  t('ci sono tutte e tre le pin', (html.match(/data-pin-mappa=/g) || []).length === 3);
  t('ognuna con la sua etichetta DPSH', /DPSH 1/.test(html) && /DPSH 2/.test(html) && /DPSH 3/.test(html));
  t('e col suo numero sulla pin', (html.match(/data-pin-etichetta=/g) || []).length === 3);
  t('la freccia del nord c e quando richiesta', /data-elemento-mappa="nord"/.test(html));
  t('la barra di scala pure', /data-elemento-mappa="scala"/.test(html));
  t('L ATTRIBUZIONE E STAMPATA NELLA FIGURA (prima non c era)',
     /data-attribuzione-mappa/.test(html) && /Esri, Maxar, Earthstar Geographics/.test(html));

  const senzaEtichette = api2.buildMappaInquadramentoHtml({ centro: SAVA, zoom: 16, pin: SAVA5, etichetteAttive: false });
  t('le etichette delle pin si possono spegnere tutte insieme', !/data-pin-etichetta/.test(senzaEtichette));
  const unaSpenta = api2.buildMappaInquadramentoHtml({ centro: SAVA, zoom: 16,
      pin: SAVA5.map((p,i) => i === 1 ? Object.assign({}, p, { mostraEtichetta: false }) : p) });
  t('e anche UNA SOLA, indipendentemente dalle altre', (unaSpenta.match(/data-pin-etichetta=/g) || []).length === 2);
  const spostata = api2.buildMappaInquadramentoHtml({ centro: SAVA, zoom: 16,
      pin: [Object.assign({}, SAVA5[0], { dx: 30, dy: -20 })] });
  const normale = api2.buildMappaInquadramentoHtml({ centro: SAVA, zoom: 16, pin: [SAVA5[0]] });
  t('OGNI ETICHETTA SI SPOSTA PER CONTO SUO', spostata !== normale && /data-pin-etichetta/.test(spostata));

  console.log('  · i toponimi');
  const t0 = api2.buildMappaInquadramentoHtml({ centro: SAVA, zoom: 16, pin: [], ingrandimentoToponimi: 0 });
  const t2 = api2.buildMappaInquadramentoHtml({ centro: SAVA, zoom: 16, pin: [], ingrandimentoToponimi: 2 });
  t('a 1x le etichette vengono dallo stesso zoom della mappa', /World_Boundaries_and_Places\/MapServer\/tile\/16\//.test(t0));
  t('a 4x vengono da uno zoom PIU SUPERFICIALE (14), ed e per questo che ingrandiscono',
     /World_Boundaries_and_Places\/MapServer\/tile\/14\//.test(t2) && /transform:scale\(4\)/.test(t2));
  t('e la mappa sotto resta allo zoom giusto', /World_Imagery\/MapServer\/tile\/16\//.test(t2));
  const spente = api2.buildMappaInquadramentoHtml({ centro: SAVA, zoom: 16, pin: [], etichette: false });
  t('si possono spegnere del tutto', !/data-livello-toponimi/.test(spente));

  console.log('  · i provider');
  const osm = api2.buildMappaInquadramentoHtml({ centro: SAVA, zoom: 16, pin: [], provider: 'osm' });
  t('OSM usa il proprio servizio e la propria attribuzione',
     /tile\.openstreetmap\.org/.test(osm) && /OpenStreetMap contributors/.test(osm));
  const wmsVuoto = api2.buildMappaInquadramentoHtml({ centro: SAVA, zoom: 16, pin: [], provider: 'wms' });
  t('un WMS senza indirizzo lo DICE, invece di lasciare un rettangolo grigio', /non impostato/.test(wmsVuoto));
  const wms = api2.buildMappaInquadramentoHtml({ centro: SAVA, zoom: 16, pin: [], provider: 'wms',
      wmsUrl: 'http://webapps.sit.puglia.it/arcgis/services/x/MapServer/WMSServer', wmsLayer: '0' });
  t('con indirizzo chiede il riquadro esatto: una richiesta, niente tessere',
     /request=GetMap/.test(wms) && /bbox=/.test(wms) && !/256px/.test(wms.split('data-livello-toponimi')[0]));
  t('E AVVISA che un servizio http puo essere bloccato in https', /potrebbe bloccarlo/.test(wms));

  console.log('  · i vertici e le coordinate sono lo stesso dato');
  t('un vertice si traduce in coordinate', /right:4\.0%;/.test(api2.posizioneElementoMappa('alto-destra')));
  t('e una coordinata libera vince sul vertice', /left:33\.0%;/.test(api2.posizioneElementoMappa('alto-destra', 33, 20)));
  t('sotto meta si ancora in alto, sopra meta in basso',
     /top:/.test(api2.posizioneElementoMappa(null, 10, 10)) && /bottom:/.test(api2.posizioneElementoMappa(null, 10, 90)));

  console.log('  · l inquadramento regionale');
  const conInset = (extra) => api2.buildMappaInquadramentoHtml(Object.assign({
      centro: SAVA, zoom: 16, larghezzaMm: 140, altezzaMm: 140, pin: SAVA5,
      inset: Object.assign({ attivo: true, etichetta: 'Sava (TA)' }, extra || {})
  }, {}));
  const ins = conInset();
  t('l inset compare quando acceso', /data-inset-regionale/.test(ins));
  t('spento di default, nessuna sorpresa sulle figure gia fatte',
     !/data-inset-regionale/.test(api2.buildMappaInquadramentoHtml({ centro: SAVA, zoom: 16, pin: [] })));
  t('ha le sue tessere, a uno zoom piu largo del dettaglio',
     /World_Imagery\/MapServer\/tile\/11\//.test(ins) && /World_Imagery\/MapServer\/tile\/16\//.test(ins));
  t('IL RIQUADRO ROSSO C E, ed e calcolato', /data-riquadro-dettaglio/.test(ins) && /border:2px solid #dc2626/.test(ins));
  t('e l etichetta del comune pure', /data-inset-etichetta/.test(ins) && /Sava \(TA\)/.test(ins));

  // Il riquadro rosso deve SEGUIRE il dettaglio: spostando il centro del dettaglio si sposta.
  const rossoDi = (html) => { const m = html.match(/data-riquadro-dettaglio="1" style="position:absolute; left:([-\d.]+)px; top:([-\d.]+)px; width:([\d.]+)px; height:([\d.]+)px/); return m ? { x:+m[1], y:+m[2], w:+m[3], h:+m[4] } : null; };
  const r1 = rossoDi(ins);
  const spostato = api2.buildMappaInquadramentoHtml({ centro: { lat: SAVA.lat + 0.01, lng: SAVA.lng }, zoom: 16,
      larghezzaMm: 140, altezzaMm: 140, pin: [], inset: { attivo: true, centro: SAVA, zoom: 11 } });
  const r2 = rossoDi(spostato);
  t('spostando il dettaglio il riquadro rosso si sposta da solo', r1 && r2 && Math.abs(r1.y - r2.y) > 2);

  // Zoomando indietro sul dettaglio il riquadro deve CRESCERE.
  const largo = api2.buildMappaInquadramentoHtml({ centro: SAVA, zoom: 13, larghezzaMm: 140, altezzaMm: 140,
      pin: [], inset: { attivo: true, centro: SAVA, zoom: 11 } });
  const stretto = api2.buildMappaInquadramentoHtml({ centro: SAVA, zoom: 17, larghezzaMm: 140, altezzaMm: 140,
      pin: [], inset: { attivo: true, centro: SAVA, zoom: 11 } });
  t('meno zoom sul dettaglio = riquadro rosso piu grande', rossoDi(largo).w > rossoDi(stretto).w);

  // Il caso che rende il rettangolo inutile: un cantiere a scala regionale sparisce.
  const minuscolo = api2.buildMappaInquadramentoHtml({ centro: SAVA, zoom: 19, larghezzaMm: 140, altezzaMm: 140,
      pin: [], inset: { attivo: true, centro: SAVA, zoom: 9 } });
  const rm = rossoDi(minuscolo);
  t('UN CANTIERE A SCALA REGIONALE non si riduce a un puntino invisibile', rm.w >= 14 && rm.h >= 14);
  t('e resta comunque centrato sul punto giusto', Math.abs((rm.x + rm.w/2) - (34*140/100*4)/2) < 3);

  const senzaRosso = conInset({ mostraRiquadro: false });
  t('il riquadro rosso si puo spegnere', !/data-riquadro-dettaglio/.test(senzaRosso));
  const grande = conInset({ percLarghezza: 55 });
  t('la misura dell inset e regolabile — ed e quello il "ritaglio"',
     /width:77\.0mm/.test(grande) && /width:47\.6mm/.test(ins));
  const inBasso = conInset({ posizione: 'basso-sinistra' });
  t('si sposta sui quattro vertici', /bottom:4\.0%; ?/.test(inBasso) || /left:4\.0%;bottom:4\.0%/.test(inBasso.replace(/\s/g,'')));

  console.log('  · le prove del progetto');
  const proj = { surveys: {
    // Con l'id, come ogni prova vera: dall'11/09 le pin passano da proveFisiche, che raggruppa
    // per verticale usando proprio l'id (una prova senza id non esiste nell'app).
    a: { id: 'a', header: { provaNr: '2', lat: 40.1, lng: 17.1 } },
    b: { id: 'b', header: { provaNr: '1', lat: 40.2, lng: 17.2 } },
    c: { id: 'c', header: { provaNr: '3' } }
  }};
  const punti = api2.puntiProveDelProgetto(proj);
  t('ordinate per numero di prova', punti.map(p => p.numero).join(',') === '1,2');
  t('e una prova SENZA coordinate resta fuori, non messa a caso', punti.length === 2);
}

console.log('--- I provider e l attribuzione ---');
t('ci sono almeno tre provider', (src.match(/const PROVIDER_MAPPA = \{/) || []).length === 1 && /'esri-satellite'/.test(src) && /'osm'/.test(src) && /'wms'/.test(src));
t('ognuno dichiara la propria attribuzione', /attribuzione: 'Esri, Maxar, Earthstar Geographics'/.test(src) && /attribuzione: '© OpenStreetMap contributors'/.test(src));
t('e il codice dice perche l attribuzione non e opzionale', /e' una condizione d'uso/.test(src));
t('il vincolo http dei WMS regionali e annotato, non scoperto dopo', /contenuto misto/.test(src));

console.log('--- La schermata di composizione ---');
{
  const { JSDOM } = require('jsdom');
  const pagina = new JSDOM(src, { runScripts: 'outside-only' }).window.document;
  t('la schermata esiste', !!pagina.getElementById('modalComposizioneMappa'));
  // QUESTA RIGA ERA VERDE E SBAGLIATA. Diceva "sta sopra l'editor dei template" ma
  // verificava solo che la classe fosse tier-strati-top — e tier-strati-top vale 301,
  // mentre l'editor vale 321 e il suo menu di blocco 330. Il compositore si apriva DIETRO
  // la schermata che lo aveva chiamato, e il controllo non se ne accorgeva perche'
  // confondeva "ha il nome giusto" con "e' davvero sopra".
  // Ora i tre livelli si LEGGONO dal foglio di stile e si confrontano fra loro: cosi'
  // l'asserzione non puo' piu' essere d'accordo con se stessa.
  {
    const z = (sel) => {
      const m = src.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{[^}]*z-index:\\s*(\\d+)'));
      return m ? parseInt(m[1], 10) : null;
    };
    const zComp = z('.modal.tier-editor-top');
    const zEditor = z('.modal.tier-editor');
    const zMenu = z('.tpl-editor-block-menu');
    t('il compositore porta il livello che sta sopra l editor',
       pagina.getElementById('modalComposizioneMappa').classList.contains('tier-editor-top'));
    t('e quel livello e DAVVERO piu alto dell editor che lo apre', zComp > zEditor);
    t('e anche del menu di blocco da cui parte il comando', zComp > zMenu);
  }
  t('ha la tela dove si trascina', !!pagina.getElementById('composizioneTela'));
  t('la tela non lascia scrollare la pagina sotto il dito',
     /touch-action:none/.test(pagina.getElementById('composizioneTela').getAttribute('style') || ''));
  t('c e la scelta del provider', !!pagina.getElementById('selComposizioneProvider'));
  t('e i quattro passi dei toponimi, incluso "no"',
     pagina.querySelectorAll('#composizioneBarra [data-comp-toponimi]').length === 4);
  t('e i cinque interruttori degli elementi',
     pagina.querySelectorAll('#composizioneBarra [data-comp-toggle]').length === 5);
  t('i campi del WMS ci sono, nascosti finche non servono',
     !!pagina.getElementById('inpComposizioneWmsUrl') && /display:none/.test(pagina.getElementById('composizioneWmsPronti').getAttribute('style')));
  t('e si puo dichiarare la fonte da citare', !!pagina.getElementById('inpComposizioneAttribuzione'));
  t('il menu del blocco ha il tasto per aprirla', src.includes('data-action="componi-mappa"'));
  t('e il tasto e cablato', /apriComposizioneMappa\(blockId\)/.test(src));

  console.log('  · le regole del compositore, lette dal codice');
  t('LA TAVOLA E DISEGNATA DALLA STESSA FUNZIONE DELLA STAMPA',
     /function disegnaComposizione\(\)[\s\S]{0,1400}buildMappaInquadramentoHtml\(\{/.test(src));
  t('le etichette si interrogano PRIMA della mappa, o non si potrebbero afferrare',
     src.indexOf("t.closest('[data-pin-etichetta]')") < src.indexOf("trascina = { tipo: 'mappa'"));
  t('il dito viene convertito da pixel di schermo a pixel di tavola',
     /const daSchermoATavola = PX_PER_MM \/ \(96 \/ 25\.4\);/.test(src));
  t('trascinare la mappa muove il centro in senso OPPOSTO', /- \(dx \* daSchermoATavola\) \/ LATO_TESSERA/.test(src));
  t('passando a "tutte le prove" reinquadra, invece di lasciarne fuori quattro',
     /chiave === 'mappaTutteLeProve' && composizione\.imp\.mappaTutteLeProve/.test(src));
  t('salvando si toglie la vecchia scala dei toponimi, che altrimenti tornerebbe a decidere lei',
     /delete blk\.satelliteLabelsScale;/.test(src));
  t('e il salvataggio passa dallo snapshot per l annulla', /salvaUndoSnapshotEditor\(\);[\s\S]{0,200}blk\.mappa = \{ centro/.test(src));
}

// =====================================================================================
// IL COMPOSITORE E' L'INTERFACCIA DEL BLOCCO, NON UNA SCHERMATA IN PIU'.
//
// Segnalato: "e' rimasto un menu di merda e scondito ... Manca tutto". Il compositore
// c'era gia' e funzionava: era il suo tasto a stare in fondo a un menu lunghissimo, con
// sopra undici controlli e sotto gli otto comandi satellite che il compositore aveva gia'
// sostituito. Un comando raggiungibile solo scorrendo non e' un comando.
// Questi controlli difendono la struttura, non la geometria: che il tasto sia IL PRIMO,
// che i doppioni non tornino, e che nessun comando resti scollegato.
// =====================================================================================
console.log('--- Il menu del blocco: una porta sola ---');
{
  // Il ramo "inquadramento" del menu, dall'apertura della condizione alla sua chiusura.
  const iRamo = src.indexOf('${haZoomMappa ? `');
  const fineRamo = src.indexOf("` : ''}", iRamo);
  const ramo = src.slice(iRamo, fineRamo);
  t('il ramo inquadramento del menu esiste ancora', iRamo > 0 && ramo.length > 0);
  t('IL TASTO DEL COMPOSITORE E DENTRO QUEL RAMO', ramo.includes('data-action="componi-mappa"'));
  t('ed e l UNICO comando del ramo: niente da scorrere per arrivarci',
     (ramo.match(/data-action="/g) || []).length === 1);

  // IL CONTROLLO CHE CONTA. Essere l'unico comando del proprio gruppo non basta: prima
  // il gruppo stava DOPO undici controlli generici (larghezza, altezza, colonne, font...)
  // e la segnalazione era proprio quella — "un menu di merda e scondito", perche' il tasto
  // c'era ma bisognava sapere che c'era. Qui si misura la sua posizione nel menu intero.
  const iMenu = src.indexOf('menu.innerHTML = `');
  const menuIntero = src.slice(iMenu, src.indexOf('\n                `;', iMenu));
  const comandi = [...menuIntero.matchAll(/data-action="([a-z-]+)"|azione: '([a-z-]+)'/g)]
      .map(m => m[1] || m[2])
      // L'intestazione del pannello non e' un comando sul blocco: la maniglia per trascinare
      // il pannello, il "riduci a bolla" e la tendina delle azioni rare stanno sopra tutto
      // per costruzione e non sono cio' che si viene a cercare aprendo il menu.
      .filter(a => !['collapse-menu', 'apri-menu-altro'].includes(a));
  // ATTENZIONE A COSA PUO' SAPERE QUESTO CONTROLLO. Legge il TESTO del modello, dove i rami
  // condizionali stanno tutti scritti uno dopo l'altro: il pannello delle eccezioni di stile
  // (che esiste solo per i blocchi di testo) e il tasto del compositore (che esiste solo per
  // i blocchi mappa) qui compaiono entrambi, ma nel menu VERO non convivono mai.
  // Quindi qui si verifica solo che il compositore preceda i controlli generici, che e' cio'
  // che un'analisi statica puo' onestamente stabilire. La posizione nel menu vero — "primo
  // comando" — la misura compositore_vivo.js aprendo l'app e contando gli elementi renderizzati.
  const generici = ['larghezza-input', 'scale-input', 'font-blocco', 'fontsize-pt'];
  const posizione = comandi.indexOf('componi-mappa');
  const primoGenerico = comandi.findIndex(a => generici.includes(a));
  t('il compositore precede TUTTI i controlli generici del menu',
     posizione >= 0 && (primoGenerico === -1 || posizione < primoGenerico));
  if (posizione >= 0 && primoGenerico >= 0 && posizione >= primoGenerico) {
      console.log('       preceduto da: ' + comandi.slice(0, posizione).join(', '));
  }
  t('e sta prima della larghezza, che e il primo dei controlli generici',
     menuIntero.indexOf('componi-mappa') < menuIntero.indexOf("azione: 'larghezza-input'"));
  t('il ramo non contiene piu nessun controllo numerico satellite',
     !/azione: '(zoom|labels-opacity|labels-scale|loclabel-[a-z]+)'/.test(ramo));

  // I comandi soppressi: spariti dal markup E dal cablaggio. Un gestore superstite non
  // fallisce, semplicemente non parte mai — e mente a chi legge il file.
  [['tastierino a frecce (spostamento a scatti)', 'data-action="pan"'],
   ['interruttore toponimi del menu', 'data-action="labels-toggle"'],
   ['opacita toponimi nel menu', "'labels-opacity'"],
   ['scala toponimi nel menu', "'labels-scale'"],
   ['dimensione etichetta nel menu', "'loclabel-fontsize'"],
   ['posizione X etichetta nel menu', "'loclabel-posx'"],
   ['posizione Y etichetta nel menu', "'loclabel-posy'"],
   ['modo etichetta nel menu', 'loclabel-mode'],
   ['testo etichetta nel menu', 'loclabel-text']
  ].forEach(([nome, ago]) => t('sparito, markup e cablaggio: ' + nome, !codice.includes(ago)));

  t('e satelliteLabelsScale non ha piu NESSUNO che la scriva',
     !/\.satelliteLabelsScale = /.test(codice));
  t('resta solo letta per convertire i template vecchi',
     /const vecchiaScala = b\.satelliteLabelsScale/.test(src));
}

console.log('--- La barra del compositore: nessun comando morto, nessun comando muto ---');
{
  // Il pezzo di codice del compositore, delimitato dai suoi due commenti di sezione.
  const iJs = src.indexOf('// LA SCHERMATA DI COMPOSIZIONE');
  const fJs = src.indexOf('// RITAGLIO DELLE IMMAGINI', iJs);
  const js = src.slice(iJs, fJs);
  // E il suo markup, dalla finestra al div della tela.
  const iHtml = src.indexOf('id="modalComposizioneMappa"');
  const fHtml = src.indexOf('id="btnComposizioneSalva"', iHtml);
  const html = src.slice(iHtml, fHtml);
  t('trovo sia il codice sia il markup del compositore', js.length > 2000 && html.length > 1000);

  // 1) OGNI id CERCATO DAL CODICE ESISTE NEL MARKUP. Un id sbagliato non da errore:
  //    getElementById torna null, la riga viene saltata dalla guardia, e il comando resta
  //    li' a video senza fare niente. E' esattamente il difetto segnalato, in miniatura.
  const idsCercati = [...js.matchAll(/getElementById\('(composizione|sel|inp|rng|btn|lbl)([A-Za-z]*)'\)/g)]
      .map(m => m[1] + m[2]);
  const idsUnici = [...new Set(idsCercati)];
  t('il codice cerca almeno una dozzina di elementi', idsUnici.length >= 12);
  const idsOrfani = idsUnici.filter(id => !html.includes('id="' + id + '"') && !src.includes('id="' + id + '"'));
  t('NESSUN id cercato dal codice manca nel markup', idsOrfani.length === 0);
  if (idsOrfani.length) console.log('       orfani:', idsOrfani.join(', '));

  // 2) E IL CONTRARIO: ogni comando nel markup e' cercato dal codice. Un cursore a video
  //    che nessuno legge e' una promessa non mantenuta.
  const idsAVideo = [...html.matchAll(/id="((?:sel|inp|rng|btn|lbl)Composizione[A-Za-z]*)"/g)].map(m => m[1]);
  t('la barra espone almeno dieci comandi', idsAVideo.length >= 10);
  const muti = idsAVideo.filter(id => !js.includes("'" + id + "'"));
  t('NESSUN comando a video e privo di gestore', muti.length === 0);
  if (muti.length) console.log('       muti:', muti.join(', '));

  // 3) Gli attributi data- della barra, stessa doppia verifica.
  const dataAVideo = [...new Set([...html.matchAll(/data-comp-([a-z-]+)=/g)].map(m => m[1]))];
  const inCammello = s2 => s2.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const dataMuti = dataAVideo.filter(a => !js.includes('data-comp-' + a) && !js.includes('.comp' + inCammello(a).charAt(0).toUpperCase() + inCammello(a).slice(1)));
  t('ogni gruppo data-comp- della barra ha il suo gestore', dataMuti.length === 0);
  if (dataMuti.length) console.log('       muti:', dataMuti.join(', '));

  console.log('  · quello che il menu ha perso, il compositore lo deve avere');
  t('opacita dei toponimi', /rngComposizioneOpacitaToponimi/.test(html) && /opacitaToponimi: imp\.opacitaToponimi/.test(js));
  t('etichetta libera: i quattro modi', ['none','localita','comune','custom'].every(v => html.includes('value="' + v + '"')));
  t('etichetta libera: testo, misura e posizione', /inpComposizioneEtichettaTesto/.test(html) && /rngComposizioneEtichettaMisura/.test(html) && /etichettaLiberaX: imp\.etichettaX/.test(js));
  t('inquadramento regionale: zoom, misura, riquadro, etichetta',
     /data-comp-inset-zoom/.test(html) && /rngComposizioneInsetMisura/.test(html)
     && /btnComposizioneInsetRiquadro/.test(html) && /inpComposizioneInsetEtichetta/.test(html));

  console.log('  · e le deve SALVARE, o si perdono chiudendo');
  ['satelliteLabelsOpacity','satelliteCustomLabelMode','satelliteCustomLabelText',
   'satelliteCustomLabelFontSize','satelliteCustomLabelPosX','satelliteCustomLabelPosY']
    .forEach(k => t('salva ' + k, new RegExp('blk\\.' + k + ' = imp\\.').test(js)));

  console.log('  · le regole di comportamento');
  t('l etichetta dentro l inset si afferra PRIMA dell inset che la contiene',
     js.indexOf("t.closest('[data-inset-etichetta]')") < js.indexOf("t.closest('[data-inset-regionale]')"));
  t('e la sua percentuale e riferita al riquadro regionale, non alla mappa grande',
     /const wIns = larghezzaPx \* perc \/ 100/.test(js));
  t('nella tela le etichette tornano afferrabili (in stampa restano pointer-events:none)',
     /#composizioneTela \[data-etichetta-libera\]/.test(src) && /pointer-events: auto !important/.test(src));
  t('Localita e Comune si RILEGGONO dal cantiere, non si copiano',
     /return testoEtichettaAutomatica\(imp\.etichettaModo, imp\.etichettaTesto, d\)/.test(js));
  // Questa regola e' CAMBIATA di proposito, e l'asserzione va riscritta invece che aggirata.
  // Prima i comandi del regionale sparivano quando il riquadro era spento: la scheda si
  // accorciava e si allungava ad ogni accensione, e un pannello che si muove e' un pannello
  // che non si impara. Ora restano al loro posto, spenti — visibili come possibilita', non
  // utilizzabili come comandi.
  t('i comandi del regionale restano al loro posto, spenti finche il riquadro non c e',
     /el\.disabled = !imp\.mappaInset\.attivo/.test(js));
  t('l opacita si spegne quando i nomi sono spenti', /rngOp\.disabled = !imp\.etichette/.test(js));
  t('trascinare un cursore non ridisegna decine di tessere per ogni pixel',
     /data-livello-toponimi/.test(js) && /lay\.style\.opacity/.test(js));
  t('digitare nel campo non gli fa perdere il fuoco', /document\.activeElement !== inpEtTxt/.test(js));
}

// =====================================================================================
// IL CASO ROMA / BRINDISI.
//
// Segnalato: «avevo fatto il template basandomi su Roma, ma quando lo stesso template
// l'ho usato su Brindisi la mappa mi segnava ancora Roma, e quindi nessuna pin e' stata
// mostrata». Il centro geografico veniva salvato nel template e vinceva sempre — ma un
// template esiste per essere riusato su cantieri diversi, quindi un centro fisso dentro
// un template e' una bomba a orologeria. Qui si spara con le coordinate vere.
// =====================================================================================
console.log('--- Il centro salvato non puo\' piu\' perdere le prove ---');
{
  const ROMA = { lat: 41.9028, lng: 12.4964 };
  const BRINDISI = [{ lat: 40.6327, lng: 17.9418, numero: '1' }, { lat: 40.6351, lng: 17.9462, numero: '2' }];
  const L = 560, H = 560;   // 140mm x 4 px/mm, la misura di serie del blocco

  const salvataRoma = { centro: ROMA, zoom: 16, provider: 'esri-satellite' };
  const risolta = api.inquadraturaSicura(salvataRoma, BRINDISI, L, H);
  t('IL TEMPLATE FATTO SU ROMA, USATO SU BRINDISI, NON RESTA SU ROMA',
     Math.abs(risolta.centro.lat - ROMA.lat) > 1);
  t('e si ricentra sulle prove vere', Math.abs(risolta.centro.lat - 40.634) < 0.02 && Math.abs(risolta.centro.lng - 17.944) < 0.02);
  t('dichiarando di averlo fatto (il chiamante deve saperlo, per lo zoom)', risolta.ricalcolata === true);
  t('ma conservando il provider scelto: si sostituisce cio che e sbagliato, non tutto',
     risolta.provider === 'esri-satellite');
  // La prova che conta: dopo la correzione ogni pin cade DENTRO il riquadro.
  const dentro = BRINDISI.every(p => {
    const q = api.puntoNellaFinestra(p, risolta.centro, risolta.zoom, L, H);
    return q.x >= 26 && q.x <= L - 26 && q.y >= 26 && q.y <= H - 26;
  });
  t('e tutte le pin cadono dentro il riquadro, con margine per l etichetta', dentro);

  console.log('  · ma un inquadramento scelto a mano sullo STESSO cantiere si rispetta');
  // Spostare la mappa per far respirare la figura e' una scelta legittima: non va annullata.
  // Lo spostamento va misurato in PIXEL, non in gradi: la prima stesura di questo controllo
  // spostava di 0,0006 gradi credendoli "pochi", ma allo zoom scelto valevano 148 px su un
  // riquadro alto 560 — e la pin usciva davvero. Era il test a sbagliare, non il codice.
  const centroBrindisi = api.inquadraturaPerPunti(BRINDISI, L, H, 19);
  const gradiPerPixel = 360 / (256 * Math.pow(2, centroBrindisi.zoom));
  const spostatoDiPoco = { centro: { lat: centroBrindisi.centro.lat, lng: centroBrindisi.centro.lng + gradiPerPixel * 8 },
                           zoom: centroBrindisi.zoom, provider: 'osm' };
  const rispettata = api.inquadraturaSicura(spostatoDiPoco, BRINDISI, L, H);
  t('lo spostamento volontario resta', rispettata.centro.lat === spostatoDiPoco.centro.lat);
  t('e non viene marcato come ricalcolato', !rispettata.ricalcolata);

  console.log('  · e i casi limite non fanno danni');
  t('senza centro salvato inquadra sui punti', !!api.inquadraturaSicura(null, BRINDISI, L, H).centro);
  t('senza punti non inventa nulla e tiene il salvato',
     api.inquadraturaSicura(salvataRoma, [], L, H).centro.lat === ROMA.lat);
  t('un centro salvato malformato non passa', !!api.inquadraturaSicura({ centro: { lat: 'x', lng: null } }, BRINDISI, L, H).centro);

  console.log('  · ed e usata DOVUNQUE si decida un inquadramento, non solo nella stampa');
  t('nell export', /mappa = inquadraturaSicura\(mappa, puntiBlocco/.test(src));
  t('e nel compositore, o l anteprima mentirebbe', /mappa = inquadraturaSicura\(mappa, puntiPerRiquadro/.test(src));
  t('lo zoom ricalcolato vince su quello salvato, in entrambi',
     (src.match(/ricalcolata\)? \? mappa\.zoom/g) || []).length >= 2);
}

console.log('--- Le etichette dicono un MODO, non un testo ---');
{
  const dati = { comune: 'Brindisi', localita: 'Contrada Restinco' };
  t('comune si rilegge dal cantiere', api.testoEtichettaAutomatica('comune', 'ROMA', dati) === 'Brindisi');
  t('localita idem', api.testoEtichettaAutomatica('localita', 'ROMA', dati) === 'Contrada Restinco');
  t('solo "testo mio" e testo vero', api.testoEtichettaAutomatica('custom', 'Lotto B', dati) === 'Lotto B');
  t('nessuna vuol dire vuota', api.testoEtichettaAutomatica('none', 'ROMA', dati) === '');
  t('e un cantiere senza comune non stampa "undefined"', api.testoEtichettaAutomatica('comune', '', {}) === '');

  t('l inset ha il suo modo, e per difetto e automatico',
     /etichettaModo: \(b\.mappaInset && b\.mappaInset\.etichettaComune === false\) \? 'none' : 'comune'/.test(src));
  t('IL VALORE SI IMPONE DOPO l Object.assign, o un etichetta vuota zittirebbe quella automatica',
     /Object\.assign\(\s*Object\.assign\(\{ attivo: false[\s\S]{0,400}\{ etichetta: testoEtichettaAutomatica\(/.test(src));
  t('e il compositore lo espone', /selComposizioneInsetEtichettaModo/.test(src));
  t('riusando la stessa funzione della stampa, non una copia',
     /return testoEtichettaAutomatica\(imp\.etichettaModo/.test(src)
     && /return testoEtichettaAutomatica\(i\.etichettaModo \|\| 'comune'/.test(src));
}

console.log('--- La stampa aspetta le mappe, e lo verifica ---');
{
  t('c e un velo di caricamento, escluso dalla stampa', /velo\.className = 'no-print'/.test(src));
  t('con una barra di avanzamento vera', /dpshBarraMappe/.test(src) && /dpshStatoMappe/.test(src));
  t('NON si fida di "complete": un immagine fallita e complete anche lei',
     /img\.complete && img\.naturalWidth > 0/.test(src));
  t('conta le tessere del riquadro grande E di quello regionale',
     /\[data-mappa-inquadramento\] img, \[data-inset-regionale\] img/.test(src));
  t('ha un tetto d attesa, o una rete morta bloccherebbe per sempre', /LIMITE_MS = \d+;/.test(codice));
  t('e se qualcosa manca lo DICE, invece di stampare un riquadro vuoto in silenzio',
     /riquadr' \+ \(mancanti === 1/.test(src));
  // La stampa continua a partire solo a fine attesa, ma non parte piu' DA QUI: il documento
  // vive in un iframe invisibile, quindi l'esito viaggia al padre — che ha uno schermo — e la
  // stampa la comanda lui. Vedi export_stampa.js, dove la stessa cosa si misura sul vivo.
  t('la stampa parte solo dopo l attesa, mai prima',
     src.indexOf('function avvia()') < src.indexOf("window.addEventListener('load', avvia)")
     && /aspettaMappe\(function\(mancanti, totali\)\{[\s\S]{0,900}riferisciAlPadre\('Pronta'/.test(src));
}

console.log('--- Il compositore sta SOPRA l editor che lo apre ---');
{
  t('non e piu a livello 301, sotto l editor (321) e il suo menu (330)',
     /<div class="modal tier-editor-top" id="modalComposizioneMappa"/.test(src));
  t('e anche il suo velo di fondo', /<div class="modal-overlay tier-editor-top" id="modalComposizioneMappaOverlay">/.test(src));
  t('tier-editor-top vale 341, sopra tutto quello che puo aprirlo',
     /\.modal\.tier-editor-top \{ z-index: 341; \}/.test(src));
}

console.log('--- Il compositore riordinato, e i comandi che mancavano ---');
{
  const iJs = src.indexOf('// LA SCHERMATA DI COMPOSIZIONE');
  const fJs = src.indexOf('// RITAGLIO DELLE IMMAGINI', iJs);
  const js = src.slice(iJs, fJs);

  console.log('  · le schede');
  const schede = [...src.matchAll(/data-comp-scheda="([a-z]+)"/g)].map(m => m[1]);
  t('sette schede, una per domanda', new Set(schede).size === 7);
  t('e altrettanti pannelli, uno per scheda',
     new Set([...src.matchAll(/data-comp-pannello="([a-z]+)"/g)].map(m => m[1])).size === 7);
  t('mostrarne una nasconde tutte le altre',
     /p\.style\.display = \(p\.dataset\.compPannello === nome\) \? 'flex' : 'none'/.test(js));
  t('e all apertura si parte sempre dalla prima', /__mostraSchedaComposizione\('mappa'\)/.test(js));

  console.log('  · le misure che prima non esistevano');
  [['etichetta del riquadro regionale', 'rngComposizioneInsetEtichettaMisura', 'mappaInset.etichettaMisura'],
   ['freccia del nord', 'rngComposizioneNordMisura', 'mappaNord.scala'],
   ['riquadro della barra di scala', 'rngComposizioneScalaRiquadro', 'mappaScala.scalaRiquadro'],
   ['numeri della barra di scala', 'rngComposizioneScalaTesto', 'mappaScala.misuraScala'],
   ['etichette DPSH', 'rngComposizioneMisuraPin', 'misuraEtichettaPin']
  ].forEach(([nome, id, campo]) => {
    t('misura regolabile: ' + nome, src.includes('id="' + id + '"') && js.includes(campo));
  });
  t('e le misure si salvano nel blocco, o si perdono chiudendo',
     /blk\.mappaMisuraEtichettaPin = imp\.misuraEtichettaPin/.test(js)
     && /blk\.mappaNord = imp\.mappaNord/.test(js) && /blk\.mappaScala = imp\.mappaScala/.test(js));

  console.log('  · il formato: si ritaglia, non si deforma');
  t('cinque ratei pronti', [...src.matchAll(/data-comp-rateo="/g)].length === 5);
  t('piu i due cursori in millimetri',
     src.includes('id="rngComposizioneLarghezza"') && src.includes('id="rngComposizioneAltezza"'));
  t('IL RATEO CAMBIA L ALTEZZA, non uno stiramento dell immagine',
     /composizione\.imp\.altezzaMm = Math\.round\(Math\.max\(30, Math\.min\(230, composizione\.imp\.larghezzaMm \/ r\)\)\)/.test(js));
  t('e dopo il ritaglio si ripassa da inquadraturaSicura, o una prova potrebbe restare fuori',
     /function riadattaDopoFormato\(\)[\s\S]{0,500}inquadraturaSicura\(/.test(js));
  t('il ritaglio vale anche per il riquadro regionale', /data-comp-inset-rateo/.test(src));
  t('e li il rateo si calcola sui lati VERI, non sulle sole percentuali',
     /\(percL \* imp\.larghezzaMm\) \/ \(r \* imp\.altezzaMm\)/.test(js));
  t('la misura del blocco si salva', /blk\.mappaLarghezzaMm = imp\.larghezzaMm/.test(js));

  console.log('  · la basemap del riquadro regionale');
  t('l inset riceve le opzioni della mappa grande',
     /htmlInsetRegionaleMappa\(o\.inset, centro, zoom, larghezzaPx, altezzaPx, larghezzaMm, altezzaMm, o\)/.test(src));
  t('E LA EREDITA, invece di ripiegare sempre sul satellite Esri',
     /const chiaveProvider = i\.provider \|\| p\.provider \|\| 'esri-satellite'/.test(src));
  t('e sa disegnare anche un WMS, non solo le tessere',
     /if \(provider\.tipo === 'wms'\)[\s\S]{0,700}request=GetMap/.test(src.slice(src.indexOf('function htmlInsetRegionaleMappa'))));

  console.log('  · i servizi WMS pronti');
  t('c e un elenco di servizi noti', /const WMS_PRONTI = \[/.test(src));
  t('con almeno cinque voci', (src.match(/nome: 'Ortofoto|nome: 'Carta topografica/g) || []).length >= 5);
  t('ognuno con indirizzo, layer e fonte da citare',
     /url: 'http[^']+',\s*\n\s*layer: '[^']*', attribuzione: '[^']+'/.test(src));
  t('si aggiungono i propri, e finiscono nelle impostazioni (quindi nel backup)',
     /state\.settings\.wmsPersonalizzati\.push\(/.test(js) && /function wmsDisponibili\(\)/.test(src));
  t('e si possono togliere', /data-comp-wms-elimina/.test(js));
  t('premerne uno compila indirizzo, layer E attribuzione insieme',
     /composizione\.imp\.attribuzione = v\.attribuzione \|\| ''/.test(js));
  t('e le basemap a tessere sono passate da due a cinque',
     ['esri-satellite', 'osm', 'esri-topo', 'esri-strade', 'opentopo'].every(k => src.includes("'" + k + "': {")));
}

console.log('--- LA STAMPA NON PUO PIU ESSERE BLOCCATA DA UN DIALOGO ---');
{
  // Segnalato: "quando esporto il pdf non compare piu' la finestra per salvare il documento".
  // Il documento da stampare vive in un window.open(), e li' confirm() puo' tornare false da
  // solo (WebView di Android): scattava il ramo "l'utente ha detto no" e la stampa spariva.
  // Il difetto non era il messaggio, era averlo messo SULLA STRADA della stampa.
  const stampa = codice.slice(codice.indexOf('const autoPrintJs ='), codice.indexOf('function buildIndiceReportCompletoHtml'));
  t('trovo lo script iniettato nel documento da stampare', stampa.length > 2000);
  t('NESSUN confirm() sulla strada della stampa', !/window\.confirm\(/.test(stampa));
  // L'avviso di sforamento non e' piu' un ramo morto (`void messaggioBlocco`) dentro un
  // documento invisibile: viaggia al padre insieme all'esito delle mappe, e li' diventa un
  // dialogo che l'utente vede. Era stato scritto per «niente sorprese» e per due versioni
  // non l'ha visto nessuno.
  t('l avviso di sforamento arriva al padre, che lo mostra davvero',
     /eccedenti: ecc/.test(stampa)
     && /banner\.className = 'no-print'/.test(src)
     && /Contenuto fuori dal foglio/.test(codice));
  t('la scelta sulle mappe mancanti sta su pulsanti veri, dentro la pagina',
     /bStampa\.onclick = function\(\)\{ togliVelo\(\); procedi\(\); \}/.test(stampa));
  t('e da li si puo anche riprovare a scaricarle, invece di dover rifare tutto',
     /function ricarica\(\)/.test(stampa) && /img\.src = ''; img\.src = u;/.test(stampa));
  t('l attesa e scesa a 20 secondi: oltre, aspettare non aiuta piu',
     /var LIMITE_MS = 20000;/.test(stampa));
  t('e il pulsante giallo di stampa manuale resta comunque nella pagina',
     /Stampa \/ Salva in PDF/.test(src));
}

console.log('--- Le regolazioni chieste ora: nord, scala, formato, inset ---');
{
  const iJs = src.indexOf('// LA SCHERMATA DI COMPOSIZIONE');
  const js = src.slice(iJs, src.indexOf('// RITAGLIO DELLE IMMAGINI', iJs));

  console.log('  · il nord nei due versi');
  t('lo stile decide riempimento E contorno insieme',
     /const riempimento = scuro \? '#0f172a' : '#fff';/.test(src) && /const contorno = scuro \? '#fff' : '#0f172a';/.test(src));
  t('e si vede da fuori quale dei due e in uso', /data-nord-stile="\$\{scuro \? 'scuro' : 'chiaro'\}"/.test(src));
  t('con i due tasti nel compositore', (src.match(/data-comp-nord-stile="/g) || []).length === 2);

  console.log('  · la barra di scala');
  t('tre sfondi: chiaro, scuro, nessuno', (src.match(/data-comp-scala-sfondo="/g) || []).length === 3);
  t('senza sfondo il testo si contorna col colore opposto',
     /const ombraTesto = senzaSfondo/.test(src));
  t('e la barra ha una traccia che la stacca dall immagine',
     /outline:\$\{\(0\.8 \* scalaRiquadro\)/.test(src));
  t('la lunghezza si regola', src.includes('id="rngComposizioneScalaLunghezza"') && /mappaScala\.lunghezza/.test(js));
  t('MA RESTA SU PASSI TONDI: si sceglie il passo piu vicino, non si stira la barra',
     /const frazioneVoluta = Math\.max\(0\.12, Math\.min\(0\.60, o\.lunghezza \|\| 0\.25\)\)/.test(src)
     && /Math\.abs\(mm - larghezzaMm \* frazioneVoluta\)/.test(src));

  console.log('  · il formato in tempo reale');
  t('si ridisegna sull evento input, non solo al rilascio',
     /r\.addEventListener\('input', \(\) => \{[\s\S]{0,320}ridisegnaSubito\(\)/.test(js));
  t('ma raggruppando i fotogrammi, o sarebbe un ridisegno per ogni evento',
     /requestAnimationFrame\(\(\) => \{ attesaFotogramma = null; disegnaComposizione\(\); \}\)/.test(js));
  t('e la reinquadratura di sicurezza, piu costosa, si fa una volta a fine gesto',
     /r\.addEventListener\('change', \(\) => \{ if \(composizione\) riadattaDopoFormato\(\); \}\)/.test(js));

  console.log('  · la mappa dentro il riquadro regionale');
  t('si sceglie esplicitamente cosa muove il dito', (src.match(/data-comp-inset-trascina="/g) || []).length === 2);
  t('e per difetto resta il comportamento di prima', /trascina: 'riquadro' \}/.test(js));
  t('IL CENTRO DELL INSET E SUO, indipendente da quello della mappa grande',
     /ins\.centro = \{ lat: latDaTessereY\(cy, zIns\), lng: lngDaTessereX\(cx, zIns\) \}/.test(js));
  t('e si muove allo zoom DEL RIQUADRO, o non seguirebbe il dito',
     /const zIns = Math\.round\(\(ins\.zoom != null\) \? ins\.zoom : Math\.max\(1, Math\.round\(imp\.zoom\) - 5\)\)/.test(js));
  t('l inset lo sa gia leggere, il suo centro', /const centro = \(i\.centro && isFinite\(parseFloat\(i\.centro\.lat\)\)\) \? i\.centro : centroDettaglio;/.test(src));
}

console.log('--- La barra del compositore: allineata e compatta ---');
{
  // Segnalato con uno screenshot: "Etichetta ... Misura" e "Trascinando muovi ..." spinti
  // contro il bordo destro. Una riga sola di CSS: .note-tb-status nasce nell'editor delle
  // note come STATO di fine barra, con margin-left:auto. Nel compositore la stessa classe
  // fa da ETICHETTA davanti a un comando, e quel margin-left:auto spingeva l'etichetta e
  // tutto cio' che la segue a destra. Riusare una classe per un ruolo diverso costa sempre.
  t('la classe nasce davvero con margin-left:auto (la causa)',
     /\.note-tb-status\{margin-left:auto;/.test(src));
  t('E NEL COMPOSITORE E ANNULLATA', /#composizioneBarra \.note-tb-status \{ margin-left: 0; \}/.test(src));
  t('anche per lo stato in fondo, che invece una riga sua ce l ha',
     /#lblComposizioneStato \{ margin-left: 0; \}/.test(src));

  console.log('  · e nessun gruppo si prende piu una riga intera per se');
  t('via i gruppi a tutta larghezza', !/note-tb-group" style="(width|flex-basis):100%/.test(src));
  t('via anche il riquadro annidato del regionale, che sprecava larghezza',
     !/id="composizioneGruppoInset"/.test(src));

  console.log('  · compattezza');
  t('comandi piu bassi dentro il compositore (26px contro i 30 delle note)',
     /#composizioneBarra \.note-tb-btn \{ height: 26px;/.test(src));
  t('ma non sotto il dito su mobile, dove tornano a 30',
     /@media \(max-width: 640px\) \{[\s\S]{0,200}#composizioneBarra \.note-tb-btn \{ height: 30px;/.test(src));
  t('le note esplicative hanno una classe loro, piccola',
     /#composizioneBarra \.comp-nota \{ font-size: 9\.5px;/.test(src));
  t('e sono davvero usate, invece di stili ripetuti a mano',
     (src.match(/class="comp-nota"/g) || []).length >= 6);
  t('nessuna nota lunga e rimasta con lo stile scritto in linea',
     !/font-size:10px; color:var\(--text-muted\); width:100%/.test(src));
  t('i cursori sono piu corti di prima', !/id="rngComposizione[A-Za-z]+"[^>]*style="width:1[0-9][0-9]px/.test(src));
}

console.log('--- Il freeze sui colori: la causa, e la difesa perche non torni ---');
{
  const iJs = src.indexOf('// LA SCHERMATA DI COMPOSIZIONE');
  const js = src.slice(iJs, src.indexOf('// RITAGLIO DELLE IMMAGINI', iJs));
  const iBarra = js.indexOf('function aggiornaBarraComposizione() {');
  const fBarra = js.indexOf('function apriComposizioneMappa', iBarra);
  const barra = js.slice(iBarra, fBarra);
  t('trovo la funzione che gira ad ogni ridisegno', barra.length > 3000);

  // LA CAUSA VERA. Non era il colore: era che questa funzione cercava i suoi 25 elementi e
  // le sue 11 liste NELL'INTERO DOCUMENTO, ad ogni ridisegno, su un'app da 2,8 MB con
  // l'editor del template aperto. Misurato prima e dopo: 21 secondi contro 0,4.
  t('ZERO ricerche sull intero documento nel percorso del ridisegno',
     !/document\.getElementById/.test(barra) && !/document\.querySelectorAll/.test(barra));
  t('le referenze si risolvono una volta e restano', /const cacheRifBarra = new Map\(\);/.test(js));
  t('e le liste si cercano DENTRO la barra, non nel documento',
     /const dentro = document\.getElementById\('composizioneBarra'\);[\s\S]{0,160}dentro\.querySelectorAll\(selettore\)/.test(js));

  console.log('  · e i decori si aggiornano da soli, senza rifare il mosaico');
  t('c e uno scambio chirurgico dell elemento', /function scambiaElementoComposizione\(/.test(js));

  // LA DIAGNOSI SBAGLIATA, E LA DIFESA CONTRO IL RIPETERLA.
  // La prima misura l'avevo fatta in un DOM finto: aveva trovato un costo vero (le ricerche
  // sull'intero documento) e mi aveva convinto che fosse LA causa. Sul telefono non e'
  // cambiato niente. Un ambiente di prova ha colli di bottiglia suoi, che non sono quelli
  // veri. Quindi ora la misura la fa l'app, sul dispositivo vero.
  t('l app si cronometra da sola', /function misura\(nome, fn\)/.test(js));
  t('usando l orologio ad alta risoluzione dove c e', /performance\.now\(\)/.test(js));
  t('e riporta il dettaglio per tappe, non un totale muto', /tappeMisura\.join\(' · '\)/.test(js));
  t('ma SOLO sopra i 150 ms: non e un pannello di debug, e un termometro', /totale > 150/.test(js));
  t('e si spegne quando torna la normalita', /riga\.style\.color = '';/.test(js));
  t('il ridisegno intero e diviso in tappe, per sapere dove va il tempo',
     /misura\('dom', \(\) => \{/.test(js) && /misura\('barra', aggiornaBarraComposizione\)/.test(js));

  console.log('  · e i comandi di solo aspetto non risincronizzano piu tutta la barra');
  t('il nord accende solo i suoi due pulsanti',
     /rifTutti\('\[data-comp-nord-stile\]'\)\.forEach/.test(js));
  t('la scala solo i suoi tre', /rifTutti\('\[data-comp-scala-sfondo\]'\)\.forEach/.test(js));
  t('nessuno dei due chiama piu il sync completo',
     !/scambiaElementoComposizione\('\[data-elemento-mappa="nord"\]'[\s\S]{0,400}aggiornaBarraComposizione\(\);/.test(js));
  t('il nord si aggiorna da solo', /function aggiornaNordComposizione\(\)/.test(js));
  t('la scala pure', /function aggiornaScalaComposizione\(\)/.test(js));
  t('rigenerandoli con LE STESSE funzioni della stampa, non con copie',
     /htmlNordMappa\(imp\.mappaNord\)/.test(js)
     && /htmlBarraScalaMappa\(imp\.centro, zoomVero, Math\.round\(imp\.larghezzaMm \* PX_PER_MM\), imp\.larghezzaMm, imp\.mappaScala\)/.test(js));
  t('e con gli stessi arrotondamenti, o la barra di scala direbbe due numeri diversi',
     /const zoomVero = Math\.max\(1, Math\.min\(provider\.zoomMax \|\| 19, Math\.round\(imp\.zoom \|\| 16\)\)\)/.test(js));
  t('se il pezzo non c e si ricade sul ridisegno intero, che resta sempre valido',
     (js.match(/disegnaComposizione\(\);\s*\n\s*return;/g) || []).length >= 2);
  t('nessuno dei comandi di solo aspetto rifa piu la tavola',
     !/mappaNord\.stile = b\.dataset\.compNordStile;\s*\n\s*disegnaComposizione/.test(js)
     && !/mappaScala\.sfondo = b\.dataset\.compScalaSfondo;\s*\n\s*disegnaComposizione/.test(js)
     && !/mappaScala\.lunghezza = [^\n]*\n\s*disegnaComposizione/.test(js));
}

console.log('--- L ordine mentale della barra: due linguaggi, una riga per oggetto ---');
{
  const iHtml = src.indexOf('id="composizioneSchede"');
  const html = src.slice(iHtml, src.indexOf('id="lblComposizioneStato"'));

  console.log('  · un interruttore e una scelta non si assomigliano piu');
  // Prima erano identici: bordo arancione per entrambi. Guardando "Nord | nera" non si
  // capiva quale fosse un acceso/spento e quale una scelta fra alternative.
  t('l interruttore ha una classe sua', /#composizioneBarra \.comp-sw \{/.test(src));
  t('ed e PIENO quando e acceso', /\.comp-sw\.is-active \{ background: var\(--accent\); border-color: var\(--accent\); color: var\(--on-accent\); \}/.test(src));
  t('la scelta ha un fondo incassato', /\.comp-seg \{[^}]*background: var\(--bg-sunken\)/.test(src));
  t('e l opzione scelta e una pastiglia in rilievo, non un pieno',
     /\.comp-seg \.note-tb-btn\.is-active \{ background: var\(--bg-card\)/.test(src));
  t('i due aspetti sono davvero diversi',
     !/\.comp-seg \.note-tb-btn\.is-active \{ background: var\(--accent\)/.test(src));

  console.log('  · ogni acceso/spento e un interruttore, ogni scelta e un segmento');
  const interruttori = [...html.matchAll(/data-comp-toggle="(\w+)"/g)].map(m => m[0]);
  t('ci sono cinque acceso/spento', interruttori.length === 5);
  t('e portano TUTTI la classe interruttore',
     interruttori.every(a => new RegExp('class="note-tb-btn comp-sw" ' + a).test(html)));
  t('anche il rettangolo rosso, che e un acceso/spento pure lui',
     /class="note-tb-btn comp-sw" id="btnComposizioneInsetRiquadro"/.test(html));
  ['data-comp-toponimi', 'data-comp-rateo', 'data-comp-nord-stile', 'data-comp-scala-sfondo',
   'data-comp-inset-rateo', 'data-comp-inset-trascina', 'data-comp-zoom', 'data-comp-inset-zoom'
  ].forEach(a => {
    // Ogni gruppo di alternative dev'essere dentro un .comp-seg: si prende il testo che
    // precede il primo pulsante del gruppo e si guarda che il contenitore ci sia.
    const i2 = html.indexOf(a + '=');
    const prima = html.slice(Math.max(0, i2 - 260), i2);
    t('gruppo di alternative dentro un segmento: ' + a, prima.lastIndexOf('comp-seg') > prima.lastIndexOf('</span>'));
  });

  console.log('  · una riga per oggetto, col suo nome davanti');
  t('le righe hanno una classe loro', /#composizioneBarra \.comp-riga \{/.test(src));
  t('separate da un filo, cosi si vedono come righe', /\.comp-riga \+ \.comp-riga \{ border-top/.test(src));
  t('e ognuna comincia col nome dell oggetto', (html.match(/class="comp-oggetto"/g) || []).length >= 10);
  t('i nomi sono allineati fra loro', /\.comp-oggetto \{[^}]*min-width: 74px/.test(src));

  // LA PROVA CHE CONTA: tutto cio' che riguarda la freccia del nord sta in UNA riga, e
  // altrettanto per la barra di scala. Prima le proprieta' del nord erano sparse su tre
  // gruppi mescolate a quelle della scala, e l'occhio doveva ricomporle da solo.
  const decori = html.slice(html.indexOf('data-comp-pannello="decori"'));
  const righeDecori = decori.split('class="comp-riga"');
  const rigaNord = righeDecori[1] || '', rigaScala = righeDecori[2] || '';
  t('TUTTO IL NORD IN UNA RIGA SOLA',
     /mappaMostraNord/.test(rigaNord) && /rngComposizioneNordMisura/.test(rigaNord) && /data-comp-nord-stile/.test(rigaNord));
  t('e niente della scala dentro quella riga',
     !/mappaMostraScala|ScalaRiquadro|ScalaTesto|scala-sfondo/.test(rigaNord));
  t('TUTTA LA SCALA NELLA SUA',
     /mappaMostraScala/.test(rigaScala) && /rngComposizioneScalaLunghezza/.test(rigaScala)
     && /rngComposizioneScalaRiquadro/.test(rigaScala) && /rngComposizioneScalaTesto/.test(rigaScala)
     && /data-comp-scala-sfondo/.test(rigaScala));

  console.log('  · e la scheda scelta e piu evidente del semplice passaggio del mouse');
  t('lo stato attivo della scheda e pieno',
     /#composizioneSchede \.note-tb-btn\.is-active \{ background: var\(--accent\)/.test(src));
  t('mentre il passaggio del mouse resta discreto',
     /#composizioneSchede \.note-tb-btn:hover \{ background: var\(--bg-sunken\)/.test(src));
  t('e la regola dell attivo viene DOPO quella del passaggio, o perderebbe',
     src.indexOf('#composizioneSchede .note-tb-btn:hover') < src.indexOf('#composizioneSchede .note-tb-btn.is-active'));
}

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
