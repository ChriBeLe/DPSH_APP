# Il GeoPackage di prova del perimetro del modello 3D (test/perimetro_modello.js): un file SQLite vero,
# con due poligoni attorno alle prove del progetto di Nardò, in WGS84 (srs_id 100 → EPSG 4326, così si
# prova la tabella dei sistemi). Il grande ha tanti vertici: la riga non sta in una pagina (overflow).
import os, sqlite3, struct
LAT0, LNG0 = 40.1968, 17.993
def gradi(x, y):
    return (LNG0 + x / 85000, LAT0 + y / 111000)
def fitto(anello, n):
    out = []
    for i, a in enumerate(anello):
        b = anello[(i + 1) % len(anello)]
        out += [(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n) for k in range(n)]
    return out + [out[0]]
def gp(anello, srs):
    pts = [gradi(*p) for p in anello]
    wkb = struct.pack('<BII', 1, 3, 1) + struct.pack('<I', len(pts)) + b''.join(struct.pack('<dd', *p) for p in pts)
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return b'GP' + bytes([0, 0b00000011]) + struct.pack('<i', srs) + struct.pack('<dddd', min(xs), max(xs), min(ys), max(ys)) + wkb
qui = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'perimetro.gpkg')
if os.path.exists(qui): os.remove(qui)
db = sqlite3.connect(qui)
db.executescript('''
PRAGMA page_size = 4096;
CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT NOT NULL, srs_id INTEGER NOT NULL PRIMARY KEY, organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL, definition TEXT NOT NULL, description TEXT);
CREATE TABLE gpkg_contents (table_name TEXT NOT NULL PRIMARY KEY, data_type TEXT NOT NULL, identifier TEXT, srs_id INTEGER);
CREATE TABLE gpkg_geometry_columns (table_name TEXT NOT NULL, column_name TEXT NOT NULL, geometry_type_name TEXT NOT NULL, srs_id INTEGER NOT NULL, z TINYINT NOT NULL, m TINYINT NOT NULL);
CREATE TABLE confini (fid INTEGER PRIMARY KEY AUTOINCREMENT, geom POLYGON, nome TEXT);
''')
db.execute("INSERT INTO gpkg_spatial_ref_sys VALUES ('WGS 84', 100, 'EPSG', 4326, 'GEOGCS[\"WGS 84\"]', NULL)")
db.execute("INSERT INTO gpkg_contents VALUES ('confini', 'features', 'confini', 100)")
db.execute("INSERT INTO gpkg_geometry_columns VALUES ('confini', 'geom', 'POLYGON', 100, 0, 0)")
L = [(-80, -80), (220, -80), (220, 40), (150, 40), (150, 160), (-80, 160)]
db.execute('INSERT INTO confini (geom, nome) VALUES (?, ?)', (gp(fitto(L, 60), 100), 'Area di cantiere'))
db.execute('INSERT INTO confini (geom, nome) VALUES (?, ?)', (gp([(0, 0), (20, 0), (20, 20), (0, 20), (0, 0)], 100), 'Recinto'))
db.commit(); db.close()
print(qui, os.path.getsize(qui))
