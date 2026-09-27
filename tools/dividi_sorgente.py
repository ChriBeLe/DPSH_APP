"""Divide il file unico storico (riferimento/Modulo1_integrato_2026-09-11.html) in pezzi
dentro src/, e scrive src/ordine.txt con l'ordine in cui build.py li rimette insieme.

Usato UNA volta, il 26/09/2026, per la Fase 0. Resta qui come documentazione di come sono
nati i pezzi. Non va rilanciato: da adesso i sorgenti veri sono in src/.

La divisione è puramente testuale: tagli a righe intere, nessuna riga cambiata. La prova è
che build.py rimette insieme un file identico byte per byte all'originale (vedi --verifica).
"""
import os
import re
import sys

RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGINALE = os.path.join(RADICE, 'riferimento', 'Modulo1_integrato_2026-09-11.html')
SRC = os.path.join(RADICE, 'src')


def slug(testo, massimo=48):
    t = testo.lower()
    for a, b in (('à', 'a'), ('è', 'e'), ('é', 'e'), ('ì', 'i'), ('ò', 'o'), ('ù', 'u'), ('’', ''), ("'", '')):
        t = t.replace(a, b)
    t = re.sub(r'\(.*?\)', '', t)
    t = re.sub(r'[^a-z0-9]+', '-', t).strip('-')
    return (t[:massimo].rstrip('-')) or 'sezione'


def trova(righe, cond, da=0):
    for i in range(da, len(righe)):
        if cond(righe[i]):
            return i
    raise SystemExit('confine non trovato')


def main():
    with open(ORIGINALE, 'rb') as f:
        dati = f.read()
    righe = dati.decode('utf-8').splitlines(keepends=True)

    # --- confini principali (indici 0-based) ---
    i_font_apre = trova(righe, lambda r: '<style id="fontIncorporati">' in r)
    i_font_chiude = trova(righe, lambda r: r.strip() == '</style>', i_font_apre)
    i_css_apre = i_font_chiude + 1                      # "<style>"
    assert righe[i_css_apre].strip() == '<style>'
    i_css_chiude = trova(righe, lambda r: r.strip() == '</style>', i_css_apre)
    i_body = trova(righe, lambda r: r.strip() == '<body>')
    i_note_apre = trova(righe, lambda r: '<script id="motoreNote">' in r)
    i_note_chiude = trova(righe, lambda r: r.strip() == '</script>', i_note_apre)
    i_js_apre = i_note_chiude + 1                        # "<script>"
    assert righe[i_js_apre].strip() == '<script>'
    i_js_chiude = max(i for i, r in enumerate(righe) if r.strip() == '</script>')

    pezzi = []  # (percorso relativo a src, riga_inizio, riga_fine_esclusa)

    def aggiungi(nome, a, b):
        if b > a:
            pezzi.append((nome, a, b))

    aggiungi('shell/01_head.html', 0, i_font_apre + 1)
    aggiungi('css/00_font-incorporati.css', i_font_apre + 1, i_font_chiude)
    aggiungi('shell/02_tra-font-e-stile.html', i_font_chiude, i_css_apre + 1)
    aggiungi('css/01_app.css', i_css_apre + 1, i_css_chiude)
    aggiungi('shell/03_fine-head.html', i_css_chiude, i_body + 1)

    # --- markup del body: un pezzo per l'inizio (icone + main) e uno per ogni modale ---
    inizio_body = i_body + 1
    tagli = [inizio_body]
    nomi = ['00_icone-e-schermate-principali']
    re_overlay = re.compile(r'<div class="(?:modal-overlay|drawer-overlay)[^"]*" id="([^"]+)"')
    for i in range(inizio_body, i_note_apre):
        m = re_overlay.search(righe[i])
        if not m:
            continue
        # il commento che precede la modale le appartiene: risale oltre commenti e righe vuote
        c = i
        while c - 1 > tagli[-1]:
            prec = righe[c - 1].strip()
            if prec == '':
                c -= 1
            elif prec.endswith('-->'):
                j = c - 1
                while j > tagli[-1] and '<!--' not in righe[j]:
                    j -= 1
                if '<!--' not in righe[j]:
                    break
                c = j
            else:
                break
        tagli.append(c)
        nome = m.group(1).replace('Overlay', '').replace('overlay', '')
        nomi.append('%02d_%s' % (len(nomi), nome))
    tagli.append(i_note_apre)
    for k in range(len(tagli) - 1):
        aggiungi('markup/%s.html' % nomi[k], tagli[k], tagli[k + 1])

    aggiungi('shell/04_apre-motore-note.html', i_note_apre, i_note_apre + 1)
    aggiungi('vendor/motore-note.min.js', i_note_apre + 1, i_note_chiude)
    aggiungi('shell/05_tra-motore-e-app.html', i_note_chiude, i_js_apre + 1)

    # --- script principale: un pezzo per ogni sezione annunciata da un titolo "// ====" ---
    re_barra = re.compile(r'^\s*// ={20,}\s*$')
    re_titolo_riga = re.compile(r'^\s*// ={3,}\s*(.+?)\s*=*\s*$')
    js_inizio = i_js_apre + 1
    tagli = [js_inizio]
    nomi = ['avvio-stato-e-salvataggio']
    i = js_inizio
    while i < i_js_chiude:
        r = righe[i]
        titolo = None
        salta = i + 1
        if len(r) < 300 and re_barra.match(r):
            # riquadro: barra, righe di titolo, barra
            fine = None
            for j in range(i + 1, min(i + 14, i_js_chiude)):
                if re_barra.match(righe[j]):
                    fine = j
                    break
            if fine is not None and fine > i + 1:
                testo = righe[i + 1].strip().lstrip('/').strip()
                titolo = testo
                salta = fine + 1
        elif len(r) < 300:
            m = re_titolo_riga.match(r)
            if m and '=' in r[r.index('//'):][3:8]:
                titolo = m.group(1)
        if titolo and not titolo.upper().startswith('FINE') and i - tagli[-1] >= 40:
            tagli.append(i)
            nomi.append(slug(titolo))
        i = salta
    tagli.append(i_js_chiude)
    for k in range(len(tagli) - 1):
        aggiungi('js/%03d_%s.js' % (k, nomi[k]), tagli[k], tagli[k + 1])

    aggiungi('shell/06_fine.html', i_js_chiude, len(righe))

    # --- controlli: copertura completa e contigua ---
    pos = 0
    for nome, a, b in pezzi:
        assert a == pos, (nome, a, pos)
        pos = b
    assert pos == len(righe)

    for nome, a, b in pezzi:
        dest = os.path.join(SRC, *nome.split('/'))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'wb') as f:
            f.write(''.join(righe[a:b]).encode('utf-8'))
    with open(os.path.join(SRC, 'ordine.txt'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('# Ordine in cui build.py concatena i pezzi. Una riga = un file dentro src/.\n')
        f.write('# Le righe che iniziano con # sono commenti.\n')
        for nome, a, b in pezzi:
            f.write(nome + '\n')
    print('%d pezzi scritti' % len(pezzi))


if __name__ == '__main__':
    sys.exit(main())
