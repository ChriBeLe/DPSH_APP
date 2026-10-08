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
                apriMenuContesto(e, p.name || p.comune || 'Progetto', [
                    ['Apri', 'i-folder-open', '', () => apriDalLato(id)],
                    ['Consegna', 'i-download', '', () => openExportModal('project', id)],
                    ['Terreno e sezioni', 'i-map', '', () => { apriDalLato(id); apriTerreno(); }],
                    '-',
                    ['Note, stato, copia, elimina…', 'i-more', '', () => openProjectActionsModal(id)]
                ]);
            }
            function apriMenuProva(e, survId) {
                const s = state.projects[state.currentProjectId].surveys[survId];
                apriMenuContesto(e, 'Prova ' + ((s.header || {}).provaNr || '?'), [
                    ['Apri', 'i-folder-open', '', () => apriDalLato(null, survId)],
                    ['Mostra sulla mappa', 'i-map', '', () => mostraProvaSullaMappa(survId)],
                    ['Dati della prova', 'i-file', '', () => openSurveySettingsModal(survId, 'dati')],
                    ['Strumento', 'i-ruler', '', () => openSurveySettingsModal(survId, 'strumento')]
                ]);
            }
            document.addEventListener('contextmenu', (e) => {
                if (!suPc()) return;
                const progetto = e.target.closest('#pcLato [data-progetto], #homeProjectsContainer [data-id]');
                const prova = e.target.closest('#pcLato [data-prova], #listaProveProgetto [data-surv]');
                if (progetto) apriMenuProgetto(e, progetto.dataset.progetto || progetto.dataset.id);
                else if (prova) apriMenuProva(e, prova.dataset.prova || prova.dataset.surv);
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
