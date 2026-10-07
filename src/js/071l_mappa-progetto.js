            // ===================== MAPPA DEL PROGETTO =====================
            // Tutte le prove col GPS su una mappa (satellite, strade o ibrida), con le tracce delle
            // sezioni. Toccando una prova: la sua scheda (profondità, strati, falda, foto, quota,
            // coordinate, «spostata a mano») e tre azioni: aprirla, cambiarne i dati (il numero
            // compreso, nella scheda «Dati» della prova) o spostarla trascinando il segnaposto, con la
            // doppia conferma e la memoria della posizione di prima di «Sposta la prova» (022).

            const mappaProgetto = { mappa: null, sfondo: null, etichette: null, livelli: null, scelta: null, spostando: null, stile: 'satellite', sfondoSpento: false };

            /** La scheda di una prova: colonna degli strati (con la falda), dati, azioni. */
            function schedaProvaMappaHtml(proj, s) {
                const h = s.header || {}, logs = s.logs || [], esc = escapeHtmlDidascalia;
                const fasce = colonnaStratigrafica(logs, proj.strati);
                const fondo = Math.max(0, ...fasce.map(f => f.a), ...logs.map(l => Number(l && l.end) || 0));
                const falda = parseFloat(h.faldaDa), quota = quotaDellaProva(proj, h), sp = spostamentoProva(h);
                const H = 110, k = fondo ? H / fondo : 0;
                const colonna = `<svg width="26" height="${H + 2}" viewBox="0 0 26 ${H + 2}" aria-hidden="true">`
                    + fasce.map(f => `<rect x="4" y="${(1 + f.da * k).toFixed(1)}" width="18" height="${Math.max(0.5, (f.a - f.da) * k).toFixed(1)}" fill="${f.colore}" stroke="#111827" stroke-width="0.5"><title>${esc(f.nome)}</title></rect>`).join('')
                    + (isFinite(falda) && falda <= fondo ? `<line x1="0" x2="26" y1="${(1 + falda * k).toFixed(1)}" y2="${(1 + falda * k).toFixed(1)}" stroke="#2563eb" stroke-width="2"/>` : '')
                    + '</svg>';
                const strati = [...new Map(fasce.map(f => [f.nome, f.colore])).entries()];
                const spostando = mappaProgetto.spostando === s.id;
                // Mentre si sposta, la scheda si riduce: il segnaposto da trascinare deve restare in vista.
                if (spostando) return `<div class="mappa-progetto-testa"><strong>Sposta la Prova ${esc(String(h.provaNr || '?'))}</strong></div>
                    <div class="mappa-progetto-sposta">Trascina il segnaposto blu nel punto nuovo: ti chiedo conferma due volte, e la posizione di prima resta in memoria.</div>
                    <div class="mappa-progetto-azioni" style="margin-top: 8px;"><button type="button" class="bt" data-mappa-azione="annulla">Annulla lo spostamento</button></div>`;
                return `<div class="mappa-progetto-testa"><strong>Prova ${esc(String(h.provaNr || '?'))}</strong>
                        <button type="button" class="chiudi-x" data-mappa-azione="chiudi" title="Chiudi la scheda" aria-label="Chiudi la scheda"><svg class="ico"><use href="#i-x"/></svg></button></div>
                    <div class="mappa-progetto-corpo">${fasce.length ? colonna : ''}
                        <div class="mappa-progetto-dati">
                            <div>${numeroConVirgola(fondo)} m · ${logs.length} ${logs.length === 1 ? 'intervallo' : 'intervalli'}</div>
                            <div>${isFinite(falda) ? 'Falda a ' + numeroConVirgola(falda) + ' m' : 'Falda non impostata'} · ${(s.photos || []).length} foto</div>
                            ${quota !== null ? `<div>Quota ${numeroConVirgola(quota, 1)} m s.l.m.</div>` : ''}
                            <div>${parseFloat(h.lat).toFixed(6)}, ${parseFloat(h.lng).toFixed(6)}</div>
                            ${h.date ? `<div>${esc(String(h.date))}</div>` : ''}
                            ${sp ? `<div class="spostata">Spostata a mano di ${metriTra(sp.da, sp.a)} m</div>` : ''}
                            <div class="mappa-progetto-strati">${strati.map(([n, c]) => `<span><i style="background:${c}"></i>${esc(n)}</span>`).join('')}</div>
                        </div></div>
                    <div class="mappa-progetto-azioni">
                        <button type="button" class="bt bt-principale" data-mappa-azione="apri"><svg class="ico"><use href="#i-folder-open"/></svg>Apri la prova</button>
                        <button type="button" class="bt" data-mappa-azione="dati"><svg class="ico"><use href="#i-edit"/></svg>Modifica dati</button>
                        <button type="button" class="bt" data-mappa-azione="sposta"><svg class="ico"><use href="#i-pin"/></svg>Sposta</button>
                    </div>`;
            }

            function renderSchedaProvaMappa() {
                const box = document.getElementById('schedaProvaMappa'), proj = state.projects[state.currentProjectId];
                const s = proj && proj.surveys && proj.surveys[mappaProgetto.scelta];
                box.hidden = !s;
                box.innerHTML = s ? schedaProvaMappaHtml(proj, s) : '';
                // La prova scelta resta in vista, sopra la scheda.
                if (s && mappaProgetto.mappa && areaMappa.modo === 'mappa') mappaProgetto.mappa.panInside([parseFloat(s.header.lat), parseFloat(s.header.lng)], { paddingTopLeft: [20, 40], paddingBottomRight: [20, box.offsetHeight + 30] });
            }

            /** Le prove (quella scelta in blu, più grande; trascinabile mentre la si sposta) e le tracce. */
            function disegnaProveMappa() {
                const m = mappaProgetto, proj = state.projects[state.currentProjectId];
                if (!m.mappa || !proj) return;
                if (m.livelli) m.livelli.remove();
                m.livelli = L.layerGroup().addTo(m.mappa);
                // Livelli del pannello: spenti non si disegnano; etichette («T») e opacità di ciascuno.
                const op = k => vista3d.opacita[k] ?? 1;
                if (vista3d.livelli.sezioni) (proj.sezioniTracciate || []).filter(t => !vista3d.tracceNascoste.has(t.id)).forEach(t => {
                    L.polyline([[t.a.lat, t.a.lng], [t.b.lat, t.b.lng]], { color: '#ef4444', weight: 4, opacity: op('t:' + t.id) }).addTo(m.livelli)
                        .bindTooltip('Sezione ' + escapeHtmlDidascalia(t.nome), { sticky: true })
                        .on('contextmenu', (e) => menuTracciaMappa(e.originalEvent, t));
                    if (!vista3d.nomiNascosti.has(t.id)) estremiTraccia(t.nome).forEach((n, i) => {
                        const p = i ? t.b : t.a;
                        L.marker([p.lat, p.lng], { interactive: false, opacity: op('t:' + t.id), icon: L.divIcon({ className: '', html: `<span class="mappa-progetto-nome-traccia">${escapeHtmlDidascalia(n)}</span>`, iconSize: [30, 16], iconAnchor: [15, 22] }) }).addTo(m.livelli);
                    });
                });
                // Un segnaposto per prova eseguita: un'interpretazione alternativa («3B») sta nello stesso punto.
                proveFisiche(proveConCoordinate(proj)).filter(s => !vista3d.proveNascoste.has(s.id)).forEach(s => {
                    const h = s.header, nr = vista3d.nomiNascosti.has(s.id) ? '' : escapeHtmlDidascalia(String(h.provaNr || '?')), scelta = s.id === m.scelta, sp = scelta && spostamentoProva(h);
                    // Spostata a mano: dov'era prima, tratteggiato.
                    if (sp) {
                        const stile = { color: '#eab308', weight: 2, dashArray: '5 5', interactive: false };
                        L.circleMarker([sp.da.lat, sp.da.lng], { ...stile, radius: 8, fillOpacity: 0.15 }).addTo(m.livelli);
                        L.polyline([[sp.da.lat, sp.da.lng], [parseFloat(h.lat), parseFloat(h.lng)]], stile).addTo(m.livelli);
                    }
                    const mk = L.marker([parseFloat(h.lat), parseFloat(h.lng)], { icon: scelta ? gpsMiaProvaIcon(nr) : gpsAltraProvaIcon(nr), draggable: m.spostando === s.id, zIndexOffset: scelta ? 1000 : 0, title: 'Prova ' + (h.provaNr || '?'), opacity: op('p:' + s.id) }).addTo(m.livelli);
                    mk.on('click', () => { scegliProvaMappa(s.id); if (areaMappa.strumento === 'sposta') scegliStrumentoMappa('sposta'); });
                    mk.on('contextmenu', (e) => menuProvaMappa(e.originalEvent, s.id));
                    if (m.spostando === s.id) mk.on('dragend', () => spostaProvaDallaMappa(s.id, mk.getLatLng()));
                });
            }
            function scegliProvaMappa(survId) {
                mappaProgetto.scelta = survId;
                mappaProgetto.spostando = null;
                disegnaProveMappa();
                renderSchedaProvaMappa();
            }

            /** Il segnaposto lasciato in un punto nuovo: la prova diventa quella attiva e passa dalla
             * stessa doppia conferma di «Sposta la prova»; annullando, il segnaposto torna dov'era. */
            async function spostaProvaDallaMappa(survId, ll) {
                if (survId !== state.currentSurveyId) {
                    saveState();
                    syncProjectToActiveState(state.currentProjectId, survId);
                    updateUI();
                    saveState();
                }
                await confermaSpostamentoProva({ lat: ll.lat, lng: ll.lng });
                mappaProgetto.spostando = null;
                if (areaMappa.strumento === 'sposta') scegliStrumentoMappa('sel');
                disegnaProveMappa();
                renderSchedaProvaMappa();
            }

            function sfondoMappaProgetto(stile) {
                const m = mappaProgetto;
                m.stile = stile;
                document.querySelectorAll('#sfondoMappaProgetto [data-layer]').forEach(b => b.classList.toggle('active', b.dataset.layer === stile));
                if (!m.mappa) return;
                if (m.sfondo) m.sfondo.remove();
                if (m.etichette) { m.etichette.remove(); m.etichette = null; }
                const src = GPS_MAP_TILE_SOURCES[stile === 'street' ? 'street' : 'satellite'];
                m.sfondo = L.tileLayer(src.url, src.options).addTo(m.mappa);
                m.sfondo.bringToBack();
                if (stile === 'hybrid') m.etichette = L.tileLayer(GPS_MAP_TILE_SOURCES.hybridLabels.url, GPS_MAP_TILE_SOURCES.hybridLabels.options).addTo(m.mappa);
                sfondo2dAcceso(true); // scegliendo una mappa la si vuole vedere
            }
            const SFONDI_2D = [['satellite', 'Satellite (Esri)'], ['street', 'Strade (OpenStreetMap)'], ['hybrid', 'Satellite con nomi']];
            /** La mappa di base accesa o spenta (la spunta della sua riga nei Livelli), con la sua opacità. */
            function sfondo2dAcceso(on) {
                const m = mappaProgetto;
                m.sfondoSpento = !on;
                if (!m.mappa) return;
                [m.sfondo, m.etichette].forEach(l => {
                    if (!l) return;
                    if (on) l.addTo(m.mappa).setOpacity(vista3d.opacita['sf-base'] ?? 1); else l.remove();
                });
                if (on && m.sfondo) m.sfondo.bringToBack();
            }

            /** La mappa 2D dell'area di lavoro (il modo «Mappa»): Leaflet si carica e si crea la prima volta;
             * la prima volta che si mostra inquadra tutte le prove e le tracce. */
            async function mostraMappa2d() {
                const proj = state.projects[state.currentProjectId];
                if (!proj) return;
                const lbl = document.getElementById('lblMappaProgetto');
                const conGps = proveFisiche(proveConCoordinate(proj)), senza = Object.keys(proj.surveys || {}).length - proveConCoordinate(proj).length;
                lbl.textContent = (conGps.length ? '' : 'Nessuna prova ha ancora il GPS.') + (senza > 0 ? ` ${senza} ${senza === 1 ? 'prova senza GPS non compare' : 'prove senza GPS non compaiono'}.` : '');
                try { await ensureLeafletLoaded(); await caricaRotazioneMappa(); } catch (e) { lbl.textContent = e.message; return; }
                const m = mappaProgetto, nuova = !m.mappa || m.progetto !== state.currentProjectId;
                if (!m.mappa) {
                    m.mappa = L.map('mappaProgettoEl', { zoomControl: false, rotate: true, bearing: 0, touchRotate: true, rotateControl: false, attributionControl: true, zoomSnap: 0.5, maxZoom: 20 });
                    m.mappa.on('click', (e) => { if (!clicStrumentoMappa2d(e) && !m.spostando) { m.scelta = null; disegnaProveMappa(); renderSchedaProvaMappa(); } });
                    agganciaMappa2d(m.mappa);
                }
                m.progetto = state.currentProjectId;
                sfondoMappaProgetto(m.stile);
                // Dopo che la scena si è mostrata: Leaflet misura il riquadro.
                setTimeout(() => {
                    m.mappa.invalidateSize();
                    if (nuova) inquadraTutteMappa2d();
                    disegnaProveMappa();
                    aggiornaBussola2d();
                }, 60);
            }
            function inquadraTutteMappa2d() {
                const m = mappaProgetto, proj = state.projects[state.currentProjectId];
                if (!m.mappa || !proj) return;
                const punti = proveFisiche(proveConCoordinate(proj)).map(s => [parseFloat(s.header.lat), parseFloat(s.header.lng)])
                    .concat((proj.sezioniTracciate || []).flatMap(t => [[t.a.lat, t.a.lng], [t.b.lat, t.b.lng]]));
                if (punti.length > 1) m.mappa.fitBounds(L.latLngBounds(punti).pad(0.25), { maxZoom: 19 });
                else if (punti.length) m.mappa.setView(punti[0], 18);
                else m.mappa.setView([41.87, 12.57], 6);
            }
            function apriMappaProgetto() {
                mappaProgetto.scelta = null;
                mappaProgetto.spostando = null;
                renderSchedaProvaMappa();
                apriVista3d('mappa');
            }
            function chiudiMappaProgetto() {
                mappaProgetto.spostando = null;
                closeAnyOpenModal();
            }

            document.getElementById('btnProgettoMappa').addEventListener('click', apriMappaProgetto);
            document.getElementById('sfondoMappaProgetto').addEventListener('click', (e) => {
                const b = e.target.closest('[data-layer]');
                if (b) sfondoMappaProgetto(b.dataset.layer);
            });
            document.getElementById('schedaProvaMappa').addEventListener('click', (e) => {
                const b = e.target.closest('[data-mappa-azione]'), id = mappaProgetto.scelta;
                if (!b || !id) return;
                const azione = b.dataset.mappaAzione;
                if (azione === 'chiudi') { scegliProvaMappa(null); return; }
                // Spostare si fa sulla mappa 2D, trascinando il segnaposto: dal 3D ci si passa.
                if (azione === 'sposta' && areaMappa.modo !== 'mappa') modoAreaMappa('mappa');
                if (azione === 'sposta' || azione === 'annulla') {
                    mappaProgetto.spostando = azione === 'sposta' ? id : null;
                    disegnaProveMappa();
                    renderSchedaProvaMappa();
                    return;
                }
                chiudiMappaProgetto();
                if (azione === 'dati') { openSurveySettingsModal(id, 'dati'); return; }
                if (id !== state.currentSurveyId) syncProjectToActiveState(state.currentProjectId, id);
                switchView('field');
            });
