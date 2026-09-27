// L'APP INTERA IN JSDOM, per le suite della Fase 1 (dati salvati, migrazioni, integrità).
//
// Come note_app_viva.js: il file vero, acceso in un DOM headless. In più:
//  - IndexedDB finto ma funzionante (idb_finto.js), così foto, copie e quarantena esistono davvero;
//  - gli export e i download finiscono in `scaricati` invece che nel disco;
//  - window.__dpshEval: un eval DENTRO lo scope dell'app, aggiunto alla COPIA caricata qui (il file
//    su disco non cambia). Serve a leggere lo stato e a chiamare le funzioni interne, che non sono
//    globali. Le azioni dell'utente si fanno lo stesso coi clic, dove conta come ci si arriva.
//
//   const { avviaApp } = require('./dati/app_in_jsdom');
//   const app = await avviaApp({ stato: '{"projects":{}}' });   // stato: testo di localStorage o null
//   app.E('state.projects')                                     // dentro l'app
//   app.chiudi();
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { creaIndexedDB } = require('./idb_finto');

const DIST = path.join(__dirname, '..', '..', 'dist', 'DPSH.html');
const RIFERIMENTO = path.join(__dirname, '..', '..', 'riferimento', 'Modulo1_integrato_2026-09-11.html');
const attesa = (ms) => new Promise(r => setTimeout(r, ms));

function conEvalInterno(src) {
    const righe = src.split('\n');
    const chiusura = righe.lastIndexOf('        })();');
    if (chiusura < 0) throw new Error('chiusura dello script non trovata');
    righe.splice(chiusura, 0, '            window.__dpshEval = (codice) => eval(codice);');
    return righe.join('\n');
}

async function avviaApp(opzioni = {}) {
    const file = opzioni.file || DIST;
    const src = conEvalInterno(fs.readFileSync(file, 'utf8'));
    const errori = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => errori.push('JSDOM: ' + (e.message || '')));
    vc.on('error', (...a) => errori.push('console.error: ' + a.map(String).join(' ')));
    const avvisi = [];
    vc.on('warn', (...a) => avvisi.push(a.map(String).join(' ')));
    ['log', 'info', 'debug'].forEach(k => vc.on(k, () => {}));
    const idb = opzioni.idb || creaIndexedDB();
    const scaricati = [];
    const dom = new JSDOM(src, {
        runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'https://locale.test/',
        beforeParse(w) {
            if (opzioni.stato !== undefined && opzioni.stato !== null) w.localStorage.setItem('dpsh_app_state', opzioni.stato);
            w.indexedDB = idb;
            w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
            w.navigator.vibrate = () => true;
            if (!w.TextEncoder) w.TextEncoder = TextEncoder;
            if (!w.TextDecoder) w.TextDecoder = TextDecoder;
            w.Element.prototype.scrollIntoView = function () {};
            const zero = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} });
            const lista = () => Object.assign([zero()], { item: () => zero() });
            w.document.elementFromPoint = () => null;
            w.document.caretRangeFromPoint = () => null;
            w.Text.prototype.getClientRects = function () { return lista(); };
            w.Text.prototype.getBoundingClientRect = zero;
            w.Range.prototype.getClientRects = function () { return lista(); };
            w.Range.prototype.getBoundingClientRect = zero;
            let ultimo = null;
            w.URL.createObjectURL = (b) => { ultimo = b; return 'blob:test-' + scaricati.length; };
            w.URL.revokeObjectURL = () => {};
            w.HTMLAnchorElement.prototype.click = function () { if (String(this.href).startsWith('blob:test-')) scaricati.push({ nome: this.download, blob: ultimo }); };
            if (opzioni.primaDellApp) opzioni.primaDellApp(w);
        }
    });
    const w = dom.window, d = w.document;
    // attesaAvvio: 0 vuol dire subito, senza cedere il turno: serve a guardare lo stato
    // nell'istante dopo l'avvio, prima che qualsiasi operazione asincrona finisca.
    if (opzioni.attesaAvvio !== 0) await attesa(opzioni.attesaAvvio || 900);
    const E = w.__dpshEval;
    if (typeof E !== 'function') throw new Error('app non avviata: ' + errori.join(' | '));
    const dialogo = () => {
        const box = d.getElementById('appDialog');
        if (!box || !box.classList.contains('open')) return null;
        return {
            titolo: d.getElementById('appDialogTitleText').textContent,
            testo: d.getElementById('appDialogMessage').textContent,
            ok: d.getElementById('appDialogOk'), annulla: d.getElementById('appDialogCancel'),
            extra: d.getElementById('appDialogExtra'), extra2: d.getElementById('appDialogExtra2')
        };
    };
    return {
        w, d, E, idb, errori, avvisi, scaricati, dialogo, attesa,
        salvato: () => w.localStorage.getItem('dpsh_app_state'),
        chiudi: () => w.close()
    };
}

/** Un IndexedDB come quello di un telefono in uso con i dati delle fixture: le foto e
 * l'immagine della nota di stato_v0.json ci sono. Senza, il controllo di integrità (giustamente)
 * segnala le foto mancanti all'avvio. */
function telefonoV0() {
    const idb = JSON.parse(fs.readFileSync(path.join(__dirname, 'idb_v0.json'), 'utf8'));
    return creaIndexedDB({ DPSH_PhotoStorageDB: idb.DPSH_PhotoStorageDB });
}

module.exports = { avviaApp, attesa, telefonoV0, DIST, RIFERIMENTO };
