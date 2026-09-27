// GENERATORE DELLE FIXTURE DI test/dati/. Non è una suite (esegui_tutti guarda solo test/*.js).
//
// Le fixture devono essere REALISTICHE, cioè scritte dall'app e non a mano: qui si carica il file
// dell'app in jsdom (con l'IndexedDB finto di idb_finto.js) e si fa quello che farebbe un utente,
// passando dai comandi veri: si crea il progetto dalla sua finestra, si contano i colpi con +1 e
// CONFERMA, si aggiungono intervalli multipli, si assegnano gli strati dalla scheda
// dell'intervallo, si compilano i parametri avanzati col tasto dell'app, si aggiungono foto e una
// nota con un'immagine, si crea l'interpretazione «3B». Poi si esporta con le funzioni vere.
//
// L'unica aggiunta al file è una riga prima della chiusura dello script, che espone un eval
// DENTRO lo scope dell'app (window.__dpshEval): serve solo a chiamare le funzioni interne, che
// non sono globali. Nessuna riga dell'app viene cambiata.
//
//   node test/dati/genera_fixture.js PERCORSO/DPSH.html
//
// Le fixture committate sono state generate il 26/09/2026 dal dist/DPSH.html di inizio Fase 1
// (commit f861f79, sha256 7ba1b93c35462568671386b1a8caf623bb4046314c99e99eb91dbceb5bc078e1,
// APP_VERSIONE 2026.09.11), cioè dal formato dei dati di oggi, senza versioneSchema.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { JSDOM, VirtualConsole } = require('jsdom');
const { creaIndexedDB } = require('./idb_finto');

const FILE_APP = process.argv[2] || path.join(__dirname, '..', '..', 'dist', 'DPSH.html');
const USCITA = __dirname;

// Una PNG vera, piccola, di un colore: le foto delle prove nelle fixture non devono pesare.
function png(larghezza, altezza, rgb) {
    const crcTab = [];
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); crcTab[n] = c >>> 0; }
    const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTab[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const blocco = (tipo, dati) => {
        const t = Buffer.from(tipo, 'ascii');
        const l = Buffer.alloc(4); l.writeUInt32BE(dati.length);
        const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, dati])));
        return Buffer.concat([l, t, dati, c]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(larghezza, 0); ihdr.writeUInt32BE(altezza, 4); ihdr[8] = 8; ihdr[9] = 2;
    const righe = [];
    for (let y = 0; y < altezza; y++) {
        const r = Buffer.alloc(1 + larghezza * 3);
        for (let x = 0; x < larghezza; x++) {
            const striscia = ((x + y) >> 3) & 1 ? 24 : 0; // due toni, così non è un colore piatto
            r[1 + x * 3] = Math.min(255, rgb[0] + striscia); r[2 + x * 3] = Math.min(255, rgb[1] + striscia); r[3 + x * 3] = Math.min(255, rgb[2] + striscia);
        }
        righe.push(r);
    }
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), blocco('IHDR', ihdr), blocco('IDAT', zlib.deflateSync(Buffer.concat(righe))), blocco('IEND', Buffer.alloc(0))]);
}

