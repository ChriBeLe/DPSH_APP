            // ===================== SCRITTORE PDF/A-2b =====================
            // window.print non sa fare il PDF/A: il PDF che esce dal pannello di stampa porta i
            // caratteri del sistema, trasparenze e metadati a caso. Qui il PDF si scrive a mano con
            // pdf-lib (vendor/pdf-lib.min.js, MIT) e i caratteri si incorporano con fontkit
            // (vendor/fontkit.umd.min.js, MIT), pronto per l'archiviazione a norma:
            //  - ISO 19005-2, livello B: metadati XMP con pdfaid:part=2 e conformance=B;
            //  - OutputIntent sRGB con il profilo ICC incorporato (i colori sono tutti RGB);
            //  - ID del documento nel trailer, niente cifratura, niente JavaScript;
            //  - tutti i caratteri incorporati (sottoinsieme), mai quelli standard non incorporati;
            //  - NIENTE TRASPARENZE: ogni colore semitrasparente è già fuso col bianco del foglio e le
            //    immagini sono appiattite (RGB opache), così non serve nessun gruppo di trasparenza.
            // Questo file è solo lo scrittore: riceve pagine già misurate (rettangoli, linee, righe di
            // testo, immagini in px del foglio) da 071i2 e le mette nel PDF. Non sa niente dell'HTML.

            const PDFA_PX_PT = 0.75;   // 1 px CSS = 0,75 pt
            // Profilo sRGB di LittleCMS («sRGB built-in», 588 byte): nessun diritto d'autore, uso libero.
            const PDFA_ICC_SRGB_B64 = 'AAACTGxjbXMEQAAAbW50clJHQiBYWVogB+oACwAXAA4ADQAwYWNzcEFQUEwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPbWAAEAAAAA0y1sY21zAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALZGVzYwAAAQgAAAA2Y3BydAAAAUAAAABMd3RwdAAAAYwAAAAUY2hhZAAAAaAAAAAsclhZWgAAAcwAAAAUYlhZWgAAAeAAAAAUZ1hZWgAAAfQAAAAUclRSQwAAAggAAAAgZ1RSQwAAAggAAAAgYlRSQwAAAggAAAAgY2hybQAAAigAAAAkbWx1YwAAAAAAAAABAAAADGVuVVMAAAAaAAAAHABzAFIARwBCACAAYgB1AGkAbAB0AC0AaQBuAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAADAAAAAcAE4AbwAgAGMAbwBwAHkAcgBpAGcAaAB0ACwAIAB1AHMAZQAgAGYAcgBlAGUAbAB5WFlaIAAAAAAAAPbWAAEAAAAA0y1zZjMyAAAAAAABDEIAAAXe///zJQAAB5MAAP2Q///7of///aIAAAPcAADAblhZWiAAAAAAAABvoAAAOPUAAAOQWFlaIAAAAAAAACSfAAAPhAAAtsNYWVogAAAAAAAAYpcAALeHAAAY2XBhcmEAAAAAAAMAAAACZmYAAPKnAAANWQAAE9AAAApbY2hybQAAAAAAAwAAAACj1wAAVHsAAEzNAACZmgAAJmYAAA9c';

            /** Pdf-lib e fontkit sono nel file come testo (vendorPdfLib, vendorFontkit): si eseguono la
             * prima volta che serve un PDF/A, con un elemento script come Leaflet. */
            let promessaPdfLib = null;
            function caricaPdfLib() {
                if (globalThis.PDFLib && globalThis.fontkit) return Promise.resolve({ PDFLib: globalThis.PDFLib, fontkit: globalThis.fontkit });
                if (promessaPdfLib) return promessaPdfLib;
                promessaPdfLib = new Promise((ok, ko) => {
                    try {
                        const esegui = (id) => {
                            const testo = document.getElementById(id);
                            if (!testo || !testo.textContent.trim()) throw new Error('Il generatore di PDF/A non è in questa versione dell\'app.');
                            const s = document.createElement('script');
                            s.textContent = testo.textContent;
                            document.head.appendChild(s);
                            s.remove();
                        };
                        if (!globalThis.PDFLib) esegui('vendorPdfLib');
                        if (!globalThis.fontkit) esegui('vendorFontkit');
                        if (!globalThis.PDFLib || !globalThis.fontkit) throw new Error('Il generatore di PDF/A non si è avviato.');
                        ok({ PDFLib: globalThis.PDFLib, fontkit: globalThis.fontkit });
                    } catch (e) { promessaPdfLib = null; ko(e); }
                });
                return promessaPdfLib;
            }

            /** Un font WOFF2 (come sono incorporati nell'app) in TrueType semplice. Fontkit legge il
             * WOFF2 ma non sa farne il sottoinsieme (i contorni dei glifi sono in forma trasformata):
             * si rifà la tabella glyf dai contorni già decodificati e si rimette insieme il file.
             * Le istruzioni di hinting non servono a un PDF e si perdono; kerning e legature (GPOS,
             * GSUB) restano, così le larghezze sono quelle del browser. Un font già TrueType passa. */
            function woff2InTrueType(fontkit, bytes) {
                const fk = fontkit.create(bytes);
                if (!fk._decompress || !fk.directory || !fk.directory.tables) return bytes;
                fk._decompress();
                const tab = fk.directory.tables, buf = fk.stream.buffer;
                if (tab.glyf && tab.glyf.transformed && !fk._transformedGlyphs) fk._transformGlyfTable();
                const gl = fk._transformedGlyphs || [], n = gl.length;
                const f2 = v => Math.round(v * 16384);
                const parti = gl.map((g, i) => {
                    const nc = g.numberOfContours;
                    if (!nc) return new Uint8Array(0);
                    const cb = fk.getGlyph(i).cbox;
                    const testa = (len) => {
                        const d = new DataView(new ArrayBuffer(len));
                        d.setInt16(0, nc); d.setInt16(2, Math.round(cb.minX)); d.setInt16(4, Math.round(cb.minY));
                        d.setInt16(6, Math.round(cb.maxX)); d.setInt16(8, Math.round(cb.maxY));
                        return d;
                    };
                    if (nc > 0) {
                        const pts = g.points, np = pts.length;
                        const d = testa(10 + nc * 2 + 2 + np + np * 4);
                        let p = 10;
                        pts.forEach((pt, k) => { if (pt.endContour) { d.setUint16(p, k); p += 2; } });
                        d.setUint16(p, 0); p += 2;                      // nessuna istruzione
                        pts.forEach(pt => { d.setUint8(p++, pt.onCurve ? 1 : 0); });
                        let px = 0; pts.forEach(pt => { d.setInt16(p, pt.x - px); p += 2; px = pt.x; });
                        let py = 0; pts.forEach(pt => { d.setInt16(p, pt.y - py); p += 2; py = pt.y; });
                        return new Uint8Array(d.buffer, 0, p);
                    }
                    const comp = g.components.map((c, k) => {
                        const due = c.scale10 || c.scale01, xy = !due && c.scaleX !== c.scaleY, uno = !due && !xy && c.scaleX !== 1;
                        const v = [0x1 | 0x2 | (k < g.components.length - 1 ? 0x20 : 0) | (due ? 0x80 : xy ? 0x40 : uno ? 0x8 : 0), c.glyphID, c.dx, c.dy];
                        if (due) v.push(f2(c.scaleX), f2(c.scale01), f2(c.scale10), f2(c.scaleY));
                        else if (xy) v.push(f2(c.scaleX), f2(c.scaleY));
                        else if (uno) v.push(f2(c.scaleX));
                        return v;
                    });
                    const d = testa(10 + comp.reduce((s, v) => s + 8 + (v.length - 4) * 2, 0));
                    let p = 10;
                    comp.forEach(v => {
                        d.setUint16(p, v[0]); d.setUint16(p + 2, v[1]); d.setInt16(p + 4, v[2]); d.setInt16(p + 6, v[3]); p += 8;
                        for (let q = 4; q < v.length; q++) { d.setInt16(p, v[q]); p += 2; }
                    });
                    return new Uint8Array(d.buffer, 0, p);
                });
                let tot = 0;
                const loca = new DataView(new ArrayBuffer((n + 1) * 4));
                parti.forEach((u, i) => { loca.setUint32(i * 4, tot); tot += (u.length + 3) & ~3; });
                loca.setUint32(n * 4, tot);
                const glyf = new Uint8Array(tot);
                let o = 0; parti.forEach(u => { glyf.set(u, o); o += (u.length + 3) & ~3; });
                const tabelle = Object.keys(tab).map(tag => {
                    if (tag === 'glyf') return [tag, glyf];
                    if (tag === 'loca') return [tag, new Uint8Array(loca.buffer)];
                    const e = tab[tag], dati = new Uint8Array(buf.slice(e.offset, e.offset + e.length));
                    if (tag === 'head') new DataView(dati.buffer).setInt16(50, 1);   // loca in formato lungo
                    return [tag, dati];
                }).sort((a, b) => a[0] < b[0] ? -1 : 1);
                const inizio = 12 + tabelle.length * 16, dir = new DataView(new ArrayBuffer(inizio));
                let sr = 1, es = 0; while (sr * 2 <= tabelle.length) { sr *= 2; es++; }
                dir.setUint32(0, 0x00010000); dir.setUint16(4, tabelle.length); dir.setUint16(6, sr * 16); dir.setUint16(8, es); dir.setUint16(10, tabelle.length * 16 - sr * 16);
                const ttf = new Uint8Array(tabelle.reduce((s, t) => s + ((t[1].length + 3) & ~3), inizio));
                let q = inizio;
                tabelle.forEach((t, i) => {
                    for (let k = 0; k < 4; k++) dir.setUint8(12 + i * 16 + k, t[0].charCodeAt(k));
                    const dv = new DataView(t[1].buffer, t[1].byteOffset, t[1].byteLength);
                    let cs = 0; for (let k = 0; k + 4 <= t[1].length; k += 4) cs = (cs + dv.getUint32(k)) >>> 0;
                    dir.setUint32(12 + i * 16 + 4, cs); dir.setUint32(12 + i * 16 + 8, q); dir.setUint32(12 + i * 16 + 12, t[1].length);
                    ttf.set(t[1], q); q += (t[1].length + 3) & ~3;
                });
                ttf.set(new Uint8Array(dir.buffer), 0);
                return ttf;
            }

            const pdfaDueCifre = (n) => String(n).padStart(2, '0');
            /** Data in due forme: quella del dizionario Info (PDF) e quella dell'XMP (ISO 8601). */
            function dataPdfA(d) {
                const Y = d.getUTCFullYear(), M = pdfaDueCifre(d.getUTCMonth() + 1), D = pdfaDueCifre(d.getUTCDate()),
                    h = pdfaDueCifre(d.getUTCHours()), m = pdfaDueCifre(d.getUTCMinutes()), s = pdfaDueCifre(d.getUTCSeconds());
                return { pdf: `D:${Y}${M}${D}${h}${m}${s}Z`, xmp: `${Y}-${M}-${D}T${h}:${m}:${s}Z` };
            }
            const pdfaXml = (s) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const pdfaHex = (u8) => Array.from(u8).map(b => b.toString(16).padStart(2, '0')).join('');

            /** Il pacchetto XMP con la dichiarazione PDF/A-2b. Scritto senza compressione, come vuole la norma. */
            function xmpPdfA(meta, id, date) {
                const uuid = (h) => `uuid:${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
                const parole = (meta.parole || '').trim();
                return '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n'
                    + '<x:xmpmeta xmlns:x="adobe:ns:meta/">\n<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n'
                    + '<rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">\n<pdfaid:part>2</pdfaid:part>\n<pdfaid:conformance>B</pdfaid:conformance>\n</rdf:Description>\n'
                    + '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">\n'
                    + `<dc:format>application/pdf</dc:format>\n<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${pdfaXml(meta.titolo)}</rdf:li></rdf:Alt></dc:title>\n`
                    + (meta.autore ? `<dc:creator><rdf:Seq><rdf:li>${pdfaXml(meta.autore)}</rdf:li></rdf:Seq></dc:creator>\n` : '')
                    + (meta.soggetto ? `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${pdfaXml(meta.soggetto)}</rdf:li></rdf:Alt></dc:description>\n` : '')
                    + '</rdf:Description>\n'
                    + '<rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">\n'
                    + `<pdf:Producer>${pdfaXml(meta.produttore)}</pdf:Producer>\n` + (parole ? `<pdf:Keywords>${pdfaXml(parole)}</pdf:Keywords>\n` : '')
                    + '</rdf:Description>\n'
                    + '<rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">\n'
                    + `<xmp:CreatorTool>${pdfaXml(meta.creatore)}</xmp:CreatorTool>\n<xmp:CreateDate>${date.xmp}</xmp:CreateDate>\n<xmp:ModifyDate>${date.xmp}</xmp:ModifyDate>\n<xmp:MetadataDate>${date.xmp}</xmp:MetadataDate>\n`
                    + '</rdf:Description>\n'
                    + '<rdf:Description rdf:about="" xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/">\n'
                    + `<xmpMM:DocumentID>${uuid(id)}</xmpMM:DocumentID>\n<xmpMM:InstanceID>${uuid(id)}</xmpMM:InstanceID>\n`
                    + '</rdf:Description>\n</rdf:RDF>\n</x:xmpmeta>\n<?xpacket end="w"?>';
            }

            /** Colore '#rrggbb' (o 'rrggbb') in tre numeri 0-1 per pdf-lib. */
            function coloreRgbPdfA(esa) {
                const h = String(esa || '000000').replace('#', '');
                return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
            }

            /** Lo scrittore. meta: { titolo, autore, soggetto, parole, creatore, produttore, data }.
             * fonti: [{ famiglia, peso, corsivo, dati: () => Uint8Array (WOFF2 o TrueType) }]. */
            async function creaScrittorePdfA(meta, fonti) {
                const { PDFLib, fontkit } = await caricaPdfLib();
                const { PDFDocument, PDFName, PDFString, PDFHexString, PDFArray, rgb, pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject } = PDFLib;
                const data = dataPdfA(meta.data || new Date());
                const pdf = await PDFDocument.create({ updateMetadata: false });
                pdf.registerFontkit(fontkit);
                pdf.setTitle(meta.titolo || 'Documento');
                if (meta.autore) pdf.setAuthor(meta.autore);
                if (meta.soggetto) pdf.setSubject(meta.soggetto);
                if (meta.parole) pdf.setKeywords([meta.parole]);
                pdf.setProducer(meta.produttore || 'DPSH Field Collector');
                pdf.setCreator(meta.creatore || 'DPSH Field Collector');
                pdf.setCreationDate(new Date(meta.data || Date.now()));
                pdf.setModificationDate(new Date(meta.data || Date.now()));
                const ctx = pdf.context;

                // ID del documento (due uguali alla creazione) e XMP con lo stesso identificativo.
                const idBytes = new Uint8Array(16);
                (globalThis.crypto && globalThis.crypto.getRandomValues) ? globalThis.crypto.getRandomValues(idBytes) : idBytes.forEach((_, i) => { idBytes[i] = Math.floor(Math.random() * 256); });
                const idHex = pdfaHex(idBytes);
                ctx.trailerInfo.ID = ctx.obj([PDFHexString.of(idHex), PDFHexString.of(idHex)]);

                const xmp = new TextEncoder().encode(xmpPdfA(meta, idHex, data));
                pdf.catalog.set(PDFName.of('Metadata'), ctx.register(ctx.stream(xmp, { Type: 'Metadata', Subtype: 'XML' })));

                const iccBin = Uint8Array.from(atob(PDFA_ICC_SRGB_B64), c => c.charCodeAt(0));
                const icc = ctx.register(ctx.flateStream(iccBin, { N: 3 }));
                pdf.catalog.set(PDFName.of('OutputIntents'), ctx.obj([ctx.obj({
                    Type: 'OutputIntent', S: 'GTS_PDFA1',
                    OutputConditionIdentifier: PDFString.of('sRGB'), Info: PDFString.of('sRGB built-in'),
                    RegistryName: PDFString.of('http://www.color.org'), DestOutputProfile: icc
                })]));
                pdf.catalog.set(PDFName.of('Lang'), PDFString.of('it-IT'));

                // ---- Caratteri: si incorporano solo quelli usati, una volta ciascuno ----
                const elencoFonti = fonti || [];
                const incorporati = new Map();
                const chiaveFont = (famiglia, peso, corsivo) => `${String(famiglia).toLowerCase()}|${peso >= 600 ? 700 : 400}|${corsivo ? 'i' : 'n'}`;
                /** Il carattere per famiglia, grassetto e corsivo (il più vicino se non c'è proprio). */
                function trovaFonte(famiglia, peso, corsivo) {
                    const f = String(famiglia).toLowerCase();
                    const dellaFamiglia = elencoFonti.filter(x => String(x.famiglia).toLowerCase() === f);
                    if (!dellaFamiglia.length) return null;
                    const bold = peso >= 600 ? 700 : 400;
                    return dellaFamiglia.find(x => (x.peso >= 600 ? 700 : 400) === bold && !!x.corsivo === !!corsivo)
                        || dellaFamiglia.find(x => (x.peso >= 600 ? 700 : 400) === bold)
                        || dellaFamiglia.find(x => !!x.corsivo === !!corsivo)
                        || dellaFamiglia[0];
                }
                async function fonte(famiglia, peso, corsivo) {
                    const voce = trovaFonte(famiglia, peso, corsivo);
                    if (!voce) return null;
                    const k = chiaveFont(voce.famiglia, voce.peso, voce.corsivo);
                    if (!incorporati.has(k)) {
                        incorporati.set(k, (async () => {
                            const ttf = woff2InTrueType(fontkit, await voce.dati());
                            const f = await pdf.embedFont(ttf, { subset: true });
                            const fk = f.embedder.font;
                            return {
                                famiglia: voce.famiglia, pdf: f, fk,
                                // Ascesa e discesa come le arrotonda il browser per il rettangolo del testo.
                                ascesa: fk.ascent / fk.unitsPerEm, discesa: -fk.descent / fk.unitsPerEm,
                                copre: (cp) => { try { return fk.hasGlyphForCodePoint(cp); } catch (e) { return false; } },
                                larghezza: (t, size) => f.widthOfTextAtSize(t, size)
                            };
                        })());
                    }
                    return incorporati.get(k);
                }

                // ---- Immagini: una sola copia di ciò che si ripete (il logo su ogni pagina) ----
                const immagini = new Map();
                async function immagine(chiave, sorgente) {
                    if (!immagini.has(chiave)) {
                        immagini.set(chiave, (async () => {
                            if (sorgente.jpeg) return await pdf.embedJpg(sorgente.jpeg);
                            // RGB opaco, senza canale alfa: niente SMask, niente trasparenza.
                            const flusso = ctx.flateStream(sorgente.rgb, { Type: 'XObject', Subtype: 'Image', Width: sorgente.w, Height: sorgente.h, ColorSpace: 'DeviceRGB', BitsPerComponent: 8 });
                            return { ref: ctx.register(flusso), grezza: true };
                        })());
                    }
                    return immagini.get(chiave);
                }

                let contaImmagini = 0;
                /** Mette una pagina nel PDF. larghezza/altezza in px CSS; ops nel sistema del foglio (px, y in giù). */
                async function pagina(larghezza, altezza, ops, opzioni) {
                    const W = larghezza * PDFA_PX_PT, H = altezza * PDFA_PX_PT;
                    const pg = pdf.addPage([W, H]);
                    const Y = (y) => H - y * PDFA_PX_PT;
                    if (opzioni && opzioni.sfondo) pg.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(...coloreRgbPdfA(opzioni.sfondo)), borderWidth: 0 });
                    for (const op of ops) {
                        if (op.t === 'r') {
                            pg.drawRectangle({ x: op.x * PDFA_PX_PT, y: Y(op.y + op.h), width: op.w * PDFA_PX_PT, height: op.h * PDFA_PX_PT, color: rgb(...coloreRgbPdfA(op.col)), borderWidth: 0 });
                        } else if (op.t === 'l') {
                            pg.drawLine({ start: { x: op.x1 * PDFA_PX_PT, y: Y(op.y1) }, end: { x: op.x2 * PDFA_PX_PT, y: Y(op.y2) }, thickness: op.sp * PDFA_PX_PT, color: rgb(...coloreRgbPdfA(op.col)), dashArray: op.tratti ? op.tratti.map(v => v * PDFA_PX_PT) : undefined });
                        } else if (op.t === 's') {
                            pg.drawText(op.txt, { x: op.x * PDFA_PX_PT, y: Y(op.base), size: op.size * PDFA_PX_PT, font: op.font.pdf, color: rgb(...coloreRgbPdfA(op.col)) });
                        } else if (op.t === 'i') {
                            const im = await immagine(op.chiave, op.img);
                            if (im.grezza) {
                                const nome = pg.node.newXObject('Im' + (++contaImmagini), im.ref);
                                pg.pushOperators(pushGraphicsState(), concatTransformationMatrix(op.w * PDFA_PX_PT, 0, 0, op.h * PDFA_PX_PT, op.x * PDFA_PX_PT, Y(op.y + op.h)), drawObject(nome), popGraphicsState());
                            } else {
                                pg.drawImage(im, { x: op.x * PDFA_PX_PT, y: Y(op.y + op.h), width: op.w * PDFA_PX_PT, height: op.h * PDFA_PX_PT });
                            }
                        }
                    }
                }

                /** Il file finito. Senza flussi di oggetti: i validatori più vecchi li leggono male. */
                async function chiudi() {
                    if (!pdf.getPageCount()) pdf.addPage([595.28, 841.89]);
                    return await pdf.save({ useObjectStreams: false, addDefaultPage: false });
                }
                return { fonte, pagina, chiudi, pagine: () => pdf.getPageCount() };
            }
