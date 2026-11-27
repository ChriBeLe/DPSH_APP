            // ===================== IL DISEGNO LIBERO COME TAVOLA =====================
            // Una tavola vuota (1400 × 860) con righe, frecce, rettangoli e testi, che non prende dati
            // dalle prove. Sta in proj.tavole3d.liberi: [{ id, nome, forme: [{ t, x1, y1, x2, y2, testo, colore }] }].
            // Si salva, si blocca, va nel report e nel registro come le altre tavole.
            const FORME_LIBERE = ['riga', 'freccia', 'rettangolo', 'testo', 'misura', 'scala'];
            const PX_PER_M_LIBERO = 100; // la scala di partenza: 100 px = 1 m (il foglio è 14 m × 8,6 m)
            const pxPerMLibero = lib => { const n = Number(lib && lib.pxPerM); return n > 0.1 && n < 100000 ? n : PX_PER_M_LIBERO; };
            const MISURA_LIBERA = { W: 1400, H: 860 };
            const coloreLibero = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#111827';
            const numLibero = (n, d) => Number.isFinite(Number(n)) ? Math.max(-5000, Math.min(5000, Number(n))) : d;
            /** Una forma ripulita (dall'utente o dall'assistente): tipo noto, numeri veri, colore valido, testo corto. */
            function formaLiberaPulita(f) {
                if (!f || FORME_LIBERE.indexOf(f.t) < 0) return null;
                return { t: f.t, x1: numLibero(f.x1, 0), y1: numLibero(f.y1, 0), x2: numLibero(f.x2, f.x1), y2: numLibero(f.y2, f.y1), testo: String(f.testo || '').slice(0, 300), colore: coloreLibero(f.colore) };
            }
            function svgFormaLibera(f, i, scelta, pxm) {
                const c = coloreLibero(f.colore), ev = scelta ? ' stroke-dasharray="6 4"' : '', id = ` data-forma="${i}"`;
                if (f.t === 'riga' || f.t === 'freccia') {
                    const dx = f.x2 - f.x1, dy = f.y2 - f.y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, p = 14;
                    const testa = f.t === 'freccia' ? `<path d="M${f.x2} ${f.y2} L${f.x2 - ux * p - uy * p * 0.5} ${f.y2 - uy * p + ux * p * 0.5} L${f.x2 - ux * p + uy * p * 0.5} ${f.y2 - uy * p - ux * p * 0.5} Z" fill="${c}"/>` : '';
                    return `<g${id}><line x1="${f.x1}" y1="${f.y1}" x2="${f.x2}" y2="${f.y2}" stroke="${c}" stroke-width="3"${ev}/>${testa}<line x1="${f.x1}" y1="${f.y1}" x2="${f.x2}" y2="${f.y2}" stroke="transparent" stroke-width="18"/></g>`;
                }
                if (f.t === 'misura') {
                    const dx = f.x2 - f.x1, dy = f.y2 - f.y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L * 8, ny = dx / L * 8, m = L / (pxm || PX_PER_M_LIBERO);
                    const mx = (f.x1 + f.x2) / 2 + nx * 2.2, my = (f.y1 + f.y2) / 2 + ny * 2.2 + 8;
                    return `<g${id}><line x1="${f.x1}" y1="${f.y1}" x2="${f.x2}" y2="${f.y2}" stroke="${c}" stroke-width="2"${ev}/><line x1="${f.x1 - nx}" y1="${f.y1 - ny}" x2="${f.x1 + nx}" y2="${f.y1 + ny}" stroke="${c}" stroke-width="2"/><line x1="${f.x2 - nx}" y1="${f.y2 - ny}" x2="${f.x2 + nx}" y2="${f.y2 + ny}" stroke="${c}" stroke-width="2"/><text x="${mx}" y="${my}" font-size="26" text-anchor="middle" fill="${c}" font-family="Helvetica, Arial, sans-serif">${numeroConVirgola(m, 2)} m</text><line x1="${f.x1}" y1="${f.y1}" x2="${f.x2}" y2="${f.y2}" stroke="transparent" stroke-width="18"/></g>`;
                }
                if (f.t === 'scala') {
                    const m = Number(f.testo) > 0 ? Number(f.testo) : 5, w = m * (pxm || PX_PER_M_LIBERO), x = f.x1, y = f.y1;
                    return `<g${id}><rect x="${x}" y="${y - 6}" width="${w / 2}" height="12" fill="${c}"/><rect x="${x + w / 2}" y="${y - 6}" width="${w / 2}" height="12" fill="#fff" stroke="${c}" stroke-width="2"/><text x="${x}" y="${y - 14}" font-size="22" fill="${c}" font-family="Helvetica, Arial, sans-serif">0</text><text x="${x + w}" y="${y - 14}" font-size="22" text-anchor="end" fill="${c}" font-family="Helvetica, Arial, sans-serif">${numeroConVirgola(m, 0)} m</text></g>`;
                }
                if (f.t === 'rettangolo') return `<rect${id} x="${Math.min(f.x1, f.x2)}" y="${Math.min(f.y1, f.y2)}" width="${Math.abs(f.x2 - f.x1)}" height="${Math.abs(f.y2 - f.y1)}" fill="none" stroke="${c}" stroke-width="3"${ev}/>`;
                return `<text${id} x="${f.x1}" y="${f.y1}" font-size="32" fill="${c}" font-family="Helvetica, Arial, sans-serif"${scelta ? ' text-decoration="underline"' : ''}>${testoSicuro(f.testo || 'Testo')}</text>`;
            }
            /** Il disegno intero come SVG (per la finestra: `modifica` aggiunge l'indice della forma scelta). */
            function svgTavolaLibera(lib, scelta) {
                const { W, H } = MISURA_LIBERA;
                return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${((lib && lib.forme) || []).map((f, i) => svgFormaLibera(f, i, i === scelta, pxPerMLibero(lib))).join('')}</svg>`;
            }
            const liberoPerId = (mem, id) => ((mem && mem.liberi) || []).find(x => x.id === id) || null;
            async function telaLibera(voce, d, opz) {
                const proj = state.projects[state.currentProjectId], W = opz.W || 1400, H = opz.H || 860;
                const mem = (tavole3d.bozza && tavole3d.bozzaProgetto === state.currentProjectId ? tavole3d.bozza : proj.tavole3d) || {};
                const img = await immagineDaSvg3d(svgTavolaLibera(liberoPerId(mem, voce.id)));
                const scala = opz.scala || 2, tela = document.createElement('canvas');
                tela.width = Math.round(W * scala); tela.height = Math.round(H * scala);
                const g = tela.getContext('2d'); g.scale(scala, scala); g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
                const k = Math.min(W / img.width, H / img.height); g.drawImage(img, (W - img.width * k) / 2, (H - img.height * k) / 2, img.width * k, img.height * k);
                return tela;
            }
            /** L'editor nella finestra: il foglio è una SVG con le forme; strumento scelto + trascina per disegnare o spostare. */
            const stato_libero = { strumento: 'seleziona', scelta: -1, colore: '#111827' };
            function mostraLibero3d(v, tela, img) {
                const mem = memoriaTavole3d(), lib = liberoPerId(mem, v.id), box = img.parentElement;
                let sv = T3('tavole3dLiberoSvg');
                if (!sv) { sv = document.createElement('div'); sv.id = 'tavole3dLiberoSvg'; sv.style.cssText = 'touch-action:none;background:#fff;line-height:0'; box.appendChild(sv); }
                tela.hidden = true; img.hidden = true; sv.hidden = false; T3('tavole3dPianta').hidden = true; box.classList.remove('con-pianta', 'pianta-sopra');
                tavole3d.piantaViva = null; tavole3d.ridisegnaPianta = null;
                document.querySelectorAll('.tavole-pianta-maniglia').forEach(m => { m.hidden = true; });
                sv.innerHTML = svgTavolaLibera(lib, stato_libero.scelta);
                const s = sv.firstChild, k = Math.min((box.clientWidth || 800) / MISURA_LIBERA.W, (box.clientHeight || 500) / MISURA_LIBERA.H) || 0.5;
                s.style.width = Math.round(MISURA_LIBERA.W * k) + 'px'; s.style.height = Math.round(MISURA_LIBERA.H * k) + 'px';
                T3('tavole3dLiberoBarra').hidden = false; T3('tavole3dLiberoScala').value = pxPerMLibero(lib);
                s.onpointerdown = e => {
                    if (tavolaBloccata3d(v)) { if (typeof mostraToast === 'function') mostraToast('La tavola è bloccata: sbloccala prima.'); return; }
                    const r = s.getBoundingClientRect(), pt = ev => [Math.round((ev.clientX - r.left) / r.width * MISURA_LIBERA.W), Math.round((ev.clientY - r.top) / r.height * MISURA_LIBERA.H)];
                    const [x, y] = pt(e), st = stato_libero.strumento;
                    if (st === 'seleziona') {
                        const g = e.target.closest && e.target.closest('[data-forma]'); stato_libero.scelta = g ? Number(g.dataset.forma) : -1;
                        const f = lib.forme[stato_libero.scelta];
                        if (f) {
                            const dx0 = x, dy0 = y, copia = Object.assign({}, f);
                            s.setPointerCapture(e.pointerId);
                            s.onpointermove = ev => { const [mx, my] = pt(ev); f.x1 = copia.x1 + mx - dx0; f.x2 = copia.x2 + mx - dx0; f.y1 = copia.y1 + my - dy0; f.y2 = copia.y2 + my - dy0; salvaMemoriaTavole3d(); sv.innerHTML = svgTavolaLibera(lib, stato_libero.scelta); const s2 = sv.firstChild; s2.style.width = s.style.width; s2.style.height = s.style.height; s2.onpointerdown = s.onpointerdown; s2.onpointermove = s.onpointermove; s2.onpointerup = s.onpointerup; };
                            s.onpointerup = () => { s.onpointermove = null; mostraTavola3d(); };
                        } else mostraTavola3d();
                        return;
                    }
                    if (st === 'testo') {
                        appPrompt('', '', { title: 'Testo', label: 'Cosa scrivere', okLabel: 'Aggiungi' }).then(tx => { if (tx && tx.trim()) { lib.forme.push(formaLiberaPulita({ t: 'testo', x1: x, y1: y, testo: tx, colore: stato_libero.colore })); stato_libero.scelta = lib.forme.length - 1; salvaMemoriaTavole3d(); mostraTavola3d(); } });
                        return;
                    }
                    if (st === 'scala') { lib.forme.push(formaLiberaPulita({ t: 'scala', x1: x, y1: y, x2: x, y2: y, testo: '5', colore: stato_libero.colore })); stato_libero.scelta = lib.forme.length - 1; salvaMemoriaTavole3d(); mostraTavola3d(); return; }
                    const nuova = formaLiberaPulita({ t: st, x1: x, y1: y, x2: x, y2: y, colore: stato_libero.colore }); lib.forme.push(nuova); stato_libero.scelta = lib.forme.length - 1;
                    s.setPointerCapture(e.pointerId);
                    s.onpointermove = ev => { const [mx, my] = pt(ev); nuova.x2 = mx; nuova.y2 = my; sv.innerHTML = svgTavolaLibera(lib, stato_libero.scelta); const s2 = sv.firstChild; s2.style.width = s.style.width; s2.style.height = s.style.height; s2.onpointerdown = s.onpointerdown; s2.onpointermove = s.onpointermove; s2.onpointerup = s.onpointerup; };
                    s.onpointerup = () => { s.onpointermove = null; if (Math.hypot(nuova.x2 - nuova.x1, nuova.y2 - nuova.y1) < 4) { lib.forme.pop(); stato_libero.scelta = -1; } salvaMemoriaTavole3d(); mostraTavola3d(); };
                };
            }
            function eliminaFormaLibera3d() {
                const v = tavole3d.voci[tavole3d.scelta]; if (!v || v.tipo !== 'libero' || tavolaBloccata3d(v)) return;
                const lib = liberoPerId(memoriaTavole3d(), v.id); if (!lib || !lib.forme[stato_libero.scelta]) return;
                lib.forme.splice(stato_libero.scelta, 1); stato_libero.scelta = -1; salvaMemoriaTavole3d(); mostraTavola3d();
            }
            function aggiungiLibero3d() {
                const mem = memoriaTavole3d(), n = (mem.liberi || []).length + 1, id = 'libero-' + Date.now().toString(36);
                (mem.liberi = mem.liberi || []).push({ id, nome: `Disegno libero ${n}`, forme: [] });
                stato_libero.scelta = -1; salvaMemoriaTavole3d(); apriTavole3d(false, true);
                const i = tavole3d.voci.findIndex(v => v.id === id); if (i >= 0) { tavole3d.scelta = i; renderElencoTavole3d(); mostraTavola3d(); }
                statoSalvataggioTavole3d();
            }

            /** La scala del disegno: quanti pixel del foglio fanno un metro (le misure si ricalcolano da sole). */
            function impostaScalaLibero3d(valore) {
                const v = tavole3d.voci[tavole3d.scelta]; if (!v || v.tipo !== 'libero' || tavolaBloccata3d(v)) return;
                const lib = liberoPerId(memoriaTavole3d(), v.id), n = Number(String(valore).replace(',', '.'));
                if (!lib || !(n > 0.1 && n < 100000)) return;
                lib.pxPerM = n; salvaMemoriaTavole3d(); mostraTavola3d();
            }
