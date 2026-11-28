"""Genera test/dati/tessere_qgis.gpkg: un GeoPackage di tessere fatto da SQLite vero (con indici, pagine da 4096,
tessere più grandi di una pagina), come lo scriverebbe QGIS/GDAL. Serve a controllare il lettore dell'app."""
import sqlite3, os, random, math
random.seed(7)
f = os.path.join(os.path.dirname(__file__), 'tessere_qgis.gpkg')
if os.path.exists(f): os.remove(f)
c = sqlite3.connect(f)
c.executescript("""
PRAGMA application_id=1196444487; PRAGMA user_version=10300; PRAGMA page_size=4096;
CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT NOT NULL, srs_id INTEGER PRIMARY KEY, organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL, definition TEXT NOT NULL, description TEXT);
CREATE TABLE gpkg_contents (table_name TEXT NOT NULL PRIMARY KEY, data_type TEXT NOT NULL, identifier TEXT UNIQUE, description TEXT DEFAULT '', last_change DATETIME NOT NULL, min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER);
CREATE TABLE gpkg_tile_matrix_set (table_name TEXT NOT NULL PRIMARY KEY, srs_id INTEGER NOT NULL, min_x DOUBLE NOT NULL, min_y DOUBLE NOT NULL, max_x DOUBLE NOT NULL, max_y DOUBLE NOT NULL);
CREATE TABLE gpkg_tile_matrix (table_name TEXT NOT NULL, zoom_level INTEGER NOT NULL, matrix_width INTEGER NOT NULL, matrix_height INTEGER NOT NULL, tile_width INTEGER NOT NULL, tile_height INTEGER NOT NULL, pixel_x_size DOUBLE NOT NULL, pixel_y_size DOUBLE NOT NULL, CONSTRAINT pk_ttm PRIMARY KEY (table_name, zoom_level));
CREATE TABLE ortofoto (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, zoom_level INTEGER NOT NULL, tile_column INTEGER NOT NULL, tile_row INTEGER NOT NULL, tile_data BLOB NOT NULL, UNIQUE (zoom_level, tile_column, tile_row));
""")
W = 20037508.342789244
c.execute("INSERT INTO gpkg_spatial_ref_sys VALUES ('WGS 84 / Pseudo-Mercator',3857,'EPSG',3857,'x','')")
c.execute("INSERT INTO gpkg_contents VALUES ('ortofoto','tiles','Ortofoto di prova','', '2026-11-28T00:00:00.000Z',-?,-?,?,?,3857)".replace('-?','-%r'%W,2).replace('?',repr(W)))
c.execute("INSERT INTO gpkg_tile_matrix_set VALUES ('ortofoto',3857,?,?,?,?)",(-W,-W,W,W))
for z in (16,17):
    c.execute("INSERT INTO gpkg_tile_matrix VALUES ('ortofoto',?,?,?,256,256,?,?)",(z,2**z,2**z,2*W/2**z/256,2*W/2**z/256))
    x0=int((17.993+180)/360*2**z); y0=int((1-math.asinh(math.tan(math.radians(40.197)))/math.pi)/2*2**z)
    for dx in range(8):
        for dy in range(8):
            n = random.choice([900, 3000, 9000, 20000])  # alcune oltre la pagina: trabocco
            d = bytes([0xFF,0xD8]) + bytes(random.getrandbits(8) for _ in range(n)) + bytes([x0+dx & 255, y0+dy & 255])
            c.execute("INSERT INTO ortofoto (zoom_level,tile_column,tile_row,tile_data) VALUES (?,?,?,?)",(z,x0+dx,y0+dy,d))
c.commit(); c.execute('VACUUM'); c.close()
print(f, os.path.getsize(f))
