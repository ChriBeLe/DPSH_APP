"""Prepara dist/DPSH-pc.zip: il programma da PC (questa cartella) con dentro l'ultimo DPSH.html."""
import os, zipfile

QUI = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(QUI, '..', 'dist')
FILE = ['main.js', 'preload.js', 'package.json', 'avvia.sh', 'installa.sh', 'icona.png', 'LEGGIMI.md']

app = os.path.join(DIST, 'DPSH.html')
if not os.path.exists(app):
    raise SystemExit('Manca dist/DPSH.html: prima python build.py')
uscita = os.path.join(DIST, 'DPSH-pc.zip')
with zipfile.ZipFile(uscita, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in FILE:
        info = zipfile.ZipInfo('DPSH/' + f)
        info.external_attr = (0o755 if f.endswith('.sh') else 0o644) << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(info, open(os.path.join(QUI, f), 'rb').read())
    z.write(app, 'DPSH/DPSH.html')
print(uscita, os.path.getsize(uscita), 'byte')
