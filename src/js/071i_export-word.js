            // ===================== EXPORT WORD (.docx) DALLO STESSO DOCUMENTO DEL PDF =====================
            // Prima il «Word» era la pagina HTML del report salvata con estensione .doc: Word la
            // apriva a modo suo (fogli a posizione assoluta, flex, griglie che non conosce) e il
            // risultato non somigliava al PDF. Ora il Word nasce dallo STESSO documento che va in
            // stampa per il PDF, impaginato dal browser in una cornice nascosta, e se ne leggono le
            // misure vere:
            //  - ogni foglio è una pagina di Word, con i suoi margini;
            //  - testo e tabelle diventano testo e tabelle di Word, modificabili, con larghezze,
            //    altezze di riga, caratteri, colori, bordi e sfondi letti dal foglio;
            //  - grafici, mappe e foto diventano immagini; quelle vicine, senza testo in mezzo,
            //    si fondono in un'immagine sola;
            //  - la disposizione (blocchi affiancati, spazi) si rifà con tabelle senza bordi e
            //    spazi misurati.

            const WORD_TIPI_DISEGNO = new Set(['grafico-stratigrafia', 'inquadramento', 'immagine-libera', 'foto-singola']);
            const WORD_TAG_DISEGNO = new Set(['IMG', 'SVG', 'CANVAS', 'VIDEO']);
            const PX_TWIP = 15;      // 1 px CSS = 0,75 pt = 15 twip
            const PX_EMU = 9525;     // 1 px CSS = 9525 EMU
            const WORD_SCALA_RASTER = 2.5;   // circa 240 dpi

            function xmlTesto(s) {
                return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
                    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
            }
            function tw(px) { return Math.max(0, Math.round(px * PX_TWIP)); }

            /** Colore CSS calcolato (rgb/rgba) in esadecimale; null se trasparente. */
            function coloreWord(css) {
                const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/.exec(css || '');
                if (!m) return null;
                let a = m[4] === undefined ? 1 : parseFloat(m[4]) / (/%$/.test(m[4]) ? 100 : 1);
                if (a < 0.05) return null;
                // Un colore semitrasparente si vede sul bianco del foglio: lo si fonde col bianco.
                const c = [m[1], m[2], m[3]].map(v => Math.round(255 - (255 - parseFloat(v)) * a));
                return c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('').toUpperCase();
            }

            function primaFamiglia(ff) {
                const f = String(ff || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
                const generici = { 'sans-serif': 'Arial', 'serif': 'Times New Roman', 'monospace': 'Courier New', 'system-ui': 'Arial' };
                return generici[f] || f || 'Arial';
            }

            /** Tutto ciò che serve mentre si converte: il documento, le immagini prodotte, i contatori. */
            function nuovoContestoWord(doc, opzioni) {
                const stili = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\n');
                const sprite = Array.from(doc.querySelectorAll('svg')).filter(s => s.querySelector('symbol'))
                    .map(s => new XMLSerializer().serializeToString(s)).join('');
                return { doc, win: doc.defaultView, stili, sprite, media: [], idDisegno: 1, qualita: (opzioni && opzioni.qualitaJpeg) || 0.85, idSegnalibro: 1, titoliFatti: new Set(), stiliSommario: '', piede: null, intestazioni: new Map(), intestazioneVuota: null, piediTemplate: new Map(), piedeVuoto: null, titolo: (opzioni && opzioni.titolo) || '' };
            }

            function nascostoWord(ctx, el) {
                const cs = ctx.win.getComputedStyle(el);
                if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return true;
                if (parseFloat(cs.opacity) === 0) return true;
                const r = el.getBoundingClientRect();
                return r.width < 0.5 && r.height < 0.5 && !el.childElementCount;
            }

            function decoratoWord(ctx, el) {
                const cs = ctx.win.getComputedStyle(el);
                if (coloreWord(cs.backgroundColor)) return true;
                return ['Top', 'Right', 'Bottom', 'Left'].some(l => parseFloat(cs['border' + l + 'Width']) > 0 && cs['border' + l + 'Style'] !== 'none' && cs['border' + l + 'Style'] !== 'hidden' && coloreWord(cs['border' + l + 'Color']));
            }

            /** Un elemento il cui contenuto è solo testo e figli in linea: diventa UN paragrafo. */
            function soloInLineaWord(ctx, el) {
                for (const c of el.querySelectorAll('*')) {
                    if (c.tagName === 'BR') continue;
                    if (c.closest('svg') && c.tagName.toUpperCase() !== 'SVG') continue;
                    const d = ctx.win.getComputedStyle(c).display;
                    if (d === 'none') continue;
                    if (!/^inline/.test(d) && d !== 'contents') return false;
                    if (/^inline-(block|flex|grid|table)$/.test(d) && (c.tagName === 'TABLE' || decoratoWord(ctx, c))) return false;
                }
                return true;
            }

            function testoVisibileWord(el) { return /\S/.test(el.textContent || '') || !!el.querySelector('img,svg,canvas,br'); }

            /** Rettangolo di un elemento senza bordo e padding: dove sta davvero il testo. */
            function rettangoloContenuto(ctx, el) {
                const r = el.getBoundingClientRect(), cs = ctx.win.getComputedStyle(el);
                const n = (p) => parseFloat(cs[p]) || 0;
                return {
                    x: r.left + n('borderLeftWidth') + n('paddingLeft'),
                    y: r.top + n('borderTopWidth') + n('paddingTop'),
                    w: r.width - n('borderLeftWidth') - n('paddingLeft') - n('borderRightWidth') - n('paddingRight'),
                    h: r.height - n('borderTopWidth') - n('paddingTop') - n('borderBottomWidth') - n('paddingBottom')
                };
            }
            function ritagliaWord(ctx, r) { return Object.assign({}, r, { h: Math.max(1, Math.min(r.h, ctx.limite - r.y)) }); }
            function rettangoloWord(el) { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }

            /** Le foglie di un contenitore: i pezzi che si convertono interi (paragrafi, tabelle,
             * riquadri decorati, disegni). I contenitori senza aspetto proprio non diventano niente:
             * si scende dentro, la loro forma la danno le misure dei figli. */
            function raccogliFoglieWord(ctx, el, out, nodi) {
                for (const n of (nodi || el.childNodes)) {
                    if (n.nodeType === 3) {
                        if (!/\S/.test(n.textContent)) continue;
                        const rg = ctx.doc.createRange(); rg.selectNodeContents(n);
                        const rr = rg.getBoundingClientRect();
                        if (rr.bottom > ctx.limite + 1) continue;
                        out.push({ tipo: 'nodi', nodi: [n], stile: el, r: { x: rr.left, y: rr.top, w: rr.width, h: rr.height } });
                        continue;
                    }
                    if (n.nodeType !== 1 || nascostoWord(ctx, n)) continue;
                    // IL FOGLIO TAGLIA, E IL WORD TAGLIA NELLO STESSO PUNTO. Nel PDF quello che esce
                    // dal foglio non si vede (l'app lo avvisa prima di stampare); in Word andrebbe su
                    // pagine in più, e il documento non sarebbe più lo stesso. Fuori tutto ciò che
                    // comincia sotto il fondo del foglio; i pezzi a cavallo li sistema chi li converte.
                    if (n.getBoundingClientRect().top >= ctx.limite - 0.5) continue;
                    if (n.classList && n.classList.contains('no-print')) continue;
                    // Il numero di pagina scritto in fondo al foglio: in Word è il piè di pagina, coi campi veri.
                    if (n.hasAttribute('data-numero-pagina')) continue;
                    const tipoBlocco = n.getAttribute('data-blocco');
                    if (tipoBlocco && WORD_TIPI_DISEGNO.has(tipoBlocco)) {
                        // Il disegno diventa immagine; la sua didascalia resta testo di Word.
                        const didascalie = Array.from(n.querySelectorAll('[data-ruolo="didascalia"]')).filter(d => !nascostoWord(ctx, d));
                        const parti = Array.from(n.querySelectorAll('img,svg,canvas,video')).filter(e => !didascalie.some(d => d.contains(e)) && !e.parentElement.closest('svg'));
                        const rb = rettangoloWord(n);
                        let fondo = rb.y + rb.h;
                        if (didascalie.length) fondo = Math.min(...didascalie.map(d => d.getBoundingClientRect().top));
                        if (parti.length || !didascalie.length) {
                            const altezza = didascalie.length ? Math.max(1, fondo - rb.y - 4) : rb.h;
                            out.push({ tipo: 'disegno', el: n, togli: didascalie, r: ritagliaWord(ctx, { x: rb.x, y: rb.y, w: rb.w, h: altezza }) });
                        }
                        didascalie.forEach(d => out.push(fogliaTestoWord(ctx, d)));
                        continue;
                    }
                    if (WORD_TAG_DISEGNO.has(n.tagName.toUpperCase())) { out.push({ tipo: 'disegno', el: n, r: ritagliaWord(ctx, rettangoloWord(n)) }); continue; }
                    if (n.tagName === 'TABLE') { out.push({ tipo: 'tabella', el: n, r: ritagliaWord(ctx, rettangoloWord(n)) }); continue; }
                    if (n.tagName === 'BR') continue;
                    if (decoratoWord(ctx, n) && (testoVisibileWord(n) || rettangoloWord(n).h >= 1)) { out.push({ tipo: 'scatola', el: n, r: ritagliaWord(ctx, rettangoloWord(n)) }); continue; }
                    if (!testoVisibileWord(n)) continue;
                    if (soloInLineaWord(ctx, n)) { out.push(fogliaTestoWord(ctx, n)); continue; }
                    raccogliFoglieWord(ctx, n, out);
                }
                return out;
            }
            function fogliaTestoWord(ctx, el) {
                const c = rettangoloContenuto(ctx, el);
                // Un paragrafo che il fondo del foglio taglia: resta se l'ultima riga si legge ancora
                // (nel PDF può sporgere solo l'interlinea sotto le lettere).
                const cs = ctx.win.getComputedStyle(el);
                const fontPx = parseFloat(cs.fontSize) || 13;
                const lh = cs.lineHeight === 'normal' ? fontPx * 1.2 : parseFloat(cs.lineHeight);
                if (c.y + c.h > ctx.limite + 1 + Math.max(0, (lh - fontPx) / 2)) return { tipo: 'vuoto', r: c };
                return { tipo: 'paragrafo', el, r: c };
            }

            // ---------- Pezzi di XML ----------

            function paragrafoVuotoWord(altezzaTw) {
                const h = Math.max(20, Math.round(altezzaTw));
                return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${h}" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>`;
            }

            function cellaVuotaWord(larghezzaPx) {
                return `<w:tc><w:tcPr><w:tcW w:w="${tw(larghezzaPx)}" w:type="dxa"/></w:tcPr>${paragrafoVuotoWord(20)}</w:tc>`;
            }

            /** Le proprietà di una tabella, nell'ordine che Word pretende (Word rifiuta il file se
             * l'ordine è un altro; LibreOffice è più tollerante, quindi non basta che apra lì). */
            function tblPrWord(o) {
                const nil = '<w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>';
                return `<w:tblPr><w:tblW w:w="${o.w}" w:type="dxa"/>${o.ind ? `<w:tblInd w:w="${o.ind}" w:type="dxa"/>` : ''}`
                    + (o.bordi || `<w:tblBorders>${nil}</w:tblBorders>`)
                    + (o.sfondo ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.sfondo}"/>` : '')
                    + `<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000"/></w:tblPr>`;
            }

            /** Tabella di sola disposizione: niente bordi, niente margini, larghezze esatte. */
            function tabellaDisposizioneWord(celle, altezzaPx) {
                const totale = celle.reduce((s, c) => s + tw(c.w), 0);
                const griglia = celle.map(c => `<w:gridCol w:w="${tw(c.w)}"/>`).join('');
                const tcs = celle.map(c => c.xml === null ? cellaVuotaWord(c.w)
                    : `<w:tc><w:tcPr><w:tcW w:w="${tw(c.w)}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>${chiudiCellaWord(c.xml)}</w:tc>`).join('');
                return `<w:tbl>${tblPrWord({ w: totale })}<w:tblGrid>${griglia}</w:tblGrid>`
                    + `<w:tr><w:trPr><w:cantSplit/>${altezzaPx ? `<w:trHeight w:val="${tw(altezzaPx)}" w:hRule="atLeast"/>` : ''}</w:trPr>${tcs}</w:tr></w:tbl>`;
            }

            /** Una cella di Word deve finire con un paragrafo. */
            function chiudiCellaWord(xml) {
                if (!xml) return paragrafoVuotoWord(20);
                return /<\/w:tbl>$/.test(xml) ? xml + paragrafoVuotoWord(20) : xml;
            }

            function immagineInLineaWord(ctx, img, wPx, hPx) {
                const id = ctx.idDisegno++;
                const nome = `immagine${id}.${img.estensione}`;
                ctx.media.push({ nome, bytes: img.bytes, rid: 'rIdImg' + id, estensione: img.estensione });
                const cx = Math.round(wPx * PX_EMU), cy = Math.round(hPx * PX_EMU);
                return `<w:r><w:rPr><w:noProof/><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>`
                    + `<wp:docPr id="${id}" name="Immagine ${id}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>`
                    + `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${nome}"/><pic:cNvPicPr/></pic:nvPicPr>`
                    + `<pic:blipFill><a:blip r:embed="rIdImg${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
                    + `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
            }

            /** Disegna in un'immagine sola i pezzi indicati, ciascuno alla sua posizione. Ogni pezzo
             * si ricostruisce da solo (con gli stili del documento e i caratteri incorporati) dentro
             * un SVG con foreignObject, che il browser disegna su una tela: il disegno non dipende
             * dal testo intorno, che in Word è testo. */
            async function rasterizzaWord(ctx, foglie) {
                const x0 = Math.min(...foglie.map(f => f.r.x)), y0 = Math.min(...foglie.map(f => f.r.y));
                const x1 = Math.max(...foglie.map(f => f.r.x + f.r.w)), y1 = Math.max(...foglie.map(f => f.r.y + f.r.h));
                const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
                const serializzatore = new XMLSerializer();
                const pezzi = foglie.map(f => {
                    const copia = f.el.cloneNode(true);
                    (f.togli || []).forEach(d => {
                        // La didascalia si cerca nella copia allo stesso posto che ha nell'originale.
                        const percorso = []; for (let e = d; e && e !== f.el; e = e.parentElement) percorso.unshift(Array.prototype.indexOf.call(e.parentElement.children, e));
                        let c = copia; percorso.forEach(i => { c = c && c.children[i]; });
                        if (c) c.remove();
                    });
                    // Un riquadro di mappa che non si è scaricato resta vuoto, non un'icona rotta.
                    copia.querySelectorAll('img').forEach(i => { if (!/^data:/.test(i.getAttribute('src') || '')) i.remove(); });
                    const rb = f.el.getBoundingClientRect();
                    const box = ctx.doc.createElement('div');
                    box.setAttribute('style', `position:absolute; left:${(rb.left - x0).toFixed(2)}px; top:${(rb.top - y0).toFixed(2)}px; width:${rb.width.toFixed(2)}px; height:${f.r.h.toFixed(2)}px; overflow:hidden; margin:0;`);
                    if (WORD_TAG_DISEGNO.has(f.el.tagName.toUpperCase())) {
                        copia.setAttribute('width', rb.width); copia.setAttribute('height', rb.height);
                        copia.style.width = rb.width + 'px'; copia.style.height = rb.height + 'px';
                    }
                    box.appendChild(copia);
                    return serializzatore.serializeToString(box);
                }).join('');
                const stile = `${ctx.stili}\n.dpsh-word-raster.dpsh-sheet{position:relative!important;width:${w}px!important;height:${h}px!important;padding:0!important;margin:0!important;box-shadow:none!important;overflow:hidden!important;background:transparent!important;}`;
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><foreignObject x="0" y="0" width="${w}" height="${h}">`
                    + `<div xmlns="http://www.w3.org/1999/xhtml" class="dpsh-sheet dpsh-word-raster"><style>${xmlTesto(stile)}</style><div style="display:none">${ctx.sprite}</div>${pezzi}</div></foreignObject></svg>`;
                const img = new Image();
                img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
                await img.decode();
                const tela = document.createElement('canvas');
                tela.width = Math.round(w * WORD_SCALA_RASTER); tela.height = Math.round(h * WORD_SCALA_RASTER);
                const g = tela.getContext('2d');
                g.fillStyle = '#ffffff'; g.fillRect(0, 0, tela.width, tela.height);
                g.drawImage(img, 0, 0, tela.width, tela.height);
                const conFoto = foglie.some(f => f.el.tagName === 'IMG' || f.el.querySelector && f.el.querySelector('img'));
                const tipo = conFoto ? 'image/jpeg' : 'image/png';
                const blob = await new Promise(ok => tela.toBlob(ok, tipo, ctx.qualita));
                return { bytes: new Uint8Array(await blob.arrayBuffer()), estensione: conFoto ? 'jpeg' : 'png', w, h };
            }

            // ---------- Testo ----------

            function proprietaRunWord(ctx, el, extra) {
                const cs = ctx.win.getComputedStyle(el);
                const font = xmlTesto(primaFamiglia(cs.fontFamily));
                // Word conosce solo i mezzi punti: si arrotonda PER DIFETTO e si compensa con la scala
                // orizzontale, così le righe sono lunghe come nel PDF e niente va a capo in più.
                const mezziVeri = parseFloat(cs.fontSize) * 0.75 * 2;
                const mezziPunti = Math.max(2, Math.floor(mezziVeri + 0.01));
                const scala = Math.floor(100 * mezziVeri / mezziPunti);
                // Apici e pedici: non col «superscript» di Word, che rimpicciolisce di nuovo un testo
                // già piccolo, ma alla loro dimensione vera spostati di quanto li sposta il browser
                // (un quinto del corpo in giù, un terzo in su).
                let va = null, base = null;
                for (let e = el; e && e !== extra.paragrafo.parentElement; e = e.parentElement) {
                    const v = e.tagName === 'SUP' ? 'super' : e.tagName === 'SUB' ? 'sub' : ctx.win.getComputedStyle(e).verticalAlign;
                    if (v === 'super' || v === 'sub') { va = va || v; base = e.parentElement; }
                }
                let posizione = '';
                if (va && base) {
                    const basePt = parseFloat(ctx.win.getComputedStyle(base).fontSize) * 0.75;
                    posizione = `<w:position w:val="${Math.round(basePt * 2 * (va === 'super' ? 1 / 3 : -1 / 5))}"/>`;
                }
                let p = `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}" w:eastAsia="${font}"/>`;
                if ((parseInt(cs.fontWeight, 10) || 400) >= 600) p += '<w:b/><w:bCs/>';
                if (cs.fontStyle === 'italic' || cs.fontStyle === 'oblique') p += '<w:i/><w:iCs/>';
                if (/line-through/.test(cs.textDecorationLine || cs.textDecoration)) p += '<w:strike/>';
                const colore = coloreWord(cs.color);
                if (colore && colore !== '000000') p += `<w:color w:val="${colore}"/>`;
                const ls = parseFloat(cs.letterSpacing);
                if (ls) p += `<w:spacing w:val="${Math.round(ls * PX_TWIP)}"/>`;
                if (scala > 100) p += `<w:w w:val="${Math.min(600, scala)}"/>`;
                p += posizione;
                p += `<w:sz w:val="${mezziPunti}"/><w:szCs w:val="${mezziPunti}"/>`;
                // Sottolineato ed evidenziato possono venire da un antenato in linea.
                for (let e = el; e && e !== extra.paragrafo.parentElement; e = e.parentElement) {
                    const ce = ctx.win.getComputedStyle(e);
                    if (/underline/.test(ce.textDecorationLine || '')) { p += '<w:u w:val="single"/>'; break; }
                }
                if (el !== extra.paragrafo && /^inline/.test(cs.display)) {
                    const sfondo = coloreWord(cs.backgroundColor);
                    if (sfondo) p += `<w:shd w:val="clear" w:color="auto" w:fill="${sfondo}"/>`;
                }
                return { xml: p, trasforma: cs.textTransform, spazi: cs.whiteSpace };
            }

            function testoTrasformato(t, trasforma) {
                if (trasforma === 'uppercase') return t.toLocaleUpperCase('it');
                if (trasforma === 'lowercase') return t.toLocaleLowerCase('it');
                if (trasforma === 'capitalize') return t.replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toLocaleUpperCase('it'));
                return t;
            }

            /** I run di un paragrafo, nell'ordine del documento. */
            async function runDelParagrafoWord(ctx, radice, nodi) {
                const pezzi = [];   // { testo, rPr } | { xml }
                const visita = async (n) => {
                    if (n.nodeType === 3) {
                        const el = n.parentElement;
                        const pr = proprietaRunWord(ctx, el, { paragrafo: radice });
                        let t = n.textContent;
                        if (!/^pre/.test(pr.spazi)) t = t.replace(/[\s​]+/g, ' ');
                        t = testoTrasformato(t, pr.trasforma);
                        if (t) pezzi.push({ testo: t, rPr: pr.xml });
                        return;
                    }
                    if (n.nodeType !== 1 || nascostoWord(ctx, n)) return;
                    if (n.tagName === 'BR') { pezzi.push({ xml: '<w:r><w:br/></w:r>', aCapo: true }); return; }
                    if (WORD_TAG_DISEGNO.has(n.tagName.toUpperCase())) {
                        const r = rettangoloWord(n);
                        if (r.w >= 1 && r.h >= 1) {
                            const img = await rasterizzaWord(ctx, [{ el: n, r }]);
                            pezzi.push({ xml: immagineInLineaWord(ctx, img, r.w, r.h) });
                        }
                        return;
                    }
                    for (const c of n.childNodes) await visita(c);
                };
                for (const n of nodi) await visita(n);
                // Gli spazi come li tratta il browser: niente spazi in testa e in coda, mai due di fila.
                let precedenteSpazio = true;
                pezzi.forEach(p => {
                    if (p.testo === undefined) { precedenteSpazio = !!p.aCapo; return; }
                    if (precedenteSpazio) p.testo = p.testo.replace(/^ +/, '');
                    if (p.testo) precedenteSpazio = / $/.test(p.testo);
                });
                for (let i = pezzi.length - 1; i >= 0; i--) {
                    if (pezzi[i].testo === undefined) { if (!pezzi[i].aCapo) break; continue; }
                    pezzi[i].testo = pezzi[i].testo.replace(/ +$/, '');
                    if (pezzi[i].testo) break;
                }
                return pezzi.map(p => p.testo !== undefined
                    ? (p.testo ? `<w:r><w:rPr>${p.rPr}</w:rPr><w:t xml:space="preserve">${xmlTesto(p.testo)}</w:t></w:r>` : '')
                    : p.xml).join('');
            }

            /** L'altezza di una riga: quella scritta nello stile o, se è «normal», quella misurata
             * sulle righe vere (dipende dal carattere, una stima la sbaglierebbe). */
            function altezzaRigaWord(ctx, el, nodi) {
                const cs = ctx.win.getComputedStyle(el);
                if (cs.lineHeight !== 'normal') return parseFloat(cs.lineHeight);
                const rg = ctx.doc.createRange();
                if (nodi && nodi.length === 1) rg.selectNodeContents(nodi[0]); else rg.selectNodeContents(el);
                const tops = new Set(Array.from(rg.getClientRects()).filter(r => r.height > 0).map(r => Math.round(r.top)));
                const r = rg.getBoundingClientRect();
                return tops.size && r.height ? r.height / tops.size : (parseFloat(cs.fontSize) || 13) * 1.15;
            }

            /** Le righe del testo di un elemento come le ha disposte il browser: la più larga, e se
             * vanno a capo solo dove c'è un a capo vero (<br>) — allora in Word sono le stesse. */
            function righeDelTestoWord(ctx, el, lh) {
                const rg = ctx.doc.createRange(); rg.selectNodeContents(el);
                const righe = new Map();
                Array.from(rg.getClientRects()).filter(r => r.width > 0 && r.height > 0).forEach(r => {
                    const k = Math.round(r.top + r.height / 2);
                    const chiave = [...righe.keys()].find(y => Math.abs(y - k) < lh / 2);
                    const g = righe.get(chiave) || { sx: Infinity, dx: -Infinity };
                    g.sx = Math.min(g.sx, r.left); g.dx = Math.max(g.dx, r.right);
                    righe.set(chiave !== undefined ? chiave : k, g);
                });
                const larghezza = Math.max(0, ...[...righe.values()].map(g => g.dx - g.sx));
                return { larghezza, righe: righe.size, soloACapoVeri: righe.size <= el.querySelectorAll('br').length + 1 };
            }

            /** I run con la scala orizzontale moltiplicata per f (w:w; 100 = normale). */
            function stringiRunWord(runs, f) {
                return runs.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/g, (m, p) => {
                    const w = /<w:w w:val="(\d+)"\/>/.exec(p);
                    const nuovo = `<w:w w:val="${Math.max(1, Math.round((w ? parseInt(w[1], 10) : 100) * f))}"/>`;
                    if (w) return `<w:rPr>${p.replace(w[0], nuovo)}</w:rPr>`;
                    // Nell'ordine che Word pretende: dopo la spaziatura, prima di posizione e corpo.
                    const dove = p.search(/<w:position |<w:sz /);
                    return `<w:rPr>${dove < 0 ? p + nuovo : p.slice(0, dove) + nuovo + p.slice(dove)}</w:rPr>`;
                });
            }

            function marcatoreElencoWord(el) {
                // Il pallino lo porta la voce d'elenco, o il primo paragrafo dentro la voce.
                const li = el.tagName === 'LI' ? el
                    : (el.parentElement && el.parentElement.tagName === 'LI' && el.parentElement.firstElementChild === el) ? el.parentElement : null;
                if (!li) return '';
                const lista = li.parentElement;
                if (lista && lista.tagName === 'OL') {
                    const inizio = parseInt(lista.getAttribute('start'), 10) || 1;
                    return (inizio + Array.prototype.indexOf.call(Array.from(lista.children).filter(c => c.tagName === 'LI'), li)) + '.';
                }
                return '•';
            }

            async function paragrafoWord(ctx, foglia, xRegione) {
                const el = foglia.el || foglia.stile;
                const cs = ctx.win.getComputedStyle(el);
                let runs = await runDelParagrafoWord(ctx, el, foglia.nodi || Array.from(el.childNodes));
                if (!runs) return '';
                const allineamenti = { left: 'left', start: 'left', right: 'right', end: 'right', center: 'center', justify: 'both', '-webkit-center': 'center' };
                const jc = allineamenti[cs.textAlign] || 'left';
                const lh = altezzaRigaWord(ctx, el, foglia.nodi);
                const sinistra = Math.max(0, foglia.r.x - xRegione);
                // TESTO NELLE CELLE: Word misura le lettere un po' diversamente dal browser, e in una
                // colonna stretta una riga che nel PDF ci sta in Word andrebbe a capo, raddoppiando
                // la riga della tabella (che poi esce dal foglio). Il paragrafo può allora allargarsi
                // nel margine della cella (rientro negativo) dal lato che non sposta l'allineamento:
                // a destra per il testo a sinistra, a sinistra per quello a destra, metà e metà per
                // quello centrato. A vista non cambia niente; la riga resta una.
                const margine = foglia.margineCella || { sx: 0, dx: 0 };
                let indSx = sinistra, indDx = 0;
                if (jc === 'left' || jc === 'both') indDx = -margine.dx;
                else if (jc === 'right') indSx -= margine.sx;
                else { const m = Math.min(margine.sx, margine.dx); indSx -= m; indDx = -m; }
                // Testo centrato o a destra in un riquadro più stretto della regione (l'intestazione
                // è un riquadro centrato largo quanto il suo testo): col solo rientro a sinistra Word
                // lo centrava nello spazio rimasto a destra, cioè spostato. Il rientro a destra lo
                // rimette dov'è nel PDF.
                // Un po' d'agio ai lati (Word e LibreOffice misurano le lettere un poco più larghe del
                // browser): senza, la riga andrebbe a capo; il centro resta dov'è.
                if ((jc === 'center' || jc === 'right') && !foglia.margineCella && ctx.regione && Math.abs(ctx.regione.x - xRegione) < 0.5) {
                    indDx = Math.max(0, ctx.regione.x + ctx.regione.w - (foglia.r.x + foglia.r.w));
                    const agio = Math.min(indSx, jc === 'center' ? indDx : Infinity, foglia.r.w * 0.15 + 6);
                    indSx -= agio;
                    if (jc === 'center') indDx -= agio;
                }
                const twSegno = (px) => Math.round(px * PX_TWIP);
                // Se una riga nel PDF riempie quasi tutta la cella, anche il margine può non bastare:
                // il testo si stringe in larghezza (scala orizzontale di Word) quanto serve a
                // lasciare l'8% di sicurezza alla riga più larga. Solo se le righe sono quelle
                // del PDF (una sola, o separate da a capo veri) e solo se serve.
                if (foglia.margineCella && !/<w:drawing>/.test(runs)) {
                    const { larghezza, soloACapoVeri } = righeDelTestoWord(ctx, el, lh);
                    const spazio = foglia.r.w + (jc === 'center' ? 2 * Math.min(margine.sx, margine.dx) : jc === 'right' ? margine.sx : margine.dx);
                    const f = larghezza > 0 && soloACapoVeri ? Math.min(1, spazio / (larghezza * 1.08)) : 1;
                    if (f < 0.995) runs = stringiRunWord(runs, f);
                }
                const destra = Math.abs(indDx) > 0.5 ? ` w:right="${twSegno(indDx)}"` : '';
                let ind = (Math.abs(indSx) > 0.5 ? ` w:left="${twSegno(indSx)}"` : '') + destra;
                const rientro = parseFloat(cs.textIndent) || 0;
                let prima = '';
                const marcatore = foglia.el ? marcatoreElencoWord(foglia.el) : '';
                if (marcatore) {
                    ind = ` w:left="${tw(sinistra)}"${destra} w:hanging="${tw(Math.min(sinistra, 18))}"`;
                    prima = `<w:r><w:rPr>${proprietaRunWord(ctx, el, { paragrafo: el }).xml}</w:rPr><w:t xml:space="preserve">${marcatore}</w:t></w:r><w:r><w:tab/></w:r>`;
                } else if (rientro) {
                    ind += rientro > 0 ? ` w:firstLine="${tw(rientro)}"` : ` w:hanging="${tw(-rientro)}"`;
                }
                // I TITOLI. Quelli che l'indice elenca (data-titolo-indice, i blocchi Titolo) hanno il
                // livello di struttura di Word e, se l'indice c'è, il segnalibro a cui punta la voce: così
                // il Sommario di Word li ritrova e «Aggiorna sommario» rifà lo stesso indice. Gli H1–H6
                // fuori dai fogli (le note) restano titoli anche loro. Un titolo su più paragrafi conta una volta.
                let livello = '', segno = ['', ''];
                const titoloIndice = el.closest('[data-titolo-indice]');
                const titolo = /^H([1-6])$/.exec(el.tagName);
                if (titoloIndice) {
                    if (!ctx.titoliFatti.has(titoloIndice)) {
                        ctx.titoliFatti.add(titoloIndice);
                        livello = `<w:outlineLvl w:val="${Math.max(0, Math.min(8, (parseInt(titoloIndice.getAttribute('data-titolo-indice'), 10) || 1) - 1))}"/>`;
                        if (titoloIndice.hasAttribute('data-voce-indice')) segno = segnalibroWord(ctx, titoloIndice.getAttribute('data-voce-indice'));
                    }
                } else if (titolo && !el.closest('.dpsh-sheet')) livello = `<w:outlineLvl w:val="${parseInt(titolo[1], 10) - 1}"/>`;
                const tab = marcatore ? `<w:tabs><w:tab w:val="left" w:pos="${tw(sinistra)}"/></w:tabs>` : '';
                return `<w:p><w:pPr><w:keepLines/>${tab}<w:spacing w:before="0" w:after="0" w:line="${Math.max(20, tw(lh))}" w:lineRule="${/<w:drawing>/.test(runs) ? 'atLeast' : 'exact'}"/>${ind ? `<w:ind${ind}/>` : ''}<w:jc w:val="${jc}"/>${livello}</w:pPr>${segno[0]}${prima}${runs}${segno[1]}</w:p>`;
            }

            // ---------- Bordi, sfondi, margini delle celle ----------

            function bordiWord(ctx, el, nome) {
                const cs = ctx.win.getComputedStyle(el);
                const stili = { solid: 'single', dashed: 'dashed', dotted: 'dotted', double: 'double', groove: 'single', ridge: 'single', inset: 'single', outset: 'single' };
                const lati = [['Top', 'top'], ['Left', 'left'], ['Bottom', 'bottom'], ['Right', 'right']].map(([L, l]) => {
                    const larghezza = parseFloat(cs['border' + L + 'Width']) || 0;
                    const st = cs['border' + L + 'Style'];
                    const col = coloreWord(cs['border' + L + 'Color']);
                    if (!larghezza || !stili[st] || !col) return `<w:${l} w:val="nil"/>`;
                    return `<w:${l} w:val="${stili[st]}" w:sz="${Math.max(2, Math.round(larghezza * 6))}" w:space="0" w:color="${col}"/>`;
                }).join('');
                return `<w:${nome}>${lati}</w:${nome}>`;
            }

            function marginiCellaWord(ctx, el) {
                const cs = ctx.win.getComputedStyle(el);
                const m = (p) => tw(parseFloat(cs[p]) || 0);
                return `<w:tcMar><w:top w:w="${m('paddingTop')}" w:type="dxa"/><w:left w:w="${m('paddingLeft')}" w:type="dxa"/><w:bottom w:w="${m('paddingBottom')}" w:type="dxa"/><w:right w:w="${m('paddingRight')}" w:type="dxa"/></w:tcMar>`;
            }

            function sfondoEffettivoWord(ctx, cella, fino) {
                for (let e = cella; e && e !== fino.parentElement; e = e.parentElement) {
                    const c = coloreWord(ctx.win.getComputedStyle(e).backgroundColor);
                    if (c) return c;
                }
                return null;
            }

            /** Il contenuto di un elemento (cella, riquadro): un paragrafo se è solo testo, altrimenti
             * le sue foglie disposte come nel foglio. */
            async function contenutoWord(ctx, el) {
                const c = rettangoloContenuto(ctx, el);
                if (soloInLineaWord(ctx, el)) {
                    if (!testoVisibileWord(el)) return '';
                    // In una cella di tabella il testo può usare il margine della cella (paragrafoWord).
                    const cs = ctx.win.getComputedStyle(el);
                    const margineCella = /^T[DH]$/.test(el.tagName) ? { sx: parseFloat(cs.paddingLeft) || 0, dx: parseFloat(cs.paddingRight) || 0 } : null;
                    return paragrafoWord(ctx, { el, r: c, margineCella }, c.x);
                }
                const foglie = raccogliFoglieWord(ctx, el, []).filter(f => f.tipo !== 'vuoto');
                if (!foglie.length) return '';
                const yInizio = Math.min(...foglie.map(f => f.r.y));
                return (await impaginaWord(ctx, foglie, c.x, c.w, yInizio)).xml;
            }

            async function scatolaWord(ctx, foglia) {
                const el = foglia.el;
                const r = foglia.r;
                const sfondo = coloreWord(ctx.win.getComputedStyle(el).backgroundColor);
                const dentro = await contenutoWord(ctx, el);
                return `<w:tbl>${tblPrWord({ w: tw(r.w), ind: foglia.rientroTw })}`
                    + `<w:tblGrid><w:gridCol w:w="${tw(r.w)}"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="${tw(r.h)}" w:hRule="atLeast"/></w:trPr>`
                    + `<w:tc><w:tcPr><w:tcW w:w="${tw(r.w)}" w:type="dxa"/>${bordiWord(ctx, el, 'tcBorders')}${sfondo ? `<w:shd w:val="clear" w:color="auto" w:fill="${sfondo}"/>` : ''}${marginiCellaWord(ctx, el)}<w:vAlign w:val="top"/></w:tcPr>`
                    + `${chiudiCellaWord(dentro)}</w:tc></w:tr></w:tbl>`;
            }

            /** Una tabella del foglio diventa una tabella di Word con la stessa griglia: le colonne
             * si ricavano dai bordi veri delle celle, le altezze dalle righe vere. */
            async function tabellaWord(ctx, foglia) {
                const tab = foglia.el;
                const righe = Array.from(tab.rows).filter(r => !nascostoWord(ctx, r) && r.getBoundingClientRect().bottom <= ctx.limite + 1);
                const celle = righe.map(r => Array.from(r.cells).filter(c => !nascostoWord(ctx, c)));
                const bordi = [];
                celle.flat().forEach(c => { const r = c.getBoundingClientRect(); bordi.push(r.left, r.right); });
                if (!bordi.length) return '';
                bordi.sort((a, b) => a - b);
                const xs = [];
                bordi.forEach(x => { if (!xs.length || x - xs[xs.length - 1] > 1.5) xs.push(x); });
                const colonna = (x) => { let m = 0; xs.forEach((v, i) => { if (Math.abs(v - x) < Math.abs(xs[m] - x)) m = i; }); return m; };
                const larghezze = xs.slice(1).map((x, i) => x - xs[i]);
                const griglia = larghezze.map(l => `<w:gridCol w:w="${tw(l)}"/>`).join('');
                const unite = new Map();   // colonna → { righeRestanti, xmlProprieta }
                let corpo = '';
                for (let ir = 0; ir < righe.length; ir++) {
                    const tr = righe[ir];
                    const altezza = tr.getBoundingClientRect().height;
                    // Altezza esatta solo se ogni cella ha in Word le stesse righe del PDF (testo
                    // semplice, a capo solo dove c'è un a capo vero): altrimenti una riga in più in
                    // Word verrebbe tagliata, e meglio una riga più alta che un testo perso.
                    const esatta = celle[ir].every(td => !td.querySelector('table,img,svg,canvas') && (!testoVisibileWord(td)
                        || (soloInLineaWord(ctx, td) && righeDelTestoWord(ctx, td, altezzaRigaWord(ctx, td)).soloACapoVeri)));
                    const occupate = [];
                    for (const td of celle[ir]) {
                        const r = td.getBoundingClientRect();
                        const da = colonna(r.left), a = Math.max(da + 1, colonna(r.right));
                        const sfondo = sfondoEffettivoWord(ctx, td, tab);
                        const cs = ctx.win.getComputedStyle(td);
                        const va = { middle: 'center', bottom: 'bottom' }[cs.verticalAlign] || 'top';
                        const span = a - da > 1 ? `<w:gridSpan w:val="${a - da}"/>` : '';
                        const aspetto = `${bordiWord(ctx, td, 'tcBorders')}${sfondo ? `<w:shd w:val="clear" w:color="auto" w:fill="${sfondo}"/>` : ''}${marginiCellaWord(ctx, td)}`;
                        const larghezza = xs[a] - xs[da];
                        const contenuto = chiudiCellaWord(await contenutoWord(ctx, td));
                        const unione = (td.rowSpan || 1) > 1;
                        if (unione) unite.set(da, { restanti: td.rowSpan - 1, span, aspetto, larghezza });
                        occupate.push({ da, xml: `<w:tc><w:tcPr><w:tcW w:w="${tw(larghezza)}" w:type="dxa"/>${span}${unione ? '<w:vMerge w:val="restart"/>' : ''}${aspetto}<w:vAlign w:val="${va}"/></w:tcPr>${contenuto}</w:tc>` });
                    }
                    // Le celle che arrivano dalle righe sopra (rowspan) e i buchi della griglia.
                    unite.forEach((u, da) => {
                        if (occupate.some(o => o.da === da)) return;
                        if (u.restanti <= 0) return;
                        occupate.push({ da, xml: `<w:tc><w:tcPr><w:tcW w:w="${tw(u.larghezza)}" w:type="dxa"/>${u.span}<w:vMerge/>${u.aspetto}</w:tcPr>${paragrafoVuotoWord(20)}</w:tc>` });
                        u.restanti--;
                    });
                    occupate.sort((a, b) => a.da - b.da);
                    let xml = '', cursore = 0;
                    occupate.forEach(o => {
                        if (o.da > cursore) { xml += `<w:tc><w:tcPr><w:tcW w:w="${tw(xs[o.da] - xs[cursore])}" w:type="dxa"/>${o.da - cursore > 1 ? `<w:gridSpan w:val="${o.da - cursore}"/>` : ''}</w:tcPr>${paragrafoVuotoWord(20)}</w:tc>`; }
                        xml += o.xml;
                        const m = /<w:gridSpan w:val="(\d+)"\/>/.exec(o.xml);
                        cursore = o.da + (m ? parseInt(m[1], 10) : 1);
                    });
                    if (cursore < larghezze.length) xml += `<w:tc><w:tcPr><w:tcW w:w="${tw(xs[larghezze.length] - xs[cursore])}" w:type="dxa"/>${larghezze.length - cursore > 1 ? `<w:gridSpan w:val="${larghezze.length - cursore}"/>` : ''}</w:tcPr>${paragrafoVuotoWord(20)}</w:tc>`;
                    // ALTEZZA ESATTA, quella del PDF: con «almeno» Word aggiungeva di suo frazioni di
                    // punto (bordi, arrotondamenti) a ogni riga, e su decine di righe la tabella
                    // usciva dal foglio. Il contenuto ci sta: è lo stesso del PDF, con le stesse righe
                    // (paragrafoWord fa in modo che non vada a capo in più).
                    corpo += `<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="${tw(altezza)}" w:hRule="${esatta ? 'exact' : 'atLeast'}"/></w:trPr>${xml}</w:tr>`;
                }
                const sfondoTabella = coloreWord(ctx.win.getComputedStyle(tab).backgroundColor);
                return `<w:tbl>${tblPrWord({ w: tw(xs[xs.length - 1] - xs[0]), ind: foglia.rientroTw, bordi: bordiWord(ctx, tab, 'tblBorders'), sfondo: sfondoTabella })}`
                    + `<w:tblGrid>${griglia}</w:tblGrid>${corpo}</w:tbl>`;
            }

            // ---------- Disposizione ----------

            /** Divide in gruppi che non si sovrappongono lungo un asse (bande orizzontali o colonne). */
            function dividiWord(foglie, asse) {
                const inizio = asse === 'y' ? (f) => f.r.y : (f) => f.r.x;
                const fine = asse === 'y' ? (f) => f.r.y + f.r.h : (f) => f.r.x + f.r.w;
                const ordinate = foglie.slice().sort((a, b) => inizio(a) - inizio(b));
                const gruppi = [];
                ordinate.forEach(f => {
                    const g = gruppi[gruppi.length - 1];
                    if (g && inizio(f) < g.fine - 1) { g.foglie.push(f); g.fine = Math.max(g.fine, fine(f)); g.inizio = Math.min(g.inizio, inizio(f)); }
                    else gruppi.push({ foglie: [f], inizio: inizio(f), fine: fine(f) });
                });
                return gruppi;
            }

            /** Una foglia da sola, nella larghezza della sua regione. */
            async function fogliaWord(ctx, f, xRegione) {
                if (f.tipo === 'paragrafo' || f.tipo === 'nodi') return paragrafoWord(ctx, f, xRegione);
                if (f.tipo === 'disegno') {
                    const img = await rasterizzaWord(ctx, [f]);
                    const sinistra = Math.max(0, f.r.x - xRegione);
                    return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>${sinistra > 0.5 ? `<w:ind w:left="${tw(sinistra)}"/>` : ''}<w:rPr><w:sz w:val="2"/></w:rPr></w:pPr>${immagineInLineaWord(ctx, img, img.w, img.h)}</w:p>`;
                }
                const sinistra = f.r.x - xRegione;
                ctx.regione = null; // dentro una tabella o una scatola la regione è un'altra
                const conRientro = Object.assign({}, f, { rientroTw: sinistra > 0.5 ? tw(sinistra) : 0 });
                return f.tipo === 'tabella' ? tabellaWord(ctx, conRientro) : scatolaWord(ctx, conRientro);
            }

            /** Dispone le foglie di una regione (x, larghezza) a partire dalla quota yInizio: bande
             * una sotto l'altra con gli spazi misurati, colonne affiancate in una tabella senza bordi.
             * Una regione fatta solo di disegni diventa un'immagine sola. */
            async function impaginaWord(ctx, foglie, x, larghezza, yInizio) {
                foglie = foglie.filter(f => f.tipo !== 'vuoto');
                let xml = '', posTw = 0;
                const bande = dividiWord(foglie, 'y');
                for (const banda of bande) {
                    const obiettivoTw = tw(banda.inizio - yInizio);
                    const scarto = obiettivoTw - posTw;
                    if (scarto >= 20) { xml += paragrafoVuotoWord(scarto); posTw += scarto; }
                    let pezzo;
                    const altezza = banda.fine - banda.inizio;
                    if (banda.foglie.every(f => f.tipo === 'disegno')) {
                        // Tutti disegni: un'immagine sola.
                        const img = await rasterizzaWord(ctx, banda.foglie);
                        const sinistra = Math.max(0, Math.min(...banda.foglie.map(f => f.r.x)) - x);
                        pezzo = `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>${sinistra > 0.5 ? `<w:ind w:left="${tw(sinistra)}"/>` : ''}<w:rPr><w:sz w:val="2"/></w:rPr></w:pPr>${immagineInLineaWord(ctx, img, img.w, img.h)}</w:p>`;
                    } else if (banda.foglie.length === 1) {
                        ctx.regione = { x, w: larghezza };
                        pezzo = await fogliaWord(ctx, banda.foglie[0], x);
                    } else {
                        const colonne = dividiWord(banda.foglie, 'x');
                        if (colonne.length === 1) {
                            // Pezzi che non si dividono né in righe né in colonne (un'immagine col
                            // testo che le scorre intorno): uno sotto l'altro, nell'ordine in cui si
                            // leggono. Il testo resta testo.
                            pezzo = '';
                            const ordinate = banda.foglie.slice().sort((a, b) => a.r.y - b.r.y || a.r.x - b.r.x);
                            for (const f of ordinate) {
                                ctx.regione = { x, w: larghezza };
                                const xmlF = await fogliaWord(ctx, f, x);
                                if (/<\/w:tbl>$/.test(pezzo) && /^<w:tbl>/.test(xmlF)) pezzo += paragrafoVuotoWord(20);
                                pezzo += xmlF;
                            }
                        } else {
                            const celle = [];
                            let cursore = x;
                            for (const col of colonne) {
                                if (col.inizio - cursore > 0.5) celle.push({ w: col.inizio - cursore, xml: null });
                                const fine = Math.min(x + larghezza, col.fine);
                                const yCol = banda.inizio;
                                const dentro = (await impaginaWord(ctx, col.foglie, col.inizio, fine - col.inizio, yCol)).xml;
                                celle.push({ w: Math.max(1, fine - col.inizio), xml: dentro });
                                cursore = fine;
                            }
                            pezzo = tabellaDisposizioneWord(celle, altezza);
                        }
                    }
                    // Due tabelle di fila con le stesse colonne (le categorie di una tabella lunga) sono
                    // in Word una tabella sola: separate da un paragrafo si aprirebbero degli spazi.
                    const grigliaPrec = /<w:tblGrid>(.*?)<\/w:tblGrid>(?:(?!<w:tblGrid>).)*<\/w:tbl>$/.exec(xml);
                    const grigliaNuova = /^<w:tbl>(<w:tblPr>.*?<\/w:tblPr>)<w:tblGrid>(.*?)<\/w:tblGrid>(.*)<\/w:tbl>$/.exec(pezzo);
                    if (grigliaPrec && grigliaNuova && grigliaPrec[1] === grigliaNuova[2] && scarto < 20 && /<\/w:tbl>$/.test(xml)
                        && /<w:tblW [^>]*>(<w:tblInd [^>]*>)?/.exec(xml.slice(xml.lastIndexOf('<w:tbl>')))[0] === /<w:tblW [^>]*>(<w:tblInd [^>]*>)?/.exec(grigliaNuova[1])[0]) {
                        xml = xml.slice(0, -'</w:tbl>'.length) + grigliaNuova[3] + '</w:tbl>';
                    } else {
                        // Due tabelle che non si possono unire hanno bisogno di un paragrafo in mezzo.
                        if (/<\/w:tbl>$/.test(xml) && /^<w:tbl>/.test(pezzo)) xml += paragrafoVuotoWord(20);
                        xml += pezzo;
                    }
                    posTw = tw(banda.fine - yInizio);
                }
                return { xml, altezzaTw: posTw };
            }

            // ---------- Campi di Word: sommario, segnalibri, numeri di pagina ----------

            /** Un campo di Word: istruzione e, se c'è, il risultato già calcolato (quello che si vede
             * finché Word non lo aggiorna). */
            function campoWord(istruzione, risultato, rPr) {
                const r = rPr ? `<w:rPr>${rPr}</w:rPr>` : '';
                return `<w:r>${r}<w:fldChar w:fldCharType="begin"/></w:r><w:r>${r}<w:instrText xml:space="preserve">${xmlTesto(istruzione)}</w:instrText></w:r>`
                    + (risultato === undefined ? '' : `<w:r>${r}<w:fldChar w:fldCharType="separate"/></w:r>${risultato}`) + `<w:r>${r}<w:fldChar w:fldCharType="end"/></w:r>`;
            }
            /** Il segnalibro di una voce dell'indice: [inizio, fine]. «_Toc» come quelli di Word, che li nasconde. */
            function segnalibroWord(ctx, voce) {
                const id = ctx.idSegnalibro++;
                return [`<w:bookmarkStart w:id="${id}" w:name="_TocDpsh${voce}"/>`, `<w:bookmarkEnd w:id="${id}"/>`];
            }

            /** LA PAGINA INDICE DIVENTA UN SOMMARIO DI WORD: un campo SOMMARIO (TOC) con le voci già
             * scritte, ciascuna cliccabile verso il suo titolo e col numero di pagina in un campo
             * PAGEREF. L'aspetto (carattere, corpo, rientro, puntini o trattini fino al numero, riga
             * sotto) sta negli stili «Sommario 1/2/3» di Word: «Aggiorna sommario» lo rifà uguale. */
            async function sommarioWord(ctx, foglio, ri) {
                let xml = '', fondo = ri.top;
                const titolo = foglio.querySelector('h1');
                if (titolo) {
                    const rt = rettangoloContenuto(ctx, titolo);
                    if (rt.y - fondo > 0.5) xml += paragrafoVuotoWord(tw(rt.y - fondo));
                    xml += await paragrafoWord(ctx, { el: titolo, r: rt }, ri.left);
                    fondo = rt.y + rt.h;
                }
                // Un indice su più fogli è in Word UN solo Sommario: le voci di tutti i fogli dell'indice
                // stanno qui, e Word le manda a capo da sé (i fogli «seguito» si saltano, vedi sotto).
                const voci = Array.from(foglio.ownerDocument.querySelectorAll('.dpsh-sheet[data-sommario] a[data-voce-indice]'));
                if (!voci.length) return xml;
                // Lo spazio fra due voci sta tutto PRIMA della voce (il fondo della precedente più la
                // cima della sua): Word e LibreOffice non sommano allo stesso modo spazio dopo e spazio prima.
                const r0 = voci[0].getBoundingClientRect(), pad0 = parseFloat(ctx.win.getComputedStyle(voci[0]).paddingBottom) || 0;
                if (r0.top - pad0 - fondo > 0.5) xml += paragrafoVuotoWord(tw(r0.top - pad0 - fondo));
                const guida = { punti: 'dot', puntiRadi: 'dot', trattini: 'hyphen' }[foglio.getAttribute('data-sommario')] || 'none';
                const conPagina = voci.some(v => v.querySelector('[data-pagina-voce]'));
                // Lo stile di ogni livello si legge dalla sua prima voce. Le stesse proprietà vanno anche
                // sul paragrafo: LibreOffice negli indici non legge spaziature e tabulazioni dello stile.
                const livelli = new Map();
                voci.forEach(v => {
                    const liv = v.getAttribute('data-livello') || '1';
                    if (livelli.has(liv)) return;
                    const cs = ctx.win.getComputedStyle(v), rv = v.getBoundingClientRect();
                    const testo = v.querySelector('[data-testo-voce]'), pagina = v.querySelector('[data-pagina-voce]');
                    const numero = testo && testo.previousElementSibling;
                    const padT = parseFloat(cs.paddingTop) || 0, padB = parseFloat(cs.paddingBottom) || 0;
                    const tabs = (numero ? `<w:tab w:val="left" w:pos="${tw(testo.getBoundingClientRect().left - ri.left)}"/>` : '')
                        + `<w:tab w:val="right" w:leader="${guida}" w:pos="${tw((pagina ? pagina.getBoundingClientRect().right : rv.right) - ri.left)}"/>`;
                    const bordo = parseFloat(cs.borderBottomWidth) > 0 && cs.borderBottomStyle !== 'none' && coloreWord(cs.borderBottomColor)
                        ? `<w:pBdr><w:bottom w:val="single" w:sz="${Math.max(2, Math.round(parseFloat(cs.borderBottomWidth) * 6))}" w:space="0" w:color="${coloreWord(cs.borderBottomColor)}"/></w:pBdr>` : '';
                    const pPr = (prima) => `<w:keepLines/>${bordo}<w:tabs>${tabs}</w:tabs><w:spacing w:before="${tw(prima)}" w:after="0" w:line="${Math.max(20, tw(rv.height - padT - padB))}" w:lineRule="exact"/>`
                        + `<w:ind w:left="${tw(rv.left - ri.left)}"/>`;
                    livelli.set(liv, { pPr, padT, padB });
                    ctx.stiliSommario += `<w:style w:type="paragraph" w:styleId="TOC${liv}"><w:name w:val="toc ${liv}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="39"/><w:unhideWhenUsed/>`
                        + `<w:pPr>${pPr(padT + padB)}</w:pPr><w:rPr>${testo ? proprietaRunWord(ctx, testo, { paragrafo: v }).xml : ''}</w:rPr></w:style>`;
                });
                // Lo stile porta grassetto e corsivo della voce: un pezzo che non li ha (il numero di
                // pagina) li spegne esplicitamente. I puntini guida hanno il colore del divisore.
                const spento = (xml, el) => {
                    const cs = ctx.win.getComputedStyle(el);
                    return xml.replace(/(<w:rPr><w:rFonts [^>]*\/>)((?:<w:b\/><w:bCs\/>)?)/g, (m, a, b) => a + (b || '<w:b w:val="0"/><w:bCs w:val="0"/>') + (cs.fontStyle === 'normal' ? '<w:i w:val="0"/><w:iCs w:val="0"/>' : ''));
                };
                // Il colore dei puntini è quello del divisore scelto nell'indice (--idx-colore-divisore),
                // per ogni tipo di guida: prima, per i puntini radi (disegnati come sfondo, senza bordo),
                // si ripiegava sul colore del testo e i puntini uscivano scuri invece che chiari.
                const sonda = ctx.doc.createElement('span');
                sonda.style.color = 'var(--idx-colore-divisore)';
                foglio.appendChild(sonda);
                const coloreDivisore = coloreWord(ctx.win.getComputedStyle(sonda).color);
                sonda.remove();
                const tabulazione = (v, testo) => {
                    const colore = coloreDivisore || coloreWord(ctx.win.getComputedStyle(v).color);
                    const rPr = testo ? proprietaRunWord(ctx, testo, { paragrafo: v }).xml.replace(/<w:b\/><w:bCs\/>/, '<w:b w:val="0"/><w:bCs w:val="0"/>').replace(/<w:color [^>]*\/>/, '') : '';
                    return `<w:r><w:rPr>${rPr.replace(/(<w:spacing |<w:w |<w:sz )/, (m) => (colore ? `<w:color w:val="${colore}"/>` : '') + m)}</w:rPr><w:tab/></w:r>`;
                };
                let padPrima = pad0;
                const inizio = `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u \\l "1-3"${conPagina ? '' : ' \\n'} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>`;
                for (let i = 0; i < voci.length; i++) {
                    const v = voci[i], nome = '_TocDpsh' + v.getAttribute('data-voce-indice');
                    const testo = v.querySelector('[data-testo-voce]'), pagina = v.querySelector('[data-pagina-voce]');
                    const numero = testo && testo.previousElementSibling;
                    let dentro = numero ? spento(await runDelParagrafoWord(ctx, v, [numero]), numero) + '<w:r><w:tab/></w:r>' : '';
                    if (testo) dentro += spento(await runDelParagrafoWord(ctx, v, [testo]), testo);
                    if (pagina) dentro += tabulazione(v, testo) + campoWord(` PAGEREF ${nome} \\h `, spento(await runDelParagrafoWord(ctx, v, [pagina]), pagina));
                    const lv = livelli.get(v.getAttribute('data-livello') || '1');
                    xml += `<w:p><w:pPr><w:pStyle w:val="TOC${v.getAttribute('data-livello') || '1'}"/>${lv.pPr(padPrima + lv.padT)}</w:pPr>${i === 0 ? inizio : ''}<w:hyperlink w:anchor="${nome}" w:history="1">${dentro}</w:hyperlink>`
                        + `${i === voci.length - 1 ? '<w:r><w:fldChar w:fldCharType="end"/></w:r>' : ''}</w:p>`;
                    padPrima = lv.padB;
                }
                return xml;
            }

            /** IL NUMERO DI PAGINA: il piè di pagina di Word, «Pagina {PAGE} di {NUMPAGES}», con
             * carattere, colore e altezza del PDF. Sta in una cornice ancorata alla pagina: così non
             * ruba spazio al corpo del foglio, che resta impaginato com'è. */
            function piedeWord(ctx, numero) {
                const rs = numero.closest('.dpsh-sheet').getBoundingClientRect(), rn = rettangoloContenuto(ctx, numero);
                // Con l'indice davanti la numerazione parte dopo (foglioWord: l'indice non ha piè e la
                // prima pagina dopo riparte da 1), quindi il totale non è quello di Word (NUMPAGES
                // conterebbe anche l'indice): si scrive quello del PDF, che conta solo le pagine numerate.
                const conIndice = !!numero.ownerDocument.querySelector('.dpsh-sheet[data-sommario]');
                const totale = (/di\s+(\d+)/.exec(numero.textContent || '') || [])[1];
                const rPr = proprietaRunWord(ctx, numero, { paragrafo: numero }).xml;
                const t = (s) => `<w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${s}</w:t></w:r>`;
                const h = Math.max(20, tw(rn.h));
                // Il corpo della pagina si ferma sopra il numero (foglioWord): se in Word il
                // contenuto venisse un poco più lungo, va alla pagina dopo invece di avvolgerlo.
                ctx.fondoPiedeTw = tw(rs.bottom - rn.y) + 57;
                return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">`
                    + `<w:p><w:pPr><w:framePr w:w="11906" w:h="${h}" w:hRule="exact" w:hAnchor="page" w:vAnchor="page" w:x="0" w:y="${tw(rn.y - rs.top)}"/>`
                    + `<w:spacing w:before="0" w:after="0" w:line="${h}" w:lineRule="exact"/><w:jc w:val="center"/></w:pPr>`
                    + `${t('Pagina ')}${campoWord(' PAGE ', t('1'), rPr)}${t(' di ')}${conIndice && totale ? t(totale) : campoWord(' NUMPAGES ', t('1'), rPr)}</w:p>`
                    + `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p></w:ftr>`;
            }
            /** Il piè di pagina della sezione: quello del template (piedeTemplateWord, col numero di
             * pagina dentro se c'è), altrimenti quello col solo numero. Come per l'intestazione, una
             * sezione senza riferimento erediterebbe la precedente: dopo un piè del template, una
             * pagina che non ne ha prende quello vuoto. */
            const piedeInSezione = (ctx, foglio, parte) => {
                if (parte) return `<w:footerReference w:type="default" r:id="${parte.rid}"/>`;
                if (ctx.piede && !(foglio && foglio.hasAttribute('data-sommario'))) return '<w:footerReference w:type="default" r:id="rIdPiede"/>';
                if (!ctx.piediTemplate.size) return '';
                if (!ctx.piedeVuoto) ctx.piedeVuoto = { rid: 'rIdPiedeVuoto', nome: 'footer0.xml', xml: paragrafoVuotoWord(20), distanzaTw: 0, tipo: 'footer' };
                return `<w:footerReference w:type="default" r:id="${ctx.piedeVuoto.rid}"/>`;
            };
            /** IL PIÈ DI PAGINA DEL TEMPLATE (testo formattato, i contatti su più colonne): una parte
             * footer di Word, alla distanza dal bordo del PDF. Se il documento ha anche il numero di
             * pagina, quello (una cornice ancorata alla pagina, piedeWord) va nella stessa parte. */
            async function piedeTemplateWord(ctx, piede, ri, rf) {
                const chiave = piede.innerHTML;
                if (ctx.piediTemplate.has(chiave)) return ctx.piediTemplate.get(chiave);
                const limitePrima = ctx.limite;
                ctx.limite = Infinity; // il piè sta sotto l'area del contenuto
                const foglie = raccogliFoglieWord(ctx, piede, [], [piede]).filter(f => f.tipo !== 'vuoto');
                let xml = '';
                if (foglie.length) xml = (await impaginaWord(ctx, foglie, ri.left, ri.width, Math.min(...foglie.map(f => f.r.y)))).xml;
                ctx.limite = limitePrima;
                if (!xml) return null;
                if (!/<\/w:p>$/.test(xml)) xml += paragrafoVuotoWord(20);
                if (ctx.piede) xml += (/<w:ftr[^>]*>([\s\S]*)<\/w:ftr>/.exec(ctx.piede) || [])[1] || '';
                const fondo = Math.max(...foglie.map(f => f.r.y + f.r.h));
                const n = ctx.piediTemplate.size + 1;
                const parte = { rid: 'rIdPiedeT' + n, nome: `footer${n + 1}.xml`, xml, distanzaTw: tw(Math.max(0, rf.bottom - fondo)), tipo: 'footer' };
                ctx.piediTemplate.set(chiave, parte);
                return parte;
            }
            /** La prima pagina dopo l'indice riparte da 1, come nel PDF (numeraPagineDocumento).
             * L'indice è in testa: le sue sezioni non hanno piè di pagina, e Word non ne eredita
             * nessuno perché nessuna sezione prima ne ha uno. */
            function numerazioneInSezione(ctx, foglio) {
                if (!ctx.piede || !foglio || foglio.hasAttribute('data-sommario') || ctx.numerazioneIniziata) return '';
                ctx.numerazioneIniziata = true;
                return '<w:pgNumType w:start="1"/>';
            }

            /** L'INTESTAZIONE DI WORD di un foglio: una parte header di Word, con testo e immagini
             * alle distanze del PDF. Le pagine con la stessa intestazione (di solito tutte) usano la
             * stessa parte: il logo sta nel file una volta sola. `distanzaTw` è la distanza
             * dell'intestazione dal bordo superiore, cioè «Intestazione: da bordo» di Word. */
            async function intestazioneWord(ctx, intestazione, ri, rf) {
                const chiave = intestazione.innerHTML;
                if (ctx.intestazioni.has(chiave)) return ctx.intestazioni.get(chiave);
                // La fascia a tutta larghezza (data-tutta-pagina): un'immagine ANCORATA alla pagina,
                // dietro al testo, come nella carta intestata fatta con Word. Nascosta con
                // visibility (non display) perché il testo resti dov'è mentre si raccoglie il resto.
                const fascia = intestazione.querySelector('img[data-tutta-pagina]');
                const ancora = fascia ? immagineAncorataWord(ctx, fascia, rf) : '';
                if (fascia) fascia.style.visibility = 'hidden';
                const foglie = raccogliFoglieWord(ctx, intestazione, [], [intestazione]).filter(f => f.tipo !== 'vuoto');
                if (fascia) fascia.style.visibility = '';
                if (!foglie.length && !ancora) return null;
                const y0 = foglie.length ? Math.min(...foglie.map(f => f.r.y)) : rf.top;
                const limitePrima = ctx.limite;
                ctx.limite = Infinity;
                let xml = foglie.length ? (await impaginaWord(ctx, foglie, ri.left, ri.width, y0)).xml : '';
                ctx.limite = limitePrima;
                if (ancora) xml = `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr>${ancora}</w:p>` + xml;
                // Word vuole un paragrafo in fondo all'intestazione.
                if (!/<\/w:p>$/.test(xml)) xml += paragrafoVuotoWord(20);
                const n = ctx.intestazioni.size + 1;
                const parte = { rid: 'rIdIntestazione' + n, nome: `header${n}.xml`, xml, distanzaTw: tw(y0 - rf.top) };
                ctx.intestazioni.set(chiave, parte);
                return parte;
            }
            /** Un'immagine ancorata alla PAGINA (dietro al testo, senza scorrimento), alla posizione e
             * alla misura che ha nel PDF; i byte sono quelli originali, non ridisegnati. */
            function immagineAncorataWord(ctx, img, rf) {
                const m = /^data:image\/(png|jpe?g|gif);base64,/i.exec(img.getAttribute('src') || '');
                if (!m) return '';
                const r = img.getBoundingClientRect();
                // object-fit:contain, in alto al centro: la parte disegnata può essere più piccola del riquadro.
                const rapporto = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : r.width / Math.max(1, r.height);
                const w = Math.min(r.width, r.height * rapporto), h = w / rapporto;
                const x = r.left - rf.left + (r.width - w) / 2, y = r.top - rf.top;
                const id = ctx.idDisegno++;
                const estensione = m[1].toLowerCase() === 'jpg' ? 'jpeg' : m[1].toLowerCase();
                const nome = `immagine${id}.${estensione}`;
                ctx.media.push({ nome, bytes: dataUrlToUint8Array(img.getAttribute('src')).bytes, rid: 'rIdImg' + id, estensione });
                const cx = Math.round(w * PX_EMU), cy = Math.round(h * PX_EMU);
                return `<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${251658240 + id}" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1">`
                    + `<wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${Math.round(x * PX_EMU)}</wp:posOffset></wp:positionH>`
                    + `<wp:positionV relativeFrom="page"><wp:posOffset>${Math.round(y * PX_EMU)}</wp:posOffset></wp:positionV>`
                    + `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="Intestazione ${id}"/>`
                    + `<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>`
                    + `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${nome}"/><pic:cNvPicPr/></pic:nvPicPr>`
                    + `<pic:blipFill><a:blip r:embed="rIdImg${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
                    + `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
            }

            /** Il riferimento all'intestazione nella sezione. Una sezione senza riferimento in Word
             * EREDITA l'intestazione della precedente: una pagina che nel PDF non ce l'ha (il
             * contenuto che scorre, un template senza intestazione) prende quella vuota. */
            function intestazioneInSezione(ctx, parte) {
                if (parte) return `<w:headerReference w:type="default" r:id="${parte.rid}"/>`;
                if (!ctx.intestazioni.size) return '';
                if (!ctx.intestazioneVuota) ctx.intestazioneVuota = { rid: 'rIdIntestazioneVuota', nome: 'header0.xml', xml: paragrafoVuotoWord(20), distanzaTw: 0 };
                return `<w:headerReference w:type="default" r:id="${ctx.intestazioneVuota.rid}"/>`;
            }
            function partiIntestazioneWord(ctx) {
                return Array.from(ctx.intestazioni.values()).concat(ctx.intestazioneVuota ? [ctx.intestazioneVuota] : []);
            }

            /** Un foglio del report: una sezione di Word con gli stessi margini. */
            async function foglioWord(ctx, foglio) {
                const interno = foglio.querySelector('.dpsh-sheet-inner') || foglio;
                const rf = foglio.getBoundingClientRect();
                let ri = interno.getBoundingClientRect();
                ctx.limite = ri.bottom;
                // L'intestazione sta nel margine superiore del foglio, fuori dall'area del contenuto
                // (htmlIntestazioneNelMargine). In Word va nell'INTESTAZIONE vera (intestazioneWord):
                // prima stava nel corpo, e il margine superiore di Word diventava la posizione del
                // logo, pochi millimetri; un doppio clic in alto non apriva niente.
                const intestazione = Array.from(foglio.children).find(c => c.getAttribute('data-blocco') === 'intestazione' && !nascostoWord(ctx, c));
                const parteIntestazione = intestazione ? await intestazioneWord(ctx, intestazione, ri, rf) : null;
                const piedeFoglio = Array.from(foglio.children).find(c => c.getAttribute('data-blocco') === 'piede' && !nascostoWord(ctx, c));
                const partePiede = piedeFoglio ? await piedeTemplateWord(ctx, piedeFoglio, ri, rf) : null;
                let corpo;
                if (foglio.hasAttribute('data-sommario')) corpo = await sommarioWord(ctx, foglio, ri);
                else {
                    const foglie = raccogliFoglieWord(ctx, interno, []);
                    corpo = foglie.length ? (await impaginaWord(ctx, foglie, ri.left, ri.width, ri.top)).xml : '';
                }
                // Una prova senza titoli: nell'indice c'è la sua riga («Prova N° 3»). In Word un campo
                // VOCE DI SOMMARIO (TC), che non si vede, col segnalibro: il Sommario la ritrova.
                if (foglio.hasAttribute('data-voce-testo')) {
                    const [a, b] = segnalibroWord(ctx, foglio.getAttribute('data-voce-indice'));
                    const voce = a + campoWord(` TC "${foglio.getAttribute('data-voce-testo').replace(/"/g, "'")}" \\l 1 `) + b;
                    corpo = /<w:p>/.test(corpo) ? corpo.replace(/<w:p>(<w:pPr>.*?<\/w:pPr>)?/, m => m + voce) : `<w:p>${voce}</w:p>` + corpo;
                }
                // In fondo al foglio si lascia poco margine: il contenuto è già posizionato dall'alto,
                // e un margine piccolo evita che un arrotondamento lo spinga sulla pagina dopo.
                // Col piè di pagina del template il margine inferiore è quello vero (la sua fascia).
                const sotto = partePiede ? tw(rf.bottom - ri.bottom) : Math.min(tw(rf.bottom - ri.bottom), Math.max(280, ctx.piede && !foglio.hasAttribute('data-sommario') ? ctx.fondoPiedeTw || 0 : 0));
                const sezione = `<w:sectPr>${intestazioneInSezione(ctx, parteIntestazione)}${piedeInSezione(ctx, foglio, partePiede)}<w:pgSz w:w="11906" w:h="16838"/>`
                    + `<w:pgMar w:top="${tw(ri.top - rf.top)}" w:right="${tw(rf.right - ri.right)}" w:bottom="${sotto}" w:left="${tw(ri.left - rf.left)}" w:header="${parteIntestazione ? parteIntestazione.distanzaTw : 0}" w:footer="${partePiede ? partePiede.distanzaTw : 0}" w:gutter="0"/>`
                    + `${numerazioneInSezione(ctx, foglio)}<w:cols w:space="0"/></w:sectPr>`;
                return { xml: corpo, sezione };
            }

            /** Il paragrafo che chiude una sezione di Word (le sue proprietà stanno in fondo). */
            function chiusuraSezioneWord(sezione) {
                return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr>${sezione}</w:pPr></w:p>`;
            }

            /** Le immagini del documento che arrivano dalla rete (riquadri delle mappe) diventano
             * dati incorporati: un disegno ricostruito in un'immagine non può scaricare niente. */
            async function incorporaImmaginiWord(doc) {
                const daScaricare = Array.from(doc.querySelectorAll('img')).filter(i => i.src && !/^data:/.test(i.src));
                const giaScaricate = new Map();
                const scarica = async (url) => {
                    if (!giaScaricate.has(url)) giaScaricate.set(url, (async () => {
                        const ctl = new AbortController();
                        const tempo = setTimeout(() => ctl.abort(), 20000);
                        try {
                            const r = await fetch(url, { mode: 'cors', signal: ctl.signal });
                            if (!r.ok) return null;
                            const b = await r.blob();
                            return await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => ok(null); fr.readAsDataURL(b); });
                        } catch (e) { return null; } finally { clearTimeout(tempo); }
                    })());
                    return giaScaricate.get(url);
                };
                let mancanti = 0;
                for (let i = 0; i < daScaricare.length; i += 8) {
                    await Promise.all(daScaricare.slice(i, i + 8).map(async img => {
                        const dati = await scarica(img.src);
                        if (dati) img.src = dati; else mancanti++;
                    }));
                }
                await Promise.all(Array.from(doc.images).map(i => i.decode ? i.decode().catch(() => {}) : null));
                return mancanti;
            }

            function pacchettoDocxWord(corpo, sezioneFinale, media, extra) {
                const x = extra || {};
                const intestazioni = x.intestazioni ? partiIntestazioneWord(x) : [];
                const piediT = x.piediTemplate ? Array.from(x.piediTemplate.values()).concat(x.piedeVuoto ? [x.piedeVuoto] : []) : [];
                const partiHf = intestazioni.concat(piediT);
                const NS_HDR = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
                    + 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
                    + 'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
                // Le immagini di un'intestazione si cercano nelle relazioni della SUA parte.
                const relazioniIntestazione = (h) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
                    + media.filter(m => h.xml.includes(`r:embed="${m.rid}"`)).map(m => `<Relationship Id="${m.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.nome}"/>`).join('')
                    + `</Relationships>`;
                const adesso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
                const proprieta = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`
                    + (x.titolo ? `<dc:title>${xmlTesto(x.titolo)}</dc:title>` : '') + `<dc:language>it-IT</dc:language>`
                    + `<dcterms:created xsi:type="dcterms:W3CDTF">${adesso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${adesso}</dcterms:modified></cp:coreProperties>`;
                const ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
                    + 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
                    + 'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
                const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document ${ns}><w:body>${corpo}${sezioneFinale}</w:body></w:document>`;
                const stili = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">`
                    + `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="it-IT"/></w:rPr></w:rPrDefault>`
                    + `<w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`
                    + `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>`
                    + `<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>`
                    + (x.stiliSommario || '') + `</w:styles>`;
                // Compatibilità 15, quella dei documenti scritti con Word di oggi. Con la 14 (Word
                // 2010) gli a capo del testo giustificato erano più vicini al PDF, ma Word apriva il
                // file con «[Modalità compatibilità]» nella barra del titolo.
                const impostazioni = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="709"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
                const relazioni = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
                    + `<Relationship Id="rIdStili" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
                    + `<Relationship Id="rIdImpostazioni" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>`
                    + (x.piede ? `<Relationship Id="rIdPiede" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>` : '')
                    + partiHf.map(h => `<Relationship Id="${h.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${h.tipo === 'footer' ? 'footer' : 'header'}" Target="${h.nome}"/>`).join('')
                    + media.map(m => `<Relationship Id="${m.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.nome}"/>`).join('')
                    + `</Relationships>`;
                const tipi = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
                    + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>`
                    + `<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>`
                    + `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>`
                    + `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>`
                    + `<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>`
                    + (x.piede ? `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>` : '')
                    + partiHf.map(h => `<Override PartName="/word/${h.nome}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${h.tipo === 'footer' ? 'footer' : 'header'}+xml"/>`).join('')
                    + `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`
                    + `</Types>`;
                const radice = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>`
                    + `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
                const enc = new TextEncoder();
                return buildZipBlob([
                    { name: '[Content_Types].xml', bytes: enc.encode(tipi) },
                    { name: '_rels/.rels', bytes: enc.encode(radice) },
                    { name: 'word/document.xml', bytes: enc.encode(documento) },
                    { name: 'word/styles.xml', bytes: enc.encode(stili) },
                    { name: 'word/settings.xml', bytes: enc.encode(impostazioni) },
                    { name: 'word/_rels/document.xml.rels', bytes: enc.encode(relazioni) },
                    ...(x.piede ? [{ name: 'word/footer1.xml', bytes: enc.encode(x.piede) }] : []),
                    ...partiHf.flatMap(h => [
                        { name: 'word/' + h.nome, bytes: enc.encode(h.tipo === 'footer'
                            ? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:ftr ${NS_HDR}>${h.xml}</w:ftr>`
                            : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:hdr ${NS_HDR}>${h.xml}</w:hdr>`) },
                        { name: `word/_rels/${h.nome}.rels`, bytes: enc.encode(relazioniIntestazione(h)) }
                    ]),
                    { name: 'docProps/core.xml', bytes: enc.encode(proprieta) },
                    ...media.map(m => ({ name: 'word/media/' + m.nome, bytes: m.bytes }))
                ]);
            }

            /** Il documento come sequenza di pezzi: i fogli (pagine fisse) e, in mezzo, il contenuto
             * che scorre (i Parametri avanzati alternano schede di campo e tabelle lunghe). */
            function segmentiWord(ctx, radice, out) {
                for (const n of radice.childNodes) {
                    if (n.nodeType === 1 && n.classList.contains('dpsh-sheet')) { out.push({ foglio: n }); continue; }
                    if (n.nodeType === 1 && n.querySelector('.dpsh-sheet')) { segmentiWord(ctx, n, out); continue; }
                    if (n.nodeType === 1 && (nascostoWord(ctx, n) || n.classList.contains('no-print'))) continue;
                    if (n.nodeType === 3 && !/\S/.test(n.textContent)) continue;
                    if (n.nodeType !== 1 && n.nodeType !== 3) continue;
                    const ultimo = out[out.length - 1];
                    const cs = n.nodeType === 1 ? ctx.win.getComputedStyle(n) : null;
                    const salto = cs && (cs.breakBefore === 'page' || cs.pageBreakBefore === 'always');
                    if (ultimo && ultimo.flusso && !salto) ultimo.flusso.push(n);
                    else out.push({ flusso: [n], padre: radice });
                }
                return out;
            }

            /** Il contenuto che scorre: largo quanto lo spazio utile del foglio A4 stampato, così le
             * righe vanno a capo negli stessi punti; le pagine le fa Word. */
            async function flussoWord(ctx, seg, mrg) {
                ctx.limite = Infinity;
                const foglie = raccogliFoglieWord(ctx, seg.padre, [], seg.flusso);
                const r = seg.padre.getBoundingClientRect();
                const corpo = foglie.length ? (await impaginaWord(ctx, foglie, r.left, r.width, Math.min(...foglie.map(f => f.r.y)))).xml : '';
                const mm = (v) => Math.round(v * 56.6929);
                const sezione = `<w:sectPr>${intestazioneInSezione(ctx, null)}${piedeInSezione(ctx)}<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${mm(mrg.top)}" w:right="${mm(mrg.right)}" w:bottom="${mm(mrg.bottom)}" w:left="${mm(mrg.left)}" w:header="0" w:footer="0" w:gutter="0"/><w:cols w:space="0"/></w:sectPr>`;
                return { xml: corpo, sezione };
            }

            /** Dal documento di stampa (lo stesso del PDF) al file .docx. Ritorna il Blob, quante
             * pagine fisse ha e quanti riquadri di mappa non si sono potuti scaricare. */
            async function documentoStampaInDocx(htmlDocumento, opzioni) {
                const o = opzioni || {};
                const mrg = o.margini || marginiPaginaDiDefault();
                const cornice = document.createElement('iframe');
                // Larga quanto lo spazio utile del foglio stampato: i fogli hanno comunque la loro
                // larghezza fissa, il contenuto che scorre va a capo come nel PDF.
                cornice.style.cssText = `position:fixed; left:-10000px; top:0; width:${210 - mrg.left - mrg.right}mm; height:297mm; border:0; visibility:hidden;`;
                document.body.appendChild(cornice);
                try {
                    const doc = cornice.contentWindow.document;
                    doc.open(); doc.write(htmlDocumento); doc.close();
                    await new Promise(ok => { if (doc.readyState === 'complete') ok(); else cornice.contentWindow.addEventListener('load', ok, { once: true }); });
                    const st = doc.createElement('style');
                    st.textContent = 'html,body{margin:0!important;padding:0!important;background:#fff!important;} .a4-page{width:auto!important;min-height:0!important;margin:0!important;padding:0!important;box-shadow:none!important;} .dpsh-sheet{margin:0!important;}';
                    doc.head.appendChild(st);
                    if (doc.fonts && doc.fonts.ready) await doc.fonts.ready;
                    if (o.onAvanzamento) o.onAvanzamento('Scarico le mappe…', 0);
                    const mancanti = await incorporaImmaginiWord(doc);
                    const ctx = nuovoContestoWord(doc, o);
                    const numeroPagina = doc.querySelector('.dpsh-sheet [data-numero-pagina]');
                    if (numeroPagina) ctx.piede = piedeWord(ctx, numeroPagina);
                    const radice = doc.querySelector('.dpsh-sheet-stack') || doc.querySelector('.a4-page') || doc.body;
                    const segmenti = segmentiWord(ctx, radice, []);
                    let corpo = '', sezione = '';
                    for (let i = 0; i < segmenti.length; i++) {
                        if (o.onAvanzamento) o.onAvanzamento(`Pagina ${i + 1} di ${segmenti.length}…`, (i + 1) / segmenti.length);
                        // Il seguito dell'indice è già nel Sommario del primo foglio (sommarioWord).
                        if (segmenti[i].foglio && segmenti[i].foglio.hasAttribute('data-sommario-seguito')) continue;
                        if (sezione) corpo += chiusuraSezioneWord(sezione);
                        const f = segmenti[i].foglio ? await foglioWord(ctx, segmenti[i].foglio) : await flussoWord(ctx, segmenti[i], mrg);
                        corpo += f.xml;
                        sezione = f.sezione;
                        await new Promise(r => setTimeout(r, 0));
                    }
                    const pagine = segmenti.filter(x => x.foglio).length;
                    return { blob: new Blob([pacchettoDocxWord(corpo, sezione, ctx.media, ctx)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), mancanti, pagine };
                } finally {
                    cornice.remove();
                }
            }
