# Fase 5 — Gerarchia e navigazione: esito

> Ramo `claude/epic-davinci-19p1z9`, 27/09/2026, da unire. `npm test`: **52/52**.

## Fatto
1. **Schermata Progetto** (`viewProject`, `renderSchermataProgetto` in 022): prove con profondità,
   intervalli, GPS, foto, falda e avvisi (da `avvisiPrimaExport`); Riprendi, Nuova prova, Dati del
   progetto, Strati, Note, Consegna, ⋯ (le azioni del progetto di sempre). Dalla prova «‹» porta qui;
   dalla Home «Apri» porta ancora all'ultima prova (decisione H).
   **Indietro** (Android/browser): prova → progetto → Home, con una voce `{dpsh: true}` nella
   cronologia finché non si è in Home.
2. **Consegna unica**: la finestra Esporta si chiama «Consegna»; dalla prova «Questa prova | Tutto il
   progetto»; nel progetto anche Parametri avanzati (Excel, CSV, PDF, Word) e Confronto prove. Le
   prove una per una si scelgono nella schermata del Report PDF, come prima.
3. **Impostazioni riordinate**: In campo (con «Tasto Registra») · spazio, copie, backup · Libreria
   (template, archivio litologico) · Aspetto · Sperimentali · Reset.

## Test nuovi
`schermata_progetto.js`, `consegna.js`, `impostazioni_ordine.js`, con le controprove sull'app di prima.

## Non fatto, e perché
- «Alcune prove» nella Consegna vale solo per il Report PDF: Excel, KML e foto lavorano per prova o
  per progetto, e cambiarli era un lavoro a parte per un caso raro.
- Parametri avanzati restano anche in fondo a Gestione litologica; nella Consegna compaiono solo per
  il progetto aperto (si calcolano su quello).
- «Dati del progetto» apre l'intestazione di oggi (prova + progetto): la scheda unica è la Fase 4.
- Il tasto indietro non chiude le finestre aperte: torna di schermata.

## Da provare sul telefono
Prova → «‹» → Progetto → tocca un'altra prova; tasto indietro di Android dalla prova e dal Progetto;
⋯ della prova → Consegna → «Tutto il progetto» → Parametri avanzati; cassetto → Libreria.
