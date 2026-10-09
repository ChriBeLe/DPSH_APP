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
                    taglio: Object.assign({}, vista3d.taglio), livelli: Object.assign({}, vista3d.livelli), tracceNascoste: new Set(vista3d.tracceNascoste), disegno: vista3d.disegno };
                try {
                    vista3d.disegno = null;
                    modifica();
                    return fn();
                } finally {
                    Object.assign(vista3d, { az: prima.az, el: prima.el, ex: prima.ex, zoom: prima.zoom, centro: prima.centro, prospettiva: prima.prospettiva, taglio: prima.taglio, livelli: prima.livelli, tracceNascoste: prima.tracceNascoste, disegno: prima.disegno });
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
                // Lo schermo da sinistra a destra va da A ad A' (az0); si guarda la parte che resta (a
                // sinistra di A→A'), di sbieco quanto basta perché si veda anche il sopra.
                const az0 = Math.atan2(-uy, ux);
                return { az: az0 + ISO_TORSIONE_3D * 0.8, el: 0.5, taglio: { dir: null, pos: 0.5, lato: 1, prof: 0, retta: [a, b] }, solido: true, tracce: t.id };
            }

            /** Il riquadro che occupano sullo schermo le cose che contano (non il terreno, non la bussola). */
            function ingombroScena3d(sc) {
                const fuori = new Set(['vista3d-faccia', 'vista3d-nord', 'vista3d-didascalia', 'vista3d-attribuzione', 'vista3d-nord-terreno', 'vista3d-fantasma']);
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
                return conVista3dTemporanea(() => {
                    vista3d.az = base.az + (reg.dAz || 0);
                    vista3d.el = Math.max(-1.5, Math.min(1.5, base.el + (reg.dEl || 0)));
                    vista3d.zoom = 1; vista3d.centro = [0, 0, 0]; vista3d.prospettiva = false;
                    vista3d.taglio = base.taglio;
                    if (base.solido) vista3d.livelli.solido = true;
                    if (opz && opz.ex) vista3d.ex = opz.ex;
                    if (opz && opz.basemap === false) vista3d.livelli.immagine = false;
                    if (opz && opz.basemap === true) { vista3d.livelli.immagine = true; vista3d.livelli.terreno = true; }
                    if (opz && opz.nordTerreno !== undefined) vista3d.livelli.nordTerreno = !!opz.nordTerreno;
                    if (opz && opz.fantasma !== undefined) vista3d.livelli.fantasma = !!opz.fantasma;
                    if (base.tracce) vista3d.tracceNascoste = new Set(tracceDelProgetto().map(t => t.id).filter(id => id !== base.tracce));
                }, () => {
                    const leggera = !!(opz && opz.leggera);
                    const prima = scena3d(d, W, leggera, true, H), bb = ingombroScena3d(prima);
                    if (bb) {
                        // margini: la bussola in basso a destra, un po' d'aria attorno
                        const mx = W * 0.06, my = H * 0.07, libW = W - 2 * mx - 40, libH = H - 2 * my - 30;
                        const s = Math.max(0.05, Math.min(libW / Math.max(1, bb.x1 - bb.x0), libH / Math.max(1, bb.y1 - bb.y0)));
                        spostaCentroDiPixel3d((bb.x0 + bb.x1) / 2 - (W / 2 - 20), (bb.y0 + bb.y1) / 2 - (H / 2 - 10), prima.k);
                        vista3d.zoom = s;
                    }
                    vista3d.zoom *= reg.zoom || 1;
                    if (reg.dx || reg.dy) spostaCentroDiPixel3d(-(reg.dx || 0), -(reg.dy || 0), prima.k * vista3d.zoom);
                    return scena3d(d, W, leggera, true, H);
                });
            }

            // ---- La mappa di base per le immagini esportate. Quella a schermo si carica senza chiedere il
            // permesso di rileggere le tessere (così vanno anche i servizi che non lo danno): una tela così
            // si mostra ma non si salva. Per esportare si ricarica «con permesso» da chi lo concede (Esri,
            // OpenStreetMap, OpenTopoMap); Google non lo concede: al suo posto l'equivalente di Esri. ----
            const SOSTITUTI_ESPORTA_3D = { 'google-satellite': 'esri-satellite', 'google-ibrida': 'esri-satellite', 'google-strade': 'esri-strade', 'google-rilievo': 'esri-topo' };
            let sfondoEsportabileCache3d = null;
            function sfondoEsportabile3d(d) {
                const sc = sceltaSfondo3d();
                if (!sc.id) return Promise.resolve(null);
                const id = SOSTITUTI_ESPORTA_3D[sc.id] || sc.id, chiave = [sc.id, sc.wmsUrl, sc.wmsLayer].join('|');
                if (sfondoEsportabileCache3d && sfondoEsportabileCache3d.d === d && sfondoEsportabileCache3d.chiave === chiave) return sfondoEsportabileCache3d.promessa;
                const mezzo = d.lato / 2, angoli = [[-mezzo, -mezzo], [mezzo, -mezzo], [mezzo, mezzo], [-mezzo, mezzo]].map(([x, y]) => d.geo(x, y));
                const ovest = Math.min(...angoli.map(g => g.lng)), est = Math.max(...angoli.map(g => g.lng));
                const sud = Math.min(...angoli.map(g => g.lat)), nord = Math.max(...angoli.map(g => g.lat));
                const tela = document.createElement('canvas'), sf = { chiave, tela, caricate: 0, totali: 0, errori: 0, sostituito: id !== sc.id ? id : null };
                const carica = (url, posa) => new Promise(ok => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => { try { posa(img); sf.caricate++; } catch (_) { sf.errori++; } ok(); };
                    img.onerror = () => { sf.errori++; ok(); };
                    img.src = url;
                });
                const lavori = [];
                if (id === 'wms') {
                    const base = sc.wmsUrl.trim();
                    sf.attribuzione = sc.attribuzione || 'WMS';
                    if (base) {
                        tela.width = 2048; tela.height = Math.max(256, Math.min(2048, Math.round(2048 * (nord - sud) / ((est - ovest) * Math.cos((nord + sud) / 2 * Math.PI / 180)))));
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
                        const z = Math.max(1, Math.min(fornitore.zoomMax || 19, Math.floor(Math.log2(2048 / 256 / larghezza0))));
                        const x0 = Math.floor(tessereXDaLng(ovest, z)), x1 = Math.floor(tessereXDaLng(est, z));
                        const y0 = Math.floor(tessereYDaLat(nord, z)), y1 = Math.floor(tessereYDaLat(sud, z));
                        tela.width = (x1 - x0 + 1) * 256; tela.height = (y1 - y0 + 1) * 256;
                        sf.uv = (lat, lng) => [(tessereXDaLng(lng, z) - x0) * 256, (tessereYDaLat(lat, z) - y0) * 256];
                        const g = tela.getContext('2d');
                        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { sf.totali++; lavori.push(carica(fornitore.url(z, x, y), img => g.drawImage(img, (x - x0) * 256, (y - y0) * 256))); }
                    }
                }
                // Al massimo 20 secondi: una tavola può uscire senza qualche tessera, non bloccarsi.
                const promessa = Promise.race([Promise.all(lavori), new Promise(ok => setTimeout(ok, 20000))]).then(() => (sf.uv ? sf : null));
                sfondoEsportabileCache3d = { d, chiave, promessa };
                return promessa;
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
                let svg = svgSezioneTracciata(ds, W).svg;
                if (opz.sfondo === 'scuro') svg = svg.replace(/#(1f2937|111827|334155)/g, '#e5e7eb').replace(/#475569/g, '#94a3b8').replace(/stroke="#fff"/g, 'stroke="#0f172a"');
                const img = await immagineDaSvg3d(svg);
                const sf = opz.basemap !== false ? await sfondoEsportabile3d(d) : null;
                const hPianta = sf ? Math.round(W * 0.26) : 0, gap = sf ? 18 : 0;
                const H = Math.round(img.height * W / img.width) + gap + hPianta;
                const tela = document.createElement('canvas');
                tela.width = Math.round(W * scala); tela.height = Math.round(H * scala);
                const g = tela.getContext('2d');
                g.scale(scala, scala);
                g.fillStyle = col.fondo; g.fillRect(0, 0, W, H);
                g.drawImage(img, 0, 0, W, img.height * W / img.width);
                if (sf) disegnaPiantaTraccia3d(g, d, t, ds, sf, 0, H - hPianta, W, hPianta);
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
            /** La pianta della traccia sulla mappa di base: la traccia in rosso coi nomi agli estremi, le
             * prove col numero (gialle quelle nella sezione), la freccia del Nord. */
            function disegnaPiantaTraccia3d(g, d, t, ds, sf, x, y, w, h) {
                const ga = t.a, gb = t.b, [ua, va] = sf.uv(ga.lat, ga.lng), [ub, vb] = sf.uv(gb.lat, gb.lng);
                const cu = (ua + ub) / 2, cv = (va + vb) / 2, Lp = Math.hypot(ub - ua, vb - va) || 1;
                const k = Math.min(w * 0.8 / Math.max(Lp, 1), h * 0.8 / Math.max(Math.abs(vb - va), 1), w / 60 * 4);
                const S = (u, v) => [x + w / 2 + (u - cu) * k, y + h / 2 + (v - cv) * k];
                g.save();
                g.beginPath(); g.rect(x, y, w, h); g.clip();
                g.fillStyle = '#e5e7eb'; g.fillRect(x, y, w, h);
                const [ox, oy] = S(0, 0);
                g.drawImage(sf.tela, ox, oy, sf.tela.width * k, sf.tela.height * k);
                const [pa, pb] = [S(ua, va), S(ub, vb)];
                g.lineCap = 'round';
                g.strokeStyle = '#000'; g.lineWidth = 6; g.beginPath(); g.moveTo(...pa); g.lineTo(...pb); g.stroke();
                g.strokeStyle = '#dc2626'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(...pa); g.lineTo(...pb); g.stroke();
                const scritta = (s, px, py, size, colore) => { g.font = `800 ${size}px Arial, sans-serif`; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#000'; g.strokeText(s, px, py); g.fillStyle = colore; g.fillText(s, px, py); };
                const nella = new Set(ds.prove.map(q => q.p.s.id));
                d.prove.forEach(p => {
                    const gg = d.geo(p.x, p.y), [u, v] = sf.uv(gg.lat, gg.lng), [px, py] = S(u, v), dentro = nella.has(p.s.id);
                    if (px < x || py < y || px > x + w || py > y + h) return;
                    g.beginPath(); g.arc(px, py, dentro ? 5 : 4, 0, Math.PI * 2); g.fillStyle = dentro ? '#facc15' : '#ffffff'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = '#000'; g.stroke();
                    g.textAlign = 'left'; g.font = '700 11px Arial, sans-serif'; g.lineWidth = 2.5; g.strokeStyle = '#000'; g.strokeText(p.s.header.provaNr || '?', px + 6, py - 6); g.fillStyle = dentro ? '#facc15' : '#fff'; g.fillText(p.s.header.provaNr || '?', px + 6, py - 6);
                });
                const ux = (pb[0] - pa[0]) / (Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1), uy = (pb[1] - pa[1]) / (Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1);
                const [e1, e2] = estremiTraccia(t.nome);
                scritta(e1, pa[0] - ux * 20, pa[1] - uy * 20 + 8, 22, '#fff'); scritta(e2, pb[0] + ux * 20, pb[1] + uy * 20 + 8, 22, '#fff');
                // la freccia del Nord, in alto a destra
                const nx = x + w - 34, ny = y + 46;
                g.beginPath(); g.moveTo(nx, ny - 26); g.lineTo(nx - 10, ny + 6); g.lineTo(nx, ny); g.closePath(); g.fillStyle = '#111827'; g.fill();
                g.beginPath(); g.moveTo(nx, ny - 26); g.lineTo(nx + 10, ny + 6); g.lineTo(nx, ny); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 1; g.strokeStyle = '#111827'; g.stroke();
                scritta('N', nx, ny - 32, 15, '#fff');
                if (sf.attribuzione) { g.font = '10px Arial, sans-serif'; g.textAlign = 'right'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.strokeText(sf.attribuzione, x + w - 6, y + h - 6); g.fillStyle = '#fff'; g.fillText(sf.attribuzione, x + w - 6, y + h - 6); }
                g.restore();
                g.strokeStyle = 'rgba(100,116,139,0.6)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
            }

            /** La tela di una tavola (3D o 2D), pronta per il PDF o per un'immagine. */
            async function telaVoce3d(voce, d, opz) {
                if (voce.tipo === 'sez2d') return telaSezione2d(voce, d, opz);
                const W = opz.W || 1400, H = opz.H || 860;
                const sf = opz.basemap !== false ? await sfondoEsportabile3d(d) : null;
                return conSfondoEsportabile3d(d, sf, () => {
                    let sc = scenaVoce3d(voce, d, W, H, opz);
                    if (!sc) return null;
                    if (opz.legenda !== false) sc = conLegenda3d(sc, d);
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
                const PW = 841.89, PH = 595.28, M = 28;
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
                    const id = idPag(i), alto = 52, basso = 26;
                    const bw = PW - 2 * M, bh = PH - alto - basso - 10, k = Math.min(bw / p.w, bh / p.h), iw = p.w * k, ih = p.h * k;
                    const ix = (PW - iw) / 2, iy = basso + 4 + (bh - ih) / 2;
                    const testo = (s, x, y, dim, grassetto, colore, ancora) => {
                        const dx = ancora === 'end' ? -larghezzaTestoPdf(testoWinAnsi(s), grassetto) * dim : 0;
                        return `BT ${rgb(colore)} rg /${grassetto ? 'F2' : 'F1'} ${n(dim)} Tf 1 0 0 1 ${n(x + dx)} ${n(y)} Tm ${stringa(s)} Tj ET`;
                    };
                    const op = [
                        `${rgb(col.fondo)} rg 0 0 ${PW} ${PH} re f`,
                        testo(p.titolo, M, PH - 34, 15, true, col.testo),
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
            const tavole3d = { voci: [], scelta: 0, regola: {}, escluse: new Set(), formato: 'pdf', sfondo: 'chiaro', trascina: null, attesa: null, lavoro: false };
            const T3 = id => document.getElementById(id);
            const LARGHEZZA_TAVOLA_3D = 1400, ALTEZZA_TAVOLA_3D = 860;

            function memoriaTavole3d() {
                const proj = state.projects[state.currentProjectId];
                if (!proj) return { regola: {}, escluse: [] };
                if (!proj.tavole3d) proj.tavole3d = { regola: {}, escluse: [] };
                return proj.tavole3d;
            }
            function opzioniTavole3d(extra) {
                return Object.assign({
                    sfondo: tavole3d.sfondo, basemap: T3('tavole3dBasemap').checked, legenda: T3('tavole3dLegenda').checked,
                    nordTerreno: T3('tavole3dNordTerreno').checked, fantasma: T3('tavole3dFantasma').checked,
                    ex: Math.max(1, Math.min(50, Number(T3('tavole3dEsag').value) || vista3d.ex)), W: LARGHEZZA_TAVOLA_3D, H: ALTEZZA_TAVOLA_3D
                }, extra || {});
            }
            const tipoTavola3d = v => v.tipo === 'iso' ? 'Modello 3D' : v.tipo === 'sez3d' ? 'Sezione 3D (isometria)' : 'Sezione 2D';
            const sottotitoloTavola3d = (v) => {
                const proj = state.projects[state.currentProjectId] || {};
                const t = v.traccia && tracceDelProgetto().find(x => x.id === v.traccia);
                const dove = [proj.name, proj.comune && proj.comune !== proj.name ? proj.comune : ''].filter(Boolean).join(' · ');
                const cosa = v.tipo === 'iso' ? `esagerazione verticale ×${opzioniTavole3d().ex}` : t && datiVista3dCorrenti ? `traccia lunga ${numeroConVirgola(tracciaInScena(datiVista3dCorrenti, t).L, 0)} m` : '';
                return [dove, cosa].filter(Boolean).join(' · ');
            };

            function apriTavole3d(soloSezioni) {
                const d = datiVista3dCorrenti;
                if (!d) { appAlert('Per le tavole serve la vista 3D: almeno una prova col GPS e con le letture.'); return; }
                const mem = memoriaTavole3d();
                tavole3d.voci = vociEsportazione3d(d);
                tavole3d.regola = mem.regola || {};
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
            }

            /** L'elenco delle pagine: spunta, miniatura, nome e tipo. */
            function renderElencoTavole3d() {
                const box = T3('tavole3dPagine'), esc = escapeHtmlDidascalia;
                box.innerHTML = tavole3d.voci.map((v, i) => `<div class="tavole-pag${i === tavole3d.scelta ? ' scelta' : ''}${tavole3d.escluse.has(v.id) ? ' esclusa' : ''}" data-tavola="${i}" role="button" tabindex="0">
                        <input type="checkbox" data-includi="${i}" ${tavole3d.escluse.has(v.id) ? '' : 'checked'} aria-label="Esporta ${esc(v.titolo)}">
                        <span class="tavole-pag-nome">${i + 1}. ${esc(v.titolo)}</span><span class="tavole-pag-tipo">${tipoTavola3d(v)}</span>
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
                const tela = el.querySelector('canvas');
                const sc = scenaVoce3d(v, d, LARGHEZZA_TAVOLA_3D, ALTEZZA_TAVOLA_3D, opzioniTavole3d({ reg: tavole3d.regola[v.id], leggera: true }));
                if (!sc) return;
                const col = COLORI_ESPORTA_3D[tavole3d.sfondo];
                disegnaScena(tela, sc, { fondo: col.fondo, testo: col.testo, scala: 200 / LARGHEZZA_TAVOLA_3D });
                tela.style.width = ''; tela.style.height = '';
            }
            function aggiornaContoTavole3d() {
                const n = tavole3d.voci.filter(v => !tavole3d.escluse.has(v.id)).length;
                T3('tavole3dConta').textContent = `${n} di ${tavole3d.voci.length}`;
                const f = tavole3d.formato;
                T3('tavole3dRiepilogo').textContent = !n ? 'Nessuna pagina scelta.'
                    : f === 'pdf' ? `${n} ${n === 1 ? 'pagina' : 'pagine'} A4 orizzontali in un PDF solo, nell'ordine dell'elenco.`
                    : `${n} ${n === 1 ? 'immagine' : 'immagini'} ${f.toUpperCase()}${n > 1 ? ' in un file ZIP' : ''}, ${LARGHEZZA_TAVOLA_3D * 2} pixel di larghezza.`;
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
                T3('tavole3dFoglioTit').textContent = v.titolo;
                T3('tavole3dFoglioSotto').textContent = sottotitoloTavola3d(v);
                const proj = state.projects[state.currentProjectId] || {};
                T3('tavole3dPiede').textContent = proj.name || '';
                const esportate = tavole3d.voci.filter(x => !tavole3d.escluse.has(x.id)), pos = esportate.indexOf(v);
                T3('tavole3dNumero').textContent = pos >= 0 ? `${pos + 1} / ${esportate.length}` : 'non esportata';
                document.querySelectorAll('#tavole3dPagine .tavole-pag').forEach(el => el.classList.toggle('scelta', Number(el.dataset.tavola) === tavole3d.scelta));
                const tela = T3('tavole3dTela'), img = T3('tavole3dImg');
                T3('tavole3dRegola').classList.toggle('spenta', v.tipo === 'sez2d');
                if (v.tipo === 'sez2d') {
                    tela.hidden = true; img.hidden = false;
                    const t = tracceDelProgetto().find(x => x.id === v.traccia);
                    let svg = svgSezioneTracciata(datiSezioneTracciata(d, t, sezioniTracciateStato.fascia), 1400).svg;
                    if (scuro) svg = svg.replace(/#(1f2937|111827|334155)/g, '#e5e7eb').replace(/#475569/g, '#94a3b8').replace(/stroke="#fff"/g, 'stroke="#0f172a"');
                    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
                    return;
                }
                tela.hidden = false; img.hidden = true;
                let sc = scenaVoce3d(v, d, LARGHEZZA_TAVOLA_3D, ALTEZZA_TAVOLA_3D, opzioniTavole3d({ reg: tavole3d.regola[v.id], leggera }));
                if (!sc) return;
                if (T3('tavole3dLegenda').checked) sc = conLegenda3d(sc, d);
                const col = COLORI_ESPORTA_3D[tavole3d.sfondo], box = tela.parentElement;
                // grande quanto lo spazio della figura nel foglio, con la sua proporzione
                const k = Math.min((box.clientWidth || 800) / sc.W, (box.clientHeight || 500) / sc.H) || 0.5;
                disegnaScena(tela, sc, { fondo: col.fondo, testo: col.testo, scala: k * (window.devicePixelRatio || 1) });
                tela.style.width = Math.round(sc.W * k) + 'px'; tela.style.height = Math.round(sc.H * k) + 'px';
                tavole3d.ultima = { sc, k };
                // l'immagine sul terreno arriva a pezzi: si ridisegna finché non c'è tutta
                const sf = d._sfondo;
                clearTimeout(tavole3d.attesa);
                if (T3('tavole3dBasemap').checked && sf && sf.caricate + sf.errori < sf.totali) tavole3d.attesa = setTimeout(() => mostraTavola3d(), 500);
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
                        const tela = await telaVoce3d(v, d, opzioniTavole3d({ reg: tavole3d.regola[v.id], scala: 2 }));
                        if (!tela) continue;
                        if (formato === 'pdf') {
                            const jpeg = await byteDaTela3d(tela, 'image/jpeg', 0.9);
                            pagine.push({ titolo: v.titolo, sotto: sottotitoloTavola3d(v), jpeg, w: tela.width, h: tela.height, pxW: tela.width, pxH: tela.height });
                        } else {
                            const byte = await byteDaTela3d(tela, formato === 'png' ? 'image/png' : 'image/jpeg', 0.92);
                            file.push({ name: `${String(file.length + 1).padStart(2, '0')}_${v.titolo.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_')}.${formato}`, bytes: byte });
                        }
                    }
                    if (formato === 'pdf') {
                        const blob = pdfDaTavole3d(pagine, { sfondo: tavole3d.sfondo, titolo: `Tavole 3D — ${proj.name || ''}`, piede: [proj.name, proj.comune && proj.comune !== proj.name ? proj.comune : ''].filter(Boolean).join(' · ') });
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
            ['tavole3dNordTerreno', 'tavole3dFantasma', 'tavole3dLegenda'].forEach(id => T3(id).addEventListener('change', () => { mostraTavola3d(); renderElencoTavole3d(); }));
            T3('tavole3dEsag').addEventListener('change', () => { mostraTavola3d(); renderElencoTavole3d(); });
            T3('tavole3dEsporta').addEventListener('click', esportaTavole3d);
            T3('tavole3dRegola').addEventListener('click', (e) => {
                const b = e.target.closest('[data-regola]');
                if (!b) return;
                const a = b.dataset.regola, grado = Math.PI / 180;
                regolaTavola3d(r => {
                    if (a === 'az-') r.dAz -= 15 * grado; else if (a === 'az+') r.dAz += 15 * grado;
                    else if (a === 'el+') r.dEl += 5 * grado; else if (a === 'el-') r.dEl -= 5 * grado;
                    else if (a === 'zoom+') r.zoom *= 1.15; else if (a === 'zoom-') r.zoom /= 1.15;
                    else Object.assign(r, { dAz: 0, dEl: 0, zoom: 1, dx: 0, dy: 0 });
                });
                mostraTavola3d(); aggiornaMiniaturaScelta3d();
            });
            // Il mouse sulla figura: trascina = gira e inclina; tasto destro, centrale o Maiusc = sposta;
            // rotella = avvicina; doppio clic = di nuovo inquadrata.
            const tela3dT = T3('tavole3dTela');
            tela3dT.addEventListener('contextmenu', e => e.preventDefault());
            tela3dT.addEventListener('pointerdown', (e) => {
                tavole3d.trascina = { x: e.clientX, y: e.clientY, sposta: e.button === 2 || e.button === 1 || e.shiftKey };
                tela3dT.classList.add('trascina');
                try { tela3dT.setPointerCapture(e.pointerId); } catch (_) { /* jsdom */ }
                e.preventDefault();
            });
            tela3dT.addEventListener('pointermove', (e) => {
                const t = tavole3d.trascina;
                if (!t) return;
                const dx = e.clientX - t.x, dy = e.clientY - t.y, k = (tavole3d.ultima && tavole3d.ultima.k) || 1;
                t.x = e.clientX; t.y = e.clientY;
                regolaTavola3d(r => {
                    if (t.sposta) { r.dx += dx / k; r.dy += dy / k; }
                    else { r.dAz -= dx * 0.008; r.dEl = Math.max(-1.4, Math.min(1.4, r.dEl + dy * 0.006)); }
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
