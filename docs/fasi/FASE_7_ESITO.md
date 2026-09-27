# Fase 7 — Il PC, per la post-produzione: esito

> Ramo `claude/epic-davinci-19p1z9`, 27/09/2026, da unire.

## Fatto (da 1024 px)
- **Niente contatore** né schede Conta | Registro (decisione I): si apre direttamente il Registro.
- Nella vista «Grafico» **tabella e grafico affiancati**; l'app usa fino a 1200 px invece di 600.
- **Correzione da tastiera**: un clic su una riga (o sulla barra del grafico) apre la scheda
  dell'intervallo col cursore nei colpi; Invio salva (tracciato, Fase 1), Esc chiude.
- Si inserisce con «Aggiungi» (un intervallo o intervalli multipli), che c'era già.
- Gestione litologica più larga (fino a 1100 px).
- L'editor dei template era già a tutto schermo.

## Non fatto, e perché
- Colonna fissa a sinistra con progetti e prove, e a destra la scheda o gli strati: c'è la schermata
  Progetto e la riga delle prove in testata; tre colonne vanno disegnate sull'uso vero (osservazione
  del 26/09: «le comodità si scopriranno usandolo»).
- Modifica direttamente nelle celle: la scheda con Invio fa lo stesso con un tasto in più.
- Tabella dei parametri avanzati per autore: resta quella delle card, solo più larga.
- Elenco delle scorciatoie (`?`): le uniche sono Invio, Esc e Ctrl+Z/Y nell'editor.

## Test
`test/pc_postproduzione.js`: telefono col contatore, PC col Registro, clic → scheda col cursore,
Invio salva e traccia la modifica.
