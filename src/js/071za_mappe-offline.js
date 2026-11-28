            // ===================== MAPPE OFFLINE (tessere salvate per il campo) =====================
            // In cantiere spesso c'è poco segnale. Qui si scarica prima, con la rete, la mappa di una zona
            // (di solito pochi ettari: poche decine di tessere) e si tiene in IndexedDB, database
            // DPSH_MappeOffline, separato dagli altri. Niente service worker: da file:// non esiste.
            // La mappa 2D e il terreno del 3D cercano prima qui, poi in rete (moRendiOffline, moTessera).
            // Una tessera ha chiave «fonte|z|x|y»; le aree sono elenchi di chiavi, e una tessera comune a
            // due aree si toglie solo quando non serve più a nessuna. L'area si esporta anche in
            // GeoPackage (tessere, EPSG:3857), che QGIS apre come mappa raster.
            // Google non si scarica: i suoi termini non lo permettono. Le tessere non entrano nei backup.

            const mappeOffline = { db: null, scarico: null };
            const MO_MAX_TESSERE = 6000, MO_AVVISO_TESSERE = 1500, MO_BYTE_MEDI = 28000, MO_MARGINE_M = 300;
            const MO_MONDO_3857 = 20037508.342789244;
            const MO_WKT_3857 = 'PROJCS["WGS 84 / Pseudo-Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Mercator_1SP"],PARAMETER["central_meridian",0],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",EAST],AXIS["Northing",NORTH],AUTHORITY["EPSG","3857"]]';

            function moDb() {
                if (!mappeOffline.db) {
                    mappeOffline.db = new Promise((resolve, reject) => {
                        if (typeof indexedDB === 'undefined') { reject(new Error('Questo dispositivo non salva dati nel browser.')); return; }
                        const req = indexedDB.open('DPSH_MappeOffline', 1);
                        req.onupgradeneeded = (e) => {
                            const db = e.target.result;
                            if (!db.objectStoreNames.contains('tessere')) db.createObjectStore('tessere', { keyPath: 'k' });
                            if (!db.objectStoreNames.contains('aree')) db.createObjectStore('aree', { keyPath: 'id' });
                        };
                        req.onsuccess = (e) => resolve(e.target.result);
                        req.onerror = (e) => reject(e.target.error || new Error('Database delle mappe non disponibile.'));
                    });
                    mappeOffline.db.catch(() => { mappeOffline.db = null; });
                }
                return mappeOffline.db;
            }
            /** Una richiesta sola su un magazzino: promessa col risultato. */
            async function moRichiesta(magazzino, modo, fn) {
                const db = await moDb();
                return new Promise((resolve, reject) => {
                    const tx = db.transaction(magazzino, modo);
                    const req = fn(tx.objectStore(magazzino));
                    tx.oncomplete = () => resolve(req ? req.result : undefined);
                    tx.onerror = tx.onabort = () => reject(tx.error || new Error('Errore nel database delle mappe.'));
                });
            }
            const moChiave = (fonteKey, z, x, y) => `${fonteKey}|${z}|${x}|${y}`;
            /** Dalla chiave di una tessera: { z, x, y } (la fonte può contenere «|», si legge da destra). */
            function moDaChiave(k) { const p = k.split('|'); return { z: +p[p.length - 3], x: +p[p.length - 2], y: +p[p.length - 1] }; }
            /** La tessera salvata ({ tipo, dati }) o null: non lancia mai, se il database non va si usa la rete. */
            async function moLeggi(k) {
                try { return (await moRichiesta('tessere', 'readonly', s => s.get(k))) || null; } catch (e) { return null; }
            }
            /** Un indirizzo immagine per la tessera salvata, o null. Per i chiamanti che caricano un'immagine a parte. */
            async function moTessera(k) {
                const r = await moLeggi(k);
                return r ? URL.createObjectURL(new Blob([r.dati], { type: r.tipo })) : null;
            }
            /** Rende il livello di Leaflet capace di usare le tessere salvate; senza, chiede alla rete come sempre. */
            function moRendiOffline(layer, fonteKey) {
                layer.createTile = function (c, fatto) {
                    const tile = document.createElement('img');
                    L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, fatto, tile));
                    L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, fatto, tile));
                    tile.alt = '';
                    tile.setAttribute('role', 'presentation');
                    moTessera(moChiave(fonteKey, c.z, c.x, c.y)).then(u => {
                        if (u) { tile.addEventListener('load', () => URL.revokeObjectURL(u), { once: true }); tile.src = u; }
                        else tile.src = this.getTileUrl(c);
                    });
                    return tile;
                };
                return layer;
            }

            /** Le fonti da scaricare: le mappe a tessere e i WMS (i WMS li chiedono tessera per tessera, in EPSG:3857). */
            function moFonti() {
                const fonti = [];
                Object.entries(SFONDI_3D).forEach(([id, f]) => {
                    const google = id.startsWith('google');
                    fonti.push({ id, chiave: id, nome: f.nome, zoomMax: f.zoomMax || 19, url: f.url, ok: !google, motivo: google ? 'Google non permette di salvare le sue mappe.' : '' });
                });
                wmsDisponibili().forEach((w, i) => {
                    const s = (z, x, y) => {
                        const t = 2 * MO_MONDO_3857 / Math.pow(2, z), x0 = -MO_MONDO_3857 + x * t, y1 = MO_MONDO_3857 - y * t;
                        return w.url + (w.url.indexOf('?') === -1 ? '?' : '&') + 'service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&layers=' + encodeURIComponent(w.layer || '')
                            + `&styles=&format=image/png&transparent=false&width=256&height=256&bbox=${x0},${y1 - t},${x0 + t},${y1}`;
                    };
                    fonti.push({ id: 'wms:' + i, chiave: moChiaveWms(w), nome: w.nome, zoomMax: 20, url: s, ok: true, motivo: '' });
                });
                return fonti;
            }
            const moChiaveWms = w => 'wms|' + w.url + '|' + (w.layer || '');

            /** Le tessere di un riquadro { sud, ovest, nord, est } dallo zoom zmin a zmax: [[z, x, y], ...]. */
            function moTessereDi(r, zmin, zmax) {
                const out = [];
                for (let z = zmin; z <= zmax; z++) {
                    const n = Math.pow(2, z) - 1, lim = v => Math.max(0, Math.min(n, Math.floor(v)));
                    const x0 = lim(tessereXDaLng(r.ovest, z)), x1 = lim(tessereXDaLng(r.est, z)), y0 = lim(tessereYDaLat(r.nord, z)), y1 = lim(tessereYDaLat(r.sud, z));
                    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push([z, x, y]);
                }
                return out;
            }
            /** Il riquadro attorno alle prove con le coordinate, allargato di «margine» metri; null se nessuna prova ha il GPS. */
            function moRiquadroProve(proj, margine) {
                const pp = proveConCoordinate(proj).map(s => [parseFloat(s.header.lat), parseFloat(s.header.lng)]);
                if (!pp.length) return null;
                const lat = pp.map(p => p[0]), lng = pp.map(p => p[1]), m = Math.max(0, +margine || 0);
                const dLat = m / 111320, dLng = m / (111320 * Math.cos((Math.min(...lat) + Math.max(...lat)) / 2 * Math.PI / 180));
                return { sud: Math.min(...lat) - dLat, nord: Math.max(...lat) + dLat, ovest: Math.min(...lng) - dLng, est: Math.max(...lng) + dLng };
            }
            /** Il riquadro che si vede adesso sulla mappa 2D; null se la mappa non è aperta. */
            function moRiquadroVista() {
                const m = mappaProgetto.mappa;
                if (!m || !areaMappaAperta() || areaMappa.modo !== 'mappa') return null;
                const b = m.getBounds();
                return { sud: b.getSouth(), nord: b.getNorth(), ovest: b.getWest(), est: b.getEast() };
            }

            async function moAree() {
                try { return ((await moRichiesta('aree', 'readonly', s => s.getAll())) || []).sort((a, b) => (b.data || '').localeCompare(a.data || '')); } catch (e) { return []; }
            }
            async function moEsiste(k) { return !!(await moLeggi(k)); }
            async function moScrivi(k, tipo, dati) { await moRichiesta('tessere', 'readwrite', s => s.put({ k, tipo, dati })); }
            /** Toglie le tessere che nessuna area (tranne le escluse) usa più. */
            async function moPotaTessere(chiavi, aree, escludiId) {
                const usate = new Set();
                aree.filter(a => a.id !== escludiId).forEach(a => a.chiavi.forEach(k => usate.add(k)));
                const db = await moDb();
                await new Promise((resolve, reject) => {
                    const tx = db.transaction('tessere', 'readwrite'), s = tx.objectStore('tessere');
                    chiavi.forEach(k => { if (!usate.has(k)) s.delete(k); });
                    tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(tx.error);
                });
            }
            async function moEliminaArea(id) {
                const aree = await moAree(), a = aree.find(x => x.id === id);
                if (!a) return;
                await moPotaTessere(a.chiavi, aree, id);
                await moRichiesta('aree', 'readwrite', s => s.delete(id));
            }

            /** Scarica le tessere di un riquadro. Con `a.annulla` si ferma e non lascia niente di nuovo.
             * Esito: { area } oppure { errore }. Chi chiama controlla prima il numero (moTessereDi). */
            async function moScarica({ nome, fonteId, riquadro, zmin, zmax }) {
                if (mappeOffline.scarico) return { errore: 'Un download è già in corso.' };
                const fonte = moFonti().find(f => f.id === fonteId);
                if (!fonte) return { errore: 'Mappa non trovata.' };
                if (!fonte.ok) return { errore: fonte.motivo };
                zmax = Math.min(+zmax, fonte.zoomMax); zmin = Math.max(0, Math.min(+zmin, zmax));
                const elenco = moTessereDi(riquadro, zmin, zmax);
                if (elenco.length > MO_MAX_TESSERE) return { errore: `Troppe tessere (${elenco.length}): il massimo è ${MO_MAX_TESSERE}. Riduci la zona o lo zoom.` };
                const a = mappeOffline.scarico = { fatte: 0, totali: elenco.length, errori: 0, byte: 0, annulla: false };
                const chiavi = [], nuove = [];
                let prossima = 0;
                const una = async () => {
                    while (!a.annulla) {
                        const i = prossima++;
                        if (i >= elenco.length) return;
                        const [z, x, y] = elenco[i], k = moChiave(fonte.chiave, z, x, y);
                        try {
                            if (await moEsiste(k)) { chiavi.push(k); }
                            else {
                                let r = null;
                                for (let prova = 0; prova < 2 && !r; prova++) {
                                    try {
                                        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 20000);
                                        const resp = await fetch(fonte.url(z, x, y), { signal: ctl.signal }).finally(() => clearTimeout(t));
                                        const tipo = (resp.headers.get('content-type') || '').split(';')[0].trim();
                                        const dati = resp.ok && /^image\//.test(tipo) ? await resp.arrayBuffer() : null;
                                        if (dati && dati.byteLength) r = { tipo, dati };
                                    } catch (e) { /* si riprova una volta */ }
                                }
                                if (!r) throw new Error('tessera non scaricata');
                                await moScrivi(k, r.tipo, r.dati);
                                chiavi.push(k); nuove.push(k); a.byte += r.dati.byteLength;
                            }
                        } catch (e) { a.errori++; }
                        a.fatte++;
                        if (typeof moAggiorna === 'function') moAggiorna();
                        // le prime tessere tutte fallite: il servizio non permette il salvataggio, inutile insistere
                        if (a.fatte >= 6 && a.errori === a.fatte) a.annulla = 'servizio';
                    }
                };
                let esito;
                try {
                    await Promise.all(Array.from({ length: 6 }, una));
                    if (!a.annulla && !chiavi.length) a.annulla = 'servizio'; // niente scaricato: è il servizio, non la zona
                    if (a.annulla) {
                        await moPotaTessere(nuove, await moAree(), null);
                        esito = { errore: a.annulla === 'servizio' ? 'Questa mappa non si lascia salvare (il servizio rifiuta le richieste dall\'app). Prova un\'altra mappa.' : 'Download annullato.', annullato: true };
                    } else {
                        const area = { id: 'mo-' + Date.now().toString(36), nome: String(nome || 'Area').trim().slice(0, 60) || 'Area', fonte: fonte.id, fonteChiave: fonte.chiave, fonteNome: fonte.nome,
                            riquadro, zmin, zmax, n: chiavi.length, errori: a.errori, byte: a.byte, data: new Date().toISOString(), chiavi };
                        await moRichiesta('aree', 'readwrite', s => s.put(area));
                        esito = { area };
                    }
                } catch (e) {
                    try { await moPotaTessere(nuove, await moAree(), null); } catch (e2) { /* niente */ }
                    esito = { errore: 'Non riesco a salvare le tessere: ' + (e.message || e) };
                }
                mappeOffline.scarico = null;
                return esito;
            }

            /** L'area come GeoPackage di tessere (EPSG:3857, schema OGC 12-128), da aprire in QGIS. */
            async function moGeopackage(area) {
                const ora = new Date().toISOString().replace(/\.(\d{3})\d*Z$/, '.$1Z');
                const righe = [];
                for (const k of area.chiavi) {
                    const r = await moLeggi(k);
                    if (!r) continue;
                    const { z, x, y } = moDaChiave(k);
                    righe.push({ rowid: righe.length + 1, valori: [null, z, x, Math.pow(2, z) - 1 - y, new Uint8Array(r.dati)] });
                }
                if (!righe.length) throw new Error('Nessuna tessera salvata per questa area.');
                const zoom = [...new Set(righe.map(r => r.valori[1]))].sort((a, b) => a - b);
                const xs = z => 2 * MO_MONDO_3857 / Math.pow(2, z) / 256;
                const tabelle = [
                    { nome: 'gpkg_spatial_ref_sys', sql: 'CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT NOT NULL, srs_id INTEGER PRIMARY KEY, organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL, definition TEXT NOT NULL, description TEXT)',
                        righe: [
                            { rowid: -1, valori: ['Undefined cartesian SRS', null, 'NONE', -1, 'undefined', 'undefined cartesian coordinate reference system'] },
                            { rowid: 0, valori: ['Undefined geographic SRS', null, 'NONE', 0, 'undefined', 'undefined geographic coordinate reference system'] },
                            { rowid: 3857, valori: ['WGS 84 / Pseudo-Mercator', null, 'EPSG', 3857, MO_WKT_3857, 'Web Mercator, come le mappe sul web'] },
                            { rowid: 4326, valori: ['WGS 84 geodetic', null, 'EPSG', 4326, GPKG_WKT_4326, 'longitude/latitude coordinates in decimal degrees on the WGS 84 spheroid'] }
                        ] },
                    { nome: 'gpkg_contents', sql: "CREATE TABLE gpkg_contents (table_name TEXT NOT NULL, data_type TEXT NOT NULL, identifier TEXT, description TEXT DEFAULT '', last_change DATETIME NOT NULL, min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER)",
                        righe: [{ rowid: 1, valori: ['tessere', 'tiles', area.nome, `${area.fonteNome} — mappa offline di DPSH Field Collector`, ora, realeSqlite(-MO_MONDO_3857), realeSqlite(-MO_MONDO_3857), realeSqlite(MO_MONDO_3857), realeSqlite(MO_MONDO_3857), 3857] }] },
                    { nome: 'gpkg_tile_matrix_set', sql: 'CREATE TABLE gpkg_tile_matrix_set (table_name TEXT NOT NULL, srs_id INTEGER NOT NULL, min_x DOUBLE NOT NULL, min_y DOUBLE NOT NULL, max_x DOUBLE NOT NULL, max_y DOUBLE NOT NULL)',
                        righe: [{ rowid: 1, valori: ['tessere', 3857, realeSqlite(-MO_MONDO_3857), realeSqlite(-MO_MONDO_3857), realeSqlite(MO_MONDO_3857), realeSqlite(MO_MONDO_3857)] }] },
                    { nome: 'gpkg_tile_matrix', sql: 'CREATE TABLE gpkg_tile_matrix (table_name TEXT NOT NULL, zoom_level INTEGER NOT NULL, matrix_width INTEGER NOT NULL, matrix_height INTEGER NOT NULL, tile_width INTEGER NOT NULL, tile_height INTEGER NOT NULL, pixel_x_size DOUBLE NOT NULL, pixel_y_size DOUBLE NOT NULL)',
                        righe: zoom.map((z, i) => ({ rowid: i + 1, valori: ['tessere', z, Math.pow(2, z), Math.pow(2, z), 256, 256, realeSqlite(xs(z)), realeSqlite(xs(z))] })) },
                    { nome: 'tessere', sql: 'CREATE TABLE tessere (id INTEGER PRIMARY KEY, zoom_level INTEGER NOT NULL, tile_column INTEGER NOT NULL, tile_row INTEGER NOT NULL, tile_data BLOB NOT NULL)', righe }
                ];
                return fileSqlite(tabelle);
            }

            // ---- La finestra ----
            const MOE = id => document.getElementById(id);
            const moNomeFile = s => String(s || 'mappa').replace(/[^\w\-]+/g, '_');
            const moMB = b => (b / 1048576).toLocaleString('it-IT', { maximumFractionDigits: 1 }) + ' MB';
            /** Il riquadro scelto nella finestra (prove con margine, o vista), o null. */
            function moRiquadroScelto() {
                const proj = state.projects[state.currentProjectId];
                return MOE('moZona').value === 'vista' ? moRiquadroVista() : (proj ? moRiquadroProve(proj, MOE('moMargine').value) : null);
            }
            function moRiepilogo() {
                const r = moRiquadroScelto(), f = moFonti().find(x => x.id === MOE('moFonte').value);
                if (!r || !f) { MOE('moConto').textContent = MOE('moZona').value === 'vista' ? 'Apri la mappa 2D e inquadra la zona.' : 'Nessuna prova del progetto ha le coordinate GPS.'; return 0; }
                const n = moTessereDi(r, +MOE('moZoomDa').value, Math.min(+MOE('moZoomA').value, f.zoomMax)).length;
                MOE('moConto').textContent = `Circa ${n.toLocaleString('it-IT')} tessere, più o meno ${moMB(n * MO_BYTE_MEDI)}.`;
                return n;
            }
            async function moRender() {
                const proj = state.projects[state.currentProjectId];
                const fonti = moFonti().filter(f => f.ok);
                const sel = MOE('moFonte'), prima = sel.value;
                sel.innerHTML = fonti.map(f => `<option value="${escapeHtmlDidascalia(f.id)}">${escapeHtmlDidascalia(f.nome)}</option>`).join('');
                sel.value = fonti.some(f => f.id === prima) ? prima : (fonti.some(f => f.id === (state.settings || {}).sfondo2d) ? state.settings.sfondo2d : 'esri-satellite');
                MOE('moZona').querySelector('[value="prove"]').disabled = !(proj && proveConCoordinate(proj).length);
                MOE('moZona').querySelector('[value="vista"]').disabled = !moRiquadroVista();
                if (MOE('moZona').selectedOptions[0].disabled) MOE('moZona').value = MOE('moZona').querySelector('option:not([disabled])') ? MOE('moZona').querySelector('option:not([disabled])').value : 'prove';
                MOE('moMargineRiga').hidden = MOE('moZona').value !== 'prove';
                if (!MOE('moNome').value) MOE('moNome').value = (proj && (proj.name || proj.comune)) || 'Area';
                moRiepilogo();
                moAggiorna();
                const aree = await moAree();
                MOE('moAree').innerHTML = aree.length ? aree.map(a => `<div class="mo-area" data-area="${escapeHtmlDidascalia(a.id)}">
                    <div><b>${escapeHtmlDidascalia(a.nome)}</b><br><span class="t-didascalia">${escapeHtmlDidascalia(a.fonteNome)} · zoom ${a.zmin}–${a.zmax} · ${a.n.toLocaleString('it-IT')} tessere · ${moMB(a.byte || a.n * MO_BYTE_MEDI)} · ${new Date(a.data).toLocaleDateString('it-IT')}${a.errori ? ` · ${a.errori} non scaricate` : ''}</span></div>
                    <div class="trova-dtm-filtri">
                        <button type="button" class="bt" data-mo="vai" title="Porta la mappa su quest'area"><svg class="ico"><use href="#i-map"/></svg>Vai</button>
                        <button type="button" class="bt" data-mo="gpkg" title="GeoPackage di tessere, per QGIS"><svg class="ico"><use href="#i-download"/></svg>GeoPackage</button>
                        <button type="button" class="bt" data-mo="elimina"><svg class="ico"><use href="#i-trash"/></svg>Elimina</button>
                    </div></div>`).join('') : '<p class="t-didascalia">Nessuna area salvata. Scarica una zona prima di andare in campo.</p>';
            }
            /** Lo stato del download (barra e tasti); si aggiorna a ogni tessera. */
            function moAggiorna() {
                const a = mappeOffline.scarico;
                MOE('moAvanzamento').hidden = !a;
                MOE('moScarica').hidden = !!a;
                MOE('moAnnulla').hidden = !a;
                if (a) { MOE('moBarra').max = a.totali; MOE('moBarra').value = a.fatte; MOE('moTesto').textContent = `${a.fatte} di ${a.totali} tessere${a.errori ? ` · ${a.errori} non scaricate` : ''}`; }
            }
            function apriMappeOffline() {
                MOE('moEsito').innerHTML = '';
                MOE('mappeOffline').hidden = false;
                moRender();
                MOE('moChiudi').focus();
            }
            function chiudiMappeOffline() { MOE('mappeOffline').hidden = true; }
            const moEsito = (testo, errore) => { MOE('moEsito').innerHTML = testo ? `<div class="riga-avviso${errore ? ' pericolo' : ''}" role="${errore ? 'alert' : 'status'}">${escapeHtmlDidascalia(testo)}</div>` : ''; };
            /** Il download dalla finestra: controlla, chiede conferma se grande, scarica. Esito come moScarica. */
            async function moScaricaDaFinestra(opz) {
                const r = opz.riquadro, f = moFonti().find(x => x.id === opz.fonteId);
                if (!r) return { errore: 'Manca la zona da scaricare.' };
                const n = moTessereDi(r, +opz.zmin, Math.min(+opz.zmax, f ? f.zoomMax : 19)).length;
                if (n > MO_AVVISO_TESSERE && opz.conferma !== false && !(await appConfirm(`Sono circa ${n.toLocaleString('it-IT')} tessere (${moMB(n * MO_BYTE_MEDI)}). Scaricarle?`))) return { errore: 'Download annullato.', annullato: true };
                return moScarica(opz);
            }
            MOE('moChiudi').addEventListener('click', chiudiMappeOffline);
            MOE('mappeOffline').addEventListener('mousedown', (e) => { if (e.target === MOE('mappeOffline')) chiudiMappeOffline(); });
            document.addEventListener('keydown', (e) => {
                if (MOE('mappeOffline').hidden || e.key !== 'Escape') return;
                e.preventDefault(); e.stopImmediatePropagation(); chiudiMappeOffline();
            }, true);
            ['moZona', 'moFonte', 'moMargine', 'moZoomDa', 'moZoomA'].forEach(id => MOE(id).addEventListener('change', () => { MOE('moMargineRiga').hidden = MOE('moZona').value !== 'prove'; moRiepilogo(); }));
            MOE('moAnnulla').addEventListener('click', () => { if (mappeOffline.scarico) mappeOffline.scarico.annulla = true; });
            MOE('moScarica').addEventListener('click', async () => {
                moEsito('');
                const esito = await moScaricaDaFinestra({ nome: MOE('moNome').value, fonteId: MOE('moFonte').value, riquadro: moRiquadroScelto(), zmin: +MOE('moZoomDa').value, zmax: +MOE('moZoomA').value });
                if (esito.area) { moEsito(`Salvata «${esito.area.nome}»: ${esito.area.n} tessere${esito.area.errori ? `, ${esito.area.errori} non scaricate` : ''}. Ora la mappa funziona anche senza rete.`); mostraToast('Mappa offline salvata'); }
                else moEsito(esito.errore, !esito.annullato);
                moRender();
            });
            MOE('moAree').addEventListener('click', async (e) => {
                const b = e.target.closest('[data-mo]'), riga = b && b.closest('[data-area]');
                if (!riga) return;
                const area = (await moAree()).find(x => x.id === riga.dataset.area);
                if (!area) return;
                if (b.dataset.mo === 'vai') {
                    const m = mappaProgetto.mappa;
                    if (!m || !areaMappaAperta() || areaMappa.modo !== 'mappa') { moEsito('Apri prima la mappa 2D del progetto.', true); return; }
                    const r = area.riquadro; m.fitBounds([[r.sud, r.ovest], [r.nord, r.est]]); chiudiMappeOffline();
                } else if (b.dataset.mo === 'gpkg') {
                    try { scaricaBlobFile(new Blob([await moGeopackage(area)], { type: 'application/geopackage+sqlite3' }), 'DPSH_mappa_' + moNomeFile(area.nome) + '.gpkg'); } catch (err) { moEsito(err.message || String(err), true); }
                } else if (b.dataset.mo === 'elimina') {
                    if (!(await appConfirm(`Eliminare l'area «${area.nome}»? Le tessere salvate si cancellano da questo dispositivo.`))) return;
                    await moEliminaArea(area.id); moRender();
                }
            });
            MOE('btnMappeOffline').addEventListener('click', apriMappeOffline);
