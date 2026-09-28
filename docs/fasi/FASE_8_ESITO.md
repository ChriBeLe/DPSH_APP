# Fase 8 — Sistema visivo e pulizia: esito

> Ramo `claude/epic-davinci-19p1z9`, 27/09/2026, da unire. `APP_VERSIONE` 2026.09.27.5.
> `npm test`: **53/53**.

## Fatto
- Le regole di stile comuni (punto 1) c'erano dalla Fase 3; le schermate nuove o toccate nelle fasi
  4–7 le usano (`src/css/04_prova-e-home.css`).
- Codice morto tolto: la scheda di sola lettura dell'intervallo (`05_modalView.html` e il suo JS),
  la vecchia «Intestazione Cantiere» (Fase 4), il lucchetto e le barre del contatore (Fase 6), i
  commenti del cassetto sui campi spostati.
- Emoji tolte dai testi dell'interfaccia (circa 60: «⚠️» davanti agli errori, 📸 📊 📄 ecc.).
  Restano, di proposito: ★ dei candidati consigliati (spiegata nel testo), ✓ e ✕ dello strumento
  di disegno, l'icona dei retini, il banner di debug.

## Non fatto, e perché
- Migrare **tutti** gli stili scritti a mano verso le classi, schermata per schermata: è il lavoro
  più grande del piano e ogni schermata va confrontata prima/dopo. Senza una segnalazione precisa il
  rischio (schermate che cambiano per sbaglio) supera il vantaggio. Da fare quando si tocca una
  schermata per altri motivi.
- Rinominare i pezzi di `src/js/` (es. `020_fogli-excel-…` contiene la Vista Prova): tanti file
  spostati per un vantaggio solo di lettura; `docs/MAPPA_CODICE.md` dice già dove sta cosa.
- La finestra «Nuova prova» (`41_modalNewSurvey.html`) non si apre più, ma i suoi campi fanno da
  appoggio a `confirmNewSurvey`: toglierla vuol dire riscrivere quella funzione.
