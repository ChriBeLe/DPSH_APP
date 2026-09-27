            // ===== FUNZIONI SPERIMENTALI (sottomenu che raggruppa Modalità Debug) =====
            // Chiuso di default: un solo tasto mostra/nasconde la sezione, così
            // resta fuori dai piedi nell'uso quotidiano dell'app.
            const btnToggleFunzioniSperimentali = document.getElementById('btnToggleFunzioniSperimentali');
            const funzioniSperimentaliBody = document.getElementById('funzioniSperimentaliBody');
            const chevronFunzioniSperimentali = document.getElementById('chevronFunzioniSperimentali');
            if (btnToggleFunzioniSperimentali && funzioniSperimentaliBody) {
                btnToggleFunzioniSperimentali.addEventListener('click', () => {
                    const isOpen = funzioniSperimentaliBody.style.display === 'flex';
                    funzioniSperimentaliBody.style.display = isOpen ? 'none' : 'flex';
                    if (chevronFunzioniSperimentali) chevronFunzioniSperimentali.style.transform = isOpen ? '' : 'rotate(180deg)';
                });
            }

            // ===== MODALITÀ DEBUG =====
            // Unico interruttore che mostra/nasconde tutti gli strumenti diagnostici dell'app
            // (diagnostica GPS + info sistema). Tenuta spenta di default per non confondere
            // l'utente in condizioni di uso normale.
            const chkDebugMode = document.getElementById('chkDebugMode');
            function applyDebugMode() {
                const on = !!(state.settings && state.settings.debugMode);
                const gpsTools = document.getElementById('gpsDebugToolsWrapper');
                const drawerTools = document.getElementById('debugToolsBox');
                if (gpsTools) gpsTools.style.display = on ? 'block' : 'none';
                if (drawerTools) drawerTools.style.display = on ? 'block' : 'none';
                if (chkDebugMode) chkDebugMode.checked = on;
            }
            if (chkDebugMode) {
                chkDebugMode.addEventListener('change', (e) => {
                    if (!state.settings) state.settings = {};
                    state.settings.debugMode = e.target.checked;
                    applyDebugMode();
                    triggerVibrate(25);
                    saveState();
                });
            }
            applyDebugMode();

            // Pannello Info Sistema: stato interno dell'app, utile per il supporto senza dover
            // aprire gli strumenti sviluppatore del browser.
            const btnShowSystemInfo = document.getElementById('btnShowSystemInfo');
            if (btnShowSystemInfo) {
                btnShowSystemInfo.addEventListener('click', () => {
                    const box = document.getElementById('systemInfoBox');
                    if (!box) return;
                    const projs = Object.values(state.projects || {});
                    const totalSurveys = projs.reduce((n, p) => n + Object.keys(p.surveys || {}).length, 0);
                    const totalPhotos = projs.reduce((n, p) => n + Object.values(p.surveys || {}).reduce((m, s) => m + (s.photos || []).length, 0), 0);
                    let storageKb = '?';
                    try { storageKb = (new Blob([JSON.stringify(state)]).size / 1024).toFixed(1); } catch (e) { ignoraErrore('applyDebugMode', e); }

                    const lines = [
                        ['Origine pagina', window.origin || window.location.origin],
                        ['Protocollo', window.location.protocol],
                        ['Contesto sicuro', String(window.isSecureContext)],
                        ['Standalone (PWA)', String(window.matchMedia('(display-mode: standalone)').matches)],
                        ['User Agent', navigator.userAgent],
                        ['Progetti in archivio', String(projs.length)],
                        ['Prove totali', String(totalSurveys)],
                        ['Foto totali', String(totalPhotos)],
                        ['Dimensione stato (stimata)', storageKb + ' KB'],
                        ['GPS live attivo', String(liveGpsWatchId !== null)],
                        ['Tema attivo', document.documentElement.getAttribute('data-theme') || 'scuro'],
                    ];
                    box.innerHTML = lines.map(([k, v]) => `<div style="margin-bottom:4px;"><strong style="color:var(--accent);">${k}:</strong> <span style="word-break:break-all;">${v}</span></div>`).join('');
                    box.style.display = 'block';
                });
            }

            // Helper per inserire un'icona del set professionale nelle stringhe HTML generate da JS.
            // Esempio: `${ico('droplet')} Falda` oppure `${ico('pin', 'ico ico-lg')}`
            function ico(name, cls) {
                return `<svg class="${cls || 'ico'}"><use href="#i-${name}"/></svg>`;
            }

            function triggerVibrate(pattern) {
                if (state.settings.haptic && navigator.vibrate) {
                    // Con i guanti la sensibilità tattile è ridotta: la vibrazione (e le eventuali
                    // pause del pattern) viene allungata per restare percepibile.
                    if (state.settings.gloveMode) {
                        pattern = Array.isArray(pattern)
                            ? pattern.map(ms => Math.round(ms * 1.6))
                            : Math.round(pattern * 1.6);
                    }
                    navigator.vibrate(pattern);
                }
            }

            // Screen WakeLock (Mantiene lo schermo attivo)
            let wakeLockObj = null;
            async function requestWakeLock() {
                if ('wakeLock' in navigator && state.settings.wakeLock) {
                    try {
                        wakeLockObj = await navigator.wakeLock.request('screen');
                    } catch (err) { ignoraErrore('requestWakeLock', err); }
                }
            }

            /** Porta nello stato dell'app i dati salvati, GIÀ migrati alla versione attuale (vedi
             * migraDati, pezzo 004b). Era migrateLegacyState: la conversione dal formato senza
             * progetti è diventata la migrazione 0→1; qui restano le fusioni con i valori di serie e
             * le normalizzazioni dei template, che valgono a ogni caricamento perché sono idempotenti
             * e proteggono anche da un template vecchio importato dopo (libreria dei template). */
            function applicaStatoSalvato(parsed) {
                if (!parsed) return;

                // Archivio litologico globale: indipendente dal formato progetti/legacy sottostante,
                // va sempre ripristinato se presente (i salvataggi precedenti a questa funzione
                // semplicemente non lo avranno, e resterà l'oggetto vuoto di default).
                if (parsed.lithologyArchive && typeof parsed.lithologyArchive === 'object') {
                    state.lithologyArchive = parsed.lithologyArchive;
                }

                // Libreria template di report: si fondono quelli salvati sopra al default "classico"
                // già presente in state (mai il contrario), così un salvataggio corrotto o precedente
                // a questa funzionalità non può mai far sparire il template precompilato.
                if (parsed.reportTemplates && typeof parsed.reportTemplates === 'object') {
                    state.reportTemplates = { ...state.reportTemplates, ...parsed.reportTemplates };
                    /* VIA IL rowSpan DAI TEMPLATE GIÀ SALVATI (richiesto esplicitamente: «da ogni
                     * blocco devi rimuovere assolutamente la possibilità di modificare le righe.
                     * Non serve ora che abbiamo uno spaziatore»). Il comando è sparito dal menu,
                     * ma toglierlo dall'interfaccia non basta: finché un template salvato conserva
                     * un rowSpan>1, il motore di impaginazione continua a percorrere la strada dei
                     * "gruppi di righe" — cioè la logica che si voleva togliere resterebbe viva,
                     * senza più nessun modo di accorgersene o di correggerla. Qui si normalizza il
                     * dato una volta sola, all'avvio: i blocchi tornano ad occupare una riga e i
                     * segnaposto invisibili che riservavano le righe sotto spariscono, liberando
                     * spazio reale nel foglio invece di lasciarlo occupato da niente. */
                    Object.values(state.reportTemplates).forEach(tpl => appiattisciRowSpanTemplate(tpl));
                    Object.values(state.reportTemplates).forEach(tpl => convertiSeparatoriInDivisori(tpl));
                    Object.values(state.reportTemplates).forEach(tpl => convertiScalaGraficoSalvata(tpl));
                }
                if (!state.reportTemplates.classico) {
                    state.reportTemplates.classico = { id: 'classico', name: 'Classico', builtIn: true, pages: [classicoPaginaDefault()], margins: { top: 14, bottom: 14, left: 12, right: 12 } };
                }
                // MIGRAZIONE (richiesta esplicitamente: "voglio che quello che c'è nel template venga
                // esportato pari pari nel pdf"): un salvataggio precedente a questo fix (o un backup
                // importato da prima) porta ancora "classico" con pages:null — lo spread qui sopra lo
                // riporterebbe silenziosamente al vecchio layout cablato, vanificando il fix. Va sempre
                // riallineato al nuovo formato a blocchi se manca.
                if (!state.reportTemplates.classico.pages || state.reportTemplates.classico.pages.length === 0) {
                    state.reportTemplates.classico.pages = [classicoPaginaDefault()];
                }
                if (!state.reportTemplates.classico.margins) {
                    state.reportTemplates.classico.margins = { top: 14, bottom: 14, left: 12, right: 12 };
                }

                // Libreria template indice: stesso identico schema di fusione/reseed qui sopra per i
                // template di report — un salvataggio corrotto o precedente a questa funzionalità non
                // può mai far sparire la vesta precompilata.
                if (parsed.indiceTemplates && typeof parsed.indiceTemplates === 'object') {
                    state.indiceTemplates = { ...state.indiceTemplates, ...parsed.indiceTemplates };
                }
                if (!state.indiceTemplates) state.indiceTemplates = {};
                if (!state.indiceTemplates.idx_classico) {
                    state.indiceTemplates.idx_classico = { id: 'idx_classico', name: 'Classico', builtIn: true, mostraPagina: true, font: 'Times New Roman', divisore: 'punti', gutter: false, numero: { pt: 11, peso: 700 }, titolo: { pt: 20, peso: 800 }, titoloTesto: 'Indice', pagina: { pt: 11, peso: 400 }, coloreTesto: '#1e293b', coloreDivisore: '#cbd5e1',
                        livelli: { h1: { pt: 13, rientroMm: 0, peso: 700, corsivo: false }, h2: { pt: 11.5, rientroMm: 6, peso: 400, corsivo: false }, h3: { pt: 10.5, rientroMm: 12, peso: 400, corsivo: true } } };
                }
                // "Moderno"/"Tecnico" rimossi su richiesta esplicita ("lascia solo quello classico"):
                // pulizia attiva, non solo "smettere di riseminarli" — un salvataggio di questa stessa
                // sessione, fatto prima della rimozione, li porta ancora persistiti. Un progetto che
                // puntava a uno dei due torna automaticamente su "idx_classico" in lettura (vedi
                // getIndiceTemplateIdPerProgetto, fallback già esistente per un id sparito).
                delete state.indiceTemplates.idx_moderno;
                delete state.indiceTemplates.idx_tecnico;

                // Preferenze globali dell'app (tema scuro, palette colore, modalità espansa,
                // registro integrato, ecc.): vanno ripristinate qui, PRIMA di syncProjectToActiveState
                // qui sotto. Altrimenti quella funzione "preserva" le impostazioni globali già in
                // state.settings al momento della chiamata — che a un ricaricamento pagina sono
                // ancora quelle di default iniziali, mai quelle salvate — e il tema torna sempre
                // a quello di default dopo un refresh, anche se era stato cambiato in precedenza.
                if (parsed.settings && typeof parsed.settings === 'object') {
                    state.settings = JSON.parse(JSON.stringify(parsed.settings));
                }

                // Ora dell'ultimo backup completo: si salvava ma non si rileggeva mai, quindi dopo
                // ogni riavvio l'app diceva «mai» e il promemoria del backup non sapeva niente.
                if (typeof parsed.ultimoBackupCompleto === 'number') state.ultimoBackupCompleto = parsed.ultimoBackupCompleto;
                // Correzioni automatiche già fatte dal controllo di integrità (vedi verificaIntegrita).
                if (Array.isArray(parsed.registroCorrezioni)) state.registroCorrezioni = parsed.registroCorrezioni;
                state.versioneSchema = VERSIONE_SCHEMA_DATI;

                state.projects = (parsed.projects && typeof parsed.projects === 'object') ? parsed.projects : {};
                if (Object.keys(state.projects).length > 0) {
                    state.currentProjectId = parsed.currentProjectId || Object.keys(state.projects)[0];
                    const proj = state.projects[state.currentProjectId];
                    if (proj && proj.surveys && Object.keys(proj.surveys).length > 0) {
                        state.currentSurveyId = parsed.currentSurveyId || Object.keys(proj.surveys)[0];
                        syncProjectToActiveState(state.currentProjectId, state.currentSurveyId);
                    }
                }
            }

            /** MIGRAZIONE 0 → 1. Il formato 0 è quello di prima della Fase 1: nessun versioneSchema.
             * L'unica trasformazione è quella che faceva migrateLegacyState per i salvataggi di
             * prima dei progetti (prove sciolte in `archive`, o una prova sola in `header`/`logs`):
             * diventano progetti. Con una differenza voluta: si converte solo se `projects` MANCA.
             * Prima bastava che fosse vuoto, e un archivio senza progetti (tutti eliminati, o l'app
             * appena installata e riaperta) si ritrovava al riavvio un progetto fantasma «Nuovo
             * Cantiere» ricavato dall'intestazione rimasta in memoria.
             * Lavora sul solo oggetto `dati` (modificato e restituito): funziona anche su uno stato
             * parziale, come il contenitore { projects } di un file importato. */
            function migrazione0a1(dati, predefiniti) {
                const pre = predefiniti || {};
                const oggi = new Date().toISOString().split('T')[0];
                if (dati.projects && typeof dati.projects === 'object') {
                    dati.versioneSchema = 1;
                    return dati;
                }
                const progetti = {};
                const legacyArchive = dati.archive || {};
                const keys = Object.keys(legacyArchive);

                if (keys.length > 0) {
                    const comuneGroups = {};
                    keys.forEach(k => {
                        const item = legacyArchive[k];
                        const comuneKey = (item.header && item.header.comune) ? item.header.comune : 'Cantiere';
                        if (!comuneGroups[comuneKey]) comuneGroups[comuneKey] = [];
                        comuneGroups[comuneKey].push(item);
                    });

                    Object.keys(comuneGroups).forEach((cKey, gIdx) => {
                        const items = comuneGroups[cKey];
                        const firstItem = items[0];
                        const projId = `PROJ_${cKey.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${gIdx}`;

                        progetti[projId] = {
                            id: projId,
                            name: `Cantiere ${cKey}`,
                            comune: cKey,
                            committente: firstItem.header?.committente || '',
                            localita: firstItem.header?.localita || '',
                            operator: firstItem.settings?.operator || '',
                            date: firstItem.header?.date || oggi,
                            updatedAt: Date.now(),
                            surveys: {}
                        };

                        items.forEach((item, idx) => {
                            const survId = `SURV_${item.header?.provaNr || (idx + 1)}_${Date.now()}_${idx}`;
                            progetti[projId].surveys[survId] = {
                                id: survId,
                                header: item.header || { ...pre.header },
                                instrument: item.instrument || { ...pre.instrument },
                                settings: item.settings || { ...pre.settings },
                                currentCount: item.currentCount || 0,
                                currentDepthStart: item.currentDepthStart || 0,
                                currentRod: item.currentRod || 1,
                                logs: item.logs || [],
                                // Un file importato che non porta strati suoi non deve ereditare quelli del
                                // cantiere aperto in quel momento: è roba di un altro cantiere.
                                strati: item.strati || stratiInizialiProgettoNuovo(),
                                photos: item.photos || []
                            };
                        });
                    });
                } else if (dati.header) {
                    const comune = dati.header.comune || 'Nuovo Cantiere';
                    const projId = `PROJ_${Date.now()}`;
                    const survId = `SURV_1`;
                    progetti[projId] = {
                        id: projId,
                        name: comune,
                        comune: dati.header.comune || '',
                        committente: dati.header.committente || '',
                        localita: dati.header.localita || '',
                        operator: dati.settings?.operator || '',
                        date: dati.header.date || oggi,
                        updatedAt: Date.now(),
                        surveys: {
                            [survId]: {
                                id: survId,
                                header: dati.header || { ...pre.header },
                                instrument: dati.instrument || { ...pre.instrument },
                                settings: dati.settings || { ...pre.settings },
                                currentCount: dati.currentCount || 0,
                                currentDepthStart: dati.currentDepthStart || 0,
                                currentRod: dati.currentRod || 1,
                                logs: dati.logs || [],
                                // Come sopra: nessuna eredità dal cantiere aperto.
                                strati: dati.strati || stratiInizialiProgettoNuovo(),
                                photos: dati.photos || []
                            }
                        }
                    };
                }

                // Si apre il primo progetto, come faceva il caricamento di prima.
                dati.projects = progetti;
                dati.currentProjectId = Object.keys(progetti)[0] || null;
                dati.currentSurveyId = dati.currentProjectId ? (Object.keys(progetti[dati.currentProjectId].surveys)[0] || null) : null;
                dati.versioneSchema = 1;
                return dati;
            }

            // Caricamento Dati da LocalStorage.
            // Se il testo salvato non si legge, NON lo si ignora (prima l'app partiva vuota e il primo
            // salvataggio lo cancellava): lo si mette in quarantena, si blocca il salvataggio e si
            // avvisa. Vedi datiNonCaricati, in 004a.
            function loadState() {
                let saved = null;
                try {
                    saved = localStorage.getItem('dpsh_app_state');
                } catch (e) {
                    // Memoria del browser non raggiungibile: non si sa cosa contenga, quindi non ci si
                    // scrive sopra. Succede con i dati del sito bloccati, non per un difetto dell'app.
                    datiNonCaricati('inaccessibile', null, (e && e.message) || String(e));
                    updateUI();
                    return;
                }
                if (saved === null || saved === '') {
                    caricamentoDati.esito = 'vuoto';
                    caricamentoDati.bloccato = false;
                    updateUI();
                    return;
                }
                const lettura = leggiStatoSalvato(saved);
                if (!lettura.ok) {
                    datiNonCaricati(lettura.motivo, saved, lettura.dettaglio);
                    updateUI();
                    return;
                }
                let migrazioni;
                try {
                    // Prima le migrazioni registrate (vedi 004b), poi il caricamento nello stato.
                    migrazioni = migraDati(lettura.dati, lettura.versione, predefinitiPerMigrazioni());
                    // Controllo di integrità (004c) sui dati letti, PRIMA di portarli nello stato: le
                    // sole correzioni banali si applicano qui e si registrano; il resto si segnala più
                    // avanti, a caricamento finito (controllaIntegritaDopoAvvio, che guarda anche le foto).
                    const integrita = verificaIntegrita(migrazioni.dati, { correggi: true });
                    registraCorrezioni(migrazioni.dati, integrita.correzioni, 'avvio');
                    applicaStatoSalvato(migrazioni.dati);
                } catch (e) {
                    // Un JSON valido ma con una forma che il caricamento non regge: stesso trattamento
                    // di un testo illeggibile, perché lo stato a metà non va salvato sopra l'originale.
                    datiNonCaricati('illeggibile', saved, 'caricamento interrotto: ' + ((e && e.message) || e));
                    updateUI();
                    return;
                }
                caricamentoDati.esito = 'ok';
                // Quello che si è appena letto è il punto di partenza: nessuna modifica (Fase 2).
                try { primaContenutiConosciuti(); } catch (e) { ignoraErrore('primaContenutiConosciuti', e); }
                if (migrazioni.applicate.length > 0) {
                    // Il testo di prima va nelle copie automatiche PRIMA che un salvataggio lo riscriva
                    // nel formato nuovo: fino ad allora saveState resta sospeso.
                    copiaPrimaDiAggiornareIDati(saved, migrazioni.applicate);
                } else {
                    caricamentoDati.bloccato = false;
                }
                updateUI();
                // Asincrono (legge gli id delle foto in IndexedDB) e dopo l'avvio: non rallenta
                // l'apertura, e l'eventuale avviso arriva quando l'app è già in piedi.
                setTimeout(() => { controllaIntegritaDopoAvvio().catch(e => ignoraErrore('controllaIntegritaDopoAvvio', e)); }, 0);
            }

            // CACHE IN-MEMORY PER FOTO ORIGINALI (RAM)
            const photoMemoryCache = {};
            // CACHE IN-MEMORY PER LE IMMAGINI INCORPORATE NELLE NOTE DI PROGETTO (stesso motivo)
            const noteImageMemoryCache = {};

            /** Rimuove dall'HTML di una nota i dataUrl delle immagini <img data-note-img-id="...">
             * prima di scrivere su localStorage, salvandoli in noteImageMemoryCache (il pieno resta
             * anche su IndexedDB via saveNoteImageToIDB, chiamato al momento dell'inserimento
             * dell'immagine) — stesso schema già usato per le foto, per non sforare i 5MB. */
            function stripNoteImagesHtml(html) {
                if (!html || html.indexOf('data-note-img-id') === -1) return html;
                try {
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    doc.querySelectorAll('img[data-note-img-id]').forEach(img => {
                        const id = img.getAttribute('data-note-img-id');
                        const src = img.getAttribute('src');
                        if (id && src && src.indexOf('data:') === 0) {
                            noteImageMemoryCache[id] = src;
                            img.setAttribute('src', '');
                        }
                    });
                    return doc.body.innerHTML;
                } catch(e) {
                    return html;
                }
            }

            // Salvataggio Dati in LocalStorage (Alleggerito dal payload foto pesanti per restare nei 5MB)
            function saveState() {
                // Niente scrittura mentre i dati salvati non sono ancora stati letti, o non si sono
                // potuti leggere (vedi caricamentoDati in cima allo script): si conta soltanto, così
                // chi sblocca sa se c'è qualcosa da salvare.
                if (caricamentoDati.bloccato) {
                    caricamentoDati.salvataggiEvitati++;
                    return;
                }
                try {
                    syncStateToProject();
                    // Data dell'ultima modifica VERA di ogni progetto (Fase 2, pezzo 004e). Un suo
                    // errore non deve mai fermare il salvataggio: si registra e si va avanti.
                    try { registraModificheVere(); } catch (e) { ignoraErrore('registraModificheVere', e); }
                    const cleanState = JSON.parse(JSON.stringify(state));
                    if (cleanState.photos && cleanState.photos.length > 0) {
                        cleanState.photos.forEach(p => {
                            if (p.dataUrl) {
                                photoMemoryCache[p.id] = p.dataUrl;
                                delete p.dataUrl;
                            }
                        });
                    }
                    if (cleanState.projects) {
                        Object.keys(cleanState.projects).forEach(pid => {
                            const proj = cleanState.projects[pid];
                            if (proj.surveys) {
                                Object.keys(proj.surveys).forEach(sid => {
                                    if (proj.surveys[sid].photos) {
                                        proj.surveys[sid].photos.forEach(p => {
                                            if (p.dataUrl) {
                                                photoMemoryCache[p.id] = p.dataUrl;
                                                delete p.dataUrl;
                                            }
                                        });
                                    }
                                });
                            }
                            if (proj.notes && proj.notes.html) {
                                proj.notes.html = stripNoteImagesHtml(proj.notes.html);
                            }
                            // Stessa cura per la copia conservata prima della conversione al nuovo
                            // motore: e' testo destinato a sparire appena l'utente conferma, non
                            // deve intanto occupare spazio con le immagini incorporate.
                            if (proj.notes && proj.notes.htmlPrimaDelMotore) {
                                proj.notes.htmlPrimaDelMotore = stripNoteImagesHtml(proj.notes.htmlPrimaDelMotore);
                            }
                        });
                    }
                    const testoStato = JSON.stringify(cleanState);
                    localStorage.setItem('dpsh_app_state', testoStato);
                    // SALVATAGGIO VERIFICATO (Fase 1): si rilegge e si confronta la lunghezza, come fa
                    // salvaFotoConGaranzia per le foto. setItem che «riesce» ma lascia in memoria altro
                    // (testo troncato, memoria del browser che non tiene) è raro, ma è esattamente il
                    // caso che nessuno vedrebbe fino alla riapertura. Diventa un errore come gli altri,
                    // e quindi l'avviso di avvisaSalvataggioFallito.
                    const riletto = localStorage.getItem('dpsh_app_state');
                    if (riletto === null || riletto.length !== testoStato.length) {
                        const errore = new Error(`il salvataggio non si rilegge uguale (scritti ${testoStato.length} caratteri, riletti ${riletto === null ? 'nessuno' : riletto.length})`);
                        errore.name = 'SalvataggioNonVerificato';
                        throw errore;
                    }
                    // COPIA AUTOMATICA: al massimo una ogni 5 minuti, e solo se lo stato è cambiato
                    // dall'ultima copia (lo controlla scriviCopiaAutomatica). La scrittura va avanti da
                    // sola e non blocca il salvataggio.
                    if (copieAutomatiche.pronto && Date.now() - copieAutomatiche.ultimaPeriodica >= COPIE_REGOLE.intervalloMs) {
                        copieAutomatiche.ultimaPeriodica = Date.now();
                        scriviCopiaAutomatica('periodica', 'automatica', testoStato);
                    }
                    // Un salvataggio riuscito riarma l'avviso: se lo spazio è stato liberato e più
                    // avanti si riempie di nuovo, l'utente va avvisato un'altra volta.
                    salvataggioGiaSegnalatoRotto = false;
                } catch (e) {
                    console.warn('saveState error:', e);
                    avvisaSalvataggioFallito(e);
                }
            }

            /** Vero da quando l'utente è stato avvisato che i salvataggi non passano più, fino al
             * primo salvataggio di nuovo riuscito. Serve perché saveState() viene chiamata a ogni
             * singola azione: senza questa guardia, con lo spazio esaurito l'app aprirebbe una
             * finestra ad ogni tocco, e l'avviso diventerebbe qualcosa da chiudere a raffica invece
             * che da leggere. */
            let salvataggioGiaSegnalatoRotto = false;

            /** Rende VISIBILE un salvataggio fallito. Prima qui c'era solo un console.warn: se lo
             * spazio del browser si esauriva, da quel momento ogni salvataggio non faceva più nulla
             * e l'utente continuava a lavorare convinto del contrario, scoprendo la perdita solo
             * riaprendo l'app — con una giornata di rilievo persa. Il messaggio è volutamente
             * operativo: dice cosa NON fare (continuare come se niente fosse) e le due azioni che
             * risolvono davvero, entrambe già presenti nel menu. */
            function avvisaSalvataggioFallito(e) {
                if (salvataggioGiaSegnalatoRotto) return;
                salvataggioGiaSegnalatoRotto = true;
                // Lo spazio esaurito si riconosce dal nome dell'errore (varia tra browser) oppure
                // dai codici storici 22 / 1014: sono casi diversi da un errore generico, e meritano
                // istruzioni diverse.
                const spazioEsaurito = e && (
                    e.name === 'QuotaExceededError' ||
                    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                    e.code === 22 || e.code === 1014
                );
                const messaggio = spazioEsaurito
                    ? 'SPAZIO ESAURITO: da questo momento i dati NON vengono più salvati.\n\n'
                      + 'Non continuare a lavorare: tutto quello che aggiungerai andrebbe perso alla chiusura dell\'app.\n\n'
                      + 'Cosa fare, in questo ordine:\n'
                      + '1) Menu ☰ → Backup Completo → Esporta (mette al sicuro quello che hai già)\n'
                      + '2) Menu ☰ → Spazio occupato → "Foto orfane" (libera spazio senza perdere niente)'
                    : 'Non è stato possibile salvare i dati su questo dispositivo.\n\n'
                      + 'Non continuare a lavorare prima di aver fatto un backup: Menu ☰ → Backup Completo → Esporta.\n\n'
                      + 'Dettaglio tecnico: ' + ((e && e.message) || e);
                appAlert(messaggio);
            }

            // DOM Elements
            const lblBlowCount = document.getElementById('lblBlowCount');
            const lblDepthRange = document.getElementById('lblDepthRange');
            const lblCurrentRod = document.getElementById('lblCurrentRod');
            const lblTotalDepth = document.getElementById('lblTotalDepth');
            const lblTotalSteps = document.getElementById('lblTotalSteps');
            const tblLogsBody = document.getElementById('tblLogsBody');
            const lblSurveySummary = document.getElementById('lblSurveySummary');
            const lblSurveySub = document.getElementById('lblSurveySub');
            const svgChart = document.getElementById('svgChart');

            const btnPlus = document.getElementById('btnPlus');
            const btnMinus = document.getElementById('btnMinus');
            const btnGetGpsHeader = document.getElementById('btnGetGpsHeader');
            const btnOpenSurveyDrawer = document.getElementById('btnOpenSurveyDrawer');
            
            const btnExportExcel = document.getElementById('btnExportExcel');
            const btnExportKmlSingle = document.getElementById('btnExportKmlSingle');

            // Inputs Metadati Cantiere
            const txtCommittente = document.getElementById('txtCommittente');
            const txtComune = document.getElementById('txtComune');
            const txtLocalita = document.getElementById('txtLocalita');
            const txtDataIndagine = document.getElementById('txtDataIndagine');
            const txtProvaNr = document.getElementById('txtProvaNr');
            const numHeaderLunghAsta = document.getElementById('numHeaderLunghAsta');

            // Inputs Dati Strumento
            const numPesoMassa = document.getElementById('numPesoMassa');
            const numPesoAsta = document.getElementById('numPesoAsta');
            const numLunghAsta = document.getElementById('numLunghAsta');
            const numCambioAsta = document.getElementById('numCambioAsta');
            const numPesoSistema = document.getElementById('numPesoSistema');
            const numVolata = document.getElementById('numVolata');
            const numAreaPunta = document.getElementById('numAreaPunta');
            const numAngoloPunta = document.getElementById('numAngoloPunta');

            // Modal Elements
            const modalOverlay = document.getElementById('modalOverlay');
            const modalEditStep = document.getElementById('modalEditStep');
            const numModalStart = document.getElementById('numModalStart');
            const numModalEnd = document.getElementById('numModalEnd');
            const numModalColpi = document.getElementById('numModalColpi');
            const txtModalNote = document.getElementById('txtModalNote');
            const btnModalCancel = document.getElementById('btnModalCancel');
            const btnModalSave = document.getElementById('btnModalSave');
            const btnModalDelete = document.getElementById('btnModalDelete');
            const btnAddRowManual = document.getElementById('btnAddRowManual');

            // Modal Nota Personalizzata
            const btnCustomNote = document.getElementById('btnCustomNote');
            const modalCustomNoteOverlay = document.getElementById('modalCustomNoteOverlay');
            const modalCustomNote = document.getElementById('modalCustomNote');
            const txtCustomNoteInput = document.getElementById('txtCustomNoteInput');
            const btnCustomNoteCancel = document.getElementById('btnCustomNoteCancel');
            const btnCustomNoteSave = document.getElementById('btnCustomNoteSave');
            const selModalLithology = document.getElementById('selModalLithology');
            const btnCloseEditModalX = document.getElementById('btnCloseEditModalX');

            // Modal Scheda Dettaglio (Read-Only)
            const modalViewOverlay = document.getElementById('modalViewOverlay');
            const modalViewStep = document.getElementById('modalViewStep');
            const lblViewStepNum = document.getElementById('lblViewStepNum');
            const txtViewStart = document.getElementById('txtViewStart');
            const txtViewEnd = document.getElementById('txtViewEnd');
            const txtViewColpi = document.getElementById('txtViewColpi');
            const txtViewAsta = document.getElementById('txtViewAsta');
            const txtViewLithology = document.getElementById('txtViewLithology');
            const txtViewRpd = document.getElementById('txtViewRpd');
            const txtViewNote = document.getElementById('txtViewNote');
            const btnViewSwitchToEdit = document.getElementById('btnViewSwitchToEdit');
            const btnViewClose = document.getElementById('btnViewClose');

            // Drawer & Archive Elements
            const drawerMenu = document.getElementById('drawerMenu');
            const drawerOverlay = document.getElementById('drawerOverlay');
            const btnHamburger = document.getElementById('btnHamburger');
            const btnCloseDrawer = document.getElementById('btnCloseDrawer');

            const selPenetrometer = document.getElementById('selPenetrometer');
            const selStepCm = document.getElementById('selStepCm');
            const chkHaptic = document.getElementById('chkHaptic');
            const chkAudio = document.getElementById('chkAudio');
            const chkWakeLock = document.getElementById('chkWakeLock');
            const chkDarkMode = document.getElementById('chkDarkMode');
            const btnClearHistory = document.getElementById('btnClearHistory');

            // FUNZIONI STRATI LITOLOGICI DINAMICI
            function getStratoById(id) {
                return state.strati.find(s => s.id === id) || state.strati[0];
            }

            // Ottiene la litologia effettiva attiva per lo step ad indice idx (con ereditarietà dagli step precedenti)
            function getEffectiveLithology(idx) {
                let currentLitId = state.strati[0].id; // Default: primo strato
                for (let i = 0; i <= idx && i < state.logs.length; i++) {
                    if (state.logs[i].lithology) {
                        currentLitId = state.logs[i].lithology;
                    }
                }
                return getStratoById(currentLitId);
            }

            // Popola il dropdown strati nel modale di editing
            function populateStratiDropdown() {
                if (!selModalLithology) return;
                selModalLithology.innerHTML = '<option value="">(Eredita da step precedente)</option>';
                state.strati.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = `● ${s.name}`;
                    opt.style.color = s.color;
                    selModalLithology.appendChild(opt);
                });
            }

