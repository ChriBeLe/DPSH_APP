            // ===================== FASE 2: RICONOSCIMENTO AUTOMATICO DEGLI STRATI (UI) =====================

            const btnAutoStratiIntegrated = document.getElementById('btnAutoStratiIntegrated');
            const btnAutoStratiChart = document.getElementById('btnAutoStratiChart');
            const lblDragHandlesHint = document.getElementById('lblDragHandlesHint');

            const modalStratiChoiceOverlay = document.getElementById('modalStratiChoiceOverlay');
            const modalStratiChoice = document.getElementById('modalStratiChoice');
            const btnCloseStratiChoiceX = document.getElementById('btnCloseStratiChoiceX');
            const btnStratiChoiceManual = document.getElementById('btnStratiChoiceManual');
            const btnStratiChoiceAuto = document.getElementById('btnStratiChoiceAuto');

            const modalAutoStratiOverlay = document.getElementById('modalAutoStratiOverlay');
            const modalAutoStrati = document.getElementById('modalAutoStrati');
            const btnCloseAutoStratiX = document.getElementById('btnCloseAutoStratiX');
            const btnCancelAutoStrati = document.getElementById('btnCancelAutoStrati');
            const btnRunAutoStrati = document.getElementById('btnRunAutoStrati');
            const numAutoStratiDeltaColpi = document.getElementById('numAutoStratiDeltaColpi');
            const numAutoStratiMinThickness = document.getElementById('numAutoStratiMinThickness');
            const lblAutoStratiPreview = document.getElementById('lblAutoStratiPreview');

            function openStratiChoiceModal() {
                if (modalStratiChoiceOverlay) modalStratiChoiceOverlay.classList.add('open');
                if (modalStratiChoice) modalStratiChoice.classList.add('open');
            }
            function closeStratiChoiceModal() {
                if (modalStratiChoiceOverlay) modalStratiChoiceOverlay.classList.remove('open');
                if (modalStratiChoice) modalStratiChoice.classList.remove('open');
            }

            function updateAutoStratiPreview() {
                if (!lblAutoStratiPreview) return;
                const delta = parseFloat(numAutoStratiDeltaColpi.value) || 0;
                const minThick = parseFloat(numAutoStratiMinThickness.value) || 0;
                const segs = detectStratiSegments(delta, minThick);
                if (segs.length === 0) {
                    lblAutoStratiPreview.style.display = 'none';
                    return;
                }
                lblAutoStratiPreview.style.display = 'block';
                lblAutoStratiPreview.textContent = `Con questi parametri verrebbero rilevati ${segs.length} strat${segs.length === 1 ? 'o' : 'i'}.`;
            }

            function openAutoStratiParamsModal() {
                if (modalAutoStratiOverlay) modalAutoStratiOverlay.classList.add('open');
                if (modalAutoStrati) modalAutoStrati.classList.add('open');
                updateAutoStratiPreview();
            }
            function closeAutoStratiParamsModal() {
                if (modalAutoStratiOverlay) modalAutoStratiOverlay.classList.remove('open');
                if (modalAutoStrati) modalAutoStrati.classList.remove('open');
            }

            // Punto di ingresso comune per entrambi i pulsanti (vista integrata e vista grafico)
            function handleOpenAutoStrati() {
                if (!state.logs || state.logs.length < 2) return;
                if (!state.strati || state.strati.length <= 1) {
                    openStratiChoiceModal();
                } else {
                    openAutoStratiParamsModal();
                }
            }

            if (btnAutoStratiIntegrated) btnAutoStratiIntegrated.addEventListener('click', handleOpenAutoStrati);
            if (btnAutoStratiChart) btnAutoStratiChart.addEventListener('click', handleOpenAutoStrati);

            if (btnCloseStratiChoiceX) btnCloseStratiChoiceX.addEventListener('click', closeStratiChoiceModal);
            if (modalStratiChoiceOverlay) modalStratiChoiceOverlay.addEventListener('click', closeStratiChoiceModal);
            if (btnStratiChoiceManual) {
                btnStratiChoiceManual.addEventListener('click', () => {
                    closeStratiChoiceModal();
                    openStratiModal();
                });
            }
            if (btnStratiChoiceAuto) {
                btnStratiChoiceAuto.addEventListener('click', () => {
                    closeStratiChoiceModal();
                    openAutoStratiParamsModal();
                });
            }

            if (btnCloseAutoStratiX) btnCloseAutoStratiX.addEventListener('click', closeAutoStratiParamsModal);
            if (btnCancelAutoStrati) btnCancelAutoStrati.addEventListener('click', closeAutoStratiParamsModal);
            if (modalAutoStratiOverlay) modalAutoStratiOverlay.addEventListener('click', closeAutoStratiParamsModal);
            if (numAutoStratiDeltaColpi) numAutoStratiDeltaColpi.addEventListener('input', updateAutoStratiPreview);
            if (numAutoStratiMinThickness) numAutoStratiMinThickness.addEventListener('input', updateAutoStratiPreview);

            if (btnRunAutoStrati) {
                function finalizeAutoStratiApplication(segs) {
                    applyDetectedSegmentsToLogs(segs);
                    saveState();
                    populateStratiDropdown();
                    if (editingIndex >= 0 && editingIndex < state.logs.length) {
                        selModalLithology.value = state.logs[editingIndex].lithology || '';
                    }
                    updateUI();
                    closeAutoStratiParamsModal();
                    triggerVibrate([30, 40, 30]);
                    // Toast: il suggerimento sulle maniglie lo dà già il grafico (lblDragHandlesHint).
                    mostraToast(`Rilevati e applicati ${segs.length} strat${segs.length === 1 ? 'o' : 'i'}: i contatti si affinano dal grafico`);
                }

                btnRunAutoStrati.addEventListener('click', async () => {
                    const delta = parseFloat(numAutoStratiDeltaColpi.value) || 0;
                    const minThick = parseFloat(numAutoStratiMinThickness.value) || 0;
                    if (delta <= 0) {
                        appAlert('Inserisci una differenza minima di colpi maggiore di zero.');
                        return;
                    }
                    const segs = detectStratiSegments(delta, minThick);
                    if (segs.length === 0) {
                        appAlert('Nessuno strato rilevabile con questi parametri.');
                        return;
                    }

                    // Se servono più strati di quanti già configurati, e l'archivio litologico
                    // globale contiene almeno una voce, offre la scelta prima di crearne di generici.
                    const surplus = segs.length - state.strati.length;
                    if (surplus > 0 && getArchiveList().length > 0) {
                        const wantsArchive = await appConfirm(
                            `Per questo rilevamento servono ${surplus} strat${surplus === 1 ? 'o' : 'i'} in più rispetto a quelli già configurati.\n\nVuoi attingerlo dall'Archivio Litologico Globale invece di crearne uno generico?`
                        );
                        if (wantsArchive) {
                            closeAutoStratiParamsModal();
                            openArchivePicker({
                                mode: 'multi',
                                needCount: surplus,
                                onConfirm: (selectedIds) => {
                                    selectedIds.forEach((archId, i) => {
                                        state.strati.push(createStratoFromArchive(archId, 'auto' + i));
                                    });
                                    finalizeAutoStratiApplication(segs);
                                }
                            });
                            return;
                        }
                    }

                    finalizeAutoStratiApplication(segs);
                });
            }

            // INQUADRAMENTO SATELLITARE PER IL REPORT: mosaico di tessere ArcGIS centrato sul punto
            // della prova (o spostato di qualche tessera, vedi offsetXTiles/offsetYTiles sotto — il
            // pin resta sempre sulla sua vera posizione GPS, è la porzione di mappa VISIBILE a
            // spostarsi, per poter riquadrare meglio i punti di riferimento intorno al pin, richiesto
            // esplicitamente). Mosaico 5x5 (non più 3x3): serve il margine in più proprio per lasciare
            // spazio allo spostamento senza che il pin esca dal riquadro visibile. La posizione del
            // pin dentro il mosaico si calcola in frazione di tessera (mai un "centro assunto" al
            // 50%/50%, il punto GPS può cadere ovunque dentro la tessera) e si sposta in senso
            // opposto allo spostamento del mosaico (spostare la mappa a destra fa apparire il pin più
            // a sinistra, come muovere una fotocamera). La barra di scala è calcolata sui metri/pixel
            // reali di Web Mercator alla latitudine e allo zoom scelti (la scala di una tile varia con
            // la latitudine — stessa formula usata da Google/Bing/Esri per gli slippy tile a 256px),
            // non un'etichetta fissa come "~1:10k".
            /** ADATTATORE della vecchia firma sulla mappa nuova.
             *
             * Resta perche' due chiamanti la usano ancora con i vecchi parametri (tessera del
             * pin + scostamento in tessere). Traduce e delega: nessuna seconda strada di
             * disegno da tenere allineata alla prima — quel prezzo, in questo progetto, e' gia'
             * stato pagato una volta con l'impaginazione. */
            function buildInquadramentoSatellitareHtml(lat, lng, provaNr, zoom = 16, offsetXTiles = 0, offsetYTiles = 0, showLabels = true, labelsOpacity = 100, customLabelText = '', customLabelFontSize = 11, labelsScale = 100, customLabelPosX = 50, customLabelPosY = 20) {
                if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return '';
                const mappa = convertiInquadramentoVecchio(
                    { satelliteZoom: zoom, satelliteOffsetX: offsetXTiles, satelliteOffsetY: offsetYTiles },
                    parseFloat(lat), parseFloat(lng));
                // labelsScale era una percentuale 100..200 usata da un trucco per-tessera che
                // spostava le etichette dal loro posto. Diventa un numero di passi di zoom, che
                // le ingrandisce senza spostarle.
                const passi = labelsScale >= 175 ? 2 : (labelsScale >= 125 ? 1 : 0);
                return buildMappaInquadramentoHtml({
                    centro: mappa.centro, zoom, provider: 'esri-satellite',
                    larghezzaMm: 140, altezzaMm: 140,
                    pin: [{ lat: parseFloat(lat), lng: parseFloat(lng), numero: provaNr }],
                    etichette: showLabels !== false,
                    opacitaToponimi: labelsOpacity,
                    ingrandimentoToponimi: passi,
                    etichettaLibera: customLabelText,
                    etichettaLiberaMisura: customLabelFontSize,
                    etichettaLiberaX: customLabelPosX,
                    etichettaLiberaY: customLabelPosY,
                    mostraScala: true,
                    scala: { posizione: 'basso-sinistra' }
                });
            }

            // buildFotoPaginaHtml RIMOSSA (Fase 3 della riscrittura del motore di impaginazione):
            // generava le pagine-foto automatiche per le foto in eccesso non piazzate come blocco
            // nel template — funzionalità già tolta dall'export (richiesto esplicitamente, "l'export
            // finale dev'essere basato SOLO su quello che c'è nel template"), quindi questa funzione
            // non aveva più nessun chiamante.

            // GRAFICO COLPI/PROFONDITÀ PER I REPORT STAMPATI — stesso tipo di istogramma già
            // disegnato dal vivo da renderChart() durante l'acquisizione in campo (barre colpi
            // per intervallo, riempite col pattern litologico, linea falda tratteggiata, griglia
            // profondità/colpi), ma ridisegnato come funzione pura e statica: niente stato globale,
            // niente interattività (drag/click), e colori scritti in esadecimale invece che con le
            // CSS custom properties dell'app (var(--accent) ecc.) perché il documento Word non le
            // supporta e la finestra di stampa PDF non eredita il tema dell'app.
