            // ===================== FOTO IN INGRESSO: RADDRIZZA E COMPRIMI =====================
            // Una foto del telefono pesa 3-8 MB e porta la rotazione scritta a parte (EXIF,
            // «Orientation»): il browser la raddrizza a schermo, ma Word, PDF/A e gli altri
            // programmi no, e la foto verticale compariva sdraiata. Qui, appena la foto entra
            // (fotocamera, galleria, importazione multipla), la rotazione si SCRIVE NEI PIXEL, il
            // lato lungo si porta a 2560 px e il file si ricomprime in JPEG 0,85. Si lascia stare la
            // foto se il risultato non è più leggero (a meno che non serva raddrizzarla).
            //
            // L'EXIF con le coordinate GPS e la data di scatto si legge PRIMA (parseExifGps /
            // parseExifData, sul file originale) e finisce nei campi della foto (lat, lng,
            // scattataIl): la ricompressione non li toglie all'app, ne toglie solo la copia dentro
            // il file. Se qualcosa va storto la foto entra com'era: mai perdere uno scatto.

            const FOTO_LATO_MAX_PX = 2560;
            const FOTO_QUALITA_JPEG = 0.85;

            /** L'orientamento EXIF (1-8) di un JPEG; 1 se manca o il file non è un JPEG. */
            function orientamentoExifJpeg(arrayBuffer) {
                try {
                    const v = new DataView(arrayBuffer);
                    if (v.byteLength < 14 || v.getUint16(0, false) !== 0xFFD8) return 1;
                    let o = 2;
                    while (o + 4 < v.byteLength) {
                        const marcatore = v.getUint16(o, false);
                        if ((marcatore & 0xFF00) !== 0xFF00 || marcatore === 0xFFDA) break;
                        const lunghezza = v.getUint16(o + 2, false);
                        if (marcatore === 0xFFE1 && v.getUint32(o + 4, false) === 0x45786966) {
                            const tiff = o + 10, piccolo = v.getUint16(tiff, false) === 0x4949;
                            const ifd = tiff + v.getUint32(tiff + 4, piccolo);
                            const voci = v.getUint16(ifd, piccolo);
                            for (let i = 0; i < voci; i++) {
                                const e = ifd + 2 + i * 12;
                                if (e + 12 > v.byteLength) break;
                                if (v.getUint16(e, piccolo) === 0x0112) {
                                    const val = v.getUint16(e + 8, piccolo);
                                    return val >= 1 && val <= 8 ? val : 1;
                                }
                            }
                            return 1;
                        }
                        o += 2 + lunghezza;
                    }
                } catch (e) { /* nessun EXIF leggibile: si tratta come non ruotata */ }
                return 1;
            }

            /** Larghezza e altezza dei pixel come stanno nel file JPEG (prima di ogni rotazione). */
            function dimensioniJpeg(arrayBuffer) {
                try {
                    const v = new DataView(arrayBuffer);
                    if (v.byteLength < 4 || v.getUint16(0, false) !== 0xFFD8) return null;
                    let o = 2;
                    while (o + 9 < v.byteLength) {
                        const marcatore = v.getUint16(o, false);
                        if ((marcatore & 0xFF00) !== 0xFF00) return null;
                        if (marcatore >= 0xFFC0 && marcatore <= 0xFFCF && marcatore !== 0xFFC4 && marcatore !== 0xFFC8 && marcatore !== 0xFFCC) {
                            return { w: v.getUint16(o + 7, false), h: v.getUint16(o + 5, false) };
                        }
                        o += 2 + v.getUint16(o + 2, false);
                    }
                } catch (e) { /* JPEG danneggiato */ }
                return null;
            }

            /** Cosa fare con una foto di w×h pixel e orientamento `orient`: dimensioni finali, scala e
             * la matrice con cui disegnare i pixel grezzi su una tela (setTransform: a, b, c, d, e, f).
             * Pura: non tocca il DOM, per questo si prova senza browser. */
            function pianoFoto(orient, w, h, latoMax) {
                const o = orient >= 1 && orient <= 8 ? orient : 1;
                const scambia = o >= 5;
                const ow = scambia ? h : w, oh = scambia ? w : h;
                const scala = Math.min(1, (latoMax || FOTO_LATO_MAX_PX) / Math.max(ow, oh, 1));
                const m = [[1, 0, 0, 1, 0, 0], [-1, 0, 0, 1, w, 0], [-1, 0, 0, -1, w, h], [1, 0, 0, -1, 0, h],
                    [0, 1, 1, 0, 0, 0], [0, 1, -1, 0, h, 0], [0, -1, -1, 0, h, w], [0, -1, 1, 0, 0, w]][o - 1];
                return {
                    orient: o, scala,
                    larghezza: Math.max(1, Math.round(ow * scala)), altezza: Math.max(1, Math.round(oh * scala)),
                    matrice: m.map(x => x * scala)
                };
            }

            /** Peso in byte di un data URL base64. */
            function pesoDataUrl(url) {
                const i = String(url).indexOf(',');
                return i < 0 ? 0 : Math.floor((String(url).length - i - 1) * 3 / 4);
            }

            /** Il decodificatore e il disegnatore del browser. Si possono sostituire (dipendenzeFoto)
             * per provare la logica senza una vera tela. */
            let dipendenzeFoto = null;
            const dipendenzeFotoBrowser = {
                /** Decodifica il file. giaOrientata: il browser ha già applicato l'EXIF ai pixel. */
                async decodifica(file, info) {
                    const attesaRaddrizzata = info.orient >= 5 && info.dim;
                    if (typeof createImageBitmap === 'function') {
                        try {
                            const bm = await createImageBitmap(file, { imageOrientation: 'from-image' });
                            // Un browser che ignora l'opzione lascia i pixel grezzi: lo si vede dalle misure.
                            const giaOrientata = info.orient === 1 ? true : (attesaRaddrizzata ? bm.width === info.dim.h && bm.height === info.dim.w : true);
                            return { sorgente: bm, w: bm.width, h: bm.height, giaOrientata, chiudi: () => { try { bm.close(); } catch (e) { /* già chiusa */ } } };
                        } catch (e) { /* si passa all'elemento <img> */ }
                    }
                    const url = URL.createObjectURL(file);
                    try {
                        const img = new Image();
                        img.src = url;
                        await img.decode();
                        const giaOrientata = info.orient === 1 ? true : (attesaRaddrizzata ? img.naturalWidth === info.dim.h && img.naturalHeight === info.dim.w : true);
                        return { sorgente: img, w: img.naturalWidth, h: img.naturalHeight, giaOrientata, chiudi: () => URL.revokeObjectURL(url) };
                    } catch (e) { URL.revokeObjectURL(url); throw e; }
                },
                /** Disegna secondo il piano e restituisce il data URL JPEG. */
                async disegna(dec, piano, qualita, opaco) {
                    const tela = document.createElement('canvas');
                    tela.width = piano.larghezza; tela.height = piano.altezza;
                    const g = tela.getContext('2d');
                    if (!g) throw new Error('tela non disponibile');
                    if (opaco) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, tela.width, tela.height); }
                    if (dec.giaOrientata) g.drawImage(dec.sorgente, 0, 0, tela.width, tela.height);
                    else { g.setTransform.apply(g, piano.matrice); g.drawImage(dec.sorgente, 0, 0); }
                    const url = tela.toDataURL('image/jpeg', qualita);
                    tela.width = tela.height = 0;
                    return url;
                }
            };

            /** Dalla foto scelta a ciò che si salva: data URL raddrizzato, ridimensionato e ricompresso.
             * `originale` è il data URL del file così com'è (già letto da chi chiama): è anche il
             * ripiego per qualunque errore. */
            async function preparaFotoImportata(file, arrayBuffer, originale) {
                const esito = await preparaFotoImportataDettaglio(file, arrayBuffer, originale);
                return esito.dataUrl;
            }
            async function preparaFotoImportataDettaglio(file, arrayBuffer, originale) {
                const invariata = (motivo) => ({ dataUrl: originale, cambiata: false, motivo });
                if (!originale || !file) return invariata('vuota');
                const tipo = String(file.type || '').toLowerCase();
                const jpeg = tipo === 'image/jpeg' || tipo === 'image/jpg';
                if (!jpeg && tipo !== 'image/png' && tipo !== 'image/webp') return invariata('formato');
                const dip = dipendenzeFoto || dipendenzeFotoBrowser;
                let dec = null;
                try {
                    const orient = jpeg ? orientamentoExifJpeg(arrayBuffer) : 1;
                    const dim = jpeg ? dimensioniJpeg(arrayBuffer) : null;
                    dec = await dip.decodifica(file, { orient, dim });
                    // Se il browser ha già raddrizzato, le misure sono quelle finali; se no, quelle grezze del file.
                    const piano = dec.giaOrientata ? pianoFoto(1, dec.w, dec.h) : pianoFoto(orient, dec.w, dec.h);
                    const serveRaddrizzare = orient !== 1;
                    // Un PNG o WebP già piccolo resta com'è: non lo si converte in JPEG per risparmiare niente.
                    if (!jpeg && piano.scala >= 1) return invariata('piccola');
                    const url = await dip.disegna(dec, piano, FOTO_QUALITA_JPEG, !jpeg);
                    if (!serveRaddrizzare && pesoDataUrl(url) >= pesoDataUrl(originale)) return invariata('non-piu-leggera');
                    return { dataUrl: url, cambiata: true, raddrizzata: serveRaddrizzare, scala: piano.scala, larghezza: piano.larghezza, altezza: piano.altezza, motivo: 'ok' };
                } catch (e) {
                    ignoraErrore('preparaFotoImportata', e);
                    return invariata('errore');
                } finally {
                    if (dec && dec.chiudi) dec.chiudi();
                }
            }
