// IMPORT MALEVOLO (Revisione 2026-11, O1 sezione 1: A1, A4, A5, A6, C4).
//
// Un file importato (progetto JSON, archivio litologico, pacchetto di progetto, KML) porta id, nomi,
// colori e orari scelti da chi lo ha scritto. Qui si importa un file pieno di `<img onerror>` e di
// virgolette che chiudono gli attributi, con le funzioni vere dell'app, e si guardano le schermate
// che li mostrano: Home, prova (legenda del grafico), gestione strati, archivio litologico, galleria
// foto, confronto prove, elenco punti KML. Nessun elemento con onerror/onmouseover deve arrivare nel
// DOM e window.__xss deve restare indefinito. I dati onesti si importano come prima.
const { avviaApp } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };

const IMG = '<img src=x onerror="window.__xss=1">';
const CHIUDI = 'x"><img src=x onerror="window.__xss=1">';
const COLORE_MALEVOLO = '#fff" onmouseover="window.__xss=1" x="';
const PNG_OK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/** Quanti elementi con un gestore di eventi in linea ci sono nel documento. */
const SEL = '[onerror],[onmouseover],[onload]';
// Senza ambito guarda tutto il documento; con degli id guarda solo dentro quei contenitori (il grafico SVG
// della prova, in 020, ha altri punti ancora da chiudere fuori da questo lavoro: vedi il resoconto).
const pericolosi = (app, ...ids) => {
  const r = ids.length ? ids.flatMap(id => [...app.d.querySelectorAll('#' + id + ' ' + SEL.split(',').join(', #' + id + ' '))]) : [...app.d.querySelectorAll(SEL)];
  if (r.length && process.env.DEBUG_XSS) console.log('      ->', r.slice(0, 2).map(e => e.parentElement.outerHTML.slice(0, 250)));
  return r.length;
};
const xss = (app) => app.w.__xss;

const prova = (id, nr, strati, foto) => ({
  id,
  header: { provaNr: nr, comune: 'Nardo', lat: '', lng: '' },
  instrument: {}, settings: { stepCm: 20 },
  currentCount: 0, currentDepthStart: 0.2, currentRod: 1,
  logs: [{ start: 0, end: 0.2, colpi: 5, asta: 1, lithology: 's1' }, { start: 0.2, end: 0.4, colpi: 7, asta: 1, lithology: 's1' }],
  strati, photos: foto || []
});
const strato = (nome, colore) => ({ id: 's1', name: nome, color: colore, pattern: 'none', behavior: 'granulare' });

