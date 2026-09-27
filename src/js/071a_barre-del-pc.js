            // BARRE DEL PC (prototipo PC, passo 1): percorso in alto, progetti e prove a sinistra,
            // aiuto e versione in basso. Solo da 1024 px; sul telefono restano nascoste.
            // Chiamata da switchView, updateUI e renderHomeProjects. Tutto dentro la funzione:
            // switchView gira anche all'avvio, prima che questo pezzo sia valutato.
            function renderPc() {
                if (!window.matchMedia('(min-width: 1024px)').matches) return;
                const vista = (state.uiState && state.uiState.currentView) || 'home';
                const progetti = state.projects || {};
                const proj = vista !== 'home' ? progetti[state.currentProjectId] : null;
                const esc = escapeHtmlDidascalia;
                const nomeProgetto = p => p.name || p.comune || 'Progetto';
                const provaNr = s => String((s.header || {}).provaNr || '?');

                const percorso = [['home', 'Progetti']];
                if (proj) percorso.push(['project', nomeProgetto(proj)]);
                if (proj && vista === 'field' && proj.surveys[state.currentSurveyId]) percorso.push(['field', 'Prova ' + provaNr(proj.surveys[state.currentSurveyId])]);
                document.getElementById('pcPercorso').innerHTML = percorso.map((p, i) => i === percorso.length - 1
                    ? `<li><span aria-current="page">${esc(p[1])}</span></li>`
                    : `<li><button type="button" data-vista="${p[0]}">${esc(p[1])}</button></li>`).join('');
                document.getElementById('pcBtnConsegna').style.display = proj ? '' : 'none';
                const btnContatore = document.getElementById('pcBtnContatore');
                btnContatore.style.display = vista === 'field' ? '' : 'none';
                btnContatore.setAttribute('aria-pressed', String(state.settings.contatoreSuPc === true));

                const righe = ['<div class="pc-lato-titolo">Progetti</div>'];
                Object.keys(progetti).sort((a, b) => (progetti[b].updatedAt || 0) - (progetti[a].updatedAt || 0)).forEach(id => {
                    const p = progetti[id];
                    const aperto = id === state.currentProjectId && vista !== 'home';
                    righe.push(`<button type="button" data-progetto="${esc(id)}"${aperto && vista === 'project' ? ' aria-current="page"' : ''}>${esc(nomeProgetto(p))}</button>`);
                    if (!aperto) return;
                    Object.values(p.surveys || {}).sort((a, b) => provaNr(a).localeCompare(provaNr(b), 'it', { numeric: true })).forEach(s => {
                        righe.push(`<button type="button" class="pc-prova" data-prova="${esc(s.id)}"${vista === 'field' && s.id === state.currentSurveyId ? ' aria-current="page"' : ''}>Prova ${esc(provaNr(s))}</button>`);
                    });
                });
                document.getElementById('pcLato').innerHTML = righe.join('');

                document.getElementById('pcStatoAiuto').textContent = {
                    home: 'Clic su un progetto a sinistra per aprirlo',
                    project: 'Clic su una prova per aprirla',
                    field: state.settings.contatoreSuPc === true
                        ? 'Contatore: Spazio un colpo · Backspace toglie · Invio registra · F2 modifica la riga scelta · C spegne'
                        : 'Clic sceglie · doppio clic o Invio modifica · tasto destro: azioni · ↑ ↓ scorrono · Canc elimina'
                }[vista] + (vista === 'field' ? '' : ' · Esc chiude le finestre');
                document.getElementById('pcStatoVersione').textContent = 'Ctrl K comandi · ? guida · DPSH ' + APP_VERSIONE;
                if (vista === 'field') forseGuidaRapida();
            }

            document.getElementById('pcPercorso').addEventListener('click', (e) => {
                const b = e.target.closest('[data-vista]');
                if (b) switchView(b.dataset.vista);
            });
            // Apre una prova del progetto aperto, o la schermata di un progetto. Serve anche alla palette.
            function apriDalLato(id, prova) {
                if (prova) {
                    if (prova !== state.currentSurveyId) { saveState(); syncProjectToActiveState(state.currentProjectId, prova); }
                    return switchView('field');
                }
                const surv = ultimaProvaUsata(state.projects[id]);
                if (!surv) return openProject(id); // la ripara creando la prima prova
                if (id !== state.currentProjectId) { saveState(); syncProjectToActiveState(id, surv); }
                switchView('project');
            }
            document.getElementById('pcLato').addEventListener('click', (e) => {
                const b = e.target.closest('button');
                if (b) apriDalLato(b.dataset.progetto, b.dataset.prova);
            });
            document.getElementById('pcBtnConsegna').addEventListener('click', () => {
                if (state.uiState.currentView === 'field') document.getElementById('btnExportHeader').click();
                else openExportModal('project', state.currentProjectId);
            });
            document.getElementById('pcBtnImpostazioni').addEventListener('click', openDrawer);
            window.addEventListener('resize', renderPc);
