            // ===================== IMPOSTAZIONI DELLA SINGOLA PROVA =====================
            // Penetrometro/passo/geometria strumento: si tocca e tiene premuta la "pillola" della
            // prova nella barra di Vista Prova per aprirli. I campi dentro la modale (selPenetrometer,
            // numPesoMassa, ecc.) sono gli STESSI elementi che prima stavano nel drawer Impostazioni,
            // solo spostati di posto in HTML: leggono/scrivono ancora direttamente state.instrument e
            // state.settings tramite i listener già esistenti, quindi non serve duplicare quella logica.
            let surveySettingsContext = null;
            const modalSurveySettingsOverlay = document.getElementById('modalSurveySettingsOverlay');
            const modalSurveySettings = document.getElementById('modalSurveySettings');
            const lblSurveySettingsTitle = document.getElementById('lblSurveySettingsTitle');
            const btnCloseSurveySettingsX = document.getElementById('btnCloseSurveySettingsX');
            const btnSurveySettingsDelete = document.getElementById('btnSurveySettingsDelete');

            /** Id della verticale a cui appartiene una prova: la prova stessa, o quella di cui è
             * un'interpretazione alternativa (header.interpretazioneDi). Il campo vive nell'intestazione
             * perché syncStateToProject ricostruisce la prova da state a ogni salvataggio e
             * dell'intestazione copia tutto: messo direttamente sulla prova sparirebbe subito. */
            function radiceProva(surv) {
                const h = (surv && surv.header) || {};
                return h.interpretazioneDi || (surv && surv.id) || null;
            }

            /** Una prova per verticale reale, nell'ordine ricevuto: per ogni radice vale l'originale se
             * c'è, altrimenti la prima interpretazione incontrata. È l'elenco giusto per contare le prove
             * eseguite e per le pin: due interpretazioni dello stesso sondaggio sono UN sondaggio. */
            function proveFisiche(prove) {
                const scelta = new Map();
                (prove || []).forEach(s => {
                    const radice = radiceProva(s);
                    const gia = scelta.get(radice);
                    const originale = !(s && s.header && s.header.interpretazioneDi);
                    if (!gia || (originale && gia.header && gia.header.interpretazioneDi)) scelta.set(radice, s);
                });
                return (prove || []).filter(s => scelta.get(radiceProva(s)) === s);
            }

            /** Lettera della prossima interpretazione di una verticale: B, poi C, D… saltando quelle già
             * usate dalle interpretazioni esistenti della stessa radice. */
            function prossimaLetteraInterpretazione(proj, radiceId) {
                const usate = new Set();
                Object.values((proj && proj.surveys) || {}).forEach(s => {
                    const h = (s && s.header) || {};
                    if (h.interpretazioneDi !== radiceId) return;
                    const m = String(h.provaNr || '').match(/([A-Z])$/);
                    if (m) usate.add(m[1]);
                });
                for (let codice = 66; codice <= 90; codice++) {
                    const lettera = String.fromCharCode(codice);
                    if (!usate.has(lettera)) return lettera;
                }
                return 'Z';
            }

            /** Crea un'interpretazione alternativa della prova: stessi colpi, intestazione, strumento,
             * falda e foto, con un id nuovo e il numero «3B». Le foto restano condivise con l'originale
             * (vedi idFotoAncoraInUso). Poi apre la copia, così si riassegnano subito gli strati. */
            function duplicaProvaComeInterpretazione(survId) {
                const projId = state.currentProjectId;
                const proj = state.projects && state.projects[projId];
                if (!proj || !proj.surveys || !proj.surveys[survId]) return null;
                if (survId === state.currentSurveyId) syncStateToProject();
                const orig = proj.surveys[survId];
                const radice = radiceProva(orig);
                const provaRadice = proj.surveys[radice] || orig;
                const numeroBase = String((provaRadice.header && provaRadice.header.provaNr) || '1').replace(/[A-Z]+$/, '');
                const lettera = prossimaLetteraInterpretazione(proj, radice);
                const copia = JSON.parse(JSON.stringify(orig));
                const nuovoId = `SURV_${numeroBase}${lettera}_${Date.now()}`;
                copia.id = nuovoId;
                copia.header = copia.header || {};
                copia.header.provaNr = numeroBase + lettera;
                copia.header.interpretazioneDi = radice;
                copia.updatedAt = Date.now();
                proj.surveys[nuovoId] = copia;
                saveState();
                syncProjectToActiveState(projId, nuovoId);
                updateUI();
                saveState();
                return nuovoId;
            }

            /** La scheda della prova (Fase 4): linguette Dati e Strumento; da Dati si aprono GPS, foto e falda. */
            function mostraSchedaProva(scheda) {
                modalSurveySettings.querySelectorAll('[data-scheda-prova]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.schedaProva === scheda)));
                modalSurveySettings.querySelectorAll('[data-pannello-prova]').forEach(p => { p.style.display = p.dataset.pannelloProva === scheda ? '' : 'none'; });
            }
            modalSurveySettings.querySelectorAll('[data-scheda-prova]').forEach(b => b.addEventListener('click', () => mostraSchedaProva(b.dataset.schedaProva)));
            modalSurveySettings.querySelectorAll('[data-apri]').forEach(b => b.addEventListener('click', () => {
                closeSurveySettingsModal();
                ({ gps: openGpsModal, foto: openSurveyPhotosModal, falda: openQuickFaldaModal })[b.dataset.apri]();
            }));
            function openSurveySettingsModal(survId, scheda = 'strumento') {
                const proj = state.projects && state.projects[state.currentProjectId];
                if (!proj || !proj.surveys || !proj.surveys[survId]) return;
                // I campi della modale rispecchiano sempre la prova ATTIVA (state.instrument/state.settings):
                // se si tiene premuto su una prova diversa da quella aperta, la selezioniamo prima —
                // stesso comportamento di un tocco singolo — cosi la modale mostra sempre dati veri, non
                // quelli di un'altra prova rimasti a schermo.
                if (survId !== state.currentSurveyId) {
                    saveState();
                    syncProjectToActiveState(state.currentProjectId, survId);
                    updateUI();
                    saveState();
                }
                const surv = proj.surveys[survId];
                const h = surv.header || {};
                if (lblSurveySettingsTitle) lblSurveySettingsTitle.textContent = `Prova ${h.provaNr || '1'}`;
                mostraSchedaProva(scheda);
                surveySettingsContext = { survId };
                if (modalSurveySettingsOverlay) modalSurveySettingsOverlay.classList.add('open');
                if (modalSurveySettings) modalSurveySettings.classList.add('open');
                triggerVibrate(30);
            }
            function closeSurveySettingsModal() {
                surveySettingsContext = null;
                if (modalSurveySettingsOverlay) modalSurveySettingsOverlay.classList.remove('open');
                if (modalSurveySettings) modalSurveySettings.classList.remove('open');
            }
            if (btnCloseSurveySettingsX) btnCloseSurveySettingsX.addEventListener('click', closeSurveySettingsModal);
            if (modalSurveySettingsOverlay) modalSurveySettingsOverlay.addEventListener('click', closeSurveySettingsModal);
            if (btnSurveySettingsDelete) {
                btnSurveySettingsDelete.addEventListener('click', () => {
                    const ctx = surveySettingsContext;
                    closeSurveySettingsModal();
                    if (ctx) openDeleteSurveyModal(ctx.survId);
                });
            }

            const btnSurveySettingsDuplica = document.getElementById('btnSurveySettingsDuplica');
            if (btnSurveySettingsDuplica) btnSurveySettingsDuplica.addEventListener('click', async () => {
                const ctx = surveySettingsContext;
                closeSurveySettingsModal();
                if (!ctx) return;
                const proj = state.projects && state.projects[state.currentProjectId];
                const orig = proj && proj.surveys && proj.surveys[ctx.survId];
                if (!orig) return;
                const nr = (orig.header && orig.header.provaNr) || '1';
                const ok = await appConfirm(`Creare un'interpretazione alternativa della Prova N° ${nr}?\n\nStessi colpi, foto e dati: nella copia riassegni gli strati agli intervalli come preferisci. Nomi, colori e parametri degli strati restano comuni a tutto il progetto.\n\nNel report conta come la stessa prova, non come una in più, e all'esportazione PDF scegli quale versione includere.`);
                if (!ok) return;
                const nuovoId = duplicaProvaComeInterpretazione(ctx.survId);
                const nuova = nuovoId && proj.surveys[nuovoId];
                if (nuova) {
                    triggerVibrate([40, 60]);
                    mostraToast(`Creata la Prova ${nuova.header.provaNr}, interpretazione alternativa della ${nr}: è già aperta`);
                }
            });

            // Ricorda quale prova era selezionata l'ultima volta che la barra si è auto-centrata,
            // cosi lo scroll-into-view scatta solo al cambio prova reale e non ad ogni updateUI()
            // (che la richiama in continuazione, es. ad ogni colpo battuto) — altrimenti la barra
            // scatterebbe al centro mentre l'utente sta provando a scorrerla per sbirciare altro.
            let lastSurveySwitcherScrollId = null;

            function renderSurveySwitcherBar() {
                if (!surveySwitcherBar) return;
                surveySwitcherBar.innerHTML = '';

                // BUG STORICO: questa funzione mostrava la barra Prova1/Prova2/+Nuova Prova ogni
                // volta che veniva chiamata (es. da updateUI() dopo QUALSIASI cambio impostazione),
                // senza controllare in che schermata ci si trovasse — quindi bastava aprire le
                // Impostazioni da Home e toccare un interruttore per far riapparire la barra sopra
                // "Archivio Progetti Cantiere", anche se switchView('home') l'aveva già nascosta.
                // La barra ha senso SOLO in Vista Prova: qui si esce subito se non siamo lì.
                const inFieldView = state.uiState && state.uiState.currentView === 'field';
                if (!inFieldView || !state.projects || !state.currentProjectId || !state.projects[state.currentProjectId]) {
                    surveySwitcherBar.style.display = 'none';
                    return;
                }

                surveySwitcherBar.style.display = 'flex';
                const proj = state.projects[state.currentProjectId];
                const surveys = proj.surveys || {};
                // Ordinate per numero prova crescente (non per ordine di creazione): assegnare o
                // modificare il N° di una prova la sposta subito al suo posto nella barra.
                const keys = Object.keys(surveys).sort((a, b) => {
                    const na = parseInt(surveys[a].header?.provaNr) || 0;
                    const nb = parseInt(surveys[b].header?.provaNr) || 0;
                    if (na !== nb) return na - nb;
                    return (surveys[a].updatedAt || 0) - (surveys[b].updatedAt || 0);
                });

                // «Prove» e poi i cerchietti da 44 (Fase 3); il «+» tratteggiato per una prova nuova
                // viene dopo l'ultima, come nel prototipo.
                const etichetta = document.createElement('span');
                etichetta.className = 'riga-prove-etichetta';
                etichetta.textContent = 'Prove';
                surveySwitcherBar.appendChild(etichetta);

                let selectedTabBtn = null;

                keys.forEach(survId => {
                    const surv = surveys[survId];
                    const h = surv.header || {};
                    const isSelected = survId === state.currentSurveyId;

                    // Cerchietto da 44 col solo numero (Fase 3: prima 32, e con due puntini per GPS e
                    // foto; lo stato della prova aperta ora lo dicono le spie della testata).
                    const tabBtn = document.createElement('button');
                    tabBtn.type = 'button';
                    const nrProva = String(h.provaNr || '1');
                    tabBtn.className = 'prova-chip' + (nrProva.length > 2 ? ' lunga' : '');
                    tabBtn.title = `Prova ${nrProva}: tocca per aprirla, tieni premuto per le sue impostazioni`;
                    tabBtn.setAttribute('aria-label', `Prova ${nrProva}`);
                    if (isSelected) tabBtn.setAttribute('aria-current', 'true');
                    tabBtn.textContent = nrProva;

                    // Tocco breve: cambia prova attiva. Pressione prolungata (600ms): impostazioni
                    // della singola prova (penetrometro, geometria strumento) — da lì si raggiunge
                    // anche l'eliminazione, invece di essere l'unica azione del long-press.
                    // Il flag longPressFired impedisce che il rilascio dopo la pressione lunga
                    // faccia scattare anche il cambio prova.
                    let lpTimer = null;
                    let longPressFired = false;
                    let lpStartX = 0, lpStartY = 0;

                    const startLongPress = (x, y) => {
                        longPressFired = false;
                        lpStartX = x; lpStartY = y;
                        clearTimeout(lpTimer);
                        lpTimer = setTimeout(() => {
                            longPressFired = true;
                            triggerVibrate([50, 30, 50]);
                            openSurveySettingsModal(survId);
                        }, 600);
                    };
                    const cancelLongPress = () => { clearTimeout(lpTimer); };

                    tabBtn.addEventListener('touchstart', (e) => {
                        const t = e.touches[0];
                        startLongPress(t.clientX, t.clientY);
                    }, { passive: true });
                    tabBtn.addEventListener('touchmove', (e) => {
                        const t = e.touches[0];
                        // Se il dito scorre (l'utente sta scorrendo la barra), annulla
                        if (Math.abs(t.clientX - lpStartX) > 10 || Math.abs(t.clientY - lpStartY) > 10) cancelLongPress();
                    }, { passive: true });
                    tabBtn.addEventListener('touchend', cancelLongPress);
                    tabBtn.addEventListener('touchcancel', cancelLongPress);

                    // Equivalente da desktop
                    tabBtn.addEventListener('mousedown', (e) => startLongPress(e.clientX, e.clientY));
                    tabBtn.addEventListener('mouseup', cancelLongPress);
                    tabBtn.addEventListener('mouseleave', cancelLongPress);
                    tabBtn.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        cancelLongPress();
                        if (!longPressFired) openSurveySettingsModal(survId);
                    });

                    tabBtn.addEventListener('click', () => {
                        if (longPressFired) { longPressFired = false; return; }
                        if (survId !== state.currentSurveyId) {
                            saveState();
                            syncProjectToActiveState(state.currentProjectId, survId);
                            pendingBarGrowAnim = true;
                            updateUI();
                            pendingBarGrowAnim = false;
                            saveState();
                            triggerVibrate(30);
                            flashDataChangedCards();
                        }
                    });

                    if (isSelected) selectedTabBtn = tabBtn;
                    surveySwitcherBar.appendChild(tabBtn);
                });

                const addBtn = document.createElement('button');
                addBtn.type = 'button';
                addBtn.className = 'prova-chip prova-chip-nuova';
                addBtn.title = 'Nuova prova';
                addBtn.setAttribute('aria-label', 'Nuova prova');
                addBtn.innerHTML = ico('plus');
                addBtn.addEventListener('click', () => openNewSurveyModal());
                surveySwitcherBar.appendChild(addBtn);

                // Autocentra la pillola attiva solo quando la prova selezionata è cambiata
                // davvero rispetto all'ultima volta (vedi commento su lastSurveySwitcherScrollId).
                if (selectedTabBtn && state.currentSurveyId !== lastSurveySwitcherScrollId) {
                    lastSurveySwitcherScrollId = state.currentSurveyId;
                    requestAnimationFrame(() => {
                        selectedTabBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    });
                }

                updateSurveySwitcherFade();
            }

            /** Accende/spegne le dissolvenze ai bordi della barra prove in base allo scroll REALE
             * (mai finte): niente dissolvenza se tutte le prove entrano già nella larghezza
             * disponibile, dissolvenza a sinistra solo se si è scorso via dall'inizio, a destra solo
             * se c'è ancora contenuto oltre il bordo destro. */
            function updateSurveySwitcherFade() {
                if (!surveySwitcherBar) return;
                const el = surveySwitcherBar;
                const canScroll = el.scrollWidth > el.clientWidth + 1;
                el.classList.toggle('fade-left', canScroll && el.scrollLeft > 1);
                el.classList.toggle('fade-right', canScroll && (el.scrollLeft + el.clientWidth < el.scrollWidth - 1));
            }
            if (surveySwitcherBar) {
                surveySwitcherBar.addEventListener('scroll', updateSurveySwitcherFade, { passive: true });
                window.addEventListener('resize', updateSurveySwitcherFade);
            }

            // STATO DEL PROGETTO: puramente organizzativo, lo decide l'utente e l'app non lo cambia
            // mai da sola. Assente = nessuno stato: progetti e backup esistenti restano come sono.
            const STATI_PROGETTO = [
                { id: 'in_corso', etichetta: 'In corso', colore: 'var(--info)', sfondo: 'var(--info-soft)' },
                { id: 'da_elaborare', etichetta: 'Da elaborare', colore: 'var(--warning)', sfondo: 'var(--warning-soft)' },
                { id: 'consegnato', etichetta: 'Consegnato', colore: 'var(--success)', sfondo: 'var(--success-soft)' }
            ];
            // PROMEMORIA DEL BACKUP COMPLETO (decisione F). «Più tardi» vale fino alla prossima apertura.
            let promemoriaBackupNascosto = false;

            /** Se e cosa ricordare sul backup completo. Null se non c'è niente da dire: nessun progetto,
             * backup recente (meno di `giorniSoglia`) o nessuna modifica dopo. Le modifiche entro 2
             * minuti dal backup non contano: il salvataggio fatto subito dopo aggiorna comunque le date. */
            function promemoriaBackup(progetti, ultimoBackup, adesso, giorniSoglia) {
                const elenco = Object.values(progetti || {});
                if (elenco.length === 0) return null;
                if (!ultimoBackup) return { mai: true, giorni: null, modificheDopo: true };
                const modificheDopo = elenco.some(p => ((p && p.updatedAt) || 0) > ultimoBackup + 120000);
                const giorni = Math.floor((adesso - ultimoBackup) / 86400000);
                if (!modificheDopo || giorni < (giorniSoglia || 7)) return null;
                return { mai: false, giorni, modificheDopo };
            }

            function renderPromemoriaBackup() {
                const box = document.getElementById('homePromemoriaBackup');
                if (!box) return;
                const promemoria = promemoriaBackupNascosto ? null : promemoriaBackup(state.projects, state.ultimoBackupCompleto, Date.now(), 7);
                if (!promemoria) { box.style.display = 'none'; box.innerHTML = ''; return; }
                const testo = promemoria.mai
                    ? 'Nessun backup completo'
                    : `Backup completo ${promemoria.giorni} ${promemoria.giorni === 1 ? 'giorno' : 'giorni'} fa`;
                box.style.display = 'flex';
                box.innerHTML = `
                    ${ico('alert')}
                    <span style="flex: 1; min-width: 0;">${testo}</span>
                    <button type="button" class="bt-link" id="btnPromemoriaBackupFai">Fai backup</button>
                    <button type="button" class="bt-icona" id="btnPromemoriaBackupDopo" aria-label="Più tardi" title="Più tardi (fino alla prossima apertura)" style="color: var(--text-muted);"><svg class="ico" style="width:18px;height:18px;"><use href="#i-x"/></svg></button>`;
                const fai = document.getElementById('btnPromemoriaBackupFai');
                if (fai) fai.addEventListener('click', () => { if (typeof openBackupChoiceModal === 'function') openBackupChoiceModal({ type: 'global' }); });
                const dopo = document.getElementById('btnPromemoriaBackupDopo');
                if (dopo) dopo.addEventListener('click', () => { promemoriaBackupNascosto = true; renderPromemoriaBackup(); });
            }

            // Ricerca e filtro della Home: vivono finché l'app è aperta, non vengono salvati.
            let ricercaProgettiTesto = '';
            let filtroStatoProgetti = 'tutti';

            /** Testo confrontabile per la ricerca: minuscolo e senza accenti, così «forli» trova «Forlì». */
            function normalizzaPerRicerca(testo) {
                return String(testo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            }

            /** Vero se OGNI parola cercata compare in almeno un campo del progetto: nome, comune,
             * committente, località, più località e comune delle sue prove (la località vive quasi
             * sempre sulla prova, non sul progetto). Testo vuoto: sempre vero. */
            function progettoCorrispondeRicerca(proj, testo) {
                const parole = normalizzaPerRicerca(testo).split(/\s+/).filter(Boolean);
                if (parole.length === 0) return true;
                const campi = [proj && proj.name, proj && proj.comune, proj && proj.committente, proj && proj.localita];
                Object.values((proj && proj.surveys) || {}).forEach(s => {
                    const h = (s && s.header) || {};
                    campi.push(h.localita, h.comune);
                });
                const dove = normalizzaPerRicerca(campi.filter(Boolean).join(' | '));
                return parole.every(parola => dove.includes(parola));
            }

            /** I progetti da mostrare in Home, nell'ordine ricevuto: prima il filtro per stato, poi la ricerca. */
            function progettiVisibiliHome(projKeys, progetti, testo, stato) {
                return projKeys.filter(id => {
                    const p = progetti[id];
                    if (!p) return false;
                    if (stato && stato !== 'tutti' && (p.stato || '') !== stato) return false;
                    return progettoCorrispondeRicerca(p, testo);
                });
            }

            /** Le pillole del filtro per stato sopra l'elenco (Fase 3: 44 di altezza, senza conteggi;
             * «Consegnati» al plurale come le altre voci di un filtro). */
            function renderFiltroStatoProgetti(projKeys) {
                const box = document.getElementById('filtroStatoProgetti');
                if (!box) return;
                const etichette = { in_corso: 'In corso', da_elaborare: 'Da elaborare', consegnato: 'Consegnati' };
                const voci = [{ id: 'tutti', etichetta: 'Tutti' }].concat(STATI_PROGETTO.map(s => ({ id: s.id, etichetta: etichette[s.id] || s.etichetta })));
                box.innerHTML = voci.map(v => `<button type="button" class="pillola" data-filtro-stato="${v.id}" aria-pressed="${filtroStatoProgetti === v.id}">${v.etichetta}</button>`).join('');
                box.querySelectorAll('[data-filtro-stato]').forEach(b => b.addEventListener('click', () => {
                    filtroStatoProgetti = b.getAttribute('data-filtro-stato');
                    renderHomeProjects();
                }));
            }

            /** L'ultima prova usata di un progetto (decisione H): quella salvata per ultima. Ogni
             * salvataggio riscrive `updatedAt` della sola prova aperta (syncStateToProject), quindi la
             * più recente è l'ultima su cui si è lavorato, anche dopo aver chiuso l'app. Non serve un
             * campo nuovo nei dati. A parità, o nei dati vecchi senza date, la prima come prima. */
            function ultimaProvaUsata(proj) {
                const ids = Object.keys((proj && proj.surveys) || {});
                let scelta = ids[0] || null, piuRecente = -Infinity;
                ids.forEach(id => {
                    const t = Number(proj.surveys[id] && proj.surveys[id].updatedAt) || 0;
                    if (t > piuRecente) { piuRecente = t; scelta = id; }
                });
                return scelta;
            }

            /** Data gg/mm/aaaa da un numero di millisecondi o da una data ISO/«aaaa-mm-gg». */
            function dataBreve(valore) {
                if (!valore) return '';
                if (typeof valore === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valore)) {
                    const [a, m, g] = valore.split('-');
                    return `${g}/${m}/${a}`;
                }
                const d = new Date(valore);
                if (isNaN(d.getTime())) return '';
                const due = n => String(n).padStart(2, '0');
                return `${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()}`;
            }

            // RENDERING LISTA PROGETTI IN HOME VIEW
            function renderHomeProjects() {
                if (!homeProjectsContainer) return;
                homeProjectsContainer.innerHTML = '';

                const projKeys = Object.keys(state.projects || {});
                renderPromemoriaBackup();
                if (typeof aggiornaConteggiHome === 'function') aggiornaConteggiHome();
                const boxRicercaProgetti = document.getElementById('homeRicercaProgetti');
                if (boxRicercaProgetti) boxRicercaProgetti.style.display = projKeys.length === 0 ? 'none' : 'flex';
                if (projKeys.length === 0) {
                    // Stato vuoto: «Nuovo progetto» e «Ricevi» ci sono già una volta sola, in alto.
                    homeProjectsContainer.innerHTML = `
                        <div class="home-vuota">
                            <div class="titolo">Nessun progetto</div>
                            Un progetto raccoglie le prove di uno stesso cantiere, con strati e dati comuni.
                            Creane uno con <strong>Nuovo progetto</strong>, oppure prendine uno da un altro
                            dispositivo con <strong>Ricevi</strong>.
                        </div>
                    `;
                    return;
                }

                // Ordina per data di aggiornamento decrescente
                projKeys.sort((a, b) => (state.projects[b].updatedAt || 0) - (state.projects[a].updatedAt || 0));

                renderFiltroStatoProgetti(projKeys);
                const visibili = progettiVisibiliHome(projKeys, state.projects, ricercaProgettiTesto, filtroStatoProgetti);
                if (visibili.length === 0) {
                    homeProjectsContainer.innerHTML = `
                        <div class="home-vuota">
                            <div class="titolo">Nessun progetto trovato</div>
                            Nessun progetto corrisponde alla ricerca o al filtro scelto.
                            <div style="margin-top: 12px;">
                                <button type="button" class="bt" id="btnAzzeraRicercaProgetti">Mostra tutti</button>
                            </div>
                        </div>
                    `;
                    const btnAzzera = document.getElementById('btnAzzeraRicercaProgetti');
                    if (btnAzzera) btnAzzera.addEventListener('click', () => {
                        ricercaProgettiTesto = '';
                        filtroStatoProgetti = 'tutti';
                        const campo = document.getElementById('txtCercaProgetti');
                        if (campo) campo.value = '';
                        renderHomeProjects();
                    });
                    return;
                }

                const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
                visibili.forEach(projId => {
                    const proj = state.projects[projId];
                    const survList = Object.values(proj.surveys || {});
                    // Le interpretazioni (3B) non sono prove in più (proveFisiche).
                    const prove = proveFisiche(survList);
                    const nProve = prove.length;
                    const conGps = prove.filter(s => s.header && s.header.lat !== null && s.header.lat !== undefined && s.header.lat !== '' && s.header.lng !== null && s.header.lng !== undefined && s.header.lng !== '').length;
                    const nFoto = survList.reduce((n, s) => n + (s.photos || []).length, 0);
                    const ultima = ultimaProvaUsata(proj);
                    const nrUltima = ultima && proj.surveys[ultima] && proj.surveys[ultima].header ? proj.surveys[ultima].header.provaNr : null;
                    const statoProgetto = STATI_PROGETTO.find(st => st.id === proj.stato);
                    const luogo = [proj.comune || '', proj.committente ? `Committente: ${proj.committente}` : ''].filter(Boolean).join(' · ');
                    const modificato = dataBreve(proj.updatedAt);
                    const nome = proj.name || ('Progetto ' + (proj.comune || ''));

                    const card = document.createElement('div');
                    card.className = 'card-progetto';
                    // Tutta la card apre il progetto sull'ULTIMA PROVA USATA (decisione H); il ⋯ a
                    // destra, separato da una linea, ha le azioni di progetto (note comprese).
                    card.innerHTML = `
                        <button type="button" class="card-progetto-apri btn-open-project" data-id="${projId}" aria-label="Apri ${esc(nome)}${nrUltima ? ', riprende dalla Prova ' + esc(nrUltima) : ''}">
                            <span class="card-progetto-riga1">
                                <span class="card-progetto-nome">${esc(nome)}</span>
                                ${statoProgetto ? `<span class="card-progetto-stato" style="color: ${statoProgetto.colore}; background: ${statoProgetto.sfondo};">${statoProgetto.etichetta}</span>` : ''}
                            </span>
                            ${luogo ? `<span class="card-progetto-luogo">${esc(luogo)}</span>` : ''}
                            <span class="card-progetto-numeri">${nProve} ${nProve === 1 ? 'prova' : 'prove'} · ${conGps}/${nProve} GPS · ${nFoto} foto</span>
                            <span class="card-progetto-data">${modificato ? 'Modificato il ' + modificato : 'Mai modificato'}${nrUltima ? ' · riprende dalla Prova ' + esc(nrUltima) : ''}</span>
                        </button>
                        <button type="button" class="card-progetto-altro btn-project-actions" data-id="${projId}" aria-label="Azioni sul progetto" title="Azioni sul progetto (stato, note, duplica, backup, esporta, elimina)"><svg class="ico"><use href="#i-more"/></svg></button>
                    `;
                    homeProjectsContainer.appendChild(card);
                });

                homeProjectsContainer.querySelectorAll('.btn-open-project').forEach(btn => {
                    btn.addEventListener('click', () => openProject(btn.getAttribute('data-id')));
                });
                homeProjectsContainer.querySelectorAll('.btn-project-actions').forEach(btn => {
                    btn.addEventListener('click', () => openProjectActionsModal(btn.getAttribute('data-id')));
                });
            }

            const txtCercaProgetti = document.getElementById('txtCercaProgetti');
            if (txtCercaProgetti) txtCercaProgetti.addEventListener('input', () => {
                ricercaProgettiTesto = txtCercaProgetti.value;
                renderHomeProjects();
            });

            function openProject(projId) {
                if (!projId || !state.projects[projId]) return;
                const proj = state.projects[projId];
                // Decisione H: si riprende dall'ultima prova usata, non dalla prima.
                const firstSurvId = ultimaProvaUsata(proj);

                if (!firstSurvId) {
                    const newSurvId = `SURV_1_${Date.now()}`;
                    proj.surveys[newSurvId] = {
                        id: newSurvId,
                        header: { ...state.header, comune: proj.comune, committente: proj.committente, localita: proj.localita, date: proj.date, provaNr: '1' },
                        instrument: { ...state.instrument },
                        settings: { ...state.settings },
                        // Progetto senza nessuna prova (file vecchio o importazione parziale): la
                        // prova che si crea qui per ripararlo è a tutti gli effetti una partenza
                        // da zero, quindi parte dal generico come un progetto nuovo.
                        currentCount: 0, currentDepthStart: 0, currentRod: 1, logs: [], strati: stratiInizialiProgettoNuovo(), photos: []
                    };
                    syncProjectToActiveState(projId, newSurvId);
                } else {
                    syncProjectToActiveState(projId, firstSurvId);
                }

                switchView('field');
                triggerVibrate([40, 40]);
            }

            // SISTEMA DI ANNULLAMENTO UNIVERSALE (banner con timer 10s)
            // Prima era cablato sui soli progetti. Ora accetta una funzione di ripristino, così
            // qualsiasi azione distruttiva (progetto, prova, intervallo, foto) può essere annullata
            // con lo stesso meccanismo e la stessa interfaccia.
            let pendingUndoAction = null; // { label, restore: fn }
            let pendingDeletedProject = null; // mantenuto per compatibilità con il codice esistente
            let undoTimerInterval = null;
            let undoSecondsLeft = 10;

            const undoNotificationBanner = document.getElementById('undoNotificationBanner');
            const undoBannerText = document.getElementById('undoBannerText');
            const undoTimerCountdown = document.getElementById('undoTimerCountdown');
            const btnUndoDeleteProject = document.getElementById('btnUndoDeleteProject');

            // showUndoBanner(testo, funzioneDiRipristino)
            function showUndoBanner(label, restoreFn) {
                if (!undoNotificationBanner) return;
                if (undoTimerInterval) clearInterval(undoTimerInterval);

                pendingUndoAction = (typeof restoreFn === 'function') ? { label, restore: restoreFn } : null;

                undoSecondsLeft = 10;
                if (undoBannerText) undoBannerText.textContent = label;
                if (undoTimerCountdown) undoTimerCountdown.textContent = undoSecondsLeft;

                undoNotificationBanner.style.display = 'flex';
                triggerVibrate([40, 60]);

                undoTimerInterval = setInterval(() => {
                    undoSecondsLeft--;
                    if (undoTimerCountdown) undoTimerCountdown.textContent = undoSecondsLeft;
                    if (undoSecondsLeft <= 0) hideUndoBanner();
                }, 1000);
            }

            function hideUndoBanner() {
                if (undoTimerInterval) {
                    clearInterval(undoTimerInterval);
                    undoTimerInterval = null;
                }
                if (undoNotificationBanner) undoNotificationBanner.style.display = 'none';
                pendingUndoAction = null;
                pendingDeletedProject = null;
            }

            function performUndo() {
                if (!pendingUndoAction) return;
                const fn = pendingUndoAction.restore;
                hideUndoBanner();
                try { fn(); } catch (e) { console.error('Undo error:', e); }
                triggerVibrate([40, 60, 40]);
            }

            if (btnUndoDeleteProject) {
                btnUndoDeleteProject.addEventListener('click', performUndo);
            }

            // MODAL CONFERMA ELIMINAZIONE PROGETTO (FINESTRA FLUTTUANTE)
            let projectToDeleteContext = null;
            const modalConfirmDeleteOverlay = document.getElementById('modalConfirmDeleteOverlay');
            const modalConfirmDelete = document.getElementById('modalConfirmDelete');
            const lblDeleteProjName = document.getElementById('lblDeleteProjName');
            const btnCancelDeleteProjModal = document.getElementById('btnCancelDeleteProjModal');
            const btnConfirmDeleteProjModal = document.getElementById('btnConfirmDeleteProjModal');

            function openConfirmDeleteModal(projId, cardElem) {
                if (!projId || !state.projects[projId]) return;
                const proj = state.projects[projId];
                const projName = proj.name || proj.comune || 'Cantiere';

                projectToDeleteContext = { projId, cardElem };
                if (lblDeleteProjName) lblDeleteProjName.textContent = `"${projName}"`;

                if (modalConfirmDeleteOverlay) modalConfirmDeleteOverlay.classList.add('open');
                if (modalConfirmDelete) modalConfirmDelete.classList.add('open');
            }

            function closeConfirmDeleteModal() {
                if (modalConfirmDeleteOverlay) modalConfirmDeleteOverlay.classList.remove('open');
                if (modalConfirmDelete) modalConfirmDelete.classList.remove('open');
                projectToDeleteContext = null;
            }

            if (btnCancelDeleteProjModal) btnCancelDeleteProjModal.addEventListener('click', closeConfirmDeleteModal);
            if (modalConfirmDeleteOverlay) modalConfirmDeleteOverlay.addEventListener('click', closeConfirmDeleteModal);

            if (btnConfirmDeleteProjModal) {
                btnConfirmDeleteProjModal.addEventListener('click', () => {
                    if (projectToDeleteContext) {
                        const { projId, cardElem } = projectToDeleteContext;
                        closeConfirmDeleteModal();
                        performDeleteProject(projId, cardElem);
                    } else {
                        closeConfirmDeleteModal();
                    }
                });
            }

            function deleteProject(projId, cardElem) {
                openConfirmDeleteModal(projId, cardElem);
            }

            function performDeleteProject(projId, cardElem) {
                if (!projId || !state.projects[projId]) return;
                const proj = state.projects[projId];
                const projName = proj.name || proj.comune || 'Cantiere';
                copiaPrimaDi(`eliminare il progetto «${projName}»`);

                // Animazione di riduzione e dissolvenza della card prima dell'eliminazione
                if (cardElem) {
                    cardElem.style.transition = 'transform var(--mov-lungo) var(--ease-entra), opacity var(--mov-lungo) var(--ease-entra)';
                    cardElem.style.transform = 'scale(0.92) translateY(-10px)';
                    cardElem.style.opacity = '0';
                }

                setTimeout(() => {
                    const projBackup = JSON.parse(JSON.stringify(proj));
                    const wasCurrent = (state.currentProjectId === projId);
                    // Id delle foto del progetto, raccolti PRIMA di cancellarlo dallo stato:
                    // servono a liberare lo spazio in IndexedDB una volta scaduto l'annullamento.
                    // Prima non venivano mai cancellate — eliminare un progetto liberava lo spazio
                    // dei dati ma lasciava tutte le sue foto su disco, invisibili e per sempre.
                    // Curiosamente l'eliminazione di una PROVA lo faceva già, e bene: da lì è preso
                    // anche il ritardo, che serve a non svuotare qualcosa che l'annulla dovrà
                    // ancora ripristinare.
                    const fotoDelProgetto = [];
                    Object.values(proj.surveys || {}).forEach(surv => {
                        (surv.photos || []).forEach(p => { if (p && p.id) fotoDelProgetto.push(p.id); });
                    });

                    delete state.projects[projId];

                    if (wasCurrent) {
                        state.currentProjectId = null;
                        state.currentSurveyId = null;
                    }

                    saveState();
                    switchView('home'); // Rimane SEMPRE sulla schermata Home View!

                    showUndoBanner(`Progetto "${projName}" eliminato`, () => {
                        if (!state.projects) state.projects = {};
                        state.projects[projId] = projBackup;
                        saveState();
                        switchView('home');
                        renderHomeProjects();
                    });

                    // Le foto si cancellano SOLO se l'annullamento non è stato usato, e con lo
                    // stesso ritardo già adottato per l'eliminazione di una prova (11s > i 10s del
                    // banner): ripristinare un progetto senza le sue immagini sarebbe un annulla
                    // che mente. Si ricontrolla lo stato reale invece di fidarsi del timer.
                    if (fotoDelProgetto.length > 0) {
                        setTimeout(async () => {
                            if (state.projects && state.projects[projId]) return; // annullato: non toccare niente
                            // Un progetto duplicato condivide le foto con la sua copia: si cancella
                            // solo ciò che nessun altro progetto usa ancora, altrimenti eliminare
                            // l'originale svuotava le foto della copia (o viceversa).
                            const inUso = (typeof idFotoAncoraInUso === 'function') ? idFotoAncoraInUso() : new Set();
                            for (const idFoto of fotoDelProgetto) {
                                if (inUso.has(idFoto)) continue;
                                try {
                                    if (typeof deletePhotoFromIDB === 'function') await deletePhotoFromIDB(idFoto);
                                    delete photoMemoryCache[idFoto];
                                } catch (e) { console.warn('Pulizia foto progetto eliminato fallita:', idFoto, e); }
                            }
                        }, 11000);
                    }
                }, cardElem ? 320 : 0);
            }

            // Copia profonda di un progetto (nuovo id progetto E nuovi id di ogni prova al suo
            // interno, per evitare collisioni se in futuro l'originale e la copia finissero mai
            // nello stesso archivio, es. dopo un'importazione).
            function duplicateProject(projId) {
                if (!projId || !state.projects[projId]) return null;
                const original = state.projects[projId];
                const clone = JSON.parse(JSON.stringify(original));
                const newProjId = `PROJ_${Date.now()}`;
                clone.id = newProjId;
                clone.name = (original.name || original.comune || 'Progetto') + ' (copia)';
                delete clone.stato; // la copia nasce senza stato: è un lavoro nuovo, ancora da ordinare
                clone.updatedAt = Date.now();

                // Le foto NON vengono copiate: la copia usa gli stessi id dell'originale, quindi le
                // stesse immagini in IndexedDB, senza raddoppiare lo spazio. È sicuro perché ogni
                // cancellazione controlla prima che nessun altro progetto le usi ancora
                // (idFotoAncoraInUso).
                rinnovaIdProve(clone);

                state.projects[newProjId] = clone;
                saveState();
                return newProjId;
            }

            /** Dà id nuovi alle prove di una COPIA di progetto (duplicato, o import rinominato perché il
             * progetto c'era già), così due progetti non condividono mai l'id di una prova. Le
             * interpretazioni («3B») seguono la loro prova: prima il duplicato lasciava
             * header.interpretazioneDi sull'id vecchio, cioè su una prova dell'ALTRO progetto, e nella
             * copia la 3B diventava una prova in più (contata, con la sua pin sulla mappa). */
            function rinnovaIdProve(proj) {
                const nuovi = {};
                const mappa = {};
                // Più copie nello stesso millisecondo (un import di più progetti) non devono
                // produrre gli stessi id: da qui il pezzo casuale.
                const adesso = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
                Object.keys(proj.surveys || {}).forEach((vecchioId, idx) => {
                    const surv = proj.surveys[vecchioId];
                    const nuovoId = `SURV_${idx + 1}_${adesso}_${idx}`;
                    mappa[vecchioId] = nuovoId;
                    if (surv && typeof surv === 'object') surv.id = nuovoId;
                    nuovi[nuovoId] = surv;
                });
                Object.values(nuovi).forEach(surv => {
                    const h = surv && surv.header;
                    if (h && h.interpretazioneDi && mappa[h.interpretazioneDi]) h.interpretazioneDi = mappa[h.interpretazioneDi];
                });
                proj.surveys = nuovi;
                return mappa;
            }

            // MODAL AZIONI PROGETTO (dal bottone "⋯" sulla card in Home): Duplica, Backup, Esporta,
            // Elimina. Ogni azione chiede conferma con la finestra di dialogo già usata
            // in tutta l'app (tranne l'export, che resta un tap diretto), e l'eliminazione mantiene
            // lo stesso avviso "pericoloso" + undo a 10 secondi degli altri tipi di cancellazione.
            let projectActionsContext = null;
            const modalProjectActionsOverlay = document.getElementById('modalProjectActionsOverlay');
            const modalProjectActions = document.getElementById('modalProjectActions');
            const lblProjectActionsTitle = document.getElementById('lblProjectActionsTitle');
            const lblProjectActionsSubtitle = document.getElementById('lblProjectActionsSubtitle');
            const btnCloseProjectActionsX = document.getElementById('btnCloseProjectActionsX');
            const btnProjActDuplicate = document.getElementById('btnProjActDuplicate');
            const btnProjActBackup = document.getElementById('btnProjActBackup');
            const btnProjActExport = document.getElementById('btnProjActExport');
            const btnProjActDelete = document.getElementById('btnProjActDelete');

            /** I tre bottoni di stato nel pannello ⋯ del progetto. Toccare quello già acceso lo spegne
             * e il progetto torna senza stato. Qui non si tocca la data di modifica: segnare
             * «Consegnato» non deve portare il progetto in cima alla Home. */
            function renderStatoAzioniProgetto(projId) {
                const box = document.getElementById('projActStato');
                const proj = state.projects && state.projects[projId];
                if (!box || !proj) return;
                box.innerHTML = STATI_PROGETTO.map(s => {
                    const attivo = proj.stato === s.id;
                    const aspetto = attivo
                        ? `background: ${s.sfondo}; color: ${s.colore}; border: 1.5px solid ${s.colore};`
                        : 'background: var(--bg-main); color: var(--text-muted); border: 1px solid var(--border);';
                    return `<button type="button" data-stato="${s.id}" aria-pressed="${attivo}" style="padding: 9px 4px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 700; cursor: pointer; ${aspetto}">${s.etichetta}</button>`;
                }).join('');
                box.querySelectorAll('[data-stato]').forEach(b => b.addEventListener('click', () => {
                    const nuovo = b.getAttribute('data-stato');
                    if (proj.stato === nuovo) delete proj.stato; else proj.stato = nuovo;
                    saveState();
                    renderStatoAzioniProgetto(projId);
                    renderHomeProjects();
                    triggerVibrate(20);
                }));
            }

            function openProjectActionsModal(projId) {
                if (!projId || !state.projects[projId]) return;
                const proj = state.projects[projId];
                projectActionsContext = { projId };
                if (lblProjectActionsTitle) lblProjectActionsTitle.textContent = proj.name || proj.comune || 'Progetto';
                // Riga di metadati (redesign richiesto esplicitamente, "lista guidata"): oltre al
                // conteggio prove, ora anche l'ultima modifica — assente prima, utile per capire al
                // volo se questo è il progetto giusto quando ce ne sono tanti simili in Home.
                const numProve = Object.keys(proj.surveys || {}).length;
                const proveLabel = `${numProve} prov${numProve === 1 ? 'a' : 'e'}`;
                const modLabel = proj.updatedAt ? ` · modificato ${formatUltimoUtilizzo(proj.updatedAt)}` : '';
                if (lblProjectActionsSubtitle) lblProjectActionsSubtitle.textContent = proveLabel + modLabel;
                renderStatoAzioniProgetto(projId);
                if (modalProjectActionsOverlay) modalProjectActionsOverlay.classList.add('open');
                if (modalProjectActions) modalProjectActions.classList.add('open');
            }

            function closeProjectActionsModal() {
                if (modalProjectActionsOverlay) modalProjectActionsOverlay.classList.remove('open');
                if (modalProjectActions) modalProjectActions.classList.remove('open');
                projectActionsContext = null;
            }

            if (btnCloseProjectActionsX) btnCloseProjectActionsX.addEventListener('click', closeProjectActionsModal);
            if (modalProjectActionsOverlay) modalProjectActionsOverlay.addEventListener('click', closeProjectActionsModal);

            // Le note di progetto dal ⋯ della card (Fase 3: prima avevano un bottone loro sulla card,
            // con l'icona dei template; ora la card si tocca tutta per aprire il progetto).
            const btnProjActNote = document.getElementById('btnProjActNote');
            if (btnProjActNote) btnProjActNote.addEventListener('click', () => {
                const ctx = projectActionsContext;
                closeProjectActionsModal();
                if (ctx && typeof apriNoteProgetto === 'function') apriNoteProgetto(ctx.projId);
            });
            if (btnProjActDuplicate) {
                btnProjActDuplicate.addEventListener('click', async () => {
                    if (!projectActionsContext) return;
                    const { projId } = projectActionsContext;
                    const proj = state.projects[projId];
                    const projName = proj ? (proj.name || proj.comune || 'Progetto') : 'Progetto';
                    closeProjectActionsModal();
                    const ok = await appConfirm(`Duplicare il progetto "${projName}"? Verrà creata una copia indipendente con tutte le prove.`);
                    if (!ok) return;
                    const newId = duplicateProject(projId);
                    if (newId) {
                        renderHomeProjects();
                        triggerVibrate([40, 60]);
                    }
                });
            }

            if (btnProjActBackup) {
                btnProjActBackup.addEventListener('click', () => {
                    if (!projectActionsContext) return;
                    const { projId } = projectActionsContext;
                    closeProjectActionsModal();
                    openBackupChoiceModal({ type: 'project', projId });
                });
            }

