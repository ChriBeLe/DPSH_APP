            // VISTA 3D: il terreno del DTM attorno alle prove (ombreggiato, colori per quota, un po'
            // trasparente) con dentro le colonne stratigrafiche «DPSH N», e il modello della
            // correlazione:
            //  - pannelli verticali tra prove vicine (i lati della triangolazione di Delaunay; con prove
            //    in fila, tra una e la successiva), uno per strato con lo stesso nome, che seguono il
            //    terreno come nella sezione;
            //  - superfici di contatto: il tetto di ogni strato presente nelle tre prove di un
            //    triangolo, piano per tre punti; la sua giacitura (immersione/inclinazione, reale, non
            //    esagerata) scritta sopra;
            //  - misure: un'asta graduata delle quote e le distanze tra le prove.
            // Ogni livello si spegne. Tutto in SVG, ordinato dal più lontano al più vicino; mentre si
            // gira si disegna una versione leggera, così il movimento resta fluido. Il modello si
            // scarica anche in OBJ (terreno, colonne, pannelli, superfici) per Blender, MeshLab, QGIS.
            // Senza DTM, come nella sezione: le prove partono tutte dal piano campagna (quota 0, un
            // piano orizzontale), le posizioni vengono dal GPS in UTM.

            const vista3d = { az: -0.6, el: 0.62, ex: 5, zoom: 1, centro: [0, 0, 0], prospettiva: false, fov: 45, trascina: null, mosso: 0,
                livelli: { terreno: true, colonne: true, pannelli: true, superfici: true, giaciture: true, nomiGiaciture: false, falda: true, nomi: true, misure: true, sezioni: true, immagine: true, solido: false },
                proveNascoste: new Set(), stratiNascosti: new Set(),
                // I tagli del modello solido: un piano verticale (dir 'ns' = parete Nord–Sud, 'eo' =
                // Est–Ovest; pos 0–1 sull'estensione; lato = quale metà resta) e uno in profondità (m).
                taglio: { dir: null, pos: 0.5, lato: 1, prof: 0 } };

            /** Triangolazione di Delaunay (Bowyer-Watson) dei punti {x, y}: terne di indici. */
            function triangolaDelaunay(punti) {
                if (punti.length < 3) return [];
                const xs = punti.map(p => p.x), ys = punti.map(p => p.y);
                const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
                const r = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1) * 20;
                const v = punti.concat([{ x: mx - r, y: my - r }, { x: mx + r, y: my - r }, { x: mx, y: my + r }]);
                const n = punti.length;
                const cerchio = (a, b, c) => {
                    const A = v[a], B = v[b], C = v[c], d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
                    if (Math.abs(d) < 1e-12) return { x: 0, y: 0, r2: Infinity };
                    const a2 = A.x * A.x + A.y * A.y, b2 = B.x * B.x + B.y * B.y, c2 = C.x * C.x + C.y * C.y;
                    const x = (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d, y = (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d;
                    return { x, y, r2: (A.x - x) ** 2 + (A.y - y) ** 2 };
                };
                let tri = [[n, n + 1, n + 2]].map(t => ({ t, c: cerchio(...t) }));
                for (let i = 0; i < n; i++) {
                    const p = v[i], cattivi = tri.filter(o => (p.x - o.c.x) ** 2 + (p.y - o.c.y) ** 2 < o.c.r2 - 1e-9);
                    const lati = new Map();
                    cattivi.forEach(o => [[o.t[0], o.t[1]], [o.t[1], o.t[2]], [o.t[2], o.t[0]]].forEach(([a, b]) => {
                        const k = Math.min(a, b) + ',' + Math.max(a, b);
                        lati.set(k, lati.has(k) ? null : [a, b]);
                    }));
                    tri = tri.filter(o => !cattivi.includes(o));
                    lati.forEach(l => { if (l) tri.push({ t: [l[0], l[1], i], c: cerchio(l[0], l[1], i) }); });
                }
                return tri.map(o => o.t).filter(t => t.every(i => i < n)).filter(([a, b, c]) =>
                    Math.abs((v[b].x - v[a].x) * (v[c].y - v[a].y) - (v[c].x - v[a].x) * (v[b].y - v[a].y)) > 1e-6);
            }

            // Coordinate locali in metri, attorno al centro delle prove; z in m s.l.m. (senza DTM, in
            // metri dal piano campagna). null se non c'è nessuna prova da mettere.
            function datiVista3d(proj) {
                if (!proj.dtm) return datiVista3dSenzaDtm(proj);
                const dtm = proj.dtm, q = quoteDtm(dtm);
                const geo = dtm.crs.tipo === 'geo';
                // Le prove eseguite davvero: un'interpretazione alternativa («3B») sta nello stesso punto.
                const prove = proveFisiche(proveConCoordinate(proj).filter(s => (s.logs || []).length > 0)).map(s => {
                    const p = puntoNelCrs(dtm.crs, parseFloat(s.header.lat), parseFloat(s.header.lng));
                    return { s, x: p.x, y: p.y, z: quotaDellaProva(proj, s.header) };
                }).filter(p => p.z !== null);
                const cx = prove.length ? prove.reduce((a, p) => a + p.x, 0) / prove.length : dtm.x0 + dtm.nx * dtm.dx / 2;
                const cy = prove.length ? prove.reduce((a, p) => a + p.y, 0) / prove.length : dtm.y0 - dtm.ny * dtm.dy / 2;
                const kx = geo ? 111320 * Math.cos(cy * Math.PI / 180) : 1, ky = geo ? 110540 : 1;
                const locale = (x, y) => [(x - cx) * kx, (y - cy) * ky];
                const zSuolo = (x, y) => quotaDtmXY(dtm, x / kx + cx, y / ky + cy);
                const provePos = prove.map(p => {
                    const [x, y] = locale(p.x, p.y), fasce = colonnaStratigrafica(p.s.logs, proj.strati);
                    return { ...p, x, y, fasce, fondo: Math.max(0, ...fasce.map(f => f.a)), occ: occorrenzeFasce(fasce) };
                });
                // La scena sta attorno alle prove (con un margine), non su tutto il ritaglio.
                const spread = Math.max(10, ...provePos.map(p => Math.hypot(p.x, p.y)));
                const raggio = provePos.length ? spread + Math.max(20, 0.35 * spread) : Infinity;
                const cella = Math.min(dtm.dx * kx, dtm.dy * ky);
                const griglia = (quanti) => {
                    const g = Math.max(1, Math.ceil(Math.min(Math.max(dtm.nx, dtm.ny), 2 * raggio / cella) / quanti));
                    const nodi = [];
                    for (let j = 0; j < dtm.ny; j += g) {
                        const riga = [];
                        for (let i = 0; i < dtm.nx; i += g) {
                            const [x, y] = locale(dtm.x0 + (i + 0.5) * dtm.dx, dtm.y0 - (j + 0.5) * dtm.dy);
                            if (Math.abs(x) > raggio || Math.abs(y) > raggio) continue;
                            riga.push([x, y, q[j * dtm.nx + i]]);
                        }
                        if (riga.length) nodi.push(riga);
                    }
                    return nodi;
                };
                const nodi = griglia(56);
                const zs = nodi.flat().map(n => n[2]).filter(isFinite);
                return {
                    nodi, nodiLeggeri: griglia(28), zSuolo, cx, cy, crs: dtm.crs,
                    geo: (x, y) => geo ? { lat: y / ky + cy, lng: x / kx + cx } : geoDaUtm(x / kx + cx, y / ky + cy, dtm.crs.zona),
                    daGeo: (lat, lng) => { const p = puntoNelCrs(dtm.crs, lat, lng); return locale(p.x, p.y); },
                    zMin: Math.min(...zs), zMax: Math.max(...zs), prove: provePos, ...latiDelleProve(provePos),
                    lato: isFinite(raggio) ? 2 * raggio : Math.max(dtm.nx * dtm.dx * kx, dtm.ny * dtm.dy * ky)
                };
            }

            /** Senza DTM: prove dal GPS (UTM della prima), tutte a quota 0, su un piano orizzontale. */
            function datiVista3dSenzaDtm(proj) {
                const conGps = proveFisiche(proveConCoordinate(proj).filter(s => (s.logs || []).length > 0));
                if (!conGps.length) return null;
                const crs = { tipo: 'utm', zona: Math.floor((parseFloat(conGps[0].header.lng) + 180) / 6) + 1 };
                const prove = conGps.map(s => ({ s, ...puntoNelCrs(crs, parseFloat(s.header.lat), parseFloat(s.header.lng)), z: 0 }));
                const cx = prove.reduce((a, p) => a + p.x, 0) / prove.length, cy = prove.reduce((a, p) => a + p.y, 0) / prove.length;
                const provePos = prove.map(p => {
                    const fasce = colonnaStratigrafica(p.s.logs, proj.strati);
                    return { ...p, x: p.x - cx, y: p.y - cy, fasce, fondo: Math.max(0, ...fasce.map(f => f.a)), occ: occorrenzeFasce(fasce) };
                });
                const spread = Math.max(10, ...provePos.map(p => Math.hypot(p.x, p.y)));
                const raggio = spread + Math.max(20, 0.35 * spread);
                // Il piano a quadretti: uno solo coprirebbe le colonne nell'ordine dal più lontano.
                const griglia = (quanti) => {
                    const nodi = [];
                    for (let j = 0; j <= quanti; j++) {
                        const riga = [];
                        for (let i = 0; i <= quanti; i++) riga.push([-raggio + 2 * raggio * i / quanti, raggio - 2 * raggio * j / quanti, 0]);
                        nodi.push(riga);
                    }
                    return nodi;
                };
                return {
                    nodi: griglia(24), nodiLeggeri: griglia(12), zSuolo: () => 0, cx, cy, crs, senzaDtm: true,
                    geo: (x, y) => geoDaUtm(x + cx, y + cy, crs.zona),
                    daGeo: (lat, lng) => { const p = puntoNelCrs(crs, lat, lng); return [p.x - cx, p.y - cy]; },
                    zMin: 0, zMax: 0, prove: provePos, ...latiDelleProve(provePos), lato: 2 * raggio
                };
            }

            /** Triangoli e lati tra le prove; con prove in fila, la catena lungo la direzione principale. */
            function latiDelleProve(provePos) {
                const triangoli = triangolaDelaunay(provePos);
                let lati = [];
                if (triangoli.length) {
                    const visti = new Set();
                    triangoli.forEach(t => [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]].forEach(([a, b]) => {
                        const k = Math.min(a, b) + ',' + Math.max(a, b);
                        if (!visti.has(k)) { visti.add(k); lati.push([a, b]); }
                    }));
                } else if (provePos.length > 1) {
                    let a = 0, b = 1, dMax = -1;
                    provePos.forEach((p, i) => provePos.forEach((r, j) => { const d = Math.hypot(p.x - r.x, p.y - r.y); if (d > dMax) { dMax = d; a = i; b = j; } }));
                    const ux = provePos[b].x - provePos[a].x, uy = provePos[b].y - provePos[a].y;
                    const ordine = provePos.map((_, i) => i).sort((i, j) => (provePos[i].x * ux + provePos[i].y * uy) - (provePos[j].x * ux + provePos[j].y * uy));
                    lati = ordine.slice(1).map((i, k) => [ordine[k], i]);
                }
                return { triangoli, lati };
            }

            /** I pezzi del modello, in metri veri: pannelli (per tratti che seguono il terreno) e superfici. */
            function modelloCorrelazione(d) {
                const pannelli = [], superfici = [];
                d.lati.forEach(([i, j]) => {
                    const A = d.prove[i], B = d.prove[j];
                    A.occ.forEach((fa, k) => {
                        const fb = B.occ.get(k);
                        if (!fb) return;
                        const passi = Math.max(1, Math.min(10, Math.round(Math.hypot(B.x - A.x, B.y - A.y) / 8)));
                        const pezzi = [];
                        for (let n = 0; n <= passi; n++) {
                            const t = n / passi, x = A.x + (B.x - A.x) * t, y = A.y + (B.y - A.y) * t;
                            const zt = n === 0 ? A.z : n === passi ? B.z : (d.zSuolo(x, y) ?? A.z + (B.z - A.z) * t);
                            pezzi.push({ x, y, tetto: zt - (fa.da + (fb.da - fa.da) * t), letto: zt - (fa.a + (fb.a - fa.a) * t) });
                        }
                        pannelli.push({ i, j, f: fa, pezzi });
                    });
                });
                d.triangoli.forEach(t => {
                    const [A, B, C] = t.map(i => d.prove[i]);
                    A.occ.forEach((fa, k) => {
                        const fb = B.occ.get(k), fc = C.occ.get(k);
                        if (!fb || !fc || (fa.da === 0 && fb.da === 0 && fc.da === 0)) return; // il tetto a 0 è il terreno
                        const P = [[A.x, A.y, A.z - fa.da], [B.x, B.y, B.z - fb.da], [C.x, C.y, C.z - fc.da]];
                        // Giacitura dal piano per tre punti: normale verso l'alto, immersione e inclinazione.
                        const u = P[1].map((v, n) => v - P[0][n]), w = P[2].map((v, n) => v - P[0][n]);
                        let nn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
                        if (nn[2] < 0) nn = nn.map(x => -x);
                        const inclinazione = Math.atan2(Math.hypot(nn[0], nn[1]), nn[2]) * 180 / Math.PI;
                        const immersione = (Math.atan2(nn[0], nn[1]) * 180 / Math.PI + 360) % 360;
                        superfici.push({ t, f: fa, punti: P, immersione, inclinazione });
                    });
                });
                return { pannelli, superfici };
            }

            /** IL MODELLO SOLIDO. Il corpo chiuso nel poligono che racchiude le prove (involucro
             * convesso), dal terreno fino alla prova più profonda. In ogni punto la colonna è quella
             * delle prove del triangolo che lo contiene, pesate per vicinanza (coordinate
             * baricentriche): ogni strato ha una base in ogni prova — dove manca, spessore zero, così
             * si assottiglia fino a sparire — e la base si interpola. Sotto il fondo di ciascuna prova
             * non si sa cosa ci sia: è la fascia «Non indagato», in grigio.
             * L'ordine degli strati vale per tutte le prove: viene da come si susseguono nelle
             * colonne (chi sta sopra a chi), a parità dalla profondità media. */
            function modelloSolido(d) {
                if (d._solido !== undefined) return d._solido;
                if (!d.triangoli.length) return (d._solido = null);
                const info = new Map(), dopo = new Map();
                d.prove.forEach(p => {
                    const chiavi = [...p.occ.keys()];
                    chiavi.forEach((k, i) => {
                        const f = p.occ.get(k), v = info.get(k) || { f, somma: 0, n: 0 };
                        v.somma += f.da; v.n++; info.set(k, v);
                        if (i > 0) { if (!dopo.has(chiavi[i - 1])) dopo.set(chiavi[i - 1], new Set()); dopo.get(chiavi[i - 1]).add(k); }
                    });
                });
                const entrate = new Map([...info.keys()].map(k => [k, 0]));
                dopo.forEach(insieme => insieme.forEach(k => entrate.set(k, entrate.get(k) + 1)));
                const media = k => info.get(k).somma / info.get(k).n;
                const ordine = [], resto = new Set(info.keys());
                while (resto.size) {
                    let pronti = [...resto].filter(k => entrate.get(k) <= 0);
                    if (!pronti.length) pronti = [...resto]; // un ordine contraddittorio: decide la profondità
                    const k = pronti.sort((a, b) => media(a) - media(b))[0];
                    ordine.push(k); resto.delete(k);
                    (dopo.get(k) || []).forEach(j => entrate.set(j, entrate.get(j) - 1));
                }
                const fondo = Math.max(0, ...d.prove.map(p => p.fondo));
                if (!fondo) return (d._solido = null);
                const basi = d.prove.map(p => {
                    let b = 0;
                    return ordine.map(k => { const f = p.occ.get(k); if (f) b = Math.max(b, f.a); return b; }).concat(fondo);
                });
                const strati = ordine.map(k => ({ nome: info.get(k).f.nome, colore: info.get(k).f.colore }))
                    .concat({ nome: 'Non indagato', colore: '#9ca3af', ignoto: true });
                // Involucro convesso (catena monotona), in senso antiorario.
                const pt = d.prove.map(p => [p.x, p.y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
                const giro = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
                const sotto = [], sopra = [];
                pt.forEach(p => { while (sotto.length >= 2 && giro(sotto[sotto.length - 2], sotto[sotto.length - 1], p) <= 0) sotto.pop(); sotto.push(p); });
                pt.slice().reverse().forEach(p => { while (sopra.length >= 2 && giro(sopra[sopra.length - 2], sopra[sopra.length - 1], p) <= 0) sopra.pop(); sopra.push(p); });
                const involucro = sotto.slice(0, -1).concat(sopra.slice(0, -1));
                return (d._solido = { strati, basi, fondo, involucro });
            }

            /** La colonna del modello solido in un punto: quota del terreno e base di ogni strato. */
            function colonnaSolido(d, so, x, y) {
                let migliore = null;
                d.triangoli.forEach(t => {
                    const [A, B, C] = t.map(i => d.prove[i]);
                    const det = (B.y - C.y) * (A.x - C.x) + (C.x - B.x) * (A.y - C.y);
                    if (!det) return;
                    const l1 = ((B.y - C.y) * (x - C.x) + (C.x - B.x) * (y - C.y)) / det;
                    const l2 = ((C.y - A.y) * (x - C.x) + (A.x - C.x) * (y - C.y)) / det;
                    const l = [l1, l2, 1 - l1 - l2], minimo = Math.min(...l);
                    if (!migliore || minimo > migliore.minimo) migliore = { t, l, minimo };
                });
                // Sul bordo, per gli arrotondamenti, il punto può cadere appena fuori: pesi mai negativi.
                const l = migliore.l.map(v => Math.max(0, v)), somma = l.reduce((a, b) => a + b, 0) || 1;
                const w = l.map(v => v / somma), idx = migliore.t;
                const basi = so.strati.map((_, k) => idx.reduce((a, i, n) => a + w[n] * so.basi[i][k], 0));
                const zDtm = d.zSuolo(x, y);
                const z = Number.isFinite(zDtm) ? zDtm : idx.reduce((a, i, n) => a + w[n] * d.prove[i].z, 0);
                return { z, basi };
            }

            /** La parte di un poligono dove f(punto) ≥ 0, con f lineare (Sutherland–Hodgman, un lato). */
            function ritagliaPoligono(poligono, f) {
                const out = [];
                poligono.forEach((a, i) => {
                    const b = poligono[(i + 1) % poligono.length], fa = f(a), fb = f(b);
                    if (fa >= 0) out.push(a);
                    if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
                });
                return out;
            }

            /** Lo strato a una profondità, in una colonna del modello solido. */
            function stratoAProfondita(colonna, prof) {
                const k = colonna.basi.findIndex(b => b > prof + 1e-6);
                return k < 0 ? colonna.basi.length - 1 : k;
            }

            /** LE IMMAGINI SUL TERRENO. I fornitori a tessere (Google, Esri, OpenStreetMap) e il WMS.
             * Le tessere si caricano come immagini semplici, senza chiedere il permesso di rileggerle:
             * la tela della vista si limita a mostrarle, quindi non serve, e così funzionano anche i
             * servizi che non lo concedono (Google). Il file SVG scaricato non le contiene. */
            const google3d = (lyrs, nome, zoomMax) => ({ nome, zoomMax, url: (z, x, y) => `https://mt${(x + y) % 4}.google.com/vt/lyrs=${lyrs}&x=${x}&y=${y}&z=${z}`, attribuzione: '© Google' });
            const SFONDI_3D = {
                'google-satellite': google3d('s', 'Google · Satellite', 20),
                'google-ibrida': google3d('y', 'Google · Satellite con nomi', 20),
                'google-strade': google3d('m', 'Google · Stradale', 20),
                'google-rilievo': google3d('p', 'Google · Rilievo', 17),
                'esri-satellite': Object.assign({}, PROVIDER_MAPPA['esri-satellite'], { nome: 'Esri · Satellite' }),
                'esri-topo': Object.assign({}, PROVIDER_MAPPA['esri-topo'], { nome: 'Esri · Topografica' }),
                'esri-strade': Object.assign({}, PROVIDER_MAPPA['esri-strade'], { nome: 'Esri · Stradale' }),
                'osm': Object.assign({}, PROVIDER_MAPPA['osm'], { nome: 'OpenStreetMap · Stradale' }),
                'opentopo': Object.assign({}, PROVIDER_MAPPA['opentopo'], { nome: 'OpenStreetMap · Curve di livello (OpenTopoMap)' })
            };
            /** La scelta, ricordata nelle impostazioni dell'app (vale per tutti i progetti). */
            function sceltaSfondo3d() {
                const sf = (state.settings && state.settings.sfondo3d) || {};
                return { id: sf.id || '', wmsUrl: sf.wmsUrl || '', wmsLayer: sf.wmsLayer || '', attribuzione: sf.attribuzione || '', opacita: sf.opacita || 0 };
            }
            function salvaSceltaSfondo3d(modifiche) {
                if (!state.settings) state.settings = {};
                state.settings.sfondo3d = Object.assign(sceltaSfondo3d(), modifiche);
                saveState();
            }

            /** Il mosaico dell'immagine sotto la scena: tessere di Web Mercator (o un'immagine WMS in
             * gradi) su una tela, e la funzione che porta latitudine e longitudine al suo pixel. Si
             * costruisce una volta per scena e per scelta; man mano che arrivano i pezzi si ridisegna. */
            function sfondoPerScena(d) {
                const sc = sceltaSfondo3d();
                if (!sc.id) return null;
                const chiave = [sc.id, sc.wmsUrl, sc.wmsLayer].join('|');
                if (d._sfondo && d._sfondo.chiave === chiave) return d._sfondo;
                // L'area: il quadrato del terreno disegnato, in gradi.
                const mezzo = d.lato / 2, angoli = [[-mezzo, -mezzo], [mezzo, -mezzo], [mezzo, mezzo], [-mezzo, mezzo]].map(([x, y]) => d.geo(x, y));
                const ovest = Math.min(...angoli.map(g => g.lng)), est = Math.max(...angoli.map(g => g.lng));
                const sud = Math.min(...angoli.map(g => g.lat)), nord = Math.max(...angoli.map(g => g.lat));
                const tela = document.createElement('canvas');
                const sf = { chiave, tela, caricate: 0, totali: 0, errori: 0 };
                if (sc.id === 'wms') {
                    const base = sc.wmsUrl.trim();
                    sf.attribuzione = sc.attribuzione || 'WMS';
                    if (!base) { sf.errori = 1; return (d._sfondo = sf); }
                    const lato = 2048;
                    tela.width = lato; tela.height = Math.max(256, Math.min(2048, Math.round(lato * (nord - sud) / ((est - ovest) * Math.cos((nord + sud) / 2 * Math.PI / 180)))));
                    sf.uv = (lat, lng) => [(lng - ovest) / (est - ovest) * tela.width, (nord - lat) / (nord - sud) * tela.height];
                    const sep = base.indexOf('?') === -1 ? '?' : '&';
                    const url = base + sep + 'service=WMS&version=1.1.1&request=GetMap&srs=EPSG:4326&layers=' + encodeURIComponent(sc.wmsLayer)
                        + `&styles=&format=image/jpeg&transparent=false&width=${tela.width}&height=${tela.height}&bbox=${ovest},${sud},${est},${nord}`;
                    sf.totali = 1;
                    caricaImmagine3d(url, img => tela.getContext('2d').drawImage(img, 0, 0, tela.width, tela.height), sf);
                    return (d._sfondo = sf);
                }
                const fornitore = SFONDI_3D[sc.id];
                if (!fornitore) return null;
                sf.attribuzione = fornitore.attribuzione;
                // Lo zoom: il più dettagliato che sta in circa 2048 pixel di lato.
                const larghezza0 = tessereXDaLng(est, 0) - tessereXDaLng(ovest, 0);
                const z = Math.max(1, Math.min(fornitore.zoomMax || 19, Math.floor(Math.log2(2048 / 256 / larghezza0))));
                const x0 = Math.floor(tessereXDaLng(ovest, z)), x1 = Math.floor(tessereXDaLng(est, z));
                const y0 = Math.floor(tessereYDaLat(nord, z)), y1 = Math.floor(tessereYDaLat(sud, z));
                tela.width = (x1 - x0 + 1) * 256; tela.height = (y1 - y0 + 1) * 256;
                sf.uv = (lat, lng) => [(tessereXDaLng(lng, z) - x0) * 256, (tessereYDaLat(lat, z) - y0) * 256];
                const g = tela.getContext('2d');
                for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
                    sf.totali++;
                    caricaImmagine3d(fornitore.url(z, x, y), img => g.drawImage(img, (x - x0) * 256, (y - y0) * 256), sf);
                }
                return (d._sfondo = sf);
            }
            function caricaImmagine3d(url, posa, sf) {
                const img = new Image();
                img.onload = () => { posa(img); sf.caricate++; if (datiVista3dCorrenti && datiVista3dCorrenti._sfondo === sf) { aggiornaStatoSfondo3d(); ridisegna3d(); } };
                img.onerror = () => { sf.errori++; if (datiVista3dCorrenti && datiVista3dCorrenti._sfondo === sf) aggiornaStatoSfondo3d(); };
                img.src = url;
            }

            // La scena: forme già proiettate sullo schermo, dalla più lontana alla più vicina (pezzi),
            // poi quelle che stanno sempre sopra (sopra), e i segmenti delle colonne per sapere quale
            // si è toccata. La disegnano sia il canvas (a schermo, veloce) sia l'SVG (il file).
            // Forme: {t:'poli', p, fill, fo, stroke, sw, dash}, {t:'linea', x1, y1, x2, y2, stroke, sw},
            // {t:'testo', x, y, s, size, bold, anchor, alone}, {t:'cerchio', x, y, r, fill}; con cls e title.
            function scena3d(d, larghezza, leggera, file, altezza) {
                const L = vista3d.livelli;
                // Nell'area di lavoro la figura riempie la scena: alta quanto lei; altrimenti (file, test) in proporzione.
                const W = Math.max(320, Math.round(larghezza || 1000)), H = altezza > 150 ? Math.round(altezza) : Math.round(Math.max(300, Math.min(620, W * 0.62)));
                const ca = Math.cos(vista3d.az), sa = Math.sin(vista3d.az), ce = Math.cos(vista3d.el), se = Math.sin(vista3d.el);
                const zRif = (d.zMin + d.zMax) / 2, ex = vista3d.ex;
                // Scala fissa (dal raggio della scena), così girando la figura non cambia grandezza.
                const profMax = Math.max(0, ...d.prove.map(p => p.fondo));
                const R = Math.hypot(d.lato / 2 * Math.SQRT2, Math.max(d.zMax - zRif, zRif - d.zMin + profMax) * ex) || 1;
                const k = Math.min(W, H) / 2.15 / R * vista3d.zoom;
                // Con la prospettiva ciò che è lontano rimpicciolisce: l'occhio sta a una distanza dal
                // centro della scena che dipende dal campo visivo (stretto = lontano, quasi assonometria;
                // largo = vicino, prospettiva forte). Al centro la grandezza è la stessa di senza.
                const occhio = vista3d.prospettiva ? R / Math.tan(vista3d.fov * Math.PI / 360) : 0;
                // Si gira attorno a vista3d.centro (metri veri, dal centro della scena): spostandolo col
                // tasto destro si va dove si vuole, e poi si gira attorno a lì.
                const [cx, cy, cz] = vista3d.centro;
                const P = (x, y, z) => {
                    const X = (x - cx) * ca - (y - cy) * sa, Yd = (x - cx) * sa + (y - cy) * ca, Z = (z - zRif - cz) * ex;
                    const prof = Yd * ce - Z * se, s = occhio ? occhio / Math.max(occhio * 0.08, occhio + prof) : 1;
                    return [W / 2 + X * k * s, H / 2 + (-Z * ce - Yd * se) * k * s, prof];
                };
                const pezzi = [], sopra = [], colonne = [];
                const poli = (pp, extra) => (extra.strato && vista3d.stratiNascosti.has(extra.strato)) || pezzi.push({ prof: pp.reduce((s, p) => s + p[2], 0) / pp.length, t: 'poli', p: pp.map(p => [p[0], p[1]]), ...extra });
                const so = L.solido ? modelloSolido(d) : null;
                const tg = vista3d.taglio;
                // Il lato tolto dal taglio verticale: quello che non soddisfa (coordinata − c)·lato ≥ 0.
                let tieni = () => true;
                if (so && tg.dir) {
                    const ax = tg.dir === 'ns' ? 0 : 1, valori = so.involucro.map(p => p[ax]);
                    const c = Math.min(...valori) + (Math.max(...valori) - Math.min(...valori)) * tg.pos;
                    tieni = (x, y) => (([x, y][ax] - c) * tg.lato >= -1e-9);
                    tg.c = c; tg.ax = ax;
                }
                const hTaglio = so ? Math.max(0, Math.min(tg.prof, so.fondo - 0.01)) : 0;
                if (L.terreno) {
                    const luce = [-0.5, 0.5, 0.7].map(v => v / Math.hypot(-0.5, 0.5, 0.7));
                    const colore = (z, lum) => {
                        const t = d.zMax > d.zMin ? (z - d.zMin) / (d.zMax - d.zMin) : 0.5;
                        const [r, g, b] = [[88, 128, 84], [214, 196, 140]].reduce((a, c) => a.map((v, i) => v + (c[i] - v) * t));
                        return `rgb(${Math.round(r * lum)},${Math.round(g * lum)},${Math.round(b * lum)})`;
                    };
                    const nodi = leggera ? d.nodiLeggeri : d.nodi;
                    const sf = L.immagine ? sfondoPerScena(d) : null, opacita = sceltaSfondo3d().opacita || (sf ? 0.85 : 0.62);
                    const uvCache = new Map();
                    const uvDi = (x, y) => { const k = x.toFixed(2) + ',' + y.toFixed(2); if (!uvCache.has(k)) { const gg = d.geo(x, y); uvCache.set(k, sf.uv(gg.lat, gg.lng)); } return uvCache.get(k); };
                    // Un poligono del terreno (in metri, con le quote): coi colori della quota, o
                    // spezzato in triangoli ciascuno col suo pezzo d'immagine.
                    // Col modello solido il terreno è il contesto: si disegna per primo, sotto a tutto,
                    // così il corpo (che starebbe sottoterra, coperto) resta in vista.
                    const sottoTutto = so ? 1e9 : 0;
                    const terreno = (pp, fill) => {
                        if (!sf || !sf.uv) { const sp = pp.map(q => P(...q)); pezzi.push({ prof: sottoTutto + sp.reduce((a, q) => a + q[2], 0) / sp.length, t: 'poli', p: sp.map(q => [q[0], q[1]]), fill, fo: opacita, stroke: fill, sw: 0.4, cls: 'vista3d-faccia' }); return; }
                        for (let n = 1; n + 1 < pp.length; n++) {
                            const tri = [pp[0], pp[n], pp[n + 1]], sp = tri.map(q => P(...q));
                            pezzi.push({ prof: sottoTutto + (sp[0][2] + sp[1][2] + sp[2][2]) / 3, t: 'poli', p: sp.map(q => [q[0], q[1]]), uv: tri.map(q => uvDi(q[0], q[1])), sfondo: sf.tela, fill, fo: opacita, cls: 'vista3d-faccia' });
                        }
                    };
                    for (let j = 0; j + 1 < nodi.length; j++) for (let i = 0; i + 1 < Math.min(nodi[j].length, nodi[j + 1].length); i++) {
                        const a = nodi[j][i], b = nodi[j][i + 1], c = nodi[j + 1][i + 1], e = nodi[j + 1][i];
                        if (![a, b, c, e].every(n => isFinite(n[2]))) continue;
                        const u = [c[0] - a[0], c[1] - a[1], (c[2] - a[2]) * ex], v = [e[0] - b[0], e[1] - b[1], (e[2] - b[2]) * ex];
                        let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
                        if (n[2] < 0) n = n.map(x => -x);
                        const lum = 0.55 + 0.45 * Math.max(0, (n[0] * luce[0] + n[1] * luce[1] + n[2] * luce[2]) / (Math.hypot(...n) || 1));
                        const fill = colore((a[2] + c[2]) / 2, lum);
                        if (!so) { terreno([a, b, c, e], fill); continue; }
                        // Col modello solido il terreno si ferma sul bordo del corpo: del riquadro resta
                        // solo la parte fuori (riquadro meno poligono convesso, un lato alla volta).
                        let resto = [a, b, c, e].map(n => [n[0], n[1]]);
                        so.involucro.forEach((A, i) => {
                            if (resto.length < 3) return;
                            const B = so.involucro[(i + 1) % so.involucro.length];
                            const lato = q => (B[0] - A[0]) * (q[1] - A[1]) - (B[1] - A[1]) * (q[0] - A[0]);
                            const fuori = ritagliaPoligono(resto, q => -lato(q)), dentroQui = ritagliaPoligono(resto, lato);
                            if (fuori.length >= 3) {
                                const z = ([x, y]) => { const v = d.zSuolo(x, y); return Number.isFinite(v) ? v : (a[2] + c[2]) / 2; };
                                terreno(fuori.map(q => [q[0], q[1], z(q)]), fill);
                            }
                            resto = dentroQui;
                        });
                    }
                }
                const { pannelli, superfici } = modelloCorrelazione(d);
                if (so) {
                    // Il poligono del corpo, tagliato dal piano verticale.
                    let Q = so.involucro;
                    if (tg.dir) Q = ritagliaPoligono(Q, p => (p[tg.ax] - tg.c) * tg.lato);
                    if (Q.length >= 3) {
                        // Chi guarda verso v = (sa·ce, ca·ce, −se): una faccia si vede se la sua normale
                        // esterna punta verso chi guarda. Il corpo è convesso: bastano le facce davanti.
                        const vx = sa * ce, vy = ca * ce;
                        const colonnaIn = (x, y) => colonnaSolido(d, so, x, y);
                        const passo = d.lato / (leggera ? 18 : 40);
                        Q.forEach((a, i) => {
                            const b = Q[(i + 1) % Q.length], dx = b[0] - a[0], dy = b[1] - a[1], lung = Math.hypot(dx, dy);
                            if (lung < 1e-6 || dy * vx - dx * vy >= 0) return; // parete di spalle
                            const passi = Math.max(1, Math.min(leggera ? 8 : 24, Math.round(lung / passo)));
                            const campioni = [];
                            for (let n = 0; n <= passi; n++) { const x = a[0] + dx * n / passi, y = a[1] + dy * n / passi; campioni.push({ x, y, ...colonnaIn(x, y) }); }
                            so.strati.forEach((st, k) => {
                                for (let n = 0; n < passi; n++) {
                                    const A = campioni[n], B = campioni[n + 1];
                                    const ta = Math.max(hTaglio, k ? A.basi[k - 1] : 0), ba = Math.max(ta, A.basi[k]);
                                    const tb = Math.max(hTaglio, k ? B.basi[k - 1] : 0), bb = Math.max(tb, B.basi[k]);
                                    if (ba - ta < 1e-4 && bb - tb < 1e-4) continue;
                                    poli([P(A.x, A.y, A.z - ta), P(B.x, B.y, B.z - tb), P(B.x, B.y, B.z - bb), P(A.x, A.y, A.z - ba)],
                                        { fill: st.colore, fo: st.ignoto ? 0.55 : 1, stroke: st.colore, sw: 0.6, cls: 'vista3d-solido', title: st.nome, strato: st.nome });
                                }
                            });
                        });
                        // Sopra: la «mappa» degli strati alla profondità del taglio (a 0, il terreno con lo
                        // strato che affiora); sotto, il fondo del modello. Ventaglio dal baricentro,
                        // ogni spicchio diviso in triangolini colorati dallo strato al loro centro.
                        const cx = Q.reduce((s, p) => s + p[0], 0) / Q.length, cy = Q.reduce((s, p) => s + p[1], 0) / Q.length;
                        const faccia = (prof, diSopra) => {
                            const m = leggera ? 3 : 7;
                            Q.forEach((a, i) => {
                                const b = Q[(i + 1) % Q.length];
                                const punto = (r, c2) => { const x = cx + (a[0] - cx) * r / m + (b[0] - a[0]) * c2 / m, y = cy + (a[1] - cy) * r / m + (b[1] - a[1]) * c2 / m; return [x, y]; };
                                for (let r = 0; r < m; r++) for (let c2 = 0; c2 <= r; c2++) {
                                    const tri = [[punto(r, c2), punto(r + 1, c2), punto(r + 1, c2 + 1)]];
                                    if (c2 < r) tri.push([punto(r, c2), punto(r + 1, c2 + 1), punto(r, c2 + 1)]);
                                    tri.forEach(tt => {
                                        // Il confine tra due strati passa dove la base dell'uno vale la
                                        // profondità del taglio: il triangolino si taglia lì, niente scalini.
                                        const h = diSopra ? prof : prof - 1e-3;
                                        const ks = new Set(tt.map(([x, y]) => stratoAProfondita(colonnaIn(x, y), h)));
                                        const disegna = (pp, st) => poli(pp.map(([x, y]) => P(x, y, colonnaIn(x, y).z - prof)), { fill: st.colore, fo: st.ignoto ? 0.55 : 1, stroke: st.colore, sw: 0.5, cls: 'vista3d-solido', title: st.nome, strato: st.nome });
                                        if (ks.size === 1) { disegna(tt, so.strati[[...ks][0]]); return; }
                                        for (let kk = Math.min(...ks); kk <= Math.max(...ks); kk++) {
                                            let pezzo = kk ? ritagliaPoligono(tt, ([x, y]) => h - colonnaIn(x, y).basi[kk - 1]) : tt;
                                            pezzo = ritagliaPoligono(pezzo, ([x, y]) => colonnaIn(x, y).basi[kk] - h);
                                            if (pezzo.length >= 3) disegna(pezzo, so.strati[kk]);
                                        }
                                    });
                                }
                            });
                        };
                        if (se > 0) faccia(hTaglio, true); else faccia(so.fondo, false);
                        // Il contorno della faccia di taglio, per vederla bene.
                        if (tg.dir || hTaglio > 0) Q.forEach((a, i) => {
                            const b = Q[(i + 1) % Q.length];
                            const pa = P(a[0], a[1], colonnaIn(a[0], a[1]).z - hTaglio), pb = P(b[0], b[1], colonnaIn(b[0], b[1]).z - hTaglio);
                            sopra.push({ t: 'linea', x1: pa[0], y1: pa[1], x2: pb[0], y2: pb[1], stroke: 'currentColor', sw: 1.2, cls: 'vista3d-taglio' });
                        });
                    }
                }
                if (L.pannelli && !so) pannelli.forEach(pa => {
                    for (let n = 1; n < pa.pezzi.length; n++) {
                        const a = pa.pezzi[n - 1], b = pa.pezzi[n];
                        poli([P(a.x, a.y, a.tetto), P(b.x, b.y, b.tetto), P(b.x, b.y, b.letto), P(a.x, a.y, a.letto)], { fill: pa.f.colore, fo: 0.55, stroke: pa.f.colore, sw: 0.6, cls: 'vista3d-pannello', title: pa.f.nome, strato: pa.f.nome });
                    }
                });
                // LA FALDA: un segno blu sulla colonna alla sua profondità e, tra tre prove vicine che
                // l'hanno tutte, la sua superficie (piana nel triangolo), azzurra e trasparente.
                const falda = p => { const v = parseFloat(p.s.header && p.s.header.faldaDa); return Number.isFinite(v) ? v : null; };
                if (L.falda) {
                    d.triangoli.forEach(t => {
                        const tre = t.map(i => d.prove[i]);
                        if (tre.some(p => falda(p) === null || !tieni(p.x, p.y))) return;
                        poli(tre.map(p => P(p.x, p.y, p.z - falda(p))), { fill: '#38bdf8', fo: 0.35, stroke: '#0284c7', sw: 1, cls: 'vista3d-falda', title: 'Falda: ' + tre.map(p => `${nomeDpsh(p.s)} a ${numeroConVirgola(falda(p))} m`).join(', ') });
                    });
                    d.prove.forEach(p => {
                        const f = falda(p);
                        if (f === null || !tieni(p.x, p.y) || vista3d.proveNascoste.has(p.s.id)) return;
                        const o = P(p.x, p.y, p.z - f), lato = Math.max(1.5, d.lato / 60);
                        [[lato, 0], [0, lato]].forEach(([dx, dy]) => {
                            const a1 = P(p.x - dx, p.y - dy, p.z - f), a2 = P(p.x + dx, p.y + dy, p.z - f);
                            pezzi.push({ prof: o[2] - 0.002, t: 'linea', x1: a1[0], y1: a1[1], x2: a2[0], y2: a2[1], stroke: '#0284c7', sw: 3, cls: 'vista3d-falda-segno', title: `${nomeDpsh(p.s)}: falda a ${numeroConVirgola(f)} m` });
                        });
                    });
                }
                if (L.superfici && !so) superfici.forEach(sf => poli(sf.punti.map(p => P(...p)), { fill: sf.f.colore, fo: 0.35, stroke: sf.f.colore, sw: 1, dash: [5, 3], cls: 'vista3d-superficie', title: `Tetto di ${sf.f.nome}: immersione ${Math.round(sf.immersione)}°, inclinazione ${numeroConVirgola(sf.inclinazione, 1)}°`, strato: sf.f.nome }));
                if (L.colonne) d.prove.forEach(p => {
                    const nome = nomeDpsh(p.s);
                    if (!tieni(p.x, p.y) || vista3d.proveNascoste.has(p.s.id)) return; // dalla parte tolta dal taglio, o spenta
                    p.fasce.forEach(f => {
                        if (f.a <= hTaglio || vista3d.stratiNascosti.has(f.nome)) return;
                        const a = P(p.x, p.y, p.z - Math.max(f.da, hTaglio)), b = P(p.x, p.y, p.z - f.a), prof = (a[2] + b[2]) / 2 - 0.001;
                        pezzi.push({ prof, t: 'linea', x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'rgba(0,0,0,0.55)', sw: 12, cls: 'vista3d-colonna-bordo' });
                        pezzi.push({ prof: prof - 0.0001, t: 'linea', x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: f.colore, sw: 9, cls: 'vista3d-colonna', title: `${nome}: ${f.nome}`, prova: p.s.id });
                        colonne.push({ id: p.s.id, x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
                    });
                });
                pezzi.sort((m, n) => n.prof - m.prof);
                const testo = (x, y, s, extra) => sopra.push({ t: 'testo', x, y, s, size: 11, ...extra });
                const perTriangolo = new Map(); // più tetti nello stesso triangolo: scritte una sotto l'altra
                // GIACITURE LEGGIBILI: il simbolo ha il colore dello strato, la scritta è solo
                // immersione/inclinazione (il nome dello strato a richiesta). Un simbolo dello stesso
                // strato troppo vicino a uno già messo non si ripete, e una scritta che ne coprirebbe
                // un'altra non si scrive (il simbolo resta).
                const segni = [], scritte = [];
                const scrittaLibera = (x, y, w) => {
                    const b = [x - 2, y - 12, x + w + 2, y + 4];
                    if (scritte.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) return false;
                    scritte.push(b);
                    return true;
                };
                // I nomi delle prove hanno la precedenza: giaciture e distanze lasciano loro il posto.
                if (L.nomi) d.prove.forEach(p => { if (tieni(p.x, p.y) && !vista3d.proveNascoste.has(p.s.id)) { const [tx, ty] = P(p.x, p.y, p.z), w = nomeDpsh(p.s).length * 8; scritte.push([tx - w / 2, ty - 24, tx + w / 2, ty - 6]); } });
                if (L.giaciture && L.superfici && !so) superfici.forEach(sf => {
                    if (vista3d.stratiNascosti.has(sf.f.nome)) return;
                    const riga = perTriangolo.get(sf.t) || 0;
                    perTriangolo.set(sf.t, riga + 1);
                    const c = [0, 1, 2].map(n => (sf.punti[0][n] + sf.punti[1][n] + sf.punti[2][n]) / 3);
                    const rad = sf.immersione * Math.PI / 180, lung = Math.max(4, d.lato / 30);
                    const dx = Math.sin(rad), dy = Math.cos(rad); // verso dell'immersione (x est, y nord)
                    const [a1, a2, tk, o] = [P(c[0] - dy * lung, c[1] + dx * lung, c[2]), P(c[0] + dy * lung, c[1] - dx * lung, c[2]), P(c[0] + dx * lung * 0.6, c[1] + dy * lung * 0.6, c[2]), P(...c)];
                    if (segni.some(g => g.f === sf.f && Math.hypot(g.x - o[0], g.y - o[1]) < 28)) return;
                    segni.push({ f: sf.f, x: o[0], y: o[1] });
                    [['rgba(0,0,0,0.55)', 4.4], [sf.f.colore, 2.6]].forEach(([stroke, sw]) => {
                        sopra.push({ t: 'linea', x1: a1[0], y1: a1[1], x2: a2[0], y2: a2[1], stroke, sw, cls: 'vista3d-giacitura-segno' });
                        sopra.push({ t: 'linea', x1: o[0], y1: o[1], x2: tk[0], y2: tk[1], stroke, sw, cls: 'vista3d-giacitura-segno' });
                    });
                    const scritta = `${String(Math.round(sf.immersione)).padStart(3, '0')}°/${numeroConVirgola(sf.inclinazione, 1)}°${L.nomiGiaciture ? ' ' + sf.f.nome : ''}`;
                    const y = o[1] - 6 + riga * 14;
                    if (scrittaLibera(o[0] + 8, y, scritta.length * 6.7)) testo(o[0] + 8, y, scritta, { alone: true, cls: 'vista3d-giacitura' });
                });
                if (L.misure) {
                    // Asta graduata delle quote, all'angolo della scena più vicino a chi guarda.
                    const mezzo = d.lato / 2;
                    const angoli = [[-mezzo, -mezzo], [mezzo, -mezzo], [mezzo, mezzo], [-mezzo, mezzo]];
                    const [ax, ay] = angoli.reduce((m, a) => P(a[0], a[1], zRif)[2] < P(m[0], m[1], zRif)[2] ? a : m);
                    const zBasso = d.zMin - profMax, passo = massimoTondo((d.zMax - zBasso) / 5);
                    const b0 = P(ax, ay, zBasso), b1 = P(ax, ay, d.zMax);
                    sopra.push({ t: 'linea', x1: b0[0], y1: b0[1], x2: b1[0], y2: b1[1], stroke: 'currentColor', sw: 1.5, cls: 'vista3d-misure' });
                    for (let z = Math.ceil(zBasso / passo) * passo; z <= d.zMax + 0.001; z += passo) {
                        const t = P(ax, ay, z);
                        sopra.push({ t: 'linea', x1: t[0] - 5, y1: t[1], x2: t[0] + 5, y2: t[1], stroke: 'currentColor', sw: 1, cls: 'vista3d-misure' });
                        testo(t[0] - 8, t[1] + 4, numeroConVirgola(z, passo < 1 ? 1 : 0), { anchor: 'end', cls: 'vista3d-misure' });
                    }
                    d.lati.forEach(([i, j]) => {
                        const A = d.prove[i], B = d.prove[j], m = P((A.x + B.x) / 2, (A.y + B.y) / 2, Math.max(A.z, B.z) + (d.zMax - d.zMin) * 0.05);
                        const s = numeroConVirgola(Math.hypot(B.x - A.x, B.y - A.y), 0) + ' m', w = s.length * 6.7;
                        if (scrittaLibera(m[0] - w / 2, m[1], w)) testo(m[0], m[1], s, { anchor: 'middle', alone: true, cls: 'vista3d-distanza' });
                    });
                }
                tracceNellaScena3d(d, P, sopra, testo);
                if (L.nomi) d.prove.forEach(p => {
                    if (!tieni(p.x, p.y) || vista3d.proveNascoste.has(p.s.id)) return;
                    const [tx, ty] = P(p.x, p.y, p.z);
                    sopra.push({ t: 'cerchio', x: tx, y: ty, r: 4, fill: 'currentColor', cls: 'vista3d-testa', prova: p.s.id });
                    testo(tx, ty - 10, nomeDpsh(p.s), { size: 13, bold: true, anchor: 'middle', alone: true, cls: 'vista3d-nome', prova: p.s.id });
                    colonne.push({ id: p.s.id, x1: tx, y1: ty - 22, x2: tx, y2: ty });
                });
                // L'attribuzione dell'immagine: è una condizione d'uso dei servizi.
                const sfAttr = L.terreno && L.immagine && d._sfondo && d._sfondo.uv && sceltaSfondo3d().id ? d._sfondo.attribuzione : '';
                if (sfAttr) testo(W - 12, H - (W < 700 ? 46 : 30), sfAttr, { size: 10, anchor: 'end', alone: true, cls: 'vista3d-attribuzione' });
                // Il nord, in basso a destra: solo nel file (a schermo c'è la bussola).
                if (file) {
                    const [ox, oy] = P(0, 0, zRif), [nx, ny] = P(0, 1, zRif);
                    const lung = Math.hypot(nx - ox, ny - oy) || 1, ax = (nx - ox) / lung, ay = (ny - oy) / lung;
                    sopra.push({ t: 'cerchio', x: W - 50, y: H - 50, r: 24, fill: 'none', stroke: 'currentColor', so: 0.3, cls: 'vista3d-nord' });
                    // La metà verso Nord in rosso, come una bussola.
                    sopra.push({ t: 'linea', x1: W - 50 - ax * 16, y1: H - 50 - ay * 16, x2: W - 50, y2: H - 50, stroke: 'currentColor', sw: 2, cls: 'vista3d-nord' });
                    sopra.push({ t: 'linea', x1: W - 50, y1: H - 50, x2: W - 50 + ax * 18, y2: H - 50 + ay * 18, stroke: '#dc2626', sw: 3.5, cls: 'vista3d-nord' });
                    testo(W - 50 + ax * 34, H - 50 + ay * 34 + 4, 'N', { size: 14, bold: true, anchor: 'middle', cls: 'vista3d-nord' });
                }
                const quote = d.senzaDtm ? 'senza DTM: prove tutte dal piano campagna (quota 0)' : `quote da ${numeroConVirgola(d.zMin, 1)} a ${numeroConVirgola(d.zMax, 1)} m s.l.m.`, esagTesto = `esagerazione verticale ×${ex}${so ? ' · modello solido: strati interpolati tra le prove, grigio = non indagato' : L.giaciture && L.superfici && superfici.length ? ' · giaciture reali' : ''}`;
                if (W < 700) { testo(16, H - 30, quote, { size: 12, cls: 'vista3d-didascalia' }); testo(16, H - 14, esagTesto, { size: 12, cls: 'vista3d-didascalia' }); }
                else testo(16, H - 14, quote + ' · ' + esagTesto, { size: 12, cls: 'vista3d-didascalia' });
                return { W, H, k, pezzi, sopra, colonne, tutte: pezzi.concat(sopra) };
            }

            /** La scena in SVG: per il file scaricato (e per i test). */
            function svgDaScena(sc) {
                const esc = escapeHtmlDidascalia, n = v => (+v).toFixed(1);
                const forma = f => {
                    const cls = f.cls ? ` class="${f.cls}"` : '', tit = f.title ? `<title>${esc(f.title)}</title>` : '';
                    if (f.t === 'poli') return `<polygon points="${f.p.map(p => n(p[0]) + ',' + n(p[1])).join(' ')}" fill="${f.fill}" fill-opacity="${f.fo ?? 1}" stroke="${f.stroke || 'none'}" stroke-width="${f.sw || 0}"${f.dash ? ` stroke-dasharray="${f.dash.join(' ')}"` : ''}${cls}>${tit}</polygon>`;
                    if (f.t === 'linea') return `<line x1="${n(f.x1)}" y1="${n(f.y1)}" x2="${n(f.x2)}" y2="${n(f.y2)}" stroke="${f.stroke}" stroke-width="${f.sw || 1}"${cls}>${tit}</line>`;
                    if (f.t === 'cerchio') return `<circle cx="${n(f.x)}" cy="${n(f.y)}" r="${f.r}" fill="${f.fill}"${f.stroke ? ` stroke="${f.stroke}" stroke-opacity="${f.so ?? 1}"` : ''}${cls}/>`;
                    return `<text x="${n(f.x)}" y="${n(f.y)}" font-size="${f.size}"${f.bold ? ' font-weight="700"' : ''}${f.anchor ? ` text-anchor="${f.anchor}"` : ''} fill="currentColor"${f.alone ? ' paint-order="stroke" stroke="var(--bg-card, #fff)" stroke-width="3"' : ''}${cls}>${esc(f.s)}</text>`;
                };
                return `<svg viewBox="0 0 ${sc.W} ${sc.H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vista 3D del terreno e delle prove" style="display: block; font-family: var(--font-mono), monospace;"><rect width="${sc.W}" height="${sc.H}" fill="var(--bg-card, #fff)"/>${sc.tutte.map(forma).join('')}</svg>`;
            }

            /** La scena sul canvas: stessa figura, disegnata in pochi millisecondi anche mentre gira. */
            function disegnaScena(canvas, sc) {
                const ctx = canvas.getContext && canvas.getContext('2d');
                if (!ctx) return; // browser senza canvas: resta la figura in SVG del file
                const dpr = window.devicePixelRatio || 1, stile = getComputedStyle(canvas.parentElement);
                if (canvas.width !== Math.round(sc.W * dpr) || canvas.height !== Math.round(sc.H * dpr)) {
                    canvas.width = Math.round(sc.W * dpr); canvas.height = Math.round(sc.H * dpr);
                    canvas.style.width = sc.W + 'px'; canvas.style.height = sc.H + 'px';
                }
                const testoColore = stile.color, fondo = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#fff';
                const mono = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'monospace';
                const col = c => c === 'currentColor' ? testoColore : c;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.fillStyle = fondo; ctx.fillRect(0, 0, sc.W, sc.H);
                ctx.lineJoin = 'round';
                sc.tutte.forEach(f => {
                    ctx.setLineDash(f.dash || []);
                    if (f.t === 'poli' && f.sfondo) {
                        // Il pezzo d'immagine sul triangolo: la trasformazione affine che porta i tre
                        // punti dell'immagine sui tre dello schermo, col triangolo come ritaglio
                        // (allargato di mezzo pixel, perché tra triangoli vicini non resti una riga).
                        const [p0, p1, p2] = f.p, [u0, u1, u2] = f.uv;
                        const gx = (p0[0] + p1[0] + p2[0]) / 3, gy = (p0[1] + p1[1] + p2[1]) / 3;
                        const allarga = p => { const dx = p[0] - gx, dy = p[1] - gy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * 0.6, p[1] + dy / l * 0.6]; };
                        const den = (u1[0] - u0[0]) * (u2[1] - u0[1]) - (u2[0] - u0[0]) * (u1[1] - u0[1]);
                        if (!den) return;
                        const a = ((p1[0] - p0[0]) * (u2[1] - u0[1]) - (p2[0] - p0[0]) * (u1[1] - u0[1])) / den;
                        const b = ((p1[1] - p0[1]) * (u2[1] - u0[1]) - (p2[1] - p0[1]) * (u1[1] - u0[1])) / den;
                        const c = ((p2[0] - p0[0]) * (u1[0] - u0[0]) - (p1[0] - p0[0]) * (u2[0] - u0[0])) / den;
                        const dd = ((p2[1] - p0[1]) * (u1[0] - u0[0]) - (p1[1] - p0[1]) * (u2[0] - u0[0])) / den;
                        const e = p0[0] - a * u0[0] - c * u0[1], ff = p0[1] - b * u0[0] - dd * u0[1];
                        ctx.save();
                        ctx.beginPath(); [p0, p1, p2].map(allarga).forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
                        ctx.clip();
                        ctx.globalAlpha = f.fo ?? 1;
                        ctx.transform(a, b, c, dd, e, ff);
                        ctx.drawImage(f.sfondo, 0, 0);
                        ctx.restore();
                        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    } else if (f.t === 'poli') {
                        ctx.beginPath(); f.p.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
                        ctx.globalAlpha = f.fo ?? 1; ctx.fillStyle = col(f.fill); ctx.fill();
                        if (f.stroke && f.sw) { ctx.globalAlpha = Math.min(1, (f.fo ?? 1) + 0.25); ctx.strokeStyle = col(f.stroke); ctx.lineWidth = f.sw; ctx.stroke(); }
                    } else if (f.t === 'linea') {
                        ctx.globalAlpha = 1; ctx.strokeStyle = col(f.stroke); ctx.lineWidth = f.sw || 1;
                        ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
                    } else if (f.t === 'cerchio') {
                        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
                        if (f.fill !== 'none') { ctx.globalAlpha = 1; ctx.fillStyle = col(f.fill); ctx.fill(); }
                        if (f.stroke) { ctx.globalAlpha = f.so ?? 1; ctx.strokeStyle = col(f.stroke); ctx.lineWidth = 1; ctx.stroke(); }
                    } else {
                        ctx.globalAlpha = 1; ctx.font = `${f.bold ? '700 ' : ''}${f.size}px ${mono}`;
                        ctx.textAlign = f.anchor === 'middle' ? 'center' : f.anchor === 'end' ? 'right' : 'left';
                        if (f.alone) { ctx.lineWidth = 3; ctx.strokeStyle = fondo; ctx.strokeText(f.s, f.x, f.y); }
                        ctx.fillStyle = testoColore; ctx.fillText(f.s, f.x, f.y);
                    }
                });
                ctx.globalAlpha = 1; ctx.setLineDash([]);
            }

            /** La prova sotto il punto (x, y del canvas): la colonna o il nome più vicino, entro 9 px. */
            function provaNelPunto(sc, x, y) {
                let meglio = null, dMin = 9;
                sc.colonne.forEach(c => {
                    const vx = c.x2 - c.x1, vy = c.y2 - c.y1, l2 = vx * vx + vy * vy || 1;
                    const t = Math.max(0, Math.min(1, ((x - c.x1) * vx + (y - c.y1) * vy) / l2));
                    const dd = Math.hypot(x - (c.x1 + vx * t), y - (c.y1 + vy * t));
                    if (dd < dMin) { dMin = dd; meglio = c.id; }
                });
                return meglio;
            }

            let datiVista3dCorrenti = null, ultimaScena3d = null;
            function renderVista3d(leggera) {
                const box = document.getElementById('graficoVista3d');
                renderLivelli3d();
                document.querySelectorAll('#modalVista3d [data-livello]').forEach(b => b.setAttribute('aria-pressed', String(vista3d.livelli[b.dataset.livello])));
                sincronizzaCursori3d();
                // Nel modo Mappa la figura 3D non si vede: si aggiorna la mappa 2D.
                if (areaMappa.modo === 'mappa') { disegnaProveMappa(); return; }
                const tg = vista3d.taglio, so = datiVista3dCorrenti && modelloSolido(datiVista3dCorrenti);
                document.querySelectorAll('#direzioneTaglio3d [data-taglio-dir]').forEach(b => b.setAttribute('aria-pressed', String((tg.dir || '') === b.dataset.taglioDir)));
                document.getElementById('rngTaglioV3d').disabled = !tg.dir;
                document.getElementById('btnTaglioLato3d').disabled = !tg.dir;
                document.getElementById('lblTaglioH3d').textContent = numeroConVirgola(so ? Math.min(tg.prof, so.fondo) : 0, 1) + ' m';
                // Il modello solido serve almeno un triangolo di prove: con meno, i tagli non ci sono.
                document.getElementById('tagliVista3d').style.display = so ? '' : 'none';
                document.getElementById('notaTagli3d').hidden = !!so;
                if (!datiVista3dCorrenti) {
                    ultimaScena3d = null;
                    box.innerHTML = '<div class="palette-vuota">Per la vista 3D serve almeno una prova col GPS e con le letture.</div>';
                    return;
                }
                let canvas = box.querySelector('canvas');
                if (!canvas) { box.innerHTML = '<canvas aria-label="Vista 3D del terreno e delle prove" role="img"></canvas>'; canvas = box.querySelector('canvas'); }
                ultimaScena3d = scena3d(datiVista3dCorrenti, box.clientWidth, leggera, false, box.clientHeight);
                disegnaScena(canvas, ultimaScena3d);
            }

            function apriVista3d(modo) {
                saveState();
                closeAnyOpenModal();
                const proj = state.projects[state.currentProjectId];
                datiVista3dCorrenti = datiVista3d(proj);
                if (datiVista3dCorrenti) {
                    // Esagerazione di partenza: quanto basta perché si vedano il rilievo (un ottavo del
                    // lato; senza DTM non c'è) e le colonne (un sesto), entro ×30. È scritta nella
                    // figura e si cambia.
                    const d = datiVista3dCorrenti, rilievo = Math.max(0.5, d.zMax - d.zMin);
                    const profMax = Math.max(1, ...d.prove.map(p => p.fondo));
                    vista3d.ex = Math.max(1, Math.min(30, Math.round(Math.max(d.senzaDtm ? 0 : d.lato / 8 / rilievo, d.lato / 6 / profMax))));
                    vistaIniziale3d();
                }
                document.getElementById('modalVista3dOverlay').classList.add('open');
                document.getElementById('modalVista3d').classList.add('open');
                riempiSceltaSfondo3d();
                vista3d.disegno = null;
                renderElencoSezioni3d();
                modoAreaMappa(typeof modo === 'string' ? modo : '3d');
                aggiornaStatoSfondo3d();
            }

            /** Il punto di vista di partenza: da sopra, di sbieco, la scena al centro. */
            function vistaIniziale3d() {
                vista3d.az = -0.6; vista3d.el = 0.62; vista3d.centro = [0, 0, 0];
                vista3d.taglio = { dir: null, pos: 0.5, lato: 1, prof: 0 };
                document.getElementById('rngTaglioV3d').value = 50;
                document.getElementById('rngTaglioH3d').value = 0;
                vista3d.zoom = 1.4; // le prove grandi, il terreno ai bordi si può tagliare
            }

            const box3d = document.getElementById('graficoVista3d');
            let attesaDisegno3d = false;
            // Mentre si gira: versione leggera a ogni fotogramma; lasciato, la figura intera.
            function ridisegna3d() {
                if (attesaDisegno3d) return;
                attesaDisegno3d = true;
                requestAnimationFrame(() => { attesaDisegno3d = false; renderVista3d(!!(vista3d.trascina || vista3d.pizzico)); });
            }
            // MASSIMA LIBERTÀ (richiesto: «devo poter vedere sotto all'orizzonte»). Un dito o il
            // mouse girano in ogni direzione, senza fermi: si passa sotto il piano campagna e si
            // guardano le colonne da sotto. Tasto destro, Maiusc + trascina o due dita spostano la
            // scena; due dita avvicinano e allontanano. «Vista iniziale» rimette tutto a posto.
            const dita3d = new Map();
            const pizzicoDita = () => { const [a, b] = [...dita3d.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
            box3d.addEventListener('contextmenu', (e) => e.preventDefault());
            // Il tasto centrale sposta come il destro: niente scorrimento automatico del browser.
            box3d.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
            /** Sposta il punto attorno a cui si gira, in metri veri: trascinare di dx, dy pixel porta la
             * scena con sé (lungo l'orizzontale e la verticale dello schermo), e poi si gira attorno a lì. */
            function sposta3d(dx, dy) {
                const k = (ultimaScena3d && ultimaScena3d.k) || 1, u = dx / k, v = dy / k, c = vista3d.centro;
                const ca = Math.cos(vista3d.az), sa = Math.sin(vista3d.az), ce = Math.cos(vista3d.el), se = Math.sin(vista3d.el);
                c[0] += -u * ca + v * se * sa;
                c[1] += u * sa + v * se * ca;
                c[2] += v * ce / vista3d.ex;
            }
            box3d.addEventListener('pointerdown', (e) => {
                dita3d.set(e.pointerId, { x: e.clientX, y: e.clientY });
                vista3d.trascina = dita3d.size === 1 ? { x: e.clientX, y: e.clientY, sposta: e.button === 1 || e.button === 2 || e.shiftKey } : null;
                vista3d.pizzico = dita3d.size === 2 ? pizzicoDita() : null;
                vista3d.mosso = 0;
                if (box3d.setPointerCapture) box3d.setPointerCapture(e.pointerId);
            });
            box3d.addEventListener('pointermove', (e) => {
                if (dita3d.has(e.pointerId)) dita3d.set(e.pointerId, { x: e.clientX, y: e.clientY });
                if (vista3d.pizzico && dita3d.size === 2) {
                    const p = pizzicoDita(), prima = vista3d.pizzico;
                    sposta3d(p.x - prima.x, p.y - prima.y);
                    zoom3d(prima.d ? p.d / prima.d : 1);
                    vista3d.pizzico = p;
                    vista3d.mosso += 10;
                    return;
                }
                if (!vista3d.trascina) return;
                const dx = e.clientX - vista3d.trascina.x, dy = e.clientY - vista3d.trascina.y;
                vista3d.mosso += Math.abs(dx) + Math.abs(dy);
                if (vista3d.trascina.sposta) sposta3d(dx, dy);
                else { vista3d.az += dx * 0.008; vista3d.el += dy * 0.006; }
                vista3d.trascina = { x: e.clientX, y: e.clientY, sposta: vista3d.trascina.sposta };
                ridisegna3d();
            });
            ['pointerup', 'pointercancel'].forEach(t => box3d.addEventListener(t, (e) => {
                const eraMosso = vista3d.trascina || vista3d.pizzico;
                dita3d.delete(e.pointerId);
                vista3d.trascina = null; vista3d.pizzico = null;
                if (eraMosso && vista3d.mosso > 3) ridisegna3d(); // la figura intera
            }));
            // Un clic (non un trascinamento) su una colonna o sul nome apre il fumetto della prova.
            const puntoCanvas = e => { const c = box3d.querySelector('canvas'), r = c ? c.getBoundingClientRect() : { left: 0, top: 0 }; return [e.clientX - r.left, e.clientY - r.top]; };
            box3d.addEventListener('click', (e) => {
                if (!ultimaScena3d || vista3d.mosso > 3) return;
                if (vista3d.disegno) { clicTracciaSezione3d(e); return; }
                if (clicStrumentoMappa3d(e)) return;
                // Seleziona: la scheda della prova, la stessa della mappa 2D.
                scegliProvaMappa(provaNelPunto(ultimaScena3d, ...puntoCanvas(e)) || null);
            });
            // Col mouse sopra una colonna, la manina.
            box3d.addEventListener('pointermove', (e) => {
                if (vista3d.trascina || !ultimaScena3d) return;
                if (vista3d.disegno) { seguiTracciaSezione3d(e); return; }
                const c = box3d.querySelector('canvas'), [mx, my] = puntoCanvas(e);
                if (c) c.style.cursor = provaNelPunto(ultimaScena3d, mx, my) ? 'pointer' : 'grab';
            });
            box3d.addEventListener('keydown', (e) => {
                if (e.key === '+' || e.key === '-') { e.preventDefault(); return zoom3d(e.key === '+' ? 1.25 : 0.8); }
                const mosse = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, 0.1], ArrowDown: [0, -0.1] }[e.key];
                if (!mosse) return;
                e.preventDefault();
                // Con Maiusc le frecce spostano la scena invece di girarla.
                if (e.shiftKey) sposta3d(-mosse[0] * 200, mosse[1] * 300);
                else { vista3d.az += mosse[0]; vista3d.el += mosse[1]; }
                renderVista3d();
            });
            function zoom3d(f) { vista3d.zoom = Math.max(0.1, Math.min(40, vista3d.zoom * f)); ridisegna3d(); }
            // La rotella avvicina verso il punto sotto il cursore, che resta fermo.
            box3d.addEventListener('wheel', (e) => {
                e.preventDefault();
                const prima = vista3d.zoom;
                zoom3d(Math.exp(-e.deltaY * 0.0015));
                if (!ultimaScena3d || !box3d.querySelector('canvas')) return;
                const [mx, my] = puntoCanvas(e), f = 1 - prima / vista3d.zoom;
                sposta3d(-(mx - ultimaScena3d.W / 2) * f, -(my - ultimaScena3d.H / 2) * f);
            }, { passive: false });
            /** Accende il modello solido e lo inquadra: il corpo sta tra le prove, la scena intorno
             * comprende tutto il terreno, e da lontano il corpo sarebbe un francobollo. */
            function accendiSolido3d() {
                vista3d.livelli.solido = true;
                const d = datiVista3dCorrenti, so = d && modelloSolido(d);
                if (!so) return;
                const xs = so.involucro.map(p => p[0]), ys = so.involucro.map(p => p[1]);
                const diametro = Math.max(10, Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)));
                vista3d.zoom = Math.max(vista3d.zoom, Math.min(40, d.lato / diametro * 2.2));
                vista3d.centro = [0, 0, 0];
            }
            document.getElementById('modalVista3d').addEventListener('click', (e) => {
                const b = e.target.closest('[data-livello]');
                if (!b) return;
                if (b.dataset.livello === 'solido' && !vista3d.livelli.solido) { accendiSolido3d(); renderVista3d(); return; }
                vista3d.livelli[b.dataset.livello] = !vista3d.livelli[b.dataset.livello];
                renderVista3d();
            });
            // ---- IL PANNELLO LIVELLI (preso da HyperGram 6.0b, «come in QGIS»): sopra la figura, in alto a
            // destra; si richiude in una pillola. Gruppi apribili, ciascuno con la sua spunta (tutto il
            // gruppo); righe con spunta, simbolo, nome e un numero. Ogni prova è un livello, ogni strato
            // è un livello; poi gli oggetti del modello, i riferimenti e lo sfondo. ----
            const livelliChiusi3d = (() => { try { return JSON.parse(localStorage.getItem('dpsh.livelli3dGruppiChiusi') || '{}'); } catch (_) { return {}; } })();
            function renderLivelli3d() {
                const albero = document.getElementById('livelliVista3d'), d = datiVista3dCorrenti;
                if (!albero) return;
                const L = vista3d.livelli, ico = n => `<svg class="ico"><use href="#i-${n}"/></svg>`;
                const sw = (cls, stile) => `<span class="liv-sw ${cls}" style="${stile}"></span>`;
                const prove = d ? d.prove : [];
                const strati = new Map();
                prove.forEach(p => p.fasce.forEach(f => { const v = strati.get(f.nome) || { colore: f.colore, n: new Set() }; v.n.add(p.s.id); strati.set(f.nome, v); }));
                const riga = (attr, acceso, simbolo, nome, conta, titolo) => ({ attr, acceso, simbolo, nome, conta, titolo });
                const liv = (k, simbolo, nome, titolo) => riga(`data-livello="${k}"`, !!L[k], simbolo, nome, '', titolo);
                const gruppi = [
                    { id: 'prove', nome: 'Prove', righe: prove.map(p => riga(`data-prova3d="${p.s.id}"`, !vista3d.proveNascoste.has(p.s.id),
                        `<svg width="8" height="16" viewBox="0 0 8 16">${p.fasce.map(f => `<rect x="0" y="${(16 * f.da / (p.fondo || 1)).toFixed(1)}" width="8" height="${(16 * (f.a - f.da) / (p.fondo || 1)).toFixed(1)}" fill="${f.colore}"/>`).join('')}</svg>`,
                        nomeDpsh(p.s), numeroConVirgola(p.fondo, 1) + ' m', 'La colonna, il nome e la falda di questa prova')) },
                    { id: 'strati', nome: 'Strati', righe: [...strati].map(([nome, v]) => riga(`data-strato3d="${String(nome).replace(/"/g, '&quot;')}"`, !vista3d.stratiNascosti.has(nome),
                        sw('aree', `background:${v.colore}; border-color:${v.colore}`), nome, v.n.size, `Lo strato nelle colonne, nei pannelli, nelle superfici e nel corpo solido (in ${v.n.size} prove)`)) },
                    { id: 'modello', nome: 'Modello', righe: [
                        liv('solido', ico('stack'), 'Corpo solido', 'Il modello chiuso tra le prove (i tagli nella scheda «Modello e tagli»)'),
                        liv('pannelli', sw('aree', 'background:#94a3b8; border-color:#64748b'), 'Pannelli di correlazione'),
                        liv('superfici', sw('aree', 'background:transparent; border-color:#64748b; border-style:dashed'), 'Superfici di contatto'),
                        liv('giaciture', ico('target'), 'Giaciture'),
                        liv('nomiGiaciture', ico('tag'), 'Nomi degli strati sulle giaciture'),
                        liv('falda', sw('linee', 'background:#0284c7'), 'Falda') ] },
                    { id: 'riferimenti', nome: 'Riferimenti', righe: [
                        liv('nomi', ico('type'), 'Nomi delle prove'),
                        liv('misure', ico('ruler'), 'Misure', 'Distanze tra le prove e asta delle quote'),
                        riga('data-livello="sezioni"', !!L.sezioni, sw('linee', 'background:#dc2626'), 'Sezioni tracciate', (() => { const pr = state.projects[state.currentProjectId]; return ((pr && pr.sezioniTracciate) || []).length || ''; })()) ] },
                    { id: 'sfondo', nome: 'Sfondo', righe: [
                        liv('terreno', sw('aree', 'background:#a3a36b; border-color:#6b7a4b'), d && d.senzaDtm ? 'Piano campagna' : 'Terreno (DTM)'),
                        liv('immagine', ico('satellite'), 'Immagine sul terreno', 'Quella scelta nella scheda «Immagine»') ] }
                ];
                // Nel modo Mappa: le prove, le sezioni e lo sfondo della mappa (uno solo alla volta).
                if (areaMappa.modo === 'mappa') {
                    gruppi.splice(1, 2);
                    gruppi[1] = { id: 'riferimenti', nome: 'Riferimenti', righe: gruppi[1].righe.filter(r => /sezioni/.test(r.attr)) };
                    gruppi[2] = { id: 'sfondo2d', nome: 'Sfondo', righe: [['satellite', 'Satellite (Esri)'], ['street', 'Strade (OpenStreetMap)'], ['hybrid', 'Satellite con nomi']].map(([k, nome]) =>
                        riga(`data-sfondo2d="${k}"`, mappaProgetto.stile === k, ico(k === 'street' ? 'map' : 'satellite'), nome, '', 'Lo sfondo della mappa')) };
                }
                albero.innerHTML = gruppi.filter(g => g.righe.length).map(g => {
                    const chiuso = !!livelliChiusi3d[g.id], tutti = g.righe.every(r => r.acceso);
                    return `<div class="liv-gruppo${chiuso ? ' chiuso' : ''}" data-gruppo="${g.id}"><button type="button" data-apri-gruppo="${g.id}" title="Apri o chiudi il gruppo">${ico('chevron-down')}</button>`
                        + (g.id === 'sfondo2d' ? '' : `<input type="checkbox" data-gruppo3d="${g.id}"${tutti ? ' checked' : ''} title="Mostra o nascondi tutto il gruppo">`) + `<span>${g.nome}</span></div>`
                        + `<div class="liv-gruppo-corpo${chiuso ? ' chiuso' : ''}" data-corpo="${g.id}"><div class="liv-gruppo-dentro">`
                        + g.righe.map(r => `<div class="liv-riga${r.acceso ? '' : ' spento'}" ${r.attr} data-gruppo="${g.id}"${r.titolo ? ` title="${r.titolo}"` : ''}>`
                            + `<input type="checkbox"${r.acceso ? ' checked' : ''} tabindex="-1" aria-label="Mostra o nascondi ${escapeHtmlDidascalia(String(r.nome))}"><span class="liv-simbolo">${r.simbolo}</span>`
                            + `<span class="liv-nome">${escapeHtmlDidascalia(String(r.nome))}</span><span class="liv-conta">${r.conta}</span></div>`).join('')
                        + '</div></div>';
                }).join('');
            }
            // (il pannello si apre, si riduce, si aggancia e si sposta come tutti i pannelli della mappa: 071m)
            document.getElementById('livelliVista3d').addEventListener('click', (e) => {
                const g = e.target.closest('[data-apri-gruppo]');
                if (g) {
                    // niente ridisegno: si cambia solo la classe, così il gruppo si apre o si chiude scorrendo
                    const id = g.dataset.apriGruppo;
                    livelliChiusi3d[id] = !livelliChiusi3d[id];
                    try { localStorage.setItem('dpsh.livelli3dGruppiChiusi', JSON.stringify(livelliChiusi3d)); } catch (_) { /* solo per questa volta */ }
                    g.closest('.liv-gruppo').classList.toggle('chiuso', livelliChiusi3d[id]);
                    document.querySelector(`#livelliVista3d [data-corpo="${id}"]`).classList.toggle('chiuso', livelliChiusi3d[id]);
                    return;
                }
                const sfondo2d = e.target.closest('[data-sfondo2d]');
                if (sfondo2d) { sfondoMappaProgetto(sfondo2d.dataset.sfondo2d); renderLivelli3d(); return; }
                const tuttoGruppo = e.target.closest('[data-gruppo3d]');
                const righe = tuttoGruppo ? [...document.querySelectorAll(`#livelliVista3d .liv-riga[data-gruppo="${tuttoGruppo.dataset.gruppo3d}"]`)] : [e.target.closest('.liv-riga')].filter(Boolean);
                if (!righe.length) return;
                // Spunta del gruppo: se è tutto acceso si spegne tutto, altrimenti si accende tutto.
                const accendi = tuttoGruppo ? righe.some(r => r.classList.contains('spento')) : null;
                righe.forEach(r => {
                    const acceso = !r.classList.contains('spento'), nuovo = accendi === null ? !acceso : accendi;
                    if (r.dataset.prova3d) vista3d.proveNascoste[nuovo ? 'delete' : 'add'](r.dataset.prova3d);
                    else if (r.dataset.strato3d !== undefined) vista3d.stratiNascosti[nuovo ? 'delete' : 'add'](r.dataset.strato3d);
                    else if (r.dataset.livello && tuttoGruppo) {
                        if (r.dataset.livello === 'solido' && nuovo && !vista3d.livelli.solido) accendiSolido3d();
                        vista3d.livelli[r.dataset.livello] = nuovo;
                    }
                });
                // Una riga di livello (data-livello) la accende e spegne il gestore di tutta la finestra.
                if (tuttoGruppo || !righe[0].dataset.livello) renderVista3d();
            });
            document.getElementById('btnApriVista3d').addEventListener('click', apriVista3d);

            // ---- I comandi della vista: schede, viste pronte, cursori ----
            document.getElementById('schedeVista3d').addEventListener('click', (e) => {
                const b = e.target.closest('[data-scheda3d]');
                if (!b) return;
                document.querySelectorAll('#schedeVista3d [data-scheda3d]').forEach(t => t.setAttribute('aria-selected', String(t === b)));
                document.querySelectorAll('#modalVista3d [data-pannello3d]').forEach(pn => { pn.hidden = pn.dataset.pannello3d !== b.dataset.scheda3d; });
            });
            const gradi = r => r * 180 / Math.PI;
            /** La direzione verso cui si guarda (0 = verso Nord) e il suo nome. */
            const direzioneVista3d = () => ((Math.round(gradi(vista3d.az)) % 360) + 360) % 360;
            const nomeDirezione = g => ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ovest', 'Ovest', 'Nord-Ovest'][Math.round(g / 45) % 8];
            const ZOOM_MIN = 0.1, ZOOM_MAX = 40;
            function sincronizzaCursori3d() {
                // L'inclinazione si legge tra −90 e 90: oltre, la vista è capovolta e vale come la sua gemella.
                const el = Math.atan2(Math.sin(vista3d.el), Math.abs(Math.cos(vista3d.el)));
                const fz = Math.log(vista3d.zoom / ZOOM_MIN) / Math.log(ZOOM_MAX / ZOOM_MIN);
                bussola3d.aggiorna({
                    nord: -gradi(vista3d.az), incl: el,
                    zoom: { f: fz, testo: '×' + numeroConVirgola(vista3d.zoom, vista3d.zoom < 10 ? 1 : 0), piuNo: vista3d.zoom >= ZOOM_MAX, menoNo: vista3d.zoom <= ZOOM_MIN },
                    esag: { f: (vista3d.ex - 1) / 29, testo: '×' + vista3d.ex, piuNo: vista3d.ex >= 30, menoNo: vista3d.ex <= 1 }
                });
                const bp = document.getElementById('btnProspettiva3d');
                bp.setAttribute('aria-pressed', String(vista3d.prospettiva));
                bp.textContent = vista3d.prospettiva ? 'Accesa' : 'Spenta';
                document.getElementById('rngFov3d').value = vista3d.fov;
                document.getElementById('rngFov3d').disabled = !vista3d.prospettiva;
                document.getElementById('lblFov3d').textContent = vista3d.prospettiva ? `campo visivo ${vista3d.fov}°` : 'assonometria';
                document.querySelectorAll('#presetVista3d [data-preset3d]').forEach(b => b.setAttribute('aria-pressed', 'false'));
            }
            /** Porta la vista a una posizione, con un breve movimento (per l'azimut, dalla parte più corta). */
            let animazione3d = null;
            function vaiAVista3d(meta) {
                const da = { az: vista3d.az, el: vista3d.el }, a = Object.assign({}, da, meta);
                let dAz = (a.az - da.az) % (2 * Math.PI);
                if (dAz > Math.PI) dAz -= 2 * Math.PI; else if (dAz < -Math.PI) dAz += 2 * Math.PI;
                const t0 = performance.now(), durata = 350;
                cancelAnimationFrame(animazione3d);
                const passo = (t) => {
                    const u = Math.min(1, (t - t0) / durata), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
                    vista3d.az = da.az + dAz * e; vista3d.el = da.el + (a.el - da.el) * e;
                    renderVista3d(u < 1);
                    if (u < 1) animazione3d = requestAnimationFrame(passo);
                };
                animazione3d = requestAnimationFrame(passo);
            }
            const VISTE_PRONTE_3D = {
                alto: { az: 0, el: Math.PI / 2 },
                iso: { az: Math.PI / 4, el: Math.atan(1 / Math.SQRT2), prospettiva: false },  // isometrica vera: 35,26° e 45°
                nord: { az: Math.PI, el: 0 }, est: { az: -Math.PI / 2, el: 0 },
                sud: { az: 0, el: 0 }, ovest: { az: Math.PI / 2, el: 0 },
                sotto: { az: 0, el: -Math.PI / 2 }
            };
            document.getElementById('presetVista3d').addEventListener('click', (e) => {
                const b = e.target.closest('[data-preset3d]');
                if (!b) return;
                const v = VISTE_PRONTE_3D[b.dataset.preset3d];
                if (v.prospettiva !== undefined) vista3d.prospettiva = v.prospettiva;
                vaiAVista3d({ az: v.az, el: v.el });
            });
            // ---- La bussola (presa da HyperGram 6.0b, creaBussola): sopra la figura, in alto a sinistra.
            // L'anello graduato gira col nord e trascinato gira la vista; l'indice ciano in alto e l'arco
            // misurano di quanto è girata. Al centro la leva: trascinata sposta la scena (più lontano
            // dal centro, più veloce; Maiusc più veloce ancora), un clic mette il Nord in alto. Agli
            // angoli: dall'alto, vista di partenza, gira finché si tiene premuto. A destra le righe di
            // zoom, inclinazione ed esagerazione: disegnino, − cursore +, valore che si accende quando
            // cambia. La freccia le richiude (restano disegnini e valori) e la scelta si ricorda.
            const giri = g => ((g % 360) + 540) % 360 - 180;            // gradi in (-180, 180]
            const segnoGradi = g => (g > 0 ? '+' : g < 0 ? '−' : '') + Math.abs(g) + '°';
            const INCL_3D = [-90, 90];
            const bussola3d = (() => {
                const div = document.getElementById('bussola3d');
                const MINI = {
                    zoom: '<svg class="b-mini-svg" viewBox="0 0 12 24"><rect class="b-mz-fondo" x="4" y="2" width="4" height="20" rx="2"/><rect class="b-mz-pieno" x="4" y="12" width="4" height="10" rx="2"/>' +
                        '<circle class="b-mz-cur" cx="6" cy="12" r="3.2"/></svg>',
                    incl: '<svg class="b-mini-svg" viewBox="0 0 24 44"><path class="b-incl-arco" d="M3 4 A18 18 0 0 1 3 40"/><line class="b-incl-oriz" x1="19" y1="22" x2="24" y2="22"/>' +
                        '<path class="b-incl-spicchio" d=""/><line class="b-incl-ago" x1="3" y1="22" x2="21" y2="22"/><circle class="b-incl-punta" cx="21" cy="22" r="3"/>' +
                        '<circle class="b-incl-occhio" cx="3" cy="22" r="2.6"/></svg>',
                    // l'esagerazione: un rilievo che si alza
                    esag: '<svg class="b-mini-svg" viewBox="0 0 20 24"><line class="b-me-base" x1="1" y1="21" x2="19" y2="21"/><path class="b-me-rilievo" d=""/></svg>'
                };
                const ico = (nome, gira) => `<svg class="ico"${gira ? ` style="transform: rotate(${gira}deg)"` : ''}><use href="#i-${nome}"/></svg>`;
                const tasto = (cls, dentro, titolo, attr) => `<button type="button" class="b-tasto ${cls}" ${attr} title="${titolo}" aria-label="${titolo}">${dentro}</button>`;
                const riga = (nome, et, sx, titolo, dx, dentro) => `<div class="b-riga" data-riga="${nome}"><span class="b-mini" title="${et}">${MINI[nome]}</span>` +
                    `<span class="b-ext">${sx}<div class="b-traccia" data-trac="${nome}" title="${titolo}">${dentro}<i class="b-cursore"></i></div>${dx}</span><span class="b-val"></span></div>`;
                let tacche = '';
                for (let g = 5; g < 360; g += 5) {
                    const l = g % 90 === 0 ? 6 : g % 45 === 0 ? 5 : g % 15 === 0 ? 3.6 : 2;
                    tacche += `<line class="${g % 15 ? 'm' : 'M'}" x1="60" y1="5" x2="60" y2="${5 + l}" transform="rotate(${g} 60 60)"/>`;
                }
                div.innerHTML =
                    '<div class="b-dial"><svg class="b-svg" viewBox="0 0 120 120" aria-hidden="true">' +
                        '<circle class="b-fondo" cx="60" cy="60" r="59.5"/><circle class="b-anello" cx="60" cy="60" r="46.5"/>' +
                        `<g class="b-rosa">${tacche}<path class="b-ntri" d="M60 6.2 L63.2 12 L56.8 12 Z"/></g>` +
                        '<g class="b-lettere"><text class="b-n">N</text><text>E</text><text>S</text><text>O</text></g>' +
                        '<path class="b-arco" d=""/><circle class="b-arco-punta" cx="60" cy="23" r="2.6"/>' +
                        '<path class="b-indice" d="M60 5.6 L56.4 0.8 L63.6 0.8 Z"/>' +
                        '<circle class="b-presa-anello" cx="60" cy="60" r="47"/>' +
                        '<circle class="b-guida" cx="60" cy="60" r="25"/><circle class="b-guida" cx="60" cy="60" r="13"/>' +
                        '<line class="b-vettore" x1="60" y1="60" x2="60" y2="60"/><path class="b-vettore-punta" d=""/>' +
                        '<g class="b-pomello"><circle cx="60" cy="60" r="14"/><text class="b-rotta" x="60" y="63">0°</text></g>' +
                        '<circle class="b-presa-centro" cx="60" cy="60" r="37"><title>Trascina per spostare la scena · un clic mette il Nord in alto</title></circle>' +
                    '</svg>' +
                    tasto('b-ang tl', ico('arrow-up', 180), 'Guarda dall\'alto, dritto in giù', 'data-azione="alto"') +
                    tasto('b-ang tr', ico('home'), 'Vista di partenza', 'data-azione="casa"') +
                    tasto('b-ang bl', ico('undo'), 'Gira la vista in senso antiorario · tieni premuto', 'data-passo="giras"') +
                    tasto('b-ang br', ico('redo'), 'Gira la vista in senso orario · tieni premuto', 'data-passo="girad"') +
                    '</div>' +
                    '<div class="b-righe"><div class="b-righe-col">' +
                        riga('zoom', 'Zoom', tasto('', '−', 'Allontana · tieni premuto', 'data-passo="meno"'), 'Zoom: trascina (Maiusc: più fine)',
                            tasto('', ico('plus'), 'Avvicina · tieni premuto', 'data-passo="piu"'), '<i class="b-pieno"></i>') +
                        riga('incl', 'Inclinazione: 0° orizzonte, 90° dall\'alto, −90° da sotto', tasto('', ico('chevron-down', 90), 'Guarda più da sotto · tieni premuto', 'data-passo="giu"'),
                            'Inclinazione: 0° orizzonte, 90° dall\'alto, −90° da sotto · trascina (Maiusc: più fine)',
                            tasto('', ico('chevron-down', -90), 'Guarda più dall\'alto · tieni premuto', 'data-passo="su"'), '<i class="b-pieno"></i><i class="b-zero"></i>') +
                        riga('esag', 'Esagerazione verticale', tasto('', '−', 'Meno esagerata · tieni premuto', 'data-passo="esagmeno"'), 'Esagerazione verticale: trascina',
                            tasto('', ico('plus'), 'Più esagerata · tieni premuto', 'data-passo="esagpiu"'), '<i class="b-pieno"></i>') +
                    '</div>' + tasto('b-apri', ico('chevron-down', 90), 'Richiudi i comandi (restano indicatori e valori)', '') + '</div>';
                const q = sel => div.querySelector(sel), svg = q('.b-svg');
                const rosa = q('.b-rosa'), lettere = [...div.querySelectorAll('.b-lettere text')], arco = q('.b-arco'), punta = q('.b-arco-punta');
                const rotta = q('.b-rotta'), pomello = q('.b-pomello'), vettore = q('.b-vettore'), vPunta = q('.b-vettore-punta');
                const rgZoom = q('[data-riga="zoom"]'), rgInc = q('[data-riga="incl"]'), rgEsag = q('[data-riga="esag"]'), apri = q('.b-apri');
                const riduci = rid => {
                    div.classList.toggle('b-ridotta', rid);
                    apri.title = rid ? 'Apri i comandi: zoom, inclinazione ed esagerazione' : 'Richiudi i comandi (restano indicatori e valori)';
                    try { localStorage.setItem('dpsh.bussola3dRidotta', rid ? '1' : '0'); } catch (_) { /* solo per questa volta */ }
                };
                try { if (localStorage.getItem('dpsh.bussola3dRidotta') === '1') div.classList.add('b-ridotta'); } catch (_) { /* aperta */ }
                apri.addEventListener('click', () => riduci(!div.classList.contains('b-ridotta')));
                div.querySelectorAll('.b-mini').forEach(m => m.addEventListener('click', () => riduci(!div.classList.contains('b-ridotta'))));

                // un gesto col puntatore: cattura, movimento e fine sullo stesso elemento
                function presa(e, muovi, fine) {
                    const el = e.currentTarget;
                    e.preventDefault();
                    e.stopPropagation();
                    try { el.setPointerCapture(e.pointerId); } catch (_) { /* nulla */ }
                    const via = () => {
                        el.removeEventListener('pointermove', muovi);
                        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => el.removeEventListener(n, via));
                        fine();
                    };
                    el.addEventListener('pointermove', muovi);
                    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => el.addEventListener(n, via));
                }
                const misura = () => { const r = svg.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, k: 120 / (r.width || 120) }; };
                const angolo = (m, e) => Math.atan2(e.clientX - m.cx, -(e.clientY - m.cy)) * 180 / Math.PI;

                // l'anello trascinato gira la vista: il nord segue il dito
                let az0 = 0;
                q('.b-presa-anello').addEventListener('pointerdown', e => {
                    if (e.button !== 0) return;
                    const m = misura(), x0 = e.clientX, y0 = e.clientY;
                    let ultimo = angolo(m, e), somma = 0, mosso = false;
                    presa(e, ev => {
                        if (!mosso && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 3) return;
                        const a = angolo(m, ev);
                        somma += giri(a - ultimo);
                        ultimo = a;
                        if (!mosso) { div.classList.add('gira'); cancelAnimationFrame(animazione3d); az0 = vista3d.az; }
                        mosso = true;
                        vista3d.az = az0 - somma * Math.PI / 180;
                        ridisegna3d();
                    }, () => div.classList.remove('gira'));
                });

                // la leva: il pomello segue il mouse fino al bordo dell'anello, il vettore mostra direzione e velocità
                const R_LEVA = 38;
                let levaV = null;
                function mostraLeva(fx, fy) {
                    levaV = fx || fy ? [fx, fy] : null;
                    pomello.style.transform = `translate(${(fx * 24).toFixed(2)}px,${(fy * 24).toFixed(2)}px)`;
                    const d = Math.hypot(fx, fy), ux = d ? fx / d : 0, uy = d ? fy / d : 0, lun = d ? 29 * d + 17 : 0;
                    const x = 60 + ux * lun, y = 60 + uy * lun;
                    vettore.setAttribute('x2', x.toFixed(2));
                    vettore.setAttribute('y2', y.toFixed(2));
                    if (d > 0.02) {
                        const b = 5.5;
                        vPunta.setAttribute('d', `M${(x + ux * 2).toFixed(2)} ${(y + uy * 2).toFixed(2)} L${(x - ux * b - uy * b * 0.6).toFixed(2)} ${(y - uy * b + ux * b * 0.6).toFixed(2)}` +
                            ` L${(x - ux * b + uy * b * 0.6).toFixed(2)} ${(y - uy * b - ux * b * 0.6).toFixed(2)} Z`);
                    } else vPunta.setAttribute('d', '');
                    scriviRotta();
                }
                q('.b-presa-centro').addEventListener('pointerdown', e => {
                    if (e.button !== 0) return;
                    const m = misura(), x0 = e.clientX, y0 = e.clientY;
                    let mosso = false;
                    presa(e, ev => {
                        if (!mosso && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 3) return;
                        mosso = true;
                        div.classList.add('leva');
                        let x = (ev.clientX - m.cx) * m.k, y = (ev.clientY - m.cy) * m.k;
                        const d = Math.hypot(x, y);
                        if (d > R_LEVA) { x *= R_LEVA / d; y *= R_LEVA / d; }
                        mostraLeva(x / R_LEVA, y / R_LEVA);
                        moto3d.leva = [x / R_LEVA, y / R_LEVA];
                        moto3d.veloce = ev.shiftKey;
                        avviaMoto3d();
                    }, () => {
                        div.classList.remove('leva');
                        mostraLeva(0, 0);
                        moto3d.leva = null;
                        if (!mosso) vaiAVista3d({ az: 0 });
                    });
                });

                // tasti: data-passo vanno finché si tengono premuti, data-azione al clic
                div.querySelectorAll('[data-passo]').forEach(b => {
                    const su = () => { if (b.classList.contains('premuto')) { b.classList.remove('premuto'); moto3d.tasti.delete(b.dataset.passo); } };
                    b.addEventListener('pointerdown', e => {
                        if (e.button !== 0 || b.disabled) return;
                        e.preventDefault();
                        e.stopPropagation();
                        try { b.setPointerCapture(e.pointerId); } catch (_) { /* nulla */ }
                        b.classList.add('premuto');
                        moto3d.veloce = e.shiftKey;
                        moto3d.tasti.add(b.dataset.passo);
                        avviaMoto3d();
                    });
                    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => b.addEventListener(n, su));
                });
                div.querySelectorAll('[data-azione]').forEach(b => b.addEventListener('click', () => {
                    if (b.dataset.azione === 'casa') { vista3d.centro = [0, 0, 0]; vista3d.zoom = 1.4; }
                    vaiAVista3d(b.dataset.azione === 'alto' ? VISTE_PRONTE_3D.alto : { az: -0.6, el: 0.62 });
                }));

                // cursori: premendo sul pallino lo si trascina da dov'è (nessun salto), premendo altrove sulla
                // traccia ci va e da lì si trascina; il movimento è relativo, con Maiusc a un quinto
                const azTraccia = {
                    zoom: f => { vista3d.zoom = ZOOM_MIN * Math.pow(ZOOM_MAX / ZOOM_MIN, f); },
                    incl: f => { vista3d.el = (INCL_3D[0] + f * (INCL_3D[1] - INCL_3D[0])) * Math.PI / 180; },
                    esag: f => { vista3d.ex = Math.round(1 + f * 29); }
                };
                div.querySelectorAll('[data-trac]').forEach(tr => tr.addEventListener('pointerdown', e => {
                    if (e.button !== 0) return;
                    const fn = f => { azTraccia[tr.dataset.trac](f); ridisegna3d(); };
                    const r = tr.getBoundingClientRect(), largo = Math.max(1, r.width - 12);
                    const sulCursore = e.target.classList.contains('b-cursore');
                    let f = sulCursore ? +tr.dataset.f || 0 : Math.max(0, Math.min(1, (e.clientX - r.left - 6) / largo)), x0 = e.clientX;
                    cancelAnimationFrame(animazione3d);
                    div.classList.add('trac');
                    tr.classList.add('presa');
                    if (!sulCursore) fn(f);
                    presa(e, ev => {
                        f = Math.max(0, Math.min(1, f + (ev.clientX - x0) / largo * (ev.shiftKey ? 0.2 : 1)));
                        x0 = ev.clientX;
                        fn(f);
                    }, () => { div.classList.remove('trac'); tr.classList.remove('presa'); });
                }));

                // ---- aggiornamento dai valori della vista: ogni valore che cambia si accende un attimo
                const prec = {}, tempi = {};
                function accendi(chiave, nodo, valore) {
                    if (prec[chiave] !== undefined && prec[chiave] !== valore && nodo) {
                        nodo.classList.add('vivo');
                        clearTimeout(tempi[chiave]);
                        tempi[chiave] = setTimeout(() => nodo.classList.remove('vivo'), 900);
                    }
                    prec[chiave] = valore;
                }
                // al centro la direzione in cui si guarda; mentre gira, di quanto; con la leva, la velocità
                let nordOra = 0, deltaBase = null, deltaTempo = 0;
                function scriviRotta() {
                    const r = Math.round((360 - giri(nordOra) + 360) % 360) % 360;
                    const delta = deltaBase === null ? 0 : Math.round(giri(deltaBase - nordOra));
                    rotta.textContent = levaV ? Math.round(Math.min(1, levaV[0] * levaV[0] + levaV[1] * levaV[1]) * 100) + '%' : deltaBase !== null ? segnoGradi(delta) : r + '°';
                    rotta.classList.toggle('vivo', deltaBase !== null || !!levaV);
                }
                const posX = f => `calc(6px + ${(f * 100).toFixed(3)}% - ${(f * 12).toFixed(3)}px)`;
                const trac = (rg, f, da) => {
                    f = Math.max(0, Math.min(1, f));
                    const tr = rg.querySelector('.b-traccia'), c = tr.querySelector('.b-cursore'), p = tr.querySelector('.b-pieno');
                    tr.dataset.f = f;
                    c.style.left = posX(f);
                    const a = Math.min(da || 0, f), b = Math.max(da || 0, f);
                    p.style.left = posX(a);
                    p.style.width = `calc(${((b - a) * 100).toFixed(3)}% - ${((b - a) * 12).toFixed(3)}px)`;
                };
                const valore = (rg, chiave, testo) => { rg.querySelector('.b-val').textContent = testo; accendi(chiave, rg, testo); };
                const meniPiu = (rg, s, meno, piu) => { rg.querySelector(`[data-passo="${meno}"]`).disabled = !!s.menoNo; rg.querySelector(`[data-passo="${piu}"]`).disabled = !!s.piuNo; };
                function aggiorna(s) {
                    const n = giri(s.nord || 0), nTondo = Math.round(n * 10) / 10;
                    if (prec.nord !== undefined && prec.nord !== nTondo) {
                        if (deltaBase === null) deltaBase = prec.nordVero;
                        clearTimeout(deltaTempo);
                        deltaTempo = setTimeout(() => { deltaBase = null; scriviRotta(); }, 1100);
                    }
                    prec.nord = nTondo;
                    prec.nordVero = n;
                    nordOra = n;
                    rosa.setAttribute('transform', `rotate(${n.toFixed(2)} 60 60)`);
                    lettere.forEach((t, i) => {
                        const a = (n + i * 90) * Math.PI / 180;
                        t.setAttribute('x', (60 + 44.5 * Math.sin(a)).toFixed(2));
                        t.setAttribute('y', (60 - 44.5 * Math.cos(a)).toFixed(2));
                    });
                    const a = n * Math.PI / 180, ex = 60 + 37 * Math.sin(a), ey = 60 - 37 * Math.cos(a);
                    arco.setAttribute('d', Math.abs(n) < 0.3 ? '' : `M60 23 A37 37 0 0 ${n > 0 ? 1 : 0} ${ex.toFixed(2)} ${ey.toFixed(2)}`);
                    punta.setAttribute('cx', ex.toFixed(2));
                    punta.setAttribute('cy', ey.toFixed(2));
                    div.classList.toggle('ruotata', Math.abs(n) >= 0.3);
                    scriviRotta();
                    trac(rgZoom, s.zoom.f, 0);
                    const fz = Math.max(0, Math.min(1, s.zoom.f)), yz = 22 - fz * 20;
                    rgZoom.querySelector('.b-mz-pieno').setAttribute('y', yz.toFixed(2));
                    rgZoom.querySelector('.b-mz-pieno').setAttribute('height', (22 - yz).toFixed(2));
                    rgZoom.querySelector('.b-mz-cur').setAttribute('cy', yz.toFixed(2));
                    valore(rgZoom, 'zoom', s.zoom.testo);
                    meniPiu(rgZoom, s.zoom, 'meno', 'piu');
                    const g = s.incl * 180 / Math.PI, fi = v => (v - INCL_3D[0]) / (INCL_3D[1] - INCL_3D[0]);
                    trac(rgInc, fi(g), fi(0));
                    // il disegnino guarda da sinistra: in su = dall'alto (90°), in giù = da sotto
                    const e = s.incl, ix = 3 + 18 * Math.cos(e), iy = 22 + 18 * Math.sin(e);
                    const ago = rgInc.querySelector('.b-incl-ago'), pt = rgInc.querySelector('.b-incl-punta');
                    ago.setAttribute('x2', ix.toFixed(2)); ago.setAttribute('y2', iy.toFixed(2));
                    pt.setAttribute('cx', ix.toFixed(2)); pt.setAttribute('cy', iy.toFixed(2));
                    rgInc.querySelector('.b-incl-spicchio').setAttribute('d', Math.abs(e) < 0.005 ? '' : `M3 22 L21 22 A18 18 0 0 ${e > 0 ? 1 : 0} ${ix.toFixed(2)} ${iy.toFixed(2)} Z`);
                    rgInc.querySelector('.b-zero').style.left = posX(fi(0));
                    valore(rgInc, 'incl', Math.round(g) + '°');
                    meniPiu(rgInc, { menoNo: g <= INCL_3D[0], piuNo: g >= INCL_3D[1] }, 'giu', 'su');
                    trac(rgEsag, s.esag.f, 0);
                    const hE = 3 + Math.max(0, Math.min(1, s.esag.f)) * 17;
                    rgEsag.querySelector('.b-me-rilievo').setAttribute('d', `M1 21 L7 ${(21 - hE * 0.6).toFixed(2)} L11 ${(21 - hE).toFixed(2)} L19 21 Z`);
                    valore(rgEsag, 'esag', s.esag.testo);
                    meniPiu(rgEsag, s.esag, 'esagmeno', 'esagpiu');
                }
                mostraLeva(0, 0);
                return { aggiorna };
            })();
            // Leva e tasti tenuti premuti: un passo a ogni fotogramma finché durano.
            const moto3d = { leva: null, tasti: new Set(), veloce: false, attivo: false, fotogramma: 0 };
            function avviaMoto3d() {
                if (moto3d.attivo) return;
                moto3d.attivo = true;
                cancelAnimationFrame(animazione3d);
                const passo = () => {
                    const t = moto3d.tasti, v = moto3d.veloce ? 3 : 1, f = moto3d.fotogramma++;
                    if (!moto3d.leva && !t.size) { moto3d.attivo = false; renderVista3d(); return; }
                    if (moto3d.leva) sposta3d(-moto3d.leva[0] * 9 * v, -moto3d.leva[1] * 9 * v);
                    // Tastiera (da HyperGram): W S avanti e indietro nella direzione in cui si guarda, A D di lato,
                    // Q Z su e giù; si sposta il punto attorno a cui si gira, di un passo che segue lo zoom.
                    const d0 = datiVista3dCorrenti, passoM = d0 ? d0.lato / 2.15 / vista3d.zoom * 0.012 * v : 0;
                    const ca = Math.cos(vista3d.az), sa = Math.sin(vista3d.az), c = vista3d.centro;
                    if (t.has('w') || t.has('s')) { const k = t.has('w') ? passoM : -passoM; c[0] += sa * k; c[1] += ca * k; }
                    if (t.has('a') || t.has('d')) { const k = t.has('d') ? passoM : -passoM; c[0] += ca * k; c[1] -= sa * k; }
                    if (t.has('q')) c[2] += passoM / Math.max(1, vista3d.ex) * 2;
                    if (t.has('z')) c[2] -= passoM / Math.max(1, vista3d.ex) * 2;
                    if (t.has('giras')) vista3d.az += 0.025 * v;
                    if (t.has('girad')) vista3d.az -= 0.025 * v;
                    if (t.has('piu')) vista3d.zoom = Math.min(ZOOM_MAX, vista3d.zoom * (1 + 0.025 * v));
                    if (t.has('meno')) vista3d.zoom = Math.max(ZOOM_MIN, vista3d.zoom / (1 + 0.025 * v));
                    const el = gradi(Math.atan2(Math.sin(vista3d.el), Math.abs(Math.cos(vista3d.el))));
                    if (t.has('su')) vista3d.el = Math.min(INCL_3D[1], el + 1 * v) * Math.PI / 180;
                    if (t.has('giu')) vista3d.el = Math.max(INCL_3D[0], el - 1 * v) * Math.PI / 180;
                    // l'esagerazione va a scatti interi: uno ogni sei fotogrammi
                    if (f % 6 === 0 && t.has('esagpiu')) vista3d.ex = Math.min(30, vista3d.ex + 1);
                    if (f % 6 === 0 && t.has('esagmeno')) vista3d.ex = Math.max(1, vista3d.ex - 1);
                    renderVista3d(true);
                    requestAnimationFrame(passo);
                };
                requestAnimationFrame(passo);
            }
            document.getElementById('btnProspettiva3d').addEventListener('click', () => { vista3d.prospettiva = !vista3d.prospettiva; renderVista3d(); });
            document.getElementById('rngFov3d').addEventListener('input', (e) => { vista3d.fov = Number(e.target.value); ridisegna3d(); });

            // ---- L'immagine sul terreno: scelta, opacità, WMS ----
            /** Il menù: nessuna, i fornitori a tessere, i WMS pronti e i propri, e un WMS qualsiasi. */
            function riempiSceltaSfondo3d() {
                const sel = document.getElementById('selSfondo3d'), sc = sceltaSfondo3d(), esc = escapeHtmlDidascalia;
                const gruppi = { Google: [], Esri: [], OpenStreetMap: [] };
                Object.entries(SFONDI_3D).forEach(([id, f]) => gruppi[f.nome.split(' · ')[0]].push(`<option value="${id}">${esc(f.nome.split(' · ')[1])}</option>`));
                const wms = wmsDisponibili().map((w, i) => `<option value="wms:${i}">${esc(w.nome)}</option>`).join('');
                sel.innerHTML = '<option value="">Nessuna (colori della quota)</option>'
                    + Object.entries(gruppi).map(([g, o]) => `<optgroup label="${g}">${o.join('')}</optgroup>`).join('')
                    + `<optgroup label="WMS">${wms}<option value="wms">Altro indirizzo WMS…</option></optgroup>`;
                // Un WMS scelto dall'elenco si riconosce dall'indirizzo; se non c'è più, è «altro».
                const k = wmsDisponibili().findIndex(w => w.url === sc.wmsUrl && (w.layer || '') === sc.wmsLayer);
                sel.value = sc.id === 'wms' ? (k >= 0 ? 'wms:' + k : 'wms') : sc.id;
                document.getElementById('txtWmsUrl3d').value = sc.wmsUrl;
                document.getElementById('txtWmsLayer3d').value = sc.wmsLayer;
                document.getElementById('rigaWms3d').style.display = sel.value === 'wms' ? '' : 'none';
                document.getElementById('rngOpacita3d').value = Math.round((sc.opacita || (sc.id ? 0.85 : 0.62)) * 100);
                aggiornaStatoSfondo3d();
            }
            function aggiornaStatoSfondo3d() {
                const lbl = document.getElementById('lblSfondo3d'), sc = sceltaSfondo3d();
                const sf = datiVista3dCorrenti && datiVista3dCorrenti._sfondo;
                if (!sc.id || !sf) { lbl.textContent = ''; return; }
                if (sc.id === 'wms' && !sc.wmsUrl) { lbl.textContent = 'Incolla l\'indirizzo del servizio e premi «Carica».'; return; }
                const misto = sc.id === 'wms' && /^http:/i.test(sc.wmsUrl) && location.protocol === 'https:';
                lbl.textContent = misto ? 'Questo servizio è in http: da una pagina https il browser lo blocca.'
                    : sf.errori && sf.caricate < sf.totali && sf.caricate + sf.errori >= sf.totali ? `${sf.errori} su ${sf.totali} pezzi non sono arrivati: senza rete, o il servizio non risponde.`
                    : sf.caricate < sf.totali ? `Carico l'immagine… ${sf.caricate} di ${sf.totali}` : '';
            }
            function cambiaSfondo3d(modifiche) {
                salvaSceltaSfondo3d(modifiche);
                if (datiVista3dCorrenti) datiVista3dCorrenti._sfondo = undefined;
                riempiSceltaSfondo3d();
                if (sceltaSfondo3d().id) vista3d.livelli.terreno = true;
                renderVista3d();
                aggiornaStatoSfondo3d();
            }
            document.getElementById('selSfondo3d').addEventListener('change', (e) => {
                const v = e.target.value;
                if (v.startsWith('wms:')) {
                    const w = wmsDisponibili()[parseInt(v.slice(4), 10)];
                    cambiaSfondo3d({ id: 'wms', wmsUrl: w.url, wmsLayer: w.layer || '', attribuzione: w.attribuzione || w.nome });
                } else if (v === 'wms') {
                    cambiaSfondo3d({ id: 'wms', wmsUrl: '', wmsLayer: '', attribuzione: '' });
                } else cambiaSfondo3d({ id: v });
            });
            document.getElementById('btnWmsCarica3d').addEventListener('click', () => {
                const url = document.getElementById('txtWmsUrl3d').value.trim();
                cambiaSfondo3d({ id: 'wms', wmsUrl: url, wmsLayer: document.getElementById('txtWmsLayer3d').value.trim(), attribuzione: url.replace(/^https?:\/\//, '').split('/')[0] });
            });
            document.getElementById('btnWmsSalva3d').addEventListener('click', async () => {
                const url = document.getElementById('txtWmsUrl3d').value.trim();
                if (!url) { appAlert('Prima incolla l\'indirizzo del servizio, poi lo salvo fra i tuoi.'); return; }
                const nome = await appPrompt('Resta fra i tuoi servizi: lo ritrovi qui e nell\'inquadramento del report.\n' + url, 'Ortofoto',
                    { title: 'Salva questo servizio', label: 'Come lo chiamo?', okLabel: 'Salva' });
                if (!nome || !String(nome).trim()) return;
                if (!Array.isArray(state.settings.wmsPersonalizzati)) state.settings.wmsPersonalizzati = [];
                const layer = document.getElementById('txtWmsLayer3d').value.trim();
                state.settings.wmsPersonalizzati.push({ nome: String(nome).trim(), url, layer, attribuzione: String(nome).trim() });
                cambiaSfondo3d({ id: 'wms', wmsUrl: url, wmsLayer: layer, attribuzione: String(nome).trim() });
            });
            document.getElementById('rngOpacita3d').addEventListener('input', (e) => {
                if (!state.settings) state.settings = {};
                state.settings.sfondo3d = Object.assign(sceltaSfondo3d(), { opacita: Number(e.target.value) / 100 });
                ridisegna3d();
            });
            document.getElementById('rngOpacita3d').addEventListener('change', () => saveState());
            // I tagli: toccarli accende il modello solido, che è quello che si taglia.
            const conSolido = () => { if (!vista3d.livelli.solido) accendiSolido3d(); };
            document.getElementById('direzioneTaglio3d').addEventListener('click', (e) => {
                const b = e.target.closest('[data-taglio-dir]');
                if (!b) return;
                vista3d.taglio.dir = b.dataset.taglioDir || null;
                if (vista3d.taglio.dir) conSolido();
                renderVista3d();
            });
            document.getElementById('rngTaglioV3d').addEventListener('input', (e) => { vista3d.taglio.pos = Number(e.target.value) / 100; conSolido(); ridisegna3d(); });
            document.getElementById('btnTaglioLato3d').addEventListener('click', () => { vista3d.taglio.lato *= -1; renderVista3d(); });
            document.getElementById('rngTaglioH3d').addEventListener('input', (e) => {
                const so = datiVista3dCorrenti && modelloSolido(datiVista3dCorrenti);
                vista3d.taglio.prof = so ? so.fondo * Number(e.target.value) / 100 : 0;
                conSolido(); ridisegna3d();
            });
            // Dal Confronto prove si passa alla vista 3D delle stesse prove. Il confronto si può
            // aprire anche dalla Home per un progetto non aperto: la 3D lavora sul progetto aperto,
            // quindi prima si apre quello.
            document.getElementById('btnConfronto3d').addEventListener('click', () => {
                if (confrontoStato.projId !== state.currentProjectId) { openProject(confrontoStato.projId); switchView('project'); }
                apriVista3d();
            });
            document.getElementById('btnChiudiVista3d').addEventListener('click', closeAnyOpenModal);
            const nomeFileProgetto3d = () => (state.projects[state.currentProjectId].name || 'progetto').replace(/[^\w\-]+/g, '_');
            document.getElementById('btnScaricaVista3d').addEventListener('click', () => {
                if (!ultimaScena3d) return;
                const testo = svgDaScena(scena3d(datiVista3dCorrenti, ultimaScena3d.W, false, true, ultimaScena3d.H)).replace(/var\(--bg-card, #fff\)/g, '#ffffff').replace(/currentColor/g, '#1f2937').replace(/var\(--font-mono\), monospace/g, 'monospace');
                scaricaBlobFile(new Blob([testo], { type: 'image/svg+xml' }), `Vista3D_${nomeFileProgetto3d()}.svg`);
            });

            /** Il modello in OBJ (+ MTL) dentro uno ZIP: metri veri, senza esagerazione, asse Y in alto
             * (x = est, y = quota, z = −nord), origine nel centro delle prove, scritta nel file. */
            function modelloObj(d) {
                const v = [], righe = [], materiali = new Map();
                const mat = (nome, colore, opacita) => {
                    const id = nome.normalize('NFD').replace(/[^\w]+/g, '_');
                    if (!materiali.has(id)) {
                        const c = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(colore || '') || [0, '99', '99', '99'];
                        materiali.set(id, `newmtl ${id}\nKd ${[1, 2, 3].map(i => (parseInt(c[i], 16) / 255).toFixed(3)).join(' ')}\nd ${opacita}\n`);
                    }
                    return id;
                };
                const vert = (x, y, z) => { v.push(`v ${x.toFixed(2)} ${z.toFixed(2)} ${(-y).toFixed(2)}`); return v.length; };
                const faccia = (idx) => righe.push('f ' + idx.join(' '));
                righe.push('o ' + (d.senzaDtm ? 'Piano_campagna' : 'Terreno'), 'usemtl ' + mat('Terreno', '#9aa97a', 1));
                const ids = d.nodi.map(r => r.map(n => isFinite(n[2]) ? vert(n[0], n[1], n[2]) : 0));
                for (let j = 0; j + 1 < ids.length; j++) for (let i = 0; i + 1 < Math.min(ids[j].length, ids[j + 1].length); i++) {
                    const q = [ids[j][i], ids[j + 1][i], ids[j + 1][i + 1], ids[j][i + 1]];
                    if (q.every(Boolean)) faccia(q);
                }
                const { pannelli, superfici } = modelloCorrelazione(d);
                d.prove.forEach(p => {
                    righe.push('o ' + nomeDpsh(p.s).replace(/\s+/g, '_'));
                    const r = 0.25;
                    p.fasce.forEach(f => {
                        righe.push('usemtl ' + mat(f.nome, f.colore, 1));
                        const alto = [[-r, -r], [r, -r], [r, r], [-r, r]].map(([a, b]) => vert(p.x + a, p.y + b, p.z - f.da));
                        const basso = [[-r, -r], [r, -r], [r, r], [-r, r]].map(([a, b]) => vert(p.x + a, p.y + b, p.z - f.a));
                        faccia(alto); faccia(basso.slice().reverse());
                        for (let n = 0; n < 4; n++) faccia([alto[n], basso[n], basso[(n + 1) % 4], alto[(n + 1) % 4]]);
                    });
                });
                pannelli.forEach(pa => {
                    righe.push('o ' + `Pannello_${nomeDpsh(d.prove[pa.i].s)}_${nomeDpsh(d.prove[pa.j].s)}_${pa.f.nome}`.replace(/\s+/g, '_'), 'usemtl ' + mat(pa.f.nome, pa.f.colore, 1));
                    for (let n = 1; n < pa.pezzi.length; n++) {
                        const a = pa.pezzi[n - 1], b = pa.pezzi[n];
                        faccia([vert(a.x, a.y, a.tetto), vert(b.x, b.y, b.tetto), vert(b.x, b.y, b.letto), vert(a.x, a.y, a.letto)]);
                    }
                });
                superfici.forEach(sf => {
                    righe.push('o ' + `Tetto_${sf.f.nome}_imm${Math.round(sf.immersione)}_incl${sf.inclinazione.toFixed(1)}`.replace(/\s+/g, '_'), 'usemtl ' + mat('Contatto ' + sf.f.nome, sf.f.colore, 0.5));
                    faccia(sf.punti.map(p => vert(...p)));
                });
                const origine = d.crs.tipo === 'geo' ? `lng ${d.cx.toFixed(6)} lat ${d.cy.toFixed(6)}` : `UTM ${d.crs.zona}N E ${d.cx.toFixed(2)} N ${d.cy.toFixed(2)}`;
                const obj = `# DPSH Field Collector: terreno, prove e correlazione\n# metri; x = est, y = ${d.senzaDtm ? 'quota dal piano campagna (senza DTM)' : 'quota s.l.m.'}, z = -nord; origine (0, 0) = ${origine}\nmtllib modello.mtl\n` + v.join('\n') + '\n' + righe.join('\n') + '\n';
                return { obj, mtl: [...materiali.values()].join('\n') };
            }
            document.getElementById('btnScaricaObj3d').addEventListener('click', () => {
                if (!datiVista3dCorrenti) return;
                const { obj, mtl } = modelloObj(datiVista3dCorrenti);
                const enc = new TextEncoder();
                scaricaBlobFile(buildZipBlob([{ name: 'modello.obj', bytes: enc.encode(obj) }, { name: 'modello.mtl', bytes: enc.encode(mtl) }]), `Modello3D_${nomeFileProgetto3d()}.zip`);
            });
