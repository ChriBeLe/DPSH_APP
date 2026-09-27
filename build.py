"""Costruisce l'app: rimette insieme i pezzi di src/ nell'ordine di src/ordine.txt e scrive
dist/DPSH.html, il file unico che va nell'APK e che si apre nel browser del PC.

    python build.py                     # costruisce dist/DPSH.html
    python build.py --confronta FILE    # costruisce e dice se il risultato è identico a FILE

Non trasforma niente: concatena e basta. Per questo il risultato è prevedibile riga per riga
e un errore nel file finale si ritrova subito nel pezzo da cui viene (vedi --mappa).

    python build.py --mappa 12345       # in quale pezzo, e a che riga, sta la riga 12345 di dist
"""
import hashlib
import os
import sys

RADICE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(RADICE, 'src')
DIST = os.path.join(RADICE, 'dist', 'DPSH.html')


def leggi_ordine():
    with open(os.path.join(SRC, 'ordine.txt'), encoding='utf-8') as f:
        voci = [r.strip() for r in f if r.strip() and not r.lstrip().startswith('#')]
    presenti = set()
    for base, _, files in os.walk(SRC):
        for n in files:
            rel = os.path.relpath(os.path.join(base, n), SRC).replace(os.sep, '/')
            if rel != 'ordine.txt':
                presenti.add(rel)
    mancanti = [v for v in voci if v not in presenti]
    orfani = sorted(presenti - set(voci))
    if mancanti:
        raise SystemExit('ERRORE: in ordine.txt ma non in src/: ' + ', '.join(mancanti))
    if orfani:
        raise SystemExit('ERRORE: file in src/ non elencati in ordine.txt: ' + ', '.join(orfani))
    if len(set(voci)) != len(voci):
        raise SystemExit('ERRORE: ordine.txt elenca due volte lo stesso file')
    return voci


def costruisci():
    parti = []
    for voce in leggi_ordine():
        with open(os.path.join(SRC, *voce.split('/')), 'rb') as f:
            dati = f.read()
        if dati and not dati.endswith(b'\n'):
            raise SystemExit('ERRORE: %s non finisce con un a capo: i pezzi devono essere righe intere' % voce)
        parti.append((voce, dati))
    return parti


def main(argv):
    parti = costruisci()
    tutto = b''.join(d for _, d in parti)

    if len(argv) >= 2 and argv[0] == '--mappa':
        cercata = int(argv[1])
        riga = 1
        for voce, dati in parti:
            n = dati.count(b'\n')
            if cercata < riga + n:
                print('%s, riga %d' % (voce, cercata - riga + 1))
                return 0
            riga += n
        print('oltre la fine del file')
        return 1

    os.makedirs(os.path.dirname(DIST), exist_ok=True)
    temporaneo = DIST + '.tmp'
    with open(temporaneo, 'wb') as f:
        f.write(tutto)
        f.flush()
        os.fsync(f.fileno())
    os.replace(temporaneo, DIST)   # scrittura atomica: o il file vecchio o quello nuovo, mai a metà
    impronta = hashlib.sha256(tutto).hexdigest()
    print('dist/DPSH.html: %d pezzi, %d byte, sha256 %s' % (len(parti), len(tutto), impronta))

    if len(argv) >= 2 and argv[0] == '--confronta':
        with open(argv[1], 'rb') as f:
            altro = f.read()
        if altro == tutto:
            print('IDENTICO a ' + argv[1])
            return 0
        print('DIVERSO da ' + argv[1])
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
