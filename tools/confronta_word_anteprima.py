#!/usr/bin/env python3
# Parte 2 di confronta_word_anteprima.js: confronta dom.json (anteprima) con prova.pdf (docx reso da LibreOffice).
import json, sys, collections, pdfplumber
out = sys.argv[1]
K = 1 / 0.75                      # pt -> px
DJ = json.load(open(out + '/dom.json'))
dom = DJ['tabelle']
MX = DJ['margini']['left'] * 96 / 25.4   # il flusso (non i fogli) parte dal margine sinistro della pagina
pdf = pdfplumber.open(out + '/prova.pdf')
parole = []                       # (pagina, top, x0, testo)
for ip, pg in enumerate(pdf.pages):
    for w in pg.extract_words():
        parole.append((ip, w['top'] * K, w['x0'] * K, w['text']))
def bordi(pg):
    xs, ys = [], []
    for r in pg.rects:
        xs += [r['x0'] * K, r['x1'] * K]; ys += [r['top'] * K, r['bottom'] * K]
    for l in pg.lines:
        if abs(l['x0'] - l['x1']) < 0.5: xs.append(l['x0'] * K)
        if abs(l['top'] - l['bottom']) < 0.5: ys.append(l['top'] * K)
    f = lambda v: sorted({round(a, 1) for a in v})
    return f(xs), f(ys)
B = [bordi(pg) for pg in pdf.pages]
parole_pdf = [(ip, w['top'] * K, w['x0'] * K, w['text']) for ip, pg in enumerate(pdf.pages) for w in pg.extract_words()]
righe_pdf = []                    # (pagina, top, x0, testo) per riga di testo
for ip, pg in enumerate(pdf.pages):
    for l in pg.extract_text_lines():
        righe_pdf.append((ip, l['top'] * K, l['x0'] * K, l['text']))
visti = collections.Counter()
tot = {'w': [], 'h': [], 'tx': [], 'ty': []}
print('tab  testo            pag  colonne dx(px) | testo: dx max, dy max (px) | altezze righe (bordi) dh(px)')
for t in dom:
    OX = 0 if t.get('foglio') else MX
    prima = next((c for r in t['righe'] for c in r['celle'] if c['t'] and c['rt']), None)
    if not prima: continue
    chiave = prima['t']
    cand = sorted(p for p in parole_pdf if p[3] == chiave.split(' ')[0] and abs(p[2] - (prima['rt']['x'] + OX)) < 6)
    visti[chiave] += 1
    if not cand: print('%-4d %-16s non trovato' % (t['i'], chiave[:16])); continue
    celle_t = [(r, c) for r in t['righe'] for c in r['celle'] if c['t'] and c['rt']]
    def prova(cd):
        ip, top, x0, _ = cd
        oy = top - prima['rt']['y']
        tdx, tdy = [], []
        for r, c in celle_t:
            ey = c['rt']['y'] + oy
            tok = c['t'].split(' ')[0]
            w0 = [w for w in parole_pdf if w[0] == ip and w[3] == tok and abs(w[1] - ey) < 14 and abs(w[2] - (c['rt']['x'] + OX)) < 8]
            if not w0: continue
            w1 = min(w0, key=lambda w: abs(w[1] - ey) + abs(w[2] - c['rt']['x'] - OX))
            tdy.append(round(w1[1] - ey, 1)); tdx.append(round(w1[2] - c['rt']['x'] - OX, 1))
            if '-v' in sys.argv: print('   riga', round(r['y']), c['t'][:14], 'dy', tdy[-1], 'dx', tdx[-1])
        return tdx, tdy
    ris = []
    for cd in cand:
        tdx, tdy = prova(cd)
        ris.append((-len(tdy), sum(map(abs, tdy)), cd, tdx, tdy))
    _, _, (ip, top, x0, _), tdx, tdy = min(ris, key=lambda q: q[:2])
    ox, oy = OX, top - prima['rt']['y']
    xs, ys = B[ip]
    colonne = sorted({round(c['x'] + OX, 1) for r in t['righe'] for c in r['celle']} | {round(c['x'] + c['w'] + OX, 1) for r in t['righe'] for c in r['celle']})
    dx = []
    for x in colonne:
        v = min(xs, key=lambda a: abs(a - x)) if xs else None
        dx.append(round(v - x, 1) if v is not None and abs(v - x) < 12 else None)
    y0 = max([y for y in ys if y <= top + 1] or [top])
    pdfy = [y for y in ys if y0 - 0.5 <= y <= y0 + t['h'] + 6]
    domh = [r['h'] for r in t['righe']]
    pdfh = [round(b - a, 1) for a, b in zip(pdfy, pdfy[1:]) if b - a > 3]
    dh = [round(b - a, 1) for a, b in zip(domh, pdfh)] if len(pdfh) == len(domh) else []
    tot['w'] += [abs(d) for d in dx if d is not None]; tot['h'] += [abs(d) for d in dh]
    tot['tx'] += [abs(d) for d in tdx]; tot['ty'] += [abs(d) for d in tdy]
    print('%-4d %-16s %-3d  %s | testo dx<=%.1f dy [%s..%s] | %s' % (t['i'], chiave[:16], ip + 1, dx, max(map(abs, tdx), default=0), min(tdy, default=0), max(tdy, default=0), ('H %s' % dh[:10]) if dh else '(bordi righe non confrontabili)'))
nomi = {'w': 'larghezze colonne (bordi)', 'h': 'altezze righe (bordi)', 'tx': 'x del testo nelle celle', 'ty': 'y del testo (da ancora tabella)'}
for k, v in tot.items():
    if v: print('max |diff| %-32s %.1f px, media %.2f px (n=%d)' % (nomi[k], max(v), sum(v) / len(v), len(v)))
