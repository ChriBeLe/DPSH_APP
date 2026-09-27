            // =========================================================================
            // ARCHIVIO LITOLOGICO GLOBALE
            // =========================================================================
            // Rete a due livelli:
            //  - state.lithologyArchive  -> "modelli" di strato, comuni a TUTTO il software
            //  - state.strati / proj.strati -> strati del singolo progetto, che possono:
            //      a) essere creati da zero (nessun collegamento)
            //      b) derivare da una voce d'archivio (strato.sourceArchiveId = archId), nel
            //         qual caso restano comunque modificabili liberamente nel progetto senza
            //         alterare il modello d'archivio né gli altri progetti che lo usano.

            function getArchiveList() {
                return Object.values(state.lithologyArchive || {}).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            }

            /** Vero solo se strato.sourceArchiveId punta a una voce che esiste DAVVERO in
             * state.lithologyArchive in questo momento — bug segnalato con screenshot ("mi segna
             * questi strati come già in archivio ma non ci sono"): la UI (badge "In Archivio" nella
             * gestione strati) si fidava della sola presenza di sourceArchiveId, mai verificava che
             * la voce puntata esistesse ancora. Un collegamento può restare "orfano" quando la voce
             * d'archivio non è mai stata ripristinata da un backup (vedi mergeLithologyArchiveInto e
             * il bug corrisponente in importGlobalJSONBackup, corretto in questa stessa sessione) —
             * lo strato di progetto, che invece viaggia per intero dentro ogni progetto importato,
             * si ritrova quindi a "ricordare" un collegamento a qualcosa che sul dispositivo attuale
             * non è mai arrivato. */
            function stratoHaCollegamentoArchivioValido(strato) {
                return !!(strato && strato.sourceArchiveId && state.lithologyArchive && state.lithologyArchive[strato.sourceArchiveId]);
            }

            // Crea una nuova voce d'archivio a partire da uno strato di progetto esistente e lo
            // collega ad essa. Usata dal pulsante "Salva in Archivio" nella gestione strati.
            // Le preferenze di formula già scelte per questo strato nel wizard guidato
            // (strato.parametriAvanzati, un indice per categoria — vedi seleziona()) convertite nel
            // formato usato dall'archivio (arch.parametriPreferiti, autore+terreno: un indice da
            // solo non avrebbe senso fuori dal contesto di QUESTO specifico strato, l'ordine dei
            // candidati di una categoria è comunque sempre lo stesso quindi la conversione è
            // diretta). Estratta come funzione a parte perché usata sia per CREARE una voce
            // d'archivio (promoteStratoToArchive) sia per AGGIORNARNE una già esistente
            // (aggiornaVoceArchivioDaStrato, richiesta esplicitamente dal menu ⋮ "Aggiorna
            // nell'archivio") — stessa conversione, non due copie che potrebbero disallinearsi.
            function campiArchivioDaStrato(strato) {
                const parametriPreferiti = {};
                Object.keys(strato.parametriAvanzati || {}).forEach(catId => {
                    const idx = strato.parametriAvanzati[catId] && strato.parametriAvanzati[catId].autoreIndex;
                    const cat = CATEGORIE_PER_ID[catId];
                    const cand = (idx != null && cat) ? cat.candidati[idx] : null;
                    if (cand) parametriPreferiti[catId] = { autore: cand.autore, terreno: cand.terreno || null };
                });
                return {
                    name: strato.name,
                    color: strato.color,
                    pattern: strato.pattern || 'none',
                    behavior: strato.behavior || 'granulare',
                    parametriPreferiti
                };
            }

            function promoteStratoToArchive(strato) {
                if (!state.lithologyArchive) state.lithologyArchive = {};
                const archId = 'arch_' + Date.now();
                // Bug segnalato esplicitamente: "Salva in Archivio" non copiava MAI le scelte fatte
                // nel wizard, la scheda archivio mostrava sempre "Nessuna preferenza" anche quando
                // lo strato ne aveva già.
                state.lithologyArchive[archId] = Object.assign({ id: archId, createdAt: Date.now() }, campiArchivioDaStrato(strato));
                strato.sourceArchiveId = archId;
                return archId;
            }

            /** "Aggiorna nell'archivio" (richiesta esplicitamente, menu ⋮ della gestione strati):
             * a differenza di promoteStratoToArchive (che CREA sempre una voce nuova, con un nuovo
             * id) questa sovrascrive i campi di una voce ESISTENTE — stesso id, stesso createdAt —
             * con i dati attuali dello strato locale. Serve a propagare a tutti i progetti che
             * condividono quella voce una modifica fatta qui (colore, pattern, geotecnica,
             * preferenze di formula) senza spezzare il collegamento ricreandola da capo con un id
             * diverso. Nessun effetto se il collegamento non è valido (vedi
             * stratoHaCollegamentoArchivioValido) — su un collegamento orfano l'azione giusta è
             * "Ripristina" (che infatti chiama promoteStratoToArchive, non questa). */
            function aggiornaVoceArchivioDaStrato(strato) {
                if (!stratoHaCollegamentoArchivioValido(strato)) return false;
                const arch = state.lithologyArchive[strato.sourceArchiveId];
                Object.assign(arch, campiArchivioDaStrato(strato));
                return true;
            }

            /** Unisce un dizionario di voci d'archivio { archId: {...} } importato da un file
             * (esportazione dell'archivio da solo, o l'intero "state" di un Backup Completo) dentro
             * state.lithologyArchive — SEMPRE un merge, mai una sostituzione, e mai una sovrascrittura
             * silenziosa di una voce esistente con lo stesso id (rinominata "(Importato)" invece).
             * Estratta come funzione condivisa (prima esisteva solo dentro il click-handler
             * dell'import "solo archivio") perché lo stesso identico bisogno si ripresenta
             * nell'import del Backup Completo qui sotto — bug segnalato esplicitamente ("ho aggiunto
             * nuovi strati ma non trovo più quelli vecchi"): la causa reale non era qui, ma nel fatto
             * che l'import del Backup Completo NON chiamava affatto questa logica, quindi un
             * ripristino (nuovo dispositivo, reinstallazione, dati del browser cancellati) riportava
             * indietro solo i progetti — l'archivio litologico restava quello (vuoto o parziale) già
             * presente sul dispositivo di arrivo, mentre il file di backup lo conteneva per intero
             * ma veniva ignorato. */
            function mergeLithologyArchiveInto(incoming) {
                if (!incoming || typeof incoming !== 'object') return { imported: 0, renamed: 0 };
                if (!state.lithologyArchive) state.lithologyArchive = {};
                let imported = 0, renamed = 0;
                Object.keys(incoming).forEach(origId => {
                    const entry = JSON.parse(JSON.stringify(incoming[origId]));
                    let targetId = entry.id || origId;
                    if (state.lithologyArchive[targetId]) {
                        targetId = 'arch_' + Date.now() + '_' + imported;
                        entry.id = targetId;
                        entry.name = (entry.name || 'Strato') + ' (Importato)';
                        renamed++;
                    }
                    state.lithologyArchive[targetId] = entry;
                    imported++;
                });
                return { imported, renamed };
            }

            // Crea un nuovo strato di progetto a partire da una voce d'archivio (copia i dati
            // visuali/geotecnici, ma resta un oggetto indipendente e modificabile).
            function createStratoFromArchive(archId, suffix) {
                const arch = state.lithologyArchive && state.lithologyArchive[archId];
                if (!arch) return null;
                return {
                    id: 'strato_' + Date.now() + (suffix !== undefined ? '_' + suffix : ''),
                    name: arch.name,
                    color: arch.color,
                    pattern: arch.pattern || 'none',
                    behavior: arch.behavior || 'granulare',
                    sourceArchiveId: archId
                };
            }

            // Calcola le statistiche d'uso di una voce d'archivio attraverso TUTTI i progetti
            // salvati (non solo quello aperto). Rilegge da zero ogni volta: niente contatori da
            // tenere sincronizzati, e i numeri riflettono sempre lo stato reale dei dati.
            function computeArchiveStats(archId) {
                const projectIds = new Set();
                const surveyKeys = new Set();
                const depthStarts = [];
                const depthEnds = [];
                const thicknesses = [];
                const colpiValues = [];
                const locations = new Set();
                let lastUsedTs = null;

                Object.values(state.projects || {}).forEach(proj => {
                    const projStrati = proj.strati || [];
                    const matchingIds = projStrati.filter(s => s.sourceArchiveId === archId).map(s => s.id);
                    if (matchingIds.length === 0) return;

                    projectIds.add(proj.id);
                    const loc = proj.comune || proj.name;
                    if (loc) locations.add(loc);

                    Object.values(proj.surveys || {}).forEach(surv => {
                        const logs = surv.logs || [];
                        if (logs.length === 0 || projStrati.length === 0) return;
                        let usedHere = false;
                        let currentLitId = projStrati[0].id;
                        logs.forEach(log => {
                            if (log.lithology) currentLitId = log.lithology;
                            if (matchingIds.includes(currentLitId)) {
                                usedHere = true;
                                const start = Number(log.start) || 0;
                                const end = Number(log.end) || 0;
                                depthStarts.push(start);
                                depthEnds.push(end);
                                thicknesses.push(end - start);
                                colpiValues.push(Number(log.colpi) || 0);
                            }
                        });
                        if (usedHere) {
                            surveyKeys.add(proj.id + '::' + surv.id);
                            const ts = surv.updatedAt || proj.updatedAt || null;
                            if (ts && (lastUsedTs === null || ts > lastUsedTs)) lastUsedTs = ts;
                        }
                    });
                });

                const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

                return {
                    projectCount: projectIds.size,
                    surveyCount: surveyKeys.size,
                    intervalCount: colpiValues.length,
                    avgDepthStart: avg(depthStarts),
                    avgDepthEnd: avg(depthEnds),
                    avgThickness: avg(thicknesses),
                    avgColpi: avg(colpiValues),
                    minColpi: colpiValues.length ? Math.min(...colpiValues) : null,
                    maxColpi: colpiValues.length ? Math.max(...colpiValues) : null,
                    locations: Array.from(locations),
                    lastUsedTs: lastUsedTs
                };
            }

            // Etichetta relativa compatta ("3 giorni fa", "oggi", ...) per l'ultimo utilizzo di
            // una voce d'archivio: nessuna libreria esterna, solo differenza in giorni sul locale.
            function formatUltimoUtilizzo(ts) {
                if (!ts) return '-';
                const diffMs = Date.now() - ts;
                const diffDays = Math.floor(diffMs / 86400000);
                if (diffDays <= 0) return 'oggi';
                if (diffDays === 1) return 'ieri';
                if (diffDays < 30) return `${diffDays} giorni fa`;
                const diffMonths = Math.floor(diffDays / 30);
                if (diffMonths < 12) return `${diffMonths} mes${diffMonths === 1 ? 'e' : 'i'} fa`;
                const diffYears = Math.floor(diffMonths / 12);
                return `${diffYears} ann${diffYears === 1 ? 'o' : 'i'} fa`;
            }

            // Renderizza la lista strati nel modale di gestione
            // Ricorda quali strati hanno il pannello "Parametri Avanzati" espanso nella
            // Gestione Strati Litologici, così sopravvive ai re-render (es. dopo ogni scelta).
            const stratiParamsExpanded = new Set();
            // Ricorda quali strati hanno la RIGA INTERA aperta (pattern, geotecnica, archivio,
            // parametri avanzati) — di default ogni strato è collassato a una sola riga
            // compatta (colore+pattern, nome, eventuale link archivio, cestino/Default, freccia),
            // per non affollare la schermata quando ce ne sono molti. Indipendente da
            // stratiParamsExpanded, che riguarda solo il sotto-pannello "Parametri Avanzati"
            // dentro la riga già aperta.
            const stratiRowExpanded = new Set();
            // Indice dello strato il cui menu "Altre azioni" (⋮, contiene solo Elimina per ora)
            // è aperto — un solo menu alla volta, si chiude toccando fuori o scegliendo un'azione.
            // Il cestino era prima un tasto rosso sempre visibile nell'header della riga: troppo
            // prominente per un'azione distruttiva, ora sta dietro questo menu.
            let stratoMoreMenuOpenIdx = null;
            let stratoMoreMenuDocClickBound = false;
            // Id dello strato attualmente in modifica nella finestra centrale "Modifica
            // parametri avanzati" (null se nessuna modifica è in corso).
            let editingStratoId = null;
            // Snapshot di strato.parametriAvanzati preso all'apertura della modifica, per
            // poter ripristinare lo stato precedente se l'utente preme "Annulla" o chiude
            // la finestra senza salvare.
            const stratiParamsEditSnapshot = {};

            function renderStratiList() {
                const container = document.getElementById('stratiListContainer');
                if (!container) return;
                container.innerHTML = '';
                const risultatoPerId = calcolaRisultatiPerStratiCorrenti();
                state.strati.forEach((s, idx) => {
                    ensureParametriAvanzati(s);
                    const pat = s.pattern || 'none';
                    const beh = s.behavior || 'granulare';
                    const espanso = stratiParamsExpanded.has(s.id);
                    const rowOpen = stratiRowExpanded.has(s.id);
                    const row = document.createElement('div');
                    row.dataset.stratoRowIdx = String(idx);
                    // NIENTE overflow:hidden qui: il corpo ad accordion (.strato-row-body,
                    // classe .expand-region) ha già il proprio overflow:hidden per l'animazione,
                    // quindi non serve ripeterlo sulla riga intera — e ripetuto qui tagliava anche
                    // il menu "Altre azioni" (⋮) quando si apriva a riga chiusa, perché all'epoca
                    // la riga è alta quanto il solo header.
                    row.style.cssText = 'background:var(--bg-card-hover); border-radius:var(--radius-sm); border-left: 5px solid ' + s.color + '; margin-bottom:8px;';
                    // Riga compatta sempre visibile: solo identificazione (colore+pattern, nome,
                    // link archivio, cestino/Default) e la freccia per aprire. Tutto il resto —
                    // editing di pattern/colore/geotecnica, salvataggio in archivio, parametri
                    // avanzati — vive nel corpo, chiuso di default. Si tocca ovunque nell'header
                    // (tranne nome e cestino, che hanno le loro azioni) per aprire o chiudere.
                    row.innerHTML = `
                        <div class="strato-row-header" data-strato-idx="${idx}" style="display:flex; align-items:center; gap:8px; width:100%; padding:8px 10px; cursor:pointer;">
                            <div class="strato-pattern-preview" data-strato-idx="${idx}" title="Colore e pattern" style="width:26px; height:26px; border-radius:6px; border:1px solid rgba(0,0,0,0.25); flex:0 0 auto; ${getPatternCss(pat, s.color)}"></div>
                            <input type="text" value="${s.name}" data-strato-idx="${idx}" class="strato-name-input form-control" style="flex:1; min-width:0; font-weight:700;" placeholder="Nome strato">
                            ${stratoHaCollegamentoArchivioValido(s) ? '<svg class="ico" style="width:14px; height:14px; color:var(--purple); flex:0 0 auto;" title="Collegato all\'archivio"><use href="#i-folder-open"/></svg>' : (s.sourceArchiveId ? '<svg class="ico" style="width:14px; height:14px; color:#f59e0b; flex:0 0 auto;" title="Collegamento archivio perso — apri la riga per ripristinarlo"><use href="#i-alert"/></svg>' : '')}
                            ${idx === 0 ? '<span style="font-size:9.5px; color:var(--text-muted); font-weight:700; flex:0 0 auto;">Default</span>' : ''}
                            <svg class="ico strato-row-chevron" style="width:14px; height:14px; color:var(--text-muted); flex:0 0 auto; transition: transform var(--mov-medio) var(--ease-entra); transform: rotate(${rowOpen ? '180' : '0'}deg);"><use href="#i-chevron-down"/></svg>
                            <div class="strato-more-wrap" data-strato-idx="${idx}" style="position:relative; flex:0 0 auto;">
                                <button class="btn-icon strato-more-btn" data-strato-idx="${idx}" title="Altre azioni" style="width:26px; height:26px; color:var(--text-muted); flex:0 0 auto;">
                                    <svg class="ico" style="width:14px; height:14px;"><use href="#i-more"/></svg>
                                </button>
                                ${stratoMoreMenuOpenIdx === idx ? `
                                    <div class="strato-more-menu" style="position:absolute; top:calc(100% + 4px); right:0; z-index:60; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-sm); box-shadow:0 8px 24px rgba(0,0,0,0.25); min-width:190px; padding:4px;">
                                        ${idx > 0 ? `
                                            <button type="button" class="strato-move-btn" data-strato-idx="${idx}" data-dir="-1" style="display:flex; align-items:center; gap:8px; width:100%; padding:7px 9px; font-size:12px; font-weight:700; color:var(--text-main); background:transparent; border:none; border-radius:6px; cursor:pointer; text-align:left; white-space:nowrap;">
                                                <svg class="ico" style="width:14px; height:14px; transform:rotate(180deg);"><use href="#i-chevron-down"/></svg> Sposta su
                                            </button>
                                        ` : ''}
                                        ${idx < state.strati.length - 1 ? `
                                            <button type="button" class="strato-move-btn" data-strato-idx="${idx}" data-dir="1" style="display:flex; align-items:center; gap:8px; width:100%; padding:7px 9px; font-size:12px; font-weight:700; color:var(--text-main); background:transparent; border:none; border-radius:6px; cursor:pointer; text-align:left; white-space:nowrap;">
                                                <svg class="ico" style="width:14px; height:14px;"><use href="#i-chevron-down"/></svg> Sposta giù
                                            </button>
                                        ` : ''}
                                        <button type="button" class="strato-duplicate-btn" data-strato-idx="${idx}" style="display:flex; align-items:center; gap:8px; width:100%; padding:7px 9px; font-size:12px; font-weight:700; color:var(--text-main); background:transparent; border:none; border-radius:6px; cursor:pointer; text-align:left; white-space:nowrap;">
                                            <svg class="ico" style="width:14px; height:14px;"><use href="#i-copy"/></svg> Duplica strato
                                        </button>
                                        ${stratoHaCollegamentoArchivioValido(s) ? `
                                            <button type="button" class="strato-update-archive-btn" data-strato-idx="${idx}" title="Sovrascrive la voce d'archivio collegata con nome/colore/pattern/geotecnica di questo strato" style="display:flex; align-items:center; gap:8px; width:100%; padding:7px 9px; font-size:12px; font-weight:700; color:var(--purple); background:transparent; border:none; border-radius:6px; cursor:pointer; text-align:left; white-space:nowrap;">
                                                <svg class="ico" style="width:14px; height:14px;"><use href="#i-download"/></svg> Aggiorna nell'archivio
                                            </button>
                                        ` : ''}
                                        <button type="button" class="strato-delete-btn" data-strato-idx="${idx}" style="display:flex; align-items:center; gap:8px; width:100%; padding:7px 9px; font-size:12px; font-weight:700; color:var(--danger); background:transparent; border:none; border-radius:6px; cursor:pointer; text-align:left; white-space:nowrap;">
                                            <svg class="ico" style="width:14px; height:14px;"><use href="#i-trash"/></svg> Elimina strato
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="strato-row-body expand-region ${rowOpen ? 'open' : ''}" style="padding:0 10px;">
                            <div class="strato-row-body-inner" style="display:flex; flex-direction:column; gap:8px; padding:0 0 10px;">
                                <div style="display:flex; gap:6px;">
                                    <div style="flex:1.3; min-width:0; display:flex; align-items:center; gap:6px; background:var(--bg-sunken); border-radius:8px; padding:0 8px;">
                                        <input type="color" value="${s.color}" data-strato-idx="${idx}" class="strato-color-pick" style="width:18px; height:18px; border:none; background:none; padding:0; cursor:pointer; border-radius:4px; flex:0 0 auto;" title="Colore dello strato">
                                        <div style="flex:1; min-width:0;">
                                            ${buildPatternPickerHtml(idx, pat, s.color)}
                                        </div>
                                    </div>
                                    <div style="flex:1; min-width:0; display:flex; align-items:center; gap:5px; background:var(--bg-sunken); border-radius:8px; padding:0 8px;">
                                        <svg class="ico" style="width:13px; height:13px; color:var(--text-muted); flex:0 0 auto;" title="Geotecnica"><use href="#i-layers"/></svg>
                                        <select class="strato-behavior-select form-control" data-strato-idx="${idx}" style="padding:4px 0; font-size:11px; width:100%; background:transparent; border:none;">
                                            <option value="granulare" ${beh === 'granulare' ? 'selected' : ''}>Granulare</option>
                                            <option value="coesivo" ${beh === 'coesivo' ? 'selected' : ''}>Coesivo</option>
                                        </select>
                                    </div>
                                </div>
                                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                                    ${stratoHaCollegamentoArchivioValido(s) ? `
                                        <span style="display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:700; color:var(--purple);" title="Questo strato è collegato a una voce dell'Archivio Litologico Globale">
                                            <svg class="ico" style="width:12px; height:12px;"><use href="#i-folder-open"/></svg> In Archivio
                                        </span>
                                    ` : s.sourceArchiveId ? `
                                        <button class="btn-action strato-save-archive-btn" data-strato-idx="${idx}" title="La voce d'archivio a cui era collegato questo strato non esiste più su questo dispositivo (probabilmente un backup mai ripristinato del tutto) — tocca per ricrearla a partire dai dati di questo strato" style="background:transparent; border:none; color:#f59e0b; font-size:10px; font-weight:700; padding:2px 0; display:flex; align-items:center; gap:4px;">
                                            <svg class="ico" style="width:12px; height:12px;"><use href="#i-alert"/></svg> Collegamento archivio perso — Ripristina
                                        </button>
                                    ` : `
                                        <button class="btn-action strato-save-archive-btn" data-strato-idx="${idx}" style="background:transparent; border:none; color:var(--text-muted); font-size:10px; font-weight:700; padding:2px 0; display:flex; align-items:center; gap:4px;">
                                            <svg class="ico" style="width:12px; height:12px;"><use href="#i-download"/></svg> Salva in Archivio
                                        </button>
                                    `}
                                    <button class="btn-action strato-toggle-params" data-strato-idx="${idx}" style="background:transparent; border:none; color:var(--purple); font-size:10.5px; font-weight:700; padding:2px 0; display:flex; align-items:center; gap:4px;">
                                        <svg class="ico" style="width:12px; height:12px;"><use href="#i-flask"/></svg> Parametri Avanzati ${espanso ? '▲' : '▼'}
                                    </button>
                                </div>
                                <div class="strato-params-body expand-region ${espanso ? 'open' : ''}" style="border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-sunken);">
                                    ${buildParametriAvanzatiSummaryHtml(s, risultatoPerId[s.id])}
                                </div>
                            </div>
                        </div>
                    `;
                    container.appendChild(row);
                });

                // Bind: apri/chiudi la riga toccando l'header, tranne quando si tocca il nome
                // (deve restare editabile senza chiudere la riga) o il cestino (ha già la sua
                // azione). Stesso motivo della nota sopra a "strato-toggle-params": si tocca solo
                // la classe .open del nodo già in pagina, niente renderStratiList() qui, altrimenti
                // la transizione CSS non ha nulla da cui animare.
                container.querySelectorAll('.strato-row-header').forEach(header => {
                    header.addEventListener('click', (e) => {
                        if (e.target.closest('.strato-name-input') || e.target.closest('.strato-more-wrap')) return;
                        const i = parseInt(header.dataset.stratoIdx);
                        const strato = state.strati[i];
                        if (!strato) return;
                        const nowOpen = !stratiRowExpanded.has(strato.id);
                        if (nowOpen) stratiRowExpanded.add(strato.id); else stratiRowExpanded.delete(strato.id);
                        const body = header.nextElementSibling;
                        if (body && body.classList.contains('expand-region')) body.classList.toggle('open', nowOpen);
                        const chevron = header.querySelector('.strato-row-chevron');
                        if (chevron) chevron.style.transform = nowOpen ? 'rotate(180deg)' : 'rotate(0deg)';
                        triggerVibrate(15);
                    });
                });

                // Bind eventi inline
                container.querySelectorAll('.strato-name-input').forEach(input => {
                    input.addEventListener('change', (e) => {
                        const i = parseInt(e.target.dataset.stratoIdx);
                        state.strati[i].name = e.target.value.trim() || ('Strato ' + (i + 1));
                        saveState();
                        updateUI();
                    });
                });
                container.querySelectorAll('.strato-color-pick').forEach(input => {
                    input.addEventListener('input', (e) => {
                        const i = parseInt(e.target.dataset.stratoIdx);
                        state.strati[i].color = e.target.value;
                        // Cerca la riga tramite l'indice dedicato (data-strato-row-idx) invece di
                        // risalire un numero fisso di livelli dal colore picker: il corpo della
                        // riga è stato condensato più volte e un conteggio fisso di parentElement
                        // si è già rotto silenziosamente una volta con quei riordini.
                        const rowEl = container.querySelector(`[data-strato-row-idx="${i}"]`);
                        if (rowEl) rowEl.style.borderLeftColor = e.target.value;
                        const preview = container.querySelector(`.strato-pattern-preview[data-strato-idx="${i}"]`);
                        if (preview) preview.style.cssText = preview.style.cssText.replace(/background(-color|-image|-repeat|-size)?:[^;]+;?/g, '') + getPatternCss(state.strati[i].pattern || 'none', e.target.value);
                        saveState();
                        updateUI();
                    });
                });
                container.querySelectorAll('.patpick-trigger').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const i = parseInt(e.currentTarget.dataset.stratoIdx);
                        patpickOpenIdx = (patpickOpenIdx === i) ? null : i;
                        renderStratiList();
                    });
                });
                container.querySelectorAll('.patpick-option').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const i = parseInt(e.currentTarget.dataset.stratoIdx);
                        const value = e.currentTarget.dataset.value;
                        state.strati[i].pattern = value;
                        patpickOpenIdx = null;

                        if (value.startsWith(PREFISSO_RETINO)) {
                            // Un retino porta con sé il proprio colore di riferimento SOLO al
                            // momento della selezione: lo applichiamo qui una volta sola. Da qui
                            // in poi l'utente può cambiare liberamente il colore col color-picker.
                            const r = RETINI_PER_ID[value.slice(PREFISSO_RETINO.length)];
                            if (r) state.strati[i].color = r.colore;
                        }
                        saveState();
                        updateUI();
                        renderStratiList();
                    });
                });
                if (patpickOpenIdx !== null && !patpickDocClickBound) {
                    patpickDocClickBound = true;
                    document.addEventListener('click', function chiudiPatpickFuori(e) {
                        if (patpickOpenIdx !== null && !e.target.closest('.patpick-wrap')) {
                            patpickOpenIdx = null;
                            patpickDocClickBound = false;
                            document.removeEventListener('click', chiudiPatpickFuori);
                            renderStratiList();
                        }
                    });
                }
                container.querySelectorAll('.strato-behavior-select').forEach(sel => {
                    sel.addEventListener('change', (e) => {
                        const i = parseInt(e.target.dataset.stratoIdx);
                        state.strati[i].behavior = e.target.value;
                        saveState();
                        updateUI();
                    });
                });
                container.querySelectorAll('.strato-save-archive-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const i = parseInt(btn.dataset.stratoIdx);
                        const strato = state.strati[i];
                        // stratoHaCollegamentoArchivioValido (non più il solo truthy check su
                        // sourceArchiveId): bug segnalato con screenshot ("mi segna questi strati
                        // come già in archivio ma non ci sono") — prima questo pulsante restava
                        // nascosto/bloccato per sempre su uno strato con un collegamento ORFANO
                        // (voce d'archivio mai arrivata su questo dispositivo), senza nessun modo di
                        // ricrearla. Ora un collegamento perso è trattato come "da salvare di nuovo".
                        if (!strato || stratoHaCollegamentoArchivioValido(strato)) return;
                        const eraCollegamentoOrfano = !!strato.sourceArchiveId;
                        promoteStratoToArchive(strato);
                        saveState();
                        renderStratiList();
                        triggerVibrate([25, 25, 25]);
                        // Conferma di successo: toast, non un dialogo da chiudere (Fase 3).
                        mostraToast(eraCollegamentoOrfano
                            ? `Voce d'archivio ricreata per «${strato.name}»: collegamento ripristinato`
                            : `«${strato.name}» aggiunto all'archivio litologico: si può riusare in ogni progetto`);
                    });
                });

                // Bind: apri/chiudi il menu "Altre azioni" (⋮) di ogni riga. Un solo menu alla
                // volta — aprirne uno chiude qualunque altro già aperto, stesso comportamento del
                // pattern picker sopra. e.stopPropagation() impedisce che il click raggiunga anche
                // l'header (che altrimenti aprirebbe/chiuderebbe la riga stessa).
                container.querySelectorAll('.strato-more-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const i = parseInt(btn.dataset.stratoIdx);
                        stratoMoreMenuOpenIdx = (stratoMoreMenuOpenIdx === i) ? null : i;
                        renderStratiList();
                    });
                });
                if (stratoMoreMenuOpenIdx !== null && !stratoMoreMenuDocClickBound) {
                    stratoMoreMenuDocClickBound = true;
                    document.addEventListener('click', function chiudiStratoMoreMenuFuori(e) {
                        if (stratoMoreMenuOpenIdx !== null && !e.target.closest('.strato-more-wrap')) {
                            stratoMoreMenuOpenIdx = null;
                            stratoMoreMenuDocClickBound = false;
                            document.removeEventListener('click', chiudiStratoMoreMenuFuori);
                            renderStratiList();
                        }
                    });
                }

                // "Sposta su" / "Sposta giù" (richiesto esplicitamente, "gli strati devono essere
                // riordinabili per un ordine mentale maggiore"): scambia lo strato con il vicino
                // nella direzione scelta (data-dir: -1 su, 1 giù) — un semplice swap di posizione
                // nell'array, non un vero drag&drop: più affidabile su schermi piccoli/touch (niente
                // gesture da distinguere da apri/chiudi riga, niente scroll da gestire mentre si
                // trascina) e comunque sufficiente per riordinare pochi strati alla volta. L'indice
                // 0 non ha "Default" come identità fissa: è solo la posizione — muovendo un altro
                // strato lì sopra, diventa lui il nuovo strato di default (getStratoById/
                // getEffectiveLithology leggono sempre e solo state.strati[0], mai un id fisso).
                container.querySelectorAll('.strato-move-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        stratoMoreMenuOpenIdx = null;
                        const target = e.target.closest('.strato-move-btn');
                        const i = parseInt(target.dataset.stratoIdx);
                        const dir = parseInt(target.dataset.dir);
                        const j = i + dir;
                        if (i < 0 || j < 0 || i >= state.strati.length || j >= state.strati.length) return;
                        const tmp = state.strati[i];
                        state.strati[i] = state.strati[j];
                        state.strati[j] = tmp;
                        saveState();
                        renderStratiList();
                        triggerVibrate([20]);
                    });
                });

                // "Duplica strato" (richiesto esplicitamente, menu ⋮): copia completa dello strato
                // — nome, colore, pattern, geotecnica, parametri avanzati E il collegamento
                // all'archivio se presente (un duplicato è tipicamente "stesso materiale, un altro
                // intervallo di profondità", quindi ha senso che resti associato alla stessa voce
                // d'archivio, non una nuova) — inserita SUBITO DOPO l'originale nell'elenco, non in
                // fondo, così resta visivamente accanto a quella da cui deriva.
                container.querySelectorAll('.strato-duplicate-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        stratoMoreMenuOpenIdx = null;
                        const i = parseInt(e.target.closest('.strato-duplicate-btn').dataset.stratoIdx);
                        const originale = state.strati[i];
                        if (!originale) return;
                        const copia = JSON.parse(JSON.stringify(originale));
                        copia.id = 'strato_' + Date.now();
                        copia.name = (originale.name || 'Strato') + ' (copia)';
                        state.strati.splice(i + 1, 0, copia);
                        stratiRowExpanded.add(copia.id);
                        saveState();
                        renderStratiList();
                        triggerVibrate([25, 25, 25]);
                    });
                });

                // "Aggiorna nell'archivio" (richiesto esplicitamente, menu ⋮): a differenza di
                // "Salva in Archivio"/"Ripristina" (che CREANO una voce, nuova o ricostruita),
                // questa AGGIORNA quella già collegata con i dati attuali dello strato — utile dopo
                // aver modificato colore/pattern/geotecnica/parametri avanzati in un progetto e
                // voler propagare la modifica alla voce condivisa, senza doverla ricreare da capo
                // (che avrebbe anche cambiato id, spezzando il collegamento con gli altri progetti
                // che già la usano). Mostrato solo se il collegamento è valido (vedi
                // stratoHaCollegamentoArchivioValido) — su un collegamento orfano l'azione giusta
                // resta "Ripristina" nella riga principale, che invece RICREA la voce.
                container.querySelectorAll('.strato-update-archive-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        stratoMoreMenuOpenIdx = null;
                        const i = parseInt(e.target.closest('.strato-update-archive-btn').dataset.stratoIdx);
                        const strato = state.strati[i];
                        if (!strato || !stratoHaCollegamentoArchivioValido(strato)) return;
                        aggiornaVoceArchivioDaStrato(strato);
                        saveState();
                        renderStratiList();
                        triggerVibrate([25, 25, 25]);
                        mostraToast(`Voce d'archivio di «${strato.name}» aggiornata`);
                    });
                });

                container.querySelectorAll('.strato-delete-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        stratoMoreMenuOpenIdx = null;
                        const i = parseInt(e.target.closest('.strato-delete-btn').dataset.stratoIdx);
                        if (!state.strati[i]) return;
                        const ok = await appConfirmDelete(`Eliminare lo strato "${state.strati[i].name}"? Potrai comunque annullare entro 10 secondi dopo la conferma.`);
                        if (!ok) return;
                        if (!state.strati[i]) return;
                        copiaPrimaDi(`eliminare lo strato «${state.strati[i].name}»`);
                        const deletedId = state.strati[i].id;
                        const backupStrato = JSON.parse(JSON.stringify(state.strati[i]));
                        // Memorizza quali intervalli erano assegnati a questo strato, per poterli
                        // riassegnare correttamente in caso di annullamento.
                        const affectedIdx = [];
                        state.logs.forEach((log, li) => {
                            if (log.lithology === deletedId) affectedIdx.push(li);
                        });

                        state.strati.splice(i, 1);
                        affectedIdx.forEach(li => { state.logs[li].lithology = ''; });
                        stratiParamsExpanded.delete(deletedId);
                        stratiRowExpanded.delete(deletedId);
                        if (editingStratoId === deletedId) chiudiEditParamsModal();
                        delete stratiParamsEditSnapshot[deletedId];
                        // Richiesto esplicitamente: lo strato di default (idx 0, "Suolo" o
                        // qualunque nome abbia) ora è eliminabile come tutti gli altri — ma
                        // l'elenco non può mai restare vuoto (getEffectiveLithology/getStratoById
                        // e buona parte del resto dell'app si affidano a state.strati[0] sempre
                        // presente). Se questa era l'ultima voce, se ne crea subito una nuova
                        // "Strato 1", stesso identico strato con cui parte un progetto nuovo.
                        let placeholderId = null;
                        if (state.strati.length === 0) {
                            placeholderId = 'strato_' + Date.now();
                            state.strati.push({ id: placeholderId, name: 'Strato 1', color: '#fbbf24' });
                            stratiRowExpanded.add(placeholderId);
                        }
                        saveState();
                        renderStratiList();
                        updateUI();
                        triggerVibrate([60, 40]);

                        showUndoBanner(`Strato "${backupStrato.name}" eliminato`, () => {
                            // Se nel frattempo era stato creato il placeholder "Strato 1" (elenco
                            // svuotato), va tolto prima di rimettere al suo posto lo strato vero,
                            // altrimenti l'annullamento lascerebbe entrambi invece di riportare
                            // l'elenco esattamente com'era prima dell'eliminazione.
                            if (placeholderId) {
                                const phIdx = state.strati.findIndex(x => x.id === placeholderId);
                                if (phIdx !== -1) state.strati.splice(phIdx, 1);
                            }
                            state.strati.splice(i, 0, backupStrato);
                            affectedIdx.forEach(li => {
                                if (state.logs[li]) state.logs[li].lithology = deletedId;
                            });
                            saveState();
                            renderStratiList();
                            updateUI();
                        });
                    });
                });

                // Bind: mostra/nascondi il pannello "Parametri Avanzati" di uno strato
                // Stesso motivo dei toggle dell'Archivio Litologico: niente renderStratiList()
                // qui, altrimenti il pannello viene ricreato da zero e la transizione CSS non
                // ha nulla da cui animare. Si tocca solo la classe .open del nodo già in pagina.
                container.querySelectorAll('.strato-toggle-params').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const i = parseInt(btn.dataset.stratoIdx);
                        const strato = state.strati[i];
                        if (!strato) return;
                        const nowOpen = !stratiParamsExpanded.has(strato.id);
                        if (nowOpen) stratiParamsExpanded.add(strato.id); else stratiParamsExpanded.delete(strato.id);
                        // Il pulsante ora condivide la riga con l'indicatore archivio (vedi corpo
                        // condensato della riga strato), quindi il pannello non è più il suo
                        // fratello diretto: lo cerchiamo nel contenitore comune invece di
                        // affidarci a nextElementSibling.
                        const region = btn.closest('.strato-row-body-inner')?.querySelector('.strato-params-body');
                        if (region && region.classList.contains('expand-region')) region.classList.toggle('open', nowOpen);
                        btn.innerHTML = `<svg class="ico" style="width:12px; height:12px;"><use href="#i-flask"/></svg> Parametri Avanzati ${nowOpen ? '▲' : '▼'}`;
                    });
                });

                // Bind: selettori di categoria, info scientifiche e auto-compila dentro i pannelli espansi
                bindParametriAvanzatiEvents(container);
            }

