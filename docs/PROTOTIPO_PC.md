# Prototipo PC — post-produzione

Tela: https://claude.ai/artifact/3ssSnswgptKV7QvfLKxZfg (approvata il 27/09/2026; si può ritoccare).

Il PC serve alla post-produzione (decisione I). Il contatore resta disponibile con un interruttore.

## Tavole

| Riga | Tavole |
|---|---|
| Fondamenta | Stile, Barra in alto, Barra di stato, Barra laterale |
| La prova | Registro e grafico, Aggiungi intervalli (anche da Excel), Riconosci strati, Foto e posizione |
| Progetti | Primo avvio, Progetti, Palette comandi (Ctrl K), Progetto |
| Consegna e analisi | Consegna, Report PDF, Strati e parametri, Confronto prove |
| Strumenti | Editor dei template, Note del progetto, Ricevi un progetto |
| Impostazioni | Impostazioni, Guida e scorciatoie (tasto ?), Riscontri |

## Scelte

- **Struttura fissa:** barra in alto con il percorso Progetti / Progetto / Prova, barra laterale con l'albero, barra di stato con i tasti del momento.
- **Mouse:** clic seleziona, doppio clic modifica, tasto destro apre le azioni dove sta il mouse. Tabella e grafico collegati.
- **Tastiera:** i tasti sono scritti nei menu e nella barra di stato; elenco completo con `?`.
- **Contatore sul PC:** interruttore in alto (tasto C) e pannello spostabile; Spazio = colpo, Invio = registra.
- **Errori:** l'avviso sta accanto al dato; si annulla dopo (toast con Ctrl Z) invece di chiedere prima; conferma scritta solo per ciò che non torna indietro.
- **Consegna:** una sola porta: prima cosa (prova, alcune, tutto), poi il formato.
- **Colori:** accento = azione; giallo = da controllare; rosso = elimina/errore; verde = fatto; blu = falda e GPS. Ogni testo ≥ 4,5:1.
- **Cifre** in carattere a spaziatura fissa, per leggere le colonne.

## Realizzazione proposta (6 passi)

1. ✅ Struttura: barra in alto, barra laterale, barra di stato (`src/js/071a_barre-del-pc.js`, test `pc_barre.js`).
2. ✅ Registro e grafico collegati; tasto destro e doppio clic; ↑ ↓ Invio Canc (`071b_registro-sul-pc.js`). «Inserisci sopra/sotto» non c'è: gli intervalli sono contigui per quota.
3. ✅ Aggiungi intervalli con incolla da Excel/CSV e anteprima; un valore non capito si segna con la riga e spegne il bottone.
4. Palette comandi (Ctrl K) e guida delle scorciatoie.
5. Contatore sul PC con interruttore.
6. Consegna, strati e confronto nel nuovo schema.

Ogni passo: peso dichiarato prima, test del pezzo, suite completa alla fine.
