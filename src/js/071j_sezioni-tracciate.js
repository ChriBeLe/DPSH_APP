            // ===================== SEZIONI TRACCIATE (vista 3D, scheda «Sezioni») =====================
            // Linee disegnate sulla figura (due clic) o a griglia, con un nome (A-A', B-B', 1-1'…),
            // salvate nel progetto in gradi (proj.sezioniTracciate: { id, nome, a: {lat, lng}, b }).
            // Ogni traccia dà una sezione: profilo del terreno (DTM), strati del modello solido
            // (interpolati tra le prove), prove vicine alla linea proiettate. Si esportano in PDF
            // (sezione + vista dal satellite con la traccia) e in GeoPackage (071k).

            const sezioniTracciateStato = { fascia: 25, vista: null };

            function tracceDelProgetto() {
                const proj = state.projects[state.currentProjectId];
                return (proj && proj.sezioniTracciate) || [];
            }
            /** «A-A'» → ["A", "A'"]; un nome senza trattino fa da sé col suo apice. */
            function estremiTraccia(nome) {
                const m = /^(.+?)\s*[-–]\s*(.+)$/.exec(String(nome || '').trim());
                return m ? [m[1], m[2]] : [nome || '?', (nome || '?') + "'"];
            }
            /** Il primo nome libero: lettere (A, B, … Z, AA…) o numeri (1, 2, …). */
            function prossimoNomeTraccia(numeri, usati, senzaGriglia) {
                // senzaGriglia: la griglia rapida che sta per essere sostituita non occupa nomi.
                const presi = new Set([...tracceDelProgetto().filter(t => !(senzaGriglia && t.griglia)), ...(usati || [])].map(t => estremiTraccia(t.nome)[0]));
                for (let i = 0; ; i++) {
                    const s = numeri ? String(i + 1) : (i < 26 ? '' : String.fromCharCode(65 + Math.floor(i / 26) - 1)) + String.fromCharCode(65 + i % 26);
                    if (!presi.has(s)) return `${s}-${s}'`;
                }
            }
            /** Gli estremi di una traccia nelle coordinate della scena (metri dal centro). */
            function tracciaInScena(d, t) {
                const a = d.daGeo(t.a.lat, t.a.lng), b = d.daGeo(t.b.lat, t.b.lng);
                return { a, b, L: Math.hypot(b[0] - a[0], b[1] - a[1]) };
            }

            /** Le tracce nella figura 3D: una linea rossa sul terreno, i nomi agli estremi. */
            function tracceNellaScena3d(d, P, sopra, testo) {
                const tracce = vista3d.livelli.sezioni ? tracceDelProgetto().filter(t => !vista3d.tracceNascoste.has(t.id)).map(t => ({ t, ...tracciaInScena(d, t) })) : [];
                const dis = vista3d.disegno;
                if (dis && dis.a && dis.cursore) tracce.push({ t: null, a: dis.a, b: dis.cursore });
                const zMedia = (d.zMin + d.zMax) / 2;
                tracce.forEach(({ t, a, b }) => {
                    const st = t ? stileLivello('t:' + t.id) : null, pt = [];
                    for (let i = 0; i <= 24; i++) {
                        const x = a[0] + (b[0] - a[0]) * i / 24, y = a[1] + (b[1] - a[1]) * i / 24, z = d.zSuolo(x, y);
                        pt.push(P(x, y, Number.isFinite(z) ? z : zMedia));
                    }
                    for (let i = 1; i < pt.length; i++) sopra.push({ t: 'linea', x1: pt[i - 1][0], y1: pt[i - 1][1], x2: pt[i][0], y2: pt[i][1], stroke: st ? st.colore : '#dc2626', sw: st ? st.spessore * 0.65 : 1.6, dash: st ? trattoDash(st.tratto, 0.6) : null, cls: 'vista3d-traccia', traccia: t && t.id });
                    if (!t || !vista3d.etichette.sezioni) return;
                    const [e1, e2] = estremiTraccia(t.nome);
                    const box = st.etichetta === 'testo' ? null : st.etichetta;
                    testo(pt[0][0], pt[0][1] - 8, e1, { size: 14, bold: true, anchor: 'middle', alone: true, box, cls: 'vista3d-traccia-nome', traccia: t.id });
                    testo(pt[24][0], pt[24][1] - 8, e2, { size: 14, bold: true, anchor: 'middle', alone: true, box, cls: 'vista3d-traccia-nome', traccia: t.id });
                });
                misuraNellaScena3d(d, P, sopra, testo);
            }

            /** Il punto del piano della scena sotto il cursore (vista senza prospettiva). */
            function puntoAlSuolo3d(sx, sy) {
                const sc = ultimaScena3d, se = Math.sin(vista3d.el);
                if (!sc || Math.abs(se) < 0.05) return null;
                const ca = Math.cos(vista3d.az), sa = Math.sin(vista3d.az);
                const X = (sx - sc.W / 2) / sc.k, Yd = -(sy - sc.H / 2) / (sc.k * se);
                return [vista3d.centro[0] + X * ca + Yd * sa, vista3d.centro[1] - X * sa + Yd * ca];
            }
            /** Un clic mentre si traccia: il primo fissa l'inizio, il secondo la fine e salva. */
            function clicTracciaSezione3d(e) {
                const p = puntoAlSuolo3d(...puntoCanvas(e)), dis = vista3d.disegno;
                if (!p) return;
                if (!dis.a) { dis.a = p; dis.cursore = p; ridisegna3d(); return; }
                if (Math.hypot(p[0] - dis.a[0], p[1] - dis.a[1]) < 1) return;
                const d = datiVista3dCorrenti, proj = state.projects[state.currentProjectId];
                const ga = d.geo(...dis.a), gb = d.geo(...p);
                proj.sezioniTracciate = tracceDelProgetto().concat({ id: 'sez_' + Date.now().toString(36), nome: prossimoNomeTraccia(false), a: ga, b: gb });
                vista3d.disegno = null;
                saveState();
                scegliStrumentoMappa('sel');
                infoAreaMappa();
                renderVista3d();
            }
            function seguiTracciaSezione3d(e) {
                const dis = vista3d.disegno;
                if (!dis || !dis.a) return;
                dis.cursore = puntoAlSuolo3d(...puntoCanvas(e)) || dis.cursore;
                ridisegna3d();
            }

            /** LA GRIGLIA: «numero» tracce parallele nella direzione scelta (gradi dal Nord), a «passo»
             * metri, centrate sulle prove e lunghe quanto basta a coprirle; a richiesta anche quelle di
             * traverso. Le prime si chiamano con le lettere, quelle di traverso coi numeri. */
            function creaGrigliaSezioni3d(direzione, passo, numero, incrociata) {
                const d = datiVista3dCorrenti, proj = state.projects[state.currentProjectId];
                if (!d || !d.prove.length) return;
                const nuove = [];
                const serie = (gradi, numeri) => {
                    const r = gradi * Math.PI / 180, u = [Math.sin(r), Math.cos(r)], v = [Math.cos(r), -Math.sin(r)];
                    const lungo = d.prove.map(p => p.x * u[0] + p.y * u[1]);
                    const margine = Math.max(20, 0.15 * (Math.max(...lungo) - Math.min(...lungo)));
                    const da = Math.min(...lungo) - margine, a = Math.max(...lungo) + margine;
                    for (let i = 0; i < numero; i++) {
                        const o = (i - (numero - 1) / 2) * passo;
                        const pa = [v[0] * o + u[0] * da, v[1] * o + u[1] * da], pb = [v[0] * o + u[0] * a, v[1] * o + u[1] * a];
                        nuove.push({ id: 'sez_' + Date.now().toString(36) + '_' + nuove.length, nome: prossimoNomeTraccia(numeri, nuove), a: d.geo(...pa), b: d.geo(...pb) });
                    }
                };
                serie(direzione, false);
                if (incrociata) serie(direzione + 90, true);
                proj.sezioniTracciate = tracceDelProgetto().concat(nuove);
                saveState();
                renderVista3d();
                renderElencoSezioni3d();
            }

            /** Il contorno del modello su cui si appoggiano griglia e taglio: quello del corpo solido
             * (lo stesso che usa il cursore del taglio), altrimenti l'involucro delle prove. */
            function contornoPerGriglia3d(d) {
                const so = modelloSolido(d);
                if (so) return involucroModello(so);
                const pt = d.prove.map(p => [p.x, p.y]);
                const xs = pt.map(p => p[0]), ys = pt.map(p => p[1]), m = 10;
                // Una o due prove: un rettangolo attorno, abbastanza largo da tracciarci dentro.
                return [[Math.min(...xs) - m, Math.min(...ys) - m], [Math.max(...xs) + m, Math.min(...ys) - m], [Math.max(...xs) + m, Math.max(...ys) + m], [Math.min(...xs) - m, Math.max(...ys) + m]];
            }
            /** LA GRIGLIA RAPIDA: «nNS» linee Nord–Sud e «nEO» Est–Ovest, a distanze uguali sul modello
             * (alle frazioni k/(n+1) della sua estensione), da bordo a bordo. La frazione è la stessa
             * scala del cursore del taglio laterale (pos), quindi ogni linea si può far coincidere col
             * taglio («Taglia qui», e il cursore vi si aggancia). Sostituisce la griglia rapida di prima;
             * le tracce disegnate a mano e quelle della griglia con direzione restano. */
            function creaGrigliaAssi3d(nNS, nEO) {
                const d = datiVista3dCorrenti, proj = state.projects[state.currentProjectId];
                if (!d || !d.prove.length) return;
                const contorno = contornoPerGriglia3d(d), nuove = [];
                const serie = (asse, n, numeri) => {
                    const ax = asse === 'ns' ? 0 : 1, altro = 1 - ax;
                    const valori = contorno.map(p => p[ax]), lo = Math.min(...valori), hi = Math.max(...valori);
                    for (let k = 1; k <= n; k++) {
                        const pos = k / (n + 1), c = lo + (hi - lo) * pos, incroci = [];
                        contorno.forEach((p, i) => {
                            const q = contorno[(i + 1) % contorno.length], u = p[ax] - c, v = q[ax] - c;
                            if ((u <= 0 && v > 0) || (u > 0 && v <= 0)) incroci.push(p[altro] + (q[altro] - p[altro]) * u / (u - v));
                        });
                        if (incroci.length < 2) continue;
                        const punto = w => ax === 0 ? [c, w] : [w, c];
                        nuove.push({ id: 'sez_' + Date.now().toString(36) + '_' + nuove.length, nome: prossimoNomeTraccia(numeri, nuove, true),
                            a: d.geo(...punto(Math.min(...incroci))), b: d.geo(...punto(Math.max(...incroci))), griglia: true, asse, pos });
                    }
                };
                serie('ns', Math.max(0, nNS | 0), false);
                serie('eo', Math.max(0, nEO | 0), true);
                if (sezioniTracciateStato.vista && !tracceDelProgetto().some(t => t.id === sezioniTracciateStato.vista && !t.griglia)) sezioniTracciateStato.vista = null;
                proj.sezioniTracciate = tracceDelProgetto().filter(t => !t.griglia).concat(nuove);
                saveState();
                renderVista3d();
                renderElencoSezioni3d();
            }
            /** «Taglia qui»: il taglio laterale del corpo solido esattamente sulla linea della griglia. */
            function tagliaSullaTraccia3d(t) {
                if (!t || !t.asse) return;
                if (!vista3d.livelli.solido) accendiSolido3d();
                vista3d.taglio.dir = t.asse;
                vista3d.taglio.pos = t.pos;
                const rng = document.getElementById('rngTaglioV3d');
                if (rng) rng.value = Math.round(t.pos * 100);
                renderVista3d();
                mostraToast(`Taglio sulla sezione ${t.nome}`);
            }
            /** Il cursore del taglio si aggancia alla linea della griglia vicina (entro il 2,5%). */
            function agganciaTaglioAllaGriglia3d(pos, dir) {
                const vicina = tracceDelProgetto().filter(t => t.griglia && t.asse === dir).find(t => Math.abs(t.pos - pos) < 0.025);
                return vicina ? vicina.pos : pos;
            }

            /** IL TAGLIO VERTICALE DEL CORPO SOLIDO COME TRACCIA: la retta del taglio, da un lato all'altro
             * del perimetro delle prove (Nord–Sud: A a sud; Est–Ovest: A a ovest). */
            function tracciaDalTaglio3d() {
                const d = datiVista3dCorrenti, so = d && modelloSolido(d), tg = vista3d.taglio;
                if (!so || !tg.dir || tg.c === undefined) return null;
                const ax = tg.ax, altro = 1 - ax, inv = involucroModello(so), incroci = [];
                inv.forEach((p, i) => {
                    const q = inv[(i + 1) % inv.length], u = p[ax] - tg.c, v = q[ax] - tg.c;
                    if ((u <= 0 && v > 0) || (u > 0 && v <= 0)) incroci.push(p[altro] + (q[altro] - p[altro]) * u / (u - v));
                });
                if (incroci.length < 2) return null;
                const punto = v => ax === 0 ? [tg.c, v] : [v, tg.c];
                const proj = state.projects[state.currentProjectId];
                const t = { id: 'sez_' + Date.now().toString(36), nome: prossimoNomeTraccia(false), a: d.geo(...punto(Math.min(...incroci))), b: d.geo(...punto(Math.max(...incroci))) };
                proj.sezioniTracciate = tracceDelProgetto().concat(t);
                saveState();
                infoAreaMappa();
                renderVista3d();
                renderElencoSezioni3d();
                mostraToast(`Sezione ${t.nome} salvata lungo il taglio: è nell'elenco delle sezioni.`);
                return t;
            }
            document.getElementById('btnTaglioTraccia3d').addEventListener('click', tracciaDalTaglio3d);

            /** I DATI DELLA SEZIONE lungo una traccia: campioni del terreno e del modello solido, e le
             * prove entro «fascia» metri dalla linea, con la loro distanza lungo e di lato. */
            function datiSezioneTracciata(d, t, fascia) {
                const { a, b, L } = tracciaInScena(d, t);
                const ux = (b[0] - a[0]) / (L || 1), uy = (b[1] - a[1]) / (L || 1);
                const so = modelloSolido(d);
                // Dentro l'involucro delle prove (antiorario): tutti i lati lasciano il punto a sinistra,
                // con un centimetro di tolleranza (una traccia da prova a prova corre sul bordo).
                const contorno = so && involucroModello(so);
                const dentro = (x, y) => so && contorno.every((p, i) => {
                    const q = contorno[(i + 1) % contorno.length];
                    return ((q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0])) / (Math.hypot(q[0] - p[0], q[1] - p[1]) || 1) >= -0.01;
                });
                const N = 160, campioni = [];
                for (let i = 0; i <= N; i++) {
                    const s = L * i / N, x = a[0] + ux * s, y = a[1] + uy * s;
                    const col = dentro(x, y) ? colonnaSolido(d, so, x, y) : null;
                    const zT = d.zSuolo(x, y);
                    campioni.push({ s, z: col ? col.z : (Number.isFinite(zT) ? zT : null), col });
                }
                const vicine = d.prove.map(p => ({ p, s: (p.x - a[0]) * ux + (p.y - a[1]) * uy, lato: Math.abs(-(p.x - a[0]) * uy + (p.y - a[1]) * ux) }))
                    .filter(q => q.lato <= fascia && q.s >= -fascia && q.s <= L + fascia)
                    .sort((m, n) => m.s - n.s);
                // Quelle che si disegnano: le vicine, tolte quelle che si sono escluse a mano.
                const prove = vicine.filter(q => !(t.escluse || []).includes(q.p.s.id));
                return { t, L, campioni, vicine, prove, so, azimut: ((Math.atan2(ux, uy) * 180 / Math.PI) + 360) % 360, senzaDtm: !!d.senzaDtm };
            }

            /** LA SEZIONE IN SVG: strati del modello (dove la traccia attraversa le prove), profilo del
             * terreno, prove vicine con il loro nome e la distanza dalla linea, assi in metri, A e A'. */
            function svgSezioneTracciata(ds, larghezza) {
                const W = Math.max(480, Math.round(larghezza || 900)), sx0 = 58, dx0 = 22, top = 40;
                const pw = W - sx0 - dx0;
                const fondoProve = Math.max(0, ...ds.prove.map(q => q.p.fondo));
                const fondo = Math.max(ds.so ? ds.so.fondo : 0, fondoProve, 1);
                const zs = ds.campioni.map(c => c.z).filter(z => z !== null).concat(ds.prove.map(q => q.p.z));
                if (!zs.length) zs.push(0);
                const zTop = Math.max(...zs), zBot = Math.min(...zs) - fondo, zr = Math.max(1, zTop - zBot);
                const sx = pw / Math.max(1, ds.L);
                const ex = Math.max(1, Math.min(50, Math.round(pw * 0.4 / (zr * sx))));
                const ph = zr * sx * ex;
                const X = s => sx0 + s * sx, Y = z => top + (zTop - z) * sx * ex;
                const n = v => v.toFixed(1), esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
                let corpo = '';
                // Gli strati, per tratti continui dentro l'involucro.
                if (ds.so) {
                    let tratto = [];
                    const chiudi = () => {
                        if (tratto.length > 1) ds.so.strati.forEach((st, k) => {
                            const su = c => c.z - (k ? c.col.basi[k - 1] : 0), giu = c => c.z - c.col.basi[k];
                            const pts = tratto.map(c => `${n(X(c.s))},${n(Y(su(c)))}`).concat(tratto.slice().reverse().map(c => `${n(X(c.s))},${n(Y(giu(c)))}`));
                            corpo += `<polygon points="${pts.join(' ')}" fill="${st.colore}" fill-opacity="${st.ignoto ? 0.35 : 0.8}" stroke="${st.colore}" stroke-width="0.5"><title>${esc(st.nome)}</title></polygon>`;
                        });
                        tratto = [];
                    };
                    ds.campioni.forEach(c => { if (c.col) tratto.push(c); else chiudi(); });
                    chiudi();
                }
                // Il terreno.
                const terreno = ds.campioni.filter(c => c.z !== null).map(c => `${n(X(c.s))},${n(Y(c.z))}`);
                if (terreno.length > 1) corpo += `<polyline points="${terreno.join(' ')}" fill="none" stroke="#1f2937" stroke-width="1.6"/>`;
                // Le prove vicine.
                ds.prove.forEach(q => {
                    const x = X(Math.max(0, Math.min(ds.L, q.s)));
                    q.p.fasce.forEach(f => { corpo += `<rect x="${n(x - 4)}" y="${n(Y(q.p.z - f.da))}" width="8" height="${n(Math.max(0.5, (f.a - f.da) * sx * ex))}" fill="${f.colore}" stroke="#111827" stroke-width="0.6"><title>${esc(nomeDpsh(q.p.s))}: ${esc(f.nome)}</title></rect>`; });
                    corpo += `<text x="${n(x)}" y="${n(Y(q.p.z) - 6)}" font-size="11" font-weight="700" text-anchor="middle" fill="#111827" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(nomeDpsh(q.p.s))}</text>`;
                    if (q.lato >= 0.5) corpo += `<text x="${n(x)}" y="${n(Y(q.p.z - q.p.fondo) + 12)}" font-size="9" text-anchor="middle" fill="#475569">a ${numeroConVirgola(q.lato, 0)} m</text>`;
                });
                // Assi: quote a sinistra, distanze sotto.
                let assi = `<line x1="${sx0}" y1="${top}" x2="${sx0}" y2="${n(top + ph)}" stroke="#334155"/><line x1="${sx0}" y1="${n(top + ph)}" x2="${n(sx0 + pw)}" y2="${n(top + ph)}" stroke="#334155"/>`;
                const pz = massimoTondo(zr / 6);
                for (let z = Math.ceil(zBot / pz) * pz; z <= zTop + 1e-6; z += pz) assi += `<line x1="${sx0 - 4}" y1="${n(Y(z))}" x2="${sx0}" y2="${n(Y(z))}" stroke="#334155"/><text x="${sx0 - 7}" y="${n(Y(z) + 3.5)}" font-size="10" text-anchor="end" fill="#334155">${numeroConVirgola(z, pz < 1 ? 1 : 0)}</text>`;
                const ps = massimoTondo(ds.L / 6);
                for (let s = 0; s <= ds.L + 1e-6; s += ps) assi += `<line x1="${n(X(s))}" y1="${n(top + ph)}" x2="${n(X(s))}" y2="${n(top + ph + 4)}" stroke="#334155"/><text x="${n(X(s))}" y="${n(top + ph + 16)}" font-size="10" text-anchor="middle" fill="#334155">${numeroConVirgola(s, 0)}</text>`;
                assi += `<text x="14" y="${n(top + ph / 2)}" font-size="10" fill="#334155" transform="rotate(-90 14 ${n(top + ph / 2)})" text-anchor="middle">${ds.senzaDtm ? 'profondità (m)' : 'quota (m s.l.m.)'}</text>`;
                assi += `<text x="${n(sx0 + pw / 2)}" y="${n(top + ph + 32)}" font-size="10" text-anchor="middle" fill="#334155">distanza lungo la traccia (m)</text>`;
                const [e1, e2] = estremiTraccia(ds.t.nome);
                const estremi = `<text x="${sx0}" y="24" font-size="17" font-weight="800" text-anchor="middle" fill="#dc2626">${esc(e1)}</text><text x="${n(sx0 + pw)}" y="24" font-size="17" font-weight="800" text-anchor="middle" fill="#dc2626">${esc(e2)}</text>`;
                // Legenda degli strati e note.
                let y = top + ph + 52, x = sx0, legenda = '';
                const voci = ds.so ? ds.so.strati : [];
                voci.forEach(st => {
                    const w = 22 + st.nome.length * 6.2;
                    if (x + w > W - dx0) { x = sx0; y += 16; }
                    legenda += `<rect x="${n(x)}" y="${n(y - 9)}" width="12" height="10" fill="${st.colore}" fill-opacity="${st.ignoto ? 0.35 : 0.8}" stroke="#475569" stroke-width="0.5"/><text x="${n(x + 16)}" y="${n(y)}" font-size="10" fill="#1f2937">${esc(st.nome)}</text>`;
                    x += w + 10;
                });
                y += voci.length ? 18 : 4;
                const nota = `Esagerazione verticale ×${ex} · lunghezza ${numeroConVirgola(ds.L, 0)} m · direzione ${numeroConVirgola(ds.azimut, 0)}° · prove entro la fascia: ${ds.prove.length}`
                    + (ds.so ? ' · strati interpolati tra le prove, solo dentro il loro perimetro' : ' · per gli strati servono almeno tre prove col GPS, non in fila');
                legenda += `<text x="${sx0}" y="${n(y)}" font-size="10" fill="#475569">${esc(nota)}</text>`;
                const H = Math.round(y + 12);
                return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, sans-serif" class="sezione-tracciata">${corpo}${assi}${estremi}${legenda}</svg>`, ex, W, H };
            }

            // ---- La scheda «Sezioni» ----
            function renderElencoSezioni3d() {
                const box = document.getElementById('elencoSezioni3d');
                if (!box) return;
                const bt = document.getElementById('btnTracciaSezione3d'), traccia = areaMappa.strumento === 'profilo';
                bt.setAttribute('aria-pressed', String(traccia));
                bt.textContent = traccia ? 'Annulla la traccia' : 'Traccia una sezione';
                const d = datiVista3dCorrenti, tracce = tracceDelProgetto();
                box.innerHTML = tracce.length ? tracce.map(t => `<div class="vista3d-sezione-riga" data-id="${t.id}">
                        <input type="text" class="form-control" data-nome-sezione value="${String(t.nome).replace(/"/g, '&quot;')}" aria-label="Nome della sezione">
                        <span class="t-didascalia">${d ? numeroConVirgola(tracciaInScena(d, t).L, 0) + ' m' : ''}</span>
                        <button type="button" class="pillola" data-vedi-sezione aria-pressed="${sezioniTracciateStato.vista === t.id}">Vedi</button>
                        ${t.asse ? `<button type="button" class="bt-link" data-taglia-sezione title="Il taglio del modello su questa linea">Taglia</button>` : ''}
                        <button type="button" class="bt-link" data-pdf-sezione>PDF</button>
                        <button type="button" class="chiudi-x" data-elimina-sezione title="Elimina la traccia" aria-label="Elimina la traccia"><svg class="ico"><use href="#i-trash"/></svg></button>
                    </div>`).join('') : '<p class="t-didascalia">Nessuna traccia: «Traccia una sezione» e due clic sulla figura, oppure una griglia.</p>';
                renderVistaSezioneTracciata();
            }
            function renderVistaSezioneTracciata() {
                const box = document.getElementById('vistaSezioneTracciata');
                const t = tracceDelProgetto().find(x => x.id === sezioniTracciateStato.vista);
                if (!box) return;
                if (!t || !datiVista3dCorrenti) { box.innerHTML = ''; return; }
                const ds = datiSezioneTracciata(datiVista3dCorrenti, t, sezioniTracciateStato.fascia), esc = escapeHtmlDidascalia;
                // Quali prove vicine disegnare: spuntate tutte di partenza, la scelta resta nella traccia.
                box.innerHTML = (ds.vicine.length ? `<div class="sezione-prove"><span class="t-didascalia">Nella sezione:</span>${ds.vicine.map(q => `<label><input type="checkbox" data-prova-sezione="${q.p.s.id}"${(t.escluse || []).includes(q.p.s.id) ? '' : ' checked'}>${esc(nomeDpsh(q.p.s))} <span class="t-didascalia">a ${numeroConVirgola(q.lato, 0)} m</span></label>`).join('')}</div>` : '')
                    + svgSezioneTracciata(ds, Math.max(480, box.clientWidth || 900)).svg;
            }
            document.getElementById('vistaSezioneTracciata').addEventListener('change', (e) => {
                const id = e.target.dataset.provaSezione, t = tracceDelProgetto().find(x => x.id === sezioniTracciateStato.vista);
                if (!id || !t) return;
                t.escluse = (t.escluse || []).filter(x => x !== id).concat(e.target.checked ? [] : [id]);
                saveState();
                renderVistaSezioneTracciata();
            });
            // «Traccia una sezione» è lo strumento Profilo della barra (nel 3D si traccia dall'alto).
            document.getElementById('btnTracciaSezione3d').addEventListener('click', () => scegliStrumentoMappa(areaMappa.strumento === 'profilo' ? 'sel' : 'profilo'));
            document.getElementById('btnCreaGrigliaAssi3d').addEventListener('click', () => {
                const v = id => Math.max(0, Math.min(12, Math.round(Number(document.getElementById(id).value) || 0)));
                creaGrigliaAssi3d(v('numGrigliaNS3d'), v('numGrigliaEO3d'));
            });
            document.getElementById('presetGriglia3d').addEventListener('click', (e) => {
                const b = e.target.closest('[data-griglia]');
                if (!b) return;
                const [ns, eo] = b.dataset.griglia.split('x').map(Number);
                document.getElementById('numGrigliaNS3d').value = ns;
                document.getElementById('numGrigliaEO3d').value = eo;
                creaGrigliaAssi3d(ns, eo);
            });
            document.getElementById('btnCreaGriglia3d').addEventListener('click', () => {
                const v = id => Number(document.getElementById(id).value);
                creaGrigliaSezioni3d(v('numGrigliaDir3d') || 0, Math.max(1, v('numGrigliaPasso3d') || 25), Math.max(1, Math.min(26, Math.round(v('numGrigliaN3d') || 1))), document.getElementById('chkGrigliaIncrociata3d').checked);
            });
            document.getElementById('numFasciaSezione3d').addEventListener('input', (e) => { sezioniTracciateStato.fascia = Math.max(0, Number(e.target.value) || 0); renderVistaSezioneTracciata(); });
            document.getElementById('elencoSezioni3d').addEventListener('change', (e) => {
                const riga = e.target.closest('[data-id]'), t = riga && tracceDelProgetto().find(x => x.id === riga.dataset.id);
                if (!t || !e.target.hasAttribute('data-nome-sezione')) return;
                t.nome = e.target.value.trim() || t.nome;
                saveState();
                renderVista3d();
                renderVistaSezioneTracciata();
            });
            document.getElementById('elencoSezioni3d').addEventListener('click', async (e) => {
                const riga = e.target.closest('[data-id]'), t = riga && tracceDelProgetto().find(x => x.id === riga.dataset.id);
                if (!t) return;
                if (e.target.closest('[data-vedi-sezione]')) {
                    sezioniTracciateStato.vista = sezioniTracciateStato.vista === t.id ? null : t.id;
                    renderElencoSezioni3d();
                } else if (e.target.closest('[data-taglia-sezione]')) {
                    tagliaSullaTraccia3d(t);
                } else if (e.target.closest('[data-pdf-sezione]')) {
                    esportaPdfSezioni([t]);
                } else if (e.target.closest('[data-elimina-sezione]')) {
                    if (!await appConfirmDelete(`Eliminare la traccia ${t.nome}?`)) return;
                    const proj = state.projects[state.currentProjectId];
                    proj.sezioniTracciate = tracceDelProgetto().filter(x => x !== t);
                    if (sezioniTracciateStato.vista === t.id) sezioniTracciateStato.vista = null;
                    saveState();
                    renderVista3d();
                    renderElencoSezioni3d();
                }
            });
            // Le tavole delle sezioni (3D e 2D, col modello in isometria prima): la finestra del 071p.
            document.getElementById('btnPdfSezioni3d').addEventListener('click', () => {
                if (!tracceDelProgetto().length) { appAlert('Prima traccia almeno una sezione (o crea la griglia).'); return; }
                apriTavole3d(true);
            });

            // ---- PDF: una pagina A4 orizzontale per sezione. Sopra la sezione, sotto la vista dal
            // satellite con la traccia (A e A', le prove, nord e scala) e i dati della traccia. ----

            /** La vista dal satellite di una traccia: la finestra delle mappe dell'app (Esri), con
             * sopra la linea, i nomi degli estremi e tutte le prove col loro numero, piccolo (quelle
             * nella sezione in giallo). */
            function mappaSatelliteTraccia(proj, ds, larghezzaMm, altezzaMm) {
                const t = ds.t, Wpx = larghezzaMm * 4, Hpx = altezzaMm * 4;
                const centro = { lat: (t.a.lat + t.b.lat) / 2, lng: (t.a.lng + t.b.lng) / 2 };
                // Lo zoom più vicino a cui la traccia sta nei tre quarti della finestra.
                let zoom = 19;
                while (zoom > 3) {
                    const pa = puntoNellaFinestra(t.a, centro, zoom, Wpx, Hpx), pb = puntoNellaFinestra(t.b, centro, zoom, Wpx, Hpx);
                    if (Math.abs(pb.x - pa.x) <= Wpx * 0.75 && Math.abs(pb.y - pa.y) <= Hpx * 0.75) break;
                    zoom--;
                }
                const mappa = buildMappaInquadramentoHtml({ centro, zoom, provider: 'esri-satellite', larghezzaMm, altezzaMm, etichette: false, mostraNord: true, mostraScala: true, scala: { posizione: 'basso-sinistra' } });
                const q = p => puntoNellaFinestra(p, centro, zoom, Wpx, Hpx), n = v => v.toFixed(1);
                const pa = q(t.a), pb = q(t.b), [e1, e2] = estremiTraccia(t.nome);
                const nellaSezione = new Set(ds.prove.map(x => x.p.s.id));
                const testoOmbra = (x, y, s, size, colore) => `<text x="${n(x)}" y="${n(y)}" font-size="${size}" font-weight="800" text-anchor="middle" fill="${colore}" stroke="#000" stroke-width="3" paint-order="stroke">${String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
                const st = stileLivello('t:' + t.id), dash = trattoDash(st.tratto, 1.2);
                let sopra = `<line x1="${n(pa.x)}" y1="${n(pa.y)}" x2="${n(pb.x)}" y2="${n(pb.y)}" stroke="${st.colore}" stroke-width="${n(st.spessore * 1.25)}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash.join(' ')}"` : ''}/>`;
                proveFisiche(proveConCoordinate(proj)).forEach(s => {
                    const p = q({ lat: parseFloat(s.header.lat), lng: parseFloat(s.header.lng) }), dentro = nellaSezione.has(s.id);
                    if (p.x < 0 || p.y < 0 || p.x > Wpx || p.y > Hpx) return;
                    sopra += `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${dentro ? 6 : 4.5}" fill="${dentro ? '#facc15' : '#ffffff'}" stroke="#000" stroke-width="1.6"/>`;
                    sopra += `<text x="${n(p.x + (dentro ? 7 : 6))}" y="${n(p.y - (dentro ? 7 : 6))}" font-size="13" font-weight="700" fill="${dentro ? '#facc15' : '#ffffff'}" stroke="#000" stroke-width="2.5" paint-order="stroke">${String(s.header.provaNr || '?').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
                });
                // I nomi degli estremi appena fuori dalla linea, dalla parte della linea.
                const L = Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1, ux = (pb.x - pa.x) / L, uy = (pb.y - pa.y) / L;
                sopra += testoOmbra(pa.x - ux * 22, pa.y - uy * 22 + 10, e1, 34, '#ffffff') + testoOmbra(pb.x + ux * 22, pb.y + uy * 22 + 10, e2, 34, '#ffffff');
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Wpx} ${Hpx}" preserveAspectRatio="none" style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none;">${sopra}</svg>`;
                return mappa.replace(/<\/div>\s*$/, svg + '</div>');
            }

            function paginaPdfSezione(proj, d, t) {
                const ds = datiSezioneTracciata(d, t, sezioniTracciateStato.fascia);
                const sez = svgSezioneTracciata(ds, 1100);
                const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
                return `<section class="pagina">
                    <div><h1>Sezione ${esc(t.nome)}</h1><div class="sotto">${esc(proj.name || '')}${proj.comune && proj.comune !== proj.name ? ' · ' + esc(proj.comune) : ''}</div></div>
                    <div class="sezione">${sez.svg}</div>
                    <div class="basso">${mappaSatelliteTraccia(proj, ds, 160, 66)}</div>
                </section>`;
            }

            /** Il PDF delle sezioni: il documento in una cornice nascosta, si aspettano le tessere del
             * satellite (al massimo 20 secondi: un PDF può uscire senza qualche tessera, non sparire)
             * e si apre il pannello di stampa, dove si sceglie «Salva come PDF». */
            async function esportaPdfSezioni(tracce) {
                const d = datiVista3dCorrenti, proj = state.projects[state.currentProjectId];
                if (!d || !proj) return;
                const titolo = `Sezioni ${tracce.map(t => t.nome).join(', ')} — ${proj.name || ''}`;
                const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titolo.replace(/</g, '&lt;')}</title><style>
                    @page { size: A4 landscape; margin: 0; }
                    html, body { margin: 0; background: #fff; }
                    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .pagina { width: 297mm; height: 210mm; box-sizing: border-box; padding: 10mm 12mm; display: flex; flex-direction: column; gap: 3mm; overflow: hidden; page-break-after: always; break-after: page; }
                    .pagina:last-child { page-break-after: auto; break-after: auto; }
                    h1 { font-size: 17pt; margin: 0; } .sotto { font-size: 9pt; color: #475569; }
                    .sezione { flex: 1; min-height: 0; display: flex; justify-content: center; }
                    .sezione svg { max-width: 100%; max-height: 100%; width: auto; height: auto; }
                    .basso { display: flex; justify-content: center; }
                    .basso [data-mappa-inquadramento] { margin: 0 !important; flex: none; }
                </style></head><body>${tracce.map(t => paginaPdfSezione(proj, d, t)).join('')}</body></html>`;
                const cornice = document.createElement('iframe');
                cornice.style.cssText = 'position:fixed; left:-10000px; top:0; width:297mm; height:210mm; border:0; visibility:hidden;';
                document.body.appendChild(cornice);
                const doc = cornice.contentWindow.document;
                doc.open(); doc.write(html); doc.close();
                mostraToast('Preparo il PDF delle sezioni: scarico la vista dal satellite…');
                await Promise.race([
                    Promise.all(Array.from(doc.images).map(i => i.complete ? null : new Promise(ok => { i.onload = ok; i.onerror = ok; }))),
                    new Promise(ok => setTimeout(ok, 20000))
                ]);
                try { cornice.contentWindow.focus(); cornice.contentWindow.print(); } catch (e) { appAlert('Il browser non ha aperto il pannello di stampa: riprova.'); }
                setTimeout(() => cornice.remove(), 60000);
            }
