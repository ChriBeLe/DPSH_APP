// LE FOTO NEI BACKUP JSON (trovato nella Fase 1, generando le fixture).
//
// I backup JSON (progetto e prova) uscivano SENZA NESSUNA FOTO: al posto di ogni immagine c'era il
// segnaposto usato per risparmiare memoria, che JSON.stringify aveva trasformato e che quindi non
// veniva più sostituito. Reimportando quel file, il segnaposto finiva in IndexedDB AL POSTO della
// foto vera con lo stesso id. Il «Backup completo» JSON, invece, esportava lo stato così com'era in
// memoria: dopo un riavvio, niente foto delle sessioni precedenti. E importandolo, le foto non
// venivano scritte in IndexedDB: sparivano al riavvio successivo.
//
// Qui: le foto escono nei file e rientrano identiche; un file vecchio senza foto non rovina le
// foto già sul telefono e lo si dice. Le controprove girano sul file di riferimento (l'app di prima).
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, RIFERIMENTO } = require('./dati/app_in_jsdom');
const { creaIndexedDB } = require('./dati/idb_finto');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const DATI = path.join(__dirname, 'dati');
const STATO_V0 = fs.readFileSync(path.join(DATI, 'stato_v0.json'), 'utf8');
const IDB_V0 = JSON.parse(fs.readFileSync(path.join(DATI, 'idb_v0.json'), 'utf8'));
const PROGETTO_V0 = fs.readFileSync(path.join(DATI, 'progetto_v0.json'), 'utf8');
// Un telefono in uso: lo stato salvato e le sue foto in IndexedDB.
const telefono = () => creaIndexedDB({ DPSH_PhotoStorageDB: IDB_V0.DPSH_PhotoStorageDB });
const fotoVere = new Map(IDB_V0.DPSH_PhotoStorageDB.stores.photos.map(r => [r.id, r.dataUrl]));
const immagineNota = IDB_V0.DPSH_PhotoStorageDB.stores.noteImages[0];
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
function fotoNelFile(testo) {
  const dati = JSON.parse(testo);
  const trovate = [];
  const cammina = (x) => {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x.photos)) x.photos.forEach(p => p && trovate.push(p));
    Object.values(x).forEach(cammina);
  };
  cammina(dati);
  return trovate;
}

