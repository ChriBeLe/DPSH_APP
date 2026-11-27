"""Disegna le icone PNG della versione web (web/icone/) con Pillow.

Lo stesso disegno dell'icona incorporata nell'app e di desktop/icona.png (freccia e linea su fondo
scuro), ridisegnato in grande e ridotto, così 192 e 512 sono nitide. Le «maskable» hanno il fondo a
tutto campo e il simbolo dentro l'area sicura (80%), perché il sistema le ritaglia a cerchio o a goccia.
Pillow serve SOLO per rigenerarle: i PNG sono committati e la build non lo usa.

    python tools/genera_icone_web.py
"""
import os
from PIL import Image, ImageDraw

FONDO = (15, 23, 42, 255)       # #0f172a
SEGNO = (245, 158, 11, 255)     # #f59e0b
RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
USCITA = os.path.join(RADICE, 'web', 'icone')
SUPER = 4                       # si disegna a 4x e si riduce: bordi morbidi


def disegna(lato, maskable):
    g = lato * SUPER
    img = Image.new('RGBA', (g, g), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle([0, 0, g, g], fill=FONDO)
        scala = 0.64 * g / 100          # simbolo ridotto: sta dentro il cerchio sicuro
    else:
        d.rounded_rectangle([0, 0, g - 1, g - 1], radius=g * 0.20, fill=FONDO)
        scala = g / 100
    centro = g / 2

    def p(x, y):
        return (centro + (x - 50) * scala, centro + (y - 50) * scala)

    spessore = 8 * scala
    r = spessore / 2

    def tratto(punti):
        pts = [p(*q) for q in punti]
        d.line(pts, fill=SEGNO, width=round(spessore), joint='curve')
        for x, y in pts:                # estremi arrotondati
            d.ellipse([x - r, y - r, x + r, y + r], fill=SEGNO)

    tratto([(50, 15), (50, 85)])
    tratto([(30, 35), (50, 15), (70, 35)])
    tratto([(30, 65), (70, 65)])
    return img.resize((lato, lato), Image.LANCZOS)


def main():
    os.makedirs(USCITA, exist_ok=True)
    for lato in (192, 512):
        disegna(lato, False).save(os.path.join(USCITA, f'icona-{lato}.png'), optimize=True)
        disegna(lato, True).save(os.path.join(USCITA, f'icona-maskable-{lato}.png'), optimize=True)
    print('Icone scritte in', USCITA)


if __name__ == '__main__':
    main()
