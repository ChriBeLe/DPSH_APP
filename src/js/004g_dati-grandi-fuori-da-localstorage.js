            // ============== DATI GRANDI FUORI DA LOCALSTORAGE (prestazioni, passo 2) ==============
            // Carte intestate, immagini dei template, DTM e simili sono stringhe da centinaia di KB:
            // stavano dentro dpsh_app_state e ogni tocco le riscriveva (megabyte) in localStorage.
            // Qui si sposta SOLO IL TESTO SALVATO, mai lo stato in memoria: in memoria quelle stringhe
            // restano com'erano, quindi nessuna delle schermate che le leggono cambia. Nel testo
            // salvato al loro posto c'è "dpsh-grande:<id>" e il contenuto sta in IndexedDB
            // (database DPSH_DatiGrandi, separato da quello delle foto per non alzarne la versione).
            //
            // L'ORDINE CHE NON PERDE NIENTE: una stringa nuova si salva ancora dentro il testo (come
            // prima) e intanto parte la scrittura in IndexedDB, riletta e confrontata. Solo a scrittura
            // confermata i salvataggi successivi scrivono il riferimento. Se l'app si chiude in mezzo,
            // il dato è ancora nel testo; se IndexedDB non funziona resta tutto com'è sempre stato.
            //
            // Niente cancellazioni: copie automatiche e cronologia possono citare un id vecchio, quindi
            // un blob non si toglie mai in automatico (lo mostra «Spazio occupato»).
            //
            // ZONA MORTA: saveState può girare durante l'avvio prima che lo script arrivi qui, quindi
            // niente const/let a livello di pezzo: lo stato vive in una proprietà della funzione, come
            // in cronologia() (004f).

            function datiGrandi() {
                if (!datiGrandi.dati) {
                    datiGrandi.dati = {
                        soglia: 65536,                 // caratteri: da qui in su una stringa esce dal testo salvato
                        prefisso: 'dpsh-grande:',
                        nomeDb: 'DPSH_DatiGrandi',
                        idDi: new Map(),               // testo -> id (assegnato alla prima volta che lo si vede)
                        confermati: new Set(),         // id la cui scrittura in IndexedDB è stata riletta e confrontata
                        inCoda: new Set(),             // testi con una scrittura già partita (una volta sola)
                        coda: Promise.resolve(),       // le scritture una dopo l'altra: non 5 da 200 KB insieme
                        nonRiprovareFinoA: 0,          // dopo un errore di IndexedDB si riprova più tardi, non a ogni tocco
                        salvataggioPrevisto: false,
                        risoluzione: null,             // promessa della lettura all'avvio, null se non c'era niente da leggere
                        mancanti: []                   // [{ id, projId, motivo }] riferimenti che non si sono potuti risolvere
                    };
                }
                return datiGrandi.dati;
            }

            /** Una promessa che si risolve quando i riferimenti letti all'avvio sono tornati stringhe
             * vere. Subito se non c'è niente da risolvere. Non rifiuta mai: chi esporta aspetta e basta.
             * Ogni export che serializza stato o progetti la aspetta, altrimenti un file potrebbe
             * uscire con «dpsh-grande:…» al posto della carta intestata. */
            function attendiDatiGrandi() {
                return datiGrandi.dati && datiGrandi.dati.risoluzione ? datiGrandi.dati.risoluzione : Promise.resolve();
            }

            function openDatiGrandiDB() {
                return new Promise((resolve, reject) => {
                    const req = indexedDB.open(datiGrandi().nomeDb, 1);
                    req.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains('blob')) db.createObjectStore('blob', { keyPath: 'id' });
                    };
                    req.onsuccess = (e) => resolve(e.target.result);
                    req.onerror = (e) => reject(e.target.error);
                });
            }

            function nuovoIdDatoGrande() {
                let r = '';
                try {
                    const b = new Uint8Array(9);
                    (window.crypto || window.msCrypto).getRandomValues(b);
                    r = Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
                } catch (e) {
                    r = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
                }
                return Date.now().toString(36) + '-' + r;
            }

            /** Scrive il blob e lo rilegge: true solo se il testo riletto ha la stessa lunghezza
             * (stesso schema di salvaFotoConGaranzia). Non lancia: l'esito è un valore. */
            async function scriviDatoGrandeVerificato(id, testo) {
                let db = null;
                try {
                    db = await openDatiGrandiDB();
                    const scritto = await new Promise((resolve) => {
                        const tx = db.transaction('blob', 'readwrite');
                        tx.objectStore('blob').put({ id, testo, scrittoIl: Date.now() });
                        tx.oncomplete = () => resolve(true);
                        tx.onerror = () => resolve(false);
                        tx.onabort = () => resolve(false);
                    });
                    if (!scritto) return false;
                    const riletto = await new Promise((resolve) => {
                        const req = db.transaction('blob', 'readonly').objectStore('blob').get(id);
                        req.onsuccess = () => resolve(req.result || null);
                        req.onerror = () => resolve(null);
                    });
                    return !!riletto && typeof riletto.testo === 'string' && riletto.testo.length === testo.length;
                } catch (e) {
                    ignoraErrore('scriviDatoGrandeVerificato', e);
                    return false;
                } finally {
                    try { if (db) db.close(); } catch (e) { /* già chiuso */ }
                }
            }

            /** Mette in coda, UNA volta sola, la scrittura verificata di una stringa grande. Alla
             * conferma l'id diventa «confermato» e parte UN salvataggio (rimandato di un giro, così
             * più conferme ravvicinate ne fanno uno): da lì il testo salvato porta il riferimento. */
            function accodaScritturaDatoGrande(testo) {
                const g = datiGrandi();
                if (g.inCoda.has(testo) || Date.now() < g.nonRiprovareFinoA) return;
                if (typeof indexedDB === 'undefined' || !indexedDB) return;
                // Tetto alla memoria: i testi vecchi (un'immagine ritagliata e poi sostituita) restano
                // nella mappa finché l'app è aperta. Oltre il tetto si riparte da zero: le stringhe in
                // uso riprendono un id nuovo e restano nel testo finché la loro scrittura non è riletta.
                if (g.idDi.size >= 60) { g.idDi.clear(); g.confermati.clear(); g.inCoda.clear(); }
                let id = g.idDi.get(testo);
                if (id === undefined) { id = nuovoIdDatoGrande(); g.idDi.set(testo, id); }
                g.inCoda.add(testo);
                g.coda = g.coda.then(() => scriviDatoGrandeVerificato(id, testo)).then(ok => {
                    if (!ok) {
                        // Resta nel testo (nessuna perdita); si riprova fra un minuto, non a ogni tocco.
                        g.inCoda.delete(testo);
                        g.idDi.delete(testo);
                        g.nonRiprovareFinoA = Date.now() + 60000;
                        return;
                    }
                    if (g.idDi.get(testo) !== id) return; // la mappa è stata svuotata nel frattempo
                    g.confermati.add(id);
                    if (!g.salvataggioPrevisto) {
                        g.salvataggioPrevisto = true;
                        setTimeout(() => { g.salvataggioPrevisto = false; saveState(); }, 0);
                    }
                }).catch(e => ignoraErrore('accodaScritturaDatoGrande', e));
            }

            /** Il replacer di JSON.stringify usato da saveState. `esclusi` sono i contenitori (copie di
             * foto e note) che hanno già il loro meccanismo e qui non si toccano. */
            function sostituisciDatiGrandi(esclusi) {
                const g = datiGrandi();
                return function (chiave, v) {
                    if (typeof v !== 'string' || v.length < g.soglia) return v; // i riferimenti sono corti: passano così
                    if (esclusi.has(this)) return v;
                    const id = g.idDi.get(v);
                    if (id !== undefined && g.confermati.has(id)) return g.prefisso + id;
                    accodaScritturaDatoGrande(v);
                    return v;
                };
            }

            /** Raccoglie i riferimenti dentro un oggetto (stato, progetto…): { contenitore, chiave, id,
             * projId }. Cammina solo oggetti semplici e array, ognuno una volta. */
            function raccogliRiferimentiDatiGrandi(radice) {
                const g = datiGrandi();
                const trovati = [];
                const visti = new Set();
                const pila = [{ v: radice, projId: null, sotto: false }];
                while (pila.length) {
                    const { v, projId } = pila.pop();
                    if (!v || typeof v !== 'object' || visti.has(v)) continue;
                    const proto = Object.getPrototypeOf(v);
                    if (!Array.isArray(v) && proto !== Object.prototype && proto !== null) continue;
                    visti.add(v);
                    Object.keys(v).forEach(k => {
                        const x = v[k];
                        if (typeof x === 'string') {
                            if (x.length > g.prefisso.length && x.length < 80 && x.startsWith(g.prefisso)) trovati.push({ contenitore: v, chiave: k, id: x.slice(g.prefisso.length), projId });
                        } else if (x && typeof x === 'object') {
                            // Il progetto a cui appartiene: per dire all'utente DOVE manca il dato.
                            const dentro = (v === radice.projects && !Array.isArray(v)) ? k : projId;
                            pila.push({ v: x, projId: dentro });
                        }
                    });
                }
                return trovati;
            }

            /** Legge da IndexedDB i blob degli id dati: Map id -> testo (assenti: non ci sono nella
             * mappa). Se il database non si apre, lancia: lo gestisce il chiamante. */
            async function leggiDatiGrandi(ids) {
                const db = await openDatiGrandiDB();
                try {
                    if (!db.objectStoreNames.contains('blob')) return new Map();
                    const esito = new Map();
                    for (const id of ids) {
                        const rec = await new Promise((resolve) => {
                            const req = db.transaction('blob', 'readonly').objectStore('blob').get(id);
                            req.onsuccess = () => resolve(req.result || null);
                            req.onerror = () => resolve(null);
                        });
                        if (rec && typeof rec.testo === 'string') esito.set(id, rec.testo);
                    }
                    return esito;
                } finally { try { db.close(); } catch (e) { /* già chiuso */ } }
            }

            /** Rimette le stringhe vere al posto dei riferimenti dentro `radice`. Quello che si legge è
             * già al sicuro in IndexedDB: l'id risulta confermato e il testo noto, così il salvataggio
             * successivo riscrive lo stesso riferimento. Un id che non si trova resta com'è (il
             * riferimento non si perde: il prossimo salvataggio lo riscrive) e finisce in `mancanti`. */
            async function risolviRiferimentiDatiGrandi(radice) {
                const g = datiGrandi();
                const trovati = raccogliRiferimentiDatiGrandi(radice);
                if (trovati.length === 0) return 0;
                let letti = null, motivo = '';
                try { letti = await leggiDatiGrandi(Array.from(new Set(trovati.map(r => r.id)))); }
                catch (e) { ignoraErrore('risolviRiferimentiDatiGrandi', e); motivo = 'il database non si apre'; }
                let risolti = 0;
                trovati.forEach(r => {
                    if (r.contenitore[r.chiave] !== g.prefisso + r.id) return; // cambiato nel frattempo
                    const testo = letti && letti.get(r.id);
                    if (typeof testo === 'string') {
                        r.contenitore[r.chiave] = testo;
                        g.idDi.set(testo, r.id);
                        g.confermati.add(r.id);
                        risolti++;
                    } else if (!g.mancanti.some(m => m.id === r.id && m.projId === r.projId)) {
                        g.mancanti.push({ id: r.id, projId: r.projId, motivo: motivo || 'assente' });
                    }
                });
                return risolti;
            }

            /** Dopo la lettura dei dati: se il testo salvato ha riferimenti li si risolve, poi si ridisegna.
             * Rimette a posto anche i confronti di «modifiche vere» e della cronologia, che fino ad
             * allora hanno visto i riferimenti al posto delle immagini: passare dal riferimento al
             * contenuto non è una modifica dell'utente. */
            function avviaRisoluzioneDatiGrandi(dopoCaricamento) {
                const g = datiGrandi();
                eseguiNormalizzazioneInSospeso();
                const precedente = g.risoluzione || Promise.resolve();
                const questa = precedente.then(async () => {
                    // Il contenuto di ogni progetto com'è ADESSO (con i riferimenti), per riconoscere dopo
                    // quali progetti non avevano altre modifiche in sospeso.
                    const prima = new Map();
                    if (dopoCaricamento) {
                        Object.keys(state.projects || {}).forEach(pid => {
                            try { prima.set(pid, [testoContenutoProgetto(state.projects[pid]), contenutiConosciuti.get(pid)]); } catch (e) { ignoraErrore('avviaRisoluzioneDatiGrandi', e); }
                        });
                    }
                    const risolti = await risolviRiferimentiDatiGrandi(state);
                    if (!dopoCaricamento || risolti === 0) return;
                    prima.forEach(([testoPrima, conosciuto], pid) => {
                        if (conosciuto === testoPrima && state.projects[pid]) {
                            try { contenutiConosciuti.set(pid, testoContenutoProgetto(state.projects[pid])); } catch (e) { ignoraErrore('avviaRisoluzioneDatiGrandi', e); }
                        }
                    });
                    try { cronologia().silenzio = true; } catch (e) { ignoraErrore('avviaRisoluzioneDatiGrandi', e); }
                    saveState();
                    updateUI();
                }).catch(e => ignoraErrore('avviaRisoluzioneDatiGrandi', e)).then(() => {
                    // Finita: da qui attendiDatiGrandi() è subito risolta e gli export non cedono il turno.
                    if (g.risoluzione === questa) g.risoluzione = null;
                });
                g.risoluzione = questa;
                return questa;
            }

            /** Per «Spazio occupato»: quanti blob e quanto pesano (stima, 2 byte a carattere come
             * localStorage; il testo di un dataUrl è ASCII, quindi 1 byte a carattere sul disco: si
             * riporta la lunghezza in caratteri, come fa elencaContenutoIDB per le foto). */
            async function elencaDatiGrandi() {
                try {
                    const db = await openDatiGrandiDB();
                    try {
                        if (!db.objectStoreNames.contains('blob')) return { count: 0, bytes: 0 };
                        return await new Promise((resolve) => {
                            const req = db.transaction('blob', 'readonly').objectStore('blob').getAll();
                            req.onsuccess = () => {
                                const righe = req.result || [];
                                resolve({ count: righe.length, bytes: righe.reduce((s, r) => s + ((r && r.testo) ? r.testo.length : 0), 0) });
                            };
                            req.onerror = () => resolve({ count: 0, bytes: 0 });
                        });
                    } finally { try { db.close(); } catch (e) { /* già chiuso */ } }
                } catch (e) {
                    ignoraErrore('elencaDatiGrandi', e);
                    return { count: 0, bytes: 0 };
                }
            }
