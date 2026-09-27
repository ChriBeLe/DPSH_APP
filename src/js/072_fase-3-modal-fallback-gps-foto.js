            // ===================== FASE 3: MODAL FALLBACK GPS FOTO (IDEA 3) =====================

            function ensureLeafletLoaded() {
                if (leafletLoaded && window.L) return Promise.resolve();
                if (leafletLoadingPromise) return leafletLoadingPromise;
                leafletLoadingPromise = new Promise((resolve, reject) => {
                    const cssLink = document.createElement('link');
                    cssLink.rel = 'stylesheet';
                    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                    document.head.appendChild(cssLink);

                    const script = document.createElement('script');
                    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                    script.onload = () => { leafletLoaded = true; resolve(); };
                    script.onerror = () => reject(new Error('Impossibile caricare la mappa (verifica la connessione internet).'));
                    document.head.appendChild(script);
                });
                return leafletLoadingPromise;
            }

            const modalPhotoGpsFallbackOverlay = document.getElementById('modalPhotoGpsFallbackOverlay');
            const modalPhotoGpsFallback = document.getElementById('modalPhotoGpsFallback');
            const photoGpsFallbackChoices = document.getElementById('photoGpsFallbackChoices');
            const photoGpsPasteBox = document.getElementById('photoGpsPasteBox');
            const photoGpsMapBox = document.getElementById('photoGpsMapBox');
            const btnClosePhotoGpsFallbackX = document.getElementById('btnClosePhotoGpsFallbackX');
            const btnPhotoGpsUseLive = document.getElementById('btnPhotoGpsUseLive');
            const lblPhotoGpsLiveStatus = document.getElementById('lblPhotoGpsLiveStatus');
            const btnPhotoGpsUseMap = document.getElementById('btnPhotoGpsUseMap');
            const btnPhotoGpsUsePaste = document.getElementById('btnPhotoGpsUsePaste');
            const btnPhotoGpsCancel = document.getElementById('btnPhotoGpsCancel');
            const txtPhotoGpsPasteCoords = document.getElementById('txtPhotoGpsPasteCoords');
            const btnPhotoGpsApplyPaste = document.getElementById('btnPhotoGpsApplyPaste');
            const btnPhotoGpsBackFromPaste = document.getElementById('btnPhotoGpsBackFromPaste');
            const btnPhotoGpsConfirmMap = document.getElementById('btnPhotoGpsConfirmMap');
            const btnPhotoGpsBackFromMap = document.getElementById('btnPhotoGpsBackFromMap');

            function showPhotoGpsFallbackStep(step) {
                if (photoGpsFallbackChoices) photoGpsFallbackChoices.style.display = (step === 'choices') ? 'flex' : 'none';
                if (photoGpsPasteBox) photoGpsPasteBox.style.display = (step === 'paste') ? 'block' : 'none';
                if (photoGpsMapBox) photoGpsMapBox.style.display = (step === 'map') ? 'block' : 'none';
            }

            function openPhotoGpsFallbackModal(photoId) {
                currentFallbackPhotoId = photoId;
                showPhotoGpsFallbackStep('choices');
                if (txtPhotoGpsPasteCoords) txtPhotoGpsPasteCoords.value = '';
                if (lblPhotoGpsLiveStatus) {
                    lblPhotoGpsLiveStatus.textContent = (liveGpsWatch.lat !== null)
                        ? `Disponibile (±${Math.round(liveGpsWatch.acc || 0)}m)`
                        : 'Verrà richiesto ora al dispositivo';
                }
                if (modalPhotoGpsFallbackOverlay) modalPhotoGpsFallbackOverlay.classList.add('open');
                if (modalPhotoGpsFallback) modalPhotoGpsFallback.classList.add('open');
            }
            function closePhotoGpsFallbackModal() {
                if (modalPhotoGpsFallbackOverlay) modalPhotoGpsFallbackOverlay.classList.remove('open');
                if (modalPhotoGpsFallback) modalPhotoGpsFallback.classList.remove('open');
                currentFallbackPhotoId = null;
            }

            function applyGpsToFallbackPhoto(lat, lng, source) {
                if (!currentFallbackPhotoId) { closePhotoGpsFallbackModal(); return; }
                const photo = (state.photos || []).find(p => p.id === currentFallbackPhotoId);
                if (photo) {
                    photo.lat = lat;
                    photo.lng = lng;
                    photo.gpsSource = source;
                    saveState();
                    updateUI();
                    if (typeof renderPhotoGallery === 'function') renderPhotoGallery();
                }
                triggerVibrate([30, 30]);
                closePhotoGpsFallbackModal();
            }

            if (btnClosePhotoGpsFallbackX) btnClosePhotoGpsFallbackX.addEventListener('click', closePhotoGpsFallbackModal);
            if (modalPhotoGpsFallbackOverlay) modalPhotoGpsFallbackOverlay.addEventListener('click', closePhotoGpsFallbackModal);
            if (btnPhotoGpsCancel) btnPhotoGpsCancel.addEventListener('click', closePhotoGpsFallbackModal);

            if (btnPhotoGpsUseLive) {
                btnPhotoGpsUseLive.addEventListener('click', () => {
                    if (liveGpsWatch.lat !== null && liveGpsWatch.lng !== null) {
                        applyGpsToFallbackPhoto(liveGpsWatch.lat, liveGpsWatch.lng, 'live');
                        return;
                    }
                    if (!navigator.geolocation) {
                        alert('Geolocalizzazione non supportata da questo browser.');
                        return;
                    }
                    if (lblPhotoGpsLiveStatus) lblPhotoGpsLiveStatus.textContent = '⏳ Ricerca GPS in corso...';
                    navigator.geolocation.getCurrentPosition(
                        (pos) => applyGpsToFallbackPhoto(pos.coords.latitude, pos.coords.longitude, 'live'),
                        (err) => {
                            if (lblPhotoGpsLiveStatus) lblPhotoGpsLiveStatus.textContent = 'Non disponibile al momento';
                            alert('Impossibile acquisire il GPS: ' + ((err && err.message) || 'errore sconosciuto') + '\n\nProva con "Scegli sulla mappa" o "Incolla coordinate".');
                        },
                        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
                    );
                });
            }

            if (btnPhotoGpsUsePaste) btnPhotoGpsUsePaste.addEventListener('click', () => showPhotoGpsFallbackStep('paste'));
            if (btnPhotoGpsBackFromPaste) btnPhotoGpsBackFromPaste.addEventListener('click', () => showPhotoGpsFallbackStep('choices'));
            if (btnPhotoGpsApplyPaste) {
                btnPhotoGpsApplyPaste.addEventListener('click', () => {
                    const parsed = parsePastedCoords(txtPhotoGpsPasteCoords.value);
                    if (!parsed) {
                        alert('Coordinate non riconosciute. Formati accettati: "41.845912, 12.562424" oppure un link Google Maps.');
                        return;
                    }
                    applyGpsToFallbackPhoto(parsed.lat, parsed.lng, 'incollate');
                });
            }

            async function openPhotoGpsMapPicker() {
                showPhotoGpsFallbackStep('map');
                try {
                    await ensureLeafletLoaded();
                } catch (e) {
                    alert('' + e.message);
                    showPhotoGpsFallbackStep('choices');
                    return;
                }

                const centerLat = liveGpsWatch.lat !== null ? liveGpsWatch.lat
                    : (state.header.lat !== null && state.header.lat !== undefined && state.header.lat !== '' ? parseFloat(state.header.lat) : 41.8719);
                const centerLng = liveGpsWatch.lng !== null ? liveGpsWatch.lng
                    : (state.header.lng !== null && state.header.lng !== undefined && state.header.lng !== '' ? parseFloat(state.header.lng) : 12.5674);

                setTimeout(() => {
                    if (!photoGpsMapInstance) {
                        photoGpsMapInstance = L.map('photoGpsMapEl').setView([centerLat, centerLng], 16);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            maxZoom: 19,
                            attribution: '&copy; OpenStreetMap'
                        }).addTo(photoGpsMapInstance);
                        photoGpsMapMarker = L.marker([centerLat, centerLng], { draggable: true }).addTo(photoGpsMapInstance);
                        photoGpsMapInstance.on('click', (e) => { photoGpsMapMarker.setLatLng(e.latlng); });
                    } else {
                        photoGpsMapInstance.invalidateSize();
                        photoGpsMapInstance.setView([centerLat, centerLng], 16);
                        photoGpsMapMarker.setLatLng([centerLat, centerLng]);
                    }
                }, 60);
            }

            if (btnPhotoGpsUseMap) btnPhotoGpsUseMap.addEventListener('click', openPhotoGpsMapPicker);
            if (btnPhotoGpsBackFromMap) btnPhotoGpsBackFromMap.addEventListener('click', () => showPhotoGpsFallbackStep('choices'));
            if (btnPhotoGpsConfirmMap) {
                btnPhotoGpsConfirmMap.addEventListener('click', () => {
                    if (!photoGpsMapMarker) return;
                    const ll = photoGpsMapMarker.getLatLng();
                    applyGpsToFallbackPhoto(ll.lat, ll.lng, 'mappa');
                });
            }

            // INPUT SYNC CANTIERE
            // Committente e comune: della prova (li leggono i report) e anche del progetto, perché la
            // card della Home li mostra da lì (Fase 4). Le altre prove tengono i loro valori.
            if (txtCommittente) txtCommittente.addEventListener('input', (e) => { state.header.committente = e.target.value; scriviDatoProgettoCorrente('committente', e.target.value); updateUI(); });
            const txtProvincia = document.getElementById('txtProvincia');
            const txtSedeCommittente = document.getElementById('txtSedeCommittente');
            const txtDenominazioneIntervento = document.getElementById('txtDenominazioneIntervento');
            /** Scrive un dato che appartiene al PROGETTO, non alla prova aperta. Non passa da
             * state.header (che e' della prova) proprio per non doverlo poi risincronizzare. */
            function scriviDatoProgettoCorrente(chiave, valore) {
                const proj = state.projects && state.projects[state.currentProjectId];
                if (!proj) return;
                proj[chiave] = valore;
                proj.updatedAt = Date.now();
                saveState();
            }
            const txtNomeProgetto = document.getElementById('txtNomeProgetto');
            // Un nome vuoto non si salva: il progetto resterebbe senza nome in Home e nei file.
            if (txtNomeProgetto) txtNomeProgetto.addEventListener('input', (e) => {
                const nome = e.target.value.trim();
                if (!nome) return;
                scriviDatoProgettoCorrente('name', nome);
                updateUI();
            });
            if (txtProvincia) txtProvincia.addEventListener('input', (e) => scriviDatoProgettoCorrente('provincia', e.target.value));
            if (txtSedeCommittente) txtSedeCommittente.addEventListener('input', (e) => scriviDatoProgettoCorrente('sedeCommittente', e.target.value));
            if (txtDenominazioneIntervento) txtDenominazioneIntervento.addEventListener('input', (e) => scriviDatoProgettoCorrente('denominazioneIntervento', e.target.value));
            if (txtComune) txtComune.addEventListener('input', (e) => { state.header.comune = e.target.value; scriviDatoProgettoCorrente('comune', e.target.value); updateUI(); });
            if (txtLocalita) txtLocalita.addEventListener('input', (e) => { state.header.localita = e.target.value; updateUI(); saveState(); });
            if (txtDataIndagine) txtDataIndagine.addEventListener('change', (e) => { state.header.date = e.target.value; updateUI(); saveState(); });
            if (txtProvaNr) txtProvaNr.addEventListener('input', (e) => {
                state.header.provaNr = e.target.value;
                updateUI();
                saveState();
                // Se la mappa di posizionamento manuale è già aperta, il numero sul pin blu deve
                // restare allineato mentre l'utente digita, senza dover riaprire la mappa.
                if (typeof aggiornaIconaMiaProvaMappaGps === 'function') aggiornaIconaMiaProvaMappaGps();
            });
            if (numHeaderLunghAsta) numHeaderLunghAsta.addEventListener('input', (e) => { 
                const val = parseFloat(e.target.value) || 1.00;
                state.instrument.lunghAsta = val; 
                recalculateDepths();
                saveState(); 
                updateUI();
            });

            // INPUT SYNC DATI STRUMENTO
            if (numPesoMassa) numPesoMassa.addEventListener('input', (e) => { state.instrument.pesoMassa = parseFloat(e.target.value) || 0; saveState(); });
            if (numPesoAsta) numPesoAsta.addEventListener('input', (e) => { state.instrument.pesoAsta = parseFloat(e.target.value) || 0; saveState(); });
            if (numLunghAsta) numLunghAsta.addEventListener('input', (e) => { 
                const val = parseFloat(e.target.value) || 1.00;
                state.instrument.lunghAsta = val; 
                recalculateDepths();
                saveState(); 
                updateUI();
            });
            if (numCambioAsta) numCambioAsta.addEventListener('input', (e) => { state.instrument.cambioAsta = parseFloat(e.target.value) || 0; saveState(); });
            if (numPesoSistema) numPesoSistema.addEventListener('input', (e) => { state.instrument.pesoSistema = parseFloat(e.target.value) || 0; saveState(); });
            if (numVolata) numVolata.addEventListener('input', (e) => { state.instrument.volata = parseFloat(e.target.value) || 0; saveState(); });
            if (numAreaPunta) numAreaPunta.addEventListener('input', (e) => { state.instrument.areaPunta = parseFloat(e.target.value) || 0; saveState(); });
            if (numAngoloPunta) numAngoloPunta.addEventListener('input', (e) => { state.instrument.angoloPunta = parseFloat(e.target.value) || 0; saveState(); });
            const txtNomePenetrometro = document.getElementById('txtNomePenetrometro');
            const txtRivestimentoFanghi = document.getElementById('txtRivestimentoFanghi');
            if (txtNomePenetrometro) txtNomePenetrometro.addEventListener('input', (e) => { state.instrument.nomePenetrometro = e.target.value; saveState(); });
            if (txtRivestimentoFanghi) txtRivestimentoFanghi.addEventListener('input', (e) => { state.instrument.rivestimentoFanghi = e.target.value; saveState(); });

            // ---- Coefficiente di correlazione: mostrato dal vivo, e imponibile ----
            const lblBetaTCalcolato = document.getElementById('lblBetaTCalcolato');
            const chkBetaTForzato = document.getElementById('chkBetaTForzato');
            const rigaBetaTForzato = document.getElementById('rigaBetaTForzato');
            const numBetaTForzato = document.getElementById('numBetaTForzato');

            function aggiornaPannelloBetaT() {
                if (!lblBetaTCalcolato) return;
                const inst = state.instrument || {};
                const passo = (state.settings && state.settings.stepCm) || 20;
                const calcolato = betaTCalcolato(inst, passo);
                const forzato = inst.betaTForzato ? parseFloat(inst.betaTForzato) : null;
                const inUso = (forzato && isFinite(forzato) && forzato > 0) ? forzato : calcolato;
                lblBetaTCalcolato.textContent = fmtIT(inUso, 3);
                // Con un valore imposto si mostrano ENTRAMBI: quello in uso e, sotto, quello che
                // lo strumento direbbe. Nascondere il secondo renderebbe invisibile proprio la
                // discrepanza che questo pannello esiste per rendere evidente.
                lblBetaTCalcolato.title = (forzato && isFinite(forzato) && forzato > 0)
                    ? 'Valore imposto. Dai parametri dello strumento verrebbe ' + fmtIT(calcolato, 3)
                    : 'Calcolato dai parametri dello strumento';
                lblBetaTCalcolato.style.color = (forzato && isFinite(forzato) && forzato > 0) ? 'var(--danger)' : 'var(--accent-ink)';
                if (chkBetaTForzato) chkBetaTForzato.checked = !!(forzato && isFinite(forzato) && forzato > 0);
                if (rigaBetaTForzato) rigaBetaTForzato.style.display = (chkBetaTForzato && chkBetaTForzato.checked) ? 'block' : 'none';
                if (numBetaTForzato && document.activeElement !== numBetaTForzato) {
                    numBetaTForzato.value = (forzato && isFinite(forzato) && forzato > 0) ? forzato : calcolato.toFixed(3);
                }
                const lblLivello = document.getElementById('lblBetaTLivello');
                if (lblLivello) {
                    const proj = state.projects && state.projects[state.currentProjectId];
                    const delCantiere = proj && proj.betaTForzato ? parseFloat(proj.betaTForzato) : null;
                    if (!delCantiere) {
                        lblLivello.textContent = 'Questo valore vale solo per la prova aperta.';
                    } else if (forzato && Math.abs(forzato - delCantiere) < 1e-9) {
                        lblLivello.textContent = 'Valore dichiarato per tutto il cantiere (' + fmtIT(delCantiere, 3) + '): lo adottano anche le prove create d\'ora in poi.';
                    } else {
                        // Il caso che merita di essere detto: questa prova si e' staccata dal
                        // resto del cantiere. Senza scriverlo, resterebbe una divergenza muta.
                        lblLivello.textContent = 'Attenzione: il cantiere dichiara ' + fmtIT(delCantiere, 3) + ', questa prova usa un valore diverso.';
                    }
                }
            }
            if (chkBetaTForzato) {
                chkBetaTForzato.addEventListener('change', () => {
                    if (!state.instrument) state.instrument = {};
                    if (chkBetaTForzato.checked) {
                        const passo = (state.settings && state.settings.stepCm) || 20;
                        state.instrument.betaTForzato = parseFloat(betaTCalcolato(state.instrument, passo).toFixed(3));
                    } else {
                        delete state.instrument.betaTForzato;
                    }
                    saveState();
                    aggiornaPannelloBetaT();
                    if (typeof updateUI === 'function') updateUI();
                });
            }
            const btnBetaTSoloProva = document.getElementById('btnBetaTSoloProva');
            const btnBetaTTuttoProgetto = document.getElementById('btnBetaTTuttoProgetto');
            if (btnBetaTSoloProva) {
                btnBetaTSoloProva.addEventListener('click', () => {
                    // Stacca questa prova dalla dichiarazione del cantiere, senza toccare le altre.
                    const proj = state.projects && state.projects[state.currentProjectId];
                    if (proj) { delete proj.betaTForzato; proj.updatedAt = Date.now(); }
                    saveState();
                    aggiornaPannelloBetaT();
                });
            }
            if (btnBetaTTuttoProgetto) {
                btnBetaTTuttoProgetto.addEventListener('click', async () => {
                    const proj = state.projects && state.projects[state.currentProjectId];
                    const v = parseFloat(numBetaTForzato && numBetaTForzato.value);
                    if (!proj || !isFinite(v) || v <= 0) return;
                    const quante = Object.keys(proj.surveys || {}).length;
                    const ok = await appConfirm(`Imporre \u03b2t = ${fmtIT(v, 3)} a tutte le ${quante} prove di questo cantiere?\n\nOgni prova che ne aveva uno suo verra\u0300 allineata, e le prove create d'ora in poi partiranno da questo valore.`);
                    if (!ok) return;
                    proj.betaTForzato = v;
                    Object.values(proj.surveys || {}).forEach(surv => {
                        if (!surv.instrument) surv.instrument = {};
                        surv.instrument.betaTForzato = v;
                    });
                    if (!state.instrument) state.instrument = {};
                    state.instrument.betaTForzato = v;
                    proj.updatedAt = Date.now();
                    saveState();
                    aggiornaPannelloBetaT();
                    if (typeof updateUI === 'function') updateUI();
                    mostraToast(`\u03b2t = ${fmtIT(v, 3)} applicato a ${quante} ${quante === 1 ? 'prova' : 'prove'}`);
                });
            }
            if (numBetaTForzato) {
                numBetaTForzato.addEventListener('input', () => {
                    if (!chkBetaTForzato || !chkBetaTForzato.checked) return;
                    const v = parseFloat(numBetaTForzato.value);
                    if (!isFinite(v) || v <= 0) return;
                    state.instrument.betaTForzato = v;
                    saveState();
                    aggiornaPannelloBetaT();
                    if (typeof updateUI === 'function') updateUI();
                });
            }
            // Ogni parametro dello strumento cambia il coefficiente: il pannello lo deve dire
            // MENTRE si digita, altrimenti resta la situazione di prima (cambiare alla cieca).
            [numPesoMassa, numPesoAsta, numVolata, numAreaPunta, numPesoSistema].forEach(campo => {
                if (campo) campo.addEventListener('input', aggiornaPannelloBetaT);
            });

            // DRAWER HANDLERS
            function openDrawer() {
                const isHomeView = state.uiState && state.uiState.currentView === 'home';
                const surveySections = document.querySelectorAll('.drawer-survey-section');
                surveySections.forEach(sec => {
                    // 'flex' e non 'block': le sezioni sono contenitori flex-column, forzarle a
                    // block ne rompeva la spaziatura interna.
                    sec.style.display = isHomeView ? 'none' : 'flex';
                });
                if (drawerMenu) drawerMenu.classList.add('open');
                if (drawerOverlay) drawerOverlay.classList.add('open');
                document.body.classList.add('drawer-open');
                // Spazio ricalcolato ad ogni apertura, non una volta all'avvio: è un dato che
                // cambia ad ogni foto scattata, e un numero vecchio qui sarebbe peggio di nessun
                // numero. Volutamente non atteso: legge tutto IndexedDB, il menu deve aprirsi
                // subito e i valori comparire un istante dopo al posto di "Calcolo in corso…".
                if (typeof aggiornaPannelloSpazio === 'function') aggiornaPannelloSpazio();
            }

            function closeDrawer() {
                if (drawerMenu) drawerMenu.classList.remove('open');
                if (drawerOverlay) drawerOverlay.classList.remove('open');
                document.body.classList.remove('drawer-open');
            }

            // Intestazione Cantiere (committente, comune, località, data, N° prova): dati della
            // SINGOLA prova, non preferenze dell'app — vive in una modale a sé, non nel drawer
            // Impostazioni generale, e non esiste alcuna scorciatoia per aprirla da Home (dove non
            // c'è una prova specifica a cui riferirli).
            // L'intestazione è la linguetta «Dati» della scheda della prova (Fase 4).
            function openCantiereInfoModal() { openSurveySettingsModal(state.currentSurveyId, 'dati'); }
            function closeCantiereInfoModal() { closeSurveySettingsModal(); }

            if (btnHamburger) btnHamburger.addEventListener('click', openDrawer);
            // Impostazioni dalla Home (Fase 3: la Home ha la sua testata, «Progetti»).
            const btnImpostazioniHome = document.getElementById('btnImpostazioniHome');
            if (btnImpostazioniHome) btnImpostazioniHome.addEventListener('click', openDrawer);
            // Il titolo della prova («Prova N · progetto») apre l'intestazione della prova, come prima.
            if (btnOpenSurveyDrawer) btnOpenSurveyDrawer.addEventListener('click', () => openCantiereInfoModal());
            if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);
            if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

            // MENU A COMPARSA (Fase 3): ogni bottone con aria-haspopup="menu" apre il .menu-azioni
            // che gli sta accanto (⋯ della testata della prova, «Aggiungi» e ⋯ del Registro). Un
            // tocco fuori o su una voce lo chiude; ne resta aperto uno alla volta. Le voci sono i
            // bottoni di sempre, con i loro id e i loro listener.
            function chiudiMenuAzioni(tranne) {
                document.querySelectorAll('.menu-azioni.open').forEach(m => {
                    if (m === tranne) return;
                    m.classList.remove('open');
                    const b = m.parentElement && m.parentElement.querySelector('[aria-haspopup="menu"]');
                    if (b) b.setAttribute('aria-expanded', 'false');
                });
            }
            document.querySelectorAll('.menu-ancora > [aria-haspopup="menu"]').forEach(bottone => {
                const menu = bottone.parentElement.querySelector('.menu-azioni');
                if (!menu) return;
                bottone.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const apri = !menu.classList.contains('open');
                    chiudiMenuAzioni(menu);
                    menu.classList.toggle('open', apri);
                    bottone.setAttribute('aria-expanded', String(apri));
                });
                menu.addEventListener('click', (e) => {
                    if (e.target.closest('[role="menuitem"]')) chiudiMenuAzioni();
                });
            });
            document.addEventListener('click', (e) => {
                if (!e.target.closest || !e.target.closest('.menu-ancora')) chiudiMenuAzioni();
            });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiMenuAzioni(); });

            // «Annulla ultimo intervallo» dal ⋯ della prova: lo stesso di tenere premuto −1.
            const btnAnnullaUltimoMenu = document.getElementById('btnAnnullaUltimoMenu');
            if (btnAnnullaUltimoMenu) btnAnnullaUltimoMenu.addEventListener('click', () => undoLastStep());
            const btnImpostazioniProvaMenu = document.getElementById('btnImpostazioniProvaMenu');
            if (btnImpostazioniProvaMenu) btnImpostazioniProvaMenu.addEventListener('click', () => openSurveySettingsModal(state.currentSurveyId));

            // Nascondi / mostra il tasto Registra (decisione G): la scelta resta memorizzata. È una
            // preferenza dell'app, non un dato della prova (vedi IMPOSTAZIONI_DELL_APP in 004e).
            function impostaTastoRegistraVisibile(visibile) {
                state.settings.tastoRegistraVisibile = !!visibile;
                updateUI();
                saveState();
            }
            const btnNascondiRegistra = document.getElementById('btnNascondiRegistra');
            if (btnNascondiRegistra) btnNascondiRegistra.addEventListener('click', () => impostaTastoRegistraVisibile(false));
            const btnMostraRegistra = document.getElementById('btnMostraRegistra');
            if (btnMostraRegistra) btnMostraRegistra.addEventListener('click', () => impostaTastoRegistraVisibile(true));
            document.getElementById('chkTastoRegistra').addEventListener('change', (e) => impostaTastoRegistraVisibile(e.target.checked));
            // Libreria nel cassetto (Fase 5): si chiude il cassetto e si apre la finestra di sempre.
            document.getElementById('btnDrawerTemplate').addEventListener('click', () => { closeDrawer(); openReportTemplatesModal(); });
            document.getElementById('btnDrawerArchivio').addEventListener('click', () => { closeDrawer(); openArchiveManager(); });

            const chkIntegratedChart = document.getElementById('chkIntegratedChart');
            if (chkIntegratedChart) {
                chkIntegratedChart.addEventListener('change', (e) => {
                    state.settings.integratedChart = e.target.checked;
                    updateUI();
                    saveState();
                });
            }

            // Pulsanti nei due pannelli (Registro Integrato e Grafico) per alternare la vista.
            // Ognuno vive nel proprio pannello ed è quindi visibile solo quando quel pannello è
            // attivo: un tocco passa direttamente all'altra vista, "spegnendo" quella corrente.
            const btnToggleViewIntegrated = document.getElementById('btnToggleViewIntegrated');
            const btnToggleViewChart = document.getElementById('btnToggleViewChart');

            // Cambio vista animato: le due modalità mostrano GLI STESSI dati, solo presentati
            // diversamente, quindi la transizione è una dissolvenza incrociata (non uno slide,
            // che darebbe l'idea sbagliata di "sto navigando altrove") — vedi CSS .view-swap-*.
            // updateUI() da sola resta invariata (scambio istantaneo, senza animazione): qui
            // animiamo SOLO quando il cambio è innescato volontariamente da questi due tasti,
            // non ad ogni refresh dell'interfaccia durante la prova.
            // Scorrimento della pagina progressivo e lineare (nessuna curva di accelerazione,
            // velocità costante) di una quantità di pixel nota, in un tempo fisso — usato subito
            // sotto per compensare lo spostamento di layout dopo il cambio vista, invece di
            // lasciare che il browser "salti" da solo sulla nuova altezza della pagina.
            function linearScrollBy(deltaY, duration) {
                if (Math.abs(deltaY) < 2) return;
                const startY = window.scrollY;
                const startTime = performance.now();
                function step(now) {
                    const t = Math.min(1, (now - startTime) / duration);
                    window.scrollTo(0, startY + deltaY * t);
                    if (t < 1) requestAnimationFrame(step);
                }
                requestAnimationFrame(step);
            }

            function animateViewSwap(toIntegrated) {
                const cardIntegratedRegister = document.getElementById('cardIntegratedRegister');
                const cardLogsTable = document.getElementById('cardLogsTable');
                const cardChart = document.getElementById('cardChart');
                const uscenti = (toIntegrated ? [cardLogsTable, cardChart] : [cardIntegratedRegister]).filter(Boolean);

                // Ancora visiva: dove si trovava a schermo la card in uscita PRIMA del cambio,
                // per poter poi calcolare di quanto la pagina si è mossa e compensare con uno
                // scroll dolce, invece del salto secco dovuto al ricalcolo istantaneo dell'altezza.
                const ancora = uscenti[0];
                const yPrima = ancora ? ancora.getBoundingClientRect().top : null;

                [btnToggleViewIntegrated, btnToggleViewChart].forEach(b => {
                    if (!b) return;
                    b.classList.add('spin');
                    setTimeout(() => b.classList.remove('spin'), 300);
                });

                uscenti.forEach(el => el.classList.add('view-swap-out'));
                triggerVibrate(25);

                setTimeout(() => {
                    state.settings.integratedChart = toIntegrated;
                    updateUI();
                    saveState();
                    // Pulizia: rimuove la classe di uscita da chi è appena stato nascosto, così
                    // la prossima volta che tocca a loro sparire l'animazione riparte da capo
                    // invece di restare "congelata" sull'ultimo fotogramma di prima.
                    uscenti.forEach(el => el.classList.remove('view-swap-out'));

                    const entranti = (toIntegrated
                        ? [document.getElementById('cardIntegratedRegister')]
                        : [document.getElementById('cardLogsTable'), document.getElementById('cardChart')]
                    ).filter(Boolean);
                    entranti.forEach(el => {
                        el.classList.remove('view-swap-out');
                        el.classList.add('view-swap-in');
                        setTimeout(() => el.classList.remove('view-swap-in'), 250);
                    });

                    // Riallinea la stessa porzione di contenuto alla stessa posizione a schermo
                    // di prima, scorrendo la pagina in modo progressivo invece di ritrovarsi
                    // catapultati direttamente sulla porzione di canvas rimasta.
                    if (yPrima !== null && entranti[0]) {
                        const yDopo = entranti[0].getBoundingClientRect().top;
                        linearScrollBy(yDopo - yPrima, 280);
                    }
                }, 160);
            }

            if (btnToggleViewIntegrated) {
                btnToggleViewIntegrated.addEventListener('click', () => animateViewSwap(false));
            }
            if (btnToggleViewChart) {
                btnToggleViewChart.addEventListener('click', () => animateViewSwap(true));
            }

            const btnAddRowManualIntegrated = document.getElementById('btnAddRowManualIntegrated');
            if (btnAddRowManualIntegrated && btnAddRowManual) {
                btnAddRowManualIntegrated.addEventListener('click', () => {
                    btnAddRowManual.click();
                });
            }

            // MOTORE BACKUP & RIPRISTINO GLOBALE JSON
            const btnExportGlobalJson = document.getElementById('btnExportGlobalJson');
            const btnImportGlobalJson = document.getElementById('btnImportGlobalJson');
            const fileImportJson = document.getElementById('fileImportJson');

            // Async dalla Fase 1: prima esportava `state` così com'era in memoria, cioè senza le foto
            // delle sessioni precedenti (dopo un riavvio i dataUrl stanno solo in IndexedDB) e senza
            // le immagini delle note. Il «backup completo» risultava completo solo a metà. Ora passa
            // dalla stessa reidratazione, e dagli stessi segnaposto, del JSON della prova.
            async function exportGlobalJSONBackup() {
                try {
                    const parts = [];
                    const { clone, mancanti } = await statoConFotoPerExport(parts);
                    const backupData = {
                        version: '1.0',
                        exportedAt: new Date().toISOString(),
                        app: 'DPSH Field Collector',
                        versioneApp: APP_VERSIONE,
                        // La forma dei dati (004b): anche fuori da `state`, così si legge senza aprirlo.
                        versioneSchema: VERSIONE_SCHEMA_DATI,
                        state: clone
                    };
                    const jsonStr = JSON.stringify(backupData, null, 2);
                    scaricaBlobJson(assemblaBlobConSegnaposto(jsonStr, parts), `DPSH_Backup_Archivio_${new Date().toISOString().split('T')[0]}.json`);
                    avvisaFotoMancantiNelBackup(mancanti);
                    return true;
                } catch(e) {
                    alert('Errore durante l\'esportazione del backup JSON: ' + e.message);
                    return false;
                }
            }

            function importGlobalJSONBackup(file) {
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async function(e) {
                    try {
                        const imported = JSON.parse(e.target.result);
                        if (!imported || (!imported.state && !imported.projects)) {
                            alert('Il file selezionato non è un backup valido di DPSH Field Collector!');
                            return;
                        }

                        // Versione dei dati prima di chiedere e prima di scrivere: un file di un'app
                        // più nuova si rifiuta con un messaggio chiaro, uno vecchio si aggiorna (004b).
                        const versioneFile = versioneFileImportato(imported);
                        controllaVersioneFileImportato(versioneFile);
                        const targetState = migraDati(imported.state || imported, versioneFile, predefinitiPerMigrazioni()).dati;
                        if (targetState.projects) targetState.projects = migraProgettiImportati(targetState.projects, VERSIONE_SCHEMA_DATI);
                        // Controllo di integrità su ciò che arriva (004c): si dice alla fine, non blocca.
                        const integrita = verificaIntegrita({ projects: targetState.projects || {} }, { correggi: true });
                        if (await appConfirm('IMPORTAZIONE ARCHIVIO\n\nDesideri unire i progetti importati a quelli esistenti?\n\n- Premendo OK: I nuovi progetti verranno aggiunti all\'archivio senza cancellare i dati attuali.')) {
                            // L'unione sovrascrive i progetti con lo stesso id: prima una copia.
                            copiaPrimaDi('importare un archivio');
                            registraCorrezioni(state, integrita.correzioni, 'import');
                            let sostituiti = 0, fotoAssenti = 0;
                            const promesseFoto = [];
                            // Bug segnalato esplicitamente ("ho aggiunto nuovi strati ma non trovo
                            // più quelli vecchi"): questo "Backup Completo" contiene anche le librerie
                            // (archivio litologico, template), e un tempo l'import le scartava.
                            // Fase 2: entrano tutte con la stessa regola del pacchetto di progetto
                            // (accogliLibrerie, 044a). Le voci identiche si riusano (prima un id già
                            // presente diventava un doppione «(Importato)» anche se identico), quelle
                            // diverse entrano come copia e i progetti del file puntano alla copia; prima
                            // i template non entravano affatto e gli strati restavano legati all'id
                            // vecchio. Niente del dispositivo si sovrascrive. Va fatto PRIMA di mettere
                            // i progetti nell'archivio: accogliLibrerie corregge i loro riferimenti.
                            const librerie = accogliLibrerie({
                                reportTemplates: targetState.reportTemplates, indiceTemplates: targetState.indiceTemplates, lithologyArchive: targetState.lithologyArchive
                            }, targetState.projects || {}, { tutte: true, etichetta: 'da backup' });
                            if (targetState.projects) {
                                if (!state.projects) state.projects = {};
                                const idsSostituiti = Object.keys(targetState.projects).filter(id => state.projects[id]);
                                sostituiti = idsSostituiti.length;
                                // Le foto e le immagini delle note del file vanno in IndexedDB, come negli
                                // altri import: prima restavano solo in memoria e sparivano al riavvio.
                                Object.values(targetState.projects).forEach(p => { fotoAssenti += salvaImmaginiImportate(p, promesseFoto).assenti; });
                                Object.assign(state.projects, targetState.projects);
                                // Un progetto arrivato dal file porta la sua data di modifica: metterlo al
                                // posto di quello di qui non è una modifica fatta qui (vedi 004e).
                                Object.keys(targetState.projects).forEach(accettaContenutoProgetto);
                                // Se il progetto aperto è stato sostituito, lo stato attivo va ricaricato:
                                // il primo salvataggio rimetterebbe dentro la prova di prima.
                                riallineaProgettoAperto(idsSostituiti);
                            }
                            const archImportMsg = testoLibrerieAccolte(librerie);
                            saveState();
                            controllaFotoImportate(promesseFoto);
                            updateUI();
                            if (state.uiState && state.uiState.currentView === 'home') switchView('home');
                            // L'unione SOSTITUISCE i progetti con lo stesso id: va detto, non solo fatto.
                            const sostituitiMsg = sostituiti > 0
                                ? `\n\n${sostituiti === 1 ? '1 progetto aveva' : sostituiti + ' progetti avevano'} lo stesso id di uno già presente ed è stato sostituito da quello del file. La versione di prima è nella Cronologia (copie automatiche).`
                                : '';
                            // Senza niente da aggiungere è una conferma: toast. Con sostituzioni, foto
                            // assenti, anomalie o librerie accolte resta un dialogo da leggere.
                            toastODialogo('Archivio importato con successo', archImportMsg + sostituitiMsg + testoFotoAssentiNelFile(fotoAssenti) + testoAnomalieImportate(integrita.anomalie));
                            triggerVibrate([50, 50, 50]);
                        }
                    } catch(err) {
                        alert('Impossibile leggere il file JSON: ' + err.message);
                    }
                };
                reader.readAsText(file);
            }

            // Come importGlobalJSONBackup, ma per i backup ZIP (foto come file binari originali):
            // riusa importProjectsFromZip, che a sua volta si appoggia a importProjectsFromJSON
            // per il merge/rinomina/ripristino IndexedDB, cosi il comportamento resta identico.
            async function importGlobalZipBackup(file) {
                if (!file) return;
                try {
                    if (!await appConfirm('IMPORTAZIONE ARCHIVIO (ZIP)\n\nDesideri unire i progetti importati a quelli esistenti?\n\n- Premendo OK: I nuovi progetti verranno aggiunti all\'archivio senza cancellare i dati attuali.')) {
                        return;
                    }
                    copiaPrimaDi('importare un archivio');
                    const { importedCount, renamedCount, fotoAssenti, anomalie } = await importProjectsFromZip(file);
                    updateUI();
                    if (state.uiState && state.uiState.currentView === 'home' && typeof switchView === 'function') switchView('home');
                    let extra = '';
                    if (renamedCount > 0) {
                        extra += `${renamedCount} progett${renamedCount === 1 ? 'o aveva' : 'i avevano'} lo stesso ID di uno già in archivio: ${renamedCount === 1 ? 'è stato salvato' : 'sono stati salvati'} come copia separata.`;
                    }
                    extra += testoFotoAssentiNelFile(fotoAssenti) + testoAnomalieImportate(anomalie);
                    toastODialogo(`Archivio importato: ${importedCount} progett${importedCount === 1 ? 'o' : 'i'}`, extra);
                    triggerVibrate([50, 50, 50]);
                } catch (err) {
                    console.error('Import ZIP error:', err);
                    alert('Impossibile leggere il file ZIP:\n\n' + err.message);
                }
            }

            if (btnExportGlobalJson) {
                btnExportGlobalJson.addEventListener('click', () => {
                    if (typeof openBackupChoiceModal === 'function') openBackupChoiceModal({ type: 'global' });
                });
            }
            if (btnImportGlobalJson && fileImportJson) {
                btnImportGlobalJson.addEventListener('click', () => fileImportJson.click());
                fileImportJson.addEventListener('change', (e) => {
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    const isZip = /\.zip$/i.test(f.name) || f.type === 'application/zip';
                    if (isZip) {
                        importGlobalZipBackup(f).finally(() => { fileImportJson.value = ''; });
                    } else {
                        importGlobalJSONBackup(f);
                        fileImportJson.value = '';
                    }
                });
            }

            if (selPenetrometer) selPenetrometer.addEventListener('change', (e) => { state.settings.penetrometer = e.target.value; updateUI(); saveState(); });
            if (selStepCm) selStepCm.addEventListener('change', (e) => { 
                state.settings.stepCm = parseInt(e.target.value); 
                recalculateDepths();
                updateUI(); 
                saveState(); 
            });
            // SELETTORE PALETTE COLORE (7 varianti) — vive solo nelle
            // Impostazioni, mai nelle pagine principali. Il tema chiaro/scuro resta un asse
            // indipendente: sceglie luminosità, questo sceglie la tonalità.
            const THEME_HUES = [
                { id: 'antracite', label: 'Antracite', swatch: '#11bec3' },
                { id: 'arenaria', label: 'Arenaria', swatch: '#caae7a' },
                { id: 'ardesia', label: 'Ardesia', swatch: '#6883a7' },
                { id: 'rame', label: 'Rame', swatch: '#c67859' },
                { id: 'giada', label: 'Giada', swatch: '#6cab90' },
                { id: 'ametista', label: 'Ametista', swatch: '#a272cb' },
                { id: 'granito', label: 'Granito', swatch: '#be8a8b' },
                { id: 'ambra', label: 'Ambra', swatch: '#f59e0b' },
            ];
            function renderThemeHuePicker() {
                const box = document.getElementById('themeHuePicker');
                if (!box) return;
                const current = state.settings.themeHue || 'antracite';
                box.innerHTML = THEME_HUES.map(h => `
                    <button type="button" class="pbtn theme-hue-opt" data-hue-id="${h.id}" title="${h.label}"
                        style="display:flex; flex-direction:column; align-items:center; gap:4px; padding:6px 4px 5px; border-radius:var(--radius-sm); background:${h.id === current ? 'var(--bg-card-hover)' : 'transparent'}; border:1.5px solid ${h.id === current ? 'var(--accent)' : 'var(--border)'}; min-width:56px;">
                        <span style="width:22px; height:22px; border-radius:50%; background:${h.swatch}; border:2px solid var(--bg-card); box-shadow:0 0 0 1px var(--border);"></span>
                        <span style="font-size:10px; font-weight:700; color:${h.id === current ? 'var(--text-main)' : 'var(--text-muted)'};">${h.label}</span>
                    </button>
                `).join('');
                box.querySelectorAll('.theme-hue-opt').forEach(btn => {
                    btn.addEventListener('click', () => {
                        state.settings.themeHue = btn.getAttribute('data-hue-id');
                        updateUI();
                        saveState();
                        triggerVibrate(20);
                    });
                });
            }

            if (chkHaptic) chkHaptic.addEventListener('change', (e) => { state.settings.haptic = e.target.checked; saveState(); });
            if (chkAudio) chkAudio.addEventListener('change', (e) => { state.settings.audio = e.target.checked; saveState(); });
            if (chkWakeLock) chkWakeLock.addEventListener('change', (e) => { 
                state.settings.wakeLock = e.target.checked; 
                if (state.settings.wakeLock) requestWakeLock();
                saveState(); 
            });
            if (chkDarkMode) chkDarkMode.addEventListener('change', (e) => { state.settings.darkMode = e.target.checked; updateUI(); saveState(); });

            // (La «Modalità Espansa» non c'è più: il tasto Registra è visibile di default e si
            // nasconde dal contatore; «Annulla ultimo» sta nel ⋯ della prova e nel toast. Fase 3.)

            if (btnClearHistory) btnClearHistory.addEventListener('click', async () => {
                // La parola di conferma da digitare resta (è la protezione contro il tocco
                // accidentale su un'azione irreversibile), ma ora la si scrive nel dialogo
                // dell'app: se il prompt() nativo viene soppresso dal browser in modalità
                // standalone, il reset diventerebbe altrimenti impossibile da eseguire.
                const answer = await appPrompt(
                    'Questa azione cancellerà definitivamente TUTTE le prove, le impostazioni e le copie automatiche salvate su questo dispositivo.',
                    '',
                    { title: 'Reset dati locali', label: 'Per confermare, digita CANCELLA (in maiuscolo)', placeholder: 'CANCELLA', okLabel: 'Cancella tutto' }
                );
                if (answer === null) return; // annullato: nessun messaggio, nessuna azione
                if (answer.trim().toUpperCase() === 'CANCELLA') {
                    // Anche le IMMAGINI, non solo i dati: prima questa funzione svuotava solo
                    // localStorage e lasciava foto e immagini delle note in IndexedDB. Il risultato
                    // era che l'azione più drastica offerta dall'app non liberava quasi nulla —
                    // proprio quando la si usa per fare spazio. Si attende lo svuotamento prima di
                    // ricaricare, altrimenti il reload interromperebbe la transazione a metà.
                    await svuotaDatabaseImmagini();
                    // Anche le copie automatiche: un reset che le lasciasse non sarebbe un reset.
                    await new Promise(resolve => {
                        try {
                            const richiesta = indexedDB.deleteDatabase(COPIE_DB_NAME);
                            richiesta.onsuccess = richiesta.onerror = richiesta.onblocked = () => resolve();
                        } catch (e) { resolve(); }
                    });
                    Object.keys(photoMemoryCache).forEach(k => delete photoMemoryCache[k]);
                    localStorage.removeItem('dpsh_app_state');
                    location.reload();
                } else {
                    appAlert('Frase di conferma non corretta. Operazione di reset annullata.');
                }
            });

            if (btnExportKmlSingle) {
                btnExportKmlSingle.addEventListener('click', exportSingleSurveyKML);
            }

            // EXPORT EXCEL GENERATOR PROFESSIONALE CON GRAFICO E FORMATTAZIONE (.xlsx)
            if (btnExportExcel) btnExportExcel.addEventListener('click', () => {
                if (state.logs.length === 0) {
                    alert('Nessun dato da esportare!');
                    return;
                }

                const M = parseFloat(state.instrument.pesoMassa || 63.50);
                const H = parseFloat(state.instrument.volata || 0.75) * 100;
                const A = parseFloat(state.instrument.areaPunta || 20);
                const deltaS = parseFloat(state.settings.stepCm || 20);
                const pesoAsta = parseFloat(state.instrument.pesoAsta || 6.30);
                const pesoSistema = parseFloat(state.instrument.pesoSistema || 8.00);
                const maxColpiInLogs = Math.max(...state.logs.map(l => l.colpi), 1);

                // --- FOGLIO 1: REGISTRO E PROFILO COLPI ---
                const reportData = [
                    ["REPORT PROVA PENETROMETRICA DINAMICA (DPSH)", "", "", "", "", "", ""],
                    ["DPSH FIELD - REGISTRO CAMPO E PROFILO COLPI", "", "", "", "", "", ""],
                    [""],
                    ["1. DATI CANTIERE & INDAGINE", "", "", "2. STRUMENTO & GEOMETRIA", "", "", ""],
                    ["Committente / Cliente:", state.header.committente || 'Non specificato', "", "Penetrometro:", state.settings.penetrometer || 'DPSH (63.5kg)', "", ""],
                    ["Comune:", state.header.comune || 'Non specificato', "", "Massa Battente (M):", `${M} kg`, "", ""],
                    ["Località / Indirizzo:", state.header.localita || 'Non specificata', "", "Altezza Caduta (H):", `${state.instrument.volata || 0.75} m`, "", ""],
                    ["Data Esecuzione:", state.header.date || new Date().toISOString().split('T')[0], "", "Passo Avanzamento (Δs):", `${deltaS} cm`, "", ""],
                    ["Prova N°:", state.header.provaNr || '1', "", "Area Punta (A):", `${A} cm²`, "", ""],
                    ["Coordinate GPS:", state.header.lat ? `${state.header.lat.toFixed(5)}°, ${state.header.lng.toFixed(5)}°` : 'Non acquisite', "", "Angolo Punta (α):", `${state.instrument.angoloPunta || 90}°`, "", ""],
                    ["Quota Falda:", state.header.faldaDa ? `Da ${state.header.faldaDa}m a ${state.header.faldaA}m` : 'Non riscontrata', "", "Peso Asta / Sistema:", `${pesoAsta} kg / ${pesoSistema} kg`, "", ""],
                    [""],
                    ["3. REGISTRO MISURAZIONI E PROFILO COLPI", "", "", "", "", "", ""],
                    ["Da (m)", "A (m)", `Colpi N${deltaS}`, "N° Asta", "Rpd (kg/cm²)", "Profilo Grafico (N)", "Note / Eventi"]
                ];

                let totalBlows = 0;

                state.logs.forEach(log => {
                    totalBlows += log.colpi;
                    const M_prime = (log.asta * pesoAsta) + pesoSistema;
                    let rpdVal = "-";
                    if (log.colpi > 0) {
                        const rpd = (M * M * H * log.colpi) / (A * deltaS * (M + M_prime));
                        rpdVal = parseFloat(rpd.toFixed(2));
                    }

                    // Bar visiva per il profilo colpi in Excel (es. ███████ 14)
                    const barLen = Math.min(25, Math.max(1, Math.round((log.colpi / maxColpiInLogs) * 22)));
                    const visualBar = '█'.repeat(barLen) + ` (${log.colpi})`;

                    reportData.push([
                        parseFloat(log.start.toFixed(2)),
                        parseFloat(log.end.toFixed(2)),
                        log.colpi,
                        log.asta,
                        rpdVal,
                        visualBar,
                        log.note || ''
                    ]);
                });

                reportData.push([""]);
                reportData.push(["4. SINTESI ED INDICI PROVA", "", "", "", "", "", ""]);
                reportData.push(["Profondità Max Raggiunta:", `${state.currentDepthStart.toFixed(2)} m`, "", "", "", "", ""]);
                reportData.push(["Totale Colpi Cumulati:", totalBlows, "", "", "", "", ""]);
                reportData.push(["Media Colpi al Metro:", (state.currentDepthStart > 0 ? (totalBlows / state.currentDepthStart).toFixed(1) : 0), "", "", "", "", ""]);

                // --- FOGLIO 2: DIAGRAMMA GRAFICO PROFILO PENETROMETRICO ---
                const chartSheetData = [
                    ["DIAGRAMMA PROFILO PENETROMETRICO DINAMICO"],
                    [`Prova N° ${state.header.provaNr || '1'} - ${state.header.comune || 'Cantiere'}`],
                    [""],
                    ["Profondità (m)", `Resistenza Colpi N${deltaS}`, "Grafico Profilo"]
                ];

                state.logs.forEach(log => {
                    const barLen = Math.min(40, Math.max(1, Math.round((log.colpi / maxColpiInLogs) * 35)));
                    const chartBar = '▓'.repeat(barLen) + ` N=${log.colpi}`;
                    chartSheetData.push([
                        `${log.start.toFixed(2)}m - ${log.end.toFixed(2)}m`,
                        log.colpi,
                        chartBar
                    ]);
                });

                if (typeof XLSX !== 'undefined') {
                    const wb = XLSX.utils.book_new();
                    
                    // Sheet 1: Registro Principale
                    const ws1 = XLSX.utils.aoa_to_sheet(reportData);
                    ws1['!cols'] = [
                        { wch: 14 }, // Da (m)
                        { wch: 14 }, // A (m)
                        { wch: 12 }, // Colpi N
                        { wch: 10 }, // N° Asta
                        { wch: 15 }, // Rpd
                        { wch: 32 }, // Profilo Grafico
                        { wch: 25 }  // Note
                    ];
                    XLSX.utils.book_append_sheet(wb, ws1, "Registro_DPSH");

                    // Sheet 2: Diagramma Profilo
                    const ws2 = XLSX.utils.aoa_to_sheet(chartSheetData);
                    ws2['!cols'] = [
                        { wch: 18 },
                        { wch: 18 },
                        { wch: 50 }
                    ];
                    XLSX.utils.book_append_sheet(wb, ws2, "Diagramma_Profilo");
                    
                    const fileName = `DPSH_Prova_${state.header.provaNr || '1'}_${state.header.comune || 'Cantiere'}.xlsx`;
                    XLSX.writeFile(wb, fileName);
                } else {
                    exportCsvFallback();
                }
            });

            // EXPORT CSV GENERATOR
            function exportCsvFallback() {
                let csvContent = "data:text/csv;charset=utf-8,";
                csvContent += `PROVA PENETROMETRICA DPSH - PROVA N. ${state.header.provaNr}\n`;
                csvContent += `Committente:,${state.header.committente || ''}\n`;
                csvContent += `Comune:,${state.header.comune || ''}\n`;
                csvContent += `Localita:,${state.header.localita || ''}\n`;
                csvContent += `Data:,${state.header.date}\n`;
                csvContent += `GPS:,${state.header.lat || ''} ${state.header.lng || ''}\n`;
                csvContent += `Falda_m:,${state.header.faldaDa || ''} - ${state.header.faldaA || ''}\n\n`;
                csvContent += `Profondita_Da_m,Profondita_A_m,Colpi_N${state.settings.stepCm},Asta,Rpd_kg_cm2,Note\n`;

                const M = parseFloat(state.instrument.pesoMassa || 63.50);
                const H = parseFloat(state.instrument.volata || 0.75) * 100;
                const A = parseFloat(state.instrument.areaPunta || 20);
                const deltaS = parseFloat(state.settings.stepCm || 20);
                const pesoAsta = parseFloat(state.instrument.pesoAsta || 6.30);
                const pesoSistema = parseFloat(state.instrument.pesoSistema || 8.00);

                state.logs.forEach(log => {
                    const M_prime = (log.asta * pesoAsta) + pesoSistema;
                    let rpdVal = "-";
                    if (log.colpi > 0) {
                        rpdVal = ((M * M * H * log.colpi) / (A * deltaS * (M + M_prime))).toFixed(2);
                    }
                    csvContent += `${log.start.toFixed(2)},${log.end.toFixed(2)},${log.colpi},${log.asta},${rpdVal},"${log.note}"\n`;
                });

                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `DPSH_Prova_${state.header.provaNr || '1'}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }


            // Inizializzazione
            loadState();
            requestWakeLock();

            // Schermata iniziale SEMPRE la Home View.
            // NOTA UX: in passato qui veniva aperta automaticamente la finestra "Nuova Prova —
            // Intestazione Cantiere". Con il sistema a Progetti quella logica è obsoleta e
            // confondeva l'utente (chiedeva i dati di una prova prima ancora che esistesse un
            // progetto in cui inserirla). Ora la Home mostra semplicemente il proprio stato vuoto
            // con la call-to-action corretta: creare o importare un Progetto Cantiere.
            switchView('home');

        })();
