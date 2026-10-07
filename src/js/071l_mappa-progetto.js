            // ===================== MAPPA DEL PROGETTO =====================
            // Tutte le prove col GPS su una mappa (satellite, strade o ibrida), con le tracce delle
            // sezioni. Toccando una prova: la sua scheda (profondità, strati, falda, foto, quota,
            // coordinate, «spostata a mano») e tre azioni: aprirla, cambiarne i dati (il numero
            // compreso, nella scheda «Dati» della prova) o spostarla trascinando il segnaposto, con la
            // doppia conferma e la memoria della posizione di prima di «Sposta la prova» (022).

            const mappaProgetto = { mappa: null, sfondo: null, etichette: null, livelli: null, scelta: null, spostando: null, stile: 'esri-satellite', sfondoSpento: false, daMostrare: null };

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
                            <div>${isFinite(falda) ? 'Falda a ' + numeroConVirgola(falda) + ' m' : 'Falda non impostata'} · ${(s.photos || []).length ? (s.photos.length + ' foto') : 'nessuna foto'}</div>
                            ${quota !== null ? `<div>Quota ${numeroConVirgola(quota, 1)} m s.l.m.</div>` : ''}
                            <div>${parseFloat(h.lat).toFixed(6)}, ${parseFloat(h.lng).toFixed(6)}</div>
                            ${h.date ? `<div>${esc(String(h.date))}</div>` : ''}
                            ${sp ? `<div class="spostata">Spostata a mano di ${metriTra(sp.da, sp.a)} m</div>` : ''}
                            <div class="mappa-progetto-strati">${strati.map(([n, c]) => `<span><i style="background:${c}"></i>${esc(n)}</span>`).join('')}</div>
                        </div>${(s.photos || []).length ? '<img class="mappa-progetto-foto" alt="La prima foto della prova" hidden>' : ''}</div>
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
                // La prima foto, in piccolo: sta nella prova o nell'archivio delle foto.
                const foto = s && (s.photos || [])[0], img = box.querySelector('.mappa-progetto-foto');
                if (foto && img) Promise.resolve(foto.dataUrl || (foto.id && getPhotoFromIDB(foto.id))).then(u => { if (u && img.isConnected) { img.src = u; img.hidden = false; } });
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
                // Quel che compare per la prima volta (o si riaccende) entra animato; la prova scelta pulsa una volta.
                if (m.progettoVisti !== state.currentProjectId) { m.visti = new Set(); m.progettoVisti = state.currentProjectId; m.pulsata = null; }
                const ora = new Set(), nuovo = k => { ora.add(k); return !m.visti.has(k); };
                const stV = stileLivello('prove');
                if (vista3d.livelli.sezioni) (proj.sezioniTracciate || []).filter(t => !vista3d.tracceNascoste.has(t.id)).forEach(t => {
                    const st = stileLivello('t:' + t.id);
                    L.polyline([[t.a.lat, t.a.lng], [t.b.lat, t.b.lng]], { color: st.colore, weight: st.spessore, dashArray: trattoLeaflet(st.tratto), opacity: op('t:' + t.id), className: nuovo('t:' + t.id) ? 'am-entra' : '' }).addTo(m.livelli)
                        .bindTooltip('Sezione ' + escapeHtmlDidascalia(t.nome), { sticky: true })
                        .on('contextmenu', (e) => menuTracciaMappa(e.originalEvent, t));
                    if (vista3d.etichette.sezioni) estremiTraccia(t.nome).forEach((n, i) => {
                        const p = i ? t.b : t.a;
                        L.marker([p.lat, p.lng], { interactive: false, opacity: op('t:' + t.id), icon: L.divIcon({ className: '', html: `<span class="mappa-progetto-nome-traccia et-${st.etichetta}">${escapeHtmlDidascalia(n)}</span>`, iconSize: [30, 16], iconAnchor: [15, 22] }) }).addTo(m.livelli);
                    });
                });
                disegniNellaMappa2d(m.livelli, nuovo);
                // Un segnaposto per prova eseguita: un'interpretazione alternativa («3B») sta nello stesso punto.
                proveFisiche(proveConCoordinate(proj)).filter(s => !vista3d.proveNascoste.has(s.id)).forEach(s => {
                    const h = s.header, nr = !vista3d.etichette.prove ? '' : escapeHtmlDidascalia(String(h.provaNr || '?')), scelta = s.id === m.scelta, sp = scelta && spostamentoProva(h);
                    // Spostata a mano: dov'era prima, tratteggiato.
                    if (sp) {
                        const stile = { color: '#eab308', weight: 2, dashArray: '5 5', interactive: false };
                        L.circleMarker([sp.da.lat, sp.da.lng], { ...stile, radius: 8, fillOpacity: 0.15 }).addTo(m.livelli);
                        L.polyline([[sp.da.lat, sp.da.lng], [parseFloat(h.lat), parseFloat(h.lng)]], stile).addTo(m.livelli);
                    }
                    const mk = L.marker([parseFloat(h.lat), parseFloat(h.lng)], { icon: iconaProvaMappa(nr, scelta, stV), draggable: m.spostando === s.id, zIndexOffset: scelta ? 1000 : 0, title: 'Prova ' + (h.provaNr || '?'), opacity: op('p:' + s.id) }).addTo(m.livelli);
                    mk.on('click', () => { scegliProvaMappa(s.id); if (areaMappa.strumento === 'sposta') scegliStrumentoMappa('sposta'); });
                    mk.on('contextmenu', (e) => menuProvaMappa(e.originalEvent, s.id));
                    if (m.spostando === s.id) mk.on('dragend', () => spostaProvaDallaMappa(s.id, mk.getLatLng()));
                    const appena = nuovo('p:' + s.id), pin = mk.getElement && mk.getElement() && mk.getElement().firstElementChild;
                    if (pin && appena) pin.classList.add('entra');
                    else if (pin && scelta && m.pulsata !== s.id) pin.classList.add('pulsa');
                });
                m.pulsata = m.scelta;
                m.visti = ora;
            }
            /** Il segnaposto di una prova con lo stile delle prove: colore (la scelta resta blu), bordo, grandezza. */
            function iconaProvaMappa(nr, scelta, st) {
                const w = Math.round((scelta ? 30 : 22) * st.dimensione);
                const stile = `width:${w}px;height:${w}px;border-color:${st.contorno || '#fff'}${!scelta && st.colore ? `;background:${st.colore}` : ''}`;
                return L.divIcon({ className: '', html: `<div class="${scelta ? 'gps-mia-prova-pin' : 'gps-altra-prova-pin'}" style="${stile}"><span style="font-size:${Math.round((scelta ? 12 : 10) * st.dimensione)}px">${nr}</span></div>`, iconSize: [w, w], iconAnchor: [w / 2, w] });
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

            /** Le mappe di base: i satelliti (Esri, Google), le strade di Google e i WMS (pronti, come la
             * CTR, e i propri, gli stessi dell'immagine sul terreno del 3D). La scelta è ricordata. */
            const SFONDI_2D = () => [['esri-satellite', 'Satellite (Esri)'], ['google-satellite', 'Satellite (Google)'], ['google-strade', 'Strade (Google)']]
                .concat(wmsDisponibili().map((w, i) => ['wms:' + i, w.nome]));
            function livelloSfondo2d(id) {
                const w = id.startsWith('wms:') && wmsDisponibili()[Number(id.slice(4))];
                if (w) return L.tileLayer.wms(w.url, { layers: w.layer || '', format: 'image/png', transparent: false, version: '1.1.1', maxZoom: 20, attribution: w.attribuzione || 'WMS' });
                const f = SFONDI_3D[id] || SFONDI_3D['esri-satellite'];
                const l = L.tileLayer('', { maxNativeZoom: f.zoomMax || 19, maxZoom: 20, attribution: f.attribuzione });
                l.getTileUrl = c => f.url(c.z, c.x, c.y);
                return l;
            }
            function sfondoMappaProgetto(id) {
                const m = mappaProgetto, voci = SFONDI_2D();
                if (!voci.some(v => v[0] === id)) id = 'esri-satellite';
                m.stile = id;
                if (!state.settings) state.settings = {};
                if (state.settings.sfondo2d !== id) { state.settings.sfondo2d = id; saveState(); }
                const sel = document.getElementById('selSfondo2d');
                sel.innerHTML = voci.map(([k, nome]) => `<option value="${k}">${escapeHtmlDidascalia(nome)}</option>`).join('');
                sel.value = id;
                if (!m.mappa) return;
                if (m.sfondo) m.sfondo.remove();
                m.sfondo = livelloSfondo2d(id);
                sfondo2dAcceso(true); // scegliendo una mappa la si vuole vedere
            }
            /** La mappa di base accesa o spenta (la spunta della sua riga nei Livelli), con la sua opacità. */
            function sfondo2dAcceso(on) {
                const m = mappaProgetto;
                m.sfondoSpento = !on;
                if (!m.mappa) return;
                if (!m.sfondo) return;
                if (on) m.sfondo.addTo(m.mappa).setOpacity(vista3d.opacita['sf-base'] ?? 1).bringToBack(); else m.sfondo.remove();
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
                sfondoMappaProgetto((state.settings && state.settings.sfondo2d) || m.stile);
                // Dopo che la scena si è mostrata: Leaflet misura il riquadro.
                setTimeout(() => {
                    m.mappa.invalidateSize();
                    if (m.daMostrare) vaiAllaProva2d(m.daMostrare);
                    else if (nuova) inquadraTutteMappa2d();
                    disegnaProveMappa();
                    aggiornaBussola2d();
                }, 60);
            }
            function inquadraTutteMappa2d(animata) {
                const m = mappaProgetto, proj = state.projects[state.currentProjectId];
                if (!m.mappa || !proj) return;
                const punti = proveFisiche(proveConCoordinate(proj)).map(s => [parseFloat(s.header.lat), parseFloat(s.header.lng)])
                    .concat((proj.sezioniTracciate || []).flatMap(t => [[t.a.lat, t.a.lng], [t.b.lat, t.b.lng]]));
                if (punti.length > 1) m.mappa[animata ? 'flyToBounds' : 'fitBounds'](L.latLngBounds(punti).pad(0.25), { maxZoom: 19, duration: 0.6 });
                else if (punti.length) m.mappa[animata ? 'flyTo' : 'setView'](punti[0], 18, { duration: 0.6 });
                else m.mappa.setView([41.87, 12.57], 6);
            }
            /** «Mostra sulla mappa»: si apre (o si passa al) modo Mappa sulla prova, con la sua scheda. */
            function mostraProvaSullaMappa(survId) {
                const proj = state.projects[state.currentProjectId], s = proj && proj.surveys[survId];
                if (!s) return;
                if (!proveConCoordinate(proj).includes(s)) { appAlert('Questa prova non ha ancora le coordinate GPS: non si può mostrare sulla mappa.'); return; }
                mappaProgetto.spostando = null;
                if (areaMappaAperta() && areaMappa.modo === 'mappa' && mappaProgetto.mappa) { vaiAllaProva2d(survId, true); return; }
                mappaProgetto.daMostrare = survId;
                if (areaMappaAperta()) modoAreaMappa('mappa'); else apriVista3d('mappa');
            }
            function vaiAllaProva2d(survId, volo) {
                const s = state.projects[state.currentProjectId].surveys[survId];
                mappaProgetto.daMostrare = null;
                if (!s || !mappaProgetto.mappa) return;
                mappaProgetto.mappa[volo ? 'flyTo' : 'setView']([parseFloat(s.header.lat), parseFloat(s.header.lng)], 19, { duration: 0.7 });
                scegliProvaMappa(survId);
            }
            /** «Modifica dati» dalla mappa: la scheda dei dati della prova, e finita la modifica (chiuse
             * tutte le finestre che se ne aprono: GPS, foto, falda, conferme) si torna alla mappa, sulla
             * stessa prova, non alla schermata del progetto. */
            let attesaRitornoMappa = null;
            function modificaDatiDallaMappa(survId) {
                mappaProgetto.tornaA = { modo: areaMappa.modo, scelta: survId, vista: state.uiState.currentView };
                chiudiMappaProgetto();
                openSurveySettingsModal(survId, 'dati');
            }
            new MutationObserver(() => {
                if (!mappaProgetto.tornaA || document.querySelector('.modal.open')) return;
                clearTimeout(attesaRitornoMappa);
                attesaRitornoMappa = setTimeout(() => {
                    const r = mappaProgetto.tornaA;
                    if (!r || document.querySelector('.modal.open')) return;
                    mappaProgetto.tornaA = null;
                    // Se nel frattempo si è andati altrove (la prova aperta), si resta lì.
                    if (state.uiState.currentView !== r.vista) return;
                    if (state.projects[state.currentProjectId] && state.projects[state.currentProjectId].surveys[r.scelta]) mappaProgetto.scelta = r.scelta;
                    apriVista3d(r.modo);
                }, 80);
            }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
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
            document.getElementById('selSfondo2d').addEventListener('change', (e) => { sfondoMappaProgetto(e.target.value); renderLivelli3d(); });
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
                if (azione === 'dati') { modificaDatiDallaMappa(id); return; }
                chiudiMappaProgetto();
                if (id !== state.currentSurveyId) syncProjectToActiveState(state.currentProjectId, id);
                switchView('field');
            });
