// UN INDEXEDDB FINTO, IN MEMORIA, PER JSDOM.
//
// jsdom non ha IndexedDB. Le suite storiche lo sostituiscono con un open() che fallisce sempre:
// basta per le schermate, ma non per quello che la Fase 1 deve verificare (foto e immagini delle
// note che esistono davvero, testo messo in quarantena, copie automatiche scritte prima di una
// migrazione). Qui c'è quel tanto di IndexedDB che l'app usa: open con onupgradeneeded,
// createObjectStore con keyPath, transazioni con put/get/getAll/getAllKeys/delete/clear/count,
// oncomplete/onerror/onabort, deleteDatabase e databases().
//
// Tutto è asincrono come nel browser (le risposte arrivano con setTimeout), perché il codice
// dell'app è scritto per quello: una versione sincrona nasconderebbe proprio gli errori di
// ordine che si vogliono trovare.
//
//   const { creaIndexedDB } = require('./dati/idb_finto');
//   const idb = creaIndexedDB();            // un "disco" vuoto
//   w.indexedDB = idb;                      // in beforeParse di JSDOM
//   idb._dump('DPSH_PhotoStorageDB')        // { photos: [...], noteImages: [...] }
//   idb._guasto = { scritture: true }       // da qui in poi ogni transazione readwrite fallisce

