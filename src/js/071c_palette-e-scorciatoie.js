            // PALETTE DEI COMANDI (Ctrl K) E GUIDA DELLE SCORCIATOIE (?), prototipo PC passo 4.
            // Un elenco solo: la palette mostra i comandi che si possono eseguire adesso (più i progetti
            // e le prove, per andarci), la guida li mostra tutti coi loro tasti.
            // Voce: [gruppo, etichetta, tasto, azione, adesso].
            function comandiPc() {
                const vista = (state.uiState && state.uiState.currentView) || 'home';
                const conProgetto = vista !== 'home' && !!(state.projects || {})[state.currentProjectId];
                const inProva = vista === 'field';
                const clicSu = id => () => document.getElementById(id).click();
                return [
                    ['Ovunque', 'Cerca o esegui un comando', 'Ctrl K', null, false],
                    ['Ovunque', 'Guida e scorciatoie', '?', apriScorciatoie, true],
                    ['Ovunque', 'Chiudi la finestra o il menu', 'Esc', null, false],
                    ['Ovunque', 'Annulla l\'ultima eliminazione', 'Ctrl Z', null, false],
                    ['Ovunque', 'Vai ai progetti', '', () => switchView('home'), vista !== 'home'],
                    ['Ovunque', 'Nuovo progetto', '', openNewProjectModal, true],
                    ['Ovunque', 'Ricevi un progetto', '', clicSu('btnHomeImportProject'), true],
                    ['Ovunque', 'Impostazioni', '', openDrawer, true],
                    ['Ovunque', 'Template di report', '', clicSu('btnOpenReportTemplatesHome'), true],
                    ['Ovunque', 'Archivio litologico', '', clicSu('btnOpenArchiveManagerHome'), true],
                    ['Progetto', 'Schermata del progetto', '', () => switchView('project'), conProgetto && vista !== 'project'],
                    ['Progetto', 'Consegna', 'Ctrl E', clicSu('pcBtnConsegna'), conProgetto],
                    ['Progetto', 'Dati del progetto', '', openCantiereInfoModal, conProgetto],
                    ['Progetto', 'Strati e parametri', '', openStratiModal, conProgetto],
                    ['Progetto', 'Note del progetto', '', () => apriNoteProgetto(state.currentProjectId), conProgetto],
                    ['Progetto', 'Nuova prova', '', openNewSurveyModal, conProgetto],
                    ['Progetto', 'Terreno e sezioni (DTM)', '', apriTerreno, conProgetto],
                    ['Progetto', 'Sezione tra le prove', '', apriSezione, conProgetto],
                    ['Progetto', 'Vista 3D del terreno', '', apriVista3d, conProgetto],
                    ['Prova', 'Aggiungi intervalli', 'Ctrl I', openBulkImportModal, inProva],
                    ['Prova', 'Falda', 'F', openQuickFaldaModal, inProva],
                    ['Prova', 'Foto della prova', '', clicSu('btnOpenSurveyPhotosModal'), inProva],
                    ['Prova', 'Posizione GPS', '', clicSu('btnGetGpsHeader'), inProva],
                    ['Prova', 'Strumento della prova', '', () => openSurveySettingsModal(state.currentSurveyId, 'strumento'), inProva],
                    ['Contatore sul PC', 'Accendi o spegni il contatore', 'C', interruttoreContatorePc, inProva],
                    ['Contatore sul PC', 'Un colpo', 'Spazio', null, false],
                    ['Contatore sul PC', 'Togli un colpo', 'Backspace', null, false],
                    ['Contatore sul PC', 'Registra l\'intervallo', 'Invio', null, false],
                    ['Registro', 'Scegli la riga sopra o sotto', '↑ ↓', null, false],
                    ['Registro', 'Modifica la riga scelta', 'F2 o Invio', null, false],
                    ['Registro', 'Azioni sulla riga', 'Tasto destro', null, false],
                    ['Registro', 'Elimina la riga scelta', 'Canc', null, false]
                ];
            }

            let vociPalette = [], vocePalette = 0;

            function voceHtml(v, i) {
                return `<button type="button" role="option" data-i="${i}"${i === vocePalette ? ' aria-selected="true"' : ''}><span>${escapeHtmlDidascalia(v.etichetta)}</span><small>${escapeHtmlDidascalia(v.gruppo)}</small>${v.tasto ? `<kbd>${v.tasto}</kbd>` : ''}</button>`;
            }

            function renderPalette() {
                const q = normalizzaPerRicerca(document.getElementById('txtPalette').value);
                const tutte = comandiPc().filter(c => c[3] && c[4]).map(c => ({ gruppo: c[0], etichetta: c[1], tasto: c[2], azione: c[3] }));
                const progetti = state.projects || {};
                Object.keys(progetti).forEach(id => tutte.push({ gruppo: 'Progetti', etichetta: progetti[id].name || progetti[id].comune || 'Progetto', tasto: '', azione: () => apriDalLato(id) }));
                const aperto = state.uiState.currentView !== 'home' && progetti[state.currentProjectId];
                if (aperto) Object.values(aperto.surveys || {}).forEach(s => tutte.push({ gruppo: 'Prove di ' + (aperto.name || 'questo progetto'), etichetta: 'Prova ' + ((s.header || {}).provaNr || '?'), tasto: '', azione: () => apriDalLato(null, s.id) }));
                vociPalette = tutte.filter(v => !q || normalizzaPerRicerca(v.etichetta + ' ' + v.gruppo).includes(q));
                vocePalette = Math.min(vocePalette, Math.max(0, vociPalette.length - 1));
                document.getElementById('listaPalette').innerHTML = vociPalette.length
                    ? vociPalette.map(voceHtml).join('')
                    : '<div class="palette-vuota">Nessun comando con queste parole. Prova con un\'altra, o apri la guida col tasto ?</div>';
            }

            function apriFinestraPc(id) {
                closeAnyOpenModal();
                document.getElementById(id + 'Overlay').classList.add('open');
                document.getElementById(id).classList.add('open');
            }

            function apriPalette() {
                apriFinestraPc('modalPalette');
                document.getElementById('txtPalette').value = '';
                vocePalette = 0;
                renderPalette();
                document.getElementById('txtPalette').focus();
            }

            function eseguiVocePalette(i) {
                const v = vociPalette[i];
                if (!v) return;
                closeAnyOpenModal();
                v.azione();
            }

            function apriScorciatoie() {
                const gruppi = {};
                comandiPc().filter(c => c[2]).forEach(c => (gruppi[c[0]] = gruppi[c[0]] || []).push(c));
                document.getElementById('gruppiScorciatoie').innerHTML = Object.keys(gruppi).map(g => `<section><h3>${g}</h3>${gruppi[g].map(c => `<div><span>${c[1]}</span><kbd>${c[2]}</kbd></div>`).join('')}</section>`).join('');
                apriFinestraPc('modalScorciatoie');
            }

            document.getElementById('txtPalette').addEventListener('input', () => { vocePalette = 0; renderPalette(); });
            document.getElementById('txtPalette').addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    vocePalette = Math.max(0, Math.min(vociPalette.length - 1, vocePalette + (e.key === 'ArrowDown' ? 1 : -1)));
                    renderPalette();
                    const scelta = document.querySelector('#listaPalette [aria-selected]');
                    if (scelta && scelta.scrollIntoView) scelta.scrollIntoView({ block: 'nearest' });
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    eseguiVocePalette(vocePalette);
                }
            });
            document.getElementById('listaPalette').addEventListener('click', (e) => {
                const b = e.target.closest('[data-i]');
                if (b) eseguiVocePalette(Number(b.dataset.i));
            });

            document.addEventListener('keydown', (e) => {
                if (!suPc()) return;
                const k = e.key.toLowerCase();
                const ctrl = e.ctrlKey || e.metaKey;
                if (ctrl && k === 'k') {
                    e.preventDefault();
                    return document.getElementById('modalPalette').classList.contains('open') ? closeAnyOpenModal() : apriPalette();
                }
                if (document.querySelector('.modal.open, .drawer.open')) return;
                const vista = state.uiState.currentView;
                if (ctrl && k === 'z' && !staScrivendo(e) && document.getElementById('undoNotificationBanner').style.display === 'flex') { e.preventDefault(); document.getElementById('btnUndoDeleteProject').click(); return; }
                if (ctrl && k === 'e' && vista !== 'home') { e.preventDefault(); document.getElementById('pcBtnConsegna').click(); return; }
                if (ctrl && k === 'i' && vista === 'field') { e.preventDefault(); openBulkImportModal(); return; }
                if (ctrl || e.altKey || staScrivendo(e)) return;
                if (e.key === '?') { e.preventDefault(); apriScorciatoie(); }
                else if (k === 'f' && vista === 'field') { e.preventDefault(); openQuickFaldaModal(); }
            });
