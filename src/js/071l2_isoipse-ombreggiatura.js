            // ISOIPSE E OMBREGGIATURA SULLA MAPPA 2D: tutte e due si calcolano dal DTM che sta dentro il
            // progetto (quello della finestra «Terreno e sezioni»), quindi funzionano anche senza rete.
            // Niente librerie: le curve sono «marching squares» scritto qui (le quote dei nodi della griglia,
            // interpolate lungo i lati delle celle), l'ombreggiatura è la formula classica di Horn.
            // Le funzioni di calcolo non toccano la pagina (si provano nei test); il disegno sta in fondo.

            const PASSI_ISOIPSE = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
            const LUCI_OMBRA = [['Nord-Ovest (di norma)', 315], ['Nord', 0], ['Nord-Est', 45], ['Est', 90], ['Sud-Est', 135], ['Sud', 180], ['Sud-Ovest', 225], ['Ovest', 270]];

            /** Le scelte della mappa 2D (si ricordano con le impostazioni dell'app). */
            function impostazioniMappa2d() {
                if (!state.settings) state.settings = {};
                const s = state.settings.mappa2d = state.settings.mappa2d || {};
                const num = (v, min, max, std) => { v = Number(v); return isFinite(v) ? Math.max(min, Math.min(max, v)) : std; };
                s.isoipse = { on: !!(s.isoipse && s.isoipse.on), passo: num(s.isoipse && s.isoipse.passo, 0, 1000, 0), op: num(s.isoipse && s.isoipse.op, 0.1, 1, 1) };
                s.ombra = { on: !!(s.ombra && s.ombra.on), az: num(s.ombra && s.ombra.az, 0, 360, 315), alt: num(s.ombra && s.ombra.alt, 5, 85, 45),
                    es: num(s.ombra && s.ombra.es, 0.5, 5, 1), op: num(s.ombra && s.ombra.op, 0.1, 1, 0.6) };
                return s;
            }

            /** Dal nodo (i, j) della griglia del DTM alle coordinate sulla mappa. */
            function nodoDtmGeo(dtm, i, j) {
                const x = dtm.x0 + (i + 0.5) * dtm.dx, y = dtm.y0 - (j + 0.5) * dtm.dy;
                if (dtm.crs.tipo === 'geo') return { lat: y, lng: x };
                return geoDaUtm(x, y, dtm.crs.zona);
            }

            /** La distanza in metri tra due nodi vicini (x e y), nel punto (i, j). */
            function cellaMetriDtm(dtm, j) {
                if (dtm.crs.tipo !== 'geo') return { mx: Math.abs(dtm.dx), my: Math.abs(dtm.dy) };
                const lat = dtm.y0 - (j + 0.5) * dtm.dy;
                return { mx: Math.abs(dtm.dx) * 111320 * Math.cos(lat * Math.PI / 180), my: Math.abs(dtm.dy) * 110540 };
            }

            /** Il passo tra una curva e l'altra: quello scelto, o (0) quello che dà da 8 a 25 curve sul dislivello. */
            function passoIsoipse(dtm, scelto) {
                if (scelto > 0) return scelto;
                const q = quoteDtm(dtm);
                let mn = Infinity, mx = -Infinity;
                for (let k = 0; k < q.length; k++) if (isFinite(q[k])) { if (q[k] < mn) mn = q[k]; if (q[k] > mx) mx = q[k]; }
                if (!isFinite(mn)) return 1;
                return PASSI_ISOIPSE.find(p => (mx - mn) / p <= 25) || PASSI_ISOIPSE[PASSI_ISOIPSE.length - 1];
            }

            /** Le isoipse del DTM: [{ quota, indice, linee: [[[lat, lng], …], …] }]. «indice»: ogni quinta curva
             * (quella che si disegna più marcata e con la quota scritta). I buchi del DTM non si attraversano. */
            function isoipseDalDtm(dtm, passoScelto) {
                const q = quoteDtm(dtm), nx = dtm.nx, ny = dtm.ny, passo = passoIsoipse(dtm, passoScelto);
                let mn = Infinity, mx = -Infinity;
                for (let k = 0; k < q.length; k++) if (isFinite(q[k])) { if (q[k] < mn) mn = q[k]; if (q[k] > mx) mx = q[k]; }
                const risultato = [];
                if (!isFinite(mn) || nx < 2 || ny < 2) return risultato;
                for (let liv = Math.ceil(mn / passo) * passo, n = 0; liv <= mx && n < 400; liv += passo, n++) {
                    const quota = Math.round(liv / passo * 1e6) / 1e6 * passo;
                    const v = (i, j) => { const z = q[j * nx + i]; return z === quota ? z + 1e-6 : z; }; // mai esattamente sulla curva
                    // Il punto in cui la curva taglia un lato: lato orizzontale (i,j)-(i+1,j) = 2·nodo, verticale (i,j)-(i,j+1) = 2·nodo+1
                    const puntiLato = new Map();
                    const lato = (i, j, orizz) => {
                        const id = 2 * (j * nx + i) + (orizz ? 0 : 1);
                        if (!puntiLato.has(id)) {
                            const a = v(i, j), b = orizz ? v(i + 1, j) : v(i, j + 1), t = (quota - a) / (b - a);
                            const p0 = nodoDtmGeo(dtm, i, j), p1 = orizz ? nodoDtmGeo(dtm, i + 1, j) : nodoDtmGeo(dtm, i, j + 1);
                            puntiLato.set(id, [p0.lat + (p1.lat - p0.lat) * t, p0.lng + (p1.lng - p0.lng) * t]);
                        }
                        return id;
                    };
                    const seg = []; // coppie di id di lati
                    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
                        const a = v(i, j), b = v(i + 1, j), c = v(i + 1, j + 1), d = v(i, j + 1);
                        if (!isFinite(a + b + c + d)) continue;
                        const caso = (a > quota ? 1 : 0) | (b > quota ? 2 : 0) | (c > quota ? 4 : 0) | (d > quota ? 8 : 0);
                        if (caso === 0 || caso === 15) continue;
                        const N = () => lato(i, j, true), E = () => lato(i + 1, j, false), S = () => lato(i, j + 1, true), O = () => lato(i, j, false);
                        switch (caso) {
                            case 1: case 14: seg.push([N(), O()]); break;
                            case 2: case 13: seg.push([N(), E()]); break;
                            case 3: case 12: seg.push([O(), E()]); break;
                            case 4: case 11: seg.push([E(), S()]); break;
                            case 6: case 9: seg.push([N(), S()]); break;
                            case 7: case 8: seg.push([O(), S()]); break;
                            default: { // 5 e 10: sella; col valore al centro si decide come unire
                                const centro = (a + b + c + d) / 4 > quota;
                                if ((caso === 5) === centro) seg.push([N(), E()], [O(), S()]); else seg.push([N(), O()], [E(), S()]);
                            }
                        }
                    }
                    if (!seg.length) continue;
                    // Si uniscono i segmenti in linee: ogni lato è toccato al massimo da due segmenti.
                    const vicini = new Map();
                    seg.forEach(([a, b], k) => { (vicini.get(a) || vicini.set(a, []).get(a)).push(k); (vicini.get(b) || vicini.set(b, []).get(b)).push(k); });
                    const usato = new Uint8Array(seg.length), linee = [];
                    // da un estremo si va avanti finché c'è un segmento non ancora usato che ci si attacca
                    const prolunga = (catena, fine) => {
                        for (;;) {
                            const estremo = fine ? catena[catena.length - 1] : catena[0];
                            const k = (vicini.get(estremo) || []).find(x => !usato[x]);
                            if (k === undefined) return;
                            usato[k] = 1;
                            const nuovo = seg[k][0] === estremo ? seg[k][1] : seg[k][0];
                            if (fine) catena.push(nuovo); else catena.unshift(nuovo);
                        }
                    };
                    for (let k = 0; k < seg.length; k++) {
                        if (usato[k]) continue;
                        usato[k] = 1;
                        const catena = [seg[k][0], seg[k][1]];
                        prolunga(catena, true); prolunga(catena, false);
                        linee.push(catena.map(id => puntiLato.get(id)));
                    }
                    const n5 = Math.round(quota / passo);
                    risultato.push({ quota, indice: n5 % 5 === 0, linee });
                }
                return risultato;
            }

            /** L'ombreggiatura del DTM, un'immagine RGBA (w × h) con i suoi limiti sulla mappa: scura dove il
             * versante è in ombra, chiara dove prende la luce, trasparente dove il DTM non arriva.
             * Formula di Horn (la stessa di QGIS e GDAL). az: da dove viene la luce (gradi dal Nord), alt: altezza. */
            function ombreggiaturaDalDtm(dtm, az, alt, esagerazione, maxLato) {
                const q = quoteDtm(dtm), nx = dtm.nx, ny = dtm.ny, es = esagerazione || 1;
                const zenit = (90 - alt) * Math.PI / 180, azM = ((360 - az + 90) % 360) * Math.PI / 180;
                const cz = Math.cos(zenit), sz = Math.sin(zenit);
                const luce = new Float32Array(nx * ny).fill(NaN);
                for (let j = 0; j < ny; j++) {
                    const { mx, my } = cellaMetriDtm(dtm, j);
                    for (let i = 0; i < nx; i++) {
                        const z = (x, y) => { const r = q[Math.max(0, Math.min(ny - 1, y)) * nx + Math.max(0, Math.min(nx - 1, x))]; return r; };
                        const e = q[j * nx + i];
                        if (!isFinite(e)) continue;
                        // i vicini mancanti (bordo o buchi) valgono come il centro: niente bordi finti
                        const zz = (x, y) => { const r = z(x, y); return isFinite(r) ? r : e; };
                        const a = zz(i - 1, j - 1), b = zz(i, j - 1), c = zz(i + 1, j - 1), d = zz(i - 1, j), f = zz(i + 1, j), g = zz(i - 1, j + 1), h = zz(i, j + 1), k = zz(i + 1, j + 1);
                        const dzdx = es * ((c + 2 * f + k) - (a + 2 * d + g)) / (8 * mx);
                        const dzdy = es * ((g + 2 * h + k) - (a + 2 * b + c)) / (8 * my); // le righe scendono verso Sud
                        const pend = Math.atan(Math.hypot(dzdx, dzdy));
                        const asp = Math.atan2(dzdy, -dzdx);
                        luce[j * nx + i] = Math.max(0, cz * Math.cos(pend) + sz * Math.sin(pend) * Math.cos(azM - asp));
                    }
                }
                // I limiti sulla mappa e la griglia dei pixel: lineare in latitudine «mercatoriana», come l'immagine
                // che Leaflet stende sulla mappa. Ogni pixel si cerca nel DTM (ruotato rispetto al Nord, se UTM).
                const angoli = [[0, 0], [nx - 1, 0], [0, ny - 1], [nx - 1, ny - 1]].map(([i, j]) => nodoDtmGeo(dtm, i, j));
                const lat0 = Math.min(...angoli.map(p => p.lat)), lat1 = Math.max(...angoli.map(p => p.lat));
                const lng0 = Math.min(...angoli.map(p => p.lng)), lng1 = Math.max(...angoli.map(p => p.lng));
                const merc = la => Math.log(Math.tan(Math.PI / 4 + la * Math.PI / 360));
                const unMerc = y => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180 / Math.PI;
                const my0 = merc(lat0), my1 = merc(lat1);
                const larg = (lng1 - lng0) * Math.PI / 180, alto = my1 - my0;
                const lato = Math.max(64, Math.min(maxLato || 768, Math.max(nx, ny) * 3));
                const w = Math.max(2, Math.round(lato * Math.min(1, larg / alto))), h = Math.max(2, Math.round(lato * Math.min(1, alto / larg)));
                const dati = new Uint8ClampedArray(w * h * 4);
                const piatto = Math.sin(Math.max(0.0001, alt) * Math.PI / 180); // la luce su un piano orizzontale = cos(zenit)
                for (let py = 0; py < h; py++) {
                    const lat = unMerc(my1 - (py + 0.5) / h * alto);
                    for (let px = 0; px < w; px++) {
                        const lng = lng0 + (px + 0.5) / w * (lng1 - lng0);
                        const p = puntoNelCrs(dtm.crs, lat, lng);
                        const fx = (p.x - dtm.x0) / dtm.dx - 0.5, fy = (dtm.y0 - p.y) / dtm.dy - 0.5;
                        if (fx < 0 || fy < 0 || fx > nx - 1 || fy > ny - 1) continue;
                        const i = Math.min(nx - 2, Math.floor(fx)), j = Math.min(ny - 2, Math.floor(fy)), tx = fx - i, ty = fy - j;
                        const l00 = luce[j * nx + i], l10 = luce[j * nx + i + 1], l01 = luce[(j + 1) * nx + i], l11 = luce[(j + 1) * nx + i + 1];
                        if (!isFinite(l00 + l10 + l01 + l11)) continue;
                        const l = (l00 * (1 - tx) + l10 * tx) * (1 - ty) + (l01 * (1 - tx) + l11 * tx) * ty;
                        const dif = l - piatto, o = (py * w + px) * 4;
                        // scuro dove è meno del piano, chiaro dove è più: sopra una mappa si vede il rilievo senza coprirla
                        if (dif < 0) { dati[o + 3] = Math.min(255, -dif * 1.8 * 255); } else { dati[o] = dati[o + 1] = dati[o + 2] = 255; dati[o + 3] = Math.min(255, dif * 1.4 * 255); }
                    }
                }
                return { w, h, dati, limiti: [[lat0, lng0], [lat1, lng1]], luce, piatto };
            }

            // ---- Il disegno sulla mappa (Leaflet) ----

            /** Accende, spegne o ridisegna le due sovrapposizioni secondo le scelte; da chiamare quando cambia
             * qualcosa (progetto, DTM, scelte). Senza mappa o senza DTM non fa nulla. */
            function aggiornaLivelli2d() {
                const m = mappaProgetto;
                if (!m.mappa) return;
                [m.ombraLayer, m.isoLayer].forEach(l => l && l.remove());
                m.ombraLayer = m.isoLayer = null;
                const proj = state.projects[state.currentProjectId], s = impostazioniMappa2d();
                if (!proj || !proj.dtm) return;
                try {
                    if (s.ombra.on) {
                        const r = ombreggiaturaDalDtm(proj.dtm, s.ombra.az, s.ombra.alt, s.ombra.es);
                        const tela = document.createElement('canvas'); tela.width = r.w; tela.height = r.h;
                        const c = tela.getContext('2d');
                        if (c) {
                            c.putImageData(new ImageData(r.dati, r.w, r.h), 0, 0);
                            m.ombraLayer = L.imageOverlay(tela.toDataURL('image/png'), r.limiti, { opacity: s.ombra.op, interactive: false, className: 'ombra-rilievo' }).addTo(m.mappa);
                        }
                    }
                    if (s.isoipse.on) {
                        const gruppo = L.layerGroup(), curve = isoipseDalDtm(proj.dtm, s.isoipse.passo);
                        curve.forEach(cv => {
                            cv.linee.forEach(pts => {
                                L.polyline(pts, { color: '#8b4513', weight: cv.indice ? 2 : 1, opacity: s.isoipse.op, interactive: false, smoothFactor: 1 }).addTo(gruppo);
                            });
                            if (cv.indice) {
                                const lunga = cv.linee.reduce((a, b) => b.length > a.length ? b : a, []);
                                if (lunga.length >= 8) L.marker(lunga[Math.floor(lunga.length / 2)], { interactive: false, keyboard: false, icon: L.divIcon({ className: '', iconSize: [0, 0],
                                    html: `<span style="position:absolute;transform:translate(-50%,-50%);font:600 11px sans-serif;color:#5a2d0c;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff;white-space:nowrap;opacity:${s.isoipse.op}">${numeroConVirgola(cv.quota, cv.quota % 1 ? 2 : 0)}</span>` }) }).addTo(gruppo);
                            }
                        });
                        m.isoLayer = gruppo.addTo(m.mappa);
                    }
                    if (m.ombraLayer && m.ombraLayer.bringToBack) m.ombraLayer.bringToBack();
                } catch (e) { console.warn('Isoipse e ombreggiatura:', e); }
            }

            /** Un livello 2D acceso o spento dal pannello Livelli (o dall'assistente). Senza DTM lo dice. */
            function livello2dAcceso(quale, on) {
                const s = impostazioniMappa2d();
                const proj = state.projects[state.currentProjectId];
                if (on && !(proj && proj.dtm)) { appAlert('Servono le quote del terreno (DTM): si aggiungono dalla schermata del progetto, in «Terreno e sezioni». Poi le isoipse e l\'ombreggiatura si calcolano da sole, anche senza rete.'); return false; }
                s[quale].on = !!on;
                saveState();
                aggiornaLivelli2d();
                return true;
            }
