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
                livelli: { terreno: true, colonne: true, pannelli: true, superfici: true, giaciture: false, falda: true, misure: true, distanze: false, sezioni: true, immagine: true, solido: false, mesh: false, fantasma: true, nordTerreno: true },
                // Le etichette, come in HyperGram, non sono livelli: le accende il tasto «T» del livello
                // (per prove e sezioni, uno solo per tutto il gruppo).
                etichette: { prove: true, sezioni: true, disegni: true, giaciture: false, misure: true, falda: false },
                proveNascoste: new Set(), stratiNascosti: new Set(), tracceNascoste: new Set(), giacitureNascoste: new Set(), stratiSolidoNascosti: new Set(), disegniNascosti: new Set(),
                // L'opacità di ogni livello (chiave della riga → 0,2…1), dal menu del tasto destro.
                opacita: {},
                // I tagli del modello solido: un piano verticale (dir 'ns' = parete Nord–Sud, 'eo' =
                // Est–Ovest; pos 0–1 sull'estensione; lato = quale metà resta) e uno in profondità (m).
                taglio: { dir: null, pos: 0.5, lato: 1, prof: 0 },
                // Ombreggiatura delle facce del modello (0 = colori piatti, 1 = luce piena) e linee addolcite
                // degli strati del corpo solido (0 = interpolazione lineare tra le prove, 1 = spline).
                ombre: 0.6, liscio: 0 };

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
                        // Con le linee addolcite il passaggio da una prova all'altra si ammorbidisce un poco
                        // (mezza curva a S), invece del gomito netto su ogni prova.
                        const liscio = vista3d.liscio * 0.5;
                        const passi = Math.max(liscio ? 8 : 1, Math.min(10, Math.round(Math.hypot(B.x - A.x, B.y - A.y) / 8)));
                        const pezzi = [];
                        for (let n = 0; n <= passi; n++) {
                            const t = n / passi, x = A.x + (B.x - A.x) * t, y = A.y + (B.y - A.y) * t, ts = t + liscio * (t * t * (3 - 2 * t) - t);
                            const zt = n === 0 ? A.z : n === passi ? B.z : (d.zSuolo(x, y) ?? A.z + (B.z - A.z) * t);
                            pezzi.push({ x, y, tetto: zt - (fa.da + (fb.da - fa.da) * ts), letto: zt - (fa.a + (fb.a - fa.a) * ts) });
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

            /** IL CONTORNO DEL CORPO: il poligono delle prove; con le linee addolcite gli angoli si smussano
             * appena (un raccordo, curva di Bézier col vertice per guida), senza inventare forme: il raccordo
             * parte a una piccola frazione dei lati (al più 12 m) e resta dentro il poligono. */
            function involucroModello(so) {
                const s = vista3d.liscio;
                if (!s) return so.involucro;
                if (so._contorno && so._contorno.s === s) return so._contorno.p;
                const P = so.involucro, n = P.length, out = [], PASSI = 6;
                for (let i = 0; i < n; i++) {
                    const a = P[(i - 1 + n) % n], v = P[i], b = P[(i + 1) % n];
                    const la = Math.hypot(v[0] - a[0], v[1] - a[1]), lb = Math.hypot(b[0] - v[0], b[1] - v[1]);
                    const r = Math.min(0.18 * Math.min(la, lb), 12) * s;
                    const p0 = [v[0] + (a[0] - v[0]) * r / (la || 1), v[1] + (a[1] - v[1]) * r / (la || 1)];
                    const p2 = [v[0] + (b[0] - v[0]) * r / (lb || 1), v[1] + (b[1] - v[1]) * r / (lb || 1)];
                    for (let j = 0; j <= PASSI; j++) {
                        const t = j / PASSI, u = 1 - t;
                        out.push([u * u * p0[0] + 2 * u * t * v[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * v[1] + t * t * p2[1]]);
                    }
                }
                so._contorno = { s, p: out };
                return out;
            }

            /** La colonna del modello solido in un punto: quota del terreno e base di ogni strato. */
            function colonnaSolido(d, so, x, y) {
                const triangolo = (x, y) => {
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
                    return migliore;
                };
                const zx = x, zy = y; // il terreno resta quello del punto vero
                let migliore = triangolo(x, y);
                // Fuori dal poligono delle prove (il contorno addolcito ne esce un poco): la colonna è quella del
                // punto più vicino del bordo, così gli strati proseguono lisci, senza scalini.
                if (migliore.minimo < -1e-6) {
                    let vicino = null;
                    so.involucro.forEach((p, i) => {
                        const q = so.involucro[(i + 1) % so.involucro.length], dx = q[0] - p[0], dy = q[1] - p[1];
                        const t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (y - p[1]) * dy) / (dx * dx + dy * dy || 1)));
                        const c = [p[0] + dx * t, p[1] + dy * t], dd = Math.hypot(x - c[0], y - c[1]);
                        if (!vicino || dd < vicino.dd) vicino = { c, dd };
                    });
                    [x, y] = vicino.c;
                    migliore = triangolo(x, y);
                }
                // Sul bordo, per gli arrotondamenti, il punto può cadere appena fuori: pesi mai negativi.
                const l = migliore.l.map(v => Math.max(0, v)), somma = l.reduce((a, b) => a + b, 0) || 1;
                const w = l.map(v => v / somma), idx = migliore.t;
                let basi = so.strati.map((_, k) => idx.reduce((a, i, n) => a + w[n] * so.basi[i][k], 0));
                // Linee addolcite: le basi vengono, per la parte scelta, dalla spline (esatta alle prove),
                // tenuta tra i valori delle prove del triangolo; restano in ordine, tra il terreno e il fondo.
                const sp = vista3d.liscio > 0 && splineSolido(d, so);
                if (sp) {
                    // senza esagerare: al massimo sei decimi di spline, il resto resta l'interpolazione dei dati
                    const s = vista3d.liscio * 0.6, liscie = sp(x, y);
                    let sopra = 0;
                    // Mai oltre le prove del triangolo: la spline tra prove vicine e diverse ondeggerebbe.
                    const tra = k => Math.min(Math.max(liscie[k], Math.min(...idx.map(i => so.basi[i][k]))), Math.max(...idx.map(i => so.basi[i][k])));
                    basi = basi.map((b, k) => (k === basi.length - 1 ? b : (sopra = Math.min(so.fondo, Math.max(sopra, b + s * (tra(k) - b))))));
                }
                const zDtm = d.zSuolo(zx, zy);
                const z = Number.isFinite(zDtm) ? zDtm : idx.reduce((a, i, n) => a + w[n] * d.prove[i].z, 0);
                return { z, basi };
            }

            /** LA SPLINE DELLE BASI (lamina sottile, «thin plate»): per ogni strato una superficie che passa
             * esattamente per le basi delle prove e tra una e l'altra curva dolcemente, senza gli spigoli
             * dei triangoli. Un sistema (N + 3) × (N + 3) risolto una volta per modello; coordinate in
             * unità del lato, per i conti. Prove nello stesso punto (o il sistema singolare): niente spline. */
            function splineSolido(d, so) {
                if (so._spline !== undefined) return so._spline;
                const S = Math.max(1, d.lato || 1), pt = d.prove.map(p => [p.x / S, p.y / S]), N = pt.length, M = N + 3;
                const phi = r => (r > 1e-12 ? r * r * Math.log(r) : 0);
                const A = Array.from({ length: M }, () => new Array(M).fill(0));
                pt.forEach((p, i) => {
                    pt.forEach((q, j) => { A[i][j] = phi(Math.hypot(p[0] - q[0], p[1] - q[1])); });
                    A[i][i] += 1e-9;
                    [1, p[0], p[1]].forEach((v, c) => { A[i][N + c] = v; A[N + c][i] = v; });
                });
                const K = so.strati.length - 1; // l'ultima base è il fondo, uguale ovunque
                const B = Array.from({ length: M }, (_, i) => Array.from({ length: K }, (_, k) => (i < N ? so.basi[i][k] : 0)));
                // Gauss con pivot parziale, K termini noti insieme.
                for (let c = 0; c < M; c++) {
                    let r = c;
                    for (let i = c + 1; i < M; i++) if (Math.abs(A[i][c]) > Math.abs(A[r][c])) r = i;
                    if (Math.abs(A[r][c]) < 1e-12) return (so._spline = null);
                    [A[c], A[r]] = [A[r], A[c]]; [B[c], B[r]] = [B[r], B[c]];
                    for (let i = c + 1; i < M; i++) {
                        const f = A[i][c] / A[c][c];
                        if (!f) continue;
                        for (let j = c; j < M; j++) A[i][j] -= f * A[c][j];
                        for (let k = 0; k < K; k++) B[i][k] -= f * B[c][k];
                    }
                }
                const X = Array.from({ length: M }, () => new Array(K).fill(0));
                for (let i = M - 1; i >= 0; i--) for (let k = 0; k < K; k++) {
                    let v = B[i][k];
                    for (let j = i + 1; j < M; j++) v -= A[i][j] * X[j][k];
                    X[i][k] = v / A[i][i];
                }
                return (so._spline = (x, y) => {
                    const u = x / S, v = y / S, out = new Array(K).fill(0);
                    pt.forEach((p, i) => { const f = phi(Math.hypot(u - p[0], v - p[1])); if (f) for (let k = 0; k < K; k++) out[k] += X[i][k] * f; });
                    for (let k = 0; k < K; k++) out[k] += X[N][k] + X[N + 1][k] * u + X[N + 2][k] * v;
                    return out;
                });
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
                const pezzi = [], sopra = [], colonne = [], elementiTavola = {};
                const poli = (pp, extra) => (extra.strato && (vista3d.stratiNascosti.has(extra.strato) || (extra.cls === 'vista3d-solido' && vista3d.stratiSolidoNascosti.has(extra.strato)))) || pezzi.push({ prof: pp.reduce((s, p) => s + p[2], 0) / pp.length, t: 'poli', p: pp.map(p => [p[0], p[1]]), ...extra });
                // L'OMBREGGIATURA: la faccia (punti in metri veri) prende luce secondo come è girata. La
                // normale (Newell, regge anche i quadrilateri schiacciati) si volta verso chi guarda: si
                // vedono solo quelle facce; la luce viene dall'alto, da nord-ovest, come per il terreno.
                const luceF = [-0.5, 0.5, 0.7].map(v => v / Math.hypot(-0.5, 0.5, 0.7)), versoOcchio = [-sa * ce, -ca * ce, se];
                // Gli stili dei livelli (menu «Stile…»).
                const stP = stileLivello('pannelli'), stS = stileLivello('superfici'), stF = stileLivello('falda'), stG = stileLivello('giaciture'), stM = stileLivello('misure'), stV = stileLivello('prove');
                const ombra = (colore, pw) => {
                    const k = vista3d.ombre, m = /^#([0-9a-f]{6})$/i.exec(colore);
                    if (!k || !m) return colore;
                    const n = [0, 0, 0];
                    pw.forEach((a, i) => {
                        const b = pw[(i + 1) % pw.length], az = a[2] * ex, bz = b[2] * ex;
                        n[0] += (a[1] - b[1]) * (az + bz); n[1] += (az - bz) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
                    });
                    const l = Math.hypot(...n);
                    if (!l) return colore;
                    const verso = Math.sign(n[0] * versoOcchio[0] + n[1] * versoOcchio[1] + n[2] * versoOcchio[2]) || 1;
                    const lamb = Math.max(0, verso * (n[0] * luceF[0] + n[1] * luceF[1] + n[2] * luceF[2]) / l);
                    const f = 1 - k + k * (0.42 + 0.7 * lamb);
                    const v = parseInt(m[1], 16);
                    return `rgb(${[16, 8, 0].map(s => Math.min(255, Math.round(((v >> s) & 255) * f))).join(',')})`;
                };
                const poliW = (pw, extra) => {
                    const fill = ombra(extra.fill, pw);
                    return poli(pw.map(p => P(...p)), { ...extra, base: extra.fill, fill, stroke: extra.stroke === extra.fill ? fill : extra.stroke });
                };
                const so = L.solido ? modelloSolido(d) : null;
                const tg = vista3d.taglio;
                // Il lato tolto dal taglio verticale: quello che non soddisfa (coordinata − c)·lato ≥ 0.
                // distTaglio: di quanto un punto sta dalla parte che resta (negativo = tolto). Il piano è
                // Nord–Sud o Est–Ovest (dir, pos), oppure una retta qualunque (retta: due punti in metri,
                // per le sezioni 3D esportate lungo una traccia obliqua; lato 1 = a sinistra di a→b).
                let tieni = () => true, distTaglio = null;
                if (so && tg.retta) {
                    const [a, b] = tg.retta, lr = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
                    distTaglio = (x, y) => ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0])) / lr * tg.lato;
                } else if (so && tg.dir) {
                    const ax = tg.dir === 'ns' ? 0 : 1, valori = involucroModello(so).map(p => p[ax]);
                    const c = Math.min(...valori) + (Math.max(...valori) - Math.min(...valori)) * tg.pos;
                    distTaglio = (x, y) => ([x, y][ax] - c) * tg.lato;
                    tg.c = c; tg.ax = ax;
                }
                if (distTaglio) tieni = (x, y) => distTaglio(x, y) >= -1e-9;
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
                    // Il buco del corpo nel terreno (col taglio verticale solo la parte che resta: dove il
                    // corpo è stato tolto torna il terreno).
                    const contornoTerreno = so ? (distTaglio ? ritagliaPoligono(involucroModello(so), q => distTaglio(q[0], q[1])) : involucroModello(so)) : null;
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
                        const contorno = contornoTerreno;
                        contorno.forEach((A, i) => {
                            if (resto.length < 3) return;
                            const B = contorno[(i + 1) % contorno.length];
                            const lato = q => (B[0] - A[0]) * (q[1] - A[1]) - (B[1] - A[1]) * (q[0] - A[0]);
                            const fuori = ritagliaPoligono(resto, q => -lato(q)), dentroQui = ritagliaPoligono(resto, lato);
                            if (fuori.length >= 3) {
                                const z = ([x, y]) => { const v = d.zSuolo(x, y); return Number.isFinite(v) ? v : (a[2] + c[2]) / 2; };
                                terreno(fuori.map(q => [q[0], q[1], z(q)]), fill);
                            }
                            resto = dentroQui;
                        });
                    }
                    // IL TERRENO ESTESO (solo nelle tavole esportate): attorno al riquadro del DTM il
                    // terreno continua, piatto alla quota del bordo più vicino, con le tessere della mappa
                    // di base di un mosaico più largo (est.sf), fin dove serve a riempire il foglio. A
                    // maglie larghe, allineate al riquadro: dentro resta il terreno vero.
                    const est = vista3d.terrenoEsteso;
                    if (est && est.mezzo > 0 && nodi.length) {
                        const tutti = nodi.flat().filter(n => isFinite(n[0]) && isFinite(n[1]));
                        const x0 = Math.min(...tutti.map(n => n[0])), x1 = Math.max(...tutti.map(n => n[0])), y0 = Math.min(...tutti.map(n => n[1])), y1 = Math.max(...tutti.map(n => n[1]));
                        const m = leggera ? 4 : 8, gx = (x1 - x0) / m, gy = (y1 - y0) / m;
                        const ax = Math.max(0, Math.ceil((est.mezzo - (x1 - x0) / 2) / gx)), ay = Math.max(0, Math.ceil((est.mezzo - (y1 - y0) / 2) / gy));
                        const sfE = L.immagine && est.sf && est.sf.uv ? est.sf : null, eps = 1e-6;
                        const zBordo = (x, y) => { const v = d.zSuolo(Math.min(x1 - eps, Math.max(x0 + eps, x)), Math.min(y1 - eps, Math.max(y0 + eps, y))); return Number.isFinite(v) ? v : zRif; };
                        const uvE = (x, y) => { const gg = d.geo(x, y); return sfE.uv(gg.lat, gg.lng); };
                        for (let i = -ax; i < m + ax; i++) for (let j = -ay; j < m + ay; j++) {
                            if (i >= 0 && i < m && j >= 0 && j < m) continue;
                            const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([u, v]) => { const x = x0 + u * gx, y = y0 + v * gy; return [x, y, zBordo(x, y)]; });
                            if (sfE) [[q[0], q[1], q[2]], [q[0], q[2], q[3]]].forEach(tri => {
                                const sp = tri.map(w => P(...w));
                                pezzi.push({ prof: sottoTutto + 5e6 + (sp[0][2] + sp[1][2] + sp[2][2]) / 3, t: 'poli', p: sp.map(w => [w[0], w[1]]), uv: tri.map(w => uvE(w[0], w[1])), sfondo: sfE.tela, fill: colore((q[0][2] + q[2][2]) / 2, 0.9), fo: opacita, cls: 'vista3d-faccia' });
                            });
                            else { const sp = q.map(w => P(...w)), fill = colore((q[0][2] + q[2][2]) / 2, 0.9); pezzi.push({ prof: sottoTutto + 5e6 + sp.reduce((a, w) => a + w[2], 0) / 4, t: 'poli', p: sp.map(w => [w[0], w[1]]), fill, fo: opacita, stroke: fill, sw: 0.4, cls: 'vista3d-faccia' }); }
                        }
                    }
                }
                // LA FRECCIA DEL NORD STESA SUL TERRENO (oltre alla bussola): nell'angolo del terreno più
                // vicino a chi guarda, appoggiata alla superficie e scorciata con lei, con la sua N.
                if (L.terreno && L.nordTerreno && d.nodi && d.nodi.length) {
                    const tutti = d.nodi.flat().filter(n => isFinite(n[0]) && isFinite(n[1]));
                    const x0 = Math.min(...tutti.map(n => n[0])), x1 = Math.max(...tutti.map(n => n[0])), y0 = Math.min(...tutti.map(n => n[1])), y1 = Math.max(...tutti.map(n => n[1]));
                    const lato = Math.min(x1 - x0, y1 - y0), Lf = lato * 0.075, dentro = lato * 0.13;
                    const zIn = (x, y) => { const z = d.zSuolo(x, y); return (Number.isFinite(z) ? z : zRif) + (d.zMax - d.zMin) * 0.004; };
                    const angoli = [[x0 + dentro, y0 + dentro], [x1 - dentro, y0 + dentro], [x1 - dentro, y1 - dentro], [x0 + dentro, y1 - dentro]];
                    // L'angolo più vicino a chi guarda in cui freccia e N non finiscono dietro al modello
                    // (fuori dal riquadro che il modello occupa sullo schermo).
                    // L'ingombro del modello sullo schermo (la parte che resta, se tagliato): il suo
                    // contorno convesso; freccia e N devono starne fuori (con 12 px d'aria) e nel quadro.
                    const ingombro = [], piedi = so ? (distTaglio ? ritagliaPoligono(involucroModello(so), q => distTaglio(q[0], q[1])) : involucroModello(so)) : [];
                    (piedi.length >= 3 ? piedi.map(q => [q[0], q[1], d.zSuolo(q[0], q[1]) ?? zRif]) : d.prove.filter(q => tieni(q.x, q.y)).map(q => [q.x, q.y, q.z])).forEach(([x, y, z]) => { ingombro.push(P(x, y, z), P(x, y, z - (so ? so.fondo : profMax))); });
                    const ordinatiI = ingombro.map(q => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]), giro = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
                    const giu = [], su = [];
                    ordinatiI.forEach(q => { while (giu.length >= 2 && giro(giu[giu.length - 2], giu[giu.length - 1], q) <= 0) giu.pop(); giu.push(q); });
                    ordinatiI.slice().reverse().forEach(q => { while (su.length >= 2 && giro(su[su.length - 2], su[su.length - 1], q) <= 0) su.pop(); su.push(q); });
                    const sagoma = giu.slice(0, -1).concat(su.slice(0, -1));
                    const dentroSagoma = (x, y) => sagoma.length >= 3 && sagoma.every((a, i) => giro(a, sagoma[(i + 1) % sagoma.length], [x, y]) >= 0);
                    const libero = ([x, y]) => [[0, 1.45], [0, 1], [-0.5, -0.75], [0.5, -0.75], [0, -0.35]].every(([e, n]) => { const q = P(x + e * Lf, y + n * Lf, zIn(x + e * Lf, y + n * Lf));
                        // (e fuori dal posto della legenda, quando le tavole gliel'hanno riservato)
                        const rl = vista3d.postoLegenda, sottoLegenda = rl && q[0] > rl.x - 14 && q[0] < rl.x + rl.w + 14 && q[1] > rl.y - 14 && q[1] < rl.y + rl.h + 14;
                        return q[0] > 14 && q[0] < W - 14 && q[1] > 14 && q[1] < H - 14 && !sottoLegenda && ![[0, 0], [12, 0], [-12, 0], [0, 12], [0, -12]].some(([ox, oy]) => dentroSagoma(q[0] + ox, q[1] + oy)); });
                    const vicinanza = ([x, y]) => P(x, y, zIn(x, y))[2];
                    const ordinati = angoli.slice().sort((a, b) => vicinanza(a) - vicinanza(b));
                    // Se nessun angolo è libero (vista avvicinata: gli angoli escono dal quadro), il punto
                    // libero del terreno più vicino all'angolo in basso a sinistra dello schermo.
                    const griglia = [];
                    for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) griglia.push([x0 + dentro + (x1 - x0 - 2 * dentro) * i / 8, y0 + dentro + (y1 - y0 - 2 * dentro) * j / 8]);
                    const versoAngolo = q => { const s = P(q[0], q[1], zIn(q[0], q[1])); return Math.hypot(s[0] - W * 0.12, s[1] - H * 0.86); };
                    // spostata a mano nella finestra delle tavole: dove l'ha messa l'utente (metri della scena)
                    const [fx, fy] = vista3d.nordTerrenoPos || ordinati.find(libero) || griglia.filter(libero).sort((a, b) => versoAngolo(a) - versoAngolo(b))[0] || ordinati[0];
                    const pt = (e, n) => { const x = fx + e * Lf, y = fy + n * Lf; return P(x, y, zIn(x, y)); };
                    const punta = pt(0, 1), sx = pt(-0.5, -0.75), tacca = pt(0, -0.35), dx = pt(0.5, -0.75);
                    const prof = so ? 5e8 : Math.min(punta[2], sx[2], dx[2]) - lato * 0.05, xy = q => [q[0], q[1]];
                    pezzi.push({ prof, t: 'poli', p: [punta, sx, tacca].map(xy), fill: '#111827', stroke: '#111827', sw: 1, cls: 'vista3d-nord-terreno' });
                    pezzi.push({ prof: prof - 1e-4, t: 'poli', p: [punta, tacca, dx].map(xy), fill: '#ffffff', stroke: '#111827', sw: 1, cls: 'vista3d-nord-terreno' });
                    const n = pt(0, 1.45);
                    pezzi.push({ prof: prof - 2e-4, t: 'testo', x: n[0], y: n[1] + 6, s: 'N', size: 18, bold: true, anchor: 'middle', alone: true, cls: 'vista3d-nord-terreno' });
                    const xs = [punta, sx, dx, n].map(q => q[0]), ys = [punta, sx, dx, n].map(q => q[1]);
                    elementiTavola.nordTerreno = { x0: Math.min(...xs) - 10, y0: Math.min(...ys) - 22, x1: Math.max(...xs) + 10, y1: Math.max(...ys) + 10, mondo: [fx, fy] };
                }
                const { pannelli, superfici } = modelloCorrelazione(d);
                if (so) {
                    // Il poligono del corpo, tagliato dal piano verticale.
                    let Q = involucroModello(so);
                    if (distTaglio) Q = ritagliaPoligono(Q, p => distTaglio(p[0], p[1]));
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
                                    poliW([[A.x, A.y, A.z - ta], [B.x, B.y, B.z - tb], [B.x, B.y, B.z - bb], [A.x, A.y, A.z - ba]],
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
                                        const disegna = (pp, st) => poliW(pp.map(([x, y]) => [x, y, colonnaIn(x, y).z - prof]), { fill: st.colore, fo: st.ignoto ? 0.55 : 1, stroke: st.colore, sw: 0.5, cls: 'vista3d-solido', title: st.nome, strato: st.nome });
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
                        if (distTaglio || hTaglio > 0) Q.forEach((a, i) => {
                            const b = Q[(i + 1) % Q.length];
                            const pa = P(a[0], a[1], colonnaIn(a[0], a[1]).z - hTaglio), pb = P(b[0], b[1], colonnaIn(b[0], b[1]).z - hTaglio);
                            sopra.push({ t: 'linea', x1: pa[0], y1: pa[1], x2: pb[0], y2: pb[1], stroke: 'currentColor', sw: 1.2, cls: 'vista3d-taglio' });
                        });
                        // IL PEZZO TOLTO, A TRATTEGGIO: gli spigoli del corpo intero dalla parte tagliata via
                        // (e, col taglio in profondità, della fetta di sopra), sottilissimi, perché si veda
                        // che è un ritaglio e non tutto il modello. Ordinati con gli altri pezzi: il corpo
                        // che resta li copre dove sta davanti.
                        if (L.fantasma && (distTaglio || hTaglio > 0)) {
                            const tratto = (a, b) => {
                                const A = P(...a), B = P(...b);
                                pezzi.push({ prof: (A[2] + B[2]) / 2 - 0.002, t: 'linea', x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: 'currentColor', sw: 0.7, dash: [4, 3], op: 0.6, cls: 'vista3d-fantasma' });
                            };
                            const suolo = (x, y, h) => [x, y, colonnaIn(x, y).z - h];
                            // un lato del contorno a una profondità (h), seguendo il terreno
                            const lato = (a, b, h) => { for (let n = 0; n < 12; n++) tratto(suolo(a[0] + (b[0] - a[0]) * n / 12, a[1] + (b[1] - a[1]) * n / 12, h), suolo(a[0] + (b[0] - a[0]) * (n + 1) / 12, a[1] + (b[1] - a[1]) * (n + 1) / 12, h)); };
                            if (distTaglio) {
                                const tolto = ritagliaPoligono(involucroModello(so), p => -distTaglio(p[0], p[1]));
                                const sulTaglio = p => Math.abs(distTaglio(p[0], p[1])) < 1e-6;
                                if (tolto.length >= 3) tolto.forEach((a, i) => {
                                    const b = tolto[(i + 1) % tolto.length];
                                    if (!(sulTaglio(a) && sulTaglio(b))) { lato(a, b, 0); lato(a, b, so.fondo); }
                                    if (!sulTaglio(a)) tratto(suolo(a[0], a[1], 0), suolo(a[0], a[1], so.fondo));
                                });
                            }
                            if (hTaglio > 0) Q.forEach((a, i) => { lato(a, Q[(i + 1) % Q.length], 0); tratto(suolo(a[0], a[1], 0), suolo(a[0], a[1], hTaglio)); });
                        }
                    }
                }
                if (L.pannelli && !so) pannelli.forEach(pa => {
                    for (let n = 1; n < pa.pezzi.length; n++) {
                        const a = pa.pezzi[n - 1], b = pa.pezzi[n];
                        poliW([[a.x, a.y, a.tetto], [b.x, b.y, b.tetto], [b.x, b.y, b.letto], [a.x, a.y, a.letto]], { fill: pa.f.colore, fo: stP.opacita, stroke: stP.contorno || pa.f.colore, sw: stP.spessore, cls: 'vista3d-pannello', title: pa.f.nome, strato: pa.f.nome });
                    }
                });
                // LA FALDA: un segno blu sulla colonna alla sua profondità e, tra tre prove vicine che
                // l'hanno tutte, la sua superficie (piana nel triangolo), azzurra e trasparente.
                const falda = p => { const v = parseFloat(p.s.header && p.s.header.faldaDa); return Number.isFinite(v) ? v : null; };
                if (L.falda) {
                    d.triangoli.forEach(t => {
                        const tre = t.map(i => d.prove[i]);
                        if (tre.some(p => falda(p) === null || !tieni(p.x, p.y))) return;
                        poliW(tre.map(p => [p.x, p.y, p.z - falda(p)]), { fill: stF.riempimento || stF.colore, fo: stF.opacita, stroke: stF.colore, sw: 1, dash: trattoDash(stF.tratto, 0.6), cls: 'vista3d-falda', title: 'Falda: ' + tre.map(p => `${nomeDpsh(p.s)} a ${numeroConVirgola(falda(p))} m`).join(', ') });
                    });
                    d.prove.forEach(p => {
                        const f = falda(p);
                        if (f === null || !tieni(p.x, p.y) || vista3d.proveNascoste.has(p.s.id)) return;
                        const o = P(p.x, p.y, p.z - f), lato = Math.max(1.5, d.lato / 60);
                        [[lato, 0], [0, lato]].forEach(([dx, dy]) => {
                            const a1 = P(p.x - dx, p.y - dy, p.z - f), a2 = P(p.x + dx, p.y + dy, p.z - f);
                            pezzi.push({ prof: o[2] - 0.002, t: 'linea', x1: a1[0], y1: a1[1], x2: a2[0], y2: a2[1], stroke: stF.colore, sw: stF.spessore, dash: trattoDash(stF.tratto, 0.6), cls: 'vista3d-falda-segno', title: `${nomeDpsh(p.s)}: falda a ${numeroConVirgola(f)} m`, prova: p.s.id });
                        });
                        if (vista3d.etichette.falda) sopra.push({ t: 'testo', x: o[0] + 10, y: o[1] + 4, s: `falda ${numeroConVirgola(f)} m`, size: 11, alone: true, cls: 'vista3d-falda-nome', prova: p.s.id });
                    });
                }
                if (L.superfici && !so) superfici.forEach(sf => poliW(sf.punti, { fill: sf.f.colore, fo: stS.opacita, stroke: stS.contorno || sf.f.colore, sw: stS.spessore, dash: trattoDash(stS.tratto, 0.6), cls: 'vista3d-superficie', title: `Tetto di ${sf.f.nome}: immersione ${Math.round(sf.immersione)}°, inclinazione ${numeroConVirgola(sf.inclinazione, 1)}°`, strato: sf.f.nome }));
                if (L.colonne) d.prove.forEach(p => {
                    const nome = nomeDpsh(p.s);
                    if (!tieni(p.x, p.y) || vista3d.proveNascoste.has(p.s.id)) return; // dalla parte tolta dal taglio, o spenta
                    p.fasce.forEach(f => {
                        if (f.a <= hTaglio || vista3d.stratiNascosti.has(f.nome)) return;
                        const a = P(p.x, p.y, p.z - Math.max(f.da, hTaglio)), b = P(p.x, p.y, p.z - f.a), prof = (a[2] + b[2]) / 2 - 0.001;
                        pezzi.push({ prof, t: 'linea', x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'rgba(0,0,0,0.55)', sw: 12, cls: 'vista3d-colonna-bordo', prova: p.s.id, strato: f.nome });
                        pezzi.push({ prof: prof - 0.0001, t: 'linea', x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: f.colore, sw: 9, cls: 'vista3d-colonna', title: `${nome}: ${f.nome}`, prova: p.s.id, strato: f.nome });
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
                const conNome = p => vista3d.etichette.prove && tieni(p.x, p.y) && !vista3d.proveNascoste.has(p.s.id);
                d.prove.forEach(p => { if (conNome(p)) { const [tx, ty] = P(p.x, p.y, p.z), w = nomeDpsh(p.s).length * 8; scritte.push([tx - w / 2, ty - 24, tx + w / 2, ty - 6]); } });
                if (L.giaciture && !so) superfici.forEach(sf => {
                    if (vista3d.stratiNascosti.has(sf.f.nome) || vista3d.giacitureNascoste.has(sf.f.nome)) return;
                    const riga = perTriangolo.get(sf.t) || 0;
                    perTriangolo.set(sf.t, riga + 1);
                    const c = [0, 1, 2].map(n => (sf.punti[0][n] + sf.punti[1][n] + sf.punti[2][n]) / 3);
                    const rad = sf.immersione * Math.PI / 180, lung = Math.max(4, d.lato / 30) * stG.dimensione;
                    const dx = Math.sin(rad), dy = Math.cos(rad); // verso dell'immersione (x est, y nord)
                    const [a1, a2, tk, o] = [P(c[0] - dy * lung, c[1] + dx * lung, c[2]), P(c[0] + dy * lung, c[1] - dx * lung, c[2]), P(c[0] + dx * lung * 0.6, c[1] + dy * lung * 0.6, c[2]), P(...c)];
                    if (segni.some(g => g.f === sf.f && Math.hypot(g.x - o[0], g.y - o[1]) < 28)) return;
                    segni.push({ f: sf.f, x: o[0], y: o[1] });
                    [['rgba(0,0,0,0.55)', stG.spessore + 1.8], [sf.f.colore, stG.spessore]].forEach(([stroke, sw]) => {
                        sopra.push({ t: 'linea', x1: a1[0], y1: a1[1], x2: a2[0], y2: a2[1], stroke, sw, cls: 'vista3d-giacitura-segno', giacitura: sf.f.nome });
                        sopra.push({ t: 'linea', x1: o[0], y1: o[1], x2: tk[0], y2: tk[1], stroke, sw, cls: 'vista3d-giacitura-segno', giacitura: sf.f.nome });
                    });
                    const scritta = `${String(Math.round(sf.immersione)).padStart(3, '0')}°/${numeroConVirgola(sf.inclinazione, 1)}°${vista3d.etichette.giaciture ? ' ' + sf.f.nome : ''}`;
                    const y = o[1] - 6 + riga * 14;
                    if (scrittaLibera(o[0] + 8, y, scritta.length * 6.7)) testo(o[0] + 8, y, scritta, { alone: true, cls: 'vista3d-giacitura', giacitura: sf.f.nome });
                });
                if (L.misure && d.prove.length) {
                    // ASTA GRADUATA DELLE QUOTE, SUL FIANCO DEL MODELLO: lungo lo spigolo verticale del
                    // contorno delle prove che sullo schermo sta più a destra, appena fuori, con lo zero
                    // al piano campagna di quel punto e i numeri verso l'esterno. Prima stava all'angolo
                    // del rettangolo nord-est delle prove: con le prove su una griglia ruotata
                    // quell'angolo cadeva nel vuoto, lontano dal modello.
                    // (col corpo solido: lo spigolo del corpo; tagliato, quello della parte che resta,
                    // non nel vuoto di quella tolta)
                    const restano = d.prove.filter(p => tieni(p.x, p.y)), perAsta = restano.length ? restano : d.prove;
                    const soA = L.solido && modelloSolido(d);
                    let contorno, pt;
                    if (soA) {
                        contorno = distTaglio ? ritagliaPoligono(involucroModello(soA), q => distTaglio(q[0], q[1])) : involucroModello(soA);
                        if (contorno.length < 3) contorno = involucroModello(soA);
                        pt = contorno;
                    } else {
                        pt = perAsta.map(p => [p.x, p.y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
                        const giro = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
                        const giu = [], su = [];
                        pt.forEach(q => { while (giu.length >= 2 && giro(giu[giu.length - 2], giu[giu.length - 1], q) <= 0) giu.pop(); giu.push(q); });
                        pt.slice().reverse().forEach(q => { while (su.length >= 2 && giro(su[su.length - 2], su[su.length - 1], q) <= 0) su.pop(); su.push(q); });
                        contorno = pt.length < 3 ? pt : giu.slice(0, -1).concat(su.slice(0, -1));
                    }
                    const mx = contorno.reduce((a, q) => a + q[0], 0) / contorno.length, my = contorno.reduce((a, q) => a + q[1], 0) / contorno.length;
                    const v = contorno.reduce((m, q) => P(q[0], q[1], zRif)[0] > P(m[0], m[1], zRif)[0] ? q : m);
                    const estensione = Math.max(...pt.map(q => Math.hypot(q[0] - mx, q[1] - my)), 5);
                    const lv = Math.hypot(v[0] - mx, v[1] - my) || 1, fuori = Math.max(1.5, estensione * 0.04);
                    const ax = v[0] + (v[0] - mx) / lv * fuori, ay = v[1] + (v[1] - my) / lv * fuori;
                    const vicina = perAsta.reduce((m, q) => Math.hypot(q.x - v[0], q.y - v[1]) < Math.hypot(m.x - v[0], m.y - v[1]) ? q : m);
                    const zTesta = (d.zSuolo && d.zSuolo(ax, ay)) ?? vicina.z;
                    const so = L.solido && modelloSolido(d);
                    const zFondo = so ? zTesta - so.fondo : Math.min(d.zMin - profMax, zTesta - profMax);
                    const passo = massimoTondo((zTesta - zFondo) / 5);
                    const b0 = P(ax, ay, zFondo), b1 = P(ax, ay, zTesta);
                    // I numeri dalla parte esterna: a destra se lo spigolo sta a destra del centro.
                    const aDestra = b1[0] >= P(mx, my, zRif)[0];
                    // BIANCA, con un filo scuro attorno: si legge sulla mappa di base come sullo sfondo chiaro
                    // (un colore scelto in «Stile…» resta quello, senza filo).
                    const coloreAsta = stM.colore || '#ffffff', filo = stM.colore ? null : 'rgba(15,23,42,0.85)';
                    const lineaAsta = (x1, y1, x2, y2, sw) => {
                        if (filo) sopra.push({ t: 'linea', x1, y1, x2, y2, stroke: filo, sw: sw + 2, cls: 'vista3d-misure' });
                        sopra.push({ t: 'linea', x1, y1, x2, y2, stroke: coloreAsta, sw, cls: 'vista3d-misure' });
                    };
                    lineaAsta(b0[0], b0[1], b1[0], b1[1], stM.spessore);
                    // Le tacche tonde, più una alle due estremità dell'asta quando non ci cade già una
                    // tonda (il fondo del modello a −4,6: la tacca c'è, col suo numero).
                    const tacche = [];
                    for (let z = Math.ceil((zFondo - 1e-6) / passo) * passo; z <= zTesta + 0.001; z += passo) tacche.push([z, passo < 1 ? 1 : 0]);
                    [zFondo, zTesta].forEach(z => { if (!tacche.some(([q]) => Math.abs(q - z) < passo * 0.3)) tacche.push([z, 1]); });
                    tacche.forEach(([z, dec]) => {
                        const t = P(ax, ay, z);
                        lineaAsta(t[0] - 5, t[1], t[0] + 5, t[1], Math.max(1, stM.spessore * 0.7));
                        if (vista3d.etichette.misure) testo(t[0] + (aDestra ? 8 : -8), t[1] + 4, numeroConVirgola(z, dec), { anchor: aDestra ? 'start' : 'end', cls: 'vista3d-misure', bold: true, colore: coloreAsta, alone: true, coloreAlone: filo || undefined });
                    });
                }
                // Le distanze tra le prove: un livello a sé, spegnibile senza perdere l'asta.
                if (L.distanze) d.lati.forEach(([i, j]) => {
                    if (!tieni(d.prove[i].x, d.prove[i].y) || !tieni(d.prove[j].x, d.prove[j].y)) return; // dalla parte tolta dal taglio
                    const A = d.prove[i], B = d.prove[j], m = P((A.x + B.x) / 2, (A.y + B.y) / 2, Math.max(A.z, B.z) + (d.zMax - d.zMin) * 0.05);
                    const s = numeroConVirgola(Math.hypot(B.x - A.x, B.y - A.y), 0) + ' m', w = s.length * 6.7;
                    if (scrittaLibera(m[0] - w / 2, m[1], w)) testo(m[0], m[1], s, { anchor: 'middle', alone: true, cls: 'vista3d-distanza' });
                });
                tracceNellaScena3d(d, P, sopra, testo);
                disegniNellaScena3d(d, P, sopra, testo);
                d.prove.forEach(p => {
                    if (!tieni(p.x, p.y) || vista3d.proveNascoste.has(p.s.id)) return;
                    const [tx, ty] = P(p.x, p.y, p.z);
                    sopra.push({ t: 'cerchio', x: tx, y: ty, r: 4 * stV.dimensione, fill: stV.colore || 'currentColor', stroke: stV.colore ? stV.contorno : undefined, cls: 'vista3d-testa', prova: p.s.id });
                    if (conNome(p)) testo(tx, ty - 10, nomeDpsh(p.s), { size: 13, bold: true, anchor: 'middle', alone: true, cls: 'vista3d-nome', prova: p.s.id });
                    colonne.push({ id: p.s.id, x1: tx, y1: ty - 22, x2: tx, y2: ty });
                });
                // L'attribuzione dell'immagine: è una condizione d'uso dei servizi.
                const sfAttr = L.terreno && L.immagine && d._sfondo && d._sfondo.uv && sceltaSfondo3d().id ? d._sfondo.attribuzione : '';
                if (sfAttr) { if (file) testo(16, H - 14, sfAttr, { size: 10, alone: true, cls: 'vista3d-attribuzione' }); else testo(W - 12, H - (W < 700 ? 46 : 30), sfAttr, { size: 10, anchor: 'end', alone: true, cls: 'vista3d-attribuzione' }); }
                // Il nord, in basso a destra: solo nel file (a schermo c'è la bussola). Una rosa vera:
                // quadrante con le tacche, ago a due colori (rosso verso Nord) e una N grande in punta,
                // girati come il nord della vista (la direzione Nord sul piano delle prove, proiettata).
                // Gli elementi della tavola (bussola, scala) si accendono, si spengono e si spostano dalla
                // finestra delle tavole: vista3d.elementi (acceso sì/no) e vista3d.posizioni (frazioni del
                // foglio). Dove sono finiti lo dice elementiTavola, per poterli prendere col mouse.
                const EL = vista3d.elementi || {}, POS = vista3d.posizioni || {};
                const fondo = 'var(--bg-card, #fff)';
                if (file && EL.bussola !== false) {
                    const [ox, oy] = P(0, 0, zRif), [nx, ny] = P(0, 1, zRif);
                    const lung = Math.hypot(nx - ox, ny - oy);
                    const ax = lung > 1e-6 ? (nx - ox) / lung : 0, ay = lung > 1e-6 ? (ny - oy) / lung : -1, px = -ay, py = ax;
                    const R = 42, cx = POS.bussola ? POS.bussola[0] * W : W - 24 - R - 20, cy = POS.bussola ? POS.bussola[1] * H : H - 24 - R - 20;
                    elementiTavola.bussola = { x0: cx - R - 22, y0: cy - R - 22, x1: cx + R + 22, y1: cy + R + 22 };
                    const pt = (a, b) => [cx + ax * a + px * b, cy + ay * a + py * b];
                    sopra.push({ t: 'cerchio', x: cx, y: cy, r: R, fill: fondo, stroke: 'currentColor', so: 0.7, sw: 1.5, cls: 'vista3d-nord' });
                    sopra.push({ t: 'cerchio', x: cx, y: cy, r: R - 6, fill: 'none', stroke: 'currentColor', so: 0.25, sw: 1, cls: 'vista3d-nord' });
                    for (let k = 0; k < 8; k++) {
                        const ang = k * Math.PI / 4, c = Math.cos(ang), s = Math.sin(ang), dentro = k % 2 ? R - 5 : R - 11;
                        const [x1, y1] = pt(c * dentro, s * dentro), [x2, y2] = pt(c * R, s * R);
                        sopra.push({ t: 'linea', x1, y1, x2, y2, stroke: 'currentColor', sw: k % 2 ? 1 : 2, cls: 'vista3d-nord' });
                    }
                    const punta = pt(R - 13, 0), coda = pt(-(R - 13), 0), sx = pt(0, 8), dx = pt(0, -8), centro = [cx, cy];
                    sopra.push({ t: 'poli', p: [punta, sx, centro], fill: '#dc2626', stroke: '#991b1b', sw: 0.8, cls: 'vista3d-nord' });
                    sopra.push({ t: 'poli', p: [punta, dx, centro], fill: '#991b1b', stroke: '#991b1b', sw: 0.8, cls: 'vista3d-nord' });
                    sopra.push({ t: 'poli', p: [coda, sx, centro], fill: fondo, stroke: 'currentColor', sw: 0.8, cls: 'vista3d-nord' });
                    sopra.push({ t: 'poli', p: [coda, dx, centro], fill: 'currentColor', fo: 0.35, stroke: 'currentColor', sw: 0.8, cls: 'vista3d-nord' });
                    sopra.push({ t: 'cerchio', x: cx, y: cy, r: 2.5, fill: 'currentColor', cls: 'vista3d-nord' });
                    const [tx, ty] = pt(R + 15, 0);
                    testo(tx, ty + 7, 'N', { size: 20, bold: true, anchor: 'middle', alone: true, cls: 'vista3d-nord' });
                }
                // LA SCALA GRAFICA, in basso a sinistra: senza prospettiva le distanze in orizzontale
                // sullo schermo sono in scala vera (k pixel per metro). Quattro tratti alternati,
                // 0, metà e tutta la lunghezza, tonda, sui 150 pixel.
                if (file && EL.scala !== false && !vista3d.prospettiva && k > 0) {
                    const metri = massimoTondo(150 / k), lp = metri * k, hb = 6;
                    const sx0 = POS.scala ? POS.scala[0] * W : 24, sy0 = POS.scala ? POS.scala[1] * H : H - 44;
                    elementiTavola.scala = { x0: sx0 - 10, y0: sy0 - 24, x1: sx0 + lp + 40, y1: sy0 + hb + 8 };
                    for (let n = 0; n < 4; n++) sopra.push({ t: 'poli', p: [[sx0 + lp * n / 4, sy0], [sx0 + lp * (n + 1) / 4, sy0], [sx0 + lp * (n + 1) / 4, sy0 + hb], [sx0 + lp * n / 4, sy0 + hb]], fill: n % 2 ? fondo : 'currentColor', fo: 1, stroke: 'currentColor', sw: 0.8, cls: 'vista3d-scala' });
                    [[0, '0'], [lp / 2, numeroConVirgola(metri / 2, metri / 2 < 10 && metri % 2 ? 1 : 0)], [lp, numeroConVirgola(metri, 0) + ' m']].forEach(([x, s2], n) => testo(sx0 + x, sy0 - 5, s2, { size: 11, anchor: n === 2 ? 'start' : 'middle', alone: true, cls: 'vista3d-scala' }));
                }
                // La riga delle quote e dell'esagerazione: a schermo, per chi lavora; non nel disegno
                // scaricato, che va in una tavola.
                if (!file) {
                    const quote = d.senzaDtm ? 'senza DTM: prove tutte dal piano campagna (quota 0)' : `quote da ${numeroConVirgola(d.zMin, 1)} a ${numeroConVirgola(d.zMax, 1)} m s.l.m.`, esagTesto = `esagerazione verticale ×${ex}${so ? ' · modello solido: strati interpolati tra le prove, grigio = non indagato' : L.giaciture && L.superfici && superfici.length ? ' · giaciture reali' : ''}`;
                    if (W < 700) { testo(16, H - 30, quote, { size: 12, cls: 'vista3d-didascalia' }); testo(16, H - 14, esagTesto, { size: 12, cls: 'vista3d-didascalia' }); }
                    else testo(16, H - 14, quote + ' · ' + esagTesto, { size: 12, cls: 'vista3d-didascalia' });
                }
                // Le scritte più grandi (tavole esportate: «Scritte» della finestra delle tavole).
                const scalaT = vista3d.scalaTesti || 1;
                if (scalaT !== 1) pezzi.concat(sopra).forEach(f => { if (f.t === 'testo') f.size *= scalaT; });
                // L'opacità dei livelli (menu del tasto destro): quella del livello del pezzo per quella
                // della sua prova, del suo strato e della sua traccia.
                const O = vista3d.opacita, o1 = k => (k && O[k] !== undefined ? O[k] : 1);
                pezzi.concat(sopra).forEach(f => {
                    // La mesh del corpo solido: a richiesta linee scure sottili; se no il bordo di ogni
                    // triangolo ha il suo colore, e tra un triangolo e l'altro non resta la riga.
                    if (f.cls === 'vista3d-solido') { if (L.mesh) { f.stroke = 'rgba(15,23,42,0.5)'; f.sw = 0.6; } else { f.stroke = f.fill; f.sw = 1.1; } }
                    const o = (f.cls === 'vista3d-solido' ? o1('ss:' + f.strato) : 1) * o1(LIVELLO_DEL_PEZZO[f.cls]) * (f.sfondo ? o1('immagine') : 1) * (f.prova ? o1('p:' + f.prova) : 1) * (f.strato ? o1('s:' + f.strato) : 1) * (f.traccia ? o1('t:' + f.traccia) : 1) * (f.giacitura ? o1('g:' + f.giacitura) : 1) * (f.disegno ? o1('d:' + f.disegno) : 1);
                    if (o < 1) f.op = o;
                });
                return { W, H, k, pezzi, sopra, colonne, elementi: elementiTavola, tutte: pezzi.concat(sopra) };
            }

            const LIVELLO_DEL_PEZZO = { 'vista3d-faccia': 'terreno', 'vista3d-solido': 'solido', 'vista3d-pannello': 'pannelli', 'vista3d-superficie': 'superfici',
                'vista3d-giacitura': 'giaciture', 'vista3d-giacitura-segno': 'giaciture', 'vista3d-falda': 'falda', 'vista3d-falda-segno': 'falda', 'vista3d-falda-nome': 'falda',
                'vista3d-misure': 'misure', 'vista3d-distanza': 'distanze', 'vista3d-fantasma': 'fantasma', 'vista3d-nord-terreno': 'nordTerreno' };
            /** La scena in SVG: per il file scaricato (e per i test). */
            function svgDaScena(sc) {
                const esc = escapeHtmlDidascalia, n = v => (+v).toFixed(1);
                const forma = f => {
                    const cls = (f.cls ? ` class="${f.cls}"` : '') + (f.op !== undefined && f.op < 1 ? ` opacity="${f.op}"` : ''), tit = f.title ? `<title>${esc(f.title)}</title>` : '';
                    if (f.t === 'poli') return `<polygon points="${f.p.map(p => n(p[0]) + ',' + n(p[1])).join(' ')}" fill="${f.fill}" fill-opacity="${f.fo ?? 1}" stroke="${f.stroke || 'none'}" stroke-width="${f.sw || 0}"${f.dash ? ` stroke-dasharray="${f.dash.join(' ')}"` : ''}${cls}>${tit}</polygon>`;
                    if (f.t === 'linea') return `<line x1="${n(f.x1)}" y1="${n(f.y1)}" x2="${n(f.x2)}" y2="${n(f.y2)}" stroke="${f.stroke}" stroke-width="${f.sw || 1}"${f.dash ? ` stroke-dasharray="${f.dash.join(' ')}"` : ''}${cls}>${tit}</line>`;
                    if (f.t === 'cerchio') return `<circle cx="${n(f.x)}" cy="${n(f.y)}" r="${f.r}" fill="${f.fill}"${f.stroke ? ` stroke="${f.stroke}" stroke-opacity="${f.so ?? 1}"${f.sw ? ` stroke-width="${f.sw}"` : ''}` : ''}${cls}/>`;
                    // etichetta con sfondo (e bordo): un riquadro dietro, largo quanto il testo
                    const w = f.s.length * f.size * 0.62, x0 = f.anchor === 'middle' ? f.x - w / 2 : f.anchor === 'end' ? f.x - w : f.x;
                    const box = f.box ? `<rect x="${n(x0 - 4)}" y="${n(f.y - f.size)}" width="${n(w + 8)}" height="${n(f.size + 5)}" rx="3" fill="var(--bg-card, #fff)" fill-opacity="0.88"${f.box === 'bordo' ? ' stroke="currentColor" stroke-width="1"' : ''}/>` : '';
                    return box + `<text x="${n(f.x)}" y="${n(f.y)}" font-size="${f.size}"${f.bold ? ' font-weight="700"' : ''}${f.anchor ? ` text-anchor="${f.anchor}"` : ''} fill="${f.colore || 'currentColor'}"${f.alone ? ` paint-order="stroke" stroke="${f.coloreAlone || 'var(--bg-card, #fff)'}" stroke-width="3"` : ''}${cls}>${esc(f.s)}</text>`;
                };
                return `<svg viewBox="0 0 ${sc.W} ${sc.H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vista 3D del terreno e delle prove" style="display: block; font-family: var(--font-mono), monospace;"><rect width="${sc.W}" height="${sc.H}" fill="var(--bg-card, #fff)"/>${sc.tutte.map(forma).join('')}</svg>`;
            }

            /** LA LEGENDA del disegno scaricato: solo quello che si vede in quel momento (un livello
             * spento, una prova nascosta, uno strato tolto non ci sono), letto dai pezzi della scena.
             * Gli strati in ordine di profondità, ciascuno col suo colore vero (non quello ombreggiato). */
            function vociLegenda3d(sc, d) {
                const visti = sc.tutte.filter(f => (f.op ?? 1) > 0.01), voci = [];
                const di = cls => visti.filter(f => f.cls === cls);
                const prove = di('vista3d-testa');
                if (prove.length) voci.push({ tipo: 'cerchio', fill: prove[0].fill, stroke: prove[0].stroke, testo: prove.length === 1 ? 'Prova DPSH' : `Prove DPSH (${prove.length})` });
                const facce = di('vista3d-faccia');
                if (facce.length) voci.push({ tipo: 'riquadro', fill: facce[Math.floor(facce.length / 2)].fill, fo: facce[0].fo, testo: d.senzaDtm ? 'Piano campagna' : 'Terreno (DTM)' });
                // Gli strati: dalle colonne, dal corpo solido, dai pannelli e dalle superfici di tetto.
                const strati = new Map();
                visti.forEach(f => {
                    if (!f.strato || strati.has(f.strato)) return;
                    if (f.cls === 'vista3d-colonna') strati.set(f.strato, { fill: f.stroke, fo: 1 });
                    else if (['vista3d-solido', 'vista3d-pannello', 'vista3d-superficie'].includes(f.cls)) strati.set(f.strato, { fill: f.base || f.fill, fo: Math.max(0.35, f.fo ?? 1) });
                });
                if (strati.size) {
                    const prof = new Map();
                    d.prove.forEach(p => p.fasce.forEach(fa => { const v = prof.get(fa.nome) || [0, 0]; prof.set(fa.nome, [v[0] + fa.da, v[1] + 1]); }));
                    const media = n => prof.has(n) ? prof.get(n)[0] / prof.get(n)[1] : Infinity;
                    voci.push({ tipo: 'titolo', testo: 'Strati' });
                    [...strati].sort((a, b) => media(a[0]) - media(b[0])).forEach(([nome, v]) => voci.push({ tipo: 'riquadro', fill: v.fill, fo: v.fo, testo: nome }));
                }
                const altri = [];
                const faldaSegno = di('vista3d-falda-segno')[0], faldaSup = di('vista3d-falda')[0];
                if (faldaSegno) altri.push({ tipo: 'linea', stroke: faldaSegno.stroke, sw: Math.max(2, faldaSegno.sw || 2), dash: faldaSegno.dash, testo: 'Falda' });
                if (faldaSup) altri.push({ tipo: 'riquadro', fill: faldaSup.fill, fo: faldaSup.fo, stroke: faldaSup.stroke, testo: 'Superficie della falda' });
                if (di('vista3d-giacitura-segno').length) altri.push({ tipo: 'giacitura', testo: 'Giacitura (immersione/inclinazione)' });
                if (di('vista3d-taglio').length) altri.push({ tipo: 'linea', stroke: 'currentColor', sw: 1.2, testo: 'Bordo del taglio' });
                if (di('vista3d-misure').length) altri.push({ tipo: 'asta', testo: 'Quote (m)' });
                const tracce = new Map();
                di('vista3d-traccia').forEach(f => { if (f.traccia && !tracce.has(f.traccia)) tracce.set(f.traccia, f); });
                const nomiTracce = new Map(tracceDelProgetto().map(t => [t.id, t.nome]));
                tracce.forEach((f, id) => altri.push({ tipo: 'linea', stroke: f.stroke, sw: Math.max(1.6, f.sw || 1.6), dash: f.dash, testo: 'Sezione ' + (nomiTracce.get(id) || '') }));
                const disegni = new Map();
                di('vista3d-disegno').forEach(f => { const v = disegni.get(f.disegno) || {}; if (f.t === 'cerchio') v.punto = f; else if (f.t === 'poli') v.area = f; else v.bordo = v.bordo || f; disegni.set(f.disegno, v); });
                const nomiDisegni = new Map(disegniDelProgetto().map(x => [x.id, x.nome]));
                disegni.forEach((v, id) => {
                    const nome = nomiDisegni.get(id) || '';
                    if (v.punto) altri.push({ tipo: 'cerchio', fill: v.punto.fill, stroke: v.punto.stroke, r: 5, testo: nome });
                    else altri.push({ tipo: 'riquadro', fill: v.area ? v.area.fill : 'none', fo: v.area ? v.area.fo : 0, stroke: v.bordo && v.bordo.stroke, dash: v.bordo && v.bordo.dash, testo: nome });
                });
                if (altri.length) { voci.push({ tipo: 'titolo', testo: 'Altro' }); voci.push(...altri); }
                return voci;
            }
            /** La legenda, piccola e sobria come in HyperGram: un riquadro in alto a destra, DENTRO la
             * figura (che così resta grande quanto il foglio), col fondo appena velato. Righe di 10 px,
             * campioni piccoli, i nomi lunghi vanno a capo. Le misure servono anche a chi inquadra. */
            const LEGENDA_3D = { car: 6.1, max: 30, riga: 14, a_capo: 12, testa: 22, sez: 17, pad: 9 };
            // fs: quanto più grandi le scritte (1 = come a schermo); tutto il riquadro cresce con loro.
            function impaginaLegenda3d(voci, fs) {
                const L = LEGENDA_3D, f = fs || 1;
                const aCapo = s => {
                    const righe = [];
                    String(s).split(/\s+/).forEach(p => { const u = righe.length - 1; if (u >= 0 && (righe[u] + ' ' + p).length <= L.max) righe[u] += ' ' + p; else righe.push(p); });
                    return righe;
                };
                voci.forEach(v => { v.righe = v.tipo === 'titolo' ? [v.testo] : aCapo(v.testo); });
                const w = Math.round(f * Math.min(230, Math.max(120, 2 * L.pad + 24 + L.car * Math.max(...voci.map(v => Math.max(...v.righe.map(r => r.length)))))));
                const h = Math.round(f * (L.pad + L.testa + voci.reduce((a, v) => a + (v.tipo === 'titolo' ? L.sez : L.riga + (v.righe.length - 1) * L.a_capo), 0) + L.pad - 4));
                return { w, h };
            }
            function conLegenda3d(sc, d, fs, pos) {
                const voci = vociLegenda3d(sc, d);
                if (!voci.length) return sc;
                const f = fs || 1, L = LEGENDA_3D, { w, h } = impaginaLegenda3d(voci, f), cls = 'vista3d-legenda';
                // pos: l'angolo in alto a sinistra in frazioni del foglio (spostata a mano), dentro al foglio
                const bx = pos ? Math.max(0, Math.min(sc.W - w, pos[0] * sc.W)) : sc.W - w - 12, by = pos ? Math.max(0, Math.min(sc.H - h, pos[1] * sc.H)) : 12, x0 = bx + L.pad * f, forme = [];
                forme.push({ t: 'poli', p: [[bx, by], [bx + w, by], [bx + w, by + h], [bx, by + h]], fill: 'var(--bg-card, #fff)', fo: 0.86, stroke: 'currentColor', sw: 0.6, cls });
                forme.push({ t: 'testo', x: x0, y: by + (L.pad + 9) * f, s: 'Legenda', size: 11 * f, bold: true, cls });
                let y = by + (L.pad + L.testa - 4) * f;
                voci.forEach(v => {
                    if (v.tipo === 'titolo') { forme.push({ t: 'testo', x: x0, y: y + 11 * f, s: v.testo.toUpperCase(), size: 8 * f, bold: true, op: 0.6, cls }); y += L.sez * f; return; }
                    const cy = y + 6 * f, xs = x0, xt = x0 + 22 * f, q = n => n * f;
                    if (v.tipo === 'riquadro') forme.push({ t: 'poli', p: [[xs, cy - q(4.5)], [xs + q(15), cy - q(4.5)], [xs + q(15), cy + q(4.5)], [xs, cy + q(4.5)]], fill: v.fill || 'none', fo: v.fo ?? 1, stroke: v.stroke || 'currentColor', sw: v.stroke ? 1 : 0.4, dash: v.dash, cls });
                    else if (v.tipo === 'linea') forme.push({ t: 'linea', x1: xs, y1: cy, x2: xs + q(15), y2: cy, stroke: v.stroke, sw: Math.min(2.2, v.sw || 1.5) * Math.sqrt(f), dash: v.dash, cls });
                    else if (v.tipo === 'cerchio') forme.push({ t: 'cerchio', x: xs + q(7.5), y: cy, r: Math.min(3.5, v.r || 3.5) * f, fill: v.fill || 'currentColor', stroke: v.stroke, cls });
                    else if (v.tipo === 'giacitura') { forme.push({ t: 'linea', x1: xs + q(1), y1: cy - q(1.5), x2: xs + q(14), y2: cy - q(1.5), stroke: 'currentColor', sw: 1.5, cls }); forme.push({ t: 'linea', x1: xs + q(7.5), y1: cy - q(1.5), x2: xs + q(7.5), y2: cy + q(4), stroke: 'currentColor', sw: 1.5, cls }); }
                    else if (v.tipo === 'asta') { forme.push({ t: 'linea', x1: xs + q(7.5), y1: cy - q(5.5), x2: xs + q(7.5), y2: cy + q(5.5), stroke: 'currentColor', sw: 1, cls }); [-5, 0, 5].forEach(k => forme.push({ t: 'linea', x1: xs + q(4.5), y1: cy + q(k), x2: xs + q(10.5), y2: cy + q(k), stroke: 'currentColor', sw: 0.8, cls })); }
                    v.righe.forEach((r, i) => forme.push({ t: 'testo', x: xt, y: cy + q(3.5) + i * L.a_capo * f, s: r, size: 10 * f, cls }));
                    y += (L.riga + (v.righe.length - 1) * L.a_capo) * f;
                });
                return { ...sc, legenda: { x: bx, y: by, w, h }, tutte: sc.tutte.concat(forme) };
            }

            /** La scena sul canvas: stessa figura, disegnata in pochi millisecondi anche mentre gira. */
            function disegnaScena(canvas, sc, colori) {
                const ctx = canvas.getContext && canvas.getContext('2d');
                if (!ctx) return; // browser senza canvas: resta la figura in SVG del file
                // colori: { fondo, testo, scala } per le immagini esportate (sfondo scelto, più pixel).
                const dpr = (colori && colori.scala) || window.devicePixelRatio || 1, stile = getComputedStyle(canvas.parentElement || document.body);
                if (canvas.width !== Math.round(sc.W * dpr) || canvas.height !== Math.round(sc.H * dpr)) {
                    canvas.width = Math.round(sc.W * dpr); canvas.height = Math.round(sc.H * dpr);
                    canvas.style.width = sc.W + 'px'; canvas.style.height = sc.H + 'px';
                }
                const testoColore = (colori && colori.testo) || stile.color, fondo = (colori && colori.fondo) || getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#fff';
                const mono = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'monospace';
                const col = c => c === 'currentColor' ? testoColore : (typeof c === 'string' && c.startsWith('var(--bg-card')) ? fondo : c;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.fillStyle = fondo; ctx.fillRect(0, 0, sc.W, sc.H);
                ctx.lineJoin = 'round';
                sc.tutte.forEach(f => {
                    ctx.setLineDash(f.dash || []);
                    const op = f.op ?? 1;
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
                        ctx.globalAlpha = (f.fo ?? 1) * op;
                        ctx.transform(a, b, c, dd, e, ff);
                        ctx.drawImage(f.sfondo, 0, 0);
                        ctx.restore();
                        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    } else if (f.t === 'poli') {
                        ctx.beginPath(); f.p.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
                        if (f.fill && f.fill !== 'none') { ctx.globalAlpha = (f.fo ?? 1) * op; ctx.fillStyle = col(f.fill); ctx.fill(); }
                        if (f.stroke && f.sw) { ctx.globalAlpha = Math.min(1, (f.fo ?? 1) + 0.25) * op; ctx.strokeStyle = col(f.stroke); ctx.lineWidth = f.sw; ctx.stroke(); }
                    } else if (f.t === 'linea') {
                        ctx.globalAlpha = op; ctx.strokeStyle = col(f.stroke); ctx.lineWidth = f.sw || 1;
                        ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
                    } else if (f.t === 'cerchio') {
                        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
                        if (f.fill !== 'none') { ctx.globalAlpha = op; ctx.fillStyle = col(f.fill); ctx.fill(); }
                        if (f.stroke) { ctx.globalAlpha = (f.so ?? 1) * op; ctx.strokeStyle = col(f.stroke); ctx.lineWidth = f.sw || 1; ctx.stroke(); }
                    } else {
                        ctx.globalAlpha = op; ctx.font = `${f.bold ? '700 ' : ''}${f.size}px ${mono}`;
                        ctx.textAlign = f.anchor === 'middle' ? 'center' : f.anchor === 'end' ? 'right' : 'left';
                        if (f.box) {
                            const w = ctx.measureText(f.s).width, x0 = f.anchor === 'middle' ? f.x - w / 2 : f.anchor === 'end' ? f.x - w : f.x;
                            ctx.save(); ctx.globalAlpha = 0.88 * op; ctx.fillStyle = fondo;
                            ctx.beginPath(); ctx.rect(x0 - 4, f.y - f.size, w + 8, f.size + 5); ctx.fill();
                            if (f.box === 'bordo') { ctx.globalAlpha = op; ctx.strokeStyle = testoColore; ctx.lineWidth = 1; ctx.stroke(); }
                            ctx.restore();
                        } else if (f.alone) { ctx.lineWidth = 3; ctx.strokeStyle = f.coloreAlone ? col(f.coloreAlone) : fondo; ctx.strokeText(f.s, f.x, f.y); }
                        ctx.fillStyle = f.colore ? col(f.colore) : testoColore; ctx.fillText(f.s, f.x, f.y);
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
                document.getElementById('lblCaricaDtm3d').textContent = (state.projects[state.currentProjectId] || {}).dtm ? 'Carica un altro DTM' : 'Carica un DTM';
                renderLivelli3d();
                document.querySelectorAll('#modalVista3d [data-livello]').forEach(b => b.setAttribute('aria-pressed', String(vista3d.livelli[b.dataset.livello])));
                sincronizzaCursori3d();
                // Nel modo Mappa la figura 3D non si vede: si aggiorna la mappa 2D.
                if (areaMappa.modo === 'mappa') { disegnaProveMappa(); return; }
                const tg = vista3d.taglio, so = datiVista3dCorrenti && modelloSolido(datiVista3dCorrenti);
                document.querySelectorAll('#direzioneTaglio3d [data-taglio-dir]').forEach(b => b.setAttribute('aria-pressed', String((tg.dir || '') === b.dataset.taglioDir)));
                document.getElementById('rngTaglioV3d').disabled = !tg.dir;
                document.getElementById('btnTaglioLato3d').disabled = !tg.dir;
                document.getElementById('btnTaglioTraccia3d').disabled = !tg.dir;
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
            function vistaIniziale3d(animata) {
                vista3d.taglio = { dir: null, pos: 0.5, lato: 1, prof: 0 };
                document.getElementById('rngTaglioV3d').value = 50;
                document.getElementById('rngTaglioH3d').value = 0;
                // le prove grandi, il terreno ai bordi si può tagliare
                if (animata) { vaiAVista3d({ az: -0.6, el: 0.62, centro: [0, 0, 0], zoom: 1.4 }); return; }
                vista3d.az = -0.6; vista3d.el = 0.62; vista3d.centro = [0, 0, 0];
                vista3d.zoom = 1.4;
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
                // Una sezione sotto il mouse (Seleziona): si trascina lei, la vista resta ferma.
                if (e.button === 0 && !e.shiftKey && dita3d.size === 0 && iniziaSpostaTraccia3d(...puntoCanvas(e))) {
                    vista3d.mosso = 0;
                    if (box3d.setPointerCapture) box3d.setPointerCapture(e.pointerId);
                    return;
                }
                dita3d.set(e.pointerId, { x: e.clientX, y: e.clientY });
                vista3d.trascina = dita3d.size === 1 ? { x: e.clientX, y: e.clientY, sposta: e.button === 1 || e.button === 2 || e.shiftKey } : null;
                vista3d.pizzico = dita3d.size === 2 ? pizzicoDita() : null;
                vista3d.mosso = 0;
                if (box3d.setPointerCapture) box3d.setPointerCapture(e.pointerId);
            });
            box3d.addEventListener('pointermove', (e) => {
                if (vista3d.spostaTraccia) { vista3d.mosso += 10; seguiSpostaTraccia3d(...puntoCanvas(e)); return; }
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
                if (vista3d.spostaTraccia) { const st = vista3d.spostaTraccia; vista3d.spostaTraccia = null; if (st.mossa) fineSpostaTraccia(); return; }
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
                const tr = areaMappa.strumento === 'sel' && tracciaSottoIlMouse3d(mx, my);
                if (c) c.style.cursor = tr ? (tr.parte === 'tutta' ? 'move' : 'crosshair') : provaNelPunto(ultimaScena3d, mx, my) ? 'pointer' : 'grab';
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
                if (!b || b.classList.contains('liv-riga')) return; // le righe del pannello hanno la loro spunta
                dissolvenza3d();
                if (b.dataset.livello === 'solido' && !vista3d.livelli.solido) { accendiSolido3d(); renderVista3d(); return; }
                vista3d.livelli[b.dataset.livello] = !vista3d.livelli[b.dataset.livello];
                renderVista3d();
            });
            // ---- IL PANNELLO LIVELLI (preso da HyperGram 6.0b, «come in QGIS»). Gruppi apribili, ciascuno
            // con la sua spunta (tutto il gruppo); righe con spunta, simbolo, nome, il tasto «T» delle
            // etichette (sui livelli che ne hanno) e un numero. Un clic evidenzia la riga (una prova: anche
            // la sua scheda), il doppio clic la inquadra, il tasto destro apre il suo menu: inquadra,
            // etichette, opacità e le voci sue. Ogni prova, ogni strato e ogni sezione è un livello. ----
            const livelliChiusi3d = (() => { try { return JSON.parse(localStorage.getItem('dpsh.livelli3dGruppiChiusi') || '{}'); } catch (_) { return {}; } })();
            let livelloScelto3d = null;
            /** Le righe, a gruppi. Una riga: chiave (per la scelta e l'opacità), attributo, acceso, simbolo,
             * nome, numero, etichette (sì/no; senza, niente «T») e di chi è (prova, strato, traccia, livello). */
            function righeLivelli3d() {
                const L = vista3d.livelli, E = vista3d.etichette, d = datiVista3dCorrenti, ico = n => `<svg class="ico"><use href="#i-${n}"/></svg>`;
                const sw = (cls, stile) => `<span class="liv-sw ${cls}" style="${stile}"></span>`;
                const prove = d ? d.prove : [];
                const strati = new Map(), giaciture = new Map();
                prove.forEach(p => p.fasce.forEach(f => { const v = strati.get(f.nome) || { colore: f.colore, n: new Set() }; v.n.add(p.s.id); strati.set(f.nome, v); }));
                (d && !L.solido ? modelloCorrelazione(d).superfici : []).forEach(sf => { const v = giaciture.get(sf.f.nome) || { colore: sf.f.colore, n: 0 }; v.n++; giaciture.set(sf.f.nome, v); });
                const liv = (k, simbolo, nome, titolo, etichette) => ({ chiave: k, livello: k, attr: `data-livello="${k}"`, acceso: !!L[k], simbolo, nome, conta: '', titolo, etichette });
                const gruppi = [
                    { id: 'prove', nome: 'Prove', righe: prove.map(p => ({ chiave: 'p:' + p.s.id, prova: p.s.id, attr: `data-prova3d="${p.s.id}"`, acceso: !vista3d.proveNascoste.has(p.s.id),
                        simbolo: `<svg width="8" height="16" viewBox="0 0 8 16">${p.fasce.map(f => `<rect x="0" y="${(16 * f.da / (p.fondo || 1)).toFixed(1)}" width="8" height="${(16 * (f.a - f.da) / (p.fondo || 1)).toFixed(1)}" fill="${f.colore}"/>`).join('')}</svg>`,
                        nome: nomeDpsh(p.s), conta: numeroConVirgola(p.fondo, 1) + ' m', titolo: 'La colonna, il nome e la falda di questa prova' })), etichette: E.prove },
                    { id: 'strati', nome: 'Strati', righe: [...strati].map(([nome, v]) => ({ chiave: 's:' + nome, strato: nome, attr: `data-strato3d="${String(nome).replace(/"/g, '&quot;')}"`, acceso: !vista3d.stratiNascosti.has(nome),
                        simbolo: sw('aree', `background:${v.colore}; border-color:${v.colore}`), nome, conta: v.n.size, titolo: `Lo strato nelle colonne, nei pannelli, nelle superfici e nel corpo solido (in ${v.n.size} prove)` })) },
                    // Le giaciture: una riga per strato (il suo tetto tra tre prove); «T» del gruppo: il nome dello strato.
                    { id: 'giaciture', nome: 'Giaciture', etichette: E.giaciture, righe: [...giaciture].map(([nome, v]) => ({ chiave: 'g:' + nome, giacitura: nome, attr: `data-giacitura3d="${String(nome).replace(/"/g, '&quot;')}"`,
                        acceso: !!L.giaciture && !vista3d.giacitureNascoste.has(nome), simbolo: `<svg class="ico" style="color:${v.colore}"><use href="#i-target"/></svg>`, nome, conta: v.n,
                        titolo: `Immersione e inclinazione del tetto di ${nome}` })) },
                    { id: 'modello', nome: 'Modello', righe: [
                        // Spente le colonne, di ogni prova resta il punto col nome (e la falda, se accesa).
                        liv('colonne', sw('linee', 'background:linear-gradient(#facc15 0 40%, #d97706 40% 70%, #65a30d 70%)'), 'Colonne delle prove', 'I pozzi con i loro strati: spenti resta il punto di ogni prova'),
                        liv('solido', ico('stack'), 'Corpo solido', 'Il modello chiuso tra le prove (i tagli nella scheda «Modello e tagli»)'),
                        liv('pannelli', sw('aree', 'background:#94a3b8; border-color:#64748b'), 'Pannelli di correlazione'),
                        liv('superfici', sw('aree', 'background:transparent; border-color:#64748b; border-style:dashed'), 'Superfici di contatto'),
                        liv('falda', sw('linee', 'background:#0284c7'), 'Falda', '«T»: la profondità della falda su ogni colonna', E.falda),
                        liv('fantasma', sw('aree', 'background:transparent; border-color:#64748b; border-style:dashed'), 'Spigoli del pezzo tagliato', 'Col corpo tagliato: il contorno di quello che è stato tolto, tratteggiato sottile') ] },
                    // Gli strati del corpo solido (solo del modello: colonne e pannelli restano).
                    { id: 'solido', nome: 'Corpo solido', righe: (d && L.solido && modelloSolido(d) ? modelloSolido(d).strati : []).map(st => ({ chiave: 'ss:' + st.nome, solidoStrato: st.nome,
                        attr: `data-solido3d="${String(st.nome).replace(/"/g, '&quot;')}"`, acceso: !vista3d.stratiSolidoNascosti.has(st.nome),
                        simbolo: sw('aree', `background:${st.colore}; border-color:${st.colore}`), nome: st.nome, conta: '', titolo: 'Lo strato nel corpo solido' })) },
                    { id: 'riferimenti', nome: 'Riferimenti', righe: [
                        liv('misure', ico('ruler'), 'Asta delle quote', 'L\'asta graduata attaccata al modello; «T»: i numeri', E.misure),
                        liv('distanze', ico('ruler'), 'Distanze tra le prove', 'I metri tra una prova e l\'altra') ] },
                    { id: 'sezioni', nome: 'Sezioni', righe: tracceDelProgetto().map(t => ({ chiave: 't:' + t.id, traccia: t.id, attr: `data-traccia3d="${t.id}"`, acceso: !vista3d.tracceNascoste.has(t.id),
                        simbolo: sw('linee', 'background:#dc2626'), nome: t.nome, conta: '', titolo: 'La traccia della sezione' })), etichette: E.sezioni },
                    // I disegni dell'utente (strumenti Punto e Poligono): uno per riga.
                    { id: 'disegni', nome: 'Disegnati', etichette: E.disegni, righe: disegniDelProgetto().map(x => ({ chiave: 'd:' + x.id, disegno: x.id, attr: `data-disegno3d="${x.id}"`,
                        acceso: !vista3d.disegniNascosti.has(x.id), nome: x.nome, titolo: testoDisegno(x),
                        simbolo: x.tipo === 'punto' ? sw('punti', `background:${x.colore}`) : sw('aree', `background:${x.colore}55; border-color:${x.colore}`),
                        conta: x.tipo === 'poligono' ? numeroConVirgola(areaMetriQuadri(x.punti), 0) + ' m²' : '' })) },
                    { id: 'sfondo', nome: 'Sfondo', righe: [
                        liv('terreno', sw('aree', 'background:#a3a36b; border-color:#6b7a4b'), d && d.senzaDtm ? 'Piano campagna' : 'Terreno (DTM)'),
                        liv('immagine', ico('satellite'), 'Immagine sul terreno', 'Quella scelta nella scheda «Immagine»'),
                        liv('nordTerreno', ico('arrow-up'), 'Freccia del Nord sul terreno', 'Stesa sul terreno, nell\'angolo più vicino') ] }
                ];
                // Nel modo Mappa: le prove, le sezioni e la mappa di base (tasto destro per cambiarla).
                if (areaMappa.modo === 'mappa') {
                    const op = vista3d.opacita['sf-base'] ?? 1;
                    return [gruppi[0], gruppi.find(g => g.id === 'sezioni'), gruppi.find(g => g.id === 'disegni'), { id: 'sfondo2d', nome: 'Sfondo', righe: [{ chiave: 'sf-base', sfondo2d: true, attr: 'data-sfondo2d="base"', acceso: !mappaProgetto.sfondoSpento,
                        simbolo: ico(/strade|wms/.test(mappaProgetto.stile) ? 'map' : 'satellite'), nome: (SFONDI_2D().find(x => x[0] === mappaProgetto.stile) || ['', 'Satellite (Esri)'])[1], conta: Math.round(op * 100) + '%',
                        titolo: 'Mappa di base: tasto destro per cambiarla' }] }].filter(g => g.righe.length);
                }
                return gruppi.filter(g => g.righe.length);
            }
            // Un gruppo è chiuso se lo si è chiuso; le prove, se sono tante (le altre righe restano in vista).
            const gruppoChiuso3d = (id, n) => id in livelliChiusi3d ? !!livelliChiusi3d[id] : id === 'prove' && n > 8;
            function renderLivelli3d() {
                const albero = document.getElementById('livelliVista3d');
                if (!albero) return;
                const esc = v => escapeHtmlDidascalia(String(v)), ico = n => `<svg class="ico"><use href="#i-${n}"/></svg>`;
                const righe = new Map();
                const html = righeLivelli3d().map(g => {
                    const chiuso = gruppoChiuso3d(g.id, g.righe.length), tutti = g.righe.every(r => r.acceso);
                    return `<div class="liv-gruppo${chiuso ? ' chiuso' : ''}" data-gruppo="${g.id}"><button type="button" data-apri-gruppo="${g.id}" title="Apri o chiudi il gruppo">${ico('chevron-down')}</button>`
                        + `<input type="checkbox" data-gruppo3d="${g.id}"${tutti ? ' checked' : ''} title="Mostra o nascondi tutto il gruppo"><span>${g.nome}</span>`
                        + (g.etichette === undefined ? '' : `<button type="button" class="liv-etichette${g.etichette ? ' attivo' : ''}" data-etichette-gruppo="${g.id}" aria-pressed="${g.etichette}" title="Etichette: ${g.id === 'prove' ? 'i nomi delle prove' : 'le lettere delle sezioni'}">${ico('type')}</button>`) + '</div>'
                        + `<div class="liv-gruppo-corpo${chiuso ? ' chiuso' : ''}" data-corpo="${g.id}"><div class="liv-gruppo-dentro">`
                        + g.righe.map(r => {
                            righe.set(r.chiave, r);
                            return `<div class="liv-riga${r.acceso ? '' : ' spento'}${r.chiave === livelloScelto3d ? ' sel' : ''}" ${r.attr} data-chiave="${esc(r.chiave)}" data-gruppo="${g.id}"${r.titolo ? ` title="${esc(r.titolo)}"` : ''}>`
                                + `<input type="checkbox"${r.acceso ? ' checked' : ''} tabindex="-1" aria-label="Mostra o nascondi ${esc(r.nome)}"><span class="liv-simbolo">${r.simbolo}</span>`
                                + `<span class="liv-nome">${esc(r.nome)}</span>`
                                + (r.etichette === undefined ? '' : `<button type="button" class="liv-etichette${r.etichette ? ' attivo' : ''}" aria-pressed="${r.etichette}" title="Etichette">${ico('type')}</button>`)
                                + `<span class="liv-conta">${r.conta}</span></div>`;
                        }).join('') + '</div></div>';
                }).join('');
                // Uguale a prima (succede a ogni fotogramma mentre si gira): non si tocca, le animazioni restano.
                if (html === albero._html) return;
                // Come in HyperGram: le righe spostate scivolano dal posto di prima, le nuove entrano.
                const prima = new Map();
                albero.querySelectorAll('.liv-riga').forEach(r => prima.set(r.dataset.chiave, r.getBoundingClientRect().top));
                const cerano = albero._righe;
                albero._righe = righe;
                albero._html = html;
                albero.innerHTML = html;
                const cambiata = albero._cambiata;
                albero._cambiata = null;
                if (cambiata) {
                    const el = cambiata.gruppo ? albero.querySelector(`[data-etichette-gruppo="${cambiata.gruppo}"]`) : [...albero.querySelectorAll('.liv-riga')].find(r => r.dataset.chiave === cambiata.chiave);
                    const bersaglio = el && (cambiata.t && !cambiata.gruppo ? el.querySelector('.liv-etichette') : el);
                    if (bersaglio) bersaglio.classList.add('cambiata');
                }
                if (movimentoRidotto3d()) return;
                const mosse = [];
                albero.querySelectorAll('.liv-riga').forEach(r => {
                    if (r.closest('.liv-gruppo-corpo.chiuso')) return;
                    const y0 = prima.get(r.dataset.chiave);
                    if (y0 === undefined) { if (cerano && cerano.size) r.classList.add('entra'); return; }
                    const dy = y0 - r.getBoundingClientRect().top;
                    if (Math.abs(dy) < 1) return;
                    r.style.transform = `translateY(${dy}px)`;
                    r.style.transition = 'none';
                    mosse.push(r);
                });
                if (mosse.length) requestAnimationFrame(() => requestAnimationFrame(() => mosse.forEach(r => {
                    r.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
                    r.style.transform = '';
                    r.addEventListener('transitionend', () => { r.style.transition = ''; }, { once: true });
                })));
            }
            const movimentoRidotto3d = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
            /** LA DISSOLVENZA DEL 3D: prima di un cambio (un livello acceso o spento, un'opacità, la mesh…) la
             * figura di adesso si copia sopra la scena e sfuma, scoprendo quella nuova. */
            function dissolvenza3d() {
                if (areaMappa.modo !== '3d' || movimentoRidotto3d()) return;
                const tela = document.querySelector('#graficoVista3d canvas'), ctx = tela && tela.getContext && tela.getContext('2d');
                if (!ctx || !tela.width) return;
                const copia = document.createElement('canvas');
                copia.width = tela.width; copia.height = tela.height;
                copia.className = 'vista3d-dissolvenza';
                copia.style.width = tela.style.width; copia.style.height = tela.style.height;
                const c2 = copia.getContext('2d');
                if (!c2) return;
                c2.drawImage(tela, 0, 0);
                tela.parentElement.appendChild(copia);
                requestAnimationFrame(() => requestAnimationFrame(() => { copia.style.opacity = '0'; }));
                setTimeout(() => copia.remove(), 400);
            }
            function accendiLivello3d(r, on) {
                if (r.prova) vista3d.proveNascoste[on ? 'delete' : 'add'](r.prova);
                else if (r.strato !== undefined) vista3d.stratiNascosti[on ? 'delete' : 'add'](r.strato);
                else if (r.traccia) vista3d.tracceNascoste[on ? 'delete' : 'add'](r.traccia);
                else if (r.disegno) vista3d.disegniNascosti[on ? 'delete' : 'add'](r.disegno);
                else if (r.solidoStrato !== undefined) vista3d.stratiSolidoNascosti[on ? 'delete' : 'add'](r.solidoStrato);
                else if (r.giacitura !== undefined) { vista3d.giacitureNascoste[on ? 'delete' : 'add'](r.giacitura); if (on) vista3d.livelli.giaciture = true; }
                else if (r.sfondo2d) sfondo2dAcceso(on);
                else {
                    if (r.livello === 'solido' && on && !vista3d.livelli.solido) accendiSolido3d();
                    vista3d.livelli[r.livello] = on;
                }
            }
            function etichetteLivello3d(r) {
                vista3d.etichette[r.livello] = !r.etichette;
                renderVista3d();
            }
            /** Inquadra il livello: la prova, le prove con lo strato, la traccia; il resto è tutta la scena. */
            function inquadraLivello3d(r) {
                const proj = state.projects[state.currentProjectId], d = datiVista3dCorrenti;
                const dis = r.disegno && disegniDelProgetto().find(x => x.id === r.disegno);
                const t = r.traccia ? tracceDelProgetto().find(x => x.id === r.traccia) : dis ? { a: dis.punti[0], b: dis.punti[dis.punti.length - 1], punti: dis.punti } : null;
                const strato = r.strato !== undefined ? r.strato : r.giacitura;
                const prove = r.prova ? [r.prova] : (strato !== undefined && d) ? d.prove.filter(p => p.fasce.some(f => f.nome === strato)).map(p => p.s.id) : null;
                if (areaMappa.modo === 'mappa') {
                    const m = mappaProgetto.mappa;
                    if (!m) return;
                    const punti = t ? (t.punti || [t.a, t.b]).map(p => [p.lat, p.lng]) : prove ? prove.map(id => proj.surveys[id]).filter(Boolean).map(s => [parseFloat(s.header.lat), parseFloat(s.header.lng)]) : null;
                    if (!punti) inquadraTutteMappa2d();
                    else if (punti.length > 1) m.flyToBounds(L.latLngBounds(punti).pad(0.3), { maxZoom: 19, duration: 0.6 });
                    else if (punti.length) m.flyTo(punti[0], 19, { duration: 0.6 });
                    return;
                }
                if (!d) return;
                const xy = t ? (t.punti ? t.punti.map(p => d.daGeo(p.lat, p.lng)) : (sc => [sc.a, sc.b])(tracciaInScena(d, t))) : prove ? d.prove.filter(p => prove.includes(p.s.id)).map(p => [p.x, p.y]) : null;
                if (!xy || !xy.length) { vaiAVista3d({ centro: [0, 0, 0], zoom: 1.4 }); return; }
                const xs = xy.map(p => p[0]), ys = xy.map(p => p[1]);
                const diametro = Math.max(15, Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)));
                vaiAVista3d({ centro: [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, 0], zoom: Math.max(1, Math.min(40, d.lato / diametro * 1.2)) });
            }
            const menuQui = (x, y, titolo, voci) => apriMenuContesto({ preventDefault() {}, clientX: x, clientY: y }, titolo, voci);
            function menuOpacita3d(r, x, y) {
                const attuale = vista3d.opacita[r.chiave] ?? 1;
                menuQui(x, y, 'Opacità · ' + r.nome, [1, 0.8, 0.6, 0.4, 0.2].map(v => [Math.round(v * 100) + '%', Math.abs(v - attuale) < 0.01 ? 'i-check' : 'i-eye', '', () => {
                    dissolvenza3d();
                    if (v === 1) delete vista3d.opacita[r.chiave]; else vista3d.opacita[r.chiave] = v;
                    if (r.sfondo2d) sfondo2dAcceso(!mappaProgetto.sfondoSpento);
                    renderVista3d();
                }]));
            }
            function menuLivello3d(e, r) {
                const x = e.clientX, y = e.clientY;
                const opacita = ['Opacità…', 'i-eye', Math.round((vista3d.opacita[r.chiave] ?? 1) * 100) + '%', () => setTimeout(() => menuOpacita3d(r, x, y))];
                if (r.sfondo2d) {
                    apriMenuContesto(e, r.nome, [['Cambia mappa di base…', 'i-map', '', () => setTimeout(() => menuQui(x, y, 'Mappa di base',
                        SFONDI_2D().map(([k, nome]) => [nome, k === mappaProgetto.stile ? 'i-check' : 'i-map', '', () => { sfondoMappaProgetto(k); renderLivelli3d(); }])))], opacita]);
                    return;
                }
                const voci = [['Inquadra', 'i-target', '', () => inquadraLivello3d(r)]];
                if (r.etichette !== undefined) voci.push([r.etichette ? 'Nascondi etichette' : 'Mostra etichette', 'i-type', '', () => etichetteLivello3d(r)]);
                voci.push(opacita);
                const t = r.traccia && tracceDelProgetto().find(x => x.id === r.traccia);
                const dis = r.disegno && disegniDelProgetto().find(x => x.id === r.disegno);
                // «Stile…»: colore, contorno, riempimento, tratto… del livello (le prove, tutte insieme)
                const chiaveStile = r.prova ? 'prove' : r.traccia ? 't:' + r.traccia : r.disegno ? 'd:' + r.disegno : r.giacitura !== undefined ? 'giaciture' : ['falda', 'pannelli', 'superfici', 'misure'].includes(r.livello) ? r.livello : null;
                if (chiaveStile) voci.push(['Stile…', 'i-draw', '', () => setTimeout(() => apriStileLivello(chiaveStile, chiaveStile === 'prove' ? 'Prove' : chiaveStile === 'giaciture' ? 'Giaciture' : r.nome, { x, y }))]);
                if (r.prova) voci.push('-', ...vociProvaMappa(r.prova));
                else if (t) voci.push('-', ...vociTracciaMappa(t));
                else if (dis) voci.push('-', ...vociDisegno(dis, { x, y }));
                apriMenuContesto(e, r.nome, voci);
            }
            (() => {
                const albero = document.getElementById('livelliVista3d');
                const riga = e => { const el = e.target.closest('.liv-riga'); return el ? albero._righe.get(el.dataset.chiave) : null; };
                albero.addEventListener('click', (e) => {
                    const g = e.target.closest('[data-apri-gruppo]');
                    if (g) {
                        // niente ridisegno: si cambia solo la classe, così il gruppo si apre o si chiude scorrendo
                        const id = g.dataset.apriGruppo;
                        livelliChiusi3d[id] = !g.closest('.liv-gruppo').classList.contains('chiuso');
                        try { localStorage.setItem('dpsh.livelli3dGruppiChiusi', JSON.stringify(livelliChiusi3d)); } catch (_) { /* solo per questa volta */ }
                        g.closest('.liv-gruppo').classList.toggle('chiuso', livelliChiusi3d[id]);
                        albero.querySelector(`[data-corpo="${id}"]`).classList.toggle('chiuso', livelliChiusi3d[id]);
                        return;
                    }
                    // Spunta del gruppo: se è tutto acceso si spegne tutto, altrimenti si accende tutto.
                    const tutto = e.target.closest('[data-gruppo3d]');
                    if (tutto) {
                        dissolvenza3d();
                        const gr = righeLivelli3d().find(x => x.id === tutto.dataset.gruppo3d), accendi = gr.righe.some(r => !r.acceso);
                        gr.righe.forEach(r => accendiLivello3d(r, accendi));
                        renderVista3d();
                        return;
                    }
                    const tg = e.target.closest('[data-etichette-gruppo]');
                    if (tg) {
                        dissolvenza3d();
                        albero._cambiata = { gruppo: tg.dataset.etichetteGruppo };
                        vista3d.etichette[tg.dataset.etichetteGruppo] = !vista3d.etichette[tg.dataset.etichetteGruppo];
                        renderVista3d();
                        return;
                    }
                    const r = riga(e);
                    if (!r) return;
                    if (e.target.closest('.liv-etichette')) { dissolvenza3d(); albero._cambiata = { chiave: r.chiave, t: true }; etichetteLivello3d(r); return; }
                    if (e.target.matches('input')) { dissolvenza3d(); albero._cambiata = { chiave: r.chiave }; accendiLivello3d(r, !r.acceso); renderVista3d(); return; }
                    livelloScelto3d = r.chiave;
                    if (r.prova) scegliProvaMappa(r.prova);
                    renderLivelli3d();
                });
                albero.addEventListener('dblclick', (e) => {
                    const r = riga(e);
                    if (r && !e.target.matches('input, button') && !r.sfondo2d) inquadraLivello3d(r);
                });
                albero.addEventListener('contextmenu', (e) => {
                    const r = riga(e);
                    if (!r) return;
                    livelloScelto3d = r.chiave;
                    renderLivelli3d();
                    menuLivello3d(e, r);
                });
            })();
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
            /** Il volo della telecamera: direzione, inclinazione, punto di mira e zoom (questo in scala
             * logaritmica, così avvicinarsi e allontanarsi hanno lo stesso passo). */
            function vaiAVista3d(meta) {
                const da = { az: vista3d.az, el: vista3d.el, centro: vista3d.centro.slice(), zoom: vista3d.zoom }, a = Object.assign({}, da, meta);
                let dAz = (a.az - da.az) % (2 * Math.PI);
                if (dAz > Math.PI) dAz -= 2 * Math.PI; else if (dAz < -Math.PI) dAz += 2 * Math.PI;
                const lungo = meta.centro || meta.zoom !== undefined;
                const t0 = performance.now(), durata = movimentoRidotto3d() ? 0 : lungo ? 520 : 350;
                cancelAnimationFrame(animazione3d);
                const passo = (t) => {
                    const u = durata ? Math.min(1, (t - t0) / durata) : 1, e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
                    vista3d.az = da.az + dAz * e; vista3d.el = da.el + (a.el - da.el) * e;
                    vista3d.centro = da.centro.map((v, i) => v + (a.centro[i] - v) * e);
                    vista3d.zoom = Math.exp(Math.log(da.zoom) + (Math.log(a.zoom) - Math.log(da.zoom)) * e);
                    renderVista3d(u < 1);
                    if (u < 1) animazione3d = requestAnimationFrame(passo);
                };
                if (!durata) { passo(t0); return; }
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
            // Vicino a una linea della griglia rapida il taglio vi si aggancia (agganciaTaglioAllaGriglia3d).
            document.getElementById('rngTaglioV3d').addEventListener('input', (e) => { vista3d.taglio.pos = agganciaTaglioAllaGriglia3d(Number(e.target.value) / 100, vista3d.taglio.dir); conSolido(); ridisegna3d(); });
            document.getElementById('rngOmbre3d').addEventListener('input', (e) => {
                vista3d.ombre = Number(e.target.value) / 100;
                document.getElementById('lblOmbre3d').textContent = e.target.value + '%';
                ridisegna3d();
            });
            document.getElementById('rngLiscio3d').addEventListener('input', (e) => {
                vista3d.liscio = Number(e.target.value) / 100;
                document.getElementById('lblLiscio3d').textContent = Number(e.target.value) ? e.target.value + '%' : 'no';
                if (!vista3d.livelli.solido) accendiSolido3d();
                renderVista3d();
                renderVistaSezioneTracciata();
            });
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
            // Il DTM si carica anche da qui: poi la scena si rifà col terreno, nello stesso modo.
            document.getElementById('btnCaricaDtm3d').addEventListener('click', () => chiediFileDtm(state.currentProjectId, errore => {
                if (errore) { appAlert(errore); return; }
                apriVista3d(areaMappa.modo);
            }));
            const nomeFileProgetto3d = () => (state.projects[state.currentProjectId].name || 'progetto').replace(/[^\w\-]+/g, '_');
            // I colori del disegno scaricato: lo sfondo lo sceglie chi scarica, chiaro o scuro.
            const SFONDI_SVG_3D = { chiaro: { fondo: '#ffffff', testo: '#1f2937' }, scuro: { fondo: '#0f172a', testo: '#e5e7eb' } };
            function svgVista3dDaScaricare(sfondo) {
                const c = SFONDI_SVG_3D[sfondo] || SFONDI_SVG_3D.chiaro;
                return svgDaScena(conLegenda3d(scena3d(datiVista3dCorrenti, ultimaScena3d.W, false, true, ultimaScena3d.H), datiVista3dCorrenti)).replace(/var\(--bg-card, #fff\)/g, c.fondo).replace(/currentColor/g, c.testo).replace(/var\(--font-mono\), monospace/g, 'monospace');
            }
            document.getElementById('btnScaricaVista3d').addEventListener('click', async () => {
                if (!ultimaScena3d) return;
                const scelta = await appDialog('Il disegno lo vuoi su sfondo chiaro o scuro?', { confirm: true, title: 'Scarica la vista 3D (SVG)', icona: 'download', okLabel: 'Sfondo chiaro', extraLabel: 'Sfondo scuro', cancelLabel: 'Annulla' });
                if (scelta !== true && scelta !== 'extra') return;
                const sfondo = scelta === 'extra' ? 'scuro' : 'chiaro';
                scaricaBlobFile(new Blob([svgVista3dDaScaricare(sfondo)], { type: 'image/svg+xml' }), `Vista3D_${nomeFileProgetto3d()}${sfondo === 'scuro' ? '_scuro' : ''}.svg`);
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
