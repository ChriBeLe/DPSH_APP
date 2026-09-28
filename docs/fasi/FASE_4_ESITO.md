# Fase 4 — Un posto per ogni dato: esito

> Ramo `claude/epic-davinci-19p1z9`, 27/09/2026, da unire. `VERSIONE_SCHEMA_DATI` 3 (nessuna migrazione).

## Fatto
- **Scheda della prova** (`modalSurveySettings`): linguette **Dati** e **Strumento**; da Dati, GPS ·
  Foto · Falda; in fondo Duplica come interpretazione ed Elimina. Unisce «Intestazione Cantiere»
  (`25_modalCantiereInfo.html` tolto) e «Impostazioni Prova»: stessi campi, stessi id, stessi gestori.
  Il titolo della prova apre Dati; il ⋯ e la pressione lunga sul cerchietto aprono Strumento.
- **Dati** divisi in «Del progetto» (nome, committente, comune, provincia, sede, denominazione) e
  «Di questa prova» (località, data, N°, lunghezza asta).
- **Committente e comune** scritti dalla scheda vanno anche nel progetto: la card della Home li legge
  da lì. Le altre prove tengono i loro valori.
- **Nuova prova con un tocco**: il «+» crea la prova col N° successivo e i dati ereditati; il
  messaggio offre «Scheda» per correggerli.

## Decisione presa, da confermare
Il punto 2 del piano chiedeva di **spostare** committente e comune dalla prova al progetto con una
migrazione. Non l'ho fatto: li leggono il report, l'Excel e il testo introduttivo dalla prova, e dove
le prove hanno valori diversi una migrazione deve scegliere. Il risultato per l'utente (si scrivono in
un posto, la Home li mostra) c'è già; lo spostamento vero si può fare dopo, se servirà.

## Punto 5 — una copia sola della prova aperta (valutazione)
Oggi la prova aperta vive in `state.header/logs/…` e in `proj.surveys[id]`, riallineate da
`syncStateToProject` / `syncProjectToActiveState`. Arrivare a una copia sola vuol dire far leggere a
tutto il codice `proj.surveys[state.currentSurveyId]` invece di `state.header` ecc.: centinaia di punti.
Raccomandazione: **non farlo** come passo a sé. Il rischio (dati che si contraddicono) è coperto dal
salvataggio verificato e dal controllo di integrità della Fase 1; se un giorno si riscrive il motore
dei dati, si fa lì.

## Test
`schermata_progetto.js` (nuova prova, linguette, Dati → Falda, comune nel progetto),
`prova_in_campo.js` (il titolo apre la scheda su Dati).
