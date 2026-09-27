            // ===== IMPORTAZIONE COORDINATE DA FILE KML / GPX =====
            // Estrae il primo punto utile da un file KML (<Placemark><Point>) o GPX (<wpt>, o in
            // mancanza il primo punto della traccia <trkpt>). Se il file contiene più punti, li
            // mostra in un elenco cliccabile invece di sceglierne uno arbitrariamente.
            function parseGeoFileText(text) {
                const parser = new DOMParser();
                const xml = parser.parseFromString(text, 'application/xml');
                if (xml.querySelector('parsererror')) {
                    throw new Error('Il file non è un XML valido (KML/GPX corrotto o in un formato diverso).');
                }

                const points = [];

                // KML: <Placemark><name>...</name><Point><coordinates>lon,lat[,alt]</coordinates></Point></Placemark>
                xml.querySelectorAll('Placemark').forEach(pm => {
                    const coordEl = pm.querySelector('Point > coordinates');
                    if (!coordEl || !coordEl.textContent) return;
                    const parts = coordEl.textContent.trim().split(',');
                    const lng = parseFloat(parts[0]);
                    const lat = parseFloat(parts[1]);
                    if (isNaN(lat) || isNaN(lng)) return;
                    const nameEl = pm.querySelector('name');
                    points.push({ name: (nameEl && nameEl.textContent.trim()) || `Punto ${points.length + 1}`, lat, lng });
                });

                // GPX: waypoint singoli, il caso tipico per "un punto salvato"
                if (points.length === 0) {
                    xml.querySelectorAll('wpt').forEach(pt => {
                        const lat = parseFloat(pt.getAttribute('lat'));
                        const lng = parseFloat(pt.getAttribute('lon'));
                        if (isNaN(lat) || isNaN(lng)) return;
                        const nameEl = pt.querySelector('name');
                        points.push({ name: (nameEl && nameEl.textContent.trim()) || `Punto ${points.length + 1}`, lat, lng });
                    });
                }

                // GPX: nessun waypoint, ma il file contiene una traccia registrata (<trkpt>/<rtept>).
                // Non ha senso proporre centinaia di punti: si usa solo il primo, come riferimento
                // del punto di partenza della traccia.
                if (points.length === 0) {
                    const firstTrkpt = xml.querySelector('trkpt, rtept');
                    if (firstTrkpt) {
                        const lat = parseFloat(firstTrkpt.getAttribute('lat'));
                        const lng = parseFloat(firstTrkpt.getAttribute('lon'));
                        if (!isNaN(lat) && !isNaN(lng)) points.push({ name: 'Inizio traccia GPX', lat, lng });
                    }
                }

                return points;
            }

            function applyGpsCoordsToModal(lat, lng, sourceLabel) {
                if (numModalGpsLat) numModalGpsLat.value = lat;
                if (numModalGpsLng) numModalGpsLng.value = lng;
                triggerVibrate([40, 40]);
                if (lblModalGpsStatus) {
                    lblModalGpsStatus.innerHTML = `${ico('check')} ${sourceLabel}: ${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)} — premi "Salva Coordinate" per confermare`;
                    lblModalGpsStatus.style.color = 'var(--success)';
                }
                if (gpsModalMapInstance && gpsModalMapMarker) {
                    gpsModalMapInstance.setView([lat, lng], 16);
                    gpsModalMapMarker.setLatLng([lat, lng]);
                }
            }

            const btnImportGpsKml = document.getElementById('btnImportGpsKml');
            const fileImportGpsKml = document.getElementById('fileImportGpsKml');
            const gpsKmlImportResults = document.getElementById('gpsKmlImportResults');

            if (btnImportGpsKml && fileImportGpsKml) {
                btnImportGpsKml.addEventListener('click', () => {
                    fileImportGpsKml.value = '';
                    fileImportGpsKml.click();
                });
                fileImportGpsKml.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (gpsKmlImportResults) { gpsKmlImportResults.style.display = 'none'; gpsKmlImportResults.innerHTML = ''; }
                    try {
                        const text = await file.text();
                        const points = parseGeoFileText(text);
                        if (points.length === 0) {
                            appAlert('Nessuna coordinata trovata in questo file. Sono supportati KML (Placemark/Point) e GPX (waypoint o traccia). I file KMZ (compressi) vanno prima estratti in KML.');
                            return;
                        }
                        if (points.length === 1) {
                            applyGpsCoordsToModal(points[0].lat, points[0].lng, `Importato da ${file.name}`);
                            return;
                        }
                        // Più punti trovati: elenco cliccabile, nessuna scelta arbitraria
                        if (gpsKmlImportResults) {
                            gpsKmlImportResults.style.display = 'block';
                            gpsKmlImportResults.innerHTML = points.slice(0, 50).map((p, i) => `
                                <div class="gps-kml-point-row" data-idx="${i}" style="padding:8px 10px; font-size:11.5px; color:var(--text-main); border-bottom:1px solid var(--border); cursor:pointer;">
                                    <strong>${p.name}</strong><br>
                                    <span style="color:var(--text-muted); font-size:10.5px;">${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}</span>
                                </div>
                            `).join('');
                            gpsKmlImportResults.querySelectorAll('.gps-kml-point-row').forEach(row => {
                                row.addEventListener('click', () => {
                                    const p = points[parseInt(row.dataset.idx)];
                                    applyGpsCoordsToModal(p.lat, p.lng, `Importato da ${file.name}`);
                                    gpsKmlImportResults.style.display = 'none';
                                });
                            });
                        }
                    } catch (err) {
                        appAlert('⚠️ Errore durante la lettura del file: ' + err.message);
                    } finally {
                        fileImportGpsKml.value = '';
                    }
                });
            }

            if (btnSaveGpsModal) {
                btnSaveGpsModal.addEventListener('click', () => {
                    const latVal = numModalGpsLat ? parseFloat(numModalGpsLat.value) : NaN;
                    const lngVal = numModalGpsLng ? parseFloat(numModalGpsLng.value) : NaN;
                    
                    if (!isNaN(latVal) && !isNaN(lngVal)) {
                        state.header.lat = latVal;
                        state.header.lng = lngVal;
                    } else if (!numModalGpsLat.value && !numModalGpsLng.value) {
                        state.header.lat = null;
                        state.header.lng = null;
                    }
                    saveState();
                    updateUI();
                    triggerVibrate([40, 40]);
                    closeGpsModal();
                });
            }

            if (btnClearGpsModal) {
                btnClearGpsModal.addEventListener('click', () => {
                    state.header.lat = null;
                    state.header.lng = null;
                    state.header.alt = null;
                    if (numModalGpsLat) numModalGpsLat.value = '';
                    if (numModalGpsLng) numModalGpsLng.value = '';
                    saveState();
                    updateUI();
                    updateModalGpsStatusText();
                    triggerVibrate([60, 60]);
                });
            }

            if (btnCloseGpsModalX) btnCloseGpsModalX.addEventListener('click', closeGpsModal);
            if (modalGpsOverlay) modalGpsOverlay.addEventListener('click', closeGpsModal);

            // GESTIONE VISTE (HOME VIEW & FIELD VIEW)
            const viewHome = document.getElementById('viewHome');
            const viewField = document.getElementById('viewField');
            // Resta false fino al termine del primissimo switchView (quello d'avvio app): lì non
            // c'è "una schermata precedente" da cui arrivare, quindi animare sarebbe fuori luogo.
            let viewTransitionsEnabled = false;
            const btnHomeView = document.getElementById('btnHomeView');
            const btnHomeNewProject = document.getElementById('btnHomeNewProject');
            const btnHomeImportProject = document.getElementById('btnHomeImportProject');
            const fileImportProjectJson = document.getElementById('fileImportProjectJson');
            const homeProjectsContainer = document.getElementById('homeProjectsContainer');
            const surveySwitcherBar = document.getElementById('surveySwitcherBar');

            /** «N progetti · N prove» sotto il titolo della Home, al singolare quando serve. Le
             * interpretazioni (3B) non contano come prove in più (proveFisiche). */
            function aggiornaConteggiHome() {
                const el = document.getElementById('lblHomeConteggi');
                if (!el) return;
                const progetti = Object.values(state.projects || {});
                const prove = progetti.reduce((n, p) => n + proveFisiche(Object.values((p && p.surveys) || {})).length, 0);
                el.textContent = `${progetti.length} ${progetti.length === 1 ? 'progetto' : 'progetti'} · ${prove} ${prove === 1 ? 'prova' : 'prove'}`;
            }

            function switchView(viewName) {
                // 'processing' non esiste più come vista/drawer a sé: i Parametri Avanzati sono
                // ora fusi dentro le card di Gestione dei dati litologici (vedi renderStratiList).
                if (viewName === 'processing') viewName = 'field';
                if (!state.uiState) state.uiState = { currentView: 'home' };
                const vistaPrecedente = state.uiState.currentView;
                const cambioVistaReale = vistaPrecedente !== viewName;
                state.uiState.currentView = viewName;
                const btnExpHeader = document.getElementById('btnExportHeader');

                // Fase 3: la Home ha la sua testata («Progetti», dentro #viewHome) e la testata della
                // prova esiste solo in Vista Prova. Niente più bottoni da accendere e spegnere uno a uno.
                const testataProva = document.getElementById('testataProva');
                if (viewName === 'home') {
                    if (viewHome) viewHome.style.display = 'flex';
                    if (viewField) viewField.style.display = 'none';
                    if (testataProva) testataProva.style.display = 'none';
                    if (surveySwitcherBar) surveySwitcherBar.style.display = 'none';
                    stopLiveGpsWatch();
                    aggiornaConteggiHome();
                    renderHomeProjects();
                } else {
                    if (viewHome) viewHome.style.display = 'none';
                    if (viewField) viewField.style.display = 'flex';
                    if (testataProva) testataProva.style.display = '';
                    // Entrando in una prova dalla Home si parte dal contatore (Fase 6).
                    if (vistaPrecedente === 'home') vistaProva = 'conta';
                    if (surveySwitcherBar) surveySwitcherBar.style.display = 'flex';
                    startLiveGpsWatch();
                    updateUI();
                }

                // Animazione d'ingresso della schermata appena mostrata, solo quando si è davvero
                // cambiata vista (non su chiamate ridondanti a switchView con lo stesso nome) e non
                // al primo giro (avvio app: non c'è una schermata precedente da cui "arrivare").
                if (cambioVistaReale && viewTransitionsEnabled) {
                    const vistaEntrante = viewName === 'home' ? viewHome : viewField;
                    if (vistaEntrante) {
                        vistaEntrante.classList.remove('screen-nav-enter');
                        void vistaEntrante.offsetWidth; // forza il reflow per poter ri-innescare l'animazione
                        vistaEntrante.classList.add('screen-nav-enter');
                        vistaEntrante.addEventListener('animationend', function rimuoviClasseNavEnter() {
                            vistaEntrante.classList.remove('screen-nav-enter');
                            vistaEntrante.removeEventListener('animationend', rimuoviClasseNavEnter);
                        });
                    }
                }
                viewTransitionsEnabled = true;

                saveState();
            }

            // PUNTO DI EXPORT UNICO: da Vista Prova ed Elaborazione, apre sempre la stessa modale
            // completa (Excel, PDF, Report Completo, KML, Foto, JSON) già usata da Home, invece di
            // essere raggiungibile solo da lì. Le barre di export dirette restano come scorciatoie
            // rapide per i formati più usati sul campo.
            const btnExportHeader = document.getElementById('btnExportHeader');
            if (btnExportHeader) {
                btnExportHeader.addEventListener('click', () => {
                    if (typeof openExportModal === 'function') openExportModal('survey', state.currentSurveyId);
                });
            }

            if (btnHomeView) {
                btnHomeView.addEventListener('click', () => {
                    switchView('home');
                });
            }

            if (btnHomeNewProject) {
                btnHomeNewProject.addEventListener('click', () => {
                    openNewProjectModal();
                });
            }

            if (btnHomeImportProject && fileImportProjectJson) {
                btnHomeImportProject.addEventListener('click', () => {
                    fileImportProjectJson.value = '';
                    fileImportProjectJson.click();
                });
                fileImportProjectJson.addEventListener('change', (e) => {
                    handleImportJsonFile(e.target.files[0]);
                });
            }

            // RENDERING DELLA BARRA DI NAVIGAZIONE PROVE (TABS IN HEADER)
