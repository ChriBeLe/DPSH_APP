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

            /** La cella di una riga di tabella: lunghezza del record, rowid, record. Il record deve stare in una
             * pagina (niente pagine di trabocco): chi scrive divide i dati grandi su più righe. */
            function cellaSqlite(r) {
                const rec = recordSqlite(r.valori);
                if (rec.length > PAGINA_SQLITE - 35) throw new Error('Una riga troppo grande per il GeoPackage.');
                return [...varintSqlite(rec.length), ...varintSqlite(r.rowid), ...rec];
            }
            /** Una pagina foglia di tabella con le sue celle (in ordine di rowid). */
            function paginaFogliaSqlite(righe, primaPagina, celle) {
                const pg = new Uint8Array(PAGINA_SQLITE), dv = new DataView(pg.buffer), inizio = primaPagina ? 100 : 0;
                celle = celle || righe.map(cellaSqlite);
                let fine = PAGINA_SQLITE;
                const puntatori = celle.map(cella => { fine -= cella.length; pg.set(cella, fine); return fine; });
                if (inizio + 8 + 2 * celle.length > fine) throw new Error('Troppi elementi per una pagina del GeoPackage.');
                pg[inizio] = 0x0d;
                dv.setUint16(inizio + 3, celle.length);
                dv.setUint16(inizio + 5, fine === PAGINA_SQLITE ? 0 : fine);
                puntatori.forEach((p, i) => dv.setUint16(inizio + 8 + 2 * i, p));
                return pg;
            }
            /** Le righe di una tabella divise in pagine foglia (quante ne servono), con la chiave più alta di ognuna. */
            function foglieSqlite(righe) {
                const ordinate = righe.slice().sort((a, b) => a.rowid - b.rowid), gruppi = [];
                let ora = [], usato = 8, chiave = null;
                ordinate.forEach(r => {
                    const c = cellaSqlite(r);
                    if (ora.length && usato + c.length + 2 > PAGINA_SQLITE) { gruppi.push({ celle: ora, chiave }); ora = []; usato = 8; }
                    ora.push(c); usato += c.length + 2; chiave = r.rowid;
                });
                gruppi.push({ celle: ora, chiave: chiave === null ? 0 : chiave });
                return gruppi.map(g => ({ pagina: paginaFogliaSqlite(null, false, g.celle), chiave: g.chiave }));
            }
            /** La pagina interna (la radice) di una tabella su più foglie: i figli con la loro chiave più alta,
             * l'ultimo a destra. */
            function paginaInternaSqlite(figli, destra) {
                const pg = new Uint8Array(PAGINA_SQLITE), dv = new DataView(pg.buffer);
                let fine = PAGINA_SQLITE;
                const puntatori = figli.map(f => {
                    const cella = [(f.pagina >>> 24) & 255, (f.pagina >>> 16) & 255, (f.pagina >>> 8) & 255, f.pagina & 255, ...varintSqlite(f.chiave)];
                    fine -= cella.length; pg.set(cella, fine); return fine;
                });
                if (12 + 2 * figli.length > fine) throw new Error('Troppi dati per il GeoPackage.');
                pg[0] = 0x05;
                dv.setUint16(3, figli.length);
                dv.setUint16(5, fine === PAGINA_SQLITE ? 0 : fine);
                dv.setUint32(8, destra);
                puntatori.forEach((p, i) => dv.setUint16(12 + 2 * i, p));
                return pg;
            }

            /** Il file SQLite: pagina 1 lo schema (sqlite_master), poi ogni tabella: una pagina foglia, o una
             * radice interna con le sue foglie. tabelle: [{ nome, sql, righe: [{ rowid, valori }] }] */
            function fileSqlite(tabelle) {
                const foglie = tabelle.map(t => foglieSqlite(t.righe));
                let n = 2;
                const radici = foglie.map(f => { const r = n; n += f.length > 1 ? f.length + 1 : 1; return r; });
                const schema = tabelle.map((t, i) => ({ rowid: i + 1, valori: ['table', t.nome, t.nome, radici[i], t.sql] }));
                const pagine = [paginaFogliaSqlite(schema, true)];
                foglie.forEach((f, i) => {
                    if (f.length === 1) { pagine.push(f[0].pagina); return; }
                    const figli = f.map((x, j) => ({ pagina: radici[i] + 1 + j, chiave: x.chiave }));
                    pagine.push(paginaInternaSqlite(figli.slice(0, -1), figli[figli.length - 1].pagina), ...f.map(x => x.pagina));
                });
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
