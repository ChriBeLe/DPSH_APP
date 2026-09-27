"""Rigenera docs/MAPPA_CODICE.md: per ogni pezzo di src/ quante righe ha e cosa definisce
(funzioni del livello principale per i .js, id delle finestre per i .html).

    python tools/mappa_codice.py

Va rilanciato alla fine di ogni fase: la mappa serve a chi arriva dopo per sapere dove
mettere le mani senza leggere 40.000 righe.
"""
import os
import re

RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RADICE, 'src')
USCITA = os.path.join(RADICE, 'docs', 'MAPPA_CODICE.md')

RE_FUNZ = re.compile(r'^ {12}(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(')
RE_CONST_FUNZ = re.compile(r'^ {12}(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)')
RE_ID_MODALE = re.compile(r'<div class="(?:modal|drawer)(?:\s[^"]*)?" id="([^"]+)"')


def main():
    with open(os.path.join(SRC, 'ordine.txt'), encoding='utf-8') as f:
        voci = [r.strip() for r in f if r.strip() and not r.startswith('#')]
    out = ['# Mappa del codice', '',
           '> Generata da `python tools/mappa_codice.py`. Non modificarla a mano: rilancia lo script.',
           '>',
           '> I pezzi sono elencati nell\'ordine in cui `build.py` li concatena. **Tutti i `.js` di',
           '> `src/js/` sono frammenti di UNA sola funzione** (la `(function() { ... })();` che apre',
           '> `000_` e chiude in `shell/06_fine.html`): condividono lo stesso ambito, non sono moduli.',
           '> Una funzione definita in un pezzo è visibile in tutti gli altri.', '']
    riga_dist = 1
    for v in voci:
        with open(os.path.join(SRC, *v.split('/')), encoding='utf-8') as f:
            testo = f.read()
        righe = testo.split('\n')
        n = testo.count('\n')
        dettagli = []
        if v.endswith('.js') and not v.startswith('vendor/'):
            nomi = []
            for r in righe:
                m = RE_FUNZ.match(r) or RE_CONST_FUNZ.match(r)
                if m:
                    nomi.append(m.group(1))
            if nomi:
                dettagli.append(', '.join('`%s`' % x for x in nomi))
        elif v.endswith('.html'):
            ids = RE_ID_MODALE.findall(testo)
            if ids:
                dettagli.append('finestre: ' + ', '.join('`#%s`' % x for x in ids))
        out.append('### `src/%s`' % v)
        out.append('%d righe · in `dist/DPSH.html` dalla riga %d' % (n, riga_dist))
        if dettagli:
            out.append('')
            out.extend(dettagli)
        out.append('')
        riga_dist += n
    os.makedirs(os.path.dirname(USCITA), exist_ok=True)
    with open(USCITA, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(out))
    print('scritta ' + os.path.relpath(USCITA, RADICE))


if __name__ == '__main__':
    main()
