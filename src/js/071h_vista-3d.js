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

            const vista3d = { az: -0.6, el: 0.62, ex: 5, zoom: 1, trascina: null, mosso: 0,
                livelli: { terreno: true, colonne: true, pannelli: true, superfici: true, giaciture: true, nomi: true, misure: true } };

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

            // La scena: forme già proiettate sullo schermo, dalla più lontana alla più vicina (pezzi),
            // poi quelle che stanno sempre sopra (sopra), e i segmenti delle colonne per sapere quale
            // si è toccata. La disegnano sia il canvas (a schermo, veloce) sia l'SVG (il file).
            // Forme: {t:'poli', p, fill, fo, stroke, sw, dash}, {t:'linea', x1, y1, x2, y2, stroke, sw},
            // {t:'testo', x, y, s, size, bold, anchor, alone}, {t:'cerchio', x, y, r, fill}; con cls e title.
            function scena3d(d, larghezza, leggera) {
                const L = vista3d.livelli;
                const W = Math.max(320, Math.round(larghezza || 1000)), H = Math.round(Math.max(300, Math.min(620, W * 0.62)));
                const ca = Math.cos(vista3d.az), sa = Math.sin(vista3d.az), ce = Math.cos(vista3d.el), se = Math.sin(vista3d.el);
                const zRif = (d.zMin + d.zMax) / 2, ex = vista3d.ex;
                // Scala fissa (dal raggio della scena), così girando la figura non cambia grandezza.
                const profMax = Math.max(0, ...d.prove.map(p => p.fondo));
                const R = Math.hypot(d.lato / 2 * Math.SQRT2, Math.max(d.zMax - zRif, zRif - d.zMin + profMax) * ex) || 1;
                const k = Math.min(W, H) / 2.15 / R * vista3d.zoom;
                const P = (x, y, z) => {
                    const X = x * ca - y * sa, Yd = x * sa + y * ca, Z = (z - zRif) * ex;
                    return [W / 2 + X * k, H / 2 + (-Z * ce - Yd * se) * k, Yd * ce - Z * se];
                };
                const pezzi = [], sopra = [], colonne = [];
                const poli = (pp, extra) => pezzi.push({ prof: pp.reduce((s, p) => s + p[2], 0) / pp.length, t: 'poli', p: pp.map(p => [p[0], p[1]]), ...extra });
                if (L.terreno) {
                    const luce = [-0.5, 0.5, 0.7].map(v => v / Math.hypot(-0.5, 0.5, 0.7));
                    const colore = (z, lum) => {
                        const t = d.zMax > d.zMin ? (z - d.zMin) / (d.zMax - d.zMin) : 0.5;
                        const [r, g, b] = [[88, 128, 84], [214, 196, 140]].reduce((a, c) => a.map((v, i) => v + (c[i] - v) * t));
                        return `rgb(${Math.round(r * lum)},${Math.round(g * lum)},${Math.round(b * lum)})`;
                    };
                    const nodi = leggera ? d.nodiLeggeri : d.nodi;
                    for (let j = 0; j + 1 < nodi.length; j++) for (let i = 0; i + 1 < Math.min(nodi[j].length, nodi[j + 1].length); i++) {
                        const a = nodi[j][i], b = nodi[j][i + 1], c = nodi[j + 1][i + 1], e = nodi[j + 1][i];
                        if (![a, b, c, e].every(n => isFinite(n[2]))) continue;
                        const u = [c[0] - a[0], c[1] - a[1], (c[2] - a[2]) * ex], v = [e[0] - b[0], e[1] - b[1], (e[2] - b[2]) * ex];
                        let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
                        if (n[2] < 0) n = n.map(x => -x);
                        const lum = 0.55 + 0.45 * Math.max(0, (n[0] * luce[0] + n[1] * luce[1] + n[2] * luce[2]) / (Math.hypot(...n) || 1));
                        const fill = colore((a[2] + c[2]) / 2, lum);
                        poli([a, b, c, e].map(p => P(...p)), { fill, fo: 0.62, stroke: fill, sw: 0.4, cls: 'vista3d-faccia' });
                    }
                }
                const { pannelli, superfici } = modelloCorrelazione(d);
                if (L.pannelli) pannelli.forEach(pa => {
                    for (let n = 1; n < pa.pezzi.length; n++) {
                        const a = pa.pezzi[n - 1], b = pa.pezzi[n];
                        poli([P(a.x, a.y, a.tetto), P(b.x, b.y, b.tetto), P(b.x, b.y, b.letto), P(a.x, a.y, a.letto)], { fill: pa.f.colore, fo: 0.55, stroke: pa.f.colore, sw: 0.6, cls: 'vista3d-pannello', title: pa.f.nome });
                    }
                });
                if (L.superfici) superfici.forEach(sf => poli(sf.punti.map(p => P(...p)), { fill: sf.f.colore, fo: 0.35, stroke: sf.f.colore, sw: 1, dash: [5, 3], cls: 'vista3d-superficie', title: `Tetto di ${sf.f.nome}: immersione ${Math.round(sf.immersione)}°, inclinazione ${numeroConVirgola(sf.inclinazione, 1)}°` }));
                if (L.colonne) d.prove.forEach(p => {
                    const nome = nomeDpsh(p.s);
                    p.fasce.forEach(f => {
                        const a = P(p.x, p.y, p.z - f.da), b = P(p.x, p.y, p.z - f.a), prof = (a[2] + b[2]) / 2 - 0.001;
                        pezzi.push({ prof, t: 'linea', x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'rgba(0,0,0,0.55)', sw: 12, cls: 'vista3d-colonna-bordo' });
                        pezzi.push({ prof: prof - 0.0001, t: 'linea', x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: f.colore, sw: 9, cls: 'vista3d-colonna', title: `${nome}: ${f.nome}`, prova: p.s.id });
                        colonne.push({ id: p.s.id, x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
                    });
                });
                pezzi.sort((m, n) => n.prof - m.prof);
                const testo = (x, y, s, extra) => sopra.push({ t: 'testo', x, y, s, size: 11, ...extra });
                const perTriangolo = new Map(); // più tetti nello stesso triangolo: scritte una sotto l'altra
                if (L.giaciture && L.superfici) superfici.forEach(sf => {
                    const riga = perTriangolo.get(sf.t) || 0;
                    perTriangolo.set(sf.t, riga + 1);
                    const c = [0, 1, 2].map(n => (sf.punti[0][n] + sf.punti[1][n] + sf.punti[2][n]) / 3);
                    const rad = sf.immersione * Math.PI / 180, lung = Math.max(4, d.lato / 30);
                    const dx = Math.sin(rad), dy = Math.cos(rad); // verso dell'immersione (x est, y nord)
                    const [a1, a2, tk, o] = [P(c[0] - dy * lung, c[1] + dx * lung, c[2]), P(c[0] + dy * lung, c[1] - dx * lung, c[2]), P(c[0] + dx * lung * 0.6, c[1] + dy * lung * 0.6, c[2]), P(...c)];
                    sopra.push({ t: 'linea', x1: a1[0], y1: a1[1], x2: a2[0], y2: a2[1], stroke: 'currentColor', sw: 2.2, cls: 'vista3d-giacitura-segno' });
                    sopra.push({ t: 'linea', x1: o[0], y1: o[1], x2: tk[0], y2: tk[1], stroke: 'currentColor', sw: 2.2, cls: 'vista3d-giacitura-segno' });
                    testo(o[0] + 8, o[1] - 6 + riga * 14, `${String(Math.round(sf.immersione)).padStart(3, '0')}°/${numeroConVirgola(sf.inclinazione, 1)}° ${sf.f.nome}`, { alone: true, cls: 'vista3d-giacitura' });
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
                        testo(m[0], m[1], numeroConVirgola(Math.hypot(B.x - A.x, B.y - A.y), 0) + ' m', { anchor: 'middle', alone: true, cls: 'vista3d-distanza' });
                    });
                }
                if (L.nomi) d.prove.forEach(p => {
                    const [tx, ty] = P(p.x, p.y, p.z);
                    sopra.push({ t: 'cerchio', x: tx, y: ty, r: 4, fill: 'currentColor', cls: 'vista3d-testa', prova: p.s.id });
                    testo(tx, ty - 10, nomeDpsh(p.s), { size: 13, bold: true, anchor: 'middle', alone: true, cls: 'vista3d-nome', prova: p.s.id });
                    colonne.push({ id: p.s.id, x1: tx, y1: ty - 22, x2: tx, y2: ty });
                });
                // Il nord, in basso a destra.
                const [ox, oy] = P(0, 0, zRif), [nx, ny] = P(0, 1, zRif);
                const lung = Math.hypot(nx - ox, ny - oy) || 1, ax = (nx - ox) / lung, ay = (ny - oy) / lung;
                sopra.push({ t: 'cerchio', x: W - 50, y: H - 50, r: 24, fill: 'none', stroke: 'currentColor', so: 0.3, cls: 'vista3d-nord' });
                sopra.push({ t: 'linea', x1: W - 50 - ax * 16, y1: H - 50 - ay * 16, x2: W - 50 + ax * 16, y2: H - 50 + ay * 16, stroke: 'currentColor', sw: 2, cls: 'vista3d-nord' });
                testo(W - 50 + ax * 34, H - 50 + ay * 34 + 4, 'N', { size: 13, bold: true, anchor: 'middle', cls: 'vista3d-nord' });
                const quote = d.senzaDtm ? 'senza DTM: prove tutte dal piano campagna (quota 0)' : `quote da ${numeroConVirgola(d.zMin, 1)} a ${numeroConVirgola(d.zMax, 1)} m s.l.m.`, esagTesto = `esagerazione verticale ×${ex}${L.giaciture && L.superfici && superfici.length ? ' · giaciture reali' : ''}`;
                if (W < 700) { testo(16, H - 30, quote, { size: 12, cls: 'vista3d-didascalia' }); testo(16, H - 14, esagTesto, { size: 12, cls: 'vista3d-didascalia' }); }
                else testo(16, H - 14, quote + ' · ' + esagTesto, { size: 12, cls: 'vista3d-didascalia' });
                return { W, H, pezzi, sopra, colonne, tutte: pezzi.concat(sopra) };
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
                    if (f.t === 'poli') {
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
                document.querySelectorAll('#livelliVista3d [data-livello]').forEach(b => b.setAttribute('aria-pressed', String(vista3d.livelli[b.dataset.livello])));
                if (!datiVista3dCorrenti) {
                    ultimaScena3d = null;
                    box.innerHTML = '<div class="palette-vuota">Per la vista 3D serve almeno una prova col GPS e con le letture.</div>';
                    return;
                }
                let canvas = box.querySelector('canvas');
                if (!canvas) { box.innerHTML = '<canvas aria-label="Vista 3D del terreno e delle prove" role="img"></canvas>'; canvas = box.querySelector('canvas'); }
                ultimaScena3d = scena3d(datiVista3dCorrenti, box.clientWidth, leggera);
                disegnaScena(canvas, ultimaScena3d);
                document.getElementById('lblEsag3d').textContent = '×' + vista3d.ex;
            }

            function apriVista3d() {
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
                    vista3d.zoom = 1.4; // le prove grandi, il terreno ai bordi si può tagliare
                    document.getElementById('rngEsag3d').value = vista3d.ex;
                }
                document.getElementById('modalVista3dOverlay').classList.add('open');
                document.getElementById('modalVista3d').classList.add('open');
                renderVista3d();
            }

            const box3d = document.getElementById('graficoVista3d');
            let attesaDisegno3d = false;
            // Mentre si gira: versione leggera a ogni fotogramma; lasciato, la figura intera.
            function ridisegna3d() {
                if (attesaDisegno3d) return;
                attesaDisegno3d = true;
                requestAnimationFrame(() => { attesaDisegno3d = false; renderVista3d(!!(vista3d.trascina || vista3d.pizzico)); });
            }
            // Un dito o il mouse girano; due dita avvicinano e allontanano.
            const dita3d = new Map();
            const distanzaDita = () => { const [a, b] = [...dita3d.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
            box3d.addEventListener('pointerdown', (e) => {
                dita3d.set(e.pointerId, { x: e.clientX, y: e.clientY });
                vista3d.trascina = dita3d.size === 1 ? { x: e.clientX, y: e.clientY } : null;
                vista3d.pizzico = dita3d.size === 2 ? distanzaDita() : null;
                vista3d.mosso = 0;
                if (box3d.setPointerCapture) box3d.setPointerCapture(e.pointerId);
            });
            box3d.addEventListener('pointermove', (e) => {
                if (dita3d.has(e.pointerId)) dita3d.set(e.pointerId, { x: e.clientX, y: e.clientY });
                if (vista3d.pizzico && dita3d.size === 2) {
                    const d = distanzaDita();
                    zoom3d(d / vista3d.pizzico);
                    vista3d.pizzico = d;
                    vista3d.mosso += 10;
                    return;
                }
                if (!vista3d.trascina) return;
                const dx = e.clientX - vista3d.trascina.x, dy = e.clientY - vista3d.trascina.y;
                vista3d.mosso += Math.abs(dx) + Math.abs(dy);
                vista3d.az += dx * 0.008;
                vista3d.el = Math.max(0.12, Math.min(1.5, vista3d.el + dy * 0.006));
                vista3d.trascina = { x: e.clientX, y: e.clientY };
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
                const id = provaNelPunto(ultimaScena3d, ...puntoCanvas(e));
                if (id) apriFumettoProva(id, e.clientX, e.clientY);
                else chiudiFumetti(false);
            });
            // Col mouse sopra una colonna, la manina.
            box3d.addEventListener('pointermove', (e) => {
                if (vista3d.trascina || !ultimaScena3d) return;
                const c = box3d.querySelector('canvas');
                if (c) c.style.cursor = provaNelPunto(ultimaScena3d, ...puntoCanvas(e)) ? 'pointer' : 'grab';
            });
            box3d.addEventListener('keydown', (e) => {
                if (e.key === '+' || e.key === '-') { e.preventDefault(); return zoom3d(e.key === '+' ? 1.25 : 0.8); }
                const mosse = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, 0.1], ArrowDown: [0, -0.1] }[e.key];
                if (!mosse) return;
                e.preventDefault();
                vista3d.az += mosse[0];
                vista3d.el = Math.max(0.12, Math.min(1.5, vista3d.el + mosse[1]));
                renderVista3d();
            });
            function zoom3d(f) { vista3d.zoom = Math.max(0.5, Math.min(8, vista3d.zoom * f)); ridisegna3d(); }
            box3d.addEventListener('wheel', (e) => { e.preventDefault(); zoom3d(Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
            document.getElementById('rngEsag3d').addEventListener('input', (e) => { vista3d.ex = Number(e.target.value); ridisegna3d(); });
            document.getElementById('livelliVista3d').addEventListener('click', (e) => {
                const b = e.target.closest('[data-livello]');
                if (!b) return;
                vista3d.livelli[b.dataset.livello] = !vista3d.livelli[b.dataset.livello];
                renderVista3d();
            });
            document.getElementById('btnApriVista3d').addEventListener('click', apriVista3d);
            document.getElementById('btnChiudiVista3d').addEventListener('click', closeAnyOpenModal);
            const nomeFileProgetto3d = () => (state.projects[state.currentProjectId].name || 'progetto').replace(/[^\w\-]+/g, '_');
            document.getElementById('btnScaricaVista3d').addEventListener('click', () => {
                if (!ultimaScena3d) return;
                const testo = svgDaScena(scena3d(datiVista3dCorrenti, ultimaScena3d.W)).replace(/var\(--bg-card, #fff\)/g, '#ffffff').replace(/currentColor/g, '#1f2937').replace(/var\(--font-mono\), monospace/g, 'monospace');
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
