            // ===== GESTIONE ARCHIVIO GLOBALE (elenco completo, statistiche, edit, delete) =====
            const modalArchiveManagerOverlay = document.getElementById('modalArchiveManagerOverlay');
            const modalArchiveManager = document.getElementById('modalArchiveManager');
            const archiveManagerList = document.getElementById('archiveManagerList');
            const btnOpenArchiveManager = document.getElementById('btnOpenArchiveManager');
            const btnCloseArchiveManagerX = document.getElementById('btnCloseArchiveManagerX');
            const btnCloseArchiveManager = document.getElementById('btnCloseArchiveManager');

            // Quali card dell'Archivio Litologico Globale sono aperte in modifica (sopravvive
            // ai re-render, come stratiParamsExpanded per gli strati di progetto).
            const archManagerExpanded = new Set();
            // Quali card hanno anche la sotto-sezione "Parametri Avanzati" aperta (indipendente
            // dall'espansione della card stessa, stesso schema di stratiParamsExpanded).
            const archPrefExpanded = new Set();
            // Testo corrente del campo di ricerca strati (vuoto = nessun filtro attivo).
            let archManagerSearchTerm = '';
            const txtArchiveSearch = document.getElementById('txtArchiveSearch');
            if (txtArchiveSearch) {
                txtArchiveSearch.addEventListener('input', () => {
                    archManagerSearchTerm = txtArchiveSearch.value || '';
                    renderArchiveManagerList();
                });
            }

            function renderArchiveManagerList() {
                const listCompleta = getArchiveList();
                if (listCompleta.length === 0) {
                    archiveManagerList.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:20px;">Nessuna voce in archivio. Usa "Salva in Archivio" nella gestione strati di un progetto per aggiungere la prima.</div>`;
                    return;
                }
                const termine = archManagerSearchTerm.trim().toLowerCase();
                const list = termine ? listCompleta.filter(a => (a.name || '').toLowerCase().includes(termine)) : listCompleta;
                if (list.length === 0) {
                    archiveManagerList.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:20px;"><svg class="ico" style="width:20px; height:20px; opacity:.5; display:block; margin:0 auto 6px;"><use href="#i-search"/></svg>Nessuno strato trovato per "${archManagerSearchTerm}".</div>`;
                    return;
                }
                archiveManagerList.innerHTML = list.map(arch => {
                    const stats = computeArchiveStats(arch.id);
                    const espanso = archManagerExpanded.has(arch.id);
                    const prefEspanso = archPrefExpanded.has(arch.id);
                    const pref = arch.parametriPreferiti || {};
                    return `
                        <div class="arch-card-wrap ${espanso ? 'arch-card-wrap-open' : ''}" style="border:1px solid var(--border); border-left:4px solid ${arch.color}; border-radius:var(--radius-sm); background:var(--bg-card-hover); overflow:hidden;">
                            <div class="arch-card-toggle" data-arch-id="${arch.id}" style="display:flex; align-items:center; gap:8px; padding:9px 11px; cursor:pointer;">
                                <div style="width:20px; height:20px; border-radius:5px; flex:0 0 auto; border:1px solid rgba(0,0,0,0.25); ${getPatternCss(arch.pattern, arch.color)}"></div>
                                <span style="flex:1; font-weight:700; font-size:12.5px;">${arch.name}</span>
                                <svg class="ico" style="width:15px; height:15px; color:var(--text-muted); transform:rotate(${espanso ? '180' : '0'}deg); transition:transform var(--mov-medio) var(--ease-entra);"><use href="#i-chevron-down"/></svg>
                            </div>
                            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:1px; background:var(--border); font-size:10.5px;">
                                <div style="background:var(--bg-card); padding:7px 8px; text-align:center;">
                                    <div style="font-weight:800; font-size:15px; color:var(--accent);">${stats.projectCount}</div>
                                    <div style="color:var(--text-muted);">Progetti</div>
                                </div>
                                <div style="background:var(--bg-card); padding:7px 8px; text-align:center;">
                                    <div style="font-weight:800; font-size:15px; color:var(--accent);">${stats.surveyCount}</div>
                                    <div style="color:var(--text-muted);">Prove</div>
                                </div>
                                <div style="background:var(--bg-card); padding:7px 8px; text-align:center;">
                                    <div style="font-weight:800; font-size:15px; color:var(--accent);">${stats.intervalCount}</div>
                                    <div style="color:var(--text-muted);">Intervalli</div>
                                </div>
                            </div>
                            ${stats.intervalCount > 0 ? `
                                <div style="padding:8px 11px; font-size:11px; color:var(--text-main); line-height:1.6; border-top:1px solid var(--border);">
                                    <div><strong>Profondità media:</strong> ${stats.avgDepthStart.toFixed(2)}m – ${stats.avgDepthEnd.toFixed(2)}m</div>
                                    <div><strong>Spessore medio:</strong> ${stats.avgThickness.toFixed(2)}m</div>
                                    <div><strong>Colpi:</strong> media ${stats.avgColpi.toFixed(1)} (min ${stats.minColpi} – max ${stats.maxColpi})</div>
                                    <div><strong>Ultimo utilizzo:</strong> ${formatUltimoUtilizzo(stats.lastUsedTs)}</div>
                                    <div><strong>Località:</strong> ${stats.locations.join(', ') || '-'}</div>
                                </div>
                            ` : `
                                <div style="padding:8px 11px; font-size:10.5px; color:var(--text-muted); border-top:1px solid var(--border);">Non ancora utilizzato in nessun intervallo registrato.</div>
                            `}
                            <div class="arch-card-body expand-region ${espanso ? 'open' : ''}" style="padding:0 11px; border-top:1px solid var(--border);">
                                <div style="padding:11px 0; display:flex; flex-direction:column; gap:8px;">
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <input type="color" value="${arch.color}" data-arch-id="${arch.id}" class="arch-color-pick" style="width:34px; height:34px; border:none; background:none; cursor:pointer; border-radius:6px;">
                                        <input type="text" value="${arch.name}" data-arch-id="${arch.id}" class="arch-name-input form-control" style="flex:1; font-weight:700;" placeholder="Nome strato">
                                    </div>
                                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                                        <div>
                                            <label style="font-size:9.5px; font-weight:700; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:2px;">Pattern Visuale:</label>
                                            ${buildArchPatternPickerHtml(arch.id, arch.pattern, arch.color)}
                                        </div>
                                        <div>
                                            <label style="font-size:9.5px; font-weight:700; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:2px;">Geotecnica:</label>
                                            <select class="form-control arch-behavior-select" data-arch-id="${arch.id}" style="padding:4px 6px; font-size:11px; width:100%;">
                                                <option value="granulare" ${arch.behavior === 'granulare' ? 'selected' : ''}>Granulare</option>
                                                <option value="coesivo" ${arch.behavior === 'coesivo' ? 'selected' : ''}>Coesivo</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style="border-top:1px dashed var(--border); padding-top:9px; margin-top:2px;">
                                        <button type="button" class="btn-action arch-pref-toggle" data-arch-id="${arch.id}" style="width:100%; background:var(--purple-soft); color:var(--purple); border:1px solid rgba(168,85,247,0.4); font-size:11px; font-weight:700; padding:6px;">
                                            <svg class="ico" style="width:12px; height:12px;"><use href="#i-flask"/></svg> Parametri Avanzati — preferenze di default ${prefEspanso ? '▲' : '▼'}
                                        </button>
                                        <div class="expand-region ${prefEspanso ? 'open' : ''}">
                                            <div style="padding-top:8px;">
                                                <div style="font-size:10px; color:var(--text-muted); margin-bottom:8px; line-height:1.4;">
                                                    Formula proposta per prima quando questo strato viene riusato in un progetto e ha già intervalli assegnati. Resta comunque libero di cambiarla caso per caso in base ai colpi reali. Tocca "Modifica" per cambiarla.
                                                </div>
                                                <!-- Categorie applicabili calcolate con la STESSA funzione del wizard guidato
                                                     (categorieApplicabili, invece dell'elenco fisso ORDINE_PARAMETRI che
                                                     escludeva "Peso unità di volume" — bug segnalato esplicitamente): stesso
                                                     ordine, stesse categorie, un solo posto che decide quali/quante sono. -->
                                                ${categorieApplicabili({ isCoesivo: arch.behavior === 'coesivo', isIncoerente: arch.behavior !== 'coesivo' }).map(cat => {
                                                    const coloreCat = COLORI_EXPORT[cat.id] || '90CAF9';
                                                    const p = pref[cat.id];
                                                    const etichettaScelta = p ? `${p.autore}${p.terreno ? ' — ' + p.terreno : ''}` : 'Nessuna preferenza';
                                                    return `
                                                    <div style="margin-bottom:6px; padding:9px 12px; border-radius:8px; background:#${coloreCat}; display:flex; align-items:center; gap:8px;">
                                                        <div style="flex:1; min-width:0;">
                                                            <label style="font-size:9.5px; font-weight:700; color:${WIZ_TESTO_SU_COLORE}; text-transform:uppercase; display:block; margin-bottom:3px;">${cat.label}</label>
                                                            <div style="font-size:11.5px; font-weight:600; color:${WIZ_TESTO_SU_COLORE}; ${p ? '' : 'opacity:.65; font-style:italic;'} overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${etichettaScelta}</div>
                                                        </div>
                                                        <button type="button" class="btn-icon arch-pref-edit-btn" data-arch-id="${arch.id}" data-cat-id="${cat.id}" title="Modifica" style="flex-shrink:0; background:rgba(255,255,255,0.35); color:${WIZ_TESTO_SU_COLORE};"><svg class="ico" style="width:14px;height:14px;"><use href="#i-edit"/></svg></button>
                                                    </div>`;
                                                }).join('')}
                                            </div>
                                        </div>
                                    </div>
                                    <button class="btn-action arch-delete-btn" data-arch-id="${arch.id}" style="width:100%; background:transparent; border:1px solid var(--danger); color:var(--danger); font-size:11.5px; font-weight:700; padding:8px; margin-top:2px;">
                                        <svg class="ico"><use href="#i-trash"/></svg> Elimina dall'Archivio
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                // Questi due toggle NON richiamano renderArchiveManagerList(): un re-render
                // completo ricrea il nodo da zero ad ogni tocco, e una CSS transition non ha
                // nulla da cui partire su un elemento appena nato — appare/scompare di scatto
                // invece di animare. Qui si tocca solo la classe .open dell'elemento già in
                // pagina, così la transizione ha un vero prima/dopo su cui lavorare. Gli Set
                // (archManagerExpanded/archPrefExpanded) restano comunque aggiornati, per
                // ricordare lo stato quando la lista si ri-renderizza per altri motivi.
                archiveManagerList.querySelectorAll('.arch-card-toggle').forEach(row => {
                    row.addEventListener('click', () => {
                        const id = row.dataset.archId;
                        const nowOpen = !archManagerExpanded.has(id);
                        if (nowOpen) archManagerExpanded.add(id); else archManagerExpanded.delete(id);
                        const card = row.parentElement;
                        const region = card && card.querySelector(':scope > .expand-region');
                        if (region) region.classList.toggle('open', nowOpen);
                        const chevron = row.querySelector('svg.ico');
                        if (chevron) chevron.style.transform = `rotate(${nowOpen ? 180 : 0}deg)`;
                    });
                });
                archiveManagerList.querySelectorAll('.arch-pref-toggle').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const id = btn.dataset.archId;
                        const nowOpen = !archPrefExpanded.has(id);
                        if (nowOpen) archPrefExpanded.add(id); else archPrefExpanded.delete(id);
                        const region = btn.nextElementSibling;
                        if (region && region.classList.contains('expand-region')) region.classList.toggle('open', nowOpen);
                        btn.innerHTML = `<svg class="ico" style="width:12px; height:12px;"><use href="#i-flask"/></svg> Parametri Avanzati — preferenze di default ${nowOpen ? '▲' : '▼'}`;
                    });
                });
                archiveManagerList.querySelectorAll('.arch-color-pick').forEach(input => {
                    input.addEventListener('click', (e) => e.stopPropagation());
                    input.addEventListener('input', (e) => {
                        const id = e.target.dataset.archId;
                        if (!state.lithologyArchive[id]) return;
                        state.lithologyArchive[id].color = e.target.value;
                        const card = e.target.closest('div[style*="border-left"]');
                        if (card) card.style.borderLeftColor = e.target.value;
                        saveState();
                    });
                });
                archiveManagerList.querySelectorAll('.arch-name-input').forEach(input => {
                    input.addEventListener('click', (e) => e.stopPropagation());
                    input.addEventListener('change', (e) => {
                        const id = e.target.dataset.archId;
                        if (state.lithologyArchive[id]) {
                            state.lithologyArchive[id].name = e.target.value.trim() || state.lithologyArchive[id].name;
                            saveState();
                            renderArchiveManagerList();
                        }
                    });
                });
                archiveManagerList.querySelectorAll('.arch-patpick-trigger').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const id = e.currentTarget.dataset.archId;
                        archPatpickOpenId = (archPatpickOpenId === id) ? null : id;
                        renderArchiveManagerList();
                    });
                });
                archiveManagerList.querySelectorAll('.arch-patpick-wrap .patpick-option').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const id = e.currentTarget.dataset.archId;
                        const value = e.currentTarget.dataset.value;
                        if (!state.lithologyArchive[id]) return;
                        state.lithologyArchive[id].pattern = value;
                        archPatpickOpenId = null;

                        if (value.startsWith(PREFISSO_RETINO)) {
                            const r = RETINI_PER_ID[value.slice(PREFISSO_RETINO.length)];
                            if (r) state.lithologyArchive[id].color = r.colore;
                        }
                        saveState();
                        renderArchiveManagerList();
                    });
                });
                if (archPatpickOpenId !== null && !archPatpickDocClickBound) {
                    archPatpickDocClickBound = true;
                    document.addEventListener('click', function chiudiArchPatpickFuori(e) {
                        if (archPatpickOpenId !== null && !e.target.closest('.arch-patpick-wrap')) {
                            archPatpickOpenId = null;
                            archPatpickDocClickBound = false;
                            document.removeEventListener('click', chiudiArchPatpickFuori);
                            renderArchiveManagerList();
                        }
                    });
                }
                archiveManagerList.querySelectorAll('.arch-behavior-select').forEach(sel => {
                    sel.addEventListener('click', (e) => e.stopPropagation());
                    sel.addEventListener('change', (e) => {
                        const id = e.target.dataset.archId;
                        if (!state.lithologyArchive[id]) return;
                        state.lithologyArchive[id].behavior = e.target.value;
                        saveState();
                    });
                });
                archiveManagerList.querySelectorAll('.arch-pref-edit-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        apriModificaPreferenzaArchivio(btn.dataset.archId, btn.dataset.catId);
                    });
                });
                archiveManagerList.querySelectorAll('.arch-delete-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const id = btn.dataset.archId;
                        const arch = state.lithologyArchive[id];
                        if (!arch) return;
                        const stats = computeArchiveStats(id);
                        const msg = stats.projectCount > 0
                            ? `Eliminare "${arch.name}" dall'archivio?\n\nÈ utilizzato in ${stats.projectCount} progett${stats.projectCount === 1 ? 'o' : 'i'}: gli strati già presenti nei progetti NON verranno toccati, ma perderanno il collegamento con l'archivio.`
                            : `Eliminare "${arch.name}" dall'archivio?`;
                        const ok = await appConfirmDelete(msg);
                        if (!ok) return;
                        const archBackup = JSON.parse(JSON.stringify(arch));
                        // Traccia quali strati di progetto erano collegati a questa voce d'archivio,
                        // per poterli ricollegare se l'utente annulla entro 10 secondi.
                        const collegati = new Set();
                        Object.values(state.projects || {}).forEach(proj => {
                            (proj.strati || []).forEach(s => { if (s.sourceArchiveId === id) collegati.add(s); });
                        });
                        if (state.strati) state.strati.forEach(s => { if (s.sourceArchiveId === id) collegati.add(s); });

                        delete state.lithologyArchive[id];
                        archManagerExpanded.delete(id);
                        archPrefExpanded.delete(id);
                        // Scollega (senza cancellare) gli strati di progetto che vi facevano riferimento
                        collegati.forEach(s => delete s.sourceArchiveId);
                        saveState();
                        renderArchiveManagerList();
                        if (typeof renderStratiList === 'function') renderStratiList();
                        triggerVibrate([40, 30, 40]);

                        showUndoBanner(`Voce archivio "${archBackup.name}" eliminata`, () => {
                            state.lithologyArchive[id] = archBackup;
                            collegati.forEach(s => { s.sourceArchiveId = id; });
                            saveState();
                            renderArchiveManagerList();
                            if (typeof renderStratiList === 'function') renderStratiList();
                        });
                    });
                });
            }

            function openArchiveManager() {
                archManagerSearchTerm = '';
                if (txtArchiveSearch) txtArchiveSearch.value = '';
                renderArchiveManagerList();
                modalArchiveManagerOverlay.classList.add('open');
                modalArchiveManager.classList.add('open');
            }
            function closeArchiveManager() {
                modalArchiveManagerOverlay.classList.remove('open');
                modalArchiveManager.classList.remove('open');
            }
            if (btnOpenArchiveManager) btnOpenArchiveManager.addEventListener('click', openArchiveManager);
            // Scorciatoia diretta all'Archivio Litologico Globale dall'header, visibile solo in Home.
            const btnOpenArchiveManagerHome = document.getElementById('btnOpenArchiveManagerHome');
            if (btnOpenArchiveManagerHome) btnOpenArchiveManagerHome.addEventListener('click', openArchiveManager);
            if (btnCloseArchiveManagerX) btnCloseArchiveManagerX.addEventListener('click', closeArchiveManager);
            if (btnCloseArchiveManager) btnCloseArchiveManager.addEventListener('click', closeArchiveManager);
            if (modalArchiveManagerOverlay) modalArchiveManagerOverlay.addEventListener('click', closeArchiveManager);

