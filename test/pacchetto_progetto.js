// IL PACCHETTO DI PROGETTO (Fase 2, pezzo 044b): ANDATA E RITORNO TELEFONO ↔ PC.
//
// Il requisito dell'utente, alla lettera: il pacchetto è la COPIA ESATTA del progetto, e sull'altro
// dispositivo il progetto (report compreso) risulta identico. Qui:
//  1. andata: il telefono esporta il progetto «ricco» (dati/progetto_ricco.js), un PC vuoto lo riceve,
//     e il confronto profondo dice IDENTICO: progetto salvato (GPS, intervalli con il loro storico,
//     strati coi parametri, note), template e voci d'archivio usati, correzioni registrate; foto e
//     immagini delle note confrontate per SHA-256 dei byte (EXIF compresi, versione intera del
//     ritaglio compresa); lo stesso template risolto per il report di ogni prova;
//  2. un pacchetto rovinato (un byte cambiato, un file tolto, un file in più) si rifiuta intero e non
//     scrive NIENTE, né nei dati né in IndexedDB;
//  3. due «dispositivi» con template omonimi ma diversi: nessuno dei due si sovrascrive;
//  4. ritorno: il PC modifica e rimanda; il telefono capisce che il pacchetto è più recente e che
//     sostituire non perde niente; poi i casi in cui NON è così (quello di qui è più recente, o
//     modificati tutti e due), lo stesso pacchetto una seconda volta (identico), «Tieni entrambi»,
//     la copia automatica prima di sostituire, una foto con lo stesso id ma byte diversi;
//  5. i JSON e gli ZIP di oggi si importano ancora; lo ZIP vecchio non importa un pacchetto per sbaglio.
// Controprova: l'app di prima (riferimento/) non sa cosa farsene di un pacchetto.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');
const { creaIndexedDB } = require('./dati/idb_finto');
const { arricchisci } = require('./dati/progetto_ricco');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const J = (app, espr) => JSON.parse(app.E('JSON.stringify(' + espr + ')'));
const conNome = (nome) => ({ primaDellApp(w) { w.localStorage.setItem('dpsh_nome_dispositivo', nome); } });
// updatedAt è l'ora dell'ultimo salvataggio, non contenuto: quando il progetto sostituito è quello aperto,
// il salvataggio successivo la rimette ad adesso (è proprio il campo che il piano dice inaffidabile).
const senzaOrari = (x) => JSON.stringify(x, (k, v) => (k === 'updatedAt' ? undefined : v));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
/** SHA-256 dei BYTE di ogni immagine in IndexedDB: { store: { id: sha } }. */
function impronteIdb(app) {
  const d = app.idb._dump('DPSH_PhotoStorageDB') || {};
  const fuori = {};
  ['photos', 'noteImages'].forEach(s => {
    fuori[s] = {};
    (d[s] || []).forEach(r => { fuori[s][r.id] = sha(Buffer.from(r.dataUrl.slice(r.dataUrl.indexOf(',') + 1), 'base64')) + '|' + r.dataUrl.slice(0, r.dataUrl.indexOf(',')); });
  });
  return fuori;
}
const idImmaginiDelProgetto = (p) => {
  const ids = new Set();
  Object.values(p.surveys).forEach(s => (s.photos || []).forEach(f => ids.add(f.id)));
  return ids;
};

