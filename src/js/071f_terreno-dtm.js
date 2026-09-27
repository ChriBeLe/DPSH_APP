            // IL TERRENO DEL PROGETTO (DTM): da un GeoTIFF o da un ASCII Grid si tiene solo la parte
            // attorno alle prove, ricampionata a non più di 250 × 250 celle, dentro il progetto (così
            // viaggia nel pacchetto e nel backup, e in campo non serve la rete). Da lì: la quota di ogni
            // prova, i profili, la sezione e la vista 3D.
            // Sistemi di riferimento: UTM (WGS84, ETRS89, RDN2008) e coordinate geografiche. Se il file
            // non lo dice (.asc senza .prj), si ricava dalle coordinate delle prove.

            const DTM_MAX_CELLE = 250;
            const DTM_MARGINE_M = 150;

            // ---- Coordinate: da latitudine e longitudine a UTM (ellissoide WGS84; GRS80 differisce di
            // meno di un millimetro) ----
            function utmDaGeo(lat, lng, zona) {
                const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996;
                const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
                const fi = lat * Math.PI / 180, lambda = lng * Math.PI / 180;
                const lambda0 = ((zona - 1) * 6 - 180 + 3) * Math.PI / 180;
                const N = a / Math.sqrt(1 - e2 * Math.sin(fi) ** 2);
                const T = Math.tan(fi) ** 2, C = ep2 * Math.cos(fi) ** 2, A = Math.cos(fi) * (lambda - lambda0);
                const M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * fi
                    - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * fi)
                    + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * fi)
                    - (35 * e2 ** 3 / 3072) * Math.sin(6 * fi));
                return {
                    x: 500000 + k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5 / 120),
                    y: k0 * (M + N * Math.tan(fi) * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24 + (61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6 / 720))
                };
            }

            function puntoNelCrs(crs, lat, lng) {
                return crs.tipo === 'geo' ? { x: lng, y: lat } : utmDaGeo(lat, lng, crs.zona);
            }

            // EPSG → sistema. null: non lo so (lo ricavo dalle prove); 'no': conosciuto ma non gestito.
            function crsDaEpsg(epsg) {
                if (!epsg || epsg === 32767) return null;
                if ([4326, 4258, 6706].includes(epsg)) return { tipo: 'geo' };
                if (epsg >= 32601 && epsg <= 32660) return { tipo: 'utm', zona: epsg - 32600 };
                if (epsg >= 25828 && epsg <= 25838) return { tipo: 'utm', zona: epsg - 25800 };
                if (epsg >= 3044 && epsg <= 3046) return { tipo: 'utm', zona: epsg - 3012 };
                if (epsg >= 6707 && epsg <= 6709) return { tipo: 'utm', zona: epsg - 6675 };
                if (epsg >= 7791 && epsg <= 7793) return { tipo: 'utm', zona: epsg - 7759 };
                return 'no';
            }

            // ---- Lettura dei file ----
            // Ogni lettore dà la griglia (x0, y0 = angolo in alto a sinistra; dx, dy > 0), l'EPSG se lo
            // sa, e leggiFinestra(c0, r0, c1, r1) che restituisce solo le celle che servono.

            function leggiAsciiGrid(testo) {
                const righe = testo.split(/\r?\n/);
                const intest = {};
                let i = 0;
                for (; i < righe.length; i++) {
                    const m = /^\s*([a-z_]+)\s+(-?[\d.eE+-]+)\s*$/i.exec(righe[i]);
                    if (!m) break;
                    intest[m[1].toLowerCase()] = parseFloat(m[2]);
                }
                const nx = intest.ncols, ny = intest.nrows, d = intest.cellsize;
                if (!(nx > 0 && ny > 0 && d > 0)) throw new Error('Non è un ASCII Grid: mancano ncols, nrows o cellsize nell\'intestazione.');
                const xll = 'xllcenter' in intest ? intest.xllcenter - d / 2 : intest.xllcorner;
                const yll = 'yllcenter' in intest ? intest.yllcenter - d / 2 : intest.yllcorner;
                const nodata = 'nodata_value' in intest ? intest.nodata_value : null;
                const valori = new Float32Array(nx * ny);
                let k = 0;
                for (; i < righe.length && k < valori.length; i++) {
                    const parti = righe[i].trim().split(/\s+/);
                    for (const p of parti) if (p !== '') {
                        const v = parseFloat(p);
                        valori[k++] = v === nodata ? NaN : v;
                    }
                }
                if (k < valori.length) throw new Error(`L'ASCII Grid è incompleto: ${k} valori su ${valori.length}.`);
                return {
                    nx, ny, dx: d, dy: d, x0: xll, y0: yll + ny * d, epsg: null,
                    leggiFinestra: async (c0, r0, c1, r1) => {
                        const out = new Float32Array((c1 - c0) * (r1 - r0));
                        for (let r = r0; r < r1; r++) out.set(valori.subarray(r * nx + c0, r * nx + c1), (r - r0) * (c1 - c0));
                        return out;
                    }
                };
            }

            function tagTiff(buf) {
                const dv = new DataView(buf);
                const le = dv.getUint16(0) === 0x4949;
                if (!le && dv.getUint16(0) !== 0x4D4D) throw new Error('Non è un file TIFF.');
                if (dv.getUint16(2, le) === 43) throw new Error('È un BigTIFF: salvalo come GeoTIFF normale o come ASCII Grid (.asc).');
                const ifd = dv.getUint32(4, le);
                const DIM = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8, 16: 8 };
                const tag = { le, dv };
                for (let i = 0, n = dv.getUint16(ifd, le); i < n; i++) {
                    const e = ifd + 2 + i * 12;
                    const id = dv.getUint16(e, le), tipo = dv.getUint16(e + 2, le), cnt = dv.getUint32(e + 4, le);
                    const off = (DIM[tipo] || 1) * cnt <= 4 ? e + 8 : dv.getUint32(e + 8, le);
                    if (tipo === 2) { tag[id] = new TextDecoder().decode(new Uint8Array(buf, off, cnt)).replace(/\0+$/, ''); continue; }
                    tag[id] = Array.from({ length: cnt }, (_, k) => {
                        const o = off + k * (DIM[tipo] || 1);
                        switch (tipo) {
                            case 3: return dv.getUint16(o, le);
                            case 4: return dv.getUint32(o, le);
                            case 8: return dv.getInt16(o, le);
                            case 9: return dv.getInt32(o, le);
                            case 11: return dv.getFloat32(o, le);
                            case 12: return dv.getFloat64(o, le);
                            case 16: return Number(dv.getBigUint64(o, le));
                            default: return dv.getUint8(o);
                        }
                    });
                }
                return tag;
            }

            // LZW del TIFF: codici da 9 a 12 bit, il più significativo prima, cambio di larghezza anticipato.
            function lzwTiff(src) {
                const out = [];
                let dict, larg, prec = null, bit = 0;
                const azzera = () => { dict = []; for (let i = 0; i < 256; i++) dict.push([i]); dict.push(null, null); larg = 9; };
                azzera();
                while (bit + larg <= src.length * 8) {
                    let c = 0;
                    for (let i = 0; i < larg; i++, bit++) c = (c << 1) | ((src[bit >> 3] >> (7 - (bit & 7))) & 1);
                    if (c === 257) break;
                    if (c === 256) { azzera(); prec = null; continue; }
                    const voce = c < dict.length ? dict[c] : (prec ? prec.concat(prec[0]) : null);
                    if (!voce) break;
                    for (const b of voce) out.push(b);
                    if (prec) dict.push(prec.concat(voce[0]));
                    prec = voce;
                    if (dict.length + 1 >= (1 << larg) && larg < 12) larg++;
                }
                return new Uint8Array(out);
            }

            async function inflateZlib(bytes) {
                if (typeof DecompressionStream === 'undefined') throw new Error('Questo browser non sa decomprimere il GeoTIFF: salvalo senza compressione o con LZW.');
                const ds = new DecompressionStream('deflate');
                const scrivi = ds.writable.getWriter();
                scrivi.write(bytes);
                scrivi.close();
                const parti = [], leggi = ds.readable.getReader();
                for (let p = await leggi.read(); !p.done; p = await leggi.read()) parti.push(p.value);
                const out = new Uint8Array(parti.reduce((n, p) => n + p.length, 0));
                parti.reduce((o, p) => (out.set(p, o), o + p.length), 0);
                return out;
            }

            function leggiGeoTiff(buf) {
                const t = tagTiff(buf), le = t.le;
                const nx = t[256][0], ny = t[257][0];
                const bit = (t[258] || [8])[0], formato = (t[339] || [1])[0], spp = (t[277] || [1])[0];
                const compr = (t[259] || [1])[0], pred = (t[317] || [1])[0];
                if ((t[284] || [1])[0] !== 1 && spp > 1) throw new Error('GeoTIFF a piani separati: salvalo con una banda sola.');
                if (![1, 5, 8, 32946].includes(compr)) throw new Error('Compressione del GeoTIFF non gestita: salvalo senza compressione, con LZW o con Deflate.');
                const scala = t[33550], punto = t[33922];
                if (!scala || !punto) throw new Error('Il TIFF non ha la georeferenziazione (è un\'immagine, non un DTM).');
                // Chiavi GeoTIFF: 3072 = EPSG proiettato, 2048 = EPSG geografico, 1025 = cella come punto.
                const chiavi = {};
                const gk = t[34735] || [];
                for (let i = 4; i + 3 < gk.length; i += 4) chiavi[gk[i]] = gk[i + 3];
                const dx = scala[0], dy = scala[1];
                const mezza = chiavi[1025] === 2 ? 0.5 : 0;
                const x0 = punto[3] - (punto[0] + mezza) * dx, y0 = punto[4] + (punto[1] + mezza) * dy;
                const nodata = t[42113] !== undefined ? parseFloat(t[42113]) : null;
                const tessere = !!t[322];
                const cw = tessere ? t[322][0] : nx, ch = tessere ? t[323][0] : (t[278] || [ny])[0];
                const offs = tessere ? t[324] : t[273], lunghe = tessere ? t[325] : t[279];
                const perRiga = Math.ceil(nx / cw);
                const bps = bit / 8;
                const leggiValore = (dv, o) => formato === 3 ? (bit === 64 ? dv.getFloat64(o, le) : dv.getFloat32(o, le))
                    : bit === 8 ? (formato === 2 ? dv.getInt8(o) : dv.getUint8(o))
                    : bit === 16 ? (formato === 2 ? dv.getInt16(o, le) : dv.getUint16(o, le))
                    : (formato === 2 ? dv.getInt32(o, le) : dv.getUint32(o, le));

                async function pezzo(i, righe) {
                    let b = new Uint8Array(buf, offs[i], lunghe[i]);
                    if (compr === 5) b = lzwTiff(b);
                    else if (compr === 8 || compr === 32946) b = await inflateZlib(b);
                    else b = b.slice();
                    const rigaByte = cw * spp * bps;
                    if (pred === 2) {
                        const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
                        for (let r = 0; r < righe; r++) for (let c = spp; c < cw * spp; c++) {
                            const o = r * rigaByte + c * bps, p = o - spp * bps;
                            if (bps === 1) b[o] = (b[o] + b[p]) & 255;
                            else if (bps === 2) dv.setUint16(o, (dv.getUint16(o, le) + dv.getUint16(p, le)) & 0xFFFF, le);
                            else dv.setUint32(o, (dv.getUint32(o, le) + dv.getUint32(p, le)) >>> 0, le);
                        }
                    } else if (pred === 3) {
                        // Predittore per i numeri con la virgola: byte rimescolati per riga (prima tutti i
                        // più significativi) e poi differenze; qui si torna indietro.
                        const out = new Uint8Array(b.length);
                        for (let r = 0; r < righe; r++) {
                            const o = r * rigaByte;
                            for (let k = spp; k < rigaByte; k++) b[o + k] = (b[o + k] + b[o + k - spp]) & 255;
                            const n = cw * spp;
                            for (let c = 0; c < n; c++) for (let k = 0; k < bps; k++) {
                                const dest = le ? bps - 1 - k : k;
                                out[o + c * bps + dest] = b[o + k * n + c];
                            }
                        }
                        b = out;
                    }
                    return new DataView(b.buffer, b.byteOffset, b.byteLength);
                }

                return {
                    nx, ny, dx, dy, x0, y0, epsg: chiavi[3072] || chiavi[2048] || null,
                    leggiFinestra: async (c0, r0, c1, r1) => {
                        const w = c1 - c0, out = new Float32Array(w * (r1 - r0)).fill(NaN);
                        for (let pr = Math.floor(r0 / ch); pr * ch < r1; pr++) {
                            for (let pc = tessere ? Math.floor(c0 / cw) : 0; pc * cw < (tessere ? c1 : 1); pc++) {
                                const i = tessere ? pr * perRiga + pc : pr;
                                const righe = tessere ? ch : Math.min(ch, ny - pr * ch);
                                const dv = await pezzo(i, righe);
                                for (let r = Math.max(r0, pr * ch); r < Math.min(r1, pr * ch + righe); r++) {
                                    for (let c = Math.max(c0, pc * cw); c < Math.min(c1, pc * cw + cw, nx); c++) {
                                        const v = leggiValore(dv, ((r - pr * ch) * cw + (c - pc * cw)) * spp * bps);
                                        out[(r - r0) * w + (c - c0)] = v === nodata ? NaN : v;
                                    }
                                }
                            }
                        }
                        return out;
                    }
                };
            }

            // ---- Dal file al ritaglio del progetto ----

            function proveConCoordinate(proj) {
                return Object.values(proj.surveys || {}).filter(s => {
                    const h = s.header || {};
                    return isFinite(parseFloat(h.lat)) && isFinite(parseFloat(h.lng));
                });
            }

            async function ritaglioDtmPerProgetto(file, proj) {
                const nome = file.name || 'DTM';
                const buf = await file.arrayBuffer();
                const sorg = /\.(asc|txt)$/i.test(nome) ? leggiAsciiGrid(new TextDecoder().decode(buf)) : leggiGeoTiff(buf);
                const prove = proveConCoordinate(proj);
                if (!prove.length) throw new Error('Nessuna prova del progetto ha le coordinate: servono per sapere quale parte del DTM tenere. Prendi il GPS di almeno una prova.');
                const punti = prove.map(s => [parseFloat(s.header.lat), parseFloat(s.header.lng)]);
                const dentro = crs => punti.filter(([la, ln]) => {
                    const p = puntoNelCrs(crs, la, ln);
                    return p.x >= sorg.x0 && p.x <= sorg.x0 + sorg.nx * sorg.dx && p.y <= sorg.y0 && p.y >= sorg.y0 - sorg.ny * sorg.dy;
                }).length;
                let crs = crsDaEpsg(sorg.epsg);
                if (crs === 'no') throw new Error(`Il DTM è nel sistema EPSG:${sorg.epsg}, che l'app non converte (Gauss-Boaga, Monte Mario...). Riproiettalo in UTM WGS84 o ETRS89, per esempio con QGIS: Esporta › Salva con nome, SR EPSG:32633.`);
                if (!crs) {
                    // Il file non dice il sistema: gradi se le coordinate sono piccole, altrimenti il fuso
                    // UTM che contiene più prove (quello della prima prova e i due vicini).
                    const zona = Math.floor((punti[0][1] + 180) / 6) + 1;
                    const candidati = Math.abs(sorg.x0) <= 180 && Math.abs(sorg.y0) <= 90 ? [{ tipo: 'geo' }] : [zona, zona - 1, zona + 1].map(z => ({ tipo: 'utm', zona: z }));
                    crs = candidati.reduce((a, b) => dentro(b) > dentro(a) ? b : a);
                }
                const nDentro = dentro(crs);
                if (!nDentro) throw new Error('Il DTM non copre le prove di questo progetto: è di un\'altra zona, o in un sistema di riferimento diverso da quello indicato nel file.');

                // Finestra: le prove più un margine, dentro i bordi del file.
                const margine = crs.tipo === 'geo' ? DTM_MARGINE_M / 111000 : DTM_MARGINE_M;
                const xy = punti.map(([la, ln]) => puntoNelCrs(crs, la, ln));
                const xs = xy.map(p => p.x), ys = xy.map(p => p.y);
                const c0 = Math.max(0, Math.floor((Math.min(...xs) - margine * (crs.tipo === 'geo' ? 1.3 : 1) - sorg.x0) / sorg.dx));
                const c1 = Math.min(sorg.nx, Math.ceil((Math.max(...xs) + margine * (crs.tipo === 'geo' ? 1.3 : 1) - sorg.x0) / sorg.dx));
                const r0 = Math.max(0, Math.floor((sorg.y0 - Math.max(...ys) - margine) / sorg.dy));
                const r1 = Math.min(sorg.ny, Math.ceil((sorg.y0 - Math.min(...ys) + margine) / sorg.dy));
                const passo = Math.max(1, Math.ceil(Math.max(c1 - c0, r1 - r0) / DTM_MAX_CELLE));
                const valori = await sorg.leggiFinestra(c0, r0, c1, r1);
                const w = c1 - c0, nx = Math.ceil(w / passo), ny = Math.ceil((r1 - r0) / passo);

                // Media di ogni blocco, senza i buchi del DTM; poi in centimetri (o decimetri se il
                // dislivello supera 650 m) sopra la quota minima, in Uint16: 65535 = nessun dato.
                const medie = new Float32Array(nx * ny);
                for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
                    let s = 0, n = 0;
                    for (let r = j * passo; r < Math.min((j + 1) * passo, r1 - r0); r++) for (let c = i * passo; c < Math.min((i + 1) * passo, w); c++) {
                        const v = valori[r * w + c];
                        if (isFinite(v) && v > -1000 && v < 9000) { s += v; n++; }
                    }
                    medie[j * nx + i] = n ? s / n : NaN;
                }
                const finiti = Array.from(medie).filter(isFinite);
                if (!finiti.length) throw new Error('Nella zona delle prove il DTM non ha dati (solo celle vuote).');
                const base = Math.min(...finiti), dislivello = Math.max(...finiti) - base;
                const unita = dislivello > 650 ? 0.1 : 0.01;
                const codici = new Uint16Array(medie.length);
                medie.forEach((v, k) => { codici[k] = isFinite(v) ? Math.round((v - base) / unita) : 65535; });
                let bin = '';
                const byte = new Uint8Array(codici.buffer);
                for (let k = 0; k < byte.length; k += 8192) bin += String.fromCharCode.apply(null, byte.subarray(k, k + 8192));
                return {
                    fonte: nome, crs, caricatoIl: new Date().toISOString(),
                    celleOriginali: sorg.dx, // in metri, o in gradi se crs è 'geo'
                    x0: sorg.x0 + c0 * sorg.dx, y0: sorg.y0 - r0 * sorg.dy, dx: sorg.dx * passo, dy: sorg.dy * passo, nx, ny,
                    base, unita, quote: btoa(bin),
                    proveDentro: nDentro, proveConGps: punti.length
                };
            }

            // ---- Uso del ritaglio ----

            // Le quote decodificate restano attaccate al ritaglio, fuori dal JSON (non enumerabili).
            // Niente costanti a livello del pezzo: la quota si chiede anche da pezzi valutati prima.
            function quoteDtm(dtm) {
                if (!dtm._quote) {
                    const bin = atob(dtm.quote), byte = new Uint8Array(bin.length);
                    for (let k = 0; k < bin.length; k++) byte[k] = bin.charCodeAt(k);
                    const codici = new Uint16Array(byte.buffer);
                    Object.defineProperty(dtm, '_quote', { value: Float32Array.from(codici, c => c === 65535 ? NaN : dtm.base + c * dtm.unita) });
                }
                return dtm._quote;
            }

            /** Quota del terreno (m s.l.m.) in un punto, interpolata tra le quattro celle vicine; null fuori dal DTM. */
            function quotaDtm(dtm, lat, lng) {
                if (!dtm || !isFinite(lat) || !isFinite(lng)) return null;
                const p = puntoNelCrs(dtm.crs, lat, lng);
                const fx = (p.x - dtm.x0) / dtm.dx - 0.5, fy = (dtm.y0 - p.y) / dtm.dy - 0.5;
                if (fx < -0.5 || fy < -0.5 || fx > dtm.nx - 0.5 || fy > dtm.ny - 0.5) return null;
                const q = quoteDtm(dtm);
                const i = Math.max(0, Math.min(dtm.nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(dtm.ny - 2, Math.floor(fy)));
                const tx = Math.max(0, Math.min(1, fx - i)), ty = Math.max(0, Math.min(1, fy - j));
                const v = (a, b) => q[Math.min(dtm.ny - 1, b) * dtm.nx + Math.min(dtm.nx - 1, a)];
                const z = (v(i, j) * (1 - tx) + v(i + 1, j) * tx) * (1 - ty) + (v(i, j + 1) * (1 - tx) + v(i + 1, j + 1) * tx) * ty;
                return isFinite(z) ? z : null;
            }

            /** Quota della prova dal DTM del suo progetto; null se manca il DTM, il GPS o la copertura. */
            function quotaDellaProva(proj, header) {
                return proj && header ? quotaDtm(proj.dtm, parseFloat(header.lat), parseFloat(header.lng)) : null;
            }

            // ---- La finestra «Terreno e sezioni» ----

            function formattaMetri(v) { return numeroConVirgola(v, v < 10 ? 1 : 0); }

            function renderTerreno(errore) {
                const proj = state.projects[state.currentProjectId];
                const dtm = proj.dtm;
                const stato = document.getElementById('statoTerreno');
                let html = errore ? `<div class="riga-avviso pericolo" role="alert">${escapeHtmlDidascalia(errore)}</div>` : '';
                if (!dtm) {
                    html += `<p class="t-didascalia">Con un DTM l'app ricava la quota del terreno di ogni prova, il profilo tra le prove, la sezione e la vista 3D.
                        Il file resta sul dispositivo: se ne tiene solo la parte attorno alle prove, che viaggia col progetto.</p>
                        <p class="t-didascalia">Formati: GeoTIFF (.tif) o ASCII Grid (.asc), in UTM (WGS84, ETRS89, RDN2008) o in gradi.
                        Meglio con celle da 1–5 m, per esempio i DTM LiDAR del Geoportale Nazionale o della Regione.</p>`;
                } else {
                    const celle = dtm.crs.tipo === 'geo' ? dtm.celleOriginali * 111000 : dtm.celleOriginali;
                    const tenute = dtm.crs.tipo === 'geo' ? dtm.dx * 111000 : dtm.dx;
                    const larg = dtm.nx * tenute, alt = dtm.ny * (dtm.crs.tipo === 'geo' ? dtm.dy * 111000 : dtm.dy);
                    html += `<div class="terreno-fonte"><strong>${escapeHtmlDidascalia(dtm.fonte)}</strong>
                        <span class="t-didascalia">celle da ${formattaMetri(celle)} m${Math.abs(tenute - celle) > 0.01 ? `, tenute a ${formattaMetri(tenute)} m` : ''} ·
                        area ${formattaMetri(larg)} × ${formattaMetri(alt)} m · ${dtm.crs.tipo === 'geo' ? 'gradi' : 'UTM ' + dtm.crs.zona + ' N'}</span></div>`;
                    const prove = Object.values(proj.surveys || {}).sort((a, b) => String((a.header || {}).provaNr).localeCompare(String((b.header || {}).provaNr), 'it', { numeric: true }));
                    html += '<div class="terreno-quote">' + prove.map(s => {
                        const h = s.header || {};
                        const q = quotaDellaProva(proj, h);
                        const gps = isFinite(parseFloat(h.lat)) && isFinite(parseFloat(h.lng));
                        return `<div><span>Prova ${escapeHtmlDidascalia(String(h.provaNr || '?'))}</span>${q !== null
                            ? `<strong>${numeroConVirgola(q, 1)} m s.l.m.</strong>`
                            : `<span class="t-didascalia">${gps ? 'fuori dal DTM' : 'senza GPS'}</span>`}</div>`;
                    }).join('') + '</div>';
                }
                stato.innerHTML = html;
                document.getElementById('lblCaricaDtm').textContent = dtm ? 'Carica un altro DTM' : 'Carica un DTM';
                document.getElementById('btnTogliDtm').style.display = dtm ? '' : 'none';
            }

            function apriTerreno() {
                saveState(); // la prova aperta torna nel progetto, con le sue coordinate
                closeAnyOpenModal();
                renderTerreno();
                document.getElementById('modalTerrenoOverlay').classList.add('open');
                document.getElementById('modalTerreno').classList.add('open');
            }

            document.getElementById('btnProgettoTerreno').addEventListener('click', apriTerreno);
            document.getElementById('btnChiudiTerreno').addEventListener('click', closeAnyOpenModal);
            document.getElementById('btnCaricaDtm').addEventListener('click', () => { const f = document.getElementById('fileDtm'); f.value = ''; f.click(); });
            document.getElementById('fileDtm').addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const proj = state.projects[state.currentProjectId];
                document.getElementById('statoTerreno').innerHTML = `<p class="t-didascalia" aria-busy="true">Lettura di ${escapeHtmlDidascalia(file.name)}…</p>`;
                try {
                    proj.dtm = await ritaglioDtmPerProgetto(file, proj);
                    saveState();
                    renderTerreno();
                    const d = proj.dtm;
                    mostraToast(d.proveDentro < d.proveConGps ? `DTM caricato: copre ${d.proveDentro} prove su ${d.proveConGps} col GPS` : 'DTM caricato');
                } catch (err) {
                    renderTerreno(err.message || String(err));
                }
            });
            document.getElementById('btnTogliDtm').addEventListener('click', () => {
                const proj = state.projects[state.currentProjectId], vecchio = proj.dtm;
                delete proj.dtm;
                saveState();
                renderTerreno();
                showUndoBanner('DTM tolto dal progetto', () => { proj.dtm = vecchio; saveState(); if (document.getElementById('modalTerreno').classList.contains('open')) renderTerreno(); });
            });
