            // ================== VERSIONE DELLO SCHEMA E MIGRAZIONI REGISTRATE (Fase 1) ==================
            // I dati salvati e i file esportati portano `versioneSchema`, un intero (VERSIONE_SCHEMA_DATI,
            // in cima allo script). Chi cambia la forma dei dati NON la cambia in giro per il codice:
            // aggiunge qui una migrazione da N a N+1, alza VERSIONE_SCHEMA_DATI e scrive il test che
            // parte dal formato vecchio (test/dati/ ha le fixture del formato 0). La stessa catena vale
            // per il caricamento all'avvio e per i file importati (JSON e ZIP): un file vecchio si
            // aggiorna prima di entrare, uno più nuovo dell'app si rifiuta prima di scrivere qualsiasi
            // cosa.
            //
            // Regole per una migrazione:
            //  - riceve l'oggetto dei dati (già letto dal JSON, si può modificare) e lo restituisce;
            //  - deve reggere anche uno stato PARZIALE: un import passa solo { versioneSchema, projects };
            //  - non inventa: un dato che non c'era resta assente (es. le date degli intervalli vecchi);
            //  - è una funzione pura sui dati: niente DOM, niente saveState, niente IndexedDB.
            // Prima di applicarle all'avvio si salva una copia automatica «prima di aggiornare i dati».

            const MIGRAZIONI_DATI = [
                { da: 0, a: 1, descrizione: 'versione dello schema; i salvataggi di prima dei progetti diventano progetti', esegui: migrazione0a1 },
                { da: 1, a: 2, descrizione: 'passaggio telefono ↔ PC: ultima modifica vera, impronte dei passaggi, ora ISO delle foto nuove, progetto nelle correzioni registrate', esegui: migrazione1a2 },
                { da: 2, a: 3, descrizione: 'la «Modalità Espansa» diventa la preferenza «tasto Registra visibile»', esegui: migrazione2a3 }
            ];

            /** MIGRAZIONE 2 → 3 (Fase 3, decisione G). La «Modalità Espansa» (settings.expandedMode, e
             * prima ancora il suo contrario compactMode) mostrava i tasti CONFERMA e ANNULLA STEP; di
             * default era spenta. Ora il tasto che registra l'intervallo è visibile di default e si
             * può nascondere: la preferenza nuova è settings.tastoRegistraVisibile.
             *  - chi aveva la Modalità Espansa attiva non perde niente: il tasto resta visibile;
             *  - chi non l'aveva vede il tasto, perché la decisione G lo vuole visibile di default
             *    (lo nasconde con un tocco, «Nascondi questo tasto», e la scelta resta).
             * Quindi il valore nuovo è sempre true; expandedMode e compactMode si tolgono, anche dalle
             * copie delle impostazioni che ogni prova porta con sé (non sono contenuto: vedi
             * IMPOSTAZIONI_DELL_APP in 004e, l'impronta del progetto non cambia). Uno stato parziale
             * (un import passa solo { versioneSchema, projects }) non ha settings: solo le prove. */
            function migrazione2a3(dati) {
                const converti = (impostazioni, anchePreferenza) => {
                    if (!impostazioni || typeof impostazioni !== 'object') return;
                    delete impostazioni.expandedMode;
                    delete impostazioni.compactMode;
                    if (anchePreferenza) impostazioni.tastoRegistraVisibile = true;
                };
                if (dati && dati.settings) converti(dati.settings, true);
                Object.values((dati && dati.projects) || {}).forEach(p => {
                    Object.values((p && p.surveys) || {}).forEach(sv => { if (sv && sv.settings) converti(sv.settings, false); });
                });
                dati.versioneSchema = 3;
                return dati;
            }

            /** MIGRAZIONE 1 → 2 (Fase 2, passaggio telefono ↔ PC). La forma 2 aggiunge campi che nascono
             * vuoti e si riempiono da soli, da qui in avanti:
             *  - proj.modificatoIl: l'ultima modifica vera del contenuto (vedi 004e);
             *  - proj.passaggi: { impronte: [{ impronta, esportatoIl, dispositivo }] }, una voce per ogni
             *    pacchetto in cui il progetto è uscito (vedi 044b);
             *  - foto.scattataIl: l'ora ISO dello scatto, accanto a `timestamp` (testo locale);
             *  - registroCorrezioni[].projId/survId: a quale progetto si riferisce una correzione.
             * Niente da trasformare: una data che non si conosce resta assente. Il salto di versione
             * serve lo stesso, per due ragioni: un'app della Fase 1 rifiuta con un messaggio chiaro un
             * pacchetto che non saprebbe leggere (invece di importare zero progetti in silenzio), e i
             * dati del telefono dicono da quale forma in poi possono contenere questi campi. */
            function migrazione1a2(dati) {
                dati.versioneSchema = 2;
                return dati;
            }

            /** La versione dei dati di un oggetto letto da file o da memoria: 0 se non la dichiara
             * (tutto ciò che è stato scritto prima della Fase 1), null se ne dichiara una non valida. */
            function versioneDeiDati(dati) {
                if (!dati || typeof dati !== 'object') return null;
                const v = dati.versioneSchema;
                if (v === undefined || v === null) return 0;
                return (Number.isInteger(v) && v >= 0) ? v : null;
            }

            /** Applica in ordine le migrazioni da `versione` fino a VERSIONE_SCHEMA_DATI.
             * Ritorna { dati, applicate: [{da, a, descrizione}] }. Lancia un errore se manca un
             * passaggio (un buco nel registro è un errore di chi sviluppa, non va ignorato). */
            function migraDati(dati, versione, predefiniti) {
                const applicate = [];
                let v = versione;
                let corrente = dati;
                while (v < VERSIONE_SCHEMA_DATI) {
                    const passo = MIGRAZIONI_DATI.find(m => m.da === v);
                    if (!passo || passo.a !== v + 1) throw new Error('nessuna migrazione registrata dalla versione ' + v);
                    corrente = passo.esegui(corrente, predefiniti) || corrente;
                    corrente.versioneSchema = passo.a;
                    applicate.push({ da: passo.da, a: passo.a, descrizione: passo.descrizione });
                    v = passo.a;
                }
                return { dati: corrente, applicate };
            }

            /** I valori di serie che la migrazione 0→1 usa per le prove vecchie senza strumento o
             * impostazioni: quelli dello stato iniziale dell'app. */
            function predefinitiPerMigrazioni() {
                return {
                    header: JSON.parse(JSON.stringify(state.header)),
                    instrument: JSON.parse(JSON.stringify(state.instrument)),
                    settings: JSON.parse(JSON.stringify(state.settings))
                };
            }

            /** Dopo una migrazione all'avvio il salvataggio resta sospeso finché la copia del testo di
             * prima non è scritta: il primo saveState riscrive i dati nel formato nuovo, e prima di
             * quel momento il formato vecchio deve stare al sicuro. Se la copia non riesce (IndexedDB
             * guasto) si va avanti lo stesso, dicendolo nella console: bloccare l'app in campo per una
             * copia di riserva sarebbe peggio del rischio che copre. */
            function copiaPrimaDiAggiornareIDati(testoPrima, applicate) {
                const da = applicate[0].da, a = applicate[applicate.length - 1].a;
                caricamentoDati.bloccato = 'migrazione';
                caricamentoDati.migrazione = { da, a, applicate, copia: null };
                return Promise.resolve(copieAutomatiche.caricamento)
                    .catch(() => {})
                    .then(() => scriviCopiaAutomatica('prima', `prima di aggiornare i dati (formato ${da} → ${a})`, testoPrima))
                    .then(scritta => {
                        // false anche quando l'ultima copia è identica: in quel caso il testo è già al sicuro.
                        const giaPresente = !scritta && copieAutomatiche.ultimaFirma === firmaTesto(testoPrima);
                        caricamentoDati.migrazione.copia = !!scritta || giaPresente;
                        if (!caricamentoDati.migrazione.copia) console.warn('Copia prima di aggiornare i dati non riuscita: si prosegue comunque.');
                    })
                    .catch(e => { caricamentoDati.migrazione.copia = false; ignoraErrore('copiaPrimaDiAggiornareIDati', e); })
                    .then(() => {
                        if (caricamentoDati.bloccato !== 'migrazione') return;
                        caricamentoDati.bloccato = false;
                        if (caricamentoDati.salvataggiEvitati > 0) saveState();
                    });
            }

            /** Versione di un file da importare. Il backup completo JSON la porta fuori (`versioneSchema`
             * del contenitore) e dentro (`state.versioneSchema`); lo ZIP nel manifest; un progetto
             * esportato da solo sul progetto stesso. Un file senza è del formato 0. */
            function versioneFileImportato(contenuto) {
                if (!contenuto || typeof contenuto !== 'object') return null;
                if (contenuto.versioneSchema !== undefined && contenuto.versioneSchema !== null) return versioneDeiDati(contenuto);
                if (contenuto.state && typeof contenuto.state === 'object') return versioneDeiDati(contenuto.state);
                return 0;
            }

            /** Rifiuta, PRIMA di scrivere qualsiasi cosa, un file che questa versione non sa leggere.
             * Il messaggio dice cosa fare, non solo cosa non va. */
            function controllaVersioneFileImportato(versione) {
                if (versione === null) {
                    throw new Error('Il file dichiara una versione dei dati non valida: non è stato importato niente.');
                }
                if (versione > VERSIONE_SCHEMA_DATI) {
                    throw new Error(`Il file è stato creato da una versione più nuova dell'app (formato dati ${versione}; questa versione legge fino al ${VERSIONE_SCHEMA_DATI}).\n\nAggiorna l'app e riprova: non è stato importato niente.`);
                }
            }

            /** Porta i progetti di un file importato alla versione attuale, con la stessa catena di
             * migrazioni del caricamento. Il campo versioneSchema che un progetto esportato porta con
             * sé serve solo al trasporto: dentro l'archivio la versione è una sola, quella dello stato. */
            function migraProgettiImportati(progetti, versione) {
                const esito = migraDati({ versioneSchema: versione, projects: progetti }, versione, predefinitiPerMigrazioni());
                const migrati = esito.dati.projects || {};
                Object.values(migrati).forEach(p => { if (p && typeof p === 'object') delete p.versioneSchema; });
                return migrati;
            }
