            // ===================== GEOPACKAGE DELLE SEZIONI (.gpkg) =====================
            // Un GeoPackage è un file SQLite con alcune tabelle stabilite (OGC 12-128). L'app lo scrive
            // da sé, senza librerie: poche tabelle piccole, ciascuna in una pagina sola (pagine da
            // 64 KB). Dentro: «sezioni» (le tracce, linee) e «prove» (punti), in WGS84 (EPSG:4326),
            // con nome, lunghezza e direzione. Si apre in QGIS come due layer.

            const GPKG_WKT_4326 = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],'
                + 'PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]';
            const PAGINA_SQLITE = 65536;
            /** Un numero da scrivere come reale anche quando è tondo (le colonne REAL). */
            const realeSqlite = v => ({ reale: v });

            /** Varint di SQLite: 7 bit per byte, il nono byte intero; i negativi come 64 bit senza segno. */
            function varintSqlite(v) {
                let n = BigInt.asUintN(64, BigInt(v));
                if (n >> 56n) {
                    const out = new Array(9);
                    out[8] = Number(n & 0xffn); n >>= 8n;
                    for (let i = 7; i >= 0; i--) { out[i] = Number(n & 0x7fn) | 0x80; n >>= 7n; }
                    return out;
                }
                const out = [];
                do { out.unshift(Number(n & 0x7fn)); n >>= 7n; } while (n);
                for (let i = 0; i < out.length - 1; i++) out[i] |= 0x80;
                return out;
            }

            /** Un record di SQLite: intestazione coi tipi, poi i valori (big-endian). */
            function recordSqlite(valori) {
                const tipi = [], corpo = [];
                const enc = new TextEncoder();
                valori.forEach(v => {
                    if (v === null || v === undefined) { tipi.push(0); return; }
                    if (v instanceof Uint8Array) { tipi.push(12 + 2 * v.length); corpo.push(...v); return; }
                    if (typeof v === 'string') { const b = enc.encode(v); tipi.push(13 + 2 * b.length); corpo.push(...b); return; }
                    const dv = new DataView(new ArrayBuffer(8));
                    if (typeof v === 'object' || !Number.isInteger(v)) { tipi.push(7); dv.setFloat64(0, typeof v === 'object' ? v.reale : v); }
                    else { tipi.push(6); dv.setBigInt64(0, BigInt(v)); }
                    corpo.push(...new Uint8Array(dv.buffer));
                });
                const t = tipi.flatMap(varintSqlite);
                let h = t.length + 1;
                while (varintSqlite(h).length + t.length !== h) h = varintSqlite(h).length + t.length;
                return [...varintSqlite(h), ...t, ...corpo];
            }

            /** Una pagina foglia di tabella con le sue righe (in ordine di rowid). */
            function paginaFogliaSqlite(righe, primaPagina) {
                const pg = new Uint8Array(PAGINA_SQLITE), dv = new DataView(pg.buffer), inizio = primaPagina ? 100 : 0;
                let fine = PAGINA_SQLITE;
                const puntatori = righe.map(r => {
                    const rec = recordSqlite(r.valori), cella = [...varintSqlite(rec.length), ...varintSqlite(r.rowid), ...rec];
                    fine -= cella.length;
                    pg.set(cella, fine);
                    return fine;
                });
                if (inizio + 8 + 2 * righe.length > fine) throw new Error('Troppi elementi per il GeoPackage (una tabella sta in 64 KB).');
                pg[inizio] = 0x0d;
                dv.setUint16(inizio + 3, righe.length);
                dv.setUint16(inizio + 5, fine === PAGINA_SQLITE ? 0 : fine);
                puntatori.forEach((p, i) => dv.setUint16(inizio + 8 + 2 * i, p));
                return pg;
            }

            /** Il file SQLite: pagina 1 lo schema (sqlite_master), poi una pagina per tabella.
             * tabelle: [{ nome, sql, righe: [{ rowid, valori }] }] */
            function fileSqlite(tabelle) {
                const schema = tabelle.map((t, i) => ({ rowid: i + 1, valori: ['table', t.nome, t.nome, i + 2, t.sql] }));
                const pagine = [paginaFogliaSqlite(schema, true), ...tabelle.map(t => paginaFogliaSqlite(t.righe, false))];
                const p1 = pagine[0], dv = new DataView(p1.buffer);
                p1.set(new TextEncoder().encode('SQLite format 3\0'), 0);
                dv.setUint16(16, 1);                 // 1 = pagine da 65536 byte
                p1[18] = 1; p1[19] = 1; p1[20] = 0; p1[21] = 64; p1[22] = 32; p1[23] = 32;
                dv.setUint32(24, 1);                 // contatore delle modifiche
                dv.setUint32(28, pagine.length);     // pagine del file
                dv.setUint32(40, 1);                 // schema cookie
                dv.setUint32(44, 4);                 // formato dello schema
                dv.setUint32(56, 1);                 // UTF-8
                dv.setUint32(60, 10300);             // versione GeoPackage 1.3
                dv.setUint32(68, 0x47504B47);        // «GPKG»
                dv.setUint32(92, 1);
                dv.setUint32(96, 3045000);
                const out = new Uint8Array(pagine.length * PAGINA_SQLITE);
                pagine.forEach((p, i) => out.set(p, i * PAGINA_SQLITE));
                return out;
            }

            /** La geometria nel formato GeoPackage: intestazione «GP» con SRS e riquadro, poi WKB. */
            function geometriaGpkg(punti) {
                const lin = punti.length > 1, n = lin ? 4 + punti.length * 16 : 16;
                const dv = new DataView(new ArrayBuffer(8 + 32 + 5 + n));
                const xs = punti.map(p => p[0]), ys = punti.map(p => p[1]);
                dv.setUint8(0, 0x47); dv.setUint8(1, 0x50); dv.setUint8(2, 0); dv.setUint8(3, 0x03); // little endian, riquadro xy
                dv.setInt32(4, 4326, true);
                [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)].forEach((v, i) => dv.setFloat64(8 + i * 8, v, true));
                let o = 40;
                dv.setUint8(o, 1); dv.setUint32(o + 1, lin ? 2 : 1, true); o += 5;
                if (lin) { dv.setUint32(o, punti.length, true); o += 4; }
                punti.forEach(p => { dv.setFloat64(o, p[0], true); dv.setFloat64(o + 8, p[1], true); o += 16; });
                return new Uint8Array(dv.buffer);
            }

            /** Il GeoPackage del progetto: le tracce delle sezioni e le prove col GPS. */
            function geopackageSezioni(proj, d) {
                const tracce = (proj.sezioniTracciate || []);
                const prove = proveFisiche(proveConCoordinate(proj));
                const ora = new Date().toISOString().replace(/\.(\d{3})\d*Z$/, '.$1Z');
                const tutti = tracce.flatMap(t => [[t.a.lng, t.a.lat], [t.b.lng, t.b.lat]]).concat(prove.map(s => [parseFloat(s.header.lng), parseFloat(s.header.lat)]));
                const xs = tutti.map(p => p[0]), ys = tutti.map(p => p[1]);
                const riquadro = tutti.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(realeSqlite) : [null, null, null, null];
                const progetto = proj.name || proj.comune || '';
                return fileSqlite([
                    { nome: 'gpkg_spatial_ref_sys', sql: 'CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT NOT NULL, srs_id INTEGER PRIMARY KEY, organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL, definition TEXT NOT NULL, description TEXT)',
                        righe: [
                            { rowid: -1, valori: ['Undefined cartesian SRS', null, 'NONE', -1, 'undefined', 'undefined cartesian coordinate reference system'] },
                            { rowid: 0, valori: ['Undefined geographic SRS', null, 'NONE', 0, 'undefined', 'undefined geographic coordinate reference system'] },
                            { rowid: 4326, valori: ['WGS 84 geodetic', null, 'EPSG', 4326, GPKG_WKT_4326, 'longitude/latitude coordinates in decimal degrees on the WGS 84 spheroid'] }
                        ] },
                    { nome: 'gpkg_contents', sql: "CREATE TABLE gpkg_contents (table_name TEXT NOT NULL, data_type TEXT NOT NULL, identifier TEXT, description TEXT DEFAULT '', last_change DATETIME NOT NULL, min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER)",
                        righe: [
                            { rowid: 1, valori: ['sezioni', 'features', 'sezioni', 'Tracce delle sezioni — ' + progetto, ora, ...riquadro, 4326] },
                            { rowid: 2, valori: ['prove', 'features', 'prove', 'Prove DPSH — ' + progetto, ora, ...riquadro, 4326] }
                        ] },
                    { nome: 'gpkg_geometry_columns', sql: 'CREATE TABLE gpkg_geometry_columns (table_name TEXT NOT NULL, column_name TEXT NOT NULL, geometry_type_name TEXT NOT NULL, srs_id INTEGER NOT NULL, z TINYINT NOT NULL, m TINYINT NOT NULL)',
                        righe: [
                            { rowid: 1, valori: ['sezioni', 'geom', 'LINESTRING', 4326, 0, 0] },
                            { rowid: 2, valori: ['prove', 'geom', 'POINT', 4326, 0, 0] }
                        ] },
                    { nome: 'sezioni', sql: 'CREATE TABLE sezioni (fid INTEGER PRIMARY KEY, geom LINESTRING, nome TEXT, inizio TEXT, fine TEXT, lunghezza_m REAL, direzione_gradi REAL, progetto TEXT)',
                        righe: tracce.map((t, i) => {
                            const s = d ? tracciaInScena(d, t) : null, [e1, e2] = estremiTraccia(t.nome);
                            const az = s ? ((Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1]) * 180 / Math.PI) + 360) % 360 : null;
                            return { rowid: i + 1, valori: [null, geometriaGpkg([[t.a.lng, t.a.lat], [t.b.lng, t.b.lat]]), t.nome, e1, e2, s ? realeSqlite(+s.L.toFixed(2)) : null, az === null ? null : realeSqlite(+az.toFixed(1)), progetto] };
                        }) },
                    { nome: 'prove', sql: 'CREATE TABLE prove (fid INTEGER PRIMARY KEY, geom POINT, nome TEXT, quota_m REAL, progetto TEXT)',
                        righe: prove.map((s, i) => {
                            const q = quotaDellaProva(proj, s.header);
                            return { rowid: i + 1, valori: [null, geometriaGpkg([[parseFloat(s.header.lng), parseFloat(s.header.lat)]]), nomeDpsh(s), q === null ? null : realeSqlite(+q.toFixed(2)), progetto] };
                        }) }
                ]);
            }

            document.getElementById('btnGpkgSezioni3d').addEventListener('click', () => {
                const proj = state.projects[state.currentProjectId];
                if (!proj) return;
                if (!(proj.sezioniTracciate || []).length) { appAlert('Prima traccia almeno una sezione.'); return; }
                try {
                    const nome = (proj.name || 'progetto').replace(/[^\w\-]+/g, '_');
                    scaricaBlobFile(new Blob([geopackageSezioni(proj, datiVista3dCorrenti)], { type: 'application/geopackage+sqlite3' }), `Sezioni_${nome}.gpkg`);
                } catch (e) { appAlert(e.message); }
            });
