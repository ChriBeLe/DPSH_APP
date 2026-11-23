            // ===================== GPS DI TUTTE LE PROVE (dalla schermata del progetto) =====================
            // Un pannello con una riga per prova (latitudine, longitudine) e l'importazione di un
            // KML/KMZ/GPX: ogni punto del file viene abbinato da solo a una prova dal numero o dal
            // nome («DPSH 3», «Prova 3», «3», «P3»…). Quello che non si abbina in modo sicuro (nessuna
            // prova, più prove possibili, due punti per la stessa prova) resta «da assegnare» e lo
            // assegna l'utente con una tendina. Niente si scrive finché non si preme «Salva».

            const provaNrChiave = nr => String(nr == null ? '' : nr).trim().toLowerCase().replace(/\s+/g, '');
            function ordinaProve(proj) {
                const v = Object.values(proj.surveys || {});
                return v.sort((a, b) => String(a.header && a.header.provaNr).localeCompare(String(b.header && b.header.provaNr), 'it', { numeric: true }));
            }

            /** Il numero di prova che un nome di punto dichiara, o null se non è sicuro: «DPSH 12» /
             * «Prova 3B» / «P7» / «3» danno 12 / 3B / 7 / 3; un nome con più numeri e nessuna parola
             * guida è ambiguo. */
            function numeroDaNomePunto(nome) {
                const t = String(nome || '').toLowerCase();
                let m = /(?:dpsh|dpm|dpl|dp|prova|sondaggio|penetro\w*|pen|sd|p|s)[\s._\-n°#]*0*(\d+)\s*([a-z])?(?![a-z0-9])/.exec(t);
                if (m) return m[1] + (m[2] || '');
                const num = t.match(/\d+/g) || [];
                if (num.length === 1) { m = /0*(\d+)\s*([a-z])?(?![a-z0-9])/.exec(t); return m ? m[1] + (m[2] || '') : null; }
                return null;
            }

            /** Abbina i punti alle prove: ritorna array parallelo a `punti` con l'id della prova, o
             * '' se da assegnare, e un motivo per quelli non abbinati. */
            function abbinaPuntiAProve(punti, prove) {
                const perNr = new Map();
                prove.forEach(s => { const k = provaNrChiave(s.header && s.header.provaNr); if (!perNr.has(k)) perNr.set(k, []); perNr.get(k).push(s); });
                const esiti = punti.map(p => {
                    const nr = numeroDaNomePunto(p.name);
                    if (nr == null) return { id: '', motivo: 'nel nome non c\'è un numero di prova chiaro' };
                    const k = provaNrChiave(nr);
                    let cand = perNr.get(k);
                    if (!cand && /[a-z]$/.test(k)) cand = null;
                    if (!cand) { // «3» senza lettera: vale se c'è una sola prova 3, 3B ecc.
                        const dalNumero = prove.filter(s => provaNrChiave(s.header && s.header.provaNr).replace(/[a-z]+$/, '') === k.replace(/[a-z]+$/, ''));
                        cand = dalNumero.length === 1 ? dalNumero : null;
                    }
                    if (!cand) return { id: '', motivo: `nessuna prova numero ${nr}` };
                    if (cand.length > 1) return { id: '', motivo: `più prove con il numero ${nr}` };
                    return { id: cand[0].id, motivo: '' };
                });
                // Due punti sulla stessa prova: nessuno dei due è sicuro.
                const conta = new Map(); esiti.forEach(e => { if (e.id) conta.set(e.id, (conta.get(e.id) || 0) + 1); });
                esiti.forEach(e => { if (e.id && conta.get(e.id) > 1) { e.id = ''; e.motivo = 'più punti puntano alla stessa prova'; } });
                return esiti;
            }

            function numeroCoord(t) { const v = parseFloat(String(t).trim().replace(',', '.')); return isFinite(v) ? v : null; }

            function apriGpsDiTutteLeProve(projId) {
                const proj = state.projects && state.projects[projId];
                if (!proj) return;
                const prove = ordinaProve(proj);
                if (prove.length === 0) { appAlert('Questo progetto non ha ancora prove.'); return; }
                const righe = prove.map(s => ({ id: s.id, nr: s.header && s.header.provaNr, lat: s.header && s.header.lat != null ? String(s.header.lat) : '', lng: s.header && s.header.lng != null ? String(s.header.lng) : '', modificata: false, daFile: false }));
                const punti = []; const assegn = []; const motivi = [];
                const corpo = document.createElement('div');
                const valida = r => { const la = numeroCoord(r.lat), lo = numeroCoord(r.lng); return (r.lat === '' && r.lng === '') || (la !== null && lo !== null && Math.abs(la) <= 90 && Math.abs(lo) <= 180); };
                const ricalcola = () => {
                    righe.forEach(r => { r.daFile = false; });
                    punti.forEach((p, i) => {
                        const r = assegn[i] && righe.find(x => x.id === assegn[i]);
                        if (r && !r.modificata) { r.lat = String(p.lat); r.lng = String(p.lng); r.daFile = true; }
                    });
                };
                const disegna = () => {
                    corpo.innerHTML = `
                    <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">Scrivi le coordinate di ogni prova (gradi decimali, es. 40,19741 e 17,99213) oppure importa un file: i punti si abbinano da soli al numero o al nome, e quelli incerti li assegni tu.</div>
                    <button type="button" class="btn-action" data-az="file" style="background:var(--bg-main);color:var(--text-main);border:1px solid var(--border);margin-bottom:6px;"><svg class="ico"><use href="#i-upload"/></svg> Importa KML / KMZ / GPX</button>
                    <input type="file" data-az="inputFile" accept=".kml,.kmz,.gpx,.xml,text/xml,application/xml,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz" style="display:none;">
                    ${punti.length ? `<div style="font-weight:800;font-size:13px;margin:10px 0 6px;">Punti del file (${punti.length})</div>
                    <div style="display:flex;flex-direction:column;gap:5px;">${punti.map((p, i) => `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;border:1px solid ${assegn[i] ? 'var(--border)' : '#f59e0b'};border-radius:8px;padding:5px 7px;">
                        <div style="flex:1;min-width:140px;"><strong style="font-size:12px;">${esc(p.name)}</strong><br><span style="font-size:10.5px;color:var(--text-muted);">${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}${assegn[i] ? ' · abbinato' : ' · DA ASSEGNARE' + (motivi[i] ? ' (' + esc(motivi[i]) + ')' : '')}</span></div>
                        <select data-az="assegna" data-i="${i}" style="${STILE_CAMPO}max-width:170px;"><option value="">— nessuna prova —</option>${righe.map(r => `<option value="${esc(r.id)}"${assegn[i] === r.id ? ' selected' : ''}>Prova ${esc(r.nr)}</option>`).join('')}</select></div>`).join('')}</div>` : ''}
                    <div style="font-weight:800;font-size:13px;margin:12px 0 6px;">Le prove</div>
                    <div style="display:flex;flex-direction:column;gap:5px;">${righe.map((r, i) => `<div style="display:flex;gap:6px;align-items:center;">
                        <div style="width:78px;font-weight:700;font-size:12.5px;">Prova ${esc(r.nr)}</div>
                        <input data-az="lat" data-i="${i}" value="${esc(r.lat)}" placeholder="latitudine" inputmode="decimal" style="${STILE_CAMPO}flex:1;min-width:0;${valida(r) ? '' : 'border-color:#ef4444;'}${r.daFile ? 'background:var(--accent-soft);' : ''}">
                        <input data-az="lng" data-i="${i}" value="${esc(r.lng)}" placeholder="longitudine" inputmode="decimal" style="${STILE_CAMPO}flex:1;min-width:0;${valida(r) ? '' : 'border-color:#ef4444;'}${r.daFile ? 'background:var(--accent-soft);' : ''}">
                    </div>`).join('')}</div>`;
                };
                disegna();
                corpo.addEventListener('click', e => { const b = e.target.closest('[data-az="file"]'); if (b) corpo.querySelector('[data-az="inputFile"]').click(); });
                corpo.addEventListener('change', async e => {
                    const t = e.target, az = t.dataset.az, i = parseInt(t.dataset.i, 10);
                    if (az === 'lat' || az === 'lng') { righe[i][az] = t.value; righe[i].modificata = true; righe[i].daFile = false; disegna(); }
                    else if (az === 'assegna') { assegn[i] = t.value; ricalcola(); disegna(); }
                    else if (az === 'inputFile') {
                        const f = t.files[0]; if (!f) return;
                        try {
                            const testo = /\.kmz$/i.test(f.name) ? await leggiTestoKmz(f) : await f.text();
                            const trovati = parseGeoFileText(testo);
                            if (!trovati.length) { await appAlert('Nessuna coordinata trovata in questo file.'); return; }
                            punti.length = 0; assegn.length = 0; motivi.length = 0;
                            const esiti = abbinaPuntiAProve(trovati, prove);
                            trovati.forEach((p, k) => { punti.push(p); assegn.push(esiti[k].id); motivi.push(esiti[k].motivo); });
                            righe.forEach(r => { r.modificata = false; });
                            ricalcola(); disegna();
                        } catch (err) { await appAlert('Errore durante la lettura del file: ' + err.message); }
                    }
                });
                pannelloApp({
                    titolo: `Coordinate GPS · ${proj.name || proj.comune || 'progetto'}`, corpo,
                    bottoni: [
                        { testo: 'Annulla' },
                        { testo: 'Salva', primario: true, id: 'btnSalvaGpsProve', fn: async () => {
                            if (righe.some(r => !valida(r))) { await appAlert('Ci sono coordinate non valide (evidenziate in rosso): latitudine tra −90 e 90, longitudine tra −180 e 180.'); return false; }
                            let n = 0;
                            if (state.currentProjectId === projId) { try { syncStateToProject(); } catch (e) { ignoraErrore('gpsProve/sync', e); } }
                            righe.forEach(r => {
                                const s = proj.surveys[r.id]; if (!s) return;
                                const la = r.lat === '' ? null : numeroCoord(r.lat), lo = r.lng === '' ? null : numeroCoord(r.lng);
                                if (la === s.header.lat && lo === s.header.lng) return;
                                s.header.lat = la; s.header.lng = lo; if (la === null) { s.header.alt = null; s.header.acc = null; } s.updatedAt = Date.now(); n++;
                                if (state.currentProjectId === projId && state.currentSurveyId === r.id) { state.header.lat = la; state.header.lng = lo; }
                            });
                            proj.updatedAt = Date.now();
                            saveState();
                            try { updateUI(); } catch (e) { ignoraErrore('gpsProve/updateUI', e); }
                            mostraToast(n ? `Coordinate aggiornate su ${n} prove` : 'Nessuna coordinata cambiata');
                        } }
                    ]
                });
            }

            (function () {
                const b = document.getElementById('btnProgettoGps');
                if (b) b.addEventListener('click', () => apriGpsDiTutteLeProve(state.currentProjectId));
            })();
