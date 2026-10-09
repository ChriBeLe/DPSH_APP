            // ===================== IL PERIMETRO DEL MODELLO 3D =====================
            // Il corpo solido di base sta dentro il poligono delle prove. Si può estendere a un perimetro
            // scelto: un poligono disegnato (tasto destro → «Usa come perimetro del modello 3D») o importato
            // da un file vettoriale (shapefile, GeoPackage, GeoJSON, KML/KMZ), che diventa un poligono
            // disegnato. Fuori dalle prove gli strati proseguono paralleli: in ogni punto la colonna è
            // quella del bordo del poligono delle prove più vicino (colonnaSolido). Il dato fuori dalle
            // prove è inventato: lo dice la scheda «Modello e tagli».

            /** Il poligono disegnato che fa da perimetro (o null). */
            function disegnoPerimetro(proj = state.projects[state.currentProjectId]) {
                const id = proj && proj.perimetroModello;
                return id ? (proj.disegni || []).find(x => x.id === id && x.tipo === 'poligono') || null : null;
            }
            /** I vertici del perimetro in gradi (vuoto senza): la scena 3D si allarga fin lì. */
            const puntiPerimetroModello = proj => { const x = disegnoPerimetro(proj); return x && x.punti.length >= 3 ? x.punti : []; };
            /** Il perimetro nelle coordinate della scena 3D (metri), in senso antiorario. */
            function perimetroModelloXY(d) {
                const x = disegnoPerimetro();
                if (!x || x.punti.length < 3 || !d.daGeo) return null;
                let pp = x.punti.map(p => d.daGeo(p.lat, p.lng));
                pp = pp.filter((p, i) => !i || Math.hypot(p[0] - pp[i - 1][0], p[1] - pp[i - 1][1]) > 1e-6);
                if (pp.length > 3 && Math.hypot(pp[0][0] - pp[pp.length - 1][0], pp[0][1] - pp[pp.length - 1][1]) < 1e-6) pp.pop();
                // i vertici in fila (un lato spezzato in tanti pezzi) non servono: si tolgono (entro 2 cm)
                for (let tolto = true; tolto && pp.length > 3;) {
                    tolto = false;
                    for (let i = 0; i < pp.length && pp.length > 3; i++) {
                        const o = pp[(i - 1 + pp.length) % pp.length], a = pp[i], b = pp[(i + 1) % pp.length], l = Math.hypot(b[0] - o[0], b[1] - o[1]);
                        if (l > 1e-9 && Math.abs((b[0] - o[0]) * (a[1] - o[1]) - (b[1] - o[1]) * (a[0] - o[0])) / l < 0.02) { pp.splice(i, 1); tolto = true; i--; }
                    }
                }
                if (pp.length < 3) return null;
                return areaPoligono(pp) < 0 ? pp.reverse() : pp;
            }
            function usaPerimetroModello(id) {
                const proj = state.projects[state.currentProjectId];
                if (!proj) return;
                if (id) proj.perimetroModello = id; else delete proj.perimetroModello;
                saveState();
                // la scena si allarga fino al perimetro: si rifà
                if (datiVista3dCorrenti) datiVista3dCorrenti = datiVista3d(proj);
                if (id && !vista3d.livelli.solido) accendiSolido3d();
                renderVista3d();
                renderPerimetroModello3d();
                const x = disegnoPerimetro();
                mostraToast(id ? `Il modello 3D arriva fino a «${x ? x.nome : ''}»: fuori dalle prove gli strati proseguono paralleli.` : 'Il modello 3D torna al poligono delle prove.');
            }
            function renderPerimetroModello3d() {
                const lbl = document.getElementById('lblPerimetro3d');
                if (!lbl) return;
                const x = disegnoPerimetro();
                lbl.textContent = x ? `«${x.nome}» (${numeroConVirgola(areaMetriQuadri(x.punti), 0)} m²)` : 'il poligono delle prove';
                document.getElementById('btnTogliPerimetro3d').hidden = !x;
                document.getElementById('notaPerimetro3d').hidden = !x;
            }

            // ---- I file vettoriali: ogni lettore dà i poligoni (anelli esterni) nelle coordinate del file
            // e il sistema di riferimento se lo sa; poi tutto si porta in gradi. ----

            /** Lo ZIP (anche compresso): i file per nome. */
            async function leggiZipQualsiasi(byte) {
                const dv = new DataView(byte.buffer, byte.byteOffset, byte.byteLength), out = {};
                let fine = -1;
                for (let i = byte.length - 22; i >= Math.max(0, byte.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { fine = i; break; }
                if (fine < 0) throw new Error('Non è un file ZIP leggibile.');
                let p = dv.getUint32(fine + 16, true);
                const n = dv.getUint16(fine + 10, true);
                for (let k = 0; k < n; k++) {
                    if (dv.getUint32(p, true) !== 0x02014b50) break;
                    const metodo = dv.getUint16(p + 10, true), compresso = dv.getUint32(p + 20, true);
                    const lNome = dv.getUint16(p + 28, true), lExtra = dv.getUint16(p + 30, true), lComm = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
                    const nome = new TextDecoder().decode(byte.subarray(p + 46, p + 46 + lNome));
                    const inizio = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true), dati = byte.subarray(inizio, inizio + compresso);
                    if (metodo === 0) out[nome] = dati;
                    else if (metodo === 8) {
                        if (typeof DecompressionStream === 'undefined') throw new Error('Questo browser non sa aprire lo ZIP compresso.');
                        const flusso = new Blob([dati]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
                        out[nome] = new Uint8Array(await new Response(flusso).arrayBuffer());
                    }
                    p += 46 + lNome + lExtra + lComm;
                }
                return out;
            }

            /** Il sistema di riferimento da un .prj (WKT): UTM con la zona, geografico, o «non gestito». */
            function crsDaWkt(wkt) {
                if (!wkt) return null;
                const t = String(wkt);
                const epsg = /AUTHORITY\["EPSG",\s*"(\d+)"\]\s*\]\s*$/i.exec(t.trim());
                if (epsg) { const c = crsDaEpsg(Number(epsg[1])); if (c) return c; }
                const utm = /UTM[_ ]?zone[_ ]?(\d{1,2})\s*N/i.exec(t) || /UTM_(\d{1,2})N/i.exec(t) || /_(\d{2})N"/.exec(t);
                if (/PROJCS/i.test(t)) {
                    if (utm) return { tipo: 'utm', zona: Number(utm[1]) };
                    if (/Monte_Mario|Gauss|Italy_[12]|Roma40/i.test(t)) return 'no';
                    return 'no';
                }
                if (/GEOGCS/i.test(t)) return { tipo: 'geo' };
                return null;
            }

            function leggiGeoJson(testo) {
                const g = JSON.parse(testo), poligoni = [];
                let crs = null;
                const nomeCrs = g.crs && g.crs.properties && g.crs.properties.name;
                if (nomeCrs) { const m = /EPSG:{1,2}(\d+)/i.exec(nomeCrs); if (m) crs = crsDaEpsg(Number(m[1])); else if (/CRS84/i.test(nomeCrs)) crs = { tipo: 'geo' }; }
                const geom = (geo, nome) => {
                    if (!geo) return;
                    if (geo.type === 'Polygon') poligoni.push({ nome, anello: geo.coordinates[0] });
                    else if (geo.type === 'MultiPolygon') geo.coordinates.forEach((c, i) => poligoni.push({ nome: geo.coordinates.length > 1 ? `${nome} (${i + 1})` : nome, anello: c[0] }));
                    else if (geo.type === 'GeometryCollection') geo.geometries.forEach(x => geom(x, nome));
                };
                const nomeDi = (props, i) => (props && (props.nome || props.name || props.Name || props.NOME || props.NAME || props.id)) || `Poligono ${i + 1}`;
                if (g.type === 'FeatureCollection') g.features.forEach((f, i) => geom(f.geometry, nomeDi(f.properties, i)));
                else if (g.type === 'Feature') geom(g.geometry, nomeDi(g.properties, 0));
                else geom(g, 'Poligono');
                return { poligoni, crs: crs || { tipo: 'geo' } };
            }

            function leggiKml(testo) {
                const doc = new DOMParser().parseFromString(testo, 'application/xml'), poligoni = [];
                [...doc.getElementsByTagName('Placemark')].forEach((pm, i) => {
                    const nomeEl = pm.getElementsByTagName('name')[0], nome = (nomeEl && nomeEl.textContent.trim()) || `Poligono ${i + 1}`;
                    [...pm.getElementsByTagName('Polygon')].forEach((pol, j, tutti) => {
                        const fuori = pol.getElementsByTagName('outerBoundaryIs')[0] || pol;
                        const coord = fuori.getElementsByTagName('coordinates')[0];
                        if (!coord) return;
                        const anello = coord.textContent.trim().split(/\s+/).map(c => c.split(',').map(Number)).filter(c => c.length >= 2 && c.every(Number.isFinite));
                        poligoni.push({ nome: tutti.length > 1 ? `${nome} (${j + 1})` : nome, anello });
                    });
                });
                return { poligoni, crs: { tipo: 'geo' } };
            }

            /** Lo shapefile (.shp, con .dbf e .prj se ci sono): i poligoni, l'anello esterno di ciascuno. */
            function leggiShp(shp, prj, dbf) {
                const dv = new DataView(shp.buffer, shp.byteOffset, shp.byteLength), poligoni = [];
                if (dv.getInt32(0, false) !== 9994) throw new Error('Non è uno shapefile (.shp).');
                const nomi = dbf ? nomiDaDbf(dbf) : [];
                let p = 100, n = 0;
                while (p + 8 <= shp.length) {
                    const lung = dv.getInt32(p + 4, false) * 2, c = p + 8, tipo = dv.getInt32(c, true);
                    if ([5, 15, 25].includes(tipo)) {
                        const nParti = dv.getInt32(c + 36, true), nPunti = dv.getInt32(c + 40, true), parti = [];
                        for (let k = 0; k < nParti; k++) parti.push(dv.getInt32(c + 44 + 4 * k, true));
                        const p0 = c + 44 + 4 * nParti, punti = [];
                        for (let k = 0; k < nPunti; k++) punti.push([dv.getFloat64(p0 + 16 * k, true), dv.getFloat64(p0 + 16 * k + 8, true)]);
                        // l'anello esterno: il più grande (negli shapefile gli esterni girano in senso orario)
                        const anelli = parti.map((s, k) => punti.slice(s, k + 1 < parti.length ? parti[k + 1] : nPunti));
                        anelli.sort((a, b) => Math.abs(areaPoligono(b)) - Math.abs(areaPoligono(a)));
                        if (anelli[0] && anelli[0].length >= 3) poligoni.push({ nome: nomi[n] || `Poligono ${n + 1}`, anello: anelli[0] });
                    }
                    n++;
                    p += 8 + lung;
                }
                return { poligoni, crs: crsDaWkt(prj ? new TextDecoder().decode(prj) : null) };
            }
            /** Dal .dbf: il valore del primo campo «nome/name/id» (o il primo campo di testo) di ogni riga. */
            function nomiDaDbf(dbf) {
                try {
                    const dv = new DataView(dbf.buffer, dbf.byteOffset, dbf.byteLength), nRec = dv.getUint32(4, true), lInt = dv.getUint16(8, true), lRec = dv.getUint16(10, true);
                    const campi = [];
                    for (let p = 32; p < lInt - 1; p += 32) {
                        const nome = new TextDecoder().decode(dbf.subarray(p, p + 11)).replace(/\0.*$/, '');
                        campi.push({ nome, tipo: String.fromCharCode(dbf[p + 11]), lung: dbf[p + 16] });
                    }
                    const scelto = campi.findIndex(f => /^(nome|name|denom|descr|id)/i.test(f.nome)) >= 0 ? campi.findIndex(f => /^(nome|name|denom|descr|id)/i.test(f.nome)) : campi.findIndex(f => f.tipo === 'C');
                    if (scelto < 0) return [];
                    const off = 1 + campi.slice(0, scelto).reduce((a, f) => a + f.lung, 0), out = [];
                    for (let r = 0; r < nRec; r++) out.push(new TextDecoder('latin1').decode(dbf.subarray(lInt + r * lRec + off, lInt + r * lRec + off + campi[scelto].lung)).trim());
                    return out;
                } catch (_) { return []; }
            }

            /** IL GEOPACKAGE (un file SQLite): si leggono le tabelle con l'albero delle pagine, si cercano le
             * geometrie (i valori che cominciano con «GP») e si leggono come WKB; il sistema dal loro srs_id. */
            function leggiGeoPackage(byte) {
                const dv = new DataView(byte.buffer, byte.byteOffset, byte.byteLength);
                if (new TextDecoder().decode(byte.subarray(0, 15)) !== 'SQLite format 3') throw new Error('Non è un GeoPackage (SQLite).');
                let pagina = dv.getUint16(16, false); if (pagina === 1) pagina = 65536;
                const U = pagina - byte[20];
                const varint = (p) => { let v = 0; for (let i = 0; i < 8; i++) { const b = byte[p + i]; v = v * 128 + (b & 127); if (!(b & 128)) return [v, p + i + 1]; } return [v * 256 + byte[p + 8], p + 9]; };
                const pagineDa = n => (n - 1) * pagina;
                const carico = (p, P) => {
                    const X = U - 35;
                    if (P <= X) return byte.subarray(p, p + P);
                    const M = Math.floor((U - 12) * 32 / 255) - 23, K = M + ((P - M) % (U - 4)), locale = K <= X ? K : M;
                    const out = new Uint8Array(P);
                    out.set(byte.subarray(p, p + locale), 0);
                    let fatto = locale, prossima = dv.getUint32(p + locale, false);
                    while (prossima && fatto < P) {
                        const o = pagineDa(prossima), quanto = Math.min(U - 4, P - fatto);
                        out.set(byte.subarray(o + 4, o + 4 + quanto), fatto);
                        fatto += quanto; prossima = dv.getUint32(o, false);
                    }
                    return out;
                };
                const record = (pl) => {
                    const loc = new DataView(pl.buffer, pl.byteOffset, pl.byteLength), vi = (q) => { let v = 0; for (let i = 0; i < 8; i++) { const b = pl[q + i]; v = v * 128 + (b & 127); if (!(b & 128)) return [v, q + i + 1]; } return [v, q + 9]; };
                    let [h, p] = vi(0);
                    const tipi = [];
                    while (p < h) { let t; [t, p] = vi(p); tipi.push(t); }
                    let q = h;
                    return tipi.map(t => {
                        if (t === 0) return null;
                        if (t >= 1 && t <= 6) { const n = [0, 1, 2, 3, 4, 6, 8][t]; let v = 0; for (let i = 0; i < n; i++) v = v * 256 + pl[q + i]; if (pl[q] & 128) v -= Math.pow(2, 8 * n); q += n; return v; }
                        if (t === 7) { const v = loc.getFloat64(q, false); q += 8; return v; }
                        if (t === 8) return 0; if (t === 9) return 1;
                        const n = t >= 12 ? Math.floor((t - (t % 2 ? 13 : 12)) / 2) : 0, v = pl.subarray(q, q + n); q += n;
                        return t % 2 ? new TextDecoder().decode(v) : v;
                    });
                };
                const righe = (radice) => {
                    const out = [], pila = [radice];
                    while (pila.length) {
                        const n = pila.pop(), o = n === 1 ? 100 : pagineDa(n), base = pagineDa(n), tipo = byte[o], nCelle = dv.getUint16(o + 3, false);
                        const intesta = tipo === 0x05 || tipo === 0x02 ? 12 : 8;
                        for (let c = 0; c < nCelle; c++) {
                            const pc = base + dv.getUint16(o + intesta + 2 * c, false);
                            if (tipo === 0x0D) { let [P, q] = varint(pc), rowid; [rowid, q] = varint(q); const r = record(carico(q, P)); r.rowid = rowid; out.push(r); }
                            else if (tipo === 0x05) pila.push(dv.getUint32(pc, false));
                        }
                        if (tipo === 0x05) pila.push(dv.getUint32(o + 8, false));
                    }
                    return out;
                };
                const schema = righe(1).filter(r => r && r[0] === 'table');
                const srs = new Map();
                const tSrs = schema.find(r => r[1] === 'gpkg_spatial_ref_sys');
                if (tSrs) righe(tSrs[3]).forEach(r => { const id = typeof r[1] === 'number' ? r[1] : r.rowid; if (typeof r[3] === 'number') srs.set(id, r[3]); }); // srs_id (chiave: può stare nel rowid) → organization_coordsys_id
                const poligoni = [];
                let srsId = null;
                schema.filter(r => !/^(gpkg_|rtree_|sqlite_)/.test(r[1])).forEach(t => {
                    righe(t[3]).forEach((r, i) => {
                        const nome = (r || []).find(v => typeof v === 'string' && v.length < 80) || `${t[1]} ${i + 1}`;
                        (r || []).forEach(v => {
                            if (!(v instanceof Uint8Array) || v[0] !== 0x47 || v[1] !== 0x50) return;
                            const flag = v[3], le = flag & 1, env = [0, 32, 48, 48, 64][(flag >> 1) & 7] || 0;
                            const gv = new DataView(v.buffer, v.byteOffset, v.byteLength);
                            srsId = gv.getInt32(4, !!le);
                            wkbPoligoni(v.subarray(8 + env)).forEach((anello, j, tutti) => poligoni.push({ nome: tutti.length > 1 ? `${nome} (${j + 1})` : nome, anello }));
                        });
                    });
                });
                const epsg = srsId !== null ? (srs.get(srsId) || srsId) : null;
                return { poligoni, crs: crsDaEpsg(epsg) };
            }
            /** WKB: gli anelli esterni dei poligoni (anche multipli, con Z/M). */
            function wkbPoligoni(b) {
                const dv = new DataView(b.buffer, b.byteOffset, b.byteLength), out = [];
                let p = 0;
                const geom = () => {
                    const le = b[p] === 1; p += 1;
                    let tipo = dv.getUint32(p, le); p += 4;
                    let dim = 2;
                    if (tipo & 0x80000000) dim++; if (tipo & 0x40000000) dim++;
                    tipo &= 0x0fffffff;
                    if (tipo > 3000) { dim = 4; tipo -= 3000; } else if (tipo > 2000) { dim = 3; tipo -= 2000; } else if (tipo > 1000) { dim = 3; tipo -= 1000; }
                    const anelloLeggi = () => { const n = dv.getUint32(p, le); p += 4; const a = []; for (let k = 0; k < n; k++) { a.push([dv.getFloat64(p, le), dv.getFloat64(p + 8, le)]); p += 8 * dim; } return a; };
                    if (tipo === 3) { const nr = dv.getUint32(p, le); p += 4; for (let r = 0; r < nr; r++) { const a = anelloLeggi(); if (!r) out.push(a); } }
                    else if (tipo === 6 || tipo === 7) { const n = dv.getUint32(p, le); p += 4; for (let k = 0; k < n; k++) geom(); }
                    else throw new Error('geometria non poligonale');
                };
                try { geom(); } catch (_) { /* non un poligono: niente */ }
                return out;
            }

            /** Da un file (o più: .shp con .dbf e .prj) ai poligoni in gradi. */
            async function poligoniDaFile(files) {
                const perNome = {};
                for (const f of files) perNome[f.name.toLowerCase()] = new Uint8Array(await f.arrayBuffer());
                const nomi = Object.keys(perNome), con = est => nomi.find(n => n.endsWith(est));
                let letti;
                if (con('.zip') || con('.kmz')) {
                    const dentro = await leggiZipQualsiasi(perNome[con('.zip') || con('.kmz')]), nn = Object.keys(dentro), c = est => nn.find(n => n.toLowerCase().endsWith(est));
                    if (c('.kml')) letti = leggiKml(new TextDecoder().decode(dentro[c('.kml')]));
                    else if (c('.shp')) letti = leggiShp(dentro[c('.shp')], c('.prj') && dentro[c('.prj')], c('.dbf') && dentro[c('.dbf')]);
                    else if (c('.gpkg')) letti = leggiGeoPackage(dentro[c('.gpkg')]);
                    else if (c('.geojson') || c('.json')) letti = leggiGeoJson(new TextDecoder().decode(dentro[c('.geojson') || c('.json')]));
                    else throw new Error('Nello ZIP non c\'è uno shapefile, un KML, un GeoPackage o un GeoJSON.');
                } else if (con('.shp')) letti = leggiShp(perNome[con('.shp')], con('.prj') && perNome[con('.prj')], con('.dbf') && perNome[con('.dbf')]);
                else if (con('.gpkg')) letti = leggiGeoPackage(perNome[con('.gpkg')]);
                else if (con('.kml')) letti = leggiKml(new TextDecoder().decode(perNome[con('.kml')]));
                else if (con('.geojson') || con('.json')) letti = leggiGeoJson(new TextDecoder().decode(perNome[con('.geojson') || con('.json')]));
                else throw new Error('Formato non riconosciuto: shapefile (.shp con .dbf e .prj, o in uno .zip), GeoPackage (.gpkg), GeoJSON, KML o KMZ.');
                if (!letti.poligoni.length) throw new Error('Nel file non c\'è nessun poligono.');
                let crs = letti.crs;
                if (crs === 'no') throw new Error('Il sistema di coordinate del file non è gestito (es. Gauss-Boaga): salvalo in WGS84 o in UTM (WGS84, ETRS89, RDN2008).');
                const tutte = letti.poligoni.flatMap(p => p.anello);
                if (!crs) {
                    // senza sistema dichiarato: gradi se lo sembrano, altrimenti UTM nella zona delle prove
                    const gradi = tutte.every(([x, y]) => Math.abs(x) <= 180 && Math.abs(y) <= 90);
                    const proj = state.projects[state.currentProjectId], una = proj && proveConCoordinate(proj)[0];
                    crs = gradi ? { tipo: 'geo' } : { tipo: 'utm', zona: una ? Math.floor((parseFloat(una.header.lng) + 180) / 6) + 1 : 33 };
                }
                const inGradi = ([x, y]) => crs.tipo === 'geo' ? { lat: y, lng: x } : geoDaUtm(x, y, crs.zona);
                return letti.poligoni.map(p => ({ nome: String(p.nome).slice(0, 60), punti: p.anello.map(inGradi).filter((q, i, a) => !i || Math.abs(q.lat - a[i - 1].lat) + Math.abs(q.lng - a[i - 1].lng) > 1e-10) }))
                    .map(p => { if (p.punti.length > 3 && Math.abs(p.punti[0].lat - p.punti[p.punti.length - 1].lat) + Math.abs(p.punti[0].lng - p.punti[p.punti.length - 1].lng) < 1e-10) p.punti.pop(); return p; })
                    .filter(p => p.punti.length >= 3);
            }

            /** IMPORTA IL PERIMETRO: il file, la scelta del poligono (se più d'uno, il più grande di base),
             * poi diventa un poligono disegnato e il perimetro del modello. */
            async function importaPerimetro(files) {
                let poligoni;
                try { poligoni = await poligoniDaFile(files); } catch (e) { appAlert('Il perimetro non si è potuto leggere: ' + (e.message || e)); return; }
                const area = p => areaMetriQuadri(p.punti);
                poligoni.sort((a, b) => area(b) - area(a));
                let scelto = poligoni[0];
                if (poligoni.length > 1) {
                    const r = await appDialog(`Nel file ci sono ${poligoni.length} poligoni: quale fa da perimetro del modello?`, { confirm: true, title: 'Perimetro del modello 3D', okLabel: 'Usa questo',
                        fields: [{ name: 'quale', type: 'select', value: '0', options: poligoni.map((p, i) => ({ value: String(i), label: `${p.nome} · ${numeroConVirgola(area(p), 0)} m²` })) }] });
                    if (!r || !r.ok) return;
                    scelto = poligoni[Number(r.valori.quale) || 0];
                }
                const x = creaDisegno('poligono', scelto.punti);
                x.nome = scelto.nome || x.nome;
                usaPerimetroModello(x.id);
            }

            // ---- I comandi: scheda «Modello e tagli» del 3D ----
            document.getElementById('btnImportaPerimetro3d').addEventListener('click', () => { const f = document.getElementById('filePerimetro3d'); f.value = ''; f.click(); });
            document.getElementById('filePerimetro3d').addEventListener('change', (e) => { if (e.target.files.length) importaPerimetro([...e.target.files]); });
            document.getElementById('btnTogliPerimetro3d').addEventListener('click', () => usaPerimetroModello(null));
