            // IL REGISTRO SUL PC (prototipo PC, passo 2): clic sceglie la riga e accende la sua barra
            // nel grafico (e viceversa); doppio clic o Invio modifica; tasto destro apre le azioni
            // dove sta il mouse; ↑ ↓ scorrono, Canc elimina. Sul telefono resta il tocco.
            let rigaScelta = -1, provaDellaScelta = null;

            function segnaRigaScelta() {
                if (provaDellaScelta !== state.currentSurveyId || rigaScelta >= state.logs.length) rigaScelta = -1;
                document.querySelectorAll('.swipe-row-wrapper.scelta, .chart-bar-group.scelta').forEach(el => el.classList.remove('scelta'));
                if (rigaScelta >= 0) document.querySelectorAll(`.swipe-row-wrapper[data-index="${rigaScelta}"], .chart-bar-group[data-index="${rigaScelta}"]`).forEach(el => el.classList.add('scelta'));
            }

            function scegliRiga(idx, scorri) {
                rigaScelta = idx;
                provaDellaScelta = state.currentSurveyId;
                segnaRigaScelta();
                if (scorri) document.querySelectorAll(`.swipe-row-wrapper[data-index="${idx}"]`).forEach(el => el.scrollIntoView && el.scrollIntoView({ block: 'nearest' }));
            }

            // Le righe nell'ordine in cui si vedono: il Registro può avere le più recenti in cima.
            function righeVisibili() {
                const integrato = document.getElementById('cardIntegratedRegister');
                const corpo = document.getElementById(integrato && integrato.style.display !== 'none' ? 'tblIntegratedLogsBody' : 'tblLogsBody');
                return [...corpo.querySelectorAll('.swipe-row-wrapper[data-index]')].map(el => Number(el.dataset.index));
            }

            // Si sta scrivendo in un campo: i tasti sono caratteri, non comandi. Non conta un campo
            // dentro una finestra chiusa, dove il fuoco resta dopo Esc. Un tasto già usato dal campo
            // (Invio che salva e chiude la scheda) conta come scrittura.
            function staScrivendo(e) {
                return e.defaultPrevented || !!(e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]') && !e.target.closest('.modal:not(.open)'));
            }

            const menuRiga = document.getElementById('menuRiga');
            function chiudiMenuRiga() { menuRiga.classList.remove('open'); }
            // Esc col menu aperto chiude SOLO il menu (prima chiudeva anche la finestra sotto, per
            // esempio l'editor del template intero). In cattura, prima degli altri Esc.
            window.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape' || !menuRiga.classList.contains('open')) return;
                e.preventDefault();
                e.stopImmediatePropagation();
                chiudiMenuRiga();
            }, true);
            // Il menu del tasto destro, dove sta il mouse: un titolo e le voci
            // [etichetta, icona, tasto, azione, pericolo], o '-' per una riga di separazione.
            let vociMenuContesto = [];
            function apriMenuContesto(e, titolo, voci) {
                e.preventDefault();
                vociMenuContesto = voci;
                menuRiga.innerHTML = `<div class="menu-contesto-titolo">${escapeHtmlDidascalia(titolo)}</div>` + voci.map((v, i) => v === '-'
                    ? '<div class="menu-sep" aria-hidden="true"></div>'
                    : `<button type="button" role="menuitem" data-voce="${i}"${v[4] ? ' class="pericolo"' : ''}><svg class="ico"><use href="#${v[1]}"/></svg>${v[0]}${v[2] ? `<kbd>${v[2]}</kbd>` : ''}</button>`).join('');
                menuRiga.classList.add('open');
                menuRiga.style.left = Math.min(e.clientX, window.innerWidth - menuRiga.offsetWidth - 8) + 'px';
                menuRiga.style.top = Math.min(e.clientY, window.innerHeight - menuRiga.offsetHeight - 38) + 'px'; // sopra la barra di stato
            }
            function apriMenuRiga(e, idx) {
                scegliRiga(idx);
                const l = state.logs[idx];
                apriMenuContesto(e, `${numeroConVirgola(l.start)}–${numeroConVirgola(l.end)} m · ${l.colpi} colpi`, [
                    ['Modifica', 'i-edit', 'Invio', () => openEditModal(idx)],
                    '-',
                    ['Elimina', 'i-trash', 'Canc', () => deleteLogStep(idx), true]
                ]);
            }
            // Progetti (barra laterale, Home) e prove (barra laterale, schermata Progetto).
            function apriMenuProgetto(e, id) {
                const p = state.projects[id];
                // Lo stato si cambia da qui: un clic sullo stato già scelto lo toglie, come nel ⋯.
                const segnaStato = (stato) => {
                    if (p.stato === stato) delete p.stato; else p.stato = stato;
                    saveState();
                    renderHomeProjects();
                    if (state.uiState.currentView === 'project' && state.currentProjectId === id) renderSchermataProgetto();
                };
                // Le altre azioni premono il loro comando nella finestra del ⋯ (stessi controlli e conferme).
                const azione = (idBottone) => () => { projectActionsContext = { projId: id }; const b = document.getElementById(idBottone); if (b) b.click(); };
                apriMenuContesto(e, p.name || p.comune || 'Progetto', [
                    ['Apri', 'i-folder-open', '', () => apriDalLato(id)],
                    ['Dati del progetto', 'i-edit', '', () => { apriDalLato(id); openCantiereInfoModal(); }],
                    ['Note', 'i-note', '', () => apriNoteProgetto(id)],
                    ['Strati', 'i-stack', '', () => { apriDalLato(id); openStratiModal(); }],
                    ['Terreno e sezioni', 'i-map', '', () => { apriDalLato(id); apriTerreno(); }],
                    ['Consegna', 'i-download', '', () => openExportModal('project', id)],
                    '-',
                    ['Confronta le prove', 'i-chart', '', azione('btnProjActConfronta')],
                    '-',
                    ...STATI_PROGETTO.map(st => [st.etichetta, p.stato === st.id ? 'i-check' : 'i-tag', '', () => segnaStato(st.id)]),
                    '-',
                    ['Porta su un altro dispositivo', 'i-upload', '', azione('btnProjActPorta')],
                    ['Duplica il progetto', 'i-duplica', '', azione('btnProjActDuplicate')],
                    ['Cronologia (copie automatiche)', 'i-undo', '', azione('btnProjActCronologia')],
                    ['Elimina il progetto', 'i-trash', '', azione('btnProjActDelete'), true]
                ]);
            }
            function apriMenuProva(e, survId) {
                const s = state.projects[state.currentProjectId].surveys[survId];
                const correggi = tipo => () => apriProvaPerCorreggere(state.currentProjectId, survId, tipo);
                apriMenuContesto(e, 'Prova ' + ((s.header || {}).provaNr || '?'), [
                    ['Apri', 'i-folder-open', '', () => apriDalLato(null, survId)],
                    ['Dati della prova', 'i-edit', '', () => openSurveySettingsModal(survId, 'dati')],
                    ['Strumento', 'i-ruler', '', () => openSurveySettingsModal(survId, 'strumento')],
                    '-',
                    ['Posizione GPS', 'i-pin', '', correggi('gps')],
                    ['Foto', 'i-camera', '', correggi('foto')],
                    ['Falda', 'i-droplet', '', correggi('falda')],
                    ['Strati e parametri', 'i-stack', '', () => { apriDalLato(null, survId); openStratiModal(); }],
                    ['Mostra sulla mappa', 'i-map', '', () => mostraProvaSullaMappa(survId)],
                    '-',
                    ['Duplica come interpretazione', 'i-duplica', '', () => duplicaProvaComeInterpretazione(survId)],
                    ['Elimina la prova', 'i-trash', '', () => openDeleteSurveyModal(survId), true]
                ]);
            }
            document.addEventListener('contextmenu', (e) => {
                if (!suPc()) return;
                const progetto = e.target.closest('#pcLato [data-progetto], #homeProjectsContainer [data-id]');
                const prova = e.target.closest('#pcLato [data-prova], #listaProveProgetto [data-surv]');
                if (progetto) apriMenuProgetto(e, progetto.dataset.progetto || progetto.dataset.id);
                else if (prova) apriMenuProva(e, prova.dataset.prova || prova.dataset.surv);
                // Anche sui titoli: il nome del progetto nella sua schermata, «Prova N» nella prova.
                else if (e.target.closest('#btnProgettoDati')) apriMenuProgetto(e, state.currentProjectId);
                else if (e.target.closest('#btnOpenSurveyDrawer')) apriMenuProva(e, state.currentSurveyId);
            });
            menuRiga.addEventListener('click', (e) => {
                const b = e.target.closest('[data-voce]');
                if (!b) return;
                chiudiMenuRiga();
                vociMenuContesto[Number(b.dataset.voce)][3]();
            });
            document.addEventListener('click', (e) => { if (!menuRiga.contains(e.target)) chiudiMenuRiga(); });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') return chiudiMenuRiga();
                if (!suPc() || state.uiState.currentView !== 'field' || e.ctrlKey || e.altKey || e.metaKey) return;
                if (staScrivendo(e)) return;
                if (document.querySelector('.modal.open, .drawer.open')) return;
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    const righe = righeVisibili();
                    if (!righe.length) return;
                    e.preventDefault();
                    const qui = righe.indexOf(rigaScelta);
                    const dove = qui < 0 ? 0 : Math.max(0, Math.min(righe.length - 1, qui + (e.key === 'ArrowDown' ? 1 : -1)));
                    scegliRiga(righe[dove], true);
                } else if (rigaScelta >= 0 && (e.key === 'F2' || (e.key === 'Enter' && state.settings.contatoreSuPc !== true))) {
                    e.preventDefault();
                    chiudiMenuRiga();
                    openEditModal(rigaScelta);
                } else if (rigaScelta >= 0 && e.key === 'Delete') {
                    e.preventDefault();
                    chiudiMenuRiga();
                    deleteLogStep(rigaScelta);
                }
            });
