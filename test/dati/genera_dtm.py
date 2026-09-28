"""Genera i DTM di prova in test/dati/dtm/ (servono tifffile, imagecodecs, numpy).
Il terreno è un piano inclinato noto: la quota attesa in un punto si calcola esatta.
  UTM:   z = 40 + 0.02 (x - 754000) + 0.03 (y - 4453000)
  gradi: z = 40 + 1000 (lng - 17.99) + 2000 (lat - 40.19)
"""
import numpy as np, tifffile, os

QUI = os.path.join(os.path.dirname(__file__), 'dtm')
X0, Y0, D, N = 754200.0, 4454400.0, 5.0, 200  # angolo in alto a sinistra, cella, celle per lato

def piano_utm(x0=X0, y0=Y0, d=D, n=N):
    xs = x0 + (np.arange(n) + 0.5) * d
    ys = y0 - (np.arange(n) + 0.5) * d
    X, Y = np.meshgrid(xs, ys)
    return (40 + 0.02 * (X - 754000) + 0.03 * (Y - 4453000)).astype(np.float32)

def geotiff(nome, dati, epsg, x0=X0, y0=Y0, d=D, **opz):
    chiavi = [1, 1, 0, 3, 1024, 0, 1, 1, 1025, 0, 1, 1, 3072, 0, 1, epsg]
    extra = [(33550, 'd', 3, (d, d, 0.0), True), (33922, 'd', 6, (0.0, 0.0, 0.0, x0, y0, 0.0), True),
             (34735, 'H', len(chiavi), chiavi, True), (42113, 's', 0, '-9999', True)]
    tifffile.imwrite(os.path.join(QUI, nome), dati, extratags=extra, **opz)

os.makedirs(QUI, exist_ok=True)
z = piano_utm()
geotiff('utm33_lzw_pred3.tif', z, 32633, compression='lzw', predictor=3, rowsperstrip=16)
geotiff('etrs89_deflate_tessere.tif', z, 25833, compression='zlib', predictor=3, tile=(64, 64))
geotiff('utm33_int16_pred2.tif', np.round(z).astype(np.int16), 32633, compression='lzw', predictor=2)
geotiff('utm33_grezzo_bigendian.tif', z, 32633, byteorder='>')
geotiff('gauss_boaga.tif', z, 3004, compression='zlib', predictor=3)
geotiff('altrove.tif', z, 32633, x0=X0 + 50000, compression='zlib', predictor=3)
# Buchi: una fascia senza dati a nord
zb = z.copy(); zb[:20, :] = -9999
geotiff('utm33_con_buchi.tif', zb, 32633, compression='zlib', predictor=3)

# ASCII Grid senza sistema di riferimento (in UTM 33: lo deve capire dalle prove)
with open(os.path.join(QUI, 'utm33_senza_crs.asc'), 'w') as f:
    f.write(f'ncols {N}\nnrows {N}\nxllcorner {X0}\nyllcorner {Y0 - N * D}\ncellsize {D}\nNODATA_value -9999\n')
    for r in z: f.write(' '.join(f'{v:.2f}' for v in r) + '\n')

# ASCII Grid in gradi
n, d, lng0, lat0 = 120, 0.0001, 17.986, 40.200  # lat0 = bordo nord
lngs = lng0 + (np.arange(n) + 0.5) * d
lats = lat0 - (np.arange(n) + 0.5) * d
L, A = np.meshgrid(lngs, lats)
zg = 40 + 1000 * (L - 17.99) + 2000 * (A - 40.19)
with open(os.path.join(QUI, 'gradi.asc'), 'w') as f:
    f.write(f'ncols {n}\nnrows {n}\nxllcenter {lng0 + d / 2}\nyllcenter {lat0 - n * d + d / 2}\ncellsize {d}\nNODATA_value -9999\n')
    for r in zg: f.write(' '.join(f'{v:.4f}' for v in r) + '\n')
print('ok')
