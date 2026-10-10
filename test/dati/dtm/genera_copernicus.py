# Una tessera "alla Copernicus" per test/trova_dtm.js: 1° × 1° (N40 E017), in gradi WGS84
# (EPSG:4326), a tessere 256 × 256, Deflate col predittore 3, float32 — come i COG di
# copernicus-dem-30m, ma a 0,002° (500 × 500) perché il file resti piccolo.
# Quota = il piano di gradi.asc: 40 + 1000 (lng − 17,99) + 2000 (lat − 40,19).
# Uso: python test/dati/dtm/genera_copernicus.py  (serve: pip install numpy tifffile imagecodecs)
import os
import numpy as np
import tifffile

N, PASSO, LAT0, LNG0 = 500, 0.002, 40, 17
lng = LNG0 + (np.arange(N) + 0.5) * PASSO
lat = LAT0 + 1 - (np.arange(N) + 0.5) * PASSO
quote = (40 + 1000 * (lng[None, :] - 17.99) + 2000 * (lat[:, None] - 40.19)).astype(np.float32)
geochiavi = [1, 1, 0, 3, 1024, 0, 1, 2, 1025, 0, 1, 1, 2048, 0, 1, 4326]
extra = [(33550, 'd', 3, (PASSO, PASSO, 0.0), True), (33922, 'd', 6, (0.0, 0.0, 0.0, LNG0, LAT0 + 1, 0.0), True),
         (34735, 'H', len(geochiavi), geochiavi, True)]
dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'copernicus_N40_E017.tif')
tifffile.imwrite(dest, quote, tile=(256, 256), compression='zlib', predictor=3, extratags=extra, photometric='minisblack')
print(dest, os.path.getsize(dest))
