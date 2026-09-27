// LE LIBRERIE CHE VIAGGIANO COL PROGETTO (Fase 2, pezzo 044a) E I PUNTI DEL §6 DELLA FASE 1.
//
// Il report di un progetto dipende dai template (di report, dell'indice, dell'introduzione) e dalle
// voci dell'archivio litologico: stanno nelle librerie del dispositivo, non nel progetto. Fino alla
// Fase 1 nessun file di progetto li portava, l'import del JSON dello stato intero li ignorava e il
// Backup completo JSON portava solo l'archivio (con doppioni «(Importato)» anche per voci identiche).
// Qui, per ogni formato di oggi (JSON e ZIP del progetto, ZIP dell'archivio, JSON dello stato, Backup
// completo JSON):
//  - template e voci usati arrivano, identici, e il progetto li usa;
//  - quelli già presenti identici si riusano (niente doppioni);
//  - quelli omonimi ma diversi entrano come copia rinominata e NESSUNO dei due si sovrascrive;
// e poi: le immagini di htmlPrimaDelMotore viaggiano, lo ZIP dice quando mancano delle foto invece di
// saltarle in silenzio (e scrive una volta sola la foto condivisa fra 3 e 3B), i file prendono il nome
// del progetto e non del comune. Controprove sull'app di prima (riferimento/).
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');
const { arricchisci } = require('./dati/progetto_ricco');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const J = (app, espr) => JSON.parse(app.E('JSON.stringify(' + espr + ')'));
const senzaDate = (v) => { const c = JSON.parse(JSON.stringify(v)); delete c.id; delete c.createdAt; delete c.updatedAt; delete c.builtIn; return c; };
const ultimo = async (app) => app.scaricati[app.scaricati.length - 1];

async function telefono() {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  const r = await arricchisci(app);
  return { app, r };
}

/** Controlla, sul dispositivo d'arrivo, che il progetto importato usi template e voci identici. */
function controllaArrivo(nome, pc, tel, r, pidArrivo) {
  const p = J(pc, 'state.projects[' + JSON.stringify(pidArrivo) + ']');
  const sid = Object.keys(p.surveys)[1];
  const tpl = J(pc, 'state.reportTemplates[' + JSON.stringify(p.surveys[sid].reportTemplateId) + ']');
  const tplTel = J(tel, 'state.reportTemplates.tpl_rossi');
  t(nome + ': il template di report della prova arriva, identico (immagine d intestazione compresa)',
    !!tpl && JSON.stringify(senzaDate(tpl)) === JSON.stringify(senzaDate(tplTel)) && tpl.pages[0].header.imageDataUrl === r.intestazione);
  const idx = J(pc, 'state.indiceTemplates[' + JSON.stringify(p.indiceTemplateId) + ']');
  t(nome + ': il template dell indice arriva e il progetto lo usa', !!idx && idx.titoloTesto === 'Sommario' && pc.E('getIndiceTemplateIdPerProgetto(state.projects[' + JSON.stringify(pidArrivo) + '])') === p.indiceTemplateId);
  t(nome + ': l introduzione punta al template giusto', p.introduzione && p.introduzione.templateId === p.surveys[sid].reportTemplateId);
  const strato = p.strati.find(s => s.sourceArchiveId);
  const voce = strato && J(pc, 'state.lithologyArchive[' + JSON.stringify(strato.sourceArchiveId) + ']');
  t(nome + ': la voce d archivio dello strato arriva, e il collegamento è valido', !!voce && voce.name === strato.name && pc.E('stratoHaCollegamentoArchivioValido')(p.strati.find(s => s.sourceArchiveId)));
  t(nome + ': il report della prova usa quel template (getReportTemplateIdPerProva)', pc.E('getReportTemplateIdPerProva')(p.surveys[sid]) === p.surveys[sid].reportTemplateId);
}

