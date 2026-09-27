# Piano — Spostare i blocchi fra le pagine

> La tua idea, non un copia/incolla classico: **il blocco resta visibile "in spostamento"** mentre cambi pagina, e quando tocchi la barra scegli cosa farne — posa, trascina, annulla, elimina.
> È una scelta migliore di un appunti nascosto, e vale la pena dire perché: un appunti invisibile ti costringe a ricordare cosa hai copiato e non ti dice mai se c'è ancora qualcosa dentro. Qui la cosa che stai spostando **si vede**, quindi non esiste lo stato "ho tagliato e non me lo ricordo più".

---

## 1. La buona notizia: quasi tutto esiste già

Non è una funzione da costruire da zero. Serve **collegare pezzi che già ci sono e funzionano**:

| Serve per | Esiste già | Dove |
|---|---|---|
| Inserire un blocco rispettando TUTTE le regole | `inserisciBloccoInPagina(page, block, pos)` | Sa già rifiutare un flowable in uno stack, un flowable affiancato, una riga con un blocco bloccato. **Non va riscritto: va riusato.** |
| Togliere un blocco | `rimuoviBloccoDaPagina` | Con le stesse guardie sulle righe bloccate |
| Trascinare col fantasma che segue il dito | `avviaTrascinamentoEditor(e, source, label)` | Accetta già `{kind:'new'}` e `{kind:'existing'}` |
| "Non ci sta: nuova pagina o rimpicciolisco?" | `gestisciInserimentoBloccoNuovoConOverflow` | Già scritto, già collaudato |
| Tornare indietro | `salvaUndoSnapshotEditor` + Ctrl+Z | Già attivo nell'editor |
| Id nuovi | `nuovoIdEditor(prefix)` | |

La parte davvero nuova è **lo stato "blocco in spostamento"** e la sua barra. Il resto è cablaggio.

---

## 2. Come funziona, passo per passo

**Prendere.** Dal ⋮ del blocco: **Sposta blocco**. Solo spostamento, mai duplicazione — vedi §3c.

**Portare.** Il blocco sollevato compare in due posti contemporaneamente:

- come **voce nella barra degli strumenti**, identica a quelle della palette ma evidenziata — così si trascina esattamente come un blocco nuovo, con lo stesso fantasma e lo stesso indicatore di rilascio (è quello che intendevi con *"meglio mostrando il blocco che sarebbe stato presente nella barra degli strumenti"*): zero meccanica nuova da imparare e zero meccanica nuova da scrivere;
- come **barra fluttuante** in basso a sinistra: icona del blocco, la scritta «IN SPOSTAMENTO» e il nome sotto. Lo stato sta sopra il nome, non il contrario, perché la domanda a cui la barra risponde è "cosa sta succedendo?" e solo dopo "a quale blocco".

**Posare.** Toccando la pillola:

| Voce | Nota |
|---|---|
| **Posa qui** | in fondo a questa pagina |
| **Trascina** | scegli tu il punto esatto |
| **Annulla** | torna da dove era partito |
| **Elimina** | togli il blocco dal template |

Quattro verbi, uno per riga, tutti della stessa forma: **verbo in grassetto + una riga sola di spiegazione**. La prima versione aveva frasi di lunghezza diversa ("Piazza qui, in fondo alla pagina" contro "Trascina dove vuoi") — un elenco di azioni si legge a colpo d'occhio solo se le voci sono parallele. L'eliminazione è staccata in fondo da una linea, come "Rimuovi blocco" nel menu del blocco: l'azione distruttiva non sta in mezzo alle altre.

---

## 3. I tre pericoli veri

Li scrivo perché sono i punti dove questa funzione può rompere cose che funzionano.

### a) Gli id duplicati — il pericolo numero uno

Un blocco incollato **non può portarsi dietro il suo `id`**. L'editor cerca gli elementi con `querySelector('[data-block-id="..."]')` in decine di punti: due blocchi con lo stesso id significano un menu che agisce sul blocco sbagliato, un'anteprima che aggiorna la fetta sbagliata, una maniglia che ridimensiona un altro blocco. È **la stessa famiglia di bug** che ci ha fatto perdere più tempo in questo progetto (le miniature che rubavano gli id, il `querySelector` singolare che aggiornava una fetta sola).

Serve un `clonaBloccoConNuoviId` che scende anche dentro `stack[]`, e un controllo automatico che dopo ogni operazione verifichi che **nel template non esistano due id uguali**. Non un controllo a occhio: un test.

