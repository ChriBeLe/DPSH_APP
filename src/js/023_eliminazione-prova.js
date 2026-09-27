            // ===== ELIMINAZIONE PROVA (pressione prolungata sulla chip) =====
            const modalDeleteSurveyOverlay = document.getElementById('modalDeleteSurveyOverlay');
            const modalDeleteSurvey = document.getElementById('modalDeleteSurvey');
            const lblDeleteSurveyName = document.getElementById('lblDeleteSurveyName');
            const lblDeleteSurveyDetails = document.getElementById('lblDeleteSurveyDetails');
            const txtDeleteSurveyConfirm = document.getElementById('txtDeleteSurveyConfirm');
            const btnCancelDeleteSurvey = document.getElementById('btnCancelDeleteSurvey');
            const btnConfirmDeleteSurvey = document.getElementById('btnConfirmDeleteSurvey');
            let pendingDeleteSurveyId = null;

            function openDeleteSurveyModal(survId) {
                const proj = state.projects && state.projects[state.currentProjectId];
                if (!proj || !proj.surveys || !proj.surveys[survId]) return;

                // Non si elimina l'unica prova rimasta: il progetto resterebbe senza contenuto e
                // l'app senza una prova attiva da mostrare.
                if (Object.keys(proj.surveys).length <= 1) {
                    appAlert('Questa è l\'unica prova del progetto e non può essere eliminata.\n\nPer rimuoverla del tutto elimina l\'intero progetto dalla schermata Home.');
                    return;
                }

                const surv = proj.surveys[survId];
                const h = surv.header || {};
                const nLogs = (surv.logs || []).length;
                const nPhotos = (surv.photos || []).length;
                const maxDepth = nLogs > 0 ? surv.logs[nLogs - 1].end : 0;

                pendingDeleteSurveyId = survId;
                lblDeleteSurveyName.textContent = `Prova N° ${h.provaNr || '?'}${h.comune ? ' — ' + h.comune : ''}`;
                lblDeleteSurveyDetails.innerHTML =
                    `${ico('list')} ${nLogs} intervalli registrati (fino a ${Number(maxDepth).toFixed(2)}m)<br>` +
                    `${ico('camera')} ${nPhotos} foto associate`;

                txtDeleteSurveyConfirm.value = '';
                btnConfirmDeleteSurvey.style.opacity = '0.45';
                btnConfirmDeleteSurvey.style.pointerEvents = 'none';

                modalDeleteSurveyOverlay.classList.add('open');
                modalDeleteSurvey.classList.add('open');
                setTimeout(() => txtDeleteSurveyConfirm.focus(), 120);
            }

            function closeDeleteSurveyModal() {
                pendingDeleteSurveyId = null;
                if (modalDeleteSurveyOverlay) modalDeleteSurveyOverlay.classList.remove('open');
                if (modalDeleteSurvey) modalDeleteSurvey.classList.remove('open');
            }

            if (txtDeleteSurveyConfirm) {
                txtDeleteSurveyConfirm.addEventListener('input', (e) => {
                    const ok = e.target.value.trim().toUpperCase() === 'CANCELLA';
                    btnConfirmDeleteSurvey.style.opacity = ok ? '1' : '0.45';
                    btnConfirmDeleteSurvey.style.pointerEvents = ok ? 'auto' : 'none';
                });
            }

            if (btnCancelDeleteSurvey) btnCancelDeleteSurvey.addEventListener('click', closeDeleteSurveyModal);
            if (modalDeleteSurveyOverlay) modalDeleteSurveyOverlay.addEventListener('click', closeDeleteSurveyModal);

            if (btnConfirmDeleteSurvey) {
                btnConfirmDeleteSurvey.addEventListener('click', () => {
                    if (!pendingDeleteSurveyId) return;
                    if (txtDeleteSurveyConfirm.value.trim().toUpperCase() !== 'CANCELLA') return;

                    const proj = state.projects && state.projects[state.currentProjectId];
                    if (!proj || !proj.surveys || !proj.surveys[pendingDeleteSurveyId]) {
                        closeDeleteSurveyModal();
                        return;
                    }

                    const deletedId = pendingDeleteSurveyId;
                    const wasActive = (deletedId === state.currentSurveyId);
                    const remainingBefore = Object.keys(proj.surveys);
                    const deletedIdx = remainingBefore.indexOf(deletedId);
                    const projIdOfDeleted = state.currentProjectId;

                    copiaPrimaDi(`eliminare la Prova N° ${(proj.surveys[deletedId].header && proj.surveys[deletedId].header.provaNr) || '?'}`);
                    // Copia di sicurezza per l'annullamento entro 10s.
                    const survBackup = JSON.parse(JSON.stringify(proj.surveys[deletedId]));
                    const survPhotos = (proj.surveys[deletedId].photos || []).slice();

                    delete proj.surveys[deletedId];
                    proj.updatedAt = Date.now();

                    // Se era la prova aperta, passa alla più vicina rimasta (precedente, o la prima)
                    if (wasActive) {
                        const remaining = Object.keys(proj.surveys);
                        const nextId = remaining[Math.max(0, deletedIdx - 1)] || remaining[0];
                        syncProjectToActiveState(projIdOfDeleted, nextId);
                    }

                    saveState();
                    updateUI();
                    if (typeof renderHomeProjects === 'function') renderHomeProjects();
                    closeDeleteSurveyModal();

                    const survLabel = `Prova N° ${(survBackup.header && survBackup.header.provaNr) || '?'}`;
                    showUndoBanner(`${survLabel} eliminata`, () => {
                        const p = state.projects && state.projects[projIdOfDeleted];
                        if (!p) return;
                        if (!p.surveys) p.surveys = {};
                        p.surveys[deletedId] = survBackup;
                        p.updatedAt = Date.now();
                        syncProjectToActiveState(projIdOfDeleted, deletedId);
                        saveState();
                        updateUI();
                        if (typeof renderHomeProjects === 'function') renderHomeProjects();
                    });

                    // Le foto vengono rimosse dallo storage SOLO se l'annullamento non viene usato,
                    // altrimenti un ripristino restituirebbe una prova con immagini mancanti.
                    setTimeout(() => {
                        const stillDeleted = !(state.projects[projIdOfDeleted] &&
                                               state.projects[projIdOfDeleted].surveys &&
                                               state.projects[projIdOfDeleted].surveys[deletedId]);
                        if (stillDeleted) {
                            // Solo le foto che nessun'altra prova usa più: una copia condivide le
                            // immagini con l'originale (vedi idFotoAncoraInUso).
                            const inUso = (typeof idFotoAncoraInUso === 'function') ? idFotoAncoraInUso() : new Set();
                            survPhotos.forEach(ph => {
                                if (ph && ph.id && !inUso.has(ph.id)) {
                                    try { if (typeof deletePhotoFromIDB === 'function') deletePhotoFromIDB(ph.id); } catch (e) { ignoraErrore('closeDeleteSurveyModal', e); }
                                    delete photoMemoryCache[ph.id];
                                }
                            });
                        }
                    }, 11000);
                });
            }

