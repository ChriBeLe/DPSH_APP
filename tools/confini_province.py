# Rigenera src/js/071s_confini-province.js dalle province ISTAT (openpolis/geojson-italy, CC BY 4.0).
# Uso: python tools/confini_province.py limits_IT_provinces.geojson 0.004 > province.json
# poi il JSON va scritto nel pezzo come una voce per riga (vedi il commento in testa al pezzo).
# Province d'Italia semplificate (ISTAT 1/1/2026 via openpolis/geojson-italy, CC BY 4.0):
# anelli esterni, tolleranza ~0.002°, coordinate intere in millesimi di grado, a differenze.
import json, sys
from shapely.geometry import shape, Polygon, MultiPolygon
src, tol = sys.argv[1], float(sys.argv[2])
d = json.load(open(src))
out = []
for f in d['features']:
    g = shape(f['geometry']).buffer(0).simplify(tol, preserve_topology=True)
    polys = [g] if isinstance(g, Polygon) else list(g.geoms)
    anelli = []
    for p in polys:
        if p.area < (tol * 3) ** 2: continue
        pts = [(round(x * 1000), round(y * 1000)) for x, y in p.exterior.coords[:-1]]
        enc, px, py = [], 0, 0
        for x, y in pts:
            enc += [x - px, y - py]; px, py = x, y
        anelli.append(','.join(map(str, enc)))
    pr = f['properties']
    out.append([pr['prov_acr'], pr['prov_name'], int(pr['reg_istat_code_num']), '|'.join(anelli)])
out.sort(key=lambda r: (r[2], r[1]))
print(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
