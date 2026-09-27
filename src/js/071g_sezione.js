            // SEZIONE TRA LE PROVE: le prove col GPS in fila lungo la loro direzione principale, alle
            // distanze vere; con il DTM, ogni colonna parte dalla sua quota e tra una prova e l'altra si
            // vede il profilo del terreno. Gli strati con lo stesso nome si uniscono tra prove vicine,
            // nell'ordine in cui compaiono (le unioni non si incrociano); uno strato che non c'è nella
            // prova vicina si chiude a metà strada. La falda si unisce se c'è in entrambe.

            const sezioneStato = { escluse: new Set() };

            function proveDellaSezione(proj) {
                const tutte = Object.values(proj.surveys || {}).filter(s => (s.logs || []).length > 0)
                    .sort((a, b) => String((a.header || {}).provaNr).localeCompare(String((b.header || {}).provaNr), 'it', { numeric: true }));
                const fisiche = new Set(proveFisiche(tutte));
                return tutte.map(s => ({ s, gps: isFinite(parseFloat(s.header.lat)) && isFinite(parseFloat(s.header.lng)), fisica: fisiche.has(s) }));
            }

            /** I dati della sezione: prove ordinate con distanza, quota e fasce; profilo del terreno. */
            function datiSezione(proj, prove) {
                const zona = Math.floor((parseFloat(prove[0].header.lng) + 180) / 6) + 1;
                const pt = prove.map(s => {
                    const la = parseFloat(s.header.lat), ln = parseFloat(s.header.lng);
                    return { s, la, ln, ...utmDaGeo(la, ln, zona) };
                });
                // Direzione principale: la coppia di prove più lontane; le altre in ordine lungo quella.
                let a = pt[0], b = pt[pt.length - 1], dMax = -1;
                pt.forEach(p => pt.forEach(q => { const d = Math.hypot(p.x - q.x, p.y - q.y); if (d > dMax) { dMax = d; a = p; b = q; } }));
                const ux = (b.x - a.x) / (dMax || 1), uy = (b.y - a.y) / (dMax || 1);
                pt.sort((p, q) => ((p.x - a.x) * ux + (p.y - a.y) * uy) - ((q.x - a.x) * ux + (q.y - a.y) * uy));
                let dist = 0;
                const conDtm = !!proj.dtm;
                const terreno = [];
                pt.forEach((p, i) => {
                    if (i > 0) {
                        const prec = pt[i - 1], lung = Math.hypot(p.x - prec.x, p.y - prec.y);
                        if (conDtm) {
                            const passi = Math.max(2, Math.min(400, Math.ceil(lung / 2)));
                            for (let k = 1; k < passi; k++) {
                                const f = k / passi;
                                const z = quotaDtm(proj.dtm, prec.la + (p.la - prec.la) * f, prec.ln + (p.ln - prec.ln) * f);
                                if (z !== null) terreno.push({ d: dist + lung * f, z });
                            }
                        }
                        dist += lung;
                    }
                    p.d = dist;
                    const q = conDtm ? quotaDtm(proj.dtm, p.la, p.ln) : null;
                    p.z = q !== null ? q : 0;
                    p.quotaVera = q !== null;
                    p.fasce = colonnaStratigrafica(p.s.logs, proj.strati); // gli strati sono del progetto, come nel Confronto
                    p.falda = parseFloat(p.s.header.faldaDa);
                    if (conDtm && q !== null) terreno.push({ d: dist, z: q });
                });
                terreno.sort((m, n) => m.d - n.d);
                return { pt, terreno, lunghezza: dist, conDtm: pt.some(p => p.quotaVera) };
            }

            /** Le unioni tra due colonne: coppie di fasce con lo stesso strato, in ordine, senza incroci. */
            function unioniFasce(A, B) {
                const chiave = f => normalizzaPerRicerca(f.nome);
                const coppie = [], usateB = new Set();
                let j = 0;
                A.forEach((fa, i) => {
                    for (let k = j; k < B.length; k++) {
                        if (chiave(B[k]) === chiave(fa)) { coppie.push([i, k]); usateB.add(k); j = k + 1; return; }
                    }
                });
                const usateA = new Set(coppie.map(c => c[0]));
                return { coppie, soloA: A.map((_, i) => i).filter(i => !usateA.has(i)), soloB: B.map((_, k) => k).filter(k => !usateB.has(k)) };
            }

            // larghezza: quella del riquadro in pixel, così i testi hanno la stessa grandezza su ogni
            // schermo (sul telefono la figura è più bassa, non più piccola).
            function svgSezione(dati, larghezza) {
                const W = Math.max(320, Math.round(larghezza || 1000)), mL = 70, mR = 30, mT = 48, lc = 16;
                const { pt, terreno, lunghezza } = dati;
                // Legenda in righe che stanno nella larghezza.
                const visti = new Map();
                pt.forEach(p => p.fasce.forEach(f => { if (!visti.has(f.nome)) visti.set(f.nome, f.colore); }));
                const voci = [];
                let lx = mL, riga = 0;
                visti.forEach((colore, nome) => {
                    const largo = 30 + nome.length * 7.2;
                    if (lx > mL && lx + largo > W - mR) { lx = mL; riga++; }
                    voci.push({ nome, colore, x: lx, riga });
                    lx += largo;
                });
                const mB = 60 + (riga + 1) * 18;
                const H = (W < 700 ? 400 : 560) + riga * 18;
                const fondo = Math.min(...pt.map(p => p.z - Math.max(0, ...p.fasce.map(f => f.a))));
                const cima = Math.max(...pt.map(p => p.z), ...terreno.map(t => t.z));
                const pad = Math.max(0.5, (cima - fondo) * 0.06);
                const zAlto = cima + pad, zBasso = fondo - pad;
                const L = Math.max(lunghezza, 1);
                const X = d => mL + lc / 2 + (d / L) * (W - mL - mR - lc);
                const Y = z => mT + (zAlto - z) / (zAlto - zBasso) * (H - mT - mB);
                const esag = ((H - mT - mB) / (zAlto - zBasso)) / ((W - mL - mR - lc) / L);
                const f1 = n => numeroConVirgola(n, 1);
                let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sezione tra le prove" style="display: block; font-family: var(--font-mono), monospace;">`;
                s += `<rect x="0" y="0" width="${W}" height="${H}" fill="var(--bg-card, #fff)"/>`;
                // Assi e griglia: quote a sinistra, distanze in basso.
                const passoZ = massimoTondo((zAlto - zBasso) / 6);
                for (let z = Math.ceil(zBasso / passoZ) * passoZ; z <= zAlto; z += passoZ) {
                    s += `<line x1="${mL}" y1="${Y(z)}" x2="${W - mR}" y2="${Y(z)}" stroke="currentColor" stroke-opacity="0.12"/>`;
                    s += `<text x="${mL - 8}" y="${Y(z) + 4}" text-anchor="end" font-size="12" fill="currentColor">${f1(z)}</text>`;
                }
                const passoD = massimoTondo(L / 6);
                for (let d = 0; d <= L + 0.001; d += passoD) {
                    s += `<line x1="${X(d)}" y1="${H - mB}" x2="${X(d)}" y2="${H - mB + 5}" stroke="currentColor"/>`;
                    s += `<text x="${X(d)}" y="${H - mB + 20}" text-anchor="middle" font-size="12" fill="currentColor">${numeroConVirgola(d, 0)}</text>`;
                }
                s += `<text x="${mL}" y="${H - mB + 38}" font-size="12" fill="currentColor">distanza (m) · ${W < 700 ? 'esag.' : 'esagerazione'} verticale ×${numeroConVirgola(esag, esag < 9.95 ? 1 : 0)}</text>`;
                // Legenda degli strati che compaiono, in fondo: serve anche nel file scaricato.
                voci.forEach(v => {
                    const y = H - mB + 50 + v.riga * 18;
                    s += `<rect x="${v.x}" y="${y}" width="12" height="12" fill="${v.colore}"/><text x="${v.x + 17}" y="${y + 10}" font-size="12" fill="currentColor">${escapeHtmlDidascalia(v.nome)}</text>`;
                });
                s += `<text transform="translate(16 ${(mT + H - mB) / 2}) rotate(-90)" text-anchor="middle" font-size="12" fill="currentColor">${dati.conDtm ? 'quota (m s.l.m.)' : 'm dal piano campagna'}</text>`;

                // Unioni degli strati tra colonne vicine, sotto le colonne.
                for (let i = 1; i < pt.length; i++) {
                    const pa = pt[i - 1], pb = pt[i];
                    const xa = X(pa.d) + lc / 2, xb = X(pb.d) - lc / 2, xm = (xa + xb) / 2;
                    const u = unioniFasce(pa.fasce, pb.fasce);
                    u.coppie.forEach(([ia, ib]) => {
                        const fa = pa.fasce[ia], fb = pb.fasce[ib];
                        s += `<polygon points="${xa},${Y(pa.z - fa.da)} ${xb},${Y(pb.z - fb.da)} ${xb},${Y(pb.z - fb.a)} ${xa},${Y(pa.z - fa.a)}" fill="${fa.colore}" fill-opacity="0.45" stroke="${fa.colore}" stroke-opacity="0.8" stroke-width="0.8" class="sezione-unione"><title>${escapeHtmlDidascalia(fa.nome)}</title></polygon>`;
                    });
                    u.soloA.forEach(ia => { const f = pa.fasce[ia]; s += `<polygon points="${xa},${Y(pa.z - f.da)} ${xm},${Y(pa.z - (f.da + f.a) / 2)} ${xa},${Y(pa.z - f.a)}" fill="${f.colore}" fill-opacity="0.35" class="sezione-chiusura"/>`; });
                    u.soloB.forEach(ib => { const f = pb.fasce[ib]; s += `<polygon points="${xb},${Y(pb.z - f.da)} ${xm},${Y(pb.z - (f.da + f.a) / 2)} ${xb},${Y(pb.z - f.a)}" fill="${f.colore}" fill-opacity="0.35" class="sezione-chiusura"/>`; });
                    if (isFinite(pa.falda) && isFinite(pb.falda)) s += `<line x1="${xa}" y1="${Y(pa.z - pa.falda)}" x2="${xb}" y2="${Y(pb.z - pb.falda)}" stroke="#3b82f6" stroke-width="2" stroke-dasharray="6 4"/>`;
                }
                // Il terreno: il profilo del DTM, o la linea delle teste delle prove.
                const linea = terreno.length > 1 ? terreno : pt.map(p => ({ d: p.d, z: p.z }));
                s += `<polyline points="${linea.map(t => `${X(t.d)},${Y(t.z)}`).join(' ')}" fill="none" stroke="currentColor" stroke-width="2" class="sezione-terreno"/>`;
                // Le colonne, sopra tutto.
                pt.forEach(p => {
                    const x = X(p.d) - lc / 2, nr = escapeHtmlDidascalia(String(p.s.header.provaNr || '?'));
                    p.fasce.forEach(f => { s += `<rect x="${x}" y="${Y(p.z - f.da)}" width="${lc}" height="${Math.max(0.5, Y(p.z - f.a) - Y(p.z - f.da))}" fill="${f.colore}" stroke="rgba(0,0,0,0.45)" stroke-width="0.6"><title>Prova ${nr}: ${escapeHtmlDidascalia(f.nome)}, ${f1(f.da)}–${f1(f.a)} m</title></rect>`; });
                    if (isFinite(p.falda)) s += `<path d="M${x - 7},${Y(p.z - p.falda) - 5} h${lc + 14} l${-(lc + 14) / 2},8 z" fill="#3b82f6"><title>Falda a ${f1(p.falda)} m</title></path>`;
                    s += `<text x="${X(p.d)}" y="${mT - 22}" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" class="sezione-etichetta">P${nr}</text>`;
                    if (p.quotaVera) s += `<text x="${X(p.d)}" y="${mT - 8}" text-anchor="middle" font-size="11" fill="currentColor" class="sezione-quota">${f1(p.z)}</text>`;
                });
                return s + '</svg>';
            }

            function renderSezione() {
                const proj = state.projects[state.currentProjectId];
                const tutte = proveDellaSezione(proj);
                document.getElementById('proveSezione').innerHTML = tutte.map(({ s, gps }) =>
                    `<button type="button" class="pillola" data-prova="${escapeHtmlDidascalia(s.id)}" aria-pressed="${gps && !sezioneStato.escluse.has(s.id)}"${gps ? '' : ' disabled title="Senza GPS: non si sa dove metterla"'}>Prova ${escapeHtmlDidascalia(String(s.header.provaNr || '?'))}</button>`).join('');
                const scelte = tutte.filter(v => v.gps && !sezioneStato.escluse.has(v.s.id)).map(v => v.s);
                const note = [];
                const senzaGps = tutte.filter(v => !v.gps).length;
                if (senzaGps) note.push(`${senzaGps === 1 ? 'Una prova è' : senzaGps + ' prove sono'} senza GPS e ${senzaGps === 1 ? 'resta' : 'restano'} fuori.`);
                const grafico = document.getElementById('graficoSezione');
                if (scelte.length < 2) {
                    grafico.innerHTML = `<div class="palette-vuota">Servono almeno due prove col GPS e con degli intervalli. ${tutte.some(v => v.gps) ? 'Accendine un\'altra qui sopra.' : 'Prendi il GPS delle prove dalla loro scheda.'}</div>`;
                    document.getElementById('btnScaricaSezione').disabled = true;
                } else {
                    const dati = datiSezione(proj, scelte);
                    if (!dati.conDtm) note.push('Senza DTM le prove partono tutte dal piano campagna: carica un DTM in «Terreno e sezioni» per le quote vere.');
                    else if (dati.pt.some(p => !p.quotaVera)) note.push('Qualche prova è fuori dal DTM: parte da quota 0.');
                    grafico.innerHTML = svgSezione(dati, grafico.clientWidth);
                    document.getElementById('btnScaricaSezione').disabled = false;
                }
                document.getElementById('notaSezione').textContent = note.join(' ');
            }

            function apriSezione() {
                saveState();
                closeAnyOpenModal();
                // Di partenza le prove eseguite davvero: le interpretazioni alternative («3B») spente.
                const proj = state.projects[state.currentProjectId];
                sezioneStato.escluse = new Set(proveDellaSezione(proj).filter(v => !v.fisica).map(v => v.s.id));
                renderSezione();
                document.getElementById('modalSezioneOverlay').classList.add('open');
                document.getElementById('modalSezione').classList.add('open');
            }

            document.getElementById('btnApriSezione').addEventListener('click', apriSezione);
            document.getElementById('btnChiudiSezione').addEventListener('click', closeAnyOpenModal);
            document.getElementById('proveSezione').addEventListener('click', (e) => {
                const b = e.target.closest('[data-prova]');
                if (!b || b.disabled) return;
                if (sezioneStato.escluse.has(b.dataset.prova)) sezioneStato.escluse.delete(b.dataset.prova);
                else sezioneStato.escluse.add(b.dataset.prova);
                renderSezione();
            });
            document.getElementById('btnScaricaSezione').addEventListener('click', () => {
                const svg = document.querySelector('#graficoSezione svg');
                if (!svg) return;
                // Il file va letto anche fuori dall'app: colori e caratteri al posto delle variabili.
                const testo = svg.outerHTML.replace(/var\(--bg-card, #fff\)/g, '#ffffff').replace(/currentColor/g, '#1f2937').replace(/var\(--font-mono\), monospace/g, 'monospace');
                const nome = (state.projects[state.currentProjectId].name || 'progetto').replace(/[^\w\-]+/g, '_');
                scaricaBlobFile(new Blob([testo], { type: 'image/svg+xml' }), `Sezione_${nome}.svg`);
            });
