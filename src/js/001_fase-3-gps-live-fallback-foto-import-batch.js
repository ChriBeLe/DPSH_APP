            // ===================== FASE 3: GPS LIVE, FALLBACK FOTO, IMPORT BATCH =====================
            let liveGpsWatch = { lat: null, lng: null, acc: null, alt: null, timestamp: null };
            let liveGpsWatchId = null;
            let currentFallbackPhotoId = null;
            let leafletLoaded = false;
            let leafletLoadingPromise = null;
            let photoGpsMapInstance = null;
            let photoGpsMapMarker = null;

            // Sincronizza lo stato attivo (header, logs, strati, photos, ecc.) nel dizionario del progetto corrente
            function syncStateToProject() {
                if (!state.projects) state.projects = {};
                if (!state.currentProjectId || !state.projects[state.currentProjectId]) {
                    // Se l'utente si trova in Home View e non c'è un progetto attivo, non ricreare progetti fantasma!
                    if (state.uiState && state.uiState.currentView === 'home') {
                        return;
                    }
                    const comune = state.header.comune || 'Nuovo Cantiere';
                    const projId = `PROJ_${Date.now()}`;
                    state.projects[projId] = {
                        id: projId,
                        name: comune,
                        comune: state.header.comune || '',
                        committente: state.header.committente || '',
                        localita: state.header.localita || '',
                        operator: state.settings.operator || '',
                        date: state.header.date || new Date().toISOString().split('T')[0],
                        updatedAt: Date.now(),
                        surveys: {}
                    };
                    state.currentProjectId = projId;
                }

                const proj = state.projects[state.currentProjectId];
                if (!proj.surveys) proj.surveys = {};

                if (!state.currentSurveyId || !proj.surveys[state.currentSurveyId]) {
                    const survId = `SURV_${state.header.provaNr || '1'}_${Date.now()}`;
                    state.currentSurveyId = survId;
                }

                scriviStatoAttivoNelProgetto(proj);
            }

            /** La prova aperta (stato attivo) scritta dentro `proj`: la parte di syncStateToProject che
             * tocca il progetto, separata perché serve anche a sapere cosa scriverà il prossimo
             * salvataggio senza scriverlo davvero (accettaNormalizzazioneApertura, pezzo 004e). */
            function scriviStatoAttivoNelProgetto(proj) {
                if (!proj.surveys) proj.surveys = {};
                proj.surveys[state.currentSurveyId] = {
                    id: state.currentSurveyId,
                    header: JSON.parse(JSON.stringify(state.header)),
                    instrument: JSON.parse(JSON.stringify(state.instrument)),
                    settings: JSON.parse(JSON.stringify(state.settings)),
                    currentCount: state.currentCount,
                    currentDepthStart: state.currentDepthStart,
                    currentRod: state.currentRod,
                    logs: JSON.parse(JSON.stringify(state.logs)),
                    photos: state.photos ? JSON.parse(JSON.stringify(state.photos)) : [],
                    reportTemplateId: state.reportTemplateId || null,
                    // Immagini dei blocchi "immagine-libera" del template di report: per PROVA (non
                    // per template, che è condiviso tra più prove — vedi buildBlockContentHtml).
                    templateImages: state.templateImages ? JSON.parse(JSON.stringify(state.templateImages)) : {},
                    updatedAt: Date.now()
                };

                // Gli Strati Litologici sono condivisi a livello di PROGETTO (non per singola prova):
                // modificandoli da una prova, si aggiornano automaticamente per tutte le prove del cantiere.
                proj.strati = JSON.parse(JSON.stringify(state.strati));

                proj.updatedAt = Date.now();
                if (state.header.comune) proj.comune = state.header.comune;
                if (state.header.committente) proj.committente = state.header.committente;
                if (state.header.localita) proj.localita = state.header.localita;
                if (state.header.date) proj.date = state.header.date;
                if (state.settings.operator) proj.operator = state.settings.operator;
            }

            // Carica nello stato attivo la prova selezionata del progetto corrente
            function syncProjectToActiveState(projId, survId) {
                if (!state.projects || !state.projects[projId]) return;
                const proj = state.projects[projId];
                if (!survId || !proj.surveys || !proj.surveys[survId]) {
                    const keys = Object.keys(proj.surveys || {});
                    if (keys.length > 0) survId = keys[0];
                    else return;
                }

                // Salva le impostazioni globali dell'applicazione (tema scuro, palette, tasto Registra
                // visibile, registro integrato): quelle salvate con la prova non le devono cambiare.
                // (expandedMode e compactMode non esistono più: migrazione 2→3, pezzo 004b.)
                const globalDarkMode = (state.settings && state.settings.darkMode !== undefined) ? state.settings.darkMode : true;
                // La palette colore (themeHue) è una preferenza dell'APP, non della singola prova: senza
                // questa riga, ogni prova riportava a galla la palette che era attiva quando è stata
                // creata (salvata per errore dentro la stessa fotografia di impostazioni del passo di
                // misura ecc.), dando l'impressione che il tema "cambiasse da una prova all'altra".
                const globalThemeHue = (state.settings && state.settings.themeHue !== undefined) ? state.settings.themeHue : 'antracite';
                const globalTastoRegistra = !(state.settings && state.settings.tastoRegistraVisibile === false);
                const globalIntegratedChart = (state.settings && state.settings.integratedChart !== undefined) ? state.settings.integratedChart : true;
                const globalRegistroEspanso = !!(state.settings && state.settings.registroEspanso === true);
                const globalContatoreSuPc = !!(state.settings && state.settings.contatoreSuPc === true);
                const globalGuidaPcVista = !!(state.settings && state.settings.guidaPcVista === true);
                const globalRecentiInCima = !!(state.settings && state.settings.intervalliRecentiInCima === true);

                state.currentProjectId = projId;
                state.currentSurveyId = survId;

                const surv = proj.surveys[survId];
                state.header = JSON.parse(JSON.stringify(surv.header || state.header));
                state.instrument = JSON.parse(JSON.stringify(surv.instrument || state.instrument));
                // βt DICHIARATO DAL CANTIERE. Il coefficiente vive sullo strumento, che e' della
                // singola prova: cosi' una prova puo' averne uno suo, ed e' giusto (magari e'
                // stata fatta con un altro penetrometro). Ma quando e' il CANTIERE a dichiararlo,
                // ogni prova che non ne ha uno proprio lo adotta — comprese quelle create dopo.
                // Risolvere qui, in un punto solo, evita di passare il progetto alle tre funzioni
                // di calcolo che oggi conoscono soltanto lo strumento.
                if (!state.instrument.betaTForzato && proj.betaTForzato) {
                    state.instrument.betaTForzato = proj.betaTForzato;
                }
                state.settings = JSON.parse(JSON.stringify(surv.settings || state.settings));

                // Riapplica le impostazioni universali dell'applicazione
                state.settings.darkMode = globalDarkMode;
                state.settings.themeHue = globalThemeHue;
                state.settings.tastoRegistraVisibile = globalTastoRegistra;
                delete state.settings.expandedMode;
                delete state.settings.compactMode;
                state.settings.integratedChart = globalIntegratedChart;
                // Scritte solo se attive: assenti valgono «no», e i dati salvati restano quelli di prima.
                if (globalRegistroEspanso) state.settings.registroEspanso = true; else delete state.settings.registroEspanso;
                if (globalContatoreSuPc) state.settings.contatoreSuPc = true; else delete state.settings.contatoreSuPc;
                if (globalGuidaPcVista) state.settings.guidaPcVista = true; else delete state.settings.guidaPcVista;
                if (globalRecentiInCima) state.settings.intervalliRecentiInCima = true; else delete state.settings.intervalliRecentiInCima;

                state.currentCount = surv.currentCount || 0;
                state.currentDepthStart = surv.currentDepthStart || 0;
                state.currentRod = surv.currentRod || 1;
                state.logs = JSON.parse(JSON.stringify(surv.logs || []));

                // Strati Litologici condivisi a livello di PROGETTO. Se il progetto non ha ancora
                // un proprio elenco strati (dati salvati prima di questo aggiornamento), lo eredita
                // una tantum dalla prova corrente, così le litologie già inserite non vengono perse.
                if (!proj.strati || proj.strati.length === 0) {
                    proj.strati = JSON.parse(JSON.stringify((surv.strati && surv.strati.length > 0) ? surv.strati : state.strati));
                }
                state.strati = JSON.parse(JSON.stringify(proj.strati));

                state.photos = surv.photos ? JSON.parse(JSON.stringify(surv.photos)) : [];
                state.reportTemplateId = surv.reportTemplateId || null;
                state.templateImages = surv.templateImages ? JSON.parse(JSON.stringify(surv.templateImages)) : {};
                // Aprire non è modificare (Fase 2): vedi accettaNormalizzazioneApertura.
                try { accettaNormalizzazioneApertura(projId); } catch (e) { ignoraErrore('syncProjectToActiveState', e); }
            }

            // Audio Context per Bip Sonoro (Generato dinamicamente offline)
            let audioCtx = null;
            function playBeep(freq = 600, duration = 0.05) {
                if (!state.settings.audio) return;
                try {
                    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start();
                    osc.stop(audioCtx.currentTime + duration);
                } catch (e) { ignoraErrore('playBeep', e); }
            }

            // Haptic Feedback (Vibrazione)
            // COERENZA UX MODALI: prima ogni finestra gestiva la chiusura a modo suo (alcune solo
            // con la X, altre solo col tasto Annulla, altre col click sull'overlay). Qui si applica
            // un comportamento uniforme a TUTTE le finestre: ESC chiude, e il click sullo sfondo
            // scuro chiude. Le finestre distruttive (conferma eliminazione) sono escluse di proposito,
            // per evitare chiusure accidentali che facciano perdere il contesto dell'azione.
            // modalTemplateEditor è incluso perché la sua chiusura passa sempre da
            // richiediChiusuraTemplateEditor() (che chiede conferma se ci sono modifiche non
            // salvate): niente ESC/click-sfondo generico che la scavalchi silenziosamente.
            const MODALS_NO_QUICK_CLOSE = ['modalConfirmDelete', 'appDialog', 'modalTemplateEditor'];

            // FINESTRE E DATI NON SALVATI (Fase C): prima ESC e il clic sullo sfondo chiudevano TUTTE
            // le finestre aperte insieme, anche con un campo appena modificato: si perdeva il lavoro
            // senza una parola. Ora si chiude solo la finestra più in alto, e se ha campi cambiati
            // dall'apertura si chiede conferma. «Sporco» si rileva in modo generico, senza toccare le
            // singole finestre: un osservatore registra i valori dei campi quando .open compare, e
            // conta come modificato solo un campo su cui l'utente ha scritto (eventi input/change) e
            // il cui valore ora differisce da quello d'apertura: un campo riempito dal codice dopo
            // l'apertura non fa scattare nulla da solo.
            const _statoFinestre = new Map();   // modal -> { seq, base: Map(campo -> valore), toccati: Set }
            let _seqFinestre = 0;
            const _SEL_CAMPI = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
            function _valoreCampo(el) {
                if (el.type === 'checkbox' || el.type === 'radio') return el.checked ? '1' : '0';
                if (!('value' in el)) return el.innerHTML;
                return String(el.value == null ? '' : el.value);
            }
            function _campoControllabile(el) {
                const tipo = (el.type || '').toLowerCase();
                return !['hidden', 'button', 'submit', 'reset', 'file', 'image'].includes(tipo);
            }
            function _fotografaFinestra(modalEl) {
                const base = new Map();
                modalEl.querySelectorAll(_SEL_CAMPI).forEach(c => { if (_campoControllabile(c)) base.set(c, _valoreCampo(c)); });
                _statoFinestre.set(modalEl, { seq: ++_seqFinestre, base, toccati: new Set() });
            }
            function _finestraSporca(modalEl) {
                const st = _statoFinestre.get(modalEl);
                if (!st) return false;
                for (const c of st.toccati) {
                    if (!modalEl.contains(c)) continue;
                    const prima = st.base.has(c) ? st.base.get(c)
                        : ((c.type === 'checkbox' || c.type === 'radio') ? (c.defaultChecked ? '1' : '0') : String(c.defaultValue || ''));
                    if (_valoreCampo(c) !== prima) return true;
                }
                return false;
            }
            new MutationObserver(() => {
                document.querySelectorAll('.modal').forEach(m => {
                    const aperta = m.classList.contains('open');
                    if (aperta && !_statoFinestre.has(m)) _fotografaFinestra(m);
                    else if (!aperta && _statoFinestre.has(m)) _statoFinestre.delete(m);
                });
            }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'], subtree: true });
            ['input', 'change'].forEach(ev => document.addEventListener(ev, (e) => {
                const m = e.target && e.target.closest && e.target.closest('.modal');
                const st = m && _statoFinestre.get(m);
                if (st && e.target.matches && e.target.matches(_SEL_CAMPI)) st.toccati.add(e.target);
            }, true));
            // Un campo comparso dopo l'apertura (righe aggiunte dall'utente) non ha un valore d'apertura:
            // lo si registra appena prende il fuoco, prima che l'utente lo cambi.
            document.addEventListener('focusin', (e) => {
                const m = e.target && e.target.closest && e.target.closest('.modal');
                const st = m && _statoFinestre.get(m);
                if (st && e.target.matches && e.target.matches(_SEL_CAMPI) && _campoControllabile(e.target) && !st.base.has(e.target)) st.base.set(e.target, _valoreCampo(e.target));
            }, true);

            /** La finestra più in alto: z-index più alto, a parità l'ultima aperta. */
            function finestraInCima() {
                let migliore = null, mz = -Infinity, ms = -Infinity;
                document.querySelectorAll('.modal.open').forEach(m => {
                    const z = parseInt(getComputedStyle(m).zIndex, 10) || 0;
                    const s = (_statoFinestre.get(m) || { seq: 0 }).seq;
                    if (z > mz || (z === mz && s >= ms)) { migliore = m; mz = z; ms = s; }
                });
                return migliore;
            }
            function _chiudiFinestraSemplice(modalEl) {
                modalEl.classList.remove('open');
                const ov = modalEl.previousElementSibling;
                if (ov && ov.classList.contains('modal-overlay')) ov.classList.remove('open');
            }
            let _confermaChiusuraAperta = false;
            /** Chiede se perdere i dati non salvati; risolve true se l'utente vuole chiudere. */
            function _confermaPerditaDati() {
                if (_confermaChiusuraAperta) return Promise.resolve(false);
                _confermaChiusuraAperta = true;
                return appDialog('Hai dati non salvati in questa finestra. Chiudere e perderli?', {
                    confirm: true, okLabel: 'Chiudi senza salvare', cancelLabel: 'Torna alla finestra'
                }).then(r => r === true, () => false).finally(() => { _confermaChiusuraAperta = false; });
            }
            /** Chiude la finestra più in alto (ESC, Indietro). Ritorna true se c'era una finestra da
             * gestire (anche se resta aperta in attesa della risposta dell'utente). */
            function chiudiFinestraInCima(giaConfermato) {
                const m = finestraInCima();
                if (!m) return false;
                if (MODALS_NO_QUICK_CLOSE.includes(m.id)) return true;
                if (!giaConfermato && _finestraSporca(m)) {
                    _confermaPerditaDati().then(chiudi => { if (chiudi && m.classList.contains('open')) _chiudiFinestraSemplice(m); });
                    return true;
                }
                _chiudiFinestraSemplice(m);
                return true;
            }
            function closeAnyOpenModal() { return chiudiFinestraInCima(); }

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeAnyOpenModal();
            });

            // Clic sullo sfondo: se la finestra è sporca il clic viene fermato in cattura, prima dei
            // gestori delle singole finestre; dopo la conferma lo si rilancia segnato come «già
            // confermato», così gira la loro chiusura normale (che fa anche le sue pulizie).
            const _sfondoConfermato = new WeakSet();
            document.addEventListener('click', (e) => {
                const ov = e.target;
                if (!ov || !ov.classList || !ov.classList.contains('modal-overlay')) return;
                if (_sfondoConfermato.has(ov)) return;
                const m = ov.nextElementSibling;
                if (!m || !m.classList.contains('modal') || MODALS_NO_QUICK_CLOSE.includes(m.id) || !_finestraSporca(m)) return;
                e.stopImmediatePropagation();
                e.preventDefault();
                _confermaPerditaDati().then(chiudi => {
                    if (chiudi && m.classList.contains('open')) { _sfondoConfermato.add(ov); ov.click(); }
                });
            }, true);

            document.querySelectorAll('.modal-overlay').forEach(ov => {
                ov.addEventListener('click', () => {
                    // Clic già confermato in cattura: qui non si richiede una seconda volta.
                    const confermato = _sfondoConfermato.delete(ov);
                    chiudiFinestraInCima(confermato);
                });
            });