(async () => {
  console.log('--- Il JSON del progetto contiene le foto ---');
  let fileProgetto, archivioConFoto;
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefono() });
    const pid = app.E('Object.keys(state.projects)[0]');
    await app.E('exportProjectJSON')(pid);
    await attesa(100);
    fileProgetto = await app.scaricati[app.scaricati.length - 1].blob.text();
    const foto = fotoNelFile(fileProgetto);
    t('è un JSON valido', !!foto);
    t('le 4 foto delle prove (3 e 3B condividono la stessa) ci sono, come immagini',
      foto.length === 4 && foto.every(p => typeof p.dataUrl === 'string' && p.dataUrl.startsWith('data:image/')));
    t('identiche a quelle in IndexedDB', foto.every(p => p.dataUrl === fotoVere.get(p.id)));
    t('nessun segnaposto rimasto nel file', !/@@DPSH_FOTO_|\\u0000/.test(fileProgetto));
    t('e l immagine della nota è incorporata', fileProgetto.includes(immagineNota.dataUrl.slice(0, 200)));
    t('nessun avviso di foto mancanti', !app.dialogo());
    app.chiudi();
  }

  console.log('--- Il JSON della prova (stato intero) e il Backup completo JSON ---');
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefono() });
    await app.E('exportSingleJSON()');
    await attesa(100);
    const prova = await app.scaricati[app.scaricati.length - 1].blob.text();
    const fotoProva = fotoNelFile(prova);
    t('JSON della prova: tutte le foto, come immagini vere', fotoProva.length === 4 && fotoProva.every(p => p.dataUrl === fotoVere.get(p.id)));
    // Il backup completo, dopo un riavvio: in memoria le foto non ci sono, vanno riprese da IndexedDB.
    t('(le foto non sono in memoria: l app è appena stata aperta)', app.E('Object.values(state.projects).every(p => Object.values(p.surveys).every(s => (s.photos || []).every(f => !f.dataUrl)))'));
    const esito = await app.E('exportGlobalJSONBackup()');
    await attesa(100);
    const archivio = await app.scaricati[app.scaricati.length - 1].blob.text();
    archivioConFoto = archivio;
    const fotoArchivio = fotoNelFile(archivio);
    t('Backup completo JSON: esce, con tutte le foto', esito === true && fotoArchivio.length === 4 && fotoArchivio.every(p => p.dataUrl === fotoVere.get(p.id)));
    t('e con l immagine della nota', archivio.includes(immagineNota.dataUrl.slice(0, 200)));
    t('senza segnaposti', !/@@DPSH_FOTO_|\\u0000/.test(prova + archivio));
    app.chiudi();

    console.log('--- Il Backup completo JSON reimportato rimette le foto in IndexedDB ---');
    const altro = await avviaApp({ stato: null });
    altro.E('importGlobalJSONBackup')(new altro.w.File([archivio], 'archivio.json'));
    await attesa(300);
    clic(altro, altro.dialogo() && altro.dialogo().ok);
    await attesa(400);
    const foto = (altro.idb._dump('DPSH_PhotoStorageDB') || { photos: [] }).photos;
    t('le foto sono in IndexedDB, identiche', foto.length === 3 && foto.every(r => r.dataUrl === fotoVere.get(r.id)));
    const note = (altro.idb._dump('DPSH_PhotoStorageDB') || { noteImages: [] }).noteImages;
    t('e anche l immagine della nota', note.length === 1 && note[0].dataUrl === immagineNota.dataUrl);
    altro.chiudi();
  }

  console.log('--- Andata e ritorno del progetto, su un telefono vuoto ---');
  {
    const app = await avviaApp({ stato: null });
    const r = app.E('importProjectsFromJSON')(JSON.parse(fileProgetto));
    await attesa(300);
    const foto = app.idb._dump('DPSH_PhotoStorageDB').photos;
    t('tutte le foto arrivano in IndexedDB, identiche', r.fotoAssenti === 0 && foto.length === 3 && foto.every(x => x.dataUrl === fotoVere.get(x.id)));
    t('e l immagine della nota', app.idb._dump('DPSH_PhotoStorageDB').noteImages.some(x => x.id === immagineNota.id && x.dataUrl === immagineNota.dataUrl));
    t('nessun avviso di foto non salvate', !app.dialogo());
    app.chiudi();
  }

  console.log('--- Un JSON di prima (senza foto) non rovina le foto del telefono ---');
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefono() });
    const r = app.E('importProjectsFromJSON')(JSON.parse(PROGETTO_V0));
    await attesa(300);
    const foto = app.idb._dump('DPSH_PhotoStorageDB').photos;
    t('le foto vere restano quelle', foto.length === 3 && foto.every(x => x.dataUrl === fotoVere.get(x.id)));
    t('le foto assenti nel file vengono contate', r.fotoAssenti === 4);
    t('e il progetto importato non si porta dietro il segnaposto',
      app.E('Object.values(state.projects).every(p => Object.values(p.surveys).every(s => (s.photos || []).every(f => f.dataUrl === undefined || String(f.dataUrl).startsWith("data:"))))'));
    t('il messaggio di fine import lo spiega', /non c'erano dentro/.test(app.E('testoFotoAssentiNelFile(4)')) && app.E('testoFotoAssentiNelFile(0)') === '');
    app.chiudi();
  }

  console.log('--- Un segnaposto che non si ritrova ferma il backup ---');
  {
    const app = await avviaApp({ stato: null });
    let errore = null;
    try { app.E('assemblaBlobConSegnaposto')('{"a":"niente"}', [{ placeholder: '@@DPSH_FOTO_x_0@@', value: 'data:image/png;base64,AAA' }]); } catch (e) { errore = e; }
    t('niente file a metà: un errore che lo dice', !!errore && /backup annullato/.test(errore.message));
    const giusto = app.E('assemblaBlobConSegnaposto')('{"a":"@@DPSH_FOTO_x_0@@"}', [{ placeholder: '@@DPSH_FOTO_x_0@@', value: 'data:image/png;base64,AAA' }]).join('');
    t('e quando c è, la foto prende il suo posto', giusto === '{"a":"data:image/png;base64,AAA"}');
    app.chiudi();
  }

  console.log('--- CONTROPROVE sull app di prima ---');
  {
    const app = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0, idb: telefono() });
    const pid = app.E('Object.keys(state.projects)[0]');
    await app.E('exportProjectJSON')(pid);
    await attesa(100);
    const vecchio = await app.scaricati[app.scaricati.length - 1].blob.text();
    t('(controprova) il JSON del progetto usciva senza nessuna foto', fotoNelFile(vecchio).every(p => !String(p.dataUrl).startsWith('data:')));
    app.E('importProjectsFromJSON')(JSON.parse(vecchio));
    await attesa(300);
    const foto = app.idb._dump('DPSH_PhotoStorageDB').photos;
    t('(controprova) e reimportandolo il segnaposto prendeva il posto delle foto vere', foto.some(x => !x.dataUrl.startsWith('data:')));
    app.chiudi();

    const app2 = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0, idb: telefono() });
    app2.E('exportGlobalJSONBackup()');
    await attesa(100);
    const archivioVecchio = await app2.scaricati[app2.scaricati.length - 1].blob.text();
    t('(controprova) il Backup completo JSON, dopo un riavvio, non aveva le foto', fotoNelFile(archivioVecchio).every(p => !p.dataUrl));
    app2.chiudi();

    const app3 = await avviaApp({ file: RIFERIMENTO, stato: null });
    app3.E('importGlobalJSONBackup')(new app3.w.File([archivioConFoto], 'archivio.json'));
    await attesa(300);
    clic(app3, app3.dialogo() && app3.dialogo().ok);
    await attesa(400);
    const dopo = app3.idb._dump('DPSH_PhotoStorageDB');
    t('(controprova) e importandolo, anche con le foto dentro, IndexedDB restava vuoto',
      app3.E('Object.keys(state.projects).length') === 2 && (!dopo || dopo.photos.length === 0));
    app3.chiudi();
  }

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log('KO eccezione'); process.exit(1); });
