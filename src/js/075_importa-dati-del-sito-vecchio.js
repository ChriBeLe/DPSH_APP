            // ===================== IMPORTA I DATI DEL SITO VECCHIO =====================
            // La nuova app sta sullo stesso indirizzo del sito vecchio, quindi nel localStorage del browser
            // ci possono essere ancora le sue prove: `dpsh_autosave` (la prova aperta) e `dpsh_archives`
            // (fino a 20 prove salvate, { name, date, data }). All'avvio, se non sono già state trattate, si
            // chiede se importarle; la conversione è in 074 e l'ingresso nell'archivio è quello di sempre
            // (importProjectsFromJSON). Le voci vecchie del localStorage non si toccano mai: restano com'erano,
            // anche per tornare al sito vecchio (rollback). Si segna solo `dpsh_import_sito_vecchio`.
            const SITO_VECCHIO_AUTOSAVE = 'dpsh_autosave';
            const SITO_VECCHIO_ARCHIVI = 'dpsh_archives';
            const SITO_VECCHIO_SEGNO = 'dpsh_import_sito_vecchio';

            /** Legge una voce del localStorage come JSON (anche se salvata come testo dentro il testo). */
            function leggiVoceSitoVecchio(chiave) {
                try {
                    let v = localStorage.getItem(chiave);
                    if (v === null) return null;
                    v = JSON.parse(v);
                    if (typeof v === 'string') v = JSON.parse(v);
                    return v;
                } catch (e) { ignoraErrore('sitoVecchio/leggi ' + chiave, e); return null; }
            }

            /** Le prove vecchie che ci sono nel localStorage: [{ dati, nome }], l'archivio prima (il più
             * nuovo per primo) e l'autosave in fondo, che di solito è già una copia dell'ultima. */
            function proveDelSitoVecchioNelBrowser() {
                const prove = [];
                const archivi = leggiVoceSitoVecchio(SITO_VECCHIO_ARCHIVI);
                if (Array.isArray(archivi)) archivi.forEach(a => {
                    let dati = a && a.data;
                    if (typeof dati === 'string') { try { dati = JSON.parse(dati); } catch (e) { dati = null; } }
                    if (eProvaSitoVecchio(dati)) prove.push({ dati, nome: String(a.name || '') });
                });
                const autosave = leggiVoceSitoVecchio(SITO_VECCHIO_AUTOSAVE);
                if (eProvaSitoVecchio(autosave)) prove.push({ dati: autosave, nome: 'Prova aperta' });
                return prove;
            }

            /** Le impronte (074) delle prove vecchie che sono già qui, per non rimportarle se il segno si perde. */
            function impronteDelleProveGiaImportate() {
                const viste = new Set();
                // La firma di una prova convertita non coincide con quella della vecchia: si confronta il contenuto
                // essenziale (comune, numero, data e intervalli), lo stesso che la conversione scrive.
                Object.values(state.projects || {}).forEach(p => Object.values((p && p.surveys) || {}).forEach(s => viste.add(firmaProvaConvertita(s))));
                return viste;
            }

            /** Contenuto essenziale di una prova nel formato attuale: comune, numero, data, falda e intervalli. */
            function firmaProvaConvertita(s) {
                const h = (s && s.header) || {};
                return JSON.stringify([String(h.comune || ''), String(h.provaNr || ''), String(h.date || ''), String(h.faldaDa || ''),
                    ((s && s.logs) || []).map(l => [l.end, l.colpi])]);
            }

            /** Scrive il segno che i dati vecchi sono stati trattati (importati o rifiutati). */
            function segnaImportSitoVecchio(esito, conteggio) {
                try { localStorage.setItem(SITO_VECCHIO_SEGNO, JSON.stringify({ esito, quando: new Date().toISOString(), prove: conteggio || 0 })); }
                catch (e) { ignoraErrore('sitoVecchio/segno', e); }
            }

            /** C'è qualcosa da importare e non è già stato trattato? */
            function datiSitoVecchioDaImportare() {
                let segnato = null;
                try { segnato = localStorage.getItem(SITO_VECCHIO_SEGNO); } catch (e) { segnato = null; }
                return segnato === null && proveDelSitoVecchioNelBrowser().length > 0;
            }

            /** Importa le prove del sito vecchio nell'archivio. `chiedi`: domanda prima (all'avvio); da
             * un comando esplicito (assistente IA) si va diretti. Ritorna { importate, copie, progetti } o null se rifiutato. */
            async function importaDatiSitoVecchio(opzioni = {}) {
                const prove = proveDelSitoVecchioNelBrowser();
                if (!prove.length) { if (opzioni.chiedi === false) throw new Error('Nel browser non ci sono dati della vecchia versione del sito.'); return null; }
                if (opzioni.chiedi !== false) {
                    if (!await appConfirm('Trovati dati della vecchia versione del sito. Importarli?')) { segnaImportSitoVecchio('rifiutato', 0); return null; }
                }
                // Niente copia di sicurezza prima: l'importazione aggiunge soltanto (come l'import JSON di un progetto).
                const esito = progettiDaProveSitoVecchio(prove, impronteVecchieGiaPresenti(prove), predefinitiPerMigrazioni());
                const nProgetti = Object.keys(esito.progetti).length;
                if (nProgetti) {
                    importProjectsFromJSON({ versioneSchema: VERSIONE_SCHEMA_DATI, projects: esito.progetti });
                    updateUI();
                    if (state.uiState && state.uiState.currentView === 'home' && typeof switchView === 'function') switchView('home');
                }
                segnaImportSitoVecchio('importato', esito.convertite);
                const saltate = esito.copie + esito.vuote;
                toastODialogo(esito.convertite
                    ? `Importate ${esito.convertite} prov${esito.convertite === 1 ? 'a' : 'e'} dalla vecchia versione del sito`
                    : 'Nessuna prova nuova da importare: erano già tutte qui',
                    saltate && esito.convertite ? `${esito.copie ? esito.copie + ' copie identiche saltate' : ''}${esito.copie && esito.vuote ? ', ' : ''}${esito.vuote ? esito.vuote + ' prove vuote saltate' : ''}.` : '');
                return { importate: esito.convertite, copie: esito.copie, vuote: esito.vuote, progetti: nProgetti };
            }

            /** Impronte da saltare perché la stessa prova è già nell'archivio (importata prima, segno perso):
             * si convertono le vecchie e si guarda se il contenuto essenziale è già presente. */
            function impronteVecchieGiaPresenti(prove) {
                const presenti = impronteDelleProveGiaImportate();
                const viste = new Set();
                const predef = predefinitiPerMigrazioni();
                prove.forEach(p => {
                    if (!eProvaSitoVecchio(p.dati) || provaSitoVecchioVuota(p.dati)) return;
                    if (presenti.has(firmaProvaConvertita(proveDaProvaSitoVecchio(p.dati, 'SURV_CONTROLLO', predef)))) viste.add(firmaProvaSitoVecchio(p.dati));
                });
                return viste;
            }

            /** All'avvio: se ci sono dati vecchi non ancora trattati, si chiede. Un errore non ferma l'app. */
            async function proponiImportSitoVecchio() {
                try { if (datiSitoVecchioDaImportare()) await importaDatiSitoVecchio({ chiedi: true }); }
                catch (e) { segnalaErrore('importazione', 'proponiImportSitoVecchio', e, 'Importazione dal sito vecchio non riuscita: ' + e.message); }
            }
            setTimeout(proponiImportSitoVecchio, 1500);
