"""Prepara la cartella `pubblica/` che Netlify serve (https://dpsh.netlify.app).

Parte da dist/DPSH.html (costruito da build.py) e dai file statici di web/. Solo libreria standard.

  pubblica/index.html   la stessa app di dist/DPSH.html, con UNA differenza: il <link rel="manifest">
                        incorporato (data:) diventa href="manifest.webmanifest". Una copia: dist/
                        resta com'è, perché APK e desktop usano il file unico e non hanno un sito.
  pubblica/...          tutto web/ (manifest.webmanifest, sw.js, icone/) così com'è, salvo che in
                        sw.js il segnaposto __VERSIONE_CACHE__ diventa l'impronta sha256 di
                        index.html: ogni versione nuova dell'app ha una cache nuova.

    python3 tools/prepara_netlify.py
"""
import hashlib
import os
import re
import shutil
import sys

SEGNAPOSTO = '__VERSIONE_CACHE__'
# Il manifest incorporato nella testata (src/shell/01_head.html): virgolette singole, dentro c'è un data: URL.
RE_MANIFEST = re.compile(r"""<link rel="manifest" href='data:[^']*'>""")


def impronta(testo_o_byte):
    dati = testo_o_byte.encode('utf-8') if isinstance(testo_o_byte, str) else testo_o_byte
    return hashlib.sha256(dati).hexdigest()


def prepara(radice, uscita=None):
    """Scrive `uscita` (default radice/pubblica). Ritorna l'impronta sha256 completa di index.html."""
    sorgente = os.path.join(radice, 'dist', 'DPSH.html')
    web = os.path.join(radice, 'web')
    uscita = uscita or os.path.join(radice, 'pubblica')
    if not os.path.isfile(sorgente):
        raise SystemExit('Manca dist/DPSH.html: esegui prima python3 build.py')
    if not os.path.isdir(web):
        raise SystemExit('Manca la cartella web/ con manifest, sw.js e icone')

    with open(sorgente, encoding='utf-8') as f:
        html = f.read()
    html, n = RE_MANIFEST.subn('<link rel="manifest" href="manifest.webmanifest">', html)
    if n != 1:
        raise SystemExit(f'Atteso un solo <link rel="manifest" href=\'data:...\'> in dist/DPSH.html, trovati {n}')

    if os.path.isdir(uscita):
        shutil.rmtree(uscita)
    os.makedirs(uscita)
    with open(os.path.join(uscita, 'index.html'), 'w', encoding='utf-8', newline='') as f:
        f.write(html)
    firma = impronta(html)

    copiati = []
    for cartella, sottocartelle, files in os.walk(web):
        sottocartelle[:] = [d for d in sottocartelle if not d.startswith('.')]
        for nome in files:
            if nome.startswith('.'):
                continue
            da = os.path.join(cartella, nome)
            rel = os.path.relpath(da, web)
            a = os.path.join(uscita, rel)
            os.makedirs(os.path.dirname(a), exist_ok=True)
            if nome == 'sw.js':
                with open(da, encoding='utf-8') as f:
                    sw = f.read()
                with open(a, 'w', encoding='utf-8', newline='') as f:
                    f.write(sw.replace(SEGNAPOSTO, firma[:16]))
            else:
                shutil.copyfile(da, a)
            copiati.append(rel.replace(os.sep, '/'))
    print(f'pubblica/: index.html (impronta {firma[:16]}) + {len(copiati)} file da web/: {", ".join(sorted(copiati))}')
    return firma


if __name__ == '__main__':
    prepara(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sys.exit(0)
