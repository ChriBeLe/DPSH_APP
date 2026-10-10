            // ===================== SPAZIO OCCUPATO E FOTO ORFANE =====================
            // Richiesto esplicitamente ("un posto dove vedere... quanto sta venendo occupato, lo
            // spazio totale del disco") e nato da un problema concreto trovato nell'audit:
            // eliminare una PROVA cancellava correttamente le sue foto da IndexedDB (con 11 secondi
            // di attesa per non rompere l'annulla), ma eliminare un PROGETTO non le cancellava mai.
            // Le foto dei progetti eliminati restavano lì per sempre, invisibili e non recuperabili
            // — nemmeno il "Reset Dati Locale", che svuotava solo localStorage senza toccare
            // IndexedDB. Da qui le due parti: mostrare i numeri, e dare un modo per rimediare anche
            // a quello che si è già accumulato in passato.

            /** Elenca id e peso di tutto ciò che sta in uno store di IndexedDB. Legge le chiavi e la
             * lunghezza dei dataUrl: è una stima del peso reale (un dataUrl base64 è circa 4/3 dei
             * byte originali), sufficiente per dire all'utente "le foto pesano tot". */
            async function elencaContenutoIDB(nomeStore) {
                try {
                    const db = await openPhotoDB();
                    if (!db.objectStoreNames.contains(nomeStore)) return [];
                    return await new Promise((resolve) => {
                        const tx = db.transaction(nomeStore, 'readonly');
                        const store = tx.objectStore(nomeStore);
                        const req = store.getAll();
                        req.onsuccess = () => {
                            const righe = (req.result || []).map(r => ({
                                id: r.id,
                                bytes: r.dataUrl ? Math.round(r.dataUrl.length * 0.75) : 0
                            }));
                            resolve(righe);
                        };
                        req.onerror = () => { console.warn('IDB: lettura elenco fallita per', nomeStore, req.error); resolve([]); };
                    });
                } catch (e) {
                    console.warn('IDB: impossibile elencare', nomeStore, e);
                    return [];
                }
            }

            /** Tutti gli id di foto ANCORA riferiti da qualche prova, in tutto l'archivio (più la
             * prova aperta, che vive anche in state.photos). Tutto ciò che sta in IndexedDB e non è
             * in questo insieme è orfano: nessuna schermata dell'app potrà mai più mostrarlo. */
            function idFotoAncoraInUso() {
                const vivi = new Set();
                (state.photos || []).forEach(p => { if (p && p.id) vivi.add(p.id); });
                Object.values(state.projects || {}).forEach(proj => {
                    Object.values((proj && proj.surveys) || {}).forEach(surv => {
                        (surv.photos || []).forEach(p => { if (p && p.id) vivi.add(p.id); });
                    });
                });
                // Anche le foto che servono a una copia automatica: ripristinare un progetto senza le
                // sue immagini sarebbe un ripristino a metà. Restano finché la copia esiste (al massimo
                // 14 giorni), poi tornano orfane e «Foto orfane» le recupera.
                copieAutomatiche.idFoto.forEach(id => vivi.add(id));
                // E quelle che Annulla può ancora rimettere (pezzo 004f), finché il passo esiste.
                if (typeof idFotoNellaCronologia === 'function') idFotoNellaCronologia().forEach(id => vivi.add(id));
                // Ogni foto ritagliata tiene da parte la sua versione intera sotto un id
                // derivato: e' quello che rende il ritaglio ripensabile. Va dichiarata viva
                // insieme alla foto, o la pulizia delle orfane se la porterebbe via al primo
                // giro — e il ritaglio tornerebbe a essere definitivo senza che nessuno lo
                // abbia deciso. Gli originali di foto CANCELLATE restano orfani, ed e' giusto:
                // quello spazio va davvero recuperato.
                Array.from(vivi).forEach(id => vivi.add(id + SUFFISSO_ORIGINALE));
                return vivi;
            }

            /** Come sopra per le immagini incorporate nelle Note: lì i riferimenti non sono un
             * elenco ma attributi data-note-img-id dentro l'HTML della nota, quindi si estraggono. */
            function idImmaginiNoteAncoraInUso() {
                const vivi = new Set();
                const raccogli = (html) => {
                    if (!html) return;
                    const re = /data-note-img-id="([^"]+)"/g;
                    let m;
                    while ((m = re.exec(html)) !== null) vivi.add(m[1]);
                };
                Object.values(state.projects || {}).forEach(proj => { if (proj && proj.notes) raccogli(proj.notes.html); });
                copieAutomatiche.idNote.forEach(id => vivi.add(id)); // come le foto: servono alle copie automatiche
                if (typeof idImmaginiNoteNellaCronologia === 'function') idImmaginiNoteNellaCronologia().forEach(id => vivi.add(id)); // e ad Annulla (pezzo 004f)
                // Stesso ragionamento delle foto: l'immagine intera messa da parte prima di un
                // ritaglio appartiene all'immagine che e' ancora nella nota.
                Array.from(vivi).forEach(id => vivi.add(id + SUFFISSO_ORIGINALE));
                return vivi;
            }

            /** Formatta dei byte in un'unità leggibile. */
            function formattaByte(bytes) {
                if (!isFinite(bytes) || bytes <= 0) return '0 KB';
                if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
                if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
            }

            /** Raccoglie tutti i numeri sullo spazio. navigator.storage.estimate() dà l'occupato e
             * la QUOTA CONCESSA dal browser a questa app — che non è lo spazio libero del telefono,
             * ma è il numero che conta davvero, perché è quello contro cui si va a sbattere. */
            async function calcolaSpazioOccupato() {
                const risultato = { usato: 0, quota: 0, stimaDisponibile: false, localStorageBytes: 0, fotoBytes: 0, fotoCount: 0, noteBytes: 0, noteCount: 0, orfaneCount: 0, orfaneBytes: 0 };
                try {
                    const raw = localStorage.getItem('dpsh_app_state') || '';
                    // 2 byte per carattere: le stringhe in localStorage sono UTF-16.
                    risultato.localStorageBytes = raw.length * 2;
                } catch (e) { /* localStorage non accessibile: resta 0, il resto ha comunque senso */ }
                try {
                    if (navigator.storage && navigator.storage.estimate) {
                        const est = await navigator.storage.estimate();
                        risultato.usato = est.usage || 0;
                        risultato.quota = est.quota || 0;
                        risultato.stimaDisponibile = true;
                    }
                } catch (e) { console.warn('storage.estimate non disponibile:', e); }

                const foto = await elencaContenutoIDB(STORE_NAME);
                const note = await elencaContenutoIDB(STORE_NOTE_IMAGES);
                risultato.fotoCount = foto.length;
                risultato.fotoBytes = foto.reduce((s, r) => s + r.bytes, 0);
                risultato.noteCount = note.length;
                risultato.noteBytes = note.reduce((s, r) => s + r.bytes, 0);

                const fotoVive = idFotoAncoraInUso();
                const noteVive = idImmaginiNoteAncoraInUso();
                const orfaneFoto = foto.filter(r => !fotoVive.has(r.id));
                const orfaneNote = note.filter(r => !noteVive.has(r.id));
                risultato.orfaneCount = orfaneFoto.length + orfaneNote.length;
                risultato.orfaneBytes = orfaneFoto.reduce((s, r) => s + r.bytes, 0) + orfaneNote.reduce((s, r) => s + r.bytes, 0);
                risultato.orfaneFotoIds = orfaneFoto.map(r => r.id);
                risultato.orfaneNoteIds = orfaneNote.map(r => r.id);
                return risultato;
            }

            /** Rimuove da IndexedDB tutto ciò che nessuna prova e nessuna nota riferisce più.
             * Ritorna quanti elementi ha eliminato. */
            async function eliminaFotoOrfane(orfaneFotoIds, orfaneNoteIds) {
                let eliminate = 0;
                for (const id of (orfaneFotoIds || [])) {
                    try { await deletePhotoFromIDB(id); delete photoMemoryCache[id]; eliminate++; }
                    catch (e) { console.warn('Eliminazione foto orfana fallita:', id, e); }
                }
                for (const id of (orfaneNoteIds || [])) {
                    try {
                        if (typeof deleteNoteImageFromIDB === 'function') await deleteNoteImageFromIDB(id);
                        if (typeof noteImageMemoryCache !== 'undefined') delete noteImageMemoryCache[id];
                        eliminate++;
                    } catch (e) { console.warn('Eliminazione immagine nota orfana fallita:', id, e); }
                }
                return eliminate;
            }

            /** Cancella COMPLETAMENTE il database delle immagini. Usata dal "Reset Dati Locale",
             * che prima svuotava solo localStorage: le foto restavano su disco per sempre, e
             * l'azione più drastica offerta dall'app non liberava in realtà quasi nulla. */
            async function svuotaDatabaseImmagini() {
                try {
                    const db = await openPhotoDB();
                    const stores = [STORE_NAME, STORE_NOTE_IMAGES].filter(s => db.objectStoreNames.contains(s));
                    if (stores.length === 0) return true;
                    return await new Promise((resolve) => {
                        const tx = db.transaction(stores, 'readwrite');
                        stores.forEach(s => tx.objectStore(s).clear());
                        tx.oncomplete = () => resolve(true);
                        tx.onerror = () => { console.warn('Svuotamento IDB fallito:', tx.error); resolve(false); };
                        tx.onabort = () => resolve(false);
                    });
                } catch (e) {
                    console.warn('Svuotamento IDB non riuscito:', e);
                    return false;
                }
            }

