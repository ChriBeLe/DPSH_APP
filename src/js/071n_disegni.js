            // ---- I DISEGNI (come in HyperGram): punti e poligoni dell'utente, sulla mappa 2D e nel 3D.
            // Si fanno con gli strumenti «Punto» e «Poligono» della barra; nei Livelli stanno nel gruppo
            // «Disegnati» (una riga ciascuno: spunta, opacità, tasto destro per inquadrare, rinominare,
            // cambiare colore, eliminare; la «T» del gruppo accende i nomi). Restano nel progetto. ----
            const COLORI_DISEGNI = ['#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#14b8a6', '#ec4899', '#eab308'];
            function disegniDelProgetto() {
                const proj = state.projects[state.currentProjectId];
                return (proj && proj.disegni) || [];
            }
            function creaDisegno(tipo, punti) {
                const proj = state.projects[state.currentProjectId], tutti = disegniDelProgetto();
                const base = tipo === 'punto' ? 'Punto' : 'Poligono', nomi = new Set(tutti.map(x => x.nome));
                let n = tutti.filter(x => x.tipo === tipo).length + 1;
                while (nomi.has(`${base} ${n}`)) n++;
                const x = { id: 'dis_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), tipo, nome: `${base} ${n}`, colore: COLORI_DISEGNI[tutti.length % COLORI_DISEGNI.length], punti };
                proj.disegni = tutti.concat(x);
                saveState();
                infoAreaMappa();
                disegnaProveMappa();
                renderVista3d();
                return x;
            }
            /** Il poligono finito (doppio clic o Invio): i vertici ripetuti dal doppio clic si tolgono. */
            function salvaPoligonoDisegnato(m) {
                const pts = m.punti.filter((p, i) => !i || metriPrecisi(m.punti[i - 1], p) > 0.05);
                if (pts.length < 3) { mostraToast('Un poligono vuole almeno tre vertici.'); return; }
                togliMisura();
                scegliStrumentoMappa('sel');
                creaDisegno('poligono', pts.map(p => ({ lat: p.lat, lng: p.lng })));
            }
            const testoDisegno = x => x.tipo === 'poligono' ? testoMisura(x.punti, true) : `${x.punti[0].lat.toFixed(6)}, ${x.punti[0].lng.toFixed(6)}`;
            const centroDisegno = x => ({ lat: x.punti.reduce((a, p) => a + p.lat, 0) / x.punti.length, lng: x.punti.reduce((a, p) => a + p.lng, 0) / x.punti.length });

            /** Sulla mappa 2D, nel gruppo delle prove. */
            function disegniNellaMappa2d(gruppo) {
                const esc = escapeHtmlDidascalia;
                disegniDelProgetto().filter(x => !vista3d.disegniNascosti.has(x.id)).forEach(x => {
                    const o = vista3d.opacita['d:' + x.id] ?? 1, ll = x.punti.map(p => [p.lat, p.lng]);
                    const forma = x.tipo === 'punto'
                        ? L.circleMarker(ll[0], { radius: 6, color: '#111827', weight: 1.5, fillColor: x.colore, fillOpacity: o, opacity: o })
                        : L.polygon(ll, { color: x.colore, weight: 2.5, opacity: o, fillOpacity: 0.22 * o });
                    forma.addTo(gruppo).bindTooltip(`${esc(x.nome)} · ${testoDisegno(x)}`, { sticky: true })
                        .on('contextmenu', (e) => { L.DomEvent.stop(e); menuDisegno(e.originalEvent, x.id); });
                    if (!vista3d.etichette.disegni) return;
                    const c = x.tipo === 'punto' ? x.punti[0] : centroDisegno(x);
                    L.marker([c.lat, c.lng], { interactive: false, opacity: o, icon: L.divIcon({ className: '', html: `<span class="mappa-disegno-nome${x.tipo === 'poligono' ? ' centrato' : ''}">${esc(x.nome)}</span>`, iconSize: null, iconAnchor: x.tipo === 'punto' ? [-10, 9] : [0, 9] }) }).addTo(gruppo);
                });
            }
            /** Nel 3D: appoggiati sul terreno (i lati dei poligoni ne seguono il profilo). */
            function disegniNellaScena3d(d, P, sopra, testo) {
                const zMedia = (d.zMin + d.zMax) / 2, alSuolo = (x, y) => { const z = d.zSuolo(x, y); return P(x, y, Number.isFinite(z) ? z : zMedia); };
                disegniDelProgetto().filter(x => !vista3d.disegniNascosti.has(x.id)).forEach(x => {
                    const xy = x.punti.map(p => d.daGeo(p.lat, p.lng));
                    let qui;
                    if (x.tipo === 'punto') {
                        qui = alSuolo(...xy[0]);
                        sopra.push({ t: 'cerchio', x: qui[0], y: qui[1], r: 6, fill: x.colore, stroke: '#111827', cls: 'vista3d-disegno', disegno: x.id });
                    } else {
                        const bordo = [];
                        xy.forEach((a, i) => {
                            const b = xy[(i + 1) % xy.length];
                            for (let k = 0; k < 12; k++) bordo.push(alSuolo(a[0] + (b[0] - a[0]) * k / 12, a[1] + (b[1] - a[1]) * k / 12));
                        });
                        sopra.push({ t: 'poli', p: bordo.map(q => [q[0], q[1]]), fill: x.colore, fo: 0.2, stroke: 'none', sw: 0, cls: 'vista3d-disegno', disegno: x.id });
                        bordo.forEach((q, i) => { const r = bordo[(i + 1) % bordo.length]; sopra.push({ t: 'linea', x1: q[0], y1: q[1], x2: r[0], y2: r[1], stroke: x.colore, sw: 2.5, cls: 'vista3d-disegno', disegno: x.id }); });
                        const c = d.daGeo(centroDisegno(x).lat, centroDisegno(x).lng);
                        qui = alSuolo(...c);
                    }
                    if (vista3d.etichette.disegni) testo(qui[0] + (x.tipo === 'punto' ? 9 : 0), qui[1] + 4, x.nome, { size: 12, bold: true, alone: true, anchor: x.tipo === 'punto' ? undefined : 'middle', cls: 'vista3d-disegno-nome', disegno: x.id });
                });
            }

            /** Il tasto destro su un disegno (sulla mappa): lo stesso menu della sua riga nei Livelli. */
            function menuDisegno(e, id) {
                const r = righeLivelli3d().flatMap(g => g.righe).find(x => x.chiave === 'd:' + id);
                if (r) menuLivello3d(e, r);
            }
            function vociDisegno(x, posto) {
                const ridisegna = () => { saveState(); disegnaProveMappa(); renderVista3d(); infoAreaMappa(); };
                return [
                    ['Rinomina…', 'i-rinomina', '', async () => {
                        const nome = await appPrompt('Nome', x.nome, { title: x.tipo === 'punto' ? 'Rinomina il punto' : 'Rinomina il poligono', okLabel: 'Rinomina' });
                        if (nome && nome.trim()) { x.nome = nome.trim(); ridisegna(); }
                    }],
                    ['Colore…', 'i-riempimento', '', () => setTimeout(() => apriMenuContesto({ preventDefault() {}, clientX: posto.x, clientY: posto.y }, 'Colore · ' + x.nome,
                        COLORI_DISEGNI.map(c => [`<span class="menu-colore" style="background:${c}"></span>${c}`, c === x.colore ? 'i-check' : 'i-riempimento', '', () => { x.colore = c; ridisegna(); }])))],
                    '-',
                    ['Elimina', 'i-trash', '', async () => {
                        if (!await appConfirmDelete(`Eliminare ${x.nome}?`)) return;
                        const proj = state.projects[state.currentProjectId];
                        proj.disegni = disegniDelProgetto().filter(y => y !== x);
                        ridisegna();
                    }, true]
                ];
            }
