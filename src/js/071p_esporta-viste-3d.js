            // ===================== ESPORTA LE VISTE DEL 3D (come «Esporta immagini» di HyperGram) =====================
            // Le tavole che si scelgono e si esportano insieme, in un PDF solo o in immagini:
            //  - il modello intero in vista isometrica verso Nord e verso Est (prima di tutto, perché chi
            //    guarda capisca com'è il modello);
            //  - per ogni sezione tracciata, la SEZIONE 3D (il corpo solido tagliato lungo la traccia, in
            //    isometria, guardando la faccia del taglio: A a sinistra, A' a destra) e la SEZIONE 2D.
            // Ogni tavola si inquadra da sola (il modello al centro, grande quanto il foglio) e si può
            // girare, inclinare, avvicinare e spostare nell'anteprima, prima di esportare.

            const ISO_EL_3D = Math.atan(1 / Math.SQRT2), ISO_TORSIONE_3D = Math.PI / 6;

            /** Le tavole possibili, in ordine: le due isometriche, poi per ogni traccia la 3D e la 2D. */
            function vociEsportazione3d(d) {
                const voci = [
                    { id: 'iso-n', tipo: 'iso', verso: 'N', titolo: 'Modello · vista isometrica verso Nord' },
                    { id: 'iso-e', tipo: 'iso', verso: 'E', titolo: 'Modello · vista isometrica verso Est' }
                ];
                const solido = d && modelloSolido(d);
                const tracce = tracceDelProgetto().slice().sort((a, b) => {
                    const na = estremiTraccia(a.nome)[0], nb = estremiTraccia(b.nome)[0], ca = /^\d/.test(na), cb = /^\d/.test(nb);
                    return ca === cb ? na.localeCompare(nb, 'it', { numeric: true }) : (ca ? 1 : -1);
                });
                tracce.forEach(t => {
                    if (solido) voci.push({ id: 's3-' + t.id, tipo: 'sez3d', traccia: t.id, titolo: `Sezione 3D ${t.nome}` });
                    voci.push({ id: 's2-' + t.id, tipo: 'sez2d', traccia: t.id, titolo: `Sezione ${t.nome}` });
                });
                return voci;
            }

            /** Esegue fn con la vista 3D cambiata per un momento (punto di vista, tagli, livelli), poi
             * rimette tutto com'era: la vista a schermo non se ne accorge. */
            function conVista3dTemporanea(modifica, fn) {
                const prima = { az: vista3d.az, el: vista3d.el, ex: vista3d.ex, zoom: vista3d.zoom, centro: vista3d.centro.slice(), prospettiva: vista3d.prospettiva,
                    taglio: Object.assign({}, vista3d.taglio), livelli: Object.assign({}, vista3d.livelli), tracceNascoste: new Set(vista3d.tracceNascoste), disegno: vista3d.disegno, postoLegenda: vista3d.postoLegenda, terrenoEsteso: vista3d.terrenoEsteso, scalaTesti: vista3d.scalaTesti, opacitaFoto: vista3d.opacitaFoto, elementi: vista3d.elementi, posizioni: vista3d.posizioni, nordTerrenoPos: vista3d.nordTerrenoPos };
                try {
                    vista3d.disegno = null;
                    modifica();
                    return fn();
                } finally {
                    Object.assign(vista3d, { az: prima.az, el: prima.el, ex: prima.ex, zoom: prima.zoom, centro: prima.centro, prospettiva: prima.prospettiva, taglio: prima.taglio, livelli: prima.livelli, tracceNascoste: prima.tracceNascoste, disegno: prima.disegno, postoLegenda: prima.postoLegenda, terrenoEsteso: prima.terrenoEsteso, scalaTesti: prima.scalaTesti, opacitaFoto: prima.opacitaFoto, elementi: prima.elementi, posizioni: prima.posizioni, nordTerrenoPos: prima.nordTerrenoPos });
                }
            }

            /** Il punto di vista di base di una tavola (prima delle regolazioni dell'utente). */
            function vistaBaseVoce3d(voce, d) {
                const solido = !!modelloSolido(d);
                if (voce.tipo === 'iso') {
                    // Verso Nord: si guarda a Nord (az 0), girati di 30° per vedere due facce; verso Est: az 90°.
                    return { az: (voce.verso === 'E' ? Math.PI / 2 : 0) + ISO_TORSIONE_3D, el: ISO_EL_3D, taglio: { dir: null, pos: 0.5, lato: 1, prof: 0 }, solido, tracce: null };
                }
                const t = tracceDelProgetto().find(x => x.id === voce.traccia);
                if (!t) return null;
                const { a, b, L } = tracciaInScena(d, t), ux = (b[0] - a[0]) / (L || 1), uy = (b[1] - a[1]) / (L || 1);
                // Si guarda di traverso alla traccia, dalla parte di Nord o di Est (come il modello): una
                // traccia Est–Ovest verso Nord, una Nord–Sud verso Est; di sbieco quanto basta perché si
                // veda anche il sopra. Resta la parte verso cui si guarda (il lato lo decide la vista).
                const n1 = [-uy, ux], n2 = [uy, -ux], n = n1[0] + n1[1] >= n2[0] + n2[1] - 1e-9 ? n1 : n2;
                const az0 = Math.atan2(n[0], n[1]);
                return { az: az0 + ISO_TORSIONE_3D * 0.8, el: 0.5, taglio: { dir: null, pos: 0.5, lato: 1, prof: 0, retta: [a, b] }, solido: true, tracce: t.id, sinistra: n1 };
            }

            // LE VISTE PRONTE DELLA TAVOLA (tasti sotto l'anteprima): isometrica e trasversale verso Nord,
            // Est, Sud, Ovest (verso 0–3: dove si guarda), pianta col Nord in alto. Mai dal basso.
            const VERSI_3D = ['Nord', 'Est', 'Sud', 'Ovest'];
            function vistaPronta3dTavola(v) {
                if (v.tipo === 'pianta') return { az: 0, el: Math.PI / 2 };
                const az = (v.verso || 0) * Math.PI / 2;
                return v.tipo === 'trasv' ? { az, el: 0 } : { az: az + Math.PI / 4, el: ISO_EL_3D };
            }
            /** Verso cui guarda una vista (0 = Nord … 3 = Ovest), dall'azimut. */
            const versoDaAz3d = az => ((Math.round(az / (Math.PI / 2)) % 4) + 4) % 4;
            const EL_MAX_3D = Math.PI / 2 - 1e-4;

            /** Il riquadro che occupano sullo schermo le cose che contano (non il terreno, non la bussola). */
            function ingombroScena3d(sc) {
                const fuori = new Set(['vista3d-faccia', 'vista3d-nord', 'vista3d-didascalia', 'vista3d-attribuzione', 'vista3d-nord-terreno', 'vista3d-fantasma', 'vista3d-scala', 'vista3d-legenda']);
                let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
                const pt = (x, y) => { if (!isFinite(x) || !isFinite(y)) return; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
                sc.tutte.forEach(f => {
                    if (fuori.has(f.cls) || (f.op !== undefined && f.op < 0.02)) return;
                    if (f.t === 'poli') f.p.forEach(q => pt(q[0], q[1]));
                    else if (f.t === 'linea') { pt(f.x1, f.y1); pt(f.x2, f.y2); }
                    else if (f.t === 'cerchio') { pt(f.x - f.r, f.y - f.r); pt(f.x + f.r, f.y + f.r); }
                    else if (f.t === 'testo') {
                        const w = String(f.s).length * f.size * 0.62, xa = f.anchor === 'middle' ? f.x - w / 2 : f.anchor === 'end' ? f.x - w : f.x;
                        pt(xa, f.y - f.size); pt(xa + w, f.y + 3);
                    }
                });
                return isFinite(x0) ? { x0, y0, x1, y1 } : null;
            }

            /** Sposta il centro della vista perché quello che sta in (dx, dy) pixel dal centro dello
             * schermo ci finisca sopra (vista senza prospettiva: lo spostamento è esatto). */
            function spostaCentroDiPixel3d(dx, dy, k) {
                const ca = Math.cos(vista3d.az), sa = Math.sin(vista3d.az), ce = Math.cos(vista3d.el), se = Math.sin(vista3d.el);
                const u = dx / k, c = vista3d.centro;
                // in orizzontale lungo l'asse dello schermo; in verticale con la quota (o, guardando quasi
                // dall'alto, in profondità)
                c[0] += u * ca; c[1] -= u * sa;
                if (Math.abs(ce) > 0.25) c[2] -= dy / (vista3d.ex * ce * k);
                else { const v = -dy / (se * k); c[0] += v * sa; c[1] += v * ca; }
            }

            /** La scena di una tavola 3D, inquadrata: il modello al centro, grande quanto il riquadro
             * (lasciando posto alla bussola), più le regolazioni dell'utente (reg: dAz, dEl, zoom, dx, dy). */
            function scenaVoce3d(voce, d, W, H, opz) {
                const base = vistaBaseVoce3d(voce, d);
                if (!base) return null;
                const reg = (opz && opz.reg) || {};
                const pronta = reg.vista ? vistaPronta3dTavola(reg.vista) : base;
                return conVista3dTemporanea(() => {
                    vista3d.az = pronta.az + (reg.dAz || 0);
                    // mai dal basso: dall'orizzonte (trasversale) a dritto in giù (pianta)
                    vista3d.el = Math.max(0, Math.min(EL_MAX_3D, pronta.el + (reg.dEl || 0)));
                    vista3d.zoom = 1; vista3d.centro = [0, 0, 0]; vista3d.prospettiva = false;
                    vista3d.taglio = Object.assign({}, base.taglio);
                    // la sezione 3D: resta la parte verso cui si guarda, comunque giri la vista
                    if (base.sinistra) vista3d.taglio.lato = Math.sin(vista3d.az) * base.sinistra[0] + Math.cos(vista3d.az) * base.sinistra[1] >= 0 ? 1 : -1;
                    if (base.solido) vista3d.livelli.solido = true;
                    if (opz && opz.ex) vista3d.ex = opz.ex;
                    if (opz && opz.scritte) vista3d.scalaTesti = opz.scritte;
                    if (opz && opz.elementi) vista3d.elementi = opz.elementi;
                    if (opz && opz.posizioni) vista3d.posizioni = opz.posizioni;
                    vista3d.nordTerrenoPos = reg.nordTerreno || null;
                    if (opz && opz.basemap === false) vista3d.livelli.immagine = false;
                    if (opz && opz.basemap === true) { vista3d.livelli.immagine = true; vista3d.livelli.terreno = true; }
                    if (opz && opz.nordTerreno !== undefined) vista3d.livelli.nordTerreno = !!opz.nordTerreno;
                    if (opz && opz.fantasma !== undefined) vista3d.livelli.fantasma = !!opz.fantasma;
                    if (opz && opz.fotoSopra !== undefined) vista3d.livelli.fotoSopra = !!opz.fotoSopra;
                    if (opz && opz.spigoli !== undefined) vista3d.livelli.spigoli = !!opz.spigoli;
                    // la mesh (le righe dei triangoli del corpo): nelle tavole solo se la si chiede
                    vista3d.livelli.mesh = !!(opz && opz.mesh);
                    if (opz && opz.tagliaMappa !== undefined) vista3d.livelli.tagliaMappa = !!opz.tagliaMappa;
                    if (opz && opz.opacitaFoto) vista3d.opacitaFoto = opz.opacitaFoto;
                    if (base.tracce) vista3d.tracceNascoste = new Set(tracceDelProgetto().map(t => t.id).filter(id => id !== base.tracce));
                }, () => {
                    const leggera = !!(opz && opz.leggera);
                    const prima = scena3d(d, W, leggera, true, H), bb = ingombroScena3d(prima);
                    if (bb) {
                        // margini: la bussola in basso a destra, la legenda in alto a destra (dentro la
                        // figura: il modello le lascia posto, il foglio resta intero), un po' d'aria attorno
                        let riserva = 0;
                        if (!opz || opz.legenda !== false) {
                            const vl = vociLegenda3d(prima, d), pl = opz && opz.posizioni && opz.posizioni.legenda;
                            if (vl.length) {
                                const m = impaginaLegenda3d(vl, (opz && opz.scritte) || 1);
                                // al suo posto (in alto a destra) le si lascia la striscia; spostata a mano, no
                                if (!pl) riserva = m.w + 20;
                                vista3d.postoLegenda = pl ? { x: pl[0] * W, y: pl[1] * H, w: m.w, h: m.h } : { x: W - m.w - 12, y: 12, w: m.w, h: m.h };
                            }
                        }
                        const mx = W * 0.05, my = H * 0.07, libW = W - 2 * mx - 30 - riserva, libH = H - 2 * my - 30;
                        const s = Math.max(0.05, Math.min(libW / Math.max(1, bb.x1 - bb.x0), libH / Math.max(1, bb.y1 - bb.y0)));
                        // (lo zoom si fa attorno al centro dello schermo: lo scarto dal centro, dopo, è s volte quello di prima)
                        const cxT = (W - riserva) / 2 - 15, cyT = H / 2 - 10;
                        spostaCentroDiPixel3d((bb.x0 + bb.x1) / 2 - (W / 2 + (cxT - W / 2) / s), (bb.y0 + bb.y1) / 2 - (H / 2 + (cyT - H / 2) / s), prima.k);
                        vista3d.zoom = s;
                    }
                    vista3d.zoom *= reg.zoom || 1;
                    if (reg.dx || reg.dy) spostaCentroDiPixel3d(-(reg.dx || 0), -(reg.dy || 0), prima.k * vista3d.zoom);
                    // il terreno esteso: fin dove il foglio lo mostra (al massimo quanto il mosaico largo)
                    if (!opz || opz.terrenoEsteso !== false) {
                        const sfE = opz && opz.sfondoEsteso, tetto = sfE ? MEZZO_ESTESO_3D(d) : d.lato * 3;
                        vista3d.terrenoEsteso = { mezzo: Math.min(tetto, mezzoVisibile3d(W, H, prima.k * vista3d.zoom)), sf: sfE || null };
                    }
                    const sc = scena3d(d, W, leggera, true, H);
                    // il punto di vista della tavola: serve per riportare il mouse sul terreno
                    sc.vista = { az: vista3d.az, el: vista3d.el, centro: vista3d.centro.slice(), ex: vista3d.ex, zRif: (d.zMin + d.zMax) / 2 };
                    return sc;
                });
            }
            /** Il punto del piano delle prove sotto (sx, sy) della tavola (vista senza prospettiva). */
            function puntoTerrenoTavola3d(sc, sx, sy) {
                const v = sc.vista;
                if (!v) return null;
                const ca = Math.cos(v.az), sa = Math.sin(v.az), ce = Math.cos(v.el), se = Math.sin(v.el);
                if (Math.abs(se) < 0.05) return null;
                const X = (sx - sc.W / 2) / sc.k, V = (sy - sc.H / 2) / sc.k, Z = -v.centro[2] * v.ex, Yd = (-V - Z * ce) / se;
                return [v.centro[0] + X * ca + Yd * sa, v.centro[1] - X * sa + Yd * ca];
            }

            // ---- La mappa di base per le immagini esportate. Quella a schermo si carica senza chiedere il
            // permesso di rileggere le tessere (così vanno anche i servizi che non lo danno): una tela così
            // si mostra ma non si salva. Per esportare si ricarica «con permesso» da chi lo concede (Esri,
            // OpenStreetMap, OpenTopoMap); Google non lo concede: al suo posto l'equivalente di Esri. ----
            const SOSTITUTI_ESPORTA_3D = { 'google-satellite': 'esri-satellite', 'google-ibrida': 'esri-satellite', 'google-strade': 'esri-strade', 'google-rilievo': 'esri-topo' };
            /** Un mosaico della mappa di base attorno al centro della scena: «mezzo» metri per lato dal
             * centro, al massimo latoPx pixel, con o senza il permesso di rilettura (per salvarlo serve).
             * Ritorna subito l'oggetto (le tessere arrivano dopo; sf.pronto è la promessa). */
            const mosaiciSfondo3d = new Map();
            function mosaicoSfondo3d(d, mezzo, latoPx, conPermesso) {
                const sc = sceltaSfondo3d();
                if (!sc.id) return null;
                const id = conPermesso ? (SOSTITUTI_ESPORTA_3D[sc.id] || sc.id) : sc.id;
                const chiave = [sc.id, sc.wmsUrl, sc.wmsLayer].join('|'), memo = [chiave, Math.round(mezzo), latoPx, conPermesso ? 1 : 0].join('|');
                const gia = mosaiciSfondo3d.get(memo);
                if (gia && gia.d === d) return gia.sf;
                const angoli = [[-mezzo, -mezzo], [mezzo, -mezzo], [mezzo, mezzo], [-mezzo, mezzo]].map(([x, y]) => d.geo(x, y));
                const ovest = Math.min(...angoli.map(g => g.lng)), est = Math.max(...angoli.map(g => g.lng));
                const sud = Math.min(...angoli.map(g => g.lat)), nord = Math.max(...angoli.map(g => g.lat));
                const tela = document.createElement('canvas'), sf = { chiave, tela, caricate: 0, totali: 0, errori: 0, sostituito: id !== sc.id ? id : null };
                const carica = (url, posa) => new Promise(ok => {
                    const img = new Image();
                    if (conPermesso) img.crossOrigin = 'anonymous';
                    img.onload = () => { try { posa(img); sf.caricate++; } catch (_) { sf.errori++; } ok(); };
                    img.onerror = () => { sf.errori++; ok(); };
                    img.src = url;
                });
                const lavori = [];
                if (id === 'wms') {
                    const base = sc.wmsUrl.trim();
                    sf.attribuzione = sc.attribuzione || 'WMS';
                    if (base) {
                        tela.width = latoPx; tela.height = Math.max(256, Math.min(latoPx, Math.round(latoPx * (nord - sud) / ((est - ovest) * Math.cos((nord + sud) / 2 * Math.PI / 180)))));
                        sf.uv = (lat, lng) => [(lng - ovest) / (est - ovest) * tela.width, (nord - lat) / (nord - sud) * tela.height];
                        const sep = base.indexOf('?') === -1 ? '?' : '&';
                        sf.totali = 1;
                        lavori.push(carica(base + sep + 'service=WMS&version=1.1.1&request=GetMap&srs=EPSG:4326&layers=' + encodeURIComponent(sc.wmsLayer)
                            + `&styles=&format=image/jpeg&transparent=false&width=${tela.width}&height=${tela.height}&bbox=${ovest},${sud},${est},${nord}`, img => tela.getContext('2d').drawImage(img, 0, 0, tela.width, tela.height)));
                    }
                } else {
                    const fornitore = SFONDI_3D[id];
                    if (fornitore) {
                        sf.attribuzione = fornitore.attribuzione;
                        const larghezza0 = tessereXDaLng(est, 0) - tessereXDaLng(ovest, 0);
                        const z = Math.max(1, Math.min(fornitore.zoomMax || 19, Math.floor(Math.log2(latoPx / 256 / larghezza0))));
                        const x0 = Math.floor(tessereXDaLng(ovest, z)), x1 = Math.floor(tessereXDaLng(est, z));
                        const y0 = Math.floor(tessereYDaLat(nord, z)), y1 = Math.floor(tessereYDaLat(sud, z));
                        tela.width = (x1 - x0 + 1) * 256; tela.height = (y1 - y0 + 1) * 256;
                        sf.uv = (lat, lng) => [(tessereXDaLng(lng, z) - x0) * 256, (tessereYDaLat(lat, z) - y0) * 256];
                        const g = tela.getContext('2d');
                        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { sf.totali++; lavori.push(carica(fornitore.url(z, x, y), img => g.drawImage(img, (x - x0) * 256, (y - y0) * 256))); }
                    }
                }
                // Al massimo 20 secondi: una tavola può uscire senza qualche tessera, non bloccarsi.
                sf.pronto = Promise.race([Promise.all(lavori), new Promise(ok => setTimeout(ok, 20000))]).then(() => (sf.uv ? sf : null));
                mosaiciSfondo3d.set(memo, { d, sf });
                return sf;
            }
            /** La mappa di base sotto il terreno vero, salvabile. */
            function sfondoEsportabile3d(d) {
                const sf = mosaicoSfondo3d(d, d.lato / 2, 2048, true);
                return sf ? sf.pronto : Promise.resolve(null);
            }
            /** Quella larga, per il terreno esteso attorno (quattro volte il lato, a grana più grossa). */
            const MEZZO_ESTESO_3D = d => d.lato * 2;
            function sfondoEstesoEsportabile3d(d) {
                const sf = mosaicoSfondo3d(d, MEZZO_ESTESO_3D(d), 3072, true);
                return sf ? sf.pronto : Promise.resolve(null);
            }
            /** Fin dove si vede il piano delle prove nel riquadro (vista senza prospettiva): i quattro angoli
             * del foglio riportati sul piano, la distanza più grande dal centro della scena. */
            function mezzoVisibile3d(W, H, k) {
                const ca = Math.cos(vista3d.az), sa = Math.sin(vista3d.az), ce = Math.cos(vista3d.el), se = Math.sin(vista3d.el);
                if (Math.abs(se) < 0.12) return Infinity;
                const [cx, cy, cz] = vista3d.centro, Z = -cz * vista3d.ex;
                let m = 0;
                [[0, 0], [W, 0], [W, H], [0, H]].forEach(([sx, sy]) => {
                    const X = (sx - W / 2) / k, V = (sy - H / 2) / k, Yd = (-V - Z * ce) / se;
                    m = Math.max(m, Math.abs(cx + X * ca + Yd * sa), Math.abs(cy - X * sa + Yd * ca));
                });
                return m * 1.08;
            }
            /** Con la mappa di base esportabile al posto di quella a schermo, per il tempo di fn. */
            function conSfondoEsportabile3d(d, sf, fn) {
                const prima = d._sfondo;
                if (sf) d._sfondo = sf;
                try { return fn(); } finally { d._sfondo = prima; }
            }

            const COLORI_ESPORTA_3D = { chiaro: { fondo: '#ffffff', testo: '#1f2937', tenue: '#475569' }, scuro: { fondo: '#0f172a', testo: '#e5e7eb', tenue: '#94a3b8' } };

            /** La tavola di una sezione 2D: il disegno della sezione e, sotto, la pianta con la traccia
             * sulla mappa di base (se c'è), su una tela sola. */
            async function telaSezione2d(voce, d, opz) {
                const t = tracceDelProgetto().find(x => x.id === voce.traccia);
                if (!t) return null;
                const col = COLORI_ESPORTA_3D[opz.sfondo] || COLORI_ESPORTA_3D.chiaro, scala = opz.scala || 2;
                const ds = datiSezioneTracciata(d, t, sezioniTracciateStato.fascia);
                const W = opz.W || 1400;
                // le scritte più grandi: la sezione si disegna più stretta e si ingrandisce
                const sez = svgSezioneTracciata(ds, Math.round(W / (opz.scritte || 1)));
                let svg = sez.svg;
                if (opz.sfondo === 'scuro') svg = svg.replace(/#(1f2937|111827|334155)/g, '#e5e7eb').replace(/#475569/g, '#94a3b8').replace(/stroke="#fff"/g, 'stroke="#0f172a"');
                const img = await immagineDaSvg3d(svg);
                // l'ubicazione della sezione (pianta dal satellite): sotto, sopra o niente («Ubicazione»)
                const pos = opz.pianta || 'sotto';
                const sf = opz.basemap !== false && pos !== 'no' ? await sfondoEsportabile3d(d) : null;
                const sfE = sf ? await sfondoEstesoEsportabile3d(d) : null;
                // la pianta girata: la traccia in orizzontale, A sotto A e A' sotto A' della sezione, alla stessa scala
                const asse = { xa: sez.x0 * W / sez.W, xb: sez.x1 * W / sez.W };
                const hPianta = sf ? altezzaPiantaSezione(d, t, asse, W, opz.piantaAltezza) : 0, gap = sf ? 12 : 0, hSez = Math.round(img.height * W / img.width);
                const H = hSez + gap + hPianta;
                const tela = document.createElement('canvas');
                tela.width = Math.round(W * scala); tela.height = Math.round(H * scala);
                const g = tela.getContext('2d');
                g.scale(scala, scala);
                g.fillStyle = col.fondo; g.fillRect(0, 0, W, H);
                g.drawImage(img, 0, pos === 'sopra' && sf ? hPianta + gap : 0, W, hSez);
                if (sf) disegnaPiantaTraccia3d(g, d, t, ds, [sfE, sf], 0, pos === 'sopra' ? 0 : H - hPianta, W, hPianta, opz.nordPianta !== false, asse, opz.piantaZoom);
                return tela;
            }
            function immagineDaSvg3d(svg) {
                return new Promise((ok, ko) => {
                    const img = new Image();
                    img.onload = () => ok(img);
                    img.onerror = () => ko(new Error('Sezione non disegnabile'));
                    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
                });
            }
            /** La pianta girata come la sezione (traccia in orizzontale, A a sinistra) e riadattata perché si
             * vedano la traccia e le prove: i loro estremi lungo la traccia (s) e di lato (n), in metri. */
            function ingombroPiantaSezione(d, t) {
                const { a, b, L } = tracciaInScena(d, t), ux = (b[0] - a[0]) / (L || 1), uy = (b[1] - a[1]) / (L || 1);
                const sn = (X, Y) => [(X - a[0]) * ux + (Y - a[1]) * uy, -(X - a[0]) * uy + (Y - a[1]) * ux];
                const pp = d.prove.map(p => sn(p.x, p.y)).concat([[0, 0], [L, 0]]);
                const s0 = Math.min(...pp.map(q => q[0])), s1 = Math.max(...pp.map(q => q[0])), n0 = Math.min(...pp.map(q => q[1])), n1 = Math.max(...pp.map(q => q[1]));
                const mS = Math.max(4, (s1 - s0) * 0.06), mN = Math.max(4, (n1 - n0) * 0.1);
                return { a, ux, uy, L, sn, s0: s0 - mS, s1: s1 + mS, n0: n0 - mN, n1: n1 + mN };
            }
            /** Quanto è alta la pianta sotto (o sopra) una sezione 2D: quanto serve perché, su tutta la larghezza,
             * ci stiano le prove (tra un settimo e un terzo della larghezza). */
            function altezzaPiantaSezione(d, t, asse, W, alta) {
                // scelta a mano («Altezza della casella»): una frazione della larghezza
                if (alta > 0) return Math.round(W * alta);
                const ig = ingombroPiantaSezione(d, t);
                return Math.round(Math.max(W * 0.14, Math.min(W * 0.34, W * (ig.n1 - ig.n0) / Math.max(1, ig.s1 - ig.s0))));
            }
            /** LA PIANTA DELLA TRACCIA, GIRATA: la foto satellitare ruotata perché la traccia stia in orizzontale
             * (A a sinistra, A' a destra, come nella sezione) e riadattata perché si vedano le prove, su tutta la
             * larghezza. La fascia delle prove proiettate tratteggiata, le prove col numero (gialle quelle nella
             * sezione), la freccia del Nord girata. */
            function disegnaPiantaTraccia3d(g, d, t, ds, sfondi, x, y, w, h, conNord, asse, zoom) {
                sfondi = (Array.isArray(sfondi) ? sfondi : [sfondi]).filter(s => s && s.uv && s.tela);
                void asse;
                const ig = ingombroPiantaSezione(d, t), { a, L } = ig;
                // «Zoom della foto»: 1 = tutte le prove; avvicinando, il centro va verso il mezzo della traccia
                const z = Math.max(0.3, Math.min(8, zoom || 1)), verso = 1 - 1 / Math.max(1, z);
                const k = z * Math.min(w / Math.max(1, ig.s1 - ig.s0), h / Math.max(1, ig.n1 - ig.n0));
                const sc = (ig.s0 + ig.s1) / 2 + (L / 2 - (ig.s0 + ig.s1) / 2) * verso, nc = (ig.n0 + ig.n1) / 2 * (1 - verso);
                // dalla scena (metri, x a Est, y a Nord) al foglio: lungo la traccia a destra, a sinistra della traccia in su
                const S = (X, Y) => { const [s, n] = ig.sn(X, Y); return [x + w / 2 + (s - sc) * k, y + h / 2 - (n - nc) * k]; };
                const [xa, yc] = S(a[0], a[1]), xb = xa + L * k;
                g.save();
                g.beginPath(); g.rect(x, y, w, h); g.clip();
                g.fillStyle = '#d1d5db'; g.fillRect(x, y, w, h);
                // ogni mappa (prima quella larga, poi quella fine): la trasformazione dai suoi pixel al foglio da tre punti
                const lato = Math.max(50, L);
                sfondi.forEach(sf => {
                    const pp = [[a[0], a[1]], [a[0] + lato, a[1]], [a[0], a[1] + lato]];
                    const uv = pp.map(([X, Y]) => { const gg = d.geo(X, Y); return sf.uv(gg.lat, gg.lng); }), sc = pp.map(([X, Y]) => S(X, Y));
                    const du1 = uv[1][0] - uv[0][0], dv1 = uv[1][1] - uv[0][1], du2 = uv[2][0] - uv[0][0], dv2 = uv[2][1] - uv[0][1], det = du1 * dv2 - du2 * dv1;
                    if (Math.abs(det) < 1e-12) return;
                    const dx1 = sc[1][0] - sc[0][0], dy1 = sc[1][1] - sc[0][1], dx2 = sc[2][0] - sc[0][0], dy2 = sc[2][1] - sc[0][1];
                    const m11 = (dx1 * dv2 - dx2 * dv1) / det, m12 = (dx2 * du1 - dx1 * du2) / det, m21 = (dy1 * dv2 - dy2 * dv1) / det, m22 = (dy2 * du1 - dy1 * du2) / det;
                    const tx = sc[0][0] - m11 * uv[0][0] - m12 * uv[0][1], ty = sc[0][1] - m21 * uv[0][0] - m22 * uv[0][1];
                    g.save(); g.transform(m11, m21, m12, m22, tx, ty); g.drawImage(sf.tela, 0, 0); g.restore();
                });
                // la fascia delle prove che si proiettano sulla sezione
                const fascia = sezioniTracciateStato.fascia || 0;
                if (fascia > 0 && fascia * k < h / 2 - 3) {
                    g.save(); g.setLineDash([7, 5]); g.lineWidth = 1.3; g.strokeStyle = 'rgba(255,255,255,0.85)';
                    [-1, 1].forEach(sg => { g.beginPath(); g.moveTo(xa, yc + sg * fascia * k); g.lineTo(xb, yc + sg * fascia * k); g.stroke(); });
                    g.restore();
                }
                g.lineCap = 'round';
                g.strokeStyle = '#000'; g.lineWidth = 6; g.beginPath(); g.moveTo(xa, yc); g.lineTo(xb, yc); g.stroke();
                g.strokeStyle = '#dc2626'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(xa, yc); g.lineTo(xb, yc); g.stroke();
                const scritta = (s, px, py, size, colore, al) => { g.font = `800 ${size}px Arial, sans-serif`; g.textAlign = al || 'center'; g.lineWidth = 3; g.strokeStyle = '#000'; g.strokeText(s, px, py); g.fillStyle = colore; g.fillText(s, px, py); };
                const nella = new Set(ds.prove.map(q => q.p.s.id));
                d.prove.forEach(p => {
                    let [px, py] = S(p.x, p.y);
                    const dentro = nella.has(p.s.id), nr = p.s.header.provaNr || '?';
                    if (px < x || px > x + w) return;
                    // una prova della sezione più lontana di quanto è alta la pianta: sul bordo, con la freccia verso dov'è
                    const fuori = py < y + 8 ? -1 : py > y + h - 8 ? 1 : 0;
                    if (fuori && !dentro) return;
                    if (fuori) {
                        py = fuori < 0 ? y + 9 : y + h - 9;
                        g.beginPath(); g.moveTo(px, py + fuori * 7); g.lineTo(px - 6, py - fuori * 3); g.lineTo(px + 6, py - fuori * 3); g.closePath(); g.fillStyle = '#facc15'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#000'; g.stroke();
                    } else { g.beginPath(); g.arc(px, py, dentro ? 5 : 4, 0, Math.PI * 2); g.fillStyle = dentro ? '#facc15' : '#ffffff'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = '#000'; g.stroke(); }
                    const ty = fuori > 0 ? py - 4 : fuori < 0 ? py + 12 : py - 6;
                    g.textAlign = 'left'; g.font = '700 11px Arial, sans-serif'; g.lineWidth = 2.5; g.strokeStyle = '#000'; g.strokeText(nr, px + 8, ty); g.fillStyle = dentro ? '#facc15' : '#fff'; g.fillText(nr, px + 8, ty);
                });
                const [e1, e2] = estremiTraccia(t.nome);
                g.beginPath(); g.arc(xa, yc, 4, 0, Math.PI * 2); g.arc(xb, yc, 4, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
                scritta(e1, xa, yc - 12, 18, '#fff'); scritta(e2, xb, yc - 12, 18, '#fff');
                // la freccia del Nord, girata come la mappa, in alto a destra (si spegne: «Nord sulla pianta»)
                if (conNord !== false) {
                    const [n0x, n0y] = S(a[0], a[1]), [n1x, n1y] = S(a[0], a[1] + 1), ang = Math.atan2(n1x - n0x, -(n1y - n0y));
                    const nx = x + w - 48, ny = y + Math.min(h / 2, 44);
                    g.save(); g.translate(nx, ny); g.rotate(ang);
                    g.beginPath(); g.moveTo(0, -18); g.lineTo(-8, 10); g.lineTo(0, 5); g.closePath(); g.fillStyle = '#111827'; g.fill();
                    g.beginPath(); g.moveTo(0, -18); g.lineTo(8, 10); g.lineTo(0, 5); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 1; g.strokeStyle = '#111827'; g.stroke();
                    g.restore();
                    scritta('N', nx + Math.sin(ang) * 29, ny - Math.cos(ang) * 29 + 5, 14, '#fff');
                }
                if (sfondi.length) { const at = sfondi[sfondi.length - 1].attribuzione; if (at) { g.font = '10px Arial, sans-serif'; g.textAlign = 'right'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.strokeText(at, x + w - 6, y + h - 6); g.fillStyle = '#fff'; g.fillText(at, x + w - 6, y + h - 6); } }
                g.restore();
                g.strokeStyle = 'rgba(100,116,139,0.6)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
            }

            /** La tela di una tavola (3D o 2D), pronta per il PDF o per un'immagine. */
            async function telaVoce3d(voce, d, opz) {
                if (voce.tipo === 'sez2d') return telaSezione2d(voce, d, opz);
                const W = opz.W || 1400, H = opz.H || 860;
                const sf = opz.basemap !== false ? await sfondoEsportabile3d(d) : null;
                const sfE = opz.basemap !== false ? await sfondoEstesoEsportabile3d(d) : null;
                return conSfondoEsportabile3d(d, sf, () => {
                    let sc = scenaVoce3d(voce, d, W, H, Object.assign({}, opz, { sfondoEsteso: sfE }));
                    if (!sc) return null;
                    if (opz.legenda !== false) sc = conLegenda3d(sc, d, opz.scritte, opz.posizioni && opz.posizioni.legenda);
                    const tela = document.createElement('canvas');
                    disegnaScena(tela, sc, { fondo: (COLORI_ESPORTA_3D[opz.sfondo] || COLORI_ESPORTA_3D.chiaro).fondo, testo: (COLORI_ESPORTA_3D[opz.sfondo] || COLORI_ESPORTA_3D.chiaro).testo, scala: opz.scala || 2 });
                    return tela;
                });
            }

            /** Una tela in byte JPEG (per il PDF) o PNG. */
            function byteDaTela3d(tela, tipo, qualita) {
                return new Promise((ok, ko) => {
                    const fine = blob => blob ? blob.arrayBuffer().then(b => ok(new Uint8Array(b)), ko) : ko(new Error('Immagine vuota'));
                    if (tela.toBlob) tela.toBlob(fine, tipo, qualita);
                    else ko(new Error('Il browser non sa salvare le immagini'));
                });
            }

            /** IL PDF DELLE TAVOLE, scritto a mano come quello del confronto: A4 orizzontale, per ogni
             * pagina il titolo (testo vero, Helvetica), il sottotitolo e la tavola come immagine JPEG,
             * in fondo il progetto e il numero di pagina. pagine: [{ titolo, sotto, jpeg, w, h }]. */
            function pdfDaTavole3d(pagine, opz) {
                const col = COLORI_ESPORTA_3D[opz.sfondo] || COLORI_ESPORTA_3D.chiaro;
                const PW = opz.PW || 841.89, PH = opz.PH || 595.28, M = MARGINE_PDF_3D;
                const n = v => String(Math.round(v * 1000) / 1000);
                const rgb = h => [1, 3, 5].map(i => n(parseInt(h.slice(i, i + 2), 16) / 255)).join(' ');
                const stringa = t => '(' + testoWinAnsi(t).replace(/[\\()]/g, ch => '\\' + ch) + ')';
                const parti = [], posizioni = [];
                let lunghezza = 0;
                const scrivi = x => { const b = typeof x === 'string' ? Uint8Array.from(x, ch => ch.charCodeAt(0) & 255) : x; parti.push(b); lunghezza += b.length; };
                // oggetti: 1 catalogo, 2 pagine, 3 F1, 4 F2, 5 info, poi per pagina: pagina, contenuto, immagine
                const nPag = pagine.length, idPag = i => 6 + i * 3;
                scrivi('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
                const oggetto = (num, corpo, flusso) => {
                    posizioni[num] = lunghezza;
                    scrivi(`${num} 0 obj\n${corpo}`);
                    if (flusso) { scrivi('\nstream\n'); scrivi(flusso); scrivi('\nendstream'); }
                    scrivi('\nendobj\n');
                };
                oggetto(1, '<< /Type /Catalog /Pages 2 0 R >>');
                oggetto(2, `<< /Type /Pages /Kids [${pagine.map((_, i) => idPag(i) + ' 0 R').join(' ')}] /Count ${nPag} >>`);
                oggetto(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
                oggetto(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
                oggetto(5, `<< /Title ${stringa(opz.titolo || 'Viste 3D')} /Producer (DPSH Field Collector) >>`);
                pagine.forEach((p, i) => {
                    const id = idPag(i), alto = altoTitoloPdf3d(!!p.titolo, !!(p.titolo && p.sotto)), basso = BASSO_PDF_3D;
                    const bw = PW - 2 * M, bh = PH - alto - basso - 10, k = Math.min(bw / p.w, bh / p.h), iw = p.w * k, ih = p.h * k;
                    const ix = (PW - iw) / 2, iy = basso + 4 + (bh - ih) / 2;
                    const testo = (s, x, y, dim, grassetto, colore, ancora) => {
                        const dx = ancora === 'end' ? -larghezzaTestoPdf(testoWinAnsi(s), grassetto) * dim : 0;
                        return `BT ${rgb(colore)} rg /${grassetto ? 'F2' : 'F1'} ${n(dim)} Tf 1 0 0 1 ${n(x + dx)} ${n(y)} Tm ${stringa(s)} Tj ET`;
                    };
                    const op = [
                        `${rgb(col.fondo)} rg 0 0 ${PW} ${PH} re f`,
                        p.titolo ? testo(p.titolo, M, PH - 34, 15, true, col.testo) : '',
                        p.sotto ? testo(p.sotto, M, PH - 48, 9, false, col.tenue) : '',
                        `q ${n(iw)} 0 0 ${n(ih)} ${n(ix)} ${n(iy)} cm /Im0 Do Q`,
                        `${rgb(col.tenue)} RG 0.5 w ${M} ${basso + 2} m ${PW - M} ${basso + 2} l S`,
                        opz.piede ? testo(opz.piede, M, 12, 8, false, col.tenue) : '',
                        testo(`${i + 1} / ${nPag}`, PW - M, 12, 8, false, col.tenue, 'end')
                    ].filter(Boolean).join('\n');
                    oggetto(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`);
                    oggetto(id + 1, `<< /Length ${op.length} >>`, op);
                    oggetto(id + 2, `<< /Type /XObject /Subtype /Image /Width ${p.pxW} /Height ${p.pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>`, p.jpeg);
                });
                const totale = 6 + nPag * 3, xref = lunghezza;
                let coda = `xref\n0 ${totale}\n0000000000 65535 f \n`;
                for (let i = 1; i < totale; i++) coda += String(posizioni[i]).padStart(10, '0') + ' 00000 n \n';
                coda += `trailer\n<< /Size ${totale} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
                scrivi(coda);
                return new Blob(parti, { type: 'application/pdf' });
            }

            // ---- LA FINESTRA DELLE TAVOLE ----
            // Lo stato: le tavole, quali si esportano, quale si vede, le regolazioni di ciascuna (ricordate
            // nel progetto, così esportando di nuovo l'inquadratura resta quella scelta) e le opzioni.
            const tavole3d = { voci: [], scelta: 0, regola: {}, titoli: {}, posizioni: {}, pianta: 'sotto', piantaZoom: 1, piantaAltezza: 0, escluse: new Set(), formato: 'pdf', sfondo: 'chiaro', carta: 'A4', verso: 'o', scritte: 1.3, trascina: null, attesa: null, lavoro: false };
            const T3 = id => document.getElementById(id);
            // Il foglio (A4 o A3, orizzontale o verticale) in punti PDF, e la figura in pixel della scena:
            // sempre 1,78 pixel per punto, così una scritta è grande uguale su ogni foglio (su un A3 la
            // figura ha più spazio, non scritte più piccole).
            const PX_PER_PT_3D = 1400 / 785.89, MARGINE_PDF_3D = 28;
            function foglioTavole3d() {
                const [a, b] = tavole3d.carta === 'A3' ? [1190.55, 841.89] : [841.89, 595.28];
                return tavole3d.verso === 'v' ? { PW: b, PH: a } : { PW: a, PH: b };
            }
            const altoTitoloPdf3d = (conTitolo, conSotto) => conTitolo ? (conSotto ? 52 : 40) : 18, BASSO_PDF_3D = 26;
            function misureTavola3d(v) {
                const { PW, PH } = foglioTavole3d(), conTitolo = !v || titoloTavola3d(v) !== null, conSotto = conTitolo && !!(v && sottotitoloTavola3d(v));
                return { W: Math.round((PW - 2 * MARGINE_PDF_3D) * PX_PER_PT_3D), H: Math.round((PH - altoTitoloPdf3d(conTitolo, conSotto) - BASSO_PDF_3D - 10) * PX_PER_PT_3D) };
            }

            function memoriaTavole3d() {
                const proj = state.projects[state.currentProjectId];
                if (!proj) return { regola: {}, escluse: [] };
                if (!proj.tavole3d) proj.tavole3d = { regola: {}, escluse: [] };
                return proj.tavole3d;
            }
            function opzioniTavole3d(extra, v) {
                const { W, H } = misureTavola3d(v), basemap = T3('tavole3dBasemap').checked;
                return Object.assign({
                    sfondo: tavole3d.sfondo, basemap, legenda: T3('tavole3dLegenda').checked,
                    nordTerreno: T3('tavole3dNordTerreno').checked, fantasma: T3('tavole3dFantasma').checked, fotoSopra: basemap && T3('tavole3dFotoSopra').checked, pianta: tavole3d.pianta, piantaZoom: tavole3d.piantaZoom || 1, piantaAltezza: tavole3d.piantaAltezza || 0, spigoli: T3('tavole3dSpigoli').checked, mesh: T3('tavole3dMesh').checked, tagliaMappa: T3('tavole3dTagliaMappa').checked, opacitaFoto: Number(T3('tavole3dOpacitaFoto').value) / 100, scritte: tavole3d.scritte,
                    elementi: { bussola: T3('tavole3dBussola').checked, scala: T3('tavole3dScala').checked }, posizioni: tavole3d.posizioni, nordPianta: T3('tavole3dNordPianta').checked,
                    ex: Math.max(1, Math.min(50, Number(T3('tavole3dEsag').value) || vista3d.ex)), W, H
                }, extra || {});
            }
            /** Per l'anteprima: la mappa larga attorno, senza permesso di rilettura (basta vederla). */
            const sfondoEstesoAnteprima3d = () => T3('tavole3dBasemap').checked && datiVista3dCorrenti ? mosaicoSfondo3d(datiVista3dCorrenti, MEZZO_ESTESO_3D(datiVista3dCorrenti), 3072, false) : null;
            const tipoTavola3d = v => {
                const vs = v.tipo === 'sez2d' ? null : versoTavola3d(v), dir = vs === null ? (v.tipo !== 'sez2d' && (tavole3d.regola[v.id] || {}).vista ? ' · pianta' : '') : ' · verso ' + VERSI_3D[vs];
                return (v.tipo === 'iso' ? 'Modello 3D' : v.tipo === 'sez3d' ? 'Sezione 3D' : 'Sezione 2D') + dir;
            };
            /** Verso dove guarda una pagina 3D (0 Nord … 3 Ovest; null: pianta o sezione 2D). */
            function versoTavola3d(v) {
                const d = datiVista3dCorrenti, r = tavole3d.regola[v.id];
                if (v.tipo === 'sez2d' || !d) return null;
                if (r && r.vista) return r.vista.tipo === 'pianta' ? null : r.vista.verso || 0;
                const base = vistaBaseVoce3d(v, d);
                return base ? versoDaAz3d(base.az + ((r && r.dAz) || 0) - (v.tipo === 'iso' ? ISO_TORSIONE_3D : ISO_TORSIONE_3D * 0.8)) : null;
            }
            /** L'ORDINE DELLE PAGINE: spostate a mano (frecce o trascinandole), «per direzione» (il modello
             * e le sezioni 3D verso Nord, poi verso Est, Sud, Ovest, poi le sezioni 2D) o di partenza. */
            function spostaPagina3d(da, a) {
                if (a < 0 || a >= tavole3d.voci.length || da === a) return;
                const scelta = tavole3d.voci[tavole3d.scelta], [v] = tavole3d.voci.splice(da, 1);
                tavole3d.voci.splice(a, 0, v);
                tavole3d.scelta = Math.max(0, tavole3d.voci.indexOf(scelta));
                salvaMemoriaTavole3d(); renderElencoTavole3d(); mostraTavola3d();
            }
            function ordinaPagine3d(come) {
                const d = datiVista3dCorrenti, scelta = tavole3d.voci[tavole3d.scelta], partenza = vociEsportazione3d(d).map(v => v.id);
                const pos = v => partenza.indexOf(v.id);
                if (come === 'direzione') {
                    const gruppo = v => { if (v.tipo === 'sez2d') return 10; const vs = versoTavola3d(v); return vs === null ? 5 : vs; };
                    tavole3d.voci.sort((a, b) => gruppo(a) - gruppo(b) || (a.tipo === 'iso' ? 0 : 1) - (b.tipo === 'iso' ? 0 : 1) || pos(a) - pos(b));
                } else tavole3d.voci.sort((a, b) => pos(a) - pos(b));
                tavole3d.scelta = Math.max(0, tavole3d.voci.indexOf(scelta));
                salvaMemoriaTavole3d(); renderElencoTavole3d(); mostraTavola3d();
            }
            /** Il sottotitolo: solo quello scritto dall'utente (di base niente). */
            const sottotitoloTavola3d = (v) => {
                const t = tavole3d.titoli[v.id];
                return (t && t.sotto && t.sotto.trim()) || '';
            };

            function apriTavole3d(soloSezioni) {
                const d = datiVista3dCorrenti;
                if (!d) { appAlert('Per le tavole serve la vista 3D: almeno una prova col GPS e con le letture.'); return; }
                const mem = memoriaTavole3d();
                tavole3d.voci = vociEsportazione3d(d);
                // l'ordine scelto l'ultima volta (le pagine nuove in fondo, nel loro ordine)
                if (Array.isArray(mem.ordine)) { const o = mem.ordine, p = v => { const k = o.indexOf(v.id); return k < 0 ? o.length : k; }; tavole3d.voci = tavole3d.voci.map((v, i) => [v, i]).sort((a, b) => p(a[0]) - p(b[0]) || a[1] - b[1]).map(x => x[0]); }
                tavole3d.regola = mem.regola || {};
                tavole3d.titoli = mem.titoli || {};
                tavole3d.voci.forEach(v => aggiornaTitoloVista3d(v));
                Object.assign(tavole3d, { carta: 'A4', verso: 'o', scritte: 1.3 }, mem.foglio || {});
                [['tavole3dCarta', 'carta'], ['tavole3dVerso', 'verso'], ['tavole3dScritte', 'scritte']].forEach(([id, k]) => T3(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(String(b.dataset[k]) === String(tavole3d[k])))));
                tavole3d.escluse = new Set((mem.escluse || []).filter(id => tavole3d.voci.some(v => v.id === id)));
                tavole3d.scelta = soloSezioni ? Math.max(0, tavole3d.voci.findIndex(v => v.tipo !== 'iso')) : 0;
                T3('tavole3dEsag').value = vista3d.ex;
                // La mappa di base: quella scelta nel 3D; se non ce n'è una, il satellite di Esri.
                const sc = sceltaSfondo3d(), sel = T3('tavole3dFornitore'), esc = escapeHtmlDidascalia;
                sel.innerHTML = Object.entries(SFONDI_3D).map(([id, f]) => `<option value="${id}">${esc(f.nome)}${SOSTITUTI_ESPORTA_3D[id] ? ' (nel file: Esri)' : ''}</option>`).join('')
                    + (sc.id === 'wms' ? '<option value="wms">WMS scelto nel 3D</option>' : '');
                sel.value = sc.id || 'esri-satellite';
                T3('tavole3dBasemap').checked = !!sc.id && vista3d.livelli.immagine !== false;
                sel.disabled = !T3('tavole3dBasemap').checked;
                T3('tavole3dNordTerreno').checked = vista3d.livelli.nordTerreno !== false;
                T3('tavole3dFantasma').checked = vista3d.livelli.fantasma !== false;
                T3('tavole3dFotoSopra').checked = !!vista3d.livelli.fotoSopra;
                T3('tavole3dSpigoli').checked = vista3d.livelli.spigoli !== false;
                T3('tavole3dMesh').checked = false;
                T3('tavole3dTagliaMappa').checked = !!vista3d.livelli.tagliaMappa;
                T3('tavole3dOpacitaFoto').value = Math.round((mem.opacitaFoto || vista3d.opacitaFoto || 0.5) * 100);
                T3('tavole3dOpacitaFotoVal').textContent = T3('tavole3dOpacitaFoto').value + '%';
                tavole3d.posizioni = mem.posizioni || {};
                tavole3d.pianta = mem.pianta || 'sotto';
                tavole3d.piantaZoom = mem.piantaZoom || 1; tavole3d.piantaAltezza = mem.piantaAltezza || 0;
                scriviRegolePianta3d();
                T3('tavole3dPiantaPos').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pianta === tavole3d.pianta)));
                const el = mem.elementi || {};
                [['tavole3dLegenda', 'legenda'], ['tavole3dBussola', 'bussola'], ['tavole3dNordTerreno', 'nordTerreno'], ['tavole3dScala', 'scala'], ['tavole3dNordPianta', 'nordPianta'], ['tavole3dFantasma', 'fantasma'], ['tavole3dFotoSopra', 'fotoSopra'], ['tavole3dTagliaMappa', 'tagliaMappa'], ['tavole3dSpigoli', 'spigoli'], ['tavole3dMesh', 'mesh']].forEach(([id, k]) => { if (el[k] !== undefined) T3(id).checked = el[k]; });
                T3('tavole3d').hidden = false;
                renderElencoTavole3d();
                mostraTavola3d();
                setTimeout(() => T3('tavole3dTela').focus(), 0);
            }
            function chiudiTavole3d() {
                if (tavole3d.lavoro) return;
                T3('tavole3d').hidden = true;
                clearTimeout(tavole3d.attesa);
                saveState();
            }
            function salvaMemoriaTavole3d() {
                const mem = memoriaTavole3d();
                mem.regola = tavole3d.regola;
                mem.escluse = [...tavole3d.escluse];
                mem.titoli = tavole3d.titoli;
                mem.foglio = { carta: tavole3d.carta, verso: tavole3d.verso, scritte: tavole3d.scritte };
                mem.posizioni = tavole3d.posizioni;
                mem.ordine = tavole3d.voci.map(v => v.id);
                mem.pianta = tavole3d.pianta;
                mem.piantaZoom = tavole3d.piantaZoom || 1; mem.piantaAltezza = tavole3d.piantaAltezza || 0;
                mem.opacitaFoto = Number(T3('tavole3dOpacitaFoto').value) / 100;
                mem.elementi = { legenda: T3('tavole3dLegenda').checked, bussola: T3('tavole3dBussola').checked, nordTerreno: T3('tavole3dNordTerreno').checked, scala: T3('tavole3dScala').checked, nordPianta: T3('tavole3dNordPianta').checked, fantasma: T3('tavole3dFantasma').checked, fotoSopra: T3('tavole3dFotoSopra').checked, tagliaMappa: T3('tavole3dTagliaMappa').checked, spigoli: T3('tavole3dSpigoli').checked, mesh: T3('tavole3dMesh').checked };
            }
            /** Il titolo di una pagina: quello scritto dall'utente, se no l'automatico; null = senza titolo. */
            function titoloTavola3d(v) {
                const t = tavole3d.titoli[v.id];
                if (t && t.senza) return null;
                return (t && t.testo && t.testo.trim()) || v.titolo;
            }

            /** Il titolo automatico delle pagine del modello segue la vista scelta coi tasti. */
            function aggiornaTitoloVista3d(v) {
                const r = tavole3d.regola[v.id], vv = r && r.vista;
                if (v.tipo !== 'iso') return;
                v.titolo = !vv ? (v.verso === 'E' ? 'Modello · vista isometrica verso Est' : 'Modello · vista isometrica verso Nord')
                    : vv.tipo === 'pianta' ? 'Modello · pianta' : `Modello · vista ${vv.tipo === 'trasv' ? 'trasversale' : 'isometrica'} verso ${VERSI_3D[vv.verso || 0]}`;
            }
            /** Le prove di una sezione 2D (nella finestra delle tavole): quelle vicine alla traccia, con
             * la spunta; tolta, la prova resta fuori (dalla tavola e dalla sezione della scheda Sezioni). */
            function renderProveTavola3d(v) {
                const box = T3('tavole3dProveBox'), t = v && v.tipo === 'sez2d' && tracceDelProgetto().find(x => x.id === v.traccia);
                box.hidden = !t || !datiVista3dCorrenti;
                T3('tavole3dPiantaBox').hidden = box.hidden;
                if (box.hidden) return;
                const ds = datiSezioneTracciata(datiVista3dCorrenti, t, sezioniTracciateStato.fascia), esc = escapeHtmlDidascalia;
                if (document.activeElement !== T3('tavole3dFascia')) T3('tavole3dFascia').value = sezioniTracciateStato.fascia;
                T3('tavole3dProve').innerHTML = ds.vicine.length ? ds.vicine.map(q => `<label><input type="checkbox" data-prova-tavola="${q.p.s.id}"${(t.escluse || []).includes(q.p.s.id) ? '' : ' checked'}>${esc(nomeDpsh(q.p.s))}<span class="t-didascalia">a ${numeroConVirgola(q.lato, 0)} m</span></label>`).join('')
                    : '<span class="t-didascalia">Nessuna prova entro questa distanza dalla traccia.</span>';
            }
            /** I tasti delle viste: quale è accesa sulla pagina scelta, e verso dove. */
            function aggiornaTastiVista3d() {
                const v = tavole3d.voci[tavole3d.scelta], r = v && tavole3d.regola[v.id], vv = r && r.vista;
                document.querySelectorAll('#tavole3dRegola [data-vista]').forEach(b => b.setAttribute('aria-pressed', String(!!vv && vv.tipo === b.dataset.vista)));
                document.querySelectorAll('#tavole3dRegola [data-verso-vista]').forEach(b => { b.textContent = vv && vv.tipo === b.dataset.versoVista ? VERSI_3D[vv.verso || 0] : ''; });
            }
            /** Un tasto di vista: la prima volta la accende (verso dove guarda già la pagina), poi gira
             * Nord → Est → Sud → Ovest. Toglie le regolazioni a mano: la vista è esatta. */
            function scegliVistaTavola3d(tipo) {
                const v = tavole3d.voci[tavole3d.scelta], d = datiVista3dCorrenti;
                if (!v || v.tipo === 'sez2d' || !d) return;
                const r = tavole3d.regola[v.id] || (tavole3d.regola[v.id] = { dAz: 0, dEl: 0, zoom: 1, dx: 0, dy: 0 });
                const prima = r.vista, base = vistaBaseVoce3d(v, d);
                const verso = tipo === 'pianta' ? 0 : prima && prima.tipo === tipo ? ((prima.verso || 0) + 1) % 4
                    : prima && prima.tipo !== 'pianta' ? prima.verso || 0 : versoDaAz3d(base.az + (r.dAz || 0) - (v.tipo === 'iso' ? Math.PI / 4 : 0));
                Object.assign(r, { vista: { tipo, verso }, dAz: 0, dEl: 0, dx: 0, dy: 0 });
                aggiornaTitoloVista3d(v);
                salvaMemoriaTavole3d();
                mostraTavola3d(); aggiornaMiniaturaScelta3d();
                const nome = document.querySelector(`#tavole3dPagine [data-tavola="${tavole3d.scelta}"] .tavole-pag-nome`);
                if (nome) nome.textContent = `${tavole3d.scelta + 1}. ${titoloTavola3d(v) || v.titolo}`;
                const elTipo = document.querySelector(`#tavole3dPagine [data-tavola="${tavole3d.scelta}"] .tavole-pag-tipo`);
                if (elTipo) elTipo.textContent = tipoTavola3d(v);
            }

            /** L'elenco delle pagine: spunta, miniatura, nome e tipo. */
            function renderElencoTavole3d() {
                const box = T3('tavole3dPagine'), esc = escapeHtmlDidascalia;
                box.innerHTML = tavole3d.voci.map((v, i) => `<div class="tavole-pag${i === tavole3d.scelta ? ' scelta' : ''}${tavole3d.escluse.has(v.id) ? ' esclusa' : ''}" data-tavola="${i}" role="button" tabindex="0" draggable="true" title="Trascina per spostare la pagina">
                        <input type="checkbox" data-includi="${i}" ${tavole3d.escluse.has(v.id) ? '' : 'checked'} aria-label="Esporta ${esc(v.titolo)}">
                        <span class="tavole-pag-nome">${i + 1}. ${esc(titoloTavola3d(v) || v.titolo)}</span>
                        <span class="tavole-pag-sposta"><button type="button" data-sposta-pag="-1" title="Più su" aria-label="Sposta su" ${i === 0 ? 'disabled' : ''}>▲</button><button type="button" data-sposta-pag="1" title="Più giù" aria-label="Sposta giù" ${i === tavole3d.voci.length - 1 ? 'disabled' : ''}>▼</button></span>
                        <span class="tavole-pag-tipo">${tipoTavola3d(v)}</span>
                        ${v.tipo === 'sez2d' ? '<img alt="">' : '<canvas></canvas>'}</div>`).join('');
                aggiornaContoTavole3d();
                // le miniature una alla volta, senza bloccare la finestra
                let i = 0;
                const prossima = () => {
                    if (T3('tavole3d').hidden || i >= tavole3d.voci.length) return;
                    const el = box.querySelector(`[data-tavola="${i}"]`);
                    if (el) disegnaMiniaturaTavola3d(tavole3d.voci[i], el);
                    i++;
                    setTimeout(prossima, 0);
                };
                setTimeout(prossima, 30);
            }
            function disegnaMiniaturaTavola3d(v, el) {
                const d = datiVista3dCorrenti;
                if (!d) return;
                if (v.tipo === 'sez2d') {
                    const t = tracceDelProgetto().find(x => x.id === v.traccia);
                    if (!t) return;
                    const img = el.querySelector('img');
                    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgSezioneTracciata(datiSezioneTracciata(d, t, sezioniTracciateStato.fascia), 900).svg);
                    return;
                }
                const tela = el.querySelector('canvas'), opz = opzioniTavole3d({ reg: tavole3d.regola[v.id], leggera: true, sfondoEsteso: sfondoEstesoAnteprima3d() }, v);
                let sc = scenaVoce3d(v, d, opz.W, opz.H, opz);
                if (!sc) return;
                if (opz.legenda) sc = conLegenda3d(sc, d, opz.scritte, opz.posizioni.legenda);
                const col = COLORI_ESPORTA_3D[tavole3d.sfondo];
                disegnaScena(tela, sc, { fondo: col.fondo, testo: col.testo, scala: 200 / opz.W });
                tela.style.aspectRatio = `${opz.W} / ${opz.H}`;
                tela.style.width = ''; tela.style.height = '';
            }
            function aggiornaContoTavole3d() {
                const n = tavole3d.voci.filter(v => !tavole3d.escluse.has(v.id)).length;
                T3('tavole3dConta').textContent = `${n} di ${tavole3d.voci.length}`;
                const f = tavole3d.formato;
                T3('tavole3dRiepilogo').textContent = !n ? 'Nessuna pagina scelta.'
                    : f === 'pdf' ? `${n} ${n === 1 ? 'pagina' : 'pagine'} ${tavole3d.carta} ${tavole3d.verso === 'v' ? (n === 1 ? 'verticale' : 'verticali') : (n === 1 ? 'orizzontale' : 'orizzontali')} in un PDF solo, nell'ordine dell'elenco.`
                    : `${n} ${n === 1 ? 'immagine' : 'immagini'} ${f.toUpperCase()}${n > 1 ? ' in un file ZIP' : ''}, ${misureTavola3d().W * 2} pixel di larghezza (${tavole3d.carta} ${tavole3d.verso === 'v' ? 'verticale' : 'orizzontale'}).`;
                T3('tavole3dEsporta').disabled = !n || tavole3d.lavoro;
                const sc = sceltaSfondo3d();
                const avviso = T3('tavole3dBasemap').checked && SOSTITUTI_ESPORTA_3D[T3('tavole3dFornitore').value]
                    ? 'Google non permette di salvare le sue immagini in un file: nelle tavole esportate al suo posto c\'è l\'equivalente di Esri.' : '';
                T3('tavole3dAvviso').hidden = !avviso;
                T3('tavole3dAvviso').textContent = avviso;
                void sc;
            }

            /** La pagina scelta, in grande: il foglio come uscirà (titolo, figura, piede). */
            function mostraTavola3d(leggera) {
                const v = tavole3d.voci[tavole3d.scelta];
                if (!v) return;
                const d = datiVista3dCorrenti, scuro = tavole3d.sfondo === 'scuro';
                T3('tavole3dNome').textContent = `${tavole3d.scelta + 1} / ${tavole3d.voci.length} · ${v.titolo}`;
                T3('tavole3dPrima').disabled = tavole3d.scelta === 0;
                T3('tavole3dDopo').disabled = tavole3d.scelta === tavole3d.voci.length - 1;
                T3('tavole3dFoglio').classList.toggle('scuro', scuro);
                // il foglio con le sue proporzioni (A4 o A3, orizzontale o verticale), grande quanto lo spazio
                const { PW, PH } = foglioTavole3d(), fb = T3('tavole3dFoglio').parentElement, kf = Math.min(((fb.clientWidth || 900) - 36) / PW, ((fb.clientHeight || 600) - 36) / PH);
                if (kf > 0) { T3('tavole3dFoglio').style.width = Math.round(PW * kf) + 'px'; T3('tavole3dFoglio').style.height = Math.round(PH * kf) + 'px'; }
                const titolo = titoloTavola3d(v);
                T3('tavole3dFoglio').querySelector('.tavole-foglio-tit').hidden = titolo === null;
                T3('tavole3dFoglioTit').textContent = titolo || '';
                T3('tavole3dFoglioSotto').textContent = sottotitoloTavola3d(v);
                T3('tavole3dFoglioSotto').hidden = !sottotitoloTavola3d(v);
                T3('tavole3dSottotitolo').disabled = titolo === null;
                if (document.activeElement !== T3('tavole3dSottotitolo')) T3('tavole3dSottotitolo').value = sottotitoloTavola3d(v);
                T3('tavole3dConTitolo').checked = titolo !== null;
                T3('tavole3dTitolo').disabled = titolo === null;
                T3('tavole3dTitolo').placeholder = v.titolo;
                if (document.activeElement !== T3('tavole3dTitolo')) T3('tavole3dTitolo').value = titolo === null ? '' : titolo;
                T3('tavole3dPiede').textContent = ''; // nel piede solo il numero di pagina, niente nome del progetto
                const esportate = tavole3d.voci.filter(x => !tavole3d.escluse.has(x.id)), pos = esportate.indexOf(v);
                T3('tavole3dNumero').textContent = pos >= 0 ? `${pos + 1} / ${esportate.length}` : 'non esportata';
                document.querySelectorAll('#tavole3dPagine .tavole-pag').forEach(el => el.classList.toggle('scelta', Number(el.dataset.tavola) === tavole3d.scelta));
                const tela = T3('tavole3dTela'), img = T3('tavole3dImg');
                T3('tavole3dRegola').classList.toggle('spenta', v.tipo === 'sez2d');
                renderProveTavola3d(v);
                aggiornaTastiVista3d();
                if (v.tipo === 'sez2d') {
                    tela.hidden = true; img.hidden = false;
                    const t = tracceDelProgetto().find(x => x.id === v.traccia);
                    const sez = svgSezioneTracciata(datiSezioneTracciata(d, t, sezioniTracciateStato.fascia), Math.round(misureTavola3d(v).W / tavole3d.scritte));
                    let svg = sez.svg;
                    if (scuro) svg = svg.replace(/#(1f2937|111827|334155)/g, '#e5e7eb').replace(/#475569/g, '#94a3b8').replace(/stroke="#fff"/g, 'stroke="#0f172a"');
                    // la pianta dal satellite (come nel PDF: sotto, sopra o niente), con l'immagine a schermo
                    const pos = tavole3d.pianta, pianta = T3('tavole3dPianta');
                    const sfP = T3('tavole3dBasemap').checked && pos !== 'no' ? sfondoPerScena(d) : null, sfPE = sfP ? sfondoEstesoAnteprima3d() : null;
                    const box = img.parentElement, ds = datiSezioneTracciata(d, t, sezioniTracciateStato.fascia);
                    pianta.hidden = !(sfP && sfP.uv);
                    box.classList.toggle('con-pianta', !pianta.hidden);
                    box.classList.toggle('pianta-sopra', pos === 'sopra');
                    // grande quanto lo spazio della figura nel foglio, con la sua proporzione (sezione + pianta)
                    const misura = () => {
                        const W0 = img.naturalWidth || 1, Hs = img.naturalHeight || 1, asse = { xa: sez.x0 * W0 / sez.W, xb: sez.x1 * W0 / sez.W }, hP = pianta.hidden ? 0 : altezzaPiantaSezione(d, t, asse, W0, tavole3d.piantaAltezza), gap = pianta.hidden ? 0 : 12;
                        const k = Math.min((box.clientWidth || 800) / W0, (box.clientHeight || 500) / (Hs + gap + hP));
                        img.style.width = Math.round(W0 * k) + 'px'; img.style.height = Math.round(Hs * k) + 'px';
                        if (pianta.hidden) return;
                        const dpr = window.devicePixelRatio || 1;
                        pianta.width = Math.round(W0 * k * dpr); pianta.height = Math.round(hP * k * dpr);
                        pianta.style.width = Math.round(W0 * k) + 'px'; pianta.style.height = Math.round(hP * k) + 'px';
                        pianta.style.margin = pos === 'sopra' ? `0 0 ${Math.round(gap * k)}px` : `${Math.round(gap * k)}px 0 0`;
                        const g = pianta.getContext && pianta.getContext('2d');
                        if (!g) return;
                        g.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
                        g.fillStyle = scuro ? '#0f172a' : '#ffffff'; g.fillRect(0, 0, W0, hP);
                        disegnaPiantaTraccia3d(g, d, t, ds, [sfPE, sfP], 0, 0, W0, hP, T3('tavole3dNordPianta').checked, asse, tavole3d.piantaZoom);
                    };
                    img.onload = misura;
                    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
                    if (img.complete && img.naturalWidth) misura();
                    // le tessere arrivano a pezzi: si ridisegna finché non ci sono tutte
                    clearTimeout(tavole3d.attesa);
                    if ([sfP, sfPE].some(x => x && x.caricate + x.errori < x.totali)) tavole3d.attesa = setTimeout(() => mostraTavola3d(), 600);
                    return;
                }
                tela.hidden = false; img.hidden = true; T3('tavole3dPianta').hidden = true; img.parentElement.classList.remove('con-pianta', 'pianta-sopra');
                const opz = opzioniTavole3d({ reg: tavole3d.regola[v.id], leggera, sfondoEsteso: sfondoEstesoAnteprima3d() }, v);
                let sc = scenaVoce3d(v, d, opz.W, opz.H, opz);
                if (!sc) return;
                if (opz.legenda) sc = conLegenda3d(sc, d, opz.scritte, opz.posizioni.legenda);
                const col = COLORI_ESPORTA_3D[tavole3d.sfondo], box = tela.parentElement;
                // grande quanto lo spazio della figura nel foglio, con la sua proporzione
                const k = Math.min((box.clientWidth || 800) / sc.W, (box.clientHeight || 500) / sc.H) || 0.5;
                disegnaScena(tela, sc, { fondo: col.fondo, testo: col.testo, scala: k * (window.devicePixelRatio || 1) });
                tela.style.width = Math.round(sc.W * k) + 'px'; tela.style.height = Math.round(sc.H * k) + 'px';
                tavole3d.ultima = { sc, k };
                // l'immagine sul terreno arriva a pezzi: si ridisegna finché non c'è tutta
                const inCorso = s => s && s.caricate + s.errori < s.totali;
                clearTimeout(tavole3d.attesa);
                if (T3('tavole3dBasemap').checked && (inCorso(d._sfondo) || inCorso(opz.sfondoEsteso))) tavole3d.attesa = setTimeout(() => mostraTavola3d(), 500);
            }
            function regolaTavola3d(modifica) {
                const v = tavole3d.voci[tavole3d.scelta];
                if (!v || v.tipo === 'sez2d') return;
                const r = tavole3d.regola[v.id] || (tavole3d.regola[v.id] = { dAz: 0, dEl: 0, zoom: 1, dx: 0, dy: 0 });
                modifica(r);
                salvaMemoriaTavole3d();
            }
            let attesaTavola3d = false;
            function ridisegnaTavola3d(leggera) {
                if (attesaTavola3d) return;
                attesaTavola3d = true;
                requestAnimationFrame(() => { attesaTavola3d = false; mostraTavola3d(leggera); });
            }
            function aggiornaMiniaturaScelta3d() {
                const v = tavole3d.voci[tavole3d.scelta], el = document.querySelector(`#tavole3dPagine [data-tavola="${tavole3d.scelta}"]`);
                if (v && el) disegnaMiniaturaTavola3d(v, el);
            }

            /** ESPORTA: le pagine spuntate, nell'ordine, in un PDF o in immagini (una sola: il file; più: ZIP). */
            async function esportaTavole3d() {
                const d = datiVista3dCorrenti, proj = state.projects[state.currentProjectId];
                const voci = tavole3d.voci.filter(v => !tavole3d.escluse.has(v.id));
                if (!d || !proj || !voci.length || tavole3d.lavoro) return;
                tavole3d.lavoro = true;
                const bt = T3('tavole3dEsporta'), lbl = bt.querySelector('span');
                bt.disabled = true;
                const nomeFile = (proj.name || 'progetto').replace(/[^\w\-]+/g, '_'), formato = tavole3d.formato;
                try {
                    if (T3('tavole3dBasemap').checked) lbl.textContent = 'Scarico la mappa di base…';
                    const pagine = [], file = [];
                    for (let i = 0; i < voci.length; i++) {
                        const v = voci[i];
                        lbl.textContent = `Preparo ${i + 1} di ${voci.length}…`;
                        await new Promise(ok => setTimeout(ok, 0));
                        const tela = await telaVoce3d(v, d, opzioniTavole3d({ reg: tavole3d.regola[v.id], scala: 2 }, v));
                        if (!tela) continue;
                        if (formato === 'pdf') {
                            const jpeg = await byteDaTela3d(tela, 'image/jpeg', 0.9);
                            const titolo = titoloTavola3d(v);
                            pagine.push({ titolo, sotto: titolo === null ? null : (sottotitoloTavola3d(v) || null), jpeg, w: tela.width, h: tela.height, pxW: tela.width, pxH: tela.height });
                        } else {
                            const byte = await byteDaTela3d(tela, formato === 'png' ? 'image/png' : 'image/jpeg', 0.92);
                            file.push({ name: `${String(file.length + 1).padStart(2, '0')}_${(titoloTavola3d(v) || v.titolo).replace(/[^\w\-]+/g, '_').replace(/_+/g, '_')}.${formato}`, bytes: byte });
                        }
                    }
                    if (formato === 'pdf') {
                        const blob = pdfDaTavole3d(pagine, Object.assign(foglioTavole3d(), { sfondo: tavole3d.sfondo, titolo: `Tavole 3D — ${proj.name || ''}` }));
                        scaricaBlobFile(blob, `Tavole3D_${nomeFile}.pdf`);
                    } else if (file.length === 1) {
                        scaricaBlobFile(new Blob([file[0].bytes], { type: formato === 'png' ? 'image/png' : 'image/jpeg' }), `${nomeFile}_${file[0].name}`);
                    } else if (file.length) {
                        scaricaBlobFile(buildZipBlob(file), `Tavole3D_${nomeFile}.zip`);
                    }
                    mostraToast(formato === 'pdf' ? `PDF con ${pagine.length} ${pagine.length === 1 ? 'tavola' : 'tavole'} pronto.` : `${file.length} ${file.length === 1 ? 'immagine' : 'immagini'} pronte.`);
                } catch (e) {
                    appAlert('Le tavole non sono uscite: ' + (e && e.message ? e.message : e));
                } finally {
                    tavole3d.lavoro = false;
                    lbl.textContent = 'Esporta';
                    aggiornaContoTavole3d();
                }
            }

            // ---- i comandi ----
            T3('tavole3dChiudi').addEventListener('click', chiudiTavole3d);
            T3('tavole3dAnnulla').addEventListener('click', chiudiTavole3d);
            T3('tavole3d').addEventListener('mousedown', (e) => { if (e.target === T3('tavole3d')) chiudiTavole3d(); });
            // Esc chiude solo la finestra delle tavole, non la mappa sotto.
            document.addEventListener('keydown', (e) => {
                if (T3('tavole3d').hidden) return;
                if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); chiudiTavole3d(); return; }
                if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
                if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); e.stopImmediatePropagation(); T3('tavole3dPrima').click(); }
                else if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); e.stopImmediatePropagation(); T3('tavole3dDopo').click(); }
                else e.stopImmediatePropagation(); // i tasti del 3D (WASD…) restano alla mappa sotto
            }, true);
            T3('tavole3dPrima').addEventListener('click', () => { if (tavole3d.scelta > 0) { tavole3d.scelta--; mostraTavola3d(); } });
            T3('tavole3dDopo').addEventListener('click', () => { if (tavole3d.scelta < tavole3d.voci.length - 1) { tavole3d.scelta++; mostraTavola3d(); } });
            T3('tavole3dPagine').addEventListener('click', (e) => {
                const sp = e.target.closest('[data-sposta-pag]');
                if (sp) { const i = Number(sp.closest('[data-tavola]').dataset.tavola); spostaPagina3d(i, i + Number(sp.dataset.spostaPag)); return; }
                const chk = e.target.closest('[data-includi]');
                if (chk) {
                    const v = tavole3d.voci[Number(chk.dataset.includi)];
                    if (chk.checked) tavole3d.escluse.delete(v.id); else tavole3d.escluse.add(v.id);
                    chk.closest('.tavole-pag').classList.toggle('esclusa', !chk.checked);
                    salvaMemoriaTavole3d(); aggiornaContoTavole3d(); mostraTavola3d();
                    return;
                }
                const el = e.target.closest('[data-tavola]');
                if (el) { tavole3d.scelta = Number(el.dataset.tavola); mostraTavola3d(); }
            });
            // trascinare una pagina nell'elenco: va dove la si lascia (sopra o sotto la riga)
            let pagTrascinata3d = null;
            const pagElenco = e => e.target.closest && e.target.closest('#tavole3dPagine [data-tavola]');
            T3('tavole3dPagine').addEventListener('dragstart', (e) => {
                const el = pagElenco(e);
                if (!el) return;
                pagTrascinata3d = Number(el.dataset.tavola);
                el.classList.add('trascinata');
                try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(pagTrascinata3d)); } catch (_) { /* jsdom */ }
            });
            const sottoMeta3d = (e, el) => { const r = el.getBoundingClientRect(); return e.clientY > r.top + r.height / 2; };
            T3('tavole3dPagine').addEventListener('dragover', (e) => {
                const el = pagElenco(e);
                if (!el || pagTrascinata3d === null) return;
                e.preventDefault();
                T3('tavole3dPagine').querySelectorAll('.qui-sopra, .qui-sotto').forEach(x => x.classList.remove('qui-sopra', 'qui-sotto'));
                el.classList.add(sottoMeta3d(e, el) ? 'qui-sotto' : 'qui-sopra');
            });
            T3('tavole3dPagine').addEventListener('drop', (e) => {
                const el = pagElenco(e);
                if (!el || pagTrascinata3d === null) return;
                e.preventDefault();
                const j = Number(el.dataset.tavola) + (sottoMeta3d(e, el) ? 1 : 0), da = pagTrascinata3d;
                pagTrascinata3d = null;
                spostaPagina3d(da, j > da ? j - 1 : j);
            });
            T3('tavole3dPagine').addEventListener('dragend', () => { pagTrascinata3d = null; T3('tavole3dPagine').querySelectorAll('.trascinata, .qui-sopra, .qui-sotto').forEach(x => x.classList.remove('trascinata', 'qui-sopra', 'qui-sotto')); });
            T3('tavole3dOrdinaDirezione').addEventListener('click', () => ordinaPagine3d('direzione'));
            T3('tavole3dOrdinaPartenza').addEventListener('click', () => ordinaPagine3d('partenza'));
            T3('tavole3dTutte').addEventListener('click', () => { tavole3d.escluse.clear(); salvaMemoriaTavole3d(); renderElencoTavole3d(); mostraTavola3d(); });
            T3('tavole3dNessuna').addEventListener('click', () => { tavole3d.voci.forEach(v => tavole3d.escluse.add(v.id)); salvaMemoriaTavole3d(); renderElencoTavole3d(); mostraTavola3d(); });
            const sceltaTasti3d = (id, chiave) => T3(id).addEventListener('click', (e) => {
                const b = e.target.closest('button');
                if (!b) return;
                T3(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
                tavole3d[chiave] = b.dataset[chiave];
                aggiornaContoTavole3d();
                if (chiave === 'sfondo') { mostraTavola3d(); renderElencoTavole3d(); }
            });
            sceltaTasti3d('tavole3dFormato', 'formato');
            sceltaTasti3d('tavole3dSfondo', 'sfondo');
            // Foglio e scritte: cambiano tutte le pagine (e si ricordano col progetto).
            [['tavole3dCarta', 'carta'], ['tavole3dVerso', 'verso'], ['tavole3dScritte', 'scritte']].forEach(([id, k]) => T3(id).addEventListener('click', (e) => {
                const b = e.target.closest('button');
                if (!b) return;
                T3(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
                tavole3d[k] = k === 'scritte' ? Number(b.dataset[k]) : b.dataset[k];
                salvaMemoriaTavole3d(); aggiornaContoTavole3d(); mostraTavola3d(); renderElencoTavole3d();
            }));
            T3('tavole3dBasemap').addEventListener('change', () => {
                T3('tavole3dFornitore').disabled = !T3('tavole3dBasemap').checked;
                if (T3('tavole3dBasemap').checked && !sceltaSfondo3d().id) { salvaSceltaSfondo3d({ id: T3('tavole3dFornitore').value }); riempiSceltaSfondo3d(); }
                aggiornaContoTavole3d(); mostraTavola3d(); renderElencoTavole3d();
            });
            T3('tavole3dFornitore').addEventListener('change', () => {
                const id = T3('tavole3dFornitore').value;
                if (id !== 'wms') { salvaSceltaSfondo3d({ id }); riempiSceltaSfondo3d(); }
                aggiornaContoTavole3d(); mostraTavola3d(); renderElencoTavole3d();
            });
            ['tavole3dNordTerreno', 'tavole3dFantasma', 'tavole3dLegenda', 'tavole3dBussola', 'tavole3dScala', 'tavole3dNordPianta', 'tavole3dFotoSopra', 'tavole3dTagliaMappa', 'tavole3dSpigoli', 'tavole3dMesh'].forEach(id => T3(id).addEventListener('change', () => { salvaMemoriaTavole3d(); mostraTavola3d(); renderElencoTavole3d(); }));
            T3('tavole3dOpacitaFoto').addEventListener('input', (e) => { T3('tavole3dOpacitaFotoVal').textContent = e.target.value + '%'; salvaMemoriaTavole3d(); ridisegnaTavola3d(); });
            T3('tavole3dOpacitaFoto').addEventListener('change', () => { mostraTavola3d(); renderElencoTavole3d(); });
            T3('tavole3dRiposiziona').addEventListener('click', () => {
                tavole3d.posizioni = {};
                Object.values(tavole3d.regola).forEach(r => { delete r.nordTerreno; });
                salvaMemoriaTavole3d(); mostraTavola3d(); renderElencoTavole3d();
            });
            T3('tavole3dEsag').addEventListener('change', () => { mostraTavola3d(); renderElencoTavole3d(); });
            T3('tavole3dEsporta').addEventListener('click', esportaTavole3d);
            // LA PIANTA DELLA SEZIONE 2D: lo zoom della foto dentro la casella e l'altezza della casella
            // (0 = automatica, quanto serve per le prove); anche con la rotella sulla pianta dell'anteprima.
            function scriviRegolePianta3d() {
                T3('tavole3dPiantaZoom').value = Math.round((tavole3d.piantaZoom || 1) * 100);
                T3('tavole3dPiantaZoomVal').textContent = Math.round((tavole3d.piantaZoom || 1) * 100) + '%';
                T3('tavole3dPiantaAltezza').value = Math.round((tavole3d.piantaAltezza || 0) * 100);
                T3('tavole3dPiantaAltezzaVal').textContent = tavole3d.piantaAltezza ? Math.round(tavole3d.piantaAltezza * 100) + '%' : 'automatica';
            }
            const cambiaPianta3d = () => { scriviRegolePianta3d(); salvaMemoriaTavole3d(); mostraTavola3d(); };
            T3('tavole3dPiantaZoom').addEventListener('input', (e) => { tavole3d.piantaZoom = Number(e.target.value) / 100; cambiaPianta3d(); });
            T3('tavole3dPiantaAltezza').addEventListener('input', (e) => { const v = Number(e.target.value); tavole3d.piantaAltezza = v < 10 ? 0 : v / 100; cambiaPianta3d(); });
            T3('tavole3dPiantaZoomReset').addEventListener('click', () => { tavole3d.piantaZoom = 1; tavole3d.piantaAltezza = 0; cambiaPianta3d(); renderElencoTavole3d(); });
            T3('tavole3dPianta').addEventListener('wheel', (e) => {
                e.preventDefault();
                tavole3d.piantaZoom = Math.max(0.5, Math.min(6, (tavole3d.piantaZoom || 1) * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
                cambiaPianta3d();
            }, { passive: false });
            T3('tavole3dPiantaPos').addEventListener('click', (e) => {
                const b = e.target.closest('[data-pianta]');
                if (!b) return;
                T3('tavole3dPiantaPos').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
                tavole3d.pianta = b.dataset.pianta;
                salvaMemoriaTavole3d(); mostraTavola3d(); renderElencoTavole3d();
            });
            const dopoProveTavola3d = () => {
                saveState(); mostraTavola3d(); aggiornaMiniaturaScelta3d();
                if (sezioniTracciateStato.vista) renderVistaSezioneTracciata();
            };
            T3('tavole3dProve').addEventListener('change', (e) => {
                const chk = e.target.closest('[data-prova-tavola]'), v = tavole3d.voci[tavole3d.scelta];
                const t = chk && v && tracceDelProgetto().find(x => x.id === v.traccia);
                if (!t) return;
                const id = chk.dataset.provaTavola;
                t.escluse = (t.escluse || []).filter(x => x !== id).concat(chk.checked ? [] : [id]);
                dopoProveTavola3d();
            });
            T3('tavole3dFascia').addEventListener('input', (e) => {
                sezioniTracciateStato.fascia = Math.max(0, Number(e.target.value) || 0);
                const f = document.getElementById('numFasciaSezione3d');
                if (f) f.value = sezioniTracciateStato.fascia;
                dopoProveTavola3d();
            });
            // Il titolo della pagina scelta: si scrive (vuoto = automatico), si toglie, «così su tutte».
            const titoloScelta3d = () => { const v = tavole3d.voci[tavole3d.scelta]; return v && (tavole3d.titoli[v.id] || (tavole3d.titoli[v.id] = {})); };
            const dopoTitolo3d = () => {
                const v = tavole3d.voci[tavole3d.scelta], t = v && tavole3d.titoli[v.id];
                if (t && !t.senza && !(t.sotto && t.sotto.trim()) && !(t.testo && t.testo.trim() && t.testo.trim() !== v.titolo)) delete tavole3d.titoli[v.id];
                salvaMemoriaTavole3d(); mostraTavola3d();
                const nome = document.querySelector(`#tavole3dPagine [data-tavola="${tavole3d.scelta}"] .tavole-pag-nome`);
                if (nome && v) nome.textContent = `${tavole3d.scelta + 1}. ${titoloTavola3d(v) || v.titolo}`;
            };
            T3('tavole3dTitolo').addEventListener('input', () => { const t = titoloScelta3d(); if (!t) return; t.testo = T3('tavole3dTitolo').value; dopoTitolo3d(); });
            T3('tavole3dSottotitolo').addEventListener('input', () => { const t = titoloScelta3d(); if (!t) return; t.sotto = T3('tavole3dSottotitolo').value; dopoTitolo3d(); });
            T3('tavole3dConTitolo').addEventListener('change', () => { const t = titoloScelta3d(); if (!t) return; t.senza = !T3('tavole3dConTitolo').checked; dopoTitolo3d(); });
            T3('tavole3dTitoloAuto').addEventListener('click', () => { const v = tavole3d.voci[tavole3d.scelta], t = v && tavole3d.titoli[v.id]; if (!v) return; if (t) { delete t.testo; delete t.senza; } T3('tavole3dTitolo').value = v.titolo; dopoTitolo3d(); });
            T3('tavole3dTitoliTutte').addEventListener('click', () => {
                const senza = !T3('tavole3dConTitolo').checked;
                tavole3d.voci.forEach(v => { const t = tavole3d.titoli[v.id] || (tavole3d.titoli[v.id] = {}); t.senza = senza; if (!senza && !(t.testo && t.testo.trim())) delete tavole3d.titoli[v.id]; });
                salvaMemoriaTavole3d(); renderElencoTavole3d(); mostraTavola3d();
                mostraToast(senza ? 'Tutte le pagine senza titolo' : 'Tutte le pagine col titolo');
            });
            T3('tavole3dRegola').addEventListener('click', (e) => {
                const bv = e.target.closest('[data-vista]');
                if (bv) { scegliVistaTavola3d(bv.dataset.vista); return; }
                const b = e.target.closest('[data-regola]');
                if (!b) return;
                const a = b.dataset.regola, grado = Math.PI / 180;
                regolaTavola3d(r => {
                    if (a === 'az-') r.dAz += 15 * grado; else if (a === 'az+') r.dAz -= 15 * grado; // come la bussola del 3D: antiorario, orario
                    else if (a === 'el+' || a === 'el-') {
                        const v = tavole3d.voci[tavole3d.scelta], el0 = r.vista ? vistaPronta3dTavola(r.vista).el : vistaBaseVoce3d(v, datiVista3dCorrenti).el;
                        r.dEl = Math.max(-el0, Math.min(EL_MAX_3D - el0, r.dEl + (a === 'el+' ? 5 : -5) * grado));
                    }
                    else if (a === 'zoom+') r.zoom *= 1.15; else if (a === 'zoom-') r.zoom /= 1.15;
                    else { Object.assign(r, { dAz: 0, dEl: 0, zoom: 1, dx: 0, dy: 0 }); delete r.vista; }
                });
                if (a === 'reset') { const v = tavole3d.voci[tavole3d.scelta]; if (v) aggiornaTitoloVista3d(v); }
                mostraTavola3d(); aggiornaMiniaturaScelta3d();
            });
            // Il mouse sulla figura: trascina = gira e inclina; tasto destro, centrale o Maiusc = sposta;
            // rotella = avvicina; doppio clic = di nuovo inquadrata.
            const tela3dT = T3('tavole3dTela');
            tela3dT.addEventListener('contextmenu', e => e.preventDefault());
            /** Dove sta il mouse nella tavola (pixel della scena) e quale elemento c'è sotto. */
            function puntoTavola3d(e) {
                const u = tavole3d.ultima;
                if (!u) return null;
                const r = tela3dT.getBoundingClientRect();
                return { x: (e.clientX - r.left) / u.k, y: (e.clientY - r.top) / u.k };
            }
            function elementoSotto3d(q) {
                const u = tavole3d.ultima;
                if (!u || !q) return null;
                const sc = u.sc, el = sc.elementi || {}, dentro = b => b && q.x >= b.x0 && q.x <= b.x1 && q.y >= b.y0 && q.y <= b.y1;
                if (sc.legenda && dentro({ x0: sc.legenda.x, y0: sc.legenda.y, x1: sc.legenda.x + sc.legenda.w, y1: sc.legenda.y + sc.legenda.h })) return 'legenda';
                if (dentro(el.bussola)) return 'bussola';
                if (dentro(el.scala)) return 'scala';
                if (dentro(el.nordTerreno)) return 'nordTerreno';
                return null;
            }
            tela3dT.addEventListener('pointerdown', (e) => {
                const q = puntoTavola3d(e), quale = e.button === 0 && !e.shiftKey ? elementoSotto3d(q) : null;
                tavole3d.trascina = { x: e.clientX, y: e.clientY, sposta: e.button === 2 || e.button === 1 || e.shiftKey };
                if (quale) {
                    // Si sposta un elemento della tavola, non la vista.
                    const sc = tavole3d.ultima.sc, el = sc.elementi || {};
                    const inizio = quale === 'legenda' ? [sc.legenda.x, sc.legenda.y] : quale === 'bussola' ? [(el.bussola.x0 + el.bussola.x1) / 2, (el.bussola.y0 + el.bussola.y1) / 2]
                        : quale === 'scala' ? [el.scala.x0 + 10, el.scala.y0 + 24] : el.nordTerreno.mondo.slice();
                    Object.assign(tavole3d.trascina, { elemento: quale, sc, q0: q, inizio, mondo0: quale === 'nordTerreno' ? puntoTerrenoTavola3d(sc, q.x, q.y) : null });
                }
                tela3dT.classList.add('trascina');
                try { tela3dT.setPointerCapture(e.pointerId); } catch (_) { /* jsdom */ }
                e.preventDefault();
            });
            tela3dT.addEventListener('pointermove', (e) => {
                const t = tavole3d.trascina;
                if (!t) { tela3dT.style.cursor = elementoSotto3d(puntoTavola3d(e)) ? 'move' : ''; return; }
                if (t.elemento) {
                    const q = puntoTavola3d(e), sc = t.sc, v = tavole3d.voci[tavole3d.scelta];
                    if (!q) return;
                    const nx = t.inizio[0] + q.x - t.q0.x, ny = t.inizio[1] + q.y - t.q0.y;
                    if (t.elemento === 'nordTerreno') {
                        const m = puntoTerrenoTavola3d(sc, q.x, q.y);
                        if (m && t.mondo0) regolaTavola3d(r => { r.nordTerreno = [t.inizio[0] + m[0] - t.mondo0[0], t.inizio[1] + m[1] - t.mondo0[1]]; });
                    } else {
                        const fx = Math.max(0, Math.min(1, nx / sc.W)), fy = Math.max(0, Math.min(1, ny / sc.H));
                        tavole3d.posizioni = Object.assign({}, tavole3d.posizioni, { [t.elemento]: [fx, fy] });
                        salvaMemoriaTavole3d();
                    }
                    void v;
                    ridisegnaTavola3d(true);
                    return;
                }
                const dx = e.clientX - t.x, dy = e.clientY - t.y, k = (tavole3d.ultima && tavole3d.ultima.k) || 1;
                t.x = e.clientX; t.y = e.clientY;
                regolaTavola3d(r => {
                    if (t.sposta) { r.dx += dx / k; r.dy += dy / k; }
                    else {
                        // gira e inclina, ma mai sotto l'orizzonte né oltre il dritto in giù
                        const v = tavole3d.voci[tavole3d.scelta], el0 = r.vista ? vistaPronta3dTavola(r.vista).el : vistaBaseVoce3d(v, datiVista3dCorrenti).el;
                        r.dAz += dx * 0.008; r.dEl = Math.max(-el0, Math.min(EL_MAX_3D - el0, r.dEl + dy * 0.006)); // come nel 3D: stessi versi
                    }
                });
                ridisegnaTavola3d(true);
            });
            const fineTrascina3d = () => { if (!tavole3d.trascina) return; tavole3d.trascina = null; tela3dT.classList.remove('trascina'); mostraTavola3d(); aggiornaMiniaturaScelta3d(); };
            tela3dT.addEventListener('pointerup', fineTrascina3d);
            tela3dT.addEventListener('pointercancel', fineTrascina3d);
            tela3dT.addEventListener('wheel', (e) => {
                e.preventDefault();
                regolaTavola3d(r => { r.zoom = Math.max(0.2, Math.min(8, r.zoom * Math.exp(-e.deltaY * 0.0015))); });
                ridisegnaTavola3d(true);
                clearTimeout(tavole3d.rotella);
                tavole3d.rotella = setTimeout(() => { mostraTavola3d(); aggiornaMiniaturaScelta3d(); }, 250);
            }, { passive: false });
            tela3dT.addEventListener('dblclick', () => { regolaTavola3d(r => Object.assign(r, { dAz: 0, dEl: 0, zoom: 1, dx: 0, dy: 0 })); mostraTavola3d(); aggiornaMiniaturaScelta3d(); });
            window.addEventListener('resize', () => { if (!T3('tavole3d').hidden) ridisegnaTavola3d(); });
            // Da dove si apre: il tasto «Tavole» della mappa del progetto e quello della scheda Sezioni.
            T3('btnTavole3d').addEventListener('click', () => apriTavole3d(false));
