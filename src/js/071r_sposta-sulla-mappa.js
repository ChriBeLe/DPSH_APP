            // ===================== SPOSTARE SULLA MAPPA (2D e 3D) =====================
            // Si sposta SOLO con lo strumento «Sposta», o tenendo premuto ALT (con qualunque strumento): allora
            // compaiono le maniglie sugli elementi e si trascinano: estremi e linea delle sezioni, prove, punti
            // disegnati, vertici dei poligoni (e il poligono intero, preso da dentro). In nessun altro modo si
            // cambiano vertici, linee o poligoni. Le prove passano sempre dalla doppia conferma di «Sposta la prova».

            areaMappa.alt = false;
            /** Le maniglie ci sono: strumento «Sposta», o ALT tenuto premuto. */
            const modificaMappaAttiva = () => areaMappa.strumento === 'sposta' || !!areaMappa.alt;
            /** Ridisegna la mappa che si vede (per far comparire o sparire le maniglie). */
            function aggiornaManiglieMappa() {
                if (!areaMappaAperta()) return;
                if (areaMappa.trascinando) { areaMappa.maniglieDopo = true; return; } // a trascinamento finito
                if (areaMappa.modo === 'mappa') disegnaProveMappa();
                else if (datiVista3dCorrenti) renderVista3d();
            }
            /** Un trascinamento comincia o finisce (sulla mappa 2D): le maniglie non si ridisegnano a metà. */
            function trascinamentoMappa(si) {
                areaMappa.trascinando = !!si;
                if (!si && areaMappa.maniglieDopo) { areaMappa.maniglieDopo = false; aggiornaManiglieMappa(); }
            }
            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Alt' || !areaMappaAperta()) return;
                e.preventDefault(); // (su Windows ALT porterebbe il fuoco al menu del browser)
                if (areaMappa.alt) return;
                areaMappa.alt = true;
                document.getElementById('modalVista3d').classList.add('con-alt');
                aggiornaManiglieMappa();
            });
            const lasciaAlt = () => {
                if (!areaMappa.alt) return;
                areaMappa.alt = false;
                document.getElementById('modalVista3d').classList.remove('con-alt');
                aggiornaManiglieMappa();
            };
            document.addEventListener('keyup', (e) => { if (e.key === 'Alt') { if (areaMappaAperta()) e.preventDefault(); lasciaAlt(); } });
            window.addEventListener('blur', lasciaAlt);

            /** Un disegno spostato: salvato; se fa da perimetro del modello 3D, il modello si rifà. */
            function dopoModificaDisegno(x) {
                const proj = state.projects[state.currentProjectId];
                saveState();
                if (proj && proj.perimetroModello === x.id && datiVista3dCorrenti) { datiVista3dCorrenti = datiVista3d(proj); renderPerimetroModello3d(); }
                if (areaMappa.modo === 'mappa') disegnaProveMappa(); else renderVista3d();
            }

            // ---- Sulla mappa 2D: le maniglie dei disegni ----
            const manigliaDisegno2d = (colore, grande) => L.divIcon({ className: '', html: `<div class="mappa-maniglia${grande ? ' grande' : ''}" style="border-color:${colore}"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] });
            /** Le maniglie di un disegno (punto: una; poligono: una per vertice, e il poligono si trascina tutto). */
            function maniglieDisegno2d(gruppo, x, forma) {
                const m = mappaProgetto, st = stileLivello('d:' + x.id);
                if (x.tipo === 'punto') {
                    const mk = L.marker([x.punti[0].lat, x.punti[0].lng], { icon: manigliaDisegno2d(st.colore, true), draggable: true, keyboard: false, zIndexOffset: 900, title: 'Trascina per spostare ' + x.nome }).addTo(gruppo);
                    mk.on('dragstart', () => trascinamentoMappa(true));
                    mk.on('drag', () => { const ll = mk.getLatLng(); x.punti = [{ lat: ll.lat, lng: ll.lng }]; if (forma.setLatLng) forma.setLatLng(ll); });
                    mk.on('dragend', () => { trascinamentoMappa(false); dopoModificaDisegno(x); });
                    return;
                }
                const vertici = x.punti.map((p, i) => {
                    const mk = L.marker([p.lat, p.lng], { icon: manigliaDisegno2d(st.colore), draggable: true, keyboard: false, zIndexOffset: 900, title: `Trascina il vertice ${i + 1} di ${x.nome}` }).addTo(gruppo);
                    mk.on('dragstart', () => trascinamentoMappa(true));
                    mk.on('drag', () => { const ll = mk.getLatLng(); x.punti = x.punti.map((q, j) => j === i ? { lat: ll.lat, lng: ll.lng } : q); forma.setLatLngs(x.punti.map(q => [q.lat, q.lng])); });
                    mk.on('dragend', () => { trascinamentoMappa(false); dopoModificaDisegno(x); });
                    return mk;
                });
                // tutto il poligono, preso da dentro
                forma.on('mousedown', (e) => {
                    if (e.originalEvent && e.originalEvent.button !== 0) return;
                    L.DomEvent.stop(e);
                    const carta = m.mappa, p0 = e.latlng, punti0 = x.punti.map(q => ({ ...q }));
                    carta.dragging.disable();
                    trascinamentoMappa(true);
                    const muovi = (ev) => {
                        const dl = ev.latlng.lat - p0.lat, dn = ev.latlng.lng - p0.lng;
                        x.punti = punti0.map(q => ({ lat: q.lat + dl, lng: q.lng + dn }));
                        forma.setLatLngs(x.punti.map(q => [q.lat, q.lng]));
                        vertici.forEach((mk, i) => mk.setLatLng([x.punti[i].lat, x.punti[i].lng]));
                    };
                    const fine = () => { carta.off('mousemove', muovi); carta.off('mouseup', fine); carta.dragging.enable(); trascinamentoMappa(false); dopoModificaDisegno(x); };
                    carta.on('mousemove', muovi); carta.on('mouseup', fine);
                });
            }

            // ---- Nel 3D: le maniglie e il trascinamento ----
            /** Dove sta sullo schermo un punto del terreno (metri della scena), con l'ultima scena. */
            function schermoDalSuolo3d(x, y) {
                const sc = ultimaScena3d, d = datiVista3dCorrenti;
                if (!sc || !sc.P || !d) return null;
                const z = d.zSuolo(x, y);
                return sc.P(x, y, Number.isFinite(z) ? z : (d.zMin + d.zMax) / 2);
            }
            /** Le maniglie nella scena 3D: estremi delle sezioni, prove, punti e vertici dei disegni. */
            function maniglieNellaScena3d(d, P, sopra) {
                const sp = vista3d.spostaProva;
                if (sp && sp.xy) {
                    // la prova mentre la si porta: dov'era e dove andrà
                    const z = q => { const v = d.zSuolo(q[0], q[1]); return Number.isFinite(v) ? v : (d.zMin + d.zMax) / 2; };
                    const da = P(sp.xy0[0], sp.xy0[1], z(sp.xy0)), qui = P(sp.xy[0], sp.xy[1], z(sp.xy));
                    sopra.push({ t: 'linea', x1: da[0], y1: da[1], x2: qui[0], y2: qui[1], stroke: '#eab308', sw: 2, dash: [5, 4], cls: 'vista3d-maniglia' });
                    sopra.push({ t: 'cerchio', x: qui[0], y: qui[1], r: 8, fill: '#eab308', stroke: '#fff', sw: 2, cls: 'vista3d-maniglia' });
                }
                if (!modificaMappaAttiva()) return;
                const maniglia = (q, colore, grande) => sopra.push({ t: 'cerchio', x: q[0], y: q[1], r: grande ? 7 : 5.5, fill: '#fff', stroke: colore, sw: 3, cls: 'vista3d-maniglia' });
                const zDi = (x, y) => { const v = d.zSuolo(x, y); return Number.isFinite(v) ? v : (d.zMin + d.zMax) / 2; };
                if (vista3d.livelli.sezioni) tracceDelProgetto().filter(t => !vista3d.tracceNascoste.has(t.id)).forEach(t => {
                    const { a, b } = tracciaInScena(d, t), st = stileLivello('t:' + t.id);
                    [a, b].forEach(q => maniglia(P(q[0], q[1], zDi(q[0], q[1])), st.colore, true));
                });
                disegniDelProgetto().filter(x => !vista3d.disegniNascosti.has(x.id)).forEach(x => {
                    const st = stileLivello('d:' + x.id);
                    x.punti.forEach(g => { const q = d.daGeo(g.lat, g.lng); maniglia(P(q[0], q[1], zDi(q[0], q[1])), st.colore, x.tipo === 'punto'); });
                });
                d.prove.filter(p => !vista3d.proveNascoste.has(p.s.id)).forEach(p => maniglia(P(p.x, p.y, p.z), '#2563eb', true));
            }
            /** Che cosa c'è sotto il mouse da spostare (con le maniglie accese): una sezione (estremo o linea),
             * un vertice o un punto disegnato, una prova, o un poligono (preso da dentro). */
            function elementoDaSpostare3d(sx, sy) {
                const d = datiVista3dCorrenti, sc = ultimaScena3d;
                if (!d || !sc || !modificaMappaAttiva()) return null;
                const tr = tracciaSottoIlMouse3d(sx, sy);
                if (tr && tr.parte !== 'tutta') return { tipo: 'traccia' };
                let meglio = null;
                disegniDelProgetto().filter(x => !vista3d.disegniNascosti.has(x.id)).forEach(x => x.punti.forEach((g, i) => {
                    const q = d.daGeo(g.lat, g.lng), s = schermoDalSuolo3d(q[0], q[1]), dd = s ? Math.hypot(s[0] - sx, s[1] - sy) : Infinity;
                    if (dd < 10 && (!meglio || dd < meglio.d)) meglio = { tipo: 'disegno', x, vertice: x.tipo === 'punto' ? 'tutto' : i, d: dd };
                }));
                if (meglio) return meglio;
                const id = provaNelPunto(sc, sx, sy);
                if (id) return { tipo: 'prova', id };
                if (tr) return { tipo: 'traccia' };
                const poli = disegniDelProgetto().filter(x => x.tipo === 'poligono' && !vista3d.disegniNascosti.has(x.id)).find(x => {
                    const pp = x.punti.map(g => { const q = d.daGeo(g.lat, g.lng); return schermoDalSuolo3d(q[0], q[1]); });
                    return pp.every(Boolean) && dentroPoligono(pp, sx, sy);
                });
                return poli ? { tipo: 'disegno', x: poli, vertice: 'tutto' } : null;
            }
            /** Comincia a spostare (pointerdown nel 3D): true se c'era qualcosa da prendere. */
            function iniziaSposta3d(sx, sy) {
                const el = elementoDaSpostare3d(sx, sy), d = datiVista3dCorrenti, p0 = puntoAlSuolo3d(sx, sy);
                if (!el || !p0) return false;
                if (el.tipo === 'traccia') return iniziaSpostaTraccia3d(sx, sy);
                if (el.tipo === 'disegno') { vista3d.spostaDisegno = { x: el.x, vertice: el.vertice, p0, xy0: el.x.punti.map(g => d.daGeo(g.lat, g.lng)) }; return true; }
                const p = d.prove.find(q => q.s.id === el.id);
                if (!p) return false;
                vista3d.spostaProva = { id: el.id, p0, xy0: [p.x, p.y], xy: null };
                return true;
            }
            function seguiSposta3d(sx, sy) {
                if (vista3d.spostaTraccia) { seguiSpostaTraccia3d(sx, sy); return; }
                const d = datiVista3dCorrenti, p = puntoAlSuolo3d(sx, sy), sd = vista3d.spostaDisegno, sp = vista3d.spostaProva;
                if (!d || !p) return;
                if (sd) {
                    const dx = p[0] - sd.p0[0], dy = p[1] - sd.p0[1];
                    sd.x.punti = sd.xy0.map((q, i) => sd.vertice === 'tutto' || sd.vertice === i ? d.geo(q[0] + dx, q[1] + dy) : sd.x.punti[i]);
                    sd.mosso = true;
                } else if (sp) {
                    sp.xy = [sp.xy0[0] + p[0] - sp.p0[0], sp.xy0[1] + p[1] - sp.p0[1]];
                }
                ridisegna3d();
            }
            /** Lasciato: il disegno si salva; la prova chiede la doppia conferma (annullando torna dov'era). */
            function fineSposta3d() {
                if (vista3d.spostaTraccia) { const st = vista3d.spostaTraccia; vista3d.spostaTraccia = null; if (st.mossa) fineSpostaTraccia(); return; }
                const sd = vista3d.spostaDisegno, sp = vista3d.spostaProva, d = datiVista3dCorrenti;
                vista3d.spostaDisegno = null; vista3d.spostaProva = null;
                if (sd && sd.mosso) dopoModificaDisegno(sd.x);
                if (sp) {
                    if (sp.xy && d && Math.hypot(sp.xy[0] - sp.xy0[0], sp.xy[1] - sp.xy0[1]) > 0.05) {
                        const g = d.geo(...sp.xy);
                        spostaProvaDallaMappa(sp.id, { lat: g.lat, lng: g.lng }).then(() => { datiVista3dCorrenti = datiVista3d(state.projects[state.currentProjectId]); renderVista3d(); });
                    } else renderVista3d();
                }
            }
            const spostando3d = () => !!(vista3d.spostaTraccia || vista3d.spostaDisegno || vista3d.spostaProva);