(async () => {
  console.log('--- JSON del progetto: su un PC vuoto ---');
  let fileJson, fileZip, fileStato;
  {
    const { app: tel, r } = await telefono();
    await tel.E('exportProjectJSON')(r.pid);
    await attesa(100);
    const f = await ultimo(tel);
    fileJson = await f.blob.text();
    t('il nome del file è quello del progetto, non del comune', f.nome === 'Progetto_Nardò_-_Scuola_Via_Roma_Backup.json');
    const dati = JSON.parse(fileJson);
    t('il file porta le librerie usate, e solo quelle', dati.librerie && Object.keys(dati.librerie.reportTemplates).sort().join() === 'classico,tpl_rossi'
      && Object.keys(dati.librerie.indiceTemplates).join() === 'idx_rossi' && Object.keys(dati.librerie.lithologyArchive).join() === r.idArchivio);
    t('la nota di prima del motore esce con la sua immagine', dati.notes.htmlPrimaDelMotore.includes(r.immaginePrima.slice(0, 120)));
    const pc = await avviaApp({ stato: null });
    const esito = pc.E('importProjectsFromJSON')(JSON.parse(fileJson));
    await attesa(300);
    t('importato', esito.importedCount === 1 && esito.librerie && esito.librerie.nuove.length === 3);
    controllaArrivo('JSON', pc, tel, r, r.pid);
    t('le librerie non restano appiccicate al progetto', J(pc, 'Object.keys(state.projects[' + JSON.stringify(r.pid) + '])').indexOf('librerie') === -1);
    const note = pc.idb._dump('DPSH_PhotoStorageDB').noteImages;
    t('l immagine di htmlPrimaDelMotore arriva in IndexedDB', note.some(n => n.id === 'nimg_prima_1' && n.dataUrl === r.immaginePrima));
    pc.chiudi();

    console.log('--- ZIP del progetto ---');
    await tel.E('exportProjectZip')(r.pid);
    await attesa(100);
    const z = await ultimo(tel);
    fileZip = z.blob;
    t('il nome del file è quello del progetto', z.nome === 'Progetto_Nardò_-_Scuola_Via_Roma_Backup.zip');
    const voci = await tel.E('readZipStoreOnly')(z.blob);
    const nomi = voci.map(v => v.name);
    t('dentro c è librerie.json', nomi.includes('librerie.json'));
    t('la foto condivisa fra la 3 e la 3B è scritta una volta sola', nomi.filter(n => /^foto\//.test(n)).length === 4);
    t('e l immagine della nota di prima c è', nomi.includes('note_immagini/nimg_prima_1.png'));
    t('nessun avviso: tutte le foto c erano', !tel.dialogo());
    const pc2 = await avviaApp({ stato: null });
    await pc2.E('importProjectsFromZip')(z.blob);
    await attesa(300);
    controllaArrivo('ZIP', pc2, tel, r, r.pid);
    t('ZIP: la foto condivisa arriva a entrambe le prove', J(pc2, 'Object.values(state.projects)[0].surveys').constructor === Object
      && pc2.idb._dump('DPSH_PhotoStorageDB').photos.length >= 4);
    pc2.chiudi();

    console.log('--- ZIP dell archivio intero ---');
    await tel.E('exportGlobalZip')();
    await attesa(100);
    const g = await ultimo(tel);
    const pc3 = await avviaApp({ stato: null });
    await pc3.E('importProjectsFromZip')(g.blob);
    await attesa(300);
    controllaArrivo('ZIP archivio', pc3, tel, r, r.pid);
    pc3.chiudi();

    console.log('--- JSON dello stato intero (Esporta › JSON della prova), importato dalla Home ---');
    await tel.E('exportSingleJSON()');
    await attesa(100);
    const s = await ultimo(tel);
    fileStato = await s.blob.text();
    t('il nome del file è quello del progetto aperto', s.nome === 'Prova_Nardò_-_Scuola_Via_Roma_Backup.json');
    const pc4 = await avviaApp({ stato: null });
    pc4.E('importProjectsFromJSON')(JSON.parse(fileStato));
    await attesa(300);
    controllaArrivo('JSON dello stato', pc4, tel, r, r.pid);
    pc4.chiudi();

    console.log('--- Backup completo JSON: librerie, nessun doppione, progetto aperto sostituito ---');
    await tel.E('exportGlobalJSONBackup()');
    await attesa(100);
    const backup = await (await ultimo(tel)).blob.text();
    // Lo stesso telefono reimporta il suo backup, col progetto ricco aperto.
    tel.E('state.projects[' + JSON.stringify(r.pid) + '].name = "Nome cambiato dopo il backup"; saveState();');
    const archivioPrima = J(tel, 'Object.keys(state.lithologyArchive)').length;
    const templatePrima = J(tel, 'Object.keys(state.reportTemplates)').length;
    tel.E('importGlobalJSONBackup')(new tel.w.File([backup], 'backup.json'));
    await attesa(300);
    clic(tel, tel.dialogo() && tel.dialogo().ok);
    await attesa(500);
    t('le voci d archivio identiche si riusano: nessun doppione «(Importato)»', J(tel, 'Object.keys(state.lithologyArchive)').length === archivioPrima
      && !J(tel, 'Object.values(state.lithologyArchive).map(v => v.name)').some(n => /Importato/.test(n)));
    t('e i template identici pure', J(tel, 'Object.keys(state.reportTemplates)').length === templatePrima);
    const messaggio = tel.dialogo() ? tel.dialogo().testo : '';
    clic(tel, tel.dialogo() && tel.dialogo().ok);
    t('il progetto aperto è stato sostituito da quello del file', tel.E('state.projects[' + JSON.stringify(r.pid) + '].name') === 'Nardò - Scuola Via Roma');
    tel.E('saveState()');
    t('e il salvataggio successivo non lo riporta indietro (stato attivo riallineato)', JSON.parse(tel.salvato()).projects[r.pid].name === 'Nardò - Scuola Via Roma'
      && JSON.parse(tel.salvato()).projects[r.pid].surveys[tel.E('state.currentSurveyId')].logs.length === tel.E('state.logs.length'));
    t('(il messaggio dice della sostituzione)', /sostituito/.test(messaggio));
    tel.chiudi();
  }

  console.log('--- Template omonimi ma diversi: nessuno si sovrascrive ---');
  {
    const pc = await avviaApp({ stato: null });
    // Il PC ha già un «Modello Rossi» suo (stesso id, contenuto diverso) e un Classico ritoccato.
    pc.E(`(() => {
      const t = JSON.parse(JSON.stringify(state.reportTemplates.classico));
      t.id = 'tpl_rossi'; t.name = 'Modello Rossi'; delete t.builtIn; t.pages[0].footer.text = 'Versione del PC';
      state.reportTemplates.tpl_rossi = t;
      state.reportTemplates.classico.margins.top = 20;
      const i = JSON.parse(JSON.stringify(state.indiceTemplates.idx_classico));
      i.id = 'idx_altro'; i.name = 'Indice Rossi'; delete i.builtIn; i.font = 'Arial';
      state.indiceTemplates.idx_altro = i;
      saveState();
    })()`);
    const tuttoPrima = J(pc, '{ r: state.reportTemplates, i: state.indiceTemplates }');
    const esito = pc.E('importProjectsFromJSON')(JSON.parse(fileJson));
    const dopo = J(pc, '{ r: state.reportTemplates, i: state.indiceTemplates }');
    t('i template del PC restano identici, tutti', Object.keys(tuttoPrima.r).every(k => JSON.stringify(tuttoPrima.r[k]) === JSON.stringify(dopo.r[k]))
      && Object.keys(tuttoPrima.i).every(k => JSON.stringify(tuttoPrima.i[k]) === JSON.stringify(dopo.i[k])));
    const p = J(pc, 'state.projects[' + JSON.stringify(Object.keys(JSON.parse(fileJson).surveys).length ? JSON.parse(fileJson).id : '') + ']');
    const sid = Object.keys(p.surveys)[1];
    const copia = dopo.r[p.surveys[sid].reportTemplateId];
    t('il progetto punta a una copia nuova «Modello Rossi (importato)»', p.surveys[sid].reportTemplateId !== 'tpl_rossi' && copia && copia.name === 'Modello Rossi (importato)' && copia.pages[0].footer.text === 'Studio Rossi · relazione geotecnica');
    const altra = Object.keys(p.surveys)[0];
    const classicoCopia = dopo.r[p.surveys[altra].reportTemplateId];
    t('il Classico diverso entra come copia e le prove che lo usavano la usano', !!classicoCopia && classicoCopia.name === 'Classico (importato)' && !classicoCopia.builtIn && classicoCopia.margins.top === 14);
    t('l indice omonimo diverso: copia «Indice Rossi (importato)»', dopo.i[p.indiceTemplateId] && dopo.i[p.indiceTemplateId].name === 'Indice Rossi (importato)' && dopo.i[p.indiceTemplateId].font === 'Georgia');
    t('il messaggio lo dice', /Modello Rossi \(importato\)/.test(pc.E('testoLibrerieAccolte')(esito.librerie)));
    // Lo stesso file una seconda volta: la copia di prima è identica, si riusa.
    const n = Object.keys(dopo.r).length;
    pc.E('importProjectsFromJSON')(JSON.parse(fileJson));
    t('reimportando lo stesso file le copie si riusano, niente di nuovo nelle librerie', J(pc, 'Object.keys(state.reportTemplates)').length === n);
    pc.chiudi();
  }

  console.log('--- Lo ZIP dice quando mancano delle foto ---');
  {
    const app = await avviaApp({ stato: STATO_V0 }); // nessuna foto in IndexedDB
    // All'avvio il controllo dei dati segnala già le foto mancanti: lo si chiude.
    if (app.dialogo() && app.dialogo().titolo === 'Controllo dei dati') { clic(app, app.dialogo().ok); await attesa(100); }
    const pid = app.E('Object.keys(state.projects)[0]');
    await app.E('exportProjectZip')(pid);
    await attesa(200);
    const d = app.dialogo();
    t('avviso: le foto che non ci sono non sono nel file', !!d && /3 foto citate dalle prove non sono state trovate/.test(d.testo));
    app.chiudi();
  }

  console.log('--- File di prima (fixture v0): si importano come prima ---');
  {
    const app = await avviaApp({ stato: null });
    const r = app.E('importProjectsFromJSON')(JSON.parse(fs.readFileSync(path.join(__dirname, 'dati', 'progetto_v0.json'), 'utf8')));
    t('progetto JSON v0: importato, nessuna libreria toccata', r.importedCount === 1 && r.librerie === null && J(app, 'Object.keys(state.reportTemplates)').join() === 'classico');
    const z = await app.E('importProjectsFromZip')(new app.w.File([fs.readFileSync(path.join(__dirname, 'dati', 'backup_completo_v0.zip'))], 'b.zip'));
    t('ZIP completo v0: importato', z.importedCount === 2);
    app.chiudi();
  }

  console.log('--- CONTROPROVE sull app di prima ---');
  {
    const vecchia = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0, idb: telefonoV0() });
    const r = await arricchisci(vecchia);
    await vecchia.E('exportProjectJSON')(r.pid);
    await attesa(100);
    const f = await ultimo(vecchia);
    const dati = JSON.parse(await f.blob.text());
    t('(controprova) il JSON del progetto non portava nessun template', !dati.librerie && !JSON.stringify(dati).includes('Studio Rossi'));
    t('(controprova) e il nome del file era quello del comune', f.nome === 'Progetto_Nardò_Backup.json');
    const pc = await avviaApp({ file: RIFERIMENTO, stato: null });
    pc.E('importProjectsFromJSON')(JSON.parse(fileStato));
    t('(controprova) il JSON dello stato intero importato dalla Home ignorava i template', !J(pc, 'Object.keys(state.reportTemplates)').includes('tpl_rossi'));
    pc.chiudi();
    vecchia.chiudi();
    const senzaFoto = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0 });
    if (senzaFoto.dialogo()) { clic(senzaFoto, senzaFoto.dialogo().ok); await attesa(100); }
    await senzaFoto.E('exportProjectZip')(senzaFoto.E('Object.keys(state.projects)[0]'));
    await attesa(200);
    t('(controprova) lo ZIP senza foto usciva senza dire niente', !senzaFoto.dialogo());
    senzaFoto.chiudi();
  }

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
