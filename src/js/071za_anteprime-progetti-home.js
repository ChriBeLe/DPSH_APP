            // ============== LE ANTEPRIME DEI PROGETTI IN HOME (28/11/2026) ==============
            // Richiesta di Romeo: nella Home le anteprime dei progetti prese dalla mappa (una webp
            // leggera) e tre viste da scegliere: «Anteprime» (griglia di card con la miniatura),
            // «Elenco» (le righe di sempre) e «Mappa» (tutti i progetti su una mappa).
            //
            // LA MINIATURA: 360×225 px, webp a qualità 0,6 (di solito 10–30 KB). Le tessere della
            // mappa sono le stesse della mappa del progetto (lo sfondo scelto lì, se è un satellite o
            // una stradale; i WMS no, sono lenti e spesso senza CORS), con sopra un punto per prova.
            // Senza rete, o se le tessere non si possono leggere, si disegna lo stesso con un fondo
            // neutro e i punti: alla prossima occasione con la rete si riprova (una volta per avvio).
            //
            // DOVE STA: NON nei dati del progetto. È una cache di questo dispositivo, in IndexedDB
            // (DPSH_Miniature), con in memoria una copia per disegnare subito. Così non cambia il
            // formato dei dati, non va nei backup né nei pacchetti, non conta come modifica e non
            // entra in Annulla. Su un altro dispositivo si ricrea da sola. La si rifà quando cambia
            // l'impronta: le coordinate delle prove e lo sfondo.
            //
            // ZONA MORTA: renderHomeProjects (pezzo 024) gira anche all'avvio, prima che lo script
            // arrivi qui. Quindi niente const/let a livello di pezzo: lo stato vive in una proprietà
            // della funzione (come datiGrandi, 004g).

            function anteprimeHome() {
                if (!anteprimeHome.dati) {
                    anteprimeHome.dati = {
                        larghezza: 360, altezza: 225,
                        nomeDb: 'DPSH_Miniature',
                        cache: new Map(),          // projId -> { src, impronta, sfondo, il }
                        letta: null,               // promessa della lettura iniziale da IndexedDB
                        coda: [],                  // projId da fare
                        inCorso: false,
                        riprovati: new Set(),      // progetti già riprovati senza sfondo in questo avvio
                        mappa: null,               // la mappa Leaflet della vista «Mappa»
                        livello: null,             // i segnaposto
                        inquadrati: ''             // gli id inquadrati l'ultima volta (si reinquadra solo se cambiano)
                    };
                }
                return anteprimeHome.dati;
            }

            /** Le tre viste. L'etichetta serve ai tasti (aria-label) e all'assistente IA. */
            function vociVistaHome() {
                return [
                    { id: 'griglia', etichetta: 'Anteprime', icona: 'i-image' },
                    { id: 'elenco', etichetta: 'Elenco', icona: 'i-list' },
                    { id: 'mappa', etichetta: 'Mappa', icona: 'i-map' }
                ];
            }
            /** La vista scelta. Come «Ordina», è una preferenza di chi guarda: vive nel browser. */
            function vistaHomeScelta() {
                let v = null;
                try { v = localStorage.getItem('dpsh.vistaHome'); } catch (_) { /* predefinita */ }
                return vociVistaHome().some(o => o.id === v) ? v : 'griglia';
            }
            function scegliVistaHome(v) {
                if (!vociVistaHome().some(o => o.id === v)) return false;
                try { localStorage.setItem('dpsh.vistaHome', v); } catch (_) { /* resta per questa volta */ }
                if (typeof renderHomeProjects === 'function') renderHomeProjects();
                return true;
            }
            /** Le schede «Anteprime | Elenco | Mappa» (le stesse di Conta | Registro: il riquadro scivola). */
            function renderSchedeVistaHome() {
                const box = document.getElementById('homeVistaProgetti');
                if (!box) return;
                const scelta = vistaHomeScelta();
                if (!box.dataset.pronto) {
                    box.innerHTML = vociVistaHome().map(o => `<button type="button" role="tab" data-vista-home="${o.id}" aria-selected="false" aria-label="${o.etichetta}" title="${o.etichetta}"><svg class="ico" aria-hidden="true"><use href="#${o.icona}"/></svg></button>`).join('');
                    box.addEventListener('click', e => {
                        const b = e.target.closest('[data-vista-home]');
                        if (b) scegliVistaHome(b.getAttribute('data-vista-home'));
                    });
                    box.dataset.pronto = '1';
                }
                box.querySelectorAll('[data-vista-home]').forEach(b => {
                    const si = b.getAttribute('data-vista-home') === scelta ? 'true' : 'false';
                    if (b.getAttribute('aria-selected') !== si) b.setAttribute('aria-selected', si);
                });
            }

            // ---- La miniatura ----

            /** Lo sfondo della miniatura: quello della mappa del progetto, se è a tessere; se no il satellite Esri. */
            function sfondoMiniaturaProgetto() {
                const id = (state.settings && state.settings.sfondo2d) || 'esri-satellite';
                try { if (typeof SFONDI_3D !== 'undefined' && SFONDI_3D[id] && SFONDI_3D[id].url) return id; } catch (_) { /* non ancora pronto */ }
                return 'esri-satellite';
            }
            /** I punti delle prove con GPS (una per verticale, come nella figura del report). */
            function puntiMiniaturaProgetto(proj) {
                try { return typeof puntiProveDelProgetto === 'function' ? puntiProveDelProgetto(proj) : []; } catch (_) { return []; }
            }
            /** L'impronta: se cambia, la miniatura va rifatta. */
            function improntaMiniaturaProgetto(proj) {
                const testo = JSON.stringify([sfondoMiniaturaProgetto(), puntiMiniaturaProgetto(proj).map(p => [(+p.lat).toFixed(6), (+p.lng).toFixed(6), String(p.numero || '')])]);
                let h = 5381; for (let i = 0; i < testo.length; i++) h = ((h << 5) + h + testo.charCodeAt(i)) | 0;
                return 'm' + (h >>> 0).toString(36);
            }
            /** Il centro del progetto (media delle prove con GPS), o null. */
            function centroProgettoHome(proj) {
                const p = puntiMiniaturaProgetto(proj);
                if (!p.length) return null;
                return { lat: p.reduce((s, q) => s + (+q.lat), 0) / p.length, lng: p.reduce((s, q) => s + (+q.lng), 0) / p.length };
            }
            /** La miniatura buona di un progetto (o null): solo immagini incorporate, mai indirizzi. */
            function miniaturaProgetto(projId) {
                const m = anteprimeHome().cache.get(projId);
                return m && typeof m.src === 'string' && /^data:image\/(webp|png|jpeg);base64,/.test(m.src) ? m : null;
            }

            function apriDbMiniature() {
                return new Promise((ok, ko) => {
                    if (typeof indexedDB === 'undefined' || !indexedDB) return ko(new Error('IndexedDB assente'));
                    const req = indexedDB.open(anteprimeHome().nomeDb, 1);
                    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('mappe')) req.result.createObjectStore('mappe'); };
                    req.onsuccess = () => ok(req.result);
                    req.onerror = () => ko(req.error);
                });
            }
            /** All'avvio: le miniature salvate tornano in memoria (poche decine di KB l'una). */
            function leggiMiniatureSalvate() {
                const A = anteprimeHome();
                if (A.letta) return A.letta;
                A.letta = apriDbMiniature().then(db => new Promise(ok => {
                    try {
                        const tx = db.transaction('mappe', 'readonly'), st = tx.objectStore('mappe');
                        const req = st.openCursor();
                        req.onsuccess = () => {
                            const c = req.result;
                            if (c) { if (!A.cache.has(c.key)) A.cache.set(c.key, c.value); c.continue(); } else ok();
                        };
                        req.onerror = () => ok();
                    } catch (_) { ok(); }
                    db.close && setTimeout(() => { try { db.close(); } catch (_) { /* già chiuso */ } }, 0);
                })).catch(() => { /* senza IndexedDB restano in memoria per questo avvio */ });
                return A.letta;
            }
            function scriviMiniatura(projId, voce) {
                anteprimeHome().cache.set(projId, voce);
                apriDbMiniature().then(db => {
                    try {
                        const tx = db.transaction('mappe', 'readwrite');
                        tx.objectStore('mappe').put(voce, projId);
                        // Le miniature dei progetti che non ci sono più si tolgono (è solo una cache).
                        const st = tx.objectStore('mappe');
                        const req = st.getAllKeys ? st.getAllKeys() : null;
                        if (req) req.onsuccess = () => (req.result || []).forEach(k => { if (!(state.projects || {})[k]) { st.delete(k); anteprimeHome().cache.delete(k); } });
                        tx.oncomplete = () => db.close();
                    } catch (_) { try { db.close(); } catch (__) { /* niente */ } }
                }).catch(() => { /* resta in memoria */ });
            }

            /** Una tessera come immagine leggibile dal canvas (CORS), o null entro qualche secondo. */
            function caricaTesseraMiniatura(url) {
                return new Promise(ok => {
                    const img = new Image();
                    let fatto = false;
                    const fine = v => { if (!fatto) { fatto = true; ok(v); } };
                    img.crossOrigin = 'anonymous';
                    img.onload = () => fine(img.naturalWidth ? img : null);
                    img.onerror = () => fine(null);
                    setTimeout(() => fine(null), 6000);
                    img.src = url;
                });
            }

            /** Disegna la miniatura di un progetto: tessere (se ci sono) e un punto per prova.
             * Torna { src, sfondo } con src webp (png dove il browser non sa fare webp). */
            async function disegnaMiniaturaProgetto(proj, { conSfondo = true } = {}) {
                const A = anteprimeHome(), W = A.larghezza, H = A.altezza;
                const punti = puntiMiniaturaProgetto(proj);
                if (!punti.length) return null;
                const c = document.createElement('canvas');
                c.width = W; c.height = H;
                const g = c.getContext && c.getContext('2d');
                if (!g) return null;
                const idSfondo = sfondoMiniaturaProgetto();
                const prov = (typeof SFONDI_3D !== 'undefined' && SFONDI_3D[idSfondo]) || null;
                const inq = inquadraturaPerPunti(punti, W, H, Math.min(18, (prov && prov.zoomMax) || 18));
                const fin = calcolaTessereFinestra(inq.centro, inq.zoom, W, H);
                // Il fondo neutro (si vede da solo senza rete): un grigio-verde con una griglia leggera.
                g.fillStyle = '#d9dfd6'; g.fillRect(0, 0, W, H);
                g.strokeStyle = 'rgba(0,0,0,0.07)'; g.lineWidth = 1;
                for (let x = 0; x < W; x += 24) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
                for (let y = 0; y < H; y += 24) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
                let sfondo = false;
                const online = typeof navigator === 'undefined' || navigator.onLine !== false;
                if (conSfondo && prov && online) {
                    const immagini = await Promise.all(fin.tessere.map(t => caricaTesseraMiniatura(prov.url(t.z, t.x, t.y))));
                    let arrivate = 0;
                    immagini.forEach((img, i) => {
                        if (!img) return;
                        try { g.drawImage(img, fin.tessere[i].sinistra, fin.tessere[i].alto, LATO_TESSERA, LATO_TESSERA); arrivate++; } catch (_) { /* tessera non leggibile */ }
                    });
                    sfondo = arrivate === fin.tessere.length && arrivate > 0;
                }
                // Un velo leggero in basso: i punti e le etichette si leggono su ogni sfondo.
                const velo = g.createLinearGradient(0, H * 0.55, 0, H);
                velo.addColorStop(0, 'rgba(0,0,0,0)'); velo.addColorStop(1, 'rgba(0,0,0,0.28)');
                g.fillStyle = velo; g.fillRect(0, 0, W, H);
                punti.forEach(p => {
                    const q = puntoNellaFinestra(p, inq.centro, fin.zoom, W, H);
                    if (!q) return;
                    const x = q.x, y = q.y;
                    g.beginPath(); g.arc(x, y, 6.5, 0, Math.PI * 2);
                    g.fillStyle = '#f59e0b'; g.fill();
                    g.lineWidth = 2.5; g.strokeStyle = '#ffffff'; g.stroke();
                    if (punti.length <= 12 && p.numero !== '') {
                        g.font = 'bold 12px ' + ((typeof getComputedStyle === 'function' && getComputedStyle(document.body).fontFamily) || 'sans-serif');
                        g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.65)'; g.strokeText(String(p.numero), x + 9, y - 6);
                        g.fillStyle = '#ffffff'; g.fillText(String(p.numero), x + 9, y - 6);
                    }
                });
                let src = '';
                try {
                    src = c.toDataURL('image/webp', 0.6);
                    if (src.length > 40000) src = c.toDataURL('image/webp', 0.45);
                    if (!/^data:image\/webp/.test(src)) src = c.toDataURL('image/jpeg', 0.6);
                } catch (e) {
                    // Canvas «sporcato» da una tessera senza CORS: si rifà col solo fondo neutro.
                    if (conSfondo) return disegnaMiniaturaProgetto(proj, { conSfondo: false });
                    return null;
                }
                return /^data:image\//.test(src) ? { src, sfondo } : null;
            }

            /** Mette in coda i progetti senza miniatura (o con l'impronta cambiata). `forza` le rifà tutte. */
            function accodaMiniatureProgetti(ids, forza) {
                const A = anteprimeHome();
                if (/jsdom/i.test((typeof navigator !== 'undefined' && navigator.userAgent) || '')) return 0; // nel banco di prova non si disegna
                let n = 0;
                (ids || []).forEach(id => {
                    const proj = (state.projects || {})[id];
                    if (!proj || A.coda.includes(id)) return;
                    if (!puntiMiniaturaProgetto(proj).length) return;
                    const m = miniaturaProgetto(id);
                    const vecchia = !m || m.impronta !== improntaMiniaturaProgetto(proj);
                    const senzaSfondo = m && !m.sfondo && !A.riprovati.has(id) && (typeof navigator === 'undefined' || navigator.onLine !== false);
                    if (forza || vecchia || senzaSfondo) { A.coda.push(id); n++; }
                });
                if (n) setTimeout(lavoraCodaMiniature, 300);
                return n;
            }
            /** Una miniatura per volta, così la Home resta fluida e la rete non si intasa. */
            async function lavoraCodaMiniature() {
                const A = anteprimeHome();
                if (A.inCorso) return;
                A.inCorso = true;
                try {
                    await leggiMiniatureSalvate();
                    while (A.coda.length) {
                        const id = A.coda.shift(), proj = (state.projects || {})[id];
                        if (!proj) continue;
                        let fatto = null;
                        try { fatto = await disegnaMiniaturaProgetto(proj); } catch (_) { fatto = null; }
                        if (!fatto) continue;
                        if (!fatto.sfondo) A.riprovati.add(id);
                        scriviMiniatura(id, { src: fatto.src, impronta: improntaMiniaturaProgetto(proj), sfondo: fatto.sfondo, il: new Date().toISOString() });
                        mostraMiniaturaNellaHome(id);
                    }
                } finally { A.inCorso = false; }
            }
            /** Rimette la miniatura appena fatta nella card (e nel fumetto della mappa) senza ridisegnare la Home. */
            function mostraMiniaturaNellaHome(projId) {
                const m = miniaturaProgetto(projId);
                if (!m) return;
                document.querySelectorAll('[data-anteprima-progetto]').forEach(el => {
                    if (el.getAttribute('data-anteprima-progetto') !== projId) return;
                    el.innerHTML = `<img src="${m.src}" alt="" decoding="async">`;
                    el.classList.add('con-immagine');
                    el.classList.remove('senza-gps');
                });
            }
            /** Il contenuto del riquadro dell'anteprima, per la card. */
            function htmlAnteprimaProgetto(projId) {
                const proj = (state.projects || {})[projId];
                const m = miniaturaProgetto(projId);
                const id = testoHtml(projId);
                if (m) return `<span class="card-progetto-anteprima con-immagine" data-anteprima-progetto="${id}"><img src="${m.src}" alt="" decoding="async"></span>`;
                if (proj && !puntiMiniaturaProgetto(proj).length) return `<span class="card-progetto-anteprima senza-gps" data-anteprima-progetto="${id}"><svg class="ico" aria-hidden="true"><use href="#i-pin"/></svg><span>Senza GPS</span></span>`;
                return `<span class="card-progetto-anteprima in-attesa" data-anteprima-progetto="${id}"><svg class="ico" aria-hidden="true"><use href="#i-map"/></svg></span>`;
            }

            // ---- La vista «Mappa» ----

            /** La vista «Mappa»: un segnaposto per progetto con GPS (al centro delle sue prove); toccandolo
             * il fumetto ha la miniatura, il nome e «Apri». Sotto, i progetti senza GPS, toccabili. */
            async function renderMappaProgettiHome(visibili) {
                const A = anteprimeHome();
                const box = document.getElementById('homeMappaProgetti');
                const nota = document.getElementById('homeMappaNota');
                if (!box) return;
                const conGps = [], senza = [];
                visibili.forEach(id => { const c = centroProgettoHome(state.projects[id]); if (c) conGps.push({ id, c }); else senza.push(id); });
                if (nota) {
                    nota.innerHTML = senza.length ? `<span>${senza.length === 1 ? '1 progetto senza GPS' : senza.length + ' progetti senza GPS'}:</span> ` + senza.map(id => {
                        const p = state.projects[id];
                        return `<button type="button" class="pillola" data-apri-progetto="${testoHtml(id)}">${testoHtml(p.name || ('Progetto ' + (p.comune || '')))}</button>`;
                    }).join('') : '';
                    nota.style.display = senza.length ? '' : 'none';
                    nota.querySelectorAll('[data-apri-progetto]').forEach(b => b.addEventListener('click', () => openProject(b.getAttribute('data-apri-progetto'), 'project')));
                }
                try { await ensureLeafletLoaded(); } catch (e) {
                    box.innerHTML = `<div class="home-vuota">${testoHtml(e.message || 'La mappa non si è aperta.')}</div>`;
                    return;
                }
                if (vistaHomeScelta() !== 'mappa') return; // nel frattempo si è cambiato vista
                if (!A.mappa || !box.contains(A.mappa.getContainer())) {
                    box.innerHTML = '<div id="homeMappaEl" class="home-mappa-el"></div>';
                    A.mappa = L.map('homeMappaEl', { rotate: false, rotateControl: false, zoomControl: true, attributionControl: true, maxZoom: 20, zoomSnap: 0.5 });
                    try { (typeof livelloSfondo2d === 'function' ? livelloSfondo2d(sfondoMiniaturaProgetto()) : L.tileLayer('')).addTo(A.mappa); } catch (_) { /* senza sfondo si vedono i segnaposto */ }
                    A.livello = L.layerGroup().addTo(A.mappa);
                    A.inquadrati = '';
                }
                A.livello.clearLayers();
                const ids = conGps.map(x => x.id).join('|');
                conGps.forEach(({ id, c }) => {
                    const p = state.projects[id];
                    const st = STATI_PROGETTO.find(s => s.id === p.stato);
                    const nome = p.name || ('Progetto ' + (p.comune || ''));
                    const icona = L.divIcon({ className: 'home-mappa-pin', html: `<span style="--pin: ${st ? st.colore : 'var(--accent)'}"></span>`, iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24] });
                    const mk = L.marker([c.lat, c.lng], { icon: icona, title: nome, keyboard: true }).addTo(A.livello);
                    mk.bindPopup(() => {
                        const div = document.createElement('div');
                        div.className = 'home-mappa-fumetto';
                        const n = proveFisiche(Object.values(p.surveys || {})).length;
                        div.innerHTML = `${htmlAnteprimaProgetto(id)}<strong>${testoHtml(nome)}</strong><span>${testoHtml(p.comune || '')}${p.comune ? ' · ' : ''}${n} ${n === 1 ? 'prova' : 'prove'}</span><button type="button" class="bt bt-principale">Apri</button>`;
                        div.querySelector('button').addEventListener('click', () => openProject(id, 'project'));
                        return div;
                    }, { minWidth: 200, maxWidth: 240 });
                });
                setTimeout(() => {
                    if (!A.mappa) return;
                    A.mappa.invalidateSize();
                    if (A.inquadrati === ids) return;
                    A.inquadrati = ids;
                    if (conGps.length === 1) A.mappa.setView([conGps[0].c.lat, conGps[0].c.lng], 15);
                    else if (conGps.length) A.mappa.fitBounds(L.latLngBounds(conGps.map(x => [x.c.lat, x.c.lng])), { padding: [40, 40], maxZoom: 16 });
                    else A.mappa.setView([42.5, 12.5], 5); // l'Italia, se nessun progetto ha il GPS
                }, 30);
                accodaMiniatureProgetti(conGps.map(x => x.id));
            }

            /** Chiamata da renderHomeProjects dopo aver scelto i progetti visibili: prepara la vista. */
            function preparaVistaHome(visibili) {
                const vista = vistaHomeScelta();
                renderSchedeVistaHome();
                const cont = document.getElementById('homeProjectsContainer');
                const mappaBox = document.getElementById('homeMappaProgetti');
                const nota = document.getElementById('homeMappaNota');
                if (cont) cont.dataset.vista = vista;
                const conMappa = vista === 'mappa' && visibili && visibili.length > 0;
                if (mappaBox) mappaBox.style.display = conMappa ? '' : 'none';
                if (nota && !conMappa) nota.style.display = 'none';
                if (!visibili || !visibili.length) return vista;
                leggiMiniatureSalvate().then(() => visibili.forEach(mostraMiniaturaNellaHome));
                if (vista === 'griglia') accodaMiniatureProgetti(visibili);
                if (conMappa) renderMappaProgettiHome(visibili);
                return vista;
            }

            /** Per l'assistente IA: dove si è e cosa c'è nelle anteprime. */
            function statoAnteprimeHome() {
                const ids = Object.keys(state.projects || {});
                return {
                    vista: vistaHomeScelta(),
                    viste: vociVistaHome().map(v => v.id),
                    progetti: ids.map(id => {
                        const m = miniaturaProgetto(id), c = centroProgettoHome(state.projects[id]);
                        return { id, nome: state.projects[id].name, gps: !!c, centro: c, anteprima: m ? (m.sfondo ? 'con mappa' : 'senza sfondo (manca la rete)') : (c ? 'da fare' : 'senza GPS') };
                    })
                };
            }

            // Le miniature salvate tornano in memoria subito; poi la Home si ridisegna con le viste.
            leggiMiniatureSalvate().then(() => { try { if (typeof renderHomeProjects === 'function') renderHomeProjects(); } catch (_) { /* la Home si ridisegna alla prossima occasione */ } });
