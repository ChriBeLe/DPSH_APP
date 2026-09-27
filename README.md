# DPSH Field Collector

App per le prove penetrometriche dinamiche (DPSH/DPM/DPL). Copre la prova per intero:
acquisizione in campo (telefono, dentro un APK), elaborazione (strati, parametri avanzati) e
consegna (report PDF/Word, Excel, KML, foto). Sul PC è la stessa app, usata per la
post-produzione.

## Com'è fatta

```
src/            sorgenti, divisi in pezzi (vedi docs/MAPPA_CODICE.md)
  ordine.txt    l'ordine in cui i pezzi vengono concatenati
  shell/        l'ossatura HTML (head, apertura e chiusura degli script)
  css/          stili
  markup/       l'HTML: schermate principali e una finestra per file
  vendor/       librerie di terzi incorporate (motore delle note)
  js/           lo script dell'app, in frammenti di UNA sola funzione
dist/DPSH.html  il file unico da mettere nell'APK o aprire nel browser (generato, non si modifica)
test/           suite di verifica, eseguite su dist/DPSH.html
tools/          script di servizio (mappa del codice, motore delle note)
docs/           piano, analisi, esiti delle fasi; docs/storia/ = i piani e i diari precedenti
riferimento/    l'originale dell'11/09/2026, intoccato, per i confronti
```

## Comandi

```bash
python build.py                 # costruisce dist/DPSH.html
python build.py --mappa 12345   # in quale pezzo sta la riga 12345 del file costruito
npm test                        # build + tutte le suite di test
node test/esegui_tutti.js foto  # solo le suite con "foto" nel nome
python tools/mappa_codice.py    # rigenera docs/MAPPA_CODICE.md
```

Serve Node (in `C:\Program Files\nodejs`) con `npm install` eseguito una volta, e Python 3.

## Da dove si parte

- `docs/PIANO_RIARCHITETTURA.md`: le fasi, le decisioni prese e le regole di lavoro.
- `docs/ANALISI_UX_UI.md`: l'analisi da cui nasce il piano.
- `docs/fasi/`: cosa ha fatto ogni fase.
