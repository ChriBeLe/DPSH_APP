            // ===================== IMPORTA PROVE DA UN EXCEL =====================
            // Un foglio .xlsx con una colonna per ogni prova (riga 1 = nome: DPSH1, DPSH2…), la
            // profondità in cm nella colonna A (una riga ogni 20 cm) e i colpi nelle celle. Il colore
            // di sfondo di ogni cella dice lo strato; una legenda (cella colorata vuota + testo nella
            // cella a destra) dà il nome del terreno. «RIFIUTO» chiude la prova. Una nota «DPSHn» +
            // «falda da -4,5 m» in due celle accanto dà la falda di quella prova.
            // Prima di scrivere mostra cosa ha trovato e chiede dove metterle e che colori usare.
            // Offline: lo xlsx è uno ZIP, aperto col motore del browser (leggiZipCompresso, 071s).

            const XLSX_SERVONO = /^xl\/(workbook\.xml|styles\.xml|sharedStrings\.xml|theme\/theme1\.xml|_rels\/workbook\.xml\.rels|worksheets\/[^\/]+\.xml)$/;

            function xlsxColonna(rif) { // 'AB12' -> { c: 28, r: 12 }
                const m = /^([A-Z]+)(\d+)$/.exec(rif); let c = 0;
                for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64;
                return { c, r: parseInt(m[2], 10) };
            }

            /** Colore con la tinta di Excel (tint da -1 a 1) sulla luminosità HSL. */
            function xlsxApplicaTinta(hex, tint) {
                if (!tint) return hex;
                let r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
                const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0, l = (mx + mn) / 2;
                if (mx !== mn) {
                    const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
                    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6;
                }
                l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint;
                const f = (p, q, t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
                let R, G, B;
                if (s === 0) R = G = B = l; else { const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; R = f(p, q, h + 1 / 3); G = f(p, q, h); B = f(p, q, h - 1 / 3); }
                return [R, G, B].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
            }

            /** Legge il primo foglio: { celle: Map('r,c' -> {v, t, chiave, hex}) }. chiave = colore di
             * sfondo normalizzato ('' se nessuno), hex = il colore vero (#rrggbb) o null. */
            async function leggiXlsx(bytes) {
                const per = await leggiZipCompresso(bytes, XLSX_SERVONO);
                const xml = nome => {
                    const d = per.get(nome); if (!d) return null;
                    const doc = new DOMParser().parseFromString(new TextDecoder().decode(d), 'application/xml');
                    if (doc.querySelector('parsererror')) throw new Error('Il file Excel è rovinato.');
                    return doc;
                };
                const el = (doc, tag) => doc ? Array.from(doc.getElementsByTagNameNS('*', tag)) : [];
                // Foglio: il primo del workbook, altrimenti sheet1.
                let nomeFoglio = 'xl/worksheets/sheet1.xml';
                const wb = xml('xl/workbook.xml'), rels = xml('xl/_rels/workbook.xml.rels');
                if (wb && rels) {
                    const s1 = el(wb, 'sheet')[0];
                    const rid = s1 && (s1.getAttribute('r:id') || s1.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'));
                    const rel = el(rels, 'Relationship').find(x => x.getAttribute('Id') === rid);
                    if (rel) nomeFoglio = 'xl/' + rel.getAttribute('Target').replace(/^\/?(xl\/)?/, '');
                }
                const foglio = xml(nomeFoglio);
                if (!foglio) throw new Error('Non è un file Excel (.xlsx) che so leggere.');
                const condivise = el(xml('xl/sharedStrings.xml'), 'si').map(si => el(si, 't').map(t => t.textContent).join(''));
                // Colori del tema: 0 chiaro1, 1 scuro1, 2 chiaro2, 3 scuro2, 4–9 accenti.
                const tema = [];
                const cs = xml('xl/theme/theme1.xml');
                if (cs) {
                    const sch = el(cs, 'clrScheme')[0];
                    const col = n => { const e = sch && Array.from(sch.children).find(c => c.localName === n); const f = e && e.firstElementChild; return f ? (f.getAttribute('val') !== 'window' && f.getAttribute('val') !== 'windowText' ? (f.getAttribute('lastClr') || f.getAttribute('val')) : (f.getAttribute('val') === 'window' ? 'FFFFFF' : '000000')) : '000000'; };
                    const ord = ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6'];
                    ord.forEach(n => tema.push(col(n)));
                }
                const stili = xml('xl/styles.xml');
                const sfondi = el(el(stili, 'fills')[0], 'fill').map(f => {
                    const pat = el(f, 'patternFill')[0];
                    if (!pat || pat.getAttribute('patternType') !== 'solid') return null;
                    const fg = el(pat, 'fgColor')[0]; if (!fg) return null;
                    if (fg.hasAttribute('rgb')) { const h = fg.getAttribute('rgb').slice(-6).toUpperCase(); return { chiave: 'rgb:' + h, hex: '#' + h.toLowerCase() }; }
                    if (fg.hasAttribute('theme')) {
                        const t = parseInt(fg.getAttribute('theme'), 10), tint = parseFloat(fg.getAttribute('tint') || '0');
                        return { chiave: 'tema:' + t + ':' + tint.toFixed(2), hex: '#' + xlsxApplicaTinta(tema[t] || '808080', tint) };
                    }
                    if (fg.hasAttribute('indexed')) return { chiave: 'idx:' + fg.getAttribute('indexed'), hex: null };
                    return null;
                });
                const xfs = el(el(stili, 'cellXfs')[0], 'xf').map(x => sfondi[parseInt(x.getAttribute('fillId') || '0', 10)] || null);
                const celle = new Map();
                for (const c of el(foglio, 'c')) {
                    const { c: col, r: riga } = xlsxColonna(c.getAttribute('r'));
                    const t = c.getAttribute('t'), vEl = c.getElementsByTagNameNS('*', 'v')[0];
                    let v = null;
                    if (t === 'inlineStr') v = el(c, 't').map(x => x.textContent).join('');
                    else if (vEl) v = t === 's' ? condivise[parseInt(vEl.textContent, 10)] : (t === 'str' || t === 'e' || t === 'b') ? vEl.textContent : parseFloat(vEl.textContent);
                    const sf = xfs[parseInt(c.getAttribute('s') || '0', 10)];
                    if (v === null && !sf) continue;
                    celle.set(riga + ',' + col, { v, chiave: sf ? sf.chiave : '', hex: sf ? sf.hex : null });
                }
                return celle;
            }

            /** Cosa dice il foglio: { prove, strati, avvisi, falde } senza toccare niente. */
            function interpretaFoglioProve(celle) {
                const get = (r, c) => celle.get(r + ',' + c);
                const val = (r, c) => { const x = get(r, c); return x ? x.v : null; };
                let maxR = 0, maxC = 0; celle.forEach((_, k) => { const [r, c] = k.split(',').map(Number); maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); });
                const avvisi = [];
                const colonne = [];
                for (let c = 2; c <= maxC; c++) { const n = val(1, c); if (typeof n === 'string' && n.trim()) colonne.push({ c, nome: n.trim() }); }
                if (colonne.length === 0) throw new Error('Non trovo i nomi delle prove nella prima riga (DPSH1, DPSH2…): questo Excel non ha la forma che so leggere.');
                // Profondità: colonna A in cm. Il passo è la prima differenza.
                const righe = [];
                for (let r = 2; r <= maxR; r++) { const d = val(r, 1); if (typeof d === 'number') righe.push({ r, d }); }
                if (righe.length < 2) throw new Error('Non trovo le profondità nella prima colonna.');
                const passo = righe[1].d - righe[0].d;
                if (!(passo > 0)) throw new Error('Le profondità nella prima colonna non crescono.');
                const profRiga = new Map(); // riga -> fine intervallo in cm (griglia regolare)
                righe.forEach((x, i) => {
                    const atteso = righe[0].d + i * passo;
                    profRiga.set(x.r, atteso);
                    if (x.d !== atteso) avvisi.push(`Cella A${x.r}: c'è ${x.d} dove la serie dei ${passo} cm vorrebbe ${atteso}. Ho usato ${atteso} cm (i colpi di quella riga restano a quella riga).`);
                });
                // Legenda: cella colorata vuota con un testo nella cella a destra.
                const legenda = new Map(); // chiave -> testo
                celle.forEach((x, k) => {
                    if (!x.chiave || x.v !== null) return;
                    const [r, c] = k.split(',').map(Number);
                    const dx = get(r, c + 1);
                    if (dx && typeof dx.v === 'string' && dx.v.trim() && !legenda.has(x.chiave)) legenda.set(x.chiave, dx.v.trim());
                });
                const strati = []; // { chiave, nome, hex, nellaLegenda }
                const strato = (chiave, hex) => {
                    let s = strati.find(x => x.chiave === chiave);
                    if (!s) {
                        const t = legenda.get(chiave);
                        s = { chiave, hex, nome: t ? t.charAt(0).toUpperCase() + t.slice(1) : null, nellaLegenda: !!t, usi: 0 };
                        strati.push(s);
                    }
                    return s;
                };
                // Falde: «DPSHn» in una cella e «falda da -4,5 m» nella cella a destra.
                const falde = new Map();
                celle.forEach((x, k) => {
                    if (typeof x.v !== 'string') return;
                    const [r, c] = k.split(',').map(Number); const dx = get(r, c + 1);
                    const m = dx && typeof dx.v === 'string' && /falda[^\d-]*(-?\s*\d+(?:[.,]\d+)?)/i.exec(dx.v);
                    if (m && /^DPSH\s*\d+/i.test(x.v.trim())) falde.set(x.v.trim().toUpperCase().replace(/\s+/g, ''), Math.abs(parseFloat(m[1].replace(/\s+/g, '').replace(',', '.'))));
                });
                const prove = colonne.map(col => {
                    const intervalli = []; let rifiuto = null, dopoRifiuto = false;
                    for (let r = righe[0].r; r <= maxR; r++) {
                        if (!profRiga.has(r)) continue;
                        const x = get(r, col.c), fine = profRiga.get(r);
                        if (!x || x.v === null) { continue; }
                        if (typeof x.v === 'string' && /rifiut/i.test(x.v)) { if (rifiuto === null) rifiuto = fine; continue; }
                        if (typeof x.v !== 'number') continue;
                        if (rifiuto !== null) { dopoRifiuto = true; continue; }
                        const st = x.chiave ? strato(x.chiave, x.hex) : null;
                        intervalli.push({ fineCm: fine, colpi: x.v, strato: st });
                    }
                    if (dopoRifiuto) avvisi.push(`${col.nome}: ci sono numeri dopo «RIFIUTO»; li ho ignorati.`);
                    if (intervalli.length === 0) avvisi.push(`${col.nome}: nessun colpo trovato, la salto.`);
                    const prima = intervalli[0] ? intervalli[0].fineCm - passo : 0;
                    intervalli.forEach((iv, i) => { iv.inizioCm = i === 0 ? prima : intervalli[i - 1].fineCm; if (iv.strato) iv.strato.usi++; });
                    return { nome: col.nome, intervalli, rifiutoCm: rifiuto, falda: falde.get(col.nome.toUpperCase().replace(/\s+/g, '')) ?? null };
                }).filter(p => p.intervalli.length > 0);
                if (prove.length === 0) throw new Error('Non ho trovato nessun colpo nel foglio.');
                strati.forEach((s, i) => { if (!s.nome) s.nome = `Strato ${i + 1} (colore non in legenda)`; if (!s.nellaLegenda) avvisi.push(`Il colore dello strato «${s.nome}» non è nella legenda: gli ho dato un nome provvisorio, rinominalo dopo.`); });
                return { prove, strati, avvisi, passo, falde };
            }

            const COLORI_APP_STRATI = ['#fbbf24', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#14b8a6', '#ec4899'];
            const esc = t => escapeHtmlDidascalia(String(t == null ? '' : t));

            /** Scrive nel progetto le prove del modello deciso nel pannello (modello.prove con
             * incluso/nome/falda, modello.strati con usa/nome/hex/unisciA). */
            function scriviProveDaExcel(modello) {
                if (!state.projects) state.projects = {};
                let proj;
                if (modello.destinazione === 'nuovo' || !state.projects[modello.destinazione]) {
                    const id = `PROJ_${Date.now()}`;
                    proj = state.projects[id] = {
                        id, name: modello.nomeProgetto, comune: '', committente: '', localita: '', operator: (state.settings && state.settings.operator) || '',
                        date: new Date().toISOString().split('T')[0], updatedAt: Date.now(), surveys: {}, strati: []
                    };
                } else {
                    proj = state.projects[modello.destinazione];
                    if (state.currentProjectId === proj.id) { try { syncStateToProject(); } catch (e) { ignoraErrore('importaExcel/sync', e); } }
                }
                if (!Array.isArray(proj.strati)) proj.strati = [];
                const perChiave = new Map(modello.strati.map(s => [s.chiave, s]));
                const idStrato = new Map(); // chiave -> id strato del progetto (o null = nessuno)
                const risolvi = (chiave, giri = 0) => {
                    if (idStrato.has(chiave)) return idStrato.get(chiave);
                    const st = perChiave.get(chiave);
                    let r = null;
                    if (st && st.usa) {
                        if (st.unisciA && giri < 5) {
                            if (st.unisciA.startsWith('es:')) r = st.unisciA.slice(3);
                            else r = risolvi(st.unisciA.slice(2), giri + 1);
                        } else {
                            const nome = st.nome.trim() || 'Strato';
                            const gia = proj.strati.find(x => x.name.trim().toLowerCase() === nome.toLowerCase());
                            if (gia) r = gia.id;
                            else {
                                r = `strato_${Date.now()}_${proj.strati.length}`;
                                proj.strati.push({ id: r, name: nome, color: st.hex || COLORI_APP_STRATI[proj.strati.length % COLORI_APP_STRATI.length], parametriAvanzati: {} });
                            }
                        }
                    }
                    idStrato.set(chiave, r);
                    return r;
                };
                const base = Date.now(); let k = 0, n = 0;
                modello.prove.filter(p => p.incluso).forEach(p => {
                    const num = (p.nome.match(/(\d+[A-Za-z]?)\s*$/) || [])[1] || String(Object.keys(proj.surveys).length + 1);
                    const id = `SURV_${num}_${base}_${k++}`;
                    const falda = p.falda !== '' && p.falda != null && isFinite(parseFloat(String(p.falda).replace(',', '.'))) ? String(parseFloat(String(p.falda).replace(',', '.'))) : '';
                    const header = { ...JSON.parse(JSON.stringify(state.header)), committente: proj.committente || '', comune: proj.comune || '', localita: proj.localita || '', date: proj.date, provaNr: num,
                        faldaDa: falda, faldaA: falda, lat: null, lng: null, alt: null, acc: null };
                    delete header.spostamento; delete header.interpretazioneDi;
                    const logs = []; let ultimo = null;
                    p.intervalli.forEach(iv => {
                        const log = { start: Math.round(iv.inizioCm) / 100, end: Math.round(iv.fineCm) / 100, colpi: iv.colpi, asta: Math.max(1, Math.ceil(Math.round(iv.fineCm) / 100 - 1e-9)), note: '' };
                        const sid = iv.strato ? risolvi(iv.strato.chiave) : null;
                        if (sid && sid !== ultimo) { log.lithology = sid; ultimo = sid; }
                        logs.push(log);
                    });
                    if (p.rifiutoCm !== null) logs[logs.length - 1].note = `Rifiuto alla penetrazione a ${(Math.round(p.rifiutoCm) / 100).toFixed(2).replace('.', ',')} m (dal file Excel)`;
                    const fineUltimo = logs[logs.length - 1].end;
                    proj.surveys[id] = {
                        id, header, instrument: JSON.parse(JSON.stringify(state.instrument)), settings: JSON.parse(JSON.stringify(state.settings)),
                        currentCount: 0, currentDepthStart: fineUltimo, currentRod: Math.floor(fineUltimo + 1e-9) + 1,
                        logs, photos: [], reportTemplateId: null, templateImages: {}, updatedAt: Date.now()
                    };
                    n++;
                });
                proj.updatedAt = Date.now();
                if (state.currentProjectId === proj.id) state.strati = JSON.parse(JSON.stringify(proj.strati));
                return { progetto: proj, nProve: n };
            }

            /** Pannello a tutto schermo riusabile: titolo, corpo (elemento) e bottoni in fondo.
             * Un bottone con fn che ritorna false lascia il pannello aperto. */
            function pannelloApp({ titolo, corpo, bottoni }) {
                const ov = document.createElement('div');
                ov.style.cssText = 'position:fixed;inset:0;z-index:9800;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:10px;';
                const box = document.createElement('div');
                box.style.cssText = 'background:var(--bg-card);color:var(--text-main);border:1px solid var(--border);border-radius:14px;width:100%;max-width:720px;max-height:94vh;display:flex;flex-direction:column;overflow:hidden;';
                box.innerHTML = `<div style="padding:12px 14px;font-weight:800;font-size:15px;border-bottom:1px solid var(--border);">${esc(titolo)}</div><div class="pa-corpo" style="padding:12px 14px;overflow:auto;flex:1;"></div><div class="pa-piede" style="padding:10px 14px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;"></div>`;
                box.querySelector('.pa-corpo').appendChild(corpo);
                const chiudi = () => ov.remove();
                bottoni.forEach(b => {
                    const el = document.createElement('button');
                    el.type = 'button'; el.className = 'btn-action'; el.textContent = b.testo; if (b.id) el.id = b.id;
                    el.style.cssText = b.primario ? 'font-weight:800;' : 'background:var(--bg-main);color:var(--text-main);border:1px solid var(--border);';
                    el.addEventListener('click', async () => { if (!b.fn || (await b.fn(el)) !== false) chiudi(); });
                    box.querySelector('.pa-piede').appendChild(el);
                });
                ov.appendChild(box); document.body.appendChild(ov);
                return { ov, box, chiudi };
            }
            const STILE_CAMPO = 'font-size:13px;padding:6px 8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-main);color:var(--text-main);box-sizing:border-box;';

            function svgColonnaProva(p, scala, maxColpi, colori) {
                const W = 84, H = Math.max(40, Math.ceil(scala.profMax * scala.k) + 4);
                let g = '';
                p.intervalli.forEach(iv => {
                    const y = iv.inizioCm / 100 * scala.k, h = Math.max(1.5, (iv.fineCm - iv.inizioCm) / 100 * scala.k - 0.6);
                    const w = Math.max(2, Math.min(iv.colpi, maxColpi) / maxColpi * (W - 6));
                    g += `<rect x="3" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${iv.strato ? (colori.get(iv.strato.chiave) || '#94a3b8') : '#94a3b8'}"/>`;
                });
                const yr = v => (v / 100 * scala.k).toFixed(1);
                if (p.rifiutoCm !== null) g += `<line x1="0" x2="${W}" y1="${yr(p.rifiutoCm)}" y2="${yr(p.rifiutoCm)}" stroke="#ef4444" stroke-width="2"/><text x="${W - 3}" y="${(p.rifiutoCm / 100 * scala.k - 2).toFixed(1)}" font-size="9" fill="#ef4444" text-anchor="end" font-weight="700">RIFIUTO</text>`;
                const f = parseFloat(String(p.falda).replace(',', '.'));
                if (isFinite(f) && f > 0) g += `<line x1="0" x2="${W}" y1="${(f * scala.k).toFixed(1)}" y2="${(f * scala.k).toFixed(1)}" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4 3"/>`;
                return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;background:var(--bg-main);border-radius:6px;">${g}</svg>`;
            }

            async function importaProveDaExcel(file) {
                if (!file) return;
                let lett;
                try { lett = interpretaFoglioProve(await leggiXlsx(new Uint8Array(await file.arrayBuffer()))); }
                catch (e) { await appAlert('Non riesco a leggere questo Excel: ' + e.message + '\n\nNon è stato importato niente.'); return; }
                const nomeBase = file.name.replace(/\.xlsx$/i, '');
                const progetti = Object.values(state.projects || {}).filter(p => p && p.id);
                const modello = {
                    destinazione: 'nuovo', nomeProgetto: nomeBase,
                    strati: lett.strati.map(s => ({ ...s, usa: true, unisciA: '' })),
                    prove: lett.prove.map(p => ({ ...p, incluso: true, falda: p.falda != null ? String(p.falda) : '' }))
                };
                const profMax = Math.max(...modello.prove.map(p => Math.max(p.rifiutoCm || 0, p.intervalli[p.intervalli.length - 1].fineCm))) / 100;
                const scala = { profMax, k: Math.min(26, 190 / profMax) };
                const maxColpi = Math.max(30, ...modello.prove.flatMap(p => p.intervalli.map(i => Math.min(i.colpi, 60))));
                const corpo = document.createElement('div');
                const disegna = () => {
                    const colori = new Map(modello.strati.map(s => [s.chiave, s.usa ? s.hex : '#94a3b8']));
                    const stratiDest = (modello.destinazione !== 'nuovo' && state.projects[modello.destinazione]) ? (state.projects[modello.destinazione].strati || []) : [];
                    const nInc = modello.prove.filter(p => p.incluso).length;
                    corpo.innerHTML = `
                    <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">${esc(file.name)} · ${lett.prove.length} colonne trovate, un intervallo ogni ${lett.passo} cm. Decidi tu cosa entra.</div>
                    <div style="font-weight:800;font-size:13px;margin:6px 0;">1 · Dove metto le prove</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                        <select data-az="dest" style="${STILE_CAMPO}flex:1;min-width:180px;"><option value="nuovo"${modello.destinazione === 'nuovo' ? ' selected' : ''}>Nuovo progetto</option>${progetti.map(p => `<option value="${esc(p.id)}"${modello.destinazione === p.id ? ' selected' : ''}>Aggiungi a «${esc(p.name || p.id)}»</option>`).join('')}</select>
                        ${modello.destinazione === 'nuovo' ? `<input data-az="nomeProg" value="${esc(modello.nomeProgetto)}" placeholder="Nome del progetto" style="${STILE_CAMPO}flex:1;min-width:160px;">` : ''}
                    </div>
                    <div style="font-weight:800;font-size:13px;margin:14px 0 6px;">2 · Gli strati (i colori delle celle)</div>
                    <div style="display:flex;flex-direction:column;gap:6px;">
                    ${modello.strati.map((s, i) => `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;border:1px solid var(--border);border-radius:8px;padding:6px;opacity:${s.usa ? 1 : .5};">
                        <input type="checkbox" data-az="usa" data-i="${i}" ${s.usa ? 'checked' : ''} title="Usa questo strato">
                        <input type="color" data-az="hex" data-i="${i}" value="${esc(s.hex || '#94a3b8')}" style="width:34px;height:28px;padding:0;border:none;background:none;">
                        <input data-az="nomeStrato" data-i="${i}" value="${esc(s.nome)}" style="${STILE_CAMPO}flex:1;min-width:150px;">
                        <span style="font-size:11px;color:var(--text-muted);">${s.usi} interv.${s.nellaLegenda ? '' : ' · non in legenda'}</span>
                        <select data-az="unisci" data-i="${i}" style="${STILE_CAMPO}max-width:190px;"><option value="">Strato a sé</option>
                            ${modello.strati.filter((t, j) => j !== i && t.usa && !t.unisciA).map(t => `<option value="k:${esc(t.chiave)}"${s.unisciA === 'k:' + t.chiave ? ' selected' : ''}>Unisci a «${esc(t.nome.slice(0, 30))}»</option>`).join('')}
                            ${stratiDest.map(t => `<option value="es:${esc(t.id)}"${s.unisciA === 'es:' + t.id ? ' selected' : ''}>Unisci a «${esc(t.name.slice(0, 30))}» (già nel progetto)</option>`).join('')}</select>
                    </div>`).join('')}
                    </div>
                    <div style="margin-top:6px;"><button type="button" class="btn-action" data-az="coloriApp" style="background:var(--bg-main);color:var(--text-main);border:1px solid var(--border);font-size:11px;padding:5px 9px;">Usa i colori dell'app al posto di quelli dell'Excel</button></div>
                    <div style="font-weight:800;font-size:13px;margin:14px 0 2px;">3 · Le prove (una colonna ciascuna)</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">Ogni barra è un intervallo: lunghezza = colpi, colore = strato, riga rossa = rifiuto, riga azzurra tratteggiata = falda. Tocca la spunta per escludere una prova.</div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px;">
                    ${modello.prove.map((p, i) => `<div style="border:1px solid var(--border);border-radius:8px;padding:6px;opacity:${p.incluso ? 1 : .4};">
                        <div style="display:flex;gap:5px;align-items:center;margin-bottom:4px;"><input type="checkbox" data-az="inc" data-i="${i}" ${p.incluso ? 'checked' : ''}><input data-az="nomeProva" data-i="${i}" value="${esc(p.nome)}" style="${STILE_CAMPO}width:100%;min-width:0;padding:3px 5px;font-weight:700;"></div>
                        ${svgColonnaProva(p, scala, maxColpi, colori)}
                        <div style="font-size:10.5px;color:var(--text-muted);margin:4px 0;">${p.intervalli.length} interv. · ${(p.intervalli[p.intervalli.length - 1].fineCm / 100).toFixed(1).replace('.', ',')} m${p.rifiutoCm !== null ? ' · rifiuto' : ''}</div>
                        <label style="font-size:10.5px;color:var(--text-muted);display:flex;gap:4px;align-items:center;">falda m <input data-az="falda" data-i="${i}" value="${esc(p.falda)}" inputmode="decimal" style="${STILE_CAMPO}width:100%;min-width:0;padding:3px 5px;"></label>
                    </div>`).join('')}
                    </div>
                    ${lett.avvisi.length ? `<div style="margin-top:12px;font-size:12px;border:1px solid #f59e0b;border-radius:8px;padding:8px;"><strong>Da controllare</strong><br>· ${lett.avvisi.map(esc).join('<br>· ')}</div>` : ''}
                    <div style="margin-top:12px;font-size:12px;font-weight:700;" id="rigaEsitoExcel">Verranno create ${nInc} prove ${modello.destinazione === 'nuovo' ? `in un nuovo progetto «${esc(modello.nomeProgetto)}»` : 'nel progetto scelto'}. Coordinate, strumento e intestazioni restano da compilare.</div>`;
                };
                disegna();
                const rigaEsito = () => { const el = corpo.querySelector('#rigaEsitoExcel'); if (el) el.firstChild.textContent = el.textContent; };
                corpo.addEventListener('change', e => {
                    const t = e.target, az = t.dataset.az, i = parseInt(t.dataset.i, 10);
                    if (az === 'dest') { modello.destinazione = t.value; modello.strati.forEach(s => { if (s.unisciA.startsWith('es:')) s.unisciA = ''; }); disegna(); }
                    else if (az === 'nomeProg') { modello.nomeProgetto = t.value; }
                    else if (az === 'usa') { modello.strati[i].usa = t.checked; modello.strati.forEach(s => { if (s.unisciA === 'k:' + modello.strati[i].chiave && !t.checked) s.unisciA = ''; }); disegna(); }
                    else if (az === 'hex') { modello.strati[i].hex = t.value; disegna(); }
                    else if (az === 'nomeStrato') { modello.strati[i].nome = t.value; }
                    else if (az === 'unisci') { modello.strati[i].unisciA = t.value; disegna(); }
                    else if (az === 'inc') { modello.prove[i].incluso = t.checked; disegna(); }
                    else if (az === 'nomeProva') { modello.prove[i].nome = t.value; }
                    else if (az === 'falda') { modello.prove[i].falda = t.value; disegna(); }
                });
                corpo.addEventListener('click', e => {
                    if (e.target.dataset && e.target.dataset.az === 'coloriApp') { modello.strati.forEach((s, i) => { s.hex = COLORI_APP_STRATI[i % COLORI_APP_STRATI.length]; }); disegna(); }
                });
                pannelloApp({
                    titolo: 'Importa prove da Excel', corpo,
                    bottoni: [
                        { testo: 'Annulla' },
                        { testo: 'Importa', primario: true, id: 'btnConfermaImportExcel', fn: async () => {
                            if (!modello.prove.some(p => p.incluso)) { await appAlert('Nessuna prova selezionata.'); return false; }
                            try {
                                const esito = scriviProveDaExcel(modello);
                                saveState();
                                if (typeof renderHomeProjects === 'function') renderHomeProjects();
                                mostraToast(`Importate ${esito.nProve} prove in «${esito.progetto.name}»`);
                            } catch (e) { await appAlert('Importazione interrotta: ' + e.message); return false; }
                        } }
                    ]
                });
            }

            (function () {
                const btn = document.getElementById('btnHomeImportExcel'), inp = document.getElementById('fileImportExcel');
                if (!btn || !inp) return;
                btn.addEventListener('click', () => { inp.value = ''; inp.click(); });
                inp.addEventListener('change', e => { const f = e.target.files[0]; inp.value = ''; importaProveDaExcel(f); });
            })();
