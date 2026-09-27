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

## Realizzazione (6 passi, fatti il 27/09/2026)

1. ✅ Struttura: barra in alto, barra laterale, barra di stato (`src/js/071a_barre-del-pc.js`, test `pc_barre.js`).
2. ✅ Registro e grafico collegati; tasto destro e doppio clic; ↑ ↓ Invio Canc (`071b_registro-sul-pc.js`). «Inserisci sopra/sotto» non c'è: gli intervalli sono contigui per quota.
3. ✅ Aggiungi intervalli con incolla da Excel/CSV e anteprima; un valore non capito si segna con la riga e spegne il bottone.
4. ✅ Palette comandi (Ctrl K) e guida delle scorciatoie (?); Ctrl I aggiungi, Ctrl E consegna, F falda (`071c_palette-e-scorciatoie.js`).
5. ✅ Contatore sul PC con interruttore in alto o tasto C, accanto al Registro; Spazio, Backspace, Invio (`071d_contatore-sul-pc.js`). Preferenza dell'app `contatoreSuPc`.
6. ✅ Consegna e Confronto più larghi sul PC, il grafico del confronto cresce con la finestra; testi della Consegna ad almeno 12 px; «Confronto prove» con l'aspetto delle altre voci.

Ogni passo: peso dichiarato prima, test del pezzo, suite completa alla fine.

## Non fatto, e perché

- **Inserisci sopra/sotto** nel menu della riga: gli intervalli sono contigui per quota, inserirne uno sposterebbe tutti quelli sotto. Serve una decisione.
- **Contatore spostabile:** sta fisso a sinistra del Registro; spostarlo non aggiungeva niente.
- **Strati a righe con i candidati affiancati** (tavola «Strati»): è il riordino della procedura guidata dei parametri, un lavoro a sé.
- **Menu del tasto destro** su progetti, prove e strati: per ora solo sulle righe del Registro e sulle barre del grafico.
- **Consegna di «alcune prove»** oltre al PDF: resta come nella Fase 5.
- **Ctrl Z** fuori dall'editor dei template: l'annullamento resta nel toast dopo l'azione.