function clona(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
const dopo = (fn) => setTimeout(fn, 0);

function creaIndexedDB(iniziale) {
    // databases: nome -> { version, stores: nome -> { keyPath, righe: Map } }
    const databases = new Map();
    const idb = { _databases: databases, _guasto: {} };

    function nomiStore(dbDati) {
        const nomi = Array.from(dbDati.stores.keys());
        return { contains: (n) => dbDati.stores.has(n), get length() { return nomi.length; }, item: (i) => nomi[i] };
    }

    function creaDb(nome, dbDati, inUpgrade) {
        return {
            name: nome,
            get version() { return dbDati.version; },
            get objectStoreNames() { return nomiStore(dbDati); },
            createObjectStore(n, opzioni) {
                if (!inUpgrade.attivo) throw new Error('InvalidStateError: createObjectStore fuori da onupgradeneeded');
                dbDati.stores.set(n, { keyPath: (opzioni && opzioni.keyPath) || null, righe: new Map() });
                return {};
            },
            transaction(nomi, modo) {
                const elenco = Array.isArray(nomi) ? nomi : [nomi];
                elenco.forEach(n => { if (!dbDati.stores.has(n)) throw new Error('NotFoundError: store ' + n); });
                return creaTransazione(dbDati, elenco, modo || 'readonly');
            },
            close() {}
        };
    }

    function creaTransazione(dbDati, elenco, modo) {
        const tx = { oncomplete: null, onerror: null, onabort: null, error: null, mode: modo };
        let inSospeso = 0;
        let chiusa = false;
        const guasta = modo === 'readwrite' && idb._guasto.scritture;
        function forseCompleta() {
            dopo(() => {
                if (chiusa || inSospeso > 0) return;
                chiusa = true;
                if (guasta) {
                    tx.error = new Error('QuotaExceededError (finto)');
                    if (tx.onerror) tx.onerror({ target: tx });
                    if (tx.onabort) tx.onabort({ target: tx });
                    return;
                }
                if (tx.oncomplete) tx.oncomplete({ target: tx });
            });
        }
        function richiesta(esegui) {
            const req = { onsuccess: null, onerror: null, result: undefined, error: null };
            inSospeso++;
            dopo(() => {
                try {
                    if (guasta) throw new Error('QuotaExceededError (finto)');
                    req.result = esegui();
                    if (req.onsuccess) req.onsuccess({ target: req });
                } catch (e) {
                    req.error = e;
                    if (req.onerror) req.onerror({ target: req });
                }
                inSospeso--;
                forseCompleta();
            });
            return req;
        }
        tx.objectStore = (n) => {
            if (!elenco.includes(n)) throw new Error('NotFoundError: store ' + n + ' non nella transazione');
            const st = dbDati.stores.get(n);
            const chiave = (v, k) => (st.keyPath ? v[st.keyPath] : k);
            const scrivibile = () => { if (modo !== 'readwrite') throw new Error('ReadOnlyError'); };
            return {
                put: (v, k) => richiesta(() => { scrivibile(); const c = chiave(v, k); st.righe.set(c, clona(v)); return c; }),
                add: (v, k) => richiesta(() => { scrivibile(); const c = chiave(v, k); if (st.righe.has(c)) throw new Error('ConstraintError'); st.righe.set(c, clona(v)); return c; }),
                get: (k) => richiesta(() => clona(st.righe.get(k))),
                getAll: () => richiesta(() => Array.from(st.righe.values()).map(clona)),
                getAllKeys: () => richiesta(() => Array.from(st.righe.keys())),
                count: () => richiesta(() => st.righe.size),
                delete: (k) => richiesta(() => { scrivibile(); st.righe.delete(k); }),
                clear: () => richiesta(() => { scrivibile(); st.righe.clear(); })
            };
        };
        // Una transazione senza richieste si chiude comunque, come nel browser.
        forseCompleta();
        return tx;
    }

    idb.open = (nome, versione) => {
        const req = { onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null, result: null, error: null };
        dopo(() => {
            if (idb._guasto.apertura) {
                req.error = new Error('IndexedDB non disponibile (finto)');
                if (req.onerror) req.onerror({ target: req });
                return;
            }
            let dbDati = databases.get(nome);
            const vecchia = dbDati ? dbDati.version : 0;
            const nuova = versione || vecchia || 1;
            if (nuova < vecchia) {
                req.error = new Error('VersionError');
                if (req.onerror) req.onerror({ target: req });
                return;
            }
            if (!dbDati) { dbDati = { version: 0, stores: new Map() }; databases.set(nome, dbDati); }
            const inUpgrade = { attivo: false };
            const db = creaDb(nome, dbDati, inUpgrade);
            req.result = db;
            if (nuova > vecchia) {
                dbDati.version = nuova;
                inUpgrade.attivo = true;
                try { if (req.onupgradeneeded) req.onupgradeneeded({ target: req, oldVersion: vecchia, newVersion: nuova }); }
                finally { inUpgrade.attivo = false; }
            }
            if (req.onsuccess) req.onsuccess({ target: req });
        });
        return req;
    };
    idb.deleteDatabase = (nome) => {
        const req = { onsuccess: null, onerror: null, onblocked: null };
        dopo(() => { databases.delete(nome); if (req.onsuccess) req.onsuccess({ target: req }); });
        return req;
    };
    idb.databases = async () => Array.from(databases.entries()).map(([name, d]) => ({ name, version: d.version }));

    /** Tutto il contenuto di un database, store per store: serve alle suite per guardare cosa
     * l'app ha scritto davvero, e al generatore delle fixture per salvarlo su file. */
    idb._dump = (nome) => {
        const d = databases.get(nome);
        if (!d) return null;
        const out = {};
        d.stores.forEach((st, n) => { out[n] = Array.from(st.righe.values()).map(clona); });
        return out;
    };
    /** Il contrario di _dump: prepara un database già pieno, come su un telefono in uso. */
    idb._carica = (nome, versione, contenuto, chiavi) => {
        const d = { version: versione, stores: new Map() };
        Object.keys(contenuto || {}).forEach(n => {
            const keyPath = (chiavi && chiavi[n] !== undefined) ? chiavi[n] : 'id';
            const righe = new Map();
            (contenuto[n] || []).forEach(v => righe.set(v[keyPath], clona(v)));
            d.stores.set(n, { keyPath, righe });
        });
        databases.set(nome, d);
    };

    if (iniziale) Object.keys(iniziale).forEach(n => idb._carica(n, iniziale[n].version, iniziale[n].stores));
    return idb;
}

module.exports = { creaIndexedDB };
