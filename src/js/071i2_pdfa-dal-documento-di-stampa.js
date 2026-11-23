            // ===================== PDF/A DAL DOCUMENTO DI STAMPA =====================
            // Il PDF/A nasce dallo STESSO documento che va in stampa e che il Word legge (071i): lo
            // stesso aiuto (conDocumentoStampaMisurato) lo impagina in una cornice nascosta, e le
            // stesse foglie (raccogliFoglieWord: paragrafi, tabelle, riquadri, disegni) dicono cosa
            // c'è e dove. Qui, invece di scriverle in XML di Word, si scrivono come PDF:
            //  - il testo resta testo (copiabile, ricercabile), riga per riga, nella posizione misurata
            //    dal browser, coi caratteri incorporati nell'app (Carlito, Arimo, Tinos, Caladea);
            //  - tabelle e riquadri: sfondi e bordi letti dagli stili calcolati;
            //  - foto: i JPEG passano così come sono; grafici, mappe e icone diventano immagini RGB
            //    opache (come nel Word), senza trasparenze;
            //  - ogni foglio è una pagina della sua misura; il contenuto che scorre (Parametri avanzati)
            //    si spezza in pagine A4 senza tagliare le righe.
            // Lo scrittore (071i1) mette tutto nel file e gli dà i requisiti del PDF/A-2b.

            const PDFA_SCALA_RASTER = 2.5;        // circa 240 dpi, come il Word
            const PDFA_RASTER_MAX_PX = 3200;      // lato lungo massimo di un disegno ridisegnato
            const PDFA_ALIAS_FONT = {
                'arial': 'arial', 'helvetica': 'arial', 'helvetica neue': 'arial', 'sans-serif': 'arial', 'system-ui': 'arial', '-apple-system': 'arial',
                'segoe ui': 'arial', 'roboto': 'arial', 'manrope': 'arial', 'monospace': 'arial', 'courier new': 'arial', 'jetbrains mono': 'arial',
                'times new roman': 'times new roman', 'times': 'times new roman', 'serif': 'times new roman', 'georgia': 'times new roman',
                'calibri': 'calibri', 'cambria': 'cambria', 'cambria math': 'cambria math'
            };
            const PDFA_FONT_RISERVA = ['cambria math', 'arial', 'calibri', 'times new roman'];

            /** I caratteri incorporati (@font-face con dati WOFF2) del documento, o dell'app se il
             * documento non li porta. I dati si decodificano solo quando un carattere serve. */
            function fontIncorporatiPerPdfA(doc) {
                let css = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\n');
                if (css.indexOf('@font-face') < 0) { const el = document.getElementById('fontIncorporati'); css = el ? el.textContent : ''; }
                const fonti = [];
                const re = /@font-face\s*\{([^}]*)\}/g;
                let m;
                while ((m = re.exec(css))) {
                    const blocco = m[1];
                    const fam = /font-family\s*:\s*['"]?([^;'"]+?)['"]?\s*;/.exec(blocco);
                    const dati = /url\(\s*['"]?data:font\/(?:woff2|ttf|woff|otf)[^,]*;base64,([A-Za-z0-9+/=]+)/.exec(blocco);
                    if (!fam || !dati) continue;
                    const peso = parseInt((/font-weight\s*:\s*(\d+)/.exec(blocco) || [])[1], 10) || 400;
                    const corsivo = /font-style\s*:\s*italic/.test(blocco);
                    const b64 = dati[1];
                    fonti.push({ famiglia: fam[1].trim(), peso, corsivo, dati: () => Uint8Array.from(atob(b64), c => c.charCodeAt(0)) });
                }
                return fonti;
            }

            // ---------- La pagina in costruzione: operazioni di disegno in px del foglio ----------

            function nuovaPaginaPdf(ox, oy) {
                const ops = [];
                return {
                    ops, ox, oy,
                    rettangolo(x, y, w, h, col) { if (col && w > 0 && h > 0) ops.push({ t: 'r', x: x - ox, y: y - oy, w, h, col, top: y - oy, bottom: y - oy + h }); },
                    linea(x1, y1, x2, y2, sp, col, tratti) { ops.push({ t: 'l', x1: x1 - ox, y1: y1 - oy, x2: x2 - ox, y2: y2 - oy, sp, col, tratti, top: Math.min(y1, y2) - oy, bottom: Math.max(y1, y2) - oy }); },
                    testo(o) { ops.push(Object.assign({ t: 's' }, o, { x: o.x - ox, base: o.base - oy, top: o.top - oy, bottom: o.bottom - oy })); },
                    immagine(x, y, w, h, chiave, img) { ops.push({ t: 'i', x: x - ox, y: y - oy, w, h, chiave, img, top: y - oy, bottom: y - oy + h }); }
                };
            }

            // ---------- Colori, bordi, sfondi ----------

            /** Fonde il colore col bianco secondo l'opacità accumulata dagli antenati (niente trasparenza nel PDF/A). */
            function opacitaEffettivaPdf(ctx, el) {
                if (!ctx.pdfa.opacita) ctx.pdfa.opacita = new WeakMap();
                const memo = ctx.pdfa.opacita;
                const calcola = (e) => {
                    if (!e || e.nodeType !== 1) return 1;
                    if (memo.has(e)) return memo.get(e);
                    const v = (parseFloat(ctx.win.getComputedStyle(e).opacity) || 0) * calcola(e.parentElement);
                    const o = Number.isFinite(v) ? v : 1;
                    memo.set(e, o);
                    return o;
                };
                return Math.max(0, Math.min(1, calcola(el)));
            }
            function sbiadisciPdf(hex, op) {
                if (op >= 0.999) return hex;
                const c = [0, 2, 4].map(i => Math.round(255 - (255 - parseInt(hex.slice(i, i + 2), 16)) * op));
                return c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('').toUpperCase();
            }

            /** Sfondo e bordi di un elemento, nel rettangolo r. */
            function decorazioniPdf(ctx, pg, el, r, senzaSfondo) {
                const cs = ctx.win.getComputedStyle(el);
                const op = opacitaEffettivaPdf(ctx, el);
                const sfondo = senzaSfondo ? null : coloreWord(cs.backgroundColor);
                if (sfondo) pg.rettangolo(r.x, r.y, r.w, r.h, sbiadisciPdf(sfondo, op));
                const lato = (L) => {
                    const sp = parseFloat(cs['border' + L + 'Width']) || 0, st = cs['border' + L + 'Style'], col = coloreWord(cs['border' + L + 'Color']);
                    return sp > 0 && st !== 'none' && st !== 'hidden' && col ? { sp, st, col: sbiadisciPdf(col, op) } : null;
                };
                const T = lato('Top'), B = lato('Bottom'), Le = lato('Left'), Ri = lato('Right');
                const tratteggio = (b) => b.st === 'dashed' ? [b.sp * 3, b.sp * 3] : b.st === 'dotted' ? [b.sp, b.sp] : null;
                if (T) { const t = tratteggio(T); if (t) pg.linea(r.x, r.y + T.sp / 2, r.x + r.w, r.y + T.sp / 2, T.sp, T.col, t); else pg.rettangolo(r.x, r.y, r.w, T.sp, T.col); }
                if (B) { const t = tratteggio(B); if (t) pg.linea(r.x, r.y + r.h - B.sp / 2, r.x + r.w, r.y + r.h - B.sp / 2, B.sp, B.col, t); else pg.rettangolo(r.x, r.y + r.h - B.sp, r.w, B.sp, B.col); }
                if (Le) { const t = tratteggio(Le); if (t) pg.linea(r.x + Le.sp / 2, r.y, r.x + Le.sp / 2, r.y + r.h, Le.sp, Le.col, t); else pg.rettangolo(r.x, r.y, Le.sp, r.h, Le.col); }
                if (Ri) { const t = tratteggio(Ri); if (t) pg.linea(r.x + r.w - Ri.sp / 2, r.y, r.x + r.w - Ri.sp / 2, r.y + r.h, Ri.sp, Ri.col, t); else pg.rettangolo(r.x + r.w - Ri.sp, r.y, Ri.sp, r.h, Ri.col); }
            }

            // ---------- Testo ----------

            function pulisciTestoPdf(t) {
                return String(t).replace(/[    ]/g, ' ').replace(/[​-‍⁠﻿­]/g, '');
            }

            /** Il carattere dello stile calcolato: la prima famiglia dell'elenco che l'app ha incorporato. */
            async function fontePdfPerStile(ctx, cs) {
                const peso = parseInt(cs.fontWeight, 10) || (/bold/.test(cs.fontWeight) ? 700 : 400);
                const corsivo = /italic|oblique/.test(cs.fontStyle);
                const chiave = `${cs.fontFamily}|${peso >= 600 ? 7 : 4}|${corsivo ? 'i' : 'n'}`;
                if (!ctx.pdfa.fontPerStile) ctx.pdfa.fontPerStile = new Map();
                if (!ctx.pdfa.fontPerStile.has(chiave)) {
                    ctx.pdfa.fontPerStile.set(chiave, (async () => {
                        const famiglie = String(cs.fontFamily).split(',').map(f => f.trim().replace(/^["']|["']$/g, '').toLowerCase());
                        for (const fam of famiglie) {
                            const alias = PDFA_ALIAS_FONT[fam] || fam;
                            const f = await ctx.pdfa.scr.fonte(alias, peso, corsivo);
                            if (f) return { f, peso, corsivo };
                        }
                        const f = await ctx.pdfa.scr.fonte('arial', peso, corsivo);
                        return f ? { f, peso, corsivo } : null;
                    })());
                }
                return ctx.pdfa.fontPerStile.get(chiave);
            }

            /** Il testo diviso in tratti, ciascuno col suo carattere: se quello dello stile non ha un
             * simbolo (una freccia, un ≥) si prova con gli altri; ciò che nessuno ha diventa «?». */
            async function trattiPerFontePdf(ctx, testo, base) {
                const out = [];
                const aggiungi = (t, f) => { const u = out[out.length - 1]; if (u && u.f === f) u.t += t; else out.push({ t, f }); };
                for (const ch of testo) {
                    const cp = ch.codePointAt(0);
                    if (/\s/.test(ch)) { aggiungi(' ', base.f); continue; }
                    if (base.f.copre(cp)) { aggiungi(ch, base.f); continue; }
                    let scelto = null;
                    for (const nome of PDFA_FONT_RISERVA) {
                        const f = await ctx.pdfa.scr.fonte(nome, base.peso, base.corsivo);
                        if (f && f.copre(cp)) { scelto = f; break; }
                    }
                    if (scelto) aggiungi(ch, scelto);
                    else if (base.f.copre(63)) aggiungi('?', base.f);
                }
                return out;
            }

            /** Le parole di un nodo di testo con il rettangolo che il browser ha dato a ciascuna. */
            function paroleDelNodoPdf(ctx, nodo) {
                const t = nodo.textContent, rg = ctx.doc.createRange(), parole = [];
                const re = /\S+/g;
                let m;
                while ((m = re.exec(t))) {
                    rg.setStart(nodo, m.index); rg.setEnd(nodo, m.index + m[0].length);
                    const rr = Array.from(rg.getClientRects()).filter(r => r.width > 0 && r.height > 0);
                    if (!rr.length) continue;
                    if (rr.length === 1) { parole.push({ t: m[0], left: rr[0].left, right: rr[0].right, top: rr[0].top, bottom: rr[0].bottom }); continue; }
                    // Una parola spezzata fra due righe: carattere per carattere.
                    let gruppo = null;
                    for (let k = 0; k < m[0].length; k++) {
                        rg.setStart(nodo, m.index + k); rg.setEnd(nodo, m.index + k + 1);
                        const c = Array.from(rg.getClientRects()).find(r => r.width > 0 && r.height > 0);
                        if (!c) continue;
                        if (gruppo && Math.abs((c.top + c.bottom) / 2 - (gruppo.top + gruppo.bottom) / 2) < (gruppo.bottom - gruppo.top) / 2) { gruppo.t += m[0][k]; gruppo.right = c.right; }
                        else { gruppo = { t: m[0][k], left: c.left, right: c.right, top: c.top, bottom: c.bottom }; parole.push(gruppo); }
                    }
                }
                return parole;
            }

            /** Le righe di un nodo di testo: le parole sulla stessa quota. */
            function righeDelNodoPdf(ctx, nodo) {
                const righe = [];
                paroleDelNodoPdf(ctx, nodo).forEach(p => {
                    const r = righe[righe.length - 1];
                    if (r && Math.abs((p.top + p.bottom) / 2 - (r.top + r.bottom) / 2) < Math.max(2, (r.bottom - r.top) / 2) && p.left >= r.parole[r.parole.length - 1].right - 2) {
                        r.parole.push(p); r.top = Math.min(r.top, p.top); r.bottom = Math.max(r.bottom, p.bottom);
                    } else righe.push({ parole: [p], top: p.top, bottom: p.bottom });
                });
                return righe;
            }

            function decorazioneTestoPdf(ctx, el) {
                let sotto = false, barrato = false;
                for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
                    const d = ctx.win.getComputedStyle(e).textDecorationLine || '';
                    if (/underline/.test(d)) sotto = true;
                    if (/line-through/.test(d)) barrato = true;
                }
                return { sotto, barrato };
            }

            /** Scrive un nodo di testo: una riga per volta, nel punto e con la larghezza misurati. */
            async function testoDelNodoPdf(ctx, pg, nodo) {
                const el = nodo.parentElement;
                if (!el || !/\S/.test(nodo.textContent)) return;
                const cs = ctx.win.getComputedStyle(el);
                if (cs.visibility === 'hidden' || cs.visibility === 'collapse' || cs.display === 'none') return;
                const op = opacitaEffettivaPdf(ctx, el);
                if (op <= 0.01) return;
                const base = await fontePdfPerStile(ctx, cs);
                if (!base) return;
                const size = parseFloat(cs.fontSize) || 13;
                const colBase = coloreWord(cs.color) || '000000';
                const col = sbiadisciPdf(colBase, op);
                const dec = decorazioneTestoPdf(ctx, el);
                const ls = parseFloat(cs.letterSpacing) || 0;
                const prima = ctx.pdfa.primoTesto;
                for (const riga of righeDelNodoPdf(ctx, nodo)) {
                    const testi = riga.parole.map(p => pulisciTestoPdf(testoTrasformato(p.t, cs.textTransform)));
                    if (!testi.some(t => t)) continue;
                    const altezza = riga.bottom - riga.top;
                    const discesa = Math.round(base.f.discesa * size), ascesa = Math.round(base.f.ascesa * size);
                    // La riga di base: dal fondo del rettangolo del testo; se l'altezza non torna con le
                    // metriche del carattere (un carattere di riserva nella riga) si divide in proporzione.
                    const linea = Math.abs(altezza - (ascesa + discesa)) <= 1.5
                        ? riga.bottom - discesa
                        : riga.top + altezza * base.f.ascesa / (base.f.ascesa + base.f.discesa);
                    const sx = riga.parole[0].left, dx = riga.parole[riga.parole.length - 1].right;
                    const unica = testi.join(' ');
                    const trattiUnica = await trattiPerFontePdf(ctx, unica, base);
                    const naturale = trattiUnica.reduce((s, x) => s + x.f.larghezza(x.t, size), 0);
                    const misurata = dx - sx;
                    const scrivi = async (testo, x) => {
                        let cursore = x;
                        for (const tr of await trattiPerFontePdf(ctx, testo, base)) {
                            pg.testo({ txt: tr.t, x: cursore, base: linea, size, font: tr.f, col, top: riga.top, bottom: riga.bottom });
                            cursore += tr.f.larghezza(tr.t, size);
                        }
                    };
                    if (!ls && Math.abs(naturale - misurata) <= Math.max(0.8, misurata * 0.005)) await scrivi(unica, sx);
                    else for (let i = 0; i < riga.parole.length; i++) if (testi[i]) await scrivi(testi[i], riga.parole[i].left);
                    if (dec.sotto) pg.rettangolo(sx, linea + size * 0.1, misurata, Math.max(0.6, size / 16), col);
                    if (dec.barrato) pg.rettangolo(sx, linea - size * 0.3, misurata, Math.max(0.6, size / 16), col);
                    if (prima) prima.push({ riga: { sx, linea, size, f: base.f, col, top: riga.top, bottom: riga.bottom } });
                }
            }

            /** Il pallino o il numero di una voce d'elenco, a sinistra della prima riga. */
            async function marcatorePdf(ctx, pg, el, righeDaIndice) {
                const marcatore = marcatoreElencoWord(el);
                if (!marcatore || !righeDaIndice.length) return;
                const li = el.tagName === 'LI' ? el : el.parentElement;
                if (ctx.win.getComputedStyle(li).listStyleType === 'none') return;
                const p = righeDaIndice[0].riga;
                const tratti = await trattiPerFontePdf(ctx, marcatore, { f: p.f, peso: 400, corsivo: false });
                const larghezza = tratti.reduce((s, x) => s + x.f.larghezza(x.t, p.size), 0);
                let x = p.sx - larghezza - p.size * 0.4;
                for (const tr of tratti) { pg.testo({ txt: tr.t, x, base: p.linea, size: p.size, font: tr.f, col: p.col, top: p.top, bottom: p.bottom }); x += tr.f.larghezza(tr.t, p.size); }
            }

            /** Il contenuto in linea di un elemento: testo, immagini e sfondi dei pezzi evidenziati. */
            async function testoDelElementoPdf(ctx, pg, radice, nodi) {
                const visita = async (n) => {
                    if (n.nodeType === 3) { await testoDelNodoPdf(ctx, pg, n); return; }
                    if (n.nodeType !== 1 || nascostoWord(ctx, n)) return;
                    if (n.tagName === 'BR') return;
                    if (WORD_TAG_DISEGNO.has(n.tagName.toUpperCase())) {
                        const r = rettangoloWord(n);
                        if (r.w >= 1 && r.h >= 1) await immaginePdf(ctx, pg, { tipo: 'disegno', el: n, r });
                        return;
                    }
                    const cs = ctx.win.getComputedStyle(n);
                    if (/^inline/.test(cs.display)) {
                        const sf = coloreWord(cs.backgroundColor);
                        if (sf) Array.from(n.getClientRects()).forEach(r => pg.rettangolo(r.left, r.top, r.width, r.height, sbiadisciPdf(sf, opacitaEffettivaPdf(ctx, n))));
                    }
                    for (const c of n.childNodes) await visita(c);
                };
                for (const n of (nodi || radice.childNodes)) await visita(n);
            }

            /** Un paragrafo (o un elemento di sole righe di testo), col pallino se è una voce d'elenco. */
            async function paragrafoPdf(ctx, pg, el) {
                const righe = [];
                ctx.pdfa.primoTesto = righe;
                try { await testoDelElementoPdf(ctx, pg, el); } finally { ctx.pdfa.primoTesto = null; }
                righe.sort((a, b) => a.riga.top - b.riga.top || a.riga.sx - b.riga.sx);
                await marcatorePdf(ctx, pg, el, righe);
            }

            // ---------- Immagini ----------

            function byteDaDataUrlPdf(url) { return dataUrlToUint8Array(url).bytes; }

            /** JPEG diretto: serve un JPEG a tre componenti (RGB), non ruotato dall'EXIF. */
            function jpegDirettoPdf(bytes) {
                const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
                const dim = dimensioniJpeg(buf);
                if (!dim || orientamentoExifJpeg(buf) !== 1) return null;
                const v = new DataView(buf);
                let o = 2;
                while (o + 9 < v.byteLength) {
                    const m = v.getUint16(o, false);
                    if ((m & 0xFF00) !== 0xFF00) return null;
                    if (m >= 0xFFC0 && m <= 0xFFCF && m !== 0xFFC4 && m !== 0xFFC8 && m !== 0xFFCC) return v.getUint8(o + 9) === 3 && m <= 0xFFC2 ? dim : null;
                    o += 2 + v.getUint16(o + 2, false);
                }
                return null;
            }

            /** Dove cade e quale parte dell'immagine si vede, secondo object-fit e object-position. */
            function inquadraImmaginePdf(nw, nh, box, fit, pos) {
                const [px, py] = (String(pos || '50% 50%').match(/-?[\d.]+%/g) || ['50%', '50%']).map(v => parseFloat(v) / 100);
                const fx = Number.isFinite(px) ? px : 0.5, fy = Number.isFinite(py) ? py : 0.5;
                const intera = { sx: 0, sy: 0, sw: nw, sh: nh };
                if (fit === 'cover') {
                    const s = Math.max(box.w / nw, box.h / nh), sw = box.w / s, sh = box.h / s;
                    return { dx: box.x, dy: box.y, dw: box.w, dh: box.h, sx: (nw - sw) * fx, sy: (nh - sh) * fy, sw, sh, ritaglio: true };
                }
                let s = Math.min(box.w / nw, box.h / nh);
                if (fit === 'none') s = 1; else if (fit === 'scale-down') s = Math.min(1, s);
                if (fit === 'fill' || !fit) return Object.assign({ dx: box.x, dy: box.y, dw: box.w, dh: box.h }, intera);
                const dw = nw * s, dh = nh * s;
                return Object.assign({ dx: box.x + (box.w - dw) * fx, dy: box.y + (box.h - dh) * fy, dw, dh }, intera, { ritaglio: fit === 'none' && (dw > box.w + 0.5 || dh > box.h + 0.5) });
            }

            /** I byte RGB (senza alfa) di una tela già riempita di bianco. */
            function rgbDaTelaPdf(tela) {
                const d = tela.getContext('2d').getImageData(0, 0, tela.width, tela.height).data;
                const rgb = new Uint8Array(tela.width * tela.height * 3);
                for (let i = 0, j = 0; i < d.length; i += 4) { rgb[j++] = d[i]; rgb[j++] = d[i + 1]; rgb[j++] = d[i + 2]; }
                return rgb;
            }
            async function jpegDaTelaPdf(tela, qualita) {
                const blob = await new Promise(ok => tela.toBlob(ok, 'image/jpeg', qualita));
                return new Uint8Array(await blob.arrayBuffer());
            }

            /** Un <img> con la sua immagine: JPEG diretto, oppure ridisegnato (ritaglio, PNG, GIF, WebP, SVG). */
            async function immagineImgPdf(ctx, pg, el) {
                const src = el.currentSrc || el.src || '';
                if (!/^data:image\//i.test(src) || !el.naturalWidth) return false;
                const cs = ctx.win.getComputedStyle(el);
                const rc = rettangoloContenuto(ctx, el);
                if (rc.w < 0.5 || rc.h < 0.5) return true;
                const q = inquadraImmaginePdf(el.naturalWidth, el.naturalHeight, rc, cs.objectFit, cs.objectPosition);
                const op = opacitaEffettivaPdf(ctx, el);
                const chiave = `${src.length}:${src.slice(-64)}:${q.sx.toFixed(1)},${q.sy.toFixed(1)},${q.sw.toFixed(1)},${q.sh.toFixed(1)}`;
                if (!ctx.pdfa.imgCache) ctx.pdfa.imgCache = new Map();
                if (!ctx.pdfa.imgCache.has(chiave)) {
                    ctx.pdfa.imgCache.set(chiave, (async () => {
                        const intera = !q.ritaglio && q.sw === el.naturalWidth && q.sh === el.naturalHeight;
                        if (intera && /^data:image\/jpe?g/i.test(src) && op >= 0.999) {
                            const bytes = byteDaDataUrlPdf(src);
                            if (jpegDirettoPdf(bytes)) return { jpeg: bytes };
                        }
                        const s = Math.min(1, PDFA_RASTER_MAX_PX / Math.max(q.sw, q.sh));
                        const tela = document.createElement('canvas');
                        tela.width = Math.max(1, Math.round(q.sw * s)); tela.height = Math.max(1, Math.round(q.sh * s));
                        const g = tela.getContext('2d');
                        g.fillStyle = '#ffffff'; g.fillRect(0, 0, tela.width, tela.height);
                        g.globalAlpha = op;
                        g.drawImage(el, q.sx, q.sy, q.sw, q.sh, 0, 0, tela.width, tela.height);
                        // Le foto restano JPEG (poco peso), il resto è senza perdita.
                        const foto = /^data:image\/(jpe?g|webp)/i.test(src);
                        const img = foto ? { jpeg: await jpegDaTelaPdf(tela, 0.92) } : { rgb: rgbDaTelaPdf(tela), w: tela.width, h: tela.height };
                        tela.width = tela.height = 0;
                        return img;
                    })());
                }
                const img = await ctx.pdfa.imgCache.get(chiave);
                pg.immagine(q.dx, q.dy, q.dw, q.dh, chiave, img);
                return true;
            }

            /** Un pezzo disegnato (grafico, mappa, icona, foto con didascalia): un'immagine sola. */
            async function immaginePdf(ctx, pg, f) {
                const el = f.el;
                if (el.tagName === 'IMG' && await immagineImgPdf(ctx, pg, el)) return;
                // Un blocco foto che contiene solo un <img> grande quanto lui: si passa il JPEG com'è.
                if (el.tagName !== 'IMG' && el.querySelectorAll) {
                    const dentro = Array.from(el.querySelectorAll('img,svg,canvas,video')).filter(e => !f.togli || !f.togli.some(d => d.contains(e)));
                    const unico = dentro.length === 1 && dentro[0].tagName === 'IMG' ? dentro[0] : null;
                    if (unico) {
                        const ri = unico.getBoundingClientRect();
                        if (ri.width >= f.r.w * 0.95 && ri.height >= f.r.h * 0.95 && await immagineImgPdf(ctx, pg, unico)) return;
                    }
                }
                const fogli = [Object.assign({}, f, { r: f.r })];
                const lato = Math.max(f.r.w, f.r.h, 1);
                const scala = Math.min(PDFA_SCALA_RASTER, PDFA_RASTER_MAX_PX / lato);
                const { tela, conFoto } = await disegnaSuTelaWord(ctx, fogli, scala);
                const img = conFoto ? { jpeg: await jpegDaTelaPdf(tela, 0.9) } : { rgb: rgbDaTelaPdf(tela), w: tela.width, h: tela.height };
                tela.width = tela.height = 0;
                ctx.pdfa.contaDisegni = (ctx.pdfa.contaDisegni || 0) + 1;
                pg.immagine(f.r.x, f.r.y, f.r.w, f.r.h, 'd' + ctx.pdfa.contaDisegni, img);
            }

            // ---------- Foglie: tabelle, riquadri, contenuto ----------

            async function contenutoPdf(ctx, pg, el) {
                if (soloInLineaWord(ctx, el)) {
                    if (testoVisibileWord(el)) await paragrafoPdf(ctx, pg, el);
                    return;
                }
                const foglie = raccogliFoglieWord(ctx, el, []).filter(f => f.tipo !== 'vuoto');
                await foglieInPdf(ctx, pg, foglie);
            }

            async function scatolaPdf(ctx, pg, f) {
                const r = rettangoloWord(f.el);
                decorazioniPdf(ctx, pg, f.el, { x: r.x, y: r.y, w: r.w, h: Math.min(r.h, Math.max(0, ctx.limite - r.y)) });
                await contenutoPdf(ctx, pg, f.el);
            }

            async function tabellaPdf(ctx, pg, f) {
                const tab = f.el;
                const righe = Array.from(tab.rows).filter(r => !nascostoWord(ctx, r) && r.getBoundingClientRect().bottom <= ctx.limite + 1);
                const celle = righe.map(r => Array.from(r.cells).filter(c => !nascostoWord(ctx, c)));
                const rt = rettangoloWord(tab);
                // Sfondi (tabella e celle, anche ereditati da riga e gruppo), poi bordi, poi contenuto:
                // così un bordo condiviso fra due celle non lo copre lo sfondo della seconda.
                decorazioniPdf(ctx, pg, tab, { x: rt.x, y: rt.y, w: rt.w, h: Math.min(rt.h, Math.max(0, ctx.limite - rt.y)) });
                celle.flat().forEach(td => {
                    const r = rettangoloWord(td), sf = sfondoEffettivoWord(ctx, td, tab);
                    if (sf) pg.rettangolo(r.x, r.y, r.w, r.h, sbiadisciPdf(sf, opacitaEffettivaPdf(ctx, td)));
                });
                celle.flat().forEach(td => decorazioniPdf(ctx, pg, td, rettangoloWord(td), true));
                for (const td of celle.flat()) await contenutoPdf(ctx, pg, td);
            }

            async function foglieInPdf(ctx, pg, foglie) {
                for (const f of foglie) {
                    if (ctx.pdfa.annulla) ctx.pdfa.annulla();
                    if (f.tipo === 'paragrafo') await paragrafoPdf(ctx, pg, f.el);
                    else if (f.tipo === 'nodi') for (const n of f.nodi) await testoDelNodoPdf(ctx, pg, n);
                    else if (f.tipo === 'disegno') await immaginePdf(ctx, pg, f);
                    else if (f.tipo === 'tabella') await tabellaPdf(ctx, pg, f);
                    else if (f.tipo === 'scatola') await scatolaPdf(ctx, pg, f);
                }
            }

            // ---------- Fogli e contenuto che scorre ----------

            /** Un foglio del report: una pagina della stessa misura. */
            async function paginaDelFoglioPdf(ctx, foglio) {
                const rf = foglio.getBoundingClientRect();
                const pg = nuovaPaginaPdf(rf.left, rf.top);
                ctx.limite = rf.bottom + 0.5;
                // La carta intestata (071u) è lo sfondo del foglio.
                const carta = Array.from(foglio.children).find(c => c.classList && c.classList.contains('dpsh-carta'));
                const urlCarta = carta ? cartaDelFoglioWord(foglio) : null;
                if (urlCarta) {
                    const img = new Image();
                    img.src = urlCarta;
                    try { await img.decode(); } catch (e) { /* carta illeggibile: il foglio resta bianco */ }
                    if (img.naturalWidth) {
                        const rc = rettangoloWord(carta);
                        const chiave = 'carta:' + urlCarta.length + ':' + urlCarta.slice(-48);
                        if (!ctx.pdfa.imgCache) ctx.pdfa.imgCache = new Map();
                        if (!ctx.pdfa.imgCache.has(chiave)) ctx.pdfa.imgCache.set(chiave, (async () => {
                            if (/^data:image\/jpe?g/i.test(urlCarta) && jpegDirettoPdf(byteDaDataUrlPdf(urlCarta))) return { jpeg: byteDaDataUrlPdf(urlCarta) };
                            const tela = document.createElement('canvas');
                            const s = Math.min(1, PDFA_RASTER_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
                            tela.width = Math.round(img.naturalWidth * s); tela.height = Math.round(img.naturalHeight * s);
                            const g = tela.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, tela.width, tela.height);
                            g.drawImage(img, 0, 0, tela.width, tela.height);
                            const out = { rgb: rgbDaTelaPdf(tela), w: tela.width, h: tela.height };
                            tela.width = tela.height = 0;
                            return out;
                        })());
                        pg.immagine(rc.x, rc.y, rc.w, rc.h, chiave, await ctx.pdfa.imgCache.get(chiave));
                    }
                }
                const foglie = raccogliFoglieWord(ctx, foglio, []);
                // Il numero di pagina in fondo al foglio non è fra le foglie (in Word è un campo): qui è testo.
                Array.from(foglio.querySelectorAll('[data-numero-pagina]')).filter(n => !nascostoWord(ctx, n)).forEach(n => foglie.push({ tipo: 'paragrafo', el: n, r: rettangoloContenuto(ctx, n) }));
                await foglieInPdf(ctx, pg, foglie);
                const cs = ctx.win.getComputedStyle(foglio);
                const sfondo = coloreWord(cs.backgroundColor);
                return { larghezza: rf.width, altezza: rf.height, ops: pg.ops, sfondo: sfondo && sfondo !== 'FFFFFF' ? sfondo : null };
            }

            /** Dove cade il taglio fra due pagine del contenuto che scorre: mai in mezzo a una riga di
             * testo o a un'immagine (si porta sulla pagina dopo); rettangoli e linee si tagliano. */
            function tagliPaginaPdf(ops, altezzaUtile) {
                const fine = ops.reduce((m, o) => Math.max(m, o.bottom), 0);
                const tagli = [0];
                let a = 0;
                while (a + altezzaUtile < fine - 0.5) {
                    let b = a + altezzaUtile;
                    const attraversano = ops.filter(o => (o.t === 's' || o.t === 'i') && o.top < b - 0.01 && o.bottom > b + 0.01 && o.top > a + 0.5);
                    if (attraversano.length) b = Math.min(...attraversano.map(o => o.top));
                    tagli.push(b);
                    a = b;
                }
                tagli.push(Infinity);
                return tagli;
            }
            /** Le operazioni che cadono nella pagina [a, b), spostate in cima e ritagliate. */
            function operazioniDellaPaginaPdf(ops, a, b, dx, dy) {
                const out = [];
                ops.forEach(o => {
                    if (o.t === 's' || o.t === 'i') {
                        if (o.top >= a - 0.01 && o.top < b - 0.01) out.push(Object.assign({}, o, o.t === 's' ? { x: o.x + dx, base: o.base - a + dy } : { x: o.x + dx, y: o.y - a + dy }));
                    } else if (o.t === 'r') {
                        const y0 = Math.max(o.y, a), y1 = Math.min(o.y + o.h, b);
                        if (y1 > y0) out.push(Object.assign({}, o, { x: o.x + dx, y: y0 - a + dy, h: y1 - y0 }));
                    } else if (o.t === 'l') {
                        const y0 = Math.max(Math.min(o.y1, o.y2), a), y1 = Math.min(Math.max(o.y1, o.y2), b);
                        const orizzontale = Math.abs(o.y1 - o.y2) < 0.01;
                        if (orizzontale ? (o.y1 >= a && o.y1 < b) : y1 > y0) {
                            out.push(Object.assign({}, o, { x1: o.x1 + dx, x2: o.x2 + dx, y1: (orizzontale ? o.y1 : y0) - a + dy, y2: (orizzontale ? o.y2 : y1) - a + dy }));
                        }
                    }
                });
                return out;
            }

            /** Il contenuto che scorre: pagine A4 con i margini del documento. */
            async function pagineDelFlussoPdf(ctx, seg, mrg) {
                ctx.limite = Infinity;
                const foglie = raccogliFoglieWord(ctx, seg.padre, [], seg.flusso);
                if (!foglie.length) return [];
                const r = seg.padre.getBoundingClientRect();
                const y0 = Math.min(...foglie.map(f => f.r.y));
                const pg = nuovaPaginaPdf(r.left, y0);
                await foglieInPdf(ctx, pg, foglie);
                const mmPx = 96 / 25.4;
                const W = 210 * mmPx, H = 297 * mmPx, utile = H - (mrg.top + mrg.bottom) * mmPx;
                const tagli = tagliPaginaPdf(pg.ops, utile);
                const pagine = [];
                for (let i = 0; i < tagli.length - 1; i++) {
                    pagine.push({ larghezza: W, altezza: H, ops: operazioniDellaPaginaPdf(pg.ops, tagli[i], tagli[i + 1], mrg.left * mmPx, mrg.top * mmPx), sfondo: null });
                }
                return pagine;
            }

            /** Dal documento già misurato (conDocumentoStampaMisurato) al PDF/A-2b. Word e PDF/A possono
             * leggere la stessa cornice una dopo l'altro: il pacchetto ZIP lo fa. */
            async function pdfaDaDocumentoMisurato({ doc, ctx, segmenti, mancanti, mrg }, o) {
                const annulla = () => { if (o.segnale && o.segnale.aborted) { const e = new Error('Operazione annullata'); e.name = 'AbortError'; throw e; } };
                annulla();
                const scr = await creaScrittorePdfA({
                    titolo: o.titolo || 'Report DPSH', autore: o.autore || '', soggetto: o.soggetto || 'Prove penetrometriche DPSH',
                    creatore: 'DPSH Field Collector', produttore: 'DPSH Field Collector ' + APP_VERSIONE + ' (pdf-lib)', data: new Date()
                }, fontIncorporatiPerPdfA(doc));
                ctx.pdfa = { scr, annulla };
                let pagine = 0;
                try {
                    for (let i = 0; i < segmenti.length; i++) {
                        annulla();
                        if (o.onAvanzamento) o.onAvanzamento(`Pagina ${i + 1} di ${segmenti.length}…`, (i + 1) / segmenti.length);
                        const seg = segmenti[i];
                        const fatte = seg.foglio ? [await paginaDelFoglioPdf(ctx, seg.foglio)] : await pagineDelFlussoPdf(ctx, seg, mrg);
                        for (const p of fatte) { await scr.pagina(p.larghezza, p.altezza, p.ops, { sfondo: p.sfondo }); pagine++; }
                        await new Promise(r => setTimeout(r, 0));
                    }
                    const bytes = await scr.chiudi();
                    return { blob: new Blob([bytes], { type: 'application/pdf' }), bytes, pagine, mancanti };
                } finally { ctx.pdfa = null; }
            }

            /** Dal documento di stampa (lo stesso del PDF e del Word) al PDF/A-2b.
             * opzioni: titolo, autore, soggetto, margini, onAvanzamento(testo, quota 0-1), segnale (AbortSignal).
             * Ritorna { blob, bytes, pagine, mancanti }. */
            async function documentoStampaInPdfA(htmlDocumento, opzioni) {
                const o = opzioni || {};
                if (o.segnale && o.segnale.aborted) { const e = new Error('Operazione annullata'); e.name = 'AbortError'; throw e; }
                return conDocumentoStampaMisurato(htmlDocumento, o, (m) => pdfaDaDocumentoMisurato(m, o));
            }