### b) Perdere il blocco che hai in spostamento

Se "Sposta" lo toglie subito dalla pagina e poi l'editor si chiude (o il telefono lo uccide), quel blocco è sparito. Regola: **chiudendo l'editor con un blocco in spostamento, il blocco torna da dove è partito.** Deterministico, nessuna domanda, nessuna perdita. E lo stato "in spostamento" ricorda la posizione d'origine precisa (pagina, riga, colonna, posizione nello stack), che è anche ciò che rende possibile "Annulla".

### c) La duplicazione — eliminata alla radice

Deciso: **solo spostamento, mai copia.** È la scelta che ha tolto di mezzo il pericolo (a) per intero, non che lo ha mitigato: spostando, l'oggetto blocco è sempre lo stesso e si porta dietro il suo id, che quindi **resta unico per costruzione**. Non serve nessuna clonazione, non c'è nessun id da rigenerare, non esiste il percorso di codice in cui due blocchi possono nascere uguali.

Il passo 1 del piano — `clonaBloccoConNuoviId` — **non è stato scritto**, perché non serve più. Resta invece il suo collaudo, girato sul caso vero: ogni scenario del test verifica che nel template non esistano mai due id uguali.

---

## 4. Gli avvisi che hai chiesto

Prima di posare, non dopo:

- **Blocco lungo con divisioni**: «Questo blocco continuerà su altre 2 pagine». Il numero **non è una stima**: lo dà lo stesso motore di misura che alimenta già gli avvisi del menu e le miniature (`verificaPagineOrigineControMotoreReale`). Se non ho una misura vera non scrivo un numero.
- **Non ci sta nella pagina**: si riusa la domanda che esiste già — «nuova pagina» oppure «adatta a questa» — invece di inventarne una seconda che dice la stessa cosa con altre parole.

---

## 5. Ordine di lavoro

| # | Passo | Perché qui |
|---|---|---|
| ~~1~~ | ~~`clonaBloccoConNuoviId`~~ | **Non serve più**: senza duplicazione non c'è niente da clonare. |
| **2** ✅ | Lo stato "in spostamento": prendi, ricorda l'origine, restituisci alla chiusura | Fatto. |
| **3** ✅ | La pillola + la voce nella barra strumenti | Fatto. |
| **4** ✅ | "Piazza qui" e "Trascina" (terzo `kind` in `avviaTrascinamentoEditor`) | Fatto. |
| **5** ✅ | Avvisi: pagine di continuazione, non ci sta | Fatto. |
| **6** ✅ | Verifica | 51 controlli sul codice + **35 che eseguono davvero le funzioni** su un template finto. |

## ✅ Esito

Le funzioni vere, estratte dal file ed eseguite: spostamento fra pagine, annulla che riporta il template **byte per byte** com'era, annulla dopo che la riga d'origine è sparita, pagina d'origine eliminata mentre il blocco era in spostamento, due prese di fila, doppia posa, blocco bloccato, vicino di riga bloccato, elimina, blocco lungo che resta l'unico della sua riga. **Ogni scenario controlla che nel template non esistano due id uguali.**

Tre punti dove il doppione poteva ancora nascere, chiusi:

- **doppio tocco su "Piazza qui"**: lo stato si azzera *prima* dell'inserimento, quindi il secondo tocco non trova più niente da inserire;
- **stessa cosa al rilascio del trascinamento**;
- **undo con un blocco in spostamento**: lo snapshot è stato salvato *prima* della presa, quindi contiene già quel blocco — lo stato va **lasciato cadere**, non rimessa a posto, altrimenti il blocco comparirebbe due volte.

---

## 6. Cosa NON farei

- **Non userei l'appunti di sistema** (`navigator.clipboard`). Sembra elegante — incollare fra due dispositivi — ma vuol dire serializzare un blocco in un formato pubblico che dovremo mantenere compatibile per sempre, e gestire l'incolla di roba arbitraria. Il valore vero è spostare dentro lo stesso template.
- **Non riscriverei l'inserimento.** `inserisciBloccoInPagina` contiene già cinque divieti che sono stati scoperti con altrettanti bug reali. Un secondo percorso di inserimento significherebbe riscoprirli uno per uno.
- **Non permetterei di spostare un blocco bloccato** (lucchetto posizione) né uno in una riga che ne contiene uno: è la stessa regola che vale già per eliminare e trascinare.