(async () => {
  // ---- Il telefono: fixture + progetto ricco ----
  const tel = await avviaApp(Object.assign({ stato: STATO_V0, idb: telefonoV0() }, conNome('Telefono')));
  const r = await arricchisci(tel);

  console.log('--- Crea il pacchetto ---');
  const stima = await tel.E('stimaPacchetto')(r.pid);
  const creato = await tel.E('creaPacchettoProgetto')(r.pid);
  const buf = Buffer.from(await creato.blob.arrayBuffer());
  const m = creato.manifest;
  t('nome del file dal progetto e dalla data', /^Nardò_-_Scuola_Via_Roma_\d{4}-\d\d-\d\d\.dpsh\.zip$/.test(creato.nomeFile));
  t('manifest: tipo, formato, versioni, progetto, dispositivo, quando', m.tipo === 'dpsh-pacchetto-progetto' && m.formatoPacchetto === 1 && m.versioneSchema === tel.E('VERSIONE_SCHEMA_DATI')
    && m.versioneApp === tel.E('APP_VERSIONE') && m.progetto.id === r.pid && m.dispositivo === 'Telefono' && !isNaN(Date.parse(m.esportatoIl)));
  const voci = await tel.E('readZipStoreOnly')(creato.blob);
  t('ogni file (tranne il manifest) è nel manifest con dimensione e SHA-256 giusti',
    voci.length === m.file.length + 1 && m.file.every(f => { const v = voci.find(x => x.name === f.percorso); return v && v.bytes.length === f.byte && sha(Buffer.from(v.bytes)) === f.sha256; }));
  const pr = J(tel, 'state.projects[' + JSON.stringify(r.pid) + ']');
  const fotoAttese = idImmaginiDelProgetto(pr);
  t('le foto ci sono tutte, una volta sola (la condivisa fra 3 e 3B pure), più l intera del ritaglio',
    m.file.filter(f => f.archivio === 'photos').length === fotoAttese.size + 1 && m.file.some(f => f.id === r.idRitagliata + '__orig'));
  t('e le immagini delle note, anche quella della nota di prima del motore', m.file.filter(f => f.archivio === 'noteImages').map(f => f.id).sort().join() === ['nimg_1790450355305_4fms7', 'nimg_prima_1'].sort().join());
  const jpeg = m.file.find(f => f.id === r.idJpeg);
  t('la foto JPEG: byte identici, EXIF compreso (SHA-256)', jpeg && jpeg.sha256 === sha(r.jpeg) && jpeg.prefisso === 'data:image/jpeg;base64');
  t('conteggi nel manifest', m.conteggi.prove === Object.keys(pr.surveys).length && m.conteggi.foto === fotoAttese.size && m.conteggi.strati === pr.strati.length);
  t('nessuna foto mancante', m.fotoMancanti.length === 0 && m.immaginiNoteMancanti.length === 0);
  t('la stima del peso è vicina al vero (±10%)', Math.abs(stima.byte - buf.length) / buf.length < 0.1);
  t('il telefono ha registrato la tappa nel progetto', pr.passaggi && pr.passaggi.impronte.length === 1 && pr.passaggi.impronte[0].impronta === m.impronta && pr.passaggi.impronte[0].dispositivo === 'Telefono');
  t('ed esportare non è modificare', J(tel, 'state.projects[' + JSON.stringify(r.pid) + '].modificatoIl') === pr.modificatoIl);

  console.log('--- 1. Andata: un PC vuoto lo riceve, IDENTICO ---');
  const pc = await avviaApp(Object.assign({ stato: null }, conNome('PC')));
  const file = new pc.w.File([buf], creato.nomeFile, { type: 'application/zip' });
  const lettura = await pc.E('leggiPacchetto')(file);
  t('verificato: tutti i file', lettura.ok && lettura.verificati === m.file.length);
  t('l impronta ricalcolata all arrivo è quella del manifest', lettura.impronta === m.impronta && !lettura.improntaDichiarataDiversa);
  t('nessuna anomalia nei dati', lettura.anomalie.length === 0);
  const confr = await pc.E('confrontaConPresente')(lettura);
  t('sul PC non c è: si importa e basta', confr.presente === false);
  const esito = await pc.E('applicaPacchetto')(lettura, 'nuovo');
  await attesa(200);
  t('importato con lo stesso id', esito.projId === r.pid);
  const salvatoTel = JSON.parse(tel.salvato()), salvatoPc = JSON.parse(pc.salvato());
  t('CONFRONTO PROFONDO: il progetto salvato sul PC è identico a quello salvato sul telefono, campo per campo',
    JSON.stringify(salvatoPc.projects[r.pid]) === JSON.stringify(salvatoTel.projects[r.pid]));
  const pTel = salvatoTel.projects[r.pid];
  t('(dentro: GPS delle prove, storico degli intervalli, strati con parametri, note, tappe)',
    Object.values(pTel.surveys).some(s => s.header.lat === 40.19741 && s.header.acc === 4.5) && Object.values(pTel.surveys).some(s => s.logs.some(l => l.registratoIl && l.origine === 'contatore'))
    && pTel.strati.some(s => s.parametriAvanzati && Object.keys(s.parametriAvanzati).length) && pTel.notes.htmlPrimaDelMotore && pTel.passaggi);
  ['reportTemplates', 'indiceTemplates', 'lithologyArchive'].forEach(k => {
    const usati = { reportTemplates: ['classico', 'tpl_rossi'], indiceTemplates: ['idx_rossi'], lithologyArchive: [r.idArchivio] }[k];
    t(`librerie: ${k} usati, identici`, usati.every(id => JSON.stringify(salvatoPc[k][id]) === JSON.stringify(salvatoTel[k][id])));
  });
  const iTel = impronteIdb(tel), iPc = impronteIdb(pc);
  const idsFoto = [...fotoAttese, r.idRitagliata + '__orig'];
  t('FOTO: SHA-256 dei byte uguali, una per una (e lo stesso tipo)', idsFoto.every(id => iTel.photos[id] && iTel.photos[id] === iPc.photos[id]));
  t('IMMAGINI DELLE NOTE: SHA-256 uguali', ['nimg_1790450355305_4fms7', 'nimg_prima_1'].every(id => iTel.noteImages[id] && iTel.noteImages[id] === iPc.noteImages[id]));
  t('e la stringa delle foto in IndexedDB è la stessa, carattere per carattere',
    idsFoto.every(id => (tel.idb._dump('DPSH_PhotoStorageDB').photos.find(x => x.id === id) || {}).dataUrl === (pc.idb._dump('DPSH_PhotoStorageDB').photos.find(x => x.id === id) || {}).dataUrl));
  const regTel = salvatoTel.registroCorrezioni.filter(c => c.projId === r.pid), regPc = (salvatoPc.registroCorrezioni || []).filter(c => c.projId === r.pid);
  t('le correzioni registrate del progetto arrivano', regTel.length === 1 && JSON.stringify(regPc) === JSON.stringify(regTel));
  t('il report: ogni prova risolve lo stesso template, identico', Object.values(pTel.surveys).every(s => {
    const a = tel.E('getReportTemplateIdPerProva')(s), b = pc.E('getReportTemplateIdPerProva')(s);
    return a === b && JSON.stringify(J(tel, 'state.reportTemplates[' + JSON.stringify(a) + ']')) === JSON.stringify(J(pc, 'state.reportTemplates[' + JSON.stringify(b) + ']'));
  }) && tel.E('getIndiceTemplateIdPerProgetto')(pTel) === pc.E('getIndiceTemplateIdPerProgetto')(salvatoPc.projects[r.pid]));
  t('l impronta calcolata sul PC è quella del pacchetto', await (async () => {
    const pp = pc.E('state.projects[' + JSON.stringify(r.pid) + ']');
    return pc.E('improntaProgetto')(pc.E('formaSalvataProgetto')(pp), pc.E('state'), await pc.E('impronteImmaginiQui')(pp)) === m.impronta;
  })());
  t('ricevere non è modificare: modificatoIl è quello del telefono', salvatoPc.projects[r.pid].modificatoIl === pTel.modificatoIl);
  pc.E('openProject(' + JSON.stringify(r.pid) + ')');
  pc.E('saveState()');
  t('aprirlo sul PC non lo cambia', JSON.parse(pc.salvato()).projects[r.pid].modificatoIl === pTel.modificatoIl);

  console.log('--- 2. Pacchetto rovinato: rifiutato, niente scritto ---');
  {
    const rovina = async (come) => {
      const v = await tel.E('readZipStoreOnly')(creato.blob);
      come(v);
      const blob = tel.E('buildZipBlob')(v);
      return Buffer.from(await blob.arrayBuffer());
    };
    const casi = [
      ['un byte cambiato in una foto', (v) => { const f = v.find(x => x.name.startsWith('foto/')); f.bytes = Uint8Array.from(f.bytes); f.bytes[f.bytes.length >> 1] ^= 1; }],
      ['un intervallo cambiato in progetto.json', (v) => { const f = v.find(x => x.name === 'progetto.json'); f.bytes = new TextEncoder().encode(new TextDecoder().decode(f.bytes).replace('"colpi": 3', '"colpi": 4')); }],
      ['un file tolto', (v) => { v.splice(v.findIndex(x => x.name === 'librerie.json'), 1); }],
      ['un file in più', (v) => { v.push({ name: 'foto/intruso.jpg', bytes: new Uint8Array([1, 2, 3]) }); }]
    ];
    for (const [nome, come] of casi) {
      const vuoto = await avviaApp(Object.assign({ stato: null }, conNome('PC')));
      const statoPrima = vuoto.salvato();
      const l = await vuoto.E('leggiPacchetto')(new vuoto.w.File([await rovina(come)], 'x.dpsh.zip'));
      let rifiuto = null;
      try { await vuoto.E('applicaPacchetto')(l, 'nuovo'); } catch (e) { rifiuto = e; }
      const idb = vuoto.idb._dump('DPSH_PhotoStorageDB');
      t(`${nome}: rifiutato con il motivo, e non scrive niente`, l.ok === false && l.problemi.length > 0 && !!rifiuto
        && vuoto.salvato() === statoPrima && (!idb || ((idb.photos || []).length === 0 && (idb.noteImages || []).length === 0)));
      vuoto.chiudi();
    }
    const l = await pc.E('leggiPacchetto')(new pc.w.File([await rovina(casi[0][1])], 'x.dpsh.zip'));
    t('il motivo dice quale file è rovinato', /è rovinato: l'impronta non corrisponde/.test(l.problemi.join()));
  }

  console.log('--- 3. Template omonimi ma diversi: nessuno si sovrascrive ---');
  {
    const altro = await avviaApp(Object.assign({ stato: null }, conNome('PC ufficio')));
    altro.E(`(() => {
      const t = JSON.parse(JSON.stringify(state.reportTemplates.classico));
      t.id = 'tpl_rossi'; t.name = 'Modello Rossi'; delete t.builtIn; t.pages[0].footer.text = 'Versione del PC';
      state.reportTemplates.tpl_rossi = t;
      const t2 = JSON.parse(JSON.stringify(t)); t2.id = 'tpl_altro'; t2.pages[0].footer.text = 'Un altro ancora'; t2.name = 'Indice Rossi';
      state.reportTemplates.tpl_altro = t2;
      state.lithologyArchive = { [${JSON.stringify(r.idArchivio)}]: { id: ${JSON.stringify(r.idArchivio)}, name: 'Sabbia limosa mediamente addensata', color: '#000000', pattern: 'none', behavior: 'granulare', parametriPreferiti: {} } };
      saveState();
    })()`);
    const prima = J(altro, '{ r: state.reportTemplates, a: state.lithologyArchive }');
    const l = await altro.E('leggiPacchetto')(new altro.w.File([buf], 'x.dpsh.zip'));
    const e = await altro.E('applicaPacchetto')(l, 'nuovo');
    const dopo = J(altro, '{ r: state.reportTemplates, a: state.lithologyArchive, p: state.projects[' + JSON.stringify(r.pid) + '] }');
    t('i template e le voci d archivio del PC restano identici', Object.keys(prima.r).every(k => JSON.stringify(prima.r[k]) === JSON.stringify(dopo.r[k])) && JSON.stringify(prima.a) === JSON.stringify(Object.fromEntries(Object.keys(prima.a).map(k => [k, dopo.a[k]]))));
    const tplProva = dopo.r[dopo.p.surveys[r.sidTemplate].reportTemplateId];
    t('la prova punta alla copia «Modello Rossi (da Telefono)», uguale a quella del telefono', dopo.p.surveys[r.sidTemplate].reportTemplateId !== 'tpl_rossi'
      && tplProva.name === 'Modello Rossi (da Telefono)' && tplProva.pages[0].footer.text === 'Studio Rossi · relazione geotecnica');
    const strato = dopo.p.strati.find(s => s.sourceArchiveId);
    t('lo strato punta alla copia della voce d archivio', strato.sourceArchiveId !== r.idArchivio && dopo.a[strato.sourceArchiveId].color !== '#000000');
    t('e l impronta non cambia: è lo stesso progetto (id dei template diversi, contenuto uguale)', await (async () => {
      const pp = altro.E('state.projects[' + JSON.stringify(r.pid) + ']');
      return altro.E('improntaProgetto')(altro.E('formaSalvataProgetto')(pp), altro.E('state'), await altro.E('impronteImmaginiQui')(pp)) === m.impronta;
    })());
    t('l esito elenca le copie', e.librerie.nuove.some(n => n.nome === 'Modello Rossi (da Telefono)'));
    altro.chiudi();
  }

  console.log('--- 4. Ritorno: il PC modifica e rimanda al telefono ---');
  let bufPc;
  {
    pc.E('openProject(' + JSON.stringify(r.pid) + ')');
    for (let i = 0; i < 9; i++) pc.d.getElementById('btnPlus').click();
    pc.d.getElementById('btnConfirmStepAction').click();
    await attesa(30);
    pc.E('saveState()');
    t('sul PC la modifica ha la sua data', J(pc, 'state.projects[' + JSON.stringify(r.pid) + '].modificatoIl') > pTel.modificatoIl);
    const dalPc = await pc.E('creaPacchettoProgetto')(r.pid);
    bufPc = Buffer.from(await dalPc.blob.arrayBuffer());
    t('il pacchetto del PC porta tutte e due le tappe', dalPc.manifest.dispositivo === 'PC' && J(pc, 'state.projects[' + JSON.stringify(r.pid) + '].passaggi.impronte.length') === 2);
    const l = await tel.E('leggiPacchetto')(new tel.w.File([bufPc], dalPc.nomeFile));
    const c = await tel.E('confrontaConPresente')(l);
    t('sul telefono: il pacchetto è più recente e contiene tutto quello che c è qui → Sostituisci consigliato',
      c.presente && c.relazione === 'pacchetto-piu-recente' && c.consigliata === 'sostituisci' && !c.avviso);
    const copiePrima = tel.idb._dump('DPSH_CopieAutomatiche').indice.length;
    const e = await tel.E('applicaPacchetto')(l, 'sostituisci');
    await attesa(100);
    const copie = tel.idb._dump('DPSH_CopieAutomatiche').indice;
    t('prima di sostituire: una copia automatica «prima di ricevere…»', copie.length === copiePrima + 1 && /^prima di ricevere «Nardò - Scuola Via Roma» da PC$/.test(copie[copie.length - 1].motivo));
    t('sostituito: il progetto del telefono ora è identico a quello del PC', e.scelta === 'sostituisci'
      && senzaOrari(JSON.parse(tel.salvato()).projects[r.pid]) === senzaOrari(JSON.parse(pc.salvato()).projects[r.pid]));
    t('e la prova aperta sul telefono mostra l intervallo nuovo (stato attivo riallineato)', tel.E('state.logs.length') === J(pc, 'state.projects[' + JSON.stringify(r.pid) + '].surveys[' + JSON.stringify(tel.E('state.currentSurveyId')) + '].logs.length'));
    tel.E('saveState()');
    t('e il salvataggio successivo non lo riporta indietro', senzaOrari(JSON.parse(tel.salvato()).projects[r.pid]) === senzaOrari(JSON.parse(pc.salvato()).projects[r.pid]));
    t('le immagini uguali non si riscrivono', e.immagini.scritte === 0 && e.immagini.uguali === idsFoto.length + 2);
  }

  console.log('--- Lo stesso pacchetto una seconda volta: identico ---');
  {
    const l = await tel.E('leggiPacchetto')(new tel.w.File([bufPc], 'x.dpsh.zip'));
    const c = await tel.E('confrontaConPresente')(l);
    t('«identico»: niente da aggiornare', c.relazione === 'identico');
  }

  console.log('--- Quello di qui è più recente del pacchetto ---');
  {
    // Al PC arriva di nuovo il primo pacchetto del telefono (più vecchio di quello che il PC ha).
    const l = await pc.E('leggiPacchetto')(new pc.w.File([buf], 'x.dpsh.zip'));
    const c = await pc.E('confrontaConPresente')(l);
    t('il PC contiene già il pacchetto e va oltre → avviso, Tieni entrambi consigliato', c.relazione === 'presente-piu-recente' && c.consigliata === 'entrambi' && c.avviso);
  }

  console.log('--- Modificati tutti e due dopo l ultimo passaggio ---');
  {
    tel.E('state.projects[' + JSON.stringify(r.pid) + '].name = "Nardò - modificato sul telefono"; saveState();');
    // (Il committente del progetto aperto lo riscrive l'intestazione della prova a ogni salvataggio: si cambia la nota.)
    pc.E('state.projects[' + JSON.stringify(r.pid) + '].notes.html += "<p>Aggiunta dal PC</p>"; saveState();');
    const dalPc = await pc.E('creaPacchettoProgetto')(r.pid);
    const l = await tel.E('leggiPacchetto')(new tel.w.File([Buffer.from(await dalPc.blob.arrayBuffer())], 'x.dpsh.zip'));
    const c = await tel.E('confrontaConPresente')(l);
    t('divergenti → avviso, Tieni entrambi consigliato', c.relazione === 'divergenti' && c.consigliata === 'entrambi' && c.avviso);

    console.log('--- Tieni entrambi ---');
    const primaQui = senzaOrari(J(tel, 'state.projects[' + JSON.stringify(r.pid) + ']'));
    const e = await tel.E('applicaPacchetto')(l, 'entrambi');
    const copia = J(tel, 'state.projects[' + JSON.stringify(e.projId) + ']');
    t('il progetto di qui resta com è', senzaOrari(J(tel, 'state.projects[' + JSON.stringify(r.pid) + ']')) === primaQui);
    t('la copia ha un id nuovo, il nome «… (PC gg/mm)» e prove con id nuovi', e.projId !== r.pid && /^Nardò - Scuola Via Roma \(PC \d\d\/\d\d\)$/.test(copia.name)
      && Object.keys(copia.surveys).every(id => !Object.keys(pTel.surveys).includes(id)) && copia.notes.html.includes('Aggiunta dal PC'));
    t('la 3B della copia resta interpretazione della 3 della copia', Object.values(copia.surveys).filter(s => s.header.interpretazioneDi).every(s => copia.surveys[s.header.interpretazioneDi]));
  }

  console.log('--- Una foto con lo stesso id ma byte diversi ---');
  {
    const altro = await avviaApp(Object.assign({ stato: null }, conNome('PC')));
    await altro.E('savePhotoToIDB')(r.idJpeg, 'data:image/jpeg;base64,' + Buffer.from('un altra foto, non quella').toString('base64'));
    const l = await altro.E('leggiPacchetto')(new altro.w.File([buf], 'x.dpsh.zip'));
    const e = await altro.E('applicaPacchetto')(l, 'nuovo');
    const idb = altro.idb._dump('DPSH_PhotoStorageDB').photos;
    const nuovo = J(altro, 'state.projects[' + JSON.stringify(r.pid) + '].surveys[' + JSON.stringify(r.sidTemplate) + '].photos').find(p => p.id !== r.idJpeg && p.id.startsWith(r.idJpeg));
    t('quella di qui resta', idb.find(x => x.id === r.idJpeg).dataUrl.includes(Buffer.from('un altra foto, non quella').toString('base64')));
    t('quella in arrivo entra con un id nuovo, byte identici, e la prova punta a lei', e.immagini.rinominate === 1 && !!nuovo
      && sha(Buffer.from(idb.find(x => x.id === nuovo.id).dataUrl.split(',')[1], 'base64')) === sha(r.jpeg));
    altro.chiudi();
  }

  console.log('--- Foto mancanti: si dicono prima, e il manifest le elenca ---');
  {
    const senza = await avviaApp(Object.assign({ stato: STATO_V0 }, conNome('Telefono'))); // nessuna foto in IndexedDB
    const pid = senza.E('Object.keys(state.projects)[0]');
    const s = await senza.E('stimaPacchetto')(pid);
    t('la stima le trova prima di creare il pacchetto', s.fotoMancanti.length === 3);
    const c = await senza.E('creaPacchettoProgetto')(pid);
    t('e il manifest le elenca', c.manifest.fotoMancanti.length === 3);
    senza.chiudi();
  }

  console.log('--- 5. I file di oggi si importano ancora ---');
  {
    const app = await avviaApp({ stato: null });
    let errore = null;
    try { await app.E('importProjectsFromZip')(new app.w.File([buf], 'x.zip')); } catch (e) { errore = e; }
    t('lo ZIP «vecchio stile» non importa un pacchetto per sbaglio: rimanda a Ricevi', !!errore && /Ricevi/.test(errore.message) && app.E('Object.keys(state.projects).length') === 0);
    const z = await app.E('importProjectsFromZip')(new app.w.File([fs.readFileSync(path.join(__dirname, 'dati', 'progetto_v0.zip'))], 'p.zip'));
    const j = app.E('importProjectsFromJSON')(JSON.parse(fs.readFileSync(path.join(__dirname, 'dati', 'backup_stato_v0.json'), 'utf8')));
    t('ZIP e JSON di oggi (fixture v0): importati', z.importedCount === 1 && j.importedCount === 2);
    app.chiudi();
  }

  console.log('--- CONTROPROVA sull app di prima ---');
  {
    const vecchia = await avviaApp({ file: RIFERIMENTO, stato: null });
    let r0 = null, err = null;
    try { r0 = await vecchia.E('importProjectsFromZip')(new vecchia.w.File([buf], 'x.zip')); } catch (e) { err = e; }
    t('(controprova) l app di prima non sa leggere il pacchetto (errore generico, niente importato)', !!err && /Formato non riconosciuto/.test(err.message) && vecchia.E('Object.keys(state.projects).length') === 0);
    t('(controprova) e non ha niente per verificarlo', vecchia.E('typeof leggiPacchetto') === 'undefined');
    vecchia.chiudi();
  }

  tel.chiudi(); pc.chiudi();
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
