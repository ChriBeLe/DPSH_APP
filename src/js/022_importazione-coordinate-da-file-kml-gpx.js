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
                        appAlert('Errore durante la lettura del file: ' + err.message);
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

            // ---- SPOSTA LA PROVA. Con le coordinate già impostate si sposta il pin sulla mappa e si
            // conferma due volte. Solo così la posizione di prima (GPS o a mano) resta in memoria in
            // header.spostamento = { da: {lat, lng, alt, acc}, a: {lat, lng}, il }: vale finché la prova
            // sta ancora in «a»; se poi la posizione cambia in un altro modo, la memoria non conta più.
            // Spostata due volte, «da» resta la posizione di partenza (non quella intermedia).
            const btnSpostaProva = document.getElementById('btnSpostaProva');
            const btnRipristinaPosizione = document.getElementById('btnRipristinaPosizione');
            const numeroGps = v => (v === null || v === undefined || v === '' ? NaN : Number(v));
            function spostamentoProva(h) {
                const sp = h && h.spostamento;
                if (!sp || !sp.da || !sp.a) return null;
                return Math.abs(numeroGps(h.lat) - sp.a.lat) < 1e-9 && Math.abs(numeroGps(h.lng) - sp.a.lng) < 1e-9 ? sp : null;
            }
            const metriTra = (p, q) => {
                const k = Math.PI / 180, x = (q.lng - p.lng) * k * Math.cos((p.lat + q.lat) / 2 * k), y = (q.lat - p.lat) * k;
                return Math.round(Math.hypot(x, y) * 6371000);
            };
            const coppiaGps = p => `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;
            function aggiornaSpostaProva() {
                const box = document.getElementById('boxSpostaProva'), lbl = document.getElementById('lblProvaSpostata');
                if (!box) return;
                const h = state.header || {}, sp = spostamentoProva(h);
                box.style.display = Number.isFinite(numeroGps(h.lat)) && Number.isFinite(numeroGps(h.lng)) ? 'block' : 'none';
                lbl.style.display = sp ? 'block' : 'none';
                btnRipristinaPosizione.style.display = sp ? '' : 'none';
                if (sp) lbl.innerHTML = `<strong>Prova spostata a mano</strong> il ${new Date(sp.il).toLocaleDateString('it-IT')} di ${metriTra(sp.da, sp.a)} m.<br>` +
                    `Posizione di prima, in memoria: ${coppiaGps(sp.da)}`;
            }
            function aggiornaModoSposta() {
                const nota = document.getElementById('notaSpostaProva');
                if (nota) nota.style.display = spostandoProva ? 'block' : 'none';
                if (btnUseGpsMapPin) btnUseGpsMapPin.innerHTML = spostandoProva ? `${ico('pin')} Sposta qui la prova…` : `${ico('check')} Usa la Posizione del Pin`;
                aggiornaTracciaSpostamento();
            }
            /** Sulla mappa: un cerchio tratteggiato da dove parte (spostando: dov'è adesso; dopo: la
             * posizione di prima in memoria) e una linea fino al pin. */
            function aggiornaTracciaSpostamento() {
                if (!gpsModalMapInstance || !gpsModalMapMarker || typeof L === 'undefined') return;
                if (gpsModalMapTracciaSpostamento) gpsModalMapTracciaSpostamento.remove();
                gpsModalMapTracciaSpostamento = null;
                const h = state.header || {}, sp = spostamentoProva(h);
                const da = spostandoProva ? { lat: numeroGps(h.lat), lng: numeroGps(h.lng) } : sp && sp.da;
                if (!da || !Number.isFinite(da.lat) || !Number.isFinite(da.lng)) return;
                const stile = { color: '#eab308', weight: 2, dashArray: '5 5', interactive: false };
                gpsModalMapTracciaSpostamento = L.layerGroup([
                    L.circleMarker([da.lat, da.lng], { ...stile, radius: 9, fillOpacity: 0.15 }),
                    L.polyline([[da.lat, da.lng], gpsModalMapMarker.getLatLng()], stile)
                ]).addTo(gpsModalMapInstance);
            }
            if (btnSpostaProva) btnSpostaProva.addEventListener('click', () => {
                openGpsAccordion('Manual');
                spostandoProva = true;
                aggiornaModoSposta();
            });
            /** Il pin confermato due volte: la prova va lì, la posizione di prima resta in memoria. */
            async function confermaSpostamentoProva(ll) {
                const h = state.header, ora = { lat: numeroGps(h.lat), lng: numeroGps(h.lng) }, dove = { lat: ll.lat, lng: ll.lng };
                const nr = h.provaNr || '1', m = metriTra(ora, dove);
                if (m === 0) { appAlert('Il pin è ancora dove sta la prova: trascinalo nel punto nuovo.'); return; }
                if (!await appConfirm(`Spostare la Prova N° ${nr}?\n\nDa: ${coppiaGps(ora)}\nA: ${coppiaGps(dove)}\nDistanza: ${m} m`)) return;
                if (!await appDialog(`Sei sicuro di spostare la Prova N° ${nr} di ${m} m, lì?\n\nLa posizione di prima resta in memoria: la vedi nella finestra GPS e puoi tornarci.`,
                    { confirm: true, danger: true, title: 'Seconda conferma', okLabel: 'Sì, spostala' })) return;
                const sp = spostamentoProva(h);
                h.spostamento = { da: sp ? sp.da : { ...ora, alt: h.alt ?? null, acc: h.acc ?? null }, a: dove, il: new Date().toISOString() };
                h.lat = dove.lat; h.lng = dove.lng;
                h.alt = null; h.acc = null;      // quota e precisione del GPS erano del punto di prima
                if (numModalGpsLat) numModalGpsLat.value = dove.lat;
                if (numModalGpsLng) numModalGpsLng.value = dove.lng;
                spostandoProva = false;
                aggiornaModoSposta();
                updateModalGpsStatusText();
                updateUI();
                saveState();
                triggerVibrate([40, 40, 40]);
                mostraToast(`Prova N° ${nr} spostata di ${m} m. La posizione di prima resta in memoria.`);
            }
            if (btnRipristinaPosizione) btnRipristinaPosizione.addEventListener('click', async () => {
                const h = state.header, sp = spostamentoProva(h);
                if (!sp) return;
                if (!await appConfirm(`Riportare la Prova N° ${h.provaNr || '1'} alla posizione di prima?\n\n${coppiaGps(sp.da)}`)) return;
                h.lat = sp.da.lat; h.lng = sp.da.lng; h.alt = sp.da.alt; h.acc = sp.da.acc;
                delete h.spostamento;
                if (numModalGpsLat) numModalGpsLat.value = h.lat;
                if (numModalGpsLng) numModalGpsLng.value = h.lng;
                if (gpsModalMapMarker) gpsModalMapMarker.setLatLng([h.lat, h.lng]);
                updateModalGpsStatusText();
                aggiornaTracciaSpostamento();
                updateUI();
                saveState();
                mostraToast('Prova riportata alla posizione di prima.');
            });

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
                const viewProject = document.getElementById('viewProject');
                if (viewName === 'project' && !(state.projects && state.projects[state.currentProjectId])) viewName = state.uiState.currentView = 'home';
                viewProject.style.display = viewName === 'project' ? 'flex' : 'none';
                // Tasto indietro di Android (Fase 5): una voce nella cronologia finché non si è in Home.
                if (viewName !== 'home' && !(history.state && history.state.dpsh)) history.pushState({ dpsh: true }, '');
                if (viewName === 'home' && history.state && history.state.dpsh) history.back();
                if (viewName === 'project') {
                    if (viewHome) viewHome.style.display = 'none';
                    if (viewField) viewField.style.display = 'none';
                    if (testataProva) testataProva.style.display = 'none';
                    if (surveySwitcherBar) surveySwitcherBar.style.display = 'none';
                    saveState(); // la prova aperta torna nel progetto prima di contarne intervalli e avvisi
                    renderSchermataProgetto();
                } else if (viewName === 'home') {
                    if (viewHome) viewHome.style.display = 'flex';
                    if (viewField) viewField.style.display = 'none';
                    if (testataProva) testataProva.style.display = 'none';
                    if (surveySwitcherBar) surveySwitcherBar.style.display = 'none';
                    aggiornaConteggiHome();
                    renderHomeProjects();
                } else {
                    if (viewHome) viewHome.style.display = 'none';
                    if (viewField) viewField.style.display = 'flex';
                    if (testataProva) testataProva.style.display = '';
                    // Entrando in una prova (dalla Home o dal Progetto) si parte dal contatore (Fase 6).
                    if (vistaPrecedente !== 'field') vistaProva = 'conta';
                    if (surveySwitcherBar) surveySwitcherBar.style.display = 'flex';
                    startLiveGpsWatch();
                    updateUI();
                }

                // Animazione d'ingresso della schermata appena mostrata, solo quando si è davvero
                // cambiata vista (non su chiamate ridondanti a switchView con lo stesso nome) e non
                // al primo giro (avvio app: non c'è una schermata precedente da cui "arrivare").
                if (cambioVistaReale && viewTransitionsEnabled) {
                    const vistaEntrante = viewName === 'home' ? viewHome : (viewName === 'project' ? viewProject : viewField);
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
                renderPc();

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
                    switchView('project');
                });
            }

            // Indietro (Android, o del browser): prova → progetto → Home.
            window.addEventListener('popstate', () => {
                const vista = state.uiState && state.uiState.currentView;
                if (vista === 'field') switchView('project');
                else if (vista === 'project') switchView('home');
            });

            // var e non let: la schermata si può disegnare all'avvio, prima che questo pezzo sia valutato.
            var ordinandoProve = false;   // «Ordina» acceso: le righe hanno le frecce
            /** La schermata Progetto: prove con profondità, intervalli, spie e avvisi, e gli accessi a
             * dati, strati, note e consegna. Legge il progetto aperto. */
            function renderSchermataProgetto() {
                const proj = state.projects[state.currentProjectId];
                const $ = id => document.getElementById(id);
                $('lblProgettoNome').textContent = proj.name || proj.comune || 'Progetto';
                $('lblProgettoSotto').textContent = [proj.comune, proj.committente ? 'Committente: ' + proj.committente : ''].filter(Boolean).join(' · ');
                const stato = STATI_PROGETTO.find(s => s.id === proj.stato);
                $('lblProgettoStato').textContent = [stato ? stato.etichetta : '', proj.modificatoIl ? 'Modificato il ' + formattaDataIT(new Date(proj.modificatoIl).toISOString()) : ''].filter(Boolean).join(' · ');
                const prove = proveInOrdine(proj);
                const attiva = proj.surveys[state.currentSurveyId];
                $('btnProgettoRiprendi').textContent = attiva ? `Riprendi la Prova ${(attiva.header || {}).provaNr || ''}` : 'Apri la prova';
                const avvisi = new Map(avvisiPrimaExport(proj).map(r => [r.id, r.avvisi.length]));
                const aMano = Array.isArray(proj.ordineProve) && proj.ordineProve.length > 0;
                $('lblProgettoConteggio').textContent = `${prove.length} ${prove.length === 1 ? 'prova' : 'prove'}` + (avvisi.size ? ` · ${avvisi.size} da controllare` : '') + (aMano ? ' · ordine scelto a mano' : '');
                $('btnProgettoOrdina').textContent = ordinandoProve ? 'Fatto' : 'Ordina';
                $('btnProgettoOrdina').setAttribute('aria-pressed', String(ordinandoProve));
                $('btnProgettoOrdina').hidden = prove.length < 2;
                $('barraOrdinaProve').hidden = !ordinandoProve;
                $('btnOrdinePerNumero').disabled = !aMano;
                const salvaOrdine = (ids, fuoco) => {
                    proj.ordineProve = ids;
                    saveState();
                    renderSchermataProgetto();
                    const el = fuoco && document.querySelector(fuoco);
                    if (el && !el.disabled) el.focus();
                };
                if (ordinandoProve) {
                    // Mentre si ordina le righe non aprono la prova: hanno le frecce.
                    $('listaProveProgetto').innerHTML = prove.map((s, i) => {
                        const nr = escapeHtmlDidascalia(String((s.header || {}).provaNr || '?'));
                        return `<div class="prova-riga ordina" data-surv="${s.id}">
                            <span class="prova-maniglia" role="button" tabindex="-1" aria-label="Trascina la prova ${nr}" title="Trascina"><svg class="ico"><use href="#i-grip"/></svg></span>
                            <span class="prova-riga-n">${nr}</span>
                            <span class="prova-riga-testo"><strong>Prova ${nr}</strong></span>
                            <button type="button" class="bt-icona" data-sposta="-1" ${i === 0 ? 'disabled' : ''} aria-label="Sposta su la prova ${nr}" title="Su"><svg class="ico"><use href="#i-arrow-up"/></svg></button>
                            <button type="button" class="bt-icona giu" data-sposta="1" ${i === prove.length - 1 ? 'disabled' : ''} aria-label="Sposta giù la prova ${nr}" title="Giù"><svg class="ico"><use href="#i-arrow-up"/></svg></button>
                        </div>`;
                    }).join('');
                    $('listaProveProgetto').querySelectorAll('[data-sposta]').forEach(b => b.addEventListener('click', () => {
                        const ids = prove.map(s => s.id), i = ids.indexOf(b.closest('[data-surv]').dataset.surv), j = i + Number(b.dataset.sposta);
                        if (i < 0 || j < 0 || j >= ids.length) return;
                        [ids[i], ids[j]] = [ids[j], ids[i]];
                        salvaOrdine(ids, `#listaProveProgetto [data-surv="${ids[j]}"] [data-sposta="${b.dataset.sposta}"]`);
                    }));
                    // LA MANIGLIA: col dito o col mouse la riga segue il puntatore e prende il posto
                    // di quella che scavalca; lasciata, l'ordine è quello che si vede.
                    $('listaProveProgetto').querySelectorAll('.prova-maniglia').forEach(m => m.addEventListener('pointerdown', (e) => {
                        e.preventDefault();
                        const lista = $('listaProveProgetto'), riga = m.closest('[data-surv]');
                        const prima = [...lista.children].map(r => r.dataset.surv);
                        riga.classList.add('trascinata');
                        if (m.setPointerCapture) try { m.setPointerCapture(e.pointerId); } catch (err) { /* jsdom */ }
                        const muovi = (ev) => {
                            const altre = [...lista.children].filter(r => r !== riga);
                            const dopo = altre.find(r => { const b = r.getBoundingClientRect(); return ev.clientY < b.top + b.height / 2; });
                            if (dopo) { if (dopo !== riga.nextElementSibling) lista.insertBefore(riga, dopo); }
                            else if (lista.lastElementChild !== riga) lista.appendChild(riga);
                        };
                        const lascia = () => {
                            m.removeEventListener('pointermove', muovi);
                            m.removeEventListener('pointerup', lascia);
                            m.removeEventListener('pointercancel', lascia);
                            riga.classList.remove('trascinata');
                            const dopo = [...lista.children].map(r => r.dataset.surv);
                            if (dopo.join() !== prima.join()) salvaOrdine(dopo); else renderSchermataProgetto();
                        };
                        m.addEventListener('pointermove', muovi);
                        m.addEventListener('pointerup', lascia);
                        m.addEventListener('pointercancel', lascia);
                    }));
                    return;
                }
                $('listaProveProgetto').innerHTML = prove.map(s => {
                    const h = s.header || {};
                    const logs = s.logs || [];
                    const fondo = logs.reduce((m, l) => Math.max(m, Number(l && l.end) || 0), 0);
                    const haGps = isFinite(parseFloat(h.lat)) && isFinite(parseFloat(h.lng));
                    const falda = parseFloat(h.faldaDa);
                    const n = avvisi.get(s.id) || 0;
                    return `<button type="button" class="prova-riga${s.id === state.currentSurveyId ? ' attiva' : ''}" data-surv="${s.id}">
                        <span class="prova-riga-n">${escapeHtmlDidascalia(String(h.provaNr || '?'))}</span>
                        <span class="prova-riga-testo"><strong>Prova ${escapeHtmlDidascalia(String(h.provaNr || '?'))}</strong>
                            <span>${numeroConVirgola(fondo)} m · ${logs.length} ${logs.length === 1 ? 'intervallo' : 'intervalli'} · ${haGps ? 'GPS' : 'senza GPS'} · ${(s.photos || []).length} foto · ${isFinite(falda) ? 'falda ' + numeroConVirgola(falda) + ' m' : 'falda non impostata'}</span></span>
                        <span class="prova-riga-stato${n ? ' avviso' : ''}">${n ? n + (n === 1 ? ' avviso' : ' avvisi') : 'Pronta'}</span>
                    </button>`;
                }).join('');
                $('listaProveProgetto').querySelectorAll('.prova-riga').forEach(b => b.addEventListener('click', () => {
                    if (b.dataset.surv !== state.currentSurveyId) syncProjectToActiveState(state.currentProjectId, b.dataset.surv);
                    switchView('field');
                }));
            }
            // «Ordina»: l'ordine delle prove del progetto (proveInOrdine), scelto con le frecce.
            document.getElementById('btnProgettoOrdina').addEventListener('click', () => { ordinandoProve = !ordinandoProve; renderSchermataProgetto(); });
            document.getElementById('btnOrdinePerNumero').addEventListener('click', () => {
                const proj = state.projects[state.currentProjectId];
                delete proj.ordineProve;
                saveState();
                renderSchermataProgetto();
                mostraToast('Prove in ordine crescente');
            });
            document.getElementById('btnProgettoAiProgetti').addEventListener('click', () => { ordinandoProve = false; switchView('home'); });
            document.getElementById('btnProgettoAltro').addEventListener('click', () => openProjectActionsModal(state.currentProjectId));
            document.getElementById('btnProgettoRiprendi').addEventListener('click', () => switchView('field'));
            document.getElementById('btnProgettoNuovaProva').addEventListener('click', () => openNewSurveyModal());
            document.getElementById('btnProgettoDati').addEventListener('click', () => openCantiereInfoModal());
            document.getElementById('btnProgettoStrati').addEventListener('click', () => openStratiModal());
            document.getElementById('btnProgettoNote').addEventListener('click', () => apriNoteProgetto(state.currentProjectId));
            document.getElementById('btnProgettoConsegna').addEventListener('click', () => openExportModal('project', state.currentProjectId));

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