async function main() {
    let src = fs.readFileSync(FILE_APP, 'utf8');
    const righe = src.split('\n');
    const chiusura = righe.lastIndexOf('        })();');
    if (chiusura < 0) throw new Error('chiusura dello script non trovata');
    righe.splice(chiusura, 0, '            window.__dpshEval = (codice) => eval(codice);');
    src = righe.join('\n');

    const errori = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => errori.push('JSDOM: ' + (e.message || '')));
    vc.on('error', (...a) => errori.push('console.error: ' + a.map(String).join(' ')));
    const idb = creaIndexedDB();
    const file = [];
    const dom = new JSDOM(src, {
        runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'https://fixture.test/',
        beforeParse(w) {
            w.indexedDB = idb;
            w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
            w.navigator.vibrate = () => true;
            if (!w.TextEncoder) w.TextEncoder = TextEncoder;
            if (!w.TextDecoder) w.TextDecoder = TextDecoder;
            w.alert = () => {};
            w.Element.prototype.scrollIntoView = function () {};
            const zero = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} });
            const lista = () => Object.assign([zero()], { item: () => zero() });
            w.document.elementFromPoint = () => null;
            w.document.caretRangeFromPoint = () => null;
            w.Text.prototype.getClientRects = function () { return lista(); };
            w.Text.prototype.getBoundingClientRect = zero;
            w.Range.prototype.getClientRects = function () { return lista(); };
            w.Range.prototype.getBoundingClientRect = zero;
            // Gli export finiscono qui invece che nei Download.
            let ultimo = null;
            w.URL.createObjectURL = (b) => { ultimo = b; return 'blob:fixture-' + file.length; };
            w.URL.revokeObjectURL = () => {};
            w.HTMLAnchorElement.prototype.click = function () { if (String(this.href).startsWith('blob:fixture-')) file.push({ nome: this.download, blob: ultimo }); };
        }
    });
    const w = dom.window, d = w.document;
    const $ = (id) => d.getElementById(id);
    const attesa = (ms) => new Promise(r => setTimeout(r, ms));
    await attesa(800);
    const E = w.__dpshEval;
    if (typeof E !== 'function') throw new Error('app non avviata: ' + errori.join(' | '));

    const chiudiDialogo = () => { if ($('appDialog') && $('appDialog').classList.contains('open')) $('appDialogOk').click(); };
    async function intervallo(n) {
        for (let i = 0; i < n; i++) { $('btnPlus').click(); await attesa(2); }
        $('btnConfirmStepAction').click(); await attesa(15);
    }
    async function assegna(idx, id) {
        E('openEditModal(' + idx + ')'); await attesa(20);
        $('selModalLithology').value = id; $('btnModalSave').click(); await attesa(30);
    }
    async function foto(nome, rgb) {
        const f = new w.File([png(48, 36, rgb)], nome + '.png', { type: 'image/png' });
        E('handlePhotoFileSelected')(f, null);
        await attesa(300);
        // La foto senza coordinate apre il recupero GPS: lo si chiude, la foto resta senza.
        if ($('modalPhotoGpsFallback') && $('modalPhotoGpsFallback').classList.contains('open')) $('btnClosePhotoGpsFallbackX').click();
    }
    async function nuovaProva(localita) {
        E('openNewSurveyModal()'); await attesa(20);
        $('txtNewLocalita').value = localita; $('btnNewSurveyConfirm').click(); await attesa(50);
    }

    // ---- Progetto A: Nardò, tre prove più l'interpretazione 3B ----
    E('openNewProjectModal()');
    $('txtProjName').value = 'Nardò - Scuola Via Roma'; $('txtProjComune').value = 'Nardò';
    $('txtProjCommittente').value = 'Comune di Nardò'; $('txtProjDate').value = '2026-09-14';
    $('btnConfirmNewProject').click(); await attesa(80);
    for (const n of [3, 5, 4, 7, 9, 12, 10, 14]) await intervallo(n);
    E('openBulkImportModal()'); await attesa(20);
    $('txtBulkImportData').value = '15 18 16 20 22 19 25 28 30 27 24 26';
    $('txtBulkImportData').dispatchEvent(new w.Event('input'));
    d.querySelector('input[name="optImportMode"][value="append"]').checked = true;
    $('btnConfirmBulkImport').click(); await attesa(80); chiudiDialogo();
    E('openQuickFaldaModal()'); $('numQuickFaldaDa').value = '2.40'; $('numQuickFaldaA').value = '2.40'; $('btnQuickFaldaSave').click(); await attesa(20);
    // Coordinate come le scrive il GPS (qui non c'è un GPS da interrogare).
    E('state.header.lat = 40.19741; state.header.lng = 17.99213; state.header.alt = 42; state.header.acc = 4.5; state.header.localita = "Cortile interno, lato nord"; saveState(); updateUI();');
    E('openEditModal(5)'); await attesa(20); $('txtModalNote').value = 'Rifiuto parziale, trovante calcareo'; $('btnModalSave').click(); await attesa(30);
    E('openStratiModal()'); await attesa(30); $('btnAddStrato').click(); await attesa(5); $('btnAddStrato').click(); await attesa(10);
    // I nomi si scrivono nei campi della lista: qui direttamente, è lo stesso dato.
    E('state.strati[0].name = "Terreno vegetale limoso"; state.strati[1].name = "Sabbia limosa mediamente addensata"; state.strati[2].name = "Calcarenite tenera"; saveState(); closeStratiModal();');
    await attesa(20);
    let ids = JSON.parse(E('JSON.stringify(state.strati.map(s => s.id))'));
    await assegna(0, ids[0]); await assegna(4, ids[1]); await assegna(12, ids[2]);
    E('openStratiModal()'); await attesa(30); $('btnAutoCompilaTuttiStrati').click(); await attesa(200); chiudiDialogo();
    if ($('modalManageStrati').classList.contains('open')) E('closeStratiModal()');
    await foto('P1 foto1', [139, 90, 43]);
    await foto('P1 foto2', [85, 107, 47]);

    await nuovaProva('Cortile interno, lato sud');
    for (const n of [2, 4, 6, 8, 8, 11, 13, 15, 18, 21]) await intervallo(n);
    E('state.header.lat = 40.19702; state.header.lng = 17.99251; saveState();');

    await nuovaProva('Area parcheggio');
    for (const n of [1, 3, 3, 5, 9, 14, 20, 26, 31, 35, 40, 50]) await intervallo(n);
    await assegna(0, ids[0]); await assegna(3, ids[1]); await assegna(8, ids[2]);
    await foto('P3 foto', [30, 58, 95]);
    E('duplicaProvaComeInterpretazione(state.currentSurveyId)'); await attesa(50);
    await assegna(3, ''); await assegna(6, ids[1]);

    // Nota di progetto con un'immagine incorporata
    await E('apriNoteProgetto(state.currentProjectId)'); await attesa(100);
    E('editorNote.commands.setContent("<h2>Sopralluogo del 14/09</h2><p>Accesso dal cancello di <strong>Via Roma</strong>. Falda intercettata nella prova 1 a circa 2,40 m.</p><p>Schizzo della posizione delle prove:</p>", { emitUpdate: true }); editorNote.commands.focus("end");');
    E('inserisciImmagineDataUrlNellaNota')('data:image/png;base64,' + png(40, 30, [68, 85, 102]).toString('base64'));
    await attesa(100);
    E('chiudiNoteProgetto()'); await attesa(100);

    // ---- Progetto B: Copertino, due prove ----
    E('switchView("home")'); await attesa(50);
    E('openNewProjectModal()');
    $('txtProjName').value = ''; $('txtProjComune').value = 'Copertino';
    $('txtProjCommittente').value = 'Edil Salento S.r.l.'; $('txtProjDate').value = '2026-09-20';
    $('btnConfirmNewProject').click(); await attesa(80);
    E('state.header.localita = "Lotto 7, Via delle Cesine"; saveState();');
    for (const n of [4, 6, 6, 9, 11, 10, 12, 16, 19, 22, 24]) await intervallo(n);
    E('openStratiModal()'); await attesa(30); $('btnAddStrato').click(); await attesa(10);
    E('state.strati[0].name = "Limo argilloso"; state.strati[1].name = "Sabbia fine addensata"; saveState(); closeStratiModal();');
    ids = JSON.parse(E('JSON.stringify(state.strati.map(s => s.id))'));
    await assegna(6, ids[1]);
    await nuovaProva('Lotto 9');
    for (const n of [3, 5, 8, 8, 10, 13, 17, 21]) await intervallo(n);
    await assegna(4, ids[1]);
    E('switchView("home")'); await attesa(100);

    // ---- Salvataggio su file ----
    const scrivi = (nome, dati) => { fs.writeFileSync(path.join(USCITA, nome), dati); console.log('scritto', nome, dati.length, 'byte'); };
    const statoSalvato = w.localStorage.getItem('dpsh_app_state');
    scrivi('stato_v0.json', JSON.stringify(JSON.parse(statoSalvato), null, 2) + '\n');
    scrivi('idb_v0.json', JSON.stringify({ DPSH_PhotoStorageDB: { version: 2, stores: idb._dump('DPSH_PhotoStorageDB') } }, null, 2) + '\n');

    const pA = E('Object.keys(state.projects)[0]');
    await E('exportSingleJSON()');
    E('exportGlobalJSONBackup()');
    await E('exportProjectJSON')(pA);
    await E('exportProjectZip')(pA);
    await E('exportGlobalZip()');
    await attesa(100);
    const nomi = ['backup_stato_v0.json', 'backup_archivio_v0.json', 'progetto_v0.json', 'progetto_v0.zip', 'backup_completo_v0.zip'];
    if (file.length !== nomi.length) throw new Error('export attesi ' + nomi.length + ', catturati ' + file.length);
    for (let i = 0; i < file.length; i++) {
        const buf = Buffer.from(await file[i].blob.arrayBuffer());
        scrivi(nomi[i], buf);
        console.log('   (l\'app lo chiamava «' + file[i].nome + '»)');
    }
    const veri = errori.filter(e => !/Could not load|Not implemented/.test(e));
    if (veri.length) console.log('Errori durante la generazione:\n  ' + veri.join('\n  '));
    w.close();
}

main().catch(e => { console.error(e); process.exit(1); });
