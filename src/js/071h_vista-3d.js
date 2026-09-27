            // VISTA 3D: il terreno del DTM come superficie ombreggiata (colori per quota, luce da
            // nord-ovest) e le colonne stratigrafiche delle prove piantate alla loro quota. SVG puro:
            // la superficie è una griglia di al più 56 × 56 quadrilateri disegnati dal più lontano al
            // più vicino; il terreno è un po' trasparente così le colonne si vedono anche sotto.
            // Si gira trascinando (o con le frecce), l'esagerazione verticale si sceglie.

            const vista3d = { az: -0.6, el: 0.62, ex: 5, zoom: 1, trascina: null };

            // Coordinate locali in metri, attorno al centro delle prove.
            function datiVista3d(proj) {
                const dtm = proj.dtm, q = quoteDtm(dtm);
                const geo = dtm.crs.tipo === 'geo';
                const prove = proveConCoordinate(proj).filter(s => (s.logs || []).length > 0).map(s => {
                    const p = puntoNelCrs(dtm.crs, parseFloat(s.header.lat), parseFloat(s.header.lng));
                    return { s, x: p.x, y: p.y, z: quotaDellaProva(proj, s.header) };
                }).filter(p => p.z !== null);
                const cx = prove.length ? prove.reduce((a, p) => a + p.x, 0) / prove.length : dtm.x0 + dtm.nx * dtm.dx / 2;
                const cy = prove.length ? prove.reduce((a, p) => a + p.y, 0) / prove.length : dtm.y0 - dtm.ny * dtm.dy / 2;
                const kx = geo ? 111320 * Math.cos(cy * Math.PI / 180) : 1, ky = geo ? 110540 : 1;
                const locale = (x, y) => [(x - cx) * kx, (y - cy) * ky];
                const provePos = prove.map(p => { const [x, y] = locale(p.x, p.y); return { ...p, x, y, fasce: colonnaStratigrafica(p.s.logs, proj.strati) }; });
                // La scena sta attorno alle prove (con un margine), non su tutto il ritaglio: le
                // colonne sono profonde pochi metri e altrimenti sparirebbero.
                const spread = Math.max(10, ...provePos.map(p => Math.hypot(p.x, p.y)));
                const raggio = provePos.length ? spread + Math.max(30, 0.6 * spread) : Infinity;
                const cella = Math.min(dtm.dx * kx, dtm.dy * ky);
                const g = Math.max(1, Math.ceil(Math.min(Math.max(dtm.nx, dtm.ny), 2 * raggio / cella) / 56));
                const nodi = [], zs = [];
                for (let j = 0; j < dtm.ny; j += g) {
                    const riga = [];
                    for (let i = 0; i < dtm.nx; i += g) {
                        const [x, y] = locale(dtm.x0 + (i + 0.5) * dtm.dx, dtm.y0 - (j + 0.5) * dtm.dy);
                        if (Math.abs(x) > raggio || Math.abs(y) > raggio) continue;
                        const z = q[j * dtm.nx + i];
                        riga.push([x, y, z]);
                        if (isFinite(z)) zs.push(z);
                    }
                    if (riga.length) nodi.push(riga);
                }
                return {
                    nodi, zMin: Math.min(...zs), zMax: Math.max(...zs), prove: provePos,
                    lato: isFinite(raggio) ? 2 * raggio : Math.max(dtm.nx * dtm.dx * kx, dtm.ny * dtm.dy * ky)
                };
            }

            function svgVista3d(d, larghezza) {
                const W = Math.max(320, Math.round(larghezza || 1000)), H = Math.round(Math.max(300, Math.min(600, W * 0.62)));
                const ca = Math.cos(vista3d.az), sa = Math.sin(vista3d.az), ce = Math.cos(vista3d.el), se = Math.sin(vista3d.el);
                const zRif = (d.zMin + d.zMax) / 2, ex = vista3d.ex;
                // Scala fissa (dal raggio della scena), così girando la figura non cambia grandezza.
                const profMax = Math.max(0, ...d.prove.map(p => Math.max(0, ...p.fasce.map(f => f.a))));
                const R = Math.hypot(d.lato / 2 * Math.SQRT2, Math.max(d.zMax - zRif, zRif - d.zMin + profMax) * ex) || 1;
                const k = Math.min(W, H) / 2.15 / R * vista3d.zoom;
                const P = (x, y, z) => {
                    const X = x * ca - y * sa, Yd = x * sa + y * ca, Z = (z - zRif) * ex;
                    return [W / 2 + X * k, H / 2 + (-Z * ce - Yd * se) * k, Yd * ce - Z * se];
                };
                const luce = [-0.5, 0.5, 0.7].map(v => v / Math.hypot(-0.5, 0.5, 0.7));
                const colore = (z, lum) => {
                    const t = d.zMax > d.zMin ? (z - d.zMin) / (d.zMax - d.zMin) : 0.5;
                    const [r, g, b] = [[88, 128, 84], [214, 196, 140]].reduce((a, c) => a.map((v, i) => v + (c[i] - v) * t));
                    return `rgb(${Math.round(r * lum)},${Math.round(g * lum)},${Math.round(b * lum)})`;
                };
                const quad = [];
                for (let j = 0; j + 1 < d.nodi.length; j++) for (let i = 0; i + 1 < d.nodi[j].length; i++) {
                    const a = d.nodi[j][i], b = d.nodi[j][i + 1], c = d.nodi[j + 1][i + 1], e = d.nodi[j + 1][i];
                    if (![a, b, c, e].every(n => isFinite(n[2]))) continue;
                    // Normale dalle diagonali (con l'esagerazione), per l'ombreggiatura.
                    const u = [c[0] - a[0], c[1] - a[1], (c[2] - a[2]) * ex], v = [e[0] - b[0], e[1] - b[1], (e[2] - b[2]) * ex];
                    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
                    if (n[2] < 0) n = n.map(x => -x);
                    const ln = Math.hypot(...n) || 1;
                    const lum = 0.55 + 0.45 * Math.max(0, (n[0] * luce[0] + n[1] * luce[1] + n[2] * luce[2]) / ln);
                    const pp = [a, b, c, e].map(p => P(...p));
                    quad.push({ prof: pp.reduce((s, p) => s + p[2], 0) / 4, punti: pp.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '), fill: colore((a[2] + c[2]) / 2, lum) });
                }
                quad.sort((m, n) => n.prof - m.prof);
                let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vista 3D del terreno e delle prove" style="display: block; font-family: var(--font-mono), monospace; touch-action: none; cursor: grab;">`;
                s += `<rect width="${W}" height="${H}" fill="var(--bg-card, #fff)"/>`;
                // Le colonne sotto il terreno, che è semitrasparente: si leggono come dentro il suolo.
                // Poi, sopra, la testa della prova e il suo nome.
                const ordinate = d.prove.map(p => ({ p, prof: P(p.x, p.y, p.z)[2] })).sort((m, n) => n.prof - m.prof).map(o => o.p);
                ordinate.forEach(p => {
                    const nr = escapeHtmlDidascalia(String(p.s.header.provaNr || '?'));
                    p.fasce.forEach(f => {
                        const [x1, y1] = P(p.x, p.y, p.z - f.da), [x2, y2] = P(p.x, p.y, p.z - f.a);
                        s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(0,0,0,0.55)" stroke-width="12"/><line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${f.colore}" stroke-width="9"><title>Prova ${nr}: ${escapeHtmlDidascalia(f.nome)}</title></line>`;
                    });
                });
                s += '<g class="vista3d-terreno" fill-opacity="0.62">' + quad.map(q => `<polygon points="${q.punti}" fill="${q.fill}" stroke="${q.fill}" stroke-width="0.4"/>`).join('') + '</g>';
                ordinate.forEach(p => {
                    const [tx, ty] = P(p.x, p.y, p.z);
                    s += `<g class="vista3d-prova"><circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="4" fill="currentColor"/><text x="${tx.toFixed(1)}" y="${(ty - 10).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" paint-order="stroke" stroke="var(--bg-card, #fff)" stroke-width="3">P${escapeHtmlDidascalia(String(p.s.header.provaNr || '?'))}</text></g>`;
                });
                // Il nord, in basso a destra.
                const [ox, oy] = P(0, 0, zRif), [nx, ny] = P(0, 1, zRif);
                const lung = Math.hypot(nx - ox, ny - oy) || 1, ax = (nx - ox) / lung, ay = (ny - oy) / lung;
                s += `<g class="vista3d-nord" transform="translate(${W - 50} ${H - 50})"><circle r="24" fill="none" stroke="currentColor" stroke-opacity="0.3"/><line x1="${(-ax * 16).toFixed(1)}" y1="${(-ay * 16).toFixed(1)}" x2="${(ax * 16).toFixed(1)}" y2="${(ay * 16).toFixed(1)}" stroke="currentColor" stroke-width="2"/><text x="${(ax * 34).toFixed(1)}" y="${(ay * 34 + 4).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">N</text></g>`;
                const quote = `quote da ${numeroConVirgola(d.zMin, 1)} a ${numeroConVirgola(d.zMax, 1)} m s.l.m.`, esagTesto = `esagerazione verticale ×${ex}`;
                s += W < 700 // sul telefono su due righe, a sinistra della bussola
                    ? `<text x="16" y="${H - 30}" font-size="12" fill="currentColor">${quote}</text><text x="16" y="${H - 14}" font-size="12" fill="currentColor">${esagTesto}</text>`
                    : `<text x="16" y="${H - 14}" font-size="12" fill="currentColor">${quote} · ${esagTesto}</text>`;
                return s + '</svg>';
            }

            let datiVista3dCorrenti = null;
            function renderVista3d() {
                const box = document.getElementById('graficoVista3d');
                if (!datiVista3dCorrenti) {
                    box.innerHTML = '<div class="palette-vuota">Per la vista 3D serve un DTM: caricalo in «Terreno e sezioni».</div>';
                    return;
                }
                box.innerHTML = svgVista3d(datiVista3dCorrenti, box.clientWidth);
                document.getElementById('lblEsag3d').textContent = '×' + vista3d.ex;
            }

            function apriVista3d() {
                saveState();
                closeAnyOpenModal();
                const proj = state.projects[state.currentProjectId];
                datiVista3dCorrenti = proj.dtm ? datiVista3d(proj) : null;
                if (datiVista3dCorrenti) {
                    // Esagerazione di partenza: quanto basta perché si vedano il rilievo (un ottavo del
                    // lato) e le colonne (un sesto), entro ×30. È scritta nella figura e si cambia.
                    const d = datiVista3dCorrenti, rilievo = Math.max(0.5, d.zMax - d.zMin);
                    const profMax = Math.max(1, ...d.prove.map(p => Math.max(0, ...p.fasce.map(f => f.a))));
                    vista3d.ex = Math.max(1, Math.min(30, Math.round(Math.max(d.lato / 8 / rilievo, d.lato / 6 / profMax))));
                    vista3d.zoom = 1;
                    document.getElementById('rngEsag3d').value = vista3d.ex;
                }
                renderVista3d();
                document.getElementById('modalVista3dOverlay').classList.add('open');
                document.getElementById('modalVista3d').classList.add('open');
            }

            const box3d = document.getElementById('graficoVista3d');
            let attesaDisegno3d = false;
            function ridisegna3d() {
                if (attesaDisegno3d) return;
                attesaDisegno3d = true;
                requestAnimationFrame(() => { attesaDisegno3d = false; renderVista3d(); });
            }
            // Un dito o il mouse girano; due dita avvicinano e allontanano.
            const dita3d = new Map();
            const distanzaDita = () => { const [a, b] = [...dita3d.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
            box3d.addEventListener('pointerdown', (e) => {
                dita3d.set(e.pointerId, { x: e.clientX, y: e.clientY });
                vista3d.trascina = dita3d.size === 1 ? { x: e.clientX, y: e.clientY } : null;
                vista3d.pizzico = dita3d.size === 2 ? distanzaDita() : null;
                if (box3d.setPointerCapture) box3d.setPointerCapture(e.pointerId);
            });
            box3d.addEventListener('pointermove', (e) => {
                if (dita3d.has(e.pointerId)) dita3d.set(e.pointerId, { x: e.clientX, y: e.clientY });
                if (vista3d.pizzico && dita3d.size === 2) {
                    const d = distanzaDita();
                    zoom3d(d / vista3d.pizzico);
                    vista3d.pizzico = d;
                    return;
                }
                if (!vista3d.trascina) return;
                vista3d.az += (e.clientX - vista3d.trascina.x) * 0.008;
                vista3d.el = Math.max(0.12, Math.min(1.5, vista3d.el + (e.clientY - vista3d.trascina.y) * 0.006));
                vista3d.trascina = { x: e.clientX, y: e.clientY };
                ridisegna3d();
            });
            ['pointerup', 'pointercancel'].forEach(t => box3d.addEventListener(t, (e) => { dita3d.delete(e.pointerId); vista3d.trascina = null; vista3d.pizzico = null; }));
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
            document.getElementById('btnApriVista3d').addEventListener('click', apriVista3d);
            document.getElementById('btnChiudiVista3d').addEventListener('click', closeAnyOpenModal);
            document.getElementById('btnScaricaVista3d').addEventListener('click', () => {
                const svg = document.querySelector('#graficoVista3d svg');
                if (!svg) return;
                const testo = svg.outerHTML.replace(/var\(--bg-card, #fff\)/g, '#ffffff').replace(/currentColor/g, '#1f2937').replace(/var\(--font-mono\), monospace/g, 'monospace');
                const nome = (state.projects[state.currentProjectId].name || 'progetto').replace(/[^\w\-]+/g, '_');
                scaricaBlobFile(new Blob([testo], { type: 'image/svg+xml' }), `Vista3D_${nome}.svg`);
            });
