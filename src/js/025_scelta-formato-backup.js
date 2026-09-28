            // ===================== SCELTA FORMATO BACKUP (JSON vs ZIP) =====================
            // Un'unica modale spiega la differenza tra i due formati (in entrambi le foto
            // vengono conservate per intero, cambia solo come) e viene riusata sia per il
            // backup di un singolo progetto sia per il backup completo dell'archivio.
            let backupChoiceContext = null;
            const modalBackupChoiceOverlay = document.getElementById('modalBackupChoiceOverlay');
            const modalBackupChoice = document.getElementById('modalBackupChoice');
            const btnCloseBackupChoiceX = document.getElementById('btnCloseBackupChoiceX');
            const btnBackupChoiceJson = document.getElementById('btnBackupChoiceJson');
            const btnBackupChoiceZip = document.getElementById('btnBackupChoiceZip');

            function openBackupChoiceModal(context) {
                backupChoiceContext = context;
                // Controllo dei dati (004c) su ciò che finirà nel file. In Vista Prova la prova aperta
                // vive in state: la si porta nel progetto prima, come fa il riepilogo dell'export.
                if (state.uiState && state.uiState.currentView === 'field') syncStateToProject();
                const daControllare = (context && context.type === 'project')
                    ? { projects: state.projects && state.projects[context.projId] ? { [context.projId]: state.projects[context.projId] } : {} }
                    : state;
                renderIntegritaPrimaExport('integritaPrimaBackup', daControllare);
                if (modalBackupChoiceOverlay) modalBackupChoiceOverlay.classList.add('open');
                if (modalBackupChoice) modalBackupChoice.classList.add('open');
            }
            function closeBackupChoiceModal() {
                if (modalBackupChoiceOverlay) modalBackupChoiceOverlay.classList.remove('open');
                if (modalBackupChoice) modalBackupChoice.classList.remove('open');
                backupChoiceContext = null;
            }
            if (btnCloseBackupChoiceX) btnCloseBackupChoiceX.addEventListener('click', closeBackupChoiceModal);
            if (modalBackupChoiceOverlay) modalBackupChoiceOverlay.addEventListener('click', closeBackupChoiceModal);

            if (btnBackupChoiceJson) {
                btnBackupChoiceJson.addEventListener('click', async () => {
                    const ctx = backupChoiceContext;
                    if (!ctx) return;
                    closeBackupChoiceModal();
                    try {
                        if (ctx.type === 'project') {
                            await exportProjectJSON(ctx.projId);
                        } else {
                            if (await exportGlobalJSONBackup()) registraBackupCompleto();
                        }
                    } catch (e) {
                        console.error('Export JSON error:', e);
                        alert('Errore durante la creazione del backup JSON:\n\n' + e.message);
                    }
                });
            }
            if (btnBackupChoiceZip) {
                btnBackupChoiceZip.addEventListener('click', async () => {
                    const ctx = backupChoiceContext;
                    if (!ctx) return;
                    closeBackupChoiceModal();
                    try {
                        if (ctx.type === 'project') {
                            await exportProjectZip(ctx.projId);
                        } else {
                            await exportGlobalZip();
                            registraBackupCompleto();
                        }
                    } catch (e) {
                        console.error('Export ZIP error:', e);
                        alert('Errore durante la creazione dello ZIP:\n\n' + e.message);
                    }
                });
            }

            if (btnProjActExport) {
                btnProjActExport.addEventListener('click', () => {
                    if (!projectActionsContext) return;
                    const { projId } = projectActionsContext;
                    closeProjectActionsModal();
                    // L'export resta un tap diretto, senza conferma aggiuntiva: apre lo stesso
                    // punto di export unico usato ovunque nell'app.
                    openExportModal('project', projId);
                });
            }

            if (btnProjActDelete) {
                btnProjActDelete.addEventListener('click', () => {
                    if (!projectActionsContext) return;
                    const { projId } = projectActionsContext;
                    closeProjectActionsModal();
                    const cardBtn = homeProjectsContainer ? homeProjectsContainer.querySelector(`.btn-open-project[data-id="${projId}"]`) : null;
                    const cardElem = cardBtn ? cardBtn.closest('div[style*="background"]') : null;
                    deleteProject(projId, cardElem);
                });
            }

            // MODAL FLUTTUANTE ESPORTAZIONE UNIFICATA (PROGETTO / PROVA)
            const modalExportOverlay = document.getElementById('modalExportOverlay');
            const modalExportFormats = document.getElementById('modalExportFormats');
            const lblExportModalTitle = document.getElementById('lblExportModalTitle');
            const lblExportModalSubtitle = document.getElementById('lblExportModalSubtitle');
            const btnCloseExportX = document.getElementById('btnCloseExportX');
            const btnCancelExportModal = document.getElementById('btnCancelExportModal');

            const btnOptExportExcel = document.getElementById('btnOptExportExcel');
            const btnOptExportCompletePdf = document.getElementById('btnOptExportCompletePdf');
            const btnOptExportCompleteWord = document.getElementById('btnOptExportCompleteWord');
            const btnOptExportKML = document.getElementById('btnOptExportKML');
            const btnOptExportPhotos = document.getElementById('btnOptExportPhotos');
            const btnOptExportJSON = document.getElementById('btnOptExportJSON');

            let exportModalContext = { type: 'project', id: null };

            /** Cosa manca, prova per prova, prima di esportare. Non blocca niente: è un promemoria.
             * La falda vuota esce nel report come «non rilevata», quindi l'avviso dice proprio questo:
             * l'app non può sapere se è stata dimenticata o se davvero non c'era. Restituisce solo le
             * prove che hanno qualcosa da segnalare, ordinate per numero. */
            function avvisiPrimaExport(proj) {
                const vuoto = v => v === null || v === undefined || String(v).trim() === '';
                return Object.values((proj && proj.surveys) || {})
                    .sort((a, b) => (parseInt(a.header && a.header.provaNr) || 0) - (parseInt(b.header && b.header.provaNr) || 0) || (a.updatedAt || 0) - (b.updatedAt || 0))
                    .map(s => {
                        const h = s.header || {};
                        const avvisi = [];
                        if (!(s.logs && s.logs.length)) avvisi.push({ tipo: 'colpi', testo: 'Nessun colpo registrato' });
                        if (vuoto(h.lat) || vuoto(h.lng) || !isFinite(parseFloat(h.lat)) || !isFinite(parseFloat(h.lng))) avvisi.push({ tipo: 'gps', testo: 'Coordinate GPS mancanti' });
                        if (!(s.photos && s.photos.length)) avvisi.push({ tipo: 'foto', testo: 'Nessuna foto' });
                        if (vuoto(h.faldaDa)) avvisi.push({ tipo: 'falda', testo: 'Falda non impostata: nel report comparirà «non rilevata»' });
                        const mancanti = [['committente', 'committente'], ['localita', 'località'], ['date', 'data']]
                            .filter(([campo]) => vuoto(h[campo])).map(([, nome]) => nome);
                        if (mancanti.length) avvisi.push({ tipo: 'intestazione', testo: 'Intestazione senza ' + mancanti.join(', ') });
                        return { id: s.id, provaNr: h.provaNr || '?', interpretazione: !!h.interpretazioneDi, avvisi };
                    })
                    .filter(r => r.avvisi.length > 0);
            }

            /** Da un avviso del controllo alla finestra dove si corregge: chiude l'export, apre la
             * prova (anche partendo da Home) e poi la finestra giusta per quel dato. */
            function apriProvaPerCorreggere(projId, survId, tipo) {
                const proj = state.projects && state.projects[projId];
                if (!proj || !proj.surveys || !proj.surveys[survId]) return;
                closeExportModal();
                const inVistaProva = state.uiState && state.uiState.currentView === 'field';
                if (!inVistaProva || state.currentProjectId !== projId) {
                    if (inVistaProva) saveState();
                    openProject(projId);
                }
                if (state.currentSurveyId !== survId) {
                    saveState();
                    syncProjectToActiveState(projId, survId);
                    updateUI();
                    saveState();
                }
                const apri = { gps: openGpsModal, foto: openSurveyPhotosModal, falda: openQuickFaldaModal, intestazione: openCantiereInfoModal }[tipo];
                if (typeof apri === 'function') setTimeout(apri, 250);
            }

            /** Il riquadro «Controllo prima dell'export» in cima alla modale Esporta: chiuso dice quanti
             * avvisi ci sono, aperto li elenca prova per prova. Riguarda sempre tutto il progetto,
             * come il Report PDF che sta subito sotto. */
            function renderRiepilogoPrimaExport(targetType, targetId) {
                const box = document.getElementById('riepilogoPrimaExport');
                if (!box) return;
                const projId = targetType === 'project' ? targetId : state.currentProjectId;
                const proj = state.projects && state.projects[projId];
                if (!proj) { box.style.display = 'none'; box.innerHTML = ''; return; }
                // In Vista Prova la prova aperta vive in state: la si porta nel progetto prima di
                // controllarla, altrimenti gli avvisi guarderebbero dati vecchi.
                if (state.uiState && state.uiState.currentView === 'field' && projId === state.currentProjectId) syncStateToProject();
                const righe = avvisiPrimaExport(proj);
                box.style.display = 'block';
                if (righe.length === 0) {
                    box.innerHTML = `<div style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: var(--success); background: var(--success-soft); border-radius: var(--radius-sm); padding: 9px 11px;">${ico('check')} Controllo prima dell'export: non manca niente.</div>`;
                    return;
                }
                const totale = righe.reduce((n, r) => n + r.avvisi.length, 0);
                box.innerHTML = `
                    <details style="background: var(--warning-soft); border: 1px solid var(--warning); border-radius: var(--radius-sm); padding: 9px 11px;">
                        <summary style="cursor: pointer; font-size: 12px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 8px; list-style: none;">
                            <span style="color: var(--warning); display: inline-flex;">${ico('alert')}</span>
                            <span style="flex: 1;">Controllo prima dell'export: ${totale} ${totale === 1 ? 'avviso' : 'avvisi'} su ${righe.length} ${righe.length === 1 ? 'prova' : 'prove'}</span>
                            <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Vedi</span>
                        </summary>
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                            ${righe.map(r => `
                                <div>
                                    <div style="font-size: 12px; font-weight: 700; color: var(--text-main);">Prova N° ${r.provaNr}${r.interpretazione ? ' <span style="font-weight: 400; color: var(--text-muted);">· interpretazione alternativa</span>' : ''}</div>
                                    ${r.avvisi.map(a => `<button type="button" class="avviso-prima-export" data-surv="${r.id}" data-tipo="${a.tipo}" style="display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 8px; text-align: left; background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 7px 9px; margin-top: 4px; font-size: 11.5px; cursor: pointer;"><span>${a.testo}</span><span style="flex-shrink: 0; color: var(--accent-ink); font-weight: 700;">${a.tipo === 'colpi' ? 'Apri' : 'Correggi'}</span></button>`).join('')}
                                </div>`).join('')}
                            <div style="font-size: 10.5px; color: var(--text-muted); line-height: 1.4;">È solo un promemoria: puoi esportare comunque.</div>
                        </div>
                    </details>`;
                box.querySelectorAll('.avviso-prima-export').forEach(b => b.addEventListener('click', () => {
                    apriProvaPerCorreggere(projId, b.getAttribute('data-surv'), b.getAttribute('data-tipo'));
                }));
            }

            function openExportModal(targetType, targetId) {
                exportModalContext = { type: targetType, id: targetId };
                renderRiepilogoPrimaExport(targetType, targetId);
                // Controllo dei dati (004c) sul progetto che si esporta: dopo il riepilogo, che ha già
                // riportato nel progetto la prova aperta.
                const projIdControllo = targetType === 'project' ? targetId : state.currentProjectId;
                const projControllo = state.projects && state.projects[projIdControllo];
                renderIntegritaPrimaExport('integritaPrimaExport', { projects: projControllo ? { [projIdControllo]: projControllo } : {} });

                const lblSingleScope = document.getElementById('lblExportSingleSurveyScope');
                const lblSingleName = document.getElementById('lblExportSingleSurveyName');
                const lblCompleteDesc = document.getElementById('lblExportCompleteDesc');

                // Consegna (Fase 5): dentro una prova si può scegliere tra la prova e il progetto.
                const inProva = state.uiState && state.uiState.currentView === 'field' && projIdControllo === state.currentProjectId;
                document.getElementById('perimetroConsegna').style.display = inProva ? '' : 'none';
                document.getElementById('btnPerimetroProva').setAttribute('aria-selected', String(targetType !== 'project'));
                document.getElementById('btnPerimetroProgetto').setAttribute('aria-selected', String(targetType === 'project'));
                // I parametri avanzati si calcolano sul progetto aperto (elencoProveProgetto).
                document.getElementById('consegnaParametri').style.display = targetType === 'project' && projIdControllo === state.currentProjectId ? '' : 'none';
                document.getElementById('btnOptConfrontoProve').style.display = targetType === 'project' ? '' : 'none';
                renderProveConsegna();
                if (lblExportModalTitle) lblExportModalTitle.textContent = 'Consegna';

                if (targetType === 'project') {
                    const proj = state.projects ? state.projects[targetId] : null;
                    const projName = proj ? (proj.name || proj.comune || 'Cantiere') : 'Progetto';
                    if (lblExportModalSubtitle) lblExportModalSubtitle.textContent = projName;
                    if (lblSingleScope) lblSingleScope.style.display = 'none';
                    if (lblCompleteDesc) lblCompleteDesc.textContent = `Report di campo (tabelle Parametri Avanzati opzionali) per tutte le prove del progetto "${projName}".`;
                } else {
                    const survName = (state.header && state.header.comune) ? `${state.header.comune} (${state.header.codice || 'Prova'})` : 'Prova Corrente';
                    if (lblExportModalSubtitle) lblExportModalSubtitle.textContent = testiTestataProva().titolo + ' · ' + testiTestataProva().sotto;
                    // Le opzioni qui sotto (Excel, Report PDF, KML, Foto, Backup JSON)
                    // riguardano SOLO questa prova: lo rendiamo esplicito, dato che il Report
                    // Completo qui sopra riguarda invece sempre l'intero progetto.
                    if (lblSingleScope) lblSingleScope.style.display = 'flex';
                    if (lblSingleName) lblSingleName.textContent = survName;
                    if (lblCompleteDesc) lblCompleteDesc.textContent = `Report di campo (tabelle Parametri Avanzati opzionali) per tutte le prove del progetto a cui appartiene "${survName}" (non solo questa).`;
                }


                if (modalExportOverlay) modalExportOverlay.classList.add('open');
                if (modalExportFormats) modalExportFormats.classList.add('open');
            }

            // Le prove della consegna del progetto: tutte accese di partenza; soloProve è null quando
            // sono tutte, così gli export fanno come sempre.
            function renderProveConsegna() {
                const box = document.getElementById('sceltaProveConsegna');
                const proj = exportModalContext.type === 'project' && state.projects[exportModalContext.id];
                const prove = proj ? Object.values(proj.surveys || {}).sort((a, b) => String((a.header || {}).provaNr).localeCompare(String((b.header || {}).provaNr), 'it', { numeric: true })) : [];
                box.style.display = prove.length > 1 ? '' : 'none';
                if (prove.length < 2) { exportModalContext.soloProve = null; return; }
                const scelte = exportModalContext.soloProve || new Set(prove.map(s => s.id));
                document.getElementById('pilloleProveConsegna').innerHTML = prove.map(s => `<button type="button" class="pillola" data-prova="${escapeHtmlDidascalia(s.id)}" aria-pressed="${scelte.has(s.id)}">Prova ${escapeHtmlDidascalia(String((s.header || {}).provaNr || '?'))}</button>`).join('');
                const n = prove.filter(s => scelte.has(s.id)).length;
                document.getElementById('lblProveConsegna').textContent = n === prove.length
                    ? 'Tutte le prove. Tocca una prova per toglierla da Excel, KML e foto.'
                    : n === 0 ? 'Scegli almeno una prova.'
                    : `${n} prove su ${prove.length} per Excel, KML e foto. Il PDF le fa scegliere nel passo dopo; backup e parametri restano di tutto il progetto.`;
                ['btnOptExportExcel', 'btnOptExportKML', 'btnOptExportPhotos'].forEach(id => document.getElementById(id).classList.toggle('spenta', n === 0));
            }
            document.getElementById('pilloleProveConsegna').addEventListener('click', (e) => {
                const b = e.target.closest('[data-prova]');
                if (!b) return;
                const proj = state.projects[exportModalContext.id];
                const scelte = exportModalContext.soloProve || new Set(Object.keys(proj.surveys || {}));
                if (scelte.has(b.dataset.prova)) scelte.delete(b.dataset.prova); else scelte.add(b.dataset.prova);
                exportModalContext.soloProve = scelte.size === Object.keys(proj.surveys || {}).length ? null : scelte;
                renderProveConsegna();
            });

            function closeExportModal() {
                if (modalExportOverlay) modalExportOverlay.classList.remove('open');
                if (modalExportFormats) modalExportFormats.classList.remove('open');
            }

            if (btnCloseExportX) btnCloseExportX.addEventListener('click', closeExportModal);
            document.getElementById('btnPerimetroProva').addEventListener('click', () => openExportModal('survey', state.currentSurveyId));
            document.getElementById('btnPerimetroProgetto').addEventListener('click', () => openExportModal('project', state.currentProjectId));
            document.querySelectorAll('[data-parametri]').forEach(b => b.addEventListener('click', () => {
                closeExportModal();
                document.getElementById('btnExportProcessing' + b.dataset.parametri).click();
            }));
            document.getElementById('btnOptConfrontoProve').addEventListener('click', () => {
                closeExportModal();
                apriConfrontoProve(exportModalContext.id);
            });
            if (btnCancelExportModal) btnCancelExportModal.addEventListener('click', closeExportModal);
            if (modalExportOverlay) modalExportOverlay.addEventListener('click', closeExportModal);

