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
            function xlsxLettere(c) { let s = ''; while (c > 0) { s = String.fromCharCode(65 + (c - 1) % 26) + s; c = Math.floor((c - 1) / 26); } return s; }

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

            /** Scrive le prove nel progetto scelto (progId, oppure 'nuovo'). Ritorna { progetto, nProve }. */
            function scriviProveDaExcel(lett, opz) {
                if (!state.projects) state.projects = {};
                let proj;
                if (opz.destinazione === 'nuovo' || !state.projects[opz.destinazione]) {
                    const id = `PROJ_${Date.now()}`;
                    proj = state.projects[id] = {
                        id, name: opz.nomeProgetto, comune: '', committente: '', localita: '', operator: (state.settings && state.settings.operator) || '',
                        date: new Date().toISOString().split('T')[0], updatedAt: Date.now(), surveys: {}, strati: []
                    };
                } else {
                    proj = state.projects[opz.destinazione];
                    if (state.currentProjectId === proj.id) { try { syncStateToProject(); } catch (e) { ignoraErrore('importaExcel/sync', e); } }
                }
                if (!Array.isArray(proj.strati)) proj.strati = [];
                const idStrato = new Map();
                lett.strati.forEach((s, i) => {
                    const gia = proj.strati.find(x => x.name.trim().toLowerCase() === s.nome.trim().toLowerCase());
                    if (gia) { idStrato.set(s.chiave, gia.id); return; }
                    const id = `strato_${Date.now()}_${i}`;
                    proj.strati.push({ id, name: s.nome, color: opz.coloriExcel && s.hex ? s.hex : COLORI_APP_STRATI[(proj.strati.length) % COLORI_APP_STRATI.length], parametriAvanzati: {} });
                    idStrato.set(s.chiave, id);
                });
                const base = Date.now(); let k = 0;
                lett.prove.forEach(p => {
                    const num = (/(\d+)\s*$/.exec(p.nome) || [])[1] || String(Object.keys(proj.surveys).length + 1);
                    const id = `SURV_${num}_${base}_${k++}`;
                    const header = { ...JSON.parse(JSON.stringify(state.header)), committente: proj.committente || '', comune: proj.comune || '', localita: proj.localita || '', date: proj.date, provaNr: num,
                        faldaDa: p.falda != null ? String(p.falda) : '', faldaA: p.falda != null ? String(p.falda) : '', lat: null, lng: null, alt: null, acc: null };
                    delete header.spostamento; delete header.interpretazioneDi;
                    const logs = []; let ultimo = null;
                    p.intervalli.forEach((iv, i) => {
                        const fine = Math.round(iv.fineCm) / 100, inizio = Math.round(iv.inizioCm) / 100;
                        const log = { start: inizio, end: fine, colpi: iv.colpi, asta: Math.max(1, Math.ceil(fine - 1e-9)), note: '' };
                        const st = iv.strato ? iv.strato.chiave : null;
                        if (st && st !== ultimo) { log.lithology = idStrato.get(st); ultimo = st; }
                        logs.push(log);
                    });
                    if (p.rifiutoCm !== null) logs[logs.length - 1].note = `Rifiuto alla penetrazione a ${(Math.round(p.rifiutoCm) / 100).toFixed(2).replace('.', ',')} m (dal file Excel)`;
                    const fineUltimo = logs[logs.length - 1].end;
                    proj.surveys[id] = {
                        id, header, instrument: JSON.parse(JSON.stringify(state.instrument)), settings: JSON.parse(JSON.stringify(state.settings)),
                        currentCount: 0, currentDepthStart: fineUltimo, currentRod: Math.floor(fineUltimo + 1e-9) + 1,
                        logs, photos: [], reportTemplateId: null, templateImages: {}, updatedAt: Date.now()
                    };
                });
                proj.updatedAt = Date.now();
                if (state.currentProjectId === proj.id) state.strati = JSON.parse(JSON.stringify(proj.strati));
                return { progetto: proj, nProve: lett.prove.length };
            }

            async function importaProveDaExcel(file) {
                if (!file) return;
                let lett;
                try {
                    lett = interpretaFoglioProve(await leggiXlsx(new Uint8Array(await file.arrayBuffer())));
                } catch (e) { await appAlert('Non riesco a leggere questo Excel: ' + e.message + '\n\nNon è stato importato niente.'); return; }
                const nInt = lett.prove.reduce((a, p) => a + p.intervalli.length, 0);
                const nRif = lett.prove.filter(p => p.rifiutoCm !== null).length;
                const righe = [
                    `Trovate ${lett.prove.length} prove (${lett.prove[0].nome} … ${lett.prove[lett.prove.length - 1].nome}), ${nInt} intervalli da ${lett.passo} cm.`,
                    `Rifiuto in ${nRif} prove: lo segno come nota sull'ultimo intervallo.`,
                    `Strati: ${lett.strati.length}` + (lett.strati.length ? ' (' + lett.strati.map(s => s.nome).join('; ') + ')' : '') + '.',
                    lett.falde.size ? `Falda: ${Array.from(lett.falde, ([n, v]) => `${n} a ${String(v).replace('.', ',')} m`).join('; ')}.` : 'Nessuna falda indicata.',
                    'Restano da compilare a mano: coordinate, strumento e intestazioni.'
                ];
                if (lett.avvisi.length) righe.push('\nDa controllare:\n· ' + lett.avvisi.join('\n· '));
                const progetti = Object.values(state.projects || {}).filter(p => p && p.id);
                const nomeBase = file.name.replace(/\.xlsx$/i, '');
                const scelta = await appPromptCampi(righe.join('\n'), [
                    { name: 'destinazione', label: 'Dove metto le prove?', type: 'select', value: 'nuovo', options: [{ value: 'nuovo', label: `Nuovo progetto «${nomeBase}»` }, ...progetti.map(p => ({ value: p.id, label: `Aggiungi a «${p.name || p.id}»` }))] },
                    { name: 'colori', label: 'Colori degli strati', type: 'select', value: 'excel', options: [{ value: 'excel', label: 'Quelli dell\'Excel' }, { value: 'app', label: 'Colori dell\'app (li cambi dopo in Strati)' }] }
                ], { title: 'Importa prove da Excel', okLabel: 'Importa' });
                if (!scelta) return;
                try {
                    const esito = scriviProveDaExcel(lett, { destinazione: scelta.destinazione, nomeProgetto: nomeBase, coloriExcel: scelta.colori === 'excel' });
                    saveState();
                    if (typeof renderHomeProjects === 'function') renderHomeProjects();
                    mostraToast(`Importate ${esito.nProve} prove in «${esito.progetto.name}»`);
                } catch (e) { await appAlert('Importazione interrotta: ' + e.message); }
            }

            (function () {
                const btn = document.getElementById('btnHomeImportExcel'), inp = document.getElementById('fileImportExcel');
                if (!btn || !inp) return;
                btn.addEventListener('click', () => { inp.value = ''; inp.click(); });
                inp.addEventListener('change', e => { const f = e.target.files[0]; inp.value = ''; importaProveDaExcel(f); });
            })();
