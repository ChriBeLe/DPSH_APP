            // ===== DIAGNOSTICA GPS =====
            // Invece di ipotizzare la causa del mancato accesso al GPS, questa funzione MISURA
            // ogni possibile punto di blocco nell'ordine in cui il browser li applica, e riporta
            // esattamente quale fallisce. Utile perché "tutti i permessi concessi" a livello di
            // sistema operativo non implica che la pagina abbia diritto di usare la Geolocation API.
            const btnRunGpsDiagnostics = document.getElementById('btnRunGpsDiagnostics');
            const gpsDiagnosticsBox = document.getElementById('gpsDiagnosticsBox');

            function diagLine(ok, label, detail) {
                const color = ok === true ? 'var(--success)' : (ok === false ? 'var(--danger)' : 'var(--warning)');
                const mark = ok === true ? 'OK  ' : (ok === false ? 'FAIL' : '??  ');
                return `<div style="color:${color}; margin-bottom:4px;"><strong>[${mark}]</strong> ${label}${detail ? '<br><span style="color:var(--text-muted); font-family:inherit;">&nbsp;&nbsp;&nbsp;&nbsp;' + detail + '</span>' : ''}</div>`;
            }

            async function runGpsDiagnostics() {
                if (!gpsDiagnosticsBox) return;
                gpsDiagnosticsBox.style.display = 'block';
                gpsDiagnosticsBox.innerHTML = 'Diagnostica in corso...';

                let out = '';

                // 1. Origine della pagina. ATTENZIONE: isSecureContext può riportare true anche
                //    quando la pagina è aperta da un file manager tramite content:// o file://.
                //    In quel caso l'origine è "opaca" (null): non esiste un sito a cui il browser
                //    possa associare un permesso, quindi la Posizione risulta sempre negata e la
                //    voce non compare nemmeno tra le autorizzazioni del sito.
                const proto = window.location.protocol;
                const host = window.location.hostname || '(nessun host)';
                const secure = window.isSecureContext;
                const origin = window.origin || window.location.origin;
                const isRealOrigin = (proto === 'https:' || proto === 'http:') && origin && origin !== 'null';

                out += diagLine(
                    isRealOrigin,
                    `Origine della pagina: ${isRealOrigin ? 'valida' : 'OPACA (nessun sito associabile)'}`,
                    `protocollo=${proto} host=${host} origin=${origin}` +
                    (isRealOrigin ? '' :
                     '<br><br><strong>QUESTA È LA CAUSA.</strong> L\'app è aperta come file locale, non come sito. ' +
                     'Il browser non ha un\'origine a cui legare il permesso di Posizione, quindi lo nega sempre: ' +
                     'nessuna impostazione di sistema può cambiarlo. Serve servire l\'app da http://localhost (server locale sul telefono) oppure da HTTPS.')
                );

                out += diagLine(secure === true, `Contesto sicuro dichiarato: ${secure}`,
                    (secure && !isRealOrigin) ? 'Valore fuorviante in questo caso: vale per le API generiche, ma non basta per la Geolocation.' : '');

                // 2. Presenza dell'API
                const hasApi = !!(navigator && navigator.geolocation);
                out += diagLine(hasApi, `Geolocation API disponibile: ${hasApi}`);

                // 3. Stato del permesso a livello di SITO (diverso dal permesso di sistema)
                if (navigator.permissions && navigator.permissions.query) {
                    try {
                        const st = await navigator.permissions.query({ name: 'geolocation' });
                        out += diagLine(
                            st.state === 'granted' ? true : (st.state === 'denied' ? false : null),
                            `Permesso del sito: ${st.state}`,
                            st.state === 'prompt' ? 'Il browser chiederà conferma al primo tentativo.' :
                            st.state === 'denied' ? 'Negato per QUESTO sito: lucchetto/ⓘ nella barra indirizzi &gt; Autorizzazioni &gt; Posizione.' : ''
                        );
                    } catch (e) {
                        out += diagLine(null, 'Permissions API non interrogabile', e.message);
                    }
                } else {
                    out += diagLine(null, 'Permissions API non supportata da questo browser');
                }

                // 4. Stato del watch continuo avviato dall'app
                out += diagLine(
                    liveGpsWatchId !== null,
                    `Watch GPS continuo attivo: ${liveGpsWatchId !== null}`,
                    liveGpsWatch.lat !== null
                        ? `ultima posizione: ${Number(liveGpsWatch.lat).toFixed(5)}, ${Number(liveGpsWatch.lng).toFixed(5)} (±${Math.round(liveGpsWatch.acc || 0)}m)`
                        : 'nessuna posizione ancora ricevuta dal watch'
                );

                gpsDiagnosticsBox.innerHTML = out + '<div style="color:var(--text-muted);">[....] Tentativo di rilevamento in corso (max 15s)...</div>';

                // 5. Tentativo reale: riporta il codice d'errore esatto restituito dal browser
                if (!hasApi) {
                    gpsDiagnosticsBox.innerHTML = out + diagLine(false, 'Impossibile tentare: API assente');
                    return;
                }

                const attempt = await new Promise((resolve) => {
                    let done = false;
                    const t = setTimeout(() => { if (!done) { done = true; resolve({ ok: false, timeout: true }); } }, 15000);
                    navigator.geolocation.getCurrentPosition(
                        (pos) => { if (!done) { done = true; clearTimeout(t); resolve({ ok: true, pos }); } },
                        (err) => { if (!done) { done = true; clearTimeout(t); resolve({ ok: false, err }); } },
                        { enableHighAccuracy: true, timeout: 14000, maximumAge: 0 }
                    );
                });

                if (attempt.ok) {
                    out += diagLine(true, 'Rilevamento riuscito',
                        `${attempt.pos.coords.latitude.toFixed(6)}, ${attempt.pos.coords.longitude.toFixed(6)} (±${Math.round(attempt.pos.coords.accuracy)}m)`);
                    out += '<div style="color:var(--success); margin-top:6px;">Il GPS funziona. Se prima non rispondeva, riprova ora il rilevamento automatico.</div>';
                } else if (attempt.timeout) {
                    out += diagLine(false, 'Rilevamento: nessuna risposta entro 15s',
                        'Tipico in interni o con "Precisione posizione" di Google disattivata. Prova all\'aperto.');
                } else {
                    const codes = {
                        1: 'PERMISSION_DENIED — il browser blocca la richiesta per questo sito (o il contesto non è sicuro).',
                        2: 'POSITION_UNAVAILABLE — il dispositivo non riesce a determinare la posizione (nessun fix GPS/rete).',
                        3: 'TIMEOUT — segnale non acquisito in tempo.'
                    };
                    out += diagLine(false, `Rilevamento fallito (codice ${attempt.err && attempt.err.code})`,
                        (codes[attempt.err && attempt.err.code] || (attempt.err && attempt.err.message) || 'errore sconosciuto'));
                }

                out += '<div style="margin-top:8px; padding-top:8px; border-top:1px solid var(--border); color:var(--text-muted); font-family:inherit;">Se la prima riga è FAIL, tutto il resto è conseguenza di quella: il permesso di Posizione non è assegnabile a una pagina senza origine (es. aperta come file locale in un browser normale). Se l\'app gira dentro un contenitore APK con i permessi Android concessi, questo problema di norma non si presenta.</div>';
                gpsDiagnosticsBox.innerHTML = out;
            }

            if (btnRunGpsDiagnostics) btnRunGpsDiagnostics.addEventListener('click', runGpsDiagnostics);

            // RICERCA LOCALITÀ SULLA MAPPA (geocoding via Nominatim/OpenStreetMap).
            // Utile quando il GPS del dispositivo non risponde: cercando il comune o la via ci si
            // avvicina molto alla posizione reale, poi si affina toccando il punto esatto sulla mappa.
            const txtGpsMapSearch = document.getElementById('txtGpsMapSearch');
            const btnGpsMapSearch = document.getElementById('btnGpsMapSearch');
            const gpsMapSearchResults = document.getElementById('gpsMapSearchResults');

            function showGpsMapSearchMessage(msg) {
                if (!gpsMapSearchResults) return;
                gpsMapSearchResults.style.display = 'block';
                gpsMapSearchResults.innerHTML = `<div style="padding:8px 10px; font-size:11.5px; color:var(--text-muted);">${msg}</div>`;
            }

            async function runGpsMapSearch() {
                if (!txtGpsMapSearch) return;
                const q = txtGpsMapSearch.value.trim();
                if (q.length < 3) {
                    showGpsMapSearchMessage('Inserisci almeno 3 caratteri (es. "Bari", "Via Roma Modugno").');
                    return;
                }

                showGpsMapSearchMessage('⏳ Ricerca in corso...');
                try {
                    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=it&q=' + encodeURIComponent(q);
                    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    const results = await resp.json();

                    if (!results || results.length === 0) {
                        showGpsMapSearchMessage('Nessun risultato trovato. Prova con il nome del comune o una via più nota.');
                        return;
                    }

                    gpsMapSearchResults.style.display = 'block';
                    gpsMapSearchResults.innerHTML = '';
                    results.forEach(r => {
                        const item = document.createElement('div');
                        item.style.cssText = 'padding:8px 10px; font-size:11.5px; color:var(--text-main); border-bottom:1px solid var(--border); cursor:pointer;';
                        item.textContent = r.display_name;
                        item.addEventListener('click', () => {
                            const lat = parseFloat(r.lat);
                            const lng = parseFloat(r.lon);
                            if (isNaN(lat) || isNaN(lng)) return;
                            if (gpsModalMapInstance && gpsModalMapMarker) {
                                gpsModalMapInstance.setView([lat, lng], 16);
                                gpsModalMapMarker.setLatLng([lat, lng]);
                            }
                            gpsMapSearchResults.style.display = 'none';
                            triggerVibrate(20);
                        });
                        gpsMapSearchResults.appendChild(item);
                    });
                } catch (e) {
                    showGpsMapSearchMessage('⚠️ Ricerca non riuscita (serve connessione internet). Puoi comunque spostare il pin a mano sulla mappa.');
                }
            }

            if (btnGpsMapSearch) btnGpsMapSearch.addEventListener('click', runGpsMapSearch);
            if (txtGpsMapSearch) {
                txtGpsMapSearch.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { e.preventDefault(); runGpsMapSearch(); }
                });
            }

            if (btnUseGpsMapPin) {
                btnUseGpsMapPin.addEventListener('click', () => {
                    if (!gpsModalMapMarker) return;
                    const ll = gpsModalMapMarker.getLatLng();
                    if (numModalGpsLat) numModalGpsLat.value = ll.lat;
                    if (numModalGpsLng) numModalGpsLng.value = ll.lng;
                    state.header.lat = ll.lat;
                    state.header.lng = ll.lng;
                    triggerVibrate([30, 30]);
                    updateModalGpsStatusText();
                    updateUI();
                    saveState();
                });
            }

            // ESTRAE LAT/LNG DA UNA STRINGA INCOLLATA (es. copiata da Google Maps)
            // Supporta formati come "41.845912, 12.562424", "41.845912 12.562424",
            // oppure un link tipo "https://maps.google.com/@41.845912,12.562424,15z"
            function parsePastedCoords(text) {
                if (!text) return null;
                const match = text.match(/(-?\d{1,3}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)/);
                if (!match) return null;
                const lat = parseFloat(match[1]);
                const lng = parseFloat(match[2]);
                if (isNaN(lat) || isNaN(lng)) return null;
                if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
                return { lat, lng };
            }

            if (btnApplyPastedCoords) {
                btnApplyPastedCoords.addEventListener('click', () => {
                    const raw = txtPasteCoords ? txtPasteCoords.value : '';
                    const coords = parsePastedCoords(raw);
                    if (!coords) {
                        appAlert('Coordinate non riconosciute. Incolla un testo con lat e lng, es: 41.845912, 12.562424');
                        return;
                    }
                    if (numModalGpsLat) numModalGpsLat.value = coords.lat;
                    if (numModalGpsLng) numModalGpsLng.value = coords.lng;
                    if (txtPasteCoords) txtPasteCoords.value = '';
                    triggerVibrate([40, 40]);
                    if (lblModalGpsStatus) {
                        lblModalGpsStatus.innerHTML = `${ico('check')} Coordinate riconosciute: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)} — premi "Salva Coordinate" per confermare`;
                        lblModalGpsStatus.style.color = 'var(--success)';
                    }
                });
            }

