            // SEZIONE TRA LE PROVE: le prove col GPS in fila lungo la loro direzione principale, alle
            // distanze vere; con il DTM, ogni colonna parte dalla sua quota e tra una prova e l'altra si
            // vede il profilo del terreno.
            // Gli strati con lo stesso nome (la k-esima volta che compare in una prova con la k-esima
            // nell'altra) si collegano tra una prova e la successiva che li ha, passando sotto le prove
            // in mezzo. Se una prova in mezzo è scesa fin lì senza trovarli il collegamento resta, ma
            // tratteggiato e più chiaro («incerto», e il perché nel suggerimento). Dove uno strato non
            // ha seguito si chiude a metà strada. La falda si unisce se c'è in entrambe.
            // Esagerazione verticale e scala orizzontale si regolano; correlazioni, etichette lungo i
            // profili, scale delle prove e grafico dei colpi si accendono e spengono.

            const sezioneStato = { escluse: new Set(), esagV: null, scalaH: 1, correlazioni: true, etichette: true, scale: true, grafico: true };

            function proveDellaSezione(proj) {
                const tutte = Object.values(proj.surveys || {}).filter(s => (s.logs || []).length > 0)
                    .sort((a, b) => String((a.header || {}).provaNr).localeCompare(String((b.header || {}).provaNr), 'it', { numeric: true }));
                const fisiche = new Set(proveFisiche(tutte));
                return tutte.map(s => ({ s, gps: isFinite(parseFloat(s.header.lat)) && isFinite(parseFloat(s.header.lng)), fisica: fisiche.has(s) }));
            }

            function nomeDpsh(s) { return 'DPSH ' + String((s.header || {}).provaNr || '?'); }

            /** I dati della sezione: prove ordinate con distanza, quota, fasce e fondo; profilo del terreno. */
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
                    p.fondo = Math.max(0, ...p.fasce.map(f => f.a));
                    p.falda = parseFloat(p.s.header.faldaDa);
                    if (conDtm && q !== null) terreno.push({ d: dist, z: q });
                });
                terreno.sort((m, n) => m.d - n.d);
                // Quota del terreno a una distanza: il profilo del DTM, o la retta tra le teste delle prove.
                const punti = terreno.length > 1 ? terreno : pt.map(p => ({ d: p.d, z: p.z }));
                const zTerreno = d => {
                    let i = punti.findIndex(p => p.d >= d);
                    if (i <= 0) return punti[Math.max(0, i)].z;
                    const a = punti[i - 1], b = punti[i];
                    return a.z + (b.z - a.z) * ((d - a.d) / ((b.d - a.d) || 1));
                };
                return { pt, terreno, lunghezza: dist, conDtm: pt.some(p => p.quotaVera), zTerreno };
            }

            /** Le fasce di una colonna per chiave: «nome#k» è la k-esima volta che quello strato compare. */
            function occorrenzeFasce(fasce) {
                const conta = new Map(), out = new Map();
                fasce.forEach(f => {
                    const nome = normalizzaPerRicerca(f.nome), k = conta.get(nome) || 0;
                    conta.set(nome, k + 1);
                    out.set(nome + '#' + k, f);
                });
                return out;
            }

            /** I collegamenti della sezione: tratti tra prove (anche non vicine; «contro» è la prova in
             * mezzo che li contraddice, se c'è) e chiusure a metà strada.
             * pt: prove in ordine con d (distanza), z (quota), fondo (profondità raggiunta), fasce. */
            function correlazioniSezione(pt) {
                const occ = pt.map(p => occorrenzeFasce(p.fasce));
                const tratti = [], chiusure = [];
                new Set(occ.flatMap(o => [...o.keys()])).forEach(k => {
                    const presenti = pt.map((_, i) => i).filter(i => occ[i].has(k));
                    for (let n = 0; n + 1 < presenti.length; n++) {
                        const a = presenti[n], b = presenti[n + 1], fa = occ[a].get(k), fb = occ[b].get(k);
                        let contro = null;
                        for (let m = a + 1; m < b && contro === null; m++) {
                            const t = (pt[m].d - pt[a].d) / ((pt[b].d - pt[a].d) || 1);
                            // Lo strato segue il terreno (si interpola la profondità): una prova in mezzo
                            // scesa oltre il suo tetto senza trovarlo lo contraddice.
                            if (pt[m].fondo > fa.da + (fb.da - fa.da) * t + 0.01) contro = m;
                        }
                        tratti.push({ a, b, fa, fb, contro });
                    }
                    const primo = presenti[0], ultimo = presenti[presenti.length - 1];
                    if (primo > 0) chiusure.push({ i: primo, verso: -1, f: occ[primo].get(k) });
                    if (ultimo < pt.length - 1) chiusure.push({ i: ultimo, verso: 1, f: occ[ultimo].get(k) });
                });
                return { tratti, chiusure };
            }

            /** Uno scalino «colpi N per profondità» dentro un riquadro: path SVG. */
            function pathColpi(logs, x0, larg, nMax, Yp) {
                let d = '';
                (logs || []).forEach(l => {
                    const x = x0 + Math.min(1, (parseFloat(l.colpi) || 0) / nMax) * larg;
                    d += `${d ? 'L' : 'M'}${x.toFixed(1)},${Yp(parseFloat(l.start) || 0).toFixed(1)} L${x.toFixed(1)},${Yp(parseFloat(l.end) || 0).toFixed(1)} `;
                });
                return d;
            }

            // larghezza: quella del riquadro in pixel, così i testi hanno la stessa grandezza su ogni
            // schermo; la scala orizzontale la moltiplica (e il riquadro scorre).
            function svgSezione(dati, larghezza) {
                const o = sezioneStato;
                const W = Math.max(320, Math.round((larghezza || 1000) * o.scalaH));
                const lc = 16, gW = o.grafico ? 58 : 0, sW = o.scale ? 24 : 0;
                const mL = 70 + sW, mR = 30 + gW, mT = 48;
                const { pt, terreno, lunghezza, zTerreno } = dati;
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
                const fondo = Math.min(...pt.map(p => p.z - p.fondo));
                const cima = Math.max(...pt.map(p => p.z), ...terreno.map(t => t.z));
                const pad = Math.max(0.5, (cima - fondo) * 0.06);
                const zAlto = cima + pad, zBasso = fondo - pad;
                const L = Math.max(lunghezza, 1);
                const sx = (W - mL - mR - lc) / L;
                // Esagerazione: automatica (altezza fissa del disegno) o scelta (l'altezza segue).
                const altAuto = (larghezza || 1000) < 700 ? 250 : 400;
                const esag = o.esagV || altAuto / (zAlto - zBasso) / sx;
                const plotH = Math.max(120, Math.min(4000, (zAlto - zBasso) * sx * esag));
                const H = mT + plotH + mB;
                const X = d => mL + lc / 2 + d * sx;
                const Y = z => mT + (zAlto - z) / (zAlto - zBasso) * plotH;
                const f1 = n => numeroConVirgola(n, 1);
                let s = `<svg viewBox="0 0 ${W} ${H}" width="${o.scalaH > 1 ? W : '100%'}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sezione tra le prove" style="display: block; font-family: var(--font-mono), monospace;">`;
                s += `<rect x="0" y="0" width="${W}" height="${H}" fill="var(--bg-card, #fff)"/>`;
                // Assi e griglia: quote a sinistra, distanze in basso.
                const passoZ = massimoTondo((zAlto - zBasso) / Math.max(3, plotH / 70));
                for (let z = Math.ceil(zBasso / passoZ) * passoZ; z <= zAlto; z += passoZ) {
                    s += `<line x1="${mL - sW}" y1="${Y(z)}" x2="${W - mR + gW}" y2="${Y(z)}" stroke="currentColor" stroke-opacity="0.12"/>`;
                    s += `<text x="${mL - sW - 8}" y="${Y(z) + 4}" text-anchor="end" font-size="12" fill="currentColor">${f1(z)}</text>`;
                }
                const passoD = massimoTondo(L / Math.max(3, (W - mL - mR) / 110));
                for (let d = 0; d <= L + 0.001; d += passoD) {
                    s += `<line x1="${X(d)}" y1="${H - mB}" x2="${X(d)}" y2="${H - mB + 5}" stroke="currentColor"/>`;
                    s += `<text x="${X(d)}" y="${H - mB + 20}" text-anchor="middle" font-size="12" fill="currentColor">${numeroConVirgola(d, 0)}</text>`;
                }
                const nMax = massimoTondo(Math.max(1, ...pt.flatMap(p => (p.s.logs || []).map(l => parseFloat(l.colpi) || 0))));
                s += `<text x="${mL}" y="${H - mB + 38}" font-size="12" fill="currentColor" class="sezione-didascalia">distanza (m) · ${W < 700 ? 'esag.' : 'esagerazione'} verticale ×${numeroConVirgola(esag, esag < 9.95 ? 1 : 0)}${o.grafico ? ` · colpi N da 0 a ${nMax}` : ''}</text>`;
                voci.forEach(v => {
                    const y = H - mB + 50 + v.riga * 18;
                    s += `<rect x="${v.x}" y="${y}" width="12" height="12" fill="${v.colore}"/><text x="${v.x + 17}" y="${y + 10}" font-size="12" fill="currentColor">${escapeHtmlDidascalia(v.nome)}</text>`;
                });
                s += `<text transform="translate(16 ${mT + plotH / 2}) rotate(-90)" text-anchor="middle" font-size="12" fill="currentColor">${dati.conDtm ? 'quota (m s.l.m.)' : 'm dal piano campagna'}</text>`;

                // Correlazioni: sotto tutto il resto. Un tratto segue il terreno: a ogni distanza, tetto e
                // letto sono alla profondità interpolata tra le due prove, sotto il profilo.
                const { tratti, chiusure } = correlazioniSezione(pt);
                const bordiTratto = (pa, pb, fa, fb) => {
                    const d0 = pa.d + lc / 2 / sx, d1 = pb.d - lc / 2 / sx, passi = Math.max(2, Math.min(80, Math.round((d1 - d0) * sx / 6)));
                    const sopra = [], sotto = [];
                    for (let k = 0; k <= passi; k++) {
                        const d = d0 + (d1 - d0) * k / passi, t = (d - pa.d) / ((pb.d - pa.d) || 1), zt = zTerreno(d);
                        sopra.push([X(d), Y(zt - (fa.da + (fb.da - fa.da) * t))]);
                        sotto.push([X(d), Y(zt - (fa.a + (fb.a - fa.a) * t))]);
                    }
                    return sopra.concat(sotto.reverse());
                };
                if (o.correlazioni) {
                    tratti.forEach(({ a, b, fa, fb, contro }) => {
                        const perche = contro === null ? '' : ` (incerto: la ${nomeDpsh(pt[contro].s)} è scesa fin lì senza trovarlo)`;
                        s += `<polygon points="${bordiTratto(pt[a], pt[b], fa, fb).map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join(' ')}" fill="${fa.colore}" fill-opacity="${contro === null ? 0.42 : 0.2}" stroke="${fa.colore}" stroke-opacity="0.85" stroke-width="${contro === null ? 0.8 : 1.4}"${contro === null ? '' : ' stroke-dasharray="6 4"'} class="sezione-unione${contro === null ? '' : ' incerta'}" data-strato="${escapeHtmlDidascalia(fa.nome)}" data-da="${a}" data-a="${b}"><title>${escapeHtmlDidascalia(fa.nome + perche)}</title></polygon>`;
                    });
                    chiusure.forEach(({ i, verso, f }) => {
                        const p = pt[i], vicino = pt[i + verso];
                        if (!vicino) return;
                        const xc = X(p.d) + verso * lc / 2, dm = (p.d + vicino.d) / 2;
                        s += `<polygon points="${xc},${Y(p.z - f.da)} ${X(dm)},${Y(zTerreno(dm) - (f.da + f.a) / 2)} ${xc},${Y(p.z - f.a)}" fill="${f.colore}" fill-opacity="0.32" class="sezione-chiusura"/>`;
                    });
                }
                for (let i = 1; i < pt.length; i++) {
                    const pa = pt[i - 1], pb = pt[i];
                    if (isFinite(pa.falda) && isFinite(pb.falda)) s += `<line x1="${X(pa.d) + lc / 2}" y1="${Y(pa.z - pa.falda)}" x2="${X(pb.d) - lc / 2}" y2="${Y(pb.z - pb.falda)}" stroke="#3b82f6" stroke-width="2" stroke-dasharray="6 4"/>`;
                }
                // Il terreno: il profilo del DTM, o la linea delle teste delle prove.
                const linea = terreno.length > 1 ? terreno : pt.map(p => ({ d: p.d, z: p.z }));
                s += `<polyline points="${linea.map(t => `${X(t.d).toFixed(1)},${Y(t.z).toFixed(1)}`).join(' ')}" fill="none" stroke="currentColor" stroke-width="2" class="sezione-terreno"/>`;
                // Etichette lungo i profili: il nome dello strato sull'asse del tratto, inclinato come lui.
                if (o.correlazioni && o.etichette) tratti.forEach(({ a, b, fa, fb }) => {
                    const pa = pt[a], pb = pt[b], xa = X(pa.d) + lc / 2, xb = X(pb.d) - lc / 2;
                    const spessore = Math.min(Y(pa.z - fa.a) - Y(pa.z - fa.da), Y(pb.z - fb.a) - Y(pb.z - fb.da));
                    if (spessore < 10 || xb - xa < fa.nome.length * 6.8 + 20) return;
                    // Al centro del tratto, inclinata come la sua mezzeria lì.
                    const meta = d => { const t = (d - pa.d) / ((pb.d - pa.d) || 1); return Y(zTerreno(d) - ((fa.da + fa.a) / 2 + ((fb.da + fb.a) / 2 - (fa.da + fa.a) / 2) * t)); };
                    // A metà del tratto libero più lungo tra le colonne che attraversa, non sopra una colonna.
                    const tappe = pt.map(p => p.d).filter(d => d >= pa.d && d <= pb.d);
                    let dc = (pa.d + pb.d) / 2, libero = 0;
                    for (let k = 1; k < tappe.length; k++) if (tappe[k] - tappe[k - 1] > libero) { libero = tappe[k] - tappe[k - 1]; dc = (tappe[k] + tappe[k - 1]) / 2; }
                    const dd = libero * 0.1 || (pb.d - pa.d) * 0.08;
                    const xc = X(dc), yc = meta(dc), ang = Math.atan2(meta(dc + dd) - meta(dc - dd), X(dc + dd) - X(dc - dd)) * 180 / Math.PI;
                    s += `<text x="${xc.toFixed(1)}" y="${yc.toFixed(1)}" transform="rotate(${ang.toFixed(1)} ${xc.toFixed(1)} ${yc.toFixed(1)})" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="currentColor" paint-order="stroke" stroke="var(--bg-card, #fff)" stroke-width="3" class="sezione-etichetta-strato">${escapeHtmlDidascalia(fa.nome)}</text>`;
                });
                // Le colonne, con la loro scala e il grafico dei colpi accanto.
                pt.forEach(p => {
                    const x = X(p.d) - lc / 2, nome = escapeHtmlDidascalia(nomeDpsh(p.s));
                    s += `<g class="sezione-colonna" data-prova="${escapeHtmlDidascalia(p.s.id)}" style="cursor: pointer;">`;
                    s += `<rect x="${x - 4}" y="${Y(p.z) - 4}" width="${lc + 8 + gW}" height="${Y(p.z - p.fondo) - Y(p.z) + 8}" fill="transparent"/>`;
                    p.fasce.forEach(f => { s += `<rect x="${x}" y="${Y(p.z - f.da)}" width="${lc}" height="${Math.max(0.5, Y(p.z - f.a) - Y(p.z - f.da))}" fill="${f.colore}" stroke="rgba(0,0,0,0.45)" stroke-width="0.6"><title>${nome}: ${escapeHtmlDidascalia(f.nome)}, ${f1(f.da)}–${f1(f.a)} m</title></rect>`; });
                    if (o.scale) {
                        const passo = p.fondo <= 6 ? 1 : p.fondo <= 15 ? 2 : 5;
                        s += `<line x1="${x - 3}" y1="${Y(p.z)}" x2="${x - 3}" y2="${Y(p.z - p.fondo)}" stroke="currentColor" stroke-opacity="0.6"/>`;
                        for (let m = passo; m <= p.fondo + 0.001; m += passo) s += `<line x1="${x - 7}" y1="${Y(p.z - m)}" x2="${x - 3}" y2="${Y(p.z - m)}" stroke="currentColor"/><text x="${x - 9}" y="${Y(p.z - m) + 3.5}" text-anchor="end" font-size="10" fill="currentColor" class="sezione-scala">${m}</text>`;
                    }
                    if (o.grafico) {
                        const x0 = x + lc + 4, larg = gW - 10;
                        s += `<rect x="${x0}" y="${Y(p.z)}" width="${larg}" height="${Y(p.z - p.fondo) - Y(p.z)}" fill="currentColor" fill-opacity="0.05"/><line x1="${x0}" y1="${Y(p.z)}" x2="${x0}" y2="${Y(p.z - p.fondo)}" stroke="currentColor" stroke-opacity="0.5"/>`;
                        s += `<path d="${pathColpi(p.s.logs, x0, larg, nMax, m => Y(p.z - m))}" fill="none" stroke="var(--accent, #0d9488)" stroke-width="1.6" class="sezione-grafico"/>`;
                    }
                    if (isFinite(p.falda)) s += `<path d="M${x - 7},${Y(p.z - p.falda) - 5} h${lc + 14} l${-(lc + 14) / 2},8 z" fill="#3b82f6"><title>Falda a ${f1(p.falda)} m</title></path>`;
                    s += `<text x="${X(p.d)}" y="${mT - 22}" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" class="sezione-etichetta">${nome}</text>`;
                    if (p.quotaVera) s += `<text x="${X(p.d)}" y="${mT - 8}" text-anchor="middle" font-size="11" fill="currentColor" class="sezione-quota">${f1(p.z)}</text>`;
                    s += '</g>';
                });
                return s + '</svg>';
            }

            function renderSezione() {
                const proj = state.projects[state.currentProjectId];
                const tutte = proveDellaSezione(proj);
                document.getElementById('proveSezione').innerHTML = tutte.map(({ s, gps }) =>
                    `<button type="button" class="pillola" data-prova="${escapeHtmlDidascalia(s.id)}" aria-pressed="${gps && !sezioneStato.escluse.has(s.id)}"${gps ? ` title="${escapeHtmlDidascalia(nomeDpsh(s))}"` : ' disabled title="Senza GPS: non si sa dove metterla"'}>${escapeHtmlDidascalia(String((s.header || {}).provaNr || '?'))}</button>`).join('');
                document.querySelectorAll('#opzioniSezione [data-opzione]').forEach(b => b.setAttribute('aria-pressed', String(sezioneStato[b.dataset.opzione])));
                document.getElementById('opzioniSezione').querySelector('[data-opzione="etichette"]').disabled = !sezioneStato.correlazioni;
                const scelte = tutte.filter(v => v.gps && !sezioneStato.escluse.has(v.s.id)).map(v => v.s);
                document.getElementById('lblProveSezioneBreve').textContent = `${scelte.length} su ${tutte.filter(v => v.gps).length}`;
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
                    // Stessa posizione di scorrimento prima e dopo: la figura cambia, la vista resta ferma.
                    const sx = grafico.scrollLeft, sy = grafico.scrollTop;
                    grafico.innerHTML = svgSezione(dati, grafico.clientWidth);
                    grafico.scrollLeft = sx; grafico.scrollTop = sy;
                    const esag = grafico.querySelector('.sezione-didascalia').textContent.match(/×([\d,]+)/);
                    if (!sezioneStato.esagV && esag) document.getElementById('rngEsagSezione').value = Math.round(parseFloat(esag[1].replace(',', '.')));
                    document.getElementById('btnScaricaSezione').disabled = false;
                }
                document.getElementById('lblEsagSezione').textContent = sezioneStato.esagV ? '×' + sezioneStato.esagV : 'auto';
                document.getElementById('lblScalaHSezione').textContent = '×' + numeroConVirgola(sezioneStato.scalaH, sezioneStato.scalaH % 1 ? 1 : 0);
                document.getElementById('notaSezione').textContent = note.join(' ');
            }

            let attesaSezione = false;
            function ridisegnaSezione() {
                if (attesaSezione) return;
                attesaSezione = true;
                requestAnimationFrame(() => { attesaSezione = false; renderSezione(); });
            }

            function apriSezione() {
                saveState();
                closeAnyOpenModal();
                // Di partenza le prove eseguite davvero: le interpretazioni alternative («3B») spente.
                const proj = state.projects[state.currentProjectId];
                sezioneStato.escluse = new Set(proveDellaSezione(proj).filter(v => !v.fisica).map(v => v.s.id));
                document.getElementById('sceltaProveSezione').open = proveDellaSezione(proj).length <= 8;
                document.getElementById('modalSezioneOverlay').classList.add('open');
                document.getElementById('modalSezione').classList.add('open');
                renderSezione();
            }

            document.getElementById('btnApriSezione').addEventListener('click', apriSezione);
            document.getElementById('btnSezioneA3d').addEventListener('click', () => apriVista3d());
            document.getElementById('btnChiudiSezione').addEventListener('click', closeAnyOpenModal);
            document.getElementById('proveSezione').addEventListener('click', (e) => {
                const b = e.target.closest('[data-prova]');
                if (!b || b.disabled) return;
                if (sezioneStato.escluse.has(b.dataset.prova)) sezioneStato.escluse.delete(b.dataset.prova);
                else sezioneStato.escluse.add(b.dataset.prova);
                renderSezione();
            });
            document.getElementById('btnProveSezioneTutte').addEventListener('click', () => { sezioneStato.escluse = new Set(); renderSezione(); });
            document.getElementById('btnProveSezioneNessuna').addEventListener('click', () => {
                sezioneStato.escluse = new Set(proveDellaSezione(state.projects[state.currentProjectId]).map(v => v.s.id));
                renderSezione();
            });
            document.getElementById('opzioniSezione').addEventListener('click', (e) => {
                const b = e.target.closest('[data-opzione]');
                if (!b || b.disabled) return;
                sezioneStato[b.dataset.opzione] = !sezioneStato[b.dataset.opzione];
                renderSezione();
            });
            document.getElementById('rngEsagSezione').addEventListener('input', (e) => { sezioneStato.esagV = Number(e.target.value); ridisegnaSezione(); });
            document.getElementById('btnEsagAutoSezione').addEventListener('click', () => { sezioneStato.esagV = null; renderSezione(); });
            document.getElementById('rngScalaHSezione').addEventListener('input', (e) => { sezioneStato.scalaH = Number(e.target.value); ridisegnaSezione(); });
            document.getElementById('graficoSezione').addEventListener('click', (e) => {
                const col = e.target.closest('.sezione-colonna');
                if (col) apriFumettoProva(col.dataset.prova, e.clientX, e.clientY);
            });
            document.getElementById('btnScaricaSezione').addEventListener('click', () => {
                const svg = document.querySelector('#graficoSezione svg');
                if (!svg) return;
                // Il file va letto anche fuori dall'app: colori e caratteri al posto delle variabili.
                const testo = svg.outerHTML.replace(/var\(--bg-card, #fff\)/g, '#ffffff').replace(/var\(--accent, #0d9488\)/g, '#0d9488').replace(/currentColor/g, '#1f2937').replace(/var\(--font-mono\), monospace/g, 'monospace');
                const nome = (state.projects[state.currentProjectId].name || 'progetto').replace(/[^\w\-]+/g, '_');
                scaricaBlobFile(new Blob([testo], { type: 'image/svg+xml' }), `Sezione_${nome}.svg`);
            });

            // ---- Il fumetto di una prova: grafico dei colpi e dati essenziali, in sovraimpressione ----
            // Un clic su una colonna (sezione o 3D) lo apre vicino al punto; un altro clic altrove lo
            // chiude, a meno che non sia bloccato col suo tasto: allora resta, si sposta trascinandolo
            // per il titolo e se ne possono tenere più d'uno. Si chiudono tutti con la finestra.

            function htmlFumettoProva(proj, surv) {
                const h = surv.header || {}, logs = surv.logs || [];
                const fasce = colonnaStratigrafica(logs, proj.strati);
                const fondo = Math.max(0, ...fasce.map(f => f.a));
                const q = quotaDellaProva(proj, h);
                const falda = parseFloat(h.faldaDa);
                const nMax = massimoTondo(Math.max(1, ...logs.map(l => parseFloat(l.colpi) || 0)));
                const Wg = 170, Hg = 190, gx = 34, gy = 8, gw = Wg - gx - 8, gh = Hg - gy - 22;
                const Yp = m => gy + (m / Math.max(fondo, 0.2)) * gh;
                let g = `<svg viewBox="0 0 ${Wg} ${Hg}" width="${Wg}" height="${Hg}" aria-label="Colpi per profondità" style="font-family: var(--font-mono), monospace;">`;
                fasce.forEach(f => { g += `<rect x="${gx - 10}" y="${Yp(f.da)}" width="8" height="${Math.max(0.5, Yp(f.a) - Yp(f.da))}" fill="${f.colore}"/>`; });
                const passo = massimoTondo(fondo / 5);
                for (let m = 0; m <= fondo + 0.001; m += passo) g += `<line x1="${gx}" y1="${Yp(m)}" x2="${gx + gw}" y2="${Yp(m)}" stroke="currentColor" stroke-opacity="0.12"/><text x="${gx - 13}" y="${Yp(m) + 3.5}" text-anchor="end" font-size="10" fill="currentColor">${numeroConVirgola(m, m % 1 ? 1 : 0)}</text>`;
                g += `<line x1="${gx}" y1="${gy}" x2="${gx}" y2="${gy + gh}" stroke="currentColor" stroke-opacity="0.5"/>`;
                g += `<path d="${pathColpi(logs, gx, gw, nMax, Yp)}" fill="none" stroke="var(--accent, #0d9488)" stroke-width="1.8"/>`;
                if (isFinite(falda) && falda <= fondo) g += `<line x1="${gx}" y1="${Yp(falda)}" x2="${gx + gw}" y2="${Yp(falda)}" stroke="#3b82f6" stroke-dasharray="4 3"/>`;
                g += `<text x="${gx}" y="${Hg - 6}" font-size="10" fill="currentColor">0</text><text x="${gx + gw}" y="${Hg - 6}" text-anchor="end" font-size="10" fill="currentColor">N ${nMax}</text></svg>`;
                const righe = [
                    q !== null ? ['Quota', numeroConVirgola(q, 1) + ' m s.l.m.'] : null,
                    ['Profondità', numeroConVirgola(fondo, 2) + ' m'],
                    ['Intervalli', String(logs.length)],
                    ['Falda', isFinite(falda) ? numeroConVirgola(falda, 2) + ' m' : 'non indicata'],
                    isFinite(parseFloat(h.lat)) ? ['GPS', `${parseFloat(h.lat).toFixed(5)}, ${parseFloat(h.lng).toFixed(5)}`] : null,
                    h.date ? ['Data', formattaDataIT(h.date)] : null
                ].filter(Boolean);
                return `<div class="fumetto-testa"><strong>${escapeHtmlDidascalia(nomeDpsh(surv))}</strong>
                        <button type="button" class="fumetto-blocca" aria-pressed="false" title="Blocca: resta aperto e si sposta"><svg class="ico"><use href="#i-lock"/></svg></button>
                        <button type="button" class="fumetto-chiudi" title="Chiudi" aria-label="Chiudi"><svg class="ico"><use href="#i-x"/></svg></button></div>
                    <div class="fumetto-corpo">${g}<div class="fumetto-dati">${righe.map(r => `<div><span>${r[0]}</span><strong>${escapeHtmlDidascalia(r[1])}</strong></div>`).join('')}
                        <div class="fumetto-strati">${fasce.map(f => `<div><i style="background:${f.colore}"></i>${escapeHtmlDidascalia(f.nome)} <span>${numeroConVirgola(f.da, 1)}–${numeroConVirgola(f.a, 1)}</span></div>`).join('')}</div></div></div>`;
            }

            function apriFumettoProva(survId, x, y) {
                const proj = state.projects[state.currentProjectId], surv = proj.surveys[survId];
                if (!surv) return;
                document.querySelectorAll('.fumetto-prova:not(.bloccato)').forEach(f => f.remove());
                const f = document.createElement('div');
                f.className = 'fumetto-prova';
                f.dataset.prova = survId;
                f.innerHTML = htmlFumettoProva(proj, surv);
                document.body.appendChild(f);
                const w = f.offsetWidth || 360, hh = f.offsetHeight || 260;
                f.style.left = Math.max(8, Math.min(x + 14, window.innerWidth - w - 8)) + 'px';
                f.style.top = Math.max(8, Math.min(y - 20, window.innerHeight - hh - 8)) + 'px';
                requestAnimationFrame(() => f.classList.add('visibile'));
            }
            function chiudiFumetti(ancheBloccati) {
                document.querySelectorAll(ancheBloccati ? '.fumetto-prova' : '.fumetto-prova:not(.bloccato)').forEach(f => f.remove());
            }
            document.addEventListener('click', (e) => {
                const f = e.target.closest('.fumetto-prova');
                if (f) {
                    if (e.target.closest('.fumetto-chiudi')) f.remove();
                    else if (e.target.closest('.fumetto-blocca')) {
                        const b = f.classList.toggle('bloccato');
                        f.querySelector('.fumetto-blocca').setAttribute('aria-pressed', String(b));
                    }
                    return;
                }
                if (!e.target.closest('.sezione-colonna, #graficoVista3d')) chiudiFumetti(false); // nel 3D decide la vista
            });
            // Trascinare un fumetto bloccato per il titolo.
            document.addEventListener('pointerdown', (e) => {
                const testa = e.target.closest('.fumetto-prova.bloccato .fumetto-testa');
                if (!testa || e.target.closest('button')) return;
                const f = testa.parentElement, dx = e.clientX - f.offsetLeft, dy = e.clientY - f.offsetTop;
                const muovi = (ev) => { f.style.left = (ev.clientX - dx) + 'px'; f.style.top = (ev.clientY - dy) + 'px'; };
                const lascia = () => { document.removeEventListener('pointermove', muovi); document.removeEventListener('pointerup', lascia); };
                document.addEventListener('pointermove', muovi);
                document.addEventListener('pointerup', lascia);
            });
            // Chiusa la finestra della sezione o del 3D, via anche i fumetti.
            ['modalSezione', 'modalVista3d'].forEach(id => new MutationObserver(() => {
                if (!document.querySelector('#modalSezione.open, #modalVista3d.open')) chiudiFumetti(true);
            }).observe(document.getElementById(id), { attributes: true, attributeFilter: ['class'] }));