(async () => {
  const app = await avviaApp({ stato: null });
  const E = (s) => app.E(s);

  console.log('--- Un file con id, nomi, colori e orari malevoli ---');
  const file = {
    versioneSchema: E('VERSIONE_SCHEMA_DATI'),
    projects: {
      [CHIUDI]: {
        id: CHIUDI, name: IMG, comune: IMG, committente: 'Rossi', updatedAt: 1,
        strati: [strato(IMG, COLORE_MALEVOLO)],
        surveys: {
          [CHIUDI + '1']: prova(CHIUDI + '1', '1', [strato(IMG, COLORE_MALEVOLO)], [
            { id: CHIUDI, dataUrl: PNG_OK, timestamp: 'x', lat: null, lng: null },
            { id: 'foto_ok', dataUrl: PNG_OK, timestamp: IMG, lat: null, lng: null },
            { id: 'foto_html', dataUrl: 'data:text/html;base64,PHNjcmlwdD4=', timestamp: 'y', lat: null, lng: null }
          ]),
          'SURV_buona': prova('SURV_buona', '2', [strato('Sabbia', '#c2b280')])
        }
      },
      'proj_onesto': { id: 'proj_onesto', name: 'Scuola Via Roma', comune: 'Lecce', updatedAt: 2,
        strati: [strato('Sabbia fine', '#c2b280')],
        surveys: { SURV_1: prova('SURV_1', '1', [strato('Sabbia fine', '#c2b280')], [{ id: 'foto_1', dataUrl: PNG_OK, timestamp: '12/11/2026 10:00', lat: null, lng: null }]) } }
    },
    lithologyArchive: {
      [CHIUDI]: { id: CHIUDI, name: IMG, color: COLORE_MALEVOLO, pattern: 'none', behavior: 'granulare' },
      arch_onesta: { id: 'arch_onesta', name: 'Ghiaia', color: '#a0a0a0', pattern: 'none', behavior: 'granulare' }
    }
  };
  // '__proto__' come chiave propria (un letterale oggetto la prenderebbe per il prototipo): solo JSON.parse la crea.
  Object.defineProperty(file.projects, '__proto__', { enumerable: true, configurable: true, writable: true,
    value: { id: '__proto__', name: 'Proto', surveys: { SURV_p: prova('SURV_p', '1', [strato('Argilla', '#888888')]) } } });
  const testo = JSON.stringify(file);
  const esito = E('importProjectsFromJSON(JSON.parse(' + JSON.stringify(testo) + '))');
  console.log(esito.importedCount, JSON.stringify(Object.keys(JSON.parse(E('JSON.stringify(state.projects)')))));
  t('l import finisce e conta i tre progetti', esito.importedCount === 3);
  const chiavi = Object.keys(JSON.parse(E('JSON.stringify(state.projects)')));
  t('tutte le chiavi dei progetti hanno la forma ammessa', chiavi.length === 3 && chiavi.every(k => E('idSicuro(' + JSON.stringify(k) + ')')));
  t('il progetto onesto ha ancora il suo id', chiavi.includes('proj_onesto'));
  t('nessun progetto ha preso __proto__ come id', !chiavi.includes('__proto__') && Object.getPrototypeOf(E('state.projects')) === E('Object.prototype'));
  const P = JSON.parse(E('JSON.stringify(state.projects)'));
  t('anche proj.id e id delle prove sono ammessi, uguali alla chiave della prova', Object.keys(P).every(k => E('idSicuro(' + JSON.stringify(P[k].id) + ')') &&
    Object.keys(P[k].surveys).every(s => P[k].surveys[s].id === s && E('idSicuro(' + JSON.stringify(s) + ')'))));
  const malevolo = Object.values(P).find(p => p.name === IMG);
  const sidBuona = Object.keys(malevolo.surveys).find(s => malevolo.surveys[s].header.provaNr === '2');
  t('la prova con id valido lo tiene', sidBuona === 'SURV_buona');
  t('la prova con id malevolo c e ancora, con id nuovo', Object.keys(malevolo.surveys).length === 2);
  const provaMal = Object.values(malevolo.surveys).find(s => s.header.provaNr === '1');
  t('foto: quella con id malevolo e scartata, le altre restano', provaMal.photos.map(f => f.id).join() === 'foto_ok,foto_html');
  t('foto: il dataUrl che non e un immagine e tolto, quello vero resta', provaMal.photos[0].dataUrl === PNG_OK && provaMal.photos[1].dataUrl === undefined);
  t('i colori degli strati sono ripiegati su un colore ammesso', E('JSON.stringify(state.projects)').indexOf('onmouseover') < 0);
  t('il progetto onesto e identico a prima (nome, strati, foto)', P.proj_onesto.name === 'Scuola Via Roma' && P.proj_onesto.strati[0].color === '#c2b280'
    && P.proj_onesto.surveys.SURV_1.photos[0].id === 'foto_1' && P.proj_onesto.surveys.SURV_1.photos[0].timestamp === '12/11/2026 10:00');
  t('il messaggio dice che qualcosa e stato scartato', esito.scartati && esito.scartati.fotoScartate === 1 && esito.scartati.immaginiScartate === 1);

  console.log('--- Home ---');
  E('renderHomeProjects()');
  t('Home: nessun gestore di eventi in linea', pericolosi(app) === 0);
  t('Home: nessun <img> nei nomi delle card', app.d.querySelectorAll('#homeProjectsContainer img, .card-progetto img').length === 0);
  t('Home: il nome malevolo si legge come testo', app.d.body.textContent.indexOf(IMG) >= 0);
  t('Home: la card onesta c e', app.d.querySelectorAll('[data-id="proj_onesto"]').length >= 1);

  console.log('--- Prova: legenda, gestione strati, galleria foto, schermata progetto ---');
  const pidMal = Object.keys(P).find(k => P[k].name === IMG);
  E('openProject(' + JSON.stringify(pidMal) + ')');
  await app.attesa(100);
  E('renderChart()');
  t('Prova: la legenda mostra il nome come testo', (app.d.getElementById('chartLegendContainer') || { textContent: '' }).textContent.indexOf(IMG) >= 0);
  E('renderStratiList()');
  E('renderSchermataProgetto()');
  await E('renderPhotoGallery()');
  t('Prova: nessun gestore in linea dopo legenda, strati, schermata progetto e galleria', pericolosi(app, 'chartLegendContainer', 'stratiListContainer', 'listaProveProgetto') === 0);
  t('Prova: window.__xss non e definito', xss(app) === undefined);

  console.log('--- Archivio litologico (da un file di solo archivio) ---');
  const chiaviArch = Object.keys(JSON.parse(E('JSON.stringify(state.lithologyArchive)')));
  t('importato col file del progetto: chiavi ammesse e voce onesta intatta', chiaviArch.every(k => E('idSicuro(' + JSON.stringify(k) + ')')));
  const r2 = E('mergeLithologyArchiveInto(JSON.parse(' + JSON.stringify(JSON.stringify(file.lithologyArchive)) + '))');
  t('merge: le voci entrano (anche quella con id malevolo, rinominata)', r2.imported === 2);
  const arch = JSON.parse(E('JSON.stringify(state.lithologyArchive)'));
  t('merge: nessuna chiave malevola, nessun colore malevolo', Object.keys(arch).every(k => E('idSicuro(' + JSON.stringify(k) + ')')) && JSON.stringify(arch).indexOf('onmouseover') < 0);
  t('merge: la voce onesta ha nome e colore di prima', Object.values(arch).some(v => v.name === 'Ghiaia' && v.color === '#a0a0a0'));
  E('renderArchiveManagerList()');
  E('renderArchivePickerList()');
  t('Archivio: nessun gestore in linea in gestione e selettore', pericolosi(app, 'archiveManagerList', 'archivePickerList') === 0);
  t('Archivio: window.__xss non e definito', xss(app) === undefined);

  console.log('--- Escape all uscita, anche se i dati sono gia dentro (difesa in profondita) ---');
  // Dati scritti direttamente nello stato, come se arrivassero da un salvataggio vecchio.
  E(`(() => {
    state.lithologyArchive.zz = { id: 'zz', name: ${JSON.stringify(IMG)}, color: ${JSON.stringify(COLORE_MALEVOLO)}, pattern: 'none', behavior: 'granulare' };
    state.strati[0].name = ${JSON.stringify(IMG)};
    state.strati[0].color = ${JSON.stringify(COLORE_MALEVOLO)};
  })()`);
  E('renderArchiveManagerList()'); E('renderArchivePickerList()'); E('renderStratiList()'); E('renderChart()');
  t('stato gia sporco: nessun gestore in linea (legenda, strati, archivio)', pericolosi(app, 'chartLegendContainer', 'stratiListContainer', 'archiveManagerList', 'archivePickerList') === 0);
  t('getPatternCss non lascia uscire un colore con virgolette', E(`getPatternCss('none', ${JSON.stringify(COLORE_MALEVOLO)})`).indexOf('onmouseover') < 0 && E(`getPatternCss('retino:' + RETINI_LITOLOGICI[0].id, ${JSON.stringify(COLORE_MALEVOLO)})`).indexOf('onmouseover') < 0);

  console.log('--- Galleria: timestamp e src malevoli gia nello stato ---');
  E(`state.photos = [{ id: ${JSON.stringify(CHIUDI)}, dataUrl: ${JSON.stringify('x" onerror="window.__xss=1" a="')}, timestamp: ${JSON.stringify(IMG)}, lat: null, lng: null }]`);
  await E('renderPhotoGallery()');
  t('Galleria: nessun gestore in linea e nessun <img> in piu del thumb', pericolosi(app, 'modalPhotoGalleryContainer') === 0);
  t('Galleria: la miniatura c e, ma senza src malevolo', app.d.querySelectorAll('#modalPhotoGalleryContainer .photo-thumb-img').length === 1 && !(app.d.querySelector('#modalPhotoGalleryContainer .photo-thumb-img').getAttribute('src') || '').includes('onerror'));
  t('Galleria: window.__xss non e definito', xss(app) === undefined);

  console.log('--- Confronto prove ---');
  E(`(() => { const pid = ${JSON.stringify(pidMal)}; confrontoStato.projId = pid; confrontoStato.attive = new Set(Object.keys(state.projects[pid].surveys)); })()`);
  // Un id gia sporco dentro il progetto (file vecchio salvato prima della correzione).
  E(`(() => { const pr = state.projects[${JSON.stringify(pidMal)}]; const sid = Object.keys(pr.surveys)[0]; pr.surveys[sid].id = ${JSON.stringify(CHIUDI)}; })()`);
  E(`confrontoStato.attive = new Set(Object.values(state.projects[${JSON.stringify(pidMal)}].surveys).map(s => s.id))`);
  try { E('renderConfrontoProve()'); } catch (e) { t('renderConfrontoProve non lancia: ' + e.message, false); }
  t('Confronto: i bottoni delle prove ci sono', app.d.querySelectorAll('#confrontoProve button').length >= 1);
  t('Confronto: nessun gestore in linea', pericolosi(app, 'confrontoProve', 'confrontoGrandezza') === 0);

  console.log('--- KML con punti e file dal nome malevolo ---');
  const kml = `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>
    <Placemark><name>&lt;img src=x onerror="window.__xss=1"&gt;</name><Point><coordinates>18.1,40.1,0</coordinates></Point></Placemark>
    <Placemark><name>Secondo</name><Point><coordinates>18.2,40.2,0</coordinates></Point></Placemark></Document></kml>`;
  const input = app.d.getElementById('fileImportGpsKml') || app.d.querySelector('input[type=file][accept*="kml"]');
  if (!input) t('trovato l input del KML', false);
  else {
    const f = new app.w.File([kml], 'a<img src=x onerror=window.__xss=1>.kml', { type: 'application/vnd.google-earth.kml+xml' });
    Object.defineProperty(input, 'files', { value: [f], configurable: true });
    input.dispatchEvent(new app.w.Event('change'));
    await app.attesa(300);
    t('KML: l elenco dei punti c e', app.d.querySelectorAll('.gps-kml-point-row').length === 2);
    t('KML: il nome del punto resta testo', app.d.querySelectorAll('.gps-kml-point-row img').length === 0 && pericolosi(app, 'gpsKmlImportResults') === 0);
    E(`applyGpsCoordsToModal(1, 2, 'Importato da ' + ${JSON.stringify('a<img src=x onerror=window.__xss=1>.kml')})`);
    t('KML: il nome del file nello stato GPS resta testo', pericolosi(app, 'lblModalGpsStatus') === 0 && app.d.querySelectorAll('#lblModalGpsStatus img').length === 0);
  }

  console.log('--- Pacchetto di progetto con id e prefisso malevoli ---');
  const { avviaApp: _a } = require('./dati/app_in_jsdom');
  const crypto = require('crypto');
  const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
  const tel = await avviaApp({ stato: null });
  const TE = (s) => tel.E(s);
  TE(`state.projects = { proj_p: { id: 'proj_p', name: 'Pacchetto', comune: 'X', updatedAt: 5, strati: [], surveys: { SURV_p1: ${JSON.stringify(prova('SURV_p1', '1', [strato('Sabbia', '#c2b280')], [{ id: 'foto_p', timestamp: 't', lat: null, lng: null }]))} } } }`);
  TE(`photoMemoryCache['foto_p'] = ${JSON.stringify(PNG_OK)}`);
  await TE(`salvaFotoConGaranzia('foto_p', ${JSON.stringify(PNG_OK)})`);
  const creato = await TE('creaPacchettoProgetto')('proj_p');
  const voci = await TE('readZipStoreOnly')(creato.blob);
  /** Rifà lo ZIP con il manifest e/o il progetto cambiati, rimettendo le impronte giuste: il file e integro, solo non e innocuo. */
  const rifai = async (cambia) => {
    const enc = new TextEncoder(), dec = new TextDecoder();
    const m = JSON.parse(dec.decode(voci.find(v => v.name === 'manifest.json').bytes));
    const mappa = new Map(voci.filter(v => v.name !== 'manifest.json').map(v => [v.name, JSON.parse(dec.decode(v.bytes).startsWith('{') || dec.decode(v.bytes).startsWith('[') ? dec.decode(v.bytes) : 'null')]));
    const grezzi = new Map(voci.filter(v => v.name !== 'manifest.json').map(v => [v.name, Buffer.from(v.bytes)]));
    cambia(m, mappa);
    mappa.forEach((val, nome) => { if (val !== null && ['progetto.json', 'librerie.json', 'registro.json'].includes(nome)) grezzi.set(nome, Buffer.from(enc.encode(JSON.stringify(val)))); });
    m.file.forEach(f => { const b = grezzi.get(f.percorso); if (b) { f.byte = b.length; f.sha256 = sha(b); } });
    const entries = [{ name: 'manifest.json', bytes: enc.encode(JSON.stringify(m)) }].concat([...grezzi].map(([name, b]) => ({ name, bytes: new Uint8Array(b) })));
    return new tel.w.File([TE('buildZipBlob')(entries)], 'x.dpsh.zip');
  };
  const buono = await TE('leggiPacchetto')(await rifai(() => {}));
  t('pacchetto di controllo (rifatto senza cambiare niente): si legge', buono.ok === true);
  const prefMal = await TE('leggiPacchetto')(await rifai((m) => { m.file.filter(f => f.archivio === 'photos').forEach(f => { f.prefisso = 'x" onerror="window.__xss=1" a="'; }); }));
  t('prefisso malevolo: il pacchetto e rifiutato, con un messaggio chiaro', prefMal.ok === false && prefMal.problemi.some(p => /non è un'immagine ammessa/.test(p)));
  const idMal = await TE('leggiPacchetto')(await rifai((m, mappa) => { mappa.get('progetto.json').id = CHIUDI; }));
  t('id di progetto malevolo: il pacchetto e rifiutato', idMal.ok === false && idMal.problemi.some(p => /id del progetto/.test(p)));
  const idProto = await TE('leggiPacchetto')(await rifai((m, mappa) => { mappa.get('progetto.json').id = '__proto__'; }));
  t('id di progetto __proto__: rifiutato', idProto.ok === false);
  const idProva = await TE('leggiPacchetto')(await rifai((m, mappa) => { const p = mappa.get('progetto.json'); p.surveys[CHIUDI] = p.surveys.SURV_p1; delete p.surveys.SURV_p1; }));
  t('id di prova malevolo: rifiutato', idProva.ok === false && idProva.problemi.some(p => /prova/.test(p)));

  console.log('--- Riepilogo ---');
  t('window.__xss non e mai stato definito (app principale)', xss(app) === undefined && tel.w.__xss === undefined);
  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi(); tel.chiudi();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
