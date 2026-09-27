// VERSIONE DELLO SCHEMA E MIGRAZIONI REGISTRATE (Fase 1, punto 3).
//
// Tre cose da garantire:
//  1. i dati di oggi (formato 0, senza versioneSchema: le fixture di test/dati) si caricano e
//     si importano ancora, identici, e dopo il primo salvataggio portano versioneSchema = 1;
//  2. prima di riscriverli nel formato nuovo, il testo vecchio va in una copia automatica
//     «prima di aggiornare i dati»;
//  3. un file di un'app più nuova si rifiuta con un messaggio chiaro, SENZA scrivere niente.
// Più il difetto trovato strada facendo: un archivio senza progetti si ritrovava, al riavvio,
// un progetto fantasma «Nuovo Cantiere».
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const DATI = path.join(__dirname, 'dati');
const leggi = (f) => fs.readFileSync(path.join(DATI, f));
const STATO_V0 = leggi('stato_v0.json').toString('utf8');
const IDB_V0 = JSON.parse(leggi('idb_v0.json').toString('utf8'));
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));

// Confronto profondo che ignora i soli campi che il salvataggio aggiorna da sé (updatedAt).
function senzaOrari(x) {
  return JSON.parse(JSON.stringify(x, (k, v) => (k === 'updatedAt' ? undefined : v)));
}
const uguali = (a, b) => JSON.stringify(senzaOrari(a)) === JSON.stringify(senzaOrari(b));
// L'unico cambiamento voluto dalle migrazioni ai progetti delle fixture (Fase 3, 2 → 3): la
// «Modalità Espansa» esce dalle impostazioni che ogni prova porta con sé. Il confronto resta
// esatto: si applica questo e basta all'originale, e il resto deve tornare identico.
function comeDopoLa2a3(progetti) {
  const p = JSON.parse(JSON.stringify(progetti));
  Object.values(p).forEach(pr => Object.values(pr.surveys || {}).forEach(sv => { if (sv.settings) { delete sv.settings.expandedMode; delete sv.settings.compactMode; } }));
  return p;
}

// ---- Le funzioni pure, estratte dal file come sono ----
const src = fs.readFileSync(path.join(__dirname, '..', 'dist', 'DPSH.html'), 'utf8');
const righe = src.split('\n');
function corpo(nome) {
  const i = righe.findIndex(r => r.startsWith('            function ' + nome + '('));
  if (i < 0) throw new Error('non trovata: ' + nome);
  for (let k = i + 1; k < righe.length; k++) if (righe[k] === '            }') return righe.slice(i, k + 1).join('\n');
}
function bloccoConst(inizio, fine) {
  const i = righe.findIndex(r => r.startsWith(inizio));
  if (i < 0) throw new Error('non trovato: ' + inizio);
  for (let k = i; k < righe.length; k++) if (righe[k] === fine) return righe.slice(i, k + 1).join('\n');
}
const NOMI = ['versioneDeiDati', 'migraDati', 'migrazione0a1', 'migrazione1a2', 'migrazione2a3', 'stratiInizialiProgettoNuovo', 'versioneFileImportato', 'controllaVersioneFileImportato', 'leggiStatoSalvato'];
const versioneRiga = righe.find(r => r.includes('const VERSIONE_SCHEMA_DATI = '));
const api = new Function(versioneRiga + '\n' + NOMI.map(corpo).join('\n\n') + '\n'
  + bloccoConst('            const MIGRAZIONI_DATI = [', '            ];')
  + '\nreturn {' + NOMI.join(',') + ', MIGRAZIONI_DATI, VERSIONE_SCHEMA_DATI};')();
const PRE = { header: { committente: '', comune: '', provaNr: '1' }, instrument: { pesoMassa: 63.5 }, settings: { stepCm: 20 } };

