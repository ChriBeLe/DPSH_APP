            // ===================== STRATI E PARAMETRI SENZA VICOLI CIECHI =====================
            // Gli strati e le scelte dei parametri sono del PROGETTO; i valori (Nspt, Rpd, candidati)
            // sono di UNA prova, quella aperta. Prima non lo diceva nessuno: aperta dal Progetto, la
            // Gestione degli strati calcolava sull'ultima prova usata. E per uno strato senza
            // intervalli in quella prova il messaggio diceva «assegna la litologia nella scheda
            // Prova» senza un tasto per arrivarci. Qui: la prova su cui si calcola si vede e si
            // cambia, e ogni messaggio che dice cosa manca ha il tasto che ci porta.

            function nomeProva(s) { return `Prova N° ${(s && s.header && s.header.provaNr) || '?'}`; }
            function nomeProvaAperta() {
                const proj = state.projects && state.projects[state.currentProjectId];
                return nomeProva(proj && proj.surveys && proj.surveys[state.currentSurveyId]) ;
            }
            function testoSicuroStrati(t) {
                return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }

            /** Le prove del progetto (in ordine) in cui lo strato ha almeno un intervallo. Per la
             * prova aperta contano i suoi intervalli in memoria, che possono essere più nuovi della
             * copia nel progetto. */
            function proveDelProgettoConStrato(stratoId) {
                const proj = state.projects && state.projects[state.currentProjectId];
                if (!proj) return [];
                return proveInOrdine(proj).filter(s => {
                    const logs = s.id === state.currentSurveyId ? state.logs : (s.logs || []);
                    return getLogsPerStratoIn(stratoId, logs, state.strati).length > 0;
                });
            }

            /** Il messaggio di uno strato senza intervalli nella prova aperta: dove compare
             * invece (con il tasto per calcolare lì) e il tasto per assegnargli gli intervalli. */
            function htmlStratoSenzaDati(strato) {
                const altre = proveDelProgettoConStrato(strato.id).filter(s => s.id !== state.currentSurveyId);
                const dove = altre.length
                    ? `Compare nella ${altre.map(nomeProva).join(', ')}.`
                    : 'Non ha intervalli in nessuna prova del progetto.';
                const bottoni = altre.slice(0, 3).map(s => `<button type="button" class="bt bt-tenue" data-calcola-prova="${s.id}">Calcola sulla ${nomeProva(s)}</button>`).join('');
                return `<div class="strato-senza-dati">
                        «${testoSicuroStrati(strato.name)}» non ha intervalli nella ${nomeProvaAperta()}. ${dove}
                        <div class="strato-senza-dati-azioni">${bottoni}<button type="button" class="bt" data-assegna-intervalli="1">Assegna gli intervalli</button></div>
                    </div>`;
            }

            /** In cima alla Gestione degli strati: su quale prova si calcolano i valori, e la tendina
             * per cambiarla. Con una prova sola non c'è niente da scegliere. */
            function renderProvaDiCalcoloStrati() {
                const box = document.getElementById('stratiProvaDiCalcolo');
                if (!box) return;
                const proj = state.projects && state.projects[state.currentProjectId];
                const prove = proj ? proveInOrdine(proj) : [];
                if (prove.length < 2) { box.innerHTML = ''; return; }
                box.innerHTML = `<label class="strati-prova-calcolo">Valori calcolati sulla
                        <select id="selStratiProvaCalcolo">${prove.map(s => `<option value="${s.id}" ${s.id === state.currentSurveyId ? 'selected' : ''}>${nomeProva(s)}${s.header && s.header.interpretazioneDi ? ' (interpretazione)' : ''}</option>`).join('')}</select>
                    </label>`;
                box.querySelector('select').addEventListener('change', (e) => calcolaSullaProva(e.target.value));
            }

            /** Apre un'altra prova del progetto restando dove si è (Gestione strati, procedura
             * guidata, parametri di uno strato): cambiano solo i valori calcolati. */
            function calcolaSullaProva(survId) {
                if (!survId || survId === state.currentSurveyId) return;
                saveState(); // la prova aperta torna nel progetto prima di cambiarla
                syncProjectToActiveState(state.currentProjectId, survId);
                updateUI();
                renderStratiList();
                if (modalWizard && modalWizard.classList.contains('open')) renderWizardModal();
                const finestraParametri = document.getElementById('modalEditParams');
                if (finestraParametri && finestraParametri.classList.contains('open')) chiudiEditParamsModal();
                mostraToast(`Valori calcolati sulla ${nomeProvaAperta()}`);
            }

            /** Porta alla prova aperta, sul Registro, dove si assegnano gli strati agli intervalli. */
            function vaiAdAssegnareIntervalli() {
                if (modalWizard && modalWizard.classList.contains('open')) chiudiWizardParametri(true);
                const finestraParametri = document.getElementById('modalEditParams');
                if (finestraParametri && finestraParametri.classList.contains('open')) chiudiEditParamsModal();
                if (modalManageStrati && modalManageStrati.classList.contains('open')) closeStratiModal();
                switchView('field');
                mostraVistaProva('registro');
                mostraToast('Tocca un intervallo per scegliere lo strato, o sposta i contatti sul grafico', { durata: 6000 });
            }

            document.addEventListener('click', (e) => {
                const b = e.target.closest && e.target.closest('[data-calcola-prova], [data-assegna-intervalli]');
                if (!b) return;
                e.stopPropagation();
                if (b.dataset.calcolaProva) calcolaSullaProva(b.dataset.calcolaProva);
                else vaiAdAssegnareIntervalli();
            }, true);

            document.getElementById('btnStratiVaiConsegna').addEventListener('click', () => {
                closeStratiModal();
                openExportModal('project', state.currentProjectId);
            });
