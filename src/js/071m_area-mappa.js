            // ===================== L'AREA DI LAVORO DELLA MAPPA (presa da HyperGram 6.0b) =====================
            // Una finestra sola, due modi: Mappa (2D, Leaflet, che ruota) e 3D (071h). A sinistra la barra degli
            // strumenti: Seleziona, Orbita (3D), Sposta, Profilo (A-A' → sezione tracciata), Misura, Area (2D);
            // in fondo Tutti, Iniziale, Dall'alto, Tasti. Sotto la barra di stato: cosa c'è, le coordinate e la
            // quota sotto il mouse, la misura in corso. Nel 3D la tastiera di HyperGram (WASD, Q/Z, R/F, N, U, H,
            // 1–5, O). Col tasto destro sulle prove e sulle tracce, il loro menu.

            const areaMappa = { modo: '3d', strumento: 'sel', misura: null, profilo: null };
            const modaleAreaMappa = document.getElementById('modalVista3d');
            const areaMappaAperta = () => modaleAreaMappa.classList.contains('open');

            function modoAreaMappa(modo) {
                areaMappa.modo = modo;
                applicaPannelli();
                modaleAreaMappa.dataset.modo = modo;
                modaleAreaMappa.querySelectorAll('[data-modo-mappa]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.modoMappa === modo)));
                scegliStrumentoMappa('sel');
                document.getElementById('tastiMappa3d').hidden = true;
                infoAreaMappa();
                renderLivelli3d();
                if (modo === 'mappa') mostraMappa2d();
                else renderVista3d();
                renderSchedaProvaMappa();
            }

            /** Cosa c'è: prove col GPS e tracce; nella barra di stato, a sinistra. */
            function infoAreaMappa() {
                const proj = state.projects[state.currentProjectId];
                if (!proj) return;
                const n = proveFisiche(proveConCoordinate(proj)).length, t = (proj.sezioniTracciate || []).length;
                document.getElementById('lblAreaMappaInfo').textContent = `${n} ${n === 1 ? 'prova' : 'prove'} · ${t} ${t === 1 ? 'sezione' : 'sezioni'}`;
            }
            function coordinateAreaMappa(lat, lng, quota) {
                document.getElementById('lblAreaMappaCoord').textContent = Number.isFinite(lat)
                    ? `${lat.toFixed(6)}, ${lng.toFixed(6)}${Number.isFinite(quota) ? ` · ${numeroConVirgola(quota, 1)} m s.l.m.` : ''}` : '';
            }
            function misuraAreaMappa(testo) {
                const el = document.getElementById('lblAreaMappaMisura');
                el.hidden = !testo;
                el.textContent = testo || '';
            }

            // ---- Gli strumenti ----
            const SUGGERIMENTI_STRUMENTO = {
                sel: '', orbita: 'Orbita: trascina per girare; i clic non scelgono niente.',
                sposta: 'Sposta: tocca la prova da spostare, poi trascina il segnaposto nel punto nuovo.',
                profilo: 'Profilo: due clic, inizio (A) e fine (A\'). Esc per lasciar perdere.',
                misura: 'Distanza: clic sui punti; doppio clic o Invio per finire, Esc per togliere.',
                area: 'Area: clic sui vertici; doppio clic o Invio per chiudere, Esc per togliere.'
            };
            function scegliStrumentoMappa(nome) {
                if (areaMappa.modo === '3d' && nome === 'area') nome = 'sel';
                areaMappa.strumento = nome;
                modaleAreaMappa.querySelectorAll('.mappa-rt[data-rt]').forEach(b => b.classList.toggle('attivo', b.dataset.rt === nome));
                modaleAreaMappa.dataset.strumento = nome;
                // Profilo nel 3D: la traccia si disegna dall'alto, come «Traccia una sezione».
                if (areaMappa.modo === '3d') {
                    if (nome === 'profilo' && !vista3d.disegno) { vista3d.disegno = { a: null, cursore: null }; vista3d.prospettiva = false; vaiAVista3d({ el: Math.PI / 2 }); }
                    if (nome !== 'profilo' && vista3d.disegno) { vista3d.disegno = null; renderVista3d(); }
                }
                if (nome !== 'misura' && nome !== 'area') togliMisura();
                if (nome !== 'profilo') togliProfilo2d();
                if (nome === 'sposta' && mappaProgetto.scelta) {
                    if (areaMappa.modo !== 'mappa') { modoAreaMappa('mappa'); scegliStrumentoMappa('sposta'); return; }
                    mappaProgetto.spostando = mappaProgetto.scelta;
                    disegnaProveMappa();
                    renderSchedaProvaMappa();
                }
                if (mappaProgetto.mappa) mappaProgetto.mappa.doubleClickZoom[nome === 'misura' || nome === 'area' ? 'disable' : 'enable']();
                document.getElementById('lblMappaProgetto').textContent = SUGGERIMENTI_STRUMENTO[nome] || '';
                renderElencoSezioni3d();
            }
            modaleAreaMappa.querySelector('#railMappa').addEventListener('click', (e) => {
                const b = e.target.closest('[data-rt]');
                if (!b) return;
                const rt = b.dataset.rt;
                if (rt === 'tutti') {
                    if (areaMappa.modo === 'mappa') inquadraTutteMappa2d();
                    else { vista3d.centro = [0, 0, 0]; vista3d.zoom = 1.4; renderVista3d(); }
                } else if (rt === 'iniziale') { vistaIniziale3d(); renderVista3d(); }
                else if (rt === 'alto') vaiAVista3d(VISTE_PRONTE_3D.alto);
                else if (rt === 'tasti') document.getElementById('tastiMappa3d').hidden = !document.getElementById('tastiMappa3d').hidden;
                else scegliStrumentoMappa(areaMappa.strumento === rt && rt !== 'sel' ? 'sel' : rt);
            });
            modaleAreaMappa.querySelector('.am-modi').addEventListener('click', (e) => {
                const b = e.target.closest('[data-modo-mappa]');
                if (b && b.dataset.modoMappa !== areaMappa.modo) modoAreaMappa(b.dataset.modoMappa);
            });

            // ---- Misura e area: i punti in gradi; la linea (o il poligono) segue il mouse ----
            function areaMetriQuadri(pt) {
                if (pt.length < 3) return 0;
                const lat0 = pt[0].lat * Math.PI / 180, R = 6371000;
                const xy = pt.map(p => [p.lng * Math.PI / 180 * R * Math.cos(lat0), p.lat * Math.PI / 180 * R]);
                let s = 0;
                xy.forEach((a, i) => { const b = xy[(i + 1) % xy.length]; s += a[0] * b[1] - b[0] * a[1]; });
                return Math.abs(s) / 2;
            }
            function testoMisura(pt, area) {
                if (pt.length < 2) return area ? 'Area: clic sui vertici' : 'Distanza: clic sui punti';
                const lung = pt.slice(1).reduce((s, p, i) => s + metriPrecisi(pt[i], p), 0);
                if (!area) return `Distanza ${numeroConVirgola(lung, lung < 100 ? 1 : 0)} m`;
                const per = lung + (pt.length > 2 ? metriPrecisi(pt[pt.length - 1], pt[0]) : 0), a = areaMetriQuadri(pt);
                return `Area ${numeroConVirgola(a, a < 100 ? 1 : 0)} m² · perimetro ${numeroConVirgola(per, per < 100 ? 1 : 0)} m`;
            }
            function metriPrecisi(p, q) {
                const k = Math.PI / 180, x = (q.lng - p.lng) * k * Math.cos((p.lat + q.lat) / 2 * k), y = (q.lat - p.lat) * k;
                return Math.hypot(x, y) * 6371000;
            }
            function togliMisura() {
                const m = areaMappa.misura;
                if (m && m.livello) m.livello.remove();
                areaMappa.misura = null;
                misuraAreaMappa('');
                if (datiVista3dCorrenti && areaMappa.modo === '3d') renderVista3d();
            }
            function disegnaMisura2d() {
                const m = areaMappa.misura, carta = mappaProgetto.mappa;
                if (!m || !carta) return;
                if (m.livello) m.livello.remove();
                const pt = m.punti.concat(m.cursore && !m.finita ? [m.cursore] : []);
                const stile = { color: '#facc15', weight: 3, dashArray: m.finita ? null : '6 6', interactive: false };
                m.livello = L.layerGroup([
                    m.area && pt.length > 2 ? L.polygon(pt.map(p => [p.lat, p.lng]), { ...stile, fillOpacity: 0.18 }) : L.polyline(pt.map(p => [p.lat, p.lng]), stile),
                    ...m.punti.map(p => L.circleMarker([p.lat, p.lng], { radius: 4, color: '#111827', weight: 1.5, fillColor: '#facc15', fillOpacity: 1, interactive: false }))
                ]).addTo(carta);
                misuraAreaMappa(testoMisura(pt, m.area));
            }
            /** Le misure nel 3D: sul piano della scena, come la traccia. */
            function misuraNellaScena3d(d, P, sopra, testo) {
                const m = areaMappa.misura;
                if (!m || !m.punti3d) return;
                const pt = m.punti3d.concat(m.cursore3d && !m.finita ? [m.cursore3d] : []), zMedia = (d.zMin + d.zMax) / 2;
                const q = pt.map(([x, y]) => { const z = d.zSuolo(x, y); return P(x, y, Number.isFinite(z) ? z : zMedia); });
                for (let i = 1; i < q.length; i++) sopra.push({ t: 'linea', x1: q[i - 1][0], y1: q[i - 1][1], x2: q[i][0], y2: q[i][1], stroke: '#facc15', sw: 3, cls: 'vista3d-misura' });
                q.forEach(p => sopra.push({ t: 'cerchio', x: p[0], y: p[1], r: 4, fill: '#facc15', cls: 'vista3d-misura' }));
            }
            function finisciMisura() {
                const m = areaMappa.misura;
                if (!m) return;
                m.finita = true;
                if (areaMappa.modo === 'mappa') disegnaMisura2d(); else renderVista3d();
            }

            // ---- Il profilo nella mappa 2D: due clic, A e A', e la traccia è nelle sezioni ----
            function togliProfilo2d() {
                const p = areaMappa.profilo;
                if (p && p.livello) p.livello.remove();
                areaMappa.profilo = null;
            }
            function disegnaProfilo2d() {
                const p = areaMappa.profilo, carta = mappaProgetto.mappa;
                if (!p || !carta) return;
                if (p.livello) p.livello.remove();
                p.livello = L.polyline([[p.a.lat, p.a.lng], [(p.cursore || p.a).lat, (p.cursore || p.a).lng]], { color: '#dc2626', weight: 3, dashArray: '6 6', interactive: false }).addTo(carta);
            }

            /** Un clic sulla mappa 2D con uno strumento: true se lo strumento l'ha usato. */
            function clicStrumentoMappa2d(e) {
                const s = areaMappa.strumento, p = { lat: e.latlng.lat, lng: e.latlng.lng };
                if (s === 'misura' || s === 'area') {
                    if (!areaMappa.misura || areaMappa.misura.finita) { togliMisura(); areaMappa.misura = { area: s === 'area', punti: [] }; }
                    areaMappa.misura.punti.push(p);
                    disegnaMisura2d();
                    return true;
                }
                if (s === 'profilo') {
                    if (!areaMappa.profilo) { areaMappa.profilo = { a: p }; disegnaProfilo2d(); return true; }
                    if (metriPrecisi(areaMappa.profilo.a, p) < 1) return true;
                    const proj = state.projects[state.currentProjectId];
                    proj.sezioniTracciate = tracceDelProgetto().concat({ id: 'sez_' + Date.now().toString(36), nome: prossimoNomeTraccia(false), a: areaMappa.profilo.a, b: p });
                    saveState();
                    togliProfilo2d();
                    scegliStrumentoMappa('sel');
                    disegnaProveMappa();
                    infoAreaMappa();
                    renderLivelli3d();
                    return true;
                }
                return s !== 'sel';
            }
            /** Un clic sul 3D con uno strumento: true se lo strumento l'ha usato. */
            function clicStrumentoMappa3d(e) {
                const s = areaMappa.strumento;
                if (s === 'orbita') return true;
                if (s === 'misura') {
                    const q = puntoAlSuolo3d(...puntoCanvas(e));
                    if (!q) return true;
                    if (!areaMappa.misura || areaMappa.misura.finita) { togliMisura(); areaMappa.misura = { punti3d: [], punti: [] }; }
                    const g = datiVista3dCorrenti.geo(...q);
                    areaMappa.misura.punti3d.push(q);
                    areaMappa.misura.punti.push(g);
                    misuraAreaMappa(testoMisura(areaMappa.misura.punti, false));
                    renderVista3d();
                    return true;
                }
                if (s === 'sposta') {
                    const id = provaNelPunto(ultimaScena3d, ...puntoCanvas(e));
                    if (id) { scegliProvaMappa(id); scegliStrumentoMappa('sposta'); }
                    return true;
                }
                return false;
            }

            // ---- La mappa 2D: coordinate sotto il mouse, misura e profilo che seguono, menu del tasto destro ----
            function agganciaMappa2d(carta) {
                carta.on('mousemove', (e) => {
                    const proj = state.projects[state.currentProjectId];
                    coordinateAreaMappa(e.latlng.lat, e.latlng.lng, proj && proj.dtm ? quotaDellaProva(proj, { lat: e.latlng.lat, lng: e.latlng.lng }) : NaN);
                    const p = { lat: e.latlng.lat, lng: e.latlng.lng };
                    if (areaMappa.misura && !areaMappa.misura.finita && areaMappa.misura.punti.length) { areaMappa.misura.cursore = p; disegnaMisura2d(); }
                    if (areaMappa.profilo) { areaMappa.profilo.cursore = p; disegnaProfilo2d(); }
                });
                carta.on('dblclick', () => { if (areaMappa.misura) finisciMisura(); });
                carta.on('rotate', () => { if (typeof aggiornaBussola2d === 'function') aggiornaBussola2d(); });
                carta.on('zoomend', () => { if (typeof aggiornaBussola2d === 'function') aggiornaBussola2d(); });
            }
            box3d.addEventListener('mousemove', (e) => {
                const d = datiVista3dCorrenti;
                if (!d || !ultimaScena3d || vista3d.trascina) return;
                const q = puntoAlSuolo3d(...puntoCanvas(e));
                if (!q) { coordinateAreaMappa(NaN); return; }
                const g = d.geo(...q), z = d.zSuolo(...q);
                coordinateAreaMappa(g.lat, g.lng, d.senzaDtm ? NaN : z);
                const m = areaMappa.misura;
                if (m && m.punti3d && !m.finita && m.punti3d.length) { m.cursore3d = q; misuraAreaMappa(testoMisura(m.punti.concat([g]), false)); ridisegna3d(); }
            });
            box3d.addEventListener('dblclick', (e) => {
                if (areaMappa.misura) { finisciMisura(); return; }
                if (areaMappa.strumento === 'sel' || areaMappa.strumento === 'orbita') { e.preventDefault(); vistaIniziale3d(); renderVista3d(); }
            });

            // ---- Il menu del tasto destro: sulle prove (2D e 3D) e sulle tracce (2D) ----
            function menuProvaMappa(e, survId) {
                const proj = state.projects[state.currentProjectId], s = proj && proj.surveys[survId];
                if (!s) return;
                scegliProvaMappa(survId);
                apriMenuContesto(e, nomeDpsh(s), [
                    ['Apri la prova', 'i-folder-open', '', () => { chiudiMappaProgetto(); if (survId !== state.currentSurveyId) syncProjectToActiveState(state.currentProjectId, survId); switchView('field'); }],
                    ['Modifica dati', 'i-edit', '', () => { chiudiMappaProgetto(); openSurveySettingsModal(survId, 'dati'); }],
                    ['Sposta', 'i-move-y', '', () => scegliStrumentoMappa('sposta')],
                    '-',
                    ['Nascondi in questa mappa', 'i-eye', '', () => { vista3d.proveNascoste.add(survId); renderLivelli3d(); disegnaProveMappa(); renderVista3d(); }]
                ]);
            }
            function menuTracciaMappa(e, t) {
                apriMenuContesto(e, 'Sezione ' + t.nome, [
                    ['Vedi la sezione', 'i-eye', '', () => { sezioniTracciateStato.vista = t.id; mostraSchedaComandi('sezioni'); renderElencoSezioni3d(); }],
                    ['PDF', 'i-print', '', () => esportaPdfSezioni([t])],
                    ['Rinomina…', 'i-rinomina', '', async () => {
                        const nome = await appPrompt('Nome della sezione', t.nome, { title: 'Rinomina la sezione', okLabel: 'Rinomina' });
                        if (!nome || !nome.trim()) return;
                        t.nome = nome.trim();
                        saveState();
                        disegnaProveMappa(); renderVista3d(); renderElencoSezioni3d();
                    }],
                    '-',
                    ['Elimina', 'i-trash', '', async () => {
                        if (!await appConfirmDelete(`Eliminare la traccia ${t.nome}?`)) return;
                        const proj = state.projects[state.currentProjectId];
                        proj.sezioniTracciate = tracceDelProgetto().filter(x => x !== t);
                        saveState();
                        disegnaProveMappa(); renderVista3d(); renderElencoSezioni3d(); infoAreaMappa(); renderLivelli3d();
                    }, true]
                ]);
            }
            box3d.addEventListener('contextmenu', (e) => {
                if (!ultimaScena3d || vista3d.mosso > 3) return;
                const id = provaNelPunto(ultimaScena3d, ...puntoCanvas(e));
                if (id) menuProvaMappa(e, id);
            });
            /** Apre una scheda del pannello Comandi. */
            function mostraSchedaComandi(scheda) {
                const b = document.querySelector(`#schedeVista3d [data-scheda3d="${scheda}"]`);
                if (b) b.click();
            }

            // ---- La tastiera, come in HyperGram: nel 3D WASD, Q/Z, R/F tenuti premuti; N, U, H, 1–5, O; Esc ----
            const TASTI_MOTO_3D = { w: 'w', s: 's', a: 'a', d: 'd', q: 'q', z: 'z', r: 'giu', f: 'su' };
            const VISTE_TASTI_3D = ['alto', 'iso', 'nord', 'est', 'sud'];
            const scriveInUnCampo = (e) => !!(e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]'));
            // Prima di tutti gli altri (fase di cattura sulla finestra): Esc che lascia uno strumento non deve chiudere la mappa.
            window.addEventListener('keydown', (e) => {
                if (!areaMappaAperta() || e.ctrlKey || e.metaKey || e.altKey || scriveInUnCampo(e)) return;
                if (e.key === 'Escape' && (areaMappa.strumento !== 'sel' || areaMappa.misura)) {
                    e.preventDefault(); e.stopImmediatePropagation();
                    if (areaMappa.misura && !areaMappa.misura.finita && (areaMappa.misura.punti.length || 0) > 1) { finisciMisura(); return; }
                    scegliStrumentoMappa('sel');
                    return;
                }
                if (e.key === 'Enter' && areaMappa.misura) { e.preventDefault(); finisciMisura(); return; }
                if (areaMappa.modo !== '3d') return;
                const k = e.key.toLowerCase();
                if (TASTI_MOTO_3D[k]) {
                    e.preventDefault();
                    moto3d.veloce = e.shiftKey;
                    moto3d.tasti.add(TASTI_MOTO_3D[k]);
                    avviaMoto3d();
                    return;
                }
                if (k === 'n') vaiAVista3d({ az: 0 });
                else if (k === 'u') vaiAVista3d(VISTE_PRONTE_3D.alto);
                else if (k === 'h') { vista3d.centro = [0, 0, 0]; vista3d.zoom = 1.4; vaiAVista3d({ az: -0.6, el: 0.62 }); }
                else if (k === 'o') { vista3d.prospettiva = !vista3d.prospettiva; renderVista3d(); }
                else if (/^[1-5]$/.test(k)) { const v = VISTE_PRONTE_3D[VISTE_TASTI_3D[+k - 1]]; if (v.prospettiva !== undefined) vista3d.prospettiva = v.prospettiva; vaiAVista3d({ az: v.az, el: v.el }); }
                else return;
                e.preventDefault();
            }, true);
            document.addEventListener('keyup', (e) => {
                const k = TASTI_MOTO_3D[e.key.toLowerCase()];
                if (k) moto3d.tasti.delete(k);
                if (e.key === 'Shift') moto3d.veloce = false;
            });
            window.addEventListener('blur', () => moto3d.tasti.clear());
            // La scena cambia misura (finestra, pannelli): si ridisegna.
            window.addEventListener('resize', () => {
                if (!areaMappaAperta()) return;
                if (areaMappa.modo === '3d') ridisegna3d(); else if (mappaProgetto.mappa) mappaProgetto.mappa.invalidateSize();
            });

            /** Il plugin che fa ruotare la mappa (leaflet-rotate): dopo Leaflet, prima di creare la mappa.
             * Se non arriva (senza rete) la mappa resta col nord in alto. */
            let rotazioneMappaPromessa = null;
            function caricaRotazioneMappa() {
                if (window.L && L.Map && L.Map.prototype.setBearing) return Promise.resolve();
                if (!rotazioneMappaPromessa) rotazioneMappaPromessa = new Promise((ok) => {
                    const script = document.createElement('script');
                    script.src = 'https://unpkg.com/leaflet-rotate@0.2.8/dist/leaflet-rotate.js';
                    script.onload = ok; script.onerror = ok;
                    document.head.appendChild(script);
                });
                return rotazioneMappaPromessa;
            }

            // ---- I PANNELLI (da HyperGram 6.0b, «Pannelli»): Livelli e Comandi. Ciascuno agganciato a sinistra o
            // a destra (fissato: la vista rientra; non fissato: resta al bordo una striscia e col mouse esce),
            // oppure libero sopra la scena; ridotto resta la testata. Si trascina dalla testata: lasciato
            // vicino a un lato si aggancia lì, altrove resta libero. Tutto ricordato. Sul telefono galleggiano.
            const LARGHEZZA_PNL = { liv: 250, cmd: 340 };
            const PANNELLI_PREDEFINITI = { liv: { dock: 'l', pin: true, red: false, fx: 20, fy: 20 }, cmd: { dock: 'r', pin: true, red: false, fx: 80, fy: 60 } };
            const pannelli = (() => {
                try { const s = JSON.parse(localStorage.getItem('dpsh.pannelliMappa') || 'null'); if (s && s.liv && s.cmd) return s; } catch (_) { /* predefiniti */ }
                return JSON.parse(JSON.stringify(PANNELLI_PREDEFINITI));
            })();
            const elPannello = k => document.querySelector(`.am-pnl[data-pnl="${k}"]`);
            const scenaMappa = document.getElementById('scenaAreaMappa');
            const telefonoMappa = () => window.innerWidth < 760;
            function salvaPannelli() { try { localStorage.setItem('dpsh.pannelliMappa', JSON.stringify(pannelli)); } catch (_) { /* solo per questa volta */ } }
            function applicaPannelli() {
                const stretto = telefonoMappa();
                let vl = 0, vr = 0;
                const perLato = { l: [], r: [] };
                ['liv', 'cmd'].forEach(k => {
                    const p = pannelli[k], el = elPannello(k);
                    const dock = stretto ? null : (p.dock === 'l' || p.dock === 'r' ? p.dock : null);
                    el.classList.toggle('dk', !!dock);
                    el.classList.toggle('dl', dock === 'l');
                    el.classList.toggle('dr', dock === 'r');
                    el.classList.toggle('fl', !dock);
                    el.classList.toggle('un', !!dock && !p.pin);
                    el.classList.toggle('red', !!p.red);
                    el.style.width = stretto ? '' : LARGHEZZA_PNL[k] + 'px';
                    if (dock) {
                        el.style.left = el.style.top = '';
                        perLato[dock].push(k);
                        if (p.pin && !p.red) { if (dock === 'l') vl = Math.max(vl, LARGHEZZA_PNL[k]); else vr = Math.max(vr, LARGHEZZA_PNL[k]); }
                    } else {
                        // libero: dove l'ha lasciato, ma sempre dentro la scena (sul telefono, uno sopra e uno sotto)
                        const W = scenaMappa.clientWidth || 800, H = scenaMappa.clientHeight || 600;
                        const x = stretto ? (k === 'liv' ? W - el.offsetWidth - 8 : 8) : Math.max(0, Math.min(W - 60, p.fx));
                        const y = stretto ? (k === 'liv' ? 8 : Math.max(8, H - Math.min(el.offsetHeight, H * 0.5) - 8)) : Math.max(0, Math.min(H - 40, p.fy));
                        el.style.left = x + 'px'; el.style.top = y + 'px';
                        el.style.removeProperty('--pt'); el.style.removeProperty('--ph');
                    }
                });
                // Due pannelli sullo stesso lato: uno sopra e uno sotto (a metà altezza; uno ridotto lascia tutto all'altro).
                ['l', 'r'].forEach(lato => {
                    const ks = perLato[lato];
                    ks.forEach((k, i) => {
                        const el = elPannello(k), altro = ks[1 - i] && pannelli[ks[1 - i]];
                        el.classList.toggle('pila', ks.length > 1 && i === 0);
                        if (ks.length < 2) { el.style.setProperty('--pt', '0px'); el.style.setProperty('--ph', '100%'); return; }
                        const met = altro && altro.red ? 'calc(100% - 41px)' : '50%';
                        el.style.setProperty('--pt', i === 0 ? '0px' : (pannelli[ks[0]].red ? '41px' : '50%'));
                        el.style.setProperty('--ph', pannelli[k].red ? 'auto' : (i === 0 ? met : (pannelli[ks[0]].red ? 'calc(100% - 41px)' : '50%')));
                    });
                });
                const vista = scenaMappa.querySelector('.am-vista');
                vista.style.setProperty('--vl', vl + 'px');
                vista.style.setProperty('--vr', vr + 'px');
                elPannello('liv').querySelector('[data-pnl-azione="lato"] use').setAttribute('href', pannelli.liv.dock === 'r' ? '#i-flusso-sx' : '#i-flusso-dx');
                elPannello('cmd').querySelector('[data-pnl-azione="lato"] use').setAttribute('href', pannelli.cmd.dock === 'r' ? '#i-flusso-sx' : '#i-flusso-dx');
                // La vista ha cambiato misura: alla fine dello scorrimento si ridisegna.
                clearTimeout(applicaPannelli.t);
                applicaPannelli.t = setTimeout(() => { if (!areaMappaAperta()) return; if (areaMappa.modo === '3d') renderVista3d(); else if (mappaProgetto.mappa) mappaProgetto.mappa.invalidateSize(); }, 320);
            }
            function azionePannello(k, azione) {
                const p = pannelli[k];
                if (azione === 'pin') p.pin = !p.pin;
                else if (azione === 'riduci') p.red = !p.red;
                else if (azione === 'lato') {
                    // sinistra → destra → libero → sinistra
                    if (p.dock === 'l') p.dock = 'r';
                    else if (p.dock === 'r') { p.dock = 'f'; p.fx = Math.max(10, (scenaMappa.clientWidth || 800) - LARGHEZZA_PNL[k] - 30); p.fy = 30; }
                    else p.dock = 'l';
                    p.red = false;
                }
                salvaPannelli();
                applicaPannelli();
            }
            ['liv', 'cmd'].forEach(k => {
                const el = elPannello(k), testa = el.querySelector('.am-pnl-testa');
                el.querySelector('.am-pnl-ctrl').addEventListener('click', (e) => {
                    const b = e.target.closest('[data-pnl-azione]');
                    if (b) { e.stopPropagation(); azionePannello(k, b.dataset.pnlAzione); }
                });
                // Trascinare dalla testata: segue il mouse; lasciato a meno di 90 px da un lato si aggancia lì.
                testa.addEventListener('pointerdown', (e) => {
                    if (e.button !== 0 || telefonoMappa() || e.target.closest('button:not(.mappa-livelli-titolo)')) return;
                    const r0 = el.getBoundingClientRect(), rs = scenaMappa.getBoundingClientRect(), dx = e.clientX - r0.left, dy = e.clientY - r0.top, x0 = e.clientX, y0 = e.clientY;
                    let mosso = false;
                    const muovi = (ev) => {
                        if (!mosso && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
                        if (!mosso) {
                            mosso = true;
                            pannelli[k].dock = 'f';
                            el.classList.add('trascina');
                            applicaPannelli();
                        }
                        pannelli[k].fx = ev.clientX - rs.left - dx;
                        pannelli[k].fy = ev.clientY - rs.top - dy;
                        el.style.left = Math.max(0, Math.min(rs.width - 60, pannelli[k].fx)) + 'px';
                        el.style.top = Math.max(0, Math.min(rs.height - 40, pannelli[k].fy)) + 'px';
                    };
                    const fine = (ev) => {
                        window.removeEventListener('pointermove', muovi);
                        window.removeEventListener('pointerup', fine);
                        el.classList.remove('trascina');
                        if (!mosso) return;
                        // il clic che chiude il trascinamento non deve aprire o ridurre il pannello
                        const ferma = (c) => { c.stopPropagation(); c.preventDefault(); };
                        window.addEventListener('click', ferma, { capture: true, once: true });
                        setTimeout(() => window.removeEventListener('click', ferma, { capture: true }), 0);
                        if (ev.clientX - rs.left < 90) pannelli[k].dock = 'l';
                        else if (rs.right - ev.clientX < 90) pannelli[k].dock = 'r';
                        salvaPannelli();
                        applicaPannelli();
                    };
                    window.addEventListener('pointermove', muovi);
                    window.addEventListener('pointerup', fine);
                });
            });
            // Il titolo «Livelli» apre e riduce il suo pannello, come la freccia.
            document.getElementById('btnLivelli3d').addEventListener('click', () => azionePannello('liv', 'riduci'));
            try { if (telefonoMappa() && !localStorage.getItem('dpsh.pannelliMappa')) { pannelli.liv.red = true; pannelli.cmd.red = true; } } catch (_) { /* come sono */ }
            applicaPannelli();
            window.addEventListener('resize', () => { if (areaMappaAperta()) applicaPannelli(); });

            // ---- LA BUSSOLA DELLA MAPPA 2D (la stessa del 3D, come in HyperGram): l'anello graduato gira col nord
            // e trascinato gira la mappa; al centro la direzione (gradi e punto cardinale; mentre gira, di quanto),
            // un clic rimette il nord in alto; agli angoli giri di 15°; a destra lo zoom con la scala. ----
            const bussola2d = document.getElementById('bussola2d');
            (() => {
                let tacche = '';
                for (let g = 5; g < 360; g += 5) {
                    const l = g % 90 === 0 ? 6 : g % 45 === 0 ? 5 : g % 15 === 0 ? 3.6 : 2;
                    tacche += `<line class="${g % 15 ? 'm' : 'M'}" x1="60" y1="5" x2="60" y2="${5 + l}" transform="rotate(${g} 60 60)"/>`;
                }
                const tasto = (cls, ico, titolo, attr) => `<button type="button" class="b-tasto ${cls}" ${attr} title="${titolo}" aria-label="${titolo}"><svg class="ico"><use href="#i-${ico}"/></svg></button>`;
                bussola2d.innerHTML = '<div class="b-dial"><svg class="b-svg" viewBox="0 0 120 120" aria-hidden="true">'
                    + '<circle class="b-fondo" cx="60" cy="60" r="59.5"/><circle class="b-anello" cx="60" cy="60" r="46.5"/>'
                    + `<g class="b-rosa">${tacche}<path class="b-ntri" d="M60 6.2 L63.2 12 L56.8 12 Z"/></g>`
                    + '<g class="b-lettere"><text class="b-n">N</text><text>E</text><text>S</text><text>O</text></g>'
                    + '<path class="b-arco" d=""/><path class="b-indice" d="M60 5.6 L56.4 0.8 L63.6 0.8 Z"/>'
                    + '<circle class="b-presa-anello" cx="60" cy="60" r="47"/>'
                    + '<circle class="b-centro" cx="60" cy="60" r="33"/><text class="b-rotta b-rotta2d" x="60" y="64">0°</text><text class="b-sotto" x="60" y="77">N</text>'
                    + '<circle class="b-presa-centro" cx="60" cy="60" r="37"><title>Un clic: nord in alto · trascina per girare</title></circle></svg>'
                    + tasto('b-ang bl', 'undo', 'Gira la mappa di 15° in senso antiorario', 'data-gira2d="-15"')
                    + tasto('b-ang br', 'redo', 'Gira la mappa di 15° in senso orario', 'data-gira2d="15"') + '</div>'
                    + '<div class="b-righe"><div class="b-righe-col"><div class="b-riga" data-riga="zoom2d">'
                    + '<span class="b-mini" title="Scala della mappa"><svg class="b-mini-svg" viewBox="0 0 12 24"><rect class="b-mz-fondo" x="4" y="2" width="4" height="20" rx="2"/><rect class="b-mz-pieno" x="4" y="12" width="4" height="10" rx="2"/><circle class="b-mz-cur" cx="6" cy="12" r="3.2"/></svg></span>'
                    + `<span class="b-ext"><button type="button" class="b-tasto" data-zoom2d="-1" title="Allontana" aria-label="Allontana">−</button><div class="b-traccia" data-trac="zoom2d" title="Scala della mappa: trascina"><i class="b-pieno"></i><i class="b-cursore"></i></div>`
                    + `<button type="button" class="b-tasto" data-zoom2d="1" title="Avvicina" aria-label="Avvicina"><svg class="ico"><use href="#i-plus"/></svg></button></span><span class="b-val"></span></div></div></div>`;
            })();
            const Z2D = [3, 20];
            function aggiornaBussola2d() {
                const m = mappaProgetto.mappa;
                if (!m) return;
                const n = ((m.getBearing ? m.getBearing() : 0) % 360 + 540) % 360 - 180;
                bussola2d.querySelector('.b-rosa').setAttribute('transform', `rotate(${n.toFixed(2)} 60 60)`);
                [...bussola2d.querySelectorAll('.b-lettere text')].forEach((t, i) => {
                    const a = (n + i * 90) * Math.PI / 180;
                    t.setAttribute('x', (60 + 44.5 * Math.sin(a)).toFixed(2));
                    t.setAttribute('y', (60 - 44.5 * Math.cos(a)).toFixed(2));
                });
                const a = n * Math.PI / 180, ex = 60 + 37 * Math.sin(a), ey = 60 - 37 * Math.cos(a);
                bussola2d.querySelector('.b-arco').setAttribute('d', Math.abs(n) < 0.3 ? '' : `M60 23 A37 37 0 0 ${n > 0 ? 1 : 0} ${ex.toFixed(2)} ${ey.toFixed(2)}`);
                // la direzione in cui guarda la parte alta della mappa
                const r = Math.round((360 - n + 360) % 360) % 360;
                bussola2d.querySelector('.b-rotta2d').textContent = r + '°';
                bussola2d.querySelector('.b-sotto').textContent = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(r / 45) % 8];
                // zoom: la scala a 96 dpi, arrotondata
                const z = m.getZoom(), f = (z - Z2D[0]) / (Z2D[1] - Z2D[0]), lat = m.getCenter().lat;
                const mpp = 40075016.686 * Math.cos(lat * Math.PI / 180) / (256 * Math.pow(2, z));
                let sc = mpp / 0.00026458; const p10 = Math.pow(10, Math.max(0, Math.floor(Math.log10(sc)) - 1)); sc = Math.round(sc / p10) * p10;
                const rg = bussola2d.querySelector('[data-riga="zoom2d"]'), tr = rg.querySelector('.b-traccia'), pos = v => `calc(6px + ${(v * 100).toFixed(2)}% - ${(v * 12).toFixed(2)}px)`;
                tr.dataset.f = f;
                tr.querySelector('.b-cursore').style.left = pos(f);
                tr.querySelector('.b-pieno').style.left = pos(0); tr.querySelector('.b-pieno').style.width = `calc(${(f * 100).toFixed(2)}% - ${(f * 12).toFixed(2)}px)`;
                const yz = 22 - Math.max(0, Math.min(1, f)) * 20;
                rg.querySelector('.b-mz-pieno').setAttribute('y', yz.toFixed(2)); rg.querySelector('.b-mz-pieno').setAttribute('height', (22 - yz).toFixed(2)); rg.querySelector('.b-mz-cur').setAttribute('cy', yz.toFixed(2));
                rg.querySelector('.b-val').textContent = '1:' + (sc >= 10000 ? numeroConVirgola(sc / 1000, 0) + 'k' : String(sc));
            }
            const giraMappa2d = (gradi) => { const m = mappaProgetto.mappa; if (m && m.setBearing) m.setBearing(gradi); aggiornaBussola2d(); };
            // l'anello (e il centro) trascinati girano la mappa; un clic al centro rimette il nord in alto
            const angoloBussola2d = (e) => { const r = bussola2d.querySelector('.b-svg').getBoundingClientRect(); return Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI; };
            bussola2d.querySelectorAll('.b-presa-anello, .b-presa-centro').forEach(presa => presa.addEventListener('pointerdown', (e) => {
                const m = mappaProgetto.mappa;
                if (e.button !== 0 || !m) return;
                e.preventDefault(); e.stopPropagation();
                const b0 = m.getBearing ? m.getBearing() : 0, a0 = angoloBussola2d(e), x0 = e.clientX, y0 = e.clientY;
                let mosso = false;
                const muovi = (ev) => {
                    if (!mosso && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 3) return;
                    mosso = true;
                    bussola2d.classList.add('gira');
                    giraMappa2d(b0 + (angoloBussola2d(ev) - a0));
                };
                const fine = () => {
                    window.removeEventListener('pointermove', muovi); window.removeEventListener('pointerup', fine);
                    bussola2d.classList.remove('gira');
                    if (!mosso && presa.classList.contains('b-presa-centro')) giraMappa2d(0);
                };
                window.addEventListener('pointermove', muovi); window.addEventListener('pointerup', fine);
            }));
            bussola2d.addEventListener('click', (e) => {
                const m = mappaProgetto.mappa, g = e.target.closest('[data-gira2d]'), z = e.target.closest('[data-zoom2d]');
                if (!m) return;
                if (g) giraMappa2d((m.getBearing ? m.getBearing() : 0) + Number(g.dataset.gira2d));
                if (z) m.setZoom(m.getZoom() + Number(z.dataset.zoom2d));
            });
            bussola2d.querySelector('[data-trac="zoom2d"]').addEventListener('pointerdown', (e) => {
                const m = mappaProgetto.mappa;
                if (e.button !== 0 || !m) return;
                e.preventDefault(); e.stopPropagation();
                const tr = e.currentTarget, r = tr.getBoundingClientRect(), largo = Math.max(1, r.width - 12);
                const vai = (x) => m.setZoom(Math.round((Z2D[0] + Math.max(0, Math.min(1, (x - r.left - 6) / largo)) * (Z2D[1] - Z2D[0])) * 2) / 2);
                vai(e.clientX);
                const muovi = (ev) => vai(ev.clientX), fine = () => { window.removeEventListener('pointermove', muovi); window.removeEventListener('pointerup', fine); };
                window.addEventListener('pointermove', muovi); window.addEventListener('pointerup', fine);
            });
            // la bussola non deve far partire il trascinamento della mappa sotto
            ['pointerdown', 'mousedown', 'dblclick', 'wheel', 'click'].forEach(t => bussola2d.addEventListener(t, (e) => e.stopPropagation()));