(async () => {
  console.log('--- Il registro ---');
  const V = api.VERSIONE_SCHEMA_DATI;
  t('la versione dello schema è un intero ≥ 1', Number.isInteger(V) && V >= 1);
  t('le migrazioni vanno da 0 a ' + V + ' senza buchi, una per passo',
    api.MIGRAZIONI_DATI.length === V && api.MIGRAZIONI_DATI.every((m, i) => m.da === i && m.a === i + 1 && typeof m.esegui === 'function' && m.descrizione));

  console.log('--- La versione dei dati ---');
  t('senza versioneSchema: formato 0', api.versioneDeiDati({ projects: {} }) === 0);
  t('con versioneSchema intero: quella', api.versioneDeiDati({ versioneSchema: 3 }) === 3);
  t('una versione strana non è 0: è «non valida»', api.versioneDeiDati({ versioneSchema: '1' }) === null && api.versioneDeiDati({ versioneSchema: 1.5 }) === null && api.versioneDeiDati({ versioneSchema: -1 }) === null);
  const letto = api.leggiStatoSalvato(JSON.stringify({ versioneSchema: V + 1, projects: {} }));
  t('uno stato salvato da un app più nuova non si carica', !letto.ok && letto.motivo === 'piu-nuovo' && /formato dati/.test(letto.dettaglio));
  t('uno con versione non valida nemmeno', api.leggiStatoSalvato('{"versioneSchema":"x"}').motivo === 'illeggibile');

  console.log('--- Migrazione 0 → 1 sui dati di oggi (fixture) ---');
  {
    const dati = JSON.parse(STATO_V0);
    const originale = JSON.parse(STATO_V0);
    const esito = api.migraDati(dati, 0, PRE);
    // Fase 2: dal formato 0 si passa per tutte le migrazioni, una per passo, fino a V.
    t('le migrazioni applicate, con la loro descrizione', esito.applicate.length === V && esito.applicate[0].da === 0 && esito.applicate[0].a === 1 && esito.applicate.every(m => m.descrizione));
    t('il risultato dichiara la versione ' + V, esito.dati.versioneSchema === V);
    t('progetti, prove, intervalli, strati, note: identici', JSON.stringify(esito.dati.projects) === JSON.stringify(comeDopoLa2a3(originale.projects)));
    t('e niente di inventato: nessun intervallo riceve date o origini', !JSON.stringify(esito.dati.projects).match(/registratoIl|origine|modificatoIl/));
    const giaNuovi = api.migraDati({ versioneSchema: V, projects: {} }, V, PRE);
    t('dati già alla versione attuale: nessuna migrazione', giaNuovi.applicate.length === 0);
  }

  console.log('--- Migrazione 0 → 1 sui salvataggi di prima dei progetti ---');
  {
    const provaSciolta = { header: { comune: 'Sava', provaNr: '4', date: '2024-05-02' }, logs: [{ start: 0, end: 0.2, colpi: 3 }], settings: { operator: 'Rossi' } };
    const r1 = api.migraDati(JSON.parse(JSON.stringify(provaSciolta)), 0, PRE).dati;
    const p1 = Object.values(r1.projects);
    t('una prova sola diventa un progetto con quella prova', p1.length === 1 && p1[0].comune === 'Sava' && Object.values(p1[0].surveys)[0].logs.length === 1);
    t('e il progetto diventa quello aperto', r1.currentProjectId === p1[0].id && !!r1.currentSurveyId);
    const archivio = { archive: {
      a: { header: { comune: 'Nardò', provaNr: '1' }, logs: [] },
      b: { header: { comune: 'Nardò', provaNr: '2' }, logs: [] },
      c: { header: { comune: 'Sava', provaNr: '1' }, logs: [] } } };
    const r2 = api.migraDati(archivio, 0, PRE).dati;
    const perComune = Object.values(r2.projects).map(p => p.comune + ':' + Object.keys(p.surveys).length).sort().join(',');
    t('un archivio di prove sciolte si raggruppa per comune', perComune === 'Nardò:2,Sava:1');
    t('le prove senza strati partono dallo Strato 1, non da quelli di un altro cantiere',
      Object.values(r2.projects).every(p => Object.values(p.surveys).every(s => s.strati.length === 1 && s.strati[0].id === 'strato_1')));
  }

  console.log('--- Il progetto fantasma ---');
  {
    const vuoto = { projects: {}, header: { comune: '', provaNr: '1' }, logs: [], archive: {} };
    const r = api.migraDati(vuoto, 0, PRE).dati;
    t('un archivio SENZA progetti resta senza progetti', Object.keys(r.projects).length === 0);
    // L'app intera: si parte vuota, si salva, si riapre.
    const app1 = await avviaApp({ stato: null });
    const salvato = app1.salvato();
    app1.chiudi();
    const app2 = await avviaApp({ stato: salvato });
    t('riaprendo l app appena installata non compare nessun progetto', app2.E('Object.keys(state.projects).length') === 0);
    app2.chiudi();
    const vecchia = await avviaApp({ file: RIFERIMENTO, stato: JSON.stringify(vuoto) });
    t('(controprova) l app di prima, con lo stesso archivio, si inventava «Nuovo Cantiere»',
      vecchia.E('Object.values(state.projects).map(p => p.name).join()') === 'Nuovo Cantiere');
    vecchia.chiudi();
  }

  console.log('--- All avvio: copia «prima di aggiornare i dati», poi il formato nuovo ---');
  {
    const app = await avviaApp({ stato: STATO_V0, attesaAvvio: 0 });
    t('appena caricato, il salvataggio aspetta la copia', app.E('caricamentoDati.bloccato') === 'migrazione' && app.salvato() === STATO_V0);
    await attesa(900);
    const copie = app.idb._dump('DPSH_CopieAutomatiche');
    const voce = copie.indice.find(v => v.motivo === 'prima di aggiornare i dati (formato 0 → ' + V + ')');
    const copia = voce && copie.copie.find(c => c.id === voce.id);
    t('la copia c è, con il motivo scritto', !!voce && voce.tipo === 'prima');
    t('ed è il testo di PRIMA, identico', !!copia && copia.json === STATO_V0);
    t('il caricamento lo registra', app.E('caricamentoDati.migrazione.copia') === true && app.E('caricamentoDati.bloccato') === false);
    const dopo = JSON.parse(app.salvato());
    t('poi il salvataggio riparte, nel formato ' + V, dopo.versioneSchema === V);
    const prima = JSON.parse(STATO_V0);
    // Il primo salvataggio copia le preferenze dell'app nella prova aperta: c'è anche il tasto
    // Registra (true), che per la 2 → 3 è il valore di tutti.
    const dopoSenzaPreferenza = JSON.parse(JSON.stringify(dopo.projects, (k, v) => (k === 'tastoRegistraVisibile' ? undefined : v)));
    t('con gli stessi progetti, prove e intervalli di prima', uguali(dopoSenzaPreferenza, comeDopoLa2a3(prima.projects)));
    t('e la stessa libreria di template', JSON.stringify(dopo.reportTemplates) === JSON.stringify(prima.reportTemplates));
    app.chiudi();
    // Riaprendo, dati già nuovi: nessuna copia in più, nessuna attesa.
    const app2 = await avviaApp({ stato: JSON.stringify(dopo), idb: app.idb, attesaAvvio: 0 });
    t('alla seconda apertura non c è niente da migrare', app2.E('caricamentoDati.bloccato') === false && app2.E('caricamentoDati.migrazione') === null);
    await attesa(300);
    app2.chiudi();
  }

  console.log('--- Se la copia non si può scrivere, l app non resta bloccata ---');
  {
    const app = await avviaApp({ stato: STATO_V0, primaDellApp: (w) => { w.indexedDB._guasto.scritture = true; } });
    t('si prosegue, e lo si dice nella console', app.E('caricamentoDati.bloccato') === false && app.E('caricamentoDati.migrazione.copia') === false
      && app.avvisi.some(a => /prima di aggiornare i dati non riuscita/.test(a)));
    app.chiudi();
  }

  console.log('--- I file di oggi si importano ancora ---');
  {
    const app = await avviaApp({ stato: null });
    const w = app.w;
    const r1 = app.E('importProjectsFromJSON')(JSON.parse(leggi('progetto_v0.json').toString('utf8')));
    await attesa(300);
    t('progetto JSON: importato', r1.importedCount === 1);
    const pid = app.E('Object.keys(state.projects)[0]');
    const atteso = JSON.parse(leggi('progetto_v0.json').toString('utf8'));
    const arrivato = JSON.parse(app.E('JSON.stringify(state.projects[' + JSON.stringify(pid) + '])'));
    t('con gli stessi intervalli e strati', uguali(Object.values(arrivato.surveys).map(s => s.logs), Object.values(atteso.surveys).map(s => s.logs)) && uguali(arrivato.strati, atteso.strati));
    t('e il campo versioneSchema non entra nel progetto', !('versioneSchema' in arrivato));
    const foto = app.idb._dump('DPSH_PhotoStorageDB');
    // I JSON dell'app di prima non contenevano le foto (vedi backup_foto.js): si contano come
    // assenti e non si scrive niente al loro posto. L'immagine della nota invece c'era.
    t('le foto, assenti nel file, sono contate e non scritte; l immagine della nota va in IndexedDB',
      r1.fotoAssenti === 4 && !!foto && foto.photos.length === 0 && foto.noteImages.length === 1);

    const zip = new w.File([leggi('backup_completo_v0.zip')], 'backup.zip', { type: 'application/zip' });
    const r2 = await app.E('importProjectsFromZip')(zip);
    t('backup completo ZIP: i due progetti (uno rinominato perché già presente)', r2.importedCount === 2 && r2.renamedCount === 1);
    const zip1 = new w.File([leggi('progetto_v0.zip')], 'progetto.zip', { type: 'application/zip' });
    const r3 = await app.E('importProjectsFromZip')(zip1);
    t('progetto ZIP: importato', r3.importedCount === 1);
    const r4 = app.E('importProjectsFromJSON')(JSON.parse(leggi('backup_stato_v0.json').toString('utf8')));
    t('export JSON dello stato intero: importato', r4.importedCount === 2);
    await attesa(300);
    t('nessun progetto importato porta con sé versioneSchema', app.E('Object.values(state.projects).every(p => !("versioneSchema" in p))'));

    // Il «Backup completo» JSON passa dal suo importatore (file scelto dal menu, poi conferma).
    // Prima si chiudono eventuali avvisi rimasti aperti dagli import precedenti.
    for (let i = 0; i < 3 && app.dialogo(); i++) { clic(app, app.dialogo().annulla.style.display !== 'none' ? app.dialogo().annulla : app.dialogo().ok); await attesa(50); }
    const prima = app.E('Object.keys(state.projects).length');
    app.E('importGlobalJSONBackup')(new w.File([leggi('backup_archivio_v0.json')], 'archivio.json', { type: 'application/json' }));
    await attesa(300);
    const dlg = app.dialogo();
    if (dlg) clic(app, dlg.ok);
    await attesa(300);
    const fatto = app.dialogo();
    if (!fatto || !/Archivio importato con successo/.test(fatto.testo)) console.log('       dialoghi:', dlg && dlg.testo.slice(0, 80), '|', fatto && fatto.testo.slice(0, 200));
    const dopoImport = app.E('Object.keys(state.projects).length');
    t('backup completo JSON: unito all archivio (' + prima + ' → ' + dopoImport + ')', !!fatto && /Archivio importato con successo/.test(fatto.testo) && dopoImport >= prima);
    if (fatto) clic(app, fatto.ok);
    t('senza errori', app.errori.length === 0);
    if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
    app.chiudi();
  }

  console.log('--- Gli export dichiarano la versione ---');
  {
    const app = await avviaApp({ stato: STATO_V0 });
    const pid = app.E('Object.keys(state.projects)[0]');
    await app.E('exportProjectJSON')(pid);
    await app.E('exportProjectZip')(pid);
    await app.E('exportGlobalZip()');
    app.E('exportGlobalJSONBackup()');
    await attesa(200);
    const [pj, pz, gz, gj] = app.scaricati.slice(-4);
    const progetto = JSON.parse(await pj.blob.text());
    t('progetto JSON: versioneSchema ' + V, progetto.versioneSchema === V);
    const zipFile = new app.w.File([await pz.blob.arrayBuffer()], 'p.zip');
    const voci = await app.E('readZipStoreOnly')(zipFile);
    const pjson = JSON.parse(new TextDecoder().decode(voci.find(v => v.name === 'progetto.json').bytes));
    t('progetto ZIP: versioneSchema dentro progetto.json', pjson.versioneSchema === V);
    const gvoci = await app.E('readZipStoreOnly')(new app.w.File([await gz.blob.arrayBuffer()], 'g.zip'));
    const manifest = JSON.parse(new TextDecoder().decode(gvoci.find(v => v.name === 'manifest.json').bytes));
    t('backup completo ZIP: versioneSchema nel manifest', manifest.versioneSchema === V);
    const archivio = JSON.parse(await gj.blob.text());
    t('backup completo JSON: fuori e dentro lo stato', archivio.versioneSchema === V && archivio.state.versioneSchema === V);

    console.log('--- Andata e ritorno nel formato nuovo ---');
    const app2 = await avviaApp({ stato: null });
    app2.E('importProjectsFromJSON')(progetto);
    await attesa(300);
    const tornato = JSON.parse(app2.E('JSON.stringify(Object.values(state.projects)[0])'));
    const originale = JSON.parse(app.E('JSON.stringify(state.projects[' + JSON.stringify(pid) + '])'));
    // Le foto hanno la loro verifica (backup_foto.js): qui i dati.
    const senzaFoto = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === 'dataUrl' ? undefined : v)));
    t('il progetto esportato e reimportato è identico', uguali(senzaFoto(tornato), senzaFoto(originale)));
    app2.chiudi();
    app.chiudi();
  }

  console.log('--- Un file di un app più nuova si rifiuta, senza scrivere niente ---');
  {
    const futuro = JSON.parse(leggi('progetto_v0.json').toString('utf8'));
    futuro.versioneSchema = V + 1;
    const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
    const prima = app.E('JSON.stringify(Object.keys(state.projects))');
    const fotoPrima = (app.idb._dump('DPSH_PhotoStorageDB') || { photos: [] }).photos.length;
    let errore = null;
    try { app.E('importProjectsFromJSON')(futuro); } catch (e) { errore = e; }
    t('importProjectsFromJSON lancia un errore', !!errore);
    t('che dice cosa fare', !!errore && /versione più nuova dell'app/.test(errore.message) && /Aggiorna l'app/.test(errore.message) && /non è stato importato niente/.test(errore.message));
    await attesa(200);
    t('nessun progetto aggiunto', app.E('JSON.stringify(Object.keys(state.projects))') === prima);
    t('nessuna foto scritta', (app.idb._dump('DPSH_PhotoStorageDB') || { photos: [] }).photos.length === fotoPrima);

    // Uno ZIP col manifest di un'app più nuova, costruito con lo stesso scrittore di ZIP dell'app.
    const enc = new TextEncoder();
    const blob = app.E('buildZipBlob')([
      { name: 'progetti/X/progetto.json', bytes: enc.encode(JSON.stringify({ id: 'X', name: 'Futuro', surveys: {} })) },
      { name: 'manifest.json', bytes: enc.encode(JSON.stringify({ projectIds: ['X'], versioneSchema: V + 1 })) }
    ]);
    let erroreZip = null;
    try { await app.E('importProjectsFromZip')(new app.w.File([await blob.arrayBuffer()], 'f.zip')); } catch (e) { erroreZip = e; }
    t('anche lo ZIP, dal manifest', !!erroreZip && /versione più nuova/.test(erroreZip.message) && app.E('JSON.stringify(Object.keys(state.projects))') === prima);

    // Dal menu, come lo farebbe l'utente: il messaggio arriva in un dialogo.
    app.E('importGlobalJSONBackup')(new app.w.File([JSON.stringify({ version: '1.0', versioneSchema: V + 1, state: { projects: { Z: { id: 'Z', surveys: {} } } } })], 'x.json'));
    await attesa(300);
    const dlg = app.dialogo();
    t('dal menu Backup: un dialogo che lo spiega, nessuna domanda di conferma', !!dlg && /versione più nuova/.test(dlg.testo) && dlg.annulla.style.display === 'none');
    t('e l archivio resta com era', app.E('JSON.stringify(Object.keys(state.projects))') === prima);
    app.chiudi();

    const vecchia = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0 });
    let erroreVecchio = null;
    try { vecchia.E('importProjectsFromJSON')(futuro); } catch (e) { erroreVecchio = e; }
    t('(controprova) l app di prima lo importava senza dire niente', !erroreVecchio && vecchia.E('Object.keys(state.projects).length') === 3);
    vecchia.chiudi();
  }

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log('KO eccezione'); process.exit(1); });
